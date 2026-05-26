import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Playlist from "@/models/PlaylistConfig";
import MediaItem from "@/models/MediaItems";
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

    // Normalize type (ONLY CHANGE)
    const normalizeType = (type: string) => {
      if (!type) return type;
      const lower = type.toLowerCase();
      if (lower.includes("video")) return "video";
      if (lower.includes("audio")) return "audio";
      return type;
    };

    // Fetch media details
    const mediaIds = (playlist.files || []).map((f: any) => f.mediaId || f.fileId).filter(Boolean);
    const mediaItems = await MediaItem.find({ _id: { $in: mediaIds } });
    const mediaMap = new Map(mediaItems.map((m: any) => [m._id.toString(), m]));

    return NextResponse.json({
      success: true,
      playlistData: {
        id: playlist._id,
        versionId: playlist.updatedAt.getTime().toString(),
        shuffle: playlist.shuffle,
        files: playlist.files.map((file: any) => {
          const mediaDoc = mediaMap.get((file.mediaId || file.fileId || "").toString());
          let rawPath = file.path || mediaDoc?.url || "";
          let rawType = file.type || mediaDoc?.type || "";

          let resolvedPath = rawPath.trim();
          if (resolvedPath && !resolvedPath.startsWith("http")) {
            resolvedPath = `https://iot.centelon.com${resolvedPath.startsWith("/") ? "" : "/"}${resolvedPath}`;
          }
          return {
            _id: file._id || file.fileId || file.mediaId,
            id: file._id || file.fileId || file.mediaId,
            fileId: file.fileId || file.mediaId,
            mediaId: file.mediaId || file.fileId,
            path: resolvedPath,
            displayOrder: file.displayOrder,
            type: normalizeType(rawType),
            delay: file.delay,
            maxVolume: file.maxVolume,
            minVolume: file.minVolume,
            backgroundImageEnabled: file.backgroundImageEnabled,
            backgroundImage: file.backgroundImage,
          };
        }),
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
