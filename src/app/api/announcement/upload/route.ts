import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Announcement from '@/models/AnnouncementFiles';

export async function POST(req: NextRequest) {
  await connectToDatabase();

  try {
    const body = await req.json();
    const { userId, name, path, type, voice } = body;

    if (!userId || !name || !path || !type) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const announcement = await Announcement.create({
      userId,
      name,
      path,
      type,
      voice: voice || null,
    });

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    console.error('Error saving announcement:', error);
    return NextResponse.json({ message: 'Failed to save announcement' }, { status: 500 });
  }
}
