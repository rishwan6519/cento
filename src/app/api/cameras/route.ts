
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { CameraConfig } from '@/models/Camera/CameraConfig';

export async function GET() {
  try {
    await connectToDatabase();
    const cameras = await CameraConfig.find({}).sort({ createdAt: 1 });
    return NextResponse.json(cameras);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch cameras' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    await connectToDatabase();

    let nextId = body.id;

    if (!nextId) {
        // Auto-generate ID logic only if not provided
        // Find the latest camera to determine next ID
        const lastCamera = await CameraConfig.findOne({}).sort({ createdAt: -1 });
        
        let nextIdNumber = 1;
        if (lastCamera && lastCamera.id) {
            // extract number from "CAM-XX"
            const match = lastCamera.id.match(/CAM-(\d+)/);
            if (match && match[1]) {
                nextIdNumber = parseInt(match[1]) + 1;
            }
        }
        nextId = `CAM-${nextIdNumber.toString().padStart(2, '0')}`;
    }

    const newCamera = new CameraConfig({
        ...body,
        id: nextId
    });

    await newCamera.save();

    return NextResponse.json(newCamera);
  } catch (error) {
    console.error("Error creating camera:", error);
    return NextResponse.json({ error: 'Failed to create camera' }, { status: 500 });
  }
}
