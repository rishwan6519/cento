import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import RosterWeek from '@/models/RosterWeek';
import RosterShift from '@/models/RosterShift';
import StaffAvailability from '@/models/StaffAvailability';
import StoreConfig from '@/models/StoreConfig';
import { requireAuth } from '@/lib/storesparc/auth';
import { withIdempotency } from '@/lib/storesparc/idempotency';
import { apiError, conflictError } from '@/lib/storesparc/errors';

export async function POST(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req, ['Store Manager', 'Central admin']);
  if (errorResponse) return errorResponse;

  return withIdempotency(req, caller!.userId, async () => {
    try {
      await connectToDatabase();
      const body = await req.json();
      const { week_start, staff_member, staff_name, shifts = [] } = body;

      if (!week_start || !staff_member) {
        return apiError('VALIDATION_ERROR', 'Fields week_start and staff_member are required', 400);
      }

      const storeId = caller!.storeId;

      let week = await RosterWeek.findOne({ storeId, weekStart: week_start });
      if (!week) {
        week = await RosterWeek.create({
          storeId,
          weekStart: week_start,
          status: 'draft',
          editable: true,
          hasUnpublishedChanges: true,
        });
      }

      if (!week.editable) {
        return conflictError('WEEK_LOCKED', week.lockedReason || 'This week is locked for editing');
      }

      // 1. Validate Unavailability: Refuse shift on a day staff member declared unavailable
      const staffAvail = await StaffAvailability.findOne({
        storeId,
        userId: staff_member,
        $or: [{ weekStart: week_start }, { 'days.date': { $in: shifts.map((s: any) => s.date) } }],
      });

      if (staffAvail && Array.isArray(staffAvail.days)) {
        const unavailDates = new Set(
          staffAvail.days.filter((d: any) => d.status === 'unavailable').map((d: any) => d.date)
        );
        for (const s of shifts) {
          if (unavailDates.has(s.date)) {
            return conflictError(
              'STAFF_UNAVAILABLE',
              `Cannot assign shift on ${s.date}: staff member declared unavailable for this date`
            );
          }
        }
      }

      // 2. Validate Trading Hours: Refuse shift outside trading hours (+30m opening/closing buffer)
      const storeConfig = await StoreConfig.findOne({ storeId });
      if (storeConfig && Array.isArray(storeConfig.tradingHours)) {
        for (const s of shifts) {
          const shiftDate = new Date(`${s.date}T00:00:00Z`);
          const dayNum = shiftDate.getUTCDay();
          const dayHours = storeConfig.tradingHours.find((th: any) => th.weekday === dayNum);
          if (dayHours && !dayHours.isClosed) {
            if (s.start < dayHours.openMinutes - 30 || s.end > dayHours.closeMinutes + 30) {
              return conflictError(
                'OUTSIDE_TRADING_HOURS',
                `Shift on ${s.date} (${s.start}-${s.end} mins) is outside store trading hours (${dayHours.openMinutes}-${dayHours.closeMinutes})`
              );
            }
          }
        }
      }

      // 3. Dual-State Versioning (PRD Open Question 2):
      // When a published week is edited, staff continues seeing currently published shifts until republished.
      // We stage changes as drafts and flag hasUnpublishedChanges.
      const isAlreadyPublished = !!week.publishedAt;
      week.hasUnpublishedChanges = true;
      if (!isAlreadyPublished) {
        week.status = 'draft';
      }
      await week.save();

      // Remove existing draft shifts for this staff member in this week
      await RosterShift.deleteMany({
        storeId,
        weekStart: week_start,
        userId: staff_member,
        status: 'draft',
      });

      // Insert new draft shifts
      const newShifts = shifts.map((s: any) => ({
        storeId,
        weekStart: week_start,
        userId: staff_member,
        userName: staff_name || 'Staff Member',
        date: s.date,
        startMinutes: s.start,
        endMinutes: s.end,
        swapEligible: true,
        status: 'draft',
      }));

      if (newShifts.length > 0) {
        await RosterShift.insertMany(newShifts);
      }

      return NextResponse.json({
        week_start,
        status: week.status,
        has_unpublished_changes: true,
        message: 'Shifts staged successfully as draft. Publish week to make visible to staff.',
        assigned_count: newShifts.length,
      });
    } catch (error: any) {
      return apiError('INTERNAL_ERROR', error.message || 'Failed to assign shifts', 500);
    }
  });
}
