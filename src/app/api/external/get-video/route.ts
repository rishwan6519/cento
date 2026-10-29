import { NextRequest, NextResponse } from 'next/server';
import { getRenderJob } from '@/lib/videoRenderer/renderService';
import { connectToDatabase } from '@/lib/db';
import MediaItemModel from '@/models/MediaItems';
import VideoJobModel from '@/models/VideoJob';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Injects dynamic social media captions and hashtags tailored strictly to requested channels.
 */
function injectSocialCaptions(payload: Record<string, any>, channels: string[], baseText: string) {
  if (!channels || channels.length === 0) return;
  const rawText = (baseText || '').trim();
  const shortSnippet = rawText
    ? (rawText.length > 35 ? rawText.slice(0, 35) + '...' : rawText)
    : 'our exclusive offer';

  const wantsFacebook = channels.some((c) => String(c).toLowerCase() === 'facebook');
  const wantsInstagram = channels.some((c) => String(c).toLowerCase() === 'instagram');

  if (wantsFacebook) {
    payload.facebookCaptions = [
      `Check out our amazing offer: ${shortSnippet}. Visit us today and claim your discount! 🛍️`,
      `Incredible savings are here! Get your hands on this exclusive deal before it's gone. 🏃‍♂️💨`,
      `Time is ticking! ⏰ Grab ${shortSnippet} today and enjoy massive discounts. Don't let this slip away!`,
      `Premium quality, unbeatable prices! Dive into our latest offers featuring ${shortSnippet}. Click to learn more! 🌟`,
      `We've got a surprise for you! 🎁 Unlock special savings on ${shortSnippet}. Shop with us and elevate your lifestyle!`,
    ];
    payload.facebookHashTags = [
      '#SpecialOffer',
      '#BigSavings',
      '#ShopLocal',
      '#MegaSale',
      '#Deals',
      '#DiscountOffer',
      '#LimitedTime',
      '#HurryUp',
      '#FlashSale',
      '#PremiumQuality',
    ];
  }

  if (wantsInstagram) {
    payload.instagramCaptions = [
      `Upgrade your shopping experience with our exclusive deal! ✨ ${shortSnippet}. Link in bio to grab yours! 🛒💖`,
      `Trending now 🔥 Treat yourself to ${shortSnippet} and save big! Swipe up to shop the look! 🛍️✨`,
      `Your daily dose of savings! 💸 Discover the magic of ${shortSnippet} at unbeatable prices. Double tap if you love a good deal! ❤️`,
      `Level up your style with our premium collection! ✨ Score ${shortSnippet} today. Link in bio! 👗🎉`,
      `Because you deserve the best! 💖 Treat yourself to ${shortSnippet} with our limited-time offer. Shop now and thank us later! 🛒✨`,
    ];
    payload.instagramHashTags = [
      '#ExclusiveDeal',
      '#ShopNow',
      '#Discounts',
      '#Trending',
      '#MustHave',
      '#Style',
      '#OOTD',
      '#Fashion',
      '#Shopping',
      '#Sale',
    ];
  }
}

