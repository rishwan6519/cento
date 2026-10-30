import { NextRequest, NextResponse } from 'next/server';
import { getRenderJob } from '@/lib/videoRenderer/renderService';
import { connectToDatabase } from '@/lib/db';
import MediaItemModel from '@/models/MediaItems';
import VideoJobModel from '@/models/VideoJob';
import mongoose from 'mongoose';
import { cleanupExpiredUnapprovedVideos } from '@/lib/videoCleanup';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Injects dynamic social media captions and hashtags tailored strictly to requested channels.
 */
function injectSocialCaptions(payload: Record<string, any>, channels: string[], baseText: string) {
  if (!channels || channels.length === 0) return;
  const rawText = (baseText || '').trim();
  const shortSnippet = rawText
    ? (rawText.length > 35 ? rawText.slice(0, 35) + '...' : rawText)
    : 'our exclusive offer';

  const wantsFacebook = channels.some((c) => String(c).toLowerCase() === 'facebook');
  const wantsInstagram = channels.some((c) => String(c).toLowerCase() === 'instagram');

  if (wantsFacebook) {
    payload.facebookCaptions = [
      `Check out our amazing offer: ${shortSnippet}. Visit us today and claim your discount! 🛍️`,
      `Incredible savings are here! Get your hands on this exclusive deal before it's gone. 🏃‍♂️💨`,
      `Time is ticking! ⏰ Grab ${shortSnippet} today and enjoy massive discounts. Don't let this slip away!`,
      `Premium quality, unbeatable prices! Dive into our latest offers featuring ${shortSnippet}. Click to learn more! 🌟`,
      `We've got a surprise for you! 🎁 Unlock special savings on ${shortSnippet}. Shop with us and elevate your lifestyle!`,
    ];
    payload.facebookHashTags = [
      '#SpecialOffer',
      '#BigSavings',
      '#ShopLocal',
      '#MegaSale',
      '#Deals',
      '#DiscountOffer',
      '#LimitedTime',
      '#HurryUp',
      '#FlashSale',
      '#PremiumQuality',
    ];
  }

  if (wantsInstagram) {
    payload.instagramCaptions = [
      `Upgrade your shopping experience with our exclusive deal! ✨ ${shortSnippet}. Link in bio to grab yours! 🛒💖`,
      `Trending now 🔥 Treat yourself to ${shortSnippet} and save big! Swipe up to shop the look! 🛍️✨`,
      `Your daily dose of savings! 💸 Discover the magic of ${shortSnippet} at unbeatable prices. Double tap if you love a good deal! ❤️`,
      `Level up your style with our premium collection! ✨ Score ${shortSnippet} today. Link in bio! 👗🎉`,
      `Because you deserve the best! 💖 Treat yourself to ${shortSnippet} with our limited-time offer. Shop now and thank us later! 🛒✨`,
    ];
    payload.instagramHashTags = [
      '#ExclusiveDeal',
      '#ShopNow',
      '#Discounts',
      '#Trending',
      '#MustHave',
      '#Style',
      '#OOTD',
      '#Fashion',
      '#Shopping',
      '#Sale',
    ];
  }
}

