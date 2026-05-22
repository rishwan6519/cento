import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Device from "@/models/Device";
import AssignedDevice from "@/models/AssignDevice";
import User from "@/models/User";
import Customer from "@/models/Customer";
import { sendDeviceOfflineAlert } from "@/lib/firebase-admin";
import { Settings } from "@/models/Settings";

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

    // Fetch offline threshold from settings (default to 60 minutes)
    const thresholdSetting = await Settings.findOne({ key: "device_offline_threshold_minutes" }).lean();
    let thresholdMinutes = 60; // default 1 hour
    if (thresholdSetting && thresholdSetting.value) {
      const parsed = parseInt(thresholdSetting.value, 10);
      if (!isNaN(parsed) && parsed > 0) {
        thresholdMinutes = parsed;
      }
    }

    const OFFLINE_THRESHOLD_MS = thresholdMinutes * 60 * 1000;
    const cutoffTime = new Date(Date.now() - OFFLINE_THRESHOLD_MS);

    // Self-healing: Reset lastNotifiedOffline for devices that are back online
    // (i.e. lastConnection is >= cutoffTime and lastNotifiedOffline is set to non-null value)
    await Device.updateMany(
      {
        lastConnection: { $gte: cutoffTime },
        lastNotifiedOffline: { $ne: null },
      },
      {
        $set: { lastNotifiedOffline: null },
      }
    );

    // Find all devices that have gone offline (lastConnection older than the threshold time)
    // AND either have not been notified yet, OR were notified more than the threshold time ago
    const offlineDevices = await Device.find({
      lastConnection: { $lt: cutoffTime },
      $or: [
        { lastNotifiedOffline: { $exists: false } },
        { lastNotifiedOffline: null },
        { lastNotifiedOffline: { $lt: cutoffTime } },
      ],
    }).lean();

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

      // Collect all users who should be notified
      const usersToNotify = await User.find({
        $or: orConditions,
        fcmTokens: { $exists: true, $not: { $size: 0 } }, // only users with FCM tokens
      }).select("fcmTokens").lean();

      // Flatten all FCM tokens from all relevant users
      const allTokens: string[] = usersToNotify.flatMap(
        (u: any) => u.fcmTokens || []
      );

      if (allTokens.length === 0) continue;

      // Determine if this is a reminder
      const isReminder = !!(device as any).lastNotifiedOffline;

      // Send the offline push notification
      try {
        await sendDeviceOfflineAlert(
          allTokens,
          (device as any).name || (device as any)._id.toString(),
          isReminder
        );
        
        // Mark device as notified with the current time to track next reminder window
        await Device.findByIdAndUpdate((device as any)._id, {
          lastNotifiedOffline: new Date(),
        });
        
        totalNotified++;
      } catch (fcmError) {
        console.error(`Failed to send offline notification for device ${device._id}:`, fcmError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Offline alert sent for ${totalNotified} device(s)`,
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
