import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { stat } from 'fs/promises';
import { join } from 'path';

/**
 * Resolve FFmpeg binary path without Webpack dynamic require issues.
 * Checks environment variable, node_modules binary path, Windows paths, or system PATH.
 */
export function getFfmpegPath(): string {
  if (process.env.FFMPEG_PATH && existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }

  const binaryName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const platformPkg = `${process.platform}-${process.arch}`;

  // Check node_modules binary directly without requiring the dynamic JS module
  const localCandidates = [
    join(process.cwd(), 'node_modules', '@ffmpeg-installer', platformPkg, binaryName),
    join(process.cwd(), 'node_modules', '@ffmpeg-installer', 'win32-x64', 'ffmpeg.exe'),
    join(process.cwd(), '..', 'node_modules', '@ffmpeg-installer', platformPkg, binaryName),
  ];

  for (const c of localCandidates) {
    if (existsSync(c)) {
      return c;
    }
  }

  // Windows standard paths fallback
  if (process.platform === 'win32') {
    const winCandidates = [
      'C:\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
      'C:\\xampp\\ffmpeg\\bin\\ffmpeg.exe',
    ];
    for (const c of winCandidates) {
      if (existsSync(c)) return c;
    }
  }

  return binaryName;
}

/**
 * Run a process and capture stdout / stderr.
 */
export function runFfmpegCommand(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const ffmpeg = getFfmpegPath();
    const proc = spawn(ffmpeg, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';
    let stdout = '';

    proc.stdout.on('data', (d) => {
      stdout += d.toString();
    });

    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`FFmpeg failed with exit code ${code}:\n${stderr || stdout}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn FFmpeg at '${ffmpeg}': ${err.message}`));
    });
  });
}

/**
 * Resolve background music track path.
 * Checks custom uploaded path, preset name, or defaults to upbeat_retail.mp3.
 */
export function resolveMusicTrack(params: {
  customPath?: string;
  musicPreset?: string;
}): string | undefined {
  if (params.musicPreset === 'none' || params.customPath === 'none') {
    return undefined;
  }

  if (params.customPath && existsSync(params.customPath)) {
    return params.customPath;
  }

  const presetName = (params.musicPreset || 'upbeat_retail').replace('.mp3', '');
  const presetFile = join(process.cwd(), 'public', 'audio', 'presets', `${presetName}.mp3`);
  if (existsSync(presetFile)) {
    return presetFile;
  }

  // Fallback to upbeat_retail.mp3
  const defaultFile = join(process.cwd(), 'public', 'audio', 'presets', 'upbeat_retail.mp3');
  if (existsSync(defaultFile)) {
    return defaultFile;
  }

  return undefined;
}

export interface AnimatedLayerItem {
  id: string;
  imagePath: string;
  width: number;
  height: number;
  targetX: number; // top-left X in canvas
  targetY: number; // top-left Y in canvas
  type: 'product' | 'discount' | 'headline' | 'description' | 'validity' | 'footer' | 'logo' | 'decor' | 'price' | 'oldPrice' | 'cta' | 'storeName' | 'qrCode' | string;
}

export interface EncodeAnimatedVideoParams {
  bgImagePath: string;
  canvasW: number;
  canvasH: number;
  duration?: number;
  fps?: number;
  layers: AnimatedLayerItem[];
  outputPath: string;
  audioPath?: string;
  audioVolume?: number; // 0 - 100
}

/**
 * Encode an animated commercial offer video with staggered dynamic entrances,
 * smooth easing motions, floating hover effects, and background music.
 */
