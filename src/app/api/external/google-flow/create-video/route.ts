import { NextRequest, NextResponse } from "next/server";
import { startGoogleFlowVideoJob } from "@/lib/googleFlowCreate";
import { generateUniqueOfferId } from "@/lib/generateOfferId";
import { generateTagline } from "@/lib/generateTagline";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

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
      for (const [rawKey, value] of formData.entries()) {
        const key = rawKey.trim();
        if (typeof value === "string") {
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
    }

    const {
      text: rawText,
      userId: rawUserId,
      aspectRatio: rawAspectRatio,
      duration: rawDuration,
      // NOTE: Manual offerId / offer_id entry removed. We always automatically generate unique offerId below.
      tagline: rawTagline,
      imageTypes: rawImageTypes,
      imageType: rawImageType,
      imageBase64: rawImageBase64,
      imageMimeType: rawMimeType,
      referenceImage,
    } = body;

    const userId = typeof rawUserId === "string" ? rawUserId.trim() : "";
    const text = typeof rawText === "string" ? rawText.trim() : "";
    const aspectRatio = ["16:9", "9:16", "1:1"].includes(rawAspectRatio) ? rawAspectRatio : "16:9";
    const duration = Math.max(4, Math.min(8, Number(String(rawDuration || "4").replace("s", "")) || 4));
    // Always generate a unique 6-digit random number for offerId (manual entry removed)
    const offerId = await generateUniqueOfferId();

    const rawImgTypes = rawImageTypes || rawImageType || body.image_types || body.image_type || [];
    let imageTypesList: string[] = [];
    if (Array.isArray(rawImgTypes)) {
      imageTypesList = rawImgTypes.map((item: any) => String(item).trim()).filter(Boolean);
    } else if (typeof rawImgTypes === "string") {
      try {
        if (rawImgTypes.startsWith("[") && rawImgTypes.endsWith("]")) {
          imageTypesList = JSON.parse(rawImgTypes).map((item: any) => String(item).trim()).filter(Boolean);
        } else {
          imageTypesList = rawImgTypes.split(",").map((s: string) => s.trim()).filter(Boolean);
        }
      } catch {
        imageTypesList = rawImgTypes.split(",").map((s: string) => s.trim()).filter(Boolean);
      }
    }

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

    // --- Generate or use provided tagline ---
    let finalTagline = typeof rawTagline === "string" ? rawTagline.trim() : "";
    if (!finalTagline && openAiKey) {
      try {
        finalTagline = await generateTagline({
          userText: text,
          openAiKey,
        });
      } catch (taglineErr) {
        console.warn("[google-flow/create-video] Tagline generation failed, continuing without:", taglineErr);
      }
    }

    // Combine tagline into the prompt text so it becomes part of the video content
    let finalText = text;
    if (finalTagline) {
      finalText = text.trim() + `\n\n[MANDATORY ON-SCREEN PROMOTIONAL TEXT OVERLAY: Render a high-end commercial typographic graphic banner prominently at the VERY TOP of the video frame reading exactly: "${finalTagline}". Ensure this promotional offer text is sharp, bold, elegant, and cleanly overlaid at the top above the video scene alongside the brand logo.]`;
    }

    if (imageTypesList.length > 0) {
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

    return await startGoogleFlowVideoJob({
      userId,
      text: finalText,
      aspectRatio,
      duration,
      offerId,
      tagline: finalTagline,
      imageTypes: imageTypesList,
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
