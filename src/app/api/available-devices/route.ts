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
    const role = req.nextUrl.searchParams.get('role');
    console.log('User ID:', userId, 'Role:', role);

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'User ID is required'
      }, { status: 400 });
    }

    if (role === 'admin') {
      const assignedOut = await AssignedDevice.find({ status: 'active' }).distinct('deviceId');
      const adminAvailableDevices = await Device.find({
        _id: { $nin: assignedOut },
        status: 'active'
      });
      const formattedDevices = adminAvailableDevices.map((d: any) => ({
        _id: d._id.toString() + '_admin',
        deviceId: d
      }));

      return NextResponse.json({
        success: true,
        data: formattedDevices
      });
    }

    // Find all active devices that THIS user has assigned out to others
    const devicesAssignedOut = await AssignedDevice.find({ assignedBy: userId, status: 'active' })
      .distinct('deviceId');

    // Find devices onboarded by this user
    const onboardedDevices = await OnboardDevice.find({
      userId: new mongoose.Types.ObjectId(userId),
      deviceId: { $nin: devicesAssignedOut }
    }).populate({
      path: 'deviceId',
      model: Device,
      select: 'status name serialNumber imageUrl typeId color'
    }) as any[];

    // Find devices assigned TO this user
    const assignedToUser = await AssignedDevice.find({
      userId: new mongoose.Types.ObjectId(userId),
      deviceId: { $nin: devicesAssignedOut },
      status: 'active'
    }).populate({
      path: 'deviceId',
      model: Device,
      select: 'status name serialNumber imageUrl typeId color'
    }) as any[];

    // Combine both lists and filter for active device status
    const allOwnedDevices = [...onboardedDevices, ...assignedToUser];
    
    // Filter duplicates (in case of data issues) and check if device itself is active
    const uniqueDevicesMap = new Map();
    for (const item of allOwnedDevices) {
      if (item.deviceId && item.deviceId.status === 'active') {
        const devIdStr = item.deviceId._id.toString();
        if (!uniqueDevicesMap.has(devIdStr)) {
          uniqueDevicesMap.set(devIdStr, item);
        }
      }
    }

    const availableDevices = Array.from(uniqueDevicesMap.values());

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