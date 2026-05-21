import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Device from "@/models/Device";
import AssignedDevice from "@/models/AssignDevice";
import User from "@/models/User";
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
    // Secure the cron endpoint with a secret
    const cronSecret = request.headers.get("x-cron-secret");
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const OFFLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
    const cutoffTime = new Date(Date.now() - OFFLINE_THRESHOLD_MS);

    // Find all devices that have gone offline (lastConnection older than 5 min)
    const offlineDevices = await Device.find({
      lastConnection: { $lt: cutoffTime },
      lastNotifiedOffline: { $exists: false }, // Not yet notified
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
      // Find which store this device is assigned to
      const assignment = await AssignedDevice.findOne({
        deviceId: device._id,
      }).lean();

      if (!assignment) continue;

      // Build the $or conditions dynamically to avoid matching null/undefined fields
      const orConditions = [];

      if ((assignment as any).userId) {
        orConditions.push({ _id: (assignment as any).userId }); // assigned store
      }

      if ((device as any).customerId) {
        orConditions.push({
          customerId: (device as any).customerId,
          role: { $in: ["account_admin", "account_marketing"] },
        });
      }

      if ((device as any).resellerId) {
        orConditions.push({
          resellerId: (device as any).resellerId,
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

      // Send the offline push notification
      await sendDeviceOfflineAlert(allTokens, (device as any).name || (device as any)._id.toString());

      // Mark device as notified to avoid repeated alerts
      await Device.findByIdAndUpdate((device as any)._id, {
        lastNotifiedOffline: new Date(),
      });

      totalNotified++;
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
