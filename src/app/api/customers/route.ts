import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Customer from '@/models/Customer';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const body = await req.json();
    
    // Create new customer
    const customer = await Customer.create(body);
    
    return NextResponse.json({ success: true, customer }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating customer:', error);
    if (error.code === 11000) {
      return NextResponse.json({ success: false, error: 'A customer with this email already exists' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: 'Failed to create customer' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    // Check if reseller filtering is passed via query string
    const { searchParams } = new URL(req.url);
    const resellerId = searchParams.get('resellerId');
    const customerId = searchParams.get('customerId');
    
    let queryArgs: any = {};
    if (resellerId) {
      queryArgs.resellerId = resellerId;
    }
    if (customerId) {
        queryArgs._id = customerId;
    }
    
    // Fetch customers, sorted newest first
    const customers = await Customer.find(queryArgs).sort({ createdAt: -1 });
    
    return NextResponse.json({ success: true, customers });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch customers' }, { status: 500 });
  }
}
