import fs from "fs";
import path from "path";

// 5x7 ASCII bitmap font definitions for uppercase letters, digits, and retail symbols
const FONT: Record<string, number[]> = {
  " ": [0, 0, 0, 0, 0],
  "!": [0, 0, 95, 0, 0],
  "%": [35, 19, 8, 100, 98],
  "$": [46, 74, 255, 74, 58],
  "+": [8, 8, 62, 8, 8],
  "-": [8, 8, 8, 8, 8],
  ".": [0, 96, 96, 0, 0],
  "/": [32, 16, 8, 4, 2],
  ":": [0, 54, 54, 0, 0],
  "(": [0, 28, 34, 65, 0],
  ")": [0, 65, 34, 28, 0],
  "*": [20, 8, 62, 8, 20],
  "&": [54, 73, 85, 34, 80],
  "#": [20, 127, 20, 127, 20],
  "?": [2, 1, 81, 9, 6],
  "0": [62, 81, 73, 69, 62],
  "1": [0, 66, 127, 64, 0],
  "2": [66, 97, 81, 73, 70],
  "3": [33, 65, 69, 75, 49],
  "4": [24, 20, 18, 127, 16],
  "5": [39, 69, 69, 69, 57],
  "6": [60, 74, 73, 73, 48],
  "7": [1, 113, 9, 5, 3],
  "8": [54, 73, 73, 73, 54],
  "9": [6, 73, 73, 41, 30],
  "A": [126, 9, 9, 9, 126],
  "B": [127, 73, 73, 73, 54],
  "C": [62, 65, 65, 65, 34],
  "D": [127, 65, 65, 34, 28],
  "E": [127, 73, 73, 73, 65],
  "F": [127, 9, 9, 9, 1],
  "G": [62, 65, 73, 73, 58],
  "H": [127, 8, 8, 8, 127],
  "I": [0, 65, 127, 65, 0],
  "J": [32, 64, 65, 63, 1],
  "K": [127, 8, 20, 34, 65],
  "L": [127, 64, 64, 64, 64],
  "M": [127, 2, 12, 2, 127],
  "N": [127, 4, 8, 16, 127],
  "O": [62, 65, 65, 65, 62],
  "P": [127, 9, 9, 9, 6],
  "Q": [62, 65, 81, 33, 94],
  "R": [127, 9, 25, 41, 70],
  "S": [70, 73, 73, 73, 49],
  "T": [1, 1, 127, 1, 1],
  "U": [63, 64, 64, 64, 63],
  "V": [31, 32, 64, 32, 31],
  "W": [63, 64, 56, 64, 63],
  "X": [99, 20, 8, 20, 99],
  "Y": [7, 8, 112, 8, 7],
  "Z": [97, 81, 73, 69, 67],
};

// 16-color commercial retail palette (0xRRGGBB)
const PALETTE = [
  0x0b1329, // 0: Dark background
  0x162238, // 1: Card / product placeholder fill
  0x11b5bb, // 2: Cyan accent (StoreSparc brand)
  0xff2e63, // 3: Vibrant offer badge red
  0xffffff, // 4: Pure white text
  0x94a3b8, // 5: Slate muted text
  0xf59e0b, // 6: Amber / CTA glow
  0x10b981, // 7: Retail emerald green
  0x23324c, // 8: Card border / grid
  0xff5722, // 9: Badge glow red/orange
  0x38bdf8, // 10: Bright cyan highlight
  0x050a14, // 11: Deep shadows
  0x8b5cf6, // 12: Purple accent
  0xf97316, // 13: Neon orange
  0xfef08a, // 14: Yellow glow text
  0x000000, // 15: Black
];

function setPixel(pixels: Uint8Array, width: number, height: number, x: number, y: number, colorIdx: number) {
  if (x >= 0 && x < width && y >= 0 && y < height) {
    pixels[y * width + x] = colorIdx;
  }
}

function drawRect(pixels: Uint8Array, width: number, height: number, rx: number, ry: number, rw: number, rh: number, colorIdx: number) {
  const x0 = Math.max(0, Math.floor(rx));
  const y0 = Math.max(0, Math.floor(ry));
  const x1 = Math.min(width, Math.floor(rx + rw));
  const y1 = Math.min(height, Math.floor(ry + rh));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      pixels[y * width + x] = colorIdx;
    }
  }
}

