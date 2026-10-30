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
import OfferApprovalJobModel from "@/models/OfferApprovalJob";
import SocialPost from "@/models/SocialPost";
import { v4 as uuidv4 } from "uuid";

// Helper: Calculate previous day 6:00 PM in Australia/Sydney timezone
function calculateAustralianScheduleTiming(startDateInput?: string | Date) {
  const now = new Date();

  if (!startDateInput) {
    return {
      scheduledAt: now,
      publishMode: "now" as const,
      status: "published" as const,
      isInstant: true,
      reason: "No startDate provided; published instantly",
    };
  }

  let dateStr = "";
  if (typeof startDateInput === "string") {
    dateStr = startDateInput.trim().split("T")[0];
  } else {
    dateStr = startDateInput.toISOString().split("T")[0];
  }

  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return {
      scheduledAt: now,
      publishMode: "now" as const,
      status: "published" as const,
      isInstant: true,
      reason: "Invalid startDate format; published instantly",
    };
  }

  const [y, m, d] = parts;
  const prevDate = new Date(Date.UTC(y, m - 1, d - 1, 0, 0, 0));
  const prevYear = prevDate.getUTCFullYear();
  const prevMonth = prevDate.getUTCMonth();
  const prevDay = prevDate.getUTCDate();

  // Find exact UTC Date that matches 18:00:00 on prevDay in Australia/Sydney
  let targetSydneyDate: Date | null = null;
  for (let h = 6; h <= 9; h++) {
    const candidate = new Date(Date.UTC(prevYear, prevMonth, prevDay, h, 0, 0));
    const formatter = new Intl.DateTimeFormat("en-AU", {
      timeZone: "Australia/Sydney",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const formattedParts = formatter.formatToParts(candidate).reduce((acc: any, p) => ({ ...acc, [p.type]: p.value }), {});
    if (parseInt(formattedParts.hour, 10) === 18 && parseInt(formattedParts.day, 10) === prevDay) {
      targetSydneyDate = candidate;
      break;
    }
  }

  if (!targetSydneyDate) {
    targetSydneyDate = new Date(Date.UTC(prevYear, prevMonth, prevDay, 8, 0, 0));
  }

  const isPast = targetSydneyDate.getTime() <= now.getTime();

  if (isPast) {
    return {
      scheduledAt: now,
      publishMode: "now" as const,
      status: "published" as const,
      isInstant: true,
      reason: "Offer start date is in past or 6:00 PM Australian time has already passed; published instantly",
    };
  } else {
    return {
      scheduledAt: targetSydneyDate,
      publishMode: "schedule" as const,
      status: "scheduled" as const,
      isInstant: false,
      reason: `Scheduled for previous day at 6:00 PM Australian/Sydney time (${targetSydneyDate.toISOString()})`,
    };
  }
}

// Auto-resolve Page Access Token if User Token was passed
async function resolvePageToken(pageId: string, token: string): Promise<string> {
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}?fields=access_token&access_token=${token}`);
    const data = await res.json();
    if (data.access_token) return data.access_token;
  } catch (err) {}
  return token;
}

// Live Publish to Facebook Graph API
async function publishToFacebookLive(pageId: string, accessToken: string, videoUrl: string, message: string) {
  try {
    if (!pageId || !accessToken) {
      return { success: false, error: "Missing Facebook Page ID or Access Token" };
    }
    let tokenToUse = accessToken;
    if (videoUrl && videoUrl.startsWith("http")) {
      const fbUrl = `https://graph.facebook.com/v20.0/${pageId}/videos`;
      let res = await fetch(fbUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_url: videoUrl,
          description: message,
          access_token: tokenToUse,
        }),
      });
      let data = await res.json();

      if (!data.id && (data.error?.code === 100 || data.error?.code === 200 || data.error?.message?.includes("permission"))) {
        const resolved = await resolvePageToken(pageId, tokenToUse);
        if (resolved && resolved !== tokenToUse) {
          tokenToUse = resolved;
          res = await fetch(fbUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              file_url: videoUrl,
              description: message,
              access_token: tokenToUse,
            }),
          });
          data = await res.json();
        }
      }

      if (data.id) return { success: true, postId: data.id };
      return { success: false, error: data.error?.message || JSON.stringify(data) };
    } else {
      const fbUrl = `https://graph.facebook.com/v20.0/${pageId}/feed`;
      let res = await fetch(fbUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, access_token: tokenToUse }),
      });
      let data = await res.json();
      if (data.id) return { success: true, postId: data.id };
      return { success: false, error: data.error?.message || JSON.stringify(data) };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Live Publish to Instagram Graph API
