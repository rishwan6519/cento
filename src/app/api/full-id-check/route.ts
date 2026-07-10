import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Device from '@/models/Device';
import DevicePlaylist from '@/models/ConectPlaylist';
import Playlist from '@/models/PlaylistConfig';
import ConnectedAnnouncement from '@/models/AnnouncementConnection';
import AnnouncementPlaylist from '@/models/AnnouncementPlaylist';
import Announcement from '@/models/AnnouncementFiles';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const serialNumber = req.nextUrl.searchParams.get('serialNumber');
    if (!serialNumber) {
      return NextResponse.json({ error: 'Serial number is required' }, { status: 400 });
    }

    // 🔹 1. Find Device
    const device = await Device.findOne({ serialNumber });
    if (!device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 });
    }

    const versionData: any = { playlists: [], announcements: [] };

    // 🔹 2. Get Linked Playlists
    const devicePlaylist = await DevicePlaylist.findOne({ deviceId: device._id });
    const playlistIds = devicePlaylist?.playlistIds || [];

    if (playlistIds.length > 0) {
      const playlists = await Playlist.find({ _id: { $in: playlistIds } });
      versionData.playlists = playlists.map((p: any) => ({
        id: p._id.toString(),
        contentType: p.contentType,
        startDate: p.startDate,
        endDate: p.endDate,
        daysOfWeek: p.daysOfWeek,
        startTime: p.startTime,
        endTime: p.endTime,
        shuffle: p.shuffle,
        priority: p.priority !== undefined ? p.priority : (devicePlaylist.priorities ? (devicePlaylist.priorities.get(p._id.toString()) || 0) : 0),
        files: p.files.map((f: any) => ({
          path: `https://iot.centelon.com/${(f.path || '').replace(/^(https?:\/\/iot\.centelon\.com)?\/?/, '')}`,
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

    // 🔹 3. Get Linked Announcement Playlists
    const connections = await ConnectedAnnouncement.find({ deviceId: device._id });
    const announcementIds = connections.flatMap((c: any) => c.announcementPlaylistIds);

    if (announcementIds.length > 0) {
      const announcementPlaylists = await AnnouncementPlaylist.find({ _id: { $in: announcementIds } }).populate({
        path: 'announcements.file',
        model: Announcement
      });
      versionData.announcements = announcementPlaylists.map((ap: any) => ({
        id: ap._id.toString(),
        schedule: ap.schedule,
        announcements: ap.announcements
          .map((a: any) => {
            if (!a.file) return null;
            return {
              name: a.file.name,
              path: `https://iot.centelon.com/${(a.file.path || '').replace(/^(https?:\/\/iot\.centelon\.com)?\/?/, '')}`,
              displayOrder: a.displayOrder,
              delay: a.delay
            };
          })
          .filter(Boolean)
      }));
    }

    // 🔹 4. Compute Hash
    const versionId = crypto.createHash('md5').update(JSON.stringify(versionData)).digest('hex');

    // 🔹 5. Send Response
    return NextResponse.json({
      success: true,
      deviceId: device._id,
      serialNumber: device.serialNumber,
      versionId,
      lastUpdated: new Date()
    });

  } catch (error) {
    console.error('Error fetching device version info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch device version info', details: error instanceof Error ? error.message : error },
      { status: 500 }
    );
  }
}
