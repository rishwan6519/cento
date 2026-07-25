import { NextResponse } from "next/server";

export async function GET() {
  try {
    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      return NextResponse.json({ success: false, balance: null, message: "FAL_KEY not configured" });
    }

    // fal.ai billing endpoint
    const res = await fetch("https://api.fal.ai/v1/account/billing?expand=credits", {
      headers: {
        Authorization: `Key ${falKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      console.warn(`[fal.ai balance] returned ${res.status}: ${errorText}`);
      const explanation = res.status === 403
        ? "fal.ai returned 403 (Forbidden): Your API Key may lack admin/billing access scopes in fal.ai dashboard, or credits are depleted/locked."
        : `fal.ai returned HTTP ${res.status}`;
      return NextResponse.json({ success: false, balance: null, message: explanation });
    }

    const data = await res.json();
    // fal.ai returns { credits: { current_balance: number } } 
    const balance: number = data?.credits?.current_balance ?? null;

    return NextResponse.json({ success: true, balance });
  } catch (err) {
    return NextResponse.json({
      success: false,
      balance: null,
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
