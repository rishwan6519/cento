import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import SocialPost from '@/models/SocialPost';
import MediaItemModel from '@/models/MediaItems';
import VideoTemplate from '@/models/VideoTemplate';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

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

// Helper to auto-resolve Page Access Token if a User Token was provided
async function resolvePageToken(pageId: string, token: string): Promise<string> {
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}?fields=access_token&access_token=${token}`);
    const data = await res.json();
    if (data.access_token) {
      return data.access_token;
    }
  } catch (err) {
    // ignore
  }
  return token;
}

// Live Publish to Facebook Graph API
async function publishToFacebookLive(pageId: string, accessToken: string, videoUrl: string, message: string) {
  try {
    if (!pageId || !accessToken) {
      return { success: false, error: 'Missing Facebook Page ID or Access Token in store configuration' };
    }

    let tokenToUse = accessToken;

    if (videoUrl && videoUrl.startsWith('http')) {
      const fbUrl = `https://graph.facebook.com/v20.0/${pageId}/videos`;
      let res = await fetch(fbUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_url: videoUrl,
          description: message,
          access_token: tokenToUse,
        }),
      });
      let data = await res.json();

      // If failed due to permission/token type, attempt auto-resolving Page Access Token
      if (!data.id && (data.error?.code === 100 || data.error?.code === 200 || data.error?.message?.includes('permission'))) {
        const resolved = await resolvePageToken(pageId, tokenToUse);
        if (resolved && resolved !== tokenToUse) {
          tokenToUse = resolved;
          res = await fetch(fbUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              file_url: videoUrl,
              description: message,
              access_token: tokenToUse,
            }),
          });
          data = await res.json();
        }
      }

      if (data.id) {
        return { success: true, postId: data.id };
      } else {
        return { success: false, error: data.error?.message || JSON.stringify(data) };
      }
    } else {
      const fbUrl = `https://graph.facebook.com/v20.0/${pageId}/feed`;
      let res = await fetch(fbUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          access_token: tokenToUse,
        }),
      });
      let data = await res.json();

      if (!data.id && (data.error?.code === 100 || data.error?.code === 200 || data.error?.message?.includes('permission'))) {
        const resolved = await resolvePageToken(pageId, tokenToUse);
        if (resolved && resolved !== tokenToUse) {
          tokenToUse = resolved;
          res = await fetch(fbUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: message,
              access_token: tokenToUse,
            }),
          });
          data = await res.json();
        }
      }

      if (data.id) {
        return { success: true, postId: data.id };
      } else {
        return { success: false, error: data.error?.message || JSON.stringify(data) };
      }
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Live Publish to Instagram Graph API with async container processing
async function publishToInstagramLive(igUserId: string, accessToken: string, videoUrl: string, caption: string) {
  try {
    if (!igUserId || !accessToken) {
      return { success: false, error: 'Missing Instagram Business ID or Access Token in store configuration' };
    }
    if (!videoUrl || !videoUrl.startsWith('http')) {
      return { success: false, error: 'Instagram requires a public video URL' };
    }

    // Step 1: Create media container for Reels
    const containerUrl = `https://graph.facebook.com/v20.0/${igUserId}/media`;
    const containerRes = await fetch(containerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'REELS',
        video_url: videoUrl,
        caption: caption,
        access_token: accessToken,
      }),
    });
    const containerData = await containerRes.json();
    if (!containerData.id) {
      return { success: false, error: containerData.error?.message || JSON.stringify(containerData) };
    }

    const creationId = containerData.id;

    // Step 2: Poll container status until FINISHED
    let published = false;
    let publishData: any = null;
    let lastStatus = 'IN_PROGRESS';

    for (let attempt = 0; attempt < 12; attempt++) {
      await new Promise((r) => setTimeout(r, 3000));
      const stRes = await fetch(`https://graph.facebook.com/v20.0/${creationId}?fields=status_code,status&access_token=${accessToken}`);
      const stData = await stRes.json();
      lastStatus = stData.status_code || stData.status || lastStatus;

      if (stData.status_code === 'FINISHED') {
        const publishUrl = `https://graph.facebook.com/v20.0/${igUserId}/media_publish`;
        const pRes = await fetch(publishUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: creationId,
            access_token: accessToken,
          }),
        });
        publishData = await pRes.json();
        if (publishData.id) {
          published = true;
          break;
        }
      } else if (stData.status_code === 'ERROR') {
        return { success: false, error: stData.status || 'Instagram video encoding failed' };
      }
    }

    if (published && publishData?.id) {
      return { success: true, postId: publishData.id };
    } else {
      return { success: false, error: publishData?.error?.message || `Instagram video is still processing (${lastStatus})` };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
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
      storeId,
      store_id,
      storeUserId,
      store_user_id,
      userId,
      user_id,
      storeName,
      store_name,
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

    // Resolve store user - Support storeId, userId, storeUserId, and storeName individually or together
    const idCandidate = storeId || store_id || storeUserId || store_user_id || userId || user_id;
    const nameCandidate = storeName || store_name;

    let storeUserDoc: any = null;

    try {
      // 1. If store user ID provided and is valid ObjectId, search by ID
      if (idCandidate && mongoose.Types.ObjectId.isValid(String(idCandidate).trim())) {
        storeUserDoc = await User.findById(String(idCandidate).trim()).lean();
      }
      // 2. If store name provided (or if ID not found), search by storeName
      if (!storeUserDoc && nameCandidate) {
        const queryStr = String(nameCandidate).trim();
        storeUserDoc = await User.findOne({
          $or: [
            { storeName: new RegExp(`^${queryStr}$`, 'i') },
            { name: new RegExp(`^${queryStr}$`, 'i') },
            { email: new RegExp(`^${queryStr}$`, 'i') }
          ]
        }).lean();
      }
      // 3. If ID candidate was a string like "store4"
      if (!storeUserDoc && idCandidate) {
        const queryStr = String(idCandidate).trim();
        storeUserDoc = await User.findOne({
          $or: [
            { storeName: new RegExp(`^${queryStr}$`, 'i') },
            { name: new RegExp(`^${queryStr}$`, 'i') },
            { email: new RegExp(`^${queryStr}$`, 'i') }
          ]
        }).lean();
      }
      // 4. Fallback: Find store4 or any store with configured social credentials
      if (!storeUserDoc) {
        storeUserDoc = await User.findOne({ storeName: new RegExp('^store4$', 'i') }).lean();
      }
      if (!storeUserDoc) {
        storeUserDoc = await User.findOne({ 'socialCredentials.facebookPageId': { $exists: true, $ne: '' } }).lean();
      }
    } catch (err) {
      console.error('[Store Resolution Error]:', err);
    }

    const validUserObjId = storeUserDoc?._id || (idCandidate && mongoose.Types.ObjectId.isValid(String(idCandidate).trim()) ? new mongoose.Types.ObjectId(String(idCandidate).trim()) : new mongoose.Types.ObjectId('69e9425426e6e857385b4fa6'));
    const storeSocial = storeUserDoc?.socialCredentials || {};
    const fbTargetId = storeSocial.facebookPageId || process.env.FACEBOOK_PAGE_ID || '';
    const fbTargetName = storeSocial.facebookPageName || storeUserDoc?.storeName || (nameCandidate ? String(nameCandidate) : 'Facebook Page');
    const fbAccessToken = storeSocial.facebookPageAccessToken || '';
    const igTargetId = storeSocial.instagramBusinessId || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '';
    const igTargetName = storeSocial.instagramUsername || storeUserDoc?.storeName || (nameCandidate ? String(nameCandidate) : 'Instagram Account');

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

    // Schedule / Publish for Facebook
    if (targetChannels.includes('facebook')) {
      const fbMessage = formatSocialMessage(
        facebookCaption || caption || message || 'Special In-Store Promotional Offer!',
        facebookHashTags || hashtags
      );

      let fbLiveResult: any = null;
      if (timing.isInstant) {
        fbLiveResult = await publishToFacebookLive(fbTargetId, fbAccessToken, resolved169VideoUrl, fbMessage);
      }

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
        status: timing.isInstant ? (fbLiveResult?.success ? 'published' : 'failed') : timing.status,
        publishedAt: timing.isInstant && fbLiveResult?.success ? new Date() : null,
        externalPostId: fbLiveResult?.postId || (timing.isInstant ? `fb_${Date.now()}` : null),
        errorMessage: fbLiveResult?.error || null,
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
        externalPostId: fbPost.externalPostId,
        metaError: fbLiveResult?.error || undefined,
      });
    }

    // Schedule / Publish for Instagram
    if (targetChannels.includes('instagram')) {
      const igMessage = formatSocialMessage(
        instagramCaption || caption || message || 'Exclusive Mega Offer! Grab yours before time runs out! 🔥',
        instagramHashTags || hashtags
      );

      let igLiveResult: any = null;
      if (timing.isInstant) {
        igLiveResult = await publishToInstagramLive(igTargetId, fbAccessToken, resolved916VideoUrl, igMessage);
      }

      const igPost = await SocialPost.create({
        storeUserId: validUserObjId,
        channel: 'instagram',
        message: igMessage,
        mediaType: resolved916VideoUrl ? 'video' : 'none',
        mediaUrl: resolved916VideoUrl,
        templateId: templateId ? String(templateId) : '',
        publishMode: timing.publishMode,
        scheduledAt: timing.scheduledAt,
        timezone,
        status: timing.isInstant ? (igLiveResult?.success ? 'published' : 'failed') : timing.status,
        publishedAt: timing.isInstant && igLiveResult?.success ? new Date() : null,
        externalPostId: igLiveResult?.postId || (timing.isInstant ? `ig_${Date.now()}` : null),
        errorMessage: igLiveResult?.error || null,
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
        externalPostId: igPost.externalPostId,
        metaError: igLiveResult?.error || undefined,
      });
    }

    return NextResponse.json({
      success: true,
      store: {
        storeId: String(validUserObjId),
        storeName: storeUserDoc?.storeName || 'store4',
        facebookPageId: fbTargetId,
        instagramBusinessId: igTargetId,
      },
      message: timing.isInstant
        ? 'Social media posts processed for immediate publishing!'
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
