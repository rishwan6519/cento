import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

interface Playlist {
    id: string;
    serialNumber: string;
}

export async function GET(request: Request) {
    try {
        console.log("there")
        const { searchParams } = new URL(request.url)
        const serialNumber = searchParams.get('serial')

        if (!serialNumber) {
            return NextResponse.json({ error: 'Serial number is required' }, { status: 400 })
        }

        const jsonDirectory = path.join(process.cwd(), 'public/data')
        const filePath = path.join(jsonDirectory, 'playlists.json')
        
        let playlists: Playlist[] = []

        try {
            const fileContents = await fs.readFile(filePath, 'utf8')
            playlists = JSON.parse(fileContents)
        } catch (error) {
            console.error('Error reading playlist file:', error)
            return NextResponse.json({
                success: false,
                message: 'Playlist data not found'
            }, { status: 404 })
        }

        const matchedPlaylist = playlists.find(playlist => 
            playlist.serialNumber === serialNumber
        )

        if (matchedPlaylist) {
            return NextResponse.json({
                success: true,
                playlistId: matchedPlaylist.id
            })
        } else {
            return NextResponse.json({
                success: false,
                message: 'No playlist found for this serial number'
            }, { status: 404 })
        }

    } catch (error) {
        return NextResponse.json({ 
            error: 'Internal Server Error' 
        }, { status: 500 })
    }
}