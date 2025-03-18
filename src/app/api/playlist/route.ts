import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

const PLAYLISTS_FILE = path.join(process.cwd(), 'public/data/playlists.json');
const UPLOADS_DIR = path.join(process.cwd(), 'public/uploads');

// Ensure directories exist
async function ensureDirectories() {
  const dirs = [
    path.join(UPLOADS_DIR, 'images'),
    path.join(UPLOADS_DIR, 'videos'),
    path.join(UPLOADS_DIR, 'audio')
  ];

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDirectories();

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const files = formData.getAll('files');
    const backgroundAudio = formData.get('backgroundAudio') as File | null;

    if (!name || !type || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create playlist ID and directory
    const playlistId = Date.now().toString();
    const playlistDir = path.join(UPLOADS_DIR, `${type}s`, playlistId);
    await mkdir(playlistDir, { recursive: true });

    // Save files
    const savedFiles = await Promise.all(
      files.map(async (file: any) => {
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = path.join(playlistDir, fileName);
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filePath, buffer);
        return {
          name: file.name,
          path: `/uploads/${type}s/${playlistId}/${fileName}`
        };
      })
    );

    // Handle background audio
    let backgroundAudioPath = null;
    if (backgroundAudio) {
      const backgroundDir = path.join(playlistDir, 'background');
      await mkdir(backgroundDir, { recursive: true });
      const fileName = `${Date.now()}-${backgroundAudio.name}`;
      const filePath = path.join(backgroundDir, fileName);
      const buffer = Buffer.from(await backgroundAudio.arrayBuffer());
      await writeFile(filePath, buffer);
      backgroundAudioPath = `/uploads/${type}s/${playlistId}/background/${fileName}`;
    }

    // Read existing playlists
    let playlists = [];
    try {
      if (existsSync(PLAYLISTS_FILE)) {
        const playlistsData = await readFile(PLAYLISTS_FILE, 'utf-8');
        playlists = JSON.parse(playlistsData);
      }
    } catch (error) {
      console.error('Error reading playlists:', error);
    }

    // Create new playlist
    const newPlaylist = {
      id: playlistId,
      name,
      type,
      files: savedFiles,
      backgroundAudio: backgroundAudioPath,
      createdAt: new Date().toISOString()
    };

    playlists.push(newPlaylist);

    // Save updated playlists
    await writeFile(PLAYLISTS_FILE, JSON.stringify(playlists, null, 2));

    return NextResponse.json({ 
      success: true, 
      playlist: newPlaylist 
    });

  } catch (error) {
    console.error('Error saving playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save playlist' },
      { status: 500 }
    );
  }
}




export async function GET() {
  try {
    // Check if playlists file exists
    if (!existsSync(PLAYLISTS_FILE)) {
      // If file doesn't exist, return empty array
      return NextResponse.json({
        success: true,
        playlists: []
      });
    }

    // Read and parse the playlists file
    const playlistsData = await readFile(PLAYLISTS_FILE, 'utf-8');
    const playlists = JSON.parse(playlistsData);

    // Add additional information for each playlist
    const enhancedPlaylists = playlists.map((playlist: any) => ({
      ...playlist,
      fileCount: playlist.files.length,
      totalDuration: 0, // You can add duration calculation if needed
      thumbnailUrl: playlist.files[0]?.path || null,
      hasBackgroundAudio: !!playlist.backgroundAudio,
      createdAt: playlist.createdAt || new Date().toISOString(),
      status: 'active'
    }));

    return NextResponse.json({
      success: true,
      playlists: enhancedPlaylists,
      total: enhancedPlaylists.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error fetching playlists:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch playlists',
      message: error.message
    }, {
      status: 500
    });
  }
}



