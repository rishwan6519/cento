import sharp from 'sharp';
import { mkdir, writeFile, readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  AspectRatio,
  RenderOptions,
  RenderJobResult,
  SingleVideoOutput,
  TemplateLayers,
} from './types';
import {
  calculateDimensions,
  prepareBackground,
  prepareProductImage,
  prepareLogoImage,
  renderTextLayerPng,
  compositeStillFrame,
} from './imageProcessor';
import {
  encodeAnimatedOfferVideo,
  encodeStillVideo,
  resolveMusicTrack,
  AnimatedLayerItem,
  runFfmpegCommand,
} from './ffmpegEngine';

/**
 * Fetch remote URL into Buffer.
 */
export async function resolveAssetBuffer(urlOrPath: string): Promise<Buffer | null> {
  if (!urlOrPath || typeof urlOrPath !== 'string') return null;
  const trimmed = urlOrPath.trim();
  if (!trimmed) return null;

  // 1. Data URLs
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('data:audio/')) {
    const parts = trimmed.split(',');
    if (parts[1]) {
      try {
        return Buffer.from(parts[1], 'base64');
      } catch (err) {
        console.warn('[videoRenderer] Failed to decode base64 data URL', err);
      }
    }
  }

  // 2. HTTP/HTTPS URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
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
            try {
              return await readFile(cand);
            } catch {}
          }
        }
      }
    } catch {}

    try {
      const res = await fetch(trimmed);
      if (res.ok) {
        const ab = await res.arrayBuffer();
        return Buffer.from(ab);
      }
    } catch (err) {
      console.warn(`[videoRenderer] Failed to download URL: ${trimmed}`, err);
    }
  }

  // 3. Local paths (handles /uploads/..., uploads/..., public/..., absolute path)
  const cleanPath = trimmed.replace(/^\/+/, '');
  const candidates = [
    join(process.cwd(), cleanPath),
    join(process.cwd(), 'uploads', cleanPath.replace(/^uploads[\/\\]/, '')),
    join(process.cwd(), 'public', cleanPath),
    join(process.cwd(), 'public', 'uploads', cleanPath.replace(/^uploads[\/\\]/, '')),
    trimmed,
  ];

  for (const cand of candidates) {
    if (existsSync(cand)) {
      try {
        return await readFile(cand);
      } catch {}
    }
  }

  return null;
}

const fetchUrlToBuffer = resolveAssetBuffer;

/**
 * Normalize layers with responsive coordinate defaults based on aspect ratio.
 */