export async function encodeAnimatedOfferVideo(
  params: EncodeAnimatedVideoParams
): Promise<{ outputPath: string; size: number }> {
  const {
    bgImagePath,
    canvasW,
    canvasH,
    duration = 10,
    fps = 30,
    layers,
    outputPath,
    audioPath,
    audioVolume = 70,
  } = params;

  const dur = Math.max(3, Math.min(60, Number(duration) || 10));
  const rate = Math.max(1, Math.min(60, Number(fps) || 30));

  const validLayers = layers.filter((l) => l.imagePath && existsSync(l.imagePath));

  // Build input args
  const args: string[] = ['-y', '-hide_banner', '-loglevel', 'error'];

  // Input 0: Background image
  args.push('-loop', '1', '-framerate', String(rate), '-t', String(dur), '-i', bgImagePath);

  // Input 1..N: Layer images
  for (const layer of validLayers) {
    args.push('-loop', '1', '-framerate', String(rate), '-t', String(dur), '-i', layer.imagePath);
  }

  // Audio input
  const hasAudio = audioPath && existsSync(audioPath);
  let audioInputIdx = -1;
  if (hasAudio) {
    audioInputIdx = 1 + validLayers.length;
    args.push('-stream_loop', '-1', '-t', String(dur), '-i', audioPath);
  }

  // Build Filter Graph
  const filterParts: string[] = [];
  let currentStream = '[0:v]';

  validLayers.forEach((layer, idx) => {
    const inputIdx = idx + 1;
    const fadeOutLabel = `[v${inputIdx}_faded]`;
    const nextStream = `[v_out_${inputIdx}]`;

    const tx = Math.round(layer.targetX);
    const ty = Math.round(layer.targetY);

    if (layer.type === 'product') {
      // Product entrance: smooth slide-up from bottom, then STAYS COMPLETELY STEADY (no jerking/wobbling)
      const offset = Math.round(canvasH * 0.18);
      filterParts.push(
        `[${inputIdx}:v]format=yuva420p,fade=t=in:st=0.15:d=0.35:alpha=1${fadeOutLabel}`
      );
      // t < 0.8 -> smooth cubic deceleration into position; t >= 0.8 -> perfectly steady at target Y
      const yExpr = `if(lt(t,0.8),${ty}+${offset}*pow(1-min(max((t-0.15)/0.65,0),1),3),${ty})`;
      filterParts.push(
        `${currentStream}${fadeOutLabel}overlay=x=${tx}:y='${yExpr}':enable='gte(t,0.15)'${nextStream}`
      );
    } else if (layer.type === 'discount') {
      // Discount / Retail Offer Badge tag entrance: dynamic pop-in & drop right as product settles
      filterParts.push(
        `[${inputIdx}:v]format=yuva420p,fade=t=in:st=0.65:d=0.3:alpha=1${fadeOutLabel}`
      );
      // Energetic spring pop dampening from top-left, then stays rock steady at target Y
      const yExpr = `if(lt(t,1.05),${ty}-35*pow(1-min(max((t-0.65)/0.4,0),1),2)+10*sin(3.14159*min(max((t-0.65)/0.4,0),1))*exp(-2.5*min(max((t-0.65)/0.4,0),1)),${ty})`;
      filterParts.push(
        `${currentStream}${fadeOutLabel}overlay=x=${tx}:y='${yExpr}':enable='gte(t,0.65)'${nextStream}`
      );
    } else if (layer.type === 'headline') {
      // Headline entrance: smooth slide-up reveal & fade at t=1.05s
      filterParts.push(
        `[${inputIdx}:v]format=yuva420p,fade=t=in:st=1.05:d=0.35:alpha=1${fadeOutLabel}`
      );
      const yExpr = `if(lt(t,1.5),${ty}+24*pow(1-min(max((t-1.05)/0.45,0),1),3),${ty})`;
      filterParts.push(
        `${currentStream}${fadeOutLabel}overlay=x=${tx}:y='${yExpr}':enable='gte(t,1.05)'${nextStream}`
      );
    } else if (layer.type === 'description') {
      // Description entrance: smooth slide-up reveal & fade at t=1.45s
      filterParts.push(
        `[${inputIdx}:v]format=yuva420p,fade=t=in:st=1.45:d=0.35:alpha=1${fadeOutLabel}`
      );
      const yExpr = `if(lt(t,1.9),${ty}+18*pow(1-min(max((t-1.45)/0.45,0),1),3),${ty})`;
      filterParts.push(
        `${currentStream}${fadeOutLabel}overlay=x=${tx}:y='${yExpr}':enable='gte(t,1.45)'${nextStream}`
      );
    } else if (layer.type === 'price' || layer.type === 'oldPrice') {
      // Price tag entrance: dynamic commercial pop-in at t=1.85s
      filterParts.push(
        `[${inputIdx}:v]format=yuva420p,fade=t=in:st=1.85:d=0.3:alpha=1${fadeOutLabel}`
      );
      const yExpr = `if(lt(t,2.25),${ty}-20*pow(1-min(max((t-1.85)/0.4,0),1),2)+7*sin(3.14159*min(max((t-1.85)/0.4,0),1)),${ty})`;
      filterParts.push(
        `${currentStream}${fadeOutLabel}overlay=x=${tx}:y='${yExpr}':enable='gte(t,1.85)'${nextStream}`
      );
    } else if (layer.type === 'validity') {
      // Validity badge entrance: smooth slide-up at t=2.2s
      filterParts.push(
        `[${inputIdx}:v]format=yuva420p,fade=t=in:st=2.2:d=0.35:alpha=1${fadeOutLabel}`
      );
      const yExpr = `if(lt(t,2.6),${ty}+20*pow(1-min(max((t-2.2)/0.4,0),1),3),${ty})`;
      filterParts.push(
        `${currentStream}${fadeOutLabel}overlay=x=${tx}:y='${yExpr}':enable='gte(t,2.2)'${nextStream}`
      );
    } else if (layer.type === 'cta') {
      // CTA button entrance: high-impact commercial pop at t=2.5s
      filterParts.push(
        `[${inputIdx}:v]format=yuva420p,fade=t=in:st=2.5:d=0.35:alpha=1${fadeOutLabel}`
      );
      const yExpr = `if(lt(t,2.95),${ty}+26*pow(1-min(max((t-2.5)/0.45,0),1),2)-8*sin(3.14159*min(max((t-2.5)/0.45,0),1)),${ty})`;
      filterParts.push(
        `${currentStream}${fadeOutLabel}overlay=x=${tx}:y='${yExpr}':enable='gte(t,2.5)'${nextStream}`
      );
    } else if (layer.type === 'footer' || layer.type === 'qrCode') {
      // Footer / QR Code entrance: clean subtle fade at t=2.85s
      filterParts.push(
        `[${inputIdx}:v]format=yuva420p,fade=t=in:st=2.85:d=0.4:alpha=1${fadeOutLabel}`
      );
      filterParts.push(
        `${currentStream}${fadeOutLabel}overlay=x=${tx}:y=${ty}:enable='gte(t,2.85)'${nextStream}`
      );
    } else if (layer.type === 'logo' || layer.type === 'storeName') {
      // Store logo / name entrance: smooth subtle slide-down at t=0.05s
      filterParts.push(
        `[${inputIdx}:v]format=yuva420p,fade=t=in:st=0.05:d=0.3:alpha=1${fadeOutLabel}`
      );
      const yExpr = `if(lt(t,0.35),${ty}-15*pow(1-min(max((t-0.05)/0.3,0),1),2),${ty})`;
      filterParts.push(
        `${currentStream}${fadeOutLabel}overlay=x=${tx}:y='${yExpr}':enable='gte(t,0.05)'${nextStream}`
      );
    } else {
      // Generic decor / stickers or custom layers: pop in with badge at t=0.75s
      filterParts.push(
        `[${inputIdx}:v]format=yuva420p,fade=t=in:st=0.75:d=0.35:alpha=1${fadeOutLabel}`
      );
      filterParts.push(
        `${currentStream}${fadeOutLabel}overlay=x=${tx}:y=${ty}:enable='gte(t,0.75)'${nextStream}`
      );
    }

    currentStream = nextStream;
  });

  if (filterParts.length > 0) {
    args.push('-filter_complex', filterParts.join(';'));
    args.push('-map', currentStream);
  } else {
    args.push('-map', '0:v:0');
  }

  // Audio mapping & volume + end fade-out
  if (hasAudio && audioInputIdx > 0) {
    const vol = Math.max(0, Math.min(100, Number(audioVolume) || 70)) / 100;
    const fadeOutStart = Math.max(1, dur - 1.5).toFixed(2);
    args.push(
      '-map',
      `${audioInputIdx}:a:0`,
      '-af',
      `volume=${vol.toFixed(2)},afade=t=out:st=${fadeOutStart}:d=1.5`,
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-ar',
      '44100',
      '-ac',
      '2',
      '-shortest'
    );
  }

  // Video codec args
  args.push(
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outputPath
  );

  await runFfmpegCommand(args);

  const fileInfo = await stat(outputPath);
  if (fileInfo.size < 1000) {
    throw new Error('FFmpeg animated render completed but file size is invalid (< 1KB).');
  }

  return { outputPath, size: fileInfo.size };
}

