import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { connectToDatabase } from "@/lib/db";
import MediaItemModel from "@/models/MediaItems";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";

export const maxDuration = 300; // Allow up to 5 minutes (300s) for AI video generation
export const dynamic = "force-dynamic";

// Resolution → width x height mapping
const RESOLUTION_MAP: Record<string, { width: number; height: number }> = {
  "480p": { width: 854, height: 480 },
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
  "4K": { width: 3840, height: 2160 },
};

// fal.ai model slug mapping
const MODEL_SLUG_MAP: Record<string, string> = {
  // Wan
  "Wan Pro": "fal-ai/wan-pro/text-to-video",
  "Wan 2.7": "fal-ai/wan-pro/text-to-video",
  "Wan 2.1": "fal-ai/wan-t2v",
  "Wan 2.2": "fal-ai/wan-t2v",
  "Wan 2.1 (1.3B)": "fal-ai/wan-t2v",
  "Wan 2.2 (1.3B)": "fal-ai/wan-t2v",
  // Kling
  "Kling 1.6 Std": "fal-ai/kling-video/v1.6/standard/text-to-video",
  "Kling 1.6 Pro": "fal-ai/kling-video/v1.6/pro/text-to-video",
  "Kling 2.0 Std": "fal-ai/kling-video/o3/standard/text-to-video",
  "Kling 2.0 Pro": "fal-ai/kling-video/o3/pro/text-to-video",
  // Veo
  "Veo 3": "fal-ai/veo3.1",
  // Seedance
  "Seedance 2 Pro": "bytedance/seedance-2.0/text-to-video",
  // HunyuanVideo
  "HunyuanVideo": "fal-ai/hunyuan-video",
  // Hailuo / MiniMax
  "Hailuo AI": "fal-ai/minimax/video-01-live",
};

