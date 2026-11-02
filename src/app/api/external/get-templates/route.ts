function escapeRegex(str: string): string {
  return str.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&");
}
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import VideoTemplate from "@/models/VideoTemplate";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

function formatTemplateItem(t: any, index: number, creator?: any) {
  const tplId = Number(t.templateId) || (10000 + index + 1);
  const otId = t.offertypeId || (t.offer_type && (t.offer_type.id || t.offer_type.offertypeId)) || t.offerType || "INDIVIDUAL_DISCOUNT";
  const otName = t.offertypename || (t.offer_type && (t.offer_type.name || t.offer_type.offertypename)) || t.offerType || "Individual Discount";
  
  const thumbUrl = t.thumbnail_url || t.thumbnail || t.backgroundUrl || "";
  const thumbRel = t.thumbnail || (thumbUrl.startsWith("http") ? thumbUrl.replace(/^https?:\/\/[^\/]+\//, "") : thumbUrl);

  const durationSec = Number(t.videoDuration || t.duration_seconds || t.duration || 10);
  const width = t.base_width || (t.aspectRatio === "9:16" ? 1080 : 1920);
  const height = t.base_height || (t.aspectRatio === "9:16" ? 1920 : 1080);

  const actualUserId = creator?._id ? String(creator._id) : (t.storeUserId ? String(t.storeUserId) : (t.userId ? String(t.userId) : undefined));
  const actualUserName = creator?.storeName || creator?.username || creator?.operatorName || undefined;
  const actualUserEmail = creator?.email || undefined;
  const actualUserRole = creator?.role || undefined;

  const item: any = {
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
    created_at: t.createdAt ? new Date(t.createdAt).toISOString().replace("T", " ").substring(0, 19) : undefined,
  };

  if (actualUserId) {
    item.created_by = actualUserId;
    if (actualUserName || actualUserEmail) {
      item.user = {
        id: actualUserId,
        name: actualUserName,
        email: actualUserEmail,
        role: actualUserRole,
      };
    }
  }

  return item;
}

async function fetchAndFormatTemplates(userId?: string, rawOfferTypeId: string = "ALL") {
  await connectToDatabase();
  const User = (await import("@/models/User")).default;

  const query: any = {
    isDummy: { $ne: true },
  };

  if (userId && userId.trim()) {
    const cleanUid = userId.trim();
    if (mongoose.Types.ObjectId.isValid(cleanUid)) {
      const user = await User.findById(cleanUid).lean();
      const permittedIdsSet = new Set<string>();
      permittedIdsSet.add(cleanUid);

      if (user) {
        if (user.role === 'account_admin' || user.role === 'admin' || user.role === 'superUser') {
          // Account Admin: include their ID and all store accounts under them
          const subUsers = await User.find({
            $or: [
              { _id: user._id },
              { controllerId: user._id },
              { customerId: user._id },
              ...(user.customerId ? [{ customerId: user.customerId }] : []),
              { createdBy: user._id },
            ],
          }).select('_id').lean();
          subUsers.forEach((u: any) => permittedIdsSet.add(String(u._id)));
        } else {
          // Store User: include this store and its controlling account admin + sibling stores
          const adminId = user.controllerId || user.createdBy || user.customerId;
          if (adminId) {
            permittedIdsSet.add(String(adminId));
            const related = await User.find({
              $or: [
                { controllerId: adminId },
                { customerId: adminId },
                { createdBy: adminId },
              ],
            }).select('_id').lean();
            related.forEach((u: any) => permittedIdsSet.add(String(u._id)));
          }
        }
      }

      const permittedObjIds = Array.from(permittedIdsSet).map((id) => new mongoose.Types.ObjectId(id));
      const permittedStrIds = Array.from(permittedIdsSet);

      query.$or = [
        { storeUserId: { $in: permittedObjIds } },
        { storeUserId: { $in: permittedStrIds } },
        { userId: { $in: permittedStrIds } },
        { userId: { $in: permittedObjIds } },
      ];
    } else {
      query.$or = [
        { storeUserId: cleanUid },
        { userId: cleanUid },
      ];
    }
  }

  // Filter by offertypeId if not "ALL"
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

  const dbTemplates = await VideoTemplate.find(query).sort({ templateId: 1, createdAt: -1 }).lean();

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

  // Fetch real creators to avoid any dummy user data
  const creatorIds = dbTemplates
    .map((t: any) => t.storeUserId || t.userId)
    .filter((id: any) => id && mongoose.Types.ObjectId.isValid(String(id)))
    .map((id: any) => new mongoose.Types.ObjectId(String(id)));

  const creators = await User.find({ _id: { $in: creatorIds } }).lean();
  const creatorMap = new Map(creators.map((c: any) => [String(c._id), c]));

  const formattedTemplates = dbTemplates.map((t, idx) =>
    formatTemplateItem(t, idx, creatorMap.get(String(t.storeUserId || t.userId)))
  );

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
