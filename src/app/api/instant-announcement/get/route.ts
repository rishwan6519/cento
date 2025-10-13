import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import sanitize from 'sanitize-filename';
import { v4 as uuidv4 } from 'uuid';
import { connectToDatabase } from '@/lib/db';
import Device from '@/models/Device';
import InstantAnnouncement from '@/models/InstantAnnouncement';
import Announcement from '@/models/AnnouncementFiles';

// ==================== GET - Retrieve Announcements for Device ====================
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const serialNumber = searchParams.get('serialNumber');
    console.log('Serial Number:', serialNumber);

    if (!serialNumber) {
      return NextResponse.json(
        { success: false, message: 'Missing serialNumber' },
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
    console.log('Device found:', device);

    // Query instant announcements for this device
    const instantAnnouncements = await InstantAnnouncement.find({
      deviceId: device._id,
      // Optionally filter by status: status: 'pending'
    })
    .populate('file') // Populate the file reference
    .sort({ createdAt: -1 }); // Most recent first

    console.log('Instant Announcements found:', instantAnnouncements.length);

    // Calculate total duration
    const totalDurationSeconds = instantAnnouncements.reduce((sum, a) => {
      const fileDuration = a.file && 'duration' in a.file ? (a.file as any).duration : 0;
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
      announcements: instantAnnouncements.map(a => {
        const file = a.file as any;
        return {
          id: a._id,
          path: file?.path ? `https://iot.centelon.com${file.path}` : null,
          name: file?.name || 'Unknown',
          status: a.status || 'pending',
          createdAt: a.createdAt
        };
      }),
      totalDuration: formatDuration(totalDurationSeconds),
      totalDurationSeconds,
      count: instantAnnouncements.length
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