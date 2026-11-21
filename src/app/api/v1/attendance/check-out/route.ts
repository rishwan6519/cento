import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AttendanceRecord from '@/models/AttendanceRecord';
import { requireAuth } from '@/lib/storesparc/auth';
import { withIdempotency } from '@/lib/storesparc/idempotency';
import { apiError, conflictError } from '@/lib/storesparc/errors';

export async function POST(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  return withIdempotency(req, caller!.userId, async () => {
    try {
      await connectToDatabase();
      const body = await req.json().catch(() => ({}));
      const clientDate = body.client_timestamp ? new Date(body.client_timestamp) : new Date();
      const todayStr = clientDate.toISOString().split('T')[0];

      const attendance = await AttendanceRecord.findOne({
        userId: caller!.userId,
        date: todayStr,
      });

      if (!attendance || attendance.phase !== 'checked_in') {
        return conflictError('NOT_CHECKED_IN', 'Cannot check out because you are not checked in');
      }

      const checkInTime = attendance.checkedInAt ? attendance.checkedInAt.getTime() : clientDate.getTime();
      const workedMs = Math.max(0, clientDate.getTime() - checkInTime);
      const workedMinutes = Math.round(workedMs / (1000 * 60));

      attendance.phase = 'checked_out';
      attendance.checkedOutAt = clientDate;
      attendance.workedMinutes = workedMinutes;

      await attendance.save();

      return NextResponse.json({
        verdict: 'accepted',
        server_timestamp: new Date().toISOString(),
        message: 'Checked out successfully',
        worked_minutes: workedMinutes,
        phase: 'checked_out',
      });
    } catch (error: any) {
      return apiError('INTERNAL_ERROR', error.message || 'Check-out failed', 500);
    }
  });
}