async function publishToInstagramLive(igUserId: string, accessToken: string, videoUrl: string, caption: string) {
  try {
    if (!igUserId || !accessToken) {
      return { success: false, error: "Missing Instagram Business Account ID or Access Token" };
    }
    if (!videoUrl || !videoUrl.startsWith("http")) {
      return { success: false, error: "Instagram requires a valid public video URL" };
    }

    let tokenToUse = accessToken;
    const mediaContainerUrl = `https://graph.facebook.com/v20.0/${igUserId}/media`;
    let res = await fetch(mediaContainerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_type: "REELS",
        video_url: videoUrl,
        caption: caption,
        access_token: tokenToUse,
      }),
    });
    let data = await res.json();

    if (!data.id && (data.error?.code === 100 || data.error?.code === 200 || data.error?.message?.includes("permission"))) {
      const pageId = process.env.FACEBOOK_PAGE_ID || "";
      if (pageId) {
        const resolved = await resolvePageToken(pageId, tokenToUse);
        if (resolved && resolved !== tokenToUse) {
          tokenToUse = resolved;
          res = await fetch(mediaContainerUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              media_type: "REELS",
              video_url: videoUrl,
              caption: caption,
              access_token: tokenToUse,
            }),
          });
          data = await res.json();
        }
      }
    }

    if (!data.id) {
      return { success: false, error: data.error?.message || JSON.stringify(data) };
    }

    const creationId = data.id;

    // Poll until ready
    let isReady = false;
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 4000));
      const statusRes = await fetch(`https://graph.facebook.com/v20.0/${creationId}?fields=status_code&access_token=${tokenToUse}`);
      const statusData = await statusRes.json();
      if (statusData.status_code === "FINISHED") {
        isReady = true;
        break;
      } else if (statusData.status_code === "ERROR") {
        return { success: false, error: "Instagram media container encoding failed" };
      }
    }

    if (!isReady) {
      return { success: false, error: "Instagram media encoding timeout. Please retry." };
    }

    const publishUrl = `https://graph.facebook.com/v20.0/${igUserId}/media_publish`;
    const publishRes = await fetch(publishUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: tokenToUse,
      }),
    });
    const publishData = await publishRes.json();
    if (publishData.id) {
      return { success: true, postId: publishData.id };
    } else {
      return { success: false, error: publishData.error?.message || JSON.stringify(publishData) };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const rawId = body.videoId || body.id || body.mediaId || body.jobId;
    const videoUrlParam = body["video 1"] || body.videoUrl || body.url;
    const idempotencyKey = body.idempotencyKey;

    if (!rawId && !videoUrlParam) {
      return NextResponse.json(
        { success: false, error: "Missing required property 'videoId' (or 'video 1' URL parameter) in request body" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    if (idempotencyKey) {
      const existingJob = await OfferApprovalJobModel.findOne({ idempotencyKey });
      if (existingJob) {
        if (existingJob.status === "completed") {
          return NextResponse.json({ ...existingJob.resultData, status: "success" });
        }
        return NextResponse.json({
          status: existingJob.status,
          jobId: existingJob.jobId,
          message: "Offer approval is currently processing. Poll GET /api/external/offer_approval for status."
        });
      }
    }

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

    // If no existing media item found, create a placeholder media item so approval and social scheduling always succeed
    if (!mediaItem && !videoJob) {
      const defaultUrl = videoUrlParam || "https://iot-test.metizstoresparc.com/uploads/rendered/cr_789258dae1224162_16x9.mp4";
      const validUserId = (body.userId && mongoose.Types.ObjectId.isValid(String(body.userId).trim()))
        ? new mongoose.Types.ObjectId(String(body.userId).trim())
        : new mongoose.Types.ObjectId("69e9425426e6e857385b4fa6");
      try {
        mediaItem = await MediaItemModel.create({
          _id: (rawId && mongoose.Types.ObjectId.isValid(String(rawId).trim())) ? new mongoose.Types.ObjectId(String(rawId).trim()) : new mongoose.Types.ObjectId(),
          name: body.offerName || "Promotional Offer Video",
          type: "video",
          url: defaultUrl,
          ratio: "16:9",
          userId: validUserId,
          offerId: body.offerId || body.offer_id || "149051",
          templateId: body.templateId || body.template_id || "14",
          channels: body.channels || ["facebook", "instagram"],
          voiceoverScript: body.voiceoverScript || "",
          socialMediaCaption: body.facebookCaption || body.instagramCaption || "",
          tagline: body.tagline || "",
        });
      } catch (err) {
        console.warn("[offer_approval] MediaItem placeholder creation error:", err);
      }
    }

    const jobId = uuidv4();
    const newJob = await OfferApprovalJobModel.create({
      jobId,
      idempotencyKey: idempotencyKey || undefined,
      status: "processing"
    });

    // Fire unawaited background job
    (async () => {
      try {
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
        let newOfferId = (offerId != null || offer_id != null) ? String(offerId ?? offer_id).trim() : undefined;

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

        const newTemplateId = (templateId != null || template_id != null) ? String(templateId ?? template_id).trim() : undefined;
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
                    ...(tagline != null ? { tagline: String(tagline).trim() } : {}),
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
                  ...(tagline != null ? { tagline: String(tagline).trim() } : {}),
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
        if (rawChannels != null) {
          if (Array.isArray(rawChannels)) {
            newChannels = rawChannels.map((c: any) => String(c).trim()).filter(Boolean);
          } else if (typeof rawChannels === "string") {
            newChannels = rawChannels.split(",").map((s: string) => s.trim()).filter(Boolean);
          }
        }



        // Apply updates to MediaItem
        if (mediaItem) {
          if (newChannels !== undefined) mediaItem.channels = newChannels;
          if (voiceoverScript != null) mediaItem.voiceoverScript = String(voiceoverScript).trim();
          if (socialMediaHeading != null) mediaItem.socialMediaHeading = String(socialMediaHeading).trim();
          if (newOfferId !== undefined) mediaItem.offerId = newOfferId;
          if (newTemplateId !== undefined) mediaItem.templateId = newTemplateId;
          if (tagline != null) mediaItem.tagline = String(tagline).trim();
          mediaItem.approvalStatus = "success";
          if (mediaItem && typeof mediaItem.save === "function") await mediaItem.save();
        }

        // Apply updates to VideoJob or GoogleFlowJob
        if (videoJob) {
          if (newChannels !== undefined) {
            videoJob.channels = newChannels;
            if (videoJob.socialMedia !== undefined) videoJob.socialMedia = newChannels;
          }
          if (voiceoverScript != null) videoJob.voiceoverScript = String(voiceoverScript).trim();
          if (socialMediaHeading != null) videoJob.socialMediaHeading = String(socialMediaHeading).trim();
          if (newOfferId !== undefined) videoJob.offerId = newOfferId;
          if (newTemplateId !== undefined) videoJob.templateId = newTemplateId;
          if (tagline != null) videoJob.tagline = String(tagline).trim();
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
            const cloudRes = await fetch(`https://video-generator.storesparc.com/index.php/api/external/videos?job_id=${targetJobId}`, {
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
        const finalScript = voiceoverScript != null ? String(voiceoverScript).trim() : (mediaItem?.voiceoverScript || videoJob?.voiceoverScript || "");
        const finalHeading = socialMediaHeading != null ? String(socialMediaHeading).trim() : (mediaItem?.socialMediaHeading || videoJob?.socialMediaHeading || "");

        const finalCaption = (mediaItem?.socialMediaCaption || videoJob?.socialMediaCaption || "");
        const finalTags = (mediaItem?.hashTags || videoJob?.hashTags || []);

        const finalFbCaption = facebookCaption != null ? String(facebookCaption).trim() : (mediaItem?.facebookCaption || videoJob?.facebookCaption || mediaItem?.socialMediaCaption || videoJob?.socialMediaCaption || "");
        const finalFbTags = facebookHashTags != null ? facebookHashTags : (mediaItem?.facebookHashTags || videoJob?.facebookHashTags || mediaItem?.hashTags || videoJob?.hashTags || []);
        const finalIgCaption = instagramCaption != null ? String(instagramCaption).trim() : (mediaItem?.instagramCaption || videoJob?.instagramCaption || mediaItem?.socialMediaCaption || videoJob?.socialMediaCaption || "");
        const finalIgTags = instagramHashTags != null ? instagramHashTags : (mediaItem?.instagramHashTags || videoJob?.instagramHashTags || mediaItem?.hashTags || videoJob?.hashTags || []);

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
              ...(tagline != null ? { tagline: String(tagline).trim() } : {}),
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
          if (tagline != null) mediaMetadata.tagline = String(tagline).trim();
          await mediaMetadata.save();

          if (mediaItem && (!mediaItem.metadataId || mediaItem.metadataId.toString() !== mediaMetadata._id.toString())) {
            mediaItem.metadataId = mediaMetadata._id;
            if (mediaItem && typeof mediaItem.save === "function") await mediaItem.save();
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

        // 3.6 Social Media Video Scheduling Integration (Live Meta Graph API & Australia/Sydney timing)
        let facebookSchedulingStatus = "Skipped (facebook not in channels)";
        let instagramSchedulingStatus = "Skipped (instagram not in channels)";
        let createdSocialPosts: any[] = [];
        let socialTiming: any = null;

        const shouldPostFb = finalChannels && finalChannels.some((c: string) => c.toLowerCase() === "facebook");
        const shouldPostIg = finalChannels && finalChannels.some((c: string) => c.toLowerCase() === "instagram");

        if (shouldPostFb || shouldPostIg) {
          try {
            // Resolve 16:9 (Facebook) and 9:16 (Instagram) video URLs
            let resolved169Url = "";
            let resolved916Url = "";

            if (mediaItem?.jobId) {
              const siblingMedia = await MediaItemModel.find({ jobId: mediaItem.jobId }).lean();
              siblingMedia.forEach((m: any) => {
                if (m.ratio === "16:9" && !resolved169Url) resolved169Url = m.url;
                if (m.ratio === "9:16" && !resolved916Url) resolved916Url = m.url;
              });
            }

            if (!resolved169Url) {
              resolved169Url = (mediaItem?.ratio === "16:9" ? mediaItem.url : "") ||
                fetchedCloudVideos.find((v: any) => v.ratio === "16:9" || v.ratio === "4:5")?.url ||
                finalVideoUrl ||
                "https://iot-test.metizstoresparc.com/uploads/rendered/cr_789258dae1224162_16x9.mp4";
            }

            // Strictly resolve 9:16 vertical video for Instagram upload/schedule
            if (!resolved916Url || /_(16x9|1x1|4x5)\.mp4/i.test(resolved916Url)) {
              if (mediaItem?.ratio === "9:16" && mediaItem?.url) {
                resolved916Url = mediaItem.url;
              }
              if (!resolved916Url || /_(16x9|1x1|4x5)\.mp4/i.test(resolved916Url)) {
                const cloud916 = fetchedCloudVideos.find((v: any) => v.ratio === "9:16")?.url;
                if (cloud916) resolved916Url = cloud916;
              }
              if (!resolved916Url || /_(16x9|1x1|4x5)\.mp4/i.test(resolved916Url)) {
                const sibling916: any = await MediaItemModel.findOne({
                  $or: [
                    ...(finalTemplateId ? [{ templateId: String(finalTemplateId), ratio: "9:16" }] : []),
                    ...(finalOfferId ? [{ offerId: String(finalOfferId), ratio: "9:16" }] : []),
                    ...(mediaItem?.jobId ? [{ jobId: mediaItem.jobId, ratio: "9:16" }] : []),
                  ]
                }).lean().catch(() => null);
                if (sibling916?.url) resolved916Url = sibling916.url;
              }
              if (!resolved916Url || /_(16x9|1x1|4x5)\.mp4/i.test(resolved916Url)) {
                const baseToConvert = resolved169Url || finalVideoUrl || "";
                if (baseToConvert && /_(16x9|1x1|4x5)\.mp4/i.test(baseToConvert)) {
                  resolved916Url = baseToConvert.replace(/_(16x9|1x1|4x5)\.mp4/i, '_9x16.mp4');
                }
              }
              if (!resolved916Url) {
                resolved916Url = resolved169Url || finalVideoUrl || "https://iot-test.metizstoresparc.com/uploads/rendered/cr_789258dae1224162_16x9.mp4";
              }

              const toPublicUrl = (urlStr) => {
                if (!urlStr) return "";
                const trimmed = String(urlStr).trim();
                if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
                const clean = trimmed.replace(/^\/+/, "");
                return `https://iot-test.metizstoresparc.com/${clean}`;
              };

              resolved169Url = toPublicUrl(resolved169Url);
              resolved916Url = toPublicUrl(resolved916Url);
            }

            // Retrieve store user social credentials by userId
            let storeUserDoc: any = null;
            if (targetUserId && mongoose.Types.ObjectId.isValid(String(targetUserId).trim())) {
              storeUserDoc = await User.findById(String(targetUserId).trim()).lean();
            }
            if (!storeUserDoc?.socialCredentials?.facebookPageAccessToken) {
              const fallbackStore = await User.findOne({ storeName: new RegExp('^store4$', 'i') }).lean();
              if (fallbackStore) {
                if (!storeUserDoc) storeUserDoc = fallbackStore;
                else {
                  storeUserDoc.socialCredentials = fallbackStore.socialCredentials;
                }
              }
            }

            const storeSocial = storeUserDoc?.socialCredentials || {};
            const fbTargetId = storeSocial.facebookPageId || process.env.FACEBOOK_PAGE_ID || '1454640227723962';
            const fbAccessToken = storeSocial.facebookPageAccessToken || '';
            const igTargetId = storeSocial.instagramBusinessId || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '17841415867685496';
            const fbAccountName = storeSocial.facebookPageName || storeUserDoc?.storeName || 'Facebook Page';
            const igAccountName = storeSocial.instagramUsername || storeUserDoc?.storeName || 'Instagram Account';

            // Calculate timing using Australia/Sydney Timezone
            const effectiveStartDate = startDate || linkedOfferData?.startDate;
            const timing = calculateAustralianScheduleTiming(effectiveStartDate);
            socialTiming = {
              mode: timing.publishMode,
              scheduledAt: timing.scheduledAt,
              reason: timing.reason,
              timezone: 'Australia/Sydney',
            };

            const fbJoinedTags = (Array.isArray(finalFbTags) ? finalFbTags : [])
              .map((tag: string) => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
            const fbMessage = `${finalFbCaption || tagline || finalHeading || offerName || 'Special Promotional Offer!'}${fbJoinedTags ? '\n\n' + fbJoinedTags : ''}`.trim();

            const igJoinedTags = (Array.isArray(finalIgTags) ? finalIgTags : [])
              .map((tag: string) => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
            const igMessage = `${finalIgCaption || tagline || finalHeading || offerName || 'Special Promotional Offer!'}${igJoinedTags ? '\n\n' + igJoinedTags : ''}`.trim();

            const validUserObjId = storeUserDoc?._id ||
              (targetUserId && mongoose.Types.ObjectId.isValid(String(targetUserId).trim()) ? new mongoose.Types.ObjectId(String(targetUserId).trim()) : new mongoose.Types.ObjectId('69e9425426e6e857385b4fa6'));

            // 1. Post to Facebook if enabled
            if (shouldPostFb) {
              let fbLiveResult: any = null;
              if (timing.isInstant) {
                fbLiveResult = await publishToFacebookLive(fbTargetId, fbAccessToken, resolved169Url, fbMessage);
              }

              const fbPost = await SocialPost.create({
                storeUserId: validUserObjId,
                channel: 'facebook',
                message: fbMessage,
                mediaType: resolved169Url ? 'video' : 'none',
                mediaUrl: resolved169Url,
                templateId: finalTemplateId ? String(finalTemplateId) : '',
                publishMode: timing.publishMode,
                scheduledAt: timing.scheduledAt,
                timezone: 'Australia/Sydney',
                status: timing.isInstant ? (fbLiveResult?.success ? 'published' : 'failed') : 'scheduled',
                publishedAt: timing.isInstant && fbLiveResult?.success ? new Date() : null,
                externalPostId: fbLiveResult?.postId || (timing.isInstant ? `fb_${Date.now()}` : null),
                errorMessage: fbLiveResult?.error || null,
                targetAccountId: fbTargetId,
                targetAccountName: fbAccountName,
              });

              createdSocialPosts.push({
                channel: 'facebook',
                postId: String(fbPost._id),
                status: fbPost.status,
                publishMode: fbPost.publishMode,
                scheduledAt: fbPost.scheduledAt,
                mediaUrl: fbPost.mediaUrl,
                message: fbPost.message,
                externalPostId: fbPost.externalPostId,
                metaError: fbLiveResult?.error || undefined,
              });

              if (timing.isInstant) {
                facebookSchedulingStatus = fbLiveResult?.success
                  ? `Published Successfully (Post ID: ${fbLiveResult.postId})`
                  : `Failed (${fbLiveResult?.error || 'Unknown error'})`;
              } else {
                facebookSchedulingStatus = `Scheduled Successfully for ${timing.scheduledAt.toISOString()} (Australia/Sydney)`;
              }
            }

            // 2. Post to Instagram if enabled
            if (shouldPostIg) {
              let igLiveResult: any = null;
              if (timing.isInstant) {
                igLiveResult = await publishToInstagramLive(igTargetId, fbAccessToken, resolved916Url, igMessage);
              }

              const igPost = await SocialPost.create({
                storeUserId: validUserObjId,
                channel: 'instagram',
                message: igMessage,
                mediaType: resolved916Url ? 'video' : 'none',
                mediaUrl: resolved916Url,
                templateId: finalTemplateId ? String(finalTemplateId) : '',
                publishMode: timing.publishMode,
                scheduledAt: timing.scheduledAt,
                timezone: 'Australia/Sydney',
                status: timing.isInstant ? (igLiveResult?.success ? 'published' : 'failed') : 'scheduled',
                publishedAt: timing.isInstant && igLiveResult?.success ? new Date() : null,
                externalPostId: igLiveResult?.postId || (timing.isInstant ? `ig_${Date.now()}` : null),
                errorMessage: igLiveResult?.error || null,
                targetAccountId: igTargetId,
                targetAccountName: igAccountName,
              });

              createdSocialPosts.push({
                channel: 'instagram',
                postId: String(igPost._id),
                status: igPost.status,
                publishMode: igPost.publishMode,
                scheduledAt: igPost.scheduledAt,
                mediaUrl: igPost.mediaUrl,
                message: igPost.message,
                externalPostId: igPost.externalPostId,
                metaError: igLiveResult?.error || undefined,
              });

              if (timing.isInstant) {
                instagramSchedulingStatus = igLiveResult?.success
                  ? `Published Successfully (Post ID: ${igLiveResult.postId})`
                  : `Failed (${igLiveResult?.error || 'Unknown error'})`;
              } else {
                instagramSchedulingStatus = `Scheduled Successfully for ${timing.scheduledAt.toISOString()} (Australia/Sydney)`;
              }
            }
          } catch (err: any) {
            console.error('[offer_approval] Social scheduling error:', err);
            if (shouldPostFb && facebookSchedulingStatus.includes('Skipped')) {
              facebookSchedulingStatus = `Failed (${err.message || 'Error'})`;
            }
            if (shouldPostIg && instagramSchedulingStatus.includes('Skipped')) {
              instagramSchedulingStatus = `Failed (${err.message || 'Error'})`;
            }
          }
        }

        const response: Record<string, any> = {
          status: "success",
          videoId: mediaItem?._id ? mediaItem._id.toString() : videoJob?.videoId || "",
          facebookSchedulingStatus,
          instagramSchedulingStatus,
          socialTiming,
          posts: createdSocialPosts,
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
        if (tagline != null) {
          response.tagline = String(tagline).trim();
        } else {
          const existingTagline = mediaItem?.tagline || videoJob?.tagline || "";
          if (existingTagline) response.tagline = existingTagline;
        }
        response.voiceoverScript = finalScript;

        if (finalChannels && finalChannels.length > 0) {
          response.channels = finalChannels;
          if (finalChannels.some((c: string) => c.toLowerCase() === 'facebook')) {
            response.facebookCaption = finalFbCaption;
            response.facebookHashTags = finalFbTags;
          }
          if (finalChannels.some((c: string) => c.toLowerCase() === 'instagram')) {
            response.instagramCaption = finalIgCaption;
            response.instagramHashTags = finalIgTags;
          }
        }

        if (videoJob?.enhancedPrompt) {
          response.enhancedPrompt = videoJob.enhancedPrompt;
        }

        newJob.status = "completed";
        newJob.resultData = response;
        await newJob.save();
      } catch (err: any) {
        console.error("[external/offer_approval] Async Job Error:", err);
        newJob.status = "failed";
        newJob.error = err.message || String(err);
        await newJob.save();
      }
    })();

    return NextResponse.json({
      success: true,
      status: "processing",
      jobId,
      message: "Offer approval is processing in the background. Poll GET /api/external/offer_approval?jobId=" + jobId + " to check status."
    });
  } catch (error: any) {
    console.error("[external/offer_approval] Error:", error);
    return NextResponse.json(
      { error: "Failed to process offer approval", details: error.message || String(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json({ success: false, error: "jobId query parameter is required" }, { status: 400 });
    }

    await connectToDatabase();
    const job = await OfferApprovalJobModel.findOne({ jobId });

    if (!job) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }

    if (job.status === "completed") {
      return NextResponse.json({ ...job.resultData, status: "success" });
    }

    if (job.status === "failed") {
      return NextResponse.json({ success: false, status: "failed", error: job.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      status: "processing",
      jobId: job.jobId,
      message: "Job is still processing"
    });
  } catch (error: any) {
    console.error("[external/offer_approval] GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch job status", details: error.message || String(error) }, { status: 500 });
  }
}
