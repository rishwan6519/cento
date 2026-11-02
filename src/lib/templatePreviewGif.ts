import fs from "fs";
import path from "path";
import sharp from "sharp";
import { spawn } from "child_process";
import { getFfmpegPath } from "./videoRenderer/ffmpegEngine";

function escapeXml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function resolveAssetBuffer(urlOrPath?: string): Promise<Buffer | null> {
  if (!urlOrPath || typeof urlOrPath !== "string") return null;
  const trimmed = urlOrPath.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("data:image/")) {
    const parts = trimmed.split(",");
    if (parts[1]) {
      try {
        return Buffer.from(parts[1], "base64");
      } catch {}
    }
    return null;
  }

  const clean = trimmed.replace(/^https?:\/\/[^\/]+\//, "").replace(/^\/+/, "");
  const candidates = [
    path.join(process.cwd(), clean),
    path.join(process.cwd(), "uploads", clean.replace(/^uploads[\/\\]/, "")),
    path.join(process.cwd(), "public", clean),
    path.join(process.cwd(), "public", "uploads", clean.replace(/^uploads[\/\\]/, "")),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        return fs.readFileSync(c);
      } catch {}
    }
  }

  // HTTP fallback
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const res = await fetch(trimmed, { signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const ab = await res.arrayBuffer();
        return Buffer.from(ab);
      }
    } catch {}
  }

  return null;
}

