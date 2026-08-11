import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

const EXTERNAL_API_URL = "https://cloudbases.in/storesparc_video/index.php/api/external/product-image";

// --- POST /api/external/ai-product-image ----------------------------------------
// Proxies to cloudbases.in product-image AI API (ASYNC PATTERN)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { template_id, product_name, description, jobId } = body;

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

    const apiKey = process.env.CLOUDBASES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: "Server configuration error: CLOUDBASES_API_KEY not set in .env.local" },
        { status: 500 }
      );
    }

    await connectToDatabase();
    const cloudJobId = uuidv4();
    const CloudbasesJobModel = (await import('@/models/CloudbasesJob')).default;

    // Save initial job state
    await CloudbasesJobModel.create({
      jobId: cloudJobId,
      templateId: String(template_id),
      status: 'processing',
      description: String(description),
      headline: String(product_name), // store product_name in headline for tracking
    });

    // Background async task
    (async () => {
      try {
        const externalResponse = await fetch(EXTERNAL_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
          },
          body: JSON.stringify({
            template_id: String(template_id),
            product_name: String(product_name),
            description: String(description),
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
        } catch (_) {}
      }
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