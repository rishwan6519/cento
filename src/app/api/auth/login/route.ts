
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    
    // Connect to database
    await connectToDatabase();
    
    // Find admin user in database
    const user = await User.findOne({ 
      username,
     // Only allow admin users to login through this endpoint
    });
    
    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials or insufficient permissions" },
        { status: 401 }
      );
    }
    
    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }
    
    // Create JWT token with admin role
    const token = jwt.sign(
      { 
        userId: user._id, 
        userName: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" }
    );
    
    // Return token
    return NextResponse.json(
      {
        message: " login successful",
        token,
        user: {
          id: user._id,
          username: user.username,
          role: user.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(" login error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// Add GET method to check if user is authenticated as admin
export async function GET(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const token = authorization.split(" ")[1];
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        userId: string;
        userName: string;
        role: string;
      };
      
      if (decoded.role !== "admin") {
        return NextResponse.json(
          { message: "Insufficient permissions" },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        {
          authenticated: true,
          user: {
            id: decoded.userId,
            username: decoded.userName,
            role: decoded.role,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      return NextResponse.json(
        { message: "Invalid token" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Admin auth verification error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}