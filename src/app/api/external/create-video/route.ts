import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { connectToDatabase } from "@/lib/db";
import MediaItemModel from "@/models/MediaItems";
import VideoJobModel, { IVideoJob } from "@/models/VideoJob";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";

export const maxDuration = 300; // Allow sufficient execution duration for background tasks
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Supported models
// ---------------------------------------------------------------------------
const MODEL_SLUG_MAP: Record<string, string> = {
  "Wan Pro": "fal-ai/wan-pro/text-to-video",
  "Wan 2.7": "fal-ai/wan-pro/text-to-video",
  "Wan 2.1": "fal-ai/wan-t2v",
  "Wan 2.2": "fal-ai/wan-t2v",
  "Wan 2.1 (1.3B)": "fal-ai/wan-t2v",
  "Wan 2.2 (1.3B)": "fal-ai/wan-t2v",
  "Kling 1.6 Std": "fal-ai/kling-video/v1.6/standard/text-to-video",
  "Kling 1.6 Pro": "fal-ai/kling-video/v1.6/pro/text-to-video",
  "Kling 2.0 Std": "fal-ai/kling-video/o3/standard/text-to-video",
  "Kling 2.0 Pro": "fal-ai/kling-video/o3/pro/text-to-video",
  "Veo 3": "fal-ai/veo3.1",
  "Seedance 2 Pro": "bytedance/seedance-2.0/text-to-video",
  HunyuanVideo: "fal-ai/hunyuan-video",
  "Hailuo AI": "fal-ai/minimax/video-01-live",
};

const ASPECT_MAP: Record<string, string> = {
  "16:9": "landscape_16_9",
  "9:16": "portrait_9_16",
  "1:1": "square",
  "4:3": "landscape_4_3",
};