function drawBorderRect(pixels: Uint8Array, width: number, height: number, rx: number, ry: number, rw: number, rh: number, colorIdx: number) {
  const x0 = Math.max(0, Math.floor(rx));
  const y0 = Math.max(0, Math.floor(ry));
  const x1 = Math.min(width - 1, Math.floor(rx + rw - 1));
  const y1 = Math.min(height - 1, Math.floor(ry + rh - 1));
  for (let x = x0; x <= x1; x++) {
    setPixel(pixels, width, height, x, y0, colorIdx);
    setPixel(pixels, width, height, x, y1, colorIdx);
  }
  for (let y = y0; y <= y1; y++) {
    setPixel(pixels, width, height, x0, y, colorIdx);
    setPixel(pixels, width, height, x1, y, colorIdx);
  }
}

function drawDashedRect(pixels: Uint8Array, width: number, height: number, rx: number, ry: number, rw: number, rh: number, colorIdx: number, dashLen = 4) {
  const x0 = Math.max(0, Math.floor(rx));
  const y0 = Math.max(0, Math.floor(ry));
  const x1 = Math.min(width - 1, Math.floor(rx + rw - 1));
  const y1 = Math.min(height - 1, Math.floor(ry + rh - 1));
  for (let x = x0; x <= x1; x++) {
    if (Math.floor(x / dashLen) % 2 === 0) {
      setPixel(pixels, width, height, x, y0, colorIdx);
      setPixel(pixels, width, height, x, y1, colorIdx);
    }
  }
  for (let y = y0; y <= y1; y++) {
    if (Math.floor(y / dashLen) % 2 === 0) {
      setPixel(pixels, width, height, x0, y, colorIdx);
      setPixel(pixels, width, height, x1, y, colorIdx);
    }
  }
}

function fillCircle(pixels: Uint8Array, width: number, height: number, cx: number, cy: number, radius: number, colorIdx: number) {
  const r2 = radius * radius;
  const x0 = Math.max(0, Math.floor(cx - radius));
  const x1 = Math.min(width - 1, Math.ceil(cx + radius));
  const y0 = Math.max(0, Math.floor(cy - radius));
  const y1 = Math.min(height - 1, Math.ceil(cy + radius));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        pixels[y * width + x] = colorIdx;
      }
    }
  }
}

function drawCircleBorder(pixels: Uint8Array, width: number, height: number, cx: number, cy: number, radius: number, colorIdx: number) {
  const rIn2 = (radius - 1) * (radius - 1);
  const rOut2 = (radius + 1) * (radius + 1);
  const x0 = Math.max(0, Math.floor(cx - radius - 1));
  const x1 = Math.min(width - 1, Math.ceil(cx + radius + 1));
  const y0 = Math.max(0, Math.floor(cy - radius - 1));
  const y1 = Math.min(height - 1, Math.ceil(cy + radius + 1));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (d2 >= rIn2 && d2 <= rOut2) {
        pixels[y * width + x] = colorIdx;
      }
    }
  }
}

function drawText(
  pixels: Uint8Array,
  width: number,
  height: number,
  str: string,
  startX: number,
  startY: number,
  scale: number,
  colorIdx: number,
  align: "left" | "center" = "left"
) {
  const clean = (str || "").toUpperCase();
  const charWidth = 6 * scale;
  const totalWidth = clean.length * charWidth;
  let curX = align === "center" ? Math.floor(startX - totalWidth / 2) : Math.floor(startX);
  const curY = Math.floor(startY);

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    const glyph = FONT[ch] || FONT["?"] || [0, 0, 0, 0, 0];
    for (let col = 0; col < 5; col++) {
      const colBits = glyph[col];
      for (let row = 0; row < 7; row++) {
        if ((colBits & (1 << row)) !== 0) {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              setPixel(pixels, width, height, curX + col * scale + sx, curY + row * scale + sy, colorIdx);
            }
          }
        }
      }
    }
    curX += charWidth;
  }
}

/**
 * Normalizes layer coordinates (percentages 0-100 or pixel 0-1920) to destination pixel dimensions.
 */
