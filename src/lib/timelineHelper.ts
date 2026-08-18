import { connectToDatabase } from '@/lib/db';
import Device from '@/models/Device';
import AdvancedPlaylistSchedule from '@/models/AdvancedPlaylistSchedule';
import PlaylistConfig from '@/models/PlaylistConfig';
import DevicePlaylist from '@/models/ConectPlaylist';
import AssignedDevice from '@/models/AssignDevice';
import OnboardedDevice from '@/models/OnboardedDevice';
import MediaItem from '@/models/MediaItems';
import PlaylistDistribution from '@/models/PlaylistDistribution';
import { getMediaDuration } from './mediaHelper';

function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  const seconds = parts[2] || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

function formatSecondsToTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const normalizeDateToYYYYMMDD = (dateVal: any): string | null => {
  if (!dateVal) return null;
  let dStr = "";
  if (dateVal instanceof Date) dStr = dateVal.toISOString().slice(0, 10);
  else dStr = String(dateVal).trim();
  if (dStr.includes('T')) dStr = dStr.split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
  return dStr;
};

const isDayMatching = (daysOfWeek: any[], tDay: string): boolean => {
  if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) return true;
  const shortDays: { [key: string]: string } = {
    'sunday': 'sun', 'monday': 'mon', 'tuesday': 'tue', 'wednesday': 'wed',
    'thursday': 'thu', 'friday': 'fri', 'saturday': 'sat'
  };
  const tLower = tDay.toLowerCase();
  const tShort = shortDays[tLower] || '';
  return daysOfWeek.some(day => {
    if (!day) return false;
    const dLower = String(day).trim().toLowerCase();
    return dLower === tLower || dLower === tShort || tLower.startsWith(dLower);
  });
};

function getSimpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export interface TimelineMedia {
  id: string;
  name: string;
  url: string;
  type: string;
  durationSeconds: number;
  startTime: string;
  endTime: string;
}

export interface TimelineWindow {
  start: string;
  end: string;
  durationSeconds: number;
  playlistName: string;
  playlistId: string;
  scheduleId: string;
  media: TimelineMedia[];
}

export interface TimelineResult {
  date: string;
  versionId: string;
  windows: TimelineWindow[];
}

export function detectMediaType(url: string, explicitType?: string): string {
  if (!url && !explicitType) return 'video';
  const lower = url ? url.toLowerCase() : '';
  
  // 1. Cloudbases-generated files are strictly "offer"
  if (lower.endsWith('cloudbases-generated.mp4') || lower.includes('cloudbases-generated')) {
    return 'offer';
  }
  
  // 2. Strict file extensions overrule platform dropdown mistakes
  if (/\.(mp3|wav|aac|ogg|flac|m4a|wma)(\?|$)/.test(lower)) return 'audio';
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff)(\?|$)/.test(lower)) return 'image';
  
  // 3. If an explicit valid type was set in the platform (e.g. for a regular .mp4), trust it
  if (explicitType && explicitType !== 'unknown' && explicitType.trim() !== '') {
    return explicitType;
  }
  
  // 4. Fallback for other .mp4 / .mov files
  if (/\.(mp4|mov|webm|avi|mkv|flv|wmv)(\?|$)/.test(lower)) return 'video';
  
  return 'video';
}

