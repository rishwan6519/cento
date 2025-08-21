import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AnnouncementPlaylist from '@/models/AnnouncementPlaylist';

// GET: Fetch playlists by userId
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const playlists = await AnnouncementPlaylist.find({ userId })
      .sort({ createdAt: -1 })
      .populate('announcements.file');

      console.log("Playlists fetched for userId:", userId, playlists);

    return NextResponse.json({ playlists }, { status: 200 });
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 });
  }
}

// POST: Create a new playlist
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, name, announcements, schedule, status } = body;

  if (!userId || !name || !Array.isArray(announcements) || !schedule) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const newPlaylist = await AnnouncementPlaylist.create({
      userId,
      name,
      announcements,
      schedule,
      status: status || 'active',
    });

    return NextResponse.json({ playlist: newPlaylist }, { status: 201 });
  } catch (error) {
    console.error('Error creating playlist:', error);
    return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 });
  }
}
