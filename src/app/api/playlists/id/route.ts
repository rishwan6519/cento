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
    console.log('Received data:', data);

    const updatedPlaylist = {
      name: data.name,
      type: data.type,
      startTime: data.startTime,
      endTime: data.endTime,
      // Add start and end dates
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      // Add days of week
      daysOfWeek: data.daysOfWeek || [],
      // Add status
      status: data.status || 'active',
      files: data.files.map((file: any) => ({
        id: file.id,
        name: file.name,
        path: file.url,
        displayOrder: file.displayOrder,
        type: file.type,
        url: file.url,
        delay: file.delay || 0,
        backgroundImageEnabled: file.backgroundImageEnabled || false,
        backgroundImage: file.backgroundImage || null
      })),
      updatedAt: new Date()
    };

    const updated = await Playlist.findByIdAndUpdate(
      id, 
      updatedPlaylist, 
      { new: true, runValidators: true }
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
    return NextResponse.json(
      { error: 'Failed to update playlist' },
      { status: 500 }
    );
  }
}export async function DELETE(request: NextRequest) {
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

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Delete the playlist
      const deletedPlaylist = await Playlist.findByIdAndDelete(id).session(session);
      
      if (!deletedPlaylist) {
        throw new Error('Playlist not found');
      }

      // Add logging to debug
      console.log('Attempting to remove playlist from devices:', id);
      
      // Fixed query - let MongoDB handle the ObjectId conversion
      const updateResult = await DevicePlaylist.updateMany(
        { playlistIds: id }, // MongoDB will automatically convert string to ObjectId for array matching
        { $pull: { playlistIds: id } }, // Same here
        { session }
      );

      console.log('Update result:', updateResult);

      await session.commitTransaction();
      return NextResponse.json({
        success: true,
        deletedPlaylist: deletedPlaylist._id,
        devicesUpdated: updateResult.modifiedCount
      });
    } catch (error) {
      console.error('Transaction error:', error);
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Error deleting playlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete playlist' },
      { status: 500 }
    );
  }
}