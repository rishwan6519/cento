import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AttendanceRecord from '@/models/AttendanceRecord';
import ApprovalRequest from '@/models/ApprovalRequest';
import RosterWeek from '@/models/RosterWeek';
import RosterShift from '@/models/RosterShift';
import StoreTask from '@/models/StoreTask';
import StoreAnnouncement from '@/models/StoreAnnouncement';
import Device from '@/models/Device';
import { requireAuth } from '@/lib/storesparc/auth';
import { apiError } from '@/lib/storesparc/errors';

export async function GET(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req, ['Store Manager', 'Central admin']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const storeId = caller!.storeId;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // 1. Attendance Metrics
    const todayRecords = await AttendanceRecord.find({ storeId, date: todayStr });
    const checkedInCount = todayRecords.filter((r) => r.phase === 'checked_in').length;
    const manualWaitingCount = todayRecords.filter(
      (r) => r.phase === 'awaiting_manager_confirmation'
    ).length;

    const todayShifts = await RosterShift.find({ storeId, date: todayStr, status: 'published' });
    const rosteredTodayCount = todayShifts.length;

    const checkedInUserIds = new Set(
      todayRecords.filter((r) => r.phase === 'checked_in').map((r) => r.userId)
    );
    const awaitedStaff = todayShifts
      .filter((s) => !checkedInUserIds.has(s.userId))
      .map((s) => ({
        user_id: s.userId,
        name: s.userName,
        rostered_start: s.startMinutes,
        flag: null,
      }));

    // 2. Approvals Metrics
    const pendingApprovals = await ApprovalRequest.find({ storeId, status: 'pending' }).sort({
      submittedAt: 1,
    });
    const approvalsWaiting = pendingApprovals.length;
    const flaggedApprovals = pendingApprovals.filter(
      (a) => a.complianceFlag && a.complianceFlag.flagged
    ).length;
    const oldestSubmittedAt =
      pendingApprovals.length > 0 ? pendingApprovals[0].submittedAt.toISOString() : null;

    // 3. Next Week Roster
    // Calculate next Monday
    const nextMon = new Date(now);
    const dayOfWeek = nextMon.getDay(); // 0 is Sun
    const daysUntilNextMon = ((8 - dayOfWeek) % 7) || 7;
    nextMon.setDate(nextMon.getDate() + daysUntilNextMon);
    const nextWeekStart = nextMon.toISOString().split('T')[0];

    const nextWeek = await RosterWeek.findOne({ storeId, weekStart: nextWeekStart });
    const isNextWeekPublished = nextWeek ? nextWeek.status === 'published' : false;
    const nextWeekCoverageGaps = nextWeek ? nextWeek.coverageGaps.length : 0;

    // 4. Tasks Metrics
    const openTasks = await StoreTask.countDocuments({ storeId, status: 'open' });
    const unassignedTasks = await StoreTask.countDocuments({
      storeId,
      status: 'open',
      assigneeId: { $exists: false },
    });
    const unclaimedPriorityTasks = await StoreTask.countDocuments({
      storeId,
      status: 'open',
      category: 'priority',
    });

    // 5. Screens Metrics
    const totalDevices = await Device.countDocuments({});
    const liveDevices = await Device.countDocuments({ status: 'active' });
    const offlineDevices = Math.max(0, totalDevices - liveDevices);

    // 6. Announcements
    const scheduledAnnouncements = await StoreAnnouncement.find({
      storeId,
      status: 'scheduled',
      scheduledFor: { $gt: now },
    }).sort({ scheduledFor: 1 });

    const scheduledCount = scheduledAnnouncements.length;
    const nextScheduledFor =
      scheduledAnnouncements.length > 0
        ? scheduledAnnouncements[0].scheduledFor?.toISOString()
        : null;

    return NextResponse.json({
      as_of: now.toISOString(),
      sales: {
        amount: 0,
        currency: 'INR',
        comparison: 'flat',
        percent: 0.0,
        compared_against: 'last_week_same_day',
        is_sample: true, // Labeled sample data per PRD Phase 1 finding D5
      },
      attendance: {
        checked_in: checkedInCount,
        rostered_today: rosteredTodayCount,
        awaited: awaitedStaff,
        manual_check_ins_waiting: manualWaitingCount,
      },
      approvals: {
        waiting: approvalsWaiting,
        flagged: flaggedApprovals,
        oldest_submitted_at: oldestSubmittedAt,
      },
      next_week_roster: {
        week_start: nextWeekStart,
        published: isNextWeekPublished,
        staff_not_rostered: 0,
        coverage_warnings: nextWeekCoverageGaps,
      },
      tasks: {
        open: openTasks,
        unassigned: unassignedTasks,
        unclaimed_priority: unclaimedPriorityTasks,
      },
      screens: {
        live: liveDevices,
        total: totalDevices,
        offline: offlineDevices,
      },
      announcements: {
        scheduled: scheduledCount,
        next_scheduled_for: nextScheduledFor,
      },
    });
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', error.message || 'Failed to fetch dashboard', 500);
  }
}

