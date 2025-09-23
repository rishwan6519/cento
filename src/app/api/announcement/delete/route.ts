import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import {connectToDatabase} from '@/lib/db';
import Announcement from '@/models/AnnouncementFiles';


// ✅ Cloudinary config
cloudinary.config({
  cloud_name: "dzb0gggua",
  api_key: "941516363985336",
  api_secret: "_FMBToEKgXmtQn0MbFwFyWRUBSQ",
});

function getCloudinaryPublicId(url: string): string | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?([^\.]+)\./);
  return match ? match[1] : null;
}

export async function DELETE(req: NextRequest) {
  await connectToDatabase();

  const body = await req.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ message: 'Missing announcement id' }, { status: 400 });
  }

  const announcement = await Announcement.findById(id);
  if (!announcement) {
    return NextResponse.json({ message: 'Announcement not found' }, { status: 404 });
  }

  const publicId = getCloudinaryPublicId(announcement.path);

  if (publicId) {
    try {
     await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });

    } catch (err) {
      console.error('Cloudinary delete error:', err);
    }
  }

  await Announcement.deleteOne({ _id: id });

  return NextResponse.json({ message: 'Announcement deleted' }, { status: 200 });
}
