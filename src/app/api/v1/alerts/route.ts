import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import StoreAlert from '@/models/StoreAlert';
import { requireAuth } from '@/lib/storesparc/auth';
import { apiError } from '@/lib/storesparc/errors';

export async function GET(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();

    const alerts = await StoreAlert.find({
      userId: caller!.userId,
    }).sort({ createdAt: -1 }).limit(50);

    const unreadCount = alerts.filter((a) => !a.read).length;

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

    return NextResponse.json({
      unread_count: unreadCount,
      alerts: formatted,
    });
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', error.message || 'Failed to fetch alerts', 500);
  }
}

