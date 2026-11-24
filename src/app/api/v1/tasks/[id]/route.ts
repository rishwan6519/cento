import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import StoreTask from '@/models/StoreTask';
import { requireAuth } from '@/lib/storesparc/auth';
import { withIdempotency } from '@/lib/storesparc/idempotency';
import { apiError, notFoundError } from '@/lib/storesparc/errors';

// Helper to format a task matching Staff Area 7 specifications
function formatTask(t: any, caller: any) {
  const isAssignedToMe = t.assigneeId === caller.userId;
  const isClaimedByMe = t.claimedBy === caller.userId;
  const canClaim = t.status === 'open' && !t.assigneeId;
  const canComplete =
    t.status !== 'completed' &&
    (isAssignedToMe || isClaimedByMe || caller.role === 'Store Manager' || caller.role === 'Central admin');
  const canRelease =
    t.status === 'claimed' &&
    (isClaimedByMe || isAssignedToMe || caller.role === 'Store Manager' || caller.role === 'Central admin');

  let dueObj: { date: string; time: string | null } | null = null;
  if (t.dueDate) {
    const d = new Date(t.dueDate);
    const hasTime = d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0;
    dueObj = {
      date: d.toISOString().split('T')[0],
      time: hasTime ? d.toISOString().substring(11, 16) : null,
    };
  }

  return {
    id: t._id.toString(),
    title: t.title,
    category: t.category,
    note: t.note || null,
    role_label: t.role || null,
    due: dueObj,
    assignee_name: t.assigneeName || null,
    assigned_to_me: isAssignedToMe,
    completed_by: t.completedBy || null,
    completed_at: t.completedAt ? t.completedAt.toISOString() : null,
    can_claim: canClaim,
    can_complete: canComplete,
    can_release: canRelease,
    created_by: t.createdBy,
    status: t.status,
  };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { caller, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  const { id } = await context.params;

  try {
    await connectToDatabase();
    const task = await StoreTask.findById(id);
    if (!task) {
      return notFoundError('Task not found');
    }

    if (caller!.role === 'Staff' && task.category === 'manager_only') {
      return apiError('FORBIDDEN', 'Manager-only tasks cannot be viewed by Staff', 403);
    }

    return NextResponse.json(formatTask(task, caller));
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', error.message || 'Failed to fetch task', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { caller, errorResponse } = await requireAuth(req, ['Store Manager', 'Central admin']);
  if (errorResponse) return errorResponse;

  const { id } = await context.params;

  return withIdempotency(req, caller!.userId, async () => {
    try {
      await connectToDatabase();
      const body = await req.json();
      const { title, note, category, role, due } = body;

      const task = await StoreTask.findById(id);
      if (!task) {
        return notFoundError('Task not found');
      }

      if (title !== undefined) task.title = title;
      if (note !== undefined) task.note = note;
      if (category !== undefined) task.category = category;
      if (role !== undefined) task.role = role;

      if (due !== undefined) {
        if (due === null) {
          task.dueDate = undefined;
        } else if (typeof due === 'string') {
          task.dueDate = new Date(due);
        } else if (due.date) {
          const timeStr = due.time ? `T${due.time}:00Z` : 'T00:00:00Z';
          task.dueDate = new Date(`${due.date}${timeStr}`);
        }
      }

      await task.save();

      return NextResponse.json(formatTask(task, caller));
    } catch (error: any) {
      return apiError('INTERNAL_ERROR', error.message || 'Failed to update task', 500);
    }
  });
}

