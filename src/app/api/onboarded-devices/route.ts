// File: app/api/saveDevice/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Define the data structure
interface DeviceDetails {
  id: string;
  serialNumber: string;
  model: string;
  firmware: string;
  lastSeen: string;
  status: string;
  macAddress: string;
  addedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const device: DeviceDetails = await request.json();
    
    // Define the file path
    const filePath = path.join(process.cwd(), 'public', 'data', 'onboardedDevice.json');
    
    // Create the data directory if it doesn't exist
    const dataDir = path.join(process.cwd(), 'public', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Read existing data or initialize empty array
    let devices: DeviceDetails[] = [];
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf8');
      try {
        devices = JSON.parse(fileData);
      } catch (error) {
        console.error('Error parsing existing JSON:', error);
        // If the file exists but is corrupted, initialize with empty array
      }
    }
    
    // Add the new device
    devices.push(device);
    
    // Write back to the file
    fs.writeFileSync(filePath, JSON.stringify(devices, null, 2), 'utf8');
    
    // Return success response
    return NextResponse.json({ success: true, message: 'Device saved successfully' });
  } catch (error) {
    console.error('Error saving device:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save device' },
      { status: 500 }
    );
  }
}