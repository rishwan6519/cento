import { NextRequest, NextResponse } from 'next/server';
import {connectToDatabase} from '@/lib/db';
import Device from '@/models/Device';
import Announcement from '@/models/InstantAnnouncement';
import '@/models/AnnouncementFiles';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const serialNumber = searchParams.get('serialNumber');
    console.log('Serial Number:', serialNumber);

    if (!serialNumber) {
      return NextResponse.json(
        { message: 'Missing serialNumber' },
        { status: 400 }
      );
    }

    const device = await Device.findOne({ serialNumber });

    if (!device) {
      return NextResponse.json(
        { message: 'Device not found' },
        { status: 404 }
      );
    }
    console.log('Device found:', device);

    const announcements = await Announcement.find({
      deviceId: device._id,
    }).populate('file');

    const totalDurationSeconds = announcements.reduce((sum, a) => {
      const fileDuration = a.file && 'duration' in a.file ? a.file.duration : 0;
      return sum + fileDuration;
    }, 0);

    const formatDuration = (seconds: number) => {
      const min = Math.floor(seconds / 60);
      const sec = Math.floor(seconds % 60);
      return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    };

    return NextResponse.json({
      success: true,
      device: {
        _id: device._id,
        serialNumber: device.serialNumber,
        name: device.name,
      },
      announcements,
      totalDurationSeconds,
      formattedDuration: formatDuration(totalDurationSeconds),
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch announcements',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
