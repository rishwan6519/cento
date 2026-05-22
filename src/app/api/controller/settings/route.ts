import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";

export async function GET(request: NextRequest) {
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

    await connectToDatabase();
    
    // Find the logged-in user
    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Default to 60 if not set
    const thresholdMinutes = (user as any).notificationFrequency !== undefined 
      ? (user as any).notificationFrequency 
      : 60;

    return NextResponse.json({
      success: true,
      notificationFrequency: thresholdMinutes
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { notificationFrequency } = body;

    if (notificationFrequency === undefined) {
      return NextResponse.json({ success: false, error: "Missing notificationFrequency" }, { status: 400 });
    }

    const parsed = parseInt(notificationFrequency, 10);
    if (isNaN(parsed) || parsed <= 0) {
      return NextResponse.json({ success: false, error: "Invalid notificationFrequency. Must be a positive integer." }, { status: 400 });
    }

    await connectToDatabase();
    
    const user = await User.findByIdAndUpdate(
      userId,
      { notificationFrequency: parsed },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: "Notification frequency updated successfully",
      notificationFrequency: parsed
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
