import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import InstantAnnouncement from '@/models/InstantAnnouncement';
import AnnouncementFile from '@/models/AnnouncementFiles';
import '@/models/AnnouncementFiles';


export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { userId, deviceId, audioUrl, announcementName } = body;

    console.log('Request body:', body);

    if (!userId || !deviceId || !audioUrl || !announcementName) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(deviceId)) {
      return NextResponse.json({ message: 'Invalid userId or deviceId' }, { status: 400 });
    }

    // Check if file already exists
    let announcementFile = await AnnouncementFile.findOne({ path: audioUrl });

    // Save file if not found
    if (!announcementFile) {
      announcementFile = new AnnouncementFile({
        userId,
        name: announcementName,
        path: audioUrl,
        type: 'recorded',
        voice: 'user', // optional
      });

      await announcementFile.save();
    }

    // Save to InstantAnnouncement
    const newAnnouncement = new InstantAnnouncement({
      userId,
      file: announcementFile._id,
      deviceId,
      scheduleType: 'instantaneous',
    });

    const savedAnnouncement = await newAnnouncement.save();

    return NextResponse.json({
      success: true,
      message: 'Announcement and file saved successfully.',
      data: savedAnnouncement,
    }, { status: 201 });

  } catch (error) {
    console.error('Error saving announcement:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to save announcement',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
