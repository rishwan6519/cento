import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import StaffAvailability from '@/models/StaffAvailability';
import RosterWeek from '@/models/RosterWeek';
import { requireAuth } from '@/lib/storesparc/auth';
import { withIdempotency } from '@/lib/storesparc/idempotency';
import { apiError, conflictError } from '@/lib/storesparc/errors';

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

    const rosterWeek = await RosterWeek.findOne({ storeId: caller!.storeId, weekStart });
    const isLocked = rosterWeek ? rosterWeek.status === 'published' : false;

    const record = await StaffAvailability.findOne({
      userId: caller!.userId,
      weekStart,
    });

    return NextResponse.json({
      week_start: weekStart,
      days: record ? record.days : [],
      editable: !isLocked,
      locked_reason: isLocked ? 'Roster is already published for this week' : null,
      submitted_at: record ? record.submittedAt.toISOString() : null,
    });
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', error.message || 'Failed to fetch availability', 500);
  }
}

export async function POST(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  return withIdempotency(req, caller!.userId, async () => {
    try {
      await connectToDatabase();
      const body = await req.json();
      const { week_start, days = [], month } = body;

      if (!week_start) {
        return apiError('VALIDATION_ERROR', 'Field week_start is required', 400);
      }

      // Check if roster already published
      const rosterWeek = await RosterWeek.findOne({ storeId: caller!.storeId, weekStart: week_start });
      if (rosterWeek && rosterWeek.status === 'published') {
        return conflictError('WEEK_LOCKED', 'Cannot update availability because roster is already published');
      }

      let record = await StaffAvailability.findOne({
        userId: caller!.userId,
        weekStart: week_start,
      });

      if (!record) {
        record = new StaffAvailability({
          userId: caller!.userId,
          userName: caller!.displayName,
          storeId: caller!.storeId,
          weekStart: week_start,
          month,
          days,
          submittedAt: new Date(),
        });
      } else {
        record.days = days;
        record.month = month || record.month;
        record.submittedAt = new Date();
      }

      await record.save();

      return NextResponse.json({
        week_start,
        submitted_at: record.submittedAt.toISOString(),
        days: record.days,
        message: 'Availability submitted successfully',
      });
    } catch (error: any) {
      return apiError('INTERNAL_ERROR', error.message || 'Failed to submit availability', 500);
    }
  });
}

