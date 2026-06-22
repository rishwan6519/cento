import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import Device from '@/models/Device';
import DevicePlaylist from '@/models/ConectPlaylist';
import Playlist from '@/models/PlaylistConfig';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const serialNumber = req.nextUrl.searchParams.get('serialNumber');
    const device = await Device.findOne({ serialNumber });
    if (!device) return NextResponse.json({ error: "Device not found" });

    const devicePlaylists = await DevicePlaylist.findOne({ deviceId: device._id }, 'playlistIds');
    const connectedPlaylistIds = devicePlaylists?.playlistIds || [];

    const AssignedDevice = mongoose.models.AssignedDevice || mongoose.model('AssignedDevice');
    const OnboardedDevice = mongoose.models.OnboardedDevice || mongoose.model('OnboardedDevice');

    let associatedIds: any[] = [device._id, device._id.toString()];
    let storeUserIds: any[] = [];
    
    if (AssignedDevice) {
      const assignments = await AssignedDevice.find({ deviceId: device._id, status: 'active' });
      assignments.forEach((a: any) => {
        associatedIds.push(a._id);
        associatedIds.push(a._id.toString());
        if (a.userId) {
          storeUserIds.push(a.userId);
          storeUserIds.push(a.userId.toString());
        }
      });
    }

    let storeConnectedPlaylistIds: any[] = [];
    if (storeUserIds.length > 0) {
      const storePlaylists = await DevicePlaylist.find({ deviceId: { $in: storeUserIds } }, 'playlistIds');
      storePlaylists.forEach((curr: any) => {
        if (curr.playlistIds) {
          curr.playlistIds.forEach((pid: any) => {
            if (pid) storeConnectedPlaylistIds.push(pid);
          });
        }
      });
    }

    const allConnectedPlaylistIds = [...connectedPlaylistIds, ...storeConnectedPlaylistIds];

    const playlists = await Playlist.find({
      $or: [
        { _id: { $in: allConnectedPlaylistIds } },
        { selectedDeviceId: { $in: associatedIds } },
        { deviceIds: { $in: associatedIds } },
        { selectedDeviceId: { $in: storeUserIds } },
        { deviceIds: { $in: storeUserIds } }
      ]
    });

    return NextResponse.json({
      connectedPlaylistIds,
      storeConnectedPlaylistIds,
      allConnectedPlaylistIds,
      associatedIds,
      storeUserIds,
      playlistsFound: playlists.map(p => ({ id: p._id, name: p.name, deviceIds: p.deviceIds, type: p.type }))
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
