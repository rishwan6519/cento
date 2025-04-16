import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import Playlist from '@/models/PlaylistConfig'
import mongoose from 'mongoose'

export async function GET(req: Request) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(req.url)
        const playlistId = searchParams.get('id')
        
        if (!playlistId) {
            return NextResponse.json({ 
                success: false,
                error: 'Playlist ID is required' 
            }, { status: 400 })
        }

        if (!mongoose.Types.ObjectId.isValid(playlistId)) {
            console.log('Invalid MongoDB ObjectId format')
            return NextResponse.json({ 
                success: false,
                error: 'Invalid playlist ID format' 
            }, { status: 400 })
        }

        const playlist = await Playlist.findById(playlistId)
            .select('-__v')
            .lean()

        if (!playlist) {
            return NextResponse.json({
                success: false,
                message: 'No playlist found for this ID'
            }, { status: 404 })
        }

        return NextResponse.json({
            success: true,
            playlist
        })

    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json({ 
            success: false,
            error: 'Internal Server Error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}