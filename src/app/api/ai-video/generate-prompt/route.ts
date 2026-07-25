import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { roughPrompt, resolution, aspectRatio, model } = await req.json();

    if (!roughPrompt?.trim()) {
      return NextResponse.json(
        { success: false, message: "Prompt is required" },
        { status: 400 }
      );
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey) {
      return NextResponse.json(
        { success: false, message: "OPENAI_API_KEY is not configured on the server" },
        { status: 500 }
      );
    }

    const systemContent = `You are a world-class Director of Photography (DoP) and AI video prompt engineering specialist for top-tier advertising agencies (Nike, Apple, Lexus, Sephora). Your sole job is to translate the user's rough concept into a masterclass 5 to 10-second cinematic video prompt optimized for high-end generative diffusers like Wan 2.1, Veo 3.1, Seedance 2.0, and Kling O3.

### THE COMMERCIAL AI PROMPT SECRET FOR 5-10s ADVERTISEMENTS:
AI video diffusers DO NOT understand abstract business jargon like "an inspiring ad for our product" or "a professional marketing promo". To produce stunning TV-commercial visuals, you must explicitly describe the physical reality: **Scene & Set Architecture**, **Dynamic Motion & Physics**, **Kinetic Camera Choreography**, **Material Textures**, and **Cinematographically Graded Lighting**.

### STRUCTURE OF THE ENHANCED PROMPT:
Write a fluid, ultra-vivid descriptive paragraph (120 to 180 words) following this chronological commercial beat structure:
1. **The Opening Hook (0–3s):** Establish the hero subject immediately with dramatic impact (e.g., macro extreme close-up of condensation on crystal glass, dramatic studio rim-lighting igniting out of shadow, dynamic particle motion in slow motion).
2. **Kinetic Action & Flow (3–7s):** Introduce hypnotic movement and camera choreography. Specify fluid camera mechanics (e.g., smooth robotic techno-dolly arc, sweeping orbital panning, dynamic low-angle push-in, parallax camera movement). Detail realistic environmental physics (e.g., fabric floating gracefully, splashing amber fluids, dust motes dancing in sunbeams, wind billowing through apparel).
3. **The Hero Product Climax (7–10s):** Settle on the definitive product hero shot with razor-sharp focus. Highlight specular reflections, metallic or organic surface textures, high dynamic range (HDR) luster, and a shallow depth of field (bokeh background).
4. **Cinematic Specifications:** Seamlessly weave in high-end optical specs (e.g., shot on ARRI Alexa Mini, 35mm Master Prime anamorphic lens at f/1.4, cinematic natural color grading, pristine crystal-clear motion, volumetric ray lighting, high-contrast silhouette lighting).

### STRICT NEGATIVE RULES:
- NEVER start with filler phrases like "A video of...", "An advertisement for...", "A commercial showing...", or "This ad features...". Start immediately with the dramatic physical scene!
- Avoid buzzwords without visual descriptions (don't just say "luxurious"; describe "gleaming brushed anodized titanium illuminated by warm diffuse studio strip lights").
- Keep total duration pacing realistically scaled for a seamless 5 to 10-second spot.

### TARGET SPECS:
- Target AI Diffuser Engine: ${model}
- Resolution & Aspect Ratio: ${resolution} | ${aspectRatio} (${aspectRatio === "9:16" ? "Vertical TikTok/Reels/Shorts format — emphasize vertical movement and center-screen hero framing" : aspectRatio === "16:9" ? "Widescreen Cinema/TV TVC format — emphasize expansive composition and cinematic wide panning" : "Square Instagram/Ad format — emphasize bold symmetrical framing and bold focal contrasts"})

Output ONLY the raw optimized prompt text ready to feed directly into the AI model. No explanations, no markdown formatting, no titles or labels.`;

    const maxRetries = 3;
    let refinedPrompt = "";

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemContent },
              { role: "user", content: `User's rough idea: "${roughPrompt}"\n\nGenerate the optimized video prompt:` },
            ],
            max_tokens: 400,
            temperature: 0.85,
          }),
        });

        if (!response.ok) {
          const errBody = await response.text();
          console.warn(`[OpenAI prompt attempt ${attempt}/${maxRetries}] Failed (${response.status}): ${errBody}`);
          if ((response.status >= 500 || response.status === 429) && attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, attempt * 2000));
            continue;
          }
          throw new Error(`OpenAI API error ${response.status}`);
        }

        const data = await response.json();
        refinedPrompt = data.choices?.[0]?.message?.content?.trim() || "";
        if (refinedPrompt) break;
      } catch (err) {
        if (attempt === maxRetries) {
          console.warn("[OpenAI prompt] All retries failed. Applying cinematic DoP fallback template.");
        } else {
          await new Promise((r) => setTimeout(r, attempt * 2000));
        }
      }
    }

    // Fallback if OpenAI server is down or returning 500/503 rate limits
    if (!refinedPrompt) {
      refinedPrompt = `Macro extreme close-up commercial product feature: ${roughPrompt}. Dynamic slow-motion environmental interaction, robotic techno-dolly camera orbital pan, bright volumetric rays, gleaming specular surface highlights against shallow depth of field studio bokeh. Shot on an ARRI Alexa Mini with a 35mm Master Prime anamorphic lens, pristine crystal-clear motion, television commercial production quality.`;
    }

    return NextResponse.json({ success: true, refinedPrompt });
  } catch (error) {
    console.error("Prompt generation error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

