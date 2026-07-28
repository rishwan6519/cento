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
    responsePayload.enhancedPrompt = job.enhancedPrompt || "";
    responsePayload.voiceoverScript = job.voiceoverScript || "";
    responsePayload.socialMedia = job.socialMedia || [];
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
        let videoUrl: string =
          statusJson?.video?.url ||
          statusJson?.videos?.[0]?.url ||
          statusJson?.output?.video?.url ||
          statusJson?.output?.video_url ||
          statusJson?.output?.url ||
          statusJson?.payload?.video?.url ||
          statusJson?.data?.video?.url ||
          "";

        if (!videoUrl && reqItem.responseUrl) {
          const resultRes = await fetch(reqItem.responseUrl, {
            headers: { Authorization: `Key ${falKey}` },
          });
          if (resultRes.ok) {
            const resultData = await resultRes.json().catch(() => null);
            videoUrl =
              resultData?.video?.url ||
              resultData?.videos?.[0]?.url ||
              resultData?.output?.video?.url ||
              resultData?.output?.video_url ||
              resultData?.output?.url ||
              resultData?.payload?.video?.url ||
              resultData?.data?.video?.url ||
              "";
          }
        }

        if (videoUrl) {
          // Download and save locally with retries
          let videoResponse: Response | null = null;
          for (let att = 1; att <= 3; att++) {
            try {
              videoResponse = await fetch(videoUrl);
              if (videoResponse.ok) break;
            } catch (err) {}
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
              createdAt: new Date(),
            });
            await mediaItem.save();

            reqItem.videoUrl = localVideoUrl;
            reqItem.status = "completed";
            renderDetails.push(`Video ${i + 1}: Rendered and saved to media library`);
          } else {
            allCompleted = false;
            renderDetails.push(`Video ${i + 1}: COMPLETED at fal.ai (Downloading file to cloud library...)`);
          }
        } else {
          allCompleted = false;
          renderDetails.push(`Video ${i + 1}: COMPLETED at fal.ai (Finalizing media encoding...)`);
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
      enhancedPrompt: job.enhancedPrompt || "",
      voiceoverScript: job.voiceoverScript || "",
      socialMedia: job.socialMedia || [],
      renderProgress: renderDetails,
      message: `AI Video generation takes 2 to 5 minutes depending on model complexity. Please poll again in 10 seconds.`,
    });
  }

  // Once completed, output strictly only the generated results!
  const responsePayload: Record<string, any> = {};

  const generatedUrls = job.falRequests.map((r) => r.videoUrl || "").filter(Boolean);
  generatedUrls.forEach((url, index) => {
    responsePayload[`video ${index + 1}`] = url;
  });

  responsePayload.enhancedPrompt = job.enhancedPrompt || "";
  responsePayload.voiceoverScript = job.voiceoverScript || "";
  responsePayload.socialMedia = job.socialMedia || [];

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
