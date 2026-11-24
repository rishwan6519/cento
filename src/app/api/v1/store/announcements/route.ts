import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import StoreAnnouncement from '@/models/StoreAnnouncement';
import StoreConfig from '@/models/StoreConfig';
import { requireAuth } from '@/lib/storesparc/auth';
import { withIdempotency } from '@/lib/storesparc/idempotency';
import { apiError } from '@/lib/storesparc/errors';

export async function GET(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req, ['Store Manager', 'Central admin']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const storeId = caller!.storeId;

    const config = await StoreConfig.findOne({ storeId });
    const posts = await StoreAnnouncement.find({ storeId }).sort({ createdAt: -1 });

    const scheduledPosts = posts
      .filter((p) => p.status === 'scheduled')
      .map((p) => ({
        id: p._id.toString(),
        message: p.message,
        status: p.status,
        author: p.author,
        created_at: p.createdAt.toISOString(),
        scheduled_for: p.scheduledFor ? p.scheduledFor.toISOString() : null,
      }));

    const sentPosts = posts
      .filter((p) => p.status === 'sent')
      .map((p) => ({
        id: p._id.toString(),
        message: p.message,
        status: p.status,
        author: p.author,
        created_at: p.createdAt.toISOString(),
        sent_at: p.sentAt ? p.sentAt.toISOString() : p.createdAt.toISOString(),
      }));

    return NextResponse.json({
      group: {
        id: `group_${storeId}`,
        name: `${caller!.storeName || 'Store'} Team Chat`,
        whatsapp_link: config?.whatsAppGroupLink || '',
      },
      message_templates: [],
      scheduled_posts: scheduledPosts,
      sent_posts: sentPosts,
    });
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', error.message || 'Failed to fetch announcements board', 500);
  }
}

export async function POST(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req, ['Store Manager', 'Central admin']);
  if (errorResponse) return errorResponse;

  return withIdempotency(req, caller!.userId, async () => {
    try {
      await connectToDatabase();
      const body = await req.json();
      const { message, scheduled_for } = body;

      if (!message || message.trim().length === 0) {
        return apiError('VALIDATION_ERROR', 'Message cannot be empty', 400);
      }

      const storeId = caller!.storeId;
      const isScheduled = !!scheduled_for;
      const now = new Date();

      const post = await StoreAnnouncement.create({
        storeId,
        message,
        status: isScheduled ? 'scheduled' : 'sent',
        author: caller!.displayName,
        scheduledFor: isScheduled ? new Date(scheduled_for) : undefined,
        sentAt: isScheduled ? undefined : now,
      });

      return NextResponse.json({
        id: post._id.toString(),
        message: post.message,
        status: post.status,
        author: post.author,
        created_at: post.createdAt.toISOString(),
        scheduled_for: post.scheduledFor ? post.scheduledFor.toISOString() : null,
        sent_at: post.sentAt ? post.sentAt.toISOString() : null,
      });
    } catch (error: any) {
      return apiError('INTERNAL_ERROR', error.message || 'Failed to post announcement', 500);
    }
  });
}

