import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Playlist from "@/models/PlaylistConfig";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const playlistId = searchParams.get("id");

    if (!playlistId) {
      return NextResponse.json(
        { success: false, error: "Playlist ID is required" },
        { status: 400 }
      );
    }

    let playlistData: {
      id: string;
      versionId: string;
      shuffle: boolean;
      files: any[];
    };

    // Check if it is a combined virtual playlist
    if (playlistId.includes('_')) {
      const ids = playlistId.split('_').filter(id => mongoose.Types.ObjectId.isValid(id));
      if (ids.length === 0) {
        return NextResponse.json(
          { success: false, error: "Invalid playlist ID format" },
          { status: 400 }
        );
      }

      const playlists = await Playlist.find({ _id: { $in: ids } });
      if (playlists.length === 0) {
        return NextResponse.json(
          { success: false, message: "No playlist found for these IDs" },
          { status: 404 }
        );
      }

      // Combine files from all matched playlists
      const combinedFiles: any[] = [];
      let displayOrder = 1;
      for (const p of playlists) {
        if (p.files && Array.isArray(p.files)) {
          for (const file of p.files) {
            combinedFiles.push({
              path: file.path,
              displayOrder: displayOrder++,
              type: file.type,
              delay: file.delay || 0,
              maxVolume: file.maxVolume,
              minVolume: file.minVolume,
              backgroundImageEnabled: file.backgroundImageEnabled,
              backgroundImage: file.backgroundImage,
            });
          }
        }
      }

      playlistData = {
        id: playlistId,
        versionId: playlists.map(p => p.updatedAt ? p.updatedAt.getTime().toString() : '0').join('_'),
        shuffle: playlists.some(p => p.shuffle),
        files: combinedFiles,
      };

    } else {
      // Normal single playlist lookup
      if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        return NextResponse.json(
          { success: false, error: "Invalid playlist ID format" },
          { status: 400 }
        );
      }

      const playlist = await Playlist.findById(playlistId);
      if (!playlist) {
        return NextResponse.json(
          { success: false, message: "No playlist found for this ID" },
          { status: 404 }
        );
      }

      playlistData = {
        id: playlist._id.toString(),
        versionId: playlist.updatedAt ? playlist.updatedAt.getTime().toString() : '0',
        shuffle: playlist.shuffle || false,
        files: playlist.files || [],
      };
    }

    // Normalize type (ONLY CHANGE)
    const normalizeType = (type: string) => {
      if (!type) return type;
      const lower = type.toLowerCase();
      if (lower.includes("video")) return "video";
      if (lower.includes("audio")) return "audio";
      return type;
    };

    return NextResponse.json({
      success: true,
      playlistData: {
        id: playlistData.id,
        versionId: playlistData.versionId,
        shuffle: playlistData.shuffle,
        files: playlistData.files.map((file: any) => ({
          path: file.path?.startsWith("http")
            ? file.path
            : `https://iot.centelon.com${file.path.startsWith("/") ? "" : "/"}${file.path}`,
          displayOrder: file.displayOrder,
          type: normalizeType(file.type),
          delay: file.delay,
          maxVolume: file.maxVolume,
          minVolume: file.minVolume,
          backgroundImageEnabled: file.backgroundImageEnabled,
          backgroundImage: file.backgroundImage,
        })),
      },
    });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
