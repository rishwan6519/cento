import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AnnouncementPlaylist from '@/models/AnnouncementPlaylist';

export async function GET(req: NextRequest) {
  await connectToDatabase();
  const userId = req.nextUrl.searchParams.get('userId');
  const playlists = await AnnouncementPlaylist.find(userId ? { userId } : {});
  return NextResponse.json(playlists);
}
