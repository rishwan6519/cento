// app/api/available-cameras/route.ts
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
    const piId = searchParams.get("piId");

    console.log("[API] Received piId:", piId);

    if (!piId) {
      return NextResponse.json(
        { success: false, error: "Missing piId parameter" },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();

    // collection name is `pi_status` (per your message)
    const collection = db.collection("pi_status");
    console.log(collection,"this is colle")

    // Query for the pi document
    const query = { pi_id: piId };
    console.log("[API] MongoDB query:", query);

    const piDoc = await collection.findOne(query);

    if (!piDoc) {
      return NextResponse.json(
        { success: false, error: "pi_id not found", piId },
        { status: 404 }
      );
    }

    // Expecting cameras_active to be an array of camera objects or names
    // Example you've shown implies an array, so handle multiple shapes:
    const camerasActiveRaw = piDoc.cameras_active ?? [];
    // Normalize into an array of camera names / identifiers
    const camerasActive = Array.isArray(camerasActiveRaw)
      ? camerasActiveRaw.map((item: any) => {
          // If the item is a string (camera name/id), return as-is.
          if (typeof item === "string") return item;
          // If object, prefer common keys
          if (item.camera_name) return item.camera_name;
          if (item.name) return item.name;
          if (item.id) return item.id;
          // fallback: stringify or return the raw item
          return typeof item === "object" ? JSON.stringify(item) : String(item);
        })
      : [];

    const cameraCount =
      typeof piDoc.camera_count === "number"
        ? piDoc.camera_count
        : camerasActive.length;

    const responsePayload = {
      success: true,
      piId,
      pi_status_id: piDoc._id ?? null,
      status: piDoc.status ?? null,
      pipeline_running: piDoc.pipeline_running ?? null,
      cameras_active: camerasActive,
      camera_count: cameraCount,
      last_frame_time: piDoc.last_frame_time ?? null,
      health_score: piDoc.health_score ?? null,
    };

    console.log("[API] Response payload:", responsePayload);

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error("[API ERROR] Failed to fetch pi status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch pi status",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
