import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readdir, stat, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import sanitize from 'sanitize-filename';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      const name = formData.get('name') as string;
      const userId = formData.get('userId') as string;
      const type = formData.get('type') as string;

      if (!userId || !file || !name || !type) {
        return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
      }

      const baseUploadPath = join(process.cwd(), 'public', 'uploads', 'instantaneous', userId, type);
      if (!existsSync(baseUploadPath)) {
        await mkdir(baseUploadPath, { recursive: true });
      }

      // ✅ Check and enforce file limit (10 max)
      const files = await readdir(baseUploadPath);
      if (files.length >= 10) {
        // Sort files by creation/modification time
        const fileStats = await Promise.all(
          files.map(async (f) => {
            const filePath = join(baseUploadPath, f);
            const stats = await stat(filePath);
            return { file: f, time: stats.mtime.getTime() };
          })
        );

        // Oldest file first
        fileStats.sort((a, b) => a.time - b.time);

        // Delete oldest
        const oldestFile = fileStats[0].file;
        await unlink(join(baseUploadPath, oldestFile));
        console.log(`Deleted oldest file: ${oldestFile}`);
      }

      // ✅ Save new file
      const originalFileName = sanitize(file.name || name);
      const uniqueFileName = `${uuidv4()}-${originalFileName}`;
      const filePath = join(baseUploadPath, uniqueFileName);

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await writeFile(filePath, buffer);

      const relPath = `/uploads/instantaneous/${userId}/${type}/${uniqueFileName}`;
      return NextResponse.json({ success: true, fileUrl: relPath });
    } else {
      return NextResponse.json({ success: false, message: 'Unsupported Content-Type' }, { status: 415 });
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to upload file',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
