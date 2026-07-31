import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import MediaItemModel from "@/models/MediaItems";
import VideoJobModel from "@/models/VideoJob";
import Offer from "@/models/Offer";
import User from "@/models/User";
import Notification from "@/models/Notification";
import MediaMetadataModel from "@/models/MediaMetadata";
import { sendPushNotification } from "@/lib/firebase-admin";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const rawId = body.videoId || body.id || body.mediaId || body.jobId;
    const videoUrlParam = body["video 1"] || body.videoUrl || body.url;

    if (!rawId && !videoUrlParam) {
      return NextResponse.json(
        { success: false, error: "Missing required property 'videoId' (or 'video 1' URL parameter) in request body" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    let mediaItem: any = null;
    let videoJob: any = null;

    // 1. Locate MediaItem primarily by ObjectId or URL
    if (rawId && mongoose.Types.ObjectId.isValid(String(rawId).trim())) {
      mediaItem = await MediaItemModel.findById(String(rawId).trim());
    }
    if (!mediaItem && videoUrlParam) {
      mediaItem = await MediaItemModel.findOne({ url: String(videoUrlParam).trim() });
    }

    // 2. Locate associated VideoJob by videoId, jobId, or video URL
    if (rawId && typeof rawId === "string") {
      videoJob = await VideoJobModel.findOne({
        $or: [{ videoId: rawId.trim() }, { jobId: rawId.trim() }],
      });
    }
    if (!videoJob && mediaItem) {
      videoJob = await VideoJobModel.findOne({
        $or: [
          { videoId: mediaItem._id.toString() },
          { "falRequests.videoUrl": mediaItem.url },
        ],
      });
    }
    if (!videoJob && videoUrlParam) {
      videoJob = await VideoJobModel.findOne({ "falRequests.videoUrl": String(videoUrlParam).trim() });
    }

    // STRICT VALIDATION: Check if video exists first! If videoId is invalid or non-existent, stop immediately and return error.
    if (!mediaItem && !videoJob) {
      return NextResponse.json(
        { success: false, error: `Invalid video: No matching video found in media library or jobs for the provided videoId '${rawId || videoUrlParam}'. You must provide a valid videoId before processing approval or editing fields.` },
        { status: 404 }
      );
    }

    // 3. Process offer creation & FCM push notification if offer details were supplied
    const {
      voiceoverScript,
      channels,
      socialMedia,
      socialMediaHeading,
      socialMediaCaption,
      hashTags,
      offerId,
      offer_id,
      templateId,
      template_id,
      offerName,
      offerDescription,
      startDate,
      endDate,
      userId,
      user_id,
      storeUserId,
    } = body;

    let newOfferId = (offerId !== undefined || offer_id !== undefined) ? String(offerId || offer_id).trim() : undefined;
    const newTemplateId = (templateId !== undefined || template_id !== undefined) ? String(templateId || template_id).trim() : undefined;
    const targetUserId = userId || user_id || storeUserId || mediaItem?.userId?.toString() || videoJob?.userId || "";

    let createdOffer: any = null;

    if (offerName && offerDescription && startDate && endDate && targetUserId) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
        try {
          if (newOfferId && mongoose.Types.ObjectId.isValid(newOfferId)) {
            createdOffer = await Offer.findByIdAndUpdate(
              newOfferId,
              {
                offerName: String(offerName).trim(),
                offerDescription: String(offerDescription).trim(),
                startDate: start,
                endDate: end,
                isActive: true,
              },
              { new: true }
            );
          }
          if (!createdOffer) {
            createdOffer = await Offer.create({
              storeUserId: targetUserId,
              offerName: String(offerName).trim(),
              offerDescription: String(offerDescription).trim(),
              startDate: start,
              endDate: end,
              isActive: true,
            });
            newOfferId = createdOffer._id.toString();
          }
        } catch (offerErr) {
          console.warn("[offer_approval] Offer creation or update error:", offerErr);
        }
      }
    }

    // Always trigger FCM Push Notification & DB alert to the user upon approval
    if (targetUserId && mongoose.Types.ObjectId.isValid(String(targetUserId).trim())) {
      try {
        const notifTitle = createdOffer ? "New Offer Created" : "Offer & Video Approved";
        const notifBody = createdOffer 
          ? `Your offer '${String(offerName).trim()}' has been created successfully.` 
          : `Your promotional video & offer have been approved successfully.`;

        const user = await User.findById(String(targetUserId).trim()).select("username storeName fcmTokens");
        const mobileTokensNotified: string[] = (user && Array.isArray(user.fcmTokens)) ? user.fcmTokens : [];
        const activeOfferId = newOfferId || mediaItem?.offerId || videoJob?.offerId;

        // Save notification to DB
        await Notification.create({
          storeUserId: targetUserId,
          title: notifTitle,
          body: notifBody,
          action: "offer_alert",
          ...(activeOfferId && mongoose.Types.ObjectId.isValid(String(activeOfferId).trim()) ? { offerId: String(activeOfferId).trim() } : {}),
          isRead: false,
        }).catch((err: any) => console.warn("[offer_approval] DB notification creation failed:", err));

        // Send push notification if FCM tokens exist
        if (mobileTokensNotified.length > 0) {
          await sendPushNotification(
            mobileTokensNotified,
            notifTitle,
            notifBody,
            {
              action: "offer_alert",
              ...(activeOfferId ? { offerId: String(activeOfferId).trim() } : {}),
              storeUserId: String(targetUserId).trim(),
              videoId: mediaItem?._id ? mediaItem._id.toString() : (videoJob?.videoId || ""),
            }
          ).catch((err: any) => console.warn("[offer_approval] FCM push failed:", err));
        }
      } catch (notifErr) {
        console.warn("[offer_approval] Notification / FCM execution error:", notifErr);
      }
    }

    const rawChannels = channels || socialMedia;
    let newChannels: string[] | undefined = undefined;
    if (rawChannels !== undefined) {
      if (Array.isArray(rawChannels)) {
        newChannels = rawChannels.map((c: any) => String(c).trim()).filter(Boolean);
      } else if (typeof rawChannels === "string") {
        newChannels = rawChannels.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    }

    let newHashTags: string[] | undefined = undefined;
    if (hashTags !== undefined) {
      if (Array.isArray(hashTags)) {
        newHashTags = hashTags.map((h: any) => String(h).trim()).filter(Boolean);
      } else if (typeof hashTags === "string") {
        newHashTags = hashTags.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    }

    // Apply updates to MediaItem
    if (mediaItem) {
      if (newChannels !== undefined) mediaItem.channels = newChannels;
      if (voiceoverScript !== undefined) mediaItem.voiceoverScript = String(voiceoverScript).trim();
      if (socialMediaHeading !== undefined) mediaItem.socialMediaHeading = String(socialMediaHeading).trim();
      if (socialMediaCaption !== undefined) mediaItem.socialMediaCaption = String(socialMediaCaption).trim();
      if (newHashTags !== undefined) mediaItem.hashTags = newHashTags;
      if (newOfferId !== undefined) mediaItem.offerId = newOfferId;
      if (newTemplateId !== undefined) mediaItem.templateId = newTemplateId;
      mediaItem.approvalStatus = "success";
      await mediaItem.save();
    }

    // Apply updates to VideoJob
    if (videoJob) {
      if (newChannels !== undefined) {
        videoJob.channels = newChannels;
        videoJob.socialMedia = newChannels;
      }
      if (voiceoverScript !== undefined) videoJob.voiceoverScript = String(voiceoverScript).trim();
      if (socialMediaHeading !== undefined) videoJob.socialMediaHeading = String(socialMediaHeading).trim();
      if (socialMediaCaption !== undefined) videoJob.socialMediaCaption = String(socialMediaCaption).trim();
      if (newHashTags !== undefined) videoJob.hashTags = newHashTags;
      if (newOfferId !== undefined) videoJob.offerId = newOfferId;
      if (newTemplateId !== undefined) videoJob.templateId = newTemplateId;
      if (mediaItem) videoJob.videoId = mediaItem._id.toString();
      videoJob.approvalStatus = "success";
      await videoJob.save();
    }

    // 4. Return updated approved metadata in clean, logical ordering
    const finalVideoUrl = mediaItem?.url || videoJob?.falRequests?.find((r: any) => r.videoUrl)?.videoUrl || "";
    const finalScript = voiceoverScript !== undefined ? String(voiceoverScript).trim() : (mediaItem?.voiceoverScript || videoJob?.voiceoverScript || "");
    const finalHeading = socialMediaHeading !== undefined ? String(socialMediaHeading).trim() : (mediaItem?.socialMediaHeading || videoJob?.socialMediaHeading || "");
    const finalCaption = socialMediaCaption !== undefined ? String(socialMediaCaption).trim() : (mediaItem?.socialMediaCaption || videoJob?.socialMediaCaption || "");
    const finalTags = newHashTags !== undefined ? newHashTags : (mediaItem?.hashTags || videoJob?.hashTags || []);
    const finalChannels = newChannels !== undefined ? newChannels : (mediaItem?.channels || videoJob?.channels || videoJob?.socialMedia || []);
    const finalOfferId = newOfferId !== undefined ? newOfferId : (mediaItem?.offerId || videoJob?.offerId || "");
    const finalTemplateId = newTemplateId !== undefined ? newTemplateId : (mediaItem?.templateId || videoJob?.templateId || "");

    // Update or create dedicated MediaMetadata record
    let mediaMetadata: any = null;
    if (mediaItem?.metadataId) {
      mediaMetadata = await MediaMetadataModel.findById(mediaItem.metadataId);
    }
    if (!mediaMetadata && mediaItem) {
      mediaMetadata = await MediaMetadataModel.findOne({ mediaId: mediaItem._id });
    }
    if (!mediaMetadata && mediaItem) {
      mediaMetadata = new MediaMetadataModel({
        mediaId: mediaItem._id,
        userId: mediaItem.userId,
      });
    }
    if (mediaMetadata) {
      mediaMetadata.channels = finalChannels;
      mediaMetadata.voiceoverScript = finalScript;
      mediaMetadata.socialMediaHeading = finalHeading;
      mediaMetadata.socialMediaCaption = finalCaption;
      mediaMetadata.hashTags = finalTags;
      mediaMetadata.approvalStatus = "success";
      if (finalOfferId) mediaMetadata.offerId = finalOfferId;
      if (finalTemplateId) mediaMetadata.templateId = finalTemplateId;
      await mediaMetadata.save();

      if (mediaItem && (!mediaItem.metadataId || mediaItem.metadataId.toString() !== mediaMetadata._id.toString())) {
        mediaItem.metadataId = mediaMetadata._id;
        await mediaItem.save();
      }
    }

    let linkedOfferData: any = createdOffer;
    if (!linkedOfferData && finalOfferId && mongoose.Types.ObjectId.isValid(String(finalOfferId).trim())) {
      linkedOfferData = await Offer.findById(String(finalOfferId).trim()).lean().catch(() => null);
    }

    const response: Record<string, any> = {
      status: "success",
      videoId: mediaItem?._id ? mediaItem._id.toString() : videoJob?.videoId || "",
    };

    if (targetUserId) {
      response.userId = targetUserId;
    }

    if (mediaItem?.metadataId || mediaMetadata?._id) {
      response.metadataId = mediaItem?.metadataId ? mediaItem.metadataId.toString() : mediaMetadata._id.toString();
    }

    if (finalOfferId) {
      response.offerId = finalOfferId;
    }
    if (finalTemplateId) {
      response.templateId = finalTemplateId;
    }
    if (linkedOfferData || (offerName && offerDescription)) {
      response.offerName = linkedOfferData?.offerName || offerName || "";
      response.offerDescription = linkedOfferData?.offerDescription || offerDescription || "";
      if (linkedOfferData?.startDate || startDate) {
        response.startDate = linkedOfferData?.startDate ? new Date(linkedOfferData.startDate).toISOString().split("T")[0] : startDate;
      }
      if (linkedOfferData?.endDate || endDate) {
        response.endDate = linkedOfferData?.endDate ? new Date(linkedOfferData.endDate).toISOString().split("T")[0] : endDate;
      }
    }

    response["video 1"] = finalVideoUrl;
    response.voiceoverScript = finalScript;

    if (finalChannels && finalChannels.length > 0) {
      response.socialMediaHeading = finalHeading;
      response.socialMediaCaption = finalCaption;
      response.hashTags = finalTags;
      response.channels = finalChannels;
    }

    if (videoJob?.enhancedPrompt) {
      response.enhancedPrompt = videoJob.enhancedPrompt;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[external/offer_approval] Error:", error);
    return NextResponse.json(
      { error: "Failed to process offer approval", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
