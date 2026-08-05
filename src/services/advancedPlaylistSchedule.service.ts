import mongoose from 'mongoose';
import AdvancedPlaylistSchedule, { IAdvancedPlaylistSchedule } from '@/models/AdvancedPlaylistSchedule';
import PlaylistConfig from '@/models/PlaylistConfig';
import Device from '@/models/Device';
import DevicePlaylist from '@/models/ConectPlaylist';
import { validateSchedulePayload, ScheduleInput } from '@/validators/advancedPlaylistSchedule.validation';

export class ServiceError extends Error {
  statusCode: number;
  errors?: string[];

  constructor(message: string, statusCode: number = 400, errors?: string[]) {
    super(message);
    this.name = 'ServiceError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export interface PlaybackResponse {
  success: boolean;
  deviceSerialNumber: string;
  playlistId: string;
  playlistName: string;
  scheduleId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  source: 'advancedSchedule';
}

/**
 * Helper to calculate duration in minutes between startTime (HH:mm) and endTime (HH:mm)
 */
function getDurationMinutes(startTime: string, endTime: string): number {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const startMins = startHour * 60 + startMinute;
  const endMins = endHour * 60 + endMinute;
  return endMins - startMins;
}

export const advancedPlaylistScheduleService = {
  /**
   * Create a new advanced playlist schedule after validating business rules and DB existence.
   */
  async createSchedule(data: ScheduleInput): Promise<IAdvancedPlaylistSchedule> {
    const validation = await validateSchedulePayload(data);
    if (!validation.isValid || !validation.normalizedData) {
      throw new ServiceError('Validation failed for advanced playlist schedule', 400, validation.errors);
    }

    const newSchedule = new AdvancedPlaylistSchedule(validation.normalizedData);
    const saved = await newSchedule.save();
    return await saved.populate('playlistId deviceIds', 'name serialNumber type status');
  },

  /**
   * List advanced playlist schedules with optional filtering.
   */
  async listSchedules(filters: {
    playlistId?: string;
    deviceId?: string;
    userId?: string;
    isActive?: boolean | string;
  }): Promise<IAdvancedPlaylistSchedule[]> {
    const query: any = {};

    if (filters.playlistId && mongoose.Types.ObjectId.isValid(filters.playlistId)) {
      query.playlistId = new mongoose.Types.ObjectId(filters.playlistId);
    }
    if (filters.deviceId && mongoose.Types.ObjectId.isValid(filters.deviceId)) {
      query.deviceIds = { $in: [new mongoose.Types.ObjectId(filters.deviceId)] };
    }
    if (filters.userId && mongoose.Types.ObjectId.isValid(filters.userId)) {
      query.userId = new mongoose.Types.ObjectId(filters.userId);
    }
    if (filters.isActive !== undefined && filters.isActive !== '') {
      query.isActive = String(filters.isActive) === 'true';
    }

    return await AdvancedPlaylistSchedule.find(query)
      .populate('playlistId', 'name type status')
      .populate('deviceIds', 'name serialNumber status')
      .sort({ createdAt: -1 });
  },

  /**
   * Get a single advanced playlist schedule by ID.
   */
  async getScheduleById(id: string): Promise<IAdvancedPlaylistSchedule> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ServiceError('Invalid schedule ID format', 400);
    }

    const schedule = await AdvancedPlaylistSchedule.findById(id)
      .populate('playlistId', 'name type status')
      .populate('deviceIds', 'name serialNumber status');

