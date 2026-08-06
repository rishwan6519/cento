import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { connectToDatabase } from "@/lib/db";
import GoogleFlowJobModel from "@/models/GoogleFlowJob";
import MediaItemModel from "@/models/MediaItems";
import Offer from "@/models/Offer";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// Helper: Poll Google Gemini long-running operation for video result
// ---------------------------------------------------------------------------
async function pollGoogleOperation(operationName: string, googleApiKey: string): Promise<{
  done: boolean;
  videoUri?: string;
  failed?: boolean;
  errorMessage?: string;
}> {
  const url = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${googleApiKey}`;

  let opRes: Response | null = null;
  for (let att = 1; att <= 3; att++) {
    try {
      opRes = await fetch(url, { headers: { "Content-Type": "application/json" } });
      if (opRes.ok) break;
    } catch (err) {
      if (att === 3) throw err;
      await new Promise((r) => setTimeout(r, att * 1000));
    }
  }

  if (!opRes || !opRes.ok) {
    const errText = opRes ? await opRes.text().catch(() => "") : "No response";
    return { done: false, errorMessage: `Google operation poll error (${opRes?.status}): ${errText.slice(0, 200)}` };
  }

  const opData = await opRes.json().catch(() => null);
  if (!opData) return { done: false };

  // Operation not done yet
  if (!opData.done) return { done: false };

  // Check for errors
  if (opData.error) {
    return { done: true, failed: true, errorMessage: opData.error?.message || "Google Flow processing error" };
  }

  // Extract video URI from various possible Google API response structures
  let videoUri: string | null = null;

  const possibleArrays = [
    opData?.response?.generatedVideos,
    opData?.response?.generateVideoResponse?.generatedVideos,
    opData?.response?.videos,
    opData?.response?.predictions,
    opData?.response?.candidates,
    opData?.response?.output,
    opData?.metadata?.response?.generatedVideos,
    opData?.metadata?.generatedVideos
  ];

  for (const arr of possibleArrays) {
    if (Array.isArray(arr) && arr.length > 0) {
      for (const item of arr) {
        if (typeof item === "string" && (item.startsWith("http") || item.startsWith("gs://") || item.includes("googleapis.com"))) {
          videoUri = item;
          break;
        }
        const found = item?.video?.uri || item?.video?.url || item?.videoUri || item?.uri || item?.url || item?.gcsUri || item?.content?.parts?.[0]?.fileData?.fileUri || item?.content?.parts?.[0]?.videoMetadata?.videoUri;
        if (typeof found === "string" && found) {
          videoUri = found;
          break;
        }
      }
    } else if (arr && typeof arr === "object") {
      const found = arr.video?.uri || arr.uri || arr.url || arr.videoUri;
      if (typeof found === "string" && found) {
        videoUri = found;
        break;
      }
    }
    if (videoUri) break;
  }

  // Deep fallback search for any URI property in the response object
  if (!videoUri) {
    function search(node: any, depth: number) {
      if (!node || typeof node !== "object" || depth > 6 || videoUri) return;
      for (const key of Object.keys(node)) {
        const val = node[key];
        if (typeof val === "string") {
          if (["uri", "url", "videouri", "gcsuri", "fileuri"].includes(key.toLowerCase()) && (val.startsWith("http") || val.startsWith("gs://") || val.includes("googleapis.com"))) {
            videoUri = val;
            return;
          }
        } else if (typeof val === "object") {
          search(val, depth + 1);
        }
      }
    }
    search(opData.response || opData, 0);
  }

  if (videoUri) {
    return { done: true, videoUri };
  }

  console.error("[googleFlowGet] Completed operation payload:", JSON.stringify(opData, null, 2));
  return { 
    done: true, 
    failed: true, 
    errorMessage: `Google Flow completed, but response structure differed from expected: ${JSON.stringify(opData).slice(0, 450)}` 
  };
}

// ---------------------------------------------------------------------------
// Core: Check job status and resolve if complete
// ---------------------------------------------------------------------------
export async function checkAndResolveGoogleJob(jobId: string, formatAsLegacy = false) {
  await connectToDatabase();
  const job = await GoogleFlowJobModel.findOne({ jobId });

  if (!job) {
    return NextResponse.json(
      { success: false, message: `No Google Flow job found with jobId '${jobId}'` },
      { status: 404 }
    );
  }

  let offerDetails: Record<string, any> = {};
  if (job.offerId) {
    const trimmedId = String(job.offerId).trim();
    const query = mongoose.Types.ObjectId.isValid(trimmedId)
      ? { $or: [{ _id: trimmedId }, { offerId: trimmedId }] }
      : { offerId: trimmedId };
    const linkedOffer: any = await Offer.findOne(query).lean().catch(() => null);
    if (linkedOffer) {
      if (linkedOffer.offerName) offerDetails.offerName = linkedOffer.offerName;
      if (linkedOffer.offerDescription) offerDetails.offerDescription = linkedOffer.offerDescription;
      if (linkedOffer.startDate) offerDetails.offerStartDate = new Date(linkedOffer.startDate).toISOString().split("T")[0];
      if (linkedOffer.endDate) offerDetails.offerEndDate = new Date(linkedOffer.endDate).toISOString().split("T")[0];
    }
  }

  // Already completed
  if (job.status === "completed") {
    return NextResponse.json({
      success: true,
      status: formatAsLegacy ? "success" : "completed",
      completed: true,
      jobId,
      videoId: job._id.toString(),
      model: "Veo 3.1 Lite",
      provider: "Google Flow",
      "video 1": job.videoUrl,
      enhancedPrompt: job.enhancedPrompt,
      voiceoverScript: job.voiceoverScript,
      socialMediaHeading: job.socialMediaHeading,
      socialMediaCaption: job.socialMediaCaption,
      hashTags: job.hashTags,
      aspectRatio: job.aspectRatio,
      numberOfVideos: job.numberOfVideos || 1,
      ...(job.channels && job.channels.length > 0 ? { channels: job.channels } : {}),
      ...(job.images && job.images.length > 0 ? { images: job.images } : {}),
      ...(job.imageTypes && job.imageTypes.length > 0 ? { imageTypes: job.imageTypes } : {}),
      ...(job.offerId ? { offerId: job.offerId } : {}),
      ...(job.tagline ? { tagline: job.tagline } : {}),
      ...offerDetails,
      ...(job.templateId ? { templateId: job.templateId } : {}),
      ...(job.referenceImageUrl ? { referenceImageUrl: job.referenceImageUrl } : {}),
    });
  }

  // Failed (If it previously failed purely due to parsing, retry polling with the smarter parser!)
  if (job.status === "failed") {
    if (job.errorMessage && (job.errorMessage.includes("no video URI found") || job.errorMessage.includes("response structure differed")) && job.operationName) {
      console.log(`[googleFlowGet] Retrying polling for job ${jobId} (previous parsing error)...`);
      job.status = "processing";
      await job.save();
    } else {
      return NextResponse.json({
        success: false,
        status: "failed",
        jobId,
        ...(job.offerId ? { offerId: job.offerId } : {}),
        message: job.errorMessage || "Google Flow Veo 3.1 Lite video generation failed.",
      });
    }
  }

  // Still processing — check if operation name is available
  if (!job.operationName) {
    return NextResponse.json({
      success: true,
      status: "processing",
      jobId,
      ...(job.offerId ? { offerId: job.offerId } : {}),
      model: "Veo 3.1 Lite",
      provider: "Google Flow",
      message: "Prompt enhancement and Google Flow submission in progress. Please check again in 2 minutes.",
    });
  }

  const googleApiKey = process.env.GOOGLE_API_KEY;
  if (!googleApiKey) {
    return NextResponse.json({ success: false, message: "Server configuration error: GOOGLE_API_KEY not set" }, { status: 500 });
  }

  // Poll Google operation
  const { done, videoUri, failed, errorMessage } = await pollGoogleOperation(job.operationName, googleApiKey);

  if (!done) {
    return NextResponse.json({
      success: true,
      status: "processing",
      jobId,
      ...(job.offerId ? { offerId: job.offerId } : {}),
      model: "Veo 3.1 Lite",
      provider: "Google Flow",
      operationName: job.operationName,
      message: "Google Flow Veo 3.1 Lite is rendering your video. Please check again in 2–3 minutes.",
    });
  }

  if (failed) {
    job.status = "failed";
    job.errorMessage = errorMessage || "Unknown Google Flow error";
    await job.save();
    return NextResponse.json({
      success: false,
      status: "failed",
      jobId,
      ...(job.offerId ? { offerId: job.offerId } : {}),
      message: job.errorMessage,
    });
  }

  // ---- Video is ready — download and save locally ----
  try {
    const uploadDir = join(process.cwd(), "uploads", job.userId, "video");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Download the video from Google's CDN
    let videoBuffer: Buffer | null = null;
    const downloadUrl = videoUri!.includes("?")
      ? `${videoUri}&key=${googleApiKey}`
      : `${videoUri}?key=${googleApiKey}`;

    for (let att = 1; att <= 3; att++) {
      try {
        const downloadRes = await fetch(downloadUrl);
        if (downloadRes.ok) {
          videoBuffer = Buffer.from(await downloadRes.arrayBuffer());
          break;
        }
      } catch (err) {
        if (att === 3) throw err;
        await new Promise((r) => setTimeout(r, att * 1500));
      }
    }

    if (!videoBuffer) {
      throw new Error("Failed to download video from Google Flow CDN");
    }

    const fileName = `${uuidv4()}-gflow-veo31lite.mp4`;
    await writeFile(join(uploadDir, fileName), videoBuffer);
    const localVideoUrl = `/uploads/${job.userId}/video/${fileName}`;

    // Save to media library
    const targetUserObj = mongoose.Types.ObjectId.isValid(job.userId)
      ? new mongoose.Types.ObjectId(job.userId)
      : job.userId;

    const mediaItem = new MediaItemModel({
      userId: targetUserObj,
      name: `Google Flow Veo 3.1 Lite – ${new Date().toLocaleString()}`,
      type: "video",
      url: localVideoUrl,
      voiceoverScript: job.voiceoverScript || "",
      socialMediaHeading: job.socialMediaHeading || "",
      socialMediaCaption: job.socialMediaCaption || "",
      hashTags: job.hashTags || [],
      approvalStatus: "pending",
      ...(job.offerId ? { offerId: job.offerId } : {}),
      createdAt: new Date(),
    });
    await mediaItem.save();

    // Update job record
    job.status = "completed";
    job.videoUrl = localVideoUrl;
    job.googleVideoUri = videoUri!;
    job.completedAt = new Date();
    await job.save();

    return NextResponse.json({
      success: true,
      status: formatAsLegacy ? "success" : "completed",
      completed: true,
      jobId,
      videoId: mediaItem._id.toString(),
      model: "Veo 3.1 Lite",
      provider: "Google Flow",
      "video 1": localVideoUrl,
      mediaId: mediaItem._id.toString(),
      enhancedPrompt: job.enhancedPrompt,
      voiceoverScript: job.voiceoverScript,
      socialMediaHeading: job.socialMediaHeading,
      socialMediaCaption: job.socialMediaCaption,
      hashTags: job.hashTags,
      aspectRatio: job.aspectRatio,
      numberOfVideos: job.numberOfVideos || 1,
      ...(job.channels && job.channels.length > 0 ? { channels: job.channels } : {}),
      ...(job.images && job.images.length > 0 ? { images: job.images } : {}),
      ...(job.imageTypes && job.imageTypes.length > 0 ? { imageTypes: job.imageTypes } : {}),
      ...(job.offerId ? { offerId: job.offerId } : {}),
      ...(job.tagline ? { tagline: job.tagline } : {}),
      ...offerDetails,
      ...(job.templateId ? { templateId: job.templateId } : {}),
      ...(job.referenceImageUrl ? { referenceImageUrl: job.referenceImageUrl } : {}),
    });
  } catch (err: any) {
    console.error(`[googleFlowGet] Failed to download/save video for jobId ${jobId}:`, err);
    job.status = "failed";
    job.errorMessage = err.message || "Failed to download video from Google Flow";
    await job.save();
    return NextResponse.json({
      success: false,
      status: "failed",
      jobId,
      ...(job.offerId ? { offerId: job.offerId } : {}),
      message: job.errorMessage,
    });
  }
}
