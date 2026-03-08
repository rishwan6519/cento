import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ file: string[] }> }
) {
  try {
    const { file: fileArray } = await params;
    
    // Construct the absolute path to the file in the root 'uploads' directory
    const filePath = path.join(process.cwd(), "uploads", ...fileArray);

    if (!fs.existsSync(filePath)) {
      return new NextResponse("File not found", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);

    // Basic MIME type determination
    const ext = path.extname(filePath).toLowerCase();
    let mimeType = "application/octet-stream";
    if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
    else if (ext === ".png") mimeType = "image/png";
    else if (ext === ".gif") mimeType = "image/gif";
    else if (ext === ".webp") mimeType = "image/webp";
    else if (ext === ".svg") mimeType = "image/svg+xml";
    else if (ext === ".mp4") mimeType = "video/mp4";
    else if (ext === ".mp3") mimeType = "audio/mpeg";
    else if (ext === ".wav") mimeType = "audio/wav";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving local upload file:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
