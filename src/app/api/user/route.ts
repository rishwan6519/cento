import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import User, { UserRole } from '@/models/User';
import { connectToDatabase } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const { username, password, role, controllerId , blockCoding,peopleDetection} = await req.json();
    
    if (!username?.trim() || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      );
    }

    const normalizedUsername = username.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ username: normalizedUsername });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Username already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username: normalizedUsername,
      password: hashedPassword,
      role: role || UserRole.User,
      blockCoding: blockCoding || false, // Default to false if not provided
      peopleDetection: peopleDetection || false, // Default to false if not provided
      controllerId: controllerId ?  mongoose.Types.ObjectId.createFromHexString(controllerId) : undefined
    });

    try {
      await newUser.save();
    } catch (saveError: any) {
      if (saveError.code === 11000) {
        const field = Object.keys(saveError.keyPattern)[0];
        return NextResponse.json(
          { success: false, message: `${field} already exists` },
          { status: 400 }
        );
      }
      throw saveError;
    }

    const { password: _, ...userWithoutPassword } = newUser.toObject();
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'User created successfully',
        data: userWithoutPassword 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Error creating user'
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const controllerId = searchParams.get("controllerId");

    if (!controllerId) {
      return NextResponse.json(
        { success: false, message: "Controller ID is required" },
        { status: 400 }
      );
    }

    // Find all users with matching controllerId, exclude password field
    const users = await User.find({ controllerId })
      .select("-password")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: users,
      count: users.length
    }, { 
      status: 200 
    });

  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch users",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    const { username, password } = await req.json();

    const updateData: any = { username };
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const { password: _, ...userWithoutPassword } = user.toObject();
    return NextResponse.json({ success: true, data: userWithoutPassword });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to delete user" },
      { status: 500 }
    );
  }
}
