# 🎬 External Video Creation API

A single, simple API that third parties can call to create an AI-generated video and get back:
- ✅ **A video URL**
- ✅ **A TTS audio string** (spoken version of the video prompt)

You just provide plain text + your preferences — everything else (prompt enhancement, video generation, TTS audio) is handled automatically on the server.

---

## Endpoint

```
POST /api/external/create-video
```

**Content-Type:** `application/json`

---

## Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | `string` | ✅ Yes | Your plain-language video description (rough text is fine — we enhance it automatically) |
| `userId` | `string` | ✅ Yes | Your user account ID |
| `model` | `string` | ❌ No | AI video model to use (default: `"Veo 3.1 Lite"`) |
| `resolution` | `string` | ❌ No | Video resolution: `"480p"` \| `"720p"` \| `"1080p"` \| `"4K"` (default: `"720p"`) |
| `aspectRatio` | `string` | ❌ No | Video aspect ratio: `"16:9"` \| `"9:16"` \| `"1:1"` \| `"4:3"` (default: `"9:16"`) |
| `duration` | `number` | ❌ No | Video length in seconds (default: `4`, max: `60`) |
| `tagline` | `string` | ❌ No | Marketing promotional offer tagline (e.g. `"Buy 1 Get 1 Free"`) to feature prominently in the advertisement |
| `images` | `string[]` \| `File[]` | ❌ No | Reference image URLs or uploaded image files |
| `imageType` \| `imageTypes` | `string` \| `string[]` | ❌ No | Plain text clarifying the role of your uploaded image(s), e.g. `"product"` or `"logo"` (or `"product, logo"` for multiple images), so the AI renders brand logos as overlays and products as animated 3D hero objects |
| `templateId` | `string` | ❌ No | AI Video Template ID from saved templates |
| `channels` | `string[]` | ❌ No | Target social media channels (e.g. `["instagram", "facebook", "instore"]`) |

> ℹ️ **Note on Offer ID:** You do **not** need to manually send an `offerId`. The server automatically generates a unique 6-digit random offer ID for every video generation request.

---

## Example Request

```json
{
  "text": "a futuristic city at night with flying cars",
  "userId": "64f3b2c1a4e2d1234567890a",
  "model": "Wan 2.7",
  "resolution": "1080p",
  "aspectRatio": "16:9",
  "duration": 5
}
```

---

## Example cURL

```bash
curl -X POST https://your-domain.com/api/external/create-video \
  -H "Content-Type: application/json" \
  -d '{
    "text": "a futuristic city at night with flying cars",
    "userId": "64f3b2c1a4e2d1234567890a",
    "model": "Wan 2.7",
    "resolution": "1080p",
    "aspectRatio": "16:9",
    "duration": 5
  }'
```

> ⚠️ **Note:** This request takes **1–3 minutes** to complete (video generation is slow by nature). Set your HTTP client timeout to at least **180 seconds**.

---

## Response

### ✅ Success (`200 OK`)

```json
{
  "success": true,
  "videoUrl": "/uploads/64f3b2c1a4e2d1234567890a/video/a1b2c3d4-ext-ai-generated.mp4",
  "ttsAudio": "//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAAB...",
  "enhancedPrompt": "A breathtaking slow dolly shot gliding through a neon-drenched futuristic megacity at midnight..."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | `boolean` | `true` on success |
| `videoUrl` | `string` | Relative path to the generated video file — prefix with your domain to get the full URL |
| `ttsAudio` | `string` | **Base64-encoded MP3** audio string — spoken version of the video prompt |
| `enhancedPrompt` | `string` | The AI-enhanced cinematic prompt that was actually used for generation |

#### How to use `videoUrl`

Prefix your domain to get the full URL:

```
https://your-domain.com + /uploads/64f3b2c1.../video/abc.mp4
```

#### How to use `ttsAudio`

The `ttsAudio` is a **base64-encoded MP3 string**. You can play it in a browser like this:

```javascript
const audio = new Audio("data:audio/mp3;base64," + response.ttsAudio);
audio.play();
```

Or decode it server-side and save as a `.mp3` file:

```python
import base64
audio_bytes = base64.b64decode(response["ttsAudio"])
with open("output.mp3", "wb") as f:
    f.write(audio_bytes)
```

---

### ❌ Error Response

```json
{
  "success": false,
  "message": "Field 'text' is required — provide your video description"
}
```

| Status | Reason |
|--------|--------|
| `400` | A required field is missing or invalid |
| `500` | Server error — generation failed, timeout, or config issue |

---

## Supported Models

Use one of these exact strings for the `model` field:

| Model Name | Provider |
|------------|----------|
| `Wan 2.7` | Wan |
| `Wan 2.2` | Wan |
| `Wan 2.2 (1.3B)` | Wan (lightweight) |
| `Kling 1.6 Std` | Kling |
| `Kling 1.6 Pro` | Kling |
| `Kling 2.0 Std` | Kling |
| `Kling 2.0 Pro` | Kling |
| `Veo 3` | Google Veo |
| `Seedance 2 Pro` | Seedance |
| `HunyuanVideo` | HunyuanVideo |
| `Hailuo AI` | Hailuo / MiniMax |

---

## What Happens Internally

When you call this API, the server automatically runs 3 steps for you:

```
Step 1 — Prompt Enhancement
  Your plain text  →  AI-optimised cinematic video prompt  (GPT-4o-mini)

Step 2 — Video Generation
  Enhanced prompt  →  AI video file saved on server  (fal.ai)

Step 3 — TTS Audio
  Enhanced prompt  →  Spoken MP3 audio  (OpenAI TTS)
```

You send **one request** and get back **one response** with both `videoUrl` and `ttsAudio`.

---

## Quick Reference

```
POST /api/external/create-video

Required body fields:
  text          (string)  — plain text description
  userId        (string)  — your user ID
  model         (string)  — AI model name (see table above)
  resolution    (string)  — "480p" | "720p" | "1080p" | "4K"
  aspectRatio   (string)  — "16:9" | "9:16" | "1:1" | "4:3"

Optional:
  duration      (number)  — seconds, default 5, max 60

Response:
  videoUrl      (string)  — relative video file path
  ttsAudio      (string)  — base64 MP3 audio of spoken prompt
  enhancedPrompt(string)  — the AI-refined prompt used
```

---

*Powered by Cento AI Platform — fal.ai + OpenAI*
