// app/api/assign-apikey/route.ts
import { NextRequest, NextResponse } from "next/server";
import {connectToDatabase} from "@/lib/db"; // your MongoDB connection helper
import ApiKey from "@/models/ApiKey";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { userId, apiKey, assignedBy, status } = body;

    if (!userId || !apiKey || !assignedBy) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if this API key already exists
    const existingKey = await ApiKey.findOne({ apiKey });
    if (existingKey) {
      return NextResponse.json(
        { success: false, message: "API Key already exists" },
        { status: 409 }
      );
    }

    // Assign new API key
    const newKey = await ApiKey.create({
      userId,
      apiKey,
      assignedBy,
      status: status || "active",
    });

    return NextResponse.json({
      success: true,
      message: "API Key assigned successfully",
      data: newKey,
    });
  } catch (err) {
    console.error("Error assigning API Key:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to assign API Key",
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}


export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    let keys;
    if (userId) {
      keys = await ApiKey.find({ userId }).populate("userId", "username role");
    } else {
      keys = await ApiKey.find().populate("userId", "username role");
    }

    return NextResponse.json({
      success: true,
      data: keys,
    });
  } catch (err) {
    console.error("Error fetching API Keys:", err);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch API Keys",
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}