export function getDefaultLayers(ratio: AspectRatio | string, custom?: TemplateLayers): TemplateLayers {
  const isPortrait = ratio === '9:16';
  const isSquare = ratio === '1:1';
  const isFourFive = ratio === '4:5';

  let defaults: TemplateLayers;

  if (isPortrait) {
    defaults = {
      product: {
        x: 0.50,
        y: 0.28,
        size: 65,
        animation: 'slide_up',
      },
      discount: {
        text: '30% off',
        x: 0.50,
        y: 0.46,
        size: 7.5,
        shape: 'rounded',
        fontColor: '#000000',
        bgColor: '#ffc700',
        border: '0',
        borderColor: '#000000',
      },
      headline: {
        text: 'Unleash your freedom — shop Stayfree Ultra Thin today!',
        x: 0.50,
        y: 0.58,
        size: 4.2,
        shape: 'none',
        fontColor: '#ffffff',
      },
      description: {
        text: 'Stayfree Ultra Thin Super Wing 12',
        x: 0.50,
        y: 0.70,
        size: 2.6,
        shape: 'none',
        fontColor: '#ffffff',
      },
      validity: {
        text: 'Valid till stock last',
        x: 0.50,
        y: 0.80,
        size: 2.2,
        shape: 'pill',
        fontColor: '#111111',
        bgColor: '#ffffff',
      },
      footer: {
        text: 'Terms & Conditions Apply · StoreSparc Video',
        x: 0.50,
        y: 0.95,
        size: 1.5,
        shape: 'none',
        fontColor: '#ffffff',
      },
      logo: {
        x: 0.50,
        y: 0.05,
        size: 10,
      },
    };
  } else if (isSquare) {
    defaults = {
      product: {
        x: 0.28,
        y: 0.42,
        size: 50,
        animation: 'slide_up',
      },
      discount: {
        text: '30% off',
        x: 0.45,
        y: 0.54,
        size: 7.0,
        shape: 'rounded',
        fontColor: '#000000',
        bgColor: '#ffc700',
        border: '0',
        borderColor: '#000000',
      },
      headline: {
        text: 'Unleash your freedom — shop Stayfree Ultra Thin today!',
        x: 0.72,
        y: 0.26,
        size: 3.8,
        shape: 'none',
        fontColor: '#ffffff',
      },
      description: {
        text: 'Stayfree Ultra Thin Super Wing 12',
        x: 0.72,
        y: 0.48,
        size: 2.6,
        shape: 'none',
        fontColor: '#ffffff',
      },
      validity: {
        text: 'Valid till stock last',
        x: 0.72,
        y: 0.68,
        size: 2.2,
        shape: 'pill',
        fontColor: '#111111',
        bgColor: '#ffffff',
      },
      footer: {
        text: 'Terms & Conditions Apply · StoreSparc Video',
        x: 0.75,
        y: 0.94,
        size: 1.4,
        shape: 'none',
        fontColor: '#ffffff',
      },
      logo: {
        x: 0.22,
        y: 0.08,
        size: 10,
      },
    };
  } else if (isFourFive) {
    defaults = {
      product: {
        x: 0.28,
        y: 0.40,
        size: 52,
        animation: 'slide_up',
      },
      discount: {
        text: '30% off',
        x: 0.45,
        y: 0.54,
        size: 7.2,
        shape: 'rounded',
        fontColor: '#000000',
        bgColor: '#ffc700',
        border: '0',
        borderColor: '#000000',
      },
      headline: {
        text: 'Unleash your freedom — shop Stayfree Ultra Thin today!',
        x: 0.72,
        y: 0.26,
        size: 3.8,
        shape: 'none',
        fontColor: '#ffffff',
      },
      description: {
        text: 'Stayfree Ultra Thin Super Wing 12',
        x: 0.72,
        y: 0.48,
        size: 2.6,
        shape: 'none',
        fontColor: '#ffffff',
      },
      validity: {
        text: 'Valid till stock last',
        x: 0.72,
        y: 0.68,
        size: 2.2,
        shape: 'pill',
        fontColor: '#111111',
        bgColor: '#ffffff',
      },
      footer: {
        text: 'Terms & Conditions Apply · StoreSparc Video',
        x: 0.75,
        y: 0.94,
        size: 1.4,
        shape: 'none',
        fontColor: '#ffffff',
      },
      logo: {
        x: 0.23,
        y: 0.08,
        size: 10,
      },
    };
  } else {
    // 16:9 Landscape (Clean placement matching the user's background template image)
    defaults = {
      product: {
        x: 0.20,
        y: 0.42,
        size: 38,
        animation: 'slide_up',
      },
      discount: {
        text: '30% off',
        x: 0.44,
        y: 0.52,
        size: 7.0,
        shape: 'rounded',
        fontColor: '#000000',
        bgColor: '#ffc700',
        border: '0',
        borderColor: '#000000',
      },
      headline: {
        text: 'Unleash your freedom — shop Stayfree Ultra Thin today!',
        x: 0.74,
        y: 0.28,
        size: 4.2,
        shape: 'none',
        fontColor: '#ffffff',
      },
      description: {
        text: 'Stayfree Ultra Thin Super Wing 12',
        x: 0.74,
        y: 0.50,
        size: 3.0,
        shape: 'none',
        fontColor: '#ffffff',
      },
      validity: {
        text: 'Valid till stock last',
        x: 0.74,
        y: 0.72,
        size: 2.5,
        shape: 'pill',
        fontColor: '#111111',
        bgColor: '#ffffff',
      },
      footer: {
        text: 'Terms & Conditions Apply · StoreSparc Video',
        x: 0.78,
        y: 0.94,
        size: 1.5,
        shape: 'none',
        fontColor: '#ffffff',
      },
      logo: {
        x: 0.183,
        y: 0.09,
        size: 10,
      },
    };
  }

  if (!custom) return defaults;

  return {
    ...defaults,
    ...custom,
    product: { ...defaults.product, ...(custom.product || {}) },
    discount: { ...defaults.discount, ...(custom.discount || {}), text: custom.discount?.text ?? defaults.discount?.text ?? '' },
    headline: { ...defaults.headline, ...(custom.headline || {}), text: custom.headline?.text ?? defaults.headline?.text ?? '' },
    description: { ...defaults.description, ...(custom.description || {}), text: custom.description?.text ?? defaults.description?.text ?? '' },
    validity: { ...defaults.validity, ...(custom.validity || {}), text: custom.validity?.text ?? defaults.validity?.text ?? '' },
    footer: { ...defaults.footer, ...(custom.footer || {}), text: custom.footer?.text ?? defaults.footer?.text ?? '' },
    logo: { ...defaults.logo, ...(custom.logo || {}) },
  };
}

