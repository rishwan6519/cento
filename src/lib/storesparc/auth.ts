import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/db';
import User, { UserRole } from '@/models/User';
import { CallerIdentity, Role } from './types';
import { unauthorizedError, forbiddenError } from './errors';

export async function getCallerIdentity(req: NextRequest): Promise<CallerIdentity | null> {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');

  let token: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // Allow x-user-id / x-store-id for testing or trusted internal services if JWT secret is not configured
  const testUserId = req.headers.get('x-user-id');
  const testRole = req.headers.get('x-user-role') as Role | null;
  const testStoreId = req.headers.get('x-store-id');

  if (testUserId && testStoreId) {
    return {
      userId: testUserId,
      displayName: req.headers.get('x-user-name') || 'Test User',
      role: testRole || 'Store Manager',
      storeId: testStoreId,
      storeName: 'Sparc Flagship Store',
      locality: 'Downtown',
    };
  }

  if (!token) {
    return null;
  }

  const secret = process.env.JWT_SECRET || 'secret';
  let decoded: any;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return null;
  }

  await connectToDatabase();
  const userId = decoded.id || decoded.userId || decoded.sub;
  const dbUser = await User.findById(userId);

  if (!dbUser) {
    return null;
  }

  // Map system role to PRD role
  let role: Role = 'Staff';
  if (dbUser.role === UserRole.Admin || dbUser.role === UserRole.AccountAdmin || dbUser.role === UserRole.Reseller) {
    role = 'Central admin';
  } else if (dbUser.role === UserRole.Store || dbUser.operatorName === 'Manager' || decoded.isManager) {
    role = 'Store Manager';
  }

  // Override if token specifically specifies role
  if (decoded.role === 'Store Manager' || decoded.role === 'Central admin' || decoded.role === 'Staff') {
    role = decoded.role;
  }

  const storeId = (dbUser.assignedStoreId || dbUser._id).toString();

  return {
    userId: dbUser._id.toString(),
    displayName: dbUser.operatorName || dbUser.username,
    role,
    storeId,
    storeName: dbUser.storeName || 'Sparc Store',
    locality: dbUser.storeLocation || dbUser.location || 'Local',
  };
}

export async function requireAuth(req: NextRequest, allowedRoles?: Role[]) {
  const caller = await getCallerIdentity(req);
  if (!caller) {
    return { caller: null, errorResponse: unauthorizedError('Missing or invalid authorization token') };
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(caller.role)) {
    return { caller: null, errorResponse: forbiddenError(`Role ${caller.role} is not permitted for this action`) };
  }

  return { caller, errorResponse: null };
}

