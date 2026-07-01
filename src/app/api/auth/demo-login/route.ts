import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import Device from "@/models/Device";
import { DeviceType } from "@/models/DeviceTypes";
import AssignedDevice from "@/models/AssignDevice";

function generateSerialNumber(): string {
  const digits = Math.floor(10000 + Math.random() * 90000);
  return `SN-${digits}`;
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { message: "Username and password are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Only find demo_store users
    const user = await User.findOne({ username, role: "demo_store" });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials or account not found" },
        { status: 401 }
      );
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check if user has an assigned device
    let assignedDevice = await AssignedDevice.findOne({
      userId: user._id,
      status: "active",
    }).populate({
      path: "deviceId",
      model: Device,
      select: "name serialNumber status typeId",
    });

    // If no device assigned, create one (edge case recovery)
    if (!assignedDevice) {
      let demoDeviceType = await DeviceType.findOne({
        name: "Demo Audio Speaker",
        type: "audio",
      });

      if (!demoDeviceType) {
        demoDeviceType = await DeviceType.create({
          name: "Demo Audio Speaker",
          type: "audio",
          imageUrl: "/demo-speaker.png",
          screenSize: { width: 0, height: 0 },
          blockCodingEnabled: false,
        });
      }

      let serialNumber = generateSerialNumber();
      let serialExists = await Device.findOne({ serialNumber });
      let attempts = 0;
      while (serialExists && attempts < 10) {
        serialNumber = generateSerialNumber();
        serialExists = await Device.findOne({ serialNumber });
        attempts++;
      }

      const newDevice = await Device.create({
        name: `${user.storeName || user.username} Speaker`,
        serialNumber,
        typeId: demoDeviceType._id,
        status: "active",
      });

      assignedDevice = await AssignedDevice.create({
        userId: user._id,
        deviceId: newDevice._id,
        assignedBy: user._id,
        status: "active",
      });

      // Re-populate
      assignedDevice = await AssignedDevice.findById(assignedDevice._id).populate({
        path: "deviceId",
        model: Device,
        select: "name serialNumber status typeId",
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        userName: user.username,
        role: "demo_store",
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    const deviceInfo = assignedDevice?.deviceId as any;

    return NextResponse.json(
      {
        message: "Demo login successful",
        token,
        user: {
          id: user._id,
          username: user.username,
          role: "demo_store",
          storeName: user.storeName,
          storeLocation: user.storeLocation,
        },
        device: {
          id: deviceInfo?._id,
          name: deviceInfo?.name,
          serialNumber: deviceInfo?.serialNumber,
          status: deviceInfo?.status,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Demo login error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
