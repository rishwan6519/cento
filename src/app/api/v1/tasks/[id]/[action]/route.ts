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
          message: 'Task claimed successfully',
        });
      } else if (action === 'complete') {
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
      } else if (action === 'assign') {
        // Manager only
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
      } else {
        return apiError('INVALID_ACTION', `Action ${action} is not supported`, 400);
      }
    } catch (error: any) {
      return apiError('INTERNAL_ERROR', error.message || 'Task action failed', 500);
    }
  });
}

