import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import ActivityLog from '@/models/ActivityLog';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // A user can see their own logs AND the logs of any sub-users they created.
    const subUsers = await User.find({ createdBy: userId }).select('_id');
    const userIds = [userId, ...subUsers.map(u => u._id.toString())];

    const logs = await ActivityLog.find({ userId: { $in: userIds } })
      .populate('userId', 'username role') // Include user info in logs
      .sort({ createdAt: -1 })
      .limit(200); // Reasonable limit for now

    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // A user can clear their own logs AND the logs of any sub-users they created.
    const subUsers = await User.find({ createdBy: userId }).select('_id');
    const userIds = [userId, ...subUsers.map(u => u._id.toString())];

    await ActivityLog.deleteMany({ userId: { $in: userIds } });

    return NextResponse.json({ success: true, message: 'Logs cleared successfully' });
  } catch (error) {
    console.error('Error clearing audit logs:', error);
    return NextResponse.json({ error: 'Failed to clear audit logs' }, { status: 500 });
  }
}
