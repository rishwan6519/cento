import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/offers/generate-taglines
 * (Also available via /api/generate-tagline)
 *
 * Accepts text containing offer details and utilizes OpenAI (gpt-4o-mini)
 * to generate 5 catchy, high-converting retail marketing taglines.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Accept offer details from multiple common property names for high flexibility
    const offerText = body.text || body.offerText || body.offerDescription || body.prompt;
    const storeName = body.storeName || '';
    const tone = body.tone || 'catchy, persuasive, and dynamic';
    const count = Math.min(Math.max(parseInt(body.count || '5', 10), 1), 10); // Default to 5 taglines, bound between 1 and 10
    const channels = Array.isArray(body.channels) ? body.channels : [];
    const includeFacebook = channels.includes('facebook');
    const includeInstagram = channels.includes('instagram');
    const includeSocial = includeFacebook || includeInstagram;

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

    let systemContent = `You are a world-class creative retail marketing copywriter and advertising specialist.
Your task is to craft high-converting, unforgettable, and punchy marketing taglines based on store offers, promotional text, or discounts provided by the user.

### GUIDELINES FOR TAGLINES:
1. Generate exactly ${count} distinct, engaging marketing taglines tailored for retail signage, digital banners, social media announcements, and store promotions.
2. Keep each tagline succinct (under 12 words), energetic, action-oriented, and easy to read at a glance.
3. Incorporate key offer mechanics (like discounts, freebies, dates, or product benefits) naturally without sounding repetitive.
4. Ensure variety across the ${count} taglines by employing different psychological triggers:
   - Urgency & Scarcity (e.g., "Limited time offer", "Don't miss out", "Offer ends soon")
   - Value & Savings (e.g., "Max savings", "Unbeatable deals")
   - Excitement & Boldness (e.g., "Elevate your style", "Experience the hype")
   - Playful & Catchy (e.g., clever wordplay or memorable rhythm)
5. If a store or brand name is provided, incorporate it organically into 1 or 2 of the taglines.
`;

    if (includeSocial) {
      systemContent += `\n### SOCIAL MEDIA CONTENT:\nThe user has requested social media content for the following channels: ${channels.filter((c: string) => c === 'facebook' || c === 'instagram').join(', ')}.\nPlease also generate a dedicated, engaging caption and a list of 5-8 relevant hashtags for each requested platform, based on the overall offer.\n`;
    }

    systemContent += `\n### OUTPUT FORMAT:\nYou MUST respond with a valid JSON object.\nThe JSON object must contain a property named "taglines", which is an array of ${count} string taglines.\n`;

    if (includeSocial) {
      systemContent += `Additionally, include the following properties if their respective channel was requested:\n`;
      if (includeFacebook) systemContent += `- "facebookCaption": string (An engaging Facebook post caption)\n- "facebookHashTags": array of strings (5-8 relevant hashtags for Facebook)\n`;
      if (includeInstagram) systemContent += `- "instagramCaption": string (A highly engaging Instagram post caption)\n- "instagramHashTags": array of strings (5-8 relevant hashtags for Instagram)\n`;
    }

    systemContent += `\nExample format:\n{\n  "taglines": [\n    "Big savings wait for no one — grab your deal today!",\n    "Unlock exclusive store discounts before time runs out!"\n  ]`;
    if (includeFacebook) systemContent += `,\n  "facebookCaption": "Huge savings are here! 🚀 Get the best deals in store today.",\n  "facebookHashTags": ["#Deals", "#Savings"]`;
    if (includeInstagram) systemContent += `,\n  "instagramCaption": "Don't miss out on these exclusive offers! ✨ Shop now and save big.",\n  "instagramHashTags": ["#Sale", "#ShopNow"]`;
    systemContent += `\n}\nDo not include any extra commentary, markdown formatting outside the JSON object, or numbered lists in the strings.`;

    const userContent = `Here are the store offer details / promotional text:
"${String(offerText).trim()}"
${storeName ? `\nStore / Brand Name: ${storeName}` : ''}
${tone ? `\nDesired Tone & Style: ${tone}` : ''}

Generate exactly ${count} compelling marketing taglines in the required JSON structure.`;

    const maxRetries = 3;
    let generatedTaglines: string[] = [];
    let parsedData: any = {};
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
            max_tokens: includeSocial ? 800 : 400,
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
          if (Array.isArray(parsed.taglines) && parsed.taglines.length > 0) {
            generatedTaglines = parsed.taglines.map((t: unknown) => String(t).trim()).slice(0, count);
            parsedData = parsed;
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
    if (generatedTaglines.length === 0) {
      const baseText = String(offerText).trim();
      const shortSnippet = baseText.length > 35 ? baseText.substring(0, 35) + '...' : baseText;
      generatedTaglines = [
        `Don't miss out: ${shortSnippet} – Claim your offer today!`,
        `Unbeatable savings inside! Grab the best deals on ${storeName || 'our exclusive offers'} now!`,
        `Limited time only: ${shortSnippet}. Hurry in before it ends!`,
        `Experience premier deals and instant discounts right here!`,
        `Your exclusive deal is waiting — tap to shop and save big today!`,
      ].slice(0, count);

      if (includeFacebook) {
        parsedData.facebookCaption = `Check out our latest offer: ${baseText}. Don't miss out!`;
        parsedData.facebookHashTags = ["#Offer", "#Sale", "#Deals"];
      }
      if (includeInstagram) {
        parsedData.instagramCaption = `Exclusive deals just for you! 🌟 ${baseText}. Shop today!`;
        parsedData.instagramHashTags = ["#Exclusive", "#ShopNow", "#Savings"];
      }
    }

    const responsePayload: any = {
      success: true,
      count: generatedTaglines.length,
      taglines: generatedTaglines,
    };

    if (includeFacebook) {
      responsePayload.facebookCaption = parsedData.facebookCaption || "";
      responsePayload.facebookHashTags = Array.isArray(parsedData.facebookHashTags) ? parsedData.facebookHashTags : [];
    }

    if (includeInstagram) {
      responsePayload.instagramCaption = parsedData.instagramCaption || "";
      responsePayload.instagramHashTags = Array.isArray(parsedData.instagramHashTags) ? parsedData.instagramHashTags : [];
    }

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('[POST /api/offers/generate-taglines] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate taglines',
      },
      { status: 500 }
    );
  }
}
