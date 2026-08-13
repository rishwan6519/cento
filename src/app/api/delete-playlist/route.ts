import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import PlaylistConfig from '@/models/PlaylistConfig';
import DevicePlaylist from '@/models/ConectPlaylist';
import AnnouncementPlaylist from '@/models/AnnouncementPlaylist';

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    
    // Get ID from query params or body
    let id = req.nextUrl.searchParams.get('id') || req.nextUrl.searchParams.get('playlistId');
    if (!id) {
      try {
        const body = await req.json();
        id = body.id || body.playlistId;
      } catch (e) {}
    }

    if (!id) {
      return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 });
    }

    // Attempt to delete from PlaylistConfig
    let deletedPlaylist = await PlaylistConfig.findByIdAndDelete(id);
    
    // If not found, try AnnouncementPlaylist
    if (!deletedPlaylist) {
      deletedPlaylist = await AnnouncementPlaylist.findByIdAndDelete(id);
    }

    if (!deletedPlaylist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    // Also remove from any device connections
    await DevicePlaylist.updateMany(
      { playlistIds: id },
      { $pull: { playlistIds: id } }
    );
    
    await DevicePlaylist.updateMany(
      { announcementPlaylistIds: id },
      { $pull: { announcementPlaylistIds: id } }
    );

    return NextResponse.json({ success: true, message: 'Playlist deleted successfully' });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    return NextResponse.json({ error: 'Failed to delete playlist' }, { status: 500 });
  }
}
