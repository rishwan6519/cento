import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import SocialPost from '@/models/SocialPost';
import User from '@/models/User';
import MediaItemModel from '@/models/MediaItems';
import MediaMetadata from '@/models/MediaMetadata';

// Helper to auto-resolve Page Access Token if caller has user/page token
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

// Live Delete from Facebook Graph API
async function deleteFromFacebookLive(pageId: string, accessToken: string, externalPostId: string) {
  try {
    if (!externalPostId || externalPostId.startsWith('fb_')) {
      return { success: false, skipped: true, reason: 'No external Facebook post ID to delete' };
    }
    if (!accessToken) {
      return { success: false, error: 'Missing Facebook Page Access Token in store configuration' };
    }

    let tokenToUse = accessToken;
    if (pageId) {
      tokenToUse = await resolvePageToken(pageId, accessToken);
    }

    const deleteUrl = `https://graph.facebook.com/v20.0/${externalPostId}?access_token=${tokenToUse}`;
    const res = await fetch(deleteUrl, { method: 'DELETE' });
    const data = await res.json();

    console.log(`[DELETE /api/social/posts] Facebook Graph API delete response for ${externalPostId}:`, data);

    if (data.success === true || data === true) {
      return { success: true };
    }

    // If Meta returns error saying object doesn't exist, already deleted, or not found (code 100 or 803)
    if (data.error?.code === 100 || data.error?.code === 803 || data.error?.message?.toLowerCase().includes('does not exist')) {
      return { success: true, note: 'Post was already removed from Facebook' };
    }

    return { success: false, error: data.error?.message || JSON.stringify(data) };
  } catch (err: any) {
    console.error('[DELETE /api/social/posts] Error during Facebook live delete:', err);
    return { success: false, error: err.message };
  }
}

// Live Delete Attempt from Instagram Graph API
async function deleteFromInstagramLive(accessToken: string, externalPostId: string) {
  try {
    if (!externalPostId || externalPostId.startsWith('ig_')) {
      return { success: false, skipped: true, reason: 'No external Instagram post ID to delete' };
    }
    if (!accessToken) {
      return { success: false, error: 'Missing Instagram Access Token in store configuration' };
    }

    const deleteUrl = `https://graph.facebook.com/v20.0/${externalPostId}?access_token=${accessToken}`;
    const res = await fetch(deleteUrl, { method: 'DELETE' });
    const data = await res.json();

    console.log(`[DELETE /api/social/posts] Instagram Graph API delete response for ${externalPostId}:`, data);

    if (data.success === true || data === true) {
      return { success: true };
    }

    // Instagram Graph API for business accounts generally does not allow 3rd party apps to delete published organic media
    return {
      success: false,
      restrictedByMeta: true,
      error: data.error?.message || 'Instagram Graph API restricts external deletion of published media',
    };
  } catch (err: any) {
    console.error('[DELETE /api/social/posts] Error during Instagram live delete attempt:', err);
    return { success: false, error: err.message };
  }
}

// ─── GET /api/social/posts/[postId] ───────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    await connectToDatabase();
    const resolvedParams = await params;
    const { postId } = resolvedParams;

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json({ success: false, message: 'Invalid post ID' }, { status: 400 });
    }

    const post = await SocialPost.findById(postId).lean();
    if (!post) {
      return NextResponse.json({ success: false, message: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: post });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch post', error: error?.message },
      { status: 500 }
    );
  }
}

