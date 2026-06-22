import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import DeviceAnnouncementConnection from '@/models/AnnouncementConnection';

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

    // Remove playlistId from DeviceAnnouncementConnection
    const connection = await DeviceAnnouncementConnection.findOne({ deviceId });
    if (connection && connection.announcementPlaylistIds) {
      connection.announcementPlaylistIds = connection.announcementPlaylistIds.filter(
        (pid: any) => pid.toString() !== playlistId.toString()
      );
      await connection.save();
    }

    return NextResponse.json({ success: true, message: 'Disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting announcement playlist:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect announcement playlist', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
