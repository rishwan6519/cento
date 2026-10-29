import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import OfferType from "@/models/OfferType";

export const dynamic = "force-dynamic";

const DEFAULT_OFFER_TYPES = [
  { offertypeId: "INDIVIDUAL_DISCOUNT", offertypename: "Individual Discount" },
  { offertypeId: "FLASH_SALE", offertypename: "Flash Sale" },
  { offertypeId: "PERCENTAGE_DISCOUNT", offertypename: "Percentage Discount" },
  { offertypeId: "FLAT_RATE_OFF", offertypename: "Flat Rate Off" },
  { offertypeId: "BOGO", offertypename: "Buy 1 Get 1 (BOGO)" },
  { offertypeId: "WEEKEND_SPECIAL", offertypename: "Weekend Special" },
  { offertypeId: "CLEARANCE_SALE", offertypename: "Clearance Sale" },
  { offertypeId: "FESTIVE_OFFER", offertypename: "Festive Offer" },
  { offertypeId: "NEW_ARRIVAL", offertypename: "New Arrival Spotlight" },
  { offertypeId: "MEMBER_EXCLUSIVE", offertypename: "Member Exclusive" },
];

// GET: Fetch all offer types (userId is optional)
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const categoryId = searchParams.get("categoryId") || searchParams.get("category");
    
    const query: any = {};
    if (userId && userId !== "all" && userId !== "ALL") {
      query.userId = userId;
    }
    if (categoryId) {
      query.categoryId = categoryId;
    }

    let offerTypes = await OfferType.find(query).sort({ createdAt: -1 }).lean();
    
    // If no user-specific offer types found, fetch all created offer types
    if (offerTypes.length === 0 && userId) {
      offerTypes = await OfferType.find({}).sort({ createdAt: -1 }).lean();
    }

    // Merge with defaults ensuring no duplicate offertypeId
    const seen = new Set<string>();
    const combined: any[] = [];

    for (const ot of offerTypes) {
      const id = String(ot.offertypeId).trim();
      if (!seen.has(id)) {
        seen.add(id);
        combined.push(ot);
      }
    }

    for (const def of DEFAULT_OFFER_TYPES) {
      if (!seen.has(def.offertypeId)) {
        seen.add(def.offertypeId);
        combined.push(def);
      }
    }
    
    return NextResponse.json({
      success: true,
      data: combined
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
