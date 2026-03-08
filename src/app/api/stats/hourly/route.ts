import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { ZoneEvent } from "@/models/ZoneEvent";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const cameraId = searchParams.get('cameraId');
    const intervalStr = searchParams.get('interval') || '1h'; // 5m, 15m, 30m, 1h, 1d
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const startTimeParam = searchParams.get('startTime') || '00:00';
    const endTimeParam = searchParams.get('endTime') || '23:59';

    const now = new Date();
    let startDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    let endDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (startDateParam && endDateParam) {
        startDateTime = new Date(`${startDateParam}T${startTimeParam}:00`);
        endDateTime = new Date(`${endDateParam}T${endTimeParam}:59.999`);
    }

    console.log("[Stats API] Querying events from", startDateTime.toString(), "to", endDateTime.toString(), "interval:", intervalStr, "cameraId:", cameraId || 'ALL');

    const query: any = {
      timestamp: {
        $gte: startDateTime,
        $lte: endDateTime
      }
    };
    if (cameraId && cameraId !== 'all') {
      query["metadata.camera_id"] = cameraId;
    }

    // Fetch matching events
    const events = await ZoneEvent.find(query).lean();

    console.log(`[Stats API] Found ${events.length} events for query`);

    // Parse interval to milliseconds
    let intervalMs = 60 * 60 * 1000; // 1 hour default
    if (intervalStr === '5m') intervalMs = 5 * 60 * 1000;
    else if (intervalStr === '15m') intervalMs = 15 * 60 * 1000;
    else if (intervalStr === '30m') intervalMs = 30 * 60 * 1000;
    else if (intervalStr === '1h') intervalMs = 60 * 60 * 1000;
    else if (intervalStr === '1d') intervalMs = 24 * 60 * 60 * 1000;

    // Create buckets
    const startMs = startDateTime.getTime();
    const endMs = endDateTime.getTime();
    
    // Safety check - maximum 1000 buckets to prevent memory issues for huge ranges
    let actualIntervalMs = intervalMs;
    if ((endMs - startMs) / actualIntervalMs > 2000) {
        // Fallback to daily if difference is too huge
        actualIntervalMs = 24 * 60 * 60 * 1000;
    }

    const numBuckets = Math.max(1, Math.ceil((endMs - startMs) / actualIntervalMs));
    const buckets: { label: string; hour: string | number; inCount: number; outCount: number; timeMs: number }[] = [];

    for (let i = 0; i < numBuckets; i++) {
        const bucketStartMs = startMs + i * actualIntervalMs;
        const bucketDate = new Date(bucketStartMs);
        
        let label = '';
        let hourLabel: string | number = bucketDate.getHours();
        
        if (actualIntervalMs >= 24 * 60 * 60 * 1000) {
            label = `${bucketDate.getMonth()+1}/${bucketDate.getDate()}`;
            hourLabel = label;
        } else {
            const h = bucketDate.getHours();
            const m = bucketDate.getMinutes();
            const ampm = h >= 12 ? 'PM' : 'AM';
            const hr12 = h % 12 || 12;
            const mStr = m.toString().padStart(2, '0');
            if (actualIntervalMs === 60 * 60 * 1000) {
                label = `${hr12} ${ampm}`;
            } else {
                label = `${hr12}:${mStr} ${ampm}`;
                hourLabel = label;
            }
        }
        
        buckets.push({
            label,
            hour: hourLabel, 
            inCount: 0,
            outCount: 0,
            timeMs: bucketStartMs
        });
    }

    let dailyIn = 0;
    let dailyOut = 0;

    events.forEach((ev: any) => {
        const evMs = new Date(ev.timestamp).getTime();
        const bucketIndex = Math.floor((evMs - startMs) / actualIntervalMs);

        if (ev.action === "Entered") dailyIn++;
        if (ev.action === "Exited") dailyOut++;

        if (bucketIndex >= 0 && bucketIndex < buckets.length) {
            if (ev.action === "Entered") buckets[bucketIndex].inCount++;
            else if (ev.action === "Exited") buckets[bucketIndex].outCount++;
        }
    });

    let runningOccupancy = 0;
    const stats = buckets.map(b => {
        runningOccupancy += (b.inCount - b.outCount);
        return {
            hour: b.hour, // Frontend uses this for tooltip/summary
            label: b.label, // New display label
            in: b.inCount,
            out: b.outCount,
            occupancy: Math.max(0, runningOccupancy)
        };
    });

    return NextResponse.json({
      success: true,
      data: stats,
      todayIn: dailyIn,
      todayOut: dailyOut,
      totalEvents: events.length
    });
  } catch (error: any) {
    console.error("[API ERROR] Hourly stats failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
