import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import RosterWeek from '@/models/RosterWeek';
import RosterShift from '@/models/RosterShift';
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
        });
      }

      if (!week.editable) {
        return conflictError('WEEK_LOCKED', week.lockedReason || 'This week is locked for editing');
      }

      // If week was published, setting shifts puts week back to draft until republished (PRD 5.1)
      if (week.status === 'published') {
        week.status = 'draft';
        await week.save();
      }

      // Remove previous draft shifts for this staff member in this week
      await RosterShift.deleteMany({
        storeId,
        weekStart: week_start,
        userId: staff_member,
      });

      // Insert new shifts
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
        status: 'draft',
        message: 'Shifts updated successfully',
        assigned_count: newShifts.length,
      });
    } catch (error: any) {
      return apiError('INTERNAL_ERROR', error.message || 'Failed to assign shifts', 500);
    }
  });
}

