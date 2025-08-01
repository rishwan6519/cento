// app/api/announcement/playlist-setup/route.ts

import { NextRequest, NextResponse } from 'next/server';
import {connectToDatabase} from '@/lib/db';
import AnnouncementPlaylist from '@/models/AnnouncementPlaylist';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  console.log("userid",userId)

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: 'Invalid or missing userId' }, { status: 400 });
  }

  try {
    const body = await req.json();
    console.log('Request body:', body);

    const {
      name,
      announcements,
      schedule,
      status
    } = body;

    const playlist = await AnnouncementPlaylist.create({
      userId,
      name,
      announcements,
      schedule,
      status,
    });

    return NextResponse.json(playlist, { status: 201 });
  } catch (err: any) {
    console.error('Error creating playlist:', err);
    return NextResponse.json({ error: 'Failed to save playlist' }, { status: 500 });
  }
}
