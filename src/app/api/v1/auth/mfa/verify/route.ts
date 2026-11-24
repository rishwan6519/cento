import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/db';
import User, { UserRole } from '@/models/User';
import MfaChallenge from '@/models/MfaChallenge';
import { Role } from '@/lib/storesparc/types';
import { apiError } from '@/lib/storesparc/errors';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { challenge_id, code } = body;

    if (!challenge_id || !code) {
      return apiError('BAD_REQUEST', 'challenge_id and code are required', 400);
    }

    await connectToDatabase();
    const challenge = await MfaChallenge.findOne({ challengeId: challenge_id });

    if (!challenge) {
      return apiError('NOT_FOUND', 'MFA challenge not found or already used', 404);
    }

    if (new Date() > challenge.expiresAt) {
      return apiError('EXPIRED_MFA_CODE', 'MFA code has expired. Please request a new one.', 400);
    }

    if (challenge.code !== code.trim()) {
      return apiError('INVALID_MFA_CODE', 'The verification code provided is incorrect', 400);
    }

    // Mark as verified
    challenge.verified = true;
    await challenge.save();

    // Look up user to generate validated session token
    const dbUser = await User.findById(challenge.userId);
    let role: Role = 'Staff';
    if (dbUser) {
      if (dbUser.role === UserRole.Admin || dbUser.role === UserRole.AccountAdmin || dbUser.role === UserRole.Reseller) {
        role = 'Central admin';
      } else if (dbUser.role === UserRole.Store || dbUser.operatorName === 'Manager') {
        role = 'Store Manager';
      }
    }

    const storeId = dbUser ? (dbUser.assignedStoreId || dbUser._id).toString() : 'STORE-001';
    const secret = process.env.JWT_SECRET || 'secret';

    const token = jwt.sign(
      {
        userId: challenge.userId,
        userName: dbUser?.username || 'Verified User',
        role,
        storeId,
        mfaVerified: true,
      },
      secret,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      verified: true,
      message: 'MFA challenge verified successfully',
      token,
      user_id: challenge.userId,
      role,
    });
  } catch (error: any) {
    console.error('MFA verify error:', error);
    return apiError('INTERNAL_ERROR', error.message || 'Failed to verify MFA challenge', 500);
  }
}
