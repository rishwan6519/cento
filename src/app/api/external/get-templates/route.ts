function escapeRegex(str: string): string {
  return str.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&");
}
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import VideoTemplate from "@/models/VideoTemplate";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

function formatTemplateItem(t: any, index: number) {
  const tplId = Number(t.templateId) || (10000 + index + 1);
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
      const User = (await import("@/models/User")).default;
      const user = await User.findById(cleanUid).lean();
      let permittedIds = [new mongoose.Types.ObjectId(cleanUid)];
      if (user) {
        if (user.role === 'account_admin' || user.role === 'admin') {
          const subUsers = await User.find({
            $or: [
              { _id: user._id },
              { controllerId: user._id },
              ...(user.customerId ? [{ customerId: user.customerId }] : []),
              { createdBy: user._id },
            ],
          }).select('_id').lean();
          permittedIds = subUsers.map((u: any) => u._id);
        } else {
          const adminId = user.controllerId || user.createdBy;
          if (adminId) {
            const related = await User.find({
              $or: [
                { _id: user._id },
                { _id: adminId },
                { controllerId: adminId },
                { createdBy: adminId },
              ],
            }).select('_id').lean();
            permittedIds = related.map((u: any) => u._id);
          }
        }
      }

      const permittedStrIds = permittedIds.map((id) => String(id));
      query.$or = [
        { storeUserId: { $in: permittedIds } },
        { storeUserId: { $in: permittedStrIds } },
        { storeUserId: { $exists: false } },
        { storeUserId: null },
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

  // If user-specific query returned 0 templates, only fallback to global unassigned templates
  if (dbTemplates.length === 0 && userId) {
    const fallbackQuery: any = {
      isDummy: { $ne: true },
      $or: [
        { storeUserId: { $exists: false } },
        { storeUserId: null },
      ],
    };
    if (!isAll) {
      const target = rawOfferTypeId.trim();
      const regex = new RegExp("^" + escapeRegex(target) + "$", "i");
      const otClauses = [
        { offertypeId: target },
        { offertypeId: regex },
        { offerType: target },
        { "offer_type.id": target },
        { "offer_type.offertypeId": target },
      ];
      fallbackQuery.$and = [
        { $or: fallbackQuery.$or },
        { $or: otClauses },
      ];
      delete fallbackQuery.$or;
    }
    dbTemplates = await VideoTemplate.find(fallbackQuery).sort({ templateId: 1, createdAt: -1 }).lean();
  }

  // If 0 templates, return empty array without dummy templates
  if (dbTemplates.length === 0) {
    return {
      success: true,
      message: "OK",
      data: {
        templates: [],
        count: 0,
        offertypeId: (rawOfferTypeId || "ALL").toUpperCase(),
      },
    };
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
