import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { Playlist, PlaylistFile } from '@/types/playlist';

// GET - Fetch all playlists
export async function GET() {
  try {
    console.log("....")
    const playlistsPath = path.join(process.cwd(),'public', 'data', 'playlists.json');
    console.log(playlistsPath,"....playlistsPath")
    
    // Ensure the data directory exists
    await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });

    let playlists = [];
    try {
      const fileContent = await fs.readFile(playlistsPath, 'utf-8');
      playlists = JSON.parse(fileContent);
    } catch (error) {
      // If file doesn't exist, return empty array
      playlists = [];
    }

    return NextResponse.json({
      success: true,
      playlists
    });
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch playlists' },
      { status: 500 }
    );
  }
}

// PUT - Update playlist
export async function PUT(request: Request) {
  try {
    const playlistsPath = path.join(process.cwd(), 'data', 'playlists.json');
    const body = await request.json();
    const { id, ...updateData } = body;

    let playlists: Playlist[] = [];
    try {
      const fileContent = await fs.readFile(playlistsPath, 'utf-8');
      playlists = JSON.parse(fileContent);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Playlists file not found' },
        { status: 404 }
      );
    }

    const playlistIndex = playlists.findIndex(p => p.id === id);
    if (playlistIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Playlist not found' },
        { status: 404 }
      );
    }

    playlists[playlistIndex] = {
      ...playlists[playlistIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    await fs.writeFile(playlistsPath, JSON.stringify(playlists, null, 2));

    return NextResponse.json({
      success: true,
      playlist: playlists[playlistIndex]
    });
  } catch (error) {
    console.error('Error updating playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update playlist' },
      { status: 500 }
    );
  }
}

// DELETE - Remove playlist and its files
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    console.log('Deleting playlist ID:', id);

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Playlist ID is required' },
        { status: 400 }
      );
    }

    const playlistsPath = path.join(process.cwd(), 'public', 'data', 'playlists.json');
    
    // Read existing playlists
    let playlists = [];
    try {
      const fileContent = await fs.readFile(playlistsPath, 'utf-8');
      playlists = JSON.parse(fileContent);
      console.log('Current playlists count:', playlists.length);
    } catch (error) {
      console.error('Error reading playlists file:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to read playlists file' },
        { status: 500 }
      );
    }

    // Find playlist to delete
    const playlistIndex = playlists.findIndex((p: any) => p.id === id);
    if (playlistIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Playlist not found' },
        { status: 404 }
      );
    }

    // Remove playlist from array
    playlists.splice(playlistIndex, 1);

    // Save updated playlists file
    await fs.writeFile(playlistsPath, JSON.stringify(playlists, null, 2));
    console.log('Updated playlists.json file');

    return NextResponse.json({
      success: true,
      message: 'Playlist deleted successfully'
    });

  } catch (error) {
    console.error('Error in DELETE route:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete playlist' },
      { status: 500 }
    );
  }
}