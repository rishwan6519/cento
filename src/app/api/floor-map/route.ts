// src/app/api/floor-map/route.ts

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { connectToDatabase } from "@/lib/db";
import FloorMap from "@/models/FloorMap";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, userId, image, fileName } = body;
    console.log("Received data:", { name, userId, image, fileName });

    if (!name || !userId || !image || !fileName) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), "public/uploads/floormaps", fileName);

    // Ensure upload directory exists
    const uploadDir = path.dirname(filePath);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }


    
    await connectToDatabase();

    const newMap = await FloorMap.create({
      name,
      imageUrl: image, // Assuming image is the URL from Cloudinary
      userId,
      uploadedAt: new Date(),
    });

    return NextResponse.json({ success: true, data: newMap });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}



// GET /api/floor-map?userId=123
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ success: false, message: "Missing userId" }, { status: 400 });
    }

    await connectToDatabase();
    const floorMaps = await FloorMap.find({ userId });

    // Return only necessary fields (e.g., _id, name, imageUrl)
    const result = floorMaps.map((map: any) => ({
      id: map._id,
      name: map.name,
      imageUrl: map.imageUrl, // Make sure your FloorMap model has this field
    }));

    return NextResponse.json({ success: true, floorMaps: result });
  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}