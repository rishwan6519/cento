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

    // The server filters by role, so manager-only tasks never reach Staff
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
        (isAssignedToMe || isClaimedByMe || caller!.role === 'Store Manager' || caller!.role === 'Central admin');
      const canRelease =
        t.status === 'claimed' &&
        (isClaimedByMe || isAssignedToMe || caller!.role === 'Store Manager' || caller!.role === 'Central admin');

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

      // Raise task_assigned or priority_task alerts (PRD GAP-API-008)
      const StoreAlert = (await import('@/models/StoreAlert')).default;
      if (assignee_id) {
        await StoreAlert.create({
          userId: assignee_id,
          storeId: caller!.storeId,
          category: 'task_assigned',
          title: 'New Task Assigned',
          body: `You have been assigned to task: "${task.title}".`,
          read: false,
          targetScreen: 'tasks',
          targetArgument: task._id.toString(),
        });
      } else if (category === 'priority') {
        const User = (await import('@/models/User')).default;
        const staffUsers = await User.find({ storeId: caller!.storeId, role: 'Staff' }).select('_id');
        if (staffUsers.length > 0) {
          const priorityAlerts = staffUsers.map((u: any) => ({
            userId: u._id.toString(),
            storeId: caller!.storeId,
            category: 'priority_task',
            title: 'Priority Task Created',
            body: `Priority task available: "${task.title}".`,
            read: false,
            targetScreen: 'tasks',
            targetArgument: task._id.toString(),
          }));
          await StoreAlert.insertMany(priorityAlerts);
        }
      }

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
