import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import RosterWeek from '@/models/RosterWeek';
import RosterShift from '@/models/RosterShift';
import ApprovalRequest from '@/models/ApprovalRequest';
import { requireAuth } from '@/lib/storesparc/auth';
import { apiError } from '@/lib/storesparc/errors';

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

    const week = await RosterWeek.findOne({
      storeId: caller!.storeId,
      weekStart,
    });

    // The server decides which weeks are published. An unpublished week returns nothing; the app never shows a draft.
    if (!week || week.status !== 'published') {
      return NextResponse.json({
        store_id: caller!.storeId,
        week_start: weekStart,
        shifts: [],
      });
    }

    const shifts = await RosterShift.find({
      storeId: caller!.storeId,
      weekStart,
      userId: caller!.userId,
      status: 'published',
    }).sort({ date: 1, startMinutes: 1 });

    // Look up any pending swap requests to dynamically evaluate swap_eligible
    const shiftIds = shifts.map((s) => s._id.toString());
    const pendingSwaps = await ApprovalRequest.find({
      'detail.shift_id': { $in: shiftIds },
      status: 'pending',
    }).select('detail.shift_id');

    const pendingShiftIds = new Set(pendingSwaps.map((p) => p.detail?.shift_id));

    return NextResponse.json({
      store_id: caller!.storeId,
      week_start: weekStart,
      shifts: shifts.map((s) => ({
        id: s._id.toString(),
        date: s.date,
        start_minutes: s.startMinutes,
        end_minutes: s.endMinutes,
        swap_eligible: Boolean(s.swapEligible) && !pendingShiftIds.has(s._id.toString()),
      })),
    });
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', error.message || 'Failed to fetch roster', 500);
  }
}
