import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/db';
import User, { UserRole } from '@/models/User';
import { Role } from '@/lib/storesparc/types';
import { apiError, unauthorizedError, forbiddenError } from '@/lib/storesparc/errors';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return apiError('BAD_REQUEST', 'Username and password are required', 400);
    }

    await connectToDatabase();

    const dbUser = await User.findOne({ username });
    if (!dbUser) {
      return unauthorizedError('Invalid credentials');
    }

    if (dbUser.accountStatus === 'paused' || dbUser.accountStatus === 'deleted') {
      return forbiddenError(`Account is ${dbUser.accountStatus}. Please contact support.`);
    }

    const isPasswordValid = await bcrypt.compare(password, dbUser.password);
    if (!isPasswordValid) {
      return unauthorizedError('Invalid credentials');
    }

    // Determine PRD role
    let role: Role = 'Staff';
    if (dbUser.role === UserRole.Admin || dbUser.role === UserRole.AccountAdmin || dbUser.role === UserRole.Reseller) {
      role = 'Central admin';
    } else if (dbUser.role === UserRole.Store || dbUser.operatorName === 'Manager') {
      role = 'Store Manager';
    }

    const storeId = (dbUser.assignedStoreId || dbUser._id).toString();
    const secret = process.env.JWT_SECRET || 'secret';

    const token = jwt.sign(
      {
        userId: dbUser._id.toString(),
        userName: dbUser.username,
        role,
        storeId,
      },
      secret,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      message: 'Login successful',
      token,
      user_id: dbUser._id.toString(),
      display_name: dbUser.operatorName || dbUser.username,
      role,
      store: {
        id: storeId,
        name: dbUser.storeName || 'Sparc Flagship Store',
        locality: dbUser.storeLocation || dbUser.location || 'Local',
      },
    });
  } catch (err: any) {
    console.error('v1 auth login error:', err);
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: err.message || 'Login failed' } }, { status: 500 });
  }
}
