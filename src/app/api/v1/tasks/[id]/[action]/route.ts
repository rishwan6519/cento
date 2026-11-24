import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import StoreTask from '@/models/StoreTask';
import { requireAuth } from '@/lib/storesparc/auth';
import { withIdempotency } from '@/lib/storesparc/idempotency';
import { apiError, notFoundError, conflictError } from '@/lib/storesparc/errors';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string; action: string }> }
) {
  const { caller, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  const { id, action } = await context.params;

  return withIdempotency(req, caller!.userId, async () => {
    try {
      await connectToDatabase();
      const task = await StoreTask.findById(id);

      if (!task) {
        return notFoundError('Task not found');
      }

      // ── 1. CLAIM A TASK ──────────────────────────────────────────────────
      if (action === 'claim') {
        if (task.status !== 'open') {
          return conflictError('TASK_NOT_OPEN', `Task is already ${task.status}`);
        }
        task.status = 'claimed';
        task.assigneeId = caller!.userId;
        task.assigneeName = caller!.displayName;
        task.claimedBy = caller!.userId;
        await task.save();

        return NextResponse.json({
          id: task._id.toString(),
          status: task.status,
          assignee_name: task.assigneeName,
          can_release: true,
          can_complete: true,
          message: 'Task claimed successfully',
        });
      }

      // ── 2. COMPLETE A TASK ────────────────────────────────────────────────
      if (action === 'complete') {
        if (task.status === 'completed') {
          return conflictError('ALREADY_COMPLETED', 'Task is already marked completed');
        }
        task.status = 'completed';
        task.completedBy = caller!.displayName;
        task.completedAt = new Date();
        await task.save();

        return NextResponse.json({
          id: task._id.toString(),
          status: task.status,
          completed_by: task.completedBy,
          completed_at: task.completedAt.toISOString(),
          message: 'Task marked as completed',
        });
      }

      // ── 3. RELEASE A TASK BACK TO THE TEAM ────────────────────────────────
      if (action === 'release') {
        if (task.status !== 'claimed') {
          return conflictError('TASK_NOT_CLAIMED', 'Only claimed tasks can be released back to the team');
        }

        const isClaimedByMe = task.claimedBy === caller!.userId || task.assigneeId === caller!.userId;
        const isManager = caller!.role === 'Store Manager' || caller!.role === 'Central admin';

        if (!isClaimedByMe && !isManager) {
          return apiError('FORBIDDEN', 'You can only release tasks that you have claimed', 403);
        }

        task.status = 'open';
        task.assigneeId = undefined;
        task.assigneeName = undefined;
        task.claimedBy = undefined;
        await task.save();

        return NextResponse.json({
          id: task._id.toString(),
          status: 'open',
          message: 'Task released back to the team',
        });
      }

      // ── 4. ASSIGN A TASK (Manager Only) ──────────────────────────────────
      if (action === 'assign') {
        if (caller!.role !== 'Store Manager' && caller!.role !== 'Central admin') {
          return apiError('FORBIDDEN', 'Only Store Managers can assign or reassign tasks', 403);
        }
        const body = await req.json().catch(() => ({}));
        task.assigneeId = body.assignee_id || undefined;
        task.assigneeName = body.assignee_name || undefined;
        task.status = task.assigneeId ? 'claimed' : 'open';
        await task.save();

        return NextResponse.json({
          id: task._id.toString(),
          status: task.status,
          assignee_name: task.assigneeName || 'Open to team',
          message: 'Task assignment updated',
        });
      }

      return apiError('INVALID_ACTION', `Action ${action} is not supported. Use claim, complete, release, or assign.`, 400);
    } catch (error: any) {
      return apiError('INTERNAL_ERROR', error.message || 'Task action failed', 500);
    }
  });
}
