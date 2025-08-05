// Filename: app/api/announcements/details/[playlistId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AnnouncementPlaylist from '@/models/AnnouncementPlaylist'; // Using the model you provided
import mongoose from 'mongoose';

// Define the shape of the context object provided by Next.js for dynamic routes
interface RouteContext {
  params: {
    playlistId: string;
  };
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const playlistId = req.nextUrl.searchParams.get('playlistId');

    // --- Validation ---
    if (!playlistId) {
      return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
      return NextResponse.json({ error: 'Invalid Playlist ID format' }, { status: 400 });
    }

    // --- Database Logic ---
    await connectToDatabase();

    // Find the playlist by its ID and populate the 'file' details within the 'announcements' array.
    // This turns the file IDs into complete objects with all their data.
    const playlist = await AnnouncementPlaylist.findById(playlistId)
      .populate({
        path: 'announcements.file', // The path to the field we want to populate
        model: 'Announcement'        // The model to use for populating
      });

    // Handle case where the playlist is not found
    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    // --- Prepare the Response ---
    // Start with the core data: the list of announcements
    const responseBody: { announcements: any[]; frequency?: number } = {
      announcements: playlist.announcements,
    };

    // Conditionally add the frequency if it exists on the schedule
    if (playlist.schedule && typeof playlist.schedule.frequency === 'number') {
      responseBody.frequency = playlist.schedule.frequency;
    }

    // --- Return Success Response ---
    return NextResponse.json(responseBody, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`[ERROR] Failed to fetch playlist details for ID: ${context.params.playlistId}`, errorMessage);
    return NextResponse.json({ error: 'Failed to fetch playlist details', details: errorMessage }, { status: 500 });
  }
}