async function handleGetVideo(jobIdInput: string) {
  const jobId = (jobIdInput || '').trim();
  if (!jobId) {
    return NextResponse.json(
      { success: false, message: 'job_id or videoId is required' },
      { status: 400 }
    );
  }

  await connectToDatabase();

  let status = 'processing';
  let offerId = '';
  let templateId = '';
  let voiceoverScript = '';
  let channels: string[] = [];
  let rawVideos: any[] = [];
  let errorMessage = '';

  // 1. Check local video renderer job (in-memory or status.json)
  try {
    const renderJob = await getRenderJob(jobId);
    if (renderJob) {
      status = renderJob.status;
      if (renderJob.offerId) offerId = renderJob.offerId;
      if (renderJob.templateId) templateId = String(renderJob.templateId);
      if (renderJob.voiceoverScript) voiceoverScript = renderJob.voiceoverScript;
      if (renderJob.channels && renderJob.channels.length > 0) {
        channels = renderJob.channels.map((c: any) => String(c).trim().toLowerCase());
      }
      if (renderJob.videos && renderJob.videos.length > 0) {
        rawVideos = renderJob.videos;
      }
      if (renderJob.errorMessage) errorMessage = renderJob.errorMessage;
    }
  } catch (rErr) {
    console.warn('[get-video] renderService check error:', rErr);
  }

  // 2. Query MongoDB MediaItemModel for videos matching jobId or _id
  let mediaDocs: any[] = [];
  try {
    if (mongoose.Types.ObjectId.isValid(jobId)) {
      const byId = await MediaItemModel.findById(jobId).lean();
      if (byId) mediaDocs.push(byId);
    }
    const byJobId = await MediaItemModel.find({ jobId }).lean();
    if (byJobId && byJobId.length > 0) {
      for (const doc of byJobId) {
        if (!mediaDocs.some((m) => m._id.toString() === doc._id.toString())) {
          mediaDocs.push(doc);
        }
      }
    }
  } catch (mErr) {
    console.warn('[get-video] MediaItemModel query error:', mErr);
  }

  if (mediaDocs.length > 0) {
    status = 'completed';
    const primaryDoc = mediaDocs[0];
    if (!offerId && primaryDoc.offerId) offerId = primaryDoc.offerId;
    if (!templateId && primaryDoc.templateId) templateId = String(primaryDoc.templateId);
    if (!voiceoverScript && primaryDoc.voiceoverScript) voiceoverScript = primaryDoc.voiceoverScript;
    if (channels.length === 0 && primaryDoc.channels && primaryDoc.channels.length > 0) {
      channels = primaryDoc.channels.map((c: any) => String(c).trim().toLowerCase());
    }
  }

  // 3. Fallback to CloudbasesJobModel if any metadata is missing
  if (!offerId || !templateId || channels.length === 0) {
    try {
      const CloudbasesJobModel = (await import('@/models/CloudbasesJob')).default;
      const cloudJob = await CloudbasesJobModel.findOne({ jobId }).lean();
      if (cloudJob) {
        if (!offerId && cloudJob.offerId) offerId = cloudJob.offerId;
        if (!templateId && cloudJob.templateId) templateId = String(cloudJob.templateId);
        if (!voiceoverScript && cloudJob.voiceoverScript) voiceoverScript = cloudJob.voiceoverScript;
        if (channels.length === 0 && cloudJob.channels && cloudJob.channels.length > 0) {
          channels = cloudJob.channels.map((c: any) => String(c).trim().toLowerCase());
        }
        if (cloudJob.status === 'completed') status = 'completed';
        if (cloudJob.status === 'failed') {
          status = 'failed';
          errorMessage = cloudJob.errorMessage || 'Video generation failed';
        }
        if (cloudJob.resultData && (cloudJob.resultData as any).saved_videos) {
          for (const sv of (cloudJob.resultData as any).saved_videos) {
            if (!mediaDocs.some((m) => m.url === sv.url)) {
              mediaDocs.push({
                _id: sv.mediaId || new mongoose.Types.ObjectId(),
                url: sv.url,
                name: sv.name,
                ratio: sv.ratio || '16:9',
              });
            }
          }
        }
      }
    } catch {}
  }

  // 4. Fallback to VideoJobModel
  if (!offerId || !templateId || channels.length === 0) {
    try {
      const videoJob: any = await VideoJobModel.findOne({ $or: [{ videoId: jobId }, { jobId }] }).lean();
      if (videoJob) {
        if (!offerId && videoJob.offerId) offerId = videoJob.offerId;
        if (!templateId && videoJob.templateId) templateId = String(videoJob.templateId);
        if (!voiceoverScript && videoJob.voiceoverScript) voiceoverScript = videoJob.voiceoverScript;
        if (channels.length === 0 && videoJob.channels && videoJob.channels.length > 0) {
          channels = videoJob.channels.map((c: any) => String(c).trim().toLowerCase());
        }
        if (videoJob.status === 'completed') status = 'completed';
      }
    } catch {}
  }

  // 5. If not found in any source
  if (!rawVideos.length && mediaDocs.length === 0 && !offerId && !templateId && status !== 'completed' && status !== 'processing') {
    return NextResponse.json(
      { success: false, message: `No video generation job found with jobId '${jobId}'` },
      { status: 404 }
    );
  }

  // If still queued or processing
  if (status === 'queued' || status === 'processing') {
    return NextResponse.json({
      success: true,
      status: 'processing',
      jobId,
      message: 'Video is processing',
    });
  }

  if (status === 'failed') {
    return NextResponse.json({
      success: false,
      status: 'failed',
      jobId,
      message: errorMessage || 'Video generation failed.',
    });
  }

  // 6. Format videos array ensuring mediaId, url, name, ratio
  const formattedVideos: Array<{
    mediaId: string;
    url: string;
    name: string;
    ratio: string;
  }> = [];

  if (mediaDocs.length > 0) {
    for (const doc of mediaDocs) {
      formattedVideos.push({
        mediaId: doc._id.toString(),
        url: doc.url,
        name: doc.name || `Generated Promo Video (${doc.ratio || '16:9'}) – ${new Date(doc.createdAt || Date.now()).toLocaleString()}`,
        ratio: doc.ratio || '16:9',
      });
    }
  } else if (rawVideos.length > 0) {
    const User = (await import('@/models/User')).default;
    const fallbackUser = await User.findOne({}).select('_id').lean().catch(() => null);

    for (const v of rawVideos) {
      let resolvedMediaId = v.mediaId || '';
      let videoName = v.name || `Generated Promo Video (${v.ratio || '16:9'}) – ${new Date().toLocaleString()}`;

      if (!resolvedMediaId) {
        try {
          const savedItem = await MediaItemModel.create({
            userId: fallbackUser?._id || new mongoose.Types.ObjectId(),
            name: videoName,
            type: 'video',
            fileCategory: 'offer',
            url: v.url,
            approvalStatus: 'approved',
            templateId: templateId || undefined,
            offerId: offerId || undefined,
            channels: channels || [],
            voiceoverScript: voiceoverScript || '',
            ratio: v.ratio || '16:9',
            jobId,
            createdAt: new Date(),
          });
          resolvedMediaId = savedItem._id.toString();
        } catch (err) {
          console.warn('[get-video] fallback MediaItem create error:', err);
        }
      }

      formattedVideos.push({
        mediaId: resolvedMediaId,
        url: v.url,
        name: videoName,
        ratio: v.ratio || '16:9',
      });
    }
  }

  // Prefer 16:9 video as primary in list if present, matching user's response format:
  const videos16x9 = formattedVideos.filter((v) => v.ratio === '16:9');
  const returnVideos = videos16x9.length > 0 ? videos16x9 : formattedVideos;

  const responsePayload: Record<string, any> = {
    success: true,
    status: 'completed',
    jobId,
    offerId: offerId || '',
    templateId: templateId || '14',
    message: 'OK',
    videos: returnVideos,
    voiceoverScript: voiceoverScript || '',
    channels: channels,
  };

  // Inject dynamic social captions & hashtags strictly based on channels
  injectSocialCaptions(responsePayload, channels, voiceoverScript);

  return NextResponse.json(responsePayload);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId =
      searchParams.get('job_id') ||
      searchParams.get('jobId') ||
      searchParams.get('videoId') ||
      searchParams.get('id') ||
      '';
    return await handleGetVideo(jobId);
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const jobId =
      body.job_id ||
      body.jobId ||
      body.videoId ||
      body.id ||
      '';
    return await handleGetVideo(jobId);
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}


