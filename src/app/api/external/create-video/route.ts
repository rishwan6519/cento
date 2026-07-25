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
// Step 2 — Generate video via fal.ai
// ---------------------------------------------------------------------------
async function generateVideo(
  prompt: string,
  model: string,
  aspectRatio: string,
  duration: number,
  falKey: string
): Promise<string> {
  const modelSlug = MODEL_SLUG_MAP[model] || "fal-ai/wan-t2v";
  const imageSizeKey = ASPECT_MAP[aspectRatio] || "landscape_16_9";

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
          prompt,
          image_size: imageSizeKey,     // For models expecting image_size keyword (Wan, Hunyuan)
          aspect_ratio: aspectRatio,    // For models expecting aspect_ratio string (Kling, Veo, Seedance)
          num_inference_steps: 30,
          enable_safety_checker: true,
          duration,
        }),
      });
      if (!falResponse.ok && attempt < 3 && falResponse.status >= 500) {
        await new Promise((r) => setTimeout(r, attempt * 2000));
        continue;
      }
      break;
    } catch (err: any) {
      console.warn(`[fal.ai submit attempt ${attempt}/3] Network error: ${err.message || err}`);
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, attempt * 2000));
      } else {
        throw new Error(`Failed to connect to fal.ai after 3 attempts (Network/DNS error: ${err.message || "ENOTFOUND"})`);
      }
    }
  }

  if (!falResponse || !falResponse.ok) {
    const errText = falResponse ? await falResponse.text().catch(() => "") : "No response";
    throw new Error(`fal.ai submission error (${falResponse?.status || "network failure"}): ${errText}`);
  }

  let queueData: any = null;
  try {
    queueData = await falResponse.json();
  } catch {
    throw new Error("fal.ai returned an invalid (non-JSON) queue response");
  }

  const requestId: string = queueData?.request_id;
  if (!requestId) {
    throw new Error("fal.ai did not return a request_id — " + JSON.stringify(queueData));
  }

  // Use fal.ai's own status_url for polling and response_url for result.
  // Note: Constructing full slug URLs manually (e.g. /wan/v2.1/1.3b/text-to-video/requests/ID)
  // fails with 405 Method Not Allowed because fal.ai queues register requests under the base namespace.
  const statusUrl: string =
    queueData?.status_url ||
    `https://queue.fal.run/${modelSlug}/requests/${requestId}/status`;
  const responseUrl: string =
    queueData?.response_url ||
    statusUrl.replace(/\/status$/, "") ||
    `https://queue.fal.run/${modelSlug}/requests/${requestId}`;

  console.log("[fal.ai external] Polling status_url:", statusUrl);
  console.log("[fal.ai external] Will fetch response_url:", responseUrl);

  // Poll until COMPLETED (max ~6 minutes)
  const maxAttempts = 120;
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
      continue;
    }

    let statusJson: any;
    try {
      statusJson = await statusRes.json();
    } catch {
      console.warn(`[poll attempt ${attempt}] Failed to parse status JSON, retrying...`);
      continue;
    }

    if (statusJson.status === "COMPLETED") {
      // Some models return the result directly in the COMPLETED status response
      const inlineUrl: string =
        statusJson?.video?.url ||
        statusJson?.videos?.[0]?.url ||
        statusJson?.output?.video?.url ||
        statusJson?.output?.video_url ||
        statusJson?.output?.url ||
        statusJson?.payload?.video?.url ||
        statusJson?.data?.video?.url ||
        "";

      if (inlineUrl) {
        return inlineUrl;
      }

      // Fetch result from fal.ai's own response_url
      const resultRes = await fetch(responseUrl, {
        headers: { Authorization: `Key ${falKey}` },
      });
      if (!resultRes.ok) {
        const raw = await resultRes.text().catch(() => "(unreadable)");
        throw new Error(`fal.ai result fetch failed (${resultRes.status}): ${raw}`);
      }
      let videoData: any;
      try {
        videoData = await resultRes.json();
      } catch {
        throw new Error("fal.ai result response was not valid JSON");
      }

      const videoUrl: string =
        videoData?.video?.url ||
        videoData?.videos?.[0]?.url ||
        videoData?.output?.video?.url ||
        videoData?.output?.video_url ||
        videoData?.output?.url ||
        videoData?.payload?.video?.url ||
        videoData?.data?.video?.url ||
        "";

      if (!videoUrl) throw new Error("No video URL returned by fal.ai: " + JSON.stringify(videoData).slice(0, 300));
      return videoUrl;
    }

    if (statusJson.status === "FAILED") {
      throw new Error("fal.ai generation failed: " + JSON.stringify(statusJson));
    }
    // PENDING / IN_QUEUE / IN_PROGRESS → keep polling
  }

  throw new Error("Video generation timed out after 6 minutes");
}

