import { NextRequest, NextResponse } from "next/server";
import fs from "fs-extra";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Define paths for data storage
const dataDir = path.join(process.cwd(), "public/data");
const jsonFilePath = path.join(dataDir, "deviceTypes.json");

// Ensure the data directory exists
fs.ensureDirSync(dataDir);

// Initialize the JSON file if it doesn't exist
if (!fs.existsSync(jsonFilePath)) {
  fs.writeJsonSync(jsonFilePath, { types: [] }, { spaces: 2 });
}

// GET: Fetch all device types
export async function GET() {
  try {
    console.log();
    
    if (!fs.existsSync(jsonFilePath)) {
      return NextResponse.json({ types: [] });
    }

    const data = await fs.readJson(jsonFilePath);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching device types:", error);
    return NextResponse.json({ error: "Failed to fetch device types" }, { status: 500 });
  }
}

// POST: Add a new device type
export async function POST(req: NextRequest) {
  try {
    const { name } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Device type name is required" }, { status: 400 });
    }

    // Read existing device types
    let data = fs.existsSync(jsonFilePath) ? await fs.readJson(jsonFilePath) : { types: [] };

    // Create new device type with unique ID
    const newType = {
      id: uuidv4(),
      name,
    };

    // Add to list and save
    data.push(newType);
    await fs.writeJson(jsonFilePath, data, { spaces: 2 });

    return NextResponse.json({ message: "Device type added successfully!", type: newType }, { status: 200 });
  } catch (error) {
    console.error("Error adding device type:", error);
    return NextResponse.json({ error: "Failed to add device type" }, { status: 500 });
  }
}

// DELETE: Remove a device type
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Device type ID is required" }, { status: 400 });
    }

    if (!fs.existsSync(jsonFilePath)) {
      return NextResponse.json({ error: "No device types found" }, { status: 404 });
    }

    let data = await fs.readJson(jsonFilePath);

    // Find the device type to delete
    const typeToDelete = data.types.find((type: any) => type.id === id);

    if (!typeToDelete) {
      return NextResponse.json({ error: "Device type not found" }, { status: 404 });
    }

    // Filter out the device type and update the file
    data.types = data.types.filter((type: any) => type.id !== id);
    await fs.writeJson(jsonFilePath, data, { spaces: 2 });

    return NextResponse.json({ message: "Device type deleted successfully!" });
  } catch (error) {
    console.error("Error deleting device type:", error);
    return NextResponse.json({ error: "Failed to delete device type" }, { status: 500 });
  }
}
