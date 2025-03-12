import { NextRequest, NextResponse } from "next/server";
import fs from "fs-extra";
import path from "path";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    // Parse the multipart form data
    const formData = await req.formData();
    const image = formData.get("image") as File;
    
    if (!image) {
      console.error("No image in request");
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }
    
    // Create directories if they don't exist
    const uploadDir = path.join(process.cwd(), "public/uploads");
    await fs.ensureDir(uploadDir);
    
    // Generate a unique filename with original extension
    const fileExtension = image.name.split('.').pop() || 'jpg';
    const fileName = `${randomUUID()}.${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);
    
    // Convert file to buffer and save it
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Write file to disk
    await fs.writeFile(filePath, buffer);
    
    // Return the relative URL to the image
    const imageUrl = `/uploads/${fileName}`;
    console.log("Image saved successfully:", imageUrl);
    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 });
  }
}