// app/api/assign-slider/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AssignedSlider from '@/models/AssignedSlider'; // create this model
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { userId, deviceId, sliderId, assignedBy, status } = body;

    if (!userId || !deviceId || !sliderId || !assignedBy) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if this slider is already assigned to this device
    const existingAssignment = await AssignedSlider.findOne({
      userId:  mongoose.Types.ObjectId.createFromHexString(userId),
      deviceId:  mongoose.Types.ObjectId.createFromHexString(deviceId),
      sliderId:  mongoose.Types.ObjectId.createFromHexString(sliderId),
      status: 'active'
    });

    if (existingAssignment) {
      return NextResponse.json({
        success: false,
        message: 'This slider is already assigned to the device'
      }, { status: 400 });
    }

    const newAssignment = new AssignedSlider({
      userId:  mongoose.Types.ObjectId.createFromHexString(userId),
      deviceId:  mongoose.Types.ObjectId.createFromHexString(deviceId),
      sliderId:  mongoose.Types.ObjectId.createFromHexString(sliderId),
      assignedBy:  mongoose.Types.ObjectId.createFromHexString(assignedBy),
      status: status || 'active',
      assignedAt: new Date()
    });

    await newAssignment.save();

    return NextResponse.json({ success: true, message: 'Slider assigned successfully' });
  } catch (error) {
    console.error('Error assigning slider:', error);
    return NextResponse.json({ success: false, message: 'Failed to assign slider' }, { status: 500 });
  }
}
