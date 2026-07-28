import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { connectToDatabase } from "@/lib/db";
import MediaItemModel from "@/models/MediaItems";
import VideoTemplate from "@/models/VideoTemplate";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";

export const maxDuration = 300; // Allow up to 5 minutes (300s) for AI video generation
export const dynamic = "force-dynamic";

// Resolution → width x height mapping
const RESOLUTION_MAP: Record<string, { width: number; height: number }> = {
  "480p": { width: 854, height: 480 },
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
  "4K": { width: 3840, height: 2160 },
};

// fal.ai model slug mapping
const MODEL_SLUG_MAP: Record<string, string> = {
  // Wan
  "Wan Pro": "fal-ai/wan-pro/text-to-video",
  "Wan 2.7": "fal-ai/wan-pro/text-to-video",
  "Wan 2.1": "fal-ai/wan-t2v",
  "Wan 2.2": "fal-ai/wan-t2v",
  "Wan 2.1 (1.3B)": "fal-ai/wan-t2v",
  "Wan 2.2 (1.3B)": "fal-ai/wan-t2v",
  // Kling
  "Kling 1.6 Std": "fal-ai/kling-video/v1.6/standard/text-to-video",
  "Kling 1.6 Pro": "fal-ai/kling-video/v1.6/pro/text-to-video",
  "Kling 2.0 Std": "fal-ai/kling-video/o3/standard/text-to-video",
  "Kling 2.0 Pro": "fal-ai/kling-video/o3/pro/text-to-video",
  // Veo
  "Veo 3": "fal-ai/veo3.1",
  // Seedance
  "Seedance 2 Pro": "bytedance/seedance-2.0/text-to-video",
  // HunyuanVideo
  "HunyuanVideo": "fal-ai/hunyuan-video",
  // Hailuo / MiniMax
  "Hailuo AI": "fal-ai/minimax/video-01-live",
};

