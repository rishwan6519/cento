import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/generate-taglines
 *
 * Accepts text containing store offers or promotion details and calls OpenAI (gpt-4o-mini)
 * to generate 5 catchy, high-converting marketing taglines in JSON format.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Accept offer details from common property names for high flexibility
    const offerText = body.text || body.offerText || body.offerDescription || body.prompt;
    const storeName = body.storeName || '';
    const tone = body.tone || ''; // Optional tone; if not provided, relies on system prompt
    const count = Math.min(Math.max(parseInt(body.count || '5', 10), 1), 10); // Default to 5, bound between 1 and 10

    if (!offerText || !String(offerText).trim()) {
      return NextResponse.json(
        { success: false, message: 'Offer text is required (pass "text", "offerText", or "prompt" in body)' },
        { status: 400 }
      );
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey) {
      return NextResponse.json(
        { success: false, message: 'Server configuration error: OPENAI_API_KEY is not configured on the server' },
        { status: 500 }
      );
    }

    let contentGuidelines = `   - tagline: A succinct, energetic, action-oriented phrase (under 12 words) for in-store signage.\n`;
    let outputFormat = `\n      "tagline": "Big savings wait for no one — grab your deal today!"`;

    const systemContent = `You are a world-class creative retail marketing copywriter and brand advertising specialist.
Your task is to craft high-converting, unforgettable, and punchy marketing content based on store offers, promotional text, or discounts provided by the user.

### GUIDELINES FOR CONTENT SETS:
1. Generate exactly ${count} distinct sets of marketing content.
2. For each set, provide ONLY the requested fields:
${contentGuidelines}
3. Ensure variety across the ${count} sets by employing different psychological triggers (Urgency & Scarcity, Value & Savings, Excitement & Boldness, Playful & Catchy).
4. If a store or brand name is provided, incorporate it organically into 1 or 2 of the captions/taglines.

### OUTPUT FORMAT:
You MUST respond with a valid JSON object containing exactly one property named "results", which is an array of ${count} objects.
Example format:
{
  "results": [
    {${outputFormat}
    }
  ]
}
Do not include any extra commentary, markdown formatting outside the JSON object, or numbered lists in the strings.`;

    const userContent = `Here are the store offer details / promotional text:
"${String(offerText).trim()}"
${storeName ? `\nStore / Brand Name: ${storeName}` : ''}
${tone ? `\nDesired Tone & Style: ${tone}` : ''}

Generate exactly ${count} compelling marketing content sets in the required JSON structure.`;

    const maxRetries = 3;
    let generatedSets: any[] = [];
    let lastError = '';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemContent },
              { role: 'user', content: userContent },
            ],
            max_tokens: 400,
            temperature: 0.85,
          }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          console.warn(`[OpenAI tagline attempt ${attempt}/${maxRetries}] Failed (${response.status}): ${errBody}`);
          lastError = `OpenAI API error (${response.status}): ${errBody}`;
          if ((response.status >= 500 || response.status === 429) && attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, attempt * 1500));
            continue;
          }
          throw new Error(`OpenAI API error ${response.status}`);
        }

        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content?.trim();
        if (rawContent) {
          const parsed = JSON.parse(rawContent);
          if (Array.isArray(parsed.results) && parsed.results.length > 0) {
            generatedSets = parsed.results.slice(0, count);
            break;
          }
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        if (attempt === maxRetries) {
          console.warn('[OpenAI tagline] All retries failed. Using smart fallback template.');
        } else {
          await new Promise((r) => setTimeout(r, attempt * 1500));
        }
      }
    }

    // Smart fallback if OpenAI service is unreachable or rate-limited
    if (generatedSets.length === 0) {
      const baseText = String(offerText).trim();
      const shortSnippet = baseText.length > 35 ? baseText.substring(0, 35) + '...' : baseText;
      const dummySets = [
        { 
        { tagline: `Don't miss out: ${shortSnippet} – Claim your offer today!` },
        { tagline: `Unbeatable savings inside! Grab the best deals on ${storeName || 'our exclusive offers'} now!` },
        { tagline: `Limited time only: ${shortSnippet}. Hurry in before it ends!` },
        { tagline: `Experience premier deals and instant discounts right here!` },
        { tagline: `Your exclusive deal is waiting — tap to shop and save big today!` }
      ];
      
      generatedSets = dummySets.slice(0, count);
    }

    return NextResponse.json({
      success: true,
      taglines: generatedSets.map(s => s.tagline),
      count: generatedSets.length,
      meta: {
        storeName: storeName || null,
        tone,
      },
    });
  } catch (error) {
    console.error('[POST /api/generate-taglines] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate taglines',
      },
      { status: 500 }
    );
  }
}
