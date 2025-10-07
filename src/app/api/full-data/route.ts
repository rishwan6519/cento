import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import Device from '@/models/Device';
import DevicePlaylist from '@/models/ConectPlaylist';
import Playlist from '@/models/PlaylistConfig';
import ConnectedAnnouncement from '@/models/AnnouncementConnection';
import AnnouncementPlaylist from '@/models/AnnouncementPlaylist';
import Announcement from '@/models/AnnouncementFiles';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const serialNumber = req.nextUrl.searchParams.get('serialNumber');
    if (!serialNumber) {
      return NextResponse.json({ error: 'Serial number is required' }, { status: 400 });
    }

    // 1️⃣ Find Device
    const device = await Device.findOne({ serialNumber });
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    // Setup Melbourne timezone utilities
    const melbourneTZ = 'Australia/Melbourne';
    const now = new Date();
    const timeFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: melbourneTZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: melbourneTZ, year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const weekDayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: melbourneTZ, weekday: 'long'
    });

    const currentTime = timeFormatter.format(now);
    const todayStr = dateFormatter.format(now);
    const todayWeekDay = weekDayFormatter.format(now).toLowerCase();

    // 2️⃣ Fetch linked Playlists
    const devicePlaylist = await DevicePlaylist.findOne({ deviceId: device._id });
    let playlistDetails: Array<{
      id: any;
      versionId: string;
      contentType: any;
      startDate: any;
      endDate: any;
      daysOfWeek: any;
      startTime: any;
      endTime: any;
      shuffle: any;
      files: Array<{
        path: string;
        displayOrder: any;
        type: any;
        delay: any;
        maxVolume: any;
        minVolume: any;
        backgroundImageEnabled: any;
        backgroundImage: any;
      }>;
    }> = [];

    if (devicePlaylist && devicePlaylist.playlistIds.length > 0) {
      const playlists = await Playlist.find({ _id: { $in: devicePlaylist.playlistIds } });
      playlistDetails = playlists.map((p: any) => ({
        id: p._id,
        versionId: p.updatedAt.getTime().toString(),
        contentType: p.contentType,
        startDate: p.startDate,
        endDate: p.endDate,
        daysOfWeek: p.daysOfWeek,
        startTime: p.startTime,
        endTime: p.endTime,
        shuffle: p.shuffle,
        files: p.files.map((f: any) => ({
          path: `https://iot.centelon.com${f.path}`,
          displayOrder: f.displayOrder,
          type: f.type,
          delay: f.delay,
          maxVolume: f.maxVolume,
          minVolume: f.minVolume,
          backgroundImageEnabled: f.backgroundImageEnabled,
          backgroundImage: f.backgroundImage
        }))
      }));
    }

    // 3️⃣ Fetch linked Announcement Playlists
    const connections = await ConnectedAnnouncement.find({ deviceId: device._id });
    let announcementDetails: Array<{
      id: string;
      versionId: string;
      schedule: any;
      announcements: Array<{
        name: string;
        path: string;
        displayOrder: any;
        delay: any;
      }>;
    }> = [];

    if (connections && connections.length > 0) {
      const allIds = connections.flatMap((c: any) => c.announcementPlaylistIds);
      const announcementPlaylists = await AnnouncementPlaylist.find({ _id: { $in: allIds } }).populate({
        path: 'announcements.file',
        model: Announcement
      });

      announcementDetails = announcementPlaylists.map((ap: any) => ({
        id: ap._id.toString(),
        versionId: ap.updatedAt.getTime().toString(),
        schedule: ap.schedule,
        announcements: ap.announcements
          .map((a: any) => {
            if (!a.file) return null;
            return {
              name: a.file.name,
              path: `https://iot.centelon.com${a.file.path}`,
              displayOrder: a.displayOrder,
              delay: a.delay
            };
          })
          .filter(Boolean)
      }));
    }

    // 4️⃣ Response
    return NextResponse.json({
      success: true,
      device: {
        id: device._id,
        serialNumber: device.serialNumber,
        name: device.name,
        location: device.location,
      },
      dateTime: {
        australian: currentTime,
        date: todayStr,
        weekday: todayWeekDay,
      },
      playlists: playlistDetails,
      announcements: announcementDetails,
    });

  } catch (error) {
    console.error('Error fetching full device data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch full device data', details: error instanceof Error ? error.message : error },
      { status: 500 }
    );
  }
}
