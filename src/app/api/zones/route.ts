import { NextRequest, NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { ZoneCount } from "@/models/Camera/SaveCount";

// ✅ MongoDB connection details
const uri =
  "mongodb+srv://mqtt_writer:vO4kWOXGYljnoof5@retail-analytics.daxsdcl.mongodb.net/?retryWrites=true&w=majority&appName=Retail-Analytics";
const dbName = "Retail-Analytics";

// ✅ Reuse MongoDB client
let client: MongoClient | null = null;

async function connectToDatabase() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
    console.log("[MongoDB] Connected successfully");
  }
  return client.db(dbName);
}

// ✅ GET API route
export async function GET(req: NextRequest) {
  try {
    const db = await connectToDatabase();
    const collection = db.collection("zone_events");

    console.log("[MongoDB] Connected to collection: zone_events");

    // ✅ Fetch all documents
    const documents = await collection.find({}).toArray();

    // ✅ Extract only relevant metadata
    const metadataList = documents.map((doc) => doc.metadata);

    console.log("[MongoDB] Sample metadata:", metadataList.slice(0, 3)); // Just first 3 for debug

    // ✅ Aggregate entry and exit counts per zone
    const zoneCounts: Record<
      string,
      { total_in_count: number; total_out_count: number }
    > = {};

    metadataList.forEach((meta) => {
      if (!meta?.zone_name || !meta?.event_type) return;

      const zone = meta.zone_name;
      if (!zoneCounts[zone]) {
        zoneCounts[zone] = { total_in_count: 0, total_out_count: 0 };
      }

      if (meta.event_type === "entry") {
        zoneCounts[zone].total_in_count += 1;
      } else if (meta.event_type === "exit") {
        zoneCounts[zone].total_out_count += 1;
      }
    });

    // ✅ Convert to array format for response
    const zones = Object.keys(zoneCounts).map((zone_id) => ({
      zone_id,
      total_in_count: zoneCounts[zone_id].total_in_count,
      total_out_count: zoneCounts[zone_id].total_out_count,
    }));

    console.log(`[MongoDB] Computed zone summary:`, zones);

    // ✅ Final API response
    return NextResponse.json({ zones });
  } catch (error: any) {
    console.error("[API ERROR] Failed to fetch zone events:", error);
    return NextResponse.json(
      { error: "Failed to fetch zone events" },
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
