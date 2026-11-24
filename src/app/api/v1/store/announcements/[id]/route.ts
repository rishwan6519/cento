import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import StoreAnnouncement from '@/models/StoreAnnouncement';
import { requireAuth } from '@/lib/storesparc/auth';
import { withIdempotency } from '@/lib/storesparc/idempotency';
import { apiError, notFoundError, conflictError } from '@/lib/storesparc/errors';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { caller, errorResponse } = await requireAuth(req, ['Store Manager', 'Central admin']);
  if (errorResponse) return errorResponse;

  const { id } = await context.params;

  return withIdempotency(req, caller!.userId, async () => {
    try {
      await connectToDatabase();
      const post = await StoreAnnouncement.findById(id);

      if (!post) {
        return notFoundError('Announcement post not found');
      }

      if (post.status !== 'scheduled') {
        return conflictError('CANNOT_CANCEL', `Cannot cancel post with status "${post.status}". Only scheduled posts can be cancelled.`);
      }

      const now = new Date();
      post.status = 'cancelled';
      await post.save();

      return NextResponse.json({
        id: post._id.toString(),
        message: post.message,
        status: post.status,
        author: post.author,
        created_at: post.createdAt.toISOString(),
        scheduled_for: post.scheduledFor ? post.scheduledFor.toISOString() : null,
        cancelled_at: now.toISOString(),
      });
    } catch (error: any) {
      return apiError('INTERNAL_ERROR', error.message || 'Failed to cancel announcement', 500);
    }
  });
}
