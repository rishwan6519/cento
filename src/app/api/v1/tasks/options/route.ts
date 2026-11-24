import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { requireAuth } from '@/lib/storesparc/auth';
import { apiError } from '@/lib/storesparc/errors';

export async function GET(req: NextRequest) {
  const { caller, errorResponse } = await requireAuth(req, ['Store Manager', 'Central admin']);
  if (errorResponse) return errorResponse;

  try {
    await connectToDatabase();
    const storeId = caller!.storeId;

    // Fetch active staff in this store
    const storeStaff = await User.find({
      $or: [
        { assignedStoreId: storeId },
        { storeLocation: storeId },
        { role: 'user' },
        { role: 'Staff' },
      ],
    }).sort({ username: 1 });

    const staffList = storeStaff.map((u) => ({
      id: u._id.toString(),
      name: u.operatorName || u.username,
      role: u.role || 'Staff',
    }));

    const categories = [
      {
        key: 'group',
        label: 'Group Task',
        description: 'General task open to anyone on shift at the store',
        needs_role: false,
        eligible: 'All Store Staff',
      },
      {
        key: 'priority',
        label: 'Priority Task',
        description: 'Urgent task broadcast to all staff with priority notifications',
        needs_role: false,
        eligible: 'All Store Staff',
      },
      {
        key: 'role_specific',
        label: 'Role-Specific Task',
        description: 'Task restricted to staff members with a designated operational role',
        needs_role: true,
        eligible: 'Staff matching designated role',
      },
      {
        key: 'manager_only',
        label: 'Manager Only',
        description: 'Confidential managerial task hidden from regular staff',
        needs_role: false,
        eligible: 'Store Managers and Central Admin',
      },
    ];

    const roles = [
      {
        key: 'Cashier',
        label: 'Cashier / Registers',
        eligible_staff: staffList,
      },
      {
        key: 'Stockroom',
        label: 'Stockroom / Inventory',
        eligible_staff: staffList,
      },
      {
        key: 'Visual Merchandiser',
        label: 'Visual Merchandiser',
        eligible_staff: staffList,
      },
      {
        key: 'Keyholder',
        label: 'Keyholder / Closing Supervisor',
        eligible_staff: staffList,
      },
    ];

    return NextResponse.json({
      store_id: storeId,
      categories,
      roles,
      eligible_staff: staffList,
    });
  } catch (error: any) {
    return apiError('INTERNAL_ERROR', error.message || 'Failed to fetch task form options', 500);
  }
}
