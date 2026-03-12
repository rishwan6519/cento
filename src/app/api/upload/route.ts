import { writeFile, mkdir, readFile, access } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { existsSync, constants } from 'fs';

// Note: Uploads are stored in the root /uploads directory (outside public)
// and served via the custom route at src/app/uploads/[...file]/route.ts
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
      console.error('Upload Error: No file in form data');
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    console.log(`Uploading file: ${file.name}, size: ${file.size}, type: ${file.type}`);

    // Robust directory resolution
    const rootDir = process.cwd();
    const uploadsDir = path.join(rootDir, 'uploads');
    
    console.log(`[Upload] Processing: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
    console.log(`[Upload] Root: ${rootDir}`);
    console.log(`[Upload] Destination: ${uploadsDir}`);

    // Create uploads directory if it doesn't exist
    if (!existsSync(uploadsDir)) {
      console.log('[Upload] Directory missing. Creating...');
      await mkdir(uploadsDir, { recursive: true });
    }

    // Check if directory is writable (common issue on EC2/Linux)
    try {
      await access(uploadsDir, constants.W_OK);
      console.log('[Upload] Directory is writable');
    } catch (err) {
      console.error('[Upload] Permission Denied: Directory is not writable');
      return NextResponse.json(
        { error: "Storage permission denied", details: "The server does not have write access to the uploads folder." },
        { status: 500 }
      );
    }

    // Sanitize filename and ensure extension is preserved
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFilename = `${timestamp}-${sanitizedName}`;
    const filePath = path.join(uploadsDir, uniqueFilename);

    // Convert file to buffer and save it
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Return the public URL for the file
    // Note: The /uploads path is expected to be served by the web server (e.g., Nginx) or a custom route
    const fileUrl = `/uploads/${uniqueFilename}`;
    
    console.log(`[Upload] Success! File saved to: ${filePath}`);
    console.log(`[Upload] Accessible at: ${fileUrl}`);

    return NextResponse.json({ 
      success: true,
      url: fileUrl 
    });

  } catch (error: any) {
    console.error('Upload error details:', error);
    return NextResponse.json(
      { error: "Failed to upload file", details: error.message },
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