import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Device from '@/models/Device';
import { DeviceType }  from '@/models/DeviceTypes';
export async function POST(req: NextRequest) {
  try {
    // Connect to database
    await connectToDatabase();

 

    // Parse request body
    const body = await req.json();
    const { name, typeId, serialNumber, imageUrl,color } = body;

    // Validate required fields
    if (!name || !typeId || !serialNumber) {
      return NextResponse.json(
        { error: 'Name, type and serial number are required' },
        { status: 400 }
      );
    }

    // Check if device type exists
    const deviceType = await DeviceType.findById(typeId);
    if (!deviceType) {
      return NextResponse.json(
        { error: 'Invalid device type' },
        { status: 400 }
      );
    }

    // Check if serial number is unique
    const existingDevice = await Device.findOne({ serialNumber });
    if (existingDevice) {
      return NextResponse.json(
        { error: 'Device with this serial number already exists' },
        { status: 400 }
      );
    }

    // Create new device
    const device = await Device.create({
      name,
      typeId,
      serialNumber,
      imageUrl,
      color,
      status: 'active'
    });

    // Return success response
    return NextResponse.json(device, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/devices:', error);
    return NextResponse.json(
      { error: 'Failed to create device' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectToDatabase();

    const devices = await Device.find({})
      .populate('typeId', 'name imageUrl')
      .sort({ createdAt: -1 });

    return NextResponse.json(devices);
  } catch (error) {
    console.error('Error in GET /api/devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

    const device = await Device.findByIdAndDelete(id);
    if (!device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/devices:', error);
    return NextResponse.json(
      { error: 'Failed to delete device' },
      { status: 500 }
    );
  }
}


export async function PATCH(request: NextRequest) {
  await connectToDatabase();
  const { name, id } = await request.json();

  if (!name || !id) {
    return NextResponse.json({ success: false, message: "Device name and ID required" }, { status: 400 });
  }

  const updatedDevice = await Device.findByIdAndUpdate(id, { name }, { new: true });
  if (!updatedDevice) {
    return NextResponse.json({ success: false, message: "Device not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, device: updatedDevice });
}