import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import SocialPost from '@/models/SocialPost';
import User from '@/models/User';

// ─── GET /api/social/planner ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const view = searchParams.get('view') === 'month' ? 'month' : 'week';
    const channel = searchParams.get('channel') || 'all';
    const anchorStr = searchParams.get('date') || searchParams.get('week');

    const anchor = anchorStr ? new Date(anchorStr) : new Date();
    if (isNaN(anchor.getTime())) {
      return NextResponse.json({ success: false, message: 'Invalid anchor date' }, { status: 400 });
    }

    // Determine date range based on view
    let start: Date;
    let end: Date;

    if (view === 'month') {
      start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      // Pad to start of week (Monday)
      const dayOfWeek = start.getDay();
      const diffToMon = (dayOfWeek + 6) % 7;
      start.setDate(start.getDate() - diffToMon);
      start.setHours(0, 0, 0, 0);

      end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
      const endDayOfWeek = end.getDay();
      const diffToSun = (7 - endDayOfWeek) % 7;
      end.setDate(end.getDate() + diffToSun);
      end.setHours(23, 59, 59, 999);
    } else {
      // Week view: 7 days starting from Monday
      const dayOfWeek = anchor.getDay();
      const diffToMon = (dayOfWeek + 6) % 7;
      start = new Date(anchor);
      start.setDate(anchor.getDate() - diffToMon);
      start.setHours(0, 0, 0, 0);

      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    }

    const storeUserId = searchParams.get('storeUserId') || searchParams.get('userId');
    const filter: any = {
      scheduledAt: { $gte: start, $lte: end },
    };

    if (storeUserId && storeUserId.trim()) {
      const trimmedUid = storeUserId.trim();
      let userIdsToFetch: any[] = [];
      if (mongoose.Types.ObjectId.isValid(trimmedUid)) {
        const targetObjId = new mongoose.Types.ObjectId(trimmedUid);
        const userDoc = await User.findById(targetObjId).lean();
        if (userDoc) {
          if (userDoc.role === 'account_admin' || userDoc.role === 'admin') {
            const managedStores = await User.find({
              $or: [
                { _id: targetObjId },
                { controllerId: targetObjId },
                ...(userDoc.customerId ? [{ customerId: userDoc.customerId }] : []),
                { createdBy: targetObjId },
              ],
            }).select('_id').lean();
            userIdsToFetch = managedStores.map((u: any) => u._id);
          } else {
            const parentId = userDoc.controllerId || userDoc.createdBy;
            if (parentId) {
              const familyStores = await User.find({
                $or: [
                  { _id: targetObjId },
                  { _id: parentId },
                  { controllerId: parentId },
                  { createdBy: parentId },
                ],
              }).select('_id').lean();
              userIdsToFetch = familyStores.map((u: any) => u._id);
            } else {
              userIdsToFetch = [targetObjId];
            }
          }
        } else {
          userIdsToFetch = [targetObjId];
        }
      }

      if (userIdsToFetch.length > 0) {
        filter.storeUserId = { $in: userIdsToFetch };
      } else {
        filter.storeUserId = trimmedUid;
      }
    }

    if (channel && channel !== 'all') {
      filter.channel = channel.toLowerCase();
    }

    const posts = await SocialPost.find(filter).sort({ scheduledAt: 1 }).lean();

    // Map posts by date string 'YYYY-MM-DD'
    const postsByDate: Record<string, any[]> = {};
    for (const post of posts) {
      if (post.scheduledAt) {
        const dStr = new Date(post.scheduledAt).toISOString().split('T')[0];
        if (!postsByDate[dStr]) postsByDate[dStr] = [];
        postsByDate[dStr].push(post);
      }
    }

    // Generate days array
    const days: any[] = [];
    const cur = new Date(start);
    const todayStr = new Date().toISOString().split('T')[0];
    const targetMonth = anchor.getMonth();

    while (cur <= end) {
      const dStr = cur.toISOString().split('T')[0];
      const weekday = cur.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = cur.getDate();

      days.push({
        date: dStr,
        weekday,
        day_num: dayNum,
        is_today: dStr === todayStr,
        in_month: cur.getMonth() === targetMonth,
        posts: postsByDate[dStr] || [],
      });

      cur.setDate(cur.getDate() + 1);
    }

    return NextResponse.json({
      success: true,
      view,
      channel,
      start: start.toISOString(),
      end: end.toISOString(),
      days,
    });
  } catch (error: any) {
    console.error('Error in social planner API:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to build social calendar', error: error?.message },
      { status: 500 }
    );
  }
}
