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
    const userId = formData.get("userId") as string | null;

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