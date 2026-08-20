import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DeviceCurrentPlaying } from '@/models/DeviceCurrentPlaying';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { serialNumber, path } = body;

    if (!serialNumber || path === undefined) {
      return NextResponse.json({ error: 'serialNumber and path are required' }, { status: 400 });
    }

    if (path === '') {
      await DeviceCurrentPlaying.findOneAndDelete({ serialNumber });
      return NextResponse.json({ success: true, message: 'Currently playing cleared successfully' }, { status: 200 });
    }

    await DeviceCurrentPlaying.findOneAndUpdate(
      { serialNumber },
      { serialNumber, path, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, message: 'Currently playing updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating currently playing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const serialNumber = req.nextUrl.searchParams.get('serialNumber');

    if (!serialNumber) {
      return NextResponse.json({ error: 'serialNumber is required' }, { status: 400 });
    }

    const currentPlaying = await DeviceCurrentPlaying.findOne({ serialNumber }).lean();
    return NextResponse.json({ success: true, data: currentPlaying }, { status: 200 });
  } catch (error) {
    console.error('Error fetching currently playing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
