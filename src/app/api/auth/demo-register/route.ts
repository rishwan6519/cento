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
    const { username, password, email, storeName, storeLocation } =
      await request.json();

    // Validate required fields
    if (!username || !password || !email || !storeName) {
      return NextResponse.json(
        { message: "Username, password, email, and store name are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return NextResponse.json(
        { message: "Username already exists" },
        { status: 409 }
      );
    }

    // Check if email already exists among demo users
    const existingEmail = await User.findOne({ email, role: "demo_store" });
    if (existingEmail) {
      return NextResponse.json(
        { message: "Email already registered" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create demo user
    const newUser = await User.create({
      username,
      password: hashedPassword,
      email,
      storeName,
      storeLocation: storeLocation || "",
      role: "demo_store",
    });

    // Find or create the "Demo Audio Speaker" device type
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

    // Generate unique serial number
    let serialNumber = generateSerialNumber();
    let serialExists = await Device.findOne({ serialNumber });
    let attempts = 0;
    while (serialExists && attempts < 10) {
      serialNumber = generateSerialNumber();
      serialExists = await Device.findOne({ serialNumber });
      attempts++;
    }

    // Create the device
    const newDevice = await Device.create({
      name: `${storeName} Speaker`,
      serialNumber,
      typeId: demoDeviceType._id,
      status: "active",
    });

    // Assign device to the demo user
    await AssignedDevice.create({
      userId: newUser._id,
      deviceId: newDevice._id,
      assignedBy: newUser._id,
      status: "active",
    });

    // Create JWT token
    const token = jwt.sign(
      {
        userId: newUser._id,
        userName: newUser.username,
        role: "demo_store",
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return NextResponse.json(
      {
        message: "Demo account created successfully",
        token,
        user: {
          id: newUser._id,
          username: newUser.username,
          role: "demo_store",
          storeName: newUser.storeName,
          storeLocation: newUser.storeLocation,
        },
        device: {
          id: newDevice._id,
          name: newDevice.name,
          serialNumber: newDevice.serialNumber,
          type: "audio",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Demo registration error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
