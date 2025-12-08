import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import CameraMarker from "@/models/CameraMarker";

// POST /api/camera-marker
export async function POST(req: NextRequest) {
 try {
    const body = await req.json();
    const { cameraId, x, y, width, height, floorMapId } = body;
    

    // --- Basic Validation ---
    if (!cameraId || x == null || y == null || width == null || height == null || !floorMapId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // --- Create marker ---
    const marker = await CameraMarker.create({
      cameraId,
      x,
      y,
      width,
      height,
      floorMapId,
    });

    return NextResponse.json({ success: true, data: marker }, { status: 201 });
  } catch (error: any) {
    console.error("❌ Error saving camera marker:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// GET /api/camera-marker?floorMapId=xxx
export async function GET(req: NextRequest) {
  try {
    const floorMapId = req.nextUrl.searchParams.get("floorMapId");
    if (!floorMapId) {
      return NextResponse.json(
        { success: false, error: "Missing floorMapId" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const markers = await CameraMarker.find({ floorMapId });

    return NextResponse.json({ success: true, data: markers });
  } catch (error: any) {
    console.error("Error fetching camera markers:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
