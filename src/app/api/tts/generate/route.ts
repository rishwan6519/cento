import ApiKey from '@/models/ApiKey';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db'; // Make sure DB connection is established

const MODEL_NAME = "gemini-2.5-flash-preview-tts";
const GEMINI_TTS_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase(); // Ensure MongoDB is connected

    const { text, voice, userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Await the DB call!
    const keyDoc = await ApiKey.findOne({ userId, status: "active" });
    if (!keyDoc) {
      return NextResponse.json({ error: "API key not found for this user." }, { status: 404 });
    }

    const apiKey = keyDoc.apiKey; // Extract the string

    if (!text || !voice) {
      return NextResponse.json(
        { error: "Missing required parameters: text and voice." },
        { status: 400 }
      );
    }

    const requestBody = {
      model: MODEL_NAME,
      contents: [
        {
          parts: [{ text }],
        },
      ],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    };

    const apiResponse = await fetch(`${GEMINI_TTS_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      return NextResponse.json(
        { error: errorData.error?.message || "Failed to generate audio" },
        { status: apiResponse.status }
      );
    }

    const responseJson = await apiResponse.json();
    const audioData = responseJson.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) {
      throw new Error("No audio data returned from Gemini API.");
    }

    const audioBuffer = Buffer.from(audioData, "base64");

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: { "Content-Type": "audio/wav" },
    });

  } catch (error) {
    console.error("Internal server error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
