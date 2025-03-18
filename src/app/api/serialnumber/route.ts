import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { URL } from "url";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const serialNum = url.searchParams.get("serialNum");

    if (!serialNum) {
      return NextResponse.json(
        { error: "serialNum query parameter is required" },
        { status: 400 }
      );
    }

    // Define the path to the configuredDevices.json file
    const filePath = path.join(process.cwd(), "public", "data", "configuredDevices.json");

    // Ensure the file exists before reading
    try {
      await fs.access(filePath);
    } catch (err) {
      console.log("configuredDevices.json not found, creating an empty file.");
      await fs.writeFile(filePath, JSON.stringify([]), "utf8");
    }

    // Read the file
    const fileData = await fs.readFile(filePath, "utf8");
    const configuredDevices = JSON.parse(fileData);

    // Check if serial number exists
    const device = configuredDevices.find((d: any) => d.serialNumber === serialNum);

    if (!device) {
        console.log("not dounf")
      return NextResponse.json(
        { success: false, message: "Device not found" },
        { status: 404 }
      );
      
    }

    return NextResponse.json({
      success: true,
      device,
    });

  } catch (error) {
    console.error("Error reading serial numbers:", error);
    return NextResponse.json(
      { error: "Failed to read serial numbers" },
      { status: 500 }
    );
  }
}
