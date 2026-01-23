import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ZoneEvent } from "@/models/ZoneEvent";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Get Today's local date range
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // Fetch all events for today
    const events = await ZoneEvent.find({
      timestamp: {
        $gte: startOfToday,
        $lt: endOfToday
      }
    }).lean();

    // Initialize hourly counts (0-23)
    const hourlyStats = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      in: 0,
      out: 0,
      occupancy: 0
    }));

    // Tracks for Global Unique Counts (Daily)
    const uniqueIn = new Set();
    const uniqueOut = new Set();

    // Group by hour
    events.forEach((ev: any) => {
      const date = new Date(ev.timestamp);
      const hour = date.getHours();
      
      // Track Unique Persons for the Day
      if (ev.action === "Entered") uniqueIn.add(ev.person_id);
      if (ev.action === "Exited") uniqueOut.add(ev.person_id);

      if (hour >= 0 && hour < 24) {
        // Raw Transitions (for Hourly Volume & Occupancy Calculation)
        if (ev.action === "Entered") hourlyStats[hour].in += 1;
        else if (ev.action === "Exited") hourlyStats[hour].out += 1;
      }
    });

    // Calculate Cumulative Occupancy (Raw Net transitions)
    let runningOccupancy = 0;
    for (let i = 0; i < 24; i++) {
        runningOccupancy += (hourlyStats[i].in - hourlyStats[i].out);
        hourlyStats[i].occupancy = Math.max(0, runningOccupancy); // Occupancy cannot be negative
    }

    return NextResponse.json({
      success: true,
      data: hourlyStats,
      todayIn: uniqueIn.size,
      todayOut: uniqueOut.size
    });
  } catch (error: any) {
    console.error("[API ERROR] Hourly stats failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch hourly stats" },
      { status: 500 }
    );
  }
}
