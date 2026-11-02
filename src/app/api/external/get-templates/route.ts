function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import VideoTemplate from "@/models/VideoTemplate";
import { ensureTemplatePreviewGifs } from "@/lib/templatePreviewGif";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

function formatTemplateItem(t: any, index: number, creator?: any, baseUrl: string = "https://iot-test.metizstoresparc.com") {
  // Use actual templateId from DB if present and valid (>= 1000); otherwise upgrade legacy sequential ID (like 1, 2)
  let tplId = Number(t.templateId);
  if (!tplId || isNaN(tplId) || tplId < 1000) {
    if (tplId && tplId > 0 && tplId < 1000) {
      tplId = 10000 + tplId;
    } else {
      tplId = 10000 + index + 1;
    }
  }

  const otId = t.offertypeId || (t.offer_type && (t.offer_type.id || t.offer_type.offertypeId)) || t.offerType || "INDIVIDUAL_DISCOUNT";
  const otName = t.offertypename || (t.offer_type && (t.offer_type.name || t.offer_type.offertypename)) || t.offerType || "Individual Discount";
  
  // Ensure animated GIF preview files exist on disk and get direct URLs with current domain
  const { preview_16_9: rel169, preview_9_16: rel916 } = ensureTemplatePreviewGifs({ ...t, templateId: tplId });
  const preview169 = `${baseUrl}${rel169}`;
  const preview916 = `${baseUrl}${rel916}`;

  const durationSec = Number(t.videoDuration || t.duration_seconds || t.duration || 10);
  const width = t.base_width || (t.aspectRatio === "9:16" ? 1080 : 1920);
  const height = t.base_height || (t.aspectRatio === "9:16" ? 1920 : 1080);

  const actualUserId = creator?._id ? String(creator._id) : (t.storeUserId ? String(t.storeUserId) : (t.userId ? String(t.userId) : undefined));
  const actualUserName = creator?.storeName || creator?.username || creator?.operatorName || undefined;
  const actualUserEmail = creator?.email || undefined;
  const actualUserRole = creator?.role || undefined;

  const item: any = {
    id: tplId,
    template_id: tplId,
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
    preview_16_9: preview169,
    preview_9_16: preview916,
    preview_url: preview169,
    thumbnail: preview169,
    thumbnail_url: preview169,
    aspectBackgrounds: t.aspectBackgrounds || {},
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

async function fetchAndFormatTemplates(userId?: string, rawOfferTypeId: string = "ALL", baseUrl: string = "https://iot-test.metizstoresparc.com") {
  await connectToDatabase();
  const User = (await import("@/models/User")).default;

  const query: any = {
    isDummy: { $ne: true },
  };

  if (userId && userId.trim() && userId.trim().toUpperCase() !== "ALL") {
    const cleanUid = userId.trim();
    const permittedIdsSet = new Set<string>();
    permittedIdsSet.add(cleanUid);

    // Look up the requested user (support both ObjectId and string ID)
    let user: any = null;
    if (mongoose.Types.ObjectId.isValid(cleanUid)) {
      user = await User.findById(cleanUid).lean();
    }
    if (!user) {
      user = await User.findOne({ $or: [{ _id: cleanUid }, { username: cleanUid }, { email: cleanUid }] }).lean();
    }

    if (user) {
      permittedIdsSet.add(String(user._id));
      const uidObj = mongoose.Types.ObjectId.isValid(String(user._id)) ? new mongoose.Types.ObjectId(String(user._id)) : null;
      const uidStr = String(user._id);

      // Robust hierarchy search across account admin, store, and customer IDs (both ObjectId & String)
      const userConditions: any[] = [
        { _id: uidStr },
        { controllerId: uidStr },
        { createdBy: uidStr },
      ];
      if (uidObj) {
        userConditions.push(
          { _id: uidObj },
          { controllerId: uidObj },
          { createdBy: uidObj }
        );
      }
      if (user.customerId) {
        userConditions.push({ customerId: user.customerId }, { customerId: String(user.customerId) });
        if (mongoose.Types.ObjectId.isValid(String(user.customerId))) {
          userConditions.push({ customerId: new mongoose.Types.ObjectId(String(user.customerId)) });
        }
      }
      if (user.controllerId) {
        userConditions.push(
          { _id: user.controllerId },
          { _id: String(user.controllerId) },
          { controllerId: user.controllerId },
          { controllerId: String(user.controllerId) }
        );
        if (mongoose.Types.ObjectId.isValid(String(user.controllerId))) {
          const parentAdminObj = new mongoose.Types.ObjectId(String(user.controllerId));
          userConditions.push({ _id: parentAdminObj }, { controllerId: parentAdminObj });
        }
      }
      if (user.createdBy) {
        userConditions.push({ _id: user.createdBy }, { _id: String(user.createdBy) });
        userConditions.push({ createdBy: user.createdBy }, { createdBy: String(user.createdBy) });
      }

      const linkedUsers = await User.find({ $or: userConditions }).select("_id customerId controllerId createdBy").lean();
      linkedUsers.forEach((u: any) => {
        permittedIdsSet.add(String(u._id));
        if (u.controllerId) permittedIdsSet.add(String(u.controllerId));
        if (u.createdBy) permittedIdsSet.add(String(u.createdBy));
      });
    }

    const permittedObjIds = Array.from(permittedIdsSet)
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    const permittedStrIds = Array.from(permittedIdsSet);

    query.$or = [
      { storeUserId: { $in: permittedObjIds } },
      { storeUserId: { $in: permittedStrIds } },
      { userId: { $in: permittedStrIds } },
      { userId: { $in: permittedObjIds } },
      { createdBy: { $in: permittedStrIds } },
      { createdBy: { $in: permittedObjIds } },
    ];
  }

  // Filter by offertypeId if not "ALL"
  const isAll = !rawOfferTypeId || rawOfferTypeId.toUpperCase() === "ALL";
  if (!isAll) {
    const target = rawOfferTypeId.trim();
    const regex = new RegExp("^" + escapeRegex(target) + "$", "i");
    const friendlyName = target.replace(/_/g, " ");
    const friendlyRegex = new RegExp("^" + escapeRegex(friendlyName) + "$", "i");
    const looseRegex = new RegExp(escapeRegex(target).replace(/_/g, "[_\\s]"), "i");

    const otClause = [
      { offertypeId: target },
      { offertypeId: regex },
      { offertypeId: looseRegex },
      { offerType: target },
      { offerType: regex },
      { offerType: friendlyRegex },
      { offerType: looseRegex },
      { offertypename: regex },
      { offertypename: friendlyRegex },
      { "offer_type.id": target },
      { "offer_type.id": regex },
      { "offer_type.offertypeId": target },
      { "offer_type.offertypeId": regex },
      { "offer_type.name": regex },
      { "offer_type.name": friendlyRegex },
      { "offer_type.offertypename": regex },
      { "offer_type.offertypename": friendlyRegex },
    ];

    if (query.$or) {
      query.$and = [{ $or: query.$or }, { $or: otClause }];
      delete query.$or;
    } else {
      query.$or = otClause;
    }
  }

  let dbTemplates: any[] = await VideoTemplate.find(query).sort({ templateId: 1, createdAt: -1 }).lean();

  // If user-scoped query returned 0 templates, fallback to query without user restriction
  // so valid offer type templates are always surfaced
  if (dbTemplates.length === 0 && userId && userId.trim().toUpperCase() !== "ALL") {
    const fallbackQuery: any = { isDummy: { $ne: true } };
    if (!isAll) {
      const target = rawOfferTypeId.trim();
      const regex = new RegExp("^" + escapeRegex(target) + "$", "i");
      const friendlyName = target.replace(/_/g, " ");
      const friendlyRegex = new RegExp("^" + escapeRegex(friendlyName) + "$", "i");
      const looseRegex = new RegExp(escapeRegex(target).replace(/_/g, "[_\\s]"), "i");
      fallbackQuery.$or = [
        { offertypeId: target },
        { offertypeId: regex },
        { offertypeId: looseRegex },
        { offerType: target },
        { offerType: regex },
        { offerType: friendlyRegex },
        { offerType: looseRegex },
        { "offer_type.id": target },
        { "offer_type.offertypeId": target },
        { "offer_type.name": friendlyRegex },
        { "offer_type.offertypename": friendlyRegex },
      ];
    }
    dbTemplates = await VideoTemplate.find(fallbackQuery).sort({ templateId: 1, createdAt: -1 }).lean();
  }

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

  const formattedTemplates = dbTemplates.map((t: any, idx: number) =>
    formatTemplateItem(t, idx, creatorMap.get(String(t.storeUserId || t.userId)), baseUrl)
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

function resolveRequestBaseUrl(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "iot-test.metizstoresparc.com";
  const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// GET /api/external/get-templates?userId=...&offertypeId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || undefined;
    const rawOfferType = searchParams.get("offertypeId") || searchParams.get("offer_type") || searchParams.get("offertype") || "ALL";

    const baseUrl = resolveRequestBaseUrl(req);
    const result = await fetchAndFormatTemplates(userId, rawOfferType, baseUrl);
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

    const baseUrl = resolveRequestBaseUrl(req);
    const result = await fetchAndFormatTemplates(userId, String(rawOfferType || "ALL"), baseUrl);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[POST /api/external/get-templates] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Server Error" },
      { status: 500 }
    );
  }
}
