import { NextResponse } from 'next/server';
import { ZoneCount } from '../../../models/Camera/SaveCount';
import { connectToDatabase } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cameraId = searchParams.get('cameraId');
    const zoneId = searchParams.get('zoneId');
    const startDate = searchParams.get('startDate');
    const startTime = searchParams.get('startTime');
    const endDate = searchParams.get('endDate');
    const endTime = searchParams.get('endTime');

    if (!cameraId || !zoneId || !startDate || !startTime || !endDate || !endTime) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const startDateTime = new Date(`${startDate}T${startTime}:00`);
    const endDateTime = new Date(`${endDate}T${endTime}:00`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return NextResponse.json({ error: 'Invalid date/time format' }, { status: 400 });
    }

    await connectToDatabase();

    const counts = await ZoneCount.aggregate([
      {
        $match: {
          camera_id: cameraId,
          zone_id: parseInt(zoneId)
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
      { $unwind: '$counts.history' },
      {
        $match: {
          'counts.history.action': 'Entered (Qualified)'
        }
      },
      {
        $group: {
          _id: '$counts.history.id'
        }
      },
      {
        $group: {
          _id: null,
          unique_qualified_ids_count: { $sum: 1 }
        }
      }
    ]);

    return NextResponse.json({
      total_entered_count: counts[0]?.unique_qualified_ids_count || 0
    });

  } catch (error) {
    console.error('Error fetching counts:', error);
    return NextResponse.json({ error: 'Failed to fetch counts' }, { status: 500 });
  }
}
