import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import PushDevice from '@/models/PushDevice';
import User from '@/models/User';
import { requireAuth } from '@/lib/storesparc/auth';
import { withIdempotency } from '@/lib/storesparc/idempotency';
import { apiError } from '@/lib/storesparc/errors';

export async function POST(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  return withIdempotency(req, caller!.userId, async () => {
    try {
      await connectToDatabase();
      const body = await req.json();
      const { token, platform = 'Android', app_id = 'com.storesparc.ops', environment = 'production' } = body;

      if (!token || typeof token !== 'string' || token.trim() === '') {
        return apiError('VALIDATION_ERROR', 'Field "token" (string) is required', 400);
      }

      const validPlatform = platform === 'iOS' ? 'iOS' : 'Android';
      const validEnvironment = ['production', 'staging', 'sandbox'].includes(environment)
        ? environment
        : 'production';

      // 1. Upsert device token in PushDevice collection
      await PushDevice.findOneAndUpdate(
        { token: token.trim() },
        {
          userId: caller!.userId,
          platform: validPlatform,
          appId: app_id || 'com.storesparc.ops',
          environment: validEnvironment,
          lastActive: new Date(),
        },
        { upsert: true, new: true }
      );

      // 2. Also keep user.fcmTokens set updated for backwards compatibility
      await User.findByIdAndUpdate(caller!.userId, {
        $addToSet: { fcmTokens: token.trim() },
      }).catch(() => null);

      return NextResponse.json({
        registered: true,
        token: token.trim(),
        platform: validPlatform,
        app_id: app_id || 'com.storesparc.ops',
        environment: validEnvironment,
        message: 'Device push token registered successfully',
      });
    } catch (error: any) {
      return apiError('INTERNAL_ERROR', error.message || 'Failed to register device push token', 500);
    }
  });
}
