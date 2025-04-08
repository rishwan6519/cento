import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { statSync } from 'fs'; 
import { Playlist, PlaylistFile } from '@/types/playlist';

export async function GET() {
  try {
    console.log("hiiiiiiiiiiii")
    // Define path to playlists data file
    const playlistsPath = path.join(process.cwd(), 'data', 'playlists.json');
    const mediaFolderPath = path.join(process.cwd(), 'public', 'media');

    // Create directories if they don't exist
    await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
    await fs.mkdir(mediaFolderPath, { recursive: true });

    let playlists: Playlist[] = [];
    try {
      // Read existing playlists
      const fileContent = await fs.readFile(playlistsPath, 'utf-8');
      playlists = JSON.parse(fileContent);
    } catch (error) {
      // If file doesn't exist or is invalid, start with empty array
      playlists = [];
    }

    // Get all files in media directory
    const files = await fs.readdir(mediaFolderPath);

    // Map through playlists and add file details
    const enhancedPlaylists = await Promise.all(playlists.map(async (playlist: Playlist) => ({
      ...playlist,
      files: await Promise.all(playlist.files.map(async (file: PlaylistFile) => {
        // Get file stats
        const filePath = path.join(mediaFolderPath, file.name);
        const fileStats = await fs.stat(filePath);

        return {
          ...file,
          size: fileStats.size,
          createdAt: fileStats.birthtime,
          url: `/media/${file.name}`
        };
      }))
    })));

    return NextResponse.json({
      success: true,
      playlists: enhancedPlaylists
    });

  } catch (error) {
    console.error('Error fetching playlists:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch playlists' },
      { status: 500 }
    );
  }
}