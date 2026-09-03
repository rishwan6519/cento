import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import MediaItemModel from "@/models/MediaItems";
import VideoJobModel from "@/models/VideoJob";
import GoogleFlowJobModel from "@/models/GoogleFlowJob";
import CloudbasesJobModel from "@/models/CloudbasesJob";
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

    // 2. Locate associated VideoJob or GoogleFlowJob by videoId, jobId, or video URL
    if (rawId && typeof rawId === "string") {
      videoJob = await VideoJobModel.findOne({
        $or: [{ videoId: rawId.trim() }, { jobId: rawId.trim() }],
      });
      if (!videoJob) {
        videoJob = await GoogleFlowJobModel.findOne({
          $or: [{ jobId: rawId.trim() }, ...(mongoose.Types.ObjectId.isValid(rawId.trim()) ? [{ _id: rawId.trim() }] : [])],
        });
      }
      if (!videoJob) {
        videoJob = await CloudbasesJobModel.findOne({
          $or: [{ jobId: rawId.trim() }, ...(mongoose.Types.ObjectId.isValid(rawId.trim()) ? [{ _id: rawId.trim() }] : [])],
        });
      }
    }
    if (!videoJob && mediaItem) {
      videoJob = await VideoJobModel.findOne({
        $or: [
          { videoId: mediaItem._id.toString() },
          { "falRequests.videoUrl": mediaItem.url },
        ],
      });
      if (!videoJob) {
        videoJob = await GoogleFlowJobModel.findOne({ videoUrl: mediaItem.url });
      }
      if (!videoJob) {
        videoJob = await CloudbasesJobModel.findOne({ "resultData.saved_videos.url": mediaItem.url });
      }
    }
    if (!videoJob && videoUrlParam) {
      videoJob = await VideoJobModel.findOne({ "falRequests.videoUrl": String(videoUrlParam).trim() });
      if (!videoJob) {
        videoJob = await GoogleFlowJobModel.findOne({ videoUrl: String(videoUrlParam).trim() });
      }
      if (!videoJob) {
        videoJob = await CloudbasesJobModel.findOne({ "resultData.saved_videos.url": String(videoUrlParam).trim() });
      }
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
      facebookCaption,
      facebookHashTags,
      instagramCaption,
      instagramHashTags,
      offerId,
      offer_id,
      templateId,
      template_id,
      tagline,
      offerName,
      offerDescription,
      startDate,
      endDate,
      userId,
      user_id,
      storeUserId,
    } = body;

    const assignedOfferId = String(mediaItem?.offerId || videoJob?.offerId || "").trim();
    let newOfferId = (offerId !== undefined || offer_id !== undefined) ? String(offerId || offer_id).trim() : undefined;

    // STRICT VALIDATION: If an offerId is passed in request body and video already has an assigned offerId, verify they match!
    if (newOfferId && assignedOfferId && newOfferId !== assignedOfferId) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid offerId: The provided offerId '${newOfferId}' does not match the generated offerId '${assignedOfferId}' for this video.`,
        },
        { status: 400 }
      );
    }

    // If caller did not provide an offerId in body, default to the video's assigned offerId
    if (!newOfferId && assignedOfferId) {
      newOfferId = assignedOfferId;
    }

    const newTemplateId = (templateId !== undefined || template_id !== undefined) ? String(templateId || template_id).trim() : undefined;
    const targetUserId = userId || user_id || storeUserId || mediaItem?.userId?.toString() || videoJob?.userId || "";

    let createdOffer: any = null;

    if (offerName && offerDescription && startDate && endDate && targetUserId) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
        try {
          if (newOfferId) {
            const query = mongoose.Types.ObjectId.isValid(newOfferId)
              ? { $or: [{ _id: newOfferId }, { offerId: newOfferId }] }
              : { offerId: newOfferId };
            createdOffer = await Offer.findOneAndUpdate(
              query,
              {
                storeUserId: targetUserId,
                offerName: String(offerName).trim(),
                offerDescription: String(offerDescription).trim(),
                ...(tagline !== undefined ? { tagline: String(tagline).trim() } : {}),
                startDate: start,
                endDate: end,
                isActive: true,
                offerId: newOfferId,
              },
              { new: true }
            );
          }
          if (!createdOffer) {
            createdOffer = await Offer.create({
              storeUserId: targetUserId,
              offerId: newOfferId,
              offerName: String(offerName).trim(),
              offerDescription: String(offerDescription).trim(),
              ...(tagline !== undefined ? { tagline: String(tagline).trim() } : {}),
              startDate: start,
              endDate: end,
              isActive: true,
            });
            if (!newOfferId) {
              newOfferId = createdOffer._id.toString();
            }
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



    // Apply updates to MediaItem
    if (mediaItem) {
      if (newChannels !== undefined) mediaItem.channels = newChannels;
      if (voiceoverScript !== undefined) mediaItem.voiceoverScript = String(voiceoverScript).trim();
      if (socialMediaHeading !== undefined) mediaItem.socialMediaHeading = String(socialMediaHeading).trim();
      if (newOfferId !== undefined) mediaItem.offerId = newOfferId;
      if (newTemplateId !== undefined) mediaItem.templateId = newTemplateId;
      if (tagline !== undefined) mediaItem.tagline = String(tagline).trim();
      mediaItem.approvalStatus = "success";
      await mediaItem.save();
    }

    // Apply updates to VideoJob or GoogleFlowJob
    if (videoJob) {
      if (newChannels !== undefined) {
        videoJob.channels = newChannels;
        if (videoJob.socialMedia !== undefined) videoJob.socialMedia = newChannels;
      }
      if (voiceoverScript !== undefined) videoJob.voiceoverScript = String(voiceoverScript).trim();
      if (socialMediaHeading !== undefined) videoJob.socialMediaHeading = String(socialMediaHeading).trim();
      if (newOfferId !== undefined) videoJob.offerId = newOfferId;
      if (newTemplateId !== undefined) videoJob.templateId = newTemplateId;
      if (tagline !== undefined) videoJob.tagline = String(tagline).trim();
      if (mediaItem && videoJob.videoId !== undefined) videoJob.videoId = mediaItem._id.toString();
      videoJob.approvalStatus = "success";
      await videoJob.save().catch(() => { });
    }

    // 3.5 Fetch additional videos from Cloudbases if we have a job_id
    let fetchedCloudVideos: any[] = [];
    const targetJobId = videoJob?.jobId || mediaItem?.jobId || (typeof rawId === "string" ? rawId.trim() : "");
    if (targetJobId) {
      try {
        const apiKey = process.env.CLOUDBASES_API_KEY || "";
        const cloudRes = await fetch(`https://cloudbases.in/storesparc_video/index.php/api/external/videos?job_id=${targetJobId}`, {
          headers: { ...(apiKey ? { 'X-API-Key': apiKey } : {}) }
        });
        if (cloudRes.ok) {
          const cloudData = await cloudRes.json();
          if (cloudData?.success && cloudData?.data?.videos) {
            fetchedCloudVideos = cloudData.data.videos;
            for (const vid of fetchedCloudVideos) {
              if (vid.url) {
                const existingMedia = await MediaItemModel.findOne({ url: vid.url });
                if (!existingMedia) {
                  await MediaItemModel.create({
                    userId: targetUserId,
                    name: `Generated Promo Video (${vid.ratio || "16:9"}) – ${new Date().toLocaleString()}`,
                    type: 'video',
                    url: vid.url,
                    ratio: vid.ratio,
                    suffix: vid.suffix,
                    width: vid.width,
                    height: vid.height,
                    duration: vid.duration,
                    templateId: vid.template_id ? String(vid.template_id) : undefined,
                    offerId: newOfferId || undefined,
                    jobId: targetJobId,
                  });
                } else {
                  existingMedia.ratio = vid.ratio;
                  existingMedia.suffix = vid.suffix;
                  existingMedia.width = vid.width;
                  existingMedia.height = vid.height;
                  existingMedia.duration = vid.duration;
                  existingMedia.jobId = targetJobId;
                  await existingMedia.save();
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn("[offer_approval] Error fetching external videos:", err);
      }
    }

    // 4. Return updated approved metadata in clean, logical ordering
    const finalVideoUrl = mediaItem?.url || videoJob?.falRequests?.find((r: any) => r.videoUrl)?.videoUrl || videoJob?.videoUrl || "";
    const finalScript = voiceoverScript !== undefined ? String(voiceoverScript).trim() : (mediaItem?.voiceoverScript || videoJob?.voiceoverScript || "");
    const finalHeading = socialMediaHeading !== undefined ? String(socialMediaHeading).trim() : (mediaItem?.socialMediaHeading || videoJob?.socialMediaHeading || "");
    
    const finalCaption = (mediaItem?.socialMediaCaption || videoJob?.socialMediaCaption || "");
    const finalTags = (mediaItem?.hashTags || videoJob?.hashTags || []);
    
    const finalFbCaption = facebookCaption !== undefined ? String(facebookCaption).trim() : (mediaItem?.facebookCaption || videoJob?.facebookCaption || mediaItem?.socialMediaCaption || videoJob?.socialMediaCaption || "");
    const finalFbTags = facebookHashTags !== undefined ? facebookHashTags : (mediaItem?.facebookHashTags || videoJob?.facebookHashTags || mediaItem?.hashTags || videoJob?.hashTags || []);
    const finalIgCaption = instagramCaption !== undefined ? String(instagramCaption).trim() : (mediaItem?.instagramCaption || videoJob?.instagramCaption || mediaItem?.socialMediaCaption || videoJob?.socialMediaCaption || "");
    const finalIgTags = instagramHashTags !== undefined ? instagramHashTags : (mediaItem?.instagramHashTags || videoJob?.instagramHashTags || mediaItem?.hashTags || videoJob?.hashTags || []);
    
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
        if (!mediaMetadata) {
        mediaMetadata = await MediaMetadataModel.create({
          mediaId: mediaItem?._id || new mongoose.Types.ObjectId(),
          userId: targetUserId,
          channels: finalChannels,
          voiceoverScript: finalScript,
          socialMediaHeading: finalHeading,
          facebookCaption: finalFbCaption,
          facebookHashTags: finalFbTags,
          instagramCaption: finalIgCaption,
          instagramHashTags: finalIgTags,
          approvalStatus: "success",
          offerId: finalOfferId,
          templateId: finalTemplateId,
          ...(tagline !== undefined ? { tagline: String(tagline).trim() } : {}),
        });
      }
    }
    if (mediaMetadata) {
      mediaMetadata.channels = finalChannels;
      mediaMetadata.voiceoverScript = finalScript;
      mediaMetadata.socialMediaHeading = finalHeading;
      mediaMetadata.facebookCaption = finalFbCaption;
      mediaMetadata.facebookHashTags = finalFbTags;
      mediaMetadata.instagramCaption = finalIgCaption;
      mediaMetadata.instagramHashTags = finalIgTags;
      mediaMetadata.approvalStatus = "success";
      if (finalOfferId) mediaMetadata.offerId = finalOfferId;
      if (finalTemplateId) mediaMetadata.templateId = finalTemplateId;
      if (tagline !== undefined) mediaMetadata.tagline = String(tagline).trim();
      await mediaMetadata.save();

      if (mediaItem && (!mediaItem.metadataId || mediaItem.metadataId.toString() !== mediaMetadata._id.toString())) {
        mediaItem.metadataId = mediaMetadata._id;
        await mediaItem.save();
      }
    }

    let linkedOfferData: any = createdOffer;
    if (!linkedOfferData && finalOfferId) {
      const trimmedId = String(finalOfferId).trim();
      const query = mongoose.Types.ObjectId.isValid(trimmedId)
        ? { $or: [{ _id: trimmedId }, { offerId: trimmedId }] }
        : { offerId: trimmedId };
      linkedOfferData = await Offer.findOne(query).lean().catch(() => null);
    }

    // 3.6 Social Media Video Scheduling Integration
    let facebookSchedulingStatus = "Skipped (facebook not in channels)";
    let instagramSchedulingStatus = "Skipped (instagram not in channels)";
    
    const shouldPostFb = finalChannels && finalChannels.some((c: string) => c.toLowerCase() === "facebook");
    const shouldPostIg = finalChannels && finalChannels.some((c: string) => c.toLowerCase() === "instagram");

    if (shouldPostFb || shouldPostIg) {
      try {
        if (fetchedCloudVideos.length > 0) {
          const portraitVideo = fetchedCloudVideos.find((v: any) => v.ratio === "9:16");
          if (portraitVideo && portraitVideo.video_id) {
            const fbJoinedTags = finalFbTags.map((tag: string) => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
            const fbPostMessage = `${finalFbCaption}\n\n${fbJoinedTags}`.trim();
            
            const igJoinedTags = finalIgTags.map((tag: string) => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
            const igPostMessage = `${finalIgCaption}\n\n${igJoinedTags}`.trim();
            
            // Scheduling config
            let FB_SCHEDULE_MODE: 'testing' | 'production' = 'production';
            const TEST_SCHEDULE_OFFSET_DAYS = 10;
            const PROD_POST_BEFORE_START_DAYS = 1;
            const PROD_POST_TIME = "18:00";
            
            let scheduledAtDate = new Date();
            const offerStart = (linkedOfferData?.startDate || startDate) ? new Date(linkedOfferData?.startDate || startDate) : new Date();
            
            if (FB_SCHEDULE_MODE === 'testing') {
              scheduledAtDate = new Date(offerStart);
              scheduledAtDate.setDate(scheduledAtDate.getDate() + TEST_SCHEDULE_OFFSET_DAYS);
            } else {
              scheduledAtDate = new Date(offerStart);
              scheduledAtDate.setDate(scheduledAtDate.getDate() - PROD_POST_BEFORE_START_DAYS);
            }
            
            // Force the time to 6:00 PM (18:00) regardless of the testing/production mode
            const [hours, minutes] = PROD_POST_TIME.split(':').map(Number);
            scheduledAtDate.setHours(hours, minutes, 0, 0);
            
            const now = new Date();
            let publishMode = "schedule";
            
            // If the calculated schedule time has already passed, post instantly
            if (scheduledAtDate <= now) {
              publishMode = "publish"; // Change to "now" if cloudbases API expects that
            }
            
            // Ensure format YYYY-MM-DD HH:mm:ss
            const pad = (n: number) => n.toString().padStart(2, '0');
            const scheduledAtStr = `${scheduledAtDate.getFullYear()}-${pad(scheduledAtDate.getMonth() + 1)}-${pad(scheduledAtDate.getDate())} ${pad(scheduledAtDate.getHours())}:${pad(scheduledAtDate.getMinutes())}:00`;

            const fbPayload: any = {
              message: fbPostMessage,
              media_type: "video",
              video_id: portraitVideo.video_id,
              publish_mode: publishMode
            };
            if (publishMode === "schedule") {
              fbPayload.scheduled_at = scheduledAtStr;
            }
            
            const igPayload: any = {
              message: igPostMessage,
              media_type: "video",
              video_id: portraitVideo.video_id,
              publish_mode: publishMode
            };
            if (publishMode === "schedule") {
              igPayload.scheduled_at = scheduledAtStr;
            }
            
            const apiKey = process.env.CLOUDBASES_API_KEY || "";
            const headers = { 
              "Content-Type": "application/json",
              ...(apiKey ? { 'X-API-Key': apiKey } : {})
            };

            // Post to Facebook if enabled
            if (shouldPostFb) {
              const fbRes = await fetch("https://cloudbases.in/storesparc_video/index.php/api/external/facebook/posts", {
                method: "POST",
                headers,
                body: JSON.stringify(fbPayload)
              });
              if (!fbRes.ok) {
                 facebookSchedulingStatus = `Failed (API status ${fbRes.status})`;
                 console.warn(`[offer_approval] Facebook Post API failed with status ${fbRes.status}`);
              } else {
                 facebookSchedulingStatus = "Scheduled Successfully";
              }
            }

            // Post to Instagram if enabled
            if (shouldPostIg) {
              const igRes = await fetch("https://cloudbases.in/storesparc_video/index.php/api/external/instagram/posts", {
                method: "POST",
                headers,
                body: JSON.stringify(igPayload)
              });
              if (!igRes.ok) {
                 instagramSchedulingStatus = `Failed (API status ${igRes.status})`;
                 console.warn(`[offer_approval] Instagram Post API failed with status ${igRes.status}`);
              } else {
                 instagramSchedulingStatus = "Scheduled Successfully";
              }
            }

          } else {
            const skipReason = "Skipped (No 9:16 video found)";
            if (shouldPostFb) facebookSchedulingStatus = skipReason;
            if (shouldPostIg) instagramSchedulingStatus = skipReason;
            console.warn("[offer_approval] Social scheduling skipped: No 9:16 video found in cloud generated videos.");
          }
        } else {
          const skipReason = "Skipped (Video generation not completed or empty)";
          if (shouldPostFb) facebookSchedulingStatus = skipReason;
          if (shouldPostIg) instagramSchedulingStatus = skipReason;
          console.warn("[offer_approval] Social scheduling skipped: Video generation not completed or videos array empty.");
        }
      } catch (err: any) {
        const failReason = `Failed (Internal Error: ${err.message || "Unknown error"})`;
        if (shouldPostFb) facebookSchedulingStatus = failReason;
        if (shouldPostIg) instagramSchedulingStatus = failReason;
        console.warn("[offer_approval] Error during Social scheduling workflow:", err);
      }
    }

    const response: Record<string, any> = {
      status: "success",
      videoId: mediaItem?._id ? mediaItem._id.toString() : videoJob?.videoId || "",
      facebookSchedulingStatus,
      instagramSchedulingStatus,
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
    if (tagline !== undefined) {
      response.tagline = String(tagline).trim();
    } else {
      const existingTagline = mediaItem?.tagline || videoJob?.tagline || "";
      if (existingTagline) response.tagline = existingTagline;
    }
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
