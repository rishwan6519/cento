import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const EXTERNAL_API_URL = "https://cloudbases.in/storesparc_video/index.php/api/external/product-image";

// --- POST /api/external/ai-product-image ----------------------------------------
// Proxies to cloudbases.in product-image AI API
// Body: { template_id, product_name, description }
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.CLOUDBASES_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: "Server configuration error: CLOUDBASES_API_KEY not set in .env.local" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { template_id, product_name, description } = body;

    if (!template_id || !product_name || !description) {
      return NextResponse.json(
        { success: false, message: "Missing required fields: template_id, product_name, description" },
        { status: 400 }
      );
    }

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

    const data = await externalResponse.json().catch(() => null);

    if (!externalResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || `External API error (${externalResponse.status})`,
          externalStatus: externalResponse.status,
        },
        { status: externalResponse.status }
      );
    }

    // Pass through the response as-is
    return NextResponse.json(data);
  } catch (error) {
    console.error("[POST /api/external/ai-product-image] Error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to generate AI product image" },
      { status: 500 }
    );
  }
}