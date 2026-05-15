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

    // --- Fetch Dashboard Data based on role ---
    let dashboard: any = {};
    const userObjectId = user._id;

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

      // --- Account Admins enriched with their stores ---
      const rawAccountAdmins = await User.find(
        { role: UserRole.AccountAdmin, customerId: { $in: customerIds } },
        'username email phone companyName location customerId'
      ).lean();

      const accountAdmins = await Promise.all(
        rawAccountAdmins.map(async (admin: any) => {
          const adminStores = await User.find(
            { role: UserRole.Store, customerId: admin.customerId },
            'username storeName storeLocation operatorName'
          ).lean();
          return { ...admin, stores: adminStores };
        })
      );

      // --- Account Marketing Users enriched with their assigned store ---
      const rawMarketingUsers = await User.find(
        { role: UserRole.AccountMarketing, customerId: { $in: customerIds } },
        'username email phone companyName hasAllStoreAccess assignedStoreId customerId'
      ).lean();

      const accountMarketingUsers = await Promise.all(
        rawMarketingUsers.map(async (mu: any) => {
          let assignedStore = null;
          if (mu.hasAllStoreAccess) {
            // Has access to all stores under the same customer
            assignedStore = await User.find(
              { role: UserRole.Store, customerId: mu.customerId },
              'username storeName storeLocation operatorName'
            ).lean();
          } else if (mu.assignedStoreId) {
            assignedStore = await User.findById(
              mu.assignedStoreId,
              'username storeName storeLocation operatorName'
            ).lean();
          }
          return { ...mu, assignedStore };
        })
      );

      // All stores under the reseller's customers (flat list)
      const stores = await User.find(
        { role: UserRole.Store, customerId: { $in: customerIds } },
        'username storeName storeLocation operatorName'
      ).lean();

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
      // Stores created under this admin's customer
      const stores = await User.find(
        { role: UserRole.Store, customerId: user.customerId },
        'username storeName storeLocation operatorName'
      ).lean();

      // Marketing users enriched with their assigned store
      const rawMarketingUsers = await User.find(
        { role: UserRole.AccountMarketing, customerId: user.customerId },
        'username email phone hasAllStoreAccess assignedStoreId'
      ).lean();

      const marketingUsers = await Promise.all(
        rawMarketingUsers.map(async (mu: any) => {
          let assignedStore = null;
          if (mu.hasAllStoreAccess) {
            assignedStore = stores; // all stores under this admin
          } else if (mu.assignedStoreId) {
            assignedStore = await User.findById(
              mu.assignedStoreId,
              'username storeName storeLocation operatorName'
            ).lean();
          }
          return { ...mu, assignedStore };
        })
      );

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
        stores,
        marketingUsers,
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

    return NextResponse.json(
      {
        success: true,
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
