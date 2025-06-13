import { NextResponse } from 'next/server';
import { ZoneCount } from '@/models/Camera/SaveCount';
import { connectToDatabase } from '@/lib/db';

// Add interfaces for type safety
interface HistoryEntry {
  action: 'Entered' | 'Exited';
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

    // Process each zone's counts
    for (const [zoneId, zoneData] of Object.entries(counts)) {
      const countEntry = {
        timestamp: new Date(timestamp),
        in_count: zoneData.in_count || zoneData.in || 0,
        out_count: zoneData.out_count || zoneData.out || 0,
        history: zoneData.history || []
      };

      // Find and update zone document, or create if doesn't exist
      await ZoneCount.findOneAndUpdate(
        { 
          camera_id, 
          zone_id: parseInt(zoneId)
        },
        { 
          $push: { 
            counts: {
              $each: [countEntry],
              $sort: { timestamp: -1 }  // Keep counts sorted by timestamp
            }
          }
        },
        { 
          upsert: true,
          new: true
        }
      );
    }

    return NextResponse.json({
      message: 'Count data saved successfully'
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
