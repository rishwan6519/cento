import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import IdempotencyRecord from '@/models/IdempotencyRecord';

export async function withIdempotency(
  req: NextRequest,
  userId: string,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const idempotencyKey = req.headers.get('idempotency-key') || req.headers.get('Idempotency-Key');

  // If no idempotency key is provided, execute normally
  if (!idempotencyKey) {
    return handler();
  }

  await connectToDatabase();
  const endpoint = req.nextUrl.pathname;

  // Check if key already processed for this user
  const existing = await IdempotencyRecord.findOne({
    key: idempotencyKey,
    userId,
  });

  if (existing) {
    return NextResponse.json(existing.responseBody, {
      status: existing.responseStatus,
      headers: {
        'X-Idempotent-Replay': 'true',
      },
    });
  }

  // Execute handler
  const response = await handler();

  // Cache response if status is 2xx or 4xx (not 5xx server errors, so temporary server errors can retry)
  if (response.status < 500) {
    try {
      const cloned = response.clone();
      const body = await cloned.json();
      await IdempotencyRecord.create({
        key: idempotencyKey,
        userId,
        endpoint,
        responseStatus: response.status,
        responseBody: body,
      });
    } catch {
      // If response body isn't JSON, omit saving
    }
  }

  return response;
}

