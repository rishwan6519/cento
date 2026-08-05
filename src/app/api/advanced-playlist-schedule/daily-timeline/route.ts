import { NextRequest } from 'next/server';
import { getDailyTimelineHandler } from '@/controllers/advancedPlaylistSchedule.controller';

export const dynamic = 'force-dynamic';

/**
 * GET /api/advanced-playlist-schedule/daily-timeline?serialNumber=X&date=YYYY-MM-DD
 * Returns non-overlapping time slots for a specific device on a given date (defaults to today),
 * combining all media files from overlapping schedules into unified time intervals.
 */
export async function GET(req: NextRequest) {
  return getDailyTimelineHandler(req);
}
