import { DUMMY_TEMPLATES } from "@/lib/dummyTemplates";

/**
 * Generates a single marketing tagline using OpenAI (gpt-4o-mini).
 * Receives ONLY text (template data + user text) — NO images are sent to OpenAI.
 * The tagline is meant to be combined into the video creation prompt.
 */
export async function generateTagline({
  userText,
  templateName,
  templateDescription,
  openAiKey,
}: {
  userText: string;
  templateName?: string;
  templateDescription?: string;
  openAiKey: string;
}): Promise<string> {
  const systemContent = `You are a world-class creative marketing copywriter specializing in short, punchy advertising taglines for retail video commercials.

Your task is to generate ONE single, highly engaging marketing tagline based on:
1. The user's product/offer description (their main content)
2. The video template style context (if provided)

### TAGLINE RULES:
- Maximum 8 words — short, bold, and memorable
- Must capture the core offer/product value proposition
- Action-oriented and emotionally compelling
- Suitable for appearing as text in a video advertisement
- Do NOT include hashtags, emojis, or special characters
- Do NOT include pricing numbers unless the user explicitly mentions a specific price

### OUTPUT FORMAT:
You MUST respond with a valid JSON object:
{
  "tagline": "Your generated tagline here"
}
Do not include any extra commentary or markdown outside the JSON.`;

  const userContent = `Product/Offer Description:
"${userText.trim()}"
${templateName ? `\nVideo Template Style: ${templateName}` : ""}
${templateDescription ? `\nTemplate Design Context: ${templateDescription.substring(0, 200)}` : ""}

Generate ONE compelling marketing tagline in the required JSON format.`;

  const maxRetries = 3;
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
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemContent },
            { role: "user", content: userContent },
          ],
          max_tokens: 100,
          temperature: 0.85,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.warn(`[generateTagline attempt ${attempt}/${maxRetries}] Failed (${response.status}): ${errBody}`);
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
        if (parsed.tagline && typeof parsed.tagline === "string") {
          return parsed.tagline.trim();
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (attempt === maxRetries) {
        console.warn("[generateTagline] All retries failed, using smart fallback:", errMsg);
      } else {
        await new Promise((r) => setTimeout(r, attempt * 1500));
      }
    }
  }

  // Smart fallback — extract a short phrase from user text
  const shortSnippet = userText.trim().length > 30 ? userText.trim().substring(0, 30) + "..." : userText.trim();
  return `Discover ${shortSnippet} Today!`;
}

/**
 * Resolves template data (name + description) from templateId.
 * Checks database templates first, then falls back to dummy templates.
 */
export function resolveTemplateForTagline(
  template: any | null,
  templateId: string
): { templateName: string; templateDescription: string } | null {
  if (template) {
    return {
      templateName: template.templateName || "",
      templateDescription: template.templateDescription || template.offerTitle || template.description || "",
    };
  }

  const dummyTemplate = DUMMY_TEMPLATES.find((d) => d._id === templateId);
  if (dummyTemplate) {
    return {
      templateName: dummyTemplate.templateName || "",
      templateDescription: dummyTemplate.description || "",
    };
  }

  return null;
}
