import { writeFile, mkdir } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { queueRenderJob } from '@/lib/videoRenderer/renderService';
import { RenderInputFiles } from '@/lib/videoRenderer/types';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { toAbsoluteUrl } from '@/lib/urlHelper';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function resolveImageBufferOrUrl(val: any, inputFiles: RenderInputFiles, field: 'product' | 'background' | 'logo' | 'music') {
  if (!val || typeof val !== 'string') return;
  const str = val.trim();
  if (!str) return;

  if (str.startsWith('data:image/') || str.startsWith('data:audio/')) {
    const base64Data = str.split(',')[1];
    if (base64Data) {
      const buf = Buffer.from(base64Data, 'base64');
      if (field === 'product') inputFiles.productBuffer = buf;
      if (field === 'background') inputFiles.backgroundBuffer = buf;
      if (field === 'logo') inputFiles.logoBuffer = buf;
      if (field === 'music') inputFiles.musicBuffer = buf;
      return;
    }
  }

  // Check local file or public path or uploads directory first
  const clean = str.replace(/^\/+/, '');
  const candidates = [
    join(process.cwd(), clean),
    join(process.cwd(), 'uploads', clean.replace(/^uploads[\/\\]/, '')),
    join(process.cwd(), 'public', clean),
    join(process.cwd(), 'public', 'uploads', clean.replace(/^uploads[\/\\]/, '')),
    str,
  ];

  for (const cand of candidates) {
    if (existsSync(cand)) {
      try {
        const buf = readFileSync(cand);
        if (field === 'product') inputFiles.productBuffer = buf;
        if (field === 'background') inputFiles.backgroundBuffer = buf;
        if (field === 'logo') inputFiles.logoBuffer = buf;
        if (field === 'music') inputFiles.musicBuffer = buf;
        return;
      } catch {}
    }
  }

  if (str.startsWith('http://') || str.startsWith('https://')) {
    if (field === 'product') inputFiles.productUrl = str;
    if (field === 'background') inputFiles.backgroundUrl = str;
    if (field === 'logo') inputFiles.logoUrl = str;
    if (field === 'music') inputFiles.musicUrl = str;
    return;
  }

  // Fallback to URL string if nothing else matched
  if (field === 'product') inputFiles.productUrl = str;
  if (field === 'background') inputFiles.backgroundUrl = str;
  if (field === 'logo') inputFiles.logoUrl = str;
  if (field === 'music') inputFiles.musicUrl = str;
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let body: Record<string, any> = {};
    const inputFiles: RenderInputFiles = {};

    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData().catch(() => new FormData());

      for (const [key, value] of formData.entries()) {
        const lowerKey = key.toLowerCase();
        const isFileLike = value && typeof (value as any).arrayBuffer === 'function';
        if (isFileLike) {
          const fileObj: any = value;
          const ab = await fileObj.arrayBuffer();
          const buf = Buffer.from(ab);
          if (buf.length > 0) {
            const fileName = fileObj.name || ('upload_' + Date.now() + '.png');
            const lowerFileName = fileName.toLowerCase();
            const isBg = lowerKey.includes('bg') || lowerKey.includes('background') || lowerFileName.includes('background');
            const isLogo = lowerKey.includes('logo') || lowerFileName.includes('logo');
            const isMusic = lowerKey.includes('music') || lowerKey.includes('audio') || lowerKey.includes('sound') || lowerFileName.endsWith('.mp3') || lowerFileName.endsWith('.wav');
            const isDecor = lowerKey.includes('decor');

            const safeSubdir = isBg
              ? 'backgrounds'
              : isLogo
              ? 'logo'
              : isMusic
              ? 'music'
              : 'products';

            const targetUploadDir = join(process.cwd(), 'uploads', safeSubdir);
            if (!existsSync(targetUploadDir)) {
              await mkdir(targetUploadDir, { recursive: true });
            }
            const sanitizedFilename = Date.now() + '_' + fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
            const savedFilePath = join(targetUploadDir, sanitizedFilename);
            await writeFile(savedFilePath, buf);
            const localSavedUrl = '/uploads/' + safeSubdir + '/' + sanitizedFilename;

            if (isBg) {
              inputFiles.backgroundBuffer = buf;
              inputFiles.backgroundUrl = localSavedUrl;
            } else if (isLogo) {
              inputFiles.logoBuffer = buf;
              inputFiles.logoUrl = localSavedUrl;
            } else if (isMusic) {
              inputFiles.musicBuffer = buf;
              inputFiles.musicUrl = localSavedUrl;
            } else if (isDecor) {
              if (!inputFiles.decorations) inputFiles.decorations = [];
              inputFiles.decorations.push({ buffer: buf });
            } else {
              // Manual local file upload for product image (keys: product, file, image, photo, upload, etc.)
              inputFiles.productBuffer = buf;
              inputFiles.productUrl = localSavedUrl;
              console.log('[create-video] Manually selected local product file received: ' + fileName + ' (' + buf.length + ' bytes) -> ' + localSavedUrl);
            }
          }
        } else if (typeof value === 'string') {
          body[key] = value;
        }
      }
    } else {
      body = await req.json().catch(() => ({}));
    }

    const templateId = body.template_id || body.templateId || '1';

    // Support all common parameter aliases for product image
    const rawProductVal =
      body.product_url ||
      body.productUrl ||
      body.product_image_url ||
      body.productImageUrl ||
      body.product_image ||
      body.productImage ||
      body.image_url ||
      body.imageUrl ||
      body.image ||
      body.product ||
      body.url ||
      '';

    if (rawProductVal && !inputFiles.productBuffer) {
      resolveImageBufferOrUrl(rawProductVal, inputFiles, 'product');
    }

    // Support background aliases
    const rawBgVal =
      body.background_url ||
      body.backgroundUrl ||
      body.background_image_url ||
      body.backgroundImageUrl ||
      body.background_image ||
      body.backgroundImage ||
      body.background ||
      body.bg_url ||
      '';

    if (rawBgVal && !inputFiles.backgroundBuffer) {
      resolveImageBufferOrUrl(rawBgVal, inputFiles, 'background');
    }

    // Support logo aliases
    const rawLogoVal =
      body.logo_url ||
      body.logoUrl ||
      body.logo_image_url ||
      body.logo ||
      body.store_logo ||
      body.storeLogo ||
      '';

    if (rawLogoVal && !inputFiles.logoBuffer) {
      resolveImageBufferOrUrl(rawLogoVal, inputFiles, 'logo');
    }

    // Support music / audio aliases
    const rawMusicVal =
      body.music_url ||
      body.musicUrl ||
      body.audio_url ||
      body.audioUrl ||
      body.music ||
      body.audio ||
      '';

    if (rawMusicVal && !inputFiles.musicBuffer) {
      resolveImageBufferOrUrl(rawMusicVal, inputFiles, 'music');
    }

    // 3rd Priority: Template constant/saved product image fallback
    if (!inputFiles.productBuffer && !inputFiles.productUrl && templateId) {
      try {
        const { connectToDatabase } = await import('@/lib/db');
        await connectToDatabase();
        const VideoTemplate = (await import('@/models/VideoTemplate')).default;
        const numId = Number(templateId);
        const tplDoc = await VideoTemplate.findOne({
          $or: [
            ...(!isNaN(numId) ? [{ templateId: numId }] : []),
            { templateId: String(templateId) },
          ]
        }).lean();
        const tplProd = (tplDoc as any)?.productUrl || (tplDoc?.layers as any)?.product?.url || (tplDoc?.layers as any)?.product?.image;
        if (tplProd) {
          console.log('[create-video] Using template ' + templateId + ' constant product image: ' + tplProd);
          resolveImageBufferOrUrl(tplProd, inputFiles, 'product');
        }
      } catch (tErr) {
        console.warn('[create-video] Could not load template product image:', tErr);
      }
    }

    // 4th Priority: Default sample product fallback from uploads/products or public/images
    if (!inputFiles.productBuffer && !inputFiles.productUrl) {
      const defaultProdCandidates = [
        join(process.cwd(), 'uploads', 'products', 'ai_openai_1793077865909_b35ca0c0.png'),
        join(process.cwd(), 'uploads', 'products', 'ai_openai_1792999641981_213ba36b.png'),
        join(process.cwd(), 'uploads', 'products', 'default_product.png'),
        join(process.cwd(), 'public', 'images', 'default_product.png'),
      ];
      for (const cand of defaultProdCandidates) {
        if (existsSync(cand)) {
          try {
            inputFiles.productBuffer = readFileSync(cand);
            inputFiles.productUrl = '/uploads/products/' + cand.split(/[\\/]/).pop();
            console.log('[create-video] Using fallback sample product image: ' + cand);
            break;
          } catch {}
        }
      }
    }

    if (!inputFiles.productBuffer && !inputFiles.productUrl) {
      return NextResponse.json(
        {
          success: false,
          message: 'Product image is required. Provide product_url, product_image_url, image_url, or upload as "product" file in form-data.',
        },
        { status: 422 }
      );
    }

    const ratio = body.ratio || body.aspect_ratio || body.aspectRatio || '16:9';
    const resolution = Number(body.resolution) || 720;
    const rawDur = body.duration ?? body.videoDuration ?? body.video_duration;
    const duration = rawDur ? Number(rawDur) : undefined;
    const fps = Number(body.fps) || 30;

    const musicPreset = body.music_preset || body.musicPreset || body.audio_preset || body.audioPreset || body.preset || '';
    const musicVolume = Number(body.music_volume || body.musicVolume || body.volume || 70);

    const headline =
      body.headline ||
      body.product_title ||
      body.productTitle ||
      body.title ||
      body.tagline ||
      '';

    const discount =
      body.discount ||
      body.discount_percentage ||
      body.discountPercentage ||
      body.offer ||
      body.offer_percentage ||
      body.offerPercentage ||
      '';

    const description =
      body.description ||
      body.caption ||
      body.product_description ||
      body.productDescription ||
      body.subtitle ||
      body.text ||
      '';

    const validity =
      body.validity ||
      body.validity_text ||
      body.validityText ||
      body.offer_validity ||
      body.expiry ||
      '';

    const footer =
      body.footer ||
      body.footer_text ||
      body.terms ||
      body.disclaimer ||
      '*T&C Apply · StoreSparc';

    const rawChannels = body.channels || body.socialMedia || body.share || body.shareTo || [];
    let channelsList: string[] = [];
    if (Array.isArray(rawChannels)) {
      channelsList = rawChannels.map((c: any) => String(c).trim().toLowerCase()).filter(Boolean);
    } else if (typeof rawChannels === 'string') {
      try {
        const parsed = JSON.parse(rawChannels);
        if (Array.isArray(parsed)) {
          channelsList = parsed.map((c: any) => String(c).trim().toLowerCase()).filter(Boolean);
        } else {
          channelsList = [String(rawChannels).trim().toLowerCase()].filter(Boolean);
        }
      } catch {
        channelsList = rawChannels.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
      }
    }

    const offerId = body.offerId || body.offer_id || body.offerid || '';
    const userId = body.userId || body.user_id || body.userid || body.storeUserId || '';
    const voiceoverScript =
      body.voiceoverScript ||
      body.voiceover_script ||
      body.script ||
      body.voiceover ||
      description ||
      headline ||
      '';

    const queued = await queueRenderJob({
      layers: body.layers || undefined,
      aspectStore: body.aspect_store || body.aspectStore || undefined,
      aspectBackgrounds: body.aspect_backgrounds || body.aspectBackgrounds || undefined,
      decorations: body.decorations || undefined,
      templateId,
      ratio,
      resolution,
      duration,
      fps,
      musicPreset: musicPreset || undefined,
      musicVolume,
      files: inputFiles,
      text: {
        headline,
        discount,
        description,
        validity,
        footer,
        tagline: body.tagline || '',
        price: body.price || '',
        oldPrice: body.old_price || body.oldPrice || '',
        cta: body.cta || body.cta_text || '',
      },
      title: body.title || headline || 'Generated Promo Video',
      userId,
      offerId,
      channels: channelsList,
      voiceoverScript,
      batchSpawn: body.batch_spawn !== '0' && body.batch_spawn !== 0,
    });

    const activePreset = musicPreset || (inputFiles.musicBuffer || inputFiles.musicUrl ? 'custom' : 'upbeat_retail');

    return NextResponse.json(
      {
        success: true,
        async: true,
        status: 'queued',
        job_id: queued.jobId,
        jobId: queued.jobId,
        videoId: queued.jobId,
        status_url: toAbsoluteUrl(queued.statusUrl, req),
        template_id: templateId,
        templateId: templateId,
        offerId,
        channels: channelsList,
        voiceoverScript,
        ratio,
        animation: {
          enabled: true,
          style: 'dynamic_retail',
          features: [
            'smooth_slide_up_product',
            'floating_hover_3d',
            'pop_in_discount_badge',
            'staggered_headline_reveal',
            'cta_urgency_pulse',
          ],
        },
        audio: {
          preset_applied: activePreset,
          volume: musicVolume,
          available_presets: ['upbeat_retail', 'energetic_sale', 'modern_store', 'luxury_minimal', 'none'],
        },
        message: `Video queued. Poll result at GET /api/external/get-video?jobId=${queued.jobId}`,
      },
      { status: 202 }
    );

  } catch (err: any) {
    console.error('[POST /api/external/video] Error:', err);
    return NextResponse.json(
      {
        success: false,
        message: err?.message || 'Failed to queue video render job',
      },
      { status: 500 }
    );
  }
}
