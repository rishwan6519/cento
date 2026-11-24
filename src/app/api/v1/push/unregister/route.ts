import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import PushDevice from '@/models/PushDevice';
import User from '@/models/User';
import { requireAuth } from '@/lib/storesparc/auth';
import { apiError } from '@/lib/storesparc/errors';

export async function POST(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json().catch(() => ({}));
    const { token } = body;

    if (!token || typeof token !== 'string' || token.trim() === '') {
      return apiError('VALIDATION_ERROR', 'Field "token" (string) is required', 400);
    }

    const trimmedToken = token.trim();

    // 1. Remove from PushDevice collection
    await PushDevice.deleteOne({ token: trimmedToken });

    // 2. Remove from User profile fcmTokens
    await User.findByIdAndUpdate(caller!.userId, {
      $pull: { fcmTokens: trimmedToken },
    }).catch(() => null);

    return NextResponse.json({
      unregistered: true,
      token: trimmedToken,
      message: 'Device push token unregistered successfully',
    });
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', error.message || 'Failed to unregister device push token', 500);
  }
}
