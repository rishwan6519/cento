import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AnnouncementPlaylist from '@/models/AnnouncementPlaylist';
import DeviceAnnouncementConnection from '@/models/AnnouncementConnection';
import OnboardedDevice from '@/models/OnboardedDevice';
import AssignedDevice from '@/models/AssignDevice';
import mongoose from 'mongoose';
import '@/models/AnnouncementFiles'; 
import '@/models/User'; 
import '@/models/Device'; 
// GET: Fetch playlists by userId
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const User = mongoose.models.User;
    let controllerId: mongoose.Types.ObjectId | null = null;
    
    if (User) {
      const user = await User.findById(userId).select('controllerId');
      if (user?.controllerId) {
        controllerId = new mongoose.Types.ObjectId(user.controllerId);
      }
    }
    
    // 1. Fetch user's own playlists
    const ownPlaylists = await AnnouncementPlaylist.find({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .populate({
        path: 'announcements.file',
        model: 'Announcement', 
      });

    // 2. Fetch controller's playlists ONLY if they are actively connected to this user's devices
    let connectedControllerPlaylists: any[] = [];
    if (controllerId) {
      // Find all device IDs that this user owns or is assigned to
      const onboarded = await OnboardedDevice.find({ userId: userObjectId }).select('deviceId');
      const assigned = await AssignedDevice.find({ userId: userObjectId, status: 'active' }).select('deviceId');
      
      const deviceIds = [
        ...onboarded.map(d => d.deviceId),
        ...assigned.map(d => d.deviceId)
      ];

      if (deviceIds.length > 0) {
        // Find active announcement connections for these devices
        const connections = await DeviceAnnouncementConnection.find({ deviceId: { $in: deviceIds } }).select('announcementPlaylistIds');
        const activePlaylistIds = connections.reduce((acc: mongoose.Types.ObjectId[], curr) => {
          if (curr.announcementPlaylistIds) acc.push(...curr.announcementPlaylistIds);
          return acc;
        }, []);

        if (activePlaylistIds.length > 0) {
          // Find playlists from controller that are in the active list
          connectedControllerPlaylists = await AnnouncementPlaylist.find({
            _id: { $in: activePlaylistIds },
            userId: controllerId
          }).populate({
            path: 'announcements.file',
            model: 'Announcement',
          });
        }
      }
    }

    // Combine both sets
    const allPlaylists = [...ownPlaylists, ...connectedControllerPlaylists]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ playlists: allPlaylists }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching playlists:', error.message || error);
    return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 });
  }
}

// POST: Create a new playlist
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, name, announcements, schedule, status } = body;

    if (!userId || !name || !Array.isArray(announcements) || !schedule) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    const newPlaylist = await AnnouncementPlaylist.create({
      userId,
      name,
      announcements,
      schedule,
      status: status || 'active',
    });

    return NextResponse.json({ playlist: newPlaylist }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating playlist:', error.message || error);
    return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 });
  }
}
