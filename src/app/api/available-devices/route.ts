import { NextRequest, NextResponse } from 'next/server';
import {connectToDatabase} from '@/lib/db';
import Device from '@/models/Device';
import AssignedDevice from '@/models/AssignDevice';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const userId = req.nextUrl.searchParams.get('id');


    // Find all active assigned device IDs
    const assignedDeviceIds = await AssignedDevice.find({assignedBy: userId, status: 'active'})
      .distinct('deviceId');

    // Find all devices that are not in the assigned devices list
    const availableDevices = await Device.find({
      userId: userId,
      _id: { $nin: assignedDeviceIds },
      status: 'active'
    });

    return NextResponse.json({
      success: true,
      data: availableDevices
    });

  } catch (error) {
    console.error('Error in available-devices:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch available devices'
    }, { status: 500 });
  }
}