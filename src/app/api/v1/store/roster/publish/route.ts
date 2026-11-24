import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import RosterWeek, { ICoverageGap } from '@/models/RosterWeek';
import RosterShift from '@/models/RosterShift';
import StoreConfig from '@/models/StoreConfig';
import { requireAuth } from '@/lib/storesparc/auth';
import { withIdempotency } from '@/lib/storesparc/idempotency';
import { apiError } from '@/lib/storesparc/errors';

export async function POST(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req, ['Store Manager', 'Central admin']);
  if (errorResponse) return errorResponse;

  return withIdempotency(req, caller!.userId, async () => {
    try {
      await connectToDatabase();
      const body = await req.json();
      const { week_start, client_timestamp } = body;

      if (!week_start) {
        return apiError('VALIDATION_ERROR', 'Field week_start is required', 400);
      }

      const storeId = caller!.storeId;
      const publishTime = client_timestamp ? new Date(client_timestamp) : new Date();

      // 1. Fetch store config for trading hours to compute coverage gaps
      const storeConfig = await StoreConfig.findOne({ storeId });
      const tradingHours = storeConfig?.tradingHours || [];

      // 2. Fetch all shifts (both draft and published) for this week
      const allShifts = await RosterShift.find({ storeId, weekStart: week_start });

      // Compute 7 dates from Monday week_start
      const weekDates: { dateStr: string; weekday: number }[] = [];
      const mondayDate = new Date(`${week_start}T00:00:00Z`);
      for (let i = 0; i < 7; i++) {
        const curDate = new Date(mondayDate);
        curDate.setUTCDate(mondayDate.getUTCDate() + i);
        weekDates.push({
          dateStr: curDate.toISOString().split('T')[0],
          weekday: curDate.getUTCDay(), // 0 = Sun, 1 = Mon ...
        });
      }

      // 3. Compute Coverage Gaps (Minimum 2 staff threshold during store trading hours)
      const computedGaps: ICoverageGap[] = [];

      for (const wd of weekDates) {
        const dayTrading = tradingHours.find((th: any) => th.weekday === wd.weekday);
        if (dayTrading && !dayTrading.isClosed) {
          const dayShifts = allShifts.filter((s) => s.date === wd.dateStr);

          // Check if zero staff on this day
          if (dayShifts.length === 0) {
            computedGaps.push({
              date: wd.dateStr,
              fromMinutes: dayTrading.openMinutes,
              toMinutes: dayTrading.closeMinutes,
              message: `No staff rostered during store trading hours (${Math.floor(dayTrading.openMinutes / 60)}:00 - ${Math.floor(dayTrading.closeMinutes / 60)}:00)`,
            });
          } else if (dayShifts.length === 1) {
            computedGaps.push({
              date: wd.dateStr,
              fromMinutes: dayTrading.openMinutes,
              toMinutes: dayTrading.closeMinutes,
              message: `Understaffed: Only 1 staff member scheduled. Minimum 2 required for store operations & safety.`,
            });
          }
        }
      }

      // 4. Update or Create RosterWeek
      let week = await RosterWeek.findOne({ storeId, weekStart: week_start });
      if (!week) {
        week = await RosterWeek.create({
          storeId,
          weekStart: week_start,
          status: 'published',
          publishedAt: publishTime,
          editable: true,
          hasUnpublishedChanges: false,
          coverageGaps: computedGaps,
        });
      } else {
        week.status = 'published';
        week.publishedAt = publishTime;
        week.hasUnpublishedChanges = false;
        week.coverageGaps = computedGaps;
        await week.save();
      }

      // 5. Promote all draft shifts to published
      // Users with newly staged draft shifts have their old published shifts replaced
      const draftUserIds = await RosterShift.distinct('userId', {
        storeId,
        weekStart: week_start,
        status: 'draft',
      });

      if (draftUserIds.length > 0) {
        // Delete superseded published shifts for users who have updated draft shifts
        await RosterShift.deleteMany({
          storeId,
          weekStart: week_start,
          userId: { $in: draftUserIds },
          status: 'published',
        });
      }

      // Mark all remaining shifts as published
      await RosterShift.updateMany(
        { storeId, weekStart: week_start },
        { status: 'published' }
      );

      // 6. Emit roster_published alert to all staff with shifts in this published week
      const distinctUserIds = await RosterShift.distinct('userId', {
        storeId,
        weekStart: week_start,
        status: 'published',
      });

      if (distinctUserIds.length > 0) {
        const StoreAlert = (await import('@/models/StoreAlert')).default;
        const alertDocs = distinctUserIds.map((uid) => ({
          userId: uid,
          storeId,
          category: 'roster_published',
          title: 'Roster Published',
          body: `The shift roster for week ${week_start} has been published by store management.`,
          read: false,
          targetScreen: 'roster',
          targetArgument: week_start,
        }));
        await StoreAlert.insertMany(alertDocs);
      }

      return NextResponse.json({
        week_start,
        status: 'published',
        published_at: week.publishedAt?.toISOString(),
        coverage_warnings: computedGaps.map((g) => ({
          date: g.date,
          from_minutes: g.fromMinutes,
          to_minutes: g.toMinutes,
          message: g.message,
        })),
        message: 'Roster published to Staff successfully',
      });
    } catch (error: any) {
      return apiError('INTERNAL_ERROR', error.message || 'Failed to publish roster', 500);
    }
  });
}