/**
 * Render a single animated video file for a specific aspect ratio.
 */
export async function renderSingleAspect(
  ratio: AspectRatio | string,
  options: RenderOptions,
  sharedAssets: {
    productBuffer?: Buffer | null;
    bgBuffer?: Buffer | null;
    logoBuffer?: Buffer | null;
    audioPath?: string;
  }
): Promise<SingleVideoOutput> {
  const { width, height } = calculateDimensions(ratio, options.resolution || 720);
  const layers = getDefaultLayers(ratio, options.layers);

  // Apply explicit text overrides from options.text
  if (options.text.discount && layers.discount) layers.discount.text = options.text.discount;
  if (options.text.headline && layers.headline) layers.headline.text = options.text.headline;
  if (options.text.description && layers.description) layers.description.text = options.text.description;
  if (options.text.validity && layers.validity) layers.validity.text = options.text.validity;
  if (options.text.footer && layers.footer) layers.footer.text = options.text.footer;
  if (options.text.price && layers.price) layers.price.text = options.text.price;
  if (options.text.oldPrice && layers.oldPrice) layers.oldPrice.text = options.text.oldPrice;
  if (options.text.cta && layers.cta) layers.cta.text = options.text.cta;

  // 1. Prepare Background
  let effectiveBg = sharedAssets.bgBuffer;
  if (!effectiveBg) {
    const fallbackBgUrl = (options.aspectBackgrounds && options.aspectBackgrounds[ratio]) || options.files.backgroundUrl;
    if (fallbackBgUrl) {
      effectiveBg = await resolveAssetBuffer(fallbackBgUrl);
    }
  }
  const bg = await prepareBackground(effectiveBg, width, height);

  // 2. Prepare Product Image
  let prodLayerData: { buffer: Buffer; width: number; height: number; cx: number; cy: number } | undefined;
  if (sharedAssets.productBuffer) {
    const isPortrait = height > width;
    const isSquare = width === height;
    const isFourFive = Math.abs(width / height - 4 / 5) < 0.05;

    // Determine healthy, prominent product size percentage
    const rawSize = layers.product?.size;
    let pSizePct = rawSize && rawSize >= 35 ? rawSize : 0;
    
    if (!pSizePct) {
      if (isPortrait) {
        pSizePct = 68;
      } else if (isSquare) {
        pSizePct = (layers.product?.x && Math.abs(layers.product.x - 0.5) < 0.15) ? 60 : 48;
      } else if (isFourFive) {
        pSizePct = (layers.product?.x && Math.abs(layers.product.x - 0.5) < 0.15) ? 58 : 46;
      } else {
        // 16:9 Landscape
        pSizePct = (layers.product?.x && Math.abs(layers.product.x - 0.5) < 0.15) ? 50 : 38;
      }
    }

    // Inspect input image dimensions to handle aspect ratio properly
    const meta = await sharp(sharedAssets.productBuffer).metadata();
    const pAspect = (meta.width && meta.height) ? meta.width / meta.height : 1.0;

    let targetBoxW = Math.round(width * (pSizePct / 100));
    let targetBoxH = Math.round(height * (pSizePct / 100));

    if (layers.product?.boxWidth) {
      targetBoxW = Math.round(width * (layers.product.boxWidth / 100));
    }
    if (layers.product?.boxHeight) {
      targetBoxH = Math.round(height * (layers.product.boxHeight / 100));
    }

    let maxW = targetBoxW;
    let maxH = targetBoxH;

    if (pAspect > 1.0) {
      // Wide product: width is primary constraint, ensure height doesn't become tiny
      maxH = Math.round(maxW / pAspect);
      const minHeroH = Math.round(height * (isPortrait ? 0.28 : isSquare ? 0.35 : 0.40));
      if (maxH < minHeroH && maxW * (minHeroH / maxH) <= width * 0.90) {
        maxW = Math.round(minHeroH * pAspect);
        maxH = minHeroH;
      }
    } else {
      // Tall or square product: height is primary, ensure width isn't tiny
      maxW = Math.round(maxH * pAspect);
      const minHeroW = Math.round(width * (isPortrait ? 0.55 : 0.35));
      if (maxW < minHeroW && maxH * (minHeroW / maxW) <= height * 0.80) {
        maxH = Math.round(minHeroW / pAspect);
        maxW = minHeroW;
      }
    }

    // Strict boundary enforcement: product overlay must NEVER exceed canvas dimensions (prevents Sharp composite crash)
    maxW = Math.max(10, Math.min(Math.round(width * 0.90), maxW));
    maxH = Math.max(10, Math.min(Math.round(height * 0.90), maxH));

    const prep = await prepareProductImage(sharedAssets.productBuffer, maxW, maxH, {
      borderRadius: layers.product?.borderRadius,
      shape: layers.product?.shape,
      border: layers.product?.border,
      borderColor: layers.product?.borderColor,
      borderWidth: layers.product?.borderWidth,
    });

    const cx = Math.round((layers.product?.x ?? (isPortrait ? 0.5 : 0.28)) * width);
    const cy = Math.round((layers.product?.y ?? (isPortrait ? 0.32 : 0.52)) * height);
    prodLayerData = { ...prep, cx, cy };
  }

  // 3. Prepare Logo
  let logoLayerData: { buffer: Buffer; width: number; height: number; cx: number; cy: number } | undefined;
  if (sharedAssets.logoBuffer && layers.logo) {
    const minSide = Math.min(width, height);
    const logoSize = Math.round(minSide * ((layers.logo.size || 12) / 100));
    const prep = await prepareLogoImage(sharedAssets.logoBuffer, logoSize, logoSize);
    const cx = Math.round((layers.logo.x ?? 0.1) * width);
    const cy = Math.round((layers.logo.y ?? 0.08) * height);
    logoLayerData = { ...prep, cx, cy };
  }

  // 4. Setup directories
  const renderedDir = join(process.cwd(), 'uploads', 'rendered');
  if (!existsSync(renderedDir)) {
    await mkdir(renderedDir, { recursive: true });
  }

  const tempWorkDir = join(process.cwd(), 'uploads', 'temp', 'render_jobs', options.jobId);
  if (!existsSync(tempWorkDir)) {
    await mkdir(tempWorkDir, { recursive: true });
  }

  const safeRatioSlug = String(ratio).replace(':', 'x');
  const bgFile = join(tempWorkDir, `bg_${safeRatioSlug}.png`);
  await writeFile(bgFile, bg);

  const animLayers: AnimatedLayerItem[] = [];
  const filesToCleanup: string[] = [bgFile];

  // Add Product Layer
  if (prodLayerData) {
    const prodFile = join(tempWorkDir, `prod_${safeRatioSlug}.png`);
    await writeFile(prodFile, prodLayerData.buffer);
    filesToCleanup.push(prodFile);

    const targetX = Math.max(0, Math.min(width - prodLayerData.width, Math.round(prodLayerData.cx - prodLayerData.width / 2)));
    const targetY = Math.max(0, Math.min(height - prodLayerData.height, Math.round(prodLayerData.cy - prodLayerData.height / 2)));
    animLayers.push({
      id: 'product',
      imagePath: prodFile,
      width: prodLayerData.width,
      height: prodLayerData.height,
      targetX,
      targetY,
      type: 'product',
    });
  }

  // Add Logo Layer
  if (logoLayerData) {
    const logoFile = join(tempWorkDir, `logo_${safeRatioSlug}.png`);
    await writeFile(logoFile, logoLayerData.buffer);
    filesToCleanup.push(logoFile);

    const targetX = Math.max(0, Math.min(width - logoLayerData.width, Math.round(logoLayerData.cx - logoLayerData.width / 2)));
    const targetY = Math.max(0, Math.min(height - logoLayerData.height, Math.round(logoLayerData.cy - logoLayerData.height / 2)));
    animLayers.push({
      id: 'logo',
      imagePath: logoFile,
      width: logoLayerData.width,
      height: logoLayerData.height,
      targetX,
      targetY,
      type: 'logo',
    });
  }

  // Add Text Overlays (Discount, Headline, Description, Validity, Footer)
  const textOrder: string[] = [
    'storeName',
    'discount',
    'headline',
    'description',
    'price',
    'oldPrice',
    'validity',
    'cta',
    'qrCode',
    'footer',
  ];
  for (const extraKey of Object.keys(layers)) {
    if (!textOrder.includes(extraKey) && extraKey !== 'product' && extraKey !== 'logo' && extraKey !== 'decors' && extraKey !== 'decorations') {
      textOrder.push(extraKey);
    }
  }

  const textLayersForComposite: Array<{ buffer: Buffer; width: number; height: number; cx: number; cy: number }> = [];

  for (const k of textOrder) {
    const L = layers[k];
    if (!L || !L.text || L.hidden) continue;
    const rendered = await renderTextLayerPng(L, width, height);
    if (rendered) {
      const cx = Math.round((L.x ?? 0.5) * width);
      const cy = Math.round((L.y ?? 0.5) * height);
      textLayersForComposite.push({ ...rendered, cx, cy });

      const txtFile = join(tempWorkDir, `${k}_${safeRatioSlug}.png`);
      await writeFile(txtFile, rendered.buffer);
      filesToCleanup.push(txtFile);

      const targetX = Math.max(0, Math.min(width - rendered.width, Math.round(cx - rendered.width / 2)));
      const targetY = Math.max(0, Math.min(height - rendered.height, Math.round(cy - rendered.height / 2)));

      animLayers.push({
        id: k,
        imagePath: txtFile,
        width: rendered.width,
        height: rendered.height,
        targetX,
        targetY,
        type: k as any,
      });
    }
  }

  // Add Decorations / Custom Stickers / Added Shapes & Images
  const effectiveDecors: any[] = (options as any).decorations || options.layers?.decors || (options.layers as any)?.decorations || [];
  const decorLayersForComposite: Array<{ buffer: Buffer; width: number; height: number; cx: number; cy: number }> = [];
  if (Array.isArray(effectiveDecors) && effectiveDecors.length > 0) {
    for (let i = 0; i < effectiveDecors.length; i++) {
      const dec = effectiveDecors[i];
      if (dec.hidden || !dec.url) continue;
      try {
        const decBuf = await resolveAssetBuffer(dec.url);
        if (decBuf) {
          const baseDim = Math.min(width, height);
          const decSize = Math.max(20, Math.round(baseDim * ((dec.size || 15) / 100)));
          let resized = await sharp(decBuf)
            .resize(decSize, decSize, { fit: 'inside', withoutEnlargement: false })
            .png()
            .toBuffer();

          if (dec.shape === 'circle' || (typeof dec.borderRadius === 'number' && dec.borderRadius > 0)) {
            const dMeta = await sharp(resized).metadata();
            const dW = dMeta.width || decSize;
            const dH = dMeta.height || decSize;
            const dMin = Math.min(dW, dH);
            const dRadius = dec.shape === 'circle' || dec.borderRadius === 50
              ? Math.round(dMin / 2)
              : Math.round(dMin * ((dec.borderRadius || 15) / 100));
            const dMask = Buffer.from(`
              <svg width="${dW}" height="${dH}" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="${dW}" height="${dH}" rx="${dRadius}" ry="${dRadius}" fill="#fff"/>
              </svg>
            `);
            resized = await sharp(resized).composite([{ input: dMask, blend: 'dest-in' }]).png().toBuffer();
          }
          const meta = await sharp(resized).metadata();
          const dw = meta.width || decSize;
          const dh = meta.height || decSize;
          const cx = Math.round((dec.x ?? 0.5) * width);
          const cy = Math.round((dec.y ?? 0.5) * height);
          decorLayersForComposite.push({ buffer: resized, width: dw, height: dh, cx, cy });
          const decFile = join(tempWorkDir, `decor_${i}_${safeRatioSlug}.png`);
          await writeFile(decFile, resized);
          filesToCleanup.push(decFile);
          const targetX = Math.max(0, Math.min(width - dw, Math.round(cx - dw / 2)));
          const targetY = Math.max(0, Math.min(height - dh, Math.round(cy - dh / 2)));
          animLayers.push({
            id: `decor_${i}`,
            imagePath: decFile,
            width: dw,
            height: dh,
            targetX,
            targetY,
            type: 'decor',
          });
        }
      } catch (decErr) {
        console.warn(`[renderer] Failed to render decor item ${i}:`, decErr);
      }
    }
  }

  // Prepare fallback composite frame
  const compositeBuffer = await compositeStillFrame({
    backgroundBuffer: bg,
    canvasW: width,
    canvasH: height,
    product: prodLayerData,
    logo: logoLayerData,
    textLayers: textLayersForComposite,
    decors: decorLayersForComposite,
  });

  const compositeFile = join(tempWorkDir, `composite_${safeRatioSlug}.png`);
  await writeFile(compositeFile, compositeBuffer);
  filesToCleanup.push(compositeFile);

  const outFileName = `${options.jobId}_${safeRatioSlug}.mp4`;
  const outFilePath = join(renderedDir, outFileName);

  // Resolve background music track (uploaded audio, preset, or default upbeat_retail)
  const musicTrack = resolveMusicTrack({
    customPath: sharedAssets.audioPath,
    musicPreset: options.musicPreset || options.musicFile,
  });

  // Render animated video with FFmpeg
  try {
    await encodeAnimatedOfferVideo({
      bgImagePath: bgFile,
      canvasW: width,
      canvasH: height,
      duration: options.duration || 10,
      fps: options.fps || 30,
      layers: animLayers,
      outputPath: outFilePath,
      audioPath: musicTrack,
      audioVolume: options.musicVolume ?? 70,
    });
  } catch (animErr) {
    console.warn(`[videoRenderer] Animated encode failed for ratio ${ratio}, falling back to still encode:`, animErr);
    await encodeStillVideo({
      compositePngPath: compositeFile,
      outputPath: outFilePath,
      duration: options.duration || 10,
      fps: options.fps || 30,
      audioPath: musicTrack,
      audioVolume: options.musicVolume ?? 70,
    });
  }

  // Cleanup temporary layer PNGs
  for (const f of filesToCleanup) {
    await unlink(f).catch(() => {});
  }

  const publicUrl = `/uploads/rendered/${outFileName}`;

  return {
    ratio,
    width,
    height,
    duration: options.duration || 10,
    file: outFileName,
    url: publicUrl,
    localPath: outFilePath,
  };
}

