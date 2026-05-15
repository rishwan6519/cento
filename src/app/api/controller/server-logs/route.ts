import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import ServerLog from "@/models/ServerLog";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/controller/server-logs
//
// Called by the device (NO token required).
// Saves the log batch to MongoDB. MongoDB's TTL index on the ServerLog
// collection automatically deletes records older than 7 days.
//
// Body:
// {
//   "serialNumber": "SN-001",                      // required
//   "logs": ["log line 1", "log line 2", ...],     // required – array of strings
//   "currentlyPlaying": "Morning Playlist" | null  // optional – defaults to null
// }
//
// Response:
// {
//   "success": true,
//   "message": "Logs saved",
//   "data": {
//     "id": "<mongo _id>",
//     "serialNumber": "SN-001",
//     "logs": ["log line 1", "log line 2"],
//     "currentlyPlaying": null,
//     "receivedAt": "2026-05-15T04:00:00.000Z"
//   }
// }
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { serialNumber, logs, currentlyPlaying = null } = body;

    // ── Validate serialNumber ────────────────────────────────────────────────
    if (!serialNumber || typeof serialNumber !== "string") {
      return NextResponse.json(
        { success: false, message: "'serialNumber' is required and must be a string" },
        { status: 400 }
      );
    }

    // ── Validate logs ────────────────────────────────────────────────────────
    if (!Array.isArray(logs)) {
      return NextResponse.json(
        { success: false, message: "'logs' must be an array of strings" },
        { status: 400 }
      );
    }

    const hasInvalidEntry = logs.some((entry: unknown) => typeof entry !== "string");
    if (hasInvalidEntry) {
      return NextResponse.json(
        { success: false, message: "Each entry in 'logs' must be a string" },
        { status: 400 }
      );
    }

    // ── Validate currentlyPlaying ────────────────────────────────────────────
    if (currentlyPlaying !== null && typeof currentlyPlaying !== "string") {
      return NextResponse.json(
        { success: false, message: "'currentlyPlaying' must be a string or null" },
        { status: 400 }
      );
    }

    // ── Persist to MongoDB ───────────────────────────────────────────────────
    await connectToDatabase();

    const logEntry = await ServerLog.create({
      serialNumber: serialNumber.trim(),
      logs,
      currentlyPlaying,
      receivedAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Logs saved",
        data: {
          id: logEntry._id,
          serialNumber: logEntry.serialNumber,
          logs: logEntry.logs,
          currentlyPlaying: logEntry.currentlyPlaying,
          receivedAt: logEntry.receivedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Controller server-logs POST error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/controller/server-logs?serialNumber=<SN>&limit=50&page=1
//
// Retrieve stored logs. No token required.
// Results are sorted newest-first.
//
// Query params:
//   serialNumber  – optional, filter by device serial number
//   limit         – optional, number of records per page (default 50, max 200)
//   page          – optional, 1-based page number (default 1)
//
// Response:
// {
//   "success": true,
//   "total": 120,
//   "page": 1,
//   "limit": 50,
//   "data": [
//     {
//       "id": "...",
//       "serialNumber": "SN-001",
//       "logs": ["..."],
//       "currentlyPlaying": null,
//       "receivedAt": "2026-05-15T04:00:00.000Z"
//     },
//     ...
//   ]
// }
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const serialNumber = searchParams.get("serialNumber") ?? undefined;
    const rawLimit     = parseInt(searchParams.get("limit") ?? "50", 10);
    const rawPage      = parseInt(searchParams.get("page")  ?? "1",  10);

    const limit = Math.min(Math.max(rawLimit, 1), 200); // clamp 1–200
    const page  = Math.max(rawPage, 1);
    const skip  = (page - 1) * limit;

    // Build filter
    const filter: Record<string, unknown> = {};
    if (serialNumber) filter.serialNumber = serialNumber.trim();

    await connectToDatabase();

    const [total, records] = await Promise.all([
      ServerLog.countDocuments(filter),
      ServerLog.find(filter)
        .sort({ receivedAt: -1 }) // newest first
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const data = records.map((r: any) => ({
      id:               r._id,
      serialNumber:     r.serialNumber,
      logs:             r.logs,
      currentlyPlaying: r.currentlyPlaying ?? null,
      receivedAt:       r.receivedAt,
    }));

    return NextResponse.json(
      {
        success: true,
        total,
        page,
        limit,
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Controller server-logs GET error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
