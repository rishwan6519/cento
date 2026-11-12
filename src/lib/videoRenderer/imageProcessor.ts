import sharp from 'sharp';
import { existsSync } from 'fs';
import { join } from 'path';
import { AspectRatio, AspectSize, TextLayer } from './types';

/**
 * Calculate output canvas dimensions according to aspect ratio and target base resolution.
 */
export function calculateDimensions(ratio: AspectRatio | string, baseResolution: number = 720): AspectSize {
  const base = Math.max(360, Math.min(1080, Number(baseResolution) || 720));
  const norm = String(ratio).replace('x', ':').toLowerCase();

  const makeEven = (n: number) => {
    const r = Math.round(n);
    return r % 2 !== 0 ? r + 1 : r;
  };

  switch (norm) {
    case '9:16':
      return { width: makeEven(base), height: makeEven((base * 16) / 9) };
    case '1:1':
      return { width: makeEven(base), height: makeEven(base) };
    case '4:5':
      return { width: makeEven(base), height: makeEven((base * 5) / 4) };
    case '16:9':
    default:
      return { width: makeEven((base * 16) / 9), height: makeEven(base) };
  }
}

/**
 * Cover-crop or generate signature Retail Split Promo background (matching platform design).
 */
export async function prepareBackground(
  input: Buffer | string | null | undefined,
  width: number,
  height: number
): Promise<Buffer> {
  let resolvedInput: Buffer | string | null | undefined = input;

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('data:image/')) {
      const parts = trimmed.split(',');
      if (parts[1]) {
        try {
          resolvedInput = Buffer.from(parts[1], 'base64');
        } catch {}
      }
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const parsed = new URL(trimmed);
        if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
          const clean = parsed.pathname.replace(/^\/+/, '');
          const localCandidates = [
            join(process.cwd(), clean),
            join(process.cwd(), 'uploads', clean.replace(/^uploads[\/\\]/, '')),
            join(process.cwd(), 'public', clean),
            join(process.cwd(), 'public', 'uploads', clean.replace(/^uploads[\/\\]/, '')),
          ];
          for (const cand of localCandidates) {
            if (existsSync(cand)) {
              resolvedInput = cand;
              break;
            }
          }
        }
      } catch {}

      if (!resolvedInput) {
        try {
          const res = await fetch(trimmed);
          if (res.ok) {
            const ab = await res.arrayBuffer();
            resolvedInput = Buffer.from(ab);
          }
        } catch (e) {
          console.warn('[imageProcessor] Failed to fetch remote background:', e);
        }
      }
    } else {
      const clean = trimmed.replace(/^\/+/, '');
      const candidates = [
        join(process.cwd(), clean),
        join(process.cwd(), 'uploads', clean.replace(/^uploads[\/\\]/, '')),
        join(process.cwd(), 'public', clean),
        join(process.cwd(), 'public', 'uploads', clean.replace(/^uploads[\/\\]/, '')),
        trimmed,
      ];
      for (const cand of candidates) {
        if (existsSync(cand)) {
          resolvedInput = cand;
          break;
        }
      }
    }
  }

  if (resolvedInput) {
    try {
      return await sharp(resolvedInput)
        .resize(width, height, { fit: 'cover' })
        .png()
        .toBuffer();
    } catch (err) {
      console.warn('[imageProcessor] Failed to process background, generating retail split fallback:', err);
    }
  }

  const svg = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cleanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0B2830" />
          <stop offset="50%" stop-color="#163B45" />
          <stop offset="100%" stop-color="#051419" />
        </linearGradient>
        <radialGradient id="cleanVignette" cx="50%" cy="40%" r="75%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.06" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0.5" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#cleanGrad)" />
      <rect width="100%" height="100%" fill="url(#cleanVignette)" />
    </svg>
  `;

  return await sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Automatically remove solid / studio / light background from product image to create a clean cutout.
 */
export async function removeProductBackground(input: Buffer): Promise<Buffer> {
  try {
    const img = sharp(input).ensureAlpha();
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;
    if (channels < 4) return input;

    // If the image already has significant transparent pixels, it's already a transparent cutout
    let transparentCount = 0;
    const step = Math.max(1, Math.floor(data.length / (4 * 500)));
    let samples = 0;
    for (let i = 3; i < data.length; i += 4 * step) {
      samples++;
      if (data[i] < 50) transparentCount++;
    }
    if (transparentCount / samples > 0.05) {
      return input;
    }

    // Sample the four corner pixels to detect the background color
    const corners = [
      0, // top-left
      (width - 1) * 4, // top-right
      (height - 1) * width * 4, // bottom-left
      ((height - 1) * width + (width - 1)) * 4, // bottom-right
    ];

    let bgR = 0, bgG = 0, bgB = 0;
    for (const c of corners) {
      bgR += data[c];
      bgG += data[c + 1];
      bgB += data[c + 2];
    }
    bgR = Math.round(bgR / 4);
    bgG = Math.round(bgG / 4);
    bgB = Math.round(bgB / 4);

    const isLightBg = bgR > 220 && bgG > 220 && bgB > 220;
    const tolerance = isLightBg ? 40 : 25;

    let modified = false;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const diff = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
      if (diff < tolerance || (isLightBg && r > 235 && g > 235 && b > 235)) {
        data[i + 3] = 0; // Make transparent
        modified = true;
      }
    }

    if (modified) {
      return await sharp(data, { raw: { width, height, channels: 4 } })
        .png()
        .toBuffer();
    }
  } catch (err) {
    console.warn('[removeProductBackground] Skipped:', err);
  }
  return input;
}

/**
 * Fit product cutout inside maxW x maxH box, preserving alpha transparency.
 */
interface ImageShapeOptions {
  borderRadius?: number;
  shape?: string;
  border?: string | number;
  borderColor?: string;
  borderWidth?: number;
  bgMode?: string;
  bgColor?: string;
  shadow?: boolean;
}

async function applyImageShapeAndBorder(
  inputBuffer: Buffer,
  targetW: number,
  targetH: number,
  options?: ImageShapeOptions
): Promise<Buffer> {
  let buffer = inputBuffer;
  const shape = options?.shape || 'none';
  const minDim = Math.min(targetW, targetH);
  let radius = 0;

  if (shape === 'circle') {
    radius = Math.round(minDim / 2);
  } else if (typeof options?.borderRadius === 'number' && options.borderRadius > 0) {
    radius = options.borderRadius <= 50
      ? Math.round(minDim * (options.borderRadius / 100))
      : Math.min(Math.round(minDim / 2), Math.round(options.borderRadius));
  } else if (shape === 'rounded') {
    radius = Math.round(minDim * 0.12);
  } else if (shape === 'pill') {
    radius = Math.round(minDim / 2);
  }

  if (radius > 0) {
    const maskSvg = Buffer.from(`
      <svg width="${targetW}" height="${targetH}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${targetW}" height="${targetH}" rx="${radius}" ry="${radius}" fill="#fff"/>
      </svg>
    `);

    buffer = await sharp(buffer)
      .composite([{ input: maskSvg, blend: 'dest-in' }])
      .png()
      .toBuffer();
  }

  const strokeWidth = options?.border === '1'
    ? (Number(options?.borderWidth) || 4)
    : (Number(options?.borderWidth) || 0);
  if (strokeWidth > 0) {
    const strokeColor = options?.borderColor || '#ffffff';
    const half = strokeWidth / 2;
    const borderSvg = Buffer.from(`
      <svg width="${targetW}" height="${targetH}" xmlns="http://www.w3.org/2000/svg">
        <rect x="${half}" y="${half}" width="${Math.max(1, targetW - strokeWidth)}" height="${Math.max(1, targetH - strokeWidth)}" rx="${radius}" ry="${radius}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>
      </svg>
    `);
    buffer = await sharp(buffer)
      .composite([{ input: borderSvg, blend: 'over' }])
      .png()
      .toBuffer();
  }

  return buffer;
}

/**
 * Resize and cleanly mask product image with optional curvature and border stroke.
 */
export async function prepareProductImage(
  input: Buffer | string,
  maxW: number,
  maxH: number,
  options?: ImageShapeOptions
): Promise<{ buffer: Buffer; width: number; height: number }> {
  let rawInput = input;
  if (Buffer.isBuffer(input)) {
    rawInput = await removeProductBackground(input);
  }

  const img = sharp(rawInput);
  const meta = await img.metadata();
  const origW = meta.width || maxW;
  const origH = meta.height || maxH;

  const scale = Math.min(maxW / origW, maxH / origH);
  const targetW = Math.max(1, Math.round(origW * scale));
  const targetH = Math.max(1, Math.round(origH * scale));

  const resized = await img
    .resize(targetW, targetH, { fit: 'inside' })
    .png()
    .toBuffer();

  const buffer = await applyImageShapeAndBorder(resized, targetW, targetH, options);
  return { buffer, width: targetW, height: targetH };
}

/**
 * Prepare brand logo preserving transparency by default (matching Template Studio),
 * or inside a styled card container when bgMode/bgColor is specified.
 */
export async function prepareLogoImage(
  input: Buffer | string,
  maxW: number,
  maxH: number,
  options?: ImageShapeOptions
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const img = sharp(input, { density: 200 }).ensureAlpha();
  const meta = await img.metadata();
  const origW = meta.width || maxW;
  const origH = meta.height || maxH;
  const aspect = origW / origH || 1;

  // Match Template Studio canvas sizing: width = maxW, height = maxW / aspect (clamped for extreme tall logos)
  let fitW = Math.max(12, Math.round(maxW));
  let fitH = Math.max(12, Math.round(fitW / aspect));
  const maxAllowedH = Math.max(12, Math.round((maxH || maxW) * 1.4));
  if (fitH > maxAllowedH) {
    fitH = maxAllowedH;
    fitW = Math.max(12, Math.round(fitH * aspect));
  }

  const resizedLogo = await img
    .resize(fitW, fitH, { fit: 'inside' })
    .png()
    .toBuffer();
  const rMeta = await sharp(resizedLogo).metadata();
  const actualW = rMeta.width || fitW;
  const actualH = rMeta.height || fitH;

  const hasBgCard =
    options?.bgMode === 'color' ||
    (Boolean(options?.bgColor) && options?.bgColor !== 'transparent' && options?.bgColor !== 'none');

  if (!hasBgCard) {
    const styled = await applyImageShapeAndBorder(resizedLogo, actualW, actualH, options);
    return { buffer: styled, width: actualW, height: actualH };
  }

  const cardW = Math.max(actualW + 20, Math.round(actualW * 1.25));
  const cardH = Math.max(actualH + 14, Math.round(actualH * 1.25));
  const bgFill = options?.bgColor && options.bgColor !== 'transparent' ? options.bgColor : '#ffffff';
  const cardSvg = `
    <svg width="${cardW}" height="${cardH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.25)" />
        </filter>
      </defs>
      <rect width="${cardW}" height="${cardH}" rx="8" fill="${bgFill}" filter="url(#logoShadow)" />
    </svg>
  `;
  const cardBg = await sharp(Buffer.from(cardSvg)).png().toBuffer();
  const logoLeft = Math.round((cardW - actualW) / 2);
  const logoTop = Math.round((cardH - actualH) / 2);

  const finalCard = await sharp(cardBg)
    .composite([{ input: resizedLogo, left: logoLeft, top: logoTop }])
    .png()
    .toBuffer();

  const styledCard = await applyImageShapeAndBorder(finalCard, cardW, cardH, options);
  return { buffer: styledCard, width: cardW, height: cardH };
}

/**
 * XML/HTML entity escape.
 */
function escapeXml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate a crisp SVG text / badge overlay and rasterize to PNG Buffer.
 * Supports skewed parallelogram ribbon badge, pill, circle, and transparent text.
 */
function wrapTextServer(text: string, maxWidth: number, fontSize: number): string[] {
  if (!text) return [''];
  const maxW = Math.max(30, maxWidth);
  const paras = String(text).split('\n');
  const result: string[] = [];
  const charW = fontSize * 0.58;

  const measure = (str: string): number => str.length * charW;

  for (const para of paras) {
    const trimmed = para.trim();
    if (!trimmed) {
      result.push('');
      continue;
    }
    const words = trimmed.split(/\s+/);
    let curLine = '';

    for (const word of words) {
      const wordW = measure(word);
      // If a single word or unbroken string is wider than maxW, break it into character chunks
      if (wordW > maxW) {
        if (curLine) {
          result.push(curLine);
          curLine = '';
        }
        let chunk = '';
        for (const char of word) {
          const testChunk = chunk + char;
          if (measure(testChunk) <= maxW) {
            chunk = testChunk;
          } else {
            if (chunk) result.push(chunk);
            chunk = char;
          }
        }
        if (chunk) {
          curLine = chunk;
        }
        continue;
      }

      if (!curLine) {
        curLine = word;
      } else {
        const testLine = `${curLine} ${word}`;
        if (measure(testLine) <= maxW) {
          curLine = testLine;
        } else {
          result.push(curLine);
          curLine = word;
        }
      }
    }
    if (curLine) {
      result.push(curLine);
    }
  }

  return result.length > 0 ? result : [text];
}

/**
 * Render dynamic text layer to PNG Buffer using Sharp SVG rasterizer.
 * Supports word wrapping, boxWidth constraints, origami ribbon badge, pill, circle, and transparent text.
 */
export async function renderTextLayerPng(
  layer: TextLayer,
  canvasW: number,
  canvasH: number
): Promise<{ buffer: Buffer; width: number; height: number } | null> {
  const rawText = String(layer.text || '').trim();
  if (!rawText) return null;

  const minSide = Math.min(canvasW, canvasH);
  const fontColor = layer.fontColor || '#ffffff';
  const bgColor = layer.bgColor || '#ffc700';
  const shape = layer.shape || 'none';
  const isOrigami = shape === 'ribbon' || shape === 'parallelogram' || shape === 'origami';
  const isTransparent = (shape === 'none' || (!layer.shape && layer.bgMode === 'transparent')) && !isOrigami;

  // Base font size
  const pctSize = typeof layer.size === 'number' ? layer.size : 3.8;
  let fontSize = Math.max(14, Math.round(minSide * (pctSize / 100)));

  // Responsive max width: respect template creation boxWidth
  const maxAllowedW = Math.round(canvasW * (canvasW > canvasH ? 0.44 : 0.84));
  const customBoxW = layer.boxWidth ? Math.round(canvasW * (Math.max(12, layer.boxWidth) / 100)) : 0;
  const targetMaxW = customBoxW ? Math.min(customBoxW, Math.round(canvasW * 0.94)) : maxAllowedW;

  let padX = Math.round(fontSize * 0.6);
  let padY = Math.round(fontSize * 0.35);

  const usableWrapW = Math.max(50, targetMaxW - padX * 2);
  const textLines = wrapTextServer(rawText, usableWrapW, fontSize);
  const lineHeight = Math.round(fontSize * 1.28);
  const totalTextH = textLines.length * lineHeight;

  let maxLineLen = 0;
  for (const line of textLines) {
    if (line.length > maxLineLen) maxLineLen = line.length;
  }
  const measuredW = Math.round(maxLineLen * fontSize * 0.58);

  let boxW = customBoxW ? Math.max(customBoxW, measuredW + padX * 2) : Math.min(targetMaxW, measuredW + padX * 2);
  let boxH = Math.max(30, totalTextH + padY * 2);

  let shapeMarkup = '';

  if (!isTransparent) {
    const strokeWidth = layer.border ? 2.5 : 0;
    const stroke = layer.borderColor || '#035e23';
    const strokeAttr = strokeWidth > 0 ? `stroke="${stroke}" stroke-width="${strokeWidth}"` : '';

    if (shape === 'ribbon' || shape === 'parallelogram' || shape === 'origami') {
      // 3D Origami Folded Retail Banner Badge (matching Image 2 style)
      const cardW = Math.round(boxW + fontSize * 1.6);
      const cardH = Math.round(boxH + fontSize * 0.7);
      const margin = Math.round(fontSize * 1.6);
      const totalW = cardW + margin * 2;
      const totalH = cardH + margin * 2;
      boxW = totalW;
      boxH = totalH;

      const cx = Math.round(boxW / 2);
      const cy = Math.round(boxH / 2);
      const cardX = Math.round(cx - cardW / 2);
      const cardY = Math.round(cy - cardH / 2);
      const rx = Math.max(8, Math.round(fontSize * 0.22));
      const foldW = Math.round(fontSize * 0.95);
      const foldH = Math.round(fontSize * 0.85);
      const cs = Math.max(6, Math.round(fontSize * 0.22));
      const foldColor = layer.borderColor || '#047857';
      const cardBg = layer.bgColor || '#ffc700';
      const strokeW = Math.max(3.5, Math.round(fontSize * 0.12));

      shapeMarkup = `
        <defs>
          <filter id="origamiBadgeShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="-2" dy="6" stdDeviation="5" flood-color="#000000" flood-opacity="0.45" />
          </filter>
        </defs>
        <g transform="rotate(-7 ${cx} ${cy})">
          <!-- 1. Folded Green Origami Ribbon Flap at Bottom Left -->
          <polygon points="${cardX + 12},${cardY + cardH - 2} ${cardX - Math.round(foldW * 0.45)},${cardY + cardH + foldH} ${cardX + Math.round(foldW * 0.7)},${cardY + cardH - 2}" fill="${foldColor}" stroke="#ffffff" stroke-width="${Math.max(2, Math.round(fontSize * 0.08))}" stroke-linejoin="round" />

          <!-- 2. Main Yellow Rounded Card with Drop Shadow & Thick White Border -->
          <rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="${rx}" fill="${cardBg}" stroke="#ffffff" stroke-width="${strokeW}" filter="url(#origamiBadgeShadow)" />

          <!-- 3. Confetti Triangles around Corners -->
          <polygon points="${cardX - cs * 1.5},${cardY + cs - cs * 1.1} ${cardX - cs * 1.5 + cs * 0.9},${cardY + cs + cs * 0.9} ${cardX - cs * 1.5 - cs * 0.9},${cardY + cs + cs * 0.9}" fill="#ef4444" />
          <polygon points="${cardX - cs * 0.8},${cardY - cs * 1.4 - cs} ${cardX - cs * 0.8 + cs * 0.8},${cardY - cs * 1.4 + cs * 0.8} ${cardX - cs * 0.8 - cs * 0.8},${cardY - cs * 1.4 + cs * 0.8}" fill="#facc15" />
          <polygon points="${cardX + cs * 1.2},${cardY - cs * 1.8 - cs * 0.9} ${cardX + cs * 1.2 + cs * 0.8},${cardY - cs * 1.8 + cs * 0.8} ${cardX + cs * 1.2 - cs * 0.8},${cardY - cs * 1.8 + cs * 0.8}" fill="#10b981" />

          <polygon points="${cardX + cardW + cs * 1.2},${cardY - cs * 0.8 - cs * 1.1} ${cardX + cardW + cs * 1.2 + cs * 0.9},${cardY - cs * 0.8 + cs * 0.9} ${cardX + cardW + cs * 1.2 - cs * 0.9},${cardY - cs * 0.8 + cs * 0.9}" fill="#facc15" />
          <polygon points="${cardX + cardW + cs * 2.2},${cardY + cs * 1.5 - cs * 0.85} ${cardX + cardW + cs * 2.2 + cs * 0.7},${cardY + cs * 1.5 + cs * 0.7} ${cardX + cardW + cs * 2.2 - cs * 0.7},${cardY + cs * 1.5 + cs * 0.7}" fill="#ef4444" />

          <polygon points="${cardX + cardW + cs * 1.6},${cardY + cardH + cs * 0.8 - cs * 0.9} ${cardX + cardW + cs * 1.6 + cs * 0.75},${cardY + cardH + cs * 0.8 + cs * 0.75} ${cardX + cardW + cs * 1.6 - cs * 0.75},${cardY + cardH + cs * 0.8 + cs * 0.75}" fill="#facc15" />
          <polygon points="${cardX - cs * 1.8},${cardY + cardH + cs * 0.6 - cs * 1.1} ${cardX - cs * 1.8 + cs * 0.9},${cardY + cardH + cs * 0.6 + cs * 0.9} ${cardX - cs * 1.8 - cs * 0.9},${cardY + cardH + cs * 0.6 + cs * 0.9}" fill="#ef4444" />

          <!-- Centered Bold Text lines rotated cleanly with card -->
          ${textLines.map((line, idx) => {
            const lineY = Math.round(cy - ((textLines.length - 1) * lineHeight) / 2 + idx * lineHeight + fontSize * 0.32);
            return `<text
              x="${cx}"
              y="${lineY}"
              font-family="${layer.font || 'Arial'}, Montserrat, sans-serif"
              font-size="${fontSize}px"
              font-weight="${layer.fontWeight === 'normal' ? 'normal' : '900'}"
              font-style="${layer.fontStyle === 'italic' ? 'italic' : 'normal'}"
              fill="${fontColor}"
              text-anchor="middle"
              dominant-baseline="alphabetic"
            >${escapeXml(line)}</text>`;
          }).join('\n')}
        </g>
      `;
    } else if (shape === 'rounded') {
      const rx = Math.max(10, Math.round(fontSize * 0.35));
      shapeMarkup = `<rect x="${strokeWidth}" y="${strokeWidth}" width="${boxW - strokeWidth * 2}" height="${boxH - strokeWidth * 2}" rx="${rx}" fill="${bgColor}" ${strokeAttr} />`;
    } else if (shape === 'circle') {
      const radius = Math.max(boxW, boxH) / 2 + 10;
      boxW = Math.round(radius * 2);
      boxH = Math.round(radius * 2);
      shapeMarkup = `<circle cx="${radius}" cy="${radius}" r="${radius - (strokeWidth ? 2 : 0)}" fill="${bgColor}" ${strokeAttr} />`;
    } else if (shape === 'pill') {
      const rx = boxH / 2;
      shapeMarkup = `<rect x="${strokeWidth}" y="${strokeWidth}" width="${boxW - strokeWidth * 2}" height="${boxH - strokeWidth * 2}" rx="${rx}" fill="${bgColor}" ${strokeAttr} />`;
    } else {
      // rect
      const rx = Math.round(fontSize * 0.2);
      shapeMarkup = `<rect x="${strokeWidth}" y="${strokeWidth}" width="${boxW - strokeWidth * 2}" height="${boxH - strokeWidth * 2}" rx="${rx}" fill="${bgColor}" ${strokeAttr} />`;
    }
  }

  const textAnchor = layer.textAlign === 'left' ? 'start' : layer.textAlign === 'right' ? 'end' : 'middle';
  const textX = layer.textAlign === 'left' ? padX : layer.textAlign === 'right' ? (boxW - padX) : Math.round(boxW / 2);
  const startY = Math.round(boxH / 2 - ((textLines.length - 1) * lineHeight) / 2);

  const textElement = isOrigami ? '' : textLines.map((line, idx) => {
    const lineY = Math.round(startY + idx * lineHeight + fontSize * 0.32);
    return `<text
      x="${textX}"
      y="${lineY}"
      font-family="${layer.font || 'Arial'}, Montserrat, sans-serif"
      font-size="${fontSize}px"
      font-weight="${layer.fontWeight === 'normal' ? 'normal' : '900'}"
      font-style="${layer.fontStyle === 'italic' ? 'italic' : 'normal'}"
      fill="${fontColor}"
      text-anchor="${textAnchor}"
      dominant-baseline="alphabetic"
    >${escapeXml(line)}</text>`;
  }).join('\n');

  const svg = `
    <svg width="${boxW}" height="${boxH}" xmlns="http://www.w3.org/2000/svg">
      ${shapeMarkup}
      ${textElement}
    </svg>
  `;

  try {
    const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
    return { buffer, width: boxW, height: boxH };
  } catch (err) {
    console.warn('[imageProcessor] renderTextLayerPng failed:', err);
    return null;
  }
}

/**
 * Composite full scene still frame using Sharp.
 */
export async function compositeStillFrame(params: {
  backgroundBuffer: Buffer;
  canvasW: number;
  canvasH: number;
  product?: { buffer: Buffer; width: number; height: number; cx: number; cy: number };
  logo?: { buffer: Buffer; width: number; height: number; cx: number; cy: number };
  textLayers: Array<{ buffer: Buffer; width: number; height: number; cx: number; cy: number }>;
  decors?: Array<{ buffer: Buffer; width: number; height: number; cx: number; cy: number }>;
}): Promise<Buffer> {
  const { backgroundBuffer, canvasW, canvasH, product, logo, textLayers, decors } = params;
  const overlays: sharp.OverlayOptions[] = [];

  try {
    // 1. Product (Hero area)
    if (product) {
      let pw = product.width;
      let ph = product.height;
      let pBuf = product.buffer;

      // Ensure product never exceeds canvas bounds
      if (pw > canvasW || ph > canvasH) {
        const scale = Math.min((canvasW - 10) / pw, (canvasH - 10) / ph);
        pw = Math.max(1, Math.round(pw * scale));
        ph = Math.max(1, Math.round(ph * scale));
        pBuf = await sharp(pBuf).resize(pw, ph).png().toBuffer();
      }

      const left = Math.max(0, Math.min(canvasW - pw, Math.round(product.cx - pw / 2)));
      const top = Math.max(0, Math.min(canvasH - ph, Math.round(product.cy - ph / 2)));
      overlays.push({
        input: pBuf,
        left,
        top,
      });
    }

    // 2. Decorative elements
    if (decors) {
      for (const d of decors) {
        let dw = d.width;
        let dh = d.height;
        let dBuf = d.buffer;

        if (dw > canvasW || dh > canvasH) {
          const scale = Math.min((canvasW - 10) / dw, (canvasH - 10) / dh);
          dw = Math.max(1, Math.round(dw * scale));
          dh = Math.max(1, Math.round(dh * scale));
          dBuf = await sharp(dBuf).resize(dw, dh).png().toBuffer();
        }

        const left = Math.max(0, Math.min(canvasW - dw, Math.round(d.cx - dw / 2)));
        const top = Math.max(0, Math.min(canvasH - dh, Math.round(d.cy - dh / 2)));
        overlays.push({ input: dBuf, left, top });
      }
    }

    // 3. Text overlays (Headline, discount badge, description, validity, footer)
    for (const t of textLayers) {
      let buf = t.buffer;
      let w = t.width;
      let h = t.height;
      if (w > canvasW || h > canvasH) {
        const scale = Math.min((canvasW - 10) / w, (canvasH - 10) / h);
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));
        buf = await sharp(buf).resize(w, h).png().toBuffer();
      }
      const left = Math.max(0, Math.min(canvasW - w, Math.round(t.cx - w / 2)));
      const top = Math.max(0, Math.min(canvasH - h, Math.round(t.cy - h / 2)));
      overlays.push({ input: buf, left, top });
    }

    // 4. Logo (Top Layer)
    if (logo) {
      let lw = logo.width;
      let lh = logo.height;
      let lBuf = logo.buffer;

      if (lw > canvasW || lh > canvasH) {
        const scale = Math.min((canvasW - 10) / lw, (canvasH - 10) / lh);
        lw = Math.max(1, Math.round(lw * scale));
        lh = Math.max(1, Math.round(lh * scale));
        lBuf = await sharp(lBuf).resize(lw, lh).png().toBuffer();
      }

      const left = Math.max(0, Math.min(canvasW - lw, Math.round(logo.cx - lw / 2)));
      const top = Math.max(0, Math.min(canvasH - lh, Math.round(logo.cy - lh / 2)));
      overlays.push({ input: lBuf, left, top });
    }

    return await sharp(backgroundBuffer).composite(overlays).png().toBuffer();
  } catch (compErr) {
    console.warn('[imageProcessor] compositeStillFrame error, falling back to background:', compErr);
    return backgroundBuffer;
  }
}
