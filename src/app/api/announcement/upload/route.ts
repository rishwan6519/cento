// import { NextRequest, NextResponse } from 'next/server';
// import { writeFile, mkdir } from 'fs/promises';
// import { join } from 'path';
// import { existsSync } from 'fs';
// import { connectToDatabase } from '@/lib/db';
// import Announcement from '@/models/AnnouncementFiles';
// import sanitize from 'sanitize-filename';
// import { v4 as uuidv4 } from 'uuid';
// import mongoose from 'mongoose';

// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };

// export async function POST(req: NextRequest) {
//   try {
//     const formData = await req.formData();
//     const file = formData.get('file') as File;
//     const name = formData.get('name') as string;
//     const userId = formData.get('userId') as string;
//     const type = formData.get('type') as string; // 'recorded' or 'uploaded'

//     if (!userId || !file || !name || !type) {
//       return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
//     }

//     // Determine folder
//     const fileType = type === 'recorded' ? 'recorded' : 'audio';
//     const baseUploadPath = join(process.cwd(), 'uploads', 'announcement', userId, fileType);

//     if (!existsSync(baseUploadPath)) {
//       await mkdir(baseUploadPath, { recursive: true });
//     }

//     await connectToDatabase();

//     // Save file
//     const originalFileName = sanitize(name);
//     const uniqueFileName = `${uuidv4()}-${originalFileName}`;
//     const filePath = join(baseUploadPath, uniqueFileName);

//     const bytes = await file.arrayBuffer();
//     const buffer = Buffer.from(bytes);
//     await writeFile(filePath, buffer);

//     // Save to DB
//     const relPath = `/uploads/announcement/${userId}/${fileType}/${uniqueFileName}`;
//     const announcement = await Announcement.create({
//       userId: new mongoose.Types.ObjectId(userId),
//       name: originalFileName,
//       path: relPath,
//       type,
//       voice: type === 'recorded' ? 'user' : null,
//       createdAt: new Date()
//     });

//     return NextResponse.json({
//       success: true,
//       message: 'File uploaded and saved to database',
//       file: announcement
//     });
//   } catch (error) {
//     console.error('Error uploading file:', error);
//     return NextResponse.json(
//       {
//         success: false,
//         message: 'Failed to upload file',
//         error: error instanceof Error ? error.message : 'Unknown error'
//       },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join, extname } from 'path';
import { existsSync } from 'fs';
import { connectToDatabase } from '@/lib/db';
import Announcement from '@/models/AnnouncementFiles';
import sanitize from 'sanitize-filename';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';



export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string;
    const userId = formData.get('userId') as string;
    const type = formData.get('type') as string; // 'recorded' or 'uploaded'

    if (!userId || !file || !name || !type) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    // Determine folder
    const fileType = type === 'recorded' ? 'recorded' : 'audio';
    const baseUploadPath = join(process.cwd(), 'uploads', 'announcement', userId, fileType);

    if (!existsSync(baseUploadPath)) {
      await mkdir(baseUploadPath, { recursive: true });
    }

    await connectToDatabase();

    // Get file extension from the File object or from the name
    const fileExtension = extname(file.name) || extname(name) || '';
    
    // Remove extension from name if it exists, then sanitize
    const nameWithoutExt = name.replace(fileExtension, '');
    const sanitizedName = sanitize(nameWithoutExt);
    
    // Reconstruct the original filename with extension
    const originalFileName = `${sanitizedName}${fileExtension}`;
    
    // Create unique filename with extension
    const uniqueFileName = `${uuidv4()}-${sanitizedName}${fileExtension}`;
    const filePath = join(baseUploadPath, uniqueFileName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Save to DB
    const relPath = `/uploads/announcement/${userId}/${fileType}/${uniqueFileName}`;
    const announcement = await Announcement.create({
      userId: new mongoose.Types.ObjectId(userId),
      name: originalFileName,
      path: relPath,
      type,
      voice: type === 'recorded' ? 'user' : null,
      createdAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'File uploaded and saved to database',
      file: announcement
    });
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