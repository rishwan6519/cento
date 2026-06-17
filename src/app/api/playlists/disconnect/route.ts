import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import PlaylistConfig from '@/models/PlaylistConfig';
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

    // 1. Remove deviceId from PlaylistConfig
    const playlist = await PlaylistConfig.findById(playlistId);
    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    // We keep selectedDeviceId intact or clear it if it matches?
    // Since deviceIds is an array, we remove from there.
    if (playlist.deviceIds && Array.isArray(playlist.deviceIds)) {
      playlist.deviceIds = playlist.deviceIds.filter(
        (id: any) => id.toString() !== deviceId.toString()
      );
    }
    
    if (playlist.selectedDeviceId && playlist.selectedDeviceId.toString() === deviceId.toString()) {
        playlist.selectedDeviceId = null;
    }

    await playlist.save();

    // 2. Remove playlistId from DevicePlaylist connections
    const connection = await DevicePlaylist.findOne({ deviceId });
    if (connection && connection.playlistIds) {
      connection.playlistIds = connection.playlistIds.filter(
        (pid: any) => pid.toString() !== playlistId.toString()
      );
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
