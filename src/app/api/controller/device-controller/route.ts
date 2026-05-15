import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/db";
import DeviceController from "@/models/DeviceController";

// ─────────────────────────────────────────────────────────────────────────────
// Auth helper – verifies Bearer JWT and returns the decoded payload or null
// ─────────────────────────────────────────────────────────────────────────────
function verifyToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.split(" ")[1];
  try {
    return jwt.verify(token, process.env.JWT_SECRET || "fallback_secret") as {
      userId: string;
      role: string;
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/mobile/device-controller?deviceId=<deviceId>
//
// Returns the current controller status for the given device.
//
// Response:
// {
//   "success": true,
//   "data": {
//     "deviceId": "SN-001",
//     "deviceReset": 0          // 0 = no action pending, 1 = reset requested
//   }
// }
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const decoded = verifyToken(request);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: "Missing or invalid token" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get("deviceId");

    if (!deviceId) {
      return NextResponse.json(
        { success: false, message: "'deviceId' query parameter is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find or return a default record (deviceReset = 0) without creating one
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
    console.error("Mobile API device-controller GET error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/mobile/device-controller
//
// Sets the deviceReset flag for a specific device.
//
// Body:
// {
//   "deviceId": "SN-001",       // required
//   "deviceReset": 1            // required – 0 or 1
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
    const decoded = verifyToken(request);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: "Missing or invalid token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { deviceId, deviceReset } = body;

    // Validate deviceId
    if (!deviceId || typeof deviceId !== "string") {
      return NextResponse.json(
        { success: false, message: "'deviceId' is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate deviceReset value
    if (deviceReset !== 0 && deviceReset !== 1) {
      return NextResponse.json(
        { success: false, message: "'deviceReset' must be 0 or 1" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Upsert: create the record if it doesn't exist, otherwise update it
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
    console.error("Mobile API device-controller POST error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
