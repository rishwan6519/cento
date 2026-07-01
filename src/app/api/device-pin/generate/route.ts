import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import DevicePin from "@/models/DevicePin";
import Device from "@/models/Device";
import AssignedDevice from "@/models/AssignDevice";

function generatePin(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}

// POST — Generate a new PIN for a device
export async function POST(request: Request) {
  try {
    const { deviceId, userId } = await request.json();

    if (!deviceId || !userId) {
      return NextResponse.json(
        { success: false, message: "deviceId and userId are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Verify device exists
    const device = await Device.findById(deviceId);

    if (!device) {
      return NextResponse.json(
        { success: false, message: "Device not found" },
        { status: 404 }
      );
    }

    const serialNumber = device.serialNumber;

    // Deactivate any existing PINs for this device
    await DevicePin.updateMany(
      { deviceId, isActive: true },
      { isActive: false }
    );

    // Generate a unique PIN
    let pin = generatePin();
    let pinExists = await DevicePin.findOne({ pin, isActive: true });
    let attempts = 0;
    while (pinExists && attempts < 20) {
      pin = generatePin();
      pinExists = await DevicePin.findOne({ pin, isActive: true });
      attempts++;
    }

    // Create the PIN record
    const devicePin = await DevicePin.create({
      pin,
      serialNumber,
      deviceId,
      userId,
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        pin: devicePin.pin,
        serialNumber,
        deviceName: device.name,
        expiresIn: "24 hours",
      },
    });
  } catch (error) {
    console.error("Error generating device PIN:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to generate PIN" },
      { status: 500 }
    );
  }
}
