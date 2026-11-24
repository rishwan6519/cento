import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import ApprovalRequest from '@/models/ApprovalRequest';
import RosterShift from '@/models/RosterShift';
import { requireAuth } from '@/lib/storesparc/auth';
import { withIdempotency } from '@/lib/storesparc/idempotency';
import { apiError, notFoundError, conflictError } from '@/lib/storesparc/errors';

export async function GET(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const requests = await ApprovalRequest.find({
      requesterId: caller!.userId,
      kind: 'shift_swap',
    }).sort({ createdAt: -1 });

    const formatted = requests.map((r) => ({
      id: r._id.toString(),
      shift_id: r.detail?.shift_id,
      shift_start: r.detail?.shift_start,
      shift_end: r.detail?.shift_end,
      status: r.status,
      submitted_at: r.submittedAt.toISOString(),
      offered_to: 'Open to the team',
      decision_reason: r.decisionReason || null,
      covered_by: r.detail?.covered_by || null,
    }));

    return NextResponse.json({ swap_requests: formatted });
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', error.message || 'Failed to fetch swap requests', 500);
  }
}

export async function POST(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  return withIdempotency(req, caller!.userId, async () => {
    try {
      await connectToDatabase();
      const body = await req.json();
      const { shift_id, client_timestamp, reason } = body;

      if (!shift_id) {
        return apiError('VALIDATION_ERROR', 'Field shift_id is required', 400);
      }

      const shift = await RosterShift.findById(shift_id);
      if (!shift) {
        return notFoundError('Shift not found');
      }

      if (shift.swapEligible === false) {
        return apiError('SWAP_NOT_ELIGIBLE', 'This shift is marked as not eligible for swapping by the store manager', 400);
      }

      // Check if a swap request already open for this shift
      const existing = await ApprovalRequest.findOne({
        'detail.shift_id': shift_id,
        status: 'pending',
      });

      if (existing) {
        return conflictError('SWAP_ALREADY_OPEN', 'A swap request for this shift is already pending');
      }

      const submitTime = client_timestamp ? new Date(client_timestamp) : new Date();

      // Check compliance flags: e.g. short notice (< 24 hours to shift start)
      const shiftStartDateTime = new Date(`${shift.date}T00:00:00Z`);
      shiftStartDateTime.setMinutes(shift.startMinutes);
      const hoursUntilShift = (shiftStartDateTime.getTime() - submitTime.getTime()) / (1000 * 3600);

      let complianceFlag = { flagged: false, reason: undefined as string | undefined };
      if (hoursUntilShift < 24) {
        complianceFlag = {
          flagged: true,
          reason: 'Short notice: Swap requested less than 24h prior to shift start',
        };
      }

      const approval = await ApprovalRequest.create({
        storeId: caller!.storeId,
        kind: 'shift_swap',
        requesterId: caller!.userId,
        requesterName: caller!.displayName,
        summary: reason
          ? `${caller!.displayName}: ${reason}`
          : `${caller!.displayName} requested swap for shift on ${shift.date}`,
        detail: {
          shift_id: shift._id.toString(),
          date: shift.date,
          shift_start: shift.startMinutes,
          shift_end: shift.endMinutes,
          reason: reason || undefined,
        },
        status: 'pending',
        complianceFlag,
        declineReasons: [
          'Insufficient coverage on shift',
          'Skill / role requirement not met',
          'Short notice / within 24 hours of shift',
          'Overtime threshold breach (exceeds contract hours)',
        ],
        submittedAt: submitTime,
      });

      return NextResponse.json({
        id: approval._id.toString(),
        shift_id,
        status: 'pending',
        submitted_at: approval.submittedAt.toISOString(),
        message: 'Shift swap request submitted to Store Manager',
      });
    } catch (error: any) {
      return apiError('INTERNAL_ERROR', error.message || 'Failed to submit swap request', 500);
    }
  });
}

