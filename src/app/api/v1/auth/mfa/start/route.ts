import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import MfaChallenge from '@/models/MfaChallenge';
import { apiError } from '@/lib/storesparc/errors';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.user_id || req.headers.get('x-user-id');
    const method = body.method || 'sms';

    if (!userId) {
      return apiError('BAD_REQUEST', 'user_id is required to start MFA challenge', 400);
    }

    await connectToDatabase();
    const dbUser = await User.findById(userId).catch(() => null);

    const challengeId = crypto.randomUUID();
    const code = process.env.NODE_ENV === 'production' 
      ? Math.floor(100000 + Math.random() * 900000).toString()
      : '123456';

    let destinationHint = '+91 ****** 4321';
    if (dbUser?.phone) {
      const p = dbUser.phone.trim();
      destinationHint = p.length > 4 ? `+** ****** ${p.slice(-4)}` : '+91 ****** 4321';
    } else if (dbUser?.email) {
      const parts = dbUser.email.split('@');
      destinationHint = `${parts[0].slice(0, 2)}***@${parts[1] || 'domain.com'}`;
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await MfaChallenge.create({
      challengeId,
      userId,
      method,
      code,
      destinationHint,
      verified: false,
      expiresAt,
    });

    return NextResponse.json({
      challenge_id: challengeId,
      method,
      code_length: 6,
      destination_hint: destinationHint,
      expires_in_seconds: 300,
    });
  } catch (error: any) {
    console.error('MFA start error:', error);
    return apiError('INTERNAL_ERROR', error.message || 'Failed to initiate MFA challenge', 500);
  }
}