export async function generateDailyTimeline(
  serialNumber: string,
  targetDateStr?: string
): Promise<TimelineResult | null> {
  await connectToDatabase();

  // Find device by serial number
  const device = await Device.findOne({ serialNumber }, '_id name status');
  if (!device) {
    return null;
  }

  // Parse target date and weekday in Melbourne
  const melbourneNow = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Australia/Melbourne' })
  );
  const dateStr = targetDateStr || melbourneNow.toISOString().slice(0, 10);
  const queryDate = new Date(dateStr);
  
  const melbourneWeekdayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Australia/Melbourne',
    weekday: 'long'
  });
  const todayWeekDay = melbourneWeekdayFormatter.format(queryDate).toLowerCase();

  const startOfDay = new Date(dateStr + "T00:00:00.000Z");
  const endOfDay = new Date(dateStr + "T23:59:59.999Z");

  const activeWindows: any[] = [];

  // Fetch Advanced schedules covering target date
  const advancedSchedules = await AdvancedPlaylistSchedule.find({
    deviceIds: device._id,
    isActive: true,
    startDate: { $lte: endOfDay },
    endDate: { $gte: startOfDay },
  }).populate({
    path: 'playlistId',
    populate: { path: 'files.mediaId', model: MediaItem }
  }).lean();

  for (const s of advancedSchedules as any[]) {
    const playlist = s.playlistId;
    if (!playlist) continue;

    if (playlist.daysOfWeek && playlist.daysOfWeek.length > 0) {
      if (!isDayMatching(playlist.daysOfWeek, todayWeekDay)) continue;
    }

    activeWindows.push({
      start: s.startTime || '00:00',
      end: s.endTime || '23:59',
      playlistName: playlist.name || 'Unnamed Playlist',
      playlistId: playlist._id.toString(),
      scheduleId: s._id.toString(),
      files: playlist.files || [],
      updatedAt: s.updatedAt || playlist.updatedAt || new Date()
    });
  }

  // Fetch Legacy/Concurrent Playlists
  const dpConnection = await DevicePlaylist.findOne({ deviceId: device._id }).lean();
  const connectedPlaylistIds = dpConnection && Array.isArray((dpConnection as any).playlistIds) ? (dpConnection as any).playlistIds : [];

  const deviceIdStr = device._id.toString();
  const associatedIds: any[] = [device._id, deviceIdStr];
  let storeUserIds: any[] = [];
  try {
    const assignments = await AssignedDevice.find({ deviceId: device._id }).lean();
    assignments.forEach((a: any) => {
      associatedIds.push(a._id, a._id.toString());
      if (a.userId) storeUserIds.push(a.userId, a.userId.toString());
    });
    const onboardings = await OnboardedDevice.find({ deviceId: device._id }).lean();
    onboardings.forEach((o: any) => {
      associatedIds.push(o._id, o._id.toString());
      if (o.userId) storeUserIds.push(o.userId, o.userId.toString());
    });
  } catch (err) {
    console.error("Error fetching associated device assignments in timeline helper:", err);
  }

  let storeConnectedPlaylistIds: any[] = [];
  try {
    if (storeUserIds.length > 0) {
      const storePlaylists = await DevicePlaylist.find({
        deviceId: { $in: storeUserIds }
      }, 'playlistIds').lean();
      storePlaylists.forEach((curr: any) => {
        if (curr.playlistIds) {
          curr.playlistIds.forEach((pid: any) => {
            if (pid) storeConnectedPlaylistIds.push(pid);
          });
        }
      });
    }
  } catch (err) {}

  const allConnectedPlaylistIds = [
    ...connectedPlaylistIds,
    ...storeConnectedPlaylistIds
  ];

  const legacyPlaylists = await PlaylistConfig.find({
    $or: [
      { _id: { $in: allConnectedPlaylistIds } },
      { selectedDeviceId: { $in: associatedIds } },
      { deviceIds: { $in: associatedIds } },
      { selectedDeviceId: { $in: storeUserIds } },
      { deviceIds: { $in: storeUserIds } }
    ]
  }).populate({ path: 'files.mediaId', model: MediaItem }).lean();

  for (const lp of legacyPlaylists as any[]) {
    const normStart = normalizeDateToYYYYMMDD(lp.startDate);
    const normEnd = normalizeDateToYYYYMMDD(lp.endDate);
    if (normStart && normEnd && (dateStr < normStart || dateStr > normEnd)) continue;
    if (!isDayMatching(lp.daysOfWeek, todayWeekDay)) continue;

    activeWindows.push({
      start: lp.startTime ? String(lp.startTime).slice(0, 5) : '00:00',
      end: lp.endTime ? String(lp.endTime).slice(0, 5) : '23:59',
      playlistName: lp.name || 'Unnamed Playlist',
      playlistId: lp._id.toString(),
      scheduleId: lp._id.toString(),
      files: lp.files || [],
      updatedAt: lp.updatedAt || new Date()
    });
  }

  // Pre-fetch durations for all unique files in the active windows in parallel
  const fileUrls = new Set<string>();
  for (const win of activeWindows) {
    const playlistFiles = win.files || [];
    for (const file of playlistFiles) {
      const rawPath = file.mediaId?.url || file.path || "";
      if (rawPath) {
        fileUrls.add(rawPath);
      }
    }
  }

  const durationMap = new Map<string, number>();
  await Promise.all(
    Array.from(fileUrls).map(async (rawPath) => {
      const duration = await getMediaDuration(rawPath);
      durationMap.set(rawPath, duration);
    })
  );

  // Generate continuous media queue per window (considering overlaps)
  const boundaries = new Set<string>();
  for (const win of activeWindows) {
    boundaries.add(win.start);
    boundaries.add(win.end);
  }

  const sortedBoundaries = Array.from(boundaries).sort((a, b) => {
    return parseTimeToSeconds(a) - parseTimeToSeconds(b);
  });

  const intervals: { start: string; end: string }[] = [];
  for (let i = 0; i < sortedBoundaries.length - 1; i++) {
    intervals.push({
      start: sortedBoundaries[i],
      end: sortedBoundaries[i + 1]
    });
  }

  const windowsResult: TimelineWindow[] = [];

  for (const interval of intervals) {
    const intStartSec = parseTimeToSeconds(interval.start);
    const intEndSec = parseTimeToSeconds(interval.end);
    const intDuration = intEndSec - intStartSec;

    if (intDuration <= 0) continue;

    // Find all windows covering this interval
    const matchingWindows = activeWindows.filter(win => {
      const winStartSec = parseTimeToSeconds(win.start);
      const winEndSec = parseTimeToSeconds(win.end);
      return winStartSec <= intStartSec && winEndSec >= intEndSec;
    });

    if (matchingWindows.length === 0) continue; // Gap

    const combinedPlaylistName = matchingWindows.map(w => w.playlistName).join(' + ');
    const combinedPlaylistId = matchingWindows.map(w => w.playlistId).join('_');
    const combinedScheduleId = matchingWindows.map(w => w.scheduleId).join('_');

    const combinedFiles: any[] = [];
    for (const w of matchingWindows) {
      combinedFiles.push(...(w.files || []));
    }

    const mediaQueue: TimelineMedia[] = [];
    let elapsed = 0;

    if (combinedFiles.length > 0) {
      // Check if any matching playlist has a distribution config
      const playlistIds = matchingWindows.map(w => w.playlistId);
      let distConfig: Record<string, number> | null = null;

      for (const pid of playlistIds) {
        try {
          const distDoc = await PlaylistDistribution.findOne({ playlistId: pid }).lean() as any;
          if (distDoc && distDoc.distribution) {
            // Convert Map to plain object if needed
            const distObj = distDoc.distribution instanceof Map
              ? Object.fromEntries(distDoc.distribution)
              : distDoc.distribution;
            if (Object.keys(distObj).length > 0) {
              distConfig = distObj;
              break;
            }
          }
        } catch { /* ignore */ }
      }

      if (distConfig) {
        // ── Percentage-based random interleaving ──
        // Normalize percentages
        const rawTotal = Object.values(distConfig).reduce((s, v) => s + v, 0);
        const normalizedDist: Record<string, number> = {};
        for (const [type, pct] of Object.entries(distConfig)) {
          normalizedDist[type.toLowerCase()] = pct / rawTotal;
        }

        // Resolve types for each file
        const typedFiles = combinedFiles.map(file => {
          const rawPath = file.mediaId?.url || file.path || "";
          const resolvedType = detectMediaType(
            rawPath,
            file.type || file.mediaId?.type
          );
          return { file, rawPath, resolvedType };
        });

        // Group files by type
        const filesByType: Record<string, typeof typedFiles> = {};
        for (const tf of typedFiles) {
          if (!filesByType[tf.resolvedType]) filesByType[tf.resolvedType] = [];
          filesByType[tf.resolvedType].push(tf);
        }

        // Build items per type based on percentage of total window time
        const allItems: { file: any; rawPath: string; resolvedType: string; duration: number }[] = [];

        for (const [type, fraction] of Object.entries(normalizedDist)) {
          const typeFiles = filesByType[type];
          if (!typeFiles || typeFiles.length === 0) continue; // skip types with no files

          const allocatedSeconds = Math.floor(intDuration * fraction);
          let typeElapsed = 0;
          let typeIdx = 0;

          while (typeElapsed < allocatedSeconds && typeFiles.length > 0) {
            const tf = typeFiles[typeIdx % typeFiles.length];
            const fileDur = tf.file.delay && tf.file.delay > 0
              ? tf.file.delay
              : (durationMap.get(tf.rawPath) || 30);

            let playDur = fileDur;
            const remaining = allocatedSeconds - typeElapsed;
            if (playDur > remaining) playDur = remaining;
            if (playDur <= 0) break;

            allItems.push({
              file: tf.file,
              rawPath: tf.rawPath,
              resolvedType: type,
              duration: playDur
            });

            typeElapsed += playDur;
            typeIdx++;
          }
        }

        // Fisher-Yates shuffle for random interleaving
        for (let i = allItems.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
        }

        // Assign sequential start/end times
        for (const item of allItems) {
          const itemStartSec = intStartSec + elapsed;
          const itemEndSec = itemStartSec + item.duration;
          const resolvedUrl = item.rawPath
            ? (item.rawPath.startsWith('http') ? item.rawPath : `https://iot.centelon.com${item.rawPath.startsWith('/') ? '' : '/'}${item.rawPath}`)
            : "";

          mediaQueue.push({
            id: item.file._id ? item.file._id.toString() : (item.file.mediaId?._id ? item.file.mediaId._id.toString() : String(elapsed)),
            name: item.file.name || item.file.mediaId?.name || "Unnamed Media",
            url: resolvedUrl,
            type: item.resolvedType,
            durationSeconds: item.duration,
            startTime: formatSecondsToTime(itemStartSec),
            endTime: formatSecondsToTime(itemEndSec),
          });

          elapsed += item.duration;
        }

      } else {
        // ── Sequential playback (no distribution config) ──
        let index = 0;
        while (elapsed < intDuration) {
          const file = combinedFiles[index % combinedFiles.length];

          const rawPath = file.mediaId?.url || file.path || "";
          const fileDuration = file.delay && file.delay > 0
            ? file.delay
            : (durationMap.get(rawPath) || 30);

          const itemStartSec = intStartSec + elapsed;
          const remainingSec = intDuration - elapsed;

          let playDuration = fileDuration;
          if (playDuration > remainingSec) {
            playDuration = remainingSec;
          }

          const itemEndSec = itemStartSec + playDuration;
          const resolvedUrl = rawPath ? (rawPath.startsWith('http') ? rawPath : `https://iot.centelon.com${rawPath.startsWith('/') ? '' : '/'}${rawPath}`) : "";

          mediaQueue.push({
            id: file._id ? file._id.toString() : (file.mediaId?._id ? file.mediaId._id.toString() : String(index)),
            name: file.name || file.mediaId?.name || "Unnamed Media",
            url: resolvedUrl,
            type: detectMediaType(resolvedUrl, file.type || file.mediaId?.type),
            durationSeconds: playDuration,
            startTime: formatSecondsToTime(itemStartSec),
            endTime: formatSecondsToTime(itemEndSec),
          });

          elapsed += playDuration;
          index++;

          if (playDuration <= 0) break;
        }
      }
    }

    windowsResult.push({
      start: interval.start,
      end: interval.end,
      durationSeconds: intDuration,
      playlistName: combinedPlaylistName,
      playlistId: combinedPlaylistId,
      scheduleId: combinedScheduleId,
      media: mediaQueue
    });
  }

  // Sort windows by start time ascending
  windowsResult.sort((a, b) => {
    const aSec = parseTimeToSeconds(a.start);
    const bSec = parseTimeToSeconds(b.start);
    return aSec - bSec;
  });

  // Calculate unique versionId based on schedules state
  const versionString = activeWindows
    .map(w => `${w.scheduleId}_${new Date(w.updatedAt).getTime()}`)
    .sort()
    .join(',');
  const versionId = getSimpleHash(serialNumber + '_' + dateStr + '_' + versionString);

  return {
    date: dateStr,
    versionId,
    windows: windowsResult
  };
}