function resolveCoords(coordObj: any, w: number, h: number, defaultPctX: number, defaultPctY: number, defaultSize: number) {
  let xPct = defaultPctX;
  let yPct = defaultPctY;
  let size = defaultSize;

  if (coordObj && typeof coordObj === "object") {
    if (typeof coordObj.x === "number") {
      xPct = coordObj.x > 100 ? (coordObj.x / 1920) * 100 : coordObj.x;
    }
    if (typeof coordObj.y === "number") {
      yPct = coordObj.y > 100 ? (coordObj.y / 1080) * 100 : coordObj.y;
    }
    if (typeof coordObj.size === "number") {
      size = coordObj.size > 100 ? (coordObj.size / 1920) * w : coordObj.size;
    }
  }

  const px = Math.round((xPct / 100) * w);
  const py = Math.round((yPct / 100) * h);
  return { px, py, size };
}

/**
 * Generates an animated GIF buffer showing the exact template layout:
 * - Product Cutout Placement (card with dashed boundary and label)
 * - Animated / Pulsing Offer Badge (e.g. 50% OFF)
 * - Headline Text Overlay
 * - Description Text Overlay
 * - CTA Button Overlay (SHOP NOW / ORDER NOW)
 * - Validity Overlay
 */
export function generateTemplatePreviewGif(template: any, ratio: "16:9" | "9:16" = "16:9"): Buffer {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const omggif = eval("require")("omggif");

  const isWide = ratio === "16:9";
  const W = isWide ? 480 : 270;
  const H = isWide ? 270 : 480;

  // Extract layers for this ratio
  const layers = (template.aspectStore && template.aspectStore[ratio]) ||
    (isWide ? template.layers_16_9 : template.layers_9_16) ||
    template.layers || {};

  const headlineText = (layers.headline && layers.headline.text) || template.offerTitle || "SPECIAL PROMOTION";
  const descText = (layers.description && layers.description.text) || template.offerDescription || "Limited time store deal";
  const badgeText = (layers.discount && layers.discount.text) || template.discountLabel || "75% OFF";
  const ctaText = (layers.cta && layers.cta.text) || template.ctaButtonText || "ORDER NOW";
  const validityText = (layers.validity && layers.validity.text) || template.footerText || "Valid This Week";

  // Coordinates
  const productCoords = resolveCoords(layers.product, W, H, isWide ? 68 : 50, isWide ? 50 : 54, isWide ? 150 : 130);
  const badgeCoords = resolveCoords(layers.discount, W, H, isWide ? 22 : 78, isWide ? 26 : 18, isWide ? 38 : 34);
  const headlineCoords = resolveCoords(layers.headline, W, H, isWide ? 40 : 50, isWide ? 26 : 14, 0);
  const descCoords = resolveCoords(layers.description, W, H, isWide ? 40 : 50, isWide ? 46 : 28, 0);
  const ctaCoords = resolveCoords(layers.cta, W, H, isWide ? 38 : 50, isWide ? 76 : 84, 0);
  const validityCoords = resolveCoords(layers.validity, W, H, isWide ? 38 : 50, isWide ? 88 : 93, 0);

  const outBuf = Buffer.alloc(1024 * 768);
  const gifWriter = new omggif.GifWriter(outBuf, W, H, { loop: 0 });

  // Function to render a single frame
  const renderFrame = (frameNum: number) => {
    const pixels = new Uint8Array(W * H);

    // 1. Background (Dark retail theme with subtle grid)
    pixels.fill(0);
    const gridStep = isWide ? 24 : 20;
    for (let gy = 0; gy < H; gy += gridStep) {
      for (let gx = 0; gx < W; gx += gridStep) {
        setPixel(pixels, W, H, gx, gy, 8);
      }
    }

    // Header banner accent line
    drawRect(pixels, W, H, 0, 0, W, 3, 2);

    // 2. Product cutout placeholder
    const pw = Math.round(productCoords.size * 1.1);
    const ph = Math.round(productCoords.size * 1.0);
    const px = Math.round(productCoords.px - pw / 2);
    const py = Math.round(productCoords.py - ph / 2);

    // Card fill & dashed border
    drawRect(pixels, W, H, px, py, pw, ph, 1);
    drawDashedRect(pixels, W, H, px, py, pw, ph, frameNum === 1 ? 10 : 2, 4);

    // Corner targeting brackets
    const cLen = 6;
    drawRect(pixels, W, H, px, py, cLen, 2, 4);
    drawRect(pixels, W, H, px, py, 2, cLen, 4);
    drawRect(pixels, W, H, px + pw - cLen, py, cLen, 2, 4);
    drawRect(pixels, W, H, px + pw - 2, py, 2, cLen, 4);
    drawRect(pixels, W, H, px, py + ph - 2, cLen, 2, 4);
    drawRect(pixels, W, H, px, py + ph - cLen, 2, cLen, 4);
    drawRect(pixels, W, H, px + pw - cLen, py + ph - 2, cLen, 2, 4);
    drawRect(pixels, W, H, px + pw - 2, py + ph - cLen, 2, cLen, 4);

    // Product text inside cutout
    drawText(pixels, W, H, "[ PRODUCT ]", productCoords.px, productCoords.py - 10, 1, 4, "center");
    drawText(pixels, W, H, "CUTOUT POSITION", productCoords.px, productCoords.py + 4, 1, 5, "center");

    // 3. Headline text
    const headScale = isWide ? 2 : 1;
    drawText(pixels, W, H, headlineText, headlineCoords.px, headlineCoords.py, headScale, 4, isWide ? "left" : "center");

    // 4. Description text
    drawText(pixels, W, H, descText, descCoords.px, descCoords.py, 1, 5, isWide ? "left" : "center");

    // 5. Offer Badge (Pulsing animation)
    const baseRadius = Math.round(badgeCoords.size / 2);
    const pulseRadius = frameNum === 1 ? baseRadius + 3 : baseRadius;
    const badgeColor = frameNum === 1 ? 9 : 3;

    if (frameNum === 1) {
      drawCircleBorder(pixels, W, H, badgeCoords.px, badgeCoords.py, pulseRadius + 3, 14);
    }
    fillCircle(pixels, W, H, badgeCoords.px, badgeCoords.py, pulseRadius, badgeColor);
    drawCircleBorder(pixels, W, H, badgeCoords.px, badgeCoords.py, pulseRadius, 4);

    // Badge text inside
    drawText(pixels, W, H, badgeText, badgeCoords.px, badgeCoords.py - 4, 1, 4, "center");

    // 6. CTA Button (Glowing animation)
    const btnW = isWide ? 120 : 130;
    const btnH = 26;
    const bx = isWide ? ctaCoords.px : Math.round(ctaCoords.px - btnW / 2);
    const by = Math.round(ctaCoords.py - btnH / 2);
    const btnBg = frameNum === 1 ? 6 : 2;
    const btnBorder = frameNum === 1 ? 14 : 10;

    drawRect(pixels, W, H, bx, by, btnW, btnH, btnBg);
    drawBorderRect(pixels, W, H, bx, by, btnW, btnH, btnBorder);
    drawText(pixels, W, H, ctaText, bx + Math.round(btnW / 2), by + 9, 1, 4, "center");

    // 7. Validity pill
    drawText(pixels, W, H, validityText, validityCoords.px, validityCoords.py, 1, 5, isWide ? "left" : "center");

    return pixels;
  };

  // Frame 1 (50cs = 0.5s)
  const frame1 = renderFrame(0);
  gifWriter.addFrame(0, 0, W, H, frame1, { palette: PALETTE, delay: 50 });

  // Frame 2 (50cs = 0.5s - pulsing badge, glowing button)
  const frame2 = renderFrame(1);
  gifWriter.addFrame(0, 0, W, H, frame2, { palette: PALETTE, delay: 50 });

  const totalBytes = gifWriter.end();
  return outBuf.subarray(0, totalBytes);
}

/**
 * Ensures preview GIF files exist on disk for this template (16:9 and 9:16).
 * If they do not exist, or if forceRefresh is true, they are generated and written to disk.
 * Returns the relative file paths (/uploads/previews/preview_{tplId}_16x9.gif, etc.)
 */
export function ensureTemplatePreviewGifs(template: any, forceRefresh = false): {
  preview_16_9: string;
  preview_9_16: string;
} {
  const tplId = Number(template.templateId || template.id) || 1;
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

  if (forceRefresh || !fs.existsSync(file169)) {
    try {
      const buf = generateTemplatePreviewGif(template, "16:9");
      fs.writeFileSync(file169, buf);
    } catch (e) {
      console.error(`[ensureTemplatePreviewGifs] Error writing 16:9 for tpl ${tplId}:`, e);
    }
  }

  if (forceRefresh || !fs.existsSync(file916)) {
    try {
      const buf = generateTemplatePreviewGif(template, "9:16");
      fs.writeFileSync(file916, buf);
    } catch (e) {
      console.error(`[ensureTemplatePreviewGifs] Error writing 9:16 for tpl ${tplId}:`, e);
    }
  }

  return {
    preview_16_9: rel169,
    preview_9_16: rel916,
  };
}