    if (!schedule) {
      throw new ServiceError('Advanced playlist schedule not found', 404);
    }
    return schedule;
  },

  /**
   * Update an existing advanced playlist schedule by ID.
   */
  async updateSchedule(id: string, data: Partial<ScheduleInput>): Promise<IAdvancedPlaylistSchedule> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ServiceError('Invalid schedule ID format', 400);
    }

    const existing = await AdvancedPlaylistSchedule.findById(id);
    if (!existing) {
      throw new ServiceError('Advanced playlist schedule not found', 404);
    }

    // Merge existing values with incoming data for validation
    const mergedInput: ScheduleInput = {
      playlistId: data.playlistId ?? (existing.playlistId ? existing.playlistId.toString() : ''),
      deviceIds: data.deviceIds ?? existing.deviceIds.map((d: any) => d.toString()),
      userId: data.userId ?? (existing.userId ? existing.userId.toString() : undefined),
      startDate: data.startDate ?? existing.startDate,
      endDate: data.endDate ?? existing.endDate,
      startTime: data.startTime ?? existing.startTime,
      endTime: data.endTime ?? existing.endTime,
      priority: data.priority ?? existing.priority,
      isActive: data.isActive ?? existing.isActive,
    };

    const validation = await validateSchedulePayload(mergedInput, id);
    if (!validation.isValid || !validation.normalizedData) {
      throw new ServiceError('Validation failed during schedule update', 400, validation.errors);
    }

    Object.assign(existing, validation.normalizedData);
    const updated = await existing.save();
    return await updated.populate('playlistId deviceIds', 'name serialNumber type status');
  },

  /**
   * Delete an advanced playlist schedule by ID.
   */
  async deleteSchedule(id: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ServiceError('Invalid schedule ID format', 400);
    }

    const result = await AdvancedPlaylistSchedule.findByIdAndDelete(id);
    if (!result) {
      throw new ServiceError('Advanced playlist schedule not found to delete', 404);
    }
  },

  /**
   * Dynamic Playback Lookup Engine:
   * Finds all active advanced schedules matching the target device, server date, and server time.
   * Calculates duration (endTime - startTime) dynamically and returns the schedule with the shortest duration window.
   * When a shorter schedule expires, it automatically falls back to the next shortest valid schedule without any cron jobs.
   */
  async getPlaybackForDevice(
    deviceId: mongoose.Types.ObjectId | string,
    deviceSerialNumber: string
  ): Promise<PlaybackResponse | null> {
    if (!deviceId) return null;
    const devObjectId = typeof deviceId === 'string' ? new mongoose.Types.ObjectId(deviceId) : deviceId;

    // Get current server date and time
    const now = new Date();
    const currentHours = String(now.getHours()).padStart(2, '0');
    const currentMinutes = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${currentHours}:${currentMinutes}`; // HH:mm

    // Query active schedules where today is within [startDate, endDate] and currentTime is within [startTime, endTime]
    const matchingSchedules = await AdvancedPlaylistSchedule.find({
      deviceIds: devObjectId,
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
      startTime: { $lte: currentTime },
      endTime: { $gte: currentTime },
    }).populate('playlistId');

    if (!matchingSchedules || matchingSchedules.length === 0) {
      // No advanced schedule matches; caller should fall back to existing scheduler
      return null;
    }

    // Priority Rule: sort by duration ascending (shortest time window = highest priority)
    matchingSchedules.sort((a, b) => {
      const durationA = getDurationMinutes(a.startTime, a.endTime);
      const durationB = getDurationMinutes(b.startTime, b.endTime);
      if (durationA !== durationB) {
        return durationA - durationB; // Smallest duration first
      }
      // If durations are identical, use optional priority flag as secondary tiebreaker (higher wins)
      return (b.priority || 0) - (a.priority || 0);
    });

    // Filter to schedules whose referenced playlist still exists in DB
    const validSchedules = matchingSchedules.filter((s) => {
      const playlist = s.playlistId as any;
      return playlist && playlist._id;
    });

    if (validSchedules.length === 0) {
      return null;
    }

    // If only one active schedule matches right now, return its playlist directly
    if (validSchedules.length === 1) {
      const schedule = validSchedules[0];
      const playlist = schedule.playlistId as any;
      const startDateStr = new Date(schedule.startDate).toISOString().slice(0, 10);
      const endDateStr = new Date(schedule.endDate).toISOString().slice(0, 10);

      return {
        success: true,
        deviceSerialNumber: deviceSerialNumber,
        playlistId: playlist._id.toString(),
        playlistName: playlist.name || 'Unnamed Playlist',
        scheduleId: schedule._id.toString(),
        startDate: startDateStr,
        endDate: endDateStr,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        source: 'advancedSchedule',
      };
    }

    // MULTIPLE PLAYLISTS are valid right now (even if their end times or durations differ)!
    // Combine the files of ALL currently matching playlists into a single unified playlist in PlaylistConfig.
    const playlistIds = validSchedules.map((s) => (s.playlistId as any)._id.toString()).sort();
    const combinedKey = `combined_schedule_${playlistIds.join('_')}`;

    // Look for an existing combined playlist created previously for these exact playlists
    let combinedPlaylist = (await PlaylistConfig.findOne({ description: combinedKey })) as any;
    const fullPlaylists = (await PlaylistConfig.find({ _id: { $in: playlistIds } })) as any[];

    // Check if we need to create or refresh the combined playlist (if any original playlist was updated recently)
    const needsUpdate =
      !combinedPlaylist ||
      fullPlaylists.some((p: any) => p.updatedAt && combinedPlaylist.updatedAt && p.updatedAt > combinedPlaylist.updatedAt);

    if (needsUpdate) {
      const combinedFiles: any[] = [];
      let currentDisplayOrder = 1;
      const combinedNames: string[] = [];

      for (const p of fullPlaylists) {
        if (p.name) combinedNames.push(p.name);
        if (Array.isArray(p.files)) {
          for (const file of p.files) {
            const fileObj = file.toObject ? file.toObject() : { ...file };
            delete fileObj._id; // Let MongoDB generate fresh IDs for combined items
            fileObj.displayOrder = currentDisplayOrder++;
            combinedFiles.push(fileObj);
          }
        }
      }

      if (!combinedPlaylist) {
        combinedPlaylist = await PlaylistConfig.create({
          name: `Combined: ${combinedNames.join(' + ')}`,
          description: combinedKey,
          type: 'media',
          contentType: 'playlist',
          status: 'active',
          files: combinedFiles,
          shuffle: false,
        });
      } else {
        combinedPlaylist.files = combinedFiles;
        combinedPlaylist.name = `Combined: ${combinedNames.join(' + ')}`;
        await combinedPlaylist.save();
      }
    }

    // Use the shortest duration schedule (validSchedules[0]) for time metadata,
    // because as soon as this shorter schedule expires, the active combination dynamically changes!
    const firstSchedule = validSchedules[0];
    const startDateStr = new Date(firstSchedule.startDate).toISOString().slice(0, 10);
    const endDateStr = new Date(firstSchedule.endDate).toISOString().slice(0, 10);

    return {
      success: true,
      deviceSerialNumber: deviceSerialNumber,
      playlistId: combinedPlaylist._id.toString(),
      playlistName: combinedPlaylist.name || 'Combined Playlist',
      scheduleId: validSchedules.map((s) => s._id.toString()).join(','),
      startDate: startDateStr,
      endDate: endDateStr,
      startTime: firstSchedule.startTime,
      endTime: firstSchedule.endTime,
      source: 'advancedSchedule',
    };
  },

  /**
   * Get daily schedule broken down into non-overlapping time slots for a device by serial number.
   * During overlapping windows, media items from all matching playlists are dynamically combined.
   */
  async getDailyTimelineForDevice(serialNumber: string, targetDate?: string): Promise<{
    timeline: any[];
    serverDate: string;
    serverTime: { australian: string; timeZone: string; utcOffset: string };
  }> {
    if (!serialNumber) {
      throw new ServiceError('Serial number is required', 400);
    }

    const device = await Device.findOne({ serialNumber }, '_id');
    if (!device) {
      throw new ServiceError('Device not found with this serial number', 404);
    }

    // Server-side calculation of current time in Melbourne timezone (Australia/Melbourne)
    const melbourneFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Australia/Melbourne',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const currentTimeAustralian = melbourneFormatter.format(new Date());

    const melbourneNow = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Australia/Melbourne' })
    );

    // Parse target date or default to server Melbourne time
    const queryDate = targetDate ? new Date(targetDate) : melbourneNow;
    if (isNaN(queryDate.getTime())) {
      throw new ServiceError('Invalid date format for targetDate', 400);
    }

    const dateStr = queryDate.toISOString().slice(0, 10);
    const serverTimeMeta = {
      australian: currentTimeAustralian,
      timeZone: 'Australia/Melbourne',
      utcOffset: '+10:00', // Melbourne UTC offset
    };

    const startOfDay = new Date(queryDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(queryDate);
    endOfDay.setHours(23, 59, 59, 999);

    // 1. Query active Advanced Schedules covering the target date for this device
    const matchingSchedules = await AdvancedPlaylistSchedule.find({
      deviceIds: device._id,
      isActive: true,
      startDate: { $lte: endOfDay },
      endDate: { $gte: startOfDay },
    }).populate('playlistId');

    const validSchedules: any[] = matchingSchedules
      .filter((s) => s.playlistId && (s.playlistId as any)._id)
      .map((s) => ({
        _id: s._id.toString(),
        startTime: s.startTime,
        endTime: s.endTime,
        playlistId: s.playlistId,
        source: 'advancedSchedule',
      }));

    // 2. Query Old Legacy Playlists connected via ConectPlaylist / DevicePlaylist
    const devicePlaylists = await DevicePlaylist.findOne({ deviceId: device._id }, 'playlistIds');
    if (devicePlaylists && Array.isArray(devicePlaylists.playlistIds) && devicePlaylists.playlistIds.length > 0) {
      const legacyPlaylists = await PlaylistConfig.find({
        _id: { $in: devicePlaylists.playlistIds },
        status: 'active',
      });

      const todayStr = queryDate.toISOString().slice(0, 10);
      const weekDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const todayWeekDay = weekDays[queryDate.getDay()];

      for (const p of legacyPlaylists) {
        const lp = p as any;
        if (lp.contentType === 'announcement') continue; // keep timeline exclusively for media playlists
        if (lp.startDate && lp.endDate && (todayStr < lp.startDate || todayStr > lp.endDate)) continue;
        if (Array.isArray(lp.daysOfWeek) && lp.daysOfWeek.length > 0 && !lp.daysOfWeek.includes(todayWeekDay)) continue;

        const lStart = lp.startTime ? lp.startTime.slice(0, 5) : '00:00';
        const lEnd = lp.endTime ? lp.endTime.slice(0, 5) : '23:59';

        validSchedules.push({
          _id: lp._id.toString(),
          startTime: lStart,
          endTime: lEnd,
          playlistId: lp,
          source: 'legacyPlaylist',
        });
      }
    }

    if (validSchedules.length === 0) {
      return { timeline: [], serverDate: dateStr, serverTime: serverTimeMeta };
    }

    // Collect all unique start and end boundaries from both advanced and legacy schedules
    const boundaries = new Set<string>();
    for (const sched of validSchedules) {
      boundaries.add(sched.startTime);
      boundaries.add(sched.endTime);
    }

    const sortedTimePoints = Array.from(boundaries).sort();
    const timeSlots: any[] = [];

    // Construct intervals from consecutive boundary points
    for (let i = 0; i < sortedTimePoints.length - 1; i++) {
      const start = sortedTimePoints[i];
      const end = sortedTimePoints[i + 1];
      if (start === end) continue;

      // Find all schedules active during this entire interval [start, end]
      const allActive = validSchedules.filter(
        (s) => s.startTime <= start && s.endTime >= end
      );

      if (allActive.length > 0) {
        // Priority check: If any Advanced Schedule is active, it takes priority over old legacy playlists.
        // If NO Advanced Schedule is active, seamlessly use the matching Old Legacy Playlists!
        const advancedActive = allActive.filter((s) => s.source === 'advancedSchedule');
        const activeSchedules = advancedActive.length > 0 ? advancedActive : allActive;

        const combinedMedias: any[] = [];
        const contributingPlaylists: any[] = [];

        for (const sched of activeSchedules) {
          const playlist = sched.playlistId as any;
          contributingPlaylists.push({
            playlistId: playlist._id.toString(),
            playlistName: playlist.name || 'Unnamed Playlist',
            scheduleId: sched._id.toString(),
            window: `${sched.startTime}-${sched.endTime}`,
            source: sched.source,
          });

          if (Array.isArray(playlist.files)) {
            for (const file of playlist.files) {
              const fileObj = file.toObject ? file.toObject() : { ...file };
              if (fileObj.path) {
                const fullUrl = fileObj.path.startsWith('http')
                  ? fileObj.path
                  : `https://iot.centelon.com${fileObj.path.startsWith('/') ? '' : '/'}${fileObj.path}`;
                fileObj.path = fullUrl;
                fileObj.url = fullUrl;
              } else {
                fileObj.url = null;
              }
              combinedMedias.push(fileObj);
            }
          }
        }

        timeSlots.push({
          start,
          end,
          medias: combinedMedias,
          activePlaylists: contributingPlaylists,
        });
      }
    }


    // Optional clean-up: Merge consecutive time slots if they have identical sets of contributing schedules
    const mergedSlots: any[] = [];
    for (const slot of timeSlots) {
      if (mergedSlots.length === 0) {
        mergedSlots.push(slot);
        continue;
      }
      const prevSlot = mergedSlots[mergedSlots.length - 1];
      const prevIds = prevSlot.activePlaylists.map((p: any) => p.scheduleId).sort().join(',');
      const currIds = slot.activePlaylists.map((p: any) => p.scheduleId).sort().join(',');

      if (prevIds === currIds && prevSlot.end === slot.start) {
        prevSlot.end = slot.end;
      } else {
        mergedSlots.push(slot);
      }
    }

    return {
      timeline: mergedSlots,
      serverDate: dateStr,
      serverTime: serverTimeMeta,
    };
  },
};
