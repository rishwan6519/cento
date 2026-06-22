// import { NextRequest, NextResponse } from 'next/server';
// import { connectToDatabase } from '@/lib/db';
// import Device from '@/models/Device';
// import ConnectedAnnouncement from '@/models/AnnouncementConnection';
// import AnnouncementPlaylist from '@/models/AnnouncementPlaylist';

// export async function GET(req: NextRequest) {
//   try {
//     await connectToDatabase();

//     const serialNumber = req.nextUrl.searchParams.get('serialNumber');
//     if (!serialNumber) {
//       return NextResponse.json({ error: 'Serial number is required' }, { status: 400 });
//     }

//     // Step 1: Find device by serial number
//     const device = await Device.findOne({ serialNumber });
//     if (!device) {
//       return NextResponse.json({ error: 'Device not found with this serial number' }, { status: 404 });
//     }

//     // Step 2: Find ALL announcement connections for the device
//     const connections = await ConnectedAnnouncement.find(
//       { deviceId: device._id },
//       'announcementPlaylistIds'
//     );

//     if (!connections || connections.length === 0) {
//       return NextResponse.json({ activeAnnouncements: [], scheduledHourlyAnnouncements: [] });
//     }

//     // Aggregate all playlist IDs from all connection documents
//     const allAnnouncementPlaylistIds = connections.flatMap(conn => conn.announcementPlaylistIds);

//     if (allAnnouncementPlaylistIds.length === 0) {
//       return NextResponse.json({ activeAnnouncements: [], scheduledHourlyAnnouncements: [] });
//     }
    
//     // Step 3: Get current time, date, and day in Melbourne
//     const melbourneTimeZone = 'Australia/Melbourne';
//     const now = new Date();

//     const timeFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: melbourneTimeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
//     const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: melbourneTimeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
//     const weekDayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: melbourneTimeZone, weekday: 'long' });
    
//     const currentTime = timeFormatter.format(now);
//     const todayStr = dateFormatter.format(now);
//     const todayWeekDay = weekDayFormatter.format(now).toLowerCase();

//     // Step 4: Fetch all relevant playlists
//     const playlists = await AnnouncementPlaylist.find({
//       _id: { $in: allAnnouncementPlaylistIds },
//       status: 'active',
//     }).sort({ 'schedule.startTime': 1 });

//     // Step 5: Determine active and scheduled playlists
//     const activeAnnouncements = [];
//     const scheduledHourlyAnnouncements = [];

//     for (const playlist of playlists) {
//       const { schedule } = playlist;

//       // Validation 1: Date range
//       if (schedule.startDate && schedule.endDate && (todayStr < schedule.startDate || todayStr > schedule.endDate)) {
//         continue;
//       }

//       // Validation 2: Day of the week
//       if (Array.isArray(schedule.daysOfWeek) && schedule.daysOfWeek.length > 0 && !schedule.daysOfWeek.includes(todayWeekDay)) {
//         continue;
//       }

//       const playlistDetails = {
//         playlistId: playlist._id.toString(),
//         versionId: playlist.updatedAt.getTime().toString(),
//       };

//       if (schedule.scheduleType === 'timed') {
//         const { startTime, endTime } = schedule;
//         let isCurrentlyActive = false;

//         // --- THE FIX: Normalize currentTime to HH:mm for accurate comparison ---
//         const shortCurrentTime = currentTime.slice(0, 5); // "HH:mm:ss" -> "HH:mm"

//         if (!startTime && !endTime) { // Active all day
//           isCurrentlyActive = true;
//         } else if (startTime && !endTime) { // Active from a start time onwards
//           if (shortCurrentTime >= startTime) isCurrentlyActive = true;
//         } else if (!startTime && endTime) { // Active until an end time
//           if (shortCurrentTime <= endTime) isCurrentlyActive = true;
//         } else if (startTime && endTime) { // Active within a specific window
//           if (shortCurrentTime >= startTime && shortCurrentTime <= endTime) {
//             isCurrentlyActive = true;
//           }
//         }

