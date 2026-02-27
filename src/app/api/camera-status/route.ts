import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { CameraConfig } from "@/models/Camera/CameraConfig";
import { AvailableCamera } from "@/models/Camera/AvailableCamera";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { pi_id, cameras, timestamp } = body;

    // Validate the incoming payload
    if (!cameras || !Array.isArray(cameras)) {
      return NextResponse.json(
        { success: false, error: "Invalid payload format: 'cameras' array is required." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Iterate through the received camera statuses and update the database definitions
    const updatePromises = cameras.map(async (cameraData) => {
      const { camera_id, status, timestamp: camTimestamp } = cameraData;

      if (!camera_id || !status) return;

      // Ensure the incoming status string matches the schema's expected format 
      // i.e., "Connected" -> "active", "Disconnected" -> "inactive"
      let formattedStatus = "inactive";
      if (status.toLowerCase().includes("connected") && !status.toLowerCase().includes("disconnected")) {
          formattedStatus = "active";
      }

      // 1. Update the base CameraConfig document (Legacy)
      const updateConfig = CameraConfig.updateOne(
        { id: camera_id }, // Assuming 'camera_id' matches the 'id' field ("CAM-01") in DB
        { $set: { status: formattedStatus } }
      );

      // 2. Upsert into the new AvailableCamera Model
      const upsertAvailable = AvailableCamera.updateOne(
        { camera_id },
        { 
          $set: { 
            pi_id: pi_id || "unknown", 
            camera_id, 
            status, 
            last_timestamp: camTimestamp || timestamp 
          } 
        },
        { upsert: true }
      );

      return Promise.all([updateConfig, upsertAvailable]);
    });

    // Execute all updates in parallel
    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized status for ${cameras.length} cameras.`,
      received_pi_id: pi_id,
      timestamp: timestamp,
    });

  } catch (error: any) {
    console.error("[API ERROR] Failed to update camera statuses:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
