import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Device from '@/models/Device';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const serialNumber = req.nextUrl.searchParams.get('serialNumber');
    console.log("Received serial number:", serialNumber);

    if (!serialNumber) {
      return NextResponse.json(
        { error: 'Serial number is required' },
        { status: 400 }
      );
    }

    // Populate `type` field details
    const device = await Device.findOne({ serialNumber }).populate('typeId');

    if (!device) {
      return NextResponse.json(
        { error: 'Device not found with this serial number' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deviceData: {
        id: device._id,
        name: device.name,
        serialNumber: device.serialNumber,
        imageUrl: device.imageUrl,
        color: device.color,
        status: device.status,
        type: {
          name: device.typeId.name,
          handMovements: device.typeId.handMovements,
          bodyMovements: device.typeId.bodyMovements,
          screenSize: device.typeId.screenSize
        }
      }
    });

  } catch (error: any) {
    console.error('Error fetching device:', error);
    return NextResponse.json(
      { error: 'Failed to fetch device' },
      { status: 500 }
    );
  }
}
