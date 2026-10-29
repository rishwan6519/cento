function escapeRegex(str: string): string {
  return str.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&");
}
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import VideoTemplate from "@/models/VideoTemplate";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

function formatTemplateItem(t: any, index: number) {
  const tplId = Number(t.templateId) || (index + 1);
  const otId = t.offertypeId || (t.offer_type && (t.offer_type.id || t.offer_type.offertypeId)) || t.offerType || "INDIVIDUAL_DISCOUNT";
  const otName = t.offertypename || (t.offer_type && (t.offer_type.name || t.offer_type.offertypename)) || t.offerType || "Individual Discount";
  
  const thumbUrl = t.thumbnail_url || t.thumbnail || t.backgroundUrl || "https://video-generator.storesparc.com/uploads/thumbnails/tpl_thumb_default.gif";
  const thumbRel = t.thumbnail || (thumbUrl.startsWith("http") ? thumbUrl.replace(/^https?:\/\/[^\/]+\//, "") : thumbUrl);

  const durationSec = Number(t.videoDuration || t.duration_seconds || t.duration || 10);
  const width = t.base_width || (t.aspectRatio === "9:16" ? 1080 : 1920);
  const height = t.base_height || (t.aspectRatio === "9:16" ? 1920 : 1080);

  return {
    id: tplId,
    name: t.templateName || `template-${tplId}`,
    status: t.status === "Inactive" ? "inactive" : "approved",
    base_width: width,
    base_height: height,
    duration_seconds: durationSec,
    fps: t.fps || 30,
    engine: t.engine || "custom",
    is_custom_layout: true,
    offer_type: {
      id: otId,
      name: otName,
      offertypeId: otId,
      offertypename: otName,
    },
    offertypeId: otId,
    offertypename: otName,
    thumbnail: thumbRel,
    thumbnail_url: thumbUrl,
    created_by: 1,
    created_at: t.createdAt ? new Date(t.createdAt).toISOString().replace("T", " ").substring(0, 19) : "2026-09-29 03:46:02",
    user: {
      id: 1,
      name: "StoreSparc Demo",
      email: "demo@storesparc.local",
      role: "admin",
    },
  };
}

async function fetchAndFormatTemplates(userId?: string, rawOfferTypeId: string = "ALL") {
  await connectToDatabase();

  const query: any = {
    isDummy: { $ne: true },
  };

  if (userId && userId.trim()) {
    const cleanUid = userId.trim();
    if (mongoose.Types.ObjectId.isValid(cleanUid)) {
      query.$or = [
        { storeUserId: new mongoose.Types.ObjectId(cleanUid) },
        { storeUserId: cleanUid },
        { userId: cleanUid },
      ];
    } else {
      query.$or = [
        { storeUserId: cleanUid },
        { userId: cleanUid },
      ];
    }
  }

  // Filter by offertypeId if not "all"
  const isAll = !rawOfferTypeId || rawOfferTypeId.toUpperCase() === "ALL";
  if (!isAll) {
    const target = rawOfferTypeId.trim();
    const regex = new RegExp("^" + escapeRegex(target) + "$", "i");
    const friendlyName = target.replace(/_/g, " ");
    const friendlyRegex = new RegExp("^" + escapeRegex(friendlyName) + "$", "i");

    const otClause = [
      { offertypeId: target },
      { offertypeId: regex },
      { offerType: target },
      { offerType: friendlyRegex },
      { offertypename: friendlyRegex },
      { "offer_type.id": target },
      { "offer_type.offertypeId": target },
      { "offer_type.name": friendlyRegex },
      { "offer_type.offertypename": friendlyRegex },
    ];

    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: otClause }];
      delete query.$or;
    } else {
      query.$or = otClause;
    }
  }

  let dbTemplates = await VideoTemplate.find(query).sort({ templateId: 1, createdAt: -1 }).lean();

  // If user-specific query returned 0 templates, fetch all active templates
  if (dbTemplates.length === 0 && userId) {
    const fallbackQuery: any = { isDummy: { $ne: true } };
    if (!isAll) {
      const target = rawOfferTypeId.trim();
    const regex = new RegExp("^" + escapeRegex(target) + "$", "i");
      fallbackQuery.$or = [
        { offertypeId: target },
        { offertypeId: regex },
        { offerType: target },
        { "offer_type.id": target },
        { "offer_type.offertypeId": target },
      ];
    }
    dbTemplates = await VideoTemplate.find(fallbackQuery).sort({ templateId: 1, createdAt: -1 }).lean();
  }

  // If still 0, provide default template #1 formatted as requested
  if (dbTemplates.length === 0) {
    const defId = isAll ? "INDIVIDUAL_DISCOUNT" : rawOfferTypeId.trim();
    dbTemplates = [
      {
        templateId: 1,
        templateName: "test-template",
        status: "approved",
        videoDuration: 12,
        fps: 30,
        aspectRatio: "16:9",
        offertypeId: defId,
        offertypename: defId.replace(/_/g, " "),
        thumbnail: "uploads/thumbnails/tpl_thumb_20260929034601_9285db.gif",
        thumbnail_url: "https://video-generator.storesparc.com/uploads/thumbnails/tpl_thumb_20260929034601_9285db.gif",
        createdAt: new Date(),
      } as any,
    ];
  }

  const formattedTemplates = dbTemplates.map((t, idx) => formatTemplateItem(t, idx));

  return {
    success: true,
    message: "OK",
    data: {
      templates: formattedTemplates,
      count: formattedTemplates.length,
      offertypeId: (rawOfferTypeId || "ALL").toUpperCase(),
    },
  };
}

// GET /api/external/get-templates?userId=...&offertypeId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || undefined;
    const rawOfferType = searchParams.get("offertypeId") || searchParams.get("offer_type") || searchParams.get("offertype") || "ALL";

    const result = await fetchAndFormatTemplates(userId, rawOfferType);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[GET /api/external/get-templates] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/external/get-templates
// Body: { "userId": "...", "offertypeId": "all" | "INDIVIDUAL_DISCOUNT" }
export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const userId = body.userId || body.user_id || body.storeUserId || undefined;
    const rawOfferType = body.offertypeId !== undefined ? body.offertypeId : (body.offer_type || body.offertype || "ALL");

    const result = await fetchAndFormatTemplates(userId, String(rawOfferType || "ALL"));
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[POST /api/external/get-templates] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Server Error" },
      { status: 500 }
    );
  }
}
