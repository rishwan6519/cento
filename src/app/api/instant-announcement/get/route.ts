import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Device from '@/models/Device';
// Correctly import the InstantAnnouncement model
import InstantAnnouncement from '@/models/InstantAnnouncement'; 
// Ensure the Announcement model is registered for populate to work

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

    // FIX: Query the InstantAnnouncement model, not the Announcement model
    const instantAnnouncements = await InstantAnnouncement.find({
      deviceId: device._id,
    }).populate("file")// 'file' ref is 'Announcement', so this will populate correctly

    console.log('Instant Announcements:', instantAnnouncements);

    // The rest of your logic remains the same, just use the new variable name
    const totalDurationSeconds = instantAnnouncements.reduce((sum, a) => {
      // The populated 'file' object is of type 'Announcement'
      // NOTE: Your Announcement model doesn't have a 'duration' field. 
      // You'll need to add it or calculate it differently.
      // Assuming you add 'duration' to the Announcement schema:
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
  announcements: instantAnnouncements.map(a => ({
    path: a.file?.path || null
  })),
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