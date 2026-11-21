import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import StoreTask from '@/models/StoreTask';
import { requireAuth } from '@/lib/storesparc/auth';
import { withIdempotency } from '@/lib/storesparc/idempotency';
import { apiError } from '@/lib/storesparc/errors';

export async function GET(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const query: any = { storeId: caller!.storeId };

    // Staff never sees manager-only tasks
    if (caller!.role === 'Staff') {
      query.category = { $ne: 'manager_only' };
    }

    const tasks = await StoreTask.find(query).sort({ createdAt: -1 });

    const formatted = tasks.map((t) => {
      const isAssignedToMe = t.assigneeId === caller!.userId;
      const isClaimedByMe = t.claimedBy === caller!.userId;
      const canClaim = t.status === 'open' && !t.assigneeId;
      const canComplete =
        t.status !== 'completed' &&
        (isAssignedToMe || isClaimedByMe || caller!.role === 'Store Manager');

      return {
        id: t._id.toString(),
        title: t.title,
        category: t.category,
        note: t.note || null,
        role_label: t.role || null,
        due: t.dueDate ? t.dueDate.toISOString() : null,
        assignee_name: t.assigneeName || null,
        assigned_to_me: isAssignedToMe,
        completed_by: t.completedBy || null,
        completed_at: t.completedAt ? t.completedAt.toISOString() : null,
        can_claim: canClaim,
        can_complete: canComplete,
        created_by: t.createdBy,
        status: t.status,
      };
    });

    return NextResponse.json({ tasks: formatted });
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', error.message || 'Failed to fetch tasks', 500);
  }
}

export async function POST(req: NextRequest) {
  // Creating tasks is allowed for Store Manager (and Central Admin)
  const { caller, errorResponse } = await requireAuth(req, ['Store Manager', 'Central admin']);
  if (errorResponse) return errorResponse;

  return withIdempotency(req, caller!.userId, async () => {
    try {
      await connectToDatabase();
      const body = await req.json();
      const { title, note, category = 'group', role, assignee_id, assignee_name, due_date } = body;

      if (!title) {
        return apiError('VALIDATION_ERROR', 'Title is required', 400);
      }

      const task = await StoreTask.create({
        storeId: caller!.storeId,
        title,
        note,
        category,
        role,
        assigneeId: assignee_id || undefined,
        assigneeName: assignee_name || undefined,
        dueDate: due_date ? new Date(due_date) : undefined,
        status: assignee_id ? 'claimed' : 'open',
        createdBy: caller!.displayName,
      });

      return NextResponse.json({
        id: task._id.toString(),
        title: task.title,
        category: task.category,
        status: task.status,
        message: 'Task created successfully',
      });
    } catch (error: any) {
      return apiError('INTERNAL_ERROR', error.message || 'Failed to create task', 500);
    }
  });
}

