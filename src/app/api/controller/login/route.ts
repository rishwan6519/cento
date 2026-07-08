import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Username and password are required" },
        { status: 400 }
      );
    }

    const normalizedUsername = username.trim().toLowerCase();

    // Connect to database
    await connectToDatabase();

    // Find user
    const user = await User.findOne({ username: normalizedUsername });
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        userName: user.username,
        role: user.role
      },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: "7d" }
    );

    // Build the user payload without password
    const userResponse = {
      id: user._id,
      username: user.username,
      role: user.role,
      storeName: user.storeName,
      storeLocation: user.storeLocation,
      openingTime: "09:00",
      closingTime: "18:00",
      operatorName: user.operatorName,
      phone: user.phone,
      email: user.email,
      companyName: user.companyName,
      location: user.location,
      customerId: user.customerId,
      hasAllStoreAccess: user.hasAllStoreAccess,
    };

    return NextResponse.json(
      {
        success: true,
        message: "Login successful",
        token,
        user: userResponse
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Mobile API login error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
