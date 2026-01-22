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

    // REAL DB FETCH: Get all events for this camera
    // You can add { timestamp: { $gte: startOfDay } } here if you only want today's counts.
    // For now, fetching all history as requested to "get the people count on database".
    const documents = await ZoneEvent.find({ 'metadata.camera_id': id }).lean();

    // 🧮 Aggregate IN/OUT counts per zone (Footfall Traffic)
    const zoneCounts: Record<string, { in_count: number; out_count: number }> = {};

    documents.forEach((doc: any) => {
      const zoneName = doc.metadata?.zone_name;
      const action = doc.action;
      // We still require personId to be valid to count it as a person event
      const personId = doc.person_id;

      if (!zoneName || !action || personId === undefined) return;

      if (!zoneCounts[zoneName]) {
        zoneCounts[zoneName] = { in_count: 0, out_count: 0 };
      }

      if (action === "Entered") {
        zoneCounts[zoneName].in_count += 1;
      } else if (action === "Exited") {
        zoneCounts[zoneName].out_count += 1;
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
