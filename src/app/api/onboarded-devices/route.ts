import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Device from '@/models/Device'; // adjust path as needed
import { connectToDatabase } from '@/lib/db'; // your DB connection helper

export async function POST(req: NextRequest) {
  await connectToDatabase();

  try {
    const { userId, deviceInfo } = await req.json();

    // Validate required fields
    if (!userId || !deviceInfo?.serialNumber) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create new Device entry
    const newDevice = new Device({
      ...deviceInfo,
      userId,
    });

    // Save to database
    await newDevice.save();

    return NextResponse.json({ success: true, data: newDevice }, { status: 200 });
  } catch (error) {
    console.error('Error saving device:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
