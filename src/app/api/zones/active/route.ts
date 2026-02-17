import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { CameraConfig } from "@/models/Camera/CameraConfig";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cameraId = searchParams.get("cameraId");

    if (!cameraId) {
      return NextResponse.json(
        { success: false, error: "Missing cameraId parameter" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Fetch camera config to get defined zones
    const camera = await CameraConfig.findOne({ id: cameraId });
    
    if (!camera) {
        return NextResponse.json({ success: false, error: "Camera not found" }, { status: 404 });
    }

    const zones = (camera.zones || []).map((z: any, idx: number) => ({
        id: idx + 1,
        name: z.name || `Zone ${idx + 1}`
    }));

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
