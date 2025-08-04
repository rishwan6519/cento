import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Device from '@/models/Device';
import ConnectedAnnouncement from '@/models/AnnouncementConnection';
import AnnouncementPlaylist from '@/models/AnnouncementPlaylist';

// Helper function to calculate the next play time for hourly schedules
function calculateNextPlayTime(startTime: string, frequency: number, currentTime: string, todayStr: string): string | null {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [currentHour, currentMin] = currentTime.split(':').map(Number);

  const startTotalMinutes = startHour * 60 + startMin;
  const currentTotalMinutes = currentHour * 60 + currentMin;

  if (currentTotalMinutes < startTotalMinutes) {
    return `${todayStr}T${startTime}`;
  }

  const elapsedMinutes = currentTotalMinutes - startTotalMinutes;
  const intervalsPassed = Math.floor(elapsedMinutes / frequency);
  const nextInterval = intervalsPassed + 1;
  const nextPlayTotalMinutes = startTotalMinutes + (nextInterval * frequency);

  const nextPlayHour = Math.floor(nextPlayTotalMinutes / 60);
  const nextPlayMinute = nextPlayTotalMinutes % 60;

  if (nextPlayHour >= 24) {
    return null; // No more announcements for today
  }

  const nextPlayHourStr = nextPlayHour.toString().padStart(2, '0');
  const nextPlayMinuteStr = nextPlayMinute.toString().padStart(2, '0');
  
  return `${todayStr}T${nextPlayHourStr}:${nextPlayMinuteStr}:00`;
}


export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const serialNumber = req.nextUrl.searchParams.get('serialNumber');
    if (!serialNumber) {
      return NextResponse.json({ error: 'Serial number is required' }, { status: 400 });
    }

    // --- Start Console Logging ---
    console.log(`\n--- [${new Date().toISOString()}] Processing request for device: ${serialNumber} ---`);
    // --- End Console Logging ---

    const device = await Device.findOne({ serialNumber });
    if (!device) {
      console.log(`[DEBUG] Device with serial number "${serialNumber}" not found.`);
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    const connected = await ConnectedAnnouncement.findOne({ deviceId: device._id }, 'announcementPlaylistIds');
    if (!connected || !connected.announcementPlaylistIds.length) {
      console.log(`[DEBUG] No announcement playlists connected to device ID: ${device._id}.`);
      return NextResponse.json({ activeAnnouncements: [], scheduledHourlyAnnouncements: [] });
    }

    const melbourneTimeZone = 'Australia/Melbourne';
    const now = new Date();

    const timeFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: melbourneTimeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
    const currentTime = timeFormatter.format(now);

    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: melbourneTimeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    });
    const todayStr = dateFormatter.format(now);

    const weekDayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: melbourneTimeZone, weekday: 'long',
    });
    const todayWeekDay = weekDayFormatter.format(now).toLowerCase();
    
    console.log(`[INFO] Current Melbourne Time: ${currentTime} | Date: ${todayStr} | Day: ${todayWeekDay}`);

    const playlists = await AnnouncementPlaylist.find({
      _id: { $in: connected.announcementPlaylistIds }, status: 'active'
    }).sort({ 'schedule.startTime': 1 });

    console.log(`[DEBUG] Found ${playlists.length} active playlists to evaluate.`);

    const activeAnnouncements = [];
    const scheduledHourlyAnnouncements = [];

    for (const playlist of playlists) {
      const { schedule } = playlist;
      console.log(`\n[DEBUG] Evaluating Playlist: "${playlist.name}" (ID: ${playlist._id}) | Type: ${schedule.scheduleType}`);

      if (schedule.startDate && schedule.endDate && (todayStr < schedule.startDate || todayStr > schedule.endDate)) {
        console.log(`[SKIPPED] Reason: Date out of range. Current: ${todayStr}, Range: ${schedule.startDate}-${schedule.endDate}`);
        continue;
      }

      if (Array.isArray(schedule.daysOfWeek) && schedule.daysOfWeek.length > 0 && !schedule.daysOfWeek.includes(todayWeekDay)) {
        console.log(`[SKIPPED] Reason: Day not in schedule. Current: ${todayWeekDay}, Scheduled: [${schedule.daysOfWeek.join(', ')}]`);
        continue;
      }
      
      if (schedule.startTime && schedule.endTime && (currentTime < schedule.startTime || currentTime > schedule.endTime)) {
        console.log(`[SKIPPED] Reason: Current time not in schedule window. Current: ${currentTime}, Window: ${schedule.startTime}-${schedule.endTime}`);
        continue;
      }

      const playlistDetails = {
        playlistId: playlist._id,
        name: playlist.name,
        versionId: playlist.updatedAt.getTime().toString(),
        announcements: playlist.announcements,
      };

      if (schedule.scheduleType === 'timed') {
        activeAnnouncements.push(playlistDetails);
        console.log(`[SUCCESS] Matched 'timed' schedule. Added to active announcements.`);
      } else if (schedule.scheduleType === 'hourly') {
        if (schedule.frequency && schedule.startTime) {
           const nextPlayTime = calculateNextPlayTime(schedule.startTime, schedule.frequency, currentTime, todayStr);
           
           if (nextPlayTime && (!schedule.endTime || nextPlayTime.slice(11, 19) <= schedule.endTime)) {
              scheduledHourlyAnnouncements.push({ ...playlistDetails, nextPlayTime });
              console.log(`[SUCCESS] Matched 'hourly' schedule. Added to scheduled announcements with next play time: ${nextPlayTime}.`);
           } else {
             console.log(`[SKIPPED] Reason: No more hourly slots available for today within the schedule window.`);
           }
        } else {
          console.log(`[SKIPPED] Reason: Hourly schedule is missing required 'frequency' or 'startTime'.`);
        }
      } else {
        console.log(`[SKIPPED] Reason: No logic implemented for schedule type: '${schedule.scheduleType}'.`);
      }
    }

    console.log(`--- Request for ${serialNumber} completed. Active: ${activeAnnouncements.length}, Scheduled: ${scheduledHourlyAnnouncements.length} ---`);

    return NextResponse.json({
      activeAnnouncements,
      scheduledHourlyAnnouncements,
      currentTime: {
        australian: currentTime,
        utcOffsetDescription: 'Varies (AEST/AEDT)',
        day: todayWeekDay,
        date: todayStr,
      },
    });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
    console.error(`[ERROR] Failed to fetch announcement: ${errorMessage}`, err);
    return NextResponse.json({ error: 'Failed to fetch announcement', details: errorMessage }, { status: 500 });
  }
}