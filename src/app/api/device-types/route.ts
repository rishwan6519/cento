import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DeviceType } from '@/models/DeviceTypes';
import { blob } from 'stream/consumers';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();
    
    console.log('[API/DeviceTypes] Creating Device Type with data:', JSON.stringify(data, null, 2));

    if (!data.name || !data.imageUrl) {
      console.error('[API/DeviceTypes] Validation Error: Name and Image URL are required');
      return NextResponse.json(
        { error: 'Name and Image URL are required' },
        { status: 400 }
      );
    }

    const deviceType = await DeviceType.create({
      name: data.name,
      imageUrl: data.imageUrl,
      handMovements: data.handMovements || [],
      bodyMovements: data.bodyMovements || [],
      screenSize: {
        width: data.screenSize?.width || 0,
        height: data.screenSize?.height || 0
      },
      blockCodingEnabled: !!data.blockCodingEnabled,
    });
    
    console.log('[API/DeviceTypes] Successfully created model:', deviceType._id);

    return NextResponse.json({
      success: true,
      deviceType: {
        id: deviceType._id.toString(),
        ...deviceType.toObject()
      }
    });
  } catch (error: any) {
    console.error('[API/DeviceTypes] Creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create device type', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await connectToDatabase();
    const data = await request.json();

    console.log(`[API/DeviceTypes] Updating ID: ${data.id} with data:`, JSON.stringify(data, null, 2));

    const updatedDeviceType = await DeviceType.findByIdAndUpdate(
      data.id,
      {
        name: data.name,
        imageUrl: data.imageUrl,
        handMovements: data.handMovements,
        bodyMovements: data.bodyMovements,
        screenSize: {
          width: data.screenSize?.width,
          height: data.screenSize?.height
        },
        blockCodingEnabled: data.blockCodingEnabled,
      },
      { new: true }
    );

    if (!updatedDeviceType) {
      console.warn(`[API/DeviceTypes] Model not found for update: ${data.id}`);
      return NextResponse.json(
        { error: 'Device type not found' },
        { status: 404 }
      );
    }

    console.log(`[API/DeviceTypes] Successfully updated model: ${data.id}`);

    return NextResponse.json({
      success: true,
      deviceType: updatedDeviceType
    });
  } catch (error: any) {
    console.error('[API/DeviceTypes] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update device type', details: error.message },
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
      updatedAt: type.updatedAt,
      blockCodingEnabled: type?.blockCodingEnabled,
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
