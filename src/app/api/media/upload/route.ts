
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { connectToDatabase } from '@/lib/db';
import MediaItemModel from '@/models/MediaItems';
import sanitize from 'sanitize-filename';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

/**
 * Role-based allowed file types:
 *  - admin           → image only
 *  - user (store)    → image, video, audio  (all types)
 *  - superUser       → image, video, audio  (all types)
 *  - null / unknown  → image only (safe default)
 */
const ALL_TYPES = ['image', 'video', 'audio'];
const IMAGE_ONLY = ['image'];

function getAllowedTypes(role: string | null): string[] {
  if (role === 'admin' || !role) return IMAGE_ONLY;
  // user (store-level) and superUser can upload everything
  return ALL_TYPES;
}


export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files: File[] = [];
    const fileNames: string[] = [];
    let idx = 0;

    // Collect all files and filenames from formData
    while (true) {
      const file = formData.get(`files[${idx}]`);
      const name = formData.get(`fileNames[${idx}]`);
      if (!file || !name) break;
      files.push(file as File);
      fileNames.push(name as string);
      idx++;
    }

    const userId = formData.get('userId') as string;
    // Role sent by the client; used to gate what file types are permitted.
    const userRole = (formData.get('userRole') as string) || null;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    if (!files.length || !fileNames.length || files.length !== fileNames.length) {
      return NextResponse.json(
        { success: false, message: 'Invalid or mismatched file data' },
        { status: 400 }
      );
    }

    const allowedTypes = getAllowedTypes(userRole);

    // Pre-validate all files before touching the filesystem
    for (let i = 0; i < files.length; i++) {
      const fileType = files[i].type?.split('/')?.[0] || 'unknown';
      if (!allowedTypes.includes(fileType)) {
        const roleLabel = userRole || 'user';
        return NextResponse.json(
          {
            success: false,
            message: `${roleLabel} accounts are not allowed to upload ${fileType} files. Only ${allowedTypes.join(', ')} files are permitted.`,
          },
          { status: 403 }
        );
      }
    }

    const baseUploadPath = join(process.cwd(), 'uploads', userId);
    const directories = ['video', 'audio', 'image'];

    // Ensure directories exist
    for (const dir of directories) {
      const dirPath = join(baseUploadPath, dir);
      if (!existsSync(dirPath)) {
        await mkdir(dirPath, { recursive: true });
      }
    }

    await connectToDatabase();

    const uploadedFiles = await Promise.all(
      files.map(async (file: File, index) => {
        const originalFileName = sanitize(fileNames[index]).replace(/\s+/g, '_');
        const fileType = file.type?.split('/')?.[0] || 'unknown';

        const uniqueFileName = `${uuidv4()}-${originalFileName}`;
        const filePath = join(baseUploadPath, fileType, uniqueFileName);

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        const mediaItem = new MediaItemModel({
          userId: new mongoose.Types.ObjectId(userId),
          name: originalFileName,
          type: fileType,
          url: `/uploads/${userId}/${fileType}/${uniqueFileName}`,
          createdAt: new Date(),
        });

        await mediaItem.save();
        return mediaItem;
      })
    );

    return NextResponse.json({
      success: true,
      message: 'Files uploaded and saved to database',
      files: uploadedFiles,
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to upload files',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
