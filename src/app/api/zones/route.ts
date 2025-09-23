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

    // Aggregate counts per zone for the given camera and time range
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
          _id: '$zone_id',
          total_in_count: { $sum: '$counts.in_count' },
          total_out_count: { $sum: '$counts.out_count' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Return zone IDs and counts for heatmap
    const zones = results.map(item => ({
      zone_id: item._id,
      total_in_count: item.total_in_count,
      total_out_count: item.total_out_count
    }));

    return NextResponse.json({ zones });
  } catch (error) {
    console.error('Error fetching zones:', error);
    return NextResponse.json({ error: 'Failed to fetch zones' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    const { camera_id, zones } = body;

    if (!camera_id || !Array.isArray(zones) || zones.length === 0) {
      return NextResponse.json({ success: false, error: 'Missing camera_id or zones' }, { status: 400 });
    }

    // Save each zone for the camera  
    for (const zone of zones) {
      await ZoneCount.updateOne(
        { camera_id, zone_id: zone.id },
        {
          $setOnInsert: { camera_id, zone_id: zone.id },
          $set: {
            // Optionally save coordinates
            coordinates: {
              x1: zone.x1,
              y1: zone.y1,
              x2: zone.x2,
              y2: zone.y2,
            }
          }
        },
        { upsert: true }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving zones:', error);
    return NextResponse.json({ success: false, error: 'Failed to save zones' }, { status: 500 });
  }
}
