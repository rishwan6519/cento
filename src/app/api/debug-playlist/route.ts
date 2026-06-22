import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';

export async function GET() {
  await connectToDatabase();
  const db = mongoose.connection.db;
  if (!db) return NextResponse.json({ error: "No DB" });
  
  const playlist = await db.collection('announcementplaylists').findOne({ _id: new mongoose.Types.ObjectId("6a3940f65ae9c6be3398c481") });
  
  return NextResponse.json({ playlist });
}
