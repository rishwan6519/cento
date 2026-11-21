import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Device from '@/models/Device';
import OfflineScreenReport from '@/models/OfflineScreenReport';
import { requireAuth } from '@/lib/storesparc/auth';
import { withIdempotency } from '@/lib/storesparc/idempotency';
import { apiError, notFoundError } from '@/lib/storesparc/errors';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { caller, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  const { id } = await context.params;

  return withIdempotency(req, caller!.userId, async () => {
    try {
      await connectToDatabase();
      const storeId = caller!.storeId;

      const device = await Device.findById(id);
      if (!device) {
        return notFoundError('Screen device not found');
      }

      const reportTime = new Date();
      let report = await OfflineScreenReport.findOne({ storeId, screenId: id });

      if (!report) {
        report = await OfflineScreenReport.create({
          storeId,
          screenId: id,
          reportedBy: caller!.displayName,
          reportedAt: reportTime,
          status: 'reported',
        });
      }

      return NextResponse.json({
        id: device._id.toString(),
        store_id: storeId,
        name: device.name,
        online: false,
        reported_at: report.reportedAt.toISOString(),
        reported_by: report.reportedBy,
        message: 'Offline screen successfully reported to Central',
      });
    } catch (error: any) {
      return apiError('INTERNAL_ERROR', error.message || 'Failed to report offline screen', 500);
    }
  });
}

