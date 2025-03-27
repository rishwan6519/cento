import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

interface PlaylistFile {
    name: string;
    path: string;
    backgroundImage: string;
    type: string;
    displayOrder: number;
    delay: number;
}

interface Playlist {
    id: string;
    name: string;
    type: string;
    enableAI: boolean;
    serialNumber: string;
    startTime: string;
    endTime: string;
    files: PlaylistFile[];
    backgroundAudio: null | string;
    createdAt: string;
    updatedAt: string;
}

// Named export for GET method
export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {

        console.log("")
        const { searchParams } = new URL(req.url)
        const playlistId = searchParams.get('id')
        console.log(playlistId)
        
        console.log('Requested playlist ID:', playlistId)

        if (!playlistId) {
            return NextResponse.json({ error: 'Playlist ID is required' }, { status: 400 })
        }

        const jsonDirectory = path.join(process.cwd(), 'public/data')
        const filePath = path.join(jsonDirectory, 'playlists.json')
        
        console.log('Reading from:', filePath)
        
        let playlists: Playlist[] = []

        try {
            const fileContents = await fs.readFile(filePath, 'utf8')
            playlists = JSON.parse(fileContents)
            console.log('Successfully read playlists file')
        } catch (error) {
            console.error('Error reading playlist file:', error)
            return NextResponse.json({
                success: false,
                message: 'Playlist data not found'
            }, { status: 404 })
        }

        const matchedPlaylist = playlists.find(playlist => 
            playlist.id === playlistId
        )

        if (matchedPlaylist) {
            console.log('Found matching playlist')
            return NextResponse.json({
                success: true,
                playlist: matchedPlaylist
            })
        } else {
            console.log('No matching playlist found')
            return NextResponse.json({
                success: false,
                message: 'No playlist found for this ID'
            }, { status: 404 })
        }

    } catch (error) {
        console.error('Server error:', error)
        return NextResponse.json({ 
            error: 'Internal Server Error' 
        }, { status: 500 })
    }
}