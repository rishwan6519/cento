import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/storesparc/auth';
import { connectToDatabase } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { caller } = await requireAuth(req);

  try {
    const body = await req.json().catch(() => ({}));
    await connectToDatabase();

    // If caller provided a push registration device_token, remove it
    if (caller && body.device_token) {
      const PushSubscription = (await import('@/models/PushSubscription').catch(() => null))?.default;
      if (PushSubscription) {
        await PushSubscription.deleteOne({ userId: caller.userId, deviceToken: body.device_token });
      }
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

