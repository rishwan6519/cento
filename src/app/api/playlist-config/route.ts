import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    console.log('Form Data:', formData);
    
    // Get and parse the config data
    const configJson = formData.get('config');
    if (!configJson || typeof configJson !== 'string') {
      return NextResponse.json({ error: 'Invalid configuration data' }, { status: 400 });
    }

    const config = JSON.parse(configJson);
    const dataDir = path.join(process.cwd(), 'public', 'data');
    const playlistsPath = path.join(dataDir, 'playlists.json');
    
    // Create data directory if it doesn't exist
    if (!existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true });
    }

    // Load existing playlists or initialize empty array
    let playlists = [];
    try {
      if (existsSync(playlistsPath)) {
        const playlistsData = await readFile(playlistsPath, 'utf-8');
        playlists = JSON.parse(playlistsData);
      }
    } catch (error) {
      console.error('Error reading playlists:', error);
    }

    // Generate new ID if not provided
    if (!config.id) {
      const maxId = playlists.reduce((max: number, p: any) => {
        const id = parseInt(p.id);
        return id > max ? id : max;
      }, 0);
      config.id = (maxId + 1).toString();
    }

    // Create playlist directory
    const playlistDir = path.join(process.cwd(), 'public', 'playlists', config.id);
    if (!existsSync(playlistDir)) {
      await mkdir(playlistDir, { recursive: true });
    }

    // Handle background images for audio files
    const updatedFiles = await Promise.all(config.files.map(async (file: any, index: number) => {
      const bgImage = formData.get(`bgImage-${index}`);
      let bgImagePath = null;

      if (bgImage && bgImage instanceof Blob) {
        const fileName = `bg-image-${index}${path.extname(file.name)}`;
        bgImagePath = `/playlists/${config.id}/${fileName}`;
        
        await writeFile(
          path.join(playlistDir, fileName),
          Buffer.from(await bgImage.arrayBuffer())
        );
      }

      return {
        ...file,
        backgroundImage: bgImagePath || file.backgroundImage
      };
    }));

    // Create the final playlist configuration
    const playlistConfig = {
      ...config,
      files: updatedFiles,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Update or add new playlist
    const playlistIndex = playlists.findIndex((p: any) => p.id === config.id);
    if (playlistIndex !== -1) {
      playlists[playlistIndex] = playlistConfig;
    } else {
      playlists.push(playlistConfig);
    }

    // Save updated playlists
    await writeFile(playlistsPath, JSON.stringify(playlists, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Playlist configuration saved successfully',
      config: playlistConfig
    });

  } catch (error) {
    console.error('Error saving playlist configuration:', error);
    return NextResponse.json(
      { error: 'Failed to save playlist configuration' },
      { status: 500 }
    );
  }
}

// Add GET method to retrieve playlist configurations
export async function GET(req: NextRequest) {
  try {
    const playlistsPath = path.join(process.cwd(), 'public', 'data', 'playlists.json');
    
    if (!existsSync(playlistsPath)) {
      return NextResponse.json({ playlists: [] });
    }

    const playlistsData = await readFile(playlistsPath, 'utf-8');
    const playlists = JSON.parse(playlistsData);

    return NextResponse.json({ playlists });

  } catch (error) {
    console.error('Error retrieving playlists:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve playlists' },
      { status: 500 }
    );
  }
}

// Add DELETE method to remove playlist configurations
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    const playlistsPath = path.join(process.cwd(), 'public', 'data', 'playlists.json');
    
    if (!existsSync(playlistsPath)) {
      return NextResponse.json({ error: 'No playlists found' }, { status: 404 });
    }

    const playlistsData = await readFile(playlistsPath, 'utf-8');
    let playlists = JSON.parse(playlistsData);
    
    playlists = playlists.filter((p: any) => p.id !== id);
    
    await writeFile(playlistsPath, JSON.stringify(playlists, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Playlist configuration deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting playlist:', error);
    return NextResponse.json(
      { error: 'Failed to delete playlist' },
      { status: 500 }
    );
  }
}