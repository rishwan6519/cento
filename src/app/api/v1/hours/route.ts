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

    // 1. Check if staff member had any published shifts that week
    const shifts = await RosterShift.find({
      userId: caller!.userId,
      weekStart,
      status: 'published',
    }).sort({ date: 1, startMinutes: 1 });

    // Nothing when the staff member had no published shift that week
    if (shifts.length === 0) {
      return NextResponse.json({
        week_start: weekStart,
        has_published_shifts: false,
        message: 'No published shifts for this week',
      });
    }

    // 2. Fetch or initialize WeeklyHours record
    let weekly = await WeeklyHours.findOne({
      userId: caller!.userId,
      weekStart,
    });

    // 3. Query all attendance records for the 7 days of the week
    const weekStartDate = new Date(weekStart);
    const dayDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStartDate);
      d.setDate(d.getDate() + i);
      dayDates.push(d.toISOString().split('T')[0]);
    }

    const attendanceRecords = await AttendanceRecord.find({
      userId: caller!.userId,
      date: { $in: dayDates },
    });

    const attendanceMap = new Map<string, any>();
    attendanceRecords.forEach((a) => attendanceMap.set(a.date, a));

    const shiftMap = new Map<string, any>();
    shifts.forEach((s) => shiftMap.set(s.date, s));

    // 4. Query pending or approved attendance corrections for this week
    const pendingCorrections = await ApprovalRequest.find({
      requesterId: caller!.userId,
      kind: 'attendance_correction',
      'detail.week_start': weekStart,
    }).sort({ createdAt: -1 });

    const latestCorrection = pendingCorrections[0];
    const correctionEntriesMap = new Map<string, any>();
    if (latestCorrection && Array.isArray(latestCorrection.detail?.entries)) {
      latestCorrection.detail.entries.forEach((e: any) => {
        correctionEntriesMap.set(e.date, {
          start: e.start,
          end: e.end,
          status: latestCorrection.status,
        });
      });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    let totalRosteredMinutes = 0;
    let totalRecordedMinutes = 0;

    // 5. Construct per-day items
    const days = dayDates.map((dateStr) => {
      const shift = shiftMap.get(dateStr);
      const att = attendanceMap.get(dateStr);
      const correction = correctionEntriesMap.get(dateStr) || null;

      let rosteredShiftData = null;
      if (shift) {
        const shiftDuration = Math.max(0, shift.endMinutes - shift.startMinutes);
        totalRosteredMinutes += shiftDuration;
        rosteredShiftData = {
          id: shift._id.toString(),
          start_minutes: shift.startMinutes,
          end_minutes: shift.endMinutes,
        };
      }

      // Compute state
      let state: 'recorded' | 'missing_check_out' | 'not_recorded' | 'on_shift' | 'not_worked_yet' = 'not_recorded';
      let recStart: number | null = null;
      let recEnd: number | null = null;

      if (dateStr > todayStr) {
        state = 'not_worked_yet';
      } else if (att) {
        if (att.checkedInAt) {
          recStart = att.checkedInAt.getHours() * 60 + att.checkedInAt.getMinutes();
        }
        if (att.checkedOutAt) {
          recEnd = att.checkedOutAt.getHours() * 60 + att.checkedOutAt.getMinutes();
        }

        if (att.phase === 'checked_in') {
          state = dateStr === todayStr ? 'on_shift' : 'missing_check_out';
        } else if (att.phase === 'checked_out') {
          state = 'recorded';
          totalRecordedMinutes += att.workedMinutes || 0;
        } else if (att.phase === 'awaiting_manager_confirmation') {
          state = 'missing_check_out';
        } else {
          state = 'not_recorded';
        }
      } else if (shift && dateStr <= todayStr) {
        state = 'not_recorded';
      } else {
        state = 'not_recorded';
      }

      const isConfirmed = weekly ? weekly.status === 'confirmed' : false;
      const editable = !isConfirmed && (state === 'recorded' || state === 'missing_check_out' || state === 'not_recorded');

      return {
        date: dateStr,
        rostered_shift: rosteredShiftData,
        state,
        recorded_start: recStart,
        recorded_end: recEnd,
        editable,
        correction,
      };
    });

    // 6. Compute week status and confirmation availability
    const lastDayOfWeek = dayDates[6];
    const isWeekCompleted = todayStr > lastDayOfWeek;
    let computedStatus: 'in_progress' | 'needs_confirmation' | 'confirmed' = 'in_progress';

    if (weekly && weekly.status === 'confirmed') {
      computedStatus = 'confirmed';
    } else if (isWeekCompleted) {
      computedStatus = 'needs_confirmation';
    } else {
      computedStatus = 'in_progress';
    }

    if (!weekly) {
      weekly = await WeeklyHours.create({
        userId: caller!.userId,
        storeId: caller!.storeId,
        weekStart,
        status: computedStatus,
        rosteredMinutes: totalRosteredMinutes,
        recordedMinutes: totalRecordedMinutes,
        canConfirm: computedStatus === 'needs_confirmation',
      });
    } else {
      weekly.rosteredMinutes = totalRosteredMinutes;
      weekly.recordedMinutes = totalRecordedMinutes;
      if (weekly.status !== 'confirmed') {
        weekly.status = computedStatus;
        weekly.canConfirm = computedStatus === 'needs_confirmation';
      }
      await weekly.save();
    }

    return NextResponse.json({
      week_start: weekStart,
      status: weekly.status,
      rostered_minutes: weekly.rosteredMinutes,
      recorded_minutes: weekly.recordedMinutes,
      can_confirm: weekly.canConfirm && weekly.status !== 'confirmed',
      confirmed_at: weekly.confirmedAt ? weekly.confirmedAt.toISOString() : null,
      corrections_pending: weekly.correctionsPending || Boolean(latestCorrection && latestCorrection.status === 'pending'),
      days,
    });
  } catch (error: any) {
    console.error('Error fetching weekly hours:', error);
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
      const { action, week_start, corrections = [], entries } = body;

      const weekStart = week_start;
      if (!weekStart) {
        return apiError('VALIDATION_ERROR', 'Field week_start is required', 400);
      }

      let weekly = await WeeklyHours.findOne({
        userId: caller!.userId,
        weekStart,
      });

      if (!weekly) {
        weekly = new WeeklyHours({
          userId: caller!.userId,
          storeId: caller!.storeId,
          weekStart,
          status: 'in_progress',
        });
      }

      const editEntries = corrections.length > 0 ? corrections : (entries || []);

      if (action === 'submit_corrections') {
        if (weekly.status === 'confirmed') {
          return conflictError('ALREADY_CONFIRMED', 'Cannot submit corrections for a confirmed week');
        }

        // All of a week's edits go as one single attendance correction approval request
        const approval = await ApprovalRequest.create({
          storeId: caller!.storeId,
          kind: 'attendance_correction',
          requesterId: caller!.userId,
          requesterName: caller!.displayName,
          summary: `${caller!.displayName} submitted weekly attendance corrections for ${weekStart}`,
          detail: { week_start: weekStart, entries: editEntries },
          status: 'pending',
          declineReasons: [
            'Hours do not match store surveillance or register logs',
            'Unauthorized overtime hours',
            'Incomplete or missing shift entry',
          ],
        });

        weekly.correctionsPending = true;
        await weekly.save();

        return NextResponse.json({
          status: 'corrections_submitted',
          approval_id: approval._id.toString(),
          message: 'All weekly attendance corrections submitted as one request to Store Manager',
          week_start: weekStart,
        });
      } else if (action === 'confirm_week') {
        if (weekly.status === 'confirmed') {
          return conflictError('ALREADY_CONFIRMED', 'This week has already been confirmed');
        }

        weekly.status = 'confirmed';
        weekly.confirmedAt = new Date();
        weekly.canConfirm = false;
        await weekly.save();

        return NextResponse.json({
          status: 'confirmed',
          confirmed_at: weekly.confirmedAt.toISOString(),
          message: 'Week hours confirmed successfully',
          week_start: weekStart,
        });
      } else {
        return apiError('INVALID_ACTION', 'Action must be submit_corrections or confirm_week', 400);
      }
    } catch (error: any) {
      return apiError('INTERNAL_ERROR', error.message || 'Failed to process hours action', 500);
    }
  });
}
