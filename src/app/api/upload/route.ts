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
    const files = formData.getAll('files');

    // Create upload directory if it doesn't exist
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Create data directory if it doesn't exist
    if (!existsSync(path.dirname(MEDIA_FILES_JSON))) {
      await mkdir(path.dirname(MEDIA_FILES_JSON), { recursive: true });
    }

    // Load existing media files data
    let mediaFiles: MediaFile[] = [];
    try {
      const data = await readFile(MEDIA_FILES_JSON, 'utf-8');
      mediaFiles = JSON.parse(data);
    } catch (error) {
      // If file doesn't exist or is invalid, start with empty array
      mediaFiles = [];
    }

    const uploadedFiles: MediaFile[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await (file as File).arrayBuffer());
      const fileName = `${Date.now()}-${(file as File).name}`;
      const filePath = path.join(UPLOAD_DIR, fileName);

      // Save file to uploads directory
      await writeFile(filePath, buffer);

      // Add file info to mediaFiles array
      const mediaFile: MediaFile = {
        id: Math.random().toString(36).substr(2, 9),
        name: (file as File).name,
        type: (file as File).type,
        path: `/uploads/${fileName}`,
        uploadedAt: new Date().toISOString(),
      };

      mediaFiles.push(mediaFile);
      uploadedFiles.push(mediaFile);
    }

    // Save updated media files data
    await writeFileSync(MEDIA_FILES_JSON, JSON.stringify(mediaFiles, null, 2));

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload files' },
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