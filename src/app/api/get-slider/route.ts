import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import AssignedSlider from "@/models/AssignedSlider";
import Slider from "@/models/Slider";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const userId = req.nextUrl.searchParams.get("userId"); // optional
    const deviceId = req.nextUrl.searchParams.get("deviceId"); // optional

    if (!userId && !deviceId) {
      return NextResponse.json(
        { success: false, message: "Provide userId or deviceId" },
        { status: 400 }
      );
    }

    // Build query
    const query: any = { status: "active" };
    if (userId) query.userId = new mongoose.Types.ObjectId(userId);
    if (deviceId) query.deviceId = new mongoose.Types.ObjectId(deviceId);

    // Fetch assigned sliders and populate slider info
    const assignedSliders = await AssignedSlider.find(query)
      .populate({
        path: "sliderId",
        model: Slider,
        select: "_id sliderName sliders",
      })
      .sort({ assignedAt: -1 });

    return NextResponse.json({
      success: true,
      data: assignedSliders,
    });
  } catch (error) {
    console.error("Error fetching assigned sliders:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch assigned sliders" },
      { status: 500 }
    );
  }
}
