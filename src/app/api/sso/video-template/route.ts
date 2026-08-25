import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.VIDEO_TEMPLATE_API_KEY || 'ssk_dev_change_me_in_production_001';
    
    // We try GET first as it's standard for simple link generation, 
    // but if it's POST on their end, you might need to change the method here.
    const response = await fetch('https://cloudbases.in/storesparc_video/index.php/api/external/sso', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    
    // If the GET request fails with 405 Method Not Allowed, we could retry with POST,
    // but it's safer to just return what we get.
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching SSO token:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
