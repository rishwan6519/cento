import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import VideoCategory from "@/models/VideoCategory";

// GET: Fetch all video categories for a specific user
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Missing required query parameter: userId" },
        { status: 400 }
      );
    }
    
    const categories = await VideoCategory.find({ userId }).sort({ createdAt: -1 });
    
    return NextResponse.json({
      success: true,
      data: categories
    });
  } catch (error: any) {
    console.error("[GET /api/video-categories] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

// POST: Create a new video category record
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await req.json();
    const { userId, videoCategoryId, typeId, typename } = body;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Missing required field: userId" },
        { status: 400 }
      );
    }
    
    const newCategory = await VideoCategory.create({
      userId,
      videoCategoryId,
      typeId,
      typename: Array.isArray(typename) ? typename : []
    });
    
    return NextResponse.json({
      success: true,
      message: "Video category created successfully",
      data: newCategory
    }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/video-categories] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

// PUT: Edit an existing video category record
export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await req.json();
    const { id, ...updateFields } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Missing required field: id" },
        { status: 400 }
      );
    }
    
    const updatedCategory = await VideoCategory.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true }
    );
    
    if (!updatedCategory) {
      return NextResponse.json(
        { success: false, message: "Video category not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Video category updated successfully",
      data: updatedCategory
    });
  } catch (error: any) {
    console.error("[PUT /api/video-categories] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Delete a video category record
export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Missing required query parameter: id" },
        { status: 400 }
      );
    }
    
    const deletedCategory = await VideoCategory.findByIdAndDelete(id);
    
    if (!deletedCategory) {
      return NextResponse.json(
        { success: false, message: "Video category not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Video category deleted successfully"
    });
  } catch (error: any) {
    console.error("[DELETE /api/video-categories] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
