import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

interface MediaItem {
  id: string;
  name: string;
  type: string;
  url: string;
  createdAt: string;
}

interface MediaList {
  media: MediaItem[];
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const fileNames = formData.getAll('fileNames') as string[];

    // Create upload directories if they don't exist
    const baseUploadPath = join(process.cwd(), 'public', 'uploads');
    const directories = ['video', 'audio', 'image'];
    
    for (const dir of directories) {
      const path = join(baseUploadPath, dir);
      if (!existsSync(path)) {
        await mkdir(path, { recursive: true });
      }
    }

    // Process the files with proper typing
    const uploadedFiles: MediaItem[] = await Promise.all(
      files.map(async (file: File, index) => {
        const fileName = fileNames[index];
        const fileType = file.type.split('/')[0]; // 'image', 'video', or 'audio'
        const uniqueFileName = `${Date.now()}-${fileName}`;
        const filePath = join(baseUploadPath, fileType, uniqueFileName);

        // Convert file to buffer and save it
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        // Create properly typed media item
        const mediaItem: MediaItem = {
          id: crypto.randomUUID(),
          name: fileName,
          type: file.type,
          url: `/uploads/${fileType}/${uniqueFileName}`,
          createdAt: new Date().toISOString()
        };

        return mediaItem;
      })
    );

    // Update medialist.json with proper typing
    const mediaListPath = join(process.cwd(), 'public', 'medialist.json');
    let mediaList: MediaList = { media: [] };

    try {
      const existingData = await readFile(mediaListPath, 'utf-8');
      const parsedData = JSON.parse(existingData) as MediaList;
      mediaList = parsedData;
    } catch (error) {
      // File doesn't exist or is invalid, use default empty list
      console.error('Error reading medialist.json:', error);
    }

    // Add new files to the list with type safety
    mediaList.media = [...mediaList.media, ...uploadedFiles];

    // Save updated media list
    await writeFile(mediaListPath, JSON.stringify(mediaList, null, 2));

    return NextResponse.json({ 
      success: true, 
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Error uploading files:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to upload files',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}