import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import SocialPost from '@/models/SocialPost';
import MediaItemModel from '@/models/MediaItems';
import VideoTemplate from '@/models/VideoTemplate';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

/**
 * Helper: Calculate scheduled time
 * - Target: Day before startDate at 18:00 (6:00 PM)
 * - If target is already completed/past <= now: schedule instantly (now)
 */
function calculateScheduleTiming(startDateInput?: string | Date, explicitScheduledAt?: string | Date) {
  const now = new Date();

  // If caller provided explicit scheduledAt and no startDate
  if (explicitScheduledAt && !startDateInput) {
    const customDate = new Date(explicitScheduledAt);
    if (!isNaN(customDate.getTime())) {
      const isPast = customDate.getTime() <= now.getTime();
      return {
        scheduledAt: isPast ? now : customDate,
        publishMode: isPast ? ('now' as const) : ('schedule' as const),
        status: isPast ? ('published' as const) : ('scheduled' as const),
        isInstant: isPast,
        reason: isPast ? 'Custom schedule time has already passed; published instantly' : 'Scheduled at custom time',
      };
    }
  }

  if (!startDateInput) {
    return {
      scheduledAt: now,
      publishMode: 'now' as const,
      status: 'published' as const,
      isInstant: true,
      reason: 'No startDate supplied; scheduled instantly',
    };
  }

  let start: Date;
  if (typeof startDateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDateInput.trim())) {
    const [y, m, d] = startDateInput.trim().split('-').map(Number);
    start = new Date(y, m - 1, d, 0, 0, 0);
  } else {
    start = new Date(startDateInput);
  }

  if (isNaN(start.getTime())) {
    return {
      scheduledAt: now,
      publishMode: 'now' as const,
      status: 'published' as const,
      isInstant: true,
      reason: 'Invalid startDate; scheduled instantly',
    };
  }

  // Calculate day before startDate at 18:00 (6:00 PM)
  const prevDate6PM = new Date(start);
  prevDate6PM.setDate(prevDate6PM.getDate() - 1);
  prevDate6PM.setHours(18, 0, 0, 0);

  const isPastOrDue = prevDate6PM.getTime() <= now.getTime();

  if (isPastOrDue) {
    return {
      scheduledAt: now,
      publishMode: 'now' as const,
      status: 'published' as const,
      isInstant: true,
      targetTime: prevDate6PM.toISOString(),
      reason: `Previous day 6:00 PM (${prevDate6PM.toISOString()}) has already elapsed; scheduled instantly`,
    };
  } else {
    return {
      scheduledAt: prevDate6PM,
      publishMode: 'schedule' as const,
      status: 'scheduled' as const,
      isInstant: false,
      targetTime: prevDate6PM.toISOString(),
      reason: `Scheduled for previous day at 6:00 PM (${prevDate6PM.toISOString()})`,
    };
  }
}

/**
 * Format message with hashtags
 */
function formatSocialMessage(caption?: string, hashtags?: string[] | string): string {
  let text = (caption || '').trim();
  if (Array.isArray(hashtags) && hashtags.length > 0) {
    const tags = hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ');
    text = text ? `${text}\n\n${tags}` : tags;
  } else if (typeof hashtags === 'string' && hashtags.trim()) {
    text = text ? `${text}\n\n${hashtags.trim()}` : hashtags.trim();
  }
  return text;
}

