import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import mongoose from 'mongoose';
import AnnouncementPlaylist from '@/models/AnnouncementPlaylist';
import MediaItem from '@/models/MediaItems';

export async function GET(req: NextRequest) {
  let playlistId: string | null = null;

  try {
    playlistId = req.nextUrl.searchParams.get('playlistId');

    if (!playlistId) {
      return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
      return NextResponse.json({ error: 'Invalid Playlist ID format' }, { status: 400 });
    }

    await connectToDatabase();

    const playlist = await AnnouncementPlaylist.findById(playlistId);

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    // Format the announcements using the direct URL stored in the `file` field
    const formattedAnnouncements = playlist.announcements
      .map((ann: any) => {
        if (!ann.file) return null;
        return {
          name: ann.name || "Announcement", // Fallback name
          path: `https://iot.centelon.com${ann.file}`, // ann.file is now the URL string
          displayOrder: ann.displayOrder,
          delay: ann.delay,
        };
      })
      .filter(Boolean); // Remove nulls

    const responseBody = {
      id: playlist._id.toString(),
      versionId: playlist.updatedAt.getTime().toString(),
      frequency:
        typeof playlist.schedule?.frequency === 'number'
          ? playlist.schedule.frequency
          : undefined,
      announcements: formattedAnnouncements,
    };

    return NextResponse.json(responseBody, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`[ERROR] Failed to fetch playlist details for ID: ${playlistId}. Details: ${errorMessage}`);
    return NextResponse.json(
      { error: 'Failed to fetch playlist details', details: errorMessage },
      { status: 500 }
    );
  }
}
