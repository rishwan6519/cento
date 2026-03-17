import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Announcement from '@/models/AnnouncementFiles';
import mongoose from 'mongoose';

export async function GET(req: NextRequest) {
  await connectToDatabase();

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    let query: any = {};
    
    if (userId) {
      // Look up the user to find their controllerId (super user)
      const User = mongoose.models.User;
      let userIds = [userId];
      
      if (User) {
        const user = await User.findById(userId).select('controllerId');
        if (user?.controllerId) {
          // Include announcements from both the user AND their super user (controller)
          userIds.push(user.controllerId.toString());
        }
      }
      
      query = { userId: { $in: userIds } };
    }

    const announcements = await Announcement.find(query).sort({ createdAt: -1 });

    return NextResponse.json(announcements, { status: 200 });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return NextResponse.json({ message: 'Failed to fetch announcements' }, { status: 500 });
  }
}
