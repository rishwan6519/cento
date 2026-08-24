import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import mongoose from 'mongoose';
import ActivityLog from '@/models/ActivityLog';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    
    // creatorId is the ID of the user creating this sub-user
    const { creatorId, username, password, role, ...otherDetails } = body;

    if (!creatorId || !username || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const creator = await User.findById(creatorId);
    if (!creator) {
      return NextResponse.json({ error: 'Creator user not found' }, { status: 404 });
    }

    if (creator.createdBy) {
      return NextResponse.json({ error: 'Sub-users are not allowed to create other sub-users' }, { status: 403 });
    }

    // Ensure the username is unique
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }

    // Create the sub-user
    const subUser = await User.create({
      username,
      password, // Note: In a real app, hash this password!
      role,
      createdBy: creatorId,
      ...otherDetails
    });

    // Log the activity
    await ActivityLog.create({
      userId: creatorId,
      action: 'CREATE_SUB_USER',
      entityType: 'User',
      entityId: subUser._id,
      details: { createdUsername: username, role }
    });

    return NextResponse.json({ success: true, user: subUser }, { status: 201 });
  } catch (error) {
    console.error('Error creating sub-user:', error);
    return NextResponse.json({ error: 'Failed to create sub-user' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const creatorId = url.searchParams.get('creatorId');

    if (!creatorId) {
      return NextResponse.json({ error: 'creatorId is required' }, { status: 400 });
    }

    const subUsers = await User.find({ createdBy: creatorId }).select('-password');
    return NextResponse.json({ success: true, users: subUsers });
  } catch (error) {
    console.error('Error fetching sub-users:', error);
    return NextResponse.json({ error: 'Failed to fetch sub-users' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const { userId, updaterId, ...updates } = body;

    if (!userId || !updaterId) {
      return NextResponse.json({ error: 'userId and updaterId are required' }, { status: 400 });
    }

    // Optional: verify that the updaterId actually created this user
    const userToUpdate = await User.findById(userId);
    if (!userToUpdate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (userToUpdate.createdBy?.toString() !== updaterId) {
       return NextResponse.json({ error: 'Unauthorized to update this user' }, { status: 403 });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true }).select('-password');

    // Log the activity
    await ActivityLog.create({
      userId: updaterId,
      action: 'UPDATE_SUB_USER',
      entityType: 'User',
      entityId: userId,
      details: { updates }
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Error updating sub-user:', error);
    return NextResponse.json({ error: 'Failed to update sub-user' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const deleterId = url.searchParams.get('deleterId');

    if (!userId || !deleterId) {
      return NextResponse.json({ error: 'userId and deleterId are required' }, { status: 400 });
    }

    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (userToDelete.createdBy?.toString() !== deleterId) {
       return NextResponse.json({ error: 'Unauthorized to delete this user' }, { status: 403 });
    }

    // Soft delete by updating accountStatus
    const deletedUser = await User.findByIdAndUpdate(userId, { accountStatus: 'deleted' }, { new: true });

    // Log the activity
    await ActivityLog.create({
      userId: deleterId,
      action: 'DELETE_SUB_USER',
      entityType: 'User',
      entityId: userId,
      details: { username: userToDelete.username }
    });

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting sub-user:', error);
    return NextResponse.json({ error: 'Failed to delete sub-user' }, { status: 500 });
  }
}
