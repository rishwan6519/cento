import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import StoreAlert from '@/models/StoreAlert';
import { requireAuth } from '@/lib/storesparc/auth';
import { withIdempotency } from '@/lib/storesparc/idempotency';
import { apiError, notFoundError } from '@/lib/storesparc/errors';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { caller, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  const { id } = await context.params;

  return withIdempotency(req, caller!.userId, async () => {
    try {
      await connectToDatabase();
      const alert = await StoreAlert.findOne({
        _id: id,
        userId: caller!.userId,
      });

      if (!alert) {
        return notFoundError('Alert not found');
      }

      alert.read = true;
      await alert.save();

      return NextResponse.json({
        id: alert._id.toString(),
        read: true,
        message: 'Alert marked as read',
      });
    } catch (error: any) {
      return apiError('INTERNAL_ERROR', error.message || 'Failed to update alert', 500);
    }
  });
}

