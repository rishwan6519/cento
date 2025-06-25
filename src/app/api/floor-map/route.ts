// src/app/api/floor-map/route.ts

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { connectToDatabase } from "@/lib/db";
import FloorMap from "@/models/FloorMap";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, userId, imageBase64, fileName } = body;
    console.log("Received data:", { name, userId, imageBase64, fileName });

    if (!name || !userId || !imageBase64 || !fileName) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    const filePath = path.join(process.cwd(), "public/uploads/floormaps", fileName);

    // Ensure upload directory exists
    const uploadDir = path.dirname(filePath);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    fs.writeFileSync(filePath, buffer);

    const imageUrl = `/uploads/floormaps/${fileName}`;

    await connectToDatabase();

    const newMap = await FloorMap.create({
      name,
      imageUrl,
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