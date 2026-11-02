import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import OfferType from "@/models/OfferType";

export const dynamic = "force-dynamic";

// GET: Fetch all real offer types from DB - NO dummy fields
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const categoryId = searchParams.get("categoryId") || searchParams.get("category");
    
    const query: any = {};
    if (userId && userId !== "all" && userId !== "ALL") {
      query.$or = [
        { userId: userId },
        { userId: { $exists: false } },
        { userId: null },
      ];
    }
    if (categoryId) {
      query.categoryId = categoryId;
    }

    // Fetch actual documents stored in the database
    let offerTypes = await OfferType.find(query).sort({ createdAt: -1 }).lean();
    
    const defaultTypes = [
      { offertypeId: "INDIVIDUAL_DISCOUNT", offertypename: "Individual Discount", categoryId: "offer" },
      { offertypeId: "PERCENTAGE_DISCOUNT", offertypename: "Percentage Discount", categoryId: "offer" },
      { offertypeId: "BUY_X_GET_Y", offertypename: "Buy X Get Y", categoryId: "offer" },
      { offertypeId: "BUNDLE_OFFER", offertypename: "Bundle Offer", categoryId: "offer" },
      { offertypeId: "FLAT_OFF", offertypename: "Flat Off", categoryId: "offer" },
      { offertypeId: "FLASH_SALE", offertypename: "Flash Sale", categoryId: "offer" },
    ];

    // Guarantee that standard commercial offer types are present
    const map = new Map<string, any>();
    defaultTypes.forEach(dt => map.set(dt.offertypeId, dt));
    offerTypes.forEach((ot: any) => {
      if (ot && ot.offertypeId) {
        map.set(ot.offertypeId, ot);
      }
    });

    const combinedList = Array.from(map.values());
    
    return NextResponse.json({
      success: true,
      data: combinedList
    });
  } catch (error: any) {
    console.error("[GET /api/offer-types] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

// POST: Proxy to create offer types
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await req.json();
    const { userId, categoryId, category } = body;
    const finalCategoryId = categoryId || category || "offer";

    let rawList: any[] = [];
    if (Array.isArray(body.offerTypes) && body.offerTypes.length > 0) {
      rawList = body.offerTypes;
    } else if (body.offertypeId && body.offertypename) {
      rawList = [{ offertypeId: body.offertypeId, offertypename: body.offertypename }];
    } else {
      return NextResponse.json(
        { success: false, message: "Missing required field: offerTypes array or offertypeId/offertypename" },
        { status: 400 }
      );
    }

    const processed = [];
    for (const ot of rawList) {
      const otId = String(ot.offertypeId || "").trim();
      const otName = String(ot.offertypename || "").trim();
      if (!otId || !otName) continue;

      const record = await OfferType.findOneAndUpdate(
        { offertypeId: otId },
        {
          $set: {
            offertypename: otName,
            categoryId: finalCategoryId,
            ...(userId ? { userId } : {})
          }
        },
        { upsert: true, new: true, runValidators: true }
      );
      processed.push(record);
    }

    return NextResponse.json({
      success: true,
      message: "Offer type(s) saved successfully",
      data: processed
    }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/offer-types] Error:", error);
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
