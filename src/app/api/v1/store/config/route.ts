import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import StoreConfig from '@/models/StoreConfig';
import { requireAuth } from '@/lib/storesparc/auth';
import { apiError } from '@/lib/storesparc/errors';

export async function GET(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    let config = await StoreConfig.findOne({ storeId: caller!.storeId });

    if (!config) {
      // Auto-create default store config for this store if not yet provisioned
      config = await StoreConfig.create({
        storeId: caller!.storeId,
        storeName: caller!.storeName || 'Sparc Store',
        latitude: 12.9716,
        longitude: 77.5946,
        geofenceRadius: 150,
        signageRotation: 15,
        maxAnnouncementLength: 500,
        timeZone: 'Asia/Kolkata',
      });
    }

    return NextResponse.json({
      store_id: config.storeId,
      store_name: config.storeName,
      latitude: config.latitude,
      longitude: config.longitude,
      geofence_radius: config.geofenceRadius,
      trading_hours: config.tradingHours.map((th: any) => ({
        weekday: th.weekday,
        open_minutes: th.openMinutes,
        close_minutes: th.closeMinutes,
        is_closed: th.isClosed || false,
      })),
      signage_rotation: config.signageRotation,
      max_announcement_length: config.maxAnnouncementLength,
      time_zone: config.timeZone,
      whatsapp_group_link: config.whatsAppGroupLink,
    });
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', error.message || 'Failed to fetch store configuration', 500);
  }
}

