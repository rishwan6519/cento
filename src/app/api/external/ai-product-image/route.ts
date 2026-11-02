import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import { toAbsoluteUrl } from "@/lib/urlHelper";
import { removeProductBackground } from "@/lib/videoRenderer/imageProcessor";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Step 1: Write a single detailed image-generation prompt for a commercial product photo.
 * Return ONLY the prompt text — no quotes, no markdown, no explanation.
 */
async function buildProductImagePrompt(
  openAiKey: string,
  params: {
    productName: string;
    description: string;
    colorTheme: string;
    style: string;
    transparentBg: boolean;
  }
): Promise<string> {
  const bgLine = params.transparentBg
    ? "Product cutout on a fully transparent alpha/PNG background only."
    : "Soft studio background; keep the product as the hero.";

  const userMessage =
    `Write a single detailed image-generation prompt for a commercial product photo.\n` +
    `Return ONLY the prompt text — no quotes, no markdown, no explanation.\n\n` +
    `Product name: ${params.productName || "Product"}\n\n` +
    `Description: ${params.description || "N/A"}\n\n` +
    `Color theme: ${params.colorTheme}\n\n` +
    `Style: ${params.style}\n\n` +
    `Background: ${bgLine}\n\n` +
    `Constraints: ultra-realistic, professional lighting, front-facing, high resolution, no people, no text, no logos, no watermark.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You write concise, high-quality prompts for AI product photography." },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    const data = await res.json().catch(() => null);
    const content = data?.choices?.[0]?.message?.content?.trim();
    if (content) {
      return content.replace(/^["']|["']$/g, "").trim();
    }
  } catch (err) {
    console.warn("[ai-product-image] OpenAI chat prompt generation failed, using direct template:", err);
  }

  return `${params.style} commercial product photograph of ${params.productName}: ${params.description}. Color theme: ${params.colorTheme}. ${bgLine} Ultra-realistic, professional lighting, front-facing, high resolution, no people, no text, no logos, no watermark.`;
}

/**
 * Step 2: Generate image with OpenAI (model: gpt-image-2.5-flare with dall-e-3 fallback)
 */
async function generateImageFromPrompt(
  openAiKey: string,
  prompt: string,
  options: { model?: string; transparentBg?: boolean }
): Promise<{ buffer: Buffer; modelUsed: string }> {
  const primaryModel = options.model || process.env.OPENAI_IMAGE_MODEL || "gpt-image-2.5-flare";

  const buildPayload = (m: string) => {
    const payload: any = {
      model: m,
      prompt,
      n: 1,
      size: "1024x1024",
    };
    if (options.transparentBg && !m.startsWith("dall-e")) {
      payload.background = "transparent";
      payload.output_format = "png";
    }
    if (m.startsWith("dall-e-2")) {
      payload.response_format = "b64_json";
    }
    return payload;
  };

  let modelUsed = primaryModel;
  let res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAiKey}`,
    },
    body: JSON.stringify(buildPayload(primaryModel)),
  });

  let json = await res.json().catch(() => null);

  // If primary model (e.g. gpt-image-2.5-flare) is not available on standard public API tier, fallback to dall-e-3
  if (!res.ok && primaryModel === "gpt-image-2.5-flare") {
    console.warn(`[ai-product-image] ${primaryModel} failed (${res.status} ${json?.error?.message || ""}), retrying with dall-e-3...`);
    modelUsed = "dall-e-3";
    res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify(buildPayload("dall-e-3")),
    });
    json = await res.json().catch(() => null);
  }

  if (!res.ok || !json?.data?.[0]) {
    const msg = json?.error?.message || `Image API failed with HTTP ${res.status}`;
    throw new Error(msg);
  }

  const item = json.data[0];
  let rawBuffer: Buffer;
  if (item.b64_json) {
    rawBuffer = Buffer.from(item.b64_json, "base64");
  } else if (item.url) {
    const imgFetch = await fetch(item.url);
    if (!imgFetch.ok) throw new Error(`Failed to download image from ${item.url}`);
    rawBuffer = Buffer.from(await imgFetch.arrayBuffer());
  } else {
    throw new Error("No image data returned from image generation API");
  }

  // Guarantee product cutout on fully transparent alpha/PNG background
  let finalBuffer = rawBuffer;
  if (options.transparentBg) {
    try {
      finalBuffer = await removeProductBackground(rawBuffer);
    } catch (e) {
      console.warn("[ai-product-image] Auto background removal skipped:", e);
    }
  }

  return { buffer: finalBuffer, modelUsed };
}

