import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AnnouncementPlaylist from '@/models/AnnouncementPlaylist';

// PUT: Update a playlist using query param ?id=...
export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing playlist ID' }, { status: 400 });
  }

  const body = await req.json();
  const { name, announcements, schedule, status } = body;

  try {
    await connectToDatabase();
    const updated = await AnnouncementPlaylist.findByIdAndUpdate(
      id,
      { name, announcements, schedule, status },
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

    return NextResponse.json({ message: 'Playlist deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    return NextResponse.json({ error: 'Failed to delete playlist' }, { status: 500 });
  }
}
