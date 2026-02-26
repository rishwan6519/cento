import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ZoneEvent } from "@/models/ZoneEvent";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Get today's date range in UTC (all timestamps stored are UTC)
    // Get today's local date range
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    console.log("[Hourly API] Querying events from", startOfToday.toString(), "to", endOfToday.toString());

    // Fetch all events for today
    const events = await ZoneEvent.find({
      timestamp: {
        $gte: startOfToday,
        $lte: endOfToday
      }
    }).lean();

    console.log(`[Hourly API] Found ${events.length} events for today`);

    // Initialize hourly buckets (0-23)
    const hourlyBuckets: {
      hour: number;
      inCount: number;
      outCount: number;
    }[] = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      inCount: 0,
      outCount: 0
    }));

    // Global counters for the entire day
    let dailyIn = 0;
    let dailyOut = 0;

    // Bucket each event by its (Local) hour
    events.forEach((ev: any) => {
      const date = new Date(ev.timestamp);
      const hour = date.getHours(); // Use Local hours

      // Track daily counts
      if (ev.action === "Entered") dailyIn++;
      if (ev.action === "Exited") dailyOut++;

      // Track per-hour counts
      if (hour >= 0 && hour < 24) {
        if (ev.action === "Entered") {
          hourlyBuckets[hour].inCount++;
        } else if (ev.action === "Exited") {
          hourlyBuckets[hour].outCount++;
        }
      }
    });

    // Build the final hourly stats with counts + cumulative occupancy
    let runningOccupancy = 0;
    const hourlyStats = hourlyBuckets.map((bucket) => {
      const totalIn = bucket.inCount;
      const totalOut = bucket.outCount;
      runningOccupancy += (totalIn - totalOut);

      return {
        hour: bucket.hour,
        in: totalIn,
        out: totalOut,
        occupancy: Math.max(0, runningOccupancy)
      };
    });

    return NextResponse.json({
      success: true,
      data: hourlyStats,
      todayIn: dailyIn,
      todayOut: dailyOut,
      totalEvents: events.length,
      date: `${startOfToday.getFullYear()}-${String(startOfToday.getMonth() + 1).padStart(2, '0')}-${String(startOfToday.getDate()).padStart(2, '0')}`
    });
  } catch (error: any) {
    console.error("[API ERROR] Hourly stats failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch hourly stats" },
      { status: 500 }
    );
  }
}
