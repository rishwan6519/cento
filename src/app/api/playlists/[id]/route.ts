import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { connectToDatabase } from '@/lib/db';
import Playlist from '@/models/PlaylistConfig';

interface PlaylistFile {
  name: string;
  path: string;
}

interface PlaylistData {
  id: string;
  name: string;
  type: string;
  files: PlaylistFile[];
  backgroundAudio: null | {
    name: string;
    path: string;
  };
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const PLAYLISTS_FILE = path.join(DATA_DIR, 'playlists.json');

type RouteContext = {
  params: {
    id: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = context.params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Playlist ID is required' },
        { status: 400 }
      );
    }

    let playlists: PlaylistData[] = [];
    try {
      const data = await fs.readFile(PLAYLISTS_FILE, 'utf-8');
      playlists = JSON.parse(data);
    } catch (error) {
      console.error('Error reading playlists file:', error);
      return NextResponse.json(
        { success: false, error: 'Playlists file not found or invalid' },
        { status: 404 }
      );
    }

    const playlist = playlists.find(p => p.id === id);
    if (!playlist) {
      return NextResponse.json(
        { success: false, error: `Playlist with ID ${id} not found` },
        { status: 404 }
      );
    }

    // Add full URLs to audio files
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
    const enrichedPlaylist = {
      ...playlist,
      files: playlist.files.map(file => ({
        ...file,
        url: `${baseUrl}${file.path}`,
        // Keep the original path for reference
        path: file.path
      })),
      // Set default volume values since they're not in the original JSON
      volume: {
        main: 80,
        background: 30
      }
    };

    return NextResponse.json({ 
      success: true, 
      playlist: enrichedPlaylist 
    });
  } catch (error) {
    console.error('Error fetching playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch playlist' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Updating playlist with ID:', params.id);
    await connectToDatabase();
    const data = await request.json();

    const updatedPlaylist = {
      name: data.name,
      type: data.type,
      startTime: data.startTime,
      endTime: data.endTime,
      files: data.files.map((file: any) => ({
        id: file.id,
        name: file.name,
        type: file.type,
        url: file.url,
        delay: file.delay || 0,
        backgroundImageEnabled: file.backgroundImageEnabled || false,
        backgroundImage: file.backgroundImage || null
      })),
      backgroundAudio: data.backgroundAudio,
      updatedAt: new Date()
    };

    await Playlist.findByIdAndUpdate(params.id, updatedPlaylist, { new: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating playlist:', error);
    return NextResponse.json({ error: 'Failed to update playlist' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectToDatabase();
    await Playlist.findByIdAndDelete(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    return NextResponse.json({ error: 'Failed to delete playlist' }, { status: 500 });
  }
}