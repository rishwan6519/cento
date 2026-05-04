import ApiKey from '@/models/ApiKey';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';

const MODEL_NAME = "gemini-1.5-flash-latest";
const GEMINI_TTS_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;

export async function POST(req: NextRequest) {
  try {
    console.log("Received TTS request");
    await connectToDatabase();

    const { text, voice, userId } = await req.json();
    console.log("Request parameters:", { text, voice, userId });
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    let apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

    const keyDoc = await ApiKey.findOne({ userId });
    console.log("Fetched API key document:", keyDoc);
    
    if (keyDoc) {
      apiKey = keyDoc.apiKey;
    }

    if (!apiKey) {
      return NextResponse.json({ error: "API key not found. Please configure GEMINI_API_KEY in .env.local" }, { status: 404 });
    }

    if (!text || !voice) {
      return NextResponse.json(
        { error: "Missing required parameters: text and voice." },
        { status: 400 }
      );
    }

    const requestBody = {
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
      const errorData = await apiResponse.json().catch(() => ({}));
      console.warn("Gemini TTS failed, using fallback:", errorData.error?.message);
      
      const fallbackUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`;
      const fallbackRes = await fetch(fallbackUrl);
      
      if (fallbackRes.ok) {
        const audioBuffer = await fallbackRes.arrayBuffer();
        return new NextResponse(Buffer.from(audioBuffer), {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Content-Disposition": "attachment; filename=tts.mp3",
          },
        });
      }

      return NextResponse.json(
        { error: errorData.error?.message || "Failed to generate audio" },
        { status: apiResponse.status }
      );
    }

    const responseJson = await apiResponse.json();
    const audioData = responseJson.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) {
      const fallbackUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`;
      const fallbackRes = await fetch(fallbackUrl);
      if (fallbackRes.ok) {
         const audioBuffer = await fallbackRes.arrayBuffer();
         return new NextResponse(Buffer.from(audioBuffer), {
           status: 200,
           headers: { "Content-Type": "audio/mpeg" },
         });
      }
      throw new Error("No audio data returned from Gemini API.");
    }

    const audioBuffer = Buffer.from(audioData, "base64");

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Disposition": "attachment; filename=tts.wav",
      },
    });

  } catch (error) {
    console.error("Internal server error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Optional: CORS preflight support
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
