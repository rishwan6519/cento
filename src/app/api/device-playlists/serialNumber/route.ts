import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Device from '@/models/Device';
import DevicePlaylist from '@/models/ConectPlaylist';
import Playlist from '@/models/PlaylistConfig';
import { advancedPlaylistScheduleService } from '@/services/advancedPlaylistSchedule.service';
import { generateDailyTimeline } from '@/lib/timelineHelper';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const serialNumber = req.nextUrl.searchParams.get('serialNumber');

    if (!serialNumber) {
      return NextResponse.json(
        { error: 'Serial number is required' },
        { status: 400 }
      );
    }

    // Step 1: Find device by serial number
    const device = await Device.findOne({ serialNumber });
    console.log('Device', device);
    if (!device) {
      return NextResponse.json(
        { error: 'Device not found with this serial number' },
        { status: 404 }
      );
    }

    // Update last connection time to act as a heartbeat
    device.lastConnection = new Date();
    device.status = 'active'; // Optionally ensure status is active
    await device.save();

    // Advanced Schedule Lookup (Independent Advanced Scheduler) using the Daily Timeline Engine
    const dailyTimeline = await generateDailyTimeline(serialNumber);
    if (dailyTimeline && dailyTimeline.windows.length > 0) {
      // Get current time in Melbourne timezone in "HH:mm" format
      const melbourneTimeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Australia/Melbourne',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      const currentTimeHHmm = melbourneTimeFormatter.format(new Date());

      // Find the window active at this exact moment
      const activeWindow = dailyTimeline.windows.find(
        (w) => w.start <= currentTimeHHmm && w.end > currentTimeHHmm
      );

      // Return the timeline playback response
      return NextResponse.json({
        success: true,
        deviceSerialNumber: serialNumber,
        playlistId: activeWindow ? activeWindow.playlistId : null,
        playlistName: activeWindow ? activeWindow.playlistName : 'Gap / No Playlist',
        scheduleId: activeWindow ? activeWindow.scheduleId : null,
        startDate: dailyTimeline.date,
        endDate: dailyTimeline.date,
        startTime: activeWindow ? activeWindow.start : null,
        endTime: activeWindow ? activeWindow.end : null,
        versionId: dailyTimeline.versionId,
        source: 'advancedSchedule',
        currentPlaylist: activeWindow ? {
          playlistId: activeWindow.playlistId,
          versionId: dailyTimeline.versionId
        } : null,
        currentTime: {
          australian: currentTimeHHmm + ":00",
          utcOffset: '+10:00'
        }
      }, { status: 200 });
    }

    // Step 2: Find device's playlist connections
    const devicePlaylists = await DevicePlaylist.findOne(
      { deviceId: device._id },
      'playlistIds'
    );
    console.log('devicePlaylists', devicePlaylists);

    if (!devicePlaylists || !devicePlaylists.playlistIds.length) {
      return NextResponse.json({
        currentPlaylist: null,
      });
    }

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

    // Step 5: Fetch all playlists and sort by start time
    const playlists = await Playlist.find({
      _id: { $in: devicePlaylists.playlistIds }
    }).sort({ startTime: 1 });

    // Step 6: Determine current active playlist and announcement
    let currentPlaylist = null;
    let currentAnnouncement = null;

    for (let i = 0; i < playlists.length; i++) {
      const playlist = playlists[i] as any;

      // Check date range
      if (
        playlist.startDate &&
        playlist.endDate &&
        (todayStr < playlist.startDate || todayStr > playlist.endDate)
      ) {
        continue;
      }

      // Check day of week
      if (
        Array.isArray(playlist.daysOfWeek) &&
        playlist.daysOfWeek.length > 0 &&
        !playlist.daysOfWeek.includes(todayWeekDay)
      ) {
        continue;
      }

      // Check time range
      if (
        playlist.startTime &&
        playlist.endTime &&
        currentTime >= playlist.startTime &&
        currentTime < playlist.endTime
      ) {
        if (playlist.contentType === 'announcement') {
          currentAnnouncement = playlist;
        } else {
          currentPlaylist = playlist;
        }
      }
    }

    // Step 7: Return result
    return NextResponse.json({
      currentPlaylist: currentPlaylist
        ? {
            playlistId: currentPlaylist._id,
            versionId: currentPlaylist.updatedAt.getTime().toString()
          }
        : null,
        
      currentTime: {
        australian: currentTime,
        utcOffset: '+10:00' // Melbourne is UTC+10
      }
    });

  } catch (error) {
    console.error('Error fetching device playlists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch device playlists' },
      { status: 500 }
    );
  }
}
