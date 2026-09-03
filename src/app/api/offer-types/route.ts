import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import OfferType from "@/models/OfferType";

// GET: Fetch all offer types for a specific user
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const categoryId = searchParams.get("categoryId");
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Missing required query parameter: userId" },
        { status: 400 }
      );
    }
    
    const query: any = { userId };
    if (categoryId) {
      query.categoryId = categoryId;
    }

    const offerTypes = await OfferType.find(query).sort({ createdAt: -1 });
    
    return NextResponse.json({
      success: true,
      data: offerTypes
    });
  } catch (error: any) {
    console.error("[GET /api/offer-types] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

// PUT: Edit an existing offer type record
export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await req.json();
    const { offertypeId, offertypename } = body;
    
    if (!offertypeId) {
      return NextResponse.json(
        { success: false, message: "Missing required field: offertypeId" },
        { status: 400 }
      );
    }

    const updateFields: any = {};
    if (offertypename) updateFields.offertypename = String(offertypename).trim();
    
    const updatedOfferType = await OfferType.findOneAndUpdate(
      { offertypeId: String(offertypeId).trim() },
      { $set: updateFields },
      { new: true, runValidators: true }
    );
    
    if (!updatedOfferType) {
      return NextResponse.json(
        { success: false, message: "Offer type not found with the given offertypeId" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Offer type updated successfully",
      data: updatedOfferType
    });
  } catch (error: any) {
    console.error("[PUT /api/offer-types] Error:", error);
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: "An offer type with this ID already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Delete an offer type record
export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const offertypeId = searchParams.get("offertypeId");
    
    if (!offertypeId) {
      return NextResponse.json(
        { success: false, message: "Missing required query parameter: offertypeId" },
        { status: 400 }
      );
    }
    
    const deletedOfferType = await OfferType.findOneAndDelete({ offertypeId: String(offertypeId).trim() });
    
    if (!deletedOfferType) {
      return NextResponse.json(
        { success: false, message: "Offer type not found with the given offertypeId" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "Offer type deleted successfully"
    });
  } catch (error: any) {
    console.error("[DELETE /api/offer-types] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
