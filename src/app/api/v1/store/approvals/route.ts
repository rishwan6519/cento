import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import ApprovalRequest from '@/models/ApprovalRequest';
import { requireAuth } from '@/lib/storesparc/auth';
import { apiError } from '@/lib/storesparc/errors';

export async function GET(req: NextRequest) {
  // Enforce Store Manager or Central Admin role
  const { caller, errorResponse } = await requireAuth(req, ['Store Manager', 'Central admin']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const storeId = caller!.storeId;

    const items = await ApprovalRequest.find({ storeId })
      .sort({ createdAt: -1 })
      .limit(100);

    const pending = items.filter((i) => i.status === 'pending');
    const decided = items.filter((i) => i.status !== 'pending');

    const formatItem = (item: any) => ({
      id: item._id.toString(),
      kind: item.kind,
      requester_id: item.requesterId,
      requester_name: item.requesterName,
      summary: item.summary,
      detail: item.detail,
      submitted_at: item.submittedAt.toISOString(),
      status: item.status,
      compliance_flag: item.complianceFlag || { flagged: false },
      decline_reasons: item.declineReasons || [],
      decided_at: item.decidedAt ? item.decidedAt.toISOString() : null,
      decision_reason: item.decisionReason || null,
      decided_by: item.decidedBy || null,
    });

    return NextResponse.json({
      pending: pending.map(formatItem),
      decided: decided.map(formatItem),
    });
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', error.message || 'Failed to list approvals', 500);
  }
}

