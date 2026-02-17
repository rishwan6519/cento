
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
        // Generate a random 6-digit ID
        let unique = false;
        while (!unique) {
            const randomId = Math.floor(100000 + Math.random() * 900000).toString(); // e.g. "849201"
            const existing = await CameraConfig.findOne({ id: randomId });
            if (!existing) {
                nextId = randomId;
                unique = true;
            }
        }
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
