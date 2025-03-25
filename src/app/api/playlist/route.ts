import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { rm } from 'fs/promises';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MEDIA_FILES_JSON = path.join(process.cwd(), 'data', 'mediaFiles.json');

interface MediaFile {
  id: string;
  name: string;
  type: string;
  path: string;
  uploadedAt: string;
}

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
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const files = formData.getAll('files');

    // Create base upload directory if it doesn't exist
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Create type-specific directories
    const imageDir = path.join(UPLOAD_DIR, 'images');
    const videoDir = path.join(UPLOAD_DIR, 'videos');
    const audioDir = path.join(UPLOAD_DIR, 'audio');

    await Promise.all([
      !existsSync(imageDir) && mkdir(imageDir, { recursive: true }),
      !existsSync(videoDir) && mkdir(videoDir, { recursive: true }),
      !existsSync(audioDir) && mkdir(audioDir, { recursive: true })
    ]);

    const uploadedFiles: MediaFile[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await (file as File).arrayBuffer());
      const fileName = `${Date.now()}-${(file as File).name}`;
      let filePath: string;

      // Determine directory based on file type
      if ((file as File).type.startsWith('image/')) {
        filePath = path.join(imageDir, fileName);
      } else if ((file as File).type.startsWith('video/')) {
        filePath = path.join(videoDir, fileName);
      } else if ((file as File).type.startsWith('audio/')) {
        filePath = path.join(audioDir, fileName);
      } else {
        throw new Error('Unsupported file type');
      }

      // Save file
      await writeFile(filePath, buffer);

      // Create relative path for database
      const relativePath = path.relative(
        path.join(process.cwd(), 'public'),
        filePath
      ).replace(/\\/g, '/');

      // Add file info to array
      uploadedFiles.push({
        id: Math.random().toString(36).substr(2, 9),
        name: (file as File).name,
        type: (file as File).type,
        path: '/' + relativePath,
        uploadedAt: new Date().toISOString(),
      });
    }

    // Save playlist data
    const playlistData = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      type,
      files: uploadedFiles,
      createdAt: new Date().toISOString(),
    };

    // Read existing playlists
    let playlists = [];
    try {
      const playlistsFile = path.join(process.cwd(), 'data', 'playlists.json');
      if (existsSync(playlistsFile)) {
        playlists = JSON.parse(await readFile(playlistsFile, 'utf-8'));
      }
    } catch (error) {
      console.error('Error reading playlists:', error);
    }

    // Add new playlist and save
    playlists.push(playlistData);
    await writeFile(
      path.join(process.cwd(), 'data', 'playlists.json'),
      JSON.stringify(playlists, null, 2)
    );

    return NextResponse.json({
      success: true,
      playlist: playlistData,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create playlist' },
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