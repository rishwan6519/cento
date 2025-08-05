import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import InstantAnnouncement from '@/models/InstantAnnouncement';
import AnnouncementFile from '@/models/AnnouncementFiles';
import Device from '@/models/Device';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { userId, deviceId, audioUrl, announcementName } = body;

    console.log('Request body:', body);

    // Validate required fields
    if (!userId || !deviceId || !audioUrl || !announcementName) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate ObjectIds
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: 'Invalid userId' },
        { status: 400 }
      );
    }

    // Assuming deviceId is a serial number string — if it's an ObjectId, change this check accordingly
    const device = await Device.findOne({ serialNumber: deviceId });
    if (!device) {
      return NextResponse.json(
        { message: 'Device not found' },
        { status: 404 }
      );
    }
console.log(device,"this is device")
    // Check if announcement file already exists
    let announcementFile = await AnnouncementFile.findOne({ path: audioUrl });

    // Create new file record if it doesn't exist
    if (!announcementFile) {
      announcementFile = new AnnouncementFile({
        userId,
        name: announcementName,
        path: audioUrl,
        type: 'recorded',
        voice: 'user',
      });

      await announcementFile.save();
    }

    // Create new instant announcement
    const newAnnouncement = new InstantAnnouncement({
      userId,
      file: announcementFile._id,
      deviceId: device._id,
      scheduleType: 'instantaneous',
    });

    const savedAnnouncement = await newAnnouncement.save();

    return NextResponse.json(
      {
        success: true,
        message: 'Announcement and file saved successfully.',
        data: savedAnnouncement,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error saving announcement:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to save announcement',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
