import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User, { UserRole } from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await req.json();
    const { customerId, username, email, location, password, controllerId } = body;

    if (!username || !password || !customerId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Username already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = await User.create({
      username: username,
      password: hashedPassword,
      role: UserRole.AccountAdmin, // Account Admins get account_admin role
      customerId: customerId,
      email: email,
      controllerId: controllerId,
      location: location,
      storeLocation: location
    });

    return NextResponse.json({ success: true, message: "Account admin created successfully", user: { id: newUser._id, username: newUser.username } }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating account admin:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
