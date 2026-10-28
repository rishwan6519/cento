import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const EXTERNAL_API_URL = "https://cloudbases.in/storesparc_video/index.php/api/external/product-image";

// --- POST /api/external/ai-product-image ----------------------------------------
// Proxies to cloudbases.in product-image AI API (ASYNC PATTERN)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { template_id, product_name, description, jobId, userId } = body;

    // 1. If checking job status via POST
    if (jobId) {
      return await checkJobStatus(jobId);
    }

    // 2. Otherwise start a new background job
    if (!template_id || !product_name || !description) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: template_id, product_name, description (or jobId to check status)" },
        { status: 400 }
      );
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey) {
      return NextResponse.json(
        { success: false, message: "Server configuration error: OPENAI_API_KEY not set in .env.local" },
        { status: 500 }
      );
    }

    await connectToDatabase();
    const cloudJobId = uuidv4();
    const CloudbasesJobModel = (await import('@/models/CloudbasesJob')).default;

    // Save initial job state
    await CloudbasesJobModel.create({
      jobId: cloudJobId,
      userId: userId ? String(userId) : "",
      templateId: String(template_id),
      status: 'processing',
      description: String(description),
      headline: String(product_name), // store product_name in headline for tracking
    });

    // Background async task: Direct OpenAI Image Generation
    (async () => {
      
     
      try {
        const apiKey = process.env.CLOUDBASES_API_KEY;
        const externalResponse = await fetch(EXTERNAL_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "CentoPlatform/1.0",
            "Accept": "application/json",
            "X-API-Key": apiKey || "",
          },
          body: JSON.stringify({
            template_id: String(template_id),
            product_name: String(product_name),
            description: String(description),
            ...(userId && { userId: String(userId) })
          }),
        });

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
        console.error('[cloudbases image background job error]:', err);
        try {
          await connectToDatabase();
          await CloudbasesJobModel.findOneAndUpdate(
            { jobId: cloudJobId },
            { status: 'failed', errorMessage: err?.message || 'Unknown error' }
          );
        } catch (_) { }
      }
      // =========================================================================
      

      // =========================================================================
      // --- NEW: DIRECT OPENAI IMAGE GENERATION ---
      // =========================================================================
      // try {
      //   const prompt = `A professional commercial retail product photograph of ${product_name}: ${description}. High resolution, clean sharp focus, vivid colors, premium studio lighting, on an isolated clean studio presentation background.`;

      //   const openAiResponse = await fetch("https://api.openai.com/v1/images/generations", {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //       "Authorization": `Bearer ${openAiKey}`,
      //     },
      //     body: JSON.stringify({
      //       model: "chatgpt-image-latest",
      //       prompt,
      //       n: 1,
      //       size: "1024x1024",
      //     }),
      //   });

      //   const aiData = await openAiResponse.json().catch(() => null);

      //   if (!openAiResponse.ok || !aiData?.data?.[0]) {
      //     const errMsg = aiData?.error?.message || `OpenAI failed with status ${openAiResponse.status}`;
      //     console.error("[ai-product-image] OpenAI error:", errMsg);
      //     await connectToDatabase();
      //     await CloudbasesJobModel.findOneAndUpdate(
      //       { jobId: cloudJobId },
      //       { status: 'failed', errorMessage: errMsg }
      //     );
      //     return;
      //   }

      //   const item = aiData.data[0];
      //   let fileBuffer: Buffer;
      //   if (item.b64_json) {
      //     fileBuffer = Buffer.from(item.b64_json, "base64");
      //   } else if (item.url) {
      //     const imgFetch = await fetch(item.url);
      //     fileBuffer = Buffer.from(await imgFetch.arrayBuffer());
      //   } else {
      //     throw new Error("No image data returned by OpenAI");
      //   }

      //   const uploadDir = path.join(process.cwd(), "uploads", "products");
      //   if (!fs.existsSync(uploadDir)) {
      //     await fs.promises.mkdir(uploadDir, { recursive: true });
      //   }

      //   const fileName = `ai_openai_${Date.now()}_${cloudJobId.slice(0, 8)}.png`;
      //   const filePath = path.join(uploadDir, fileName);
      //   await fs.promises.writeFile(filePath, fileBuffer);

      //   const relativeUrl = `/uploads/products/${fileName}`;

      //   const resultData = {
      //     success: true,
      //     message: "Product image created",
      //     data: {
      //       template_id: String(template_id),
      //       url: relativeUrl,
      //       path: relativeUrl,
      //       prompt,
      //     },
      //   };

      //   await connectToDatabase();
      //   await CloudbasesJobModel.findOneAndUpdate(
      //     { jobId: cloudJobId },
      //     { status: 'completed', resultData, completedAt: new Date() }
      //   );
      // } catch (err: any) {
      //   console.error('[OpenAI image background job error]:', err);
      //   try {
      //     await connectToDatabase();
      //     await CloudbasesJobModel.findOneAndUpdate(
      //       { jobId: cloudJobId },
      //       { status: 'failed', errorMessage: err?.message || 'Unknown image generation error' }
      //     );
      //   } catch (_) { }
      // }
    })();

    // Return jobId immediately
    return NextResponse.json({
      success: true,
      status: 'processing',
      jobId: cloudJobId,
      message: `Image generation started. Poll for result at GET /api/external/ai-product-image?jobId=${cloudJobId}`,
    });
  } catch (error) {
    console.error("[POST /api/external/ai-product-image] Error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to generate AI product image" },
      { status: 500 }
    );
  }
}

// --- GET /api/external/ai-product-image ----------------------------------------
// Allow checking job status via GET param
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
  const CloudbasesJobModel = (await import('@/models/CloudbasesJob')).default;
  const cloudJob = await CloudbasesJobModel.findOne({ jobId });

  if (!cloudJob) {
    return NextResponse.json(
      { success: false, message: `No generation job found with jobId '${jobId}'` },
      { status: 404 }
    );
  }

  if (cloudJob.status === 'processing') {
    return NextResponse.json({
      success: true,
      status: 'processing',
      jobId,
      message: 'Image generation is in progress. Please check again in a few seconds.',
    });
  }

  if (cloudJob.status === 'failed') {
    return NextResponse.json({
      success: false,
      status: 'failed',
      jobId,
      message: cloudJob.errorMessage || 'Image generation failed.',
    });
  }

  return NextResponse.json({
    success: true,
    status: 'completed',
    jobId,
    ...cloudJob.resultData,
  });
}