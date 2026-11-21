import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/storesparc/auth';
import { apiError } from '@/lib/storesparc/errors';

export async function GET(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  return NextResponse.json({
    user_id: caller!.userId,
    display_name: caller!.displayName,
    role: caller!.role,
    store: {
      id: caller!.storeId,
      name: caller!.storeName || 'Sparc Store',
      locality: caller!.locality || 'Downtown',
    },
    mfa_required: false,
  });
}

