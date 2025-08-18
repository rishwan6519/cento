import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import DevicePlaylist from '@/models/ConectPlaylist';
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

// const DATA_DIR = path.join(process.cwd(), 'public', 'data');
// const PLAYLISTS_FILE = path.join(DATA_DIR, 'playlists.json');

type RouteContext = {
  params: {
    id: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
};

// export async function GET(
//   request: NextRequest,
//   context: RouteContext
// ) {
//   try {
//     const { id } = context.params;
//     if (!id) {
//       return NextResponse.json(
//         { success: false, error: 'Playlist ID is required' },
//         { status: 400 }
//       );
//     }

//     let playlists: PlaylistData[] = [];
//     try {
//       const data = await fs.readFile(PLAYLISTS_FILE, 'utf-8');
//       playlists = JSON.parse(data);
//     } catch (error) {
//       console.error('Error reading playlists file:', error);
//       return NextResponse.json(
//         { success: false, error: 'Playlists file not found or invalid' },
//         { status: 404 }
//       );
//     }

//     const playlist = playlists.find(p => p.id === id);
//     if (!playlist) {
//       return NextResponse.json(
//         { success: false, error: `Playlist with ID ${id} not found` },
//         { status: 404 }
//       );
//     }

//     // Add full URLs to audio files
//     const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
//     const enrichedPlaylist = {
//       ...playlist,
//       files: playlist.files.map(file => ({
//         ...file,
//         url: `${baseUrl}${file.path}`,
//         // Keep the original path for reference
//         path: file.path
//       })),
//       // Set default volume values since they're not in the original JSON
//       volume: {
//         main: 80,
//         background: 30
//       }
//     };

//     return NextResponse.json({ 
//       success: true, 
//       playlist: enrichedPlaylist 
//     });
//   } catch (error) {
//     console.error('Error fetching playlist:', error);
//     return NextResponse.json(
//       { success: false, error: 'Failed to fetch playlist' },
//       { status: 500 }
//     );
//   }
// }
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Playlist ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const data = await request.json();
    
    // Construct the data object for the update
    const updatedPlaylistData = {
      name: data.name,
      type: data.type,
      startTime: data.startTime,
      endTime: data.endTime,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      daysOfWeek: data.daysOfWeek || [],
      status: data.status || 'active',
      shuffle: data.shuffle || false, // Include the shuffle property
      files: data.files.map((file: any) => ({
        id: file.id,
        name: file.name,
        path: file.url, // Standardize on 'path' for the file location
        displayOrder: file.displayOrder,
        type: file.type,
        delay: file.delay || 0,
        backgroundImageEnabled: file.backgroundImageEnabled || false,
        backgroundImage: file.backgroundImage || null
      })),
      updatedAt: new Date()
    };

    // Find the playlist by ID and update it with the new data
    const updated = await Playlist.findByIdAndUpdate(
      id, 
      updatedPlaylistData, 
      { new: true, runValidators: true } // Options: return the new doc, and run schema validators
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Playlist not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      playlist: updated
    });

  } catch (error) {
    console.error('Error updating playlist:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { success: false, error: 'Failed to update playlist', details: message },
      { status: 500 }
    );
  }
}

/**
 * Handles deleting a playlist by its ID.
 * It expects the playlist ID in the URL query parameters (`?id=...`).
 * This function uses a transaction to ensure that the playlist is deleted
 * AND its reference is removed from all associated devices atomically.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Playlist ID is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Start a Mongoose session to perform a transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Step 1: Find and delete the playlist within the transaction
      const deletedPlaylist = await Playlist.findByIdAndDelete(id).session(session);
      
      if (!deletedPlaylist) {
        // If no playlist was found, abort the transaction and throw an error
        await session.abortTransaction();
        return NextResponse.json(
          { success: false, error: 'Playlist not found' },
          { status: 404 }
        );
      }

      // Step 2: Remove the playlist's ID from the `playlistIds` array in all DevicePlaylist documents
      const updateResult = await DevicePlaylist.updateMany(
        { playlistIds: id }, // Find all devices containing this playlist ID
        { $pull: { playlistIds: id } }, // Use $pull to remove the ID from the array
        { session } // Ensure this operation is part of the transaction
      );
      
      // If both operations succeed, commit the transaction
      await session.commitTransaction();

      return NextResponse.json({
        success: true,
        message: 'Playlist deleted and device references updated successfully.',
        deletedPlaylistId: deletedPlaylist._id,
        devicesUpdated: updateResult.modifiedCount
      });
    } catch (error) {
      // If any error occurs during the transaction, abort it
      await session.abortTransaction();
      // Re-throw the error to be caught by the outer catch block
      throw error;
    } finally {
      // Always end the session when the transaction is finished
      session.endSession();
    }
  } catch (error) {
    console.error('Error deleting playlist:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { success: false, error: 'Failed to delete playlist', details: message },
      { status: 500 }
    );
  }
}