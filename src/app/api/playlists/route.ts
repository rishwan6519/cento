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
      category,       // alias for type (from CreateInstantPlaylist)
      startTime,
      endTime,
      startDate,
      endDate,
      files,
      mediaIds,       // alias for files (array of IDs or filenames)
      backgroundAudio,
      userId,
      deviceIds,
      daysOfWeek,
      globalMinVolume,
      globalMaxVolume,
      selectedDeviceId,
      description,
    } = body;

    // Resolve type — accept either 'type' or 'category'
    const resolvedType = type || category || 'media';

    // Validate only name is required
    if (!name) {
      return NextResponse.json(
        { error: 'Playlist name is required' },
        { status: 400 }
      );
    }

    // Resolve files — accept either 'files' array or 'mediaIds' array
    let resolvedFiles: any[] = [];
    if (Array.isArray(files) && files.length > 0) {
      resolvedFiles = files.map((file: any, index: number) => ({
        ...file,
        displayOrder: index + 1,
        delay: file.delay || 0
      }));
    } else if (Array.isArray(mediaIds) && mediaIds.length > 0) {
      resolvedFiles = mediaIds.map((id: any, index: number) => ({
        fileId: id,
        displayOrder: index + 1,
        delay: 0
      }));
    }

    // Create new playlist
    const playlist = await PlaylistConfig.create({
      name,
      type: resolvedType,
      startTime: startTime || null,
      endTime: endTime || null,
      startDate: startDate || null,
      endDate: endDate || null,
      daysOfWeek: daysOfWeek || [],
      globalMinVolume: globalMinVolume ?? 30,
      globalMaxVolume: globalMaxVolume ?? 80,
      selectedDeviceId: selectedDeviceId || null,
      deviceIds: deviceIds || [],
      description: description || '',
      userId: userId || null,
      files: resolvedFiles,
      backgroundAudio: {
        enabled: backgroundAudio?.enabled || false,
        file: backgroundAudio?.file || null,
        volume: backgroundAudio?.volume || 50
      }
    });

    return NextResponse.json({ success: true, data: playlist }, { status: 201 });

  } catch (error) {
    console.error('Error creating playlist:', error);
    return NextResponse.json(
      { error: 'Failed to create playlist', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const {
      id,
      name,
      type,
      startTime,
      endTime,
      startDate,
      endDate,
      mediaIds,
      daysOfWeek,
      globalMinVolume,
      globalMaxVolume,
      selectedDeviceId
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
    }

    // Only update files if mediaIds were explicitly provided
    const updateFields: any = {
      name,
      type: type || 'media',
      startTime: startTime || null,
      endTime: endTime || null,
      startDate: startDate || null,
      endDate: endDate || null,
      daysOfWeek: daysOfWeek || [],
      globalMinVolume: globalMinVolume ?? 30,
      globalMaxVolume: globalMaxVolume ?? 80,
      selectedDeviceId: selectedDeviceId || null,
    };

    if (Array.isArray(mediaIds) && mediaIds.length > 0) {
      updateFields.files = mediaIds.map((mediaId: any, index: number) => ({
        fileId: mediaId,
        displayOrder: index + 1,
        delay: 0
      }));
    }

    const playlist = await PlaylistConfig.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    );

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: playlist });
  } catch (error) {
    console.error('Error updating playlist:', error);
    return NextResponse.json(
      { error: 'Failed to update playlist', details: error instanceof Error ? error.message : String(error) },
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