async function downloadVideoToBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, resolution, aspectRatio, model, numVideos, duration, userId } =
      await req.json();

    if (!prompt?.trim() || !userId) {
      return NextResponse.json(
        { success: false, message: "Prompt and userId are required" },
        { status: 400 }
      );
    }

    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      return NextResponse.json(
        { success: false, message: "FAL_KEY is not configured on the server" },
        { status: 500 }
      );
    }

    const modelSlug = MODEL_SLUG_MAP[model] || "fal-ai/wan-t2v";
    const res = RESOLUTION_MAP[resolution] || { width: 1280, height: 720 };

    // Parse aspect ratio → determine image_size or aspect_ratio field
    const aspectMap: Record<string, string> = {
      "16:9": "landscape_16_9",
      "9:16": "portrait_9_16",
      "1:1": "square",
      "4:3": "landscape_4_3",
    };
    const imageSizeKey = aspectMap[aspectRatio] || "landscape_16_9";

    const count = Math.max(1, Math.min(4, Number(numVideos) || 1));

    const generatedVideos: { videoUrl: string; mediaId: string }[] = [];

    for (let i = 0; i < count; i++) {
      // Call fal.ai REST API directly (works without the SDK installed)
      const falResponse = await fetch(`https://queue.fal.run/${modelSlug}`, {
        method: "POST",
        headers: {
          Authorization: `Key ${falKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          image_size: imageSizeKey,
          num_inference_steps: 30,
          enable_safety_checker: true,
          duration: Number(duration) || 5,
        }),
      });

      if (!falResponse.ok) {
        const errText = await falResponse.text();
        throw new Error(`fal.ai error: ${falResponse.status} – ${errText}`);
      }

      // fal.ai queue: poll for result
      let queueData: any = null;
      try {
        queueData = await falResponse.json();
      } catch {
        throw new Error("fal.ai returned an invalid (non-JSON) queue response");
      }

      console.log("[fal.ai queue] Initial response:", JSON.stringify(queueData));

      const requestId: string = queueData?.request_id;
      if (!requestId) {
        throw new Error("fal.ai did not return a request_id — " + JSON.stringify(queueData));
      }

      // Use fal.ai's own status_url for polling (correct and works)
      // Use fal.ai's own response_url for result — the full slug URL (/wan/v2.7/t2v/requests/)
      // returns 405. fal.ai uses the base namespace URL (e.g. /fal-ai/wan/requests/) for results.
      const statusUrl: string =
        queueData?.status_url ||
        `https://queue.fal.run/${modelSlug}/requests/${requestId}/status`;
      const responseUrl: string =
        queueData?.response_url ||
        `https://queue.fal.run/${modelSlug}/requests/${requestId}`;

      console.log("[fal.ai queue] Polling status_url:", statusUrl);
      console.log("[fal.ai queue] Will fetch response_url:", responseUrl);

      let videoData: any = null;
      const maxAttempts = 120; // up to ~6 minutes polling
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((r) => setTimeout(r, 3000));

        let statusRes: Response;
        try {
          statusRes = await fetch(statusUrl, {
            headers: { Authorization: `Key ${falKey}` },
          });
        } catch (fetchErr) {
          console.warn(`[poll attempt ${attempt}] Network error, retrying:`, fetchErr);
          continue;
        }

        // Guard: only parse JSON if the response actually has a JSON body
        const contentType = statusRes.headers.get("content-type") || "";
        if (!statusRes.ok || !contentType.includes("application/json")) {
          const raw = await statusRes.text().catch(() => "(unreadable)");
          console.warn(`[poll attempt ${attempt}] Non-JSON or error response (${statusRes.status}): ${raw}`);
          continue; // skip this cycle and keep polling
        }

        let statusJson: any;
        try {
          statusJson = await statusRes.json();
        } catch {
          console.warn(`[poll attempt ${attempt}] Failed to parse status JSON, retrying...`);
          continue;
        }

        console.log(`[poll attempt ${attempt}] status:`, statusJson?.status);

        if (statusJson.status === "COMPLETED") {
          console.log("[fal.ai COMPLETED] Full status body:", JSON.stringify(statusJson));

          // Check all known fal.ai output shapes for the video URL
          const inlineUrl: string =
            statusJson?.video?.url ||           // top-level video object (Wan, Kling)
            statusJson?.videos?.[0]?.url ||      // top-level videos array
            statusJson?.output?.video?.url ||    // output.video.url
            statusJson?.output?.video_url ||     // output.video_url
            statusJson?.output?.url ||           // output.url
            statusJson?.payload?.video?.url ||   // payload.video.url
            "";

          if (inlineUrl) {
            // Result is embedded directly in the COMPLETED status body
            videoData = { video: { url: inlineUrl } };
          } else {
            // Fetch result from fal.ai's response_url
            console.log("[fal.ai] No inline URL — fetching from response_url:", responseUrl);
            const resultRes = await fetch(responseUrl, {
              headers: { Authorization: `Key ${falKey}` },
            });
            const resultRaw = await resultRes.text().catch(() => "(unreadable)");
            console.log(`[fal.ai result] status ${resultRes.status}:`, resultRaw.slice(0, 500));
            if (!resultRes.ok) {
              throw new Error(`fal.ai result fetch failed (${resultRes.status}): ${resultRaw}`);
            }
            try {
              videoData = JSON.parse(resultRaw);
            } catch {
              throw new Error("fal.ai result response was not valid JSON: " + resultRaw.slice(0, 200));
            }
          }
          break;
        } else if (statusJson.status === "FAILED") {
          throw new Error("fal.ai generation failed: " + JSON.stringify(statusJson));
        }
        // PENDING / IN_QUEUE / IN_PROGRESS → keep polling
      }

      if (!videoData) {
        throw new Error("Generation timed out after waiting for fal.ai");
      }

      // Extract video URL — covers all known fal.ai response shapes
      const videoUrl: string =
        videoData?.video?.url ||
        videoData?.videos?.[0]?.url ||
        videoData?.output?.video?.url ||
        videoData?.output?.video_url ||
        videoData?.output?.url ||
        "";

      console.log("[fal.ai] Extracted videoUrl:", videoUrl);

      if (!videoUrl) {
        throw new Error("No video URL in fal.ai response: " + JSON.stringify(videoData).slice(0, 300));
      }

      // Download and save locally
      const videoBuffer = await downloadVideoToBuffer(videoUrl);
      const fileName = `${uuidv4()}-ai-generated.mp4`;
      const uploadDir = join(process.cwd(), "uploads", userId, "video");

      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      const filePath = join(uploadDir, fileName);
      await writeFile(filePath, videoBuffer);

      const localUrl = `/uploads/${userId}/video/${fileName}`;

      // Save to MongoDB MediaItems
      await connectToDatabase();
      const mediaItem = new MediaItemModel({
        userId: new mongoose.Types.ObjectId(userId),
        name: `AI Generated – ${model} – ${new Date().toLocaleString()}`,
        type: "video",
        url: localUrl,
        createdAt: new Date(),
      });
      await mediaItem.save();

      generatedVideos.push({
        videoUrl: localUrl,
        mediaId: (mediaItem._id as mongoose.Types.ObjectId).toString(),
      });
    }

    return NextResponse.json({
      success: true,
      videos: generatedVideos,
    });
  } catch (error) {
    console.error("Video generation error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
