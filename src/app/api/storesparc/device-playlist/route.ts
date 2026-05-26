import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Device from '@/models/Device';
import DevicePlaylist from '@/models/ConectPlaylist';
import Playlist from '@/models/PlaylistConfig';
import MediaItem from '@/models/MediaItems';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const serialNumber = req.nextUrl.searchParams.get('serialNumber');

    if (!serialNumber) {
      return NextResponse.json(
        { success: false, error: 'Serial number is required' },
        { status: 400 }
      );
    }

    // Step 1: Find device by serial number
    const device = await Device.findOne({ serialNumber });
    if (!device) {
      return NextResponse.json(
        { success: false, error: 'Device not found with this serial number' },
        { status: 404 }
      );
    }

    // Update last connection time to act as a heartbeat
    device.lastConnection = new Date();
    device.status = 'active'; // Optionally ensure status is active
    await device.save();

    // Step 2: Find device's playlist connections from DevicePlaylist collection
    const devicePlaylists = await DevicePlaylist.findOne(
      { deviceId: device._id },
      'playlistIds'
    );
    const connectedPlaylistIds = devicePlaylists?.playlistIds || [];

    // Step 3: Get current time in Melbourne timezone (HH:mm:ss format)
    const melbourneFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Australia/Melbourne',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const currentTime = melbourneFormatter.format(new Date());

    // Step 4: Get today's date and weekday in Melbourne
    const melbourneNow = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Australia/Melbourne' })
    );
    const todayStr = melbourneNow.toISOString().slice(0, 10); // 'YYYY-MM-DD'
    const weekDays = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday'
    ];
    const todayWeekDay = weekDays[melbourneNow.getDay()];

    // Step 5: Fetch all playlists (from both DevicePlaylist and directly from PlaylistConfig references)
    const deviceIdStr = device._id.toString();
    const deviceIdObj = device._id;

    // Resolve associated assignment or onboarding IDs to support playlists saved with assignment IDs
    const AssignedDevice = mongoose.models.AssignedDevice || mongoose.model('AssignedDevice');
    const OnboardedDevice = mongoose.models.OnboardedDevice || mongoose.model('OnboardedDevice');

    let associatedIds: any[] = [deviceIdObj, deviceIdStr];
    let storeUserIds: any[] = [];
    try {
      if (AssignedDevice) {
        const assignments = await AssignedDevice.find({ deviceId: device._id, status: 'active' });
        assignments.forEach((a: any) => {
          associatedIds.push(a._id);
          associatedIds.push(a._id.toString());
          if (a.userId) {
            storeUserIds.push(a.userId);
            storeUserIds.push(a.userId.toString());
          }
        });
      }
      if (OnboardedDevice) {
        const onboardings = await OnboardedDevice.find({ deviceId: device._id });
        onboardings.forEach((o: any) => {
          associatedIds.push(o._id);
          associatedIds.push(o._id.toString());
          if (o.userId) {
            storeUserIds.push(o.userId);
            storeUserIds.push(o.userId.toString());
          }
        });
      }
    } catch (err) {
      console.error("Error fetching associated assignment and store user IDs:", err);
    }

    // Resolve store-connected playlist IDs from DevicePlaylist
    let storeConnectedPlaylistIds: any[] = [];
    try {
      if (storeUserIds.length > 0) {
        const storePlaylists = await DevicePlaylist.find({
          deviceId: { $in: storeUserIds }
        }, 'playlistIds');
        
        storePlaylists.forEach((curr: any) => {
          if (curr.playlistIds) {
            curr.playlistIds.forEach((pid: any) => {
              if (pid) storeConnectedPlaylistIds.push(pid);
            });
          }
        });
      }
    } catch (err) {
      console.error("Error fetching store-connected playlists:", err);
    }

    const allConnectedPlaylistIds = [
      ...connectedPlaylistIds,
      ...storeConnectedPlaylistIds
    ];

    const playlists = await Playlist.find({
      $or: [
        { _id: { $in: allConnectedPlaylistIds } },
        { selectedDeviceId: { $in: associatedIds } },
        { deviceIds: { $in: associatedIds } },
        { selectedDeviceId: { $in: storeUserIds } },
        { deviceIds: { $in: storeUserIds } }
      ]
    }).sort({ startTime: 1 });

    if (!playlists || !playlists.length) {
      return NextResponse.json({
        success: true,
        currentPlaylist: null,
        currentAnnouncement: null,
        playlistData: null,
        announcementData: null,
        currentTime: {
          australian: currentTime,
          utcOffset: '+10:00'
        }
      });
    }

    // Helper functions for robust parsing
    const normalizeDateToYYYYMMDD = (dateVal: any): string | null => {
      if (!dateVal) return null;
      let dateStr = "";
      if (dateVal instanceof Date) {
        dateStr = dateVal.toISOString().slice(0, 10);
      } else {
        dateStr = String(dateVal).trim();
      }
      if (dateStr.includes('T')) {
        dateStr = dateStr.split('T')[0];
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }
      const parts = dateStr.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 2 && parts[2].length === 4) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        if (parts[0].length === 4 && parts[2].length === 2) {
          return `${parts[0]}-${parts[1]}-${parts[2]}`;
        }
      }
      return dateStr;
    };

    const isDayMatching = (daysOfWeek: string[], todayWeekDay: string): boolean => {
      if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
        return true;
      }
      const shortDays: { [key: string]: string } = {
        'sunday': 'sun',
        'monday': 'mon',
        'tuesday': 'tue',
        'wednesday': 'wed',
        'thursday': 'thu',
        'friday': 'fri',
        'saturday': 'sat'
      };
      const todayLower = todayWeekDay.toLowerCase();
      const todayShort = shortDays[todayLower] || '';
      return daysOfWeek.some(day => {
        const dLower = day.trim().toLowerCase();
        return dLower === todayLower || dLower === todayShort || todayLower.startsWith(dLower);
      });
    };

    const normalizeTimeToHHMM = (timeStr: string): string => {
      if (!timeStr) return '';
      const trimmed = timeStr.trim();
      if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
        return trimmed.slice(0, 5);
      }
      return trimmed;
    };

    // Step 6: Determine current active playlist and announcement
    let currentPlaylist = null;
    let currentAnnouncement = null;

    const normalizedCurrentTime = normalizeTimeToHHMM(currentTime);

    for (let i = 0; i < playlists.length; i++) {
      const playlist = playlists[i] as any;

      // Check date range
      const normStart = normalizeDateToYYYYMMDD(playlist.startDate);
      const normEnd = normalizeDateToYYYYMMDD(playlist.endDate);
      if (
        normStart &&
        normEnd &&
        (todayStr < normStart || todayStr > normEnd)
      ) {
        continue;
      }

      // Check day of week
      if (!isDayMatching(playlist.daysOfWeek, todayWeekDay)) {
        continue;
      }

      // Check time range
      const hasTimeRange = playlist.startTime && playlist.endTime;
      const isWithinTimeRange = hasTimeRange
        ? (normalizedCurrentTime >= normalizeTimeToHHMM(playlist.startTime) &&
          normalizedCurrentTime < normalizeTimeToHHMM(playlist.endTime))
        : true; // Active all day if unscheduled

      if (isWithinTimeRange) {
        if (playlist.contentType === 'announcement' || playlist.type === 'announcement') {
          if (!currentAnnouncement || hasTimeRange) {
            currentAnnouncement = playlist;
          }
        } else {
          if (!currentPlaylist || hasTimeRange) {
            currentPlaylist = playlist;
          }
        }
      }
    }

    // Normalize type helper
    const normalizeType = (type: string) => {
      if (!type) return type;
      const lower = type.toLowerCase();
      if (lower.includes("video")) return "video";
      if (lower.includes("audio")) return "audio";
      return type;
    };

    // Format playlist details
    const formatPlaylistData = async (playlist: any) => {
      if (!playlist) return null;

      const mediaIds = (playlist.files || []).map((f: any) => f.mediaId || f.fileId).filter(Boolean);
      let mediaMap = new Map();
      try {
        const mediaItems = await MediaItem.find({ _id: { $in: mediaIds } });
        mediaItems.forEach((m: any) => {
          mediaMap.set(m._id.toString(), m);
        });
      } catch (e) {
        console.error("Error resolving media items in storesparc:", e);
      }

      return {
        id: playlist._id,
        versionId: playlist.updatedAt.getTime().toString(),
        shuffle: playlist.shuffle,
        files: (playlist.files || []).map((file: any) => {
          const mediaDoc = mediaMap.get((file.mediaId || file.fileId || "").toString());
          let rawPath = file.path || mediaDoc?.url || "";
          let rawType = file.type || mediaDoc?.type || "";

          let resolvedPath = rawPath.trim();
          if (resolvedPath && !resolvedPath.startsWith("http")) {
            resolvedPath = `https://iot.centelon.com${resolvedPath.startsWith("/") ? "" : "/"}${resolvedPath}`;
          }
          return {
            _id: file._id || file.fileId || file.mediaId,
            id: file._id || file.fileId || file.mediaId,
            fileId: file.fileId || file.mediaId,
            mediaId: file.mediaId || file.fileId,
            path: resolvedPath,
            displayOrder: file.displayOrder,
            type: normalizeType(rawType),
            delay: file.delay,
            maxVolume: file.maxVolume,
            minVolume: file.minVolume,
            backgroundImageEnabled: file.backgroundImageEnabled,
            backgroundImage: file.backgroundImage,
          };
        }),
      };
    };

    // Step 7: Return result
    return NextResponse.json({
      success: true,
      currentPlaylist: currentPlaylist
        ? {
          playlistId: currentPlaylist._id,
          versionId: currentPlaylist.updatedAt.getTime().toString()
        }
        : null,
      currentAnnouncement: currentAnnouncement
        ? {
          playlistId: currentAnnouncement._id,
          versionId: currentAnnouncement.updatedAt.getTime().toString()
        }
        : null,
      playlistData: await formatPlaylistData(currentPlaylist),
      announcementData: await formatPlaylistData(currentAnnouncement),
      currentTime: {
        australian: currentTime,
        utcOffset: '+10:00' // Melbourne is UTC+10
      }
    });

  } catch (error) {
    console.error('Error fetching device playlists:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch device playlists' },
      { status: 500 }
    );
  }
}