/**
 * POST /api/social/schedule
 * Separate API for scheduling posts across Facebook and Instagram
 */
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json().catch(() => ({}));

    const {
      channels,
      channel,
      startDate,
      scheduledAt: explicitScheduledAt,
      publishMode: explicitPublishMode,
      userId,
      user_id,
      storeUserId,
      videoId,
      mediaUrl,
      facebookCaption,
      facebookHashTags,
      instagramCaption,
      instagramHashTags,
      caption,
      message,
      hashtags,
      templateId,
      offerId,
      timezone = 'Asia/Kolkata',
    } = body;

    // Determine target channels
    let targetChannels: string[] = [];
    if (Array.isArray(channels) && channels.length > 0) {
      targetChannels = channels.map((c: string) => String(c).toLowerCase().trim());
    } else if (channel) {
      targetChannels = [String(channel).toLowerCase().trim()];
    } else {
      targetChannels = ['facebook', 'instagram'];
    }

    // Resolve userId
    const resolvedUserId =
      userId || user_id || storeUserId || '64f3b2c1a4e2d1234567890a';
    const validUserObjId = mongoose.Types.ObjectId.isValid(resolvedUserId)
      ? new mongoose.Types.ObjectId(resolvedUserId)
      : new mongoose.Types.ObjectId('64f3b2c1a4e2d1234567890a');

    // Retrieve store-specific social media credentials configured in Account Admin
    let storeUserDoc: any = null;
    try {
      storeUserDoc = await User.findById(validUserObjId).lean();
    } catch {}

    const storeSocial = storeUserDoc?.socialCredentials || {};
    const fbTargetId = storeSocial.facebookPageId || process.env.FACEBOOK_PAGE_ID || '';
    const fbTargetName = storeSocial.facebookPageName || storeUserDoc?.storeName || 'Facebook Page';
    const igTargetId = storeSocial.instagramBusinessId || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '';
    const igTargetName = storeSocial.instagramUsername || storeUserDoc?.storeName || 'Instagram Account';

    // Resolve media & video URLs
    let resolvedDefaultVideoUrl = (mediaUrl || '').trim();
    let resolved916VideoUrl = '';
    let resolved169VideoUrl = '';

    if (videoId) {
      const vIdStr = String(videoId).trim();
      let mediaDoc: any = null;
      if (mongoose.Types.ObjectId.isValid(vIdStr)) {
        mediaDoc = await MediaItemModel.findById(vIdStr).lean();
      }
      if (!mediaDoc) {
        mediaDoc = await MediaItemModel.findOne({
          $or: [{ _id: vIdStr }, { jobId: vIdStr }, { url: vIdStr }],
        }).lean();
      }

      if (mediaDoc) {
        resolvedDefaultVideoUrl = mediaDoc.url || resolvedDefaultVideoUrl;
        if (mediaDoc.ratio === '9:16') resolved916VideoUrl = mediaDoc.url;
        if (mediaDoc.ratio === '16:9') resolved169VideoUrl = mediaDoc.url;

        // Check if other aspect ratio media exist for the same jobId / templateId
        if (mediaDoc.jobId) {
          const siblingMedia = await MediaItemModel.find({ jobId: mediaDoc.jobId }).lean();
          siblingMedia.forEach((m: any) => {
            if (m.ratio === '9:16' && !resolved916VideoUrl) resolved916VideoUrl = m.url;
            if (m.ratio === '16:9' && !resolved169VideoUrl) resolved169VideoUrl = m.url;
          });
        }
      }
    }

    if (!resolved169VideoUrl) resolved169VideoUrl = resolvedDefaultVideoUrl;
    if (!resolved916VideoUrl) resolved916VideoUrl = resolvedDefaultVideoUrl;

    // Calculate timing
    const timing =
      explicitPublishMode === 'now'
        ? {
            scheduledAt: new Date(),
            publishMode: 'now' as const,
            status: 'published' as const,
            isInstant: true,
            reason: 'Explicitly requested publish now',
          }
        : calculateScheduleTiming(startDate, explicitScheduledAt);

    const createdPosts: any[] = [];

    // Schedule for Facebook
    if (targetChannels.includes('facebook')) {
      const fbMessage = formatSocialMessage(
        facebookCaption || caption || message || 'Special In-Store Promotional Offer!',
        facebookHashTags || hashtags
      );

      const fbPost = await SocialPost.create({
        storeUserId: validUserObjId,
        channel: 'facebook',
        message: fbMessage,
        mediaType: resolved169VideoUrl ? 'video' : 'none',
        mediaUrl: resolved169VideoUrl,
        templateId: templateId ? String(templateId) : '',
        publishMode: timing.publishMode,
        scheduledAt: timing.scheduledAt,
        timezone,
        status: timing.status,
        publishedAt: timing.isInstant ? new Date() : null,
        externalPostId: timing.isInstant ? `fb_${Date.now()}` : null,
        targetAccountId: fbTargetId,
        targetAccountName: fbTargetName,
      });

      createdPosts.push({
        channel: 'facebook',
        postId: String(fbPost._id),
        status: fbPost.status,
        publishMode: fbPost.publishMode,
        scheduledAt: fbPost.scheduledAt,
        mediaUrl: fbPost.mediaUrl,
        message: fbPost.message,
      });
    }

    // Schedule for Instagram
    if (targetChannels.includes('instagram')) {
      const igMessage = formatSocialMessage(
        instagramCaption || caption || message || 'Exclusive Mega Offer! Grab yours before time runs out! 🔥',
        instagramHashTags || hashtags
      );

      const igPost = await SocialPost.create({
        storeUserId: validUserObjId,
        channel: 'instagram',
        message: igMessage,
        mediaType: resolved916VideoUrl ? 'video' : 'none',
        mediaUrl: resolved916VideoUrl, // Prefer 9:16 vertical for Instagram
        templateId: templateId ? String(templateId) : '',
        publishMode: timing.publishMode,
        scheduledAt: timing.scheduledAt,
        timezone,
        status: timing.status,
        publishedAt: timing.isInstant ? new Date() : null,
        externalPostId: timing.isInstant ? `ig_${Date.now()}` : null,
        targetAccountId: igTargetId,
        targetAccountName: igTargetName,
      });

      createdPosts.push({
        channel: 'instagram',
        postId: String(igPost._id),
        status: igPost.status,
        publishMode: igPost.publishMode,
        scheduledAt: igPost.scheduledAt,
        mediaUrl: igPost.mediaUrl,
        message: igPost.message,
      });
    }

    return NextResponse.json({
      success: true,
      message: timing.isInstant
        ? 'Social media posts published instantly!'
        : 'Social media posts scheduled successfully!',
      timing: {
        mode: timing.publishMode,
        scheduledAt: timing.scheduledAt,
        reason: timing.reason,
      },
      channels: targetChannels,
      posts: createdPosts,
    });
  } catch (error: any) {
    console.error('[POST /api/social/schedule] Error:', error);
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to schedule social media posts' },
      { status: 500 }
    );
  }
}