async function handleGetVideo(jobIdInput: string) {
  const jobId = (jobIdInput || '').trim();
  if (!jobId) {
    return NextResponse.json(
      { success: false, message: 'job_id or videoId is required' },
      { status: 400 }
    );
  }

  await connectToDatabase();

  let status = 'processing';
  let offerId = '';
  let templateId = '';
  let voiceoverScript = '';
  let channels: string[] = [];
  let rawVideos: any[] = [];
  let errorMessage = '';

  // 1. Check local video renderer job (in-memory or status.json)
  try {
    const renderJob = await getRenderJob(jobId);
    if (renderJob) {
      status = renderJob.status;
      if (renderJob.offerId) offerId = renderJob.offerId;
      if (renderJob.templateId) templateId = String(renderJob.templateId);
      if (renderJob.voiceoverScript) voiceoverScript = renderJob.voiceoverScript;
      if (renderJob.channels && renderJob.channels.length > 0) {
        channels = renderJob.channels.map((c: any) => String(c).trim().toLowerCase());
      }
      if (renderJob.videos && renderJob.videos.length > 0) {
        rawVideos = renderJob.videos;
      }
      if (renderJob.errorMessage) errorMessage = renderJob.errorMessage;
    }
  } catch (rErr) {
    console.warn('[get-video] renderService check error:', rErr);
  }

  // 2. Query MongoDB MediaItemModel for videos matching jobId or _id
  let mediaDocs: any[] = [];
  try {
    if (mongoose.Types.ObjectId.isValid(jobId)) {
      const byId = await MediaItemModel.findById(jobId).lean();
      if (byId) mediaDocs.push(byId);
    }
    const byJobId = await MediaItemModel.find({ jobId }).lean();
    if (byJobId && byJobId.length > 0) {
      for (const doc of byJobId) {
        if (!mediaDocs.some((m) => m._id.toString() === String((doc as any)._id))) {
          mediaDocs.push(doc);
        }
      }
    }
  } catch (mErr) {
    console.warn('[get-video] MediaItemModel query error:', mErr);
  }

  if (mediaDocs.length > 0) {
    status = 'completed';
    const primaryDoc = mediaDocs[0];
    if (!offerId && primaryDoc.offerId) offerId = primaryDoc.offerId;
    if (!templateId && primaryDoc.templateId) templateId = String(primaryDoc.templateId);
    if (!voiceoverScript && primaryDoc.voiceoverScript) voiceoverScript = primaryDoc.voiceoverScript;
    if (channels.length === 0 && primaryDoc.channels && primaryDoc.channels.length > 0) {
      channels = primaryDoc.channels.map((c: any) => String(c).trim().toLowerCase());
    }
  }

  // 3. Fallback to CloudbasesJobModel if any metadata is missing
  if (!offerId || !templateId || channels.length === 0) {
    try {
      const CloudbasesJobModel = (await import('@/models/CloudbasesJob')).default;
      const cloudJob = await CloudbasesJobModel.findOne({ jobId }).lean();
      if (cloudJob) {
        if (!offerId && cloudJob.offerId) offerId = cloudJob.offerId;
        if (!templateId && cloudJob.templateId) templateId = String(cloudJob.templateId);
        if (!voiceoverScript && cloudJob.voiceoverScript) voiceoverScript = cloudJob.voiceoverScript;
        if (channels.length === 0 && cloudJob.channels && cloudJob.channels.length > 0) {
          channels = cloudJob.channels.map((c: any) => String(c).trim().toLowerCase());
        }
        if (cloudJob.status === 'completed') status = 'completed';
        if (cloudJob.status === 'failed') {
          status = 'failed';
          errorMessage = cloudJob.errorMessage || 'Video generation failed';
        }
        if (cloudJob.resultData && (cloudJob.resultData as any).saved_videos) {
          for (const sv of (cloudJob.resultData as any).saved_videos) {
            if (!mediaDocs.some((m) => m.url === sv.url)) {
              mediaDocs.push({
                _id: sv.mediaId || new mongoose.Types.ObjectId(),
                url: sv.url,
                name: sv.name,
                ratio: sv.ratio || '16:9',
              });
            }
          }
        }
      }
    } catch {}
  }

  // 4. Fallback to VideoJobModel
  if (!offerId || !templateId || channels.length === 0) {
    try {
      const videoJob: any = await VideoJobModel.findOne({ $or: [{ videoId: jobId }, { jobId }] }).lean();
      if (videoJob) {
        if (!offerId && videoJob.offerId) offerId = videoJob.offerId;
        if (!templateId && videoJob.templateId) templateId = String(videoJob.templateId);
        if (!voiceoverScript && videoJob.voiceoverScript) voiceoverScript = videoJob.voiceoverScript;
        if (channels.length === 0 && videoJob.channels && videoJob.channels.length > 0) {
          channels = videoJob.channels.map((c: any) => String(c).trim().toLowerCase());
        }
        if (videoJob.status === 'completed') status = 'completed';
      }
    } catch {}
  }

  // 5. If not found in any source
  if (!rawVideos.length && mediaDocs.length === 0 && !offerId && !templateId && status !== 'completed' && status !== 'processing') {
    return NextResponse.json(
      { success: false, message: `No video generation job found with jobId '${jobId}'` },
      { status: 404 }
    );
  }

  // If still queued or processing
  if (status === 'queued' || status === 'processing') {
    return NextResponse.json({
      success: true,
      status: 'processing',
      jobId,
      message: 'Video is processing',
    });
  }

  if (status === 'failed') {
    return NextResponse.json({
      success: false,
      status: 'failed',
      jobId,
      message: errorMessage || 'Video generation failed.',
    });
  }

  // 6. Format videos array ensuring mediaId, url, name, ratio
  const formattedVideos: Array<{
    mediaId: string;
    url: string;
    name: string;
    ratio: string;
  }> = [];

  if (mediaDocs.length > 0) {
    for (const doc of mediaDocs) {
      formattedVideos.push({
        mediaId: doc._id.toString(),
        url: doc.url,
        name: doc.name || `Generated Promo Video (${doc.ratio || '16:9'}) – ${new Date(doc.createdAt || Date.now()).toLocaleString()}`,
        ratio: doc.ratio || '16:9',
      });
    }
  } else if (rawVideos.length > 0) {
    const User = (await import('@/models/User')).default;
    const fallbackUser = await User.findOne({}).select('_id').lean().catch(() => null);

    for (const v of rawVideos) {
      let resolvedMediaId = v.mediaId || '';
      let videoName = v.name || `Generated Promo Video (${v.ratio || '16:9'}) – ${new Date().toLocaleString()}`;

      if (!resolvedMediaId) {
        try {
          const savedItem = await MediaItemModel.create({
            userId: fallbackUser?._id || new mongoose.Types.ObjectId(),
            name: videoName,
            type: 'video',
            fileCategory: 'offer',
            url: v.url,
            approvalStatus: 'approved',
            templateId: templateId || undefined,
            offerId: offerId || undefined,
            channels: channels || [],
            voiceoverScript: voiceoverScript || '',
            ratio: v.ratio || '16:9',
            jobId,
            createdAt: new Date(),
          });
          resolvedMediaId = savedItem._id.toString();
        } catch (err) {
          console.warn('[get-video] fallback MediaItem create error:', err);
        }
      }

      formattedVideos.push({
        mediaId: resolvedMediaId,
        url: v.url,
        name: videoName,
        ratio: v.ratio || '16:9',
      });
    }
  }

  // User requirement: In get-video, show only ONE preview video (16:9) with its mediaId/videoId.
  // Sibling aspect ratios (9:16, 1:1, 4:5) are saved in the backend library under this jobId for offer_approval.
  const preview169 = formattedVideos.find((v) => v.ratio === '16:9') || formattedVideos[0];
  const previewList = preview169 ? [preview169] : formattedVideos.slice(0, 1);

  // Trigger non-blocking cleanup of any unapproved videos older than 30 days
  cleanupExpiredUnapprovedVideos(30).catch(() => {});

  const responsePayload: Record<string, any> = {
    success: true,
    status: 'completed',
    jobId,
    videoId: preview169?.mediaId || jobId,
    primaryVideoId: preview169?.mediaId || jobId,
    offerId: offerId || '',
    templateId: templateId || '14',
    message: 'OK',
    videos: previewList,
    "video 1": preview169?.url || '',
    voiceoverScript: voiceoverScript || '',
    channels: channels,
  };

  // Inject dynamic social captions & hashtags strictly based on channels
  injectSocialCaptions(responsePayload, channels, voiceoverScript);

  return NextResponse.json(responsePayload);
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId =
      searchParams.get('job_id') ||
      searchParams.get('jobId') ||
      searchParams.get('videoId') ||
      searchParams.get('id') ||
      '';
    return await handleGetVideo(jobId);
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const jobId =
      body.job_id ||
      body.jobId ||
      body.videoId ||
      body.id ||
      '';
    return await handleGetVideo(jobId);
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}
