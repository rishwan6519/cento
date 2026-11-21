import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AttendanceRecord from '@/models/AttendanceRecord';
import { requireAuth } from '@/lib/storesparc/auth';
import { apiError } from '@/lib/storesparc/errors';

export async function GET(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const today = new Date().toISOString().split('T')[0];

    const record = await AttendanceRecord.findOne({
      userId: caller!.userId,
      date: today,
    });

    if (!record) {
      return NextResponse.json({
        date: today,
        phase: 'not_checked_in',
        today_shift: null,
        checked_in_at: null,
        checked_out_at: null,
        location_check: 'in_range',
        location_note: null,
        flags: [],
        worked_minutes: 0,
        manager_note: null,
      });
    }

    return NextResponse.json({
      date: record.date,
      phase: record.phase,
      today_shift: record.rosteredShift
        ? {
            id: record.rosteredShift.id,
            start_minutes: record.rosteredShift.startMinutes,
            end_minutes: record.rosteredShift.endMinutes,
          }
        : null,
      checked_in_at: record.checkedInAt ? record.checkedInAt.toISOString() : null,
      checked_out_at: record.checkedOutAt ? record.checkedOutAt.toISOString() : null,
      location_check: record.locationCheck,
      location_note: record.locationReading
        ? `Read with accuracy ${record.locationReading.accuracy}m`
        : null,
      flags: record.flags,
      worked_minutes: record.workedMinutes,
      manager_note: record.managerNote || null,
    });
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', error.message || 'Failed to fetch attendance', 500);
  }
}

