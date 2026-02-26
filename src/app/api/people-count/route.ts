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

    // 🔍 Fetch all documents for this camera
    const documents = await ZoneEvent.find({ "metadata.camera_id": cameraId }).lean();
    console.log(`[API] Found ${documents.length} documents for camera ${cameraId}`);

    // Get Today's local date range
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // 🧮 Aggregate counts for events
    const allCounts: Record<string, { in: number; out: number }> = {};
    const todayCounts: Record<string, { in: number; out: number }> = {};

    documents.forEach((doc: any) => {
      const zoneName = doc.metadata?.zone_name;
      const action = doc.action;
      
      const eventTime = new Date(doc.timestamp);
      const isToday = eventTime >= startOfToday && eventTime < endOfToday;

      if (!zoneName || !action) return;

      if (!allCounts[zoneName]) allCounts[zoneName] = { in: 0, out: 0 };
      if (!todayCounts[zoneName]) todayCounts[zoneName] = { in: 0, out: 0 };

      // All Time
      if (action === "Entered") allCounts[zoneName].in++;
      else if (action === "Exited") allCounts[zoneName].out++;

      // Today
      if (isToday) {
        if (action === "Entered") todayCounts[zoneName].in++;
        else if (action === "Exited") todayCounts[zoneName].out++;
      }
    });

    const formatZones = (source: Record<string, { in: number; out: number }>) => {
      return Object.keys(source).map(name => ({
        zone_name: name,
        in: source[name].in,
        out: source[name].out
      })).sort((a, b) => a.zone_name.localeCompare(b.zone_name));
    };

    return NextResponse.json({
      success: true,
      cameraId,
      today: formatZones(todayCounts),
      allTime: formatZones(allCounts)
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
