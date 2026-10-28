import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import MediaItemModel from "@/models/MediaItems";
import Offer from "@/models/Offer";
import SocialPost from "@/models/SocialPost";

export const dynamic = "force-dynamic";

/**
 * Helper to calculate schedule timing:
 * - If startDate provided: Day before startDate at 18:00 (6:00 PM)
 * - If that time has already passed: schedule instantly (now)
 */
function calculateScheduleTiming(startDateInput?: string | Date) {
  const now = new Date();

  if (!startDateInput) {
    return {
      scheduledAt: now,
      publishMode: "now" as const,
      status: "published" as const,
      isInstant: true,
      reason: "No startDate provided; scheduled instantly",
    };
  }

  let year: number, month: number, day: number;

  if (typeof startDateInput === "string" && /^\d{4}-\d{2}-\d{2}/.test(startDateInput.trim())) {
    const parts = startDateInput.trim().split("T")[0].split("-");
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10) - 1;
    day = parseInt(parts[2], 10);
  } else {
    const parsed = new Date(startDateInput);
    if (isNaN(parsed.getTime())) {
      return {
        scheduledAt: now,
        publishMode: "now" as const,
        status: "published" as const,
        isInstant: true,
        reason: "Invalid startDate format; scheduled instantly",
      };
    }
    year = parsed.getFullYear();
    month = parsed.getMonth();
    day = parsed.getDate();
  }

  // Calculate previous date at 18:00 (6:00 PM)
  const prevDate6PM = new Date(year, month, day - 1, 18, 0, 0, 0);

  const isPastOrDue = prevDate6PM.getTime() <= now.getTime();

  if (isPastOrDue) {
    return {
      scheduledAt: now,
      publishMode: "now" as const,
      status: "published" as const,
      isInstant: true,
      targetTime: prevDate6PM.toISOString(),
      reason: `Previous day 6:00 PM (${prevDate6PM.toLocaleString()}) has already elapsed; scheduled instantly`,
    };
  } else {
    return {
      scheduledAt: prevDate6PM,
      publishMode: "schedule" as const,
      status: "scheduled" as const,
      isInstant: false,
      targetTime: prevDate6PM.toISOString(),
      reason: `Scheduled for previous day at 6:00 PM (${prevDate6PM.toLocaleString()})`,
    };
  }
}

/**
 * Format message caption with hashtags
 */
function formatSocialMessage(caption?: string, hashtags?: string[] | string): string {
  let text = (caption || "").trim();
  if (Array.isArray(hashtags) && hashtags.length > 0) {
    const tags = hashtags
      .map((t) => (String(t).trim().startsWith("#") ? String(t).trim() : `#${String(t).trim()}`))
      .join(" ");
    text = text ? `${text}\n\n${tags}` : tags;
  } else if (typeof hashtags === "string" && hashtags.trim()) {
    text = text ? `${text}\n\n${hashtags.trim()}` : hashtags.trim();
  }
  return text;
}

