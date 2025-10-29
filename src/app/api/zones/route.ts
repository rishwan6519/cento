import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { ZoneCount } from "@/models/Camera/SaveCount";

// MongoDB connection details
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
    const startDate = searchParams.get("startDate");
    const startTime = searchParams.get("startTime");
    const endDate = searchParams.get("endDate");
    const endTime = searchParams.get("endTime");

    console.log("[API] Received params:", {
      cameraId,
      startDate,
      startTime,
      endDate,
      endTime,
    });

    if (!cameraId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required parameters: cameraId, startDate, endDate" },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const collection = db.collection("zone_events");

    // Build date range
    const startDateTime = new Date(`${startDate}T${startTime || "00:00"}:00.000Z`);
    const endDateTime = new Date(`${endDate}T${endTime || "23:59"}:59.999Z`);

    console.log("[API] Date range:", {
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
    });

    // ✅ Query for the given camera and time range
    const query = {
      "metadata.camera_id": cameraId,
      timestamp: {
        $gte: startDateTime,
        $lte: endDateTime,
      },
    };

    console.log("[API] MongoDB query:", JSON.stringify(query, null, 2));

    const documents = await collection.find(query).toArray();
    console.log(`[API] Found ${documents.length} documents`);

    if (documents.length > 0) {
      console.log("[API] Sample document:", JSON.stringify(documents[0], null, 2));
    }

    // ✅ Count unique person_ids for Entered and Exited actions
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
        total_in_count: zoneCounts[zoneName].in_ids.size, // unique entered persons
        total_out_count: zoneCounts[zoneName].out_ids.size, // unique exited persons
      };
    });

    zones.sort((a, b) => a.zone_id - b.zone_id);

    console.log(`[API] Final zone summary (${zones.length} zones):`, zones);

    return NextResponse.json({
      zones,
      summary: {
        total_documents: documents.length,
        date_range: {
          start: startDateTime.toISOString(),
          end: endDateTime.toISOString(),
        },
        camera_id: cameraId,
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

    // Save each zone for the camera  
    for (const zone of zones) {
      await ZoneCount.updateOne(
        { camera_id, zone_id: zone.id },
        {
          $setOnInsert: { camera_id, zone_id: zone.id },
          $set: {
            // Optionally save coordinates
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
  } catch (error) {
    console.error('Error saving zones:', error);
    return NextResponse.json({ success: false, error: 'Failed to save zones' }, { status: 500 });
  }
}
