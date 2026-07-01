import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import PlaylistConfig from '@/models/PlaylistConfig';
import AnnouncementPlaylist from '@/models/AnnouncementPlaylist';
import DevicePlaylist from '@/models/ConectPlaylist';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { playlistId, deviceId } = body;

    if (!playlistId || !deviceId) {
      return NextResponse.json(
        { error: 'playlistId and deviceId are required' },
        { status: 400 }
      );
    }

    // 1. Try to find as a regular PlaylistConfig first
    let playlist = await PlaylistConfig.findById(playlistId);
    let isAnnouncement = false;

    if (!playlist) {
      // Try AnnouncementPlaylist
      playlist = await AnnouncementPlaylist.findById(playlistId);
      isAnnouncement = !!playlist;
    }

    if (playlist && !isAnnouncement) {
      // Remove deviceId from PlaylistConfig
      if (playlist.deviceIds && Array.isArray(playlist.deviceIds)) {
        playlist.deviceIds = playlist.deviceIds.filter(
          (id: any) => id.toString() !== deviceId.toString()
        );
      }
      if (playlist.selectedDeviceId && playlist.selectedDeviceId.toString() === deviceId.toString()) {
        playlist.selectedDeviceId = null;
      }
      await playlist.save();
    }

    // 2. Remove playlistId from DevicePlaylist connections
    const connection = await DevicePlaylist.findOne({ deviceId });
    if (connection) {
      if (isAnnouncement) {
        // Remove from announcementPlaylistIds
        if (connection.announcementPlaylistIds) {
          connection.announcementPlaylistIds = connection.announcementPlaylistIds.filter(
            (pid: any) => pid.toString() !== playlistId.toString()
          );
        }
      } else {
        // Remove from playlistIds
        if (connection.playlistIds) {
          connection.playlistIds = connection.playlistIds.filter(
            (pid: any) => pid.toString() !== playlistId.toString()
          );
        }
      }
      connection.updatedAt = new Date();
      await connection.save();
    }

    return NextResponse.json({ success: true, message: 'Disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting playlist:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect playlist', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
