import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import WeeklyHours from '@/models/WeeklyHours';
import RosterShift from '@/models/RosterShift';
import AttendanceRecord from '@/models/AttendanceRecord';
import ApprovalRequest from '@/models/ApprovalRequest';
import { requireAuth } from '@/lib/storesparc/auth';
import { withIdempotency } from '@/lib/storesparc/idempotency';
import { apiError, notFoundError, conflictError } from '@/lib/storesparc/errors';

export async function GET(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const searchParams = req.nextUrl.searchParams;
    const weekStart = searchParams.get('week_start');

    if (!weekStart) {
      return apiError('VALIDATION_ERROR', 'Parameter week_start (YYYY-MM-DD) is required', 400);
    }

    // Check if staff member had any published shift that week
    const shifts = await RosterShift.find({
      userId: caller!.userId,
      weekStart,
      status: 'published',
    });

    if (shifts.length === 0) {
      return NextResponse.json({
        week_start: weekStart,
        has_published_shifts: false,
        message: 'No published shifts for this week',
      });
    }

    let weekly = await WeeklyHours.findOne({
      userId: caller!.userId,
      weekStart,
    });

    const rosteredMinutes = shifts.reduce(
      (sum, s) => sum + Math.max(0, s.endMinutes - s.startMinutes),
      0
    );

    if (!weekly) {
      weekly = await WeeklyHours.create({
        userId: caller!.userId,
        storeId: caller!.storeId,
        weekStart,
        status: 'in_progress',
        rosteredMinutes,
        recordedMinutes: 0,
        canConfirm: true,
      });
    }

    return NextResponse.json({
      week_start: weekStart,
      status: weekly.status,
      rostered_minutes: weekly.rosteredMinutes,
      recorded_minutes: weekly.recordedMinutes,
      can_confirm: weekly.canConfirm && weekly.status !== 'confirmed',
      confirmed_at: weekly.confirmedAt ? weekly.confirmedAt.toISOString() : null,
      corrections_pending: weekly.correctionsPending || false,
    });
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', error.message || 'Failed to fetch weekly hours', 500);
  }
}

export async function POST(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  return withIdempotency(req, caller!.userId, async () => {
    try {
      await connectToDatabase();
      const body = await req.json();
      const { action, week_start, corrections = [] } = body;

      if (!week_start) {
        return apiError('VALIDATION_ERROR', 'Field week_start is required', 400);
      }

      let weekly = await WeeklyHours.findOne({
        userId: caller!.userId,
        weekStart: week_start,
      });

      if (!weekly) {
        weekly = new WeeklyHours({
          userId: caller!.userId,
          storeId: caller!.storeId,
          weekStart: week_start,
          status: 'in_progress',
        });
      }

      if (action === 'submit_corrections') {
        // Creates an attendance correction approval request for the Store Manager
        const approval = await ApprovalRequest.create({
          storeId: caller!.storeId,
          kind: 'attendance_correction',
          requesterId: caller!.userId,
          requesterName: caller!.displayName,
          summary: `${caller!.displayName} submitted weekly attendance correction for ${week_start}`,
          detail: { week_start, entries: corrections },
          status: 'pending',
          declineReasons: [
            'Hours do not match store records',
            'Unapproved overtime',
            'Incomplete entries',
          ],
        });

        weekly.correctionsPending = true;
        await weekly.save();

        return NextResponse.json({
          status: 'corrections_submitted',
          approval_id: approval._id.toString(),
          message: 'Attendance corrections submitted to Store Manager',
        });
      } else if (action === 'confirm_week') {
        if (weekly.status === 'confirmed') {
          return conflictError('ALREADY_CONFIRMED', 'This week has already been confirmed');
        }

        weekly.status = 'confirmed';
        weekly.confirmedAt = new Date();
        await weekly.save();

        return NextResponse.json({
          status: 'confirmed',
          confirmed_at: weekly.confirmedAt.toISOString(),
          message: 'Week hours confirmed successfully',
        });
      } else {
        return apiError('INVALID_ACTION', 'Action must be submit_corrections or confirm_week', 400);
      }
    } catch (error: any) {
      return apiError('INTERNAL_ERROR', error.message || 'Failed to process hours action', 500);
    }
  });
}

