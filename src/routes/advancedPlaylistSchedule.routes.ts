import {
  createAdvancedScheduleHandler,
  getAdvancedSchedulesHandler,
  getAdvancedScheduleByIdHandler,
  updateAdvancedScheduleHandler,
  deleteAdvancedScheduleHandler,
  createScheduleWithPlaylistHandler,
  getDailyTimelineHandler,
} from '@/controllers/advancedPlaylistSchedule.controller';

/**
 * Routing table mapping HTTP methods for the root collection endpoint: /api/advanced-playlist-schedule
 */
export const collectionRoutes = {
  GET: getAdvancedSchedulesHandler,
  POST: createAdvancedScheduleHandler,
  CREATE_WITH_PLAYLIST: createScheduleWithPlaylistHandler,
  DAILY_TIMELINE: getDailyTimelineHandler,
};


/**
 * Routing table mapping HTTP methods for specific item endpoints: /api/advanced-playlist-schedule/:id
 */
export const itemRoutes = {
  GET: getAdvancedScheduleByIdHandler,
  PUT: updateAdvancedScheduleHandler,
  DELETE: deleteAdvancedScheduleHandler,
};
