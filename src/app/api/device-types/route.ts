import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DeviceType } from '@/models/DeviceTypes';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();

    const deviceType = await DeviceType.create({
      name: data.name,
      imageUrl: data.imageUrl,
      handMovements: data.handMovements,
      bodyMovements: data.bodyMovements,
      screenSize: {
        width: data.screenSize.width,
        height: data.screenSize.height
      }
    });
    console.log(deviceType)

    return NextResponse.json({
      success: true,
      deviceType
    });
  } catch (error) {
    console.error('Error creating device type:', error);
    return NextResponse.json(
      { error: 'Failed to create device type' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();

    const updatedDeviceType = await DeviceType.findByIdAndUpdate(
      data.id,
      {
        name: data.name,
        imageUrl: data.imageUrl,
        handMovements: data.handMovements,
        bodyMovements: data.bodyMovements,
        screenSize: {
          width: data.screenSize.width,
          height: data.screenSize.height
        }
      },
      { new: true }
    );

    if (!updatedDeviceType) {
      return NextResponse.json(
        { error: 'Device type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deviceType: updatedDeviceType
    });
  } catch (error) {
    console.error('Error updating device type:', error);
    return NextResponse.json(
      { error: 'Failed to update device type' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await connectToDatabase();
    const { id } = await request.json();

    const deletedDeviceType = await DeviceType.findByIdAndDelete(id);

    if (!deletedDeviceType) {
      return NextResponse.json(
        { error: 'Device type not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Device type deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting device type:', error);
    return NextResponse.json(
      { error: 'Failed to delete device type' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {console.log("................")

    await connectToDatabase();
    
    const deviceTypes = await DeviceType.find().sort({ createdAt: -1 });
    
    // Transform _id to id in the response
    const transformedDeviceTypes = deviceTypes.map(type => ({
      id: type._id.toString(),
      name: type.name,
      imageUrl: type.imageUrl,
      handMovements: type.handMovements,
      bodyMovements: type.bodyMovements,
      screenSize: type.screenSize,
      createdAt: type.createdAt,
      updatedAt: type.updatedAt
    }));
    console.log(transformedDeviceTypes,"................")

    return NextResponse.json(transformedDeviceTypes);
  } catch (error) {
    console.error('Error fetching device types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch device types' },
      { status: 500 }
    );
  }
}
