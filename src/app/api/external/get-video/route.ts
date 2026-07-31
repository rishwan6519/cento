import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { connectToDatabase } from "@/lib/db";
import MediaItemModel from "@/models/MediaItems";
import VideoJobModel, { IVideoJob } from "@/models/VideoJob";
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
// Helper: Check status of a video job and download results when ready
// ---------------------------------------------------------------------------
async function checkAndResolveJob(jobId: string) {
  await connectToDatabase();
  const job: IVideoJob | null = await VideoJobModel.findOne({ jobId });
  if (!job) {
    return NextResponse.json(
      { success: false, message: `No video generation job found with jobId '${jobId}'` },
      { status: 404 }
    );
  }

  // If job is already completed, instantly return the processed data forever!
  if (job.status === "completed") {
    const responsePayload: Record<string, any> = {};
    const generatedUrls = job.falRequests.map((r) => r.videoUrl || "").filter(Boolean);
    generatedUrls.forEach((url, index) => {
      responsePayload[`video ${index + 1}`] = url;
    });
    responsePayload.templateId = job.templateId || "";
    responsePayload.enhancedPrompt = job.enhancedPrompt || "";
    responsePayload.voiceoverScript = job.voiceoverScript || "";
    responsePayload.channels = job.channels || job.socialMedia || [];
    responsePayload.socialMedia = job.channels || job.socialMedia || [];
    return NextResponse.json(responsePayload);
  }

  if (job.status === "failed") {
    return NextResponse.json({
      success: false,
      status: "failed",
      jobId,
      message: "One or more video generation tasks failed during processing at fal.ai.",
    });
  }

  const falKey = process.env.FAL_KEY || "";
  const uploadDir = join(process.cwd(), "uploads", job.userId, "video");
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
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

            const mediaItem = new MediaItemModel({
              userId: new mongoose.Types.ObjectId(job.userId),
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
              createdAt: new Date(),
            });
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
    } catch (err) {
      console.warn(`[job polling] Error checking fal request ${reqItem.requestId}:`, err);
      allCompleted = false;
      renderDetails.push(`Video ${i + 1}: Synchronizing status with fal.ai GPU cluster...`);
    }
  }

  if (hasFailure && !allCompleted) {
    job.status = "failed";
    await job.save();
    return NextResponse.json({
      success: false,
      status: "failed",
      jobId,
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
      socialMediaHeading: job.socialMediaHeading || "",
      socialMediaCaption: job.socialMediaCaption || "",
      hashTags: job.hashTags || [],
      channels: job.channels || job.socialMedia || [],
      ...(job.offerId ? { offerId: job.offerId } : {}),

      message: `AI Video generation is processing depending on model complexity. Please check after 10 minutes.`,
    });
  }

  // Once completed, output strictly all required generated results, status, videoId, and social media metadata!
  const responsePayload: Record<string, any> = {};

  const generatedUrls = job.falRequests.map((r: any) => r.videoUrl || "").filter(Boolean);
  let resolvedVideoId = job.videoId || "";
  if (!resolvedVideoId && generatedUrls[0]) {
    const foundMedia: any = await MediaItemModel.findOne({ url: generatedUrls[0] }).select("_id").lean();
    if (foundMedia && foundMedia._id) {
      resolvedVideoId = foundMedia._id.toString();
      job.videoId = resolvedVideoId;
      await job.save().catch(() => {});
    }
  }

  generatedUrls.forEach((url: string, index: number) => {
    responsePayload[`video ${index + 1}`] = url;
  });

  if (job.offerId) {
    responsePayload.offerId = job.offerId;
  }

  const defaultHeading = "Experience Uncompromising Quality!";
  const defaultCaption = job.voiceoverScript 
    ? `${job.voiceoverScript.slice(0, 80)}... Discover the ultimate experience today!` 
    : "Elevated performance and flawless design. Check out our exclusive promotional offer today!";
  const defaultTags = ["#Exclusive", "#Trending", "#Viral", "#Ad", "#NewRelease"];

  responsePayload.status = job.approvalStatus || "pending";
  responsePayload.videoId = resolvedVideoId;
  responsePayload.templateId = job.templateId || "";
  responsePayload.enhancedPrompt = job.enhancedPrompt || "";
  responsePayload.voiceoverScript = job.voiceoverScript || "";
  responsePayload.socialMediaHeading = job.socialMediaHeading || defaultHeading;
  responsePayload.socialMediaCaption = job.socialMediaCaption || defaultCaption;
  responsePayload.hashTags = (job.hashTags && job.hashTags.length > 0) ? job.hashTags : defaultTags;
  responsePayload.channels = job.channels || job.socialMedia || [];

  return NextResponse.json(responsePayload);
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
