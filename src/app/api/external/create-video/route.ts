import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import VideoJobModel from "@/models/VideoJob";
import VideoTemplate from "@/models/VideoTemplate";
import { v4 as uuidv4 } from "uuid";

export const maxDuration = 300; // Allow sufficient execution duration for background tasks
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Supported models & resolutions
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

  return {
    enhancedPrompt: `Macro extreme close-up commercial product feature: ${roughText}. Dynamic slow-motion environmental interaction, robotic techno-dolly camera orbital pan, bright volumetric rays, gleaming specular surface highlights against shallow depth of field studio bokeh. Shot on an ARRI Alexa Mini with a 35mm Master Prime anamorphic lens, pristine crystal-clear motion, television commercial production quality.`,
    voiceoverScript: `Experience ${roughText}. Uncompromising luxury, elevated performance, and flawless design. Discover perfection today.`,
  };
}

// ---------------------------------------------------------------------------
// Main POST handler — strictly initiates AI video generation jobs (< 2s)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const {
      text,       // rough description — third party provides this plain text
      userId,     // third party user/account ID
      model,      // AI video model name
      resolution, // "480p" | "720p" | "1080p" | "4K"
      aspectRatio,// "16:9" | "9:16" | "1:1" | "4:3"
      duration,   // optional — video length in seconds (default: 5)
      numVideos,  // optional — number of videos to generate (default: 1, max: 10)
      count,      // fallback property in case caller sends 'count' instead of 'numVideos'
      socialMedia,// optional — platforms to share to e.g. ["insta", "facebook", "twitter"]
      share,      // fallback alias for socialMedia
      shareTo,    // fallback alias for socialMedia
      images,     // optional — array of image URLs
      imageUrls,  // fallback alias for images
      templateId, // optional — AI Video Template ID from video_templates collection
    } = body;

    // ----- Validate required userId first -----
    if (!userId?.trim()) {
      return NextResponse.json(
        { success: false, message: "Field 'userId' is required" },
        { status: 400 }
      );
    }

    let finalText = text || "";
    let finalAspectRatio = aspectRatio;
    let finalDuration = duration;

    // Retrieve template from database automatically if templateId is provided
    if (templateId?.trim()) {
      await connectToDatabase();
      const template: any = await VideoTemplate.findOne({
        _id: templateId.trim(),
        storeUserId: userId.trim(),
      }).lean();

      if (!template) {
        return NextResponse.json(
          { success: false, message: `Template not found with ID '${templateId}' for userId '${userId}'` },
          { status: 404 }
        );
      }
      if (!finalAspectRatio && template.aspectRatio) finalAspectRatio = template.aspectRatio;
      if (!finalDuration && template.videoDuration) finalDuration = template.videoDuration;

      // Build advertising script/text from template details if explicit 'text' was omitted
      if (!finalText.trim()) {
        finalText = `Commercial ad campaign titled '${template.templateName}'. Theme: ${template.templateDescription || template.offerTitle}. Promotional headline: '${template.offerTitle}', description: '${template.offerDescription}', badge label: '${template.offerLabel}' displaying discount '${template.discountLabel}' from '${template.priceLabel}'. Animation style: ${template.animationStyle}. Colors: ${template.backgroundColor} background with ${template.primaryTextColor} text and ${template.buttonColor} button labeled '${template.ctaButtonText}'. Product placement at ${template.productImagePosition}, store branding at ${template.storeImagePosition}, logo placed at ${template.logoPosition}. Footer text: '${template.footerText}'. Professional broadcast quality in ${template.language}.`;
      }
    }

    // ----- Validate required fields -----
    if (!finalText?.trim()) {
      return NextResponse.json(
        { success: false, message: "Field 'text' (or a valid 'templateId') is required — provide your video description" },
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
    if (!finalAspectRatio?.trim()) {
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

    const videoDuration = Math.max(1, Math.min(60, Number(finalDuration) || 5));
    const videoCount = Math.max(1, Math.min(10, Number(numVideos || count) || 1));

    const rawSocialMedia = socialMedia || share || shareTo || [];
    let socialMediaList: string[] = [];
    if (Array.isArray(rawSocialMedia)) {
      socialMediaList = rawSocialMedia.map((item: any) => String(item).trim()).filter(Boolean);
    } else if (typeof rawSocialMedia === "string") {
      socialMediaList = rawSocialMedia.split(",").map((s: string) => s.trim()).filter(Boolean);
    }

    const rawImages = images || imageUrls || [];
    let imagesList: string[] = [];
    if (Array.isArray(rawImages)) {
      imagesList = rawImages.map((item: any) => String(item).trim()).filter(Boolean);
    } else if (typeof rawImages === "string") {
      imagesList = rawImages.split(",").map((s: string) => s.trim()).filter(Boolean);
    }

    // ----- Step 1: Enhance rough text into cinematic DoP prompt + commercial VO script -----
    const { enhancedPrompt, voiceoverScript } = await enhancePromptAndScript(
      finalText,
      model,
      resolution,
      finalAspectRatio,
      videoDuration,
      openAiKey
    );

    const modelSlug = MODEL_SLUG_MAP[model] || "fal-ai/wan-t2v";
    const imageSizeKey = ASPECT_MAP[finalAspectRatio] || "landscape_16_9";

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
              aspect_ratio: finalAspectRatio,
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
      enhancedPrompt,
      images: imagesList,
      socialMedia: socialMediaList,
      videoCount,
      falRequests,
      createdAt: new Date(),
    });
    await videoJob.save();

    // Immediately return processing status pointing to the separate /api/external/get-video endpoint!
    return NextResponse.json({
      success: true,
      status: "processing",
      jobId,
      enhancedPrompt,
      voiceoverScript,
      socialMedia: socialMediaList,
      message: `Video generation initiated successfully. Retrieve your completed videos by sending a POST request with {"jobId": "${jobId}"} to /api/external/get-video`,
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
