import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
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
      const { token, platform, app_id, environment } = body;

      if (!token) {
        return apiError('VALIDATION_ERROR', 'Field token is required', 400);
      }

      await User.findByIdAndUpdate(caller!.userId, {
        $addToSet: { fcmTokens: token },
      });

      return NextResponse.json({
        registered: true,
        platform: platform || 'Android',
        app_id: app_id || 'com.storesparc.ops',
        environment: environment || 'production',
        message: 'Device push token registered successfully',
      });
    } catch (error: any) {
      return apiError('INTERNAL_ERROR', error.message || 'Failed to register device', 500);
    }
  });
}

