import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db'; // Make sure you connect to MongoDB
import { ZoneCount } from '@/models/Camera/SaveCount'; // Path to your model

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get('startDate'); // e.g., '2025-06-17'
    const startTime = searchParams.get('startTime'); // e.g., '09:00'
    const endDate = searchParams.get('endDate');     // e.g., '2025-06-18'
    const endTime = searchParams.get('endTime');     // e.g., '17:30'

    // ✅ Validate inputs
    if (!startDate || !startTime || !endDate || !endTime) {
      return NextResponse.json(
        { error: 'Missing one or more date/time parameters' },
        { status: 400 }
      );
    }

    // ✅ Combine date and time into full Date objects
    const startDateTime = new Date(`${startDate}T${startTime}:00`);
    const endDateTime = new Date(`${endDate}T${endTime}:00`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return NextResponse.json({ error: 'Invalid date/time format' }, { status: 400 });
    }

    // ✅ Ensure DB connection
    await connectToDatabase();

    // ✅ Aggregate documents with counts.timestamp in range
    const cameras = await ZoneCount.aggregate([
      {
        $match: {
          'counts.timestamp': {
            $gte: startDateTime,
            $lte: endDateTime
          }
        }
      },
      {
        $group: {
          _id: '$camera_id'
        }
      }
    ]);

    // ✅ Extract camera IDs
    const cameraIds = cameras.map(doc => doc._id);

    return NextResponse.json({ cameras: cameraIds });
  } catch (error) {
    console.error('Error fetching cameras:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cameras' },
      { status: 500 }
    );
  }
}