// ---------------------------------------------------------------------------
// Step 3 — Convert commercial voiceover text → TTS audio (OpenAI TTS → base64)
// ---------------------------------------------------------------------------
async function _generateTtsAudio(text: string, openAiKey: string): Promise<string> {
  const ttsInput = text.slice(0, 4096);

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: "tts-1",
          input: ttsInput,
          voice: "nova", // nova and alloy give an uplifting, clear commercial voice
          response_format: "mp3",
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.warn(`[OpenAI TTS attempt ${attempt}/${maxRetries}] Failed (${response.status}): ${err}`);
        if ((response.status >= 500 || response.status === 429) && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, attempt * 1500));
          continue;
        }
        throw new Error(`OpenAI TTS error ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer).toString("base64");
    } catch (err) {
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, attempt * 1500));
      } else {
        console.warn("[OpenAI TTS] All attempts failed due to OpenAI server load. Returning empty audio string.");
      }
    }
  }

  return ""; // Return empty string if OpenAI TTS is down, so video creation still finishes normally
}

// ---------------------------------------------------------------------------
// Main POST handler — the single external endpoint
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const {
      text,       // rough description — third party provides this plain text
      userId,     // third party user/account ID
      model,      // AI video model name
      resolution, // "480p" | "720p" | "1080p" | "4K"
      aspectRatio,// "16:9" | "9:16" | "1:1" | "4:3"
      duration,   // optional — video length in seconds (default: 5)
      numVideos,  // optional — number of videos to generate (default: 1, max: 10)
      count,      // fallback property in case caller sends 'count' instead of 'numVideos'
    } = await req.json();

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

    // Ensure upload directory exists before concurrent writes
    const uploadDir = join(process.cwd(), "uploads", userId, "video");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    await connectToDatabase();

    // ----- Step 2: Generate video(s) with the cinematic enhanced prompt concurrently -----
    const videoPromises = Array.from({ length: videoCount }, async (_, idx) => {
      const falVideoUrl = await generateVideo(
        enhancedPrompt,
        model,
        aspectRatio,
        videoDuration,
        falKey
      );

      // Download and save the video file locally (with retries for network resilience)
      let videoResponse: Response | null = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          videoResponse = await fetch(falVideoUrl);
          if (videoResponse.ok) break;
        } catch (err: any) {
          console.warn(`[Video download attempt ${attempt}/3] Error downloading video #${idx + 1}: ${err.message || err}`);
        }
        if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 2000));
      }
      if (!videoResponse || !videoResponse.ok) {
        throw new Error(`Failed to download generated video #${idx + 1} (${videoResponse?.status || "Network/DNS failure"})`);
      }
      const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());
      const fileName = `${uuidv4()}-ext-ai-generated.mp4`;
      const filePath = join(uploadDir, fileName);

      await writeFile(filePath, videoBuffer);
      const localVideoUrl = `/uploads/${userId}/video/${fileName}`;

      const mediaItem = new MediaItemModel({
        userId: new mongoose.Types.ObjectId(userId),
        name: `External AI Video (${idx + 1}/${videoCount}) – ${model} – ${new Date().toLocaleString()}`,
        type: "video",
        url: localVideoUrl,
        createdAt: new Date(),
      });
      await mediaItem.save();

      return localVideoUrl;
    });

    // Run all video generations in parallel for fastest execution
    const generatedUrls = await Promise.all(videoPromises);

    // ----- Final response -----
    const responsePayload: Record<string, any> = {
      success: true,
    };

    // Dynamically assign "video 1", "video 2", etc. as separate properties
    generatedUrls.forEach((url, index) => {
      responsePayload[`video ${index + 1}`] = url;
    });

    // Also include standard fallback fields for convenience
    responsePayload.videoUrl = generatedUrls[0];
    responsePayload.videos = generatedUrls;
    responsePayload.voiceoverScript = voiceoverScript;

    return NextResponse.json(responsePayload);
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
