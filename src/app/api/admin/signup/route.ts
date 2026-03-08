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

    // Check if user already exists
    const existingUser = await User.findOne({ username: normalizedUsername });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Username already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new User({
      username: normalizedUsername,
      password: hashedPassword,
      role: UserRole.Admin, // Force role to Admin
    });

    await newAdmin.save();

    const { password: _, ...adminWithoutPassword } = newAdmin.toObject();

    return NextResponse.json(
      {
        success: true,
        message: 'Admin account created successfully',
        data: adminWithoutPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating admin:', error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : 'Error creating admin',
      },
      { status: 500 }
    );
  }
}
