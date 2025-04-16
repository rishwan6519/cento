import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import  PlaylistConfig from '@/models/PlaylistConfig';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { 
      name, 
      type, 
      startTime, 
      endTime, 
      files, 
      backgroundAudio 
    } = body;

    // Validate required fields
    if (!name || !type || !startTime || !endTime || !files) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    // Validate files array
    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'At least one file is required' },
        { status: 400 }
      );
    }

    // Create new playlist
    const playlist = await PlaylistConfig.create({
      name,
      type,
      startTime,
      endTime,
      files: files.map((file, index) => ({
        ...file,
        displayOrder: index + 1,
        delay: file.delay || 0
      })),
      backgroundAudio: {
        enabled: backgroundAudio?.enabled || false,
        file: backgroundAudio?.file || null,
        volume: backgroundAudio?.volume || 50
      }
    });

    return NextResponse.json(playlist, { status: 201 });

  } catch (error) {
    console.error('Error creating playlist:', error);
    return NextResponse.json(
      { error: 'Failed to create playlist' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectToDatabase();
    
    const playlists = await PlaylistConfig.find({})
      .sort({ createdAt: -1 });
      console.log("playlists",playlists);
      
    
    return NextResponse.json(playlists);
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return NextResponse.json(
      { error: 'Failed to fetch playlists' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json(
        { error: 'Playlist ID is required' },
        { status: 400 }
      );
    }

    const playlist = await PlaylistConfig.findByIdAndDelete(id);
    if (!playlist) {
      return NextResponse.json(
        { error: 'Playlist not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    return NextResponse.json(
      { error: 'Failed to delete playlist' },
      { status: 500 }
    );
  }
}