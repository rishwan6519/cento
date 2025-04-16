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
    const { serialNumber } = params;

    // Step 1: Find device by serial number
    const device = await Device.findOne({ serialNumber });
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

    if (!devicePlaylists || !devicePlaylists.playlistIds.length) {
      return NextResponse.json({
        currentPlaylist: null,
      
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

    // Step 5: Find current and next active playlist
    let currentPlaylist = null;
    let nextPlaylist = null;

    for (let i = 0; i < playlists.length; i++) {
      const playlist = playlists[i];
      const nextIndex = (i + 1) % playlists.length;
      
      if (currentTime >= playlist.startTime && currentTime < playlist.endTime) {
        currentPlaylist = playlist;
        nextPlaylist = playlists[nextIndex];
        break;
      }
    }

    // If no current playlist found, find the next one
    if (!currentPlaylist && playlists.length > 0) {
      for (const playlist of playlists) {
        if (playlist.startTime > currentTime) {
          nextPlaylist = playlist;
          break;
        }
      }
      // If still no next playlist, take the first one (for next day)
      if (!nextPlaylist) {
        nextPlaylist = playlists[0];
      }
    }

    return NextResponse.json({
     
      currentPlaylist: currentPlaylist ? {
        id: currentPlaylist._id,
        updatedAt: currentPlaylist.updatedAt
      } : null,
   

      
    });

  } catch (error) {
    console.error('Error fetching device playlists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch device playlists' },
      { status: 500 }
    );
  }
}

// Helper function to calculate time until next playlist starts
function getTimeUntilStart(currentTime: string, startTime: string): string {
  const current = new Date(`1970-01-01T${currentTime}`);
  const start = new Date(`1970-01-01T${startTime}`);
  
  if (start < current) {
    // If start time is earlier, it means it's for the next day
    start.setDate(start.getDate() + 1);
  }
  
  const diff = start.getTime() - current.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
}