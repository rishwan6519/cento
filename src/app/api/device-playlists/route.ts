import { NextRequest, NextResponse } from 'next/server';
import {connectToDatabase} from '@/lib/db';
import DevicePlaylist from '@/models/ConectPlaylist';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { deviceId, playlistIds } = body;

    if (!deviceId || !playlistIds || playlistIds.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the existing record
    const existing = await DevicePlaylist.findOne({ deviceId });

    if (existing) {
      // Merge playlistIds, remove duplicates
      const updatedPlaylistIds = Array.from(new Set([...existing.playlistIds, ...playlistIds]));

      existing.playlistIds = updatedPlaylistIds;
      existing.updatedAt = new Date();

      await existing.save();

      return NextResponse.json(existing);
    } else {
      // No record, create new
      const newDevicePlaylist = await DevicePlaylist.create({
        deviceId,
        playlistIds,
        updatedAt: new Date()
      });

      return NextResponse.json(newDevicePlaylist);
    }
  } catch (error) {
    console.error('Error saving playlists for device:', error);
    return NextResponse.json({ error: 'Failed to connect playlists' }, { status: 500 });
  }
}

// export async function GET(
//   request: Request,
//   { params }: { params: { deviceId: string } }
// )  {
//   try {
//     await connectToDatabase();
    
//     const url = new URL(req.url);
//     const deviceId = url.searchParams.get('deviceId');

//     if (!deviceId) {
//       return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
//     }

//     const devicePlaylist = await DevicePlaylist.findOne({ deviceId })
//       .populate('playlistIds');

//     if (!devicePlaylist) {
//       return NextResponse.json({ playlists: [] });
//     }

//     return NextResponse.json(devicePlaylist);
//   } catch (error) {
//     console.error('Error fetching device playlists:', error);
//     return NextResponse.json({ error: 'Failed to fetch device playlists' }, { status: 500 });
//   }
// }

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const url = new URL(req.url);
    const deviceId = url.searchParams.get('deviceId');
    const playlistId = url.searchParams.get('playlistId');

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    if (playlistId) {
      // Remove specific playlist from device
      await DevicePlaylist.updateOne(
        { deviceId },
        { $pull: { playlistIds: playlistId } }
      );
    } else {
      // Remove all playlists from device
      await DevicePlaylist.deleteOne({ deviceId });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing device playlists:', error);
    return NextResponse.json({ error: 'Failed to remove playlists' }, { status: 500 });
  }
}