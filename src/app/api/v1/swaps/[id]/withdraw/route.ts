import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import ApprovalRequest from '@/models/ApprovalRequest';
import { requireAuth } from '@/lib/storesparc/auth';
import { withIdempotency } from '@/lib/storesparc/idempotency';
import { apiError, notFoundError, forbiddenError, conflictError } from '@/lib/storesparc/errors';

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
      const approval = await ApprovalRequest.findById(id);
      if (!approval) {
        return notFoundError('Swap request not found');
      }

      if (approval.requesterId !== caller!.userId) {
        return forbiddenError('You can only withdraw your own swap requests');
      }

      if (approval.status !== 'pending') {
        return conflictError('CANNOT_WITHDRAW', `Cannot withdraw request because it is already ${approval.status}`);
      }

      approval.status = 'withdrawn';
      await approval.save();

      return NextResponse.json({
        id: approval._id.toString(),
        status: 'withdrawn',
        server_timestamp: new Date().toISOString(),
        message: 'Shift swap request withdrawn successfully',
      });
    } catch (error: any) {
      return apiError('INTERNAL_ERROR', error.message || 'Failed to withdraw swap request', 500);
    }
  });
}

