import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { URL } from "url";

export async function POST(request: Request) {
  try {
    // Parse the request body to get device data
    const device = await request.json();
    console.log(device)
    
    if (!device || !device.id) {
      return NextResponse.json(
        { error: 'Invalid device data' },
        { status: 400 }
      );
    }
    
    // Define the path to save the configuredDevices.json file
    const dataDir = path.join(process.cwd(), 'public', 'data');
    const filePath = path.join(dataDir, 'configuredDevices.json');
    
    // Ensure the directory exists
    try {
      await fs.mkdir(dataDir, { recursive: true });
    } catch (err) {
      console.log('Directory already exists or cannot be created');
    }
    
    // Read existing configured devices if file exists, or create empty array
    let configuredDevices = [];
    try {
      const fileData = await fs.readFile(filePath, 'utf8');
      configuredDevices = JSON.parse(fileData);
    } catch (err) {
      // File doesn't exist yet or can't be read, so we'll create it
      console.log('Creating new configuredDevices.json file');
    }
    
    // Check if this device is already configured and update it, or add it
    const deviceIndex = configuredDevices.findIndex((d: any) => d.id === device.id);
    if (deviceIndex !== -1) {
      configuredDevices[deviceIndex] = device;
    } else {
        console.log("pushing stage ")
      configuredDevices.push(device);
    }
    
    // Write the updated array back to the file
    await fs.writeFile(filePath, JSON.stringify(configuredDevices, null, 2), 'utf8');
    
    console.log(`Device ${device.id} saved to configuredDevices.json`);
    
    return NextResponse.json({
      success: true,
      message: 'Device configuration saved successfully',
      device
    });
    
  } catch (error) {
    console.error('Error configuring device:', error);
    return NextResponse.json(
      { error: 'Failed to configure device' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Define the path to the configuredDevices.json file
    const dataDir = path.join(process.cwd(), 'public', 'data');
    const filePath = path.join(dataDir, 'configuredDevices.json');

    // Read the configured devices file
    try {
      const fileData = await fs.readFile(filePath, 'utf8');
      const configuredDevices = JSON.parse(fileData);
      
      return NextResponse.json({
        success: true,
        devices: configuredDevices
      });
    } catch (err) {
      // If file doesn't exist, return empty array
      return NextResponse.json({
        success: true,
        devices: []
      });
    }
  } catch (error) {
    console.error('Error fetching configured devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configured devices' },
      { status: 500 }
    );
  }
}





const configuredDevicesPath = path.join(process.cwd(), 'public', 'data', 'configuredDevices.json');

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      imageUrl,
      typeId,
      serialNumber,
      color,
      description,
      features,
      handMovements
    } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

    // Read existing configurations
    let configuredDevices = [];
    try {
      const fileContent = await fs.readFile(configuredDevicesPath, 'utf-8');
      configuredDevices = JSON.parse(fileContent);
    } catch (error) {
      console.error('Error reading file:', error);
      configuredDevices = [];
    }

    // Find and update the device
    const deviceIndex = configuredDevices.findIndex((device: any) => device.id === id);
    if (deviceIndex === -1) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    // Update the device with new data
    const updatedDevice = {
      ...configuredDevices[deviceIndex],
      serialNumber: serialNumber || '',
      color: color || '',
      description: description || '',
      features: features || [],
      handMovements: handMovements || [],
      name,
      imageUrl,
      typeId
    };

    // Replace the old device with updated one
    configuredDevices[deviceIndex] = updatedDevice;

    // Write back to file
    await fs.writeFile(
      configuredDevicesPath,
      JSON.stringify(configuredDevices, null, 2),
      'utf-8'
    );

    // Return success response
    return NextResponse.json({
      message: 'Device configuration updated successfully',
      device: updatedDevice
    });

  } catch (error) {
    console.error('Error updating device configuration:', error);
    return NextResponse.json(
      { error: 'Failed to update device configuration' },
      { status: 500 }
    );
  }
}









export async function DELETE(request: Request) {
  try {
    console.log("delete request");
    
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

    // Read existing configurations
    const fileContent = await fs.readFile(configuredDevicesPath, 'utf-8');
    let devices = JSON.parse(fileContent);
    
    // Filter out the device to delete
    devices = devices.filter((device: any) => device.id !== id);

    // Write back to file
    await fs.writeFile(
      configuredDevicesPath,
      JSON.stringify(devices, null, 2),
      'utf-8'
    );

    return NextResponse.json({ 
      message: 'Device configuration deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting device configuration:', error);
    return NextResponse.json(
      { error: 'Failed to delete device configuration' },
      { status: 500 }
    );
  }
}


