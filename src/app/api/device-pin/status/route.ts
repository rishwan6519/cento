import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import DevicePin from "@/models/DevicePin";

// GET — Check if a PIN has been verified
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pin = searchParams.get("pin");

    if (!pin) {
      return NextResponse.json(
        { success: false, message: "PIN is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const devicePin = await DevicePin.findOne({ pin });

    if (!devicePin) {
      return NextResponse.json(
        { success: false, message: "PIN not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        isVerified: devicePin.isVerified,
      },
    });
  } catch (error) {
    console.error("Error checking PIN status:", error);
    return NextResponse.json(
      { success: false, message: "Failed to check PIN status" },
      { status: 500 }
    );
  }
}
