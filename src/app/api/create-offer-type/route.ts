import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import OfferType from "@/models/OfferType";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await req.json();
    const { userId, categoryId, category, offerTypes } = body;
    const finalCategoryId = categoryId || category;
    
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Missing required field: userId" },
        { status: 400 }
      );
    }

    if (!Array.isArray(offerTypes) || offerTypes.length === 0) {
      return NextResponse.json(
        { success: false, message: "Missing required field: offerTypes array" },
        { status: 400 }
      );
    }

    const createdOfferTypes = [];
    const errors = [];

    // Loop through each offer type in the array
    for (const ot of offerTypes) {
      const { offertypeId, offertypename } = ot;

      if (!offertypeId || !offertypename) {
        errors.push({ offertypeId, message: "Missing offertypeId or offertypename" });
        continue;
      }

      // Check for uniqueness
      const existing = await OfferType.findOne({ offertypeId: String(offertypeId).trim() });
      if (existing) {
        errors.push({ offertypeId, message: `Offer type with ID '${offertypeId}' already exists.` });
        continue;
      }
      
      try {
        const newOfferType = await OfferType.create({
          userId,
          categoryId: finalCategoryId ? String(finalCategoryId).trim() : undefined,
          offertypeId: String(offertypeId).trim(),
          offertypename: String(offertypename).trim()
        });
        createdOfferTypes.push(newOfferType);
      } catch (err: any) {
        errors.push({ offertypeId, message: err.message });
      }
    }
    
    if (offerTypes.length === 1 && errors.length === 1) {
      return NextResponse.json(
        { success: false, message: errors[0].message },
        { status: 409 }
      );
    }
    
    let message = "All offer types created successfully";
    if (errors.length > 0 && createdOfferTypes.length > 0) {
      message = "Some offer types were created, but some failed or already exist.";
    } else if (errors.length > 0 && createdOfferTypes.length === 0) {
      message = "No offer types were created (all failed or already exist).";
    }

    return NextResponse.json({
      success: true,
      message: message,
      data: createdOfferTypes,
      errors: errors.length > 0 ? errors : undefined
    }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/create-offer-type] Error:", error);
    
    // Handle MongoDB duplicate key error fallback
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
