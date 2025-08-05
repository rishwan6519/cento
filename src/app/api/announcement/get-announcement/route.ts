// Filename: app/api/announcements/details/[playlistId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import mongoose from 'mongoose';
import AnnouncementPlaylist from '@/models/AnnouncementPlaylist';
import Announcement from '@/models/AnnouncementFiles'; // Ensure this is imported

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

    const playlist = await AnnouncementPlaylist.findById(playlistId)
      .populate({
        path: 'announcements.file',
        model: Announcement,
      });

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    // --- THE FIX: Transform the data structure here ---
    const formattedAnnouncements = playlist.announcements.map((ann: any) => {
      // Ensure 'file' is populated before accessing its properties
      if (!ann.file) {
        return null; // Or handle as an error if a file is always expected
      }
      return {
        name: ann.file.name,
        path: ann.file.path,
        displayOrder: ann.displayOrder,
        delay: ann.delay,
      };
    }).filter(Boolean); // Filter out any null entries if a file was missing

    // --- Prepare the Response with the new formatted data ---
    const responseBody: { announcements: any[]; frequency?: number } = {
      announcements: formattedAnnouncements,
    };

    if (playlist.schedule && typeof playlist.schedule.frequency === 'number') {
      responseBody.frequency = playlist.schedule.frequency;
    }

    return NextResponse.json(responseBody, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`[ERROR] Failed to fetch playlist details for ID: ${playlistId}. Details: ${errorMessage}`);
    return NextResponse.json({ error: 'Failed to fetch playlist details', details: errorMessage }, { status: 500 });
  }
}