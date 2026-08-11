import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import VideoJobModel from "@/models/VideoJob";
import VideoTemplate from "@/models/VideoTemplate";
import { DUMMY_TEMPLATES } from "@/lib/dummyTemplates";
import { v4 as uuidv4 } from "uuid";
import { existsSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { generateUniqueOfferId } from "@/lib/generateOfferId";
import { startGoogleFlowVideoJob } from "@/lib/googleFlowCreate";

export const maxDuration = 300;
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
): Promise<{ enhancedPrompt: string; voiceoverScript: string; socialMediaHeading: string; socialMediaCaption: string; hashTags: string[] }> {
  const systemContent = `You are an expert AI Prompt Engineer specializing in creating cinematic product advertisement prompts for AI video generation models such as Google Flow, Veo, Higgsfield AI, Seedance, Kling, Runway, Pika, Luma and similar models (${model}).

When a marketing promotional offer or tagline is provided, you MUST explicitly command the AI video generator to render a crisp, bold, readable typographic graphic banner at the VERY TOP of the video frame displaying the exact promotional wording!
Your job is to convert a simple offer instruction into an extremely detailed, production-quality video generation prompt, along with an accompanying commercial voiceover script.

The user may provide:
• Product name
• Offer details
• Offer duration
• One or more product images (optional)
• Brand name (optional)
• Store name (optional)
• Colors (optional)
• Additional instructions (optional)

If product images are provided, treat them as the exact reference product.
Do NOT change:
- product shape
- color
- packaging
- logo
- branding
- label
- size
- text on product

The product in the generated video must exactly match the reference image.
If no image is supplied, create a realistic version of the described product.
The generated prompt should focus on producing a premium commercial advertisement.

Always include:
• Hero product shot
• Cinematic camera movements
• Luxury lighting
• Dynamic transitions
• Product closeups
• Premium reflections
• Floating particles when appropriate
• Motion graphics placeholders
• Realistic materials
• Highly detailed textures
• Professional commercial style
• Eye-catching composition

The generated prompt should be optimized for modern AI video generators.
Avoid mentioning camera brands.
Describe camera movements only.
Examples:
- slow push in
- orbit shot
- dolly
- crane shot
- macro closeup
- smooth tracking
- slow motion
- rotating product
- cinematic reveal

Mention lighting such as:
- studio lighting
- soft lighting
- rim lighting
- volumetric lighting
- luxury reflections
- glossy highlights

Mention environment only if suitable.
Examples:
- Luxury studio
- Dark premium background
- Minimal white studio
- Modern retail
- Wooden tabletop
- Kitchen
- Cafe
- Electronics showroom
- Fashion studio

Do not create unnecessary environments.
The focus must remain on the product.

Offer text should NOT be baked into the scene.
Instead, include instructions such as:
"Reserve clean space on left side for offer text overlay."
or
"Leave negative space above product for promotional graphics."

Never hardcode pricing into the scene unless explicitly requested.
Always produce videos suitable for the requested aspect ratio (${aspectRatio}).
Preferred duration: ${duration} seconds.

Tone:
Premium
Modern
Luxury
Highly engaging
Commercial quality

You MUST respond ONLY with a valid JSON object matching this schema:
{
  "enhancedPrompt": "The final video generation prompt strictly following all the rules above. No explanations. No markdown. No headings. No bullet points.",
  "voiceoverScript": "An emotionally compelling television advertisement narration voiceover matching the product (${duration} seconds, ~15-30 words).",
  "socialMediaHeading": "An attention-grabbing, promotional social media heading/title for this video ad (approx 5-10 words).",
  "socialMediaCaption": "A highly engaging, interaction-driven social media caption designed to maximize clicks and shares (approx 15-30 words).",
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
              content: `User's advertising concept and template specifications:\n"${roughText}"\n\nTarget resolution: ${resolution}, aspect ratio: ${aspectRatio}\n\nCarefully merge the user's advertisement ideas with any provided template name & structural design guidelines to generate the structured advertising JSON:`,
            },
          ],
          max_tokens: 650,
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
        socialMediaHeading: parsed.socialMediaHeading || "Special Promotion",
        socialMediaCaption: parsed.socialMediaCaption || `Check out our exclusive offer for ${roughText.slice(0, 40)}...`,
        hashTags: Array.isArray(parsed.hashTags) ? parsed.hashTags : ["#Viral", "#Ad", "#Trending", "#Exclusive"],
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
    socialMediaHeading: "Experience Uncompromising Luxury",
    socialMediaCaption: `Elevated performance and flawless design. Discover the ultimate experience with our exclusive collection today!`,
    hashTags: ["#Luxury", "#Trending", "#Viral", "#NewRelease", "#Ad"],
  };
}

// ---------------------------------------------------------------------------
// Main POST handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let body: Record<string, any> = {};
    const uploadedFiles: File[] = [];

    if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await req.formData().catch(() => new FormData());
      for (const [rawKey, value] of formData.entries()) {
        const key = rawKey.trim();
        if (value instanceof File && value.name && value.size > 0) {
          if (key.includes("image") || key.includes("file") || key === "asset" || value.type.startsWith("image/") || /\.(webp|png|jpe?g|bmp|gif)$/i.test(value.name)) {
            uploadedFiles.push(value);
          } else {
            body[key] = value.name;
          }
        } else if (typeof value === "string") {
          if (["images", "imageUrls", "channels", "socialMedia", "share", "shareTo", "imageType", "imageTypes", "image_type", "image_types"].includes(key)) {
            if (body[key]) {
              if (Array.isArray(body[key])) body[key].push(value);
              else body[key] = [body[key], value];
            } else {
              try {
                if (value.startsWith("[") && value.endsWith("]")) {
                  body[key] = JSON.parse(value);
                } else {
                  body[key] = value;
                }
              } catch {
                body[key] = value;
              }
            }
          } else {
            body[key] = value;
          }
        }
      }
    } else {
      body = await req.json().catch(() => ({}));
    }

    // -- NEW: Async Cloudbases Job (background, avoids CloudFront 60s timeout) --
    // templateId/template_id triggers this flow. Returns jobId immediately.
    // Poll result at POST /api/external/get-video with { jobId }
    // Field mapping: text->description, tagline->headline
    // NOT forwarded: userId, channels, imageType, numberOfVideos, duration

    const cloudbases_template_id = body.template_id || body.templateId;

    if (cloudbases_template_id) {
      const apiKey = process.env.CLOUDBASES_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { success: false, message: 'Server configuration error: CLOUDBASES_API_KEY not set in .env.local' },
          { status: 500 }
        );
      }

      await connectToDatabase();
      const cloudJobId = uuidv4();

      // Field mapping: old fields -> cloudbases fields
      const mapped_description = body.description || body.text    || '';
      const mapped_headline    = body.headline    || body.tagline || '';
      const mapped_discount    = body.discount    || '';
      const mapped_validity    = body.validity    || '';
      const product_url_string = body.product_url || body.productImageUrl || '';

      // Save initial job to DB immediately
      const CloudbasesJobModel = (await import('@/models/CloudbasesJob')).default;
      await CloudbasesJobModel.create({
        jobId:       cloudJobId,
        userId:      body.userId || body.storeUserId || '',
        templateId:  String(cloudbases_template_id),
        status:      'processing',
        description: mapped_description,
        headline:    mapped_headline,
        discount:    mapped_discount,
        validity:    mapped_validity,
        productUrl:  product_url_string,
      });

      // Handle uploaded product image file
      const uploadedProductFile = uploadedFiles.find((f) =>
        f.name && (f.type.startsWith('image/') || /\\.(webp|png|jpe?g|jpg|bmp|gif)$/i.test(f.name))
      ) || null;

      // Convert uploaded file to ArrayBuffer now (before background execution)
      let uploadedFileBuffer: ArrayBuffer | null = null;
      let uploadedFileName = '';
      if (uploadedProductFile) {
        uploadedFileBuffer = await uploadedProductFile.arrayBuffer();
        uploadedFileName   = uploadedProductFile.name;
      }

      // Background async call - does NOT block the response
      (async () => {
        try {
          const externalFormData = new FormData();
          externalFormData.append('template_id', String(cloudbases_template_id));

          if (uploadedFileBuffer) {
            const blob = new Blob([uploadedFileBuffer]);
            externalFormData.append('product_url', blob, uploadedFileName);
          } else if (product_url_string) {
            externalFormData.append('product_url', String(product_url_string));
          }

          if (mapped_headline)    externalFormData.append('headline',    String(mapped_headline));
          if (mapped_discount)    externalFormData.append('discount',    String(mapped_discount));
          if (mapped_description) externalFormData.append('description', String(mapped_description));
          if (mapped_validity)    externalFormData.append('validity',    String(mapped_validity));
          externalFormData.append('footer', '*T&C apply');

          const externalResponse = await fetch(
            'https://cloudbases.in/storesparc_video/index.php/api/external/video',
            { method: 'POST', headers: { 'X-API-Key': apiKey }, body: externalFormData }
          );

          const resultData = await externalResponse.json().catch(() => null);

          await connectToDatabase();
          if (externalResponse.ok && resultData) {
            await CloudbasesJobModel.findOneAndUpdate(
              { jobId: cloudJobId },
              { status: 'completed', resultData, completedAt: new Date() }
            );
          } else {
            await CloudbasesJobModel.findOneAndUpdate(
              { jobId: cloudJobId },
              { status: 'failed', errorMessage: resultData?.message || `HTTP ${externalResponse.status}` }
            );
          }
        } catch (err: any) {
          console.error('[cloudbases background job error]:', err);
          try {
            await connectToDatabase();
            await CloudbasesJobModel.findOneAndUpdate(
              { jobId: cloudJobId },
              { status: 'failed', errorMessage: err?.message || 'Unknown error' }
            );
          } catch (_) {}
        }
      })();

      // Return immediately — client polls with jobId
      return NextResponse.json({
        success: true,
        status: 'processing',
        jobId: cloudJobId,
        provider: 'cloudbases',
        templateId: String(cloudbases_template_id),
        message: `Video generation started. Poll for result at POST /api/external/get-video with { jobId: '${cloudJobId}' }`,
      });
    }
    // -- END NEW --

    /*
    // ── OLD CODE (preserved for reference) ────────────────────────────────
    const {
      text: rawText,
      userId: rawUserId,
      model: rawModel,
      resolution: rawResolution,
      aspectRatio: rawAspectRatio,
      duration,
      numVideos,
      numberOfVideos,
      number_of_videos,
      count,
      channels,
      socialMedia,
      share,
      shareTo,
      images,
      imageUrls,
      imageTypes,
      imageType,
      image_types,
      image_type,
      templateId,
      tagline: rawTagline,
    } = body;

    const userId = typeof rawUserId === "string" ? rawUserId.trim() : "";
    const model = typeof rawModel === "string" ? rawModel.trim() : "";
    const resolution = typeof rawResolution === "string" ? rawResolution.trim() : "";
    const text = typeof rawText === "string" ? rawText.trim() : "";
    const aspectRatio = typeof rawAspectRatio === "string" ? rawAspectRatio.trim() : "";
    const cleanOfferId = await generateUniqueOfferId();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Field 'userId' is required" },
        { status: 400 }
      );
    }

    let finalText = text;
    let finalAspectRatio = aspectRatio;
    let finalResolution = resolution;
    let finalModel = model;
    let finalDuration = duration;

    if (templateId?.trim()) {
      await connectToDatabase();
      const targetTmplId = templateId.trim();
      const template: any = await VideoTemplate.findOne({
        _id: targetTmplId,
        storeUserId: userId.trim(),
      }).lean();

      const dummyTemplate = DUMMY_TEMPLATES.find((d) => d._id === targetTmplId);

      if (!template && !dummyTemplate) {
        return NextResponse.json(
          { success: false, message: `Template not found with ID '${templateId}' for userId '${userId}'` },
          { status: 404 }
        );
      }

      if (template) {
        const descText = String(template.description || template.templateDescription || template.offerTitle || "");
        if (!finalAspectRatio && template.aspectRatio) finalAspectRatio = String(template.aspectRatio).trim();
        if (!finalResolution && template.resolution) finalResolution = String(template.resolution).trim();
        if (!finalDuration && template.videoDuration) finalDuration = template.videoDuration;
        if (!finalModel && template.aiModel) finalModel = String(template.aiModel).trim();

        if (!finalAspectRatio) {
          const ratioMatch = descText.match(/\b(9:16|16:9|1:1|4:3|3:4|21:9)\b/);
          if (ratioMatch) finalAspectRatio = ratioMatch[1];
        }
        if (!finalResolution) {
          const resMatch = descText.match(/\b(720p|1080p|480p|4k|2k|720x1280|1080x1920)\b/i);
          if (resMatch) {
            const m = resMatch[1].toLowerCase();
            finalResolution = m.includes("1080") ? "1080p" : m.includes("4k") ? "4K" : "720p";
          }
        }

        const tmplDetails = template.description?.trim()
          ? `[Selected Template Name: ${template.templateName}]\n[Template Architecture & Design Instructions:\n${template.description.trim()}]`
          : `[Selected Template Name: ${template.templateName}]\n[Template Specifications & Visual Guidelines: Theme: ${template.templateDescription || template.offerTitle}. Headline: '${template.offerTitle}', description: '${template.offerDescription}', badge label: '${template.offerLabel}', discount '${template.discountLabel}' from '${template.priceLabel}'. Animation style: ${template.animationStyle}. Colors: ${template.backgroundColor} background with ${template.primaryTextColor} text. Product placement at ${template.productImagePosition}, store branding at ${template.storeImagePosition}, logo placed at ${template.logoPosition}.]`;

        finalText = finalText.trim()
          ? `User Advertising Instructions: "${finalText.trim()}"\n\nMust follow these AI Video Template structural requirements:\n${tmplDetails}`
          : `Generate video following these exact AI Video Template specifications:\n${tmplDetails}`;
      } else if (dummyTemplate) {
        const descText = String(dummyTemplate.description || "");
        if (!finalAspectRatio && (dummyTemplate as any).aspectRatio) finalAspectRatio = String((dummyTemplate as any).aspectRatio).trim();
        if (!finalResolution && (dummyTemplate as any).resolution) finalResolution = String((dummyTemplate as any).resolution).trim();

        if (!finalAspectRatio) {
          const ratioMatch = descText.match(/\b(9:16|16:9|1:1|4:3|3:4|21:9)\b/);
          if (ratioMatch) finalAspectRatio = ratioMatch[1];
        }
        if (!finalResolution) {
          const resMatch = descText.match(/\b(720p|1080p|480p|4k|2k|720x1280|1080x1920)\b/i);
          if (resMatch) {
            const m = resMatch[1].toLowerCase();
            finalResolution = m.includes("1080") ? "1080p" : m.includes("4k") ? "4K" : "720p";
          }
        }

        const tmplDetails = `[Selected Template Name: ${dummyTemplate.templateName}]\n[Template Architecture & Design Instructions:\n${dummyTemplate.description.trim()}]`;

        finalText = finalText.trim()
          ? `User Advertising Instructions: "${finalText.trim()}"\n\nMust follow these exact AI Video Template architectural requirements and visual layout:\n${tmplDetails}`
          : `Generate commercial advertisement strictly following these AI Video Template instructions:\n${tmplDetails}`;
      }
    }

    if (!finalModel?.trim()) finalModel = "Veo 3.1";
    if (!finalResolution?.trim()) finalResolution = "720p";
    if (!finalAspectRatio?.trim()) finalAspectRatio = "9:16";

    const isGoogleModel = String(finalModel).toLowerCase().includes("veo") || String(finalModel).toLowerCase().includes("google") || String(finalModel).toLowerCase().includes("flow") || String(body.provider || "").toLowerCase().includes("google");

    if (!finalText?.trim()) {
      return NextResponse.json(
        { success: false, message: "Field 'text' (or a valid 'templateId') is required — provide your video description" },
        { status: 400 }
      );
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    const falKey = process.env.FAL_KEY;

    if (!openAiKey) {
      return NextResponse.json(
        { success: false, message: "Server configuration error: OPENAI_API_KEY not set" },
        { status: 500 }
      );
    }
    if (!falKey && !isGoogleModel) {
      return NextResponse.json(
        { success: false, message: "Server configuration error: FAL_KEY not set" },
        { status: 500 }
      );
    }

    const finalTagline = typeof rawTagline === "string" ? rawTagline.trim() : "";

    if (finalTagline) {
      finalText = finalText.trim() + `\n\n[MANDATORY ON-SCREEN PROMOTIONAL TEXT OVERLAY: Render a high-end commercial typographic graphic banner prominently at the VERY TOP of the video frame reading exactly: "${finalTagline}". Ensure this promotional offer text is sharp, bold, elegant, and cleanly overlaid at the top above the video scene alongside the brand logo.]`;
    }

    const videoDuration = Math.max(1, Math.min(60, Number(String(finalDuration || 4).replace("s", "")) || 4));
    const videoCount = Math.max(1, Math.min(10, Number(numVideos || numberOfVideos || number_of_videos || count) || 1));

    const rawChannels = channels || socialMedia || share || shareTo || [];
    let channelsList: string[] = [];
    if (Array.isArray(rawChannels)) {
      channelsList = rawChannels.map((item: any) => String(item).trim()).filter(Boolean);
    } else if (typeof rawChannels === "string") {
      channelsList = rawChannels.split(",").map((s: string) => s.trim()).filter(Boolean);
    }

    const rawImages = images || imageUrls || [];
    let imagesList: string[] = [];
    if (Array.isArray(rawImages)) {
      imagesList = rawImages.map((item: any) => String(item).trim()).filter(Boolean);
    } else if (typeof rawImages === "string") {
      imagesList = rawImages.split(",").map((s: string) => s.trim()).filter(Boolean);
    }

    const rawImageTypes = imageTypes || imageType || image_types || image_type || [];
    let imageTypesList: string[] = [];
    if (Array.isArray(rawImageTypes)) {
      imageTypesList = rawImageTypes.map((item: any) => String(item).trim()).filter(Boolean);
    } else if (typeof rawImageTypes === "string") {
      try {
        if (rawImageTypes.startsWith("[") && rawImageTypes.endsWith("]")) {
          imageTypesList = JSON.parse(rawImageTypes).map((item: any) => String(item).trim()).filter(Boolean);
        } else {
          imageTypesList = rawImageTypes.split(",").map((s: string) => s.trim()).filter(Boolean);
        }
      } catch {
        imageTypesList = rawImageTypes.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    }

    if (uploadedFiles.length > 0 && userId?.trim()) {
      const imgUploadDir = join(process.cwd(), "uploads", userId.trim(), "image");
      if (!existsSync(imgUploadDir)) {
        await mkdir(imgUploadDir, { recursive: true });
      }
      for (const file of uploadedFiles) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const ext = file.name.split(".").pop() || "png";
          const fileName = `${uuidv4()}.${ext}`;
          await writeFile(join(imgUploadDir, fileName), buffer);
          const localImageUrl = `/uploads/${userId.trim()}/image/${fileName}`;
          imagesList.push(localImageUrl);
        } catch (err) {
          console.warn("[external/create-video] Failed to save uploaded image file:", err);
        }
      }
    }

    if (imageTypesList.length > 0 && imagesList.length > 0) {
      const typeInstructions = imageTypesList.map((type, i) => {
        const lowerType = type.toLowerCase();
        if (lowerType.includes("logo") || lowerType.includes("brand")) {
          return `• Image ${i + 1} is a BRAND LOGO: Do NOT render or animate this logo as a generic physical 3D object in the world scene. Display this logo cleanly as a high-end branding graphic, watermark, or animated logo overlay in the corner or end-screen of the commercial video advertisement.`;
        } else if (lowerType.includes("product") || lowerType.includes("item")) {
          return `• Image ${i + 1} is the HERO PRODUCT IMAGE: This is the exact actual physical product to be featured and animated in the commercial. Keep its shape, branding, packaging, and colors exactly as shown in the reference image, featuring it with luxury lighting and cinematic camera movements.`;
        } else {
          return `• Image ${i + 1} serves as '${type}': Incorporate this visual asset into the video specifically as a ${type}.`;
        }
      }).join("\n");
      finalText = finalText.trim() + `\n\n[UPLOADED IMAGE ROLES & PURPOSES:\n${typeInstructions}]`;
    }

    if (isGoogleModel) {
      const googleApiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
      if (!googleApiKey) {
        return NextResponse.json(
          { success: false, message: "Server configuration error: GOOGLE_API_KEY not set for Google Flow Veo 3.1 generation" },
          { status: 500 }
        );
      }

      let refImageBase64 = String(body.imageBase64 || body.referenceImage || "");
      let refMimeType = String(body.imageMimeType || "image/jpeg");
      if (!refImageBase64 && uploadedFiles.length > 0) {
        try {
          const arrayBuffer = await uploadedFiles[0].arrayBuffer();
          refImageBase64 = Buffer.from(arrayBuffer).toString("base64");
          refMimeType = uploadedFiles[0].type || "image/webp";
        } catch (e) {
          if (imagesList.length > 0) refImageBase64 = imagesList[0];
        }
      } else if (!refImageBase64 && imagesList.length > 0) {
        refImageBase64 = imagesList[0];
      }

      return await startGoogleFlowVideoJob({
        userId: userId.trim(),
        text: finalText || text,
        aspectRatio: finalAspectRatio || "16:9",
        duration: Math.max(4, Math.min(8, Number(String(finalDuration || "4").replace("s", "")) || 4)),
        offerId: cleanOfferId || "",
        tagline: finalTagline || "",
        templateId: templateId ? String(templateId).trim() : "",
        channels: channelsList,
        images: imagesList,
        imageTypes: imageTypesList,
        numberOfVideos: videoCount,
        imageBase64: refImageBase64,
        imageMimeType: refMimeType,
        openAiKey,
        googleApiKey,
        fromUnifiedEndpoint: true,
      });
    }

    await connectToDatabase();
    const jobId = uuidv4();
    const videoJob = new VideoJobModel({
      jobId,
      userId,
      modelName: finalModel || "Wan 2.1 (1.3B)",
      status: "processing",
      voiceoverScript: "",
      enhancedPrompt: "",
      socialMediaHeading: "",
      socialMediaCaption: "",
      hashTags: [],
      approvalStatus: "pending",
      templateId: templateId ? String(templateId).trim() : "",
      offerId: cleanOfferId,
      tagline: finalTagline || "",
      images: imagesList,
      imageTypes: imageTypesList,
      channels: channelsList,
      socialMedia: channelsList,
      videoCount,
      falRequests: [],
      createdAt: new Date(),
    });
    await videoJob.save();

    (async () => {
      try {
        const { enhancedPrompt, voiceoverScript, socialMediaHeading, socialMediaCaption, hashTags } = await enhancePromptAndScript(
          finalText,
          finalModel,
          finalResolution,
          finalAspectRatio,
          videoDuration,
          openAiKey
        );

        let finalSubmissionPrompt = enhancedPrompt;
        if (finalTagline && !finalSubmissionPrompt.includes(finalTagline)) {
          finalSubmissionPrompt = `${enhancedPrompt}\n\n[CRITICAL VIDEO OVERLAY INSTRUCTION: Render a clean, bold, high-resolution commercial graphic text banner positioned directly at the VERY TOP of the video frame reading exactly: "${finalTagline}". Ensure this promotional offer lettering is cleanly overlaid above the video scene.]`;
        }

        await connectToDatabase();
        const activeJob: any = await VideoJobModel.findOne({ jobId });
        if (activeJob) {
          activeJob.enhancedPrompt = finalSubmissionPrompt;
          activeJob.voiceoverScript = voiceoverScript;
          activeJob.socialMediaHeading = socialMediaHeading;
          activeJob.socialMediaCaption = socialMediaCaption;
          activeJob.hashTags = hashTags;
          await activeJob.save().catch(() => { });
        }

        const modelSlug = MODEL_SLUG_MAP[finalModel] || "fal-ai/wan-t2v";
        const imageSizeKey = ASPECT_MAP[finalAspectRatio] || "portrait_9_16";

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
                  prompt: finalSubmissionPrompt,
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

        if (activeJob) {
          activeJob.falRequests = falRequests;
          await activeJob.save();
        }
      } catch (err: any) {
        console.error(`[external/create-video background task error for jobId ${jobId}]:`, err);
        try {
          await connectToDatabase();
          await VideoJobModel.findOneAndUpdate({ jobId }, { status: "failed" });
        } catch (_) { }
      }
    })();

    return NextResponse.json({
      success: true,
      status: "processing",
      jobId,
      model: finalModel,
      duration: typeof finalDuration === "string" && finalDuration ? finalDuration : `${videoDuration}s`,
      numberOfVideos: videoCount,
      offerId: cleanOfferId,
      ...(finalTagline ? { tagline: finalTagline } : {}),
      ...(imageTypesList.length > 0 ? { imageTypes: imageTypesList } : {}),
      ...(templateId ? { templateId: String(templateId).trim() } : {}),
      message: `AI Video generation takes time depending on model complexity. Please check after 10 minutes by sending a POST request with {"jobId": "${jobId}"} to /api/external/get-video`,
    });
    // ── END OLD CODE ───────────────────────────────────────────────────────
    */

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
