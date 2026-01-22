// src/app/api/floor-map/route.ts

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { connectToDatabase } from "@/lib/db";
import FloorMap from "@/models/FloorMap";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Extract fields correctly
    const file = formData.get("file") as File | null;
    const floorName = formData.get("floorName") as string | null;
    const userId = "686cc66d9c011d7c23ae8b64";

    console.log("Received data:", { floorName, userId, file });

    if (!file || !floorName || !userId) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Save the file locally (optional – depends on your storage choice)
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), `/uploads/${userId}/floormaps`);
    const filePath = path.join(uploadDir, file.name);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    fs.writeFileSync(filePath, buffer);

    await connectToDatabase();

    const newMap = await FloorMap.create({
      name: floorName,
      imageUrl: `/uploads/${userId}/floormaps/${file.name}`, // Or cloud URL
      userId,
      uploadedAt: new Date(),
    });

    return NextResponse.json({ success: true, floorMapId: newMap._id });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Missing userId" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const floorMaps = await FloorMap.find({ userId });

    const result = floorMaps.map((map) => ({
      _id: map._id.toString(),
      name: map.name,
      imageUrl: map.imageUrl,
      userId: map.userId,
      uploadedAt: map.uploadedAt,
    }));

    return NextResponse.json({ success: true, floorMaps: result });
  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Missing floorMapId" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    
    // 1. Find the map to get the image URL
    const map = await FloorMap.findById(id);
    if (!map) {
      return NextResponse.json(
        { success: false, message: "Floor map not found" },
        { status: 404 }
      );
    }

    // 2. Delete the physical file
    try {
      if (map.imageUrl) {
        // Construct the full file path. 
        // Note: imageUrl is typically something like "/uploads/123/floormaps/image.png"
        const filePath = path.join(process.cwd(), map.imageUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`[API] Deleted file: ${filePath}`);
        }
      }
    } catch (fsError) {
      console.error("[API] File system deletion error:", fsError);
      // We continue even if file delete fails (maybe it was manually moved)
    }

    // 3. Delete associated Camera Markers
    // Importing CameraMarker model here to handle cascading delete
    const CameraMarker = (await import("@/models/CameraMarker")).default;
    const markerResult = await CameraMarker.deleteMany({ floorMapId: id });
    console.log(`[API] Deleted ${markerResult.deletedCount} associated markers.`);

    // 4. Delete the floor map record
    await FloorMap.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Floor map and assets deleted successfully" });
  } catch (error: any) {
    console.error("[API] DELETE error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}