import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import VideoTemplate from "@/models/VideoTemplate";
import { DUMMY_TEMPLATES } from "@/lib/dummyTemplates";

export const dynamic = "force-dynamic";

// ─── NEW: Fetch templates from external API ────────────────────────────────
// OLD code is preserved below in comments for reference
async function getTemplatesFromExternalAPI(authHeader?: string | null) {
  const EXTERNAL_API_URL = "https://cloudbases.in/storesparc_video/index.php/api/external/templates?limit=50&all=1";
  const apiKey = process.env.CLOUDBASES_API_KEY;
  const headers: Record<string, string> = {};
  if (authHeader) headers["Authorization"] = authHeader;
  if (apiKey) headers["X-API-Key"] = apiKey;

  const fetchOptions: RequestInit = { headers };
  const response = await fetch(EXTERNAL_API_URL, fetchOptions);
  const data = await response.json();
  return NextResponse.json(data);
}

/*
// ─── OLD: Shared helper to fetch templates using userId ────────────────────────────
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
      responsePayload[`template ${index + 1}`] = {
        ...tmpl,
        description: tmpl.description ? String(tmpl.description).replace(/\r?\n+/g, " ").replace(/\s+/g, " ").trim() : "",
      };
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
*/

// ─── GET Handler ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    return await getTemplatesFromExternalAPI(authHeader);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Server Error" },
      { status: 500 }
    );
  }
}

// ─── POST Handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    
    let offerTypeStr = "";
    try {
      const body = await req.json();
      offerTypeStr = body.offer_type || "";
    } catch (e) {
      // Ignore if body is empty or invalid
    }
    
    const response = await getTemplatesFromExternalAPI(authHeader);
    const data = await response.json();
    
    if (offerTypeStr && offerTypeStr.trim() !== "" && data.success && data.data && Array.isArray(data.data.templates)) {
      const keyword = offerTypeStr.trim().toLowerCase();
      data.data.templates = data.data.templates.filter((t: any) => 
        t.name && String(t.name).toLowerCase().includes(keyword)
      );
      data.data.count = data.data.templates.length;
    }
    
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Server Error" },
      { status: 500 }
    );
  }
}