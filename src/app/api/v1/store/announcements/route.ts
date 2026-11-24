import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import StoreAnnouncement from '@/models/StoreAnnouncement';
import StoreConfig from '@/models/StoreConfig';
import User from '@/models/User';
import StoreAlert from '@/models/StoreAlert';
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

    const defaultTemplates = [
      {
        id: 'tmpl_cover',
        title: 'Shift Cover Needed',
        text: 'Team, we need shift cover today from [START] to [END]. Please submit a swap or see manager.',
      },
      {
        id: 'tmpl_huddle',
        title: 'Daily Team Huddle',
        text: 'All staff huddle today at [TIME] at the main register counter. Review today\'s targets.',
      },
      {
        id: 'tmpl_promo',
        title: 'Promotion Campaign Kickoff',
        text: 'New promotional campaign starts tomorrow. Please verify price tags and shelf banners.',
      },
      {
        id: 'tmpl_closing',
        title: 'Store Closing Checklist',
        text: 'Evening closing team: please ensure register reconciliation and stockroom lockup by 21:30.',
      },
    ];

    return NextResponse.json({
      group: {
        id: `group_${storeId}`,
        name: `${caller!.storeName || 'Store'} Team Operations`,
        whatsapp_link: config?.whatsAppGroupLink || 'https://chat.whatsapp.com/default',
      },
      max_message_length: config?.maxAnnouncementLength || 280,
      message_templates: defaultTemplates,
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
      const { message, scheduled_for, client_timestamp } = body;

      if (!message || message.trim().length === 0) {
        return apiError('VALIDATION_ERROR', 'Message cannot be empty', 400);
      }

      const storeId = caller!.storeId;
      const config = await StoreConfig.findOne({ storeId });
      const maxLen = config?.maxAnnouncementLength || 280;

      // Enforce maximum announcement length from Store Configuration
      if (message.length > maxLen) {
        return apiError(
          'MESSAGE_TOO_LONG',
          `Announcement message exceeds maximum allowed length of ${maxLen} characters (current length: ${message.length})`,
          400
        );
      }

      const now = client_timestamp ? new Date(client_timestamp) : new Date();
      const isScheduled = !!scheduled_for;
      let scheduledDate: Date | undefined;

      if (isScheduled) {
        scheduledDate = new Date(scheduled_for);
        const diffMinutes = (scheduledDate.getTime() - now.getTime()) / (1000 * 60);

        if (diffMinutes < 5) {
          return apiError(
            'INVALID_SCHEDULE_TIME',
            'Scheduled announcements must be set at least 5 minutes in the future',
            400
          );
        }

        const maxScheduleDays = 14;
        if (diffMinutes > maxScheduleDays * 24 * 60) {
          return apiError(
            'SCHEDULE_HORIZON_EXCEEDED',
            `Announcements cannot be scheduled more than ${maxScheduleDays} days in advance`,
            400
          );
        }
      }

      const post = await StoreAnnouncement.create({
        storeId,
        message,
        status: isScheduled ? 'scheduled' : 'sent',
        author: caller!.displayName,
        scheduledFor: isScheduled ? scheduledDate : undefined,
        sentAt: isScheduled ? undefined : now,
      });

      // If sent immediately, raise "store_announcement" alert for all Staff in the store (GAP-API-008)
      if (!isScheduled) {
        const staff = await User.find({
          $or: [
            { assignedStoreId: storeId },
            { storeLocation: storeId },
            { role: 'user' },
            { role: 'Staff' },
          ],
        }).select('_id');

        if (staff.length > 0) {
          const alertDocs = staff.map((u) => ({
            userId: u._id.toString(),
            storeId,
            category: 'store_announcement',
            title: 'Store Announcement',
            body: message.length > 80 ? message.substring(0, 77) + '...' : message,
            read: false,
            targetScreen: 'announcements',
            targetArgument: post._id.toString(),
          }));
          await StoreAlert.insertMany(alertDocs);
        }
      }

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
