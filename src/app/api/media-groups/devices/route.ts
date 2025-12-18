import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import MediaGroup from '@/models/MediaGroups';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { groupId, deviceIds } = body;

    if (!groupId || !deviceIds || !Array.isArray(deviceIds)) {
      return NextResponse.json(
        { error: 'groupId and deviceIds array are required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json(
        { error: 'Invalid groupId format' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const validDeviceIds = deviceIds
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      .map((id: string) => new mongoose.Types.ObjectId(id));

    const updatedGroup = await MediaGroup.findByIdAndUpdate(
      groupId,
      { 
        $addToSet: { deviceIds: { $each: validDeviceIds } },
        updatedAt: new Date()
      },
      { new: true }
    ).populate('deviceIds');

    if (!updatedGroup) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Assigned ${validDeviceIds.length} devices to group`,
      group: updatedGroup
    });
  } catch (error) {
    console.error('Error assigning devices to group:', error);
    return NextResponse.json(
      { error: 'Failed to assign devices to group' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { groupId, deviceIds } = body;

    if (!groupId) {
      return NextResponse.json(
        { error: 'groupId is required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return NextResponse.json(
        { error: 'Invalid groupId format' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const validDeviceIds = (deviceIds || [])
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      .map((id: string) => new mongoose.Types.ObjectId(id));

    const updatedGroup = await MediaGroup.findByIdAndUpdate(
      groupId,
      { 
        deviceIds: validDeviceIds,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('deviceIds');

    if (!updatedGroup) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      group: updatedGroup
    });
  } catch (error) {
    console.error('Error updating device assignments:', error);
    return NextResponse.json(
      { error: 'Failed to update device assignments' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const groupId = req.nextUrl.searchParams.get('groupId');
    const deviceId = req.nextUrl.searchParams.get('deviceId');

    if (!groupId || !deviceId) {
      return NextResponse.json(
        { error: 'groupId and deviceId are required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(deviceId)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const updatedGroup = await MediaGroup.findByIdAndUpdate(
      groupId,
      { 
        $pull: { deviceIds: new mongoose.Types.ObjectId(deviceId) },
        updatedAt: new Date()
      },
      { new: true }
    ).populate('deviceIds');

    if (!updatedGroup) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Device removed from group',
      group: updatedGroup
    });
  } catch (error) {
    console.error('Error removing device from group:', error);
    return NextResponse.json(
      { error: 'Failed to remove device from group' },
      { status: 500 }
    );
  }
}