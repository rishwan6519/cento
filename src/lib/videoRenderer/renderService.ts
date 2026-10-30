import { v4 as uuidv4 } from 'uuid';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { RenderOptions, RenderJobResult } from './types';
import { renderOfferVideo } from './renderer';
import { connectToDatabase } from '@/lib/db';
import VideoTemplate from '@/models/VideoTemplate';
import CloudbasesJob from '@/models/CloudbasesJob';
import MediaItemModel from '@/models/MediaItems';
import User from '@/models/User';
import mongoose from 'mongoose';

// In-memory job state cache
const inMemoryJobs = new Map<string, RenderJobResult>();

function getJobDir(jobId: string): string {
  return join(process.cwd(), 'uploads', 'temp', 'render_jobs', jobId);
}

/**
 * Persist job state to in-memory map AND disk JSON file for multi-worker consistency.
 */
async function persistJobState(jobId: string, state: RenderJobResult) {
  inMemoryJobs.set(jobId, state);
  try {
    const dir = getJobDir(jobId);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    await writeFile(join(dir, 'status.json'), JSON.stringify(state, null, 2));
  } catch (err) {
    console.warn(`[renderService] Failed to write status.json for job ${jobId}:`, err);
  }
}

/**
 * Helper to fetch a remote URL into Buffer.
 */
async function fetchRemoteBuffer(url: string): Promise<Buffer | null> {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Local file check
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
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
        try {
          return await readFile(cand);
        } catch {}
      }
    }
    return null;
  }

  try {
    const res = await fetch(trimmed);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch (err) {
    console.warn(`[renderService] Failed to download URL: ${url}`, err);
    return null;
  }
}

/**
 * Read job state from in-memory cache or disk JSON or MongoDB.
 */
export async function getRenderJob(jobId: string): Promise<RenderJobResult | null> {
  // Check disk status.json first for guaranteed multi-worker consistency
  try {
    const statusFile = join(getJobDir(jobId), 'status.json');
    if (existsSync(statusFile)) {
      const content = await readFile(statusFile, 'utf8');
      const parsed = JSON.parse(content);
      inMemoryJobs.set(jobId, parsed);
      return parsed;
    }
  } catch (err) {
    // ignore
  }

  if (inMemoryJobs.has(jobId)) {
    return inMemoryJobs.get(jobId)!;
  }

  // Check MongoDB CloudbasesJob
  try {
    await connectToDatabase();
    const cloudJob = await CloudbasesJob.findOne({ jobId }).lean();
    if (cloudJob) {
      const resData = (cloudJob.resultData as any) || {};
      const status = cloudJob.status as 'queued' | 'processing' | 'completed' | 'failed';
      const jobResult: RenderJobResult = {
        jobId,
        status,
        videos: resData.videos || [],
        primaryVideo: resData.primaryVideo,
        message: cloudJob.errorMessage || (status === 'completed' ? 'Rendering completed' : 'Processing'),
        createdAt: cloudJob.createdAt ? new Date(cloudJob.createdAt).toISOString() : new Date().toISOString(),
      };
      inMemoryJobs.set(jobId, jobResult);
      return jobResult;
    }
  } catch (err) {
    // ignore
  }

  return null;
}

/**
 * Queue and start an asynchronous video render job.
 */
