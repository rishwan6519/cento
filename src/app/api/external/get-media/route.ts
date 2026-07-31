import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import MediaItemModel from "@/models/MediaItems";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

// ─── Shared helper to fetch media library items using userId ─────────────────
async function getMediaForUser(userId: string, mediaType?: string, search?: string) {
  try {
    await connectToDatabase();

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, error: "Invalid userId format. Expected a 24-character MongoDB ObjectId." },
        { status: 400 }
      );
    }

    const query: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(userId),
    };

    if (mediaType && mediaType.trim()) {
      query.type = mediaType.trim().toLowerCase();
    }

    let mediaItems: any[] = await MediaItemModel.find(query)
      .sort({ createdAt: -1 })
      .lean();

    if (search && search.trim()) {
      const keyword = search.trim().toLowerCase();
      mediaItems = mediaItems.filter((m) =>
        String(m.name || "").toLowerCase().includes(keyword)
      );
    }

    const responsePayload: Record<string, any> = {
      success: true,
      count: mediaItems.length,
    };

    mediaItems.forEach((item, index) => {
      responsePayload[`media ${index + 1}`] = {
        _id: item._id,
        name: item.name,
        type: item.type,
        url: item.url,
        channels: item.channels || item.socialMedia || [],
        ...(item.metadataId ? { metadataId: item.metadataId } : {}),
        ...(item.offerId ? { offerId: item.offerId } : {}),
        ...(item.approvalStatus ? { approvalStatus: item.approvalStatus } : {}),
        createdAt: item.createdAt,
      };
    });

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("[external/get-media] Error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to fetch media library items" },
      { status: 500 }
    );
  }
}

// ─── GET Handler: e.g. /api/external/get-media?userId=123 ────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || searchParams.get("account") || searchParams.get("storeUserId");
    const type = searchParams.get("type") || searchParams.get("mediaType") || undefined;
    const search = searchParams.get("search") || undefined;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Missing required query parameter 'userId' (e.g., ?userId=YOUR_ID)" },
        { status: 400 }
      );
    }

    return await getMediaForUser(userId, type, search);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Server Error" },
      { status: 500 }
    );
  }
}

// ─── POST Handler: e.g. {"userId": "123"} ───────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.userId || body.account || body.storeUserId;
    const type = body.type || body.mediaType || undefined;
    const search = body.search || undefined;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Missing required property 'userId' in JSON request body" },
        { status: 400 }
      );
    }

    return await getMediaForUser(String(userId), type ? String(type) : undefined, search ? String(search) : undefined);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Server Error" },
      { status: 500 }
    );
  }
}
