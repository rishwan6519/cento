// import { NextResponse } from 'next/server';
// import { SignJWT } from 'jose';
// import { cookies } from 'next/headers';

// const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'; // Change this in production!
// const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret'; // Change this in production!

// export async function POST(request: Request) {
//   try {
//     const { password } = await request.json();
//     console.log(password)

//     if (password !== ADMIN_PASSWORD) {
//       return NextResponse.json(
//         { success: false, message: 'Invalid password' },
//         { status: 401 }
//       );
//     }

//     // Create JWT token
//     const token = await new SignJWT({ role: 'admin' })
//       .setProtectedHeader({ alg: 'HS256' })
//       .setExpirationTime('24h')
//       .sign(new TextEncoder().encode(JWT_SECRET));

//     // Set cookie
//     cookies().set('adminAuth', token, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'lax',
//       path: '/',
//       maxAge: 60 * 60 * 24 // 24 hours
//     });

//     return NextResponse.json({ success: true });
//   } catch (error) {
//     console.error('Login error:', error);
//     return NextResponse.json(
//       { success: false, message: 'Login failed' },
//       { status: 500 }
//     );
//   }
// }