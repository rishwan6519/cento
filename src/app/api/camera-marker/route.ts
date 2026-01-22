import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import CameraMarker from "@/models/CameraMarker";

// POST /api/camera-marker
export async function POST(req: NextRequest) {
 try {
    const body = await req.json();
    const { cameraId, x, y, width, height, floorMapId, zones } = body;
    

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
      zones: zones || [] 
    });

    // --- Update CameraConfig zones if they exist ---
    if (zones && zones.length > 0) {
      try {
        const { CameraConfig } = await import("@/models/Camera/CameraConfig");
        
        // Find the camera config by ID (CAM-XX format)
        const config = await CameraConfig.findOne({ id: cameraId });
        
        if (config) {
          // Prepare the updated zones list
          const existingZonesMap = new Map(
            config.zones.map((z: any) => [z.name, z])
          );

          // Update existing or add new from marked zones
          zones.forEach((markedZone: any) => {
            const existing = existingZonesMap.get(markedZone.name);
            existingZonesMap.set(markedZone.name, {
              ...(existing || {}),
              name: markedZone.name,
              x: markedZone.x,
              y: markedZone.y,
              width: markedZone.width,
              height: markedZone.height
            });
          });

          const updatedConfigZones = Array.from(existingZonesMap.values());

          await CameraConfig.updateOne(
            { id: cameraId },
            { $set: { zones: updatedConfigZones } }
          );
          console.log(`✅ Fully synchronized CameraConfig zones for ${cameraId}`);
        }
      } catch (err) {
        console.error("⚠️ Failed to sync zones to CameraConfig:", err);
        // Note: We don't fail the whole request if this sync fails
      }
    }

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
