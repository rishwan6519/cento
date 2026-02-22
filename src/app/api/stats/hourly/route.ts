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
      inIds: Set<string>;
      outIds: Set<string>;
    }[] = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      inIds: new Set<string>(),
      outIds: new Set<string>()
    }));

    // Global unique counters for the entire day
    const dailyUniqueIn = new Set<string>();
    const dailyUniqueOut = new Set<string>();

    // Bucket each event by its (Local) hour
    events.forEach((ev: any) => {
      const date = new Date(ev.timestamp);
      const hour = date.getHours(); // Use Local hours
      const personId = ev.person_id;
      const camId = ev.metadata?.camera_id || 'unknown';
      const key = `${camId}-${personId}`;

      if (personId === undefined || personId === null) return;

      // Track daily unique counts
      if (ev.action === "Entered") dailyUniqueIn.add(key);
      if (ev.action === "Exited") dailyUniqueOut.add(key);

      // Track per-hour unique counts
      if (hour >= 0 && hour < 24) {
        if (ev.action === "Entered") {
          hourlyBuckets[hour].inIds.add(key);
        } else if (ev.action === "Exited") {
          hourlyBuckets[hour].outIds.add(key);
        }
      }
    });

    // Build the final hourly stats with unique counts + cumulative occupancy
    let runningOccupancy = 0;
    const hourlyStats = hourlyBuckets.map((bucket) => {
      const uniqueIn = bucket.inIds.size;
      const uniqueOut = bucket.outIds.size;
      runningOccupancy += (uniqueIn - uniqueOut);

      return {
        hour: bucket.hour,
        in: uniqueIn,
        out: uniqueOut,
        occupancy: Math.max(0, runningOccupancy)
      };
    });

    return NextResponse.json({
      success: true,
      data: hourlyStats,
      todayIn: dailyUniqueIn.size,
      todayOut: dailyUniqueOut.size,
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
