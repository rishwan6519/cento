import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { CameraConfig } from '@/models/Camera/CameraConfig';

import { ZoneEvent } from '@/models/ZoneEvent';

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
  console.log(`[API] Fetching footfall data for camera ID: ${id}`);
    await connectToDatabase();

    // Fetch camera configuration to ensure it exists
    const camera = await CameraConfig.findById(id);
    
    // Note: Even if camera config is missing in one collection, we might still have events. 
    // But adhering to strict checks:
    if (!camera) {
       // Optional: Decide if we return 404 or just empty stats. Returning 404 might break UI if camera was deleted but stats remain.
       // Let's proceed to fetch stats safely even if camera config is technically gone/archived, or strictly return 404.
       // complying with previous structure:
       return NextResponse.json({ error: 'Camera not found' }, { status: 404 });
    }

    // Get Today's local date range
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // FETCH ALL EVENTS FOR THIS CAMERA (needed for lifetime summary)
    const allDocuments = await ZoneEvent.find({ 
      'metadata.camera_id': id
    }).lean();

    // Filter just today's documents for the detailed zone breakdown
    const todayDocuments = allDocuments.filter((d: any) => {
        const time = new Date(d.timestamp).getTime();
        return time >= startOfToday.getTime() && time < endOfToday.getTime();
    });

    // 🧮 Aggregate IN/OUT counts per zone using flat counts!
    const zoneCounts: Record<string, { in_count: number; out_count: number }> = {};

    todayDocuments.forEach((doc: any) => {
      const zoneName = doc.metadata?.zone_name;
      const action = doc.action;

      if (!zoneName || !action) return;

      if (!zoneCounts[zoneName]) {
        zoneCounts[zoneName] = { in_count: 0, out_count: 0 };
      }

      if (action === "Entered") {
        zoneCounts[zoneName].in_count++;
      } else if (action === "Exited") {
        zoneCounts[zoneName].out_count++;
      }
    });

    // 🧾 Convert to response format
    const zones = Object.keys(zoneCounts).map((zoneName) => {
      const zoneIdMatch = zoneName.match(/\d+/);
      const zoneId = zoneIdMatch ? parseInt(zoneIdMatch[0]) : 0;

      return {
        id: zoneId,
        zone_name: zoneName,
        total_in_count: zoneCounts[zoneName].in_count,
        total_out_count: zoneCounts[zoneName].out_count,
      };
    });

    return NextResponse.json({
      camera_id: id,
      zones_footfall: zones,
      summary: {
       // Using all documents for the true lifetime total count
       total_in: allDocuments.filter((d: any) => d.action === 'Entered').length,
       total_out: allDocuments.filter((d: any) => d.action === 'Exited').length
      }
    });

  } catch (error) {
    console.error('Failed to fetch camera footfall data:', error);
    return NextResponse.json({ error: 'Failed to fetch camera footfall data' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
  const id= req.nextUrl.searchParams.get("id");
    const body = await req.json();
    await connectToDatabase();

    const updatedCamera = await CameraConfig.findOneAndUpdate(
      { id: id }, 
      { $set: body },
      { new: true }
    );

    if (!updatedCamera) {
      return NextResponse.json({ error: 'Camera not found' }, { status: 404 });
    }

    return NextResponse.json(updatedCamera);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update camera' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
  const id = req.nextUrl.searchParams.get("id");
    await connectToDatabase();

    const deletedCamera = await CameraConfig.findOneAndDelete({ id: id });

    if (!deletedCamera) {
      return NextResponse.json({ error: 'Camera not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Camera deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete camera' }, { status: 500 });
  }
}
