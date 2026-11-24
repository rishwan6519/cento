import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import StoreAlert from '@/models/StoreAlert';
import { requireAuth } from '@/lib/storesparc/auth';
import { withIdempotency } from '@/lib/storesparc/idempotency';
import { apiError } from '@/lib/storesparc/errors';

export async function POST(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  return withIdempotency(req, caller!.userId, async () => {
    try {
      await connectToDatabase();
      const result = await StoreAlert.updateMany(
        { userId: caller!.userId, read: false },
        { $set: { read: true } }
      );

      return NextResponse.json({
        read: true,
        unread_count: 0,
        marked_count: result.modifiedCount,
        message: 'All alerts marked as read',
      });
    } catch (error: any) {
      return apiError('INTERNAL_ERROR', error.message || 'Failed to mark all alerts as read', 500);
    }
  });
}
