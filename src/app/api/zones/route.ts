import { NextResponse } from 'next/server';
import { ZoneCount } from '../../../models/Camera/SaveCount';
import { connectToDatabase } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cameraId = searchParams.get('cameraId');
    const startDate = searchParams.get('startDate');
    const startTime = searchParams.get('startTime');
    const endDate = searchParams.get('endDate');
    const endTime = searchParams.get('endTime');

    if (!cameraId || !startDate || !startTime || !endDate || !endTime) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const startDateTime = new Date(`${startDate}T${startTime}:00`);
    const endDateTime = new Date(`${endDate}T${endTime}:00`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return NextResponse.json({ error: 'Invalid date/time format' }, { status: 400 });
    }

    await connectToDatabase();

    const results = await ZoneCount.aggregate([
      {
        $match: {
          camera_id: cameraId
        }
      },
      { $unwind: '$counts' },
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
          _id: '$zone_id'
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const zones = results.map(item => item._id);
    return NextResponse.json({ zones });
  } catch (error) {
    console.error('Error fetching zones:', error);
    return NextResponse.json({ error: 'Failed to fetch zones' }, { status: 500 });
  }
}
