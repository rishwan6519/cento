import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { requireAuth } from '@/lib/storesparc/auth';
import { apiError } from '@/lib/storesparc/errors';

export async function POST(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return apiError('VALIDATION_ERROR', 'Field token is required', 400);
    }

    await User.findByIdAndUpdate(caller!.userId, {
      $pull: { fcmTokens: token },
    });

    return NextResponse.json({
      unregistered: true,
      message: 'Device push token unregistered successfully',
    });
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', error.message || 'Failed to unregister device', 500);
  }
}

