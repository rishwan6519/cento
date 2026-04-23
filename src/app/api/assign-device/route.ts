import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import AssignedDevice from '@/models/AssignDevice';
import Device from '@/models/Device';
import { DeviceType } from '@/models/DeviceTypes';
import User from '@/models/User';

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const customerId = searchParams.get('customerId');
   console.log('User ID:', userId);
    
    if (!userId && !customerId) {
      return NextResponse.json({
        success: false,
        message: 'userId or customerId is required'
      }, { status: 400 });
    }

    const query: any = { status: 'active' };
    if (userId) {
      query.userId = userId;
    } else if (customerId) {
      const customerDevices = await Device.find({ customerId }).select('_id');
      const deviceIds = customerDevices.map(d => d._id);
      query.deviceId = { $in: deviceIds };
    }

    const assignments = await AssignedDevice.find(query)
      .populate({
        path: 'deviceId',
        model: Device,
        select: 'name serialNumber status imageUrl color typeId',
        populate: {
          path: 'typeId',
          model: DeviceType,
          select: 'name blcockCodingEnabled handMovements bodyMovements screenSize'
        }
      })
      .populate({
        path: 'userId',
        model: User,
        select: 'username storeName storeLocation'
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


export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    // Read from JSON body (not query params)
    const body = await request.json();
    const { deviceId, userId } = body;

    if (!deviceId) {
      return NextResponse.json({
        success: false,
        message: 'deviceId is required'
      }, { status: 400 });
    }

    // Find the active assignment for this device (optionally scoped to userId)
    const query: any = { deviceId, status: 'active' };
    if (userId) query.userId = userId;

    const assignment = await AssignedDevice.findOne(query);

    if (!assignment) {
      return NextResponse.json({
        success: false,
        message: 'Active assignment not found for this device'
      }, { status: 404 });
    }

    // Mark as inactive (soft delete) instead of hard delete for audit
    assignment.status = 'inactive';
    await assignment.save();

    return NextResponse.json({
      success: true,
      message: 'Device disconnected successfully'
    });
  } catch (error) {
    console.error('Error in DELETE assigned device:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to disconnect assigned device'
    }, { status: 500 });
  }
}