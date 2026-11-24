import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Device from '@/models/Device';
import { DeviceCurrentPlaying } from '@/models/DeviceCurrentPlaying';
import OfflineScreenReport from '@/models/OfflineScreenReport';
import MediaItem from '@/models/MediaItems';
import { requireAuth } from '@/lib/storesparc/auth';
import { apiError, notFoundError } from '@/lib/storesparc/errors';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { caller, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  const { id } = await context.params;

  try {
    await connectToDatabase();
    const storeId = caller!.storeId;

    const device = await Device.findById(id);
    if (!device) {
      return notFoundError('Screen device not found');
    }

    const playing = await DeviceCurrentPlaying.findOne({ serialNumber: device.serialNumber });
    const report = await OfflineScreenReport.findOne({ storeId, screenId: id, status: 'reported' });
    const isOnline = device.status === 'active';

    const validZones = ['entrance', 'window', 'registers', 'aisles'] as const;
    const zone =
      device.zone && validZones.includes(device.zone)
        ? device.zone
        : 'entrance';

    // Query matched media item if path is a filename or title
    let mediaItem = null;
    if (playing && playing.path) {
      mediaItem = await MediaItem.findOne({
        $or: [
          { name: playing.path },
          { url: playing.path },
          { name: { $regex: playing.path, $options: 'i' } },
        ],
      });
    }

    // Determine current item properties
    let kind: 'video' | 'live_offer' | 'announcement' | 'nothing' = 'nothing';
    let title = 'Nothing playing';
    let detail = 'Screen is offline or idle';
    let durationSeconds = 15;
    let startedAt = new Date().toISOString();
    let mediaUrl: string | null = null;

    if (isOnline) {
      if (playing && playing.path) {
        title = mediaItem?.name || playing.path;
        detail =
          mediaItem?.socialMediaCaption ||
          mediaItem?.tagline ||
          `Active digital signage playback on ${device.name}`;
        durationSeconds = mediaItem?.duration || 15;
        startedAt = playing.updatedAt
          ? playing.updatedAt.toISOString()
          : new Date().toISOString();
        mediaUrl = mediaItem?.url || `https://cdn.metizstoresparc.com/media/${encodeURIComponent(playing.path)}`;

        const lower = title.toLowerCase();
        if (lower.includes('announcement') || lower.includes('alert')) {
          kind = 'announcement';
        } else if (lower.includes('offer') || lower.includes('promo') || lower.includes('discount')) {
          kind = 'live_offer';
        } else {
          kind = 'video';
        }
      } else {
        kind = 'video';
        title = 'Default Ambient Media';
        detail = 'Store Sparc branded ambient background rotation';
        durationSeconds = 30;
        startedAt = device.updatedAt ? device.updatedAt.toISOString() : new Date().toISOString();
        mediaUrl = 'https://cdn.metizstoresparc.com/media/ambient_default.mp4';
      }
    }

    const offlineSince = !isOnline
      ? device.lastConnection
        ? new Date(device.lastConnection).toISOString()
        : device.updatedAt
        ? new Date(device.updatedAt).toISOString()
        : new Date().toISOString()
      : null;

    const currentItem = {
      kind,
      title,
      detail,
      duration_seconds: durationSeconds,
      started_at: startedAt,
      media_url: isOnline ? mediaUrl : null,
      thumbnail_url: device.latestScreenshotUrl || null,
    };

    return NextResponse.json({
      id: device._id.toString(),
      store_id: storeId,
      name: device.name,
      zone,
      online: isOnline,
      what_it_is_showing: isOnline ? title : null,
      is_playing: isOnline ? title : 'Nothing',
      kind_of_content: kind,
      content_type: kind,
      offline_since: offlineSince,
      reported_at: report ? report.reportedAt.toISOString() : null,
      reported_by: report ? report.reportedBy : null,
      current_item: currentItem,
    });
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', error.message || 'Failed to fetch screen details', 500);
  }
}
