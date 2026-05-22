import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Device from "@/models/Device";
import AssignedDevice from "@/models/AssignDevice";
import User from "@/models/User";
import Customer from "@/models/Customer";
import { sendDeviceOfflineAlert } from "@/lib/firebase-admin";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/controller/check-device-status
//
// Called by a cron job (e.g. every 5 minutes via Vercel Cron or external cron).
// Checks all devices — if any went offline, notifies the relevant users via FCM.
//
// Secure with a secret key in headers: x-cron-secret: <CRON_SECRET>
// Set CRON_SECRET=your_secret in .env.local
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    // Secure the cron endpoint with a secret (supporting both x-cron-secret and standard Vercel Authorization Bearer header)
    const cronSecret = request.headers.get("x-cron-secret");
    const authHeader = request.headers.get("authorization");
    const isVercelCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (cronSecret !== process.env.CRON_SECRET && !isVercelCron) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Self-healing: Reset notifiedUsers and lastNotifiedOffline for devices that are back online (seen within last 5 minutes)
    await Device.updateMany(
      {
        lastConnection: { $gte: fiveMinutesAgo },
        $or: [
          { lastNotifiedOffline: { $ne: null } },
          { notifiedUsers: { $exists: true, $ne: {} } }
        ]
      },
      {
        $set: { lastNotifiedOffline: null, notifiedUsers: {} },
      }
    );

    // Find all devices that have gone offline (lastConnection older than 5 minutes)
    const offlineDevices = await Device.find({
      lastConnection: { $lt: fiveMinutesAgo }
    });

    if (offlineDevices.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All devices are online",
        notified: 0,
      });
    }

    let totalNotified = 0;

    for (const device of offlineDevices) {
      // Find which store this device is assigned to (if any)
      const assignment = await AssignedDevice.findOne({
        deviceId: device._id,
      }).lean();

      // Build the $or conditions dynamically to avoid matching null/undefined fields
      const orConditions = [];

      // 1. Assigned Store
      if (assignment && (assignment as any).userId) {
        orConditions.push({ _id: (assignment as any).userId });
      }

      // 2. Account Admins & Marketing Users under this customer
      if ((device as any).customerId) {
        orConditions.push({
          customerId: (device as any).customerId,
          role: { $in: ["account_admin", "account_marketing"] },
        });
      }

      // 3. Reseller of this device
      let resellerId = (device as any).resellerId;
      if (!resellerId && (device as any).customerId) {
        // Resolve reseller via Customer document if not directly on the device
        const customer: any = await Customer.findById((device as any).customerId).lean();
        if (customer && customer.resellerId) {
          resellerId = customer.resellerId;
        }
      }

      if (resellerId) {
        orConditions.push({
          _id: resellerId,
          role: "reseller",
        });
      }

      if (orConditions.length === 0) continue;

      // Collect all users who should be notified (including their customized notificationFrequency)
      const usersToNotify = await User.find({
        $or: orConditions,
        fcmTokens: { $exists: true, $not: { $size: 0 } }, // only users with FCM tokens
      }).select("fcmTokens notificationFrequency").lean();

      if (usersToNotify.length === 0) continue;

      const tokensToNotify: string[] = [];

      // Ensure notifiedUsers map exists
      if (!device.notifiedUsers) {
        device.notifiedUsers = new Map();
      }

      for (const user of usersToNotify) {
        const thresholdMinutes = user.notificationFrequency !== undefined ? user.notificationFrequency : 60;
        const userCutoffTime = new Date(Date.now() - thresholdMinutes * 60 * 1000);

        // Check if device is offline for this user (i.e. lastConnection is older than their threshold)
        if (device.lastConnection && new Date(device.lastConnection) < userCutoffTime) {
          const lastNotified = device.notifiedUsers.get(user._id.toString());

          // Send notification if not notified yet, OR if the last notification was longer than their threshold ago
          if (!lastNotified || new Date(lastNotified) < userCutoffTime) {
            if (user.fcmTokens && user.fcmTokens.length > 0) {
              tokensToNotify.push(...user.fcmTokens);
            }
            device.notifiedUsers.set(user._id.toString(), new Date());
          }
        }
      }

      if (tokensToNotify.length === 0) continue;

      // Send the offline push notification
      try {
        await sendDeviceOfflineAlert(
          tokensToNotify,
          device.name || device._id.toString(),
          false
        );
        
        // Also update standard lastNotifiedOffline for backward compatibility
        device.lastNotifiedOffline = new Date();
        
        // Save the updated map & notification timestamps
        await device.save();
        
        totalNotified++;
      } catch (fcmError) {
        console.error(`Failed to send offline notification for device ${device._id}:`, fcmError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Offline alert evaluated. Sent notifications to users for ${totalNotified} device(s)`,
      notified: totalNotified,
    });
  } catch (error) {
    console.error("check-device-status error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