async function downloadVideoToBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, resolution, aspectRatio, model, numVideos, duration, userId, templateId } =
      await req.json();

    let finalPrompt = prompt || "";
    let finalAspectRatio = aspectRatio || "16:9";
    let finalDuration = Number(duration) || 5;

    // Retrieve template from database automatically if templateId is provided
    if (templateId) {
      await connectToDatabase();
      const template = await VideoTemplate.findById(templateId).lean();
      if (template) {
        if (!aspectRatio && template.aspectRatio) finalAspectRatio = template.aspectRatio;
        if (!duration && template.videoDuration) finalDuration = Number(template.videoDuration);

        // Build a cinematic commercial advertisement video prompt directly from template configuration
        if (!finalPrompt.trim()) {
          finalPrompt = `Cinematic television commercial ad for campaign '${template.templateName}'. Theme & story: ${template.templateDescription || template.offerTitle}. High-contrast display featuring bold promotional headline '${template.offerTitle}', secondary detail '${template.offerDescription}', badge label '${template.offerLabel}' displaying '${template.discountLabel}' starting from '${template.priceLabel}'. Dynamic ${template.animationStyle} camera animation, harmonious studio styling combining vibrant ${template.backgroundColor} ambiance with ${template.primaryTextColor} and ${template.secondaryTextColor} accents. Hero product focal point positioned at ${template.productImagePosition} of screen, store visual element at ${template.storeImagePosition}, logo emblem at ${template.logoPosition}. Concluding frame highlights call-to-action button labeled '${template.ctaButtonText}' rendered in bright ${template.buttonColor}, alongside footer disclosure '${template.footerText}' (${template.website}, ${template.phoneNumber}). Shot on ARRI Alexa anamorphic lens, crystal-clear commercial motion in ${template.language}.`;
        }
      }
    }

    if (!finalPrompt?.trim() || !userId) {
      return NextResponse.json(
        { success: false, message: "Prompt (or valid templateId) and userId are required" },
        { status: 400 }
      );
    }

    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      return NextResponse.json(
        { success: false, message: "FAL_KEY is not configured on the server" },
        { status: 500 }
      );
    }

    const modelSlug = MODEL_SLUG_MAP[model] || "fal-ai/wan-t2v";
    const res = RESOLUTION_MAP[resolution] || { width: 1280, height: 720 };

    // Parse aspect ratio → determine image_size or aspect_ratio field
    const aspectMap: Record<string, string> = {
      "16:9": "landscape_16_9",
      "9:16": "portrait_9_16",
      "1:1": "square",
      "4:3": "landscape_4_3",
    };
    const imageSizeKey = aspectMap[finalAspectRatio] || "landscape_16_9";

    const count = Math.max(1, Math.min(4, Number(numVideos) || 1));
    const uploadDir = join(process.cwd(), "uploads", userId, "video");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    await connectToDatabase();

    // ----- Streaming Heartbeat Workaround for AWS CloudFront 504 Timeouts -----
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send initial heartbeat to immediately return HTTP 200 OK headers to CloudFront
        controller.enqueue(encoder.encode("   \n"));

        const heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode("   \n"));
          } catch {
            clearInterval(heartbeatInterval);
          }
        }, 8000);

        try {
          const videoPromises = Array.from({ length: count }, async (_, idx) => {
            const falResponse = await fetch(`https://queue.fal.run/${modelSlug}`, {
              method: "POST",
              headers: {
                Authorization: `Key ${falKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                prompt: finalPrompt,
                image_size: imageSizeKey,
                num_inference_steps: 30,
                enable_safety_checker: true,
                duration: finalDuration,
              }),
            });

            if (!falResponse.ok) {
              const errText = await falResponse.text();
              throw new Error(`fal.ai error: ${falResponse.status} – ${errText}`);
            }

            let queueData: any = null;
            try {
              queueData = await falResponse.json();
            } catch {
              throw new Error("fal.ai returned an invalid (non-JSON) queue response");
            }

            const requestId: string = queueData?.request_id;
            if (!requestId) {
              throw new Error("fal.ai did not return a request_id — " + JSON.stringify(queueData));
            }

            const statusUrl: string =
              queueData?.status_url ||
              `https://queue.fal.run/${modelSlug}/requests/${requestId}/status`;
            const responseUrl: string =
              queueData?.response_url ||
              `https://queue.fal.run/${modelSlug}/requests/${requestId}`;

            let videoData: any = null;
            const maxAttempts = 120;
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
              await new Promise((r) => setTimeout(r, 3000));
              let statusRes: Response;
              try {
                statusRes = await fetch(statusUrl, {
                  headers: { Authorization: `Key ${falKey}` },
                });
              } catch (fetchErr) {
                continue;
              }

              const contentType = statusRes.headers.get("content-type") || "";
              if (!statusRes.ok || !contentType.includes("application/json")) continue;

              let statusJson: any;
              try {
                statusJson = await statusRes.json();
              } catch {
                continue;
              }

              if (statusJson.status === "COMPLETED") {
                const inlineUrl: string =
                  statusJson?.video?.url ||
                  statusJson?.videos?.[0]?.url ||
                  statusJson?.output?.video?.url ||
                  statusJson?.output?.video_url ||
                  statusJson?.output?.url ||
                  statusJson?.payload?.video?.url ||
                  "";

                if (inlineUrl) {
                  videoData = { video: { url: inlineUrl } };
                } else {
                  const resultRes = await fetch(responseUrl, {
                    headers: { Authorization: `Key ${falKey}` },
                  });
                  const resultRaw = await resultRes.text().catch(() => "");
                  if (!resultRes.ok) throw new Error(`fal.ai result fetch failed: ${resultRaw}`);
                  videoData = JSON.parse(resultRaw);
                }
                break;
              } else if (statusJson.status === "FAILED") {
                throw new Error("fal.ai generation failed: " + JSON.stringify(statusJson));
              }
            }

            if (!videoData) {
              throw new Error("Generation timed out after waiting for fal.ai");
            }

            const videoUrl: string =
              videoData?.video?.url ||
              videoData?.videos?.[0]?.url ||
              videoData?.output?.video?.url ||
              videoData?.output?.video_url ||
              videoData?.output?.url ||
              "";

            if (!videoUrl) {
              throw new Error("No video URL in fal.ai response");
            }

            const videoBuffer = await downloadVideoToBuffer(videoUrl);
            const fileName = `${uuidv4()}-ai-generated.mp4`;
            const filePath = join(uploadDir, fileName);

            await writeFile(filePath, videoBuffer);
            const localUrl = `/uploads/${userId}/video/${fileName}`;

            const mediaItem = new MediaItemModel({
              userId: new mongoose.Types.ObjectId(userId),
              name: `AI Generated (${idx + 1}/${count}) – ${model} – ${new Date().toLocaleString()}`,
              type: "video",
              url: localUrl,
              createdAt: new Date(),
            });
            await mediaItem.save();

            return {
              videoUrl: localUrl,
              mediaId: (mediaItem._id as mongoose.Types.ObjectId).toString(),
            };
          });

          const generatedVideos = await Promise.all(videoPromises);
          clearInterval(heartbeatInterval);

          controller.enqueue(encoder.encode(JSON.stringify({ success: true, videos: generatedVideos }) + "\n"));
          controller.close();
        } catch (error: any) {
          clearInterval(heartbeatInterval);
          console.error("Video generation stream error:", error);
          controller.enqueue(encoder.encode(JSON.stringify({
            success: false,
            message: error instanceof Error ? error.message : "Unknown error",
          }) + "\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-transform",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Video generation error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
