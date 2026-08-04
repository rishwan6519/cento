import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { connectToDatabase } from "@/lib/db";
import GoogleFlowJobModel from "@/models/GoogleFlowJob";
import { v4 as uuidv4 } from "uuid";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Helper: Resolve image from base64, disk path, server path, or URL to Base64
// ---------------------------------------------------------------------------
async function resolveProductImage(
  imageInput: string,
  fallbackMime = "image/jpeg"
): Promise<{ base64: string; mimeType: string } | null> {
  if (!imageInput || typeof imageInput !== "string") return null;
  const str = imageInput.trim();
  if (!str) return null;

  // 1. Already a data URL
  if (str.startsWith("data:image/")) {
    const parts = str.split(",");
    const match = parts[0].match(/data:(image\/[a-zA-Z0-9.+_-]+);base64/);
    const mime = match ? match[1] : fallbackMime;
    return { base64: parts[1].trim(), mimeType: mime };
  }

  // 2. HTTP/HTTPS remote URL
  if (str.startsWith("http://") || str.startsWith("https://")) {
    try {
      const res = await fetch(str);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const mime = res.headers.get("content-type") || fallbackMime;
        return { base64: Buffer.from(arrayBuffer).toString("base64"), mimeType: mime };
      }
    } catch (err) {
      console.warn("[resolveProductImage] Failed to fetch remote image URL:", err);
    }
    return null;
  }

  // 3. Local disk file path (e.g. Windows "/C:/Users/..." or workspace "/uploads/...")
  try {
    let filePath = str;
    if (/^\/[a-zA-Z]:[\/\\]/.test(filePath)) {
      filePath = filePath.slice(1); // Strip leading slash before Windows drive letter
    }
    if (filePath.startsWith("/uploads") || filePath.startsWith("uploads/")) {
      filePath = join(process.cwd(), filePath.replace(/^\//, ""));
    }

    if (existsSync(filePath)) {
      const buf = await readFile(filePath);
      const ext = filePath.split(".").pop()?.toLowerCase() || "jpg";
      const mimeMap: Record<string, string> = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        webp: "image/webp",
        gif: "image/gif",
      };
      return { base64: buf.toString("base64"), mimeType: mimeMap[ext] || fallbackMime };
    }
  } catch (err) {
    console.warn("[resolveProductImage] Failed reading local disk image file:", err);
  }

  // 4. Raw base64 string without data prefix
  if (str.length > 200 && /^[A-Za-z0-9+/=]+$/.test(str.replace(/\s+/g, ""))) {
    return { base64: str, mimeType: fallbackMime };
  }

  return null;
}

