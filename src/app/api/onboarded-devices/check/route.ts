import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import OnboardedDevice from "@/models/OnboardedDevice";
import Device from "@/models/Device";

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const serialNumber = req.nextUrl.searchParams.get("serialNumber");
        console.log("Checking serial number:", serialNumber);
    
        if (!serialNumber) {
            return NextResponse.json(
                { success: false, message: "Serial number is required" },
                { status: 400 }
            );
        }

        // First find the device with the serial number
        const device = await Device.findOne({ serialNumber: serialNumber });
        
        if (!device) {
            return NextResponse.json(
                { success: false, message: "Device not found with this serial number" },
                { status: 404 }
            );
        }

        // Check if device is already onboarded
        const onboardedDevice = await OnboardedDevice.findOne({ deviceId: device._id });
        
        if (onboardedDevice) {
            return NextResponse.json({
                success: false,
                message: "This device has already been onboarded",
                isOnboarded: true
            });
        }

        // If device exists but not onboarded, return success
        return NextResponse.json({
            success: true,
            isOnboarded: false,
            message: "Device is available for onboarding"
        });

    } catch (error) {
        console.error("Error checking device:", error);
        return NextResponse.json(
            { success: false, message: "Failed to check device status" },
            { status: 500 }
        );
    }
}