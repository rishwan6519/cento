import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Device from '@/models/Device';
import DevicePlaylist from '@/models/ConectPlaylist';
import Playlist from '@/models/PlaylistConfig';

export async function GET(
  req: NextRequest,
  { params }: { params: { serialNumber: string } }
) {
  try {
    await connectToDatabase();

    const serialNumber = params.serialNumber;

    if (!serialNumber) {
      return NextResponse.json(
        { error: 'Serial number is required' },
        { status: 400 }
      );
    }

    // Step 1: Find device by serial number
    const device = await Device.findOne({ serialNumber });
    console.log("Device", device);
    if (!device) {
      return NextResponse.json(
        { error: 'Device not found with this serial number' },
        { status: 404 }
      );
    }

    // Step 2: Find device's playlist connections
    const devicePlaylists = await DevicePlaylist.findOne({
      deviceId: device._id
    }, 'playlistIds');
    console.log("devicePlaylists", devicePlaylists);

    if (!devicePlaylists || !devicePlaylists.playlistIds.length) {
      return NextResponse.json({
        currentPlaylist: null,
        currentAnnouncement: null
      });
    }

    // Step 3: Get current time in HH:mm:ss format
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    // Step 4: Find all playlists and sort by schedule
    const playlists = await Playlist.find({
      _id: { $in: devicePlaylists.playlistIds }
    }).sort({ startTime: 1 });

    // Step 5: Find currently active playlist and announcement
    let currentPlaylist = null;
    let currentAnnouncement = null;

    for (let i = 0; i < playlists.length; i++) {
      const playlist = playlists[i];

      if (currentTime >= playlist.startTime && currentTime < playlist.endTime) {
        if (playlist.contentType === 'announcement') {
          currentAnnouncement = playlist;
        } else {
          currentPlaylist = playlist;
        }
      }
    }

    // Step 6: Return the result
    return NextResponse.json({
      currentPlaylist: currentPlaylist ? {
        playlistId: currentPlaylist._id,
       versionId: currentPlaylist.updatedAt.getTime().toString()

      } : null,

      currentAnnouncement: currentAnnouncement ? {
        announcementId: currentAnnouncement.announcementId || currentAnnouncement._id,
        versionId: currentAnnouncement.updatedAt.getTime().toString()

      } : null
    });

  } catch (error) {
    console.error('Error fetching device playlists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch device playlists' },
      { status: 500 }
    );
  }
}