// ---------------------------------------------------------------------------
// OpenAI prompt enhancement — generates cinematic prompt + voiceover + social
// ---------------------------------------------------------------------------
async function enhancePrompt(
  rawText: string,
  aspectRatio: string,
  duration: number,
  openAiKey: string,
  imageData?: { base64: string; mimeType: string } | null
): Promise<{
  enhancedPrompt: string;
  voiceoverScript: string;
  socialMediaHeading: string;
  socialMediaCaption: string;
  hashTags: string[];
}> {
  const systemContent = `You are an expert AI Prompt Engineer specializing in creating cinematic product advertisement prompts for Google Flow Veo 3.1 Lite — Google's state-of-the-art text-to-video AI model.

Your job is to convert a simple idea or product description into an extremely detailed, production-quality video generation prompt.

Always include:
• Hero product or scene shot
• Cinematic camera movements (slow push in, orbit shot, dolly, crane shot, macro closeup, smooth tracking, cinematic reveal)
• Luxury lighting (studio lighting, soft lighting, rim lighting, volumetric lighting, luxury reflections)
• Dynamic transitions
• Premium reflections and materials
• Highly detailed textures
• Professional commercial style

Preferred duration: ${duration} seconds.
Target aspect ratio: ${aspectRatio}.

Tone: Premium, Modern, Luxury, Highly engaging, Commercial quality

You MUST respond ONLY with a valid JSON object matching this schema:
{
  "enhancedPrompt": "The final Veo 3.1 Lite video generation prompt. No explanations. No markdown. No headings.",
  "voiceoverScript": "An emotionally compelling TV advertisement narration (${duration} seconds, ~15-30 words).",
  "socialMediaHeading": "An attention-grabbing promotional heading (approx 5-10 words).",
  "socialMediaCaption": "A highly engaging, interaction-driven social media caption (approx 15-30 words).",
  "hashTags": ["#Tag1", "#Tag2", "#Tag3", "#Tag4", "#Tag5"]
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
              content: imageData && imageData.base64
                ? [
                    {
                      type: "text",
                      text: `Create a Veo 3.1 Lite product commercial advertisement video prompt for:\n"${rawText}"\n\nAspect ratio: ${aspectRatio}, Duration: ${duration}s.\nCRITICAL PRODUCT VISION INSTRUCTION: An actual image of the product has been attached. Inspect the product image carefully — identify its exact features, colors, packaging, logo, labels, materials, and design. Your video generation prompt MUST explicitly instruct the AI video model to animate this exact reference product image into a high-end commercial advertisement video. Emphasize preserving the exact visual identity, branding, packaging, and shape of the product shown in the image, while bringing it to life with studio luxury lighting, dynamic reflections, cinematic camera movements (orbit shot, macro closeup push-in, smooth tracking), and cinematic atmosphere (such as glowing particles, water splashes, or sleek pedestal display).`,
                    },
                    {
                      type: "image_url",
                      image_url: { url: `data:${imageData.mimeType || "image/jpeg"};base64,${imageData.base64}` },
                    },
                  ]
                : `Create a Veo 3.1 Lite video generation prompt for:\n"${rawText}"\n\nAspect ratio: ${aspectRatio}, Duration: ${duration}s`,
            },
          ],
          max_tokens: 600,
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        if ((response.status >= 500 || response.status === 429) && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, attempt * 2000));
          continue;
        }
        throw new Error(`OpenAI error ${response.status}`);
      }

      const data = await response.json();
      const parsed = JSON.parse(data.choices?.[0]?.message?.content?.trim() || "{}");
      return {
        enhancedPrompt: parsed.enhancedPrompt || rawText,
        voiceoverScript: parsed.voiceoverScript || "",
        socialMediaHeading: parsed.socialMediaHeading || "Experience the Best",
        socialMediaCaption: parsed.socialMediaCaption || rawText.slice(0, 80),
        hashTags: Array.isArray(parsed.hashTags) ? parsed.hashTags : ["#Viral", "#Ad", "#Trending"],
      };
    } catch (err) {
      if (attempt === maxRetries) {
        console.warn("[google-flow/create-video] OpenAI enhance failed, using raw prompt.");
      } else {
        await new Promise((r) => setTimeout(r, attempt * 2000));
      }
    }
  }

  // Fallback
  return {
    enhancedPrompt: `Cinematic commercial advertisement: ${rawText}. Dynamic slow-motion, volumetric rays, gleaming specular surface highlights, luxury studio environment, professional commercial quality.`,
    voiceoverScript: `Experience ${rawText.slice(0, 40)}. Uncompromising quality, elevated performance, flawless design.`,
    socialMediaHeading: "Discover Uncompromising Quality",
    socialMediaCaption: `Elevated performance and flawless design. Discover the ultimate experience today!`,
    hashTags: ["#Luxury", "#Trending", "#Viral", "#NewRelease", "#Ad"],
  };
}

// ---------------------------------------------------------------------------
// Submit to Google Gemini API — Veo 3.1 Lite (async long-running operation)
// ---------------------------------------------------------------------------
async function submitToGoogleFlow(
  prompt: string,
  aspectRatio: string,
  duration: number,
  googleApiKey: string,
  imageData?: { base64: string; mimeType: string } | null
): Promise<string> {
  // Google Gemini API generate_videos endpoint
  const url = `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-lite-generate-preview:predictLongRunning?key=${googleApiKey}`;

  const instancePayload: Record<string, any> = { prompt };
  if (imageData && imageData.base64) {
    instancePayload.image = {
      bytesBase64Encoded: imageData.base64,
      mimeType: imageData.mimeType || "image/jpeg",
    };
  }

  const requestBody = {
    instances: [instancePayload],
    parameters: {
      aspectRatio,
      durationSeconds: duration,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    let cleanMsg = errText;
    try {
      const parsed = JSON.parse(errText);
      if (parsed?.error?.message) {
        cleanMsg = parsed.error.message.replace(/\s+/g, " ");
      }
    } catch (_) {}
    if (response.status === 429) {
      throw new Error(`Quota Exceeded (429): Your Google API Key has exceeded its usage limit or requires billing enabled to generate Veo videos. (${cleanMsg})`);
    }
    throw new Error(`Google Flow API error (${response.status}): ${cleanMsg}`);
  }

  const data = await response.json();
  // Returns a long-running operation name like "operations/abc123..."
  const operationName = data?.name;
  if (!operationName) {
    throw new Error("Google Flow API did not return an operation name: " + JSON.stringify(data).slice(0, 200));
  }

  return operationName;
}

// ---------------------------------------------------------------------------
// POST Handler — Initiate Google Flow Veo 3.1 Lite video generation
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let body: Record<string, any> = {};

    if (contentType.includes("application/json")) {
      body = await req.json().catch(() => ({}));
    } else {
      const formData = await req.formData().catch(() => new FormData());
      for (const [key, value] of formData.entries()) {
        if (typeof value === "string") body[key] = value;
      }
    }

    const {
      text: rawText,
      userId: rawUserId,
      aspectRatio: rawAspectRatio,
      duration: rawDuration,
      offerId: rawOfferId,
      offer_id,
      imageBase64: rawImageBase64,
      imageMimeType: rawMimeType,
      referenceImage,
    } = body;

    const userId = typeof rawUserId === "string" ? rawUserId.trim() : "";
    const text = typeof rawText === "string" ? rawText.trim() : "";
    const aspectRatio = ["16:9", "9:16", "1:1"].includes(rawAspectRatio) ? rawAspectRatio : "16:9";
    const duration = Math.max(4, Math.min(8, Number(String(rawDuration || "4").replace("s", "")) || 4));
    const offerId = String(rawOfferId || offer_id || "").trim();

    let imageBase64 = String(rawImageBase64 || referenceImage || "").trim();
    let imageMimeType = String(rawMimeType || "").trim() || "image/jpeg";

    if (imageBase64.startsWith("data:image/")) {
      const parts = imageBase64.split(",");
      if (parts.length > 1) {
        const match = parts[0].match(/data:(image\/[a-zA-Z0-9.+_-]+);base64/);
        if (match && match[1]) {
          imageMimeType = match[1];
        }
        imageBase64 = parts[1].trim();
      }
    }

    // Validate required fields
    if (!userId) {
      return NextResponse.json({ success: false, message: "Field 'userId' is required" }, { status: 400 });
    }
    if (!text) {
      return NextResponse.json({ success: false, message: "Field 'text' is required — provide your video description" }, { status: 400 });
    }

    // Validate API keys
    const openAiKey = process.env.OPENAI_API_KEY;
    const googleApiKey = process.env.GOOGLE_API_KEY;

    if (!openAiKey) {
      return NextResponse.json({ success: false, message: "Server configuration error: OPENAI_API_KEY not set" }, { status: 500 });
    }
    if (!googleApiKey) {
      return NextResponse.json({ success: false, message: "Server configuration error: GOOGLE_API_KEY not set" }, { status: 500 });
    }

    return await startGoogleFlowVideoJob({
      userId,
      text,
      aspectRatio,
      duration,
      offerId,
      imageBase64,
      imageMimeType,
      openAiKey,
      googleApiKey,
      fromUnifiedEndpoint: false,
    });
  } catch (error) {
    console.error("[google-flow/create-video] Error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error occurred" },
      { status: 500 }
    );
  }
}

export async function startGoogleFlowVideoJob({
  userId,
  text,
  aspectRatio = "16:9",
  duration = 4,
  offerId = "",
  templateId = "",
  channels = [],
  images = [],
  numberOfVideos = 1,
  imageBase64 = "",
  imageMimeType = "image/jpeg",
  openAiKey,
  googleApiKey,
  fromUnifiedEndpoint = false,
}: {
  userId: string;
  text: string;
  aspectRatio?: string;
  duration?: number;
  offerId?: string;
  templateId?: string;
  channels?: string[];
  images?: string[];
  numberOfVideos?: number;
  imageBase64?: string;
  imageMimeType?: string;
  openAiKey: string;
  googleApiKey: string;
  fromUnifiedEndpoint?: boolean;
}): Promise<NextResponse> {
  const cleanDuration = Math.max(4, Math.min(8, Number(String(duration || 4).replace("s", "")) || 4));
  const rawImageCandidate = imageBase64 || (images && images.length > 0 ? images[0] : "");
  const resolvedImage = await resolveProductImage(rawImageCandidate, imageMimeType);

  let referenceImageUrl = "";
  if (resolvedImage && !rawImageCandidate.startsWith("http") && !rawImageCandidate.startsWith("/")) {
    try {
      const uploadDir = join(process.cwd(), "uploads", userId, "images");
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      const ext = resolvedImage.mimeType.split("/")[1] || "png";
      const fileName = `ref-${uuidv4()}.${ext}`;
      const filePath = join(uploadDir, fileName);
      await writeFile(filePath, Buffer.from(resolvedImage.base64, "base64"));
      referenceImageUrl = `/uploads/${userId}/images/${fileName}`;
    } catch (err) {
      console.warn("[google-flow/create-video] Failed to save local reference image:", err);
    }
  } else if (rawImageCandidate.startsWith("http") || rawImageCandidate.startsWith("/")) {
    referenceImageUrl = rawImageCandidate;
  }

  await connectToDatabase();
  const jobId = uuidv4();
  const jobDoc = new GoogleFlowJobModel({
    jobId,
    userId,
    rawPrompt: text,
    aspectRatio,
    duration: cleanDuration,
    offerId,
    templateId,
    channels,
    images,
    numberOfVideos,
    referenceImageUrl,
    hasReferenceImage: !!resolvedImage,
    status: "processing",
    createdAt: new Date(),
  });
  await jobDoc.save();

  (async () => {
    try {
      const { enhancedPrompt, voiceoverScript, socialMediaHeading, socialMediaCaption, hashTags } =
        await enhancePrompt(text, aspectRatio, cleanDuration, openAiKey, resolvedImage);

      await connectToDatabase();
      const activeJob = await GoogleFlowJobModel.findOne({ jobId });
      if (!activeJob) return;

      activeJob.enhancedPrompt = enhancedPrompt;
      activeJob.voiceoverScript = voiceoverScript;
      activeJob.socialMediaHeading = socialMediaHeading;
      activeJob.socialMediaCaption = socialMediaCaption;
      activeJob.hashTags = hashTags;
      await activeJob.save().catch(() => {});

      const operationName = await submitToGoogleFlow(enhancedPrompt, aspectRatio, cleanDuration, googleApiKey, resolvedImage);

      await connectToDatabase();
      const updatedJob = await GoogleFlowJobModel.findOne({ jobId });
      if (updatedJob) {
        updatedJob.operationName = operationName;
        await updatedJob.save().catch(() => {});
      }
    } catch (err: any) {
      console.error(`[google-flow/create-video background error for jobId ${jobId}]:`, err);
      try {
        await connectToDatabase();
        await GoogleFlowJobModel.findOneAndUpdate({ jobId }, { status: "failed", errorMessage: err.message || "Unknown error" });
      } catch (_) {}
    }
  })();

  return NextResponse.json({
    success: true,
    status: "processing",
    jobId,
    model: fromUnifiedEndpoint ? "Veo 3.1 Lite (Google Flow)" : "Veo 3.1 Lite",
    provider: "Google Flow",
    aspectRatio,
    duration: `${duration}s`,
    numberOfVideos,
    ...(channels && channels.length > 0 ? { channels } : {}),
    ...(images && images.length > 0 ? { images } : {}),
    ...(offerId ? { offerId } : {}),
    ...(templateId ? { templateId } : {}),
    ...(referenceImageUrl ? { referenceImageUrl } : {}),
    hasReferenceImage: !!imageBase64,
    message: fromUnifiedEndpoint
      ? `AI Video generation via Google Flow Veo 3.1 Lite started. Please check after a few minutes by sending a POST request with {"jobId": "${jobId}"} to /api/external/get-video`
      : `Google Flow Veo 3.1 Lite video generation started. Poll for results at /api/external/google-flow/get-video with {"jobId": "${jobId}"}`,
  });
}