//         if (isCurrentlyActive) {
//           activeAnnouncements.push(playlistDetails);
//         }
//       } else if (schedule.scheduleType === 'hourly') {
//         scheduledHourlyAnnouncements.push(playlistDetails);
//       }
//     }

//     // Step 6: Return the final result
//     return NextResponse.json({
//       activeAnnouncement: activeAnnouncements.length > 0 ? activeAnnouncements[0] : null,
//   scheduledHourlyAnnouncement: scheduledHourlyAnnouncements.length > 0 ? scheduledHourlyAnnouncements[0] : null,
//       currentTime: {
//         australian: currentTime,
//         day: todayWeekDay,
//         date: todayStr,
//       },
//     });

//   } catch (error) {
//     const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
//     console.error('Error fetching announcement playlists:', errorMessage);
//     return NextResponse.json(
//       { error: 'Failed to fetch announcement playlists', details: errorMessage },
//       { status: 500 }
//     );
//   }
// }














import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Device from '@/models/Device';
import ConnectedAnnouncement from '@/models/AnnouncementConnection';
import AnnouncementPlaylist from '@/models/AnnouncementPlaylist';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const serialNumber = req.nextUrl.searchParams.get('serialNumber');
    if (!serialNumber) {
      return NextResponse.json({ error: 'Serial number is required' }, { status: 400 });
    }

    // Step 1: Find device by serial number
    const device = await Device.findOne({ serialNumber });
    if (!device) {
      return NextResponse.json({ error: 'Device not found with this serial number' }, { status: 404 });
    }

    // Step 2: Find ALL announcement connections for the device
    const connections = await ConnectedAnnouncement.find(
      { deviceId: device._id },
      'announcementPlaylistIds'
    );

    if (!connections || connections.length === 0) {
      return NextResponse.json({ 
        activeAnnouncements: [], 
        scheduledHourlyAnnouncements: [] 
      });
    }

    // Aggregate all playlist IDs from all connection documents
    const allAnnouncementPlaylistIds = connections.flatMap(conn => conn.announcementPlaylistIds);

    if (allAnnouncementPlaylistIds.length === 0) {
      return NextResponse.json({ 
        activeAnnouncements: [], 
        scheduledHourlyAnnouncements: [] 
      });
    }
    
    // Step 3: Get current time, date, and day in Melbourne
    const melbourneTimeZone = 'Australia/Melbourne';
    const now = new Date();

    // Use en-CA for reliable YYYY-MM-DD format
    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: melbourneTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    // Use en-GB for reliable 24-hour HH:mm:ss format
    const timeFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: melbourneTimeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const weekDayFormatter = new Intl.DateTimeFormat('en-US', { 
      timeZone: melbourneTimeZone, 
      weekday: 'long' 
    });

    const todayStr = dateFormatter.format(now);
    const currentTime = timeFormatter.format(now);
    const todayWeekDay = weekDayFormatter.format(now).toLowerCase();

    // Step 4: Fetch all relevant playlists
    const playlists = await AnnouncementPlaylist.find({
      _id: { $in: allAnnouncementPlaylistIds },
      status: 'active',
    }).sort({ 'schedule.startTime': 1 });

    // Step 5: Determine active and scheduled playlists
    const activeAnnouncements = [];
    const scheduledHourlyAnnouncements = [];

    console.log(`Checking ${playlists.length} playlists for device ${serialNumber}. Today: ${todayStr}, WeekDay: ${todayWeekDay}, Time: ${currentTime}`);

    for (const playlist of playlists) {
      const { schedule } = playlist;
      console.log(`- Evaluating playlist ${playlist._id} "${playlist.name}"`);

      // Validation 1: Date range
      if (schedule.startDate && schedule.endDate) {
        if (todayStr < schedule.startDate || todayStr > schedule.endDate) {
          console.log(`  -> FAILED Date Range: today ${todayStr} not in [${schedule.startDate}, ${schedule.endDate}]`);
          continue;
        }
      }

      // Validation 2: Day of the week
      if (Array.isArray(schedule.daysOfWeek) && schedule.daysOfWeek.length > 0) {
        const validDays = schedule.daysOfWeek.map((d: string) => d.toLowerCase());
        const isTodayValid = validDays.some((d: string) => todayWeekDay.startsWith(d));
        if (!isTodayValid) {
          console.log(`  -> FAILED Day of Week: today ${todayWeekDay} not in [${validDays.join(',')}]`);
          continue;
        }
      }

      const playlistDetails = {
        playlistId: playlist._id.toString(),
        versionId: playlist.updatedAt.getTime().toString(),
      };

      if (schedule.scheduleType === 'timed') {
        const { startTime, endTime } = schedule;
        let isCurrentlyActive = false;

        // Normalize current time to HH:mm format for comparison
        const currentTimeShort = currentTime.substring(0, 5); // "HH:mm:ss" -> "HH:mm"

        if (!startTime && !endTime) {
          // Active all day
          isCurrentlyActive = true;
          console.log(`  -> PASSED Timed: active all day`);
        } else if (startTime && !endTime) {
          // Active from start time onwards (until end of day)
          isCurrentlyActive = currentTimeShort >= startTime;
          console.log(`  -> ${isCurrentlyActive ? 'PASSED' : 'FAILED'} Timed: current ${currentTimeShort} >= start ${startTime}`);
        } else if (!startTime && endTime) {
          // Active from start of day until end time (EXCLUSIVE - stops at endTime)
          isCurrentlyActive = currentTimeShort < endTime;
          console.log(`  -> ${isCurrentlyActive ? 'PASSED' : 'FAILED'} Timed: current ${currentTimeShort} < end ${endTime}`);
        } else if (startTime && endTime) {
          // Active within specific time window
          // Start time is INCLUSIVE, end time is EXCLUSIVE
          isCurrentlyActive = currentTimeShort >= startTime && currentTimeShort < endTime;
          console.log(`  -> ${isCurrentlyActive ? 'PASSED' : 'FAILED'} Timed: current ${currentTimeShort} in [${startTime}, ${endTime})`);
        }

        if (isCurrentlyActive) {
          activeAnnouncements.push(playlistDetails);
        }
      } else if (schedule.scheduleType === 'hourly') {
        // Hourly announcements should ALSO check if they're within their time window
        const { startTime, endTime } = schedule;
        let isInSchedule = false;

        const currentTimeShort = currentTime.substring(0, 5);

        if (!startTime && !endTime) {
          // Available all day
          isInSchedule = true;
          console.log(`  -> PASSED Hourly: active all day`);
        } else if (startTime && !endTime) {
          // Available from start time onwards
          isInSchedule = currentTimeShort >= startTime;
          console.log(`  -> ${isInSchedule ? 'PASSED' : 'FAILED'} Hourly: current ${currentTimeShort} >= start ${startTime}`);
        } else if (!startTime && endTime) {
          // Available until end time (EXCLUSIVE)
          isInSchedule = currentTimeShort < endTime;
          console.log(`  -> ${isInSchedule ? 'PASSED' : 'FAILED'} Hourly: current ${currentTimeShort} < end ${endTime}`);
        } else if (startTime && endTime) {
          // Available within specific time window
          isInSchedule = currentTimeShort >= startTime && currentTimeShort < endTime;
          console.log(`  -> ${isInSchedule ? 'PASSED' : 'FAILED'} Hourly: current ${currentTimeShort} in [${startTime}, ${endTime})`);
        }

        if (isInSchedule) {
          scheduledHourlyAnnouncements.push(playlistDetails);
        }
      } else {
        console.log(`  -> FAILED: Unknown scheduleType "${schedule.scheduleType}"`);
      }
    }

    // Step 6: Return the final result
    return NextResponse.json({
      activeAnnouncements: activeAnnouncements,
      scheduledHourlyAnnouncement: scheduledHourlyAnnouncements.length > 0 ? scheduledHourlyAnnouncements[0] : null,
      currentTime: {
        australian: currentTime,
        day: todayWeekDay,
        date: todayStr,
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error fetching announcement playlists:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to fetch announcement playlists', details: errorMessage },
      { status: 500 }
    );
  }
}