import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { connectToDatabase } from '@/lib/db';
import MediaItemModel from '@/models/MediaItems';

export async function GET() {
  try {
    console.log("Fetching media list from MongoDB...");
    await connectToDatabase(); // Ensure DB connection

    const media = await MediaItemModel.find().sort({ createdAt: -1 });

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
    const { id } = await request.json();
    console.log("Deleting media with ID:", id);
    
    if (!id) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }
    
    await connectToDatabase(); // Ensure DB connection
    
    // First find the media item to get the file path
    const mediaItem = await MediaItemModel.findById(id);
    
    if (!mediaItem) {
      return NextResponse.json({ error: 'Media item not found' }, { status: 404 });
    }
    
    // Get the relative file path from the URL field
    // Your URLs are stored as '/uploads/fileType/uniqueFileName'
    const relativePath = mediaItem.url;
    console.log("Media relative path:", relativePath);
    
    try {
      // Convert relative path to absolute path on the server
      const fullPath = join(process.cwd(), 'public', relativePath);
      console.log("Attempting to delete file at:", fullPath);
      
      // Check if the file exists
      if (existsSync(fullPath)) {
        // Delete the file
        await unlink(fullPath);
        console.log("File deleted successfully from:", fullPath);
      } else {
        console.warn("File not found at path:", fullPath);
      }
    } catch (fileError) {
      console.error("Error deleting physical file:", fileError);
      // Continue with database deletion even if file deletion fails
    }
    
    // Now delete from database
    const deletedItem = await MediaItemModel.findByIdAndDelete(id);
    
    if (!deletedItem) {
      return NextResponse.json({ 
        error: 'Failed to delete media record from database'
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Media deleted successfully from database and file system' 
    });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete media'
    }, { status: 500 });
  }
}