async function renderTemplateFrame(template: any, ratio: "16:9" | "9:16", pulse = false): Promise<Buffer> {
  const is169 = ratio === "16:9";
  const width = is169 ? 640 : 360;
  const height = is169 ? 360 : 640;

  // 1. Background image / canvas
  const bgUrl =
    (template.aspectBackgrounds && template.aspectBackgrounds[ratio]) ||
    template.backgroundUrl ||
    template.thumbnail_url ||
    template.thumbnail;

  const bgBuf = await resolveAssetBuffer(bgUrl);
  let backgroundBuffer: Buffer;

  if (bgBuf) {
    try {
      backgroundBuffer = await sharp(bgBuf).resize(width, height, { fit: "cover" }).png().toBuffer();
    } catch {
      backgroundBuffer = await createFallbackBg(width, height, is169);
    }
  } else {
    backgroundBuffer = await createFallbackBg(width, height, is169);
  }

  // 2. Overlays
  const overlays: sharp.OverlayOptions[] = [];
  const layers = (template.aspectStore && template.aspectStore[ratio]) || template.layers || {};

  // Product Image
  const prodUrl = template.productUrl || (layers.product && layers.product.url);
  let prodBuf = await resolveAssetBuffer(prodUrl);
  if (!prodBuf) {
    // Default retail product image from uploads/ if available
    const uploadsDir = path.join(process.cwd(), "uploads");
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      const f = files.find((x) => (x.endsWith(".jpg") || x.endsWith(".png")) && !x.includes("preview_") && !x.includes("thumb_"));
      if (f) {
        try {
          prodBuf = fs.readFileSync(path.join(uploadsDir, f));
        } catch {}
      }
    }
  }

  if (prodBuf) {
    try {
      const prodMaxW = is169 ? Math.round(width * 0.38) : Math.round(width * 0.65);
      const prodMaxH = is169 ? Math.round(height * 0.60) : Math.round(height * 0.35);
      const pScaled = await sharp(prodBuf).resize(prodMaxW, prodMaxH, { fit: "inside" }).png().toBuffer();
      const pMeta = await sharp(pScaled).metadata();
      const pw = pMeta.width || prodMaxW;
      const ph = pMeta.height || prodMaxH;
      const cardW = pw + 18;
      const cardH = ph + 18;
      const cardSvg = `
        <svg width="${cardW}" height="${cardH}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="pCardShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000000" flood-opacity="0.35" />
            </filter>
          </defs>
          <rect width="${cardW}" height="${cardH}" rx="14" fill="#ffffff" filter="url(#pCardShadow)"/>
        </svg>
      `;
      const cardBuf = await sharp(Buffer.from(cardSvg)).composite([{ input: pScaled, left: 9, top: 9 }]).png().toBuffer();
      const left = is169 ? Math.round(width * 0.08) : Math.round((width - cardW) / 2);
      const top = is169 ? Math.round((height - cardH) / 2) : Math.round(height * 0.12);
      overlays.push({ input: cardBuf, left, top });
    } catch {}
  }

  // Offer Badge / Discount Layer (Origami style matching Image 2)
  const discountText = (layers.discount && layers.discount.text) || template.offerLabel || template.discountLabel || "75% OFF";
  const badgeScale = pulse ? 1.05 : 1.0;
  const badgeW = Math.round((is169 ? 180 : 160) * badgeScale);
  const badgeH = Math.round((is169 ? 75 : 68) * badgeScale);
  const badgeAngle = pulse ? -8 : -6;
  const badgeBg = (layers.discount && layers.discount.bgColor) || "#ffc700";
  const badgeFold = (layers.discount && layers.discount.borderColor) || "#047857";

  const badgeSvg = `
    <svg width="${badgeW + 40}" height="${badgeH + 40}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="-2" dy="5" stdDeviation="4" flood-color="#000000" flood-opacity="0.45" />
        </filter>
      </defs>
      <g transform="rotate(${badgeAngle} ${(badgeW + 40) / 2} ${(badgeH + 40) / 2})">
        <polygon points="20,${badgeH + 15} 5,${badgeH + 30} 30,${badgeH + 15}" fill="${badgeFold}" stroke="#ffffff" stroke-width="2"/>
        <rect x="18" y="15" width="${badgeW}" height="${badgeH}" rx="12" fill="${badgeBg}" stroke="#ffffff" stroke-width="3.5" filter="url(#badgeShadow)"/>
        <polygon points="8,22 16,32 6,34" fill="#ef4444"/>
        <polygon points="${badgeW + 10},${badgeH + 5} ${badgeW + 20},${badgeH + 15} ${badgeW + 12},${badgeH + 20}" fill="#ef4444"/>
        <polygon points="${badgeW + 12},20 ${badgeW + 22},25 ${badgeW + 18},30" fill="#facc15"/>
        <text x="${(badgeW + 40) / 2}" y="${(badgeH + 40) / 2 + 8}" font-family="Arial, Montserrat, sans-serif" font-size="${Math.round(24 * badgeScale)}" font-weight="900" fill="#ffffff" text-anchor="middle">${escapeXml(discountText)}</text>
      </g>
    </svg>
  `;
  const badgeBuf = await sharp(Buffer.from(badgeSvg)).png().toBuffer();
  const badgeLeft = is169 ? Math.round(width * 0.44) : Math.round((width - (badgeW + 40)) / 2);
  const badgeTop = is169 ? Math.round(height * 0.32) : Math.round(height * 0.48);
  overlays.push({ input: badgeBuf, left: badgeLeft, top: badgeTop });

  // Headline
  const hlText = (layers.headline && layers.headline.text) || template.offerTitle || "Grab the crunch before it's gone!!";
  const hlW = is169 ? Math.round(width * 0.48) : Math.round(width * 0.90);
  const hlH = 65;
  const hlFontSize = is169 ? 20 : 22;
  const hlSvg = `
    <svg width="${hlW}" height="${hlH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="hlShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.8"/>
        </filter>
      </defs>
      <text x="${hlW / 2}" y="${Math.round(hlH / 2 + hlFontSize * 0.35)}" font-family="Arial, Montserrat, sans-serif" font-size="${hlFontSize}" font-weight="900" fill="#ffffff" text-anchor="middle" filter="url(#hlShadow)">${escapeXml(hlText)}</text>
    </svg>
  `;
  const hlBuf = await sharp(Buffer.from(hlSvg)).png().toBuffer();
  const hlLeft = is169 ? Math.round(width * 0.48) : Math.round((width - hlW) / 2);
  const hlTop = is169 ? Math.round(height * 0.16) : Math.round(height * 0.58);
  overlays.push({ input: hlBuf, left: hlLeft, top: hlTop });

  // Description
  const descText = (layers.description && layers.description.text) || template.offerDescription || "Ritz Crackers 300g available at an exclusive discount!!";
  const descW = is169 ? Math.round(width * 0.44) : Math.round(width * 0.88);
  const descH = 34;
  const descSvg = `
    <svg width="${descW}" height="${descH}" xmlns="http://www.w3.org/2000/svg">
      <text x="${descW / 2}" y="20" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#ffffff" text-anchor="middle">${escapeXml(descText)}</text>
    </svg>
  `;
  const descBuf = await sharp(Buffer.from(descSvg)).png().toBuffer();
  const descLeft = is169 ? Math.round(width * 0.50) : Math.round((width - descW) / 2);
  const descTop = is169 ? Math.round(height * 0.62) : Math.round(height * 0.70);
  overlays.push({ input: descBuf, left: descLeft, top: descTop });

  // Validity Pill
  const valText = (layers.validity && layers.validity.text) || "Offer Validity: 1st Aug - 31st Dec 2026";
  const valW = is169 ? 240 : 220;
  const valH = 26;
  const valSvg = `
    <svg width="${valW}" height="${valH}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${valW}" height="${valH}" rx="13" fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
      <text x="${valW / 2}" y="17" font-family="Arial, sans-serif" font-size="9.5" font-weight="bold" fill="#f8fafc" text-anchor="middle">${escapeXml(valText)}</text>
    </svg>
  `;
  const valBuf = await sharp(Buffer.from(valSvg)).png().toBuffer();
  const valLeft = is169 ? Math.round(width * 0.55) : Math.round((width - valW) / 2);
  const valTop = is169 ? Math.round(height * 0.78) : Math.round(height * 0.80);
  overlays.push({ input: valBuf, left: valLeft, top: valTop });

  return sharp(backgroundBuffer).composite(overlays).png().toBuffer();
}

