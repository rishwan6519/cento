import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import MediaItemModel from "@/models/MediaItems";
import VideoJobModel from "@/models/VideoJob";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const rawId = body.videoId || body.id || body.mediaId || body.jobId;
    const videoUrlParam = body["video 1"] || body.videoUrl || body.url;

    if (!rawId && !videoUrlParam) {
      return NextResponse.json(
        { error: "Missing 'videoId' (or 'video 1' URL parameter) in request body" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    let mediaItem: any = null;
    let videoJob: any = null;

    // 1. Locate MediaItem by ObjectId or URL
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

    if (!mediaItem && !videoJob) {
      return NextResponse.json(
        { error: "No video found matching the provided videoId or URL" },
        { status: 404 }
      );
    }

    // 3. Process field updates if user supplied new values during approval
    const { voiceoverScript, channels, socialMedia, socialMediaHeading, socialMediaCaption, hashTags, offerId, offer_id } = body;

    const newOfferId = (offerId !== undefined || offer_id !== undefined) ? String(offerId || offer_id).trim() : undefined;

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
      if (mediaItem) videoJob.videoId = mediaItem._id.toString();
      videoJob.approvalStatus = "success";
      await videoJob.save();
    }

    // 4. Return updated approved metadata
    const finalVideoUrl = mediaItem?.url || videoJob?.falRequests?.find((r: any) => r.videoUrl)?.videoUrl || "";
    const finalScript = mediaItem?.voiceoverScript || videoJob?.voiceoverScript || "";
    const finalHeading = mediaItem?.socialMediaHeading || videoJob?.socialMediaHeading || "";
    const finalCaption = mediaItem?.socialMediaCaption || videoJob?.socialMediaCaption || "";
    const finalTags = mediaItem?.hashTags || videoJob?.hashTags || [];
    const finalChannels = mediaItem?.channels || videoJob?.channels || videoJob?.socialMedia || [];
    const finalOfferId = newOfferId !== undefined ? newOfferId : (mediaItem?.offerId || videoJob?.offerId || "");

    const response: Record<string, any> = {
      status: "success",
      videoId: mediaItem?._id ? mediaItem._id.toString() : videoJob?.videoId || "",
      ...(finalOfferId ? { offerId: finalOfferId } : {}),
      "video 1": finalVideoUrl,
      voiceoverScript: finalScript,
      socialMediaHeading: finalHeading,
      socialMediaCaption: finalCaption,
      hashTags: finalTags,
      channels: finalChannels,
      socialMedia: finalChannels,
    };

    if (videoJob?.templateId) {
      response.templateId = videoJob.templateId;
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
