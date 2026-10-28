import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Device from '@/models/Device';
import DevicePlaylist from '@/models/ConectPlaylist';
import ConnectedAnnouncement from '@/models/AnnouncementConnection';
import AnnouncementPlaylist from '@/models/AnnouncementPlaylist';

export async function GET(req: NextRequest) {
  await connectToDatabase();
  const serialNumber = req.nextUrl.searchParams.get('serialNumber');
  
  const device = await Device.findOne({ serialNumber });
  if (!device) return NextResponse.json({ error: 'Device not found' });
  
  const devicePlaylist = await DevicePlaylist.findOne({ deviceId: device._id });
  const connections = await ConnectedAnnouncement.find({ deviceId: device._id, status: 'active' });

  const announcementIds = [
    ...connections.flatMap((c: any) => c.announcementPlaylistIds || []),
    ...(devicePlaylist?.announcementPlaylistIds || [])
  ];

  const announcementPlaylists = await AnnouncementPlaylist.find({ _id: { $in: announcementIds } });
  
  return NextResponse.json(announcementPlaylists);
}
