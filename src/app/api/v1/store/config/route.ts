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

export async function PUT(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req, ['Store Manager', 'Central admin']);
  if (errorResponse) return errorResponse;

  try {
    const body = await req.json();
    const { latitude, longitude, geofence_radius, trading_hours, whatsapp_group_link, store_name, time_zone } = body;

    await connectToDatabase();
    const updateData: any = {};
    if (typeof latitude === 'number') updateData.latitude = latitude;
    if (typeof longitude === 'number') updateData.longitude = longitude;
    if (typeof geofence_radius === 'number') updateData.geofenceRadius = geofence_radius;
    if (whatsapp_group_link !== undefined) updateData.whatsAppGroupLink = whatsapp_group_link;
    if (store_name) updateData.storeName = store_name;
    if (time_zone) updateData.timeZone = time_zone;
    if (Array.isArray(trading_hours)) {
      updateData.tradingHours = trading_hours.map((th: any) => ({
        weekday: th.weekday,
        openMinutes: th.open_minutes ?? th.openMinutes ?? 540,
        closeMinutes: th.close_minutes ?? th.closeMinutes ?? 1260,
        isClosed: th.is_closed ?? th.isClosed ?? false,
      }));
    }

    const config = await StoreConfig.findOneAndUpdate(
      { storeId: caller!.storeId },
      { $set: updateData },
      { new: true, upsert: true }
    );

    return NextResponse.json({
      message: 'Store configuration updated successfully',
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
    return apiError('INTERNAL_ERROR', error.message || 'Failed to update store configuration', 500);
  }
}
