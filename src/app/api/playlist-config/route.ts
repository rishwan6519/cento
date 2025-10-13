import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import PlaylistConfig from "@/models/PlaylistConfig";
import DevicePlaylist from "@/models/ConectPlaylist";

import { writeFile } from "fs/promises";
import path from "path";
import Mongoose from "mongoose";

export async function POST(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");

    if (!userId || !Mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Invalid or missing userId" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const formData = await req.formData();
    console.log(formData);
    const configString = formData.get("config");

    if (!configString) {
      return NextResponse.json(
        { error: "No configuration data provided" },
        { status: 400 }
      );
    }

    const configData = JSON.parse(configString as string);

    if (!configData.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!Array.isArray(configData.files) || configData.files.length === 0) {
      return NextResponse.json(
        { error: "At least one file is required" },
        { status: 400 }
      );
    }

    // Create new configuration
    const playlistConfig = await PlaylistConfig.create({
      name: configData.name,
      userId: new Mongoose.Types.ObjectId(userId),
      type: configData.type,
      startTime: configData.startTime,
      endTime: configData.endTime,
      startDate: configData.startDate,
      endDate: configData.endDate,
      shuffle: configData.shuffle,
      daysOfWeek: configData.daysOfWeek,
      files: configData.files.map((file: any) => ({
        mediaId: file.mediaId ? new Mongoose.Types.ObjectId(file.mediaId) : null,
        name: file.name,
        path: file.path,
        type: file.type,
        displayOrder: file.displayOrder,
        delay: file.delay || 0,
        maxVolume: file.maxVolume || 100,
        minVolume: file.minVolume || 0,
        backgroundImageEnabled: file.backgroundImageEnabled || false,
        backgroundImage: file.backgroundImage || null,
      })),
      status: "active",
    });

    return NextResponse.json(playlistConfig, { status: 201 });
  } catch (error) {
    console.error("Error creating configuration:", error);
    return NextResponse.json(
      { error: "Failed to create configuration" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const serialNumber = searchParams.get("serialNumber");

    const query = {
      ...(serialNumber && { serialNumber }),
    };

    const configs = await PlaylistConfig.find(query).sort({ createdAt: -1 });

    return NextResponse.json(configs);
  } catch (error) {
    console.error("Error fetching configurations:", error);
    return NextResponse.json(
      { error: "Failed to fetch configurations" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();

    const formData = await req.formData();
    const configData = JSON.parse(formData.get("config") as string);

    if (!configData.id) {
      return NextResponse.json(
        { error: "Configuration ID is required" },
        { status: 400 }
      );
    }

    // Handle background images
    for (let i = 0; i < configData.files.length; i++) {
      const file = configData.files[i];
      if (file.backgroundImageEnabled) {
        const bgImageFile = formData.get(`bgImage-${i}`);
        if (bgImageFile && bgImageFile instanceof File) {
          const fileName = `bg-${Date.now()}-${bgImageFile.name}`;
          const filePath = path.join(
            process.cwd(),
            "public",
            "uploads",
            "backgrounds",
            fileName
          );

          const bytes = await bgImageFile.arrayBuffer();
          const buffer = Buffer.from(bytes);

          await writeFile(filePath, buffer);
          configData.files[
            i
          ].backgroundImage = `/uploads/backgrounds/${fileName}`;
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
        status: configData.status || "active",
      },
      { new: true }
    );

    if (!updatedConfig) {
      return NextResponse.json(
        { error: "Configuration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedConfig);
  } catch (error) {
    console.error("Error updating configuration:", error);
    return NextResponse.json(
      { error: "Failed to update configuration" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Configuration ID is required" },
        { status: 400 }
      );
    }

    const deletedConfig = await PlaylistConfig.findByIdAndDelete(id);
    if (!deletedConfig) {
      return NextResponse.json(
        { error: "Configuration not found" },
        { status: 404 }
      );
    }
    await DevicePlaylist.updateMany(
      { playlistIds: new Mongoose.Types.ObjectId(id) },
      { $pull: { playlistIds: new Mongoose.Types.ObjectId(id) } }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting configuration:", error);
    return NextResponse.json(
      { error: "Failed to delete configuration" },
      { status: 500 }
    );
  }
}