/**
 * Encode a static composite PNG into an MP4 video with optional audio track (fallback).
 */
export async function encodeStillVideo(params: {
  compositePngPath: string;
  outputPath: string;
  duration?: number;
  fps?: number;
  audioPath?: string;
  audioVolume?: number;
}): Promise<{ outputPath: string; size: number }> {
  const {
    compositePngPath,
    outputPath,
    duration = 10,
    fps = 30,
    audioPath,
    audioVolume = 70,
  } = params;

  const dur = Math.max(2, Math.min(60, Number(duration) || 10));
  const rate = Math.max(1, Math.min(60, Number(fps) || 30));

  const args: string[] = [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-loop',
    '1',
    '-framerate',
    String(rate),
    '-t',
    String(dur),
    '-i',
    compositePngPath,
  ];

  const hasAudio = audioPath && existsSync(audioPath);
  if (hasAudio) {
    const vol = Math.max(0, Math.min(100, Number(audioVolume) || 70)) / 100;
    const fadeOutStart = Math.max(1, dur - 1.5).toFixed(2);
    args.push(
      '-stream_loop',
      '-1',
      '-t',
      String(dur),
      '-i',
      audioPath,
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-af',
      `volume=${vol.toFixed(2)},afade=t=out:st=${fadeOutStart}:d=1.5`,
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-ar',
      '44100',
      '-ac',
      '2',
      '-shortest'
    );
  } else {
    args.push('-map', '0:v:0');
  }

  args.push(
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-tune',
    'stillimage',
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outputPath
  );

  await runFfmpegCommand(args);

  const fileInfo = await stat(outputPath);
  if (fileInfo.size < 1000) {
    throw new Error('FFmpeg completed but resulting video file is invalid (< 1KB).');
  }

  return { outputPath, size: fileInfo.size };
}
