import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import RosterWeek from '@/models/RosterWeek';
import RosterShift from '@/models/RosterShift';
import StaffAvailability from '@/models/StaffAvailability';
import User from '@/models/User';
import { requireAuth } from '@/lib/storesparc/auth';
import { apiError } from '@/lib/storesparc/errors';

export async function GET(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req, ['Store Manager', 'Central admin']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const searchParams = req.nextUrl.searchParams;
    const weekStart = searchParams.get('week_start');

    if (!weekStart) {
      return apiError('VALIDATION_ERROR', 'Parameter week_start (YYYY-MM-DD) is required', 400);
    }

    const storeId = caller!.storeId;

    let week = await RosterWeek.findOne({ storeId, weekStart });
    if (!week) {
      week = await RosterWeek.create({
        storeId,
        weekStart,
        status: 'draft',
        editable: true,
        coverageGaps: [],
      });
    }

    // Fetch all shifts in this week
    const shifts = await RosterShift.find({ storeId, weekStart });

    // Fetch availability submissions for this week
    const availabilities = await StaffAvailability.find({ storeId, weekStart });

    // Group shifts by staff member
    const staffMap: Record<string, any> = {};

    shifts.forEach((s) => {
      if (!staffMap[s.userId]) {
        staffMap[s.userId] = {
          user_id: s.userId,
          name: s.userName,
          availability_submitted: false,
          rostered_minutes: 0,
          shifts: [],
        };
      }
      const duration = Math.max(0, s.endMinutes - s.startMinutes);
      staffMap[s.userId].rostered_minutes += duration;
      staffMap[s.userId].shifts.push({
        id: s._id.toString(),
        date: s.date,
        start_minutes: s.startMinutes,
        end_minutes: s.endMinutes,
        swap_eligible: s.swapEligible,
      });
    });

    // Mark availability status
    availabilities.forEach((a) => {
      if (!staffMap[a.userId]) {
        staffMap[a.userId] = {
          user_id: a.userId,
          name: a.userName,
          availability_submitted: true,
          rostered_minutes: 0,
          shifts: [],
          declared_availability: a.days,
        };
      } else {
        staffMap[a.userId].availability_submitted = true;
        staffMap[a.userId].declared_availability = a.days;
      }
    });

    return NextResponse.json({
      week_start: week.weekStart,
      status: week.status,
      editable: week.editable,
      locked_reason: week.lockedReason || null,
      published_at: week.publishedAt ? week.publishedAt.toISOString() : null,
      coverage: {
        gaps: week.coverageGaps.map((g: any) => ({
          date: g.date,
          from_minutes: g.fromMinutes,
          to_minutes: g.toMinutes,
          message: g.message,
        })),
      },
      staff: Object.values(staffMap),
    });
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', error.message || 'Failed to fetch roster plan', 500);
  }
}

