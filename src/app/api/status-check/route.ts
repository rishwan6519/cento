import Device from "@/models/Device";
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();

        const { searchParams } = new URL(req.url);
        const serialNumber = searchParams.get("serialNumber");
        console.log("Serial Number:", serialNumber);
        if (!serialNumber) {
            return NextResponse.json(
                { success: false, message: "Missing serialNumber" },
                { status: 400 }
            );
        }
        const device = await Device.findOne({ serialNumber });
        if (!device) {
            return NextResponse.json(
                { success: false, message: "Device not found" },
                { status: 404 }
            );
        }
        console.log("Device found:", device);

        const now = new Date();
        const lastConnection = device.lastConnection;
        let status = "offline";
        if (lastConnection) {
            const diffMs = now.getTime() - new Date(lastConnection).getTime();
            if (diffMs < 60 * 1000) {
                status = "online";
            }
        }

        return NextResponse.json({
            success: true,
            status,
            lastConnection,
            device: {
                name: device.name,
                serialNumber: device.serialNumber,
                typeId: device.typeId,
                imageUrl: device.imageUrl,
                color: device.color,
                status: device.status
            }
        });
    } catch (error) {
        return NextResponse.json(
            { 
                success: false, 
                message: "Server error", 
                error: typeof error === "object" && error !== null && "message" in error ? (error as any).message : String(error)
            },
            { status: 500 }
        );
    }
}