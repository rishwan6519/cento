import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { connectToDatabase } from "@/lib/db";
import MediaItemModel from "@/models/MediaItems";
import mongoose from "mongoose";

/**
 * POST /api/chat-to-audio
 *
 * Receives a text message (chat), converts it to audio using OpenAI TTS,
 * saves the audio file to /uploads/{userId}/audio/,
 * creates a MediaItem record so it appears in the user's library,
 * and returns the public URL of the generated audio.
 *
 * Request Body:
 *   - text:   string (required) — The chat message to convert to audio
 *   - userId: string (required) — The user ID for organizing audio files
 *
 * Response:
 *   - success:  boolean
 *   - audioUrl: string — Public URL to access the generated audio
 *   - filename: string — Name of the saved audio file
 *   - mediaItem: object — The saved MediaItem record
 */

// ── Default OpenAI TTS settings (best quality) ───────────────────────────
const DEFAULT_VOICE = "nova";       // Clear, friendly, natural-sounding voice
const DEFAULT_MODEL = "tts-1-hd";   // High-definition model for best quality
const DEFAULT_SPEED = 1.0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, userId } = body;

    // ── Validate required fields ──────────────────────────────────────────
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing or empty 'text' field." },
        { status: 400 }
      );
    }

    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing or empty 'userId' field." },
        { status: 400 }
      );
    }

    // ── Validate OpenAI API key ───────────────────────────────────────────
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "OpenAI API key not configured. Please set OPENAI_API_KEY in .env.local",
        },
        { status: 500 }
      );
    }

    // ── Connect to database ───────────────────────────────────────────────
    await connectToDatabase();

    // ── Call OpenAI TTS API ───────────────────────────────────────────────
    console.log(
      `[chat-to-audio] Generating audio for userId: ${userId}, voice: ${DEFAULT_VOICE}, model: ${DEFAULT_MODEL}`
    );

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/audio/speech",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          input: text,
          voice: DEFAULT_VOICE,
          speed: DEFAULT_SPEED,
          response_format: "mp3",
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error("[chat-to-audio] OpenAI TTS error:", errorData);
      return NextResponse.json(
        {
          success: false,
          error:
            errorData.error?.message ||
            `OpenAI TTS request failed with status ${openaiResponse.status}`,
        },
        { status: openaiResponse.status }
      );
    }

    // ── Read audio data from response ─────────────────────────────────────
    const audioArrayBuffer = await openaiResponse.arrayBuffer();
    const audioBuffer = Buffer.from(audioArrayBuffer);

    if (audioBuffer.length === 0) {
      return NextResponse.json(
        { success: false, error: "OpenAI returned empty audio data." },
        { status: 500 }
      );
    }

    // ── Prepare save directory ────────────────────────────────────────────
    const sanitizedUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "");
    const uploadDir = path.join(
      process.cwd(),
      "uploads",
      sanitizedUserId,
      "audio"
    );

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // ── Generate unique filename and save ─────────────────────────────────
    const timestamp = Date.now();
    // Create a short readable name from the text (first 30 chars)
    const shortName = text
      .trim()
      .substring(0, 30)
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();
    const filename = `ai-audio-${shortName}-${timestamp}.mp3`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, audioBuffer);
    console.log(`[chat-to-audio] Audio saved: ${filePath}`);

    // ── Build public URL ──────────────────────────────────────────────────
    const audioUrl = `/uploads/${sanitizedUserId}/audio/${filename}`;

    // ── Save to MediaItem collection ──────────────────────────────────────
    // This makes the audio file appear in the user's library (available files)
    const displayName = `AI Audio - ${text.trim().substring(0, 50)}${text.length > 50 ? "..." : ""}`;

    const mediaItem = await MediaItemModel.create({
      userId: new mongoose.Types.ObjectId(sanitizedUserId),
      name: displayName,
      type: "audio",
      url: audioUrl,
      createdAt: new Date(),
    });

    console.log(
      `[chat-to-audio] MediaItem record created: ${mediaItem._id}`
    );

    return NextResponse.json(
      {
        success: true,
        audioUrl,
        filename,
        message: "Audio generated and saved successfully.",
        playdemo: `https://iot.centelon.com${audioUrl}`
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[chat-to-audio] Internal server error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// CORS preflight support
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    }
  );
}
