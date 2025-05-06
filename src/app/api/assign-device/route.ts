import { NextResponse } from 'next/server';
import {connectToDatabase} from '@/lib//db';
import AssignedDevice from '@/models/AssignDevice';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    
    const { userId, deviceId, assignedBy, status } = body;

    // Check if device is already assigned
    const existingAssignment = await AssignedDevice.findOne({
      deviceId,
      status: 'active'
    });

    if (existingAssignment) {
      return NextResponse.json({
        success: false,
        message: 'Device is already assigned to another user'
      }, { status: 400 });
    }

    // Create new assignment
    const assignment = await AssignedDevice.create({
      userId,
      deviceId,
      assignedBy,
      status
    });

    return NextResponse.json({
      success: true,
      data: assignment
    });

  } catch (error) {
    console.error('Error in assign-device:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to assign device'
    }, { status: 500 });
  }
}