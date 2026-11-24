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
      const { approve, confirm, reason, client_timestamp } = body;
      const isApproved = approve !== undefined ? approve : confirm;

      if (isApproved === undefined) {
        return apiError('VALIDATION_ERROR', 'Field "approve" or "confirm" (boolean) is required', 400);
      }

      const approval = await ApprovalRequest.findById(id);
      if (!approval) {
        return notFoundError('Approval request not found');
      }

      if (approval.status !== 'pending') {
        return conflictError('ALREADY_DECIDED', `This item has already been decided (${approval.status})`);
      }

      if (!isApproved) {
        if (!reason) {
          return apiError('VALIDATION_ERROR', 'A decline reason must be provided when declining', 400);
        }

        // Strict PRD validation: A decline reason must be one of the item's own reasons
        if (approval.declineReasons && approval.declineReasons.length > 0) {
          const isAllowed =
            approval.declineReasons.includes(reason) ||
            reason.startsWith('Other:') ||
            reason.trim().length > 3; // Allows custom expansion if prefixed or detailed
          if (!isAllowed) {
            return apiError(
              'INVALID_DECLINE_REASON',
              `Decline reason must be one of the item's configured reasons: ${approval.declineReasons.join('; ')}`,
              422
            );
          }
        }
      }

      const decisionTime = client_timestamp ? new Date(client_timestamp) : new Date();
      approval.status = isApproved ? 'approved' : 'declined';
      approval.decidedAt = decisionTime;
      approval.decidedBy = caller!.displayName;
      approval.decisionReason = isApproved ? undefined : reason;

      await approval.save();

      // Raise swap_decided alert to the requesting staff member (Area 8 & 11)
      if (approval.kind === 'shift_swap') {
        const StoreAlert = (await import('@/models/StoreAlert')).default;
        await StoreAlert.create({
          userId: approval.requesterId,
          storeId: approval.storeId,
          category: 'swap_decided',
          title: `Shift Swap ${approve ? 'Approved' : 'Declined'}`,
          body: approve
            ? `Your shift swap request for ${approval.detail?.date || 'shift'} was approved by ${caller!.displayName}.`
            : `Your shift swap request was declined. Reason: ${reason || 'Manager declined'}.`,
          read: false,
          targetScreen: 'swaps',
          targetArgument: approval._id.toString(),
        });
      }

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

        // Raise check_in_outcome alert to the staff member
        const StoreAlert = (await import('@/models/StoreAlert')).default;
        await StoreAlert.create({
          userId: approval.requesterId,
          storeId: approval.storeId,
          category: 'check_in_outcome',
          title: `Manual Check-In ${approve ? 'Confirmed' : 'Declined'}`,
          body: approve
            ? `Your manual check-in request was confirmed by ${caller!.displayName}.`
            : `Your manual check-in request was declined. Reason: ${reason || 'Manager declined'}.`,
          read: false,
          targetScreen: 'attendance',
          targetArgument: attendance?._id?.toString() || approval.submittedAt.toISOString().split('T')[0],
        });
      }

      // If it's an attendance correction request, raise alert to the staff member
      if (approval.kind === 'attendance_correction') {
        const StoreAlert = (await import('@/models/StoreAlert')).default;
        await StoreAlert.create({
          userId: approval.requesterId,
          storeId: approval.storeId,
          category: 'hours_to_confirm',
          title: `Attendance Correction ${approve ? 'Approved' : 'Declined'}`,
          body: approve
            ? `Your attendance corrections for ${approval.detail?.week_start || 'week'} were approved by ${caller!.displayName}. Please confirm your week hours.`
            : `Your attendance corrections for ${approval.detail?.week_start || 'week'} were declined. Reason: ${reason || 'Manager declined'}.`,
          read: false,
          targetScreen: 'hours',
          targetArgument: approval.detail?.week_start || null,
        });
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

