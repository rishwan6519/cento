import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import StaffAvailability from '@/models/StaffAvailability';
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

    if (!weekStart) {
      return apiError('VALIDATION_ERROR', 'Parameter week_start (YYYY-MM-DD) is required', 400);
    }

    const storeId = caller!.storeId;

    const rosterWeek = await RosterWeek.findOne({ storeId, weekStart });
    const isPublished = rosterWeek ? rosterWeek.status === 'published' : false;

    // Fetch team members assigned to this store
    const teamUsers = await User.find({
      $or: [
        { assignedStoreId: storeId },
        { _id: storeId },
      ],
    });

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
      is_roster_published: isPublished,
      team,
    });
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', error.message || 'Failed to fetch team availability', 500);
  }
}

