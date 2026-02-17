import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ZoneEvent } from "@/models/ZoneEvent";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Get today's date range in UTC (all timestamps stored are UTC)
    const now = new Date();
    
    // Build today's UTC range: 00:00:00.000Z to 23:59:59.999Z
    const startOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const endOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    console.log("[Hourly API] Querying events from", startOfTodayUTC.toISOString(), "to", endOfTodayUTC.toISOString());

    // Fetch all events for today (UTC)
    const events = await ZoneEvent.find({
      timestamp: {
        $gte: startOfTodayUTC,
        $lte: endOfTodayUTC
      }
    }).lean();

    console.log(`[Hourly API] Found ${events.length} events for today`);

    // Initialize hourly buckets (0-23) with unique person tracking per hour
    const hourlyBuckets: {
      hour: number;
      inIds: Set<number>;
      outIds: Set<number>;
    }[] = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      inIds: new Set<number>(),
      outIds: new Set<number>()
    }));

    // Global unique counters for the entire day
    const dailyUniqueIn = new Set<number>();
    const dailyUniqueOut = new Set<number>();

    // Bucket each event by its UTC hour
    events.forEach((ev: any) => {
      const date = new Date(ev.timestamp);
      const hour = date.getUTCHours(); // Use UTC hours consistently
      const personId = ev.person_id;

      if (personId === undefined || personId === null) return;

      // Track daily unique counts
      if (ev.action === "Entered") dailyUniqueIn.add(personId);
      if (ev.action === "Exited") dailyUniqueOut.add(personId);

      // Track per-hour unique counts
      if (hour >= 0 && hour < 24) {
        if (ev.action === "Entered") {
          hourlyBuckets[hour].inIds.add(personId);
        } else if (ev.action === "Exited") {
          hourlyBuckets[hour].outIds.add(personId);
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
      date: startOfTodayUTC.toISOString().split('T')[0]
    });
  } catch (error: any) {
    console.error("[API ERROR] Hourly stats failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch hourly stats" },
      { status: 500 }
    );
  }
}