export async function queueRenderJob(options: Omit<RenderOptions, 'jobId'> & { jobId?: string }): Promise<{
  jobId: string;
  status: string;
  statusUrl: string;
}> {
  const jobId = options.jobId || `cr_${uuidv4().replace(/-/g, '').slice(0, 16)}`;

  const fullOptions: RenderOptions = {
    ...options,
    jobId,
  };

  const initialResult: RenderJobResult = {
    jobId,
    status: 'queued',
    videos: [],
    templateId: fullOptions.templateId ? String(fullOptions.templateId) : undefined,
    offerId: fullOptions.offerId,
    userId: fullOptions.userId,
    channels: fullOptions.channels || [],
    voiceoverScript: fullOptions.voiceoverScript || fullOptions.text?.description || fullOptions.text?.tagline || fullOptions.text?.headline || '',
    message: 'Queued for rendering',
    createdAt: new Date().toISOString(),
  };

  await persistJobState(jobId, initialResult);

  // Background execution without blocking HTTP caller
  (async () => {
    let tplDoc: any = null;
    try {
      await persistJobState(jobId, { ...initialResult, status: 'processing', message: 'Rendering video frames...' });

      const jobDir = getJobDir(jobId);
      if (!existsSync(jobDir)) {
        await mkdir(jobDir, { recursive: true });
      }

      // Handle custom audio buffer if uploaded
      if (fullOptions.files.musicBuffer && !fullOptions.files.musicPath) {
        const customMusicPath = join(jobDir, 'uploaded_music.mp3');
        await writeFile(customMusicPath, fullOptions.files.musicBuffer);
        fullOptions.files.musicPath = customMusicPath;
      }

      // Handle custom audio URL if provided
      if (fullOptions.files.musicUrl && !fullOptions.files.musicPath) {
        const audioBuf = await fetchRemoteBuffer(fullOptions.files.musicUrl);
        if (audioBuf) {
          const dlMusicPath = join(jobDir, 'downloaded_music.mp3');
          await writeFile(dlMusicPath, audioBuf);
          fullOptions.files.musicPath = dlMusicPath;
        }
      }

      // If templateId provided, load template configuration from MongoDB
      if (fullOptions.templateId) {
        try {
          await connectToDatabase();
          const numId = Number(fullOptions.templateId);
          if (!isNaN(numId)) {
            tplDoc = await VideoTemplate.findOne({ templateId: numId }).lean();
          }
          if (!tplDoc && mongoose.Types.ObjectId.isValid(fullOptions.templateId)) {
            tplDoc = await VideoTemplate.findById(fullOptions.templateId).lean();
          }
          if (!tplDoc) {
            tplDoc = await VideoTemplate.findOne({
              $or: [{ _id: fullOptions.templateId }, { templateId: fullOptions.templateId }],
            }).lean();
          }

          if (tplDoc) {
            const targetRatio = fullOptions.ratio || tplDoc.aspectRatio || '16:9';
            fullOptions.ratio = targetRatio;
            if (tplDoc.aspectStore) {
              fullOptions.aspectStore = tplDoc.aspectStore;
            }
            if (tplDoc.aspectBackgrounds && !fullOptions.aspectBackgrounds) {
              fullOptions.aspectBackgrounds = tplDoc.aspectBackgrounds;
            }
            // If caller did not provide custom layers in request, use template default layers as fallback
            if (!fullOptions.layers && tplDoc.layers) {
              fullOptions.layers = tplDoc.layers;
            }
            const tplDur = Number(tplDoc.videoDuration || tplDoc.duration || tplDoc.video_duration);
            if (tplDur && (!fullOptions.duration || fullOptions.duration === 6)) {
              fullOptions.duration = tplDur;
            }
            if (!fullOptions.duration) {
              fullOptions.duration = 10;
            }
            const targetBg = (tplDoc.aspectBackgrounds && tplDoc.aspectBackgrounds[targetRatio]) || tplDoc.backgroundUrl;
            if (targetBg && !fullOptions.files.backgroundUrl && !fullOptions.files.backgroundBuffer) {
              fullOptions.files.backgroundUrl = targetBg;
            }
            if (tplDoc.logoUrl && !fullOptions.files.logoUrl && !fullOptions.files.logoBuffer) {
              fullOptions.files.logoUrl = tplDoc.logoUrl;
            }
            if (tplDoc.musicUrl && !fullOptions.files.musicPath) {
              fullOptions.files.musicPath = tplDoc.musicUrl;
            }
            if (tplDoc.decorations && !fullOptions.decorations) {
              fullOptions.decorations = tplDoc.decorations;
            }
          }
        } catch (tplErr) {
          console.warn(`[renderService] Could not load template ${fullOptions.templateId}:`, tplErr);
        }
      }

      const finalResult = await renderOfferVideo(fullOptions);
      await persistJobState(jobId, finalResult);

      // Save all generated videos (all 4 aspect ratios) to MongoDB MediaItemModel
      try {
        await connectToDatabase();

        // Resolve userId (from request, template owner, or fallback user)
        let targetUserId = fullOptions.userId;
        if (!targetUserId && tplDoc && tplDoc.storeUserId) {
          targetUserId = String(tplDoc.storeUserId);
        }
        if (!targetUserId) {
          try {
            const fallbackUser = await User.findOne({}).select('_id').lean();
            if (fallbackUser) {
              targetUserId = String(fallbackUser._id);
            }
          } catch (uErr) {
            console.warn('[renderService] Could not find fallback user:', uErr);
          }
        }

        // Save each generated video (all 4 aspect ratios) to the platform library
        if (targetUserId && finalResult.videos && finalResult.videos.length > 0) {
          const validUserObjId = mongoose.Types.ObjectId.isValid(targetUserId)
            ? new mongoose.Types.ObjectId(String(targetUserId))
            : targetUserId;

          finalResult.templateId = fullOptions.templateId ? String(fullOptions.templateId) : undefined;
          finalResult.offerId = fullOptions.offerId;
          finalResult.userId = targetUserId || fullOptions.userId;
          finalResult.channels = fullOptions.channels || [];
          finalResult.voiceoverScript = fullOptions.voiceoverScript || fullOptions.text?.description || fullOptions.text?.tagline || fullOptions.text?.headline || '';

          for (const vid of finalResult.videos) {
            try {
              const videoName = `Generated Promo Video (${vid.ratio}) – ${new Date().toLocaleString()}`;
              const mediaItem = new MediaItemModel({
                userId: validUserObjId,
                name: videoName,
                type: 'video',
                fileCategory: 'offer',
                url: vid.url,
                approvalStatus: 'approved',
                templateId: fullOptions.templateId ? String(fullOptions.templateId) : undefined,
                offerId: fullOptions.offerId,
                channels: fullOptions.channels || [],
                voiceoverScript: fullOptions.voiceoverScript || fullOptions.text?.description || fullOptions.text?.tagline || fullOptions.text?.headline || '',
                tagline: fullOptions.text?.tagline || '',
                ratio: vid.ratio,
                width: vid.width,
                height: vid.height,
                duration: vid.duration,
                jobId,
                createdAt: new Date(),
              });
              await mediaItem.save();
              (vid as any).mediaId = mediaItem._id.toString();
              (vid as any).name = videoName;
              console.log(`[renderService] Saved video (${vid.ratio}) to MediaItemModel: ${vid.url} (mediaId: ${mediaItem._id})`);
            } catch (saveItemErr) {
              console.warn(`[renderService] Failed to save mediaItem for ratio ${vid.ratio}:`, saveItemErr);
            }
          }
          await persistJobState(jobId, finalResult);

          // Update VideoTemplate with latest rendered video pack
          if (tplDoc && tplDoc._id && finalResult.videos && finalResult.videos.length > 0) {
            try {
              const primaryVid = finalResult.videos.find((v) => v.ratio === '16:9') || finalResult.primaryVideo || finalResult.videos[0];
              await VideoTemplate.findByIdAndUpdate(tplDoc._id, {
                $set: {
                  lastRenderedVideoUrl: primaryVid?.url,
                  renderedVideos: finalResult.videos.map(v => ({
                    url: v.url,
                    ratio: v.ratio,
                    file: v.file,
                    width: v.width,
                    height: v.height,
                    duration: v.duration,
                    title: fullOptions.title,
                    jobId,
                    createdAt: new Date(),
                  }))
                }
              });
              console.log(`[renderService] Successfully updated VideoTemplate (${tplDoc._id}) with rendered videos`);
            } catch (tplUpdateErr) {
              console.warn('[renderService] Failed to update VideoTemplate:', tplUpdateErr);
            }
          }
        }

        // Also update CloudbasesJob if it exists for this jobId
        const cloudJob = await CloudbasesJob.findOne({ jobId });
        if (cloudJob) {
          cloudJob.status = finalResult.status === 'completed' ? 'completed' : 'failed';
          const default16_9 = finalResult.videos.find((v) => v.ratio === '16:9') || finalResult.primaryVideo;
          cloudJob.resultData = {
            data: {
              status: finalResult.status,
              videos: finalResult.videos,
              url: default16_9?.url,
              file: default16_9?.file,
              ratio: default16_9?.ratio,
            },
            videos: finalResult.videos,
            primaryVideo: default16_9,
          };
          await cloudJob.save();
        }
      } catch (dbErr) {
        console.warn(`[renderService] MongoDB sync warning for job ${jobId}:`, dbErr);
      }
    } catch (err: any) {
      console.error(`[renderService] Background render failed for job ${jobId}:`, err);
      await persistJobState(jobId, {
        jobId,
        status: 'failed',
        videos: [],
        errorMessage: err?.message || 'Rendering failed',
        createdAt: initialResult.createdAt,
      });
    }
  })();

  return {
    jobId,
    status: 'queued',
    statusUrl: `/api/external/video/${jobId}`,
  };
}
