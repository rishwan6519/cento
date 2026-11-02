import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import VideoTemplate from "@/models/VideoTemplate";
import { generateTemplatePreviewGif } from "@/lib/templatePreviewGif";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get("templateId") || searchParams.get("id");
    const rawRatio = searchParams.get("ratio") || searchParams.get("aspectRatio") || "16:9";
    const ratio: "16:9" | "9:16" = rawRatio === "9:16" ? "9:16" : "16:9";

    let template: any = null;

    if (templateId && templateId.trim()) {
      await connectToDatabase();
      const cleanId = templateId.trim();

      const conditions: any[] = [];
      const num = Number(cleanId);
      if (!isNaN(num)) {
        conditions.push({ templateId: num });
      }
      if (mongoose.Types.ObjectId.isValid(cleanId)) {
        conditions.push({ _id: new mongoose.Types.ObjectId(cleanId) });
      }
      conditions.push({ _id: cleanId });

      template = await VideoTemplate.findOne({ $or: conditions }).lean();
    }

    if (!template) {
      // Default fallback template representation
      template = {
        templateId: templateId || 1,
        templateName: "Retail Promotion Template",
        offerTitle: "SPECIAL PROMOTION",
        offerDescription: "Limited time store deal",
        discountLabel: "75% OFF",
        ctaButtonText: "ORDER NOW",
        footerText: "Valid While Stocks Last",
        aspectRatio: ratio,
      };
    }

    const gifBuffer = generateTemplatePreviewGif(template, ratio);

    return new NextResponse(new Uint8Array(gifBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Content-Length": String(gifBuffer.length),
        "Cache-Control": "public, max-age=1800, s-maxage=1800",
      },
    });
  } catch (error: any) {
    console.error("[GET /api/external/template-preview] Error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to generate preview GIF" },
      { status: 500 }
    );
  }
}
