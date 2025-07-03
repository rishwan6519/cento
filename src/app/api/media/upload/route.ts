// import { NextRequest, NextResponse } from 'next/server';
// import { writeFile, mkdir } from 'fs/promises';
// import { join } from 'path';
// import { existsSync } from 'fs';
// import { connectToDatabase } from '@/lib/db';
// import MediaItemModel from '@/models/MediaItems';
// import sanitize from 'sanitize-filename';
// import { v4 as uuidv4 } from 'uuid';
// import mongoose from 'mongoose';


// export async function POST(req: NextRequest) {
//   try {
//     const formData = await req.formData();
//     const files = formData.getAll('files') as File[];
//     const fileNames = formData.getAll('fileNames') as string[];
//     const userId = formData.get('userId') as string;

//     if (!userId) {
//       return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
//     }

//     if (!files.length || !fileNames.length || files.length !== fileNames.length) {
//       return NextResponse.json({ success: false, message: 'Invalid or mismatched file data' }, { status: 400 });
//     }

//     const baseUploadPath = join(process.cwd(), 'public', 'uploads');
//     const directories = ['video', 'audio', 'image'];

//     for (const dir of directories) {
//       const dirPath = join(baseUploadPath, dir);
//       if (!existsSync(dirPath)) {
//         await mkdir(dirPath, { recursive: true });
//       }
//     }

//     await connectToDatabase();

//     const uploadedFiles = await Promise.all(
//       files.map(async (file: File, index) => {
//         const originalFileName = sanitize(fileNames[index]);
//         const fileType = file.type?.split('/')?.[0] || 'unknown';

//         if (!['audio', 'video', 'image'].includes(fileType)) {
//           throw new Error(`Unsupported file type: ${file.type}`);
//         }

//         const uniqueFileName = `${uuidv4()}-${originalFileName}`;
//         const filePath = join(baseUploadPath, fileType, uniqueFileName);

//         const bytes = await file.arrayBuffer();
//         const buffer = Buffer.from(bytes);
//         await writeFile(filePath, buffer);

//         const mediaItem = new MediaItemModel({
//           userId:new mongoose.Types.ObjectId(userId),
//           name: originalFileName,
//           type: file.type,
//           url: `/uploads/${fileType}/${uniqueFileName}`,
//           createdAt: new Date()
//         });
//         console.log("Saving media item to database:", mediaItem);

//         await mediaItem.save();
//         return mediaItem;
//       })
//     );

//     return NextResponse.json({
//       success: true,
//       message: 'Files uploaded and saved to database',
//       files: uploadedFiles
//     });

//   } catch (error) {
//     console.error('Error uploading files:', error);
//     return NextResponse.json(
//       {
//         success: false,
//         message: 'Failed to upload files',
//         error: error instanceof Error ? error.message : 'Unknown error'
//       },
//       { status: 500 }
//     );
//   }
// }



import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import MediaItemModel from '@/models/MediaItems';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    const { userId, name, type, url } = await req.json();

    if (!userId || !name || !type || !url) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    const mediaItem = new MediaItemModel({
      userId: new mongoose.Types.ObjectId(userId),
      name,
      type,
      url,
      createdAt: new Date(),
    });

    await mediaItem.save();

    return NextResponse.json({ success: true, mediaItem });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Error saving media metadata',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
