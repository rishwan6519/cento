import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import PlaylistConfig from '@/models/PlaylistConfig';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const formData = await req.formData();
    const configString = formData.get('config');
    
    console.log('Received config string:', configString);
    
    if (!configString) {
      return NextResponse.json(
        { error: 'No configuration data provided' },
        { status: 400 }
      );
    }

    const configData = JSON.parse(configString as string);
    
    // Only validate essential fields
    if (!configData.name) {
      return NextResponse.json(
        { error: 'Playlist name is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(configData.files) || configData.files.length === 0) {
      return NextResponse.json(
        { error: 'At least one file is required' },
        { status: 400 }
      );
    }

    // Create new playlist configuration with default values
    const playlistConfig = await PlaylistConfig.create({
      name: configData.name,
      type: configData.type || 'mixed',
      serialNumber: 'default', // Set a default value
      startTime: configData.startTime || '00:00:00',
      endTime: configData.endTime || '23:59:59',
      files: configData.files.map((file: any) => ({
        name: file.name,
        path: file.path,
        type: file.type,
        displayOrder: file.displayOrder,
        delay: file.delay || 0,
        backgroundImageEnabled: file.backgroundImageEnabled || false,
        backgroundImage: file.backgroundImage || null
      })),
      backgroundAudio: {
        enabled: configData.backgroundAudio?.enabled || false,
        file: configData.backgroundAudio?.file || null,
        volume: configData.backgroundAudio?.volume || 50
      },
      status: 'active'
    });

    return NextResponse.json(playlistConfig, { status: 201 });

  } catch (error) {
    console.error('Error creating playlist config:', error);
    return NextResponse.json(
      { error: 'Failed to create playlist configuration' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const serialNumber = searchParams.get('serialNumber');

    const query = serialNumber ? { serialNumber } : {};
    const configs = await PlaylistConfig.find(query)
      .sort({ createdAt: -1 });

    return NextResponse.json(configs);
  } catch (error) {
    console.error('Error fetching playlist configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch playlist configurations' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();

    const formData = await req.formData();
    const configData = JSON.parse(formData.get('config') as string);

    if (!configData.id) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      );
    }

    // Handle background images similar to POST
    for (let i = 0; i < configData.files.length; i++) {
      const file = configData.files[i];
      if (file.backgroundImageEnabled) {
        const bgImageFile = formData.get(`bgImage-${i}`);
        if (bgImageFile && bgImageFile instanceof File) {
          const fileName = `bg-${Date.now()}-${bgImageFile.name}`;
          const filePath = path.join(process.cwd(), 'public', 'uploads', 'backgrounds', fileName);
          
          const bytes = await bgImageFile.arrayBuffer();
          const buffer = Buffer.from(bytes);
          
          await writeFile(filePath, buffer);
          configData.files[i].backgroundImage = `/uploads/backgrounds/${fileName}`;
        }
      }
    }

    const updatedConfig = await PlaylistConfig.findByIdAndUpdate(
      configData.id,
      {
        name: configData.name,
        type: configData.type,
        serialNumber: configData.serialNumber,
        startTime: configData.startTime,
        endTime: configData.endTime,
        files: configData.files,
        backgroundAudio: configData.backgroundAudio,
        status: configData.status || 'active'
      },
      { new: true }
    );

    if (!updatedConfig) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedConfig);
  } catch (error) {
    console.error('Error updating playlist config:', error);
    return NextResponse.json(
      { error: 'Failed to update playlist configuration' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      );
    }

    const deletedConfig = await PlaylistConfig.findByIdAndDelete(id);
    if (!deletedConfig) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting playlist config:', error);
    return NextResponse.json(
      { error: 'Failed to delete playlist configuration' },
      { status: 500 }
    );
  }
}