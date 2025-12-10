// app/api/media/upload/route.ts

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: "1000mb",
  },
};

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import MediaItemModel from "@/models/MediaItems";
import sanitize from "sanitize-filename";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// EC2 + IAM role only
const s3 = new S3Client({
  region: process.env.AWS_REGION, // must be ap-south-1
});

const BUCKET_NAME = "iot-robotics";

export async function POST(req: NextRequest) {
  console.log("✅ /api/media/upload HIT (with S3)");
  console.log("AWS_REGION:", process.env.AWS_REGION);
  console.log("Bucket:", BUCKET_NAME);

  try {
    const formData = await req.formData();
    const files: File[] = [];
    const fileNames: string[] = [];
    let idx = 0;

    while (true) {
      const file = formData.get(`files[${idx}]`);
      const name = formData.get(`fileNames[${idx}]`);
      if (!file || !name) break;
      files.push(file as File);
      fileNames.push(name as string);
      idx++;
    }

    const userId = formData.get("userId") as string;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    if (!files.length || files.length !== fileNames.length) {
      return NextResponse.json(
        { success: false, message: "Invalid or mismatched file data" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const uploadedFiles = await Promise.all(
      files.map(async (file: File, index) => {
        const originalFileName = sanitize(fileNames[index]).replace(/\s+/g, "_");
        const fileType = file.type?.split("/")?.[0] || "unknown";

        if (!["audio", "video", "image"].includes(fileType)) {
          throw new Error(`Unsupported file type: ${file.type}`);
        }

        const uniqueFileName = `${uuidv4()}-${originalFileName}`;
        const key = `${userId}/${fileType}/${uniqueFileName}`;

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // S3 upload
        try {
          await s3.send(
            new PutObjectCommand({
              Bucket: BUCKET_NAME,
              Key: key,
              Body: buffer,
              ContentType: file.type,
            })
          );
        } catch (err) {
          console.error("❌ S3 upload error:", err);
          // Optionally map AccessDenied to a 403:
          return NextResponse.json(
            {
              success: false,
              message: "S3 upload failed",
              error:
                err instanceof Error ? err.message : "Unknown S3 error",
            },
            { status: 500 }
          );
        }

        const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

        const mediaItem = new MediaItemModel({
          userId: new mongoose.Types.ObjectId(userId),
          name: originalFileName,
          type: fileType,
          url: fileUrl,
          createdAt: new Date(),
        });

        await mediaItem.save();

        return mediaItem;
      })
    );

    return NextResponse.json({
      success: true,
      message: "Files uploaded to S3 and saved to DB",
      files: uploadedFiles,
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Upload failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
