import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import User, { UserRole } from "@/models/User";
import Device from "@/models/Device";
import Customer from "@/models/Customer";
import PlaylistConfig from "@/models/PlaylistConfig";
import AnnouncementPlaylist from "@/models/AnnouncementPlaylist";
import AssignedDevice from "@/models/AssignDevice";
import "@/models/DeviceTypes"; // Register DeviceType schema for populate

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Missing or invalid token" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    } catch (err) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { userId } = decoded;

    // Connect to database
    await connectToDatabase();

    // Find user to ensure they exist and get current role/info
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Get the user's personalized offline threshold (default to 60 minutes)
    const thresholdMinutes = user.notificationFrequency !== undefined ? user.notificationFrequency : 60;
    const OFFLINE_THRESHOLD_MS = thresholdMinutes * 60 * 1000;

    // --- Fetch Dashboard Data based on role ---
    let dashboard: any = {};
    const userObjectId = user._id;

    // Helper to calculate online status
    const getDeviceStatus = (lastConnection?: Date | null) => {
      if (!lastConnection) return 'offline';
      const cutoff = new Date(Date.now() - OFFLINE_THRESHOLD_MS);
      return new Date(lastConnection) > cutoff ? 'online' : 'offline';
    };

    // Helper to format device type with full image URL
    const formatDeviceType = (typeId: any) => {
      if (!typeId) return null;
      let formatted = { ...typeId };
      if (formatted.imageUrl && !formatted.imageUrl.startsWith('http')) {
        formatted.imageUrl = `https://iot.centelon.com${formatted.imageUrl.startsWith('/') ? '' : '/'}${formatted.imageUrl}`;
      }
      return formatted;
    };

    dashboard = {
      section: "Store Dashboard"
    };

    // --- Global Shared Data for ALL Roles ---
    // 1. Devices directly assigned to this user (if any)
    const assignments = await AssignedDevice.find({ userId: userObjectId }).populate('deviceId').lean();
    const assignedDevices = assignments.map((a: any) => {
      const d = a.deviceId;
      if (!d) return null;
      return {
        _id: d._id,
        name: d.name,
        serialNumber: d.serialNumber,
        lastConnection: d.lastConnection,
        status: getDeviceStatus(d.lastConnection)
      };
    }).filter(Boolean);

    // 2. Playlists applicable to this user
    const orConditions: any[] = [{ userId: userObjectId }];
    if (user.controllerId) orConditions.push({ userId: user.controllerId });
    if (user.customerId) orConditions.push({ userId: user.customerId });

    const playlists = await PlaylistConfig.find({ $or: orConditions }).sort({ createdAt: -1 });
    const announcements = await AnnouncementPlaylist.find({ $or: orConditions }).sort({ createdAt: -1 });

    // Include basic user info at the root for ALL dashboards
    const baseUserInfo = {
      _id: user._id,
      username: user.username,
      role: "store", // Hardcoded for mobile app compatibility
      storeName: user.storeName,
      storeLocation: user.storeLocation,
      companyName: user.companyName,
      operatorName: user.operatorName,
      openingTime: "09:00",
      closingTime: "18:00",
    };

    return NextResponse.json(
      {
        success: true,
        notificationFrequency: thresholdMinutes,
        ...baseUserInfo,
        assignedDevices,
        playlists,
        announcements,
        ...dashboard
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Mobile API dashboard error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