// ─── PUT /api/social/posts/[postId] ───────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    await connectToDatabase();
    const resolvedParams = await params;
    const { postId } = resolvedParams;

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json({ success: false, message: 'Invalid post ID' }, { status: 400 });
    }

    const body = await req.json();
    const updateData: any = {};
    if (body.message) updateData.message = body.message.trim();
    if (body.channel) updateData.channel = body.channel.toLowerCase();
    if (body.status) updateData.status = body.status;
    if (body.scheduledAt) updateData.scheduledAt = new Date(body.scheduledAt);
    if (body.mediaUrl !== undefined) updateData.mediaUrl = body.mediaUrl;
    if (body.thumbnailUrl !== undefined) updateData.thumbnailUrl = body.thumbnailUrl;
    if (body.mediaType) updateData.mediaType = body.mediaType;

    const updated = await SocialPost.findByIdAndUpdate(postId, updateData, { new: true }).lean();
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Post updated successfully', data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to update post', error: error?.message },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/social/posts/[postId] ────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    await connectToDatabase();
    const resolvedParams = await params;
    const { postId } = resolvedParams;

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json({ success: false, message: 'Invalid post ID' }, { status: 400 });
    }

    const post = await SocialPost.findById(postId);
    if (!post) {
      return NextResponse.json({ success: false, message: 'Post not found' }, { status: 404 });
    }

    // Resolve store user credentials for live deletion if externalPostId exists
    let storeUserDoc: any = null;
    try {
      if (post.storeUserId) {
        storeUserDoc = await User.findById(post.storeUserId).lean();
        if (
          storeUserDoc &&
          (storeUserDoc.role === 'account_admin' ||
            storeUserDoc.role === 'admin' ||
            !storeUserDoc.socialCredentials?.facebookPageAccessToken)
        ) {
          const storeWithCreds = await User.findOne({
            $or: [
              { controllerId: storeUserDoc._id },
              { _id: storeUserDoc._id },
              { 'socialCredentials.facebookPageAccessToken': { $exists: true, $ne: '' } },
            ],
            'socialCredentials.facebookPageAccessToken': { $exists: true, $ne: '' },
          }).lean();
          if (storeWithCreds) {
            storeUserDoc = storeWithCreds;
          }
        }
      }
      if (!storeUserDoc) {
        storeUserDoc = await User.findOne({
          'socialCredentials.facebookPageAccessToken': { $exists: true, $ne: '' },
        }).lean();
      }
    } catch (err) {
      // ignore
    }

    const storeSocial = storeUserDoc?.socialCredentials || {};
    const fbPageId = storeSocial.facebookPageId || process.env.FACEBOOK_PAGE_ID || '';
    const fbAccessToken = storeSocial.facebookPageAccessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '';

    let liveDeleteResult: any = null;
    let message = 'Post cancelled and deleted successfully';

    // If published with externalPostId, attempt Meta Graph API live deletion
    if (post.status === 'published' && post.externalPostId) {
      if (post.channel === 'facebook') {
        liveDeleteResult = await deleteFromFacebookLive(fbPageId, fbAccessToken, post.externalPostId);
        if (liveDeleteResult.success) {
          message = 'Live Facebook post deleted successfully from your Page and removed from Storesparc';
        } else if (liveDeleteResult.skipped) {
          message = 'Post removed from Storesparc calendar and media library';
        } else {
          message = `Post removed from Storesparc. Note on Facebook: ${liveDeleteResult.error || 'Live deletion unverified'}`;
        }
      } else if (post.channel === 'instagram') {
        liveDeleteResult = await deleteFromInstagramLive(fbAccessToken, post.externalPostId);
        if (liveDeleteResult.success) {
          message = 'Live Instagram post deleted successfully and removed from Storesparc';
        } else {
          message =
            'Post removed from Storesparc calendar and media library tags. (Note: Meta restricts external apps from deleting published Instagram posts; please remove it directly in the Instagram app if needed)';
        }
      }
    } else if (post.status === 'scheduled') {
      message = 'Scheduled post cancelled and removed successfully';
    }

    // Delete post record from MongoDB
    await SocialPost.findByIdAndDelete(postId);

    // Clean up channel tags from MediaItemModel and MediaMetadata if no other active posts exist for this media
    try {
      const orConditions: any[] = [];
      if (post.mediaUrl) orConditions.push({ mediaUrl: post.mediaUrl });
      if (post.templateId) orConditions.push({ templateId: post.templateId });

      if (orConditions.length > 0) {
        const remainingCount = await SocialPost.countDocuments({
          _id: { $ne: post._id },
          channel: post.channel,
          status: { $in: ['scheduled', 'published'] },
          $or: orConditions,
        });

        if (remainingCount === 0) {
          const matchConditions: any[] = [];
          if (post.mediaUrl) matchConditions.push({ url: post.mediaUrl });
          if (post.templateId) matchConditions.push({ templateId: post.templateId });

          if (matchConditions.length > 0) {
            await MediaItemModel.updateMany(
              { $or: matchConditions },
              { $pull: { channels: post.channel } }
            );
            await MediaMetadata.updateMany(
              { $or: matchConditions },
              { $pull: { channels: post.channel } }
            );
          }
        }
      }
    } catch (cleanupErr: any) {
      console.warn('[DELETE /api/social/posts] Tag cleanup warning:', cleanupErr?.message);
    }

    return NextResponse.json({
      success: true,
      message,
      liveDeleteResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to delete post', error: error?.message },
      { status: 500 }
    );
  }
}
