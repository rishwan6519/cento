import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import DevicePin from "@/models/DevicePin";
import Device from "@/models/Device";

// POST — Verify a PIN and return the associated serial number
export async function POST(request: Request) {
  try {
    const { pin } = await request.json();

    if (!pin) {
      return NextResponse.json(
        { success: false, message: "PIN is required" },
        { status: 400 }
      );
    }

    // Validate PIN format (must be exactly 5 digits)
    if (!/^\d{5}$/.test(pin)) {
      return NextResponse.json(
        { success: false, message: "Invalid PIN format. PIN must be exactly 5 digits." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find the active PIN
    const devicePin = await DevicePin.findOne({
      pin,
      isActive: true,
    });

    if (!devicePin) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid PIN or PIN has expired. Please generate a new PIN from the dashboard.",
        },
        { status: 404 }
      );
    }

    // Mark as verified
    devicePin.isVerified = true;
    await devicePin.save();

    await Device.findByIdAndUpdate(devicePin.deviceId, { lastConnection: new Date() });

    return NextResponse.json({
      success: true,
      data: {
        serialNumber: devicePin.serialNumber,
        deviceId: devicePin.deviceId,
      },
    });
  } catch (error) {
    console.error("Error verifying device PIN:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to verify PIN" },
      { status: 500 }
    );
  }
}
