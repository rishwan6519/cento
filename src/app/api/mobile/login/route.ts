import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import User, { UserRole } from "@/models/User";
import Device from "@/models/Device";
import Customer from "@/models/Customer";
import PlaylistConfig from "@/models/PlaylistConfig";
import Announcement from "@/models/AnnouncementFiles";
import AnnouncementPlaylist from "@/models/AnnouncementPlaylist";
import AssignedDevice from "@/models/AssignDevice";
import "@/models/DeviceTypes"; // Register DeviceType schema for populate

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Username and password are required" },
        { status: 400 }
      );
    }

    const normalizedUsername = username.trim().toLowerCase();

    // Connect to database
    await connectToDatabase();

    // Find user
    const user = await User.findOne({ username: normalizedUsername });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        userName: user.username,
        role: user.role
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: "7d" }
    );

    // --- Fetch Dashboard Data based on role ---
    let dashboard: any = {};
    const userObjectId = new mongoose.Types.ObjectId(user._id);

    // Helper to calculate online status
    const getDeviceStatus = (lastConnection?: Date | null) => {
      if (!lastConnection) return 'offline';
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return new Date(lastConnection) > fiveMinutesAgo ? 'online' : 'offline';
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

    if (user.role === UserRole.Reseller) {
      // Find all customers created by this reseller
      const customers = await Customer.find({ resellerId: userObjectId }, '_id');
      const customerIds = customers.map((c: any) => c._id);
      
      const accountAdmins = await User.find({ role: UserRole.AccountAdmin, customerId: { $in: customerIds } }, 'username email phone companyName location');
      const accountMarketingUsers = await User.find({ role: UserRole.AccountMarketing, customerId: { $in: customerIds } }, 'username email phone companyName');
      const stores = await User.find({ role: UserRole.Store, customerId: { $in: customerIds } }, 'username storeName storeLocation operatorName');

      const orConditions: any[] = [{ resellerId: userObjectId }];
      if (customerIds.length > 0) {
        orConditions.push({ customerId: { $in: customerIds } });
      }
      const devices = await Device.find({ $or: orConditions }).populate('typeId', 'name imageUrl').lean();
      
      const deviceIds = devices.map(d => d._id);
      const assignments = await AssignedDevice.find({ deviceId: { $in: deviceIds } }).populate('userId', 'username storeName storeLocation').lean();

      const mappedDevices = devices.map((d: any) => {
        const assignment: any = assignments.find((a: any) => a.deviceId.toString() === d._id.toString());
        return {
          _id: d._id,
          name: d.name,
          serialNumber: d.serialNumber,
          type: formatDeviceType(d.typeId),
          lastConnection: d.lastConnection,
          status: getDeviceStatus(d.lastConnection),
          connectedStore: assignment && assignment.userId ? assignment.userId : null
        };
      });

      dashboard = {
        section: "Reseller Dashboard",
        accountAdmins,
        accountMarketingUsers,
        stores,
        devices: mappedDevices
      };

    } else if (user.role === UserRole.AccountAdmin) {
      const marketingUsers = await User.find({ role: UserRole.AccountMarketing, customerId: user.customerId }, 'username email phone');
      const stores = await User.find({ role: UserRole.Store, customerId: user.customerId }, 'username storeName storeLocation operatorName');
      
      const devices = await Device.find({ customerId: user.customerId }).populate('typeId', 'name imageUrl').lean();

      const deviceIds = devices.map(d => d._id);
      const assignments = await AssignedDevice.find({ deviceId: { $in: deviceIds } }).populate('userId', 'username storeName storeLocation').lean();

      const mappedDevices = devices.map((d: any) => {
        const assignment: any = assignments.find((a: any) => a.deviceId.toString() === d._id.toString());
        return {
          _id: d._id,
          name: d.name,
          serialNumber: d.serialNumber,
          type: formatDeviceType(d.typeId),
          lastConnection: d.lastConnection,
          status: getDeviceStatus(d.lastConnection),
          connectedStore: assignment && assignment.userId ? assignment.userId : null
        };
      });

      dashboard = {
        section: "Account Admin Dashboard",
        marketingUsers,
        stores,
        devices: mappedDevices
      };

    } else if (user.role === UserRole.AccountMarketing) {
      let availableStores = [];
      if (user.hasAllStoreAccess) {
        availableStores = await User.find({ role: UserRole.Store, customerId: user.customerId }, 'username storeName storeLocation');
      } else {
        // Find stores associated with the same customer if no specific assigned stores property exists
        // This handles cases where Marketing user has limited stores but simplified here to find by controllerId or similar logic.
        availableStores = await User.find({ role: UserRole.Store, customerId: user.customerId }, 'username storeName storeLocation');
      }

      // Check for available campaigns (playlists & announcements)
      const playlists = await PlaylistConfig.find({ 
        $or: [{ userId: userObjectId }, { userId: user.controllerId }, { userId: user.customerId }] 
      }).sort({ createdAt: -1 });

      const announcements = await AnnouncementPlaylist.find({ 
        $or: [{ userId: userObjectId }, { userId: user.controllerId }, { userId: user.customerId }] 
      }).sort({ createdAt: -1 });

      dashboard = {
        section: "Account Marketing Dashboard",
        availableStores,
        campaigns: {
          playlists,
          announcements
        }
      };

    } else if (user.role === UserRole.Store) {
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

      // Playlists for this store
      const playlists = await PlaylistConfig.find({ 
        $or: [{ userId: userObjectId }, { userId: user.controllerId }] 
      }).sort({ createdAt: -1 });

      // Announcements for this store
      const announcements = await AnnouncementPlaylist.find({ 
        $or: [{ userId: userObjectId }, { userId: user.controllerId }] 
      }).sort({ createdAt: -1 });

      dashboard = {
        section: "Store Dashboard",
        assignedDevices,
        playlists,
        announcements
      };
    } else {
      dashboard = { section: "General Dashboard", message: "No specific dashboard for this role" };
    }

    // Build the user payload without password
    const userResponse = {
      id: user._id,
      username: user.username,
      role: user.role,
      storeName: user.storeName,
      storeLocation: user.storeLocation,
      operatorName: user.operatorName,
      phone: user.phone,
      email: user.email,
      companyName: user.companyName,
      location: user.location,
      customerId: user.customerId,
      hasAllStoreAccess: user.hasAllStoreAccess,
    };

    return NextResponse.json(
      {
        success: true,
        message: "Login successful",
        token,
        user: userResponse,
        dashboard
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Mobile API login error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
