import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { connectToDatabase } from "@/lib/db";
import Device from "@/models/Device";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { serialNumber, image } = body;

    if (!serialNumber || !image) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: serialNumber or image" },
        { status: 400 }
      );
    }

    // Decode base64 image (assumes format "data:image/png;base64,...")
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer: Buffer;
    let ext = "png";

    if (matches && matches.length === 3) {
      const type = matches[1];
      if (type.includes("jpeg") || type.includes("jpg")) ext = "jpg";
      buffer = Buffer.from(matches[2], "base64");
    } else {
      // If it doesn't have the data prefix, assume it's just raw base64
      buffer = Buffer.from(image, "base64");
    }

    // Prepare upload directory
    const uploadDir = join(process.cwd(), "public", "uploads", "screenshots");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Save image with a unique filename
    const filename = `${serialNumber}-${Date.now()}.${ext}`;
    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/screenshots/${filename}`;

    // Find the device and update latestScreenshotUrl
    const device = await Device.findOne({ serialNumber });
    if (!device) {
      return NextResponse.json(
        { success: false, message: "Device not found" },
        { status: 404 }
      );
    }

    device.latestScreenshotUrl = fileUrl;
    await device.save();

    return NextResponse.json({
      success: true,
      message: "Screenshot updated successfully",
      url: fileUrl
    });
  } catch (error: any) {
    console.error("[POST /api/devices/screenshot] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
