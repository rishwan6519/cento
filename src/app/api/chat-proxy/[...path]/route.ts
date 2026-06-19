import { NextRequest, NextResponse } from "next/server";

const TARGET_BASE = "https://smartagilehub.dev.centelon.com/api/v1/embed";

async function handleProxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const resolvedParams = await params;
    const path = resolvedParams.path.join("/");
    const url = new URL(`${TARGET_BASE}/${path}${req.nextUrl.search}`);
    
    // Forward headers but spoof origin
    const headers = new Headers(req.headers);
    headers.delete("host");
    headers.set("origin", "https://smartagilehub.dev.centelon.com");
    headers.set("referer", "https://smartagilehub.dev.centelon.com/");
    
    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
      redirect: "manual",
    };
    
    // Only add body for methods that allow it
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      const body = await req.arrayBuffer();
      if (body.byteLength > 0) {
        fetchOptions.body = body;
      }
    }
    
    const response = await fetch(url.toString(), fetchOptions);
    
    // Forward response headers
    const resHeaders = new Headers(response.headers);
    // Remove encoding headers to avoid issues when piping response
    resHeaders.delete("content-encoding");
    resHeaders.delete("content-length");
    
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders,
    });
  } catch (error) {
    console.error("Chat Proxy Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PUT = handleProxy;
export const PATCH = handleProxy;
export const DELETE = handleProxy;
