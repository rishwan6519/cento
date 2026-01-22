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
    // The user specified that camera_id in metadata has the prefix "camera"
    const documents = await ZoneEvent.find({ "metadata.camera_id": "camera" + cameraId }).lean();
    console.log(`[API] Found ${documents.length} documents for camera ${cameraId}`);

    // 🧮 Aggregate unique zone names
    const zoneNames = new Set<string>();

    documents.forEach((doc: any) => {
      const zoneName = doc.metadata?.zone_name;
      if (zoneName) {
        zoneNames.add(zoneName);
      }
    });

    const zones = Array.from(zoneNames).map(name => {
      // Find numeric part if any for sorting
      const match = name.match(/\d+/);
      const id = match ? parseInt(match[0]) : 0;
      return { id, name };
    });

    zones.sort((a, b) => a.id - b.id);

    console.log("[API] Detected active zones:", zones);

    return NextResponse.json({
      success: true,
      cameraId,
      zones,
    });
  } catch (error: any) {
    console.error("[API ERROR] Failed to fetch active zones:", error);
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
