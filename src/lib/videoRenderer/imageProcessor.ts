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

  switch (norm) {
    case '9:16':
      return { width: base, height: Math.round((base * 16) / 9) };
    case '1:1':
      return { width: base, height: base };
    case '4:5':
      return { width: base, height: Math.round((base * 5) / 4) };
    case '16:9':
    default:
      return { width: Math.round((base * 16) / 9), height: base };
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
        .resize(width, height, { fit: 'fill' })
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
 * Fit product cutout inside maxW x maxH box, preserving alpha transparency.
 */
export async function prepareProductImage(
  input: Buffer | string,
  maxW: number,
  maxH: number,
  options?: {
    borderRadius?: number;
    shape?: string;
    border?: string | number;
    borderColor?: string;
    borderWidth?: number;
  }
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const img = sharp(input);
  const meta = await img.metadata();
  const origW = meta.width || maxW;
  const origH = meta.height || maxH;

  const scale = Math.min(maxW / origW, maxH / origH);
  const targetW = Math.max(1, Math.round(origW * scale));
  const targetH = Math.max(1, Math.round(origH * scale));

  let buffer = await img
    .resize(targetW, targetH, { fit: 'inside' })
    .png()
    .toBuffer();

  // Apply corner curvature / border-radius / shape clipping
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

    const strokeWidth = options?.border === '1' ? (Number(options?.borderWidth) || 4) : (Number(options?.borderWidth) || 0);
    if (strokeWidth > 0) {
      const strokeColor = options?.borderColor || '#ffffff';
      const borderSvg = Buffer.from(`
        <svg width="${targetW}" height="${targetH}" xmlns="http://www.w3.org/2000/svg">
          <rect x="${strokeWidth / 2}" y="${strokeWidth / 2}" width="${targetW - strokeWidth}" height="${targetH - strokeWidth}" rx="${radius}" ry="${radius}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>
        </svg>
      `);
      buffer = await sharp(buffer)
        .composite([{ input: borderSvg, blend: 'over' }])
        .png()
        .toBuffer();
    }
  }

  return { buffer, width: targetW, height: targetH };
}

/**
 * Fit brand logo inside white card container (like Urban Rain style).
 */
export async function prepareLogoImage(
  input: Buffer | string,
  maxW: number,
  maxH: number
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const img = sharp(input);
  const meta = await img.metadata();
  const origW = meta.width || maxW;
  const origH = meta.height || maxH;

  const cardW = Math.max(140, Math.round(maxW * 1.3));
  const cardH = Math.max(50, Math.round(maxH * 0.85));

  const fitLogoW = Math.round(cardW * 0.82);
  const fitLogoH = Math.round(cardH * 0.72);
  const scale = Math.min(fitLogoW / origW, fitLogoH / origH, 1.0);
  const targetW = Math.max(1, Math.round(origW * scale));
  const targetH = Math.max(1, Math.round(origH * scale));

  const resizedLogo = await img
    .resize(targetW, targetH, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();

  const cardSvg = `
    <svg width="${cardW}" height="${cardH}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.25)" />
        </filter>
      </defs>
      <rect width="${cardW}" height="${cardH}" rx="8" fill="#ffffff" filter="url(#logoShadow)" />
    </svg>
  `;
  const cardBg = await sharp(Buffer.from(cardSvg)).png().toBuffer();
  const logoLeft = Math.round((cardW - targetW) / 2);
  const logoTop = Math.round((cardH - targetH) / 2);

  const finalCard = await sharp(cardBg)
    .composite([{ input: resizedLogo, left: logoLeft, top: logoTop }])
    .png()
    .toBuffer();

  return { buffer: finalCard, width: cardW, height: cardH };
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

  // 1. Product (Left Area Hero)
  if (product) {
    const left = Math.max(0, Math.min(canvasW - product.width, Math.round(product.cx - product.width / 2)));
    const top = Math.max(0, Math.min(canvasH - product.height, Math.round(product.cy - product.height / 2)));
    overlays.push({
      input: product.buffer,
      left,
      top,
    });
  }

  // 2. Decorative elements
  if (decors) {
    for (const d of decors) {
      const left = Math.max(0, Math.min(canvasW - d.width, Math.round(d.cx - d.width / 2)));
      const top = Math.max(0, Math.min(canvasH - d.height, Math.round(d.cy - d.height / 2)));
      overlays.push({ input: d.buffer, left, top });
    }
  }

  // 3. Text overlays (Headline, discount badge, description, validity, footer)
  for (const t of textLayers) {
    let buf = t.buffer;
    let w = t.width;
    let h = t.height;
    if (w > canvasW) {
      const scale = (canvasW - 20) / w;
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      buf = await sharp(buf).resize(w, h).png().toBuffer();
    }
    const left = Math.max(0, Math.min(canvasW - w, Math.round(t.cx - w / 2)));
    const top = Math.max(0, Math.min(canvasH - h, Math.round(t.cy - h / 2)));
    overlays.push({ input: buf, left, top });
  }

  // 4. Logo (Top-Left Layer)
  if (logo) {
    const left = Math.max(0, Math.min(canvasW - logo.width, Math.round(logo.cx - logo.width / 2)));
    const top = Math.max(0, Math.min(canvasH - logo.height, Math.round(logo.cy - logo.height / 2)));
    overlays.push({ input: logo.buffer, left, top });
  }

  return await sharp(backgroundBuffer).composite(overlays).png().toBuffer();
}
