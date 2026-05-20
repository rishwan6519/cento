import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import DeviceController from "@/models/DeviceController";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/controller/device-controller?deviceId=<deviceId>
//
// No auth required – devices poll this endpoint directly.
//
// Returns the current reset status for the given device.
//
// Response:
// {
//   "success": true,
//   "data": {
//     "deviceId": "SN-001",
//     "deviceReset": 0    // 0 = no reset pending, 1 = reset requested
//   }
// }
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId");

    if (!deviceId) {
      return NextResponse.json(
        { success: false, message: "'deviceId' query parameter is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const controller = await DeviceController.findOne({ deviceId }).lean();

    return NextResponse.json(
      {
        success: true,
        data: {
          deviceId,
          deviceReset: controller ? controller.deviceReset : 0,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("device-controller GET error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/controller/device-controller
//
// No auth required – devices or internal services call this directly.
//
// Sets the deviceReset flag for a specific device.
//
// Body:
// {
//   "deviceId": "SN-001",   // required
//   "deviceReset": 1        // required – 0 (clear) or 1 (trigger reset)
// }
//
// Response:
// {
//   "success": true,
//   "message": "Device reset flag updated",
//   "data": {
//     "deviceId": "SN-001",
//     "deviceReset": 1
//   }
// }
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceId, deviceReset } = body;

    if (!deviceId || typeof deviceId !== "string") {
      return NextResponse.json(
        { success: false, message: "'deviceId' is required and must be a string" },
        { status: 400 }
      );
    }

    if (deviceReset !== 0 && deviceReset !== 1) {
      return NextResponse.json(
        { success: false, message: "'deviceReset' must be 0 or 1" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const updated = await DeviceController.findOneAndUpdate(
      { deviceId },
      { deviceReset },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return NextResponse.json(
      {
        success: true,
        message: "Device reset flag updated",
        data: {
          deviceId: updated!.deviceId,
          deviceReset: updated!.deviceReset,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("device-controller POST error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
