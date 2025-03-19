import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { rm } from 'fs/promises';


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



export async function DELETE(request: NextRequest) {
  try {
    // Extract playlistId from query parameters
    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get('id');

    if (!playlistId) {
      return NextResponse.json(
        { success: false, error: 'Playlist ID is required' },
        { status: 400 }
      );
    }

    // Read existing playlists
    let playlists = [];
    if (existsSync(PLAYLISTS_FILE)) {
      const playlistsData = await readFile(PLAYLISTS_FILE, 'utf-8');
      playlists = JSON.parse(playlistsData);
    }

    // Find the playlist to delete
    const playlistIndex = playlists.findIndex((p: any) => p.id === playlistId);

    if (playlistIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Playlist not found' },
        { status: 404 }
      );
    }

    // Get the playlist to delete
    const playlistToDelete = playlists[playlistIndex];

    // Delete the playlist's folder and files
    const playlistDir = path.join(
      UPLOADS_DIR,
      `${playlistToDelete.type}s`,
      playlistToDelete.id
    );

    if (existsSync(playlistDir)) {
      // Delete the folder and its contents recursively
      await rm(playlistDir, { recursive: true, force: true });
    }

    // Remove the playlist from the list
    playlists.splice(playlistIndex, 1);

    // Save the updated playlists
    await writeFile(PLAYLISTS_FILE, JSON.stringify(playlists, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Playlist deleted successfully',
    });

  } catch (error) {
    console.error('Error deleting playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete playlist' },
      { status: 500 }
    );
  }
}


export async function PUT(request: NextRequest) {
  try {
    console.log("PUT request");
    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get("id");

    if (!playlistId) {
      return NextResponse.json({ success: false, error: "Playlist ID is required" }, { status: 400 });
    }

    const formData = await request.formData();
    const name = formData.get("name") as string;
    const type = formData.get("type") as string;
    const rawFiles = formData.getAll("files");
    const rawBackgroundAudio = formData.get("backgroundAudio");

    if (!name || !type) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Read existing playlists
    let playlists = [];
    if (existsSync(PLAYLISTS_FILE)) {
      const playlistsData = await readFile(PLAYLISTS_FILE, "utf-8");
      playlists = JSON.parse(playlistsData);
    }

    // Find the playlist to update
    const playlistIndex = playlists.findIndex((p: any) => p.id === playlistId);

    if (playlistIndex === -1) {
      return NextResponse.json({ success: false, error: "Playlist not found" }, { status: 404 });
    }

    // Process uploaded files
    const files = await Promise.all(
      rawFiles.map(async (file: any) => {
        if (file instanceof File) {
          const filePath = path.join("uploads", `${Date.now()}-${file.name}`);
          const buffer = await file.arrayBuffer();
          await writeFile(filePath, Buffer.from(buffer));
          return { name: file.name, path: filePath };
        }
        return null;
      })
    );

    // Process background audio
    let backgroundAudio = playlists[playlistIndex].backgroundAudio;
    if (rawBackgroundAudio instanceof File) {
      const audioPath = path.join("uploads", `${Date.now()}-${rawBackgroundAudio.name}`);
      const audioBuffer = await rawBackgroundAudio.arrayBuffer();
      await writeFile(audioPath, Buffer.from(audioBuffer));
      backgroundAudio = { name: rawBackgroundAudio.name, path: audioPath };
    }

    // Update playlist details
    playlists[playlistIndex] = {
      ...playlists[playlistIndex],
      name,
      type,
      files: files.filter(Boolean).length > 0 ? files.filter(Boolean) : playlists[playlistIndex].files,
      backgroundAudio,
      updatedAt: new Date().toISOString(),
    };

    // Save the updated playlists
    await writeFile(PLAYLISTS_FILE, JSON.stringify(playlists, null, 2));

    return NextResponse.json({ success: true, playlist: playlists[playlistIndex] });
  } catch (error) {
    console.error("Error updating playlist:", error);
    return NextResponse.json({ success: false, error: "Failed to update playlist" }, { status: 500 });
  }
}