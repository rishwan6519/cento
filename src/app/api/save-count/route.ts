import { NextResponse } from 'next/server';
import { ZoneCount } from '@/models/Camera/SaveCount';
import { connectToDatabase } from '@/lib/db';

interface HistoryEntry {
  action: 'Entered' | 'Exited' | 'Entered (Qualified)';
  id: number;
  time: string;
}

interface ZoneData {
  in_count?: number;
  in?: number;
  out_count?: number;
  out?: number;
  history?: HistoryEntry[];
}

interface RequestBody {
  camera_id: string;
  timestamp: string;
  counts: {
    [zoneId: string]: ZoneData;
  };
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();

    const body = await request.json() as RequestBody;
    const { camera_id, timestamp, counts } = body;

    const dateStr = new Date(timestamp).toISOString().split('T')[0];

    for (const [zoneId, zoneData] of Object.entries(counts)) {
      const filteredHistory = (zoneData.history || []).filter(
        entry => entry.action === 'Entered (Qualified)'
      );

      // Only proceed if there's at least one qualified entry
      if (filteredHistory.length > 0) {
        const countEntry = {
          timestamp: new Date(timestamp),
          in_count: zoneData.in_count || zoneData.in || 0,
          out_count: zoneData.out_count || zoneData.out || 0,
          history: filteredHistory
        };

        await ZoneCount.findOneAndUpdate(
          {
            camera_id,
            zone_id: parseInt(zoneId),
            date: dateStr
          },
          {
            $push: {
              counts: {
                $each: [countEntry],
                $sort: { timestamp: -1 }
              }
            }
          },
          {
            upsert: true,
            new: true
          }
        );
      }
    }

    return NextResponse.json({
      message: 'Qualified count data saved successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Error saving count data:', error);

    const errorMessage = error instanceof Error
      ? error.message
      : 'An unknown error occurred';

    return NextResponse.json({
      message: 'Error saving count data',
      error: errorMessage
    }, { status: 500 });
  }
}
