import { NextRequest, NextResponse } from 'next/server';
import {connectToDatabase} from '@/lib/db';
import Device from '@/models/Device';
import AssignedDevice from '@/models/AssignDevice';
import mongoose from 'mongoose';
import OnboardDevice from '@/models/OnboardedDevice';
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const userId = req.nextUrl.searchParams.get('id');
    console.log('User ID:', userId);


    // Find all active assigned device IDs
    const assignedDeviceIds = await AssignedDevice.find({assignedBy: userId, status: 'active'})
      .distinct('deviceId');
console.log('Assigned Device IDs:', assignedDeviceIds);
    // Find all devices that are not in the assigned devices list
if (!userId) {
  return NextResponse.json({
    success: false,
    message: 'User ID is required'
  }, { status: 400 });
}

const onboardedDevices = await OnboardDevice.find({
  userId: new mongoose.Types.ObjectId(userId),
  deviceId: { $nin: assignedDeviceIds }
}).populate({
  path: 'deviceId',
  model: Device,
  select: 'status name serialNumber imageUrl typeId color'
});

const availableDevices = onboardedDevices.filter(device =>
  device.deviceId && device.deviceId.status === 'active'
);

console.log('Available Devices:', availableDevices);

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