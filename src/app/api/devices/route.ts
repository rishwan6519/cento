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

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const resellerId = searchParams.get("resellerId");
    const customerId = searchParams.get("customerId");

    const mongoose = (await import('mongoose')).default;

    if (customerId && customerId !== 'undefined' && customerId !== 'null') {
      const devices = await Device.find({ customerId: customerId })
        .populate('typeId', 'name imageUrl')
        .sort({ createdAt: -1 });
      return NextResponse.json(devices);
    }

    if (!resellerId) {
      // No filter — return all devices (admin use)
      const devices = await Device.find({})
        .populate('typeId', 'name imageUrl')
        .sort({ createdAt: -1 });
      return NextResponse.json(devices);
    }


    const resellerObjectId = new mongoose.Types.ObjectId(resellerId);

    // Import Customer model to find customers belonging to this reseller
    const Customer = (await import('@/models/Customer')).default;
    const customers = await Customer.find({ resellerId: resellerObjectId }, '_id');
    const customerIds = customers.map((c: any) => c._id);

    // Find devices where resellerId matches OR customerId is one of the reseller's customers
    const orConditions: any[] = [{ resellerId: resellerObjectId }];
    if (customerIds.length > 0) {
      orConditions.push({ customerId: { $in: customerIds } });
    }

    const devices = await Device.find({ $or: orConditions })
      .populate('typeId', 'name imageUrl')
      .sort({ createdAt: -1 });

    console.log(`GET /api/devices: resellerId=${resellerId}, customers=${customerIds.length}, found=${devices.length}`);
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
  try {
    await connectToDatabase();
    const mongoose = (await import('mongoose')).default;
    const { id, name, imageUrl, color, status, customerId, resellerId } = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, message: "Device ID is required" }, { status: 400 });
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (color !== undefined) updateData.color = color;
    if (status !== undefined) updateData.status = status;
    // Explicitly cast to ObjectId or allow null (for disconnect)
    if (customerId !== undefined) {
      updateData.customerId = customerId ? new mongoose.Types.ObjectId(customerId) : null;
    }
    if (resellerId !== undefined) {
      updateData.resellerId = resellerId ? new mongoose.Types.ObjectId(resellerId) : null;
    }

    console.log('PATCH /api/devices updateData:', JSON.stringify(updateData));

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, message: "No fields to update" }, { status: 400 });
    }

    const updatedDevice = await Device.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedDevice) {
      return NextResponse.json({ success: false, message: "Device not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, device: updatedDevice });
  } catch (error) {
    console.error('Error updating device:', error);
    return NextResponse.json({ success: false, message: "Failed to update device" }, { status: 500 });
  }
}