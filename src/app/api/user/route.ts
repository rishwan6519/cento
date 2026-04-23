import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import User, { UserRole } from '@/models/User';
import { connectToDatabase } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const { 
      username, 
      password, 
      role, 
      controllerId, 
      customerId,
      blockCoding, 
      peopleDetection, 
      platform,
      storeName,
      storeLocation,
      phone,
      email,
      companyName,
      location,
      hasAllStoreAccess,
      assignedStoreId
    } = await req.json();
    
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
      blockCoding: blockCoding || false,
      peopleDetection: peopleDetection || false,
      platform: platform || false,
      storeName: storeName || undefined,
      storeLocation: storeLocation || undefined,
      phone: phone || undefined,
      email: email || undefined,
      companyName: companyName || undefined,
      location: location || undefined,
      controllerId: controllerId ? mongoose.Types.ObjectId.createFromHexString(controllerId) : undefined,
      customerId: customerId ? mongoose.Types.ObjectId.createFromHexString(customerId) : undefined,
      hasAllStoreAccess: hasAllStoreAccess !== undefined ? hasAllStoreAccess : false,
      assignedStoreId: assignedStoreId ? mongoose.Types.ObjectId.createFromHexString(assignedStoreId) : undefined,
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

    const query: any = {};
    if (controllerId) {
      query.controllerId = controllerId;
    }
    
    const customerIdParam = searchParams.get("customerId");
    if (customerIdParam) {
      query.customerId = customerIdParam;
    }
    
    const userId = searchParams.get("userId");
    if (userId) {
      query._id = userId;
    }

    // Find all users (or match controllerId), exclude password field
    const users = await User.find(query)
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

    const { username, password, currentPassword, storeName, storeLocation, phone, email, companyName, location, mediaProvisioning } = await req.json();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (password) {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, message: "Current password is required to change password" },
          { status: 400 }
        );
      }
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return NextResponse.json(
          { success: false, message: "Incorrect current password" },
          { status: 400 }
        );
      }
      user.password = await bcrypt.hash(password, 10);
    }

    if (username !== undefined) user.username = username;
    if (storeName !== undefined) user.storeName = storeName;
    if (storeLocation !== undefined) user.storeLocation = storeLocation;
    if (phone !== undefined) user.phone = phone;
    if (email !== undefined) user.email = email;
    if (companyName !== undefined) user.companyName = companyName;
    if (location !== undefined) user.location = location;
    if (mediaProvisioning !== undefined) (user as any).mediaProvisioning = mediaProvisioning;

    await user.save();

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