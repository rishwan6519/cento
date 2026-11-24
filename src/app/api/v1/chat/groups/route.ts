import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import StoreConfig from '@/models/StoreConfig';
import { requireAuth } from '@/lib/storesparc/auth';
import { apiError } from '@/lib/storesparc/errors';

export async function GET(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();

    const storeId = caller!.storeId;
    let config = await StoreConfig.findOne({ storeId });

    if (!config) {
      config = {
        storeId,
        storeName: 'Store ' + storeId,
        whatsAppGroupLink: 'https://chat.whatsapp.com/testgroup',
        centralWhatsAppLink: 'https://chat.whatsapp.com/StoreSparcCentral',
      } as any;
    }

    const storeLink = config.whatsAppGroupLink || 'https://chat.whatsapp.com/testgroup';
    const centralLink = config.centralWhatsAppLink || 'https://chat.whatsapp.com/StoreSparcCentral';

    const groups = [
      {
        id: `store-${storeId}`,
        name: `${config.storeName || 'Store'} Team`,
        kind: 'store' as const,
        whatsapp_deep_link: storeLink,
        description: 'Store daily operations, team coordination, and shift covers',
      },
      {
        id: 'central-operations',
        name: 'Store Sparc Central Support',
        kind: 'Central' as const,
        whatsapp_deep_link: centralLink,
        description: 'Central operations, IT escalations, and corporate support',
      },
    ];

    return NextResponse.json({
      groups,
    });
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', error.message || 'Failed to fetch groups', 500);
  }
}
