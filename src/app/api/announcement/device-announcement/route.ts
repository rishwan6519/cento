import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AnnouncementConnection from '@/models/AnnouncementConnection';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json({ error: 'Missing deviceId' }, { status: 400 });
    }

    await connectToDatabase();

    const connection = await AnnouncementConnection.findOne({ deviceId });

    if (!connection) {
      return NextResponse.json({ announcementPlaylistIds: [] }, { status: 404 });
    }

    return NextResponse.json(
      { announcementPlaylistIds: connection.announcementPlaylistIds },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /device-announcement/connected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, deviceId, announcementPlaylistIds } = body;

    if (!userId || !deviceId || !Array.isArray(announcementPlaylistIds)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    // Upsert connection
    const existing = await AnnouncementConnection.findOne({ userId, deviceId });

    if (existing) {
      existing.announcementPlaylistIds = announcementPlaylistIds;
      await existing.save();
      return NextResponse.json(
        { message: 'Connection updated', connection: existing },
        { status: 200 }
      );
    }

    const newConnection = await AnnouncementConnection.create({
      userId,
      deviceId,
      announcementPlaylistIds,
    });

    return NextResponse.json(
      { message: 'Connection created', connection: newConnection },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /device-announcement error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
