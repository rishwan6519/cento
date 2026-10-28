import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import SocialPost from '@/models/SocialPost';

// ─── GET /api/social/posts/[postId] ───────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    await connectToDatabase();
    const resolvedParams = await params;
    const { postId } = resolvedParams;

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json({ success: false, message: 'Invalid post ID' }, { status: 400 });
    }

    const post = await SocialPost.findById(postId).lean();
    if (!post) {
      return NextResponse.json({ success: false, message: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: post });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to fetch post', error: error?.message },
      { status: 500 }
    );
  }
}

// ─── PUT /api/social/posts/[postId] ───────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    await connectToDatabase();
    const resolvedParams = await params;
    const { postId } = resolvedParams;

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json({ success: false, message: 'Invalid post ID' }, { status: 400 });
    }

    const body = await req.json();
    const updateData: any = {};
    if (body.message) updateData.message = body.message.trim();
    if (body.channel) updateData.channel = body.channel.toLowerCase();
    if (body.status) updateData.status = body.status;
    if (body.scheduledAt) updateData.scheduledAt = new Date(body.scheduledAt);
    if (body.mediaUrl !== undefined) updateData.mediaUrl = body.mediaUrl;
    if (body.thumbnailUrl !== undefined) updateData.thumbnailUrl = body.thumbnailUrl;
    if (body.mediaType) updateData.mediaType = body.mediaType;

    const updated = await SocialPost.findByIdAndUpdate(postId, updateData, { new: true }).lean();
    if (!updated) {
      return NextResponse.json({ success: false, message: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Post updated successfully', data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to update post', error: error?.message },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/social/posts/[postId] ────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    await connectToDatabase();
    const resolvedParams = await params;
    const { postId } = resolvedParams;

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return NextResponse.json({ success: false, message: 'Invalid post ID' }, { status: 400 });
    }

    const deleted = await SocialPost.findByIdAndDelete(postId).lean();
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Post cancelled and deleted successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Failed to delete post', error: error?.message },
      { status: 500 }
    );
  }
}
