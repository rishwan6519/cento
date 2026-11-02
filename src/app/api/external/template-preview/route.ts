import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import VideoTemplate from "@/models/VideoTemplate";
import { generateTemplatePreviewGif } from "@/lib/templatePreviewGif";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

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

      if (conditions.length > 0) {
        template = await VideoTemplate.findOne({ $or: conditions }).lean();
      }
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

    const tplId = Number(template.templateId || template.id) || 1;
    const safeRatio = ratio === "9:16" ? "9x16" : "16x9";
    const previewsDir = path.join(process.cwd(), "uploads", "previews");
    const diskPath = path.join(previewsDir, `preview_${tplId}_${safeRatio}.gif`);

    let gifBuffer: Buffer;
    if (fs.existsSync(diskPath)) {
      gifBuffer = fs.readFileSync(diskPath);
    } else {
      gifBuffer = await generateTemplatePreviewGif(template, ratio);
      try {
        if (!fs.existsSync(previewsDir)) fs.mkdirSync(previewsDir, { recursive: true });
        fs.writeFileSync(diskPath, gifBuffer);
      } catch (err) {
        console.warn("[template-preview] Could not cache to disk:", err);
      }
    }

    return new NextResponse(new Uint8Array(gifBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Content-Length": String(gifBuffer.length),
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
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
