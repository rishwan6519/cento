import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { connectToDatabase } from '@/lib/db';
import MediaItemModel from '@/models/MediaItems';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const fileNames = formData.getAll('fileNames') as string[];

    const baseUploadPath = join(process.cwd(), 'public', 'uploads');
    const directories = ['video', 'audio', 'image'];

    for (const dir of directories) {
      const path = join(baseUploadPath, dir);
      if (!existsSync(path)) {
        await mkdir(path, { recursive: true });
      }
    }

    await connectToDatabase(); // Connect to MongoDB

    const uploadedFiles = await Promise.all(
      files.map(async (file: File, index) => {
        const fileName = fileNames[index];
        const fileType = file.type.split('/')[0];
        const uniqueFileName = `${Date.now()}-${fileName}`;
        const filePath = join(baseUploadPath, fileType, uniqueFileName);

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        const mediaItem = new MediaItemModel({
          name: fileName,
          type: file.type,
          url: `/uploads/${fileType}/${uniqueFileName}`,
          createdAt: new Date()
        });

        await mediaItem.save(); // Save to MongoDB

        return mediaItem;
      })
    );

    return NextResponse.json({
      success: true,
      message: 'Files uploaded and saved to database',
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
