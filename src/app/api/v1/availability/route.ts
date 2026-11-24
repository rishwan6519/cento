import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import StaffAvailability, { IDayAvailability } from '@/models/StaffAvailability';
import RosterWeek from '@/models/RosterWeek';
import { requireAuth } from '@/lib/storesparc/auth';
import { withIdempotency } from '@/lib/storesparc/idempotency';
import { apiError, conflictError } from '@/lib/storesparc/errors';

// Helper: Get Monday of the week for any date string
function getWeekStartForDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export async function GET(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const searchParams = req.nextUrl.searchParams;
    const weekStart = searchParams.get('week_start');
    const month = searchParams.get('month'); // YYYY-MM

    const todayStr = new Date().toISOString().split('T')[0];

    // ─── 1. MONTH VIEW (Get a month) ──────────────────────────────────────────
    if (month) {
      const [yearStr, monthStr] = month.split('-');
      const year = parseInt(yearStr, 10);
      const mIndex = parseInt(monthStr, 10) - 1;

      const daysInMonth = new Date(year, mIndex + 1, 0).getDate();
      const monthDates: string[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dStr = `${yearStr}-${monthStr.padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        monthDates.push(dStr);
      }

      // Query all availability records matching this month's prefix
      const records = await StaffAvailability.find({
        userId: caller!.userId,
        'days.date': { $regex: `^${month}` },
      });

      // Also check which weeks in this month have published rosters
      const publishedRosterWeeks = await RosterWeek.find({
        storeId: caller!.storeId,
        status: 'published',
      }).select('weekStart');
      const publishedWeekStarts = new Set(publishedRosterWeeks.map((r) => r.weekStart));

      // Build map of date -> status
      const dateStatusMap = new Map<string, string>();
      let latestSubmittedAt: Date | null = null;

      records.forEach((rec) => {
        if (!latestSubmittedAt || rec.submittedAt > latestSubmittedAt) {
          latestSubmittedAt = rec.submittedAt;
        }
        rec.days.forEach((d: IDayAvailability) => {
          if (d.date.startsWith(month)) {
            dateStatusMap.set(d.date, d.status);
          }
        });
      });

      const monthDays = monthDates.map((dateStr) => {
        const status = dateStatusMap.get(dateStr) || 'available';
        const dayOff = status === 'unavailable';
        const dateWeekStart = getWeekStartForDate(dateStr);

        const isPastDate = dateStr < todayStr;
        const isRosterPublished = publishedWeekStarts.has(dateWeekStart);
        const editable = !isPastDate && !isRosterPublished;

        let lockedReason: string | null = null;
        if (isPastDate) {
          lockedReason = 'Past date';
        } else if (isRosterPublished) {
          lockedReason = 'Roster is already published for this week';
        }

        return {
          date: dateStr,
          day_off: dayOff,
          editable,
          locked_reason: lockedReason,
        };
      });

      return NextResponse.json({
        month,
        days: monthDays,
        submitted_at: latestSubmittedAt ? latestSubmittedAt.toISOString() : null,
      });
    }

    // ─── 2. WEEK VIEW (Get a week) ───────────────────────────────────────────
    if (!weekStart) {
      return apiError('VALIDATION_ERROR', 'Parameter week_start (YYYY-MM-DD) or month (YYYY-MM) is required', 400);
    }

    const rosterWeek = await RosterWeek.findOne({ storeId: caller!.storeId, weekStart });
    const isRosterPublished = rosterWeek ? rosterWeek.status === 'published' : false;

    // Deadline check: Wednesday 23:59:59 before weekStart
    const weekStartDate = new Date(weekStart);
    const deadlineDate = new Date(weekStartDate);
    deadlineDate.setDate(deadlineDate.getDate() - 5); // Previous Wednesday
    deadlineDate.setHours(23, 59, 59, 999);

    const isPastWeek = weekStart < getWeekStartForDate(todayStr);
    const isPastDeadline = new Date() > deadlineDate && weekStart <= getWeekStartForDate(todayStr);

    const editable = !isRosterPublished && !isPastWeek;
    let lockedReason: string | null = null;
    if (isPastWeek) {
      lockedReason = 'Past week';
    } else if (isRosterPublished) {
      lockedReason = 'Roster is already published for this week';
    } else if (isPastDeadline) {
      lockedReason = 'Past availability deadline (Wed 23:59)';
    }

    const record = await StaffAvailability.findOne({
      userId: caller!.userId,
      weekStart,
    });

    // Generate 7 days default if not yet submitted
    const dayDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStartDate);
      d.setDate(d.getDate() + i);
      dayDates.push(d.toISOString().split('T')[0]);
    }

    const existingDaysMap = new Map<string, IDayAvailability>();
    if (record && Array.isArray(record.days)) {
      record.days.forEach((d) => existingDaysMap.set(d.date, d));
    }

    const days = dayDates.map((dateStr) => {
      const existing = existingDaysMap.get(dateStr);
      return {
        date: dateStr,
        status: existing ? existing.status : 'available',
        from: existing && existing.fromMinutes !== undefined ? existing.fromMinutes : null,
        to: existing && existing.toMinutes !== undefined ? existing.toMinutes : null,
        note: existing?.note || null,
      };
    });

    return NextResponse.json({
      week_start: weekStart,
      editable,
      locked_reason: lockedReason,
      submitted_at: record ? record.submittedAt.toISOString() : null,
      days,
    });
  } catch (error: any) {
    console.error('Error fetching availability:', error);
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
      const { week_start, days = [], month, days_off = [] } = body;

      // ─── 1. SUBMIT A MONTH (Submit a month of days off) ───────────────────
      if (month && Array.isArray(days_off)) {
        const daysOffSet = new Set<string>(days_off);
        const [yearStr, monthStr] = month.split('-');
        const year = parseInt(yearStr, 10);
        const mIndex = parseInt(monthStr, 10) - 1;
        const daysInMonth = new Date(year, mIndex + 1, 0).getDate();

        // Group dates by their respective weekStart so week & month views share the exact same record!
        const weeksMap = new Map<string, IDayAvailability[]>();

        for (let day = 1; day <= daysInMonth; day++) {
          const dStr = `${yearStr}-${monthStr.padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const wkStart = getWeekStartForDate(dStr);

          if (!weeksMap.has(wkStart)) {
            weeksMap.set(wkStart, []);
          }

          weeksMap.get(wkStart)!.push({
            date: dStr,
            status: daysOffSet.has(dStr) ? 'unavailable' : 'available',
            note: daysOffSet.has(dStr) ? 'Day off requested via monthly calendar' : undefined,
          });
        }

        // Upsert into StaffAvailability for each affected week
        const now = new Date();
        for (const [wkStart, dayItems] of weeksMap.entries()) {
          let rec = await StaffAvailability.findOne({ userId: caller!.userId, weekStart: wkStart });
          if (!rec) {
            rec = new StaffAvailability({
              userId: caller!.userId,
              userName: caller!.displayName,
              storeId: caller!.storeId,
              weekStart: wkStart,
              month,
              days: dayItems,
              submittedAt: now,
            });
          } else {
            // Merge days preserving partial shifts if any
            const existingMap = new Map(rec.days.map((d: any) => [d.date, d]));
            dayItems.forEach((newItem) => {
              existingMap.set(newItem.date, newItem);
            });
            rec.days = Array.from(existingMap.values());
            rec.submittedAt = now;
          }
          await rec.save();
        }

        return NextResponse.json({
          month,
          days_off,
          submitted_at: now.toISOString(),
          message: 'Monthly days off submitted successfully',
        });
      }

      // ─── 2. SUBMIT A WEEK ────────────────────────────────────────────────
      if (!week_start) {
        return apiError('VALIDATION_ERROR', 'Field week_start or month is required', 400);
      }

      // Check if roster already published
      const rosterWeek = await RosterWeek.findOne({ storeId: caller!.storeId, weekStart: week_start });
      if (rosterWeek && rosterWeek.status === 'published') {
        return conflictError('WEEK_LOCKED', 'Cannot update availability because roster is already published for this week');
      }

      let record = await StaffAvailability.findOne({
        userId: caller!.userId,
        weekStart: week_start,
      });

      const formattedDays: IDayAvailability[] = days.map((d: any) => ({
        date: d.date,
        status: d.status,
        fromMinutes: d.from ?? d.fromMinutes,
        toMinutes: d.to ?? d.toMinutes,
        note: d.note,
      }));

      const now = new Date();
      if (!record) {
        record = new StaffAvailability({
          userId: caller!.userId,
          userName: caller!.displayName,
          storeId: caller!.storeId,
          weekStart: week_start,
          month,
          days: formattedDays,
          submittedAt: now,
        });
      } else {
        record.days = formattedDays;
        record.month = month || record.month;
        record.submittedAt = now;
      }

      await record.save();

      return NextResponse.json({
        week_start,
        submitted_at: record.submittedAt.toISOString(),
        days: record.days.map((d: any) => ({
          date: d.date,
          status: d.status,
          from: d.fromMinutes ?? null,
          to: d.toMinutes ?? null,
          note: d.note || null,
        })),
        message: 'Weekly availability submitted successfully',
      });
    } catch (error: any) {
      console.error('Error submitting availability:', error);
      return apiError('INTERNAL_ERROR', error.message || 'Failed to submit availability', 500);
    }
  });
}
