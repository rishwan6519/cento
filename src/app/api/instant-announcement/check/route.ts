import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import Device from '@/models/Device';
import InstantAnnouncement from '@/models/InstantAnnouncement';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const { serialNumber, status } = await req.json();

    if (!serialNumber || status !== 'done') {
      return NextResponse.json(
        { success: false, message: 'Missing serialNumber or invalid status' },
        { status: 400 }
      );
    }
    

    const device = await Device.findOne({ serialNumber });
    if (!device) {
      return NextResponse.json(
        { success: false, message: 'Device not found' },
        { status: 404 }
      );
    }

    // Log before deletion
    console.log(`Clearing InstantAnnouncements for device ID: ${device._id}`);

    const deleted = await InstantAnnouncement.deleteMany({ deviceId: device._id });
    console.log(`Deleted count: ${deleted.deletedCount}`);

    return NextResponse.json({
      success: true,
      message: `Cleared ${deleted.deletedCount} announcements for device ${serialNumber}`,
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
