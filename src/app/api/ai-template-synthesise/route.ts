import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ai-template-synthesise
 *
 * Accepts rough natural-language notes about a desired video template and
 * uses OpenAI GPT-4o-mini to produce a single comprehensive, professional
 * template description ready for AI video generation.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const roughNotes = body.prompt || body.notes || body.text || body.description || '';
    const templateName = body.templateName || '';

    if (!String(roughNotes).trim()) {
      return NextResponse.json(
        { success: false, message: 'Prompt/notes are required in the request body' },
        { status: 400 }
      );
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey) {
      return NextResponse.json(
        { success: false, message: 'Server configuration error: OPENAI_API_KEY is not set' },
        { status: 500 }
      );
    }

    const systemPrompt = `You are an expert digital signage and AI video generation template designer.
Your task is to take rough notes or brief instructions about a desired promotional video template and transform them into a single, comprehensive, professional template description.

The output description should:
1. Clearly define the LAYOUT — where the logo, product image, and store image are positioned (left, right, top, bottom, center)
2. Specify the COLOR SCHEME — background color, primary text color, secondary text color, CTA button color in HEX
3. Define ANIMATION STYLE — e.g., fade & dissolve, kinetic typography, slide-in, bounce, pulse glow, etc.
4. Specify VIDEO SPECS — aspect ratio (9:16, 16:9, 1:1), duration (6, 8, 10, or 15 seconds), language
5. Include OFFER MESSAGING GUIDELINES — how to display discount labels, CTA button text, offer validity, promotional caption
6. Include LOOP BEHAVIOUR — the video must loop seamlessly; first and last frame must be identical
7. Include STRICT RULES — no camera movement, no people/hands, no cinematic scenes, locked static layout

Write the description as clear, continuous professional prose — do NOT use bullet points, numbered lists, or markdown headers. Write it as one or two rich paragraphs that fully describe the template so an AI video generation engine can follow it precisely.

Keep it under 600 words. Make it feel premium, precise, and production-ready.`;

    const userPrompt = `Template Name: "${templateName || 'Custom Template'}"

Rough notes from the user:
"${String(roughNotes).trim()}"

Please synthesise these notes into a single comprehensive, professional template description.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[ai-template-synthesise] OpenAI error:', errBody);
      return NextResponse.json(
        { success: false, message: `OpenAI API error (${response.status})` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const synthesised = data.choices?.[0]?.message?.content?.trim() || '';

    if (!synthesised) {
      return NextResponse.json(
        { success: false, message: 'OpenAI returned an empty response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      description: synthesised,
    });
  } catch (error) {
    console.error('[POST /api/ai-template-synthesise] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to synthesise template description',
      },
      { status: 500 }
    );
  }
}
