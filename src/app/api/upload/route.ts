import { writeFile, mkdir } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { existsSync } from 'fs';
import { readFile, writeFile as writeFileSync } from 'fs/promises';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MEDIA_FILES_JSON = path.join(process.cwd(), 'data', 'mediaFiles.json');

interface MediaFile {
  id: string;
  name: string;
  type: string;
  path: string;
  uploadedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }

    // Create unique filename
    const uniqueFilename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}`;
    const filePath = path.join(uploadsDir, uniqueFilename);

    // Convert file to buffer and save it
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return the public URL for the file
    const fileUrl = `/uploads/${uniqueFilename}`;

    return NextResponse.json({ 
      success: true,
      url: fileUrl 
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Read media files data
    const data = await readFile(MEDIA_FILES_JSON, 'utf-8');
    const mediaFiles = JSON.parse(data);

    return NextResponse.json({
      success: true,
      files: mediaFiles,
    });

  } catch (error) {
    console.error('Error reading media files:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch media files' },
      { status: 500 }
    );
  }
}