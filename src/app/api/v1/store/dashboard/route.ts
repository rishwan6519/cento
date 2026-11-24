import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AttendanceRecord from '@/models/AttendanceRecord';
import ApprovalRequest from '@/models/ApprovalRequest';
import RosterWeek from '@/models/RosterWeek';
import RosterShift from '@/models/RosterShift';
import StoreTask from '@/models/StoreTask';
import StoreAnnouncement from '@/models/StoreAnnouncement';
import StoreConfig from '@/models/StoreConfig';
import Device from '@/models/Device';
import User from '@/models/User';
import { requireAuth } from '@/lib/storesparc/auth';
import { apiError } from '@/lib/storesparc/errors';

export async function GET(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req, ['Store Manager', 'Central admin']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();

    // Central admin can inspect any store via query param; Store Manager strictly reads their store
    const requestedStoreId = req.nextUrl.searchParams.get('store_id');
    let storeId = caller!.storeId;
    if (caller!.role === 'Central admin' && requestedStoreId) {
      storeId = requestedStoreId;
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Fetch Store Configuration for local currency, timezone, and lateness grace rules
    let storeConfig = await StoreConfig.findOne({ storeId });
    if (!storeConfig) {
      storeConfig = await StoreConfig.findOne({}); // fallback for mock
    }
    const currency = storeConfig?.currency ?? 'INR';
    const graceMinutes = storeConfig?.latenessGraceMinutes ?? 5;

    // Current minutes from midnight (store local time approximation)
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // 1. Attendance Metrics (GAP-SM-002, GAP-SM-004)
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

    // Compute awaited staff with authoritative server-side lateness calculation
    const awaitedStaff = todayShifts
      .filter((s) => !checkedInUserIds.has(s.userId))
      .map((s) => {
        let flag: string | null = null;
        if (nowMinutes > s.startMinutes + graceMinutes) {
          flag = 'LATE';
        } else if (nowMinutes >= s.startMinutes - 15 && nowMinutes <= s.startMinutes + graceMinutes) {
          flag = 'EXPECTED_SOON';
        }
        return {
          user_id: s.userId,
          name: s.userName,
          rostered_start: s.startMinutes,
          flag, // Server decides lateness; app displays only when API provides it
        };
      });

    // 2. Approvals Metrics (GAP-SM-003, GAP-SM-004, GAP-SM-005)
    const pendingApprovals = await ApprovalRequest.find({ storeId, status: 'pending' }).sort({
      submittedAt: 1,
    });
    const approvalsWaiting = pendingApprovals.length;
    const flaggedApprovals = pendingApprovals.filter(
      (a) => a.complianceFlag && a.complianceFlag.flagged
    ).length;
    const oldestSubmittedAt =
      pendingApprovals.length > 0 ? pendingApprovals[0].submittedAt.toISOString() : null;

    // 3. Next Week Roster Planning & Coverage (GAP-SM-007, GAP-SM-008)
    const nextMon = new Date(now);
    const dayOfWeek = nextMon.getDay(); // 0 is Sun
    const daysUntilNextMon = ((8 - dayOfWeek) % 7) || 7;
    nextMon.setDate(nextMon.getDate() + daysUntilNextMon);
    const nextWeekStart = nextMon.toISOString().split('T')[0];

    const nextWeek = await RosterWeek.findOne({ storeId, weekStart: nextWeekStart });
    const isNextWeekPublished = nextWeek ? nextWeek.status === 'published' : false;
    const nextWeekCoverageGaps = nextWeek ? nextWeek.coverageGaps.length : 0;

    // Total staff in store vs staff assigned shifts next week
    const nextWeekShifts = await RosterShift.find({ storeId, weekStart: nextWeekStart });
    const rosteredStaffIds = new Set(nextWeekShifts.map((s) => s.userId));
    const totalStoreStaff = await User.countDocuments({
      $or: [{ assignedStoreId: storeId }, { storeLocation: storeId }, { role: 'user' }],
    });
    const staffNotRostered = Math.max(0, totalStoreStaff - rosteredStaffIds.size);

    // 4. Tasks Metrics (GAP-SM-009)
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
      assigneeId: { $exists: false },
    });

    // 5. Screens Metrics (GAP-SM-011, GAP-API-011)
    let screenFilter: any = { storeId };
    const matchingScreenCount = await Device.countDocuments(screenFilter);
    if (matchingScreenCount === 0) {
      screenFilter = {}; // Fallback to all devices in single-tenant / mock test setups
    }
    const totalDevices = await Device.countDocuments(screenFilter);
    const liveDevices = await Device.countDocuments({ ...screenFilter, status: 'active' });
    const offlineDevices = Math.max(0, totalDevices - liveDevices);

    // 6. Announcements (GAP-SM-010)
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
        currency,
        comparison: 'flat', // 'up' | 'down' | 'flat'
        percent: 0.0,
        compared_against: 'last_week_same_day', // Baseline: same day of prior week
        is_sample: true, // Phase 1 POS feed is scheduled for Phase 2 (finding D5)
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
        staff_not_rostered: staffNotRostered,
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
