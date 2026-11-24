import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import RosterWeek from '@/models/RosterWeek';
import RosterShift from '@/models/RosterShift';
import { requireAuth } from '@/lib/storesparc/auth';
import { withIdempotency } from '@/lib/storesparc/idempotency';
import { apiError } from '@/lib/storesparc/errors';

export async function POST(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req, ['Store Manager', 'Central admin']);
  if (errorResponse) return errorResponse;

  return withIdempotency(req, caller!.userId, async () => {
    try {
      await connectToDatabase();
      const body = await req.json();
      const { week_start, client_timestamp } = body;

      if (!week_start) {
        return apiError('VALIDATION_ERROR', 'Field week_start is required', 400);
      }

      const storeId = caller!.storeId;
      const publishTime = client_timestamp ? new Date(client_timestamp) : new Date();

      let week = await RosterWeek.findOne({ storeId, weekStart: week_start });
      if (!week) {
        week = await RosterWeek.create({
          storeId,
          weekStart: week_start,
          status: 'published',
          publishedAt: publishTime,
          editable: true,
        });
      } else {
        week.status = 'published';
        week.publishedAt = publishTime;
        await week.save();
      }

      // Mark all shifts as published
      await RosterShift.updateMany(
        { storeId, weekStart: week_start },
        { status: 'published' }
      );

      // Emit roster_published alert to all staff with shifts in this published week
      const distinctUserIds = await RosterShift.distinct('userId', {
        storeId,
        weekStart: week_start,
      });

      if (distinctUserIds.length > 0) {
        const StoreAlert = (await import('@/models/StoreAlert')).default;
        const alertDocs = distinctUserIds.map((uid) => ({
          userId: uid,
          storeId,
          category: 'roster_published',
          title: 'Roster Published',
          body: `The shift roster for week ${week_start} has been published.`,
          read: false,
          targetScreen: 'roster',
          targetArgument: week_start,
        }));
        await StoreAlert.insertMany(alertDocs);
      }

      return NextResponse.json({
        week_start,
        status: 'published',
        published_at: week.publishedAt?.toISOString(),
        coverage_warnings: week.coverageGaps || [],
        message: 'Roster published to Staff successfully',
      });
    } catch (error: any) {
      return apiError('INTERNAL_ERROR', error.message || 'Failed to publish roster', 500);
    }
  });
}

