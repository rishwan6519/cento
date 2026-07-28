import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import VideoTemplate from "@/models/VideoTemplate";
import type { SortOrder } from "mongoose";

export const dynamic = "force-dynamic";

// ─── Shared helper to fetch templates using userId ────────────────────────────
async function getTemplatesForUser(userId: string, templateId?: string, search?: string) {
  try {
    await connectToDatabase();

    // If a specific templateId is requested
    if (templateId && templateId.trim()) {
      const template = await VideoTemplate.findOne({
        _id: templateId.trim(),
        storeUserId: userId.trim(),
      }).lean();

      if (!template) {
        return NextResponse.json(
          { success: false, message: `No template found with ID '${templateId}' belonging to userId '${userId}'` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, count: 1, "template 1": template });
    }

    // Otherwise list templates for userId
    const query: Record<string, unknown> = {
      storeUserId: userId.trim(),
      status: "Active",
    };

    if (search && search.trim()) {
      query.$or = [
        { templateName: { $regex: search.trim(), $options: "i" } },
        { templateDescription: { $regex: search.trim(), $options: "i" } },
        { offerTitle: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const templates = await VideoTemplate.find(query).sort({ createdAt: -1 }).lean();

    const responsePayload: Record<string, any> = {
      success: true,
      count: templates.length,
    };

    templates.forEach((tmpl, index) => {
      responsePayload[`template ${index + 1}`] = tmpl;
    });

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("[external/get-templates] Error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

// ─── GET Handler: e.g. /api/external/get-templates?userId=123 ────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || searchParams.get("storeUserId") || searchParams.get("account");
    const templateId = searchParams.get("templateId") || searchParams.get("id") || undefined;
    const search = searchParams.get("search") || undefined;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Missing required query parameter 'userId' (e.g., ?userId=YOUR_ID)" },
        { status: 400 }
      );
    }

    return await getTemplatesForUser(userId, templateId, search);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Server Error" },
      { status: 500 }
    );
  }
}

// ─── POST Handler: e.g. {"userId": "123", "templateId": "..."} ────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = body.userId || body.storeUserId || body.account;
    const templateId = body.templateId || body.id || undefined;
    const search = body.search || undefined;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Missing required property 'userId' in JSON request body" },
        { status: 400 }
      );
    }

    return await getTemplatesForUser(String(userId), templateId ? String(templateId) : undefined, search ? String(search) : undefined);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Server Error" },
      { status: 500 }
    );
  }
}
