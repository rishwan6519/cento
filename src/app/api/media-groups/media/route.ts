import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import MediaGroup from '@/models/MediaGroups';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { groupId, mediaIds } = body;

    if (!groupId || !mediaIds || !Array.isArray(mediaIds)) {
      return NextResponse.json(
        { error: 'groupId and mediaIds array are required' },
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

    const validMediaIds = mediaIds
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      .map((id: string) => new mongoose.Types.ObjectId(id));

    const updatedGroup = await MediaGroup.findByIdAndUpdate(
      groupId,
      { 
        $addToSet: { mediaIds: { $each: validMediaIds } },
        updatedAt: new Date()
      },
      { new: true }
    ).populate('mediaIds');

    if (!updatedGroup) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Added ${validMediaIds.length} media files to group`,
      group: updatedGroup
    });
  } catch (error) {
    console.error('Error adding media to group:', error);
    return NextResponse.json(
      { error: 'Failed to add media to group' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const groupId = req.nextUrl.searchParams.get('groupId');
    const mediaId = req.nextUrl.searchParams.get('mediaId');

    if (!groupId || !mediaId) {
      return NextResponse.json(
        { error: 'groupId and mediaId are required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(groupId) || !mongoose.Types.ObjectId.isValid(mediaId)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const updatedGroup = await MediaGroup.findByIdAndUpdate(
      groupId,
      { 
        $pull: { mediaIds: new mongoose.Types.ObjectId(mediaId) },
        updatedAt: new Date()
      },
      { new: true }
    ).populate('mediaIds');

    if (!updatedGroup) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Media removed from group',
      group: updatedGroup
    });
  } catch (error) {
    console.error('Error removing media from group:', error);
    return NextResponse.json(
      { error: 'Failed to remove media from group' },
      { status: 500 }
    );
  }
}