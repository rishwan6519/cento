import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import OfferType from "@/models/OfferType";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { userId, categoryId, category } = body;
    const finalCategoryId = categoryId || category || "offer";

    // Support both { offerTypes: [...] } and single object { offertypeId, offertypename }
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

    const processedOfferTypes = [];

    for (const ot of rawList) {
      const otId = String(ot.offertypeId || "").trim();
      const otName = String(ot.offertypename || "").trim();

      if (!otId || !otName) {
        continue;
      }

      // Upsert: If exists update, otherwise create
      const updated = await OfferType.findOneAndUpdate(
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
      processedOfferTypes.push(updated);
    }

    return NextResponse.json({
      success: true,
      message: "Offer type(s) processed successfully",
      data: processedOfferTypes
    }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/create-offer-type] Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