// --- POST /api/external/ai-product-image ----------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      template_id,
      product_name,
      description,
      jobId,
      userId,
      color_theme,
      style,
      transparent_bg,
      model,
      async: isAsyncMode,
    } = body;

    // 1. Only check existing job status if jobId is provided WITHOUT new product creation parameters
    const isExplicitStatusCheck = jobId && !product_name && !description;
    if (isExplicitStatusCheck) {
      return await checkJobStatus(jobId);
    }

    // 2. Validate required creation parameters
    if (!template_id || !product_name || !description) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: template_id, product_name, description (or jobId to check status)" },
        { status: 400 }
      );
    }

    const rawOpenAiKey = process.env.OPENAI_API_KEY || "";
    const openAiKey = rawOpenAiKey.replace(/[<>'"\r\n\s]/g, "").trim();
    if (!openAiKey) {
      return NextResponse.json(
        { success: false, message: "Server configuration error: OPENAI_API_KEY not set in .env.local" },
        { status: 500 }
      );
    }

    await connectToDatabase();
    const cloudJobId = uuidv4();
    const CloudbasesJobModel = (await import("@/models/CloudbasesJob")).default;

    // Resolve color theme & style from template or parameters
    let resolvedColorTheme = color_theme || "";
    const resolvedStyle = style || "Premium commercial";
    const transparentBg = transparent_bg !== undefined ? Boolean(transparent_bg) : true;

    if (!resolvedColorTheme && template_id) {
      try {
        const VideoTemplateModel = (await import("@/models/VideoTemplate")).default;
        const tpl = await VideoTemplateModel.findOne({
          $or: [{ templateId: Number(template_id) }, { _id: template_id }],
        }).lean();
        if (tpl?.backgroundColor) {
          resolvedColorTheme = `template background tone ${tpl.backgroundColor}`;
        }
      } catch {}
    }
    if (!resolvedColorTheme || resolvedColorTheme.toLowerCase() === "none") {
      resolvedColorTheme = "natural product colors (no forced color theme)";
    }

    // Save initial job record in MongoDB
    await CloudbasesJobModel.create({
      jobId: cloudJobId,
      userId: userId ? String(userId) : "",
      templateId: String(template_id),
      status: "processing",
      description: String(description),
      headline: String(product_name),
      resultData: { status: "generating_prompt" },
    });

    // Core worker function: Direct OpenAI generation on OUR server
    const executeGeneration = async () => {
      // Step 1: Write specialized commercial product photo prompt
      const detailedPrompt = await buildProductImagePrompt(openAiKey, {
        productName: String(product_name),
        description: String(description),
        colorTheme: resolvedColorTheme,
        style: resolvedStyle,
        transparentBg,
      });

      console.log(`[ai-product-image] Generated prompt for job ${cloudJobId}: "${detailedPrompt}"`);

      await connectToDatabase();
      await CloudbasesJobModel.findOneAndUpdate(
        { jobId: cloudJobId },
        {
          $set: {
            "resultData.prompt": detailedPrompt,
            "resultData.status": "generating_image",
          },
        }
      );

      // Step 2: Generate image with OpenAI (model: gpt-image-2.5-flare / fallback)
      const { buffer: fileBuffer, modelUsed } = await generateImageFromPrompt(
        openAiKey,
        detailedPrompt,
        { model, transparentBg }
      );

      // Step 3: Save clean PNG cutout in uploads/products/ (on our local server)
      const uploadDir = path.join(process.cwd(), "uploads", "products");
      if (!fs.existsSync(uploadDir)) {
        await fs.promises.mkdir(uploadDir, { recursive: true });
      }

      const fileName = `ai_openai_${Date.now()}_${cloudJobId.slice(0, 8)}.png`;
      const filePath = path.join(uploadDir, fileName);
      await fs.promises.writeFile(filePath, fileBuffer);

      const relativeUrl = `/uploads/products/${fileName}`;
      const fullUrl = toAbsoluteUrl(relativeUrl, req);

      const resultData = {
        template_id: String(template_id),
        url: fullUrl,
        relative_url: relativeUrl,
        path: relativeUrl,
        prompt: detailedPrompt,
        model: modelUsed,
      };

      await CloudbasesJobModel.findOneAndUpdate(
        { jobId: cloudJobId },
        { status: "completed", resultData, completedAt: new Date() }
      );

      return resultData;
    };

    // If caller explicitly requested async mode, run in background
    if (isAsyncMode) {
      executeGeneration().catch((err) => {
        console.error("[ai-product-image] Background execution error:", err);
        CloudbasesJobModel.findOneAndUpdate(
          { jobId: cloudJobId },
          { status: "failed", errorMessage: err?.message || "Generation error" }
        ).catch(() => {});
      });

      return NextResponse.json({
        success: true,
        status: "processing",
        jobId: cloudJobId,
        message: `Image generation started. Poll for result at GET /api/external/ai-product-image?jobId=${cloudJobId}`,
      });
    }

    // Default synchronous execution: await and return the completed image directly!
    try {
      const resultData = await executeGeneration();

      return NextResponse.json({
        success: true,
        status: "completed",
        jobId: cloudJobId,
        message: "Product image created",
        data: resultData,
      });
    } catch (err: any) {
      console.error("[ai-product-image] Generation error:", err);
      await CloudbasesJobModel.findOneAndUpdate(
        { jobId: cloudJobId },
        { status: "failed", errorMessage: err?.message || "Failed to generate image" }
      ).catch(() => {});

      return NextResponse.json(
        { success: false, status: "failed", jobId: cloudJobId, message: err?.message || "Failed to generate AI product image" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[POST /api/external/ai-product-image] Error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to generate AI product image" },
      { status: 500 }
    );
  }
}

// --- GET /api/external/ai-product-image ----------------------------------------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId") || searchParams.get("id");

    if (!jobId) {
      return NextResponse.json(
        { success: false, message: "Missing required parameter 'jobId'" },
        { status: 400 }
      );
    }

    return await checkJobStatus(jobId);
  } catch (error) {
    console.error("[GET /api/external/ai-product-image] Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to check job status" },
      { status: 500 }
    );
  }
}

// --- Helper: Check Job Status ----------------------------------------
async function checkJobStatus(jobId: string) {
  await connectToDatabase();
  const CloudbasesJobModel = (await import("@/models/CloudbasesJob")).default;
  const cloudJob = await CloudbasesJobModel.findOne({ jobId });

  if (!cloudJob) {
    return NextResponse.json(
      { success: false, message: `No generation job found with jobId '${jobId}'` },
      { status: 404 }
    );
  }

  if (cloudJob.status === "processing") {
    return NextResponse.json({
      success: true,
      status: "processing",
      jobId,
      prompt: cloudJob.resultData?.prompt || undefined,
      message: cloudJob.resultData?.prompt
        ? "Creating image with AI (gpt-image-2.5-flare)..."
        : "Image generation is in progress. Please check again in a few seconds.",
    });
  }

  if (cloudJob.status === "failed") {
    return NextResponse.json({
      success: false,
      status: "failed",
      jobId,
      message: cloudJob.errorMessage || "Image generation failed.",
    });
  }

  return NextResponse.json({
    success: true,
    status: "completed",
    jobId,
    ...cloudJob.resultData,
  });
}
