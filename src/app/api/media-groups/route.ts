import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import MediaGroup from '@/models/MediaGroups';
import MediaItemModel from '@/models/MediaItems';
import mongoose from 'mongoose';
import  "@/models/MediaItems"

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: 'Invalid or missing userId' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const groups = await MediaGroup.find({ 
      userId: new mongoose.Types.ObjectId(userId) 
    })
    .populate('mediaIds')
    .populate('deviceIds')
    .sort({ createdAt: -1 });

    const groupsData = groups.map(group => ({
      _id: group._id,
      name: group.name,
      description: group.description,
      mediaCount: group.mediaIds?.length || 0,
      deviceCount: group.deviceIds?.length || 0,
      mediaIds: group.mediaIds,
      deviceIds: group.deviceIds,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt
    }));

    return NextResponse.json({ 
      success: true,
      groups: groupsData
    });
  } catch (error) {
    console.error('Error fetching media groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media groups' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, name, description, mediaIds } = body;

    if (!userId || !name) {
      return NextResponse.json(
        { error: 'userId and name are required' },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: 'Invalid userId format' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const existingGroup = await MediaGroup.findOne({ 
      userId: new mongoose.Types.ObjectId(userId), 
      name: name.trim()
    });

    if (existingGroup) {
      return NextResponse.json(
        { error: 'A group with this name already exists' },
        { status: 409 }
      );
    }

    const validMediaIds = (mediaIds || [])
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      .map((id: string) => new mongoose.Types.ObjectId(id));

    const newGroup = await MediaGroup.create({
      userId: new mongoose.Types.ObjectId(userId),
      name: name.trim(),
      description: description?.trim() || '',
      mediaIds: validMediaIds,
      deviceIds: []
    });

    const populatedGroup = await MediaGroup.findById(newGroup._id)
      .populate('mediaIds');

    return NextResponse.json({ 
      success: true, 
      group: populatedGroup 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating media group:', error);
    
    if ((error as any).code === 11000) {
      return NextResponse.json(
        { error: 'A group with this name already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create media group' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { groupId, name, description, mediaIds, deviceIds } = body;

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

    const updateData: any = {
      updatedAt: new Date()
    };

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description.trim();
    }

    if (mediaIds !== undefined) {
      updateData.mediaIds = mediaIds
        .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
        .map((id: string) => new mongoose.Types.ObjectId(id));
    }

    if (deviceIds !== undefined) {
      updateData.deviceIds = deviceIds
        .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
        .map((id: string) => new mongoose.Types.ObjectId(id));
    }

    const updatedGroup = await MediaGroup.findByIdAndUpdate(
      groupId,
      updateData,
      { new: true }
    ).populate('mediaIds').populate('deviceIds');

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
    console.error('Error updating media group:', error);
    
    if ((error as any).code === 11000) {
      return NextResponse.json(
        { error: 'A group with this name already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update media group' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const groupId = req.nextUrl.searchParams.get('groupId');

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

    const deletedGroup = await MediaGroup.findByIdAndDelete(groupId);

    if (!deletedGroup) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting media group:', error);
    return NextResponse.json(
      { error: 'Failed to delete media group' },
      { status: 500 }
    );
  }
}