/*
================================================================================
PREVIOUS /api/external/get-video CODE (COMMENTED OUT AS REQUESTED)
================================================================================

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { connectToDatabase } from "@/lib/db";
import MediaItemModel from "@/models/MediaItems";
import VideoJobModel, { IVideoJob } from "@/models/VideoJob";
import Offer from "@/models/Offer";
import MediaMetadataModel from "@/models/MediaMetadata";
import GoogleFlowJobModel from "@/models/GoogleFlowJob";
import { checkAndResolveGoogleJob } from "@/lib/googleFlowGet";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Helper: Recursively search any fal.ai payload to find the media file URL
// ---------------------------------------------------------------------------
function extractMediaUrl(obj: any, visited = new Set()): string {
  if (!obj || typeof obj === "number" || typeof obj === "boolean" || visited.has(obj)) return "";
  if (typeof obj === "string") {
    const trimmed = obj.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      if (!trimmed.includes("/status") && !trimmed.includes("/requests/")) {
        return trimmed;
      }
    }
    return "";
  }
  if (typeof obj === "object") {
    visited.add(obj);
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = extractMediaUrl(item, visited);
      if (found) return found;
    }
  } else if (typeof obj === "object") {
    // Check all known media URL property names directly without filtering domain or file extension
    for (const k of ["url", "video_url", "video_file", "file", "src", "link", "media"]) {
      if (obj[k] && typeof obj[k] === "string" && (obj[k].startsWith("http://") || obj[k].startsWith("https://"))) {
        const urlStr = obj[k].trim();
        if (!urlStr.includes("/status") && !urlStr.includes("/requests/")) {
          return urlStr;
        }
      }
    }
    for (const key of Object.keys(obj)) {
      if (["status_url", "response_url", "status", "request_id", "logs", "metrics"].includes(key)) continue;
      const found = extractMediaUrl(obj[key], visited);
      if (found) return found;
    }
  }
  return "";
}

// ---------------------------------------------------------------------------
// Helper: Inject dynamic social captions based on channels
// ---------------------------------------------------------------------------
function injectSocialCaptions(payload: any, channels: string[], baseText: string) {
  if (!channels || channels.length === 0) return;
  const shortSnippet = baseText || "our exclusive offers";

  const wantsFacebook = channels.some(c => String(c).toLowerCase() === "facebook");
  const wantsInstagram = channels.some(c => String(c).toLowerCase() === "instagram");

  if (wantsFacebook) {
    payload.facebookCaptions = [
      `${shortSnippet} Check out our amazing offer today! Visit us and claim your discount! 🛍️`,
      `${shortSnippet} Incredible savings are here! Get your hands on this exclusive deal before it's gone. 🏃‍♂️💨`,
      `${shortSnippet} Time is ticking! ⏰ Grab this offer today and enjoy massive discounts. Don't let this slip away!`,
      `${shortSnippet} Premium quality, unbeatable prices! Dive into our latest offers. Click to learn more! 🌟`,
      `${shortSnippet} We've got a surprise for you! 🎁 Unlock special savings. Shop with us and elevate your lifestyle!`
    ];
    payload.facebookHashTags = [
      "#SpecialOffer", "#BigSavings", "#ShopLocal", "#MegaSale", "#Deals", "#DiscountOffer", "#LimitedTime", "#HurryUp", "#FlashSale", "#PremiumQuality"
    ];
  }

  if (wantsInstagram) {
    payload.instagramCaptions = [
      `${shortSnippet} Upgrade your shopping experience with our exclusive deal! ✨ Link in bio to grab yours! 🛒💖`,
      `${shortSnippet} Trending now 🔥 Treat yourself and save big! Swipe up to shop the look! 🛍️✨`,
      `${shortSnippet} Your daily dose of savings! 💸 Discover the magic at unbeatable prices. Double tap if you love a good deal! ❤️`,
      `${shortSnippet} Level up your style with our premium collection! ✨ Score this today. Link in bio! 👗🎉`,
      `${shortSnippet} Because you deserve the best! 💖 Treat yourself with our limited-time offer. Shop now and thank us later! 🛒✨`
    ];
    payload.instagramHashTags = [
      "#ExclusiveDeal", "#ShopNow", "#Discounts", "#Trending", "#MustHave", "#Style", "#OOTD", "#Fashion", "#Shopping", "#Sale"
    ];
  }
}

// ---------------------------------------------------------------------------
// Helper: Build standardized response payload for a completed video job
// ---------------------------------------------------------------------------
async function buildCompletedJobResponse(job: any): Promise<NextResponse> {
  const responsePayload: Record<string, any> = {};

  const generatedUrls = job.falRequests.map((r: any) => r.videoUrl || "").filter(Boolean);
  let resolvedVideoId = job.videoId || "";
  if (!resolvedVideoId && generatedUrls[0]) {
    const foundMedia: any = await MediaItemModel.findOne({ url: generatedUrls[0] }).select("_id").lean();
    if (foundMedia && foundMedia._id) {
      resolvedVideoId = foundMedia._id.toString();
      job.videoId = resolvedVideoId;
      await job.save().catch(() => { });
    }
  }

  const currentChannels = job.channels || job.socialMedia || [];
  const defaultHeading = "Experience Uncompromising Quality!";
  const defaultCaption = job.voiceoverScript
    ? `${job.voiceoverScript.slice(0, 80)}... Discover the ultimate experience today!`
    : "Elevated performance and flawless design. Check out our exclusive promotional offer today!";
  const defaultTags = ["#Exclusive", "#Trending", "#Viral", "#Ad", "#NewRelease"];

  responsePayload.status = "success";
  responsePayload.videoId = resolvedVideoId;
  if (job.offerId) {
    responsePayload.offerId = job.offerId;
    const trimmedId = String(job.offerId).trim();
    const query = mongoose.Types.ObjectId.isValid(trimmedId)
      ? { $or: [{ _id: trimmedId }, { offerId: trimmedId }] }
      : { offerId: trimmedId };
    const linkedOffer: any = await Offer.findOne(query).lean().catch(() => null);
    if (linkedOffer) {
      if (linkedOffer.offerName) responsePayload.offerName = linkedOffer.offerName;
      if (linkedOffer.offerDescription) responsePayload.offerDescription = linkedOffer.offerDescription;
      if (linkedOffer.startDate) responsePayload.offerStartDate = new Date(linkedOffer.startDate).toISOString().split("T")[0];
      if (linkedOffer.endDate) responsePayload.offerEndDate = new Date(linkedOffer.endDate).toISOString().split("T")[0];
    }
  }
  responsePayload.tagline = job.tagline || "";
  if (job.imageTypes && job.imageTypes.length > 0) {
    responsePayload.imageTypes = job.imageTypes;
  }
  responsePayload.templateId = job.templateId || "";

  generatedUrls.forEach((url: string, index: number) => {
    responsePayload[`video ${index + 1}`] = url;
  });

  responsePayload.enhancedPrompt = job.enhancedPrompt || "";
  responsePayload.voiceoverScript = job.voiceoverScript || "";

  if (currentChannels && currentChannels.length > 0) {
    responsePayload.channels = currentChannels;
    injectSocialCaptions(responsePayload, currentChannels, job.offerDescription || job.voiceoverScript || job.tagline || job.enhancedPrompt || "");
  }

  return NextResponse.json(responsePayload);
}

// ---------------------------------------------------------------------------
// Helper: Check status of a video job and download results when ready
// ---------------------------------------------------------------------------
async function checkAndResolveJob(jobId: string) {
  await connectToDatabase();
  const job: IVideoJob | null = await VideoJobModel.findOne({ jobId });
  if (!job) {
    const googleJob = await GoogleFlowJobModel.findOne({ jobId });
    if (googleJob) {
      return await checkAndResolveGoogleJob(jobId, true);
    }
    // Check CloudbasesJob (new async video generation via cloudbases.in)
    const CloudbasesJobModel = (await import('@/models/CloudbasesJob')).default;
    const cloudJob = await CloudbasesJobModel.findOne({ jobId });
    if (cloudJob) {
      if (cloudJob.status === 'processing') {
        try {
          const apiKey = process.env.CLOUDBASES_API_KEY || "";
          const extRes = await fetch(`https://cloudbases.in/storesparc_video/index.php/api/external/videos?job_id=${jobId}`, {
            headers: {
              ...(apiKey ? { 'X-API-Key': apiKey } : {})
            }
          });
          if (extRes.ok) {
            const extJson = await extRes.json();
            if (extJson && extJson.success && extJson.data) {
              if (extJson.data.status === 'completed') {
                cloudJob.status = 'completed';
                cloudJob.resultData = extJson; // Contains full completed JSON
                await cloudJob.save();
              } else if (extJson.data.status === 'failed') {
                cloudJob.status = 'failed';
                cloudJob.errorMessage = extJson.data.message || 'Video generation failed at cloudbases';
                await cloudJob.save();
              }
            }
          }
        } catch (e) {
          console.error("[get-video] Error fetching status from cloudbases:", e);
        }
      }

      if (cloudJob.status === 'processing') {
        return NextResponse.json({
          success: true,
          status: 'processing',
          jobId,
          ...(cloudJob.offerId ? { offerId: cloudJob.offerId } : {}),
          provider: 'cloudbases',
          templateId: cloudJob.templateId,
          message: 'Video generation is in progress. Please check again in a minute.',
          voiceoverScript: cloudJob.voiceoverScript || "",
          channels: cloudJob.channels || [],
        });
      }

      if (cloudJob.status === 'failed') {
        return NextResponse.json({
          success: false,
          status: 'failed',
          jobId,
          ...(cloudJob.offerId ? { offerId: cloudJob.offerId } : {}),
          provider: 'cloudbases',
          message: cloudJob.errorMessage || 'Video generation failed.',
          voiceoverScript: cloudJob.voiceoverScript || "",
          channels: cloudJob.channels || [],
        });
      }
      // completed
      let finalResultData = { ...cloudJob.resultData };
      const jobUserId = cloudJob.userId;

      if (!finalResultData.saved_videos) {
        finalResultData.saved_videos = [];
        // Migrate old saved video if present
        if (finalResultData.local_video_url) {
          try {
            let mediaItem = await MediaItemModel.findOne({ url: finalResultData.local_video_url });
            if (mediaItem) {
              finalResultData.saved_videos.push({
                mediaId: mediaItem._id.toString(),
                url: finalResultData.local_video_url,
                name: mediaItem.name,
                ratio: "16:9"
              });
            }
          } catch (e) { }
        }
      }

      let videosToProcess: { originalUrl: string, ratio: string, width?: number, height?: number, duration?: number }[] = [];
      if (finalResultData.data && Array.isArray(finalResultData.data.videos) && finalResultData.data.videos.length > 0) {
        videosToProcess = finalResultData.data.videos.map((v: any) => ({
          originalUrl: v.url || v.file,
          ratio: v.ratio || "16:9",
          width: v.width,
          height: v.height,
          duration: v.duration
        })).filter((v: any) => !!v.originalUrl);
      } else {
        const fallbackUrl = finalResultData.data?.url || finalResultData.data?.file || finalResultData.video_url || finalResultData.videoUrl || finalResultData.url || finalResultData.file;
        const fallbackRatio = finalResultData.data?.ratio || "16:9";
        if (fallbackUrl) {
          videosToProcess.push({ originalUrl: fallbackUrl, ratio: fallbackRatio });
        }
      }

      let downloadedNow = false;

      for (const [index, videoInfo] of videosToProcess.entries()) {
        if (!finalResultData.saved_videos[index]) {
          try {
            const videoRes = await fetch(videoInfo.originalUrl);
            if (videoRes.ok) {
              const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
              const uploadDir = join(process.cwd(), "uploads", jobUserId, "video");
              if (!existsSync(uploadDir)) {
                await mkdir(uploadDir, { recursive: true });
              }
              const fileName = `${uuidv4()}-cloudbases-generated.mp4`;
              await writeFile(join(uploadDir, fileName), videoBuffer);

              const localVideoUrl = `/uploads/${jobUserId}/video/${fileName}`;

              const targetUserObj = mongoose.Types.ObjectId.isValid(jobUserId)
                ? new mongoose.Types.ObjectId(jobUserId)
                : jobUserId;

              let mediaItem = new MediaItemModel({
                userId: targetUserObj,
                name: `Generated Promo Video (${videoInfo.ratio}) – ${new Date().toLocaleString()}`,
                type: "video",
                fileCategory: "offer",
                url: localVideoUrl,
                approvalStatus: "pending",
                templateId: String(cloudJob.templateId),
                ...(cloudJob.offerId ? { offerId: cloudJob.offerId } : {}),
                channels: cloudJob.channels || [],
                voiceoverScript: cloudJob.voiceoverScript || "",
                socialMediaHeading: cloudJob.socialMediaHeading || "",
                socialMediaCaption: cloudJob.socialMediaCaption || "",
                hashTags: cloudJob.hashTags || [],
                facebookCaption: cloudJob.facebookCaption || "",
                facebookHashTags: cloudJob.facebookHashTags || [],
                instagramCaption: cloudJob.instagramCaption || "",
                instagramHashTags: cloudJob.instagramHashTags || [],
                ratio: videoInfo.ratio,
                width: videoInfo.width,
                height: videoInfo.height,
                duration: videoInfo.duration,
                jobId: jobId,
                createdAt: new Date(),
              });
              await mediaItem.save();

              const metadataDoc = await MediaMetadataModel.create({
                mediaId: mediaItem._id,
                userId: targetUserObj,
                channels: cloudJob.channels || [],
                voiceoverScript: cloudJob.voiceoverScript || "",
                socialMediaHeading: cloudJob.socialMediaHeading || "",
                socialMediaCaption: cloudJob.socialMediaCaption || "",
                hashTags: cloudJob.hashTags || [],
                facebookCaption: cloudJob.facebookCaption || "",
                facebookHashTags: cloudJob.facebookHashTags || [],
                instagramCaption: cloudJob.instagramCaption || "",
                instagramHashTags: cloudJob.instagramHashTags || [],
                approvalStatus: "pending",
                templateId: String(cloudJob.templateId),
                ...(cloudJob.offerId ? { offerId: cloudJob.offerId } : {}),
              });
              mediaItem.metadataId = metadataDoc._id;
              await mediaItem.save();

              finalResultData.saved_videos.push({
                mediaId: mediaItem._id.toString(),
                url: localVideoUrl,
                name: mediaItem.name,
                ratio: videoInfo.ratio
              });
              downloadedNow = true;
            }
          } catch (e) {
            console.error(`[get-video] failed to download video at index ${index}:`, e);
          }
        }
      }

      if (downloadedNow) {
        cloudJob.resultData = finalResultData;
        cloudJob.markModified("resultData");
        await cloudJob.save();
      }

      const responsePayload: any = {
        success: true,
        status: 'completed',
        jobId,
        ...(cloudJob.offerId ? { offerId: cloudJob.offerId } : {}),
        provider: 'cloudbases',
        templateId: cloudJob.templateId,
        message: finalResultData.message || 'Video created successfully',
        videos: finalResultData.saved_videos.filter((v: any) => v.ratio === "16:9").length > 0
          ? finalResultData.saved_videos.filter((v: any) => v.ratio === "16:9")
          : finalResultData.saved_videos,
        voiceoverScript: cloudJob.voiceoverScript || "",
        channels: cloudJob.channels || [],
      };

      if (cloudJob.offerId) {
        const trimmedId = String(cloudJob.offerId).trim();
        const query = mongoose.Types.ObjectId.isValid(trimmedId)
          ? { $or: [{ _id: trimmedId }, { offerId: trimmedId }] }
          : { offerId: trimmedId };
        const linkedOffer: any = await Offer.findOne(query).lean().catch(() => null);
        if (linkedOffer) {
          if (linkedOffer.offerName) responsePayload.offerName = linkedOffer.offerName;
          if (linkedOffer.offerDescription) responsePayload.offerDescription = linkedOffer.offerDescription;
          if (linkedOffer.startDate) responsePayload.offerStartDate = new Date(linkedOffer.startDate).toISOString().split("T")[0];
          if (linkedOffer.endDate) responsePayload.offerEndDate = new Date(linkedOffer.endDate).toISOString().split("T")[0];
        }
      }

      injectSocialCaptions(responsePayload, cloudJob.channels || [], cloudJob.voiceoverScript || responsePayload.offerDescription || "");

      return NextResponse.json(responsePayload);
    }

    // Fallback: If not found in any local DB, try directly fetching from cloudbases API
    try {
      const apiKey = process.env.CLOUDBASES_API_KEY || "";
      const extRes = await fetch(`https://cloudbases.in/storesparc_video/index.php/api/external/videos?job_id=${jobId}`, {
        headers: { ...(apiKey ? { 'X-API-Key': apiKey } : {}) }
      });
      if (extRes.ok) {
        const extJson = await extRes.json();
        if (extJson && extJson.success && extJson.data) {
          return NextResponse.json({
            success: true,
            status: extJson.data.status || 'completed',
            jobId,
            provider: 'cloudbases',
            message: extJson.message || 'Video generation found externally',
            data: extJson.data
          });
        }
      }
    } catch (e) {
      console.error("[get-video] Fallback external fetch error:", e);
    }

    return NextResponse.json(
      { success: false, message: `No video generation job found with jobId '${jobId}'` },
      { status: 404 }
    );
  }

  // If job is already completed, instantly return the standardized complete processed data!
  if (job.status === "completed") {
    return await buildCompletedJobResponse(job);
  }

  if (job.status === "failed") {
    return NextResponse.json({
      success: false,
      status: "failed",
      jobId,
      ...(job.offerId ? { offerId: job.offerId } : {}),
      message: "One or more video generation tasks failed during processing at fal.ai.",
    });
  }

  const falKey = process.env.FAL_KEY || "";
  const uploadDir = join(process.cwd(), "uploads", job.userId, "video");
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  if (!job.falRequests || job.falRequests.length === 0) {
    return NextResponse.json({
      success: true,
      status: "processing",
      jobId,
      ...(job.offerId ? { offerId: job.offerId } : {}),
      ...(job.templateId ? { templateId: job.templateId } : {}),
      message: `AI Prompt engineering and video generation queue submission is currently processing in the background. Please check after 10 minutes.`,
    });
  }

  let allCompleted = true;
  let hasFailure = false;
  const renderDetails: string[] = [];

  for (let i = 0; i < job.falRequests.length; i++) {
    const reqItem = job.falRequests[i];
    if (reqItem.status === "completed") {
      renderDetails.push(`Video ${i + 1}: Rendered successfully`);
      continue;
    }
    if (reqItem.status === "failed") {
      hasFailure = true;
      allCompleted = false;
      renderDetails.push(`Video ${i + 1}: Failed during fal.ai rendering`);
      continue;
    }

    // Check status in fal.ai with up to 3 automatic retries for transient DNS/network drops
    try {
      let statusRes: Response | null = null;
      for (let att = 1; att <= 3; att++) {
        try {
          statusRes = await fetch(reqItem.statusUrl, {
            headers: { Authorization: `Key ${falKey}` },
          });
          if (statusRes.ok) break;
        } catch (fetchErr) {
          if (att === 3) throw fetchErr;
          await new Promise((r) => setTimeout(r, 1000 * att));
        }
      }

      if (!statusRes || !statusRes.ok) {
        allCompleted = false;
        renderDetails.push(`Video ${i + 1}: Waiting on fal.ai render queue (HTTP ${statusRes?.status || "timeout"})`);
        continue;
      }

      const statusJson = await statusRes.json().catch(() => null);
      if (!statusJson) {
        allCompleted = false;
        renderDetails.push(`Video ${i + 1}: Synchronizing render state with GPU cluster...`);
        continue;
      }

      if (statusJson.status === "COMPLETED") {
        let videoUrl = extractMediaUrl(statusJson);
        let debugRaw = "";

        if (!videoUrl && reqItem.responseUrl) {
          for (let rAtt = 1; rAtt <= 4; rAtt++) {
            try {
              const resultRes = await fetch(reqItem.responseUrl, {
                headers: { Authorization: `Key ${falKey}` },
              });
              debugRaw = await resultRes.text().catch(() => "");
              if (resultRes.ok && debugRaw) {
                let resultData: any;
                try {
                  resultData = JSON.parse(debugRaw);
                } catch {
                  resultData = debugRaw;
                }
                videoUrl = extractMediaUrl(resultData);
                if (videoUrl) break;
              } else {
                console.warn(`[external/get-video] fal result fetch error (${resultRes.status}): ${debugRaw}`);
              }
            } catch (err: any) {
              debugRaw = err?.message || "Network fetch error";
            }
            if (!videoUrl && rAtt < 4) await new Promise((r) => setTimeout(r, rAtt * 1500));
          }
        }

        if (videoUrl) {
          // Download and save locally with retries
          let videoResponse: Response | null = null;
          for (let att = 1; att <= 3; att++) {
            try {
              videoResponse = await fetch(videoUrl);
              if (videoResponse.ok) break;
            } catch (err) { }
            if (att < 3) await new Promise((r) => setTimeout(r, att * 1500));
          }

          if (videoResponse && videoResponse.ok) {
            const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
            const fileName = `${uuidv4()}-ext-ai-generated.mp4`;
            await writeFile(join(uploadDir, fileName), videoBuffer);
            const localVideoUrl = `/uploads/${job.userId}/video/${fileName}`;

            const targetUserObj = mongoose.Types.ObjectId.isValid(job.userId)
              ? new mongoose.Types.ObjectId(job.userId)
              : job.userId;

            const mediaItem = new MediaItemModel({
              userId: targetUserObj,
              name: `External AI Video (${i + 1}/${job.videoCount}) – ${job.modelName} – ${new Date().toLocaleString()}`,
              type: "video",
              url: localVideoUrl,
              channels: job.channels || job.socialMedia || [],
              voiceoverScript: job.voiceoverScript || "",
              socialMediaHeading: job.socialMediaHeading || "",
              socialMediaCaption: job.socialMediaCaption || "",
              hashTags: job.hashTags || [],
              approvalStatus: job.approvalStatus || "pending",
              offerId: job.offerId || undefined,
              templateId: job.templateId || undefined,
              createdAt: new Date(),
            });
            await mediaItem.save();

            const metadataDoc = await MediaMetadataModel.create({
              mediaId: mediaItem._id,
              userId: targetUserObj,
              channels: job.channels || job.socialMedia || [],
              voiceoverScript: job.voiceoverScript || "",
              socialMediaHeading: job.socialMediaHeading || "",
              socialMediaCaption: job.socialMediaCaption || "",
              hashTags: job.hashTags || [],
              approvalStatus: job.approvalStatus || "pending",
              offerId: job.offerId || undefined,
              templateId: job.templateId || undefined,
            });
            mediaItem.metadataId = metadataDoc._id;
            await mediaItem.save();

            job.videoId = mediaItem._id.toString();
            reqItem.videoUrl = localVideoUrl;
            reqItem.status = "completed";
            renderDetails.push(`Video ${i + 1}: Rendered and saved to media library`);
          } else {
            allCompleted = false;
            renderDetails.push(`Video ${i + 1}: COMPLETED at fal.ai (Downloading file to cloud library...)`);
          }
        } else {
          allCompleted = false;
          const diag = debugRaw ? debugRaw.slice(0, 200) : JSON.stringify(statusJson).slice(0, 200);
          renderDetails.push(`Video ${i + 1}: COMPLETED at fal.ai (Finalizing media encoding... Debug: ${diag})`);
        }
      } else if (statusJson.status === "FAILED") {
        reqItem.status = "failed";
        hasFailure = true;
        allCompleted = false;
        renderDetails.push(`Video ${i + 1}: Generation failed at fal.ai – ${statusJson?.error || "GPU error"}`);
      } else {
        // PENDING / IN_QUEUE / IN_PROGRESS
        allCompleted = false;
        const queuePos = statusJson.queue_position !== undefined ? ` (Queue Position: ${statusJson.queue_position})` : "";
        renderDetails.push(`Video ${i + 1}: ${statusJson.status || "IN_PROGRESS"}${queuePos}`);
      }
    } catch (err: any) {
      console.warn(`[job polling] Error checking fal request ${reqItem.requestId}:`, err);
      allCompleted = false;
      renderDetails.push(`Video ${i + 1}: Error processing status - ${err?.message || String(err)}`);
    }
  }

  if (hasFailure && !allCompleted) {
    job.status = "failed";
    await job.save();
    return NextResponse.json({
      success: false,
      status: "failed",
      jobId,
      ...(job.offerId ? { offerId: job.offerId } : {}),
      details: renderDetails,
      message: "Video generation failed at fal.ai during rendering.",
    });
  }

  if (allCompleted) {
    job.status = "completed";
    await job.save();
  } else {
    await job.save();
    return NextResponse.json({
      success: true,
      status: "processing",
      jobId,
      renderProgress: renderDetails,
      enhancedPrompt: job.enhancedPrompt || "",
      voiceoverScript: job.voiceoverScript || "",
      ...(job.imageTypes && job.imageTypes.length > 0 ? { imageTypes: job.imageTypes } : {}),
      ...((job.channels || job.socialMedia || []).length > 0
        ? {
          channels: job.channels || job.socialMedia || [],
        }
        : {}),
      ...(job.offerId ? { offerId: job.offerId } : {}),

      message: `AI Video generation is processing depending on model complexity. Please check after 10 minutes.`,
    });
  }

  // Once completed, output strictly all required generated results, status, videoId, and social media metadata!
  return await buildCompletedJobResponse(job);
}

// ---------------------------------------------------------------------------
// GET Handler — allow retrieving video via query param ?jobId=...
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId") || searchParams.get("id") || searchParams.get("requestId");

    if (!jobId) {
      return NextResponse.json(
        { success: false, message: "Missing required parameter 'jobId' in query string (e.g. ?jobId=...)" },
        { status: 400 }
      );
    }

    return await checkAndResolveJob(jobId);
  } catch (error) {
    console.error("[external/get-video GET] Error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST Handler — allow retrieving video via JSON body {"jobId": "..."}
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const jobId = body.jobId || body.id || body.requestId;

    if (!jobId) {
      return NextResponse.json(
        { success: false, message: "Missing required property 'jobId' in request JSON body" },
        { status: 400 }
      );
    }

    return await checkAndResolveJob(jobId);
  } catch (error) {
    console.error("[external/get-video POST] Error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
}

*/
