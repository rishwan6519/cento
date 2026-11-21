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

    const devices = await Device.find({}).limit(50);
    const reports = await OfflineScreenReport.find({ storeId, status: 'reported' });
    const reportedScreenMap = new Map(reports.map((r) => [r.screenId, r]));

    const screens = await Promise.all(
      devices.map(async (d: any) => {
        const playing = await DeviceCurrentPlaying.findOne({ serialNumber: d.serialNumber });
        const report = reportedScreenMap.get(d._id.toString());
        const isOnline = d.status === 'active';

        return {
          id: d._id.toString(),
          store_id: storeId,
          name: d.name,
          zone: 'main_hall',
          online: isOnline,
          is_playing: playing ? playing.path : 'Default Ambient Playlist',
          content_type: 'video',
          offline_since: !isOnline ? d.lastConnection || d.updatedAt : null,
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

