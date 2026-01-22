import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ZoneEvent } from "@/models/ZoneEvent";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cameraId = searchParams.get("cameraId");

    console.log("[API] Received cameraId:", cameraId);

    if (!cameraId) {
      return NextResponse.json(
        { success: false, error: "Missing cameraId parameter" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // 🔍 Query by camera only using Mongoose
    const documents = await ZoneEvent.find({ "metadata.camera_id":`camera`+ cameraId }).lean();
    console.log(`[API] Found ${documents.length} documents for camera ${cameraId}`);

    // 🧮 Aggregate UNIQUE IN/OUT counts per zone
    const zoneUniqueIds: Record<string, { in_ids: Set<number>; out_ids: Set<number> }> = {};

    documents.forEach((doc: any) => {
      const zoneName = doc.metadata?.zone_name;
      const action = doc.action;
      const personId = doc.person_id;

      if (!zoneName || !action || personId === undefined) return;

      if (!zoneUniqueIds[zoneName]) {
        zoneUniqueIds[zoneName] = { in_ids: new Set(), out_ids: new Set() };
      }

      if (action === "Entered") {
        zoneUniqueIds[zoneName].in_ids.add(personId);
      } else if (action === "Exited") {
        zoneUniqueIds[zoneName].out_ids.add(personId);
      }
    });

    // 🧾 Convert to response format
    const zones = Object.keys(zoneUniqueIds).map((zoneName) => {
      const zoneIdMatch = zoneName.match(/\d+/);
      const zoneId = zoneIdMatch ? parseInt(zoneIdMatch[0]) : 0;

      return {
        id: zoneId,
        zone_name: zoneName,
        total_in_count: zoneUniqueIds[zoneName].in_ids.size,
        total_out_count: zoneUniqueIds[zoneName].out_ids.size,
      };
    });

    zones.sort((a, b) => a.id - b.id);

    console.log("[API] Final UNIQUE zone counts:", zones);

    return NextResponse.json({
      success: true,
      cameraId,
      zones,
    });
  } catch (error: any) {
    console.error("[API ERROR] Failed to fetch zone data:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch zone data",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[API POST] Received count event:", body);

    const { camera_id, zone_name, action, person_id, pi_id, timestamp } = body;

    // Validate required fields
    if (!camera_id || !zone_name || !action || person_id === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (camera_id, zone_name, action, person_id)" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Construct event document matching the schema expected by GET
    const newEvent = {
        metadata: {
            camera_id,
            zone_name,
            pi_id: pi_id || "unknown"
        },
        action, 
        person_id,
        timestamp: timestamp || new Date().toISOString(),
        created_at: new Date()
    };

    console.log("[API POST] Saving new event:", newEvent);
    const result = await ZoneEvent.create(newEvent);

    return NextResponse.json({
        success: true,
        message: "Event saved successfully",
        id: result._id,
        event: result
    });

  } catch (error: any) {
    console.error("[API POST ERROR]", error);
    return NextResponse.json(
      { success: false, error: "Failed to save event", details: error.message },
      { status: 500 }
    );
  }
}
