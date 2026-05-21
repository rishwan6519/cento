import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/controller/update-fcm-token
//
// Called by the mobile app after login to register the device's FCM token.
// Supports multiple devices (iPad + iPhone) per user.
//
// Headers:
//   Authorization: Bearer <JWT>
//
// Body:
//   { "fcmToken": "eX7k_a1..." }
//
// Response:
//   { "success": true, "message": "FCM token updated" }
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    // Verify JWT
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
      decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { userId } = decoded;

    // Validate body
    const body = await request.json();
    const { fcmToken } = body;

    if (!fcmToken || typeof fcmToken !== "string") {
      return NextResponse.json(
        { success: false, message: "'fcmToken' is required and must be a string" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Add token to the user's fcmTokens array (avoid duplicates)
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { fcmTokens: fcmToken } }, // $addToSet prevents duplicates
      { new: true }
    );

    return NextResponse.json(
      { success: true, message: "FCM token updated" },
      { status: 200 }
    );
  } catch (error) {
    console.error("update-fcm-token error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