async function createFallbackBg(width: number, height: number, is169: boolean): Promise<Buffer> {
  const splitX = is169 ? Math.round(width * 0.46) : Math.round(width * 0.42);
  const splitSvg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="#059669"/>
      <path d="M${splitX},0 Q${splitX + 40},${Math.round(height * 0.4)} ${splitX - 30},${height} L${width},${height} L${width},0 Z" fill="#dc2626"/>
    </svg>
  `;
  return sharp(Buffer.from(splitSvg)).png().toBuffer();
}

/**
 * Generates an actual, photo-realistic animated GIF preview for a template:
 * 1. If an actual rendered MP4 video exists on disk, extracts the first 2.5s directly.
 * 2. If not, composites the actual template frames (background, product card, 3D origami badge, headline, description)
 *    and compiles an animated looping preview GIF using FFmpeg or Sharp.
 */
export async function generateTemplatePreviewGif(template: any, ratio: "16:9" | "9:16"): Promise<Buffer> {
  const is169 = ratio === "16:9";
  const scaleW = is169 ? 480 : 270;

  // 1. Check if rendered MP4 video is available on disk
  const possibleMp4 = template.lastRenderedVideoUrl || template.video_url || template.previewUrl || template.preview_url;
  if (possibleMp4 && typeof possibleMp4 === "string" && possibleMp4.toLowerCase().endsWith(".mp4")) {
    const cleanRel = possibleMp4.replace(/^https?:\/\/[^\/]+\//, "").replace(/^\/+/, "");
    const localMp4 = path.join(process.cwd(), cleanRel);
    if (fs.existsSync(localMp4)) {
      try {
        const ffmpegBin = getFfmpegPath();
        const tmpDir = path.join(process.cwd(), "uploads", "temp");
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        const tmpOut = path.join(tmpDir, `tmp_${Date.now()}_${Math.random().toString(36).substring(7)}.gif`);

        await new Promise<void>((resolve, reject) => {
          const args = [
            "-y",
            "-ss", "0",
            "-t", "2.5",
            "-i", localMp4,
            "-vf", `fps=10,scale=${scaleW}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
            tmpOut,
          ];
          const proc = spawn(ffmpegBin, args);
          proc.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`FFmpeg exited with code ${code}`));
          });
          proc.on("error", reject);
        });

        if (fs.existsSync(tmpOut)) {
          const buf = fs.readFileSync(tmpOut);
          try { fs.unlinkSync(tmpOut); } catch {}
          return buf;
        }
      } catch (err) {
        console.warn("[generateTemplatePreviewGif] Video-to-GIF conversion fallback to composite:", err);
      }
    }
  }

  // 2. High-Fidelity Layered Composite Frames
  const tmpDir = path.join(process.cwd(), "uploads", "temp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const uid = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const f0 = path.join(tmpDir, `frame_${uid}_0.png`);
  const f1 = path.join(tmpDir, `frame_${uid}_1.png`);
  const tmpOut = path.join(tmpDir, `out_${uid}.gif`);

  try {
    const frame0Buf = await renderTemplateFrame(template, ratio, false);
    const frame1Buf = await renderTemplateFrame(template, ratio, true);
    fs.writeFileSync(f0, frame0Buf);
    fs.writeFileSync(f1, frame1Buf);

    const ffmpegBin = getFfmpegPath();
    await new Promise<void>((resolve, reject) => {
      const args = [
        "-y",
        "-framerate", "1.5",
        "-i", path.join(tmpDir, `frame_${uid}_%d.png`),
        "-vf", `scale=${scaleW}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
        tmpOut,
      ];
      const proc = spawn(ffmpegBin, args);
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exited with code ${code}`));
      });
      proc.on("error", reject);
    });

    if (fs.existsSync(tmpOut)) {
      const buf = fs.readFileSync(tmpOut);
      try { fs.unlinkSync(f0); fs.unlinkSync(f1); fs.unlinkSync(tmpOut); } catch {}
      return buf;
    }
  } catch (err) {
    console.warn("[generateTemplatePreviewGif] Multi-frame FFmpeg failed, falling back to sharp GIF:", err);
  } finally {
    try { if (fs.existsSync(f0)) fs.unlinkSync(f0); } catch {}
    try { if (fs.existsSync(f1)) fs.unlinkSync(f1); } catch {}
    try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch {}
  }

  // 3. Fallback: Sharp Single-Frame High-Resolution GIF
  const staticFrame = await renderTemplateFrame(template, ratio, false);
  return sharp(staticFrame).resize(scaleW).gif().toBuffer();
}

