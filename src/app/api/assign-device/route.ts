import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AssignedDevice from '@/models/AssignDevice';
import Device from '@/models/Device';
import { DeviceType } from '@/models/DeviceTypes'; // Import the named export

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
   console.log('User ID:', userId);
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'User ID is required'
      }, { status: 400 });
    }

    // Update the query to populate device details and include status check


    const assignments = await AssignedDevice.find({
      userId,
      status: 'active'
    }).populate({
  path: 'deviceId',
  model: Device,
  select: 'name serialNumber status imageUrl color typeId',
  populate: {
    path: 'typeId',
    model: DeviceType,
    select: 'name blcockCodingEnabled handMovements bodyMovements screenSize'
  }
});

console.log('Assignments:', assignments);
 
    
    if (!assignments || assignments.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No assigned devices found for this user'

        
      },);
    }

    return NextResponse.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    console.error('Error in get-assigned-devices:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch assigned devices'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    
    const { userId, deviceId, assignedBy, status } = body;
    
    // Validate device exists
    const device = await Device.findById(deviceId);
    if (!device) {
      return NextResponse.json({
        success: false,
        message: 'Device not found'
      }, { status: 404 });
    }

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

    // Create new assignment with proper ObjectId types
    const assignment = await AssignedDevice.create({
      userId,
      deviceId,
      assignedBy,
      status: status || 'active'
    });

    // Populate device details in response
    const populatedAssignment = await AssignedDevice.findById(assignment._id).populate({
      path: 'deviceId',
      model: Device,
      select: 'name serialNumber status imageUrl color typeId',
      populate: {
        path: 'typeId',
        model: DeviceType,
        select: 'name'
      }
    });

    return NextResponse.json({
      success: true,
      data: populatedAssignment
    });
  } catch (error) {
    console.error('Error in assign-device:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to assign device'
    }, { status: 500 });
  }
}