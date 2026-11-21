import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import RosterWeek from '@/models/RosterWeek';
import RosterShift from '@/models/RosterShift';
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

      let week = await RosterWeek.findOne({ storeId, weekStart: week_start });
      if (!week) {
        week = await RosterWeek.create({
          storeId,
          weekStart: week_start,
          status: 'published',
          publishedAt: publishTime,
          editable: true,
        });
      } else {
        week.status = 'published';
        week.publishedAt = publishTime;
        await week.save();
      }

      // Mark all shifts as published
      await RosterShift.updateMany(
        { storeId, weekStart: week_start },
        { status: 'published' }
      );

      return NextResponse.json({
        week_start,
        status: 'published',
        published_at: week.publishedAt?.toISOString(),
        coverage_warnings: week.coverageGaps || [],
        message: 'Roster published to Staff successfully',
      });
    } catch (error: any) {
      return apiError('INTERNAL_ERROR', error.message || 'Failed to publish roster', 500);
    }
  });
}