/**
 * Ensures preview GIF files exist on disk for this template (16:9 and 9:16).
 * Generates and caches files into uploads/previews/preview_{tplId}_16x9.gif.
 */
export function ensureTemplatePreviewGifs(template: any, forceRefresh = false): {
  preview_16_9: string;
  preview_9_16: string;
} {
  let tplId = Number(template.templateId || template.id);
  if (!tplId || isNaN(tplId) || tplId < 1000) {
    tplId = 10001;
  }

  const previewsDir = path.join(process.cwd(), "uploads", "previews");
  if (!fs.existsSync(previewsDir)) {
    try {
      fs.mkdirSync(previewsDir, { recursive: true });
    } catch {}
  }

  const rel169 = `/uploads/previews/preview_${tplId}_16x9.gif`;
  const rel916 = `/uploads/previews/preview_${tplId}_9x16.gif`;
  const file169 = path.join(previewsDir, `preview_${tplId}_16x9.gif`);
  const file916 = path.join(previewsDir, `preview_${tplId}_9x16.gif`);

  // Asynchronously generate/overwrite if missing or on forceRefresh
  if (forceRefresh || !fs.existsSync(file169)) {
    generateTemplatePreviewGif(template, "16:9")
      .then((buf) => fs.writeFileSync(file169, buf))
      .catch((e) => console.error(`[ensureTemplatePreviewGifs] 16:9 error for tpl ${tplId}:`, e));
  }

  if (forceRefresh || !fs.existsSync(file916)) {
    generateTemplatePreviewGif(template, "9:16")
      .then((buf) => fs.writeFileSync(file916, buf))
      .catch((e) => console.error(`[ensureTemplatePreviewGifs] 9:16 error for tpl ${tplId}:`, e));
  }

  return {
    preview_16_9: rel169,
    preview_9_16: rel916,
  };
}
