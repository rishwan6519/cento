import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import DeviceAnnouncementConnection from '@/models/AnnouncementConnection';
import '@/models/AnnouncementPlaylist';
import '@/models/Device';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    // Fetch all announcement connections, populating necessary fields
    const connections = await DeviceAnnouncementConnection.find()
      .populate({
        path: 'announcementPlaylistIds',
        select: 'name updatedAt schedule'
      })
      .select('-__v');

    return NextResponse.json({ success: true, data: connections });
  } catch (error) {
    console.error('Error fetching all announcement connections:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch announcement connections' }, { status: 500 });
  }
}
