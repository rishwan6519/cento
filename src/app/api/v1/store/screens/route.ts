import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Device from '@/models/Device';
import { DeviceCurrentPlaying } from '@/models/DeviceCurrentPlaying';
import OfflineScreenReport from '@/models/OfflineScreenReport';
import { requireAuth } from '@/lib/storesparc/auth';
import { apiError } from '@/lib/storesparc/errors';

export async function GET(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const storeId = caller!.storeId;

    let devices = await Device.find({ storeId }).limit(50);
    if (devices.length === 0) {
      devices = await Device.find({}).limit(50);
    }

    const reports = await OfflineScreenReport.find({ storeId, status: 'reported' });
    const reportedScreenMap = new Map(reports.map((r) => [r.screenId, r]));

    const validZones = ['entrance', 'window', 'registers', 'aisles'] as const;

    const screens = await Promise.all(
      devices.map(async (d: any, index: number) => {
        const playing = await DeviceCurrentPlaying.findOne({ serialNumber: d.serialNumber });
        const report = reportedScreenMap.get(d._id.toString());
        const isOnline = d.status === 'active';

        // Assign fixed zone based on device property or distribute across the 4 PRD zones
        const zone =
          d.zone && validZones.includes(d.zone)
            ? d.zone
            : validZones[index % validZones.length];

        // Determine what it is showing and kind of content (video, live_offer, announcement, nothing)
        let whatItIsShowing: string | null = null;
        let kindOfContent: 'video' | 'live_offer' | 'announcement' | 'nothing' = 'nothing';

        if (!isOnline) {
          whatItIsShowing = null;
          kindOfContent = 'nothing';
        } else if (playing && playing.path) {
          whatItIsShowing = playing.path;
          const lower = playing.path.toLowerCase();
          if (lower.includes('announcement') || lower.includes('alert')) {
            kindOfContent = 'announcement';
          } else if (lower.includes('offer') || lower.includes('promo') || lower.includes('discount')) {
            kindOfContent = 'live_offer';
          } else {
            kindOfContent = 'video';
          }
        } else {
          whatItIsShowing = 'Default Ambient Media';
          kindOfContent = 'video';
        }

        const offlineSince = !isOnline
          ? d.lastConnection
            ? new Date(d.lastConnection).toISOString()
            : d.updatedAt
            ? new Date(d.updatedAt).toISOString()
            : new Date().toISOString()
          : null;

        return {
          id: d._id.toString(),
          store_id: storeId,
          name: d.name || `Screen ${d.serialNumber || index + 1}`,
          zone,
          online: isOnline,
          what_it_is_showing: whatItIsShowing,
          is_playing: whatItIsShowing || 'Nothing',
          kind_of_content: kindOfContent,
          content_type: kindOfContent,
          offline_since: offlineSince,
          reported_at: report ? report.reportedAt.toISOString() : null,
          reported_by: report ? report.reportedBy : null,
        };
      })
    );

    return NextResponse.json({ screens });
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', error.message || 'Failed to fetch screens', 500);
  }
}
