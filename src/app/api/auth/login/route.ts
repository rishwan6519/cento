// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // Connect to database
    await connectToDatabase();

    // Find user in database
    const user = await User.findOne({ username });
    if (!user) {
    
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, userName: user.username, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );

    // Return token
    return NextResponse.json(
      { 
        message: 'Login successful', 
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}