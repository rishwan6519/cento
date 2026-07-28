import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import VideoTemplate from "@/models/VideoTemplate";

export const dynamic = "force-dynamic";

// ─── Dummy Templates (with MongoDB-like 24-character hex ObjectIds) ───────────
export const DUMMY_TEMPLATES = [
  {
    _id: "6797a1f8b1a3e9c4d2800001",
    templateName: "Welcome to Our Store",
    description: "A friendly AI avatar introduces your business, welcomes customers, highlights your brand values, and invites them to explore your products and services.",
  },
  {
    _id: "6797a1f8b1a3e9c4d2800002",
    templateName: "Brand Introduction",
    description: "Tell your brand's story through a professional AI presenter, showcasing your mission, vision, and what makes your business unique.",
  },
  {
    _id: "6797a1f8b1a3e9c4d2800003",
    templateName: "New Product Launch",
    description: "An AI avatar presents your newest product with engaging visuals, key features, pricing, and reasons why customers should buy it.",
  },
  {
    _id: "6797a1f8b1a3e9c4d2800004",
    templateName: "Product Spotlight",
    description: "Highlight a single product in detail, demonstrating its benefits, unique selling points, and ideal use cases.",
  },
  {
    _id: "6797a1f8b1a3e9c4d2800005",
    templateName: "Best Seller Showcase",
    description: "Promote your most popular products with an AI host explaining why they are customer favorites.",
  },
];

// ─── Shared helper to fetch templates using userId ────────────────────────────
async function getTemplatesForUser(userId: string, templateId?: string, search?: string) {
  try {
    await connectToDatabase();

    // If a specific templateId is requested
    if (templateId && templateId.trim()) {
      const targetId = templateId.trim();

      // Check dummy templates first
      const dummyMatch = DUMMY_TEMPLATES.find((d) => d._id === targetId);
      if (dummyMatch) {
        return NextResponse.json({ success: true, count: 1, "template 1": dummyMatch });
      }

      // Check MongoDB database
      const template: any = await VideoTemplate.findOne({
        _id: targetId,
        storeUserId: userId.trim(),
      }).lean();

      if (!template) {
        return NextResponse.json(
          { success: false, message: `No template found with ID '${targetId}'` },
          { status: 404 }
        );
      }

      // Restrict output strictly to _id, templateName, description
      const cleanTemplate = {
        _id: template._id,
        templateName: template.templateName,
        description: template.templateDescription || template.offerDescription || template.offerTitle || "AI Video Template",
      };

      return NextResponse.json({ success: true, count: 1, "template 1": cleanTemplate });
    }

    // Otherwise list templates for userId
    const query: Record<string, unknown> = {
      storeUserId: userId.trim(),
      status: "Active",
    };

    const dbTemplates: any[] = await VideoTemplate.find(query).sort({ createdAt: -1 }).lean();

    // Map DB templates to strictly ONLY _id, templateName, description
    const cleanDbTemplates = dbTemplates.map((t) => ({
      _id: t._id,
      templateName: t.templateName,
      description: t.templateDescription || t.offerDescription || t.offerTitle || "AI Video Template",
    }));

    // Combine custom DB templates with the standard dummy templates
    let combinedTemplates = [...cleanDbTemplates, ...DUMMY_TEMPLATES];

    if (search && search.trim()) {
      const keyword = search.trim().toLowerCase();
      combinedTemplates = combinedTemplates.filter(
        (t) =>
          t.templateName.toLowerCase().includes(keyword) ||
          t.description.toLowerCase().includes(keyword)
      );
    }

    const responsePayload: Record<string, any> = {
      success: true,
      count: combinedTemplates.length,
    };

    combinedTemplates.forEach((tmpl, index) => {
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
