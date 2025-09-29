import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { connectToDatabase } from '@/lib/db';
import MediaItemModel from '@/models/MediaItems';
import mongoose from 'mongoose';
import PlaylistConfig from '@/models/PlaylistConfig';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: 'Invalid or missing userId' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const media = await MediaItemModel.find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 });
      console.log( "Media items fetched successfully:", media);

    return NextResponse.json({ media });
  } catch (error) {
    console.error('Error fetching media list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media list from database' },
      { status: 500 }
    );
  }
}
export async function DELETE(request: NextRequest) {
  try {
   const id = request.nextUrl.searchParams.get('userId');
    if (!id) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    const mediaItem = await MediaItemModel.findById(id);
    if (!mediaItem) {
      return NextResponse.json({ error: 'Media item not found' }, { status: 404 });
    }

    // Remove from playlists if applicable
    await PlaylistConfig.updateMany(
      { 'files.path': mediaItem.url },
      { $pull: { files: { path: mediaItem.url } } }
    );

    // Delete physical file
    const relativePath = mediaItem.url.startsWith('/') ? mediaItem.url.slice(1) : mediaItem.url;
    const fullPath = join(process.cwd(), relativePath);

    try {
      if (existsSync(fullPath)) {
        await unlink(fullPath);
        console.log("File deleted successfully:", fullPath);
      } else {
        console.warn("File not found:", fullPath);
      }
    } catch (fileError) {
      console.error("Error deleting file:", fileError);
    }

    // Delete from DB
    const deletedItem = await MediaItemModel.findByIdAndDelete(id);
    if (!deletedItem) {
      return NextResponse.json({ error: 'Failed to delete media item from database' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Media deleted from DB and file system' });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to delete media' }, { status: 500 });
  }
}