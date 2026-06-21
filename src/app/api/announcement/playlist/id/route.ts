import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AnnouncementPlaylist from '@/models/AnnouncementPlaylist';

import DeviceAnnouncementConnection from '@/models/AnnouncementConnection';

// GET: Fetch a single playlist by ID
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing playlist ID' }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const playlist = await AnnouncementPlaylist.findById(id);

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    return NextResponse.json({ playlist }, { status: 200 });
  } catch (error) {
    console.error('Error fetching playlist:', error);
    return NextResponse.json({ error: 'Failed to fetch playlist' }, { status: 500 });
  }
}

// PUT: Update a playlist using query param ?id=...
export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing playlist ID' }, { status: 400 });
  }

  const body = await req.json();
  const { name, type, announcements, schedule, status } = body;

  try {
    await connectToDatabase();
    const updated = await AnnouncementPlaylist.findByIdAndUpdate(
      id,
      { name, type, announcements, schedule, status },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Playlist updated', playlist: updated }, { status: 200 });
  } catch (error) {
    console.error('Error updating playlist:', error);
    return NextResponse.json({ error: 'Failed to update playlist' }, { status: 500 });
  }
}

// DELETE: Delete a playlist using query param ?id=...
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing playlist ID' }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const deleted = await AnnouncementPlaylist.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    // Also remove this playlist from any assigned devices
    await DeviceAnnouncementConnection.updateMany(
      { announcementPlaylistIds: id },
      { $pull: { announcementPlaylistIds: id } }
    );

    return NextResponse.json({ message: 'Playlist deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    return NextResponse.json({ error: 'Failed to delete playlist' }, { status: 500 });
  }
}
