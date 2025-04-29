import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import OnboardedDevice  from "@/models/OnboardedDevice";
import Device from "@/models/Device"; // Import the Device model
import { DeviceType } from "@/models/DeviceTypes"; // Import DeviceType model
import User from "@/models/User"; // Import the User model


import { connectToDatabase } from "@/lib/db";

export async function POST(req: NextRequest) {
  await connectToDatabase();

  try {
    const body = await req.json();
    console.log("Received data:", body);

    const { deviceId, typeId, userId } = body;

    // Validate required fields
    if (!deviceId || !typeId || !userId) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Optional: Check if serialNumber already exists
    const existingDevice = await Device.findOne({
      _id: mongoose.Types.ObjectId.createFromHexString(deviceId),
    });
    if (existingDevice) {
      return NextResponse.json(
        {
          success: false,
          message: "Device with this serial number already exists",
        },
        { status: 409 }
      );
    }

    // Create new Device document
    const newDevice = await Device.create({
      deviceId: mongoose.Types.ObjectId.createFromHexString(deviceId),
      typeId: typeId
        ? mongoose.Types.ObjectId.createFromHexString(typeId)
        : null,

      userId: mongoose.Types.ObjectId.createFromHexString(userId),
    });

    return NextResponse.json(
      { success: true, data: newDevice },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error saving device:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
export async function GET(req: NextRequest) {
  await connectToDatabase();

  try {
    const url = req.nextUrl;
    const userId = url.searchParams.get("userId");
    const serialNumber = url.searchParams.get("serialNumber");
console.log(userId,"userId.............")
    // If serialNumber is provided
    if (serialNumber) {
      const device = await OnboardedDevice.findOne({})
        .populate({
          path: "deviceId",
          match: { serialNumber: serialNumber },
        })
        .populate("typeId");

      if (!device || !device.deviceId) {
        return NextResponse.json(
          { success: false, message: "Device not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: device }, { status: 200 });
    }

    // If userId is provided
    if (userId) {
      const devices = await OnboardedDevice.find({ userId: userId })
      .populate("deviceId")  // Populating deviceId // Populating typeId and only returning the 'name' field // If you want to populate userId, you can specify the fields (e.g., "name")
      .exec();
    
      return NextResponse.json({ success: true, data: devices }, { status: 200 });
    }

    // Return all devices (populated)
    const allDevices = await OnboardedDevice.find({})
      .populate("deviceId", "name serialNumber status imageUrl")
      .populate("typeId", "name");

    return NextResponse.json({ success: true, data: allDevices }, { status: 200 });

  } catch (error: any) {
    console.error("Error retrieving devices:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
