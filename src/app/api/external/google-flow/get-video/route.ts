import { NextRequest, NextResponse } from "next/server";
import { checkAndResolveGoogleJob } from "@/lib/googleFlowGet";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET Handler — ?jobId=...
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId") || searchParams.get("id");

    if (!jobId) {
      return NextResponse.json(
        { success: false, message: "Missing required parameter 'jobId' (e.g. ?jobId=...)" },
        { status: 400 }
      );
    }

    return await checkAndResolveGoogleJob(jobId);
  } catch (error) {
    console.error("[google-flow/get-video GET] Error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST Handler — { "jobId": "..." }
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const jobId = body.jobId || body.id;

    if (!jobId) {
      return NextResponse.json(
        { success: false, message: "Missing required property 'jobId' in request body" },
        { status: 400 }
      );
    }

    return await checkAndResolveGoogleJob(jobId);
  } catch (error) {
    console.error("[google-flow/get-video POST] Error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
