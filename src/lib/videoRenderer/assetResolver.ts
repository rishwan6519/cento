import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * Resolves a URL, data URL, or local path into a Buffer.
 * Handles data:image (base64 and URI encoded), local files, and remote URLs.
 */
export async function resolveAssetBuffer(urlOrPath?: string): Promise<Buffer | null> {
  if (!urlOrPath || typeof urlOrPath !== "string") return null;
  const trimmed = urlOrPath.trim();
  if (!trimmed) return null;

  // 1. Data URLs
  if (trimmed.startsWith("data:image/") || trimmed.startsWith("data:audio/")) {
    const commaIdx = trimmed.indexOf(",");
    if (commaIdx !== -1) {
      const meta = trimmed.slice(0, commaIdx);
      const payload = trimmed.slice(commaIdx + 1);
      if (payload) {
        try {
          if (meta.includes(";base64")) {
            return Buffer.from(payload, "base64");
          }
          return Buffer.from(decodeURIComponent(payload), "utf8");
        } catch (err) {
          console.warn("[assetResolver] Failed to decode data URL", err);
        }
      }
    }
  }

  // 2. HTTP/HTTPS URLs
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const parsed = new URL(trimmed);
      const cleanPathname = parsed.pathname.replace(/^\/+/, "");
      if (
        parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        cleanPathname.startsWith("uploads/")
      ) {
        const localCandidates = [
          join(process.cwd(), cleanPathname),
          join(process.cwd(), "uploads", cleanPathname.replace(/^uploads[\/\\]/, "")),
          join(process.cwd(), "public", cleanPathname),
          join(process.cwd(), "public", "uploads", cleanPathname.replace(/^uploads[\/\\]/, "")),
        ];
        for (const cand of localCandidates) {
          if (existsSync(cand)) {
            try {
              return await readFile(cand);
            } catch {}
          }
        }
      }
    } catch {}

    try {
      const res = await fetch(trimmed);
      if (res.ok) {
        const ab = await res.arrayBuffer();
        return Buffer.from(ab);
      }
    } catch (err) {
      console.warn(`[assetResolver] Failed to download URL: ${trimmed}`, err);
    }
  }

  // 3. Local paths (handles /uploads/..., uploads/..., public/..., absolute path)
  const cleanPath = trimmed.replace(/^\/+/, "");
  const candidates = [
    join(process.cwd(), cleanPath),
    join(process.cwd(), "uploads", cleanPath.replace(/^uploads[\/\\]/, "")),
    join(process.cwd(), "public", cleanPath),
    join(process.cwd(), "public", "uploads", cleanPath.replace(/^uploads[\/\\]/, "")),
    trimmed,
  ];

  for (const cand of candidates) {
    if (existsSync(cand)) {
      try {
        return await readFile(cand);
      } catch {}
    }
  }

  return null;
}
