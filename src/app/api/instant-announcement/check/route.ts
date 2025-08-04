import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Device from '@/models/Device';
import Announcement from '@/models/InstantAnnouncement';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const { serialNumber, status } = await req.json();

    if (!serialNumber || status !== 'done') {
      return NextResponse.json(
        { message: 'Missing serialNumber or invalid status' },
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

    // Delete all instant announcements for the device
    await Announcement.deleteMany({ deviceId: device._id });

    return NextResponse.json({
      success: true,
      message: `Cleared announcements for device ${serialNumber}`,
    });
  } catch (error) {
    console.error('Error clearing announcements:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to clear announcements',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