/**
 * Main video generation engine orchestrator.
 * Renders the primary video and optional aspect pack (9:16, 16:9, 1:1, 4:5).
 */
export async function renderOfferVideo(options: RenderOptions): Promise<RenderJobResult> {
  const result: RenderJobResult = {
    jobId: options.jobId,
    status: 'processing',
    videos: [],
    createdAt: new Date().toISOString(),
  };

  try {
    // 1. Resolve product asset
    let productBuffer: Buffer | null = null;
    if (options.files.productBuffer) {
      productBuffer = options.files.productBuffer;
    } else if (options.files.productUrl) {
      productBuffer = await fetchUrlToBuffer(options.files.productUrl);
    }

    // 2. Resolve background asset
    let bgBuffer: Buffer | null = null;
    if (options.files.backgroundBuffer) {
      bgBuffer = options.files.backgroundBuffer;
    } else if (options.files.backgroundUrl) {
      bgBuffer = await resolveAssetBuffer(options.files.backgroundUrl);
    }

    // Ratio-specific background resolver
    const resolveBgForRatio = async (r: AspectRatio | string): Promise<Buffer | null> => {
      if (options.aspectBackgrounds && options.aspectBackgrounds[r]) {
        const ratioBuf = await resolveAssetBuffer(options.aspectBackgrounds[r]);
        if (ratioBuf) return ratioBuf;
      }
      return bgBuffer;
    };

    // 3. Resolve logo asset
    let logoBuffer: Buffer | null = null;
    if (options.files.logoBuffer) {
      logoBuffer = options.files.logoBuffer;
    }

    const sharedAssets = {
      productBuffer,
      bgBuffer,
      logoBuffer,
      audioPath: options.files.musicPath,
    };

    const primaryRatio = (options.ratio as AspectRatio) || '16:9';

    // Helper to resolve layers for each aspect ratio
    const resolveRatioLayers = (r: AspectRatio | string) => {
      // 1. Ratio-specific layers from template aspectStore (e.g. 16:9, 9:16, 1:1, 4:5)
      const ratioLayers = options.aspectStore && options.aspectStore[r];
      if (ratioLayers && Object.keys(ratioLayers).length > 0) {
        return ratioLayers;
      }
      // 2. Default layers from options.layers
      return options.layers || {};
    };

    // Resolve layers for primary ratio
    const primaryLayers = resolveRatioLayers(primaryRatio);
    const primaryOpts: RenderOptions = { ...options, layers: primaryLayers };

    // 4. Render Primary Video (default 16:9)
    const primaryBg = await resolveBgForRatio(primaryRatio);
    const primaryAssets = { ...sharedAssets, bgBuffer: primaryBg };
    const primaryVideo = await renderSingleAspect(primaryRatio, primaryOpts, primaryAssets);
    result.primaryVideo = primaryVideo;
    result.videos.push(primaryVideo);

    // 5. Render all 4 aspect ratios: '16:9', '9:16', '1:1', '4:5'
    const allRatios: AspectRatio[] = ['16:9', '9:16', '1:1', '4:5'];
    const siblingRatios = allRatios.filter((r) => r !== primaryRatio);

    if (options.batchSpawn !== false) {
      for (const sibRatio of siblingRatios) {
        try {
          const sibLayers = resolveRatioLayers(sibRatio);
          const sibOpts: RenderOptions = { ...options, layers: sibLayers };
          const sibBg = await resolveBgForRatio(sibRatio);
          const sibAssets = { ...sharedAssets, bgBuffer: sibBg };
          const sibVideo = await renderSingleAspect(sibRatio, sibOpts, sibAssets);
          result.videos.push(sibVideo);
        } catch (sibErr) {
          console.warn(`[videoRenderer] Sibling render failed for ratio ${sibRatio}:`, sibErr);
        }
      }
    }

    // Ensure 9:16 is ALWAYS generated: if not present in result.videos, render dedicated 9:16 template video
    const has916 = result.videos.some((v) => v.ratio === '9:16');
    if (!has916) {
      try {
        console.log(`[videoRenderer] 9:16 missing from sibling batch, rendering dedicated 9:16 layout video...`);
        const sibLayers = resolveRatioLayers('9:16');
        const sibOpts: RenderOptions = { ...options, layers: sibLayers };
        const sibBg = await resolveBgForRatio('9:16');
        const sibAssets = { ...sharedAssets, bgBuffer: sibBg };
        const sibVideo = await renderSingleAspect('9:16', sibOpts, sibAssets);
        result.videos.push(sibVideo);
        console.log(`[videoRenderer] Dedicated 9:16 template video successfully rendered for ${options.jobId}`);
      } catch (retryErr) {
        console.warn(`[videoRenderer] Dedicated 9:16 render attempt failed, using clean full-frame vertical crop:`, retryErr);
        const v169Base = result.videos.find((v) => v.ratio === '16:9') || primaryVideo;
        if (v169Base?.localPath && existsSync(v169Base.localPath)) {
          try {
            const renderedDir = join(process.cwd(), 'uploads', 'rendered');
            const outFileName = `${options.jobId}_9x16.mp4`;
            const outFilePath = join(renderedDir, outFileName);
            await runFfmpegCommand([
              '-y',
              '-i', v169Base.localPath,
              '-vf', 'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280',
              '-c:v', 'libx264',
              '-preset', 'ultrafast',
              '-crf', '23',
              '-pix_fmt', 'yuv420p',
              '-c:a', 'copy',
              '-shortest',
              outFilePath,
            ]);
            if (existsSync(outFilePath)) {
              result.videos.push({
                ratio: '9:16',
                width: 720,
                height: 1280,
                duration: v169Base.duration,
                file: outFileName,
                url: `/uploads/rendered/${outFileName}`,
                localPath: outFilePath,
              });
              console.log(`[videoRenderer] Clean vertical 9:16 crop generated for ${options.jobId}`);
            }
          } catch (fbErr) {
            console.warn(`[videoRenderer] Clean vertical 9:16 crop failed:`, fbErr);
          }
        }
      }
    }

    // Default primaryVideo to 16:9 if present and user did not explicitly override ratio
    if (!options.ratio || options.ratio === '16:9') {
      const v169 = result.videos.find((v) => v.ratio === '16:9');
      if (v169) {
        result.primaryVideo = v169;
      }
    }

    result.status = 'completed';
    result.message = 'Video rendering completed successfully';
    result.completedAt = new Date().toISOString();
  } catch (err: any) {
    result.status = 'failed';
    result.errorMessage = err?.message || 'Video rendering failed';
    console.error(`[videoRenderer] Job ${options.jobId} failed:`, err);
  }

  return result;
}
