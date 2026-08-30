import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DeviceCurrentPlaying } from '@/models/DeviceCurrentPlaying';
import mongoose from 'mongoose';
import '@/models/MediaItems'; // Ensure it's registered

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { serialNumber, path } = body;

    if (!serialNumber || path === undefined) {
      return NextResponse.json({ error: 'serialNumber and path are required' }, { status: 400 });
    }

    if (path === '') {
      await DeviceCurrentPlaying.findOneAndDelete({ serialNumber });
      return NextResponse.json({ success: true, message: 'Currently playing cleared successfully' }, { status: 200 });
    }

    await DeviceCurrentPlaying.findOneAndUpdate(
      { serialNumber },
      { serialNumber, path, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, message: 'Currently playing updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating currently playing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const serialNumber = req.nextUrl.searchParams.get('serialNumber');

    if (!serialNumber) {
      return NextResponse.json({ error: 'serialNumber is required' }, { status: 400 });
    }

    const currentPlaying: any = await DeviceCurrentPlaying.findOne({ serialNumber }).lean();
    
    if (currentPlaying && currentPlaying.path) {
      const MediaItemModel = mongoose.models.MediaItem || mongoose.model('MediaItem');
      const escapedPath = currentPlaying.path.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const media = await MediaItemModel.findOne({ url: { $regex: new RegExp(escapedPath + '$', 'i') } }).lean();
      
      if (media) {
        currentPlaying.fullPath = `https://iot.centelon.com/${(media.url || '').replace(/^(https?:\\/\\/iot\\.centelon\\.com)?\\/?/, '')}`;
        currentPlaying.mediaId = media._id.toString();
        currentPlaying.fileCategory = media.fileCategory || media.videoCategory || 'other';
      } else {
        currentPlaying.fullPath = currentPlaying.path.startsWith('http') ? currentPlaying.path : `https://iot.centelon.com/uploads/${currentPlaying.path}`;
      }
    }

    return NextResponse.json({ success: true, data: currentPlaying }, { status: 200 });
  } catch (error) {
    console.error('Error fetching currently playing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
