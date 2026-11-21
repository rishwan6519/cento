import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import ApprovalRequest from '@/models/ApprovalRequest';
import AttendanceRecord from '@/models/AttendanceRecord';
import { requireAuth } from '@/lib/storesparc/auth';
import { withIdempotency } from '@/lib/storesparc/idempotency';
import { apiError, notFoundError, conflictError } from '@/lib/storesparc/errors';

export async function POST(
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
      const { approve, reason, client_timestamp } = body;

      if (approve === undefined) {
        return apiError('VALIDATION_ERROR', 'Field "approve" (boolean) is required', 400);
      }

      if (!approve && !reason) {
        return apiError('VALIDATION_ERROR', 'A decline reason must be provided when declining', 400);
      }

      const approval = await ApprovalRequest.findById(id);
      if (!approval) {
        return notFoundError('Approval request not found');
      }

      if (approval.status !== 'pending') {
        return conflictError('ALREADY_DECIDED', `This item has already been decided (${approval.status})`);
      }

      const decisionTime = client_timestamp ? new Date(client_timestamp) : new Date();
      approval.status = approve ? 'approved' : 'declined';
      approval.decidedAt = decisionTime;
      approval.decidedBy = caller!.displayName;
      approval.decisionReason = approve ? undefined : reason;

      await approval.save();

      // If it's a manual check-in request, settle the attendance record
      if (approval.kind === 'manual_checkin') {
        let attendance = await AttendanceRecord.findOne({ approvalRequestId: approval._id.toString() });

        if (!attendance) {
          const dateStr = approval.submittedAt.toISOString().split('T')[0];
          attendance = await AttendanceRecord.findOne({
            userId: approval.requesterId,
            date: dateStr,
          });
        }

        if (attendance) {
          if (approve) {
            attendance.phase = 'checked_in';
            attendance.locationCheck = 'manager_confirmed';
            attendance.checkedInAt = attendance.checkedInAt || decisionTime;
            attendance.managerNote = 'Confirmed by Store Manager';
          } else {
            attendance.phase = 'not_checked_in';
            attendance.locationCheck = 'manager_declined';
            attendance.managerNote = reason || 'Declined by Store Manager';
          }
          await attendance.save();
        }
      }

      return NextResponse.json({
        id: approval._id.toString(),
        kind: approval.kind,
        status: approval.status,
        decided_at: approval.decidedAt?.toISOString(),
        decided_by: approval.decidedBy,
        decision_reason: approval.decisionReason || null,
        message: `Approval request ${approval.status}`,
      });
    } catch (error: any) {
      return apiError('INTERNAL_ERROR', error.message || 'Failed to process approval decision', 500);
    }
  });
}

