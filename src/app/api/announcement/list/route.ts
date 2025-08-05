import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Announcement from '@/models/AnnouncementFiles';

export async function GET(req: NextRequest) {
  await connectToDatabase();

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    const query = userId ? { userId } : {};

    const announcements = await Announcement.find(query).sort({ createdAt: -1 });
    console.log('Fetched announcements:', announcements);

    return NextResponse.json(announcements, { status: 200 });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json({ message: 'Failed to fetch announcements' }, { status: 500 });
  }
}
