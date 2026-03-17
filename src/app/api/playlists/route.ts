import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import PlaylistConfig from '@/models/PlaylistConfig';
import DevicePlaylist from '@/models/ConectPlaylist';
import OnboardedDevice from '@/models/OnboardedDevice';
import AssignedDevice from '@/models/AssignDevice';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { 
      name, 
      type, 
      startTime, 
      endTime, 
      files, 
      backgroundAudio 
    } = body;

    // Validate required fields
    if (!name || !type || !startTime || !endTime || !files) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    // Validate files array
    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'At least one file is required' },
        { status: 400 }
      );
    }

    // Create new playlist
    const playlist = await PlaylistConfig.create({
      name,
      type,
      startTime,
      endTime,
      files: files.map((file, index) => ({
        ...file,
        displayOrder: index + 1,
        delay: file.delay || 0
      })),
      backgroundAudio: {
        enabled: backgroundAudio?.enabled || false,
        file: backgroundAudio?.file || null,
        volume: backgroundAudio?.volume || 50
      }
    });

    return NextResponse.json(playlist, { status: 201 });

  } catch (error) {
    console.error('Error creating playlist:', error);
    return NextResponse.json(
      { error: 'Failed to create playlist' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {

     const userId = req.nextUrl.searchParams.get('userId');
    
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
          return NextResponse.json(
            { error: 'Invalid or missing userId' },
            { status: 400 }
          );
        }
    
    await connectToDatabase();
    
    // Look up the user to find their controllerId (super user)
    const User = mongoose.models.User;
    const userObjectId = new mongoose.Types.ObjectId(userId);
    let myPlaylistsQuery: any = { userId: userObjectId };
    let controllerId: mongoose.Types.ObjectId | null = null;
    
    if (User) {
      const user = await User.findById(userId).select('controllerId');
      if (user?.controllerId) {
        controllerId = new mongoose.Types.ObjectId(user.controllerId);
      }
    }
    
    // Fetch user's own playlists
    const ownPlaylists = await PlaylistConfig.find(myPlaylistsQuery);
    
    // For controller (super user) playlists, only include if they are CONNECTED to one of the user's devices
    let connectedSuperUserPlaylists: any[] = [];
    if (controllerId) {
      // 1. Get all device IDs that this user owns or is assigned to
      const onboarded = await OnboardedDevice.find({ userId: userObjectId }).select('deviceId');
      const assigned = await AssignedDevice.find({ userId: userObjectId, status: 'active' }).select('deviceId');
      
      const deviceIds = [
        ...onboarded.map(d => d.deviceId),
        ...assigned.map(d => d.deviceId)
      ];

      if (deviceIds.length > 0) {
        // 2. Find all active connections for these devices
        const connections = await DevicePlaylist.find({ deviceId: { $in: deviceIds } }).select('playlistIds');
        const activePlaylistIds = connections.reduce((acc: mongoose.Types.ObjectId[], curr) => {
          if (curr.playlistIds) acc.push(...curr.playlistIds);
          return acc;
        }, []);

        if (activePlaylistIds.length > 0) {
          // 3. Find playlists from controller that are in our active list
          connectedSuperUserPlaylists = await PlaylistConfig.find({
            _id: { $in: activePlaylistIds },
            userId: controllerId
          });
        }
      }
    }
    
    // Combine both sets
    const allPlaylists = [...ownPlaylists, ...connectedSuperUserPlaylists]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
    return NextResponse.json(allPlaylists);
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch playlists' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json(
        { error: 'Playlist ID is required' },
        { status: 400 }
      );
    }

    const playlist = await PlaylistConfig.findByIdAndDelete(id);
    if (!playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    return NextResponse.json(
      { error: 'Failed to delete playlist' },
      { status: 500 }
    );
  }
}