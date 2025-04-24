import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import User, { UserRole } from '@/models/User';
import { connectToDatabase } from '@/lib/db';

export async function POST(req: NextRequest) {
  await connectToDatabase();

  const body = await req.json();
  const {  username, password, role } = body;

  console.log("Received data:", body);
  if (  !username || !password) {
    return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
  }

  if (role && !Object.values(UserRole).includes(role)) {
    return NextResponse.json({ success: false, message: 'Invalid role provided' }, { status: 400 });
  }

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return NextResponse.json({ success: false, message: 'Email already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      
      username,
      password: hashedPassword,
      role: role || UserRole.User,
    });

    await newUser.save();

    return NextResponse.json({ success: true, data: newUser }, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  await connectToDatabase();

  try {
    const users = await User.find().select('-password'); // exclude passwords
    return NextResponse.json({ success: true, data: users }, { status: 200 });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}
