import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import User, { UserRole } from '@/models/User';
import { connectToDatabase } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const { username, password } = await req.json();

    if (!username?.trim() || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      );
    }

    const normalizedUsername = username.trim().toLowerCase();

    // Find admin user by username
    const admin = await User.findOne({ username: normalizedUsername, role: UserRole.Admin });

    if (!admin) {
      return NextResponse.json(
        { success: false, message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: 'Invalid password' },
        { status: 401 }
      );
    }

    // Create response with cookie for session
    const response = NextResponse.json(
      {
        success: true,
        message: 'Admin login successful',
        data: {
          _id: admin._id,
          username: admin.username,
          role: admin.role,
        },
      },
      { status: 200 }
    );

    // Set a simple auth cookie
    response.cookies.set('admin_auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error during admin auth:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Authentication failed',
      },
      { status: 500 }
    );
  }
}
