import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import MediaItemModel from "@/models/MediaItems";
import MediaMetadataModel from "@/models/MediaMetadata";
import Offer from "@/models/Offer";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

async function getApprovedOffersData(userId: string) {
  try {
    await connectToDatabase();

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing userId format. Expected a 24-character MongoDB ObjectId." },
        { status: 400 }
      );
    }

    const User = (await import('@/models/User')).default;
    const requestingUser = await User.findById(userId);
    let userIdsToFetch = [new mongoose.Types.ObjectId(userId)];

    // Fetch related users if admin/controller
    if (requestingUser) {
      const adminId = requestingUser.role === 'account_admin' ? requestingUser._id : requestingUser.controllerId;
      if (adminId) {
         const relatedUsers = await User.find({ 
            $or: [
               { _id: adminId },
               { controllerId: adminId }
            ] 
         }).select('_id');
         userIdsToFetch = relatedUsers.map(u => u._id);
      }
    }

    // 1. Fetch all media items for the user(s) that are successfully approved
    const mediaItems = await MediaItemModel.find({
      userId: { $in: userIdsToFetch },
      approvalStatus: "success",
      type: "video" // Assuming we only care about approved videos here
    }).sort({ createdAt: -1 }).lean();

    const resultData = [];

    for (const item of mediaItems) {
      let offerData = null;
      let metadata = null;

      // 2. Fetch linked Offer details
      if (item.offerId) {
        const query = mongoose.Types.ObjectId.isValid(item.offerId)
          ? { $or: [{ _id: item.offerId }, { offerId: item.offerId }] }
          : { offerId: item.offerId };
        offerData = await Offer.findOne(query).lean();
      }

      // 3. Fetch full MediaMetadata (captions, tags, scripts)
      if (item.metadataId) {
        metadata = await MediaMetadataModel.findById(item.metadataId).lean();
      } else {
        metadata = await MediaMetadataModel.findOne({ mediaId: item._id }).lean();
      }

      // 4. Combine data for the mobile app
      resultData.push({
        videoId: item._id,
        videoUrl: item.url,
        ratio: item.ratio || "9:16",
        thumbnail: item.thumbnail || null,
        duration: item.duration || 4,
        createdAt: item.createdAt,
        
        offerId: item.offerId || metadata?.offerId || "",
        offerName: offerData?.offerName || "",
        offerDescription: offerData?.offerDescription || "",
        startDate: offerData?.startDate || "",
        endDate: offerData?.endDate || "",
        tagline: offerData?.tagline || item.tagline || metadata?.tagline || "",
        
        channels: item.channels || metadata?.channels || [],
        voiceoverScript: metadata?.voiceoverScript || item.voiceoverScript || "",
        socialMediaHeading: metadata?.socialMediaHeading || item.socialMediaHeading || "",
        
        facebookCaption: metadata?.facebookCaption || "",
        facebookHashTags: metadata?.facebookHashTags || [],
        instagramCaption: metadata?.instagramCaption || "",
        instagramHashTags: metadata?.instagramHashTags || [],
      });
    }

    return NextResponse.json({
      success: true,
      count: resultData.length,
      data: resultData
    });
  } catch (error) {
    console.error("[external/approved-offers] Error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to fetch approved offers" },
      { status: 500 }
    );
  }
}

// ─── GET Handler: e.g. /api/external/approved-offers?userId=123 ──────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || searchParams.get("account") || searchParams.get("storeUserId");

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Missing required query parameter 'userId'" },
        { status: 400 }
      );
    }

    return await getApprovedOffersData(userId);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Server Error" },
      { status: 500 }
    );
  }
}

// ─── POST Handler: e.g. {"userId": "123"} ──────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.userId || body.account || body.storeUserId;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Missing required property 'userId' in JSON request body" },
        { status: 400 }
      );
    }

    return await getApprovedOffersData(String(userId));
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Server Error" },
      { status: 500 }
    );
  }
}
