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
    const storeParam =
      req.nextUrl.searchParams.get('store_id') || req.nextUrl.searchParams.get('store');
    const storeId = storeParam || caller!.storeId;

    let config = await StoreConfig.findOne({ storeId });

    if (!config) {
      // Auto-create default store config for this store if not yet provisioned
      config = await StoreConfig.create({
        storeId,
        storeName: caller!.storeName || 'Sparc Store ' + storeId,
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
      central_whatsapp_link: config.centralWhatsAppLink,
      lateness_grace_minutes: config.latenessGraceMinutes ?? 5,
      break_rules: config.breakRules
        ? {
            meal_break_minutes: config.breakRules.mealBreakMinutes,
            threshold_hours: config.breakRules.thresholdHours,
            auto_deduct: config.breakRules.autoDeduct,
          }
        : { meal_break_minutes: 30, threshold_hours: 5, auto_deduct: true },
      availability_deadline: config.availabilityDeadline
        ? {
            weekday: config.availabilityDeadline.weekday,
            time: config.availabilityDeadline.time,
          }
        : { weekday: 3, time: '23:59' },
      currency: config.currency || 'AUD',
      currency_symbol: config.currencySymbol || '$',
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
    const {
      store_id,
      latitude,
      longitude,
      geofence_radius,
      trading_hours,
      signage_rotation,
      max_announcement_length,
      whatsapp_group_link,
      central_whatsapp_link,
      store_name,
      time_zone,
      lateness_grace_minutes,
      break_rules,
      availability_deadline,
      currency,
      currency_symbol,
    } = body;

    await connectToDatabase();
    const targetStoreId = (caller!.role === 'Central admin' && store_id) ? store_id : caller!.storeId;
    const updateData: any = {};

    if (typeof latitude === 'number') updateData.latitude = latitude;
    if (typeof longitude === 'number') updateData.longitude = longitude;
    if (typeof geofence_radius === 'number') updateData.geofenceRadius = geofence_radius;
    if (typeof signage_rotation === 'number') updateData.signageRotation = signage_rotation;
    if (typeof max_announcement_length === 'number') updateData.maxAnnouncementLength = max_announcement_length;
    if (whatsapp_group_link !== undefined) updateData.whatsAppGroupLink = whatsapp_group_link;
    if (central_whatsapp_link !== undefined) updateData.centralWhatsAppLink = central_whatsapp_link;
    if (store_name) updateData.storeName = store_name;
    if (time_zone) updateData.timeZone = time_zone;
    if (typeof lateness_grace_minutes === 'number') updateData.latenessGraceMinutes = lateness_grace_minutes;
    if (currency) updateData.currency = currency;
    if (currency_symbol) updateData.currencySymbol = currency_symbol;

    if (break_rules) {
      updateData.breakRules = {
        mealBreakMinutes: break_rules.meal_break_minutes ?? 30,
        thresholdHours: break_rules.threshold_hours ?? 5,
        autoDeduct: break_rules.auto_deduct ?? true,
      };
    }

    if (availability_deadline) {
      updateData.availabilityDeadline = {
        weekday: availability_deadline.weekday ?? 3,
        time: availability_deadline.time ?? '23:59',
      };
    }

    if (Array.isArray(trading_hours)) {
      updateData.tradingHours = trading_hours.map((th: any) => ({
        weekday: th.weekday,
        openMinutes: th.open_minutes ?? th.openMinutes ?? 540,
        closeMinutes: th.close_minutes ?? th.closeMinutes ?? 1260,
        isClosed: th.is_closed ?? th.isClosed ?? false,
      }));
    }

    const config = await StoreConfig.findOneAndUpdate(
      { storeId: targetStoreId },
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
      central_whatsapp_link: config.centralWhatsAppLink,
      lateness_grace_minutes: config.latenessGraceMinutes ?? 5,
      break_rules: config.breakRules
        ? {
            meal_break_minutes: config.breakRules.mealBreakMinutes,
            threshold_hours: config.breakRules.thresholdHours,
            auto_deduct: config.breakRules.autoDeduct,
          }
        : { meal_break_minutes: 30, threshold_hours: 5, auto_deduct: true },
      availability_deadline: config.availabilityDeadline
        ? {
            weekday: config.availabilityDeadline.weekday,
            time: config.availabilityDeadline.time,
          }
        : { weekday: 3, time: '23:59' },
      currency: config.currency || 'AUD',
      currency_symbol: config.currencySymbol || '$',
    });
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', error.message || 'Failed to update store configuration', 500);
  }
}
