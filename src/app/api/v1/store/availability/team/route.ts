import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import StaffAvailability, { IDayAvailability } from '@/models/StaffAvailability';
import RosterWeek from '@/models/RosterWeek';
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
    const month = searchParams.get('month'); // YYYY-MM
    const requestedStoreId = searchParams.get('store_id');

    let storeId = caller!.storeId;
    if (caller!.role === 'Central admin' && requestedStoreId) {
      storeId = requestedStoreId;
    }

    if (!weekStart && !month) {
      return apiError(
        'VALIDATION_ERROR',
        'Either query parameter "week_start" (YYYY-MM-DD) or "month" (YYYY-MM) is required',
        400
      );
    }

    // Fetch all active team members assigned to this store
    const teamUsers = await User.find({
      $or: [
        { assignedStoreId: storeId },
        { storeLocation: storeId },
        { role: 'user' },
        { role: 'Staff' },
      ],
    }).sort({ username: 1 });

    // ─── 1. MONTH VIEW (Get team's month availability) ────────────────────────
    if (month) {
      const records = await StaffAvailability.find({
        storeId,
        'days.date': { $regex: `^${month}` },
      });

      // Group records by user
      const userRecordsMap = new Map<string, { latestSubmittedAt: Date | null; daysOff: Set<string> }>();

      records.forEach((rec) => {
        const uId = rec.userId;
        if (!userRecordsMap.has(uId)) {
          userRecordsMap.set(uId, { latestSubmittedAt: rec.submittedAt || null, daysOff: new Set() });
        }
        const userEntry = userRecordsMap.get(uId)!;
        if (rec.submittedAt && (!userEntry.latestSubmittedAt || rec.submittedAt > userEntry.latestSubmittedAt)) {
          userEntry.latestSubmittedAt = rec.submittedAt;
        }

        if (Array.isArray(rec.days)) {
          rec.days.forEach((d: IDayAvailability) => {
            if (d.date.startsWith(month) && d.status === 'unavailable') {
              userEntry.daysOff.add(d.date);
            }
          });
        }
      });

      const team = teamUsers.map((u) => {
        const uId = u._id.toString();
        const userSub = userRecordsMap.get(uId);
        const hasSubmitted = !!userSub;

        return {
          user_id: uId,
          name: u.operatorName || u.username,
          role: u.role || 'Staff',
          status: hasSubmitted ? 'Submitted' : 'Not submitted',
          submitted_at: userSub?.latestSubmittedAt ? userSub.latestSubmittedAt.toISOString() : null,
          days_off: userSub ? Array.from(userSub.daysOff).sort() : [],
        };
      });

      return NextResponse.json({
        month,
        store_id: storeId,
        team,
      });
    }

    // ─── 2. WEEK VIEW (Get team's week availability) ──────────────────────────
    const rosterWeek = await RosterWeek.findOne({ storeId, weekStart });
    const isPublished = rosterWeek ? rosterWeek.status === 'published' : false;

    const submissions = await StaffAvailability.find({ storeId, weekStart });
    const submissionMap = new Map(submissions.map((s) => [s.userId, s]));

    const team = teamUsers.map((u) => {
      const uId = u._id.toString();
      const sub = submissionMap.get(uId);

      return {
        user_id: uId,
        name: u.operatorName || u.username,
        role: u.role || 'Staff',
        status: sub ? 'Submitted' : 'Not submitted',
        submitted_at: sub ? sub.submittedAt.toISOString() : null,
        days: sub ? sub.days : [],
      };
    });

    return NextResponse.json({
      week_start: weekStart,
      store_id: storeId,
      is_roster_published: isPublished,
      team,
    });
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', error.message || 'Failed to fetch team availability', 500);
  }
}
