import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import DevicePlaylist from '@/models/ConectPlaylist';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Extract deviceId from query
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    console.log("Received deviceId:", deviceId);

    if (!deviceId) {
      return NextResponse.json(
        { error: 'deviceId query parameter is required' },
        { status: 400 }
      );
    }

    const devicePlaylists = await DevicePlaylist.findOne({ deviceId });

    return NextResponse.json({
      playlistIds: devicePlaylists?.playlistIds || []
    });
  } catch (error) {
    console.error('Error fetching device playlists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch device playlists' },
      { status: 500 }
    );
  }
}