// ---------------------------------------------------------------------------
// Step 1 — Enhance rough text → video visual prompt & voiceover script (GPT-4o-mini)
// ---------------------------------------------------------------------------
async function enhancePromptAndScript(
  roughText: string,
  model: string,
  resolution: string,
  aspectRatio: string,
  duration: number,
  openAiKey: string
): Promise<{ enhancedPrompt: string; voiceoverScript: string }> {
  const systemContent = `You are a world-class Director of Photography (DoP), TV Commercial Film Director, and Advertising Voiceover Copywriter for premium global brands (Apple, Nike, Lexus, Sephora). Your job is to take the user's rough concept and produce TWO distinct professional assets for a ${duration}-second video commercial:

1. **enhancedPrompt**: A masterclass cinematic video generation prompt optimized for AI diffusers (${model}).
   - DO NOT use abstract jargon like "a promotional video" or "an inspiring ad". Describe physical reality: Scene & Set Architecture, Dynamic Physics, Kinetic Camera Choreography, Material Textures, and Cinematographically Graded Lighting.
   - Structure chronologically: Opening Hook (0-2s with dramatic lighting/macro shots), Kinetic Action & Flow (mid-scene movement and fluid mechanics), and Hero Product Climax (razor-sharp focus, shallow depth of field bokeh, specular reflections).
   - Weave in optical camera specs (e.g. shot on ARRI Alexa Mini, 35mm Master Prime anamorphic lens, high dynamic range color grading).

2. **voiceoverScript**: A crisp, emotionally engaging, and persuasive television commercial voiceover (VO) narration script matching the product and length of the spot (${duration} seconds, roughly 15 to 30 words).
   - Must sound natural, elevated, and impactful when spoken out loud by an advertising voice actor. DO NOT mention camera directions or lighting specs here!

You MUST respond ONLY with a valid JSON object matching this schema:
{
  "enhancedPrompt": "string",
  "voiceoverScript": "string"
}`;

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemContent },
            {
              role: "user",
              content: `User's rough idea: "${roughText}"\nTarget resolution: ${resolution}, aspect ratio: ${aspectRatio}\n\nGenerate the structured advertising JSON:`,
            },
          ],
          max_tokens: 600,
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.warn(`[OpenAI enhance attempt ${attempt}/${maxRetries}] Failed (${response.status}): ${err}`);
        if ((response.status >= 500 || response.status === 429) && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, attempt * 2000));
          continue;
        }
        throw new Error(`OpenAI error ${response.status}`);
      }

      const data = await response.json();
      const rawContent: string = data.choices?.[0]?.message?.content?.trim() || "{}";
      const parsed = JSON.parse(rawContent);
      return {
        enhancedPrompt: parsed.enhancedPrompt || roughText,
        voiceoverScript: parsed.voiceoverScript || roughText,
      };
    } catch (err) {
      if (attempt === maxRetries) {
        console.warn("[OpenAI enhance] All attempts failed. Falling back to high-impact DoP template.");
      } else {
        await new Promise((r) => setTimeout(r, attempt * 2000));
      }
    }
  }

  // Resilient fallback if OpenAI is over capacity (500/503) so video generation still succeeds!
  return {
    enhancedPrompt: `Macro extreme close-up commercial product feature: ${roughText}. Dynamic slow-motion environmental interaction, robotic techno-dolly camera orbital pan, bright volumetric rays, gleaming specular surface highlights against shallow depth of field studio bokeh. Shot on an ARRI Alexa Mini with a 35mm Master Prime anamorphic lens, pristine crystal-clear motion, television commercial production quality.`,
    voiceoverScript: `Experience ${roughText}. Uncompromising luxury, elevated performance, and flawless design. Discover perfection today.`,
  };
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

  for (let i = 0; i < job.falRequests.length; i++) {
    const reqItem = job.falRequests[i];
    if (reqItem.status === "completed") continue;
    if (reqItem.status === "failed") {
      hasFailure = true;
      allCompleted = false;
      continue;
    }

    // Check status in fal.ai (fast <1s HTTP check)
    try {
      const statusRes = await fetch(reqItem.statusUrl, {
        headers: { Authorization: `Key ${falKey}` },
      });
      if (!statusRes.ok) {
        allCompleted = false;
        continue;
      }

      const statusJson = await statusRes.json().catch(() => null);
      if (!statusJson) {
        allCompleted = false;
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
          } else {
            allCompleted = false;
          }
        } else {
          allCompleted = false;
        }
      } else if (statusJson.status === "FAILED") {
        reqItem.status = "failed";
        hasFailure = true;
        allCompleted = false;
      } else {
        // PENDING / IN_QUEUE / IN_PROGRESS
        allCompleted = false;
      }
    } catch (err) {
      console.warn(`[job polling] Error checking fal request ${reqItem.requestId}:`, err);
      allCompleted = false;
    }
  }

  if (hasFailure && !allCompleted) {
    job.status = "failed";
    await job.save();
    return NextResponse.json({
      success: false,
      status: "failed",
      jobId,
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
      message: `Video generation is still rendering at fal.ai. Please check again in 5 seconds using GET /api/external/create-video?jobId=${jobId}`,
    });
  }

  // Once completed, construct exact requested response payload!
  const responsePayload: Record<string, any> = {
    success: true,
    status: "completed",
    jobId,
  };

  const generatedUrls = job.falRequests.map((r) => r.videoUrl || "").filter(Boolean);
  generatedUrls.forEach((url, index) => {
    responsePayload[`video ${index + 1}`] = url;
  });

  responsePayload.videoUrl = generatedUrls[0] || "";
  responsePayload.videos = generatedUrls;
  responsePayload.voiceoverScript = job.voiceoverScript;

  return NextResponse.json(responsePayload);
}

