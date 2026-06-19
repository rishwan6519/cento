import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/db";
import PlaylistConfig from "@/models/PlaylistConfig";
import DevicePlaylist from "@/models/ConectPlaylist";
import Device from "@/models/Device";
import User from "@/models/User";
import MediaItem from "@/models/MediaItems";

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized: No token provided" }, { status: 401 });
    }

    const token = authorization.split(" ")[1];

    await connectToDatabase();

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: string;
        userName: string;
        role: string;
      };
    } catch (error) {
      return NextResponse.json({ message: "Unauthorized: Invalid token" }, { status: 401 });
    }

    // Fetch the user to get store details
    const user = await User.findById(decoded.userId).lean();
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const storeDetails = {
      storeName: (user as any).storeName || "",
      storeLocation: (user as any).storeLocation || "",
      operatorName: (user as any).operatorName || "",
      phone: (user as any).phone || "",
      email: (user as any).email || "",
      companyName: (user as any).companyName || "",
      location: (user as any).location || ""
    };

    // Find all schedules (PlaylistConfig) for this user
    const configs = await PlaylistConfig.find({ userId: decoded.userId })
      .populate({ path: 'files.mediaId', model: MediaItem })
      .lean();

    const responseData = [];

    for (const config of configs as any[]) {
      // Map files to include the URL from the populated media item
      if (config.files && Array.isArray(config.files)) {
        config.files = config.files.map((file: any) => {
          const url = file.mediaId?.url || file.path || "";
          return {
            ...file,
            fileUrl: url,
            url: url,
            mediaId: file.mediaId?._id || file.mediaId
          };
        });
      }
      // Try to find the device linked to this playlist
      const devicePlaylists = await DevicePlaylist.find({ playlistIds: config._id })
        .populate('deviceId')
        .lean();

      const devices = [];

      if (devicePlaylists && devicePlaylists.length > 0) {
        for (const dp of devicePlaylists) {
          const deviceId = dp.deviceId as any;
          if (deviceId) {
            devices.push({
              id: deviceId._id,
              serialNumber: deviceId.serialNumber || "N/A",
              name: deviceId.name || "N/A"
            });
          }
        }
      }

      // Fallback: check config.deviceIds if no device playlists were found
      if (devices.length === 0 && config.deviceIds && config.deviceIds.length > 0) {
        const foundDevices = await Device.find({ _id: { $in: config.deviceIds } }).lean();
        for (const device of foundDevices as any[]) {
          devices.push({
            id: device._id,
            serialNumber: device.serialNumber || "N/A",
            name: device.name || "N/A"
          });
        }

        // If they are not object IDs but serial numbers directly stored in deviceIds
        if (foundDevices.length === 0) {
          for (const rawId of config.deviceIds) {
            devices.push({
              id: rawId,
              serialNumber: rawId,
              name: "N/A"
            });
          }
        }
      }

      responseData.push({
        id: config._id,
        name: config.name,
        devices: devices,
        scheduleDays: config.daysOfWeek || [],
        startTime: config.startTime || null,
        endTime: config.endTime || null,
        startDate: config.startDate || null,
        endDate: config.endDate || null,
        allData: config // Included all the raw data as requested
      });
    }

    return NextResponse.json(
      {
        message: "Schedules retrieved successfully",
        storeDetails: storeDetails,
        schedules: responseData
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error fetching schedules:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
