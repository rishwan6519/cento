import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { PiStatus } from "@/models/PiStatus";

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

    await connectToDatabase();

    // Query for the pi document using the Mongoose Model
    const piDoc = await PiStatus.findOne({ pi_id: piId }).lean();

    if (!piDoc) {
      return NextResponse.json(
        { success: false, error: "pi_id not found", piId },
        { status: 404 }
      );
    }

    // Expecting cameras_active to be an array of camera objects or names
    // Handle multiple shapes
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
