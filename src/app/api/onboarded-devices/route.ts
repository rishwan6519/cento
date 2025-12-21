import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import OnboardedDevice from "@/models/OnboardedDevice";
import Device from "@/models/Device";
import { DeviceType } from "@/models/DeviceTypes";
import DevicePlaylist from "@/models/ConectPlaylist";
import "@/models/User";
import AssignedDevice from "@/models/AssignDevice";


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
    console.log(deviceId, "deviceId");

    // Optional: Check if serialNumber already exists
    const existingDevice = await OnboardedDevice.findOne({
      deviceId: mongoose.Types.ObjectId.createFromHexString(deviceId),
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
    const newDevice = await OnboardedDevice.create({
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
// ...existing code...

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // 1. Devices owned by user
    const ownedDevices = await OnboardedDevice.aggregate([
      { $match: { userId: userObjectId } },
      {
        $lookup: {
          from: "devices",
          localField: "deviceId",
          foreignField: "_id",
          as: "deviceInfo",
        },
      },
      {
        $lookup: {
          from: "devicetypes",
          localField: "typeId",
          foreignField: "_id",
          as: "typeInfo",
        },
      },
      {
        $project: {
          _id: 1,
          deviceId: {
            _id: { $arrayElemAt: ["$deviceInfo._id", 0] },
            name: { $arrayElemAt: ["$deviceInfo.name", 0] },
            serialNumber: { $arrayElemAt: ["$deviceInfo.serialNumber", 0] },
            imageUrl: { $arrayElemAt: ["$deviceInfo.imageUrl", 0] },
            status: { $arrayElemAt: ["$deviceInfo.status", 0] },
          },
          typeId: {
            _id: { $arrayElemAt: ["$typeInfo._id", 0] },
            name: { $arrayElemAt: ["$typeInfo.name", 0] },
          },
          userId: { _id: "$userId" },
          createdAt: 1,
          updatedAt: 1,
          __v: 1,
          source: { $literal: "owned" },
        },
      },
    ]);

    // 2. Devices assigned to user
    const assignedDevices = await AssignedDevice.aggregate([
      { $match: { userId: userObjectId, status: "active" } },
      {
        $lookup: {
          from: "devices",
          localField: "deviceId",
          foreignField: "_id",
          as: "deviceInfo",
        },
      },
      {
        $project: {
          _id: 1,
          deviceId: {
            _id: { $arrayElemAt: ["$deviceInfo._id", 0] },
            name: { $arrayElemAt: ["$deviceInfo.name", 0] },
            serialNumber: { $arrayElemAt: ["$deviceInfo.serialNumber", 0] },
            imageUrl: { $arrayElemAt: ["$deviceInfo.imageUrl", 0] },
            status: { $arrayElemAt: ["$deviceInfo.status", 0] },
          },
          assignedBy: 1,
          assignedAt: 1,
          source: { $literal: "assigned" },
        },
      },
    ]);

    // 3. Merge both lists
    const devices = [...ownedDevices, ...assignedDevices];

    return NextResponse.json(
      {
        success: true,
        data: devices,
        count: devices.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching devices:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to fetch devices",
      },
      { status: 500 }
    );
  }
}
// ... existing code ...
// ... existing code ...

export async function DELETE(req: NextRequest) {
  await connectToDatabase();

  try {
    const url = req.nextUrl;
    const deviceId = url.searchParams.get("deviceId");
    console.log("Received deviceId", deviceId);

    if (!deviceId) {
      return NextResponse.json(
        { success: false, message: "Device ID is required" },
        { status: 400 }
      );
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      return NextResponse.json(
        { success: false, message: "Invalid device ID format" },
        { status: 400 }
      );
    }

    const deviceObjectId = new mongoose.Types.ObjectId(deviceId);

    // First, find the device to get the actual device ID from the main Device collection
    const onboardedDevice = await OnboardedDevice.findById(deviceId);
    
    if (!onboardedDevice) {
      return NextResponse.json(
        { success: false, message: "Device not found" },
        { status: 404 }
      );
    }

    // Delete from all related collections
    const deleteResults = await Promise.all([
      // Delete from OnboardedDevice collection
      OnboardedDevice.findByIdAndDelete(deviceId),
      
      // Delete from DevicePlaylist connections
      DevicePlaylist.deleteMany({ deviceId: deviceObjectId }),
      
      // Delete from AssignedDevice connections
      AssignedDevice.deleteMany({ deviceId: onboardedDevice.deviceId }),
      
      // Delete from main Device collection
      Device.findByIdAndDelete(onboardedDevice.deviceId)
    ]);

    // Check if the main deletion was successful
    if (!deleteResults[0]) {
      return NextResponse.json(
        { success: false, message: "Device not found or already deleted" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Device removed successfully from all collections" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error removing device:", error);
    return NextResponse.json(
      { success: false, message: "Failed to remove device: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 }
    );
  }
}