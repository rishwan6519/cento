import { NextRequest, NextResponse } from "next/server";
import fs from "fs-extra";
import path from "path";

// Define paths for data storage
const dataDir = path.join(process.cwd(), "public/data");
const jsonFilePath = path.join(dataDir, "devices.json");

// Ensure the data directory exists
fs.ensureDirSync(dataDir);

// Initialize the JSON file if it doesn't exist
if (!fs.existsSync(jsonFilePath)) {
  fs.writeJsonSync(jsonFilePath, [], { spaces: 2 });
}

export async function GET() {
  try {
    // Read the JSON file or return an empty array if it doesn't exist
    if (!fs.existsSync(jsonFilePath)) {
      return NextResponse.json([]);
    }
    
    const devices = await fs.readJson(jsonFilePath);
    return NextResponse.json(devices);
  } catch (error) {
    console.error("Error reading devices:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, imageUrl,typeId } = await req.json();
    console.log(typeId)
    
    if (!name || !imageUrl) {
      return NextResponse.json({ error: "Name and image URL are required" }, { status: 400 });
    }
    
    // Read existing devices - handle case where file might not exist yet
    let devices = [];
    if (fs.existsSync(jsonFilePath)) {
      devices = await fs.readJson(jsonFilePath, { throws: false }) || [];
    }

    // Create new device with unique ID
    const newDevice = { 
      id: Date.now().toString(), 
      name, 
      imageUrl ,
      type:typeId
    };
    
    // Add to list and save
    devices.push(newDevice);
    await fs.writeJson(jsonFilePath, devices, { spaces: 2 });

    return NextResponse.json({ 
      message: "Device saved successfully!", 
      device: newDevice 
    }, { status: 200 });
  } catch (error) {
    console.error("Error saving device:", error);
    return NextResponse.json({ error: "Failed to save device!" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    
    if (!id) {
      return NextResponse.json({ error: "Device ID is required" }, { status: 400 });
    }
    
    // Read existing devices
    if (!fs.existsSync(jsonFilePath)) {
      return NextResponse.json({ error: "No devices found" }, { status: 404 });
    }
    
    const devices = await fs.readJson(jsonFilePath);
    
    // Find the device to delete
    const deviceToDelete = devices.find((device: any) => device.id === id);
    
    if (!deviceToDelete) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }
    
    // Remove image file if it exists in our uploads directory
    if (deviceToDelete.imageUrl && deviceToDelete.imageUrl.startsWith('/uploads/')) {
      const imagePath = path.join(process.cwd(), "public", deviceToDelete.imageUrl);
      if (fs.existsSync(imagePath)) {
        await fs.remove(imagePath);
      }
    }
    
    // Filter out the device and save the updated list
    const updatedDevices = devices.filter((device: any) => device.id !== id);
    await fs.writeJson(jsonFilePath, updatedDevices, { spaces: 2 });

    return NextResponse.json({ message: "Device deleted successfully!" });
  } catch (error) {
    console.error("Error deleting device:", error);
    return NextResponse.json({ error: "Failed to delete device!" }, { status: 500 });
  }
}