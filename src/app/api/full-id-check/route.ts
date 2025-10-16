import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Device from '@/models/Device';
import DevicePlaylist from '@/models/ConectPlaylist';
import Playlist from '@/models/PlaylistConfig';
import ConnectedAnnouncement from '@/models/AnnouncementConnection';
import AnnouncementPlaylist from '@/models/AnnouncementPlaylist';

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

    // 🔹 2. Get Linked Playlists
    const devicePlaylist = await DevicePlaylist.findOne({ deviceId: device._id });
    const playlistIds = devicePlaylist?.playlistIds || [];

    let latestPlaylistUpdate = null;
    if (playlistIds.length > 0) {
      const latestPlaylist = await Playlist.findOne({ _id: { $in: playlistIds } })
        .sort({ updatedAt: -1 })
        .select('updatedAt');
      latestPlaylistUpdate = latestPlaylist?.updatedAt || null;
    }

    // 🔹 3. Get Linked Announcement Playlists
    const connections = await ConnectedAnnouncement.find({ deviceId: device._id });
    const announcementIds = connections.flatMap((c: any) => c.announcementPlaylistIds);
    let latestAnnouncementUpdate = null;

    if (announcementIds.length > 0) {
      const latestAnnouncement = await AnnouncementPlaylist.findOne({ _id: { $in: announcementIds } })
        .sort({ updatedAt: -1 })
        .select('updatedAt');
      latestAnnouncementUpdate = latestAnnouncement?.updatedAt || null;
    }

    // 🔹 4. Combine Dates
    const lastUpdated = [latestPlaylistUpdate, latestAnnouncementUpdate]
      .filter(Boolean)
      .sort((a, b) => b.getTime() - a.getTime())[0] || new Date(device.updatedAt);

    const versionId = lastUpdated.getTime().toString();

    // 🔹 5. Send Response
    return NextResponse.json({
      success: true,
      deviceId: device._id,
      serialNumber: device.serialNumber,
      versionId,
      lastUpdated,
    });

  } catch (error) {
    console.error('Error fetching device version info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch device version info', details: error instanceof Error ? error.message : error },
      { status: 500 }
    );
  }
}
