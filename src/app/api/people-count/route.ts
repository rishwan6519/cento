import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri =
  "mongodb+srv://retail_admin:LCQ3b6kYRiN6wUEl@retailanalytics.kznhbji.mongodb.net/?retryWrites=true&w=majority&appName=RetailAnalytics";
const dbName = "retail_analytics_test";

let client: MongoClient | null = null;

async function connectToDatabase() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    console.log("[MongoDB] Connected successfully");
  }
  return client.db(dbName);
}

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

    const db = await connectToDatabase();
    const collection = db.collection("zone_events");

    // 🔍 Query by camera only
    const query = { "metadata.camera_id": cameraId };
    console.log("[API] MongoDB query:", query);

    const documents = await collection.find(query).toArray();
    console.log(`[API] Found ${documents.length} documents for camera ${cameraId}`);

    // 🧮 Aggregate IN/OUT counts per zone
    const zoneCounts: Record<string, { in_ids: Set<number>; out_ids: Set<number> }> = {};

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

    // 🧾 Convert to response format
    const zones = Object.keys(zoneCounts).map((zoneName) => {
      const zoneIdMatch = zoneName.match(/\d+/);
      const zoneId = zoneIdMatch ? parseInt(zoneIdMatch[0]) : 0;

      return {
        id: zoneId,
        zone_name: zoneName,
        total_in_count: zoneCounts[zoneName].in_ids.size,
        total_out_count: zoneCounts[zoneName].out_ids.size,
      };
    });

    zones.sort((a, b) => a.id - b.id);

    console.log("[API] Final zone counts:", zones);

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
