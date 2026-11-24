import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/storesparc/auth';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';

export async function POST(req: NextRequest) {
  const { caller } = await requireAuth(req);

  try {
    const body = await req.json().catch(() => ({}));
    await connectToDatabase();

    // If caller provided a push registration device_token, remove it from their profile
    if (caller && body.device_token) {
      await User.findByIdAndUpdate(caller.userId, {
        $pull: { fcmTokens: body.device_token },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Session signed out successfully from server',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: true,
      message: 'Session cleared',
    });
  }
}
