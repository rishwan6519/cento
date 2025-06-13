import { NextRequest, NextResponse } from 'next/server';
import {connectToDatabase} from '@/lib/db';
import DevicePlaylist from '@/models/ConectPlaylist';
import "@/models/PlaylistConfig"
import "@/models/Device";
import "@/models/User"





export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { deviceId, playlistIds,userId } = body;

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
        userId,
        updatedAt: new Date()
      });

      return NextResponse.json(newDevicePlaylist);
    }
  } catch (error) {
    console.error('Error saving playlists for device:', error);
    return NextResponse.json({ error: 'Failed to connect playlists' }, { status: 500 });
  }
}


interface Playlist {
  _id: string;
  name?: string;
  startTime?: string;
  endTime?: string;
}
interface DevicePlaylist {
  deviceId: string;
  playlistIds: Playlist[];
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const devicePlaylists: DevicePlaylist[] = await DevicePlaylist.find({ userId })
      .populate("playlistIds")
      .select("-__v -createdAt -updatedAt");

    const playlistMap = new Map();

    devicePlaylists.forEach(dp => {
      const deviceId = dp.deviceId;

      dp.playlistIds.forEach((playlist: Playlist) => {
        const playlistId = playlist._id.toString();

        if (!playlistMap.has(playlistId)) {
          playlistMap.set(playlistId, {
            playlistData: playlist,
            deviceIds: []
          });
        }

        const entry = playlistMap.get(playlistId);
        if (!entry.deviceIds.includes(deviceId)) {
          entry.deviceIds.push(deviceId);
        }
      });
    });

    const result = Array.from(playlistMap.values());

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching device playlists:', error);
    return NextResponse.json({ error: 'Failed to fetch device playlists' }, { status: 500 });
  }
}

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