// File: /src/app/api/tts/gemini-direct/route.ts

import { NextRequest, NextResponse } from 'next/server';

// ===================================================================
// THE FINAL FIX IS HERE: Use the correct model name from your documentation.
// ===================================================================

// Define the correct model name as a constant to ensure accuracy.
const MODEL_NAME = "gemini-2.5-flash-preview-tts";

// Construct the API endpoint URL using the correct model name.
const GEMINI_TTS_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;

// ===================================================================

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key is not configured on the server.' }, { status: 500 });
  }

  try {
    const { text, voice } = await request.json();

    if (!text || !voice) {
      return NextResponse.json(
        { error: 'Missing required parameters: text and voice.' },
        { status: 400 }
      );
    }

    // Construct the request body precisely as required by the API.
    const requestBody = {
      model: MODEL_NAME, // Use the correct model name here.
      contents: [{
        parts: [{ "text": text }]
      }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice
            }
          }
        }
      },
    };
    console.log("Request body:", JSON.stringify(requestBody, null, 2));

    // Make the direct HTTP request to the Gemini API.
    const apiResponse = await fetch(`${GEMINI_TTS_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Handle any errors returned from the API.
    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      console.error('Gemini API Error:', errorData);
      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to generate audio from the API' },
        { status: apiResponse.status }
      );
    }

    // Extract the base64 encoded audio data from the successful response.
    const responseJson = await apiResponse.json();
    const audioData = responseJson.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) {
      throw new Error("No audio data was found in the API response.");
    }

    // Decode the base64 string into a Buffer and send it back as an audio file.
    const audioBuffer = Buffer.from(audioData, 'base64');

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
      },
    });

  } catch (error) {
    console.error('An internal server error occurred:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}