/**
 * POST /api/external/offer-approval-schedule & /api/offers/approval-schedule
 *
 * Dedicated separate API to:
 * 1. Approve offer & save offer details
 * 2. Update media item approval status
 * 3. Automatically schedule social media posts (Facebook, Instagram)
 *    Timing: Previous day of startDate at 6:00 PM, or instantly if that time has passed.
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json().catch(() => ({}));

    const {
      videoId,
      userId,
      user_id,
      storeUserId,
      offerId,
      templateId,
      offerName,
      offerDescription,
      startDate,
      endDate,
      tagline,
      voiceoverScript,
      facebookCaption,
      facebookHashTags,
      instagramCaption,
      instagramHashTags,
      channels,
      mediaUrl,
      timezone = "Asia/Kolkata",
    } = body;

    // Validate required fields
    if (!offerName && !offerId && !videoId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required offer fields: at least 'offerName', 'offerId', or 'videoId' must be provided",
        },
        { status: 400 }
      );
    }

    // Resolve storeUserId
    const resolvedUserIdStr =
      userId || user_id || storeUserId || "64f3b2c1a4e2d1234567890a";
    const validStoreUserObjectId = mongoose.Types.ObjectId.isValid(resolvedUserIdStr)
      ? new mongoose.Types.ObjectId(resolvedUserIdStr)
      : new mongoose.Types.ObjectId("64f3b2c1a4e2d1234567890a");

    // 1. Find and update MediaItem if videoId provided
    let mediaItem: any = null;
    let resolvedVideoUrl = (mediaUrl || "").trim();
    let resolved916Url = "";
    let resolved169Url = "";

    if (videoId) {
      const vId = String(videoId).trim();
      if (mongoose.Types.ObjectId.isValid(vId)) {
        mediaItem = await MediaItemModel.findById(vId);
      }
      if (!mediaItem) {
        mediaItem = await MediaItemModel.findOne({
          $or: [{ _id: vId }, { jobId: vId }, { url: vId }],
        });
      }

      if (mediaItem) {
        mediaItem.approvalStatus = "approved";
        if (offerId) mediaItem.offerId = String(offerId);
        if (templateId) mediaItem.templateId = String(templateId);
        if (tagline) mediaItem.tagline = String(tagline);
        if (voiceoverScript) mediaItem.voiceoverScript = String(voiceoverScript);
        if (channels && Array.isArray(channels)) mediaItem.channels = channels;
        if (facebookCaption || instagramCaption) {
          mediaItem.socialMediaCaption = facebookCaption || instagramCaption;
        }
        if (offerName) mediaItem.socialMediaHeading = offerName;
        if (facebookHashTags || instagramHashTags) {
          mediaItem.hashTags = facebookHashTags || instagramHashTags;
        }

        await mediaItem.save();

        resolvedVideoUrl = mediaItem.url || resolvedVideoUrl;
        if (mediaItem.ratio === "9:16") resolved916Url = mediaItem.url;
        if (mediaItem.ratio === "16:9") resolved169Url = mediaItem.url;

        // Search for sibling aspect ratio clips
        if (mediaItem.jobId) {
          const siblingMedia = await MediaItemModel.find({ jobId: mediaItem.jobId }).lean();
          siblingMedia.forEach((m: any) => {
            if (m.ratio === "9:16" && !resolved916Url) resolved916Url = m.url;
            if (m.ratio === "16:9" && !resolved169Url) resolved169Url = m.url;
          });
        }
      }
    }

    if (!resolved169Url) resolved169Url = resolvedVideoUrl;
    if (!resolved916Url) resolved916Url = resolvedVideoUrl;

    // 2. Upsert Offer document
    let offerDoc: any = null;
    const finalStartDate = startDate ? new Date(startDate) : new Date();
    const finalEndDate = endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const offerFilter: any = {};
    if (offerId) {
      offerFilter.offerId = String(offerId);
    } else if (offerName) {
      offerFilter.storeUserId = validStoreUserObjectId;
      offerFilter.offerName = offerName;
    }

    if (Object.keys(offerFilter).length > 0) {
      offerDoc = await Offer.findOne(offerFilter);
    }

    if (offerDoc) {
      if (offerName) offerDoc.offerName = offerName;
      if (offerDescription) offerDoc.offerDescription = offerDescription;
      if (tagline) offerDoc.tagline = tagline;
      offerDoc.startDate = finalStartDate;
      offerDoc.endDate = finalEndDate;
      offerDoc.isActive = true;
      await offerDoc.save();
    } else {
      offerDoc = await Offer.create({
        storeUserId: validStoreUserObjectId,
        offerId: offerId ? String(offerId) : `OFFER_${Date.now()}`,
        offerName: offerName || "Special Promotional Offer",
        offerDescription: offerDescription || "Exclusive limited-time in-store discount",
        tagline: tagline || "",
        startDate: finalStartDate,
        endDate: finalEndDate,
        isActive: true,
      });
    }

    // 3. Social Media Scheduling Mechanism
    // Timing Rule: Previous day of startDate at 6:00 PM.
    // If that time has already passed: schedule instantly.
    const timing = calculateScheduleTiming(startDate);

    // Determine target channels
    let targetChannels: string[] = [];
    if (Array.isArray(channels) && channels.length > 0) {
      targetChannels = channels.map((c: string) => String(c).toLowerCase().trim());
    } else {
      targetChannels = ["facebook"];
    }

    const createdPosts: any[] = [];

    // Schedule Facebook Post
    if (targetChannels.includes("facebook")) {
      const fbMessage = formatSocialMessage(
        facebookCaption || `${offerName}: ${offerDescription}`,
        facebookHashTags
      );

      const fbPost = await SocialPost.create({
        storeUserId: validStoreUserObjectId,
        channel: "facebook",
        message: fbMessage,
        mediaType: resolved169Url ? "video" : "none",
        mediaUrl: resolved169Url,
        templateId: templateId ? String(templateId) : "",
        publishMode: timing.publishMode,
        scheduledAt: timing.scheduledAt,
        timezone,
        status: timing.status,
        publishedAt: timing.isInstant ? new Date() : null,
        externalPostId: timing.isInstant ? `fb_${Date.now()}` : null,
      });

      createdPosts.push({
        channel: "facebook",
        postId: String(fbPost._id),
        status: fbPost.status,
        publishMode: fbPost.publishMode,
        scheduledAt: fbPost.scheduledAt,
        mediaUrl: fbPost.mediaUrl,
        message: fbPost.message,
      });
    }

    // Schedule Instagram Post
    if (targetChannels.includes("instagram")) {
      const igMessage = formatSocialMessage(
        instagramCaption || `${offerName}! ${offerDescription}`,
        instagramHashTags
      );

      const igPost = await SocialPost.create({
        storeUserId: validStoreUserObjectId,
        channel: "instagram",
        message: igMessage,
        mediaType: resolved916Url ? "video" : "none",
        mediaUrl: resolved916Url,
        templateId: templateId ? String(templateId) : "",
        publishMode: timing.publishMode,
        scheduledAt: timing.scheduledAt,
        timezone,
        status: timing.status,
        publishedAt: timing.isInstant ? new Date() : null,
        externalPostId: timing.isInstant ? `ig_${Date.now()}` : null,
      });

      createdPosts.push({
        channel: "instagram",
        postId: String(igPost._id),
        status: igPost.status,
        publishMode: igPost.publishMode,
        scheduledAt: igPost.scheduledAt,
        mediaUrl: igPost.mediaUrl,
        message: igPost.message,
      });
    }

    return NextResponse.json({
      success: true,
      message: timing.isInstant
        ? "Offer approved and social media published instantly!"
        : "Offer approved and social media scheduled successfully!",
      approval: {
        status: "approved",
        offerId: offerDoc?.offerId || offerId,
        offerName: offerDoc?.offerName || offerName,
        videoId: videoId || null,
        templateId: templateId || null,
        approvedAt: new Date(),
      },
      offer: {
        id: offerDoc?._id,
        offerId: offerDoc?.offerId,
        offerName: offerDoc?.offerName,
        offerDescription: offerDoc?.offerDescription,
        tagline: offerDoc?.tagline,
        startDate: offerDoc?.startDate,
        endDate: offerDoc?.endDate,
        isActive: offerDoc?.isActive,
      },
      scheduling: {
        publishMode: timing.publishMode,
        scheduledAt: timing.scheduledAt,
        targetTime: timing.targetTime,
        reason: timing.reason,
      },
      channels: targetChannels,
      socialPosts: createdPosts,
    });
  } catch (error: any) {
    console.error("[POST offer-approval-schedule] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to process offer approval and scheduling",
      },
      { status: 500 }
    );
  }
}