// ---------------------------------------------------------------------------
// GET Handler — check status of a video job (fast, no CloudFront timeouts)
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
    console.error("[external/create-video GET] Error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST Handler — submits generation immediately without waiting for rendering
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // If caller passes jobId in POST body, resolve status immediately!
    if (body.jobId || body.requestId) {
      return await checkAndResolveJob(body.jobId || body.requestId);
    }

    const {
      text,       // rough description — third party provides this plain text
      userId,     // third party user/account ID
      model,      // AI video model name
      resolution, // "480p" | "720p" | "1080p" | "4K"
      aspectRatio,// "16:9" | "9:16" | "1:1" | "4:3"
      duration,   // optional — video length in seconds (default: 5)
      numVideos,  // optional — number of videos to generate (default: 1, max: 10)
      count,      // fallback property in case caller sends 'count' instead of 'numVideos'
    } = body;

    // ----- Validate required fields -----
    if (!text?.trim()) {
      return NextResponse.json(
        { success: false, message: "Field 'text' is required — provide your video description" },
        { status: 400 }
      );
    }
    if (!userId?.trim()) {
      return NextResponse.json(
        { success: false, message: "Field 'userId' is required" },
        { status: 400 }
      );
    }
    if (!model?.trim()) {
      return NextResponse.json(
        { success: false, message: "Field 'model' is required — see supported models list" },
        { status: 400 }
      );
    }
    if (!resolution?.trim()) {
      return NextResponse.json(
        { success: false, message: "Field 'resolution' is required: '480p' | '720p' | '1080p' | '4K'" },
        { status: 400 }
      );
    }
    if (!aspectRatio?.trim()) {
      return NextResponse.json(
        { success: false, message: "Field 'aspectRatio' is required: '16:9' | '9:16' | '1:1' | '4:3'" },
        { status: 400 }
      );
    }

    // ----- Validate API keys -----
    const openAiKey = process.env.OPENAI_API_KEY;
    const falKey = process.env.FAL_KEY;

    if (!openAiKey) {
      return NextResponse.json(
        { success: false, message: "Server configuration error: OPENAI_API_KEY not set" },
        { status: 500 }
      );
    }
    if (!falKey) {
      return NextResponse.json(
        { success: false, message: "Server configuration error: FAL_KEY not set" },
        { status: 500 }
      );
    }

    const videoDuration = Math.max(1, Math.min(60, Number(duration) || 5));
    const videoCount = Math.max(1, Math.min(10, Number(numVideos || count) || 1));

    // ----- Step 1: Enhance rough text into cinematic DoP prompt + commercial VO script -----
    const { enhancedPrompt, voiceoverScript } = await enhancePromptAndScript(
      text,
      model,
      resolution,
      aspectRatio,
      videoDuration,
      openAiKey
    );

    const modelSlug = MODEL_SLUG_MAP[model] || "fal-ai/wan-t2v";
    const imageSizeKey = ASPECT_MAP[aspectRatio] || "landscape_16_9";

    // ----- Step 2: Submit all video generation requests to fal.ai queue instantly (< 1s) -----
    const falRequests = [];

    for (let i = 0; i < videoCount; i++) {
      let falResponse: Response | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          falResponse = await fetch(`https://queue.fal.run/${modelSlug}`, {
            method: "POST",
            headers: {
              Authorization: `Key ${falKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              prompt: enhancedPrompt,
              image_size: imageSizeKey,
              aspect_ratio: aspectRatio,
              num_inference_steps: 30,
              enable_safety_checker: true,
              duration: videoDuration,
            }),
          });
          if (!falResponse.ok && attempt < 3 && falResponse.status >= 500) {
            await new Promise((r) => setTimeout(r, attempt * 1500));
            continue;
          }
          break;
        } catch (err: any) {
          if (attempt === 3) {
            throw new Error(`Failed to connect to fal.ai queue (Network/DNS error: ${err.message})`);
          }
          await new Promise((r) => setTimeout(r, attempt * 1500));
        }
      }

      if (!falResponse || !falResponse.ok) {
        const errText = falResponse ? await falResponse.text().catch(() => "") : "No response";
        throw new Error(`fal.ai submission error (${falResponse?.status || "network error"}): ${errText}`);
      }

      const queueData = await falResponse.json();
      const requestId: string = queueData?.request_id;
      if (!requestId) {
        throw new Error("fal.ai did not return a request_id: " + JSON.stringify(queueData));
      }

      const statusUrl: string =
        queueData?.status_url ||
        `https://queue.fal.run/${modelSlug}/requests/${requestId}/status`;
      const responseUrl: string =
        queueData?.response_url ||
        statusUrl.replace(/\/status$/, "") ||
        `https://queue.fal.run/${modelSlug}/requests/${requestId}`;

      falRequests.push({
        requestId,
        statusUrl,
        responseUrl,
        videoUrl: "",
        status: "processing" as const,
      });
    }

    // Save job tracking to MongoDB
    await connectToDatabase();
    const jobId = uuidv4();
    const videoJob = new VideoJobModel({
      jobId,
      userId,
      modelName: model || "Wan 2.1",
      status: "processing",
      voiceoverScript,
      videoCount,
      falRequests,
      createdAt: new Date(),
    });
    await videoJob.save();

    // Immediately return processing status (total execution time ~1-2 seconds!)
    return NextResponse.json({
      success: true,
      status: "processing",
      jobId,
      voiceoverScript,
      message: `Video generation initiated successfully. Poll status using GET /api/external/create-video?jobId=${jobId}`,
    });
  } catch (error) {
    console.error("[external/create-video] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
