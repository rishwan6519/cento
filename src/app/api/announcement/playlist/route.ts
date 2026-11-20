import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AnnouncementPlaylist from '@/models/AnnouncementPlaylist';
import DevicePlaylist from '@/models/ConectPlaylist';
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
    const UserModel = mongoose.models.User;
    const requestingUser = await UserModel.findById(userObjectId);

    let permittedUserIds = [userObjectId];
    let directCustomerDevices = [];

    if (requestingUser) {
      if (requestingUser.role === 'account_admin' || requestingUser.role === 'admin') {
        const relatedUsers = await UserModel.find({
          $or: [
            { _id: requestingUser._id },
            { controllerId: requestingUser._id },
            ...(requestingUser.customerId ? [{ customerId: requestingUser.customerId }] : []),
            { createdBy: requestingUser._id }
          ]
        }).select('_id');
        permittedUserIds = relatedUsers.map(u => u._id);

        if (requestingUser.customerId) {
          const directDevs = await (mongoose.models.Device || (await import('@/models/Device')).default).find({ customerId: requestingUser.customerId }).select('_id');
          directCustomerDevices = directDevs.map(d => d._id);
        }
      }
    }
    
    // 1. Fetch user's own playlists (or all store playlists if account_admin)
    const ownPlaylists = await AnnouncementPlaylist.find({ userId: { $in: permittedUserIds } })
      .populate('userId', 'username')
      .sort({ createdAt: -1 });

    // 2. Fetch connected playlists that are NOT owned by these users
    let connectedOtherPlaylists: any[] = [];
    
    // Find all device IDs that these users own or are assigned to
    const onboarded = await OnboardedDevice.find({ userId: { $in: permittedUserIds } }).select('deviceId');
    const assigned = await AssignedDevice.find({ userId: { $in: permittedUserIds } }).select('deviceId');
    
    const deviceIds = [
      ...onboarded.map(d => d.deviceId),
      ...assigned.map(d => d.deviceId),
      ...directCustomerDevices
    ];

    if (deviceIds.length > 0) {
      // Find active announcement connections for these devices
      const connections = await DevicePlaylist.find({ deviceId: { $in: deviceIds } }).select('announcementPlaylistIds');
      const activePlaylistIds = connections.reduce((acc: mongoose.Types.ObjectId[], curr) => {
        if (curr.announcementPlaylistIds) acc.push(...curr.announcementPlaylistIds);
        return acc;
      }, []);

      if (activePlaylistIds.length > 0) {
        // Find playlists connected to our devices but not owned by us
        connectedOtherPlaylists = await AnnouncementPlaylist.find({
          _id: { $in: activePlaylistIds },
          userId: { $ne: userObjectId }
        })
        .populate('userId', 'username');
      }
    }

    // Combine both sets
    const allPlaylists = [...ownPlaylists, ...connectedOtherPlaylists]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Fetch active device IDs
    const onboardedDevices = await OnboardedDevice.find().select('deviceId');
    const assignedDevices = await AssignedDevice.find({ status: 'active' }).select('deviceId');
    const activeDeviceIds = new Set([
      ...onboardedDevices.map(d => d.deviceId?.toString()).filter(Boolean),
      ...assignedDevices.map(d => d.deviceId?.toString()).filter(Boolean)
    ]);

    // Check assignments
    const allConnections = await DevicePlaylist.find().select('announcementPlaylistIds deviceId');
    const activeConnections = allConnections.filter(c => c.deviceId && activeDeviceIds.has(c.deviceId.toString()));
    const assignedIds = new Set(activeConnections.flatMap(c => c.announcementPlaylistIds.map((id: any) => id.toString())));
    
    const mappedPlaylists = allPlaylists.map(p => {
      const pIdStr = p._id.toString();
      const deviceIds = activeConnections
        .filter(c => c.announcementPlaylistIds.some((id: any) => id.toString() === pIdStr))
        .map(c => c.deviceId.toString());

      return {
        ...p.toObject(),
        isAssigned: assignedIds.has(pIdStr),
        deviceIds
      };
    });

    return NextResponse.json({ playlists: mappedPlaylists }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching playlists:', error.message || error);
    return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 });
  }
}

// POST: Create a new playlist
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, name, type, announcements, schedule, status } = body;

    if (!userId || !name || !Array.isArray(announcements) || !schedule) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    const newPlaylist = await AnnouncementPlaylist.create({
      userId,
      name,
      type: type || 'announcement',
      announcements,
      schedule,
      status: status || 'active',
    });

    return NextResponse.json({ 
      message: 'Announcement playlist created successfully',
      announcementPlaylistId: newPlaylist._id
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating playlist:', error.message || error);
    return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 });
  }
}
