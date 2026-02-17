import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ZoneEvent } from "@/models/ZoneEvent";
import { ZoneCount } from "@/models/Camera/SaveCount";
import { CameraConfig } from "@/models/Camera/CameraConfig";
import CameraMarker from "@/models/CameraMarker";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cameraIdParam = searchParams.get("cameraId"); // This might be the Name
    const startDate = searchParams.get("startDate");
    const startTime = searchParams.get("startTime");
    const endDate = searchParams.get("endDate");
    const endTime = searchParams.get("endTime");

    console.log("[API] Received params:", {
      cameraIdParam,
      startDate,
      startTime,
      endDate,
      endTime,
    });

    if (!cameraIdParam || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required parameters: cameraId, startDate, endDate" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // ✅ Resolve actual Camera ID from CameraConfig (if the param is a Name)
    // First, try to find by Name
    let actualCameraId = cameraIdParam;
    const configByName = await CameraConfig.findOne({ name: cameraIdParam }).lean();
    
    if (configByName) {
      actualCameraId = configByName.id;
      console.log(`[API] Resolved name "${cameraIdParam}" to ID "${actualCameraId}"`);
    } else {
      // If not found by name, check if it's already a valid ID
      const configById = await CameraConfig.findOne({ id: cameraIdParam }).lean();
      if (configById) {
        actualCameraId = configById.id;
        console.log(`[API] Using provided ID "${actualCameraId}"`);
      } else {
        console.warn(`[API] No CameraConfig found for "${cameraIdParam}". Proceeding with original value.`);
      }
    }

    // Build date range
    const startDateTime = new Date(`${startDate}T${startTime || "00:00"}:00.000Z`);
    const endDateTime = new Date(`${endDate}T${endTime || "23:59"}:59.999Z`);

    console.log("[API] Date range:", {
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
    });

    // ✅ Query for the resolved camera ID and time range
    const query = {
      "metadata.camera_id": actualCameraId,
      timestamp: {
        $gte: startDateTime,
        $lte: endDateTime,
      },
    };

    console.log("[API] Querying ZoneEvents for camera_id:", actualCameraId);

    const documents = await ZoneEvent.find(query).lean();
    console.log(`[API] Found ${documents.length} documents`);

    // ✅ Aggregate counts (Unique Person IDs)
    const zoneCounts: Record<
      string,
      { in_ids: Set<number>; out_ids: Set<number> }
    > = {};

    documents.forEach((doc: any) => {
      const zoneName = doc.metadata?.zone_name;
      const action = doc.action;
      const personId = doc.person_id;

      if (!zoneName || !action || personId === undefined) return;

      if (!zoneCounts[zoneName]) {
        zoneCounts[zoneName] = { in_ids: new Set(), out_ids: new Set() };
      }

      if (action === "Entered") {
        zoneCounts[zoneName].in_ids.add(personId);
      } else if (action === "Exited") {
        zoneCounts[zoneName].out_ids.add(personId);
      }
    });

    // ✅ Convert results to array
    const zones = Object.keys(zoneCounts).map((zoneName) => {
      const zoneIdMatch = zoneName.match(/\d+/);
      const zoneId = zoneIdMatch ? parseInt(zoneIdMatch[0]) : 0;

      return {
        zone_id: zoneId,
        zone_name: zoneName,
        total_in_count: zoneCounts[zoneName].in_ids.size,
        total_out_count: zoneCounts[zoneName].out_ids.size,
      };
    });

    zones.sort((a, b) => a.zone_id - b.zone_id);

    return NextResponse.json({
      zones,
      events: documents.map((d: any) => ({
        person_id: d.person_id,
        timestamp: d.timestamp,
        action: d.action,
        zone_id: d.metadata?.zone_id,
        zone_name: d.metadata?.zone_name
      })),
      summary: {
        total_documents: documents.length,
        date_range: {
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
        },
        camera_id: actualCameraId,
        requested_param: cameraIdParam
      },
    });
  } catch (error: any) {
    console.error("[API ERROR] Failed to fetch zone events:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch zone events",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
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

    for (const zone of zones) {
      await ZoneCount.updateOne(
        { camera_id, zone_id: zone.id },
        {
          $setOnInsert: { camera_id, zone_id: zone.id },
          $set: {
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
  } catch (error: any) {
    console.error('Error saving zones:', error);
    return NextResponse.json({ success: false, error: 'Failed to save zones', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cameraId = searchParams.get("cameraId");
    const zoneName = searchParams.get("zoneName");

    if (!cameraId || !zoneName) {
      return NextResponse.json(
        { error: "Missing required parameters: cameraId, zoneName" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Resolve actual Camera ID if name was provided
    let actualCameraId = cameraId;
    const configByName = await CameraConfig.findOne({ name: cameraId }).lean();
    if (configByName) actualCameraId = configByName.id;

    // 1. Delete events from ZoneEvent
    const deleteEvents = await ZoneEvent.deleteMany({
      $or: [
        { "metadata.camera_id": actualCameraId, "metadata.zone_name": zoneName },
        { "metadata.camera_id": `camera${actualCameraId}`, "metadata.zone_name": zoneName }
      ]
    });

    // 2. Delete counts from ZoneCount
    const zoneIdMatch = zoneName.match(/\d+/);
    if (zoneIdMatch) {
      const zoneId = parseInt(zoneIdMatch[0]);
      await ZoneCount.deleteMany({
        camera_id: actualCameraId,
        zone_id: zoneId
      });
      await ZoneCount.deleteMany({
        camera_id: `camera${actualCameraId}`,
        zone_id: zoneId
      });
    }

    // 3. Remove from CameraMarker (Floor Plan)
    await CameraMarker.updateMany(
      { cameraId: actualCameraId },
      { $pull: { zones: { name: zoneName } } }
    );

    // 4. Remove from CameraConfig (Device Config)
    await CameraConfig.updateOne(
      { id: actualCameraId },
      { $pull: { zones: { name: zoneName } } }
    );

    return NextResponse.json({ 
      success: true, 
      message: `Deleted data and floor markings for zone ${zoneName}`,
      eventsDeleted: deleteEvents.deletedCount
    });
  } catch (error: any) {
    console.error("[API ERROR] Delete failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
