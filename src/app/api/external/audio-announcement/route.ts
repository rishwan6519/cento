import ApiKey from '@/models/ApiKey';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db'; 
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const OPENAI_TTS_ENDPOINT = "https://api.openai.com/v1/audio/speech";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const { text, gender, tone, userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    if (!text) {
      return NextResponse.json({ error: "Missing required parameter: text" }, { status: 400 });
    }

    // Use the common API key from environment variables
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured in environment." }, { status: 500 });
    }

    // Determine the voice based on gender and optionally tone
    let voice = "onyx"; // Default male voice

    if (gender?.toLowerCase() === "female") {
      voice = "nova"; // Default female voice
      if (tone?.toLowerCase() === "soft" || tone?.toLowerCase() === "calm") {
        voice = "shimmer";
      }
    } else if (gender?.toLowerCase() === "male") {
      voice = "onyx"; // Default male voice
      if (tone?.toLowerCase() === "calm" || tone?.toLowerCase() === "soft") {
        voice = "echo";
      } else if (tone?.toLowerCase() === "energetic") {
        voice = "alloy";
      }
    } else if (gender) {
        // If gender is provided but neither male nor female exactly, fallback sensibly
        voice = "fable";
    }

    const requestBody = {
      model: "tts-1",
      input: text,
      voice: voice,
    };

    const apiResponse = await fetch(OPENAI_TTS_ENDPOINT, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({}));
      console.log(errorData, "error from openai tts (audio-announcement)");
      return NextResponse.json(
        { error: errorData.error?.message || "Failed to generate audio" },
        { status: apiResponse.status }
      );
    }

    const arrayBuffer = await apiResponse.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // Save the file to root uploads folder (outside public)
    const fileName = `announcement-${crypto.randomUUID()}.mp3`;
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
    } catch (err) {
      // Ignore if directory exists
    }

    const filePath = path.join(uploadsDir, fileName);
    await fs.writeFile(filePath, audioBuffer);

    const fileUrl = `/uploads/${fileName}`;

    return NextResponse.json({
      success: true,
      url: fileUrl,
      message: "Audio generated successfully"
    }, { status: 200 });

  } catch (error) {
    console.error("Internal server error in audio-announcement:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
