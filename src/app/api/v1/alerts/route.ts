import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import StoreAlert from '@/models/StoreAlert';
import WeeklyHours from '@/models/WeeklyHours';
import User from '@/models/User';
import { requireAuth } from '@/lib/storesparc/auth';
import { withIdempotency } from '@/lib/storesparc/idempotency';
import { apiError } from '@/lib/storesparc/errors';

export async function GET(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const category = searchParams.get('category');
    const before = searchParams.get('before'); // cursor: ISO timestamp string

    // 1. Synchronize state-derived alerts:
    // Clear "hours_to_confirm" alerts for any weeks that are confirmed
    const confirmedWeeks = await WeeklyHours.find({
      userId: caller!.userId,
      status: 'confirmed',
    }).select('weekStart');

    if (confirmedWeeks.length > 0) {
      const confirmedWeekStarts = confirmedWeeks.map((w) => w.weekStart);
      await StoreAlert.deleteMany({
        userId: caller!.userId,
        category: 'hours_to_confirm',
        targetArgument: { $in: confirmedWeekStarts },
      });
    }

    // 2. Build query filter
    const query: any = { userId: caller!.userId };
    if (unreadOnly) {
      query.read = false;
    }
    if (category) {
      query.category = category;
    }
    if (before) {
      const beforeDate = new Date(before);
      if (!isNaN(beforeDate.getTime())) {
        query.createdAt = { $lt: beforeDate };
      }
    }

    // 3. Compute accurate unread count across all alerts for caller
    const unreadCount = await StoreAlert.countDocuments({
      userId: caller!.userId,
      read: false,
    });

    const totalMatching = await StoreAlert.countDocuments(query);
    const skip = before ? 0 : (page - 1) * limit;

    const alerts = await StoreAlert.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const formatted = alerts.map((a) => ({
      id: a._id.toString(),
      category: a.category,
      title: a.title,
      body: a.body,
      created_at: a.createdAt.toISOString(),
      read: a.read,
      target_screen: a.targetScreen || null,
      target_argument: a.targetArgument || null,
    }));

    const hasMore = skip + alerts.length < totalMatching;
    const nextCursor = alerts.length > 0 ? alerts[alerts.length - 1].createdAt.toISOString() : null;

    return NextResponse.json({
      unread_count: unreadCount,
      total: totalMatching,
      page: before ? undefined : page,
      limit,
      has_more: hasMore,
      next_cursor: hasMore ? nextCursor : null,
      alerts: formatted,
    });
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', error.message || 'Failed to fetch alerts', 500);
  }
}

export async function POST(req: NextRequest) {
  // Store announcement or targeted alert broadcast (Store Manager or Central admin)
  const { caller, errorResponse } = await requireAuth(req, ['Store Manager', 'Central admin']);
  if (errorResponse) return errorResponse;

  return withIdempotency(req, caller!.userId, async () => {
    try {
      await connectToDatabase();
      const body = await req.json();
      const {
        title,
        body: alertBody,
        category = 'store_announcement',
        target_screen,
        target_argument,
        user_ids,
      } = body;

      if (!title || !alertBody) {
        return apiError('VALIDATION_ERROR', 'Fields "title" and "body" are required', 400);
      }

      const storeId = caller!.storeId;
      let targetUserIds: string[] = [];

      if (Array.isArray(user_ids) && user_ids.length > 0) {
        targetUserIds = user_ids;
      } else {
        const staffUsers = await User.find({ storeId, role: 'Staff' }).select('_id');
        targetUserIds = staffUsers.map((u: any) => u._id.toString());
      }

      if (targetUserIds.length === 0) {
        targetUserIds = [caller!.userId];
      }

      const alertDocs = targetUserIds.map((uid) => ({
        userId: uid,
        storeId,
        category,
        title,
        body: alertBody,
        read: false,
        targetScreen: target_screen || 'announcements',
        targetArgument: target_argument || null,
      }));

      await StoreAlert.insertMany(alertDocs);

      return NextResponse.json({
        category,
        recipients_count: alertDocs.length,
        message: `Alert successfully sent to ${alertDocs.length} recipient(s)`,
      });
    } catch (error: any) {
      return apiError('INTERNAL_ERROR', error.message || 'Failed to create alert', 500);
    }
  });
}
