"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import MakeVideoFromTemplateModal from "./MakeVideoFromTemplateModal";
import {
  FaFilm, FaEdit, FaTrash, FaSearch, FaPlus, FaTimes,
  FaTh, FaExpand, FaPen, FaTable,
  FaEye, FaChevronLeft, FaChevronRight, FaMagic, FaSpinner,
  FaCopy, FaCheck, FaThLarge, FaList, FaShareAlt, FaPlay, FaPause, FaRedo,
  FaSlidersH, FaCalendarAlt, FaTag, FaClock, FaLayerGroup,
  FaVideo, FaDownload
} from "react-icons/fa";

// ─── Types ───────────────────────────────────────────────────────────────────
export type AspectRatio = "9:16" | "16:9" | "1:1" | "4:5";
export type TemplateStatus = "Active" | "Inactive";

export interface VideoTemplate {
  _id: string;
  templateId?: number;
  storeUserId?: string;
  templateName: string;
  templateDescription?: string;
  description?: string;
  aspectRatio?: string;
  videoDuration?: number;
  animationStyle?: string;
  language?: string;
  aiModel?: string;
  status: TemplateStatus;
  isDummy?: boolean;
  isDummyOverride?: boolean;
  layers?: Record<string, any>;
  aspectStore?: Record<string, Record<string, any>>;
  backgroundUrl?: string;
  productUrl?: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Preset Gradients (matches Studio) ───────────────────────────────────────
const PREVIEW_GRADIENTS = [
  { c1: "#0B2830", c2: "#051419" },
  { c1: "#F05A28", c2: "#871900" },
  { c1: "#11B5BB", c2: "#06393B" },
  { c1: "#4338CA", c2: "#1E1B4B" },
  { c1: "#18181B", c2: "#09090B" },
];

// ─── Word & Character Wrapping Utility for Canvas ────────────────────────────
export function wrapTextCanvas(
  ctx: CanvasRenderingContext2D | null,
  text: string,
  maxWidth: number,
  fontSize: number
): string[] {
  if (!text) return [""];
  const maxW = Math.max(30, maxWidth);
  const paras = String(text).split("\n");
  const result: string[] = [];
  const charW = fontSize * 0.58;

  const measure = (str: string): number => {
    if (ctx) return ctx.measureText(str).width;
    return str.length * charW;
  };

  for (const para of paras) {
    const trimmed = para.trim();
    if (!trimmed) {
      result.push("");
      continue;
    }
    const words = trimmed.split(/\s+/);
    let curLine = "";

    for (const word of words) {
      const wordW = measure(word);
      // If a single word or unbroken string is wider than maxW, break it into character chunks
      if (wordW > maxW) {
        if (curLine) {
          result.push(curLine);
          curLine = "";
        }
        let chunk = "";
        for (const char of word) {
          const testChunk = chunk + char;
          if (measure(testChunk) <= maxW) {
            chunk = testChunk;
          } else {
            if (chunk) result.push(chunk);
            chunk = char;
          }
        }
        if (chunk) {
          curLine = chunk;
        }
        continue;
      }

      if (!curLine) {
        curLine = word;
      } else {
        const testLine = curLine + " " + word;
        if (measure(testLine) <= maxW) {
          curLine = testLine;
        } else {
          result.push(curLine);
          curLine = word;
        }
      }
    }
    if (curLine) {
      result.push(curLine);
    }
  }

  return result.length > 0 ? result : [text];
}

// ─── Canvas Preview Component ─────────────────────────────────────────────────
export const TemplateCanvasPreview: React.FC<{
  template: VideoTemplate;
  width?: number;
  height?: number;
  className?: string;
  overrideRatio?: AspectRatio;
  playbackTime?: number;
  isPlaying?: boolean;
}> = ({ template, width = 320, height = 180, className, overrideRatio, playbackTime, isPlaying }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [productImg, setProductImg] = React.useState<HTMLImageElement | null>(null);
  const [bgImg, setBgImg] = React.useState<HTMLImageElement | null>(null);
  const [logoImg, setLogoImg] = React.useState<HTMLImageElement | null>(null);
  const [decorImgs, setDecorImgs] = React.useState<Record<string, HTMLImageElement>>({});

  // Load logo image if available
  React.useEffect(() => {
    const url = template.logoUrl;
    if (!url) { setLogoImg(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setLogoImg(img);
    img.onerror = () => setLogoImg(null);
    img.src = url;
  }, [template.logoUrl]);

  // Load decoration/sticker images if available
  React.useEffect(() => {
    const decors = (template as any).decorations || [];
    if (!Array.isArray(decors) || decors.length === 0) return;
    decors.forEach((dec: any) => {
      if (!dec.url || decorImgs[dec.url]) return;
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setDecorImgs(prev => ({ ...prev, [dec.url]: img }));
      };
      img.src = dec.url;
    });
  }, [template]);

  // Load product image if available
  React.useEffect(() => {
    const url = template.productUrl;
    if (!url) { setProductImg(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setProductImg(img);
    img.onerror = () => setProductImg(null);
    img.src = url;
  }, [template.productUrl]);

  // Load background image if available
  React.useEffect(() => {
    const ratio = overrideRatio || template.aspectRatio || "16:9";
    const bgUrl = ((template as any).aspectBackgrounds && ((template as any).aspectBackgrounds as any)[ratio]) || template.backgroundUrl;
    if (!bgUrl) { setBgImg(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setBgImg(img);
    img.onerror = () => setBgImg(null);
    img.src = bgUrl;
  }, [template.backgroundUrl, (template as any).aspectBackgrounds, overrideRatio, template.aspectRatio]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ratio = overrideRatio || template.aspectRatio || "16:9";
    // Determine canvas internal resolution based on aspect
    let CW = 640, CH = 360;
    if (ratio === "9:16") { CW = 360; CH = 640; }
    else if (ratio === "1:1") { CW = 640; CH = 640; }
    else if (ratio === "4:5") { CW = 640; CH = 800; }

    canvas.width = CW;
    canvas.height = CH;

    // Background (Image, Color, or Gradient)
    if (bgImg) {
      const imgRatio = bgImg.width / bgImg.height;
      const cRatio = CW / CH;
      let dw = CW, dh = CH, dx = 0, dy = 0;
      if (imgRatio > cRatio) {
        dh = CH;
        dw = CH * imgRatio;
        dx = (CW - dw) / 2;
      } else {
        dw = CW;
        dh = CW / imgRatio;
        dy = (CH - dh) / 2;
      }
      ctx.drawImage(bgImg, dx, dy, dw, dh);
    } else if ((template as any).bgType === "color" && (template as any).bgColor) {
      ctx.fillStyle = (template as any).bgColor;
      ctx.fillRect(0, 0, CW, CH);
    } else {
      const gradIndex = typeof (template as any).bgGradIndex === "number" ? (template as any).bgGradIndex : 0;
      const g = PREVIEW_GRADIENTS[gradIndex] || PREVIEW_GRADIENTS[0];
      const grad = ctx.createLinearGradient(0, 0, CW, CH);
      grad.addColorStop(0, g.c1);
      grad.addColorStop(1, g.c2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CW, CH);

      // Vignette overlay
      const radial = ctx.createRadialGradient(CW/2, CH*0.35, 40, CW/2, CH*0.35, CW*0.85);
      radial.addColorStop(0, "rgba(255,255,255,0.06)");
      radial.addColorStop(1, "rgba(0,0,0,0.4)");
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, CW, CH);
    }

    // Determine layers to render
    const layers: Record<string, any> =
      (template.aspectStore && template.aspectStore[ratio]) ||
      template.layers ||
      {};

    const t = typeof playbackTime === "number" ? playbackTime : 0;
    const hasPlayback = typeof playbackTime === "number";

    const getProgress = (start = 0, end = 1) => {
      if (!hasPlayback) return 1;
      if (t < start) return 0;
      if (t >= end) return 1;
      const p = (t - start) / (end - start);
      return 1 - Math.pow(1 - p, 3);
    };

    const drawText = (L: any, key: string) => {
      if (!L || !L.text || L.hidden) return;
      const prog = getProgress(L.animStart || 0.5, L.animEnd || 1.5);
      const cx = Math.round(L.x * CW);
      const cy = Math.round(L.y * CH);

      let transX = 0, transY = 0, scale = 1;
      if (hasPlayback && isPlaying) {
        const animStyle = L.animation || (key === "discount" ? "zoom_bounce" : key === "cta" ? "pulse" : "fade_in");
        if (animStyle === "zoom_bounce") {
          if (prog < 1) {
            scale = prog === 0 ? 0 : Math.sin(prog * Math.PI * 0.7) * 1.16;
            if (prog > 0.8) scale = 1.16 - ((prog - 0.8) / 0.2) * 0.16;
          } else {
            scale = 1;
          }
        } else if (animStyle === "slide_up" || animStyle === "fade_up") {
          transY = (1 - prog) * (CH * 0.08);
        } else if (animStyle === "slide_left") {
          transX = (1 - prog) * (CW * 0.10);
        } else if (animStyle === "pulse") {
          if (t >= (L.animStart || 0)) {
            scale = 1 + Math.sin((t - (L.animStart || 0)) * 5) * 0.04;
          }
        }
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, prog));
      if (transX !== 0 || transY !== 0 || scale !== 1) {
        ctx.translate(cx + transX, cy + transY);
        ctx.scale(scale, scale);
        ctx.translate(-cx, -cy);
      }

      const fontSize = Math.round(CW * ((L.size || 3) / 100));
      const fWeight = L.fontWeight || "bold";
      const fStyle = L.fontStyle || "normal";
      ctx.font = `${fStyle} ${fWeight} ${fontSize}px ${L.font || "Arial"}, sans-serif`;
      const textAlign = (L.textAlign as CanvasTextAlign) || "center";
      ctx.textAlign = textAlign;
      ctx.textBaseline = "middle";

      // ── Respect template creation boxWidth & prevent framing out ──
      const effectiveBoxWidth = L.boxWidth ? Math.max(12, L.boxWidth) : undefined;
      const customBoxW = effectiveBoxWidth ? Math.round((effectiveBoxWidth / 100) * CW) : 0;
      const customBoxH = L.boxHeight ? Math.round((L.boxHeight / 100) * CH) : 0;

      // Safe canvas boundaries so text never frames out of canvas edges
      const padFromEdge = 14;
      let canvasSafeMaxW = CW - padFromEdge * 2;
      if (textAlign === "left") {
        canvasSafeMaxW = Math.max(60, CW - cx - padFromEdge);
      } else if (textAlign === "right") {
        canvasSafeMaxW = Math.max(60, cx - padFromEdge);
      } else {
        canvasSafeMaxW = Math.max(60, Math.min(cx - padFromEdge, CW - cx - padFromEdge) * 2);
      }

      const isBadgeOrPill = key === "discount" || key === "price" || key === "oldPrice";
      const defaultWrapW = isBadgeOrPill
        ? canvasSafeMaxW
        : Math.min(canvasSafeMaxW, Math.round(CW * (CW > CH ? 0.44 : 0.82)));
      const maxWrapW = customBoxW ? Math.min(customBoxW, canvasSafeMaxW) : defaultWrapW;

      // Wrap lines down when reaching selected boxWidth limit (including unbroken strings)
      const textLines = wrapTextCanvas(ctx, L.text || "", maxWrapW, fontSize);
      const lineHeight = Math.round(fontSize * 1.28);

      let maxLineW = 0;
      for (const line of textLines) {
        const w = ctx.measureText(line).width;
        if (w > maxLineW) maxLineW = w;
      }
      const textW = maxLineW;
      const textH = Math.max(fontSize * 1.2, textLines.length * lineHeight);

      const isOrigami = L.shape === "origami" || L.shape === "ribbon" || L.shape === "parallelogram";
      const isTransparent = (L.shape === "none" || (!L.shape && L.bgMode === "transparent")) && !isOrigami;
      if (!isTransparent) {
        if (isOrigami) {
          // 3D Origami Folded Retail Banner Badge
          const tiltDeg = -7;
          const tiltRad = (tiltDeg * Math.PI) / 180;
          const pw = customBoxW ? Math.max(textW + fontSize * 1.5, customBoxW) : textW + fontSize * 1.5;
          const ph = customBoxH ? Math.max(textH + fontSize * 0.75, customBoxH) : textH + fontSize * 0.75;

          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(tiltRad);

          // 1. Folded green shadow flap
          const foldW = fontSize * 0.95;
          const foldH = fontSize * 0.85;
          ctx.beginPath();
          ctx.moveTo(-pw / 2 + 12, ph / 2 - 2);
          ctx.lineTo(-pw / 2 - foldW * 0.45, ph / 2 + foldH);
          ctx.lineTo(-pw / 2 + foldW * 0.7, ph / 2 - 2);
          ctx.closePath();
          ctx.fillStyle = L.borderColor || "#047857";
          ctx.fill();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.08));
          ctx.stroke();

          // 2. Main Yellow Rounded Box with Drop Shadow & Thick White Border
          ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
          ctx.shadowBlur = Math.round(fontSize * 0.35);
          ctx.shadowOffsetX = -2;
          ctx.shadowOffsetY = 6;

          const rx = Math.max(8, Math.round(fontSize * 0.22));
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(-pw / 2, -ph / 2, pw, ph, rx);
          else ctx.rect(-pw / 2, -ph / 2, pw, ph);
          ctx.fillStyle = L.bgColor || "#ffc700";
          ctx.fill();

          ctx.shadowColor = "transparent";
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = Math.max(3, Math.round(fontSize * 0.12));
          ctx.stroke();

          // 3. Confetti triangles
          const drawTriangle = (tx: number, ty: number, tSize: number, rot: number, color: string) => {
            ctx.save();
            ctx.translate(tx, ty);
            ctx.rotate(rot);
            ctx.beginPath();
            ctx.moveTo(0, -tSize);
            ctx.lineTo(tSize * 0.85, tSize * 0.85);
            ctx.lineTo(-tSize * 0.85, tSize * 0.85);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
            ctx.restore();
          };
          const cs = Math.max(5, Math.round(fontSize * 0.22));
          drawTriangle(-pw / 2 - cs * 1.5, -ph / 2 + cs, cs * 1.1, 0.4, "#ef4444");
          drawTriangle(-pw / 2 - cs * 0.8, -ph / 2 - cs * 1.4, cs, -0.6, "#facc15");
          drawTriangle(-pw / 2 + cs * 1.2, -ph / 2 - cs * 1.8, cs * 0.9, 0.8, "#10b981");

          drawTriangle(pw / 2 + cs * 1.2, -ph / 2 - cs * 0.8, cs * 1.1, -0.4, "#facc15");
          drawTriangle(pw / 2 + cs * 2.2, -ph / 2 + cs * 1.5, cs * 0.85, 0.7, "#ef4444");

          drawTriangle(pw / 2 + cs * 1.6, ph / 2 + cs * 0.8, cs * 0.9, 0.3, "#facc15");
          drawTriangle(pw / 2 - cs * 1.2, ph / 2 + cs * 1.8, cs * 1.0, -0.5, "#10b981");

          drawTriangle(-pw / 2 - cs * 1.8, ph / 2 + cs * 0.6, cs * 1.1, -0.7, "#ef4444");

          ctx.restore();
        } else if (L.shape === "rounded") {
          const pw = customBoxW ? Math.max(textW + fontSize * 1.1, customBoxW) : textW + fontSize * 1.1;
          const ph = customBoxH ? Math.max(textH + fontSize * 0.45, customBoxH) : textH + fontSize * 0.45;
          const rx = Math.max(6, Math.round(fontSize * 0.35));
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(cx - pw/2, cy - ph/2, pw, ph, rx);
          else ctx.rect(cx - pw/2, cy - ph/2, pw, ph);
          ctx.fillStyle = L.bgColor || "#ffc700";
          ctx.fill();
          if (L.border === "1") {
            ctx.strokeStyle = L.borderColor || "#000000";
            ctx.lineWidth = Math.max(1.5, fontSize * 0.08);
            ctx.stroke();
          }
        } else if (L.shape === "circle") {
          const radius = Math.max(textW, textH) / 2 + fontSize * 0.4;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fillStyle = L.bgColor || "#F05A28";
          ctx.fill();
          if (L.border === "1") {
            ctx.strokeStyle = L.borderColor || "#fff";
            ctx.lineWidth = Math.max(1.5, fontSize * 0.08);
            ctx.stroke();
          }
        } else if (L.shape === "pill") {
          const pw = customBoxW ? Math.max(textW + fontSize * 1.2, customBoxW) : textW + fontSize * 1.2;
          const ph = customBoxH ? Math.max(textH + fontSize * 0.4, customBoxH) : textH + fontSize * 0.4;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(cx - pw/2, cy - ph/2, pw, ph, ph/2);
          else ctx.rect(cx - pw/2, cy - ph/2, pw, ph);
          ctx.fillStyle = L.bgColor || "#ffffff";
          ctx.fill();
        } else if (L.shape === "rect") {
          const pw = customBoxW ? Math.max(textW + fontSize * 0.8, customBoxW) : textW + fontSize * 0.8;
          const ph = customBoxH ? Math.max(textH + fontSize * 0.4, customBoxH) : textH + fontSize * 0.4;
          ctx.fillStyle = L.bgColor || "#0B2830";
          ctx.fillRect(cx - pw/2, cy - ph/2, pw, ph);
          if (L.border === "1") {
            ctx.strokeStyle = L.borderColor || "#11B5BB";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(cx - pw/2, cy - ph/2, pw, ph);
          }
        }
      }

      if (isOrigami) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((-7 * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }

      ctx.fillStyle = L.fontColor || "#ffffff";
      ctx.textAlign = textAlign;
      ctx.textBaseline = "middle";

      const padX = fontSize * 0.45;
      const startY = cy - ((textLines.length - 1) * lineHeight) / 2;

      textLines.forEach((line: string, idx: number) => {
        let lineX = cx;
        if (textAlign === "left") {
          lineX = cx - textW / 2 + padX;
        } else if (textAlign === "right") {
          lineX = cx + textW / 2 - padX;
        }
        const lineY = startY + idx * lineHeight;
        ctx.fillText(line, lineX, lineY);

        if (key === "oldPrice") {
          const lineW = ctx.measureText(line).width;
          ctx.strokeStyle = L.fontColor || "#94A3B8";
          ctx.lineWidth = Math.max(1.5, fontSize * 0.1);
          ctx.beginPath();
          ctx.moveTo(lineX - lineW / 2, lineY);
          ctx.lineTo(lineX + lineW / 2, lineY);
          ctx.stroke();
        }
      });

      if (isOrigami) {
        ctx.restore();
      }
      ctx.restore();
    };

    // Draw product image or placeholder
    const pL = layers["product"];
    if (pL) {
      const prog = getProgress(pL.animStart || 0.2, pL.animEnd || 1.2);
      const maxDim = Math.round(CW * ((pL.size || 50) / 100));
      const cx = Math.round(pL.x * CW);
      let pTransY = 0, pScale = 1;
      if (hasPlayback && isPlaying) {
        if (pL.animation === "zoom_bounce") {
          pScale = prog === 0 ? 0 : Math.sin(prog * Math.PI * 0.7) * 1.12;
          if (prog > 0.8) pScale = 1.12 - ((prog - 0.8) / 0.2) * 0.12;
        } else {
          pTransY = (1 - prog) * (CH * 0.08);
        }
      }
      const cy = Math.round(pL.y * CH + pTransY);
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, prog));
      if (pScale !== 1) {
        ctx.translate(cx, cy);
        ctx.scale(pScale, pScale);
        ctx.translate(-cx, -cy);
      }
      if (productImg) {
        const aspect = productImg.width / productImg.height;
        let pw = maxDim, ph = maxDim;
        if (aspect > 1) { pw = maxDim; ph = maxDim / aspect; }
        else { ph = maxDim; pw = maxDim * aspect; }

        let r = 0;
        if (pL.shape === "circle") {
          r = Math.min(pw, ph) / 2;
        } else if (typeof pL.borderRadius === "number" && pL.borderRadius > 0) {
          r = pL.borderRadius <= 50 ? (pL.borderRadius / 100) * Math.min(pw, ph) : Math.min(pL.borderRadius, pw / 2, ph / 2);
        } else if (pL.shape === "rounded") {
          r = Math.min(pw, ph) * 0.12;
        }

        ctx.save();
        if (pL.shadow) {
          ctx.shadowColor = "rgba(0,0,0,0.35)";
          ctx.shadowBlur = 10;
          ctx.shadowOffsetY = 3;
        }
        if (r > 0) {
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(cx - pw/2, cy - ph/2, pw, ph, r);
          else ctx.rect(cx - pw/2, cy - ph/2, pw, ph);
          ctx.clip();
          ctx.drawImage(productImg, cx - pw/2, cy - ph/2, pw, ph);
          ctx.restore();

          if (pL.border === "1" || (pL.borderWidth && pL.borderWidth > 0)) {
            ctx.save();
            ctx.strokeStyle = pL.borderColor || "#ffffff";
            ctx.lineWidth = pL.borderWidth || 2;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(cx - pw/2, cy - ph/2, pw, ph, r);
            else ctx.rect(cx - pw/2, cy - ph/2, pw, ph);
            ctx.stroke();
            ctx.restore();
          }
        } else {
          ctx.drawImage(productImg, cx - pw/2, cy - ph/2, pw, ph);
          ctx.restore();
          if (pL.border === "1" || (pL.borderWidth && pL.borderWidth > 0)) {
            ctx.save();
            ctx.strokeStyle = pL.borderColor || "#ffffff";
            ctx.lineWidth = pL.borderWidth || 2;
            ctx.strokeRect(cx - pw/2, cy - ph/2, pw, ph);
            ctx.restore();
          }
        }
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.strokeStyle = "rgba(255,255,255,0.35)";
        ctx.lineWidth = 1.5;
        ctx.fillRect(cx - maxDim/2, cy - maxDim/2, maxDim, maxDim);
        ctx.strokeRect(cx - maxDim/2, cy - maxDim/2, maxDim, maxDim);
        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = `bold ${Math.round(CW * 0.025)}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("PRODUCT", cx, cy);
      }
      ctx.restore();
    } else {
      // Default product placeholder if no layer config
      const cx = Math.round(CW * 0.5);
      const cy = Math.round(CH * 0.38);
      const maxDim = Math.round(CW * 0.45);
      ctx.save();
      if (productImg) {
        const aspect = productImg.width / productImg.height;
        let pw = maxDim, ph = maxDim;
        if (aspect > 1) { pw = maxDim; ph = maxDim / aspect; }
        else { ph = maxDim; pw = maxDim * aspect; }
        ctx.drawImage(productImg, cx - pw/2, cy - ph/2, pw, ph);
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.1)";
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(cx - maxDim/2, cy - maxDim/2, maxDim, maxDim, 12);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.font = `bold ${Math.round(CW * 0.025)}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("PRODUCT IMAGE", cx, cy);
      }
      ctx.restore();
    }

    // Draw Logo
    const logoL = layers["logo"];
    if (logoL && logoImg) {
      const minSide = Math.min(CW, CH);
      const lSize = Math.round(minSide * ((logoL.size || 12) / 100));
      const lCx = Math.round((logoL.x ?? 0.1) * CW);
      const lCy = Math.round((logoL.y ?? 0.08) * CH);
      ctx.drawImage(logoImg, lCx - lSize / 2, lCy - lSize / 2, lSize, lSize);
    }

    // Draw text layers
    const textOrder = ["storeName", "discount", "headline", "description", "price", "oldPrice", "validity", "cta", "qrCode", "footer"];
    for (const key of textOrder) {
      if (layers[key]) drawText(layers[key], key);
    }
    for (const key of Object.keys(layers)) {
      if (!textOrder.includes(key) && key !== "product" && key !== "logo" && key !== "decors") {
        drawText(layers[key], key);
      }
    }

    // Draw Decorations / Added custom stickers & shapes
    const modalDecors = (template as any).decorations || [];
    if (Array.isArray(modalDecors) && modalDecors.length > 0) {
      for (const dec of modalDecors) {
        if (dec.hidden || !dec.url) continue;
        const dImg = decorImgs[dec.url];
        if (dImg && dImg.complete && dImg.naturalWidth > 0) {
          const cx = Math.round((dec.x ?? 0.5) * CW);
          const cy = Math.round((dec.y ?? 0.5) * CH);
          const baseDim = Math.min(CW, CH);
          const dw = Math.round(baseDim * ((dec.size || 15) / 100));
          const aspect = dImg.naturalWidth / dImg.naturalHeight;
          const dh = Math.round(dw / (aspect || 1));
          ctx.save();
          ctx.translate(cx, cy);
          ctx.drawImage(dImg, -dw / 2, -dh / 2, dw, dh);
          ctx.restore();
        }
      }
    }

    // If no layers defined, draw default minimal preview text
    if (Object.keys(layers).length === 0) {
      ctx.fillStyle = "rgba(17,181,187,0.9)";
      ctx.font = `bold ${Math.round(CW * 0.03)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(template.templateName || "Template Preview", CW/2, CH/2 + CH * 0.25);

      // Discount badge placeholder
      const bCx = Math.round(CW * 0.5);
      const bCy = Math.round(CH * 0.62);
      const bR = Math.round(CW * 0.09);
      ctx.beginPath();
      ctx.arc(bCx, bCy, bR, 0, Math.PI * 2);
      ctx.fillStyle = "#F05A28";
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.round(CW * 0.038)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("50% OFF", bCx, bCy);
    }

    // Aspect ratio label watermark
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.font = `bold ${Math.round(CW * 0.022)}px Arial`;
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(ratio, CW - 8, CH - 6);

  }, [template, productImg, bgImg, logoImg, decorImgs, overrideRatio, playbackTime, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", borderRadius: 8 }}
      className={className}
    />
  );
};

function getDescription(t: VideoTemplate): string {
  return t.templateDescription || t.description || "";
}

// ─── View Modal (All 4 Aspect Ratios Preview Grid & Focus Mode) ───────────
const ViewModal: React.FC<{
  template: VideoTemplate;
  onClose: () => void;
  onEdit: () => void;
  onOpenStudio?: (ratio?: AspectRatio) => void;
  onScheduleSocial?: (tplId: string) => void;
  onMakeVideo?: (template: VideoTemplate) => void;
}> = ({ template, onClose, onEdit, onOpenStudio, onScheduleSocial, onMakeVideo }) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "single">("grid");
  const [activeRatio, setActiveRatio] = useState<AspectRatio>(
    (template.aspectRatio as AspectRatio) || "16:9"
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const startRef = React.useRef<number | null>(null);
  const duration = template.videoDuration || 10;

  React.useEffect(() => {
    if (!isPlaying) return;
    let animId: number;
    const loop = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp - playbackTime * 1000;
      const elapsed = (timestamp - startRef.current) / 1000;
      if (elapsed >= duration) {
        startRef.current = timestamp;
        setPlaybackTime(0);
      } else {
        setPlaybackTime(elapsed);
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, duration, playbackTime]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(template._id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ratiosList: Array<{ ratio: AspectRatio; name: string; tag: string; res: string; desc: string }> = [
    { ratio: "16:9", name: "Landscape", tag: "TV / In-Store Displays", res: "1920×1080 Full HD", desc: "Digital Signage screens, Smart TVs, Web landscape banners" },
    { ratio: "9:16", name: "Vertical", tag: "Reels / Shorts / TikTok", res: "1080×1920 Portrait", desc: "Instagram Stories & Reels, YouTube Shorts, TikTok vertical screens" },
    { ratio: "1:1",  name: "Square", tag: "Feed / Carousel", res: "1080×1080 Square", desc: "Instagram Feed, Facebook carousel ads, product showcases" },
    { ratio: "4:5",  name: "Portrait", tag: "Social Feed Ads", res: "1080×1350 Ad Ratio", desc: "High-engagement sponsored feed posts and promotional ads" },
  ];

  // Preview box dimensions for single view
  const previewMaxH = 300;
  let singleW = 500, singleH = 281;
  if (activeRatio === "9:16") { singleW = Math.round(previewMaxH * 9 / 16); singleH = previewMaxH; }
  else if (activeRatio === "1:1") { singleW = previewMaxH; singleH = previewMaxH; }
  else if (activeRatio === "4:5") { singleW = Math.round(previewMaxH * 4 / 5); singleH = previewMaxH; }
  else { singleW = 500; singleH = Math.round(500 * 9 / 16); }

  return (
    <div className="aivt-modal-overlay" onClick={onClose}>
      <div className="aivt-modal aivt-modal--multi-aspect" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="aivt-modal__header">
          <div className="aivt-modal__icon"><FaFilm size={18} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h3 className="aivt-modal__title">{template.templateName}</h3>
              <span className="aivt-badge-id">Template #{template.templateId || 1}</span>
              <span className="aivt-badge-4ratios">✨ All 4 Aspect Ratios Configured</span>
            </div>
            <p className="aivt-modal__subtitle">Multi-Screen Template Preview · All 4 aspect ratios rendered with saved coordinates</p>
          </div>
          <button className="aivt-modal__close" onClick={onClose}><FaTimes size={16} /></button>
        </div>

        <div className="aivt-modal__body">
          {/* Top Banner with Quick Actions */}
          <div className="aivt-id-banner">
            <div className="aivt-id-banner__left">
              <span className="aivt-id-banner__label">Template Sequence ID</span>
              <code className="aivt-id-banner__code">#{template.templateId || 1}</code>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button className="aivt-id-banner__copy-btn" onClick={handleCopyId}>
                {copied ? <><FaCheck size={12} /> Copied!</> : <><FaCopy size={12} /> Copy ID (#{template.templateId || 1})</>}
              </button>
              {onOpenStudio && (
                <button
                  className="aivt-top-studio-btn"
                  onClick={() => onOpenStudio(activeRatio)}
                  title="Open this template design in Visual Canvas Studio"
                >
                  <FaPen size={11} /> Edit in Studio
                </button>
              )}
            </div>
          </div>

          {/* ── Live Animation Playback Control Bar ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              background: "#081d24",
              border: "1px solid rgba(17, 181, 187, 0.3)",
              borderRadius: "10px",
              padding: "10px 16px",
              marginBottom: "12px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                onClick={() => {
                  startRef.current = null;
                  setIsPlaying(!isPlaying);
                }}
                style={{
                  background: isPlaying ? "#ef4444" : "#f05a28",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 14px",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: isPlaying ? "0 0 12px rgba(239,68,68,0.4)" : "0 0 12px rgba(240,90,40,0.3)",
                }}
              >
                {isPlaying ? <FaPause size={11} /> : <FaPlay size={11} />}
                <span>{isPlaying ? "Pause Preview" : "Play Preview"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  startRef.current = null;
                  setPlaybackTime(0);
                  if (!isPlaying) setIsPlaying(true);
                }}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.8rem",
                }}
                title="Replay animation from start"
              >
                <FaRedo size={11} /> Replay
              </button>
            </div>

            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px", minWidth: "180px", maxWidth: "420px" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#11B5BB", fontFamily: "monospace", minWidth: "35px" }}>
                {playbackTime.toFixed(1)}s
              </span>
              <input
                type="range"
                min="0"
                max={duration}
                step="0.05"
                value={playbackTime}
                onChange={(e) => {
                  setIsPlaying(false);
                  startRef.current = null;
                  setPlaybackTime(Number(e.target.value));
                }}
                style={{ flex: 1, accentColor: "#11B5BB", cursor: "pointer", height: "4px" }}
              />
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#94a3b8", fontFamily: "monospace", minWidth: "30px" }}>
                {duration}s
              </span>
            </div>

            <span
              style={{
                fontSize: "11px",
                color: isPlaying ? "#22c55e" : "#94a3b8",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "5px",
                background: "rgba(0,0,0,0.3)",
                padding: "3px 8px",
                borderRadius: "6px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: isPlaying ? "#22c55e" : "#64748b",
                  boxShadow: isPlaying ? "0 0 6px #22c55e" : "none",
                  display: "inline-block",
                }}
              />
              {isPlaying ? "Live Animation (60fps)" : "Paused"}
            </span>
          </div>

          {/* Ratio View Switcher Tabs */}
          <div className="aivt-ratio-tab-bar">
            <button
              className={`aivt-ratio-tab ${viewMode === "grid" ? "aivt-ratio-tab--active" : ""}`}
              onClick={() => setViewMode("grid")}
            >
              <FaTable size={12} />
              <span>All 4 Ratios Grid</span>
              <span className="aivt-tab-count">4</span>
            </button>
            <div className="aivt-ratio-tab-divider" />
            {ratiosList.map((r) => (
              <button
                key={r.ratio}
                className={`aivt-ratio-tab ${viewMode === "single" && activeRatio === r.ratio ? "aivt-ratio-tab--active" : ""}`}
                onClick={() => {
                  setActiveRatio(r.ratio);
                  setViewMode("single");
                }}
              >
                <span>{r.ratio} {r.name}</span>
                <span className="aivt-ratio-res-tag">{r.res.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* ── VIEW MODE 1: ALL 4 RATIOS GRID ── */}
          {viewMode === "grid" ? (
            <div className="aivt-4ratios-grid">
              {ratiosList.map((item) => (
                <div key={item.ratio} className="aivt-ratio-card">
                  <div className="aivt-ratio-card__head">
                    <div className="aivt-ratio-card__title-box">
                      <span className="aivt-ratio-card__badge">{item.ratio}</span>
                      <strong className="aivt-ratio-card__name">{item.name}</strong>
                    </div>
                    <span className="aivt-ratio-card__res">{item.res.split(' ')[0]}</span>
                  </div>

                  <div
                    className="aivt-ratio-card__preview-frame"
                    onClick={() => { setActiveRatio(item.ratio); setViewMode("single"); }}
                    title={`Click to focus ${item.ratio} large`}
                  >
                    <div className={`aivt-canvas-aspect-box aivt-canvas-aspect-box--${item.ratio.replace(":", "x")}`}>
                      <TemplateCanvasPreview template={template} overrideRatio={item.ratio} playbackTime={playbackTime} isPlaying={isPlaying} />
                    </div>
                    <div className="aivt-ratio-card__hover-zoom">
                      <FaExpand size={13} /> Focus {item.ratio}
                    </div>
                  </div>

                  <div className="aivt-ratio-card__footer">
                    <span className="aivt-ratio-card__tag">{item.tag}</span>
                    {onOpenStudio && (
                      <button
                        className="aivt-ratio-card__edit-btn"
                        onClick={() => onOpenStudio(item.ratio)}
                        title={`Open and edit ${item.ratio} layout in Visual Canvas Studio`}
                      >
                        <FaPen size={11} /> Edit {item.ratio} in Studio
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── VIEW MODE 2: SINGLE RATIO FOCUS ── */
            <div className="aivt-single-focus-wrap">
              <div className="aivt-single-focus-stage" style={{ width: singleW, height: singleH }}>
                <TemplateCanvasPreview template={template} overrideRatio={activeRatio} playbackTime={playbackTime} isPlaying={isPlaying} />
              </div>
              <div className="aivt-single-focus-info">
                <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
                  <span className="aivt-spec-chip"><FaClock size={10} /> {template.videoDuration || 10}s Duration</span>
                  <span className="aivt-spec-chip">🎨 {activeRatio} ({ratiosList.find(x => x.ratio === activeRatio)?.res})</span>
                  <span className="aivt-spec-chip">{ratiosList.find(x => x.ratio === activeRatio)?.tag}</span>
                  <span className="aivt-spec-chip aivt-spec-chip--status">{template.status || "Active"}</span>
                </div>
                {onOpenStudio && (
                  <button
                    className="aivt-btn-studio"
                    style={{ marginTop: 12, padding: "8px 20px", fontSize: "0.85rem", margin: "12px auto 0" }}
                    onClick={() => onOpenStudio(activeRatio)}
                  >
                    <FaPen size={12} /> Edit {activeRatio} Design in Canvas Studio
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="aivt-desc-box">
            <span className="aivt-desc-box__tag">TEMPLATE SPECIFICATION</span>
            <div style={{ whiteSpace: "pre-wrap", marginTop: 6, fontSize: "0.85rem", color: "#334155" }}>
              {getDescription(template) || "Commercial multi-screen video template specification."}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="aivt-modal__actions">
          {onMakeVideo && (
            <button
              type="button"
              className="aivt-btn-make-video"
              onClick={() => {
                onClose();
                onMakeVideo(template);
              }}
              style={{
                background: "linear-gradient(135deg, #F05A28, #FF7043)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(240, 90, 40, 0.35)",
              }}
            >
              <FaMagic size={13} /> Create Video with this Template
            </button>
          )}

          {onScheduleSocial && (
            <button
              className="aivt-btn-social"
              onClick={() => {
                onClose();
                onScheduleSocial(template._id);
              }}
            >
              <FaCalendarAlt size={12} /> Schedule to Social Media
            </button>
          )}

          {onOpenStudio && (
            <button
              className="aivt-btn-studio aivt-btn-studio--highlight"
              onClick={() => onOpenStudio(activeRatio)}
            >
              <FaFilm size={13} /> Edit in Visual Canvas Studio
            </button>
          )}

          <button className="aivt-btn-cancel" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ─── Delete Modal ─────────────────────────────────────────────────────────────
const DeleteModal: React.FC<{
  template: VideoTemplate;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}> = ({ template, onConfirm, onCancel, deleting }) => (
  <div className="aivt-modal-overlay" onClick={onCancel}>
    <div className="aivt-modal" onClick={(e) => e.stopPropagation()}>
      <div className="aivt-modal__header">
        <div className="aivt-modal__icon aivt-modal__icon--danger"><FaTrash size={18} /></div>
        <h3 className="aivt-modal__title">Delete Video Template?</h3>
      </div>
      <div className="aivt-modal__body">
        <p className="aivt-modal__message">Are you sure you want to permanently delete this template?</p>
        <div style={{ background: "#FEE2E2", border: "1px solid #FECACA", padding: "10px 14px", borderRadius: 8, margin: "10px 0" }}>
          <strong style={{ color: "#991B1B", fontSize: "0.95rem" }}>"{template.templateName}"</strong>
          <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#B91C1C", fontFamily: "monospace" }}>
            ID: {template._id}
          </p>
        </div>
        <p className="aivt-modal__warning">This action cannot be undone. Any active jobs will revert to default layouts.</p>
      </div>
      <div className="aivt-modal__actions">
        <button className="aivt-btn-cancel" onClick={onCancel} disabled={deleting}>Cancel</button>
        <button className="aivt-btn-delete" onClick={onConfirm} disabled={deleting}>
          {deleting ? <span className="aivt-spinner" /> : <FaTrash size={12} />}
          {deleting ? "Deleting…" : "Yes, Delete Template"}
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AIVideoTemplatesView({
  onNavigate,
  storeUserId,
  storeName,
}: {
  onNavigate?: (view: any, extra?: any) => void;
  storeUserId?: string;
  storeName?: string;
}) {
  const currentUserId = storeUserId || (typeof window !== "undefined" ? localStorage.getItem("userId") ?? "" : "");
  // View mode: Grid vs Table
  const [layoutMode, setLayoutMode] = useState<"grid" | "table">("grid");

  // Filtering
  const [filterCategory, setFilterCategory] = useState<"all" | "builtin" | "custom" | "9:16" | "16:9" | "1:1">("all");
  const [search, setSearch] = useState("");

  // Modals
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [viewingTemplate, setViewingTemplate] = useState<VideoTemplate | null>(null);
  const [isMakeVideoOpen, setIsMakeVideoOpen] = useState(false);
  const [makeVideoTarget, setMakeVideoTarget] = useState<VideoTemplate | null>(null);

  const openMakeVideoModal = (t?: VideoTemplate | null) => {
    setMakeVideoTarget(t || null);
    setIsMakeVideoOpen(true);
  };
  const [deleteTarget, setDeleteTarget] = useState<VideoTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form State for Create/Edit Modal
  const [editingTemplate, setEditingTemplate] = useState<VideoTemplate | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [description, setDescription] = useState("");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [videoDuration, setVideoDuration] = useState<number>(10);
  const [animationStyle, setAnimationStyle] = useState("Fade");
  const [language, setLanguage] = useState("English");
  const [aiModel, setAiModel] = useState("Veo 3.1");
  const [status, setStatus] = useState<TemplateStatus>("Active");

  const [synthesising, setSynthesising] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Data
  const [templates, setTemplates] = useState<VideoTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const LIMIT = 12;

  // ── Ad Videos State (Commercial Videos Generated via API & Visual Studio) ──
  const [activeViewTab, setActiveViewTab] = useState<"templates" | "adVideos">("templates");
  const [adVideos, setAdVideos] = useState<any[]>([]);
  const [loadingAdVideos, setLoadingAdVideos] = useState(false);
  const [selectedPreviewVideo, setSelectedPreviewVideo] = useState<any>(null);
  const [adVideoRatioFilter, setAdVideoRatioFilter] = useState<string>("all");
  const [adVideoSearch, setAdVideoSearch] = useState<string>("");

  const getAuthHeaders = useCallback((): HeadersInit => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }, []);

  const fetchAdVideos = useCallback(async () => {
    setLoadingAdVideos(true);
    try {
      const url = currentUserId ? `/api/video-template/ad-videos?userId=${encodeURIComponent(currentUserId)}` : "/api/video-template/ad-videos";
      const res = await fetch(url, { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAdVideos(json.data);
      }
    } catch (e) {
      console.error("Failed to load ad videos:", e);
    } finally {
      setLoadingAdVideos(false);
    }
  }, [currentUserId, getAuthHeaders]);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const copyId = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    showToast(`Template ID copied: ${id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ── Fetch Templates ─────────────────────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/video-template", { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && data.data) {
        setTemplates(data.data);
      } else {
        setTemplates([]);
      }
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchTemplates();
    fetchAdVideos();
  }, [fetchTemplates, fetchAdVideos]);

  // ── Filtered Templates ──────────────────────────────────────────────────────
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      // Category filter
      if (filterCategory === "builtin" && !t.isDummy) return false;
      if (filterCategory === "custom" && t.isDummy) return false;
      if (filterCategory === "9:16" && t.aspectRatio !== "9:16") return false;
      if (filterCategory === "16:9" && t.aspectRatio !== "16:9") return false;
      if (filterCategory === "1:1" && t.aspectRatio !== "1:1") return false;

      // Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const nameMatch = t.templateName?.toLowerCase().includes(q);
        const descMatch = getDescription(t).toLowerCase().includes(q);
        const idMatch = t._id?.toLowerCase().includes(q);
        if (!nameMatch && !descMatch && !idMatch) return false;
      }

      return true;
    });
  }, [templates, filterCategory, search]);

  const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / LIMIT));
  const displayedTemplates = filteredTemplates.slice((page - 1) * LIMIT, page * LIMIT);

  // ── Filtered Ad Videos ──────────────────────────────────────────────────────
  const filteredAdVideos = useMemo(() => {
    return adVideos.filter((v) => {
      if (adVideoRatioFilter !== "all" && v.ratio !== adVideoRatioFilter) return false;
      if (adVideoSearch.trim()) {
        const q = adVideoSearch.toLowerCase().trim();
        const nameMatch = (v.name || "").toLowerCase().includes(q);
        const tplMatch = (v.templateName || "").toLowerCase().includes(q);
        const idMatch = String(v.templateId || "").includes(q);
        const ratioMatch = (v.ratio || "").toLowerCase().includes(q);
        if (!nameMatch && !tplMatch && !idMatch && !ratioMatch) return false;
      }
      return true;
    });
  }, [adVideos, adVideoRatioFilter, adVideoSearch]);

  // ── Form Handlers ───────────────────────────────────────────────────────────
  const openCreateModal = () => {
    if (onNavigate) {
      onNavigate("templateEditor", { createNew: true });
    } else {
      window.location.href = "/store_user/template-editor";
    }
  };

  const openEditModal = (t: VideoTemplate, ratio?: AspectRatio) => {
    setViewingTemplate(null);
    if (onNavigate) {
      onNavigate("templateEditor", { templateId: t._id, ratio });
    } else {
      window.location.href = `/store_user/template-editor?id=${t._id}${ratio ? `&ratio=${ratio}` : ""}`;
    }
  };

  const handleSynthesise = async () => {
    if (!description.trim()) {
      showToast("Write some rough keywords first before AI synthesis", "error");
      return;
    }
    setSynthesising(true);
    try {
      const res = await fetch("/api/ai-template-synthesise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: description, templateName }),
      });
      const data = await res.json();
      if (data.success && data.description) {
        setDescription(data.description);
        showToast("✨ AI generated template description!", "success");
      } else {
        showToast(data.message || "Synthesis failed", "error");
      }
    } catch {
      showToast("Network error during AI synthesis", "error");
    } finally {
      setSynthesising(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!templateName.trim()) errors.templateName = "Template name is required";
    if (!description.trim()) errors.description = "Description is required";
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const payload: any = {
        templateName: templateName.trim(),
        templateDescription: description.trim(),
        description: description.trim(),
        aspectRatio,
        videoDuration: Number(videoDuration),
        animationStyle,
        language,
        aiModel,
        status,
        storeUserId: currentUserId || undefined,
      };

      const isDummy = editingTemplate?.isDummy;
      const isEdit = !!editingTemplate;

      let url: string;
      let method: string;

      if (isDummy) {
        payload._id = editingTemplate!._id;
        url = "/api/video-template";
        method = "POST";
      } else if (isEdit) {
        url = `/api/video-template/${editingTemplate!._id}`;
        method = "PUT";
      } else {
        url = "/api/video-template";
        method = "POST";
      }

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        showToast(isEdit ? "Template updated successfully!" : "Template created successfully!", "success");
        setIsEditorModalOpen(false);
        fetchTemplates();
      } else {
        showToast(data.message || "Something went wrong", "error");
      }
    } catch {
      showToast("Network error saving template", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/video-template/${deleteTarget._id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Template deleted successfully!", "success");
        setDeleteTarget(null);
        fetchTemplates();
      } else {
        showToast(data.message || "Failed to delete template", "error");
      }
    } catch {
      showToast("Network error deleting template", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="aivt-root">
      {/* Toast */}
      {toast && (
        <div className={`aivt-toast aivt-toast--${toast.type}`}>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)}><FaTimes size={12} /></button>
        </div>
      )}

      {/* Make Video from Template Modal */}
      {isMakeVideoOpen && (
        <MakeVideoFromTemplateModal
          initialTemplate={makeVideoTarget}
          allTemplates={templates}
          onClose={() => setIsMakeVideoOpen(false)}
          onSuccess={() => {
            fetchAdVideos();
            showToast("Video created and saved to library!");
          }}
          onNavigate={onNavigate}
          onSwitchToAdVideos={() => {
            setActiveViewTab("adVideos");
            fetchAdVideos();
          }}
          storeUserId={currentUserId}
        />
      )}

      {/* View Modal */}
      {viewingTemplate && (
        <ViewModal
          template={viewingTemplate}
          onClose={() => setViewingTemplate(null)}
          onEdit={() => openEditModal(viewingTemplate)}
          onOpenStudio={(ratio) => openEditModal(viewingTemplate, ratio)}
          onScheduleSocial={(tplId) => {
            if (onNavigate) onNavigate("socialScheduler", { templateId: tplId });
          }}
          onMakeVideo={(tpl) => openMakeVideoModal(tpl)}
        />
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteModal
          template={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}

      {/* ── Top Hero Bar ── */}
      <div className="aivt-hero">
        <div className="aivt-hero__left">
          <div className="aivt-hero__icon">
            <FaLayerGroup size={24} />
          </div>
          <div>
            <h1 className="aivt-hero__title">Video Templates Library</h1>
            <p className="aivt-hero__subtitle">
              Browse your created StoreSparc video templates, copy sequential Template IDs, and edit designs in the Canvas Studio.
            </p>
          </div>
        </div>

        <div className="aivt-hero__actions">
          {onNavigate && (
            <button
              className="aivt-btn-hero aivt-btn-hero--outline"
              onClick={() => onNavigate("socialScheduler")}
              title="Social Media Content Planner"
            >
              <FaCalendarAlt size={13} /> Social Scheduler
            </button>
          )}

          <button
            className="aivt-btn-hero aivt-btn-hero--studio"
            onClick={() => {
              if (onNavigate) onNavigate("templateEditor");
              else window.location.href = "/store_user/template-editor";
            }}
            title="Open Storesparc 9-Point Canvas Studio"
          >
            <FaFilm size={13} /> Visual Studio
          </button>

          <button
            className="aivt-btn-hero aivt-btn-hero--make-video"
            onClick={() => openMakeVideoModal(null)}
            title="Create video from template with customizable photo, offer & description"
          >
            <FaMagic size={13} /> Make Video from Template
          </button>

          <button
            className="aivt-btn-hero aivt-btn-hero--primary"
            onClick={openCreateModal}
          >
            <FaPlus size={13} /> Create Template
          </button>
        </div>
      </div>

      {/* ── View Switcher: Video Templates vs Generated Ad Videos ── */}
      <div className="aivt-tab-nav">
        <button
          type="button"
          className={`aivt-tab-nav__btn ${activeViewTab === "templates" ? "active" : ""}`}
          onClick={() => setActiveViewTab("templates")}
        >
          <FaLayerGroup size={15} className="aivt-tab-icon" />
          <span className="aivt-tab-label">Video Templates</span>
          <span className="aivt-tab-count">{templates.length}</span>
        </button>
        <button
          type="button"
          className={`aivt-tab-nav__btn ${activeViewTab === "adVideos" ? "active" : ""}`}
          onClick={() => {
            setActiveViewTab("adVideos");
            fetchAdVideos();
          }}
        >
          <FaVideo size={14} className="aivt-tab-icon" />
          <span className="aivt-tab-label">Ad Videos / Rendered Promos</span>
          <span className="aivt-tab-count aivt-tab-count--promo">{adVideos.length}</span>
          {adVideos.length > 0 && <span className="aivt-tab-pill">READY</span>}
        </button>
      </div>

      {activeViewTab === "templates" ? (
        <>
      {/* ── Filters & Controls Bar ── */}
      <div className="aivt-controls">
        {/* Search */}
        <div className="aivt-search-box">
          <FaSearch className="aivt-search-icon" size={13} />
          <input
            type="text"
            className="aivt-search-input"
            placeholder="Search by Template Name, Prompt or Template ID…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {search && (
            <button className="aivt-search-clear" onClick={() => setSearch("")}>
              <FaTimes size={10} />
            </button>
          )}
        </div>

        {/* Category Filter Chips */}
        <div className="aivt-filter-chips">
          {[
            ["all", `All (${templates.length})`],
            ["9:16", "9:16 Vertical"],
            ["16:9", "16:9 Landscape"],
            ["1:1", "1:1 Square"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`aivt-chip ${filterCategory === key ? "active" : ""}`}
              onClick={() => {
                setFilterCategory(key as any);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* View Switcher: Grid vs Table */}
        <div className="aivt-view-toggle">
          <button
            className={`aivt-toggle-btn ${layoutMode === "grid" ? "active" : ""}`}
            onClick={() => setLayoutMode("grid")}
            title="Grid Cards View"
          >
            <FaThLarge size={13} />
          </button>
          <button
            className={`aivt-toggle-btn ${layoutMode === "table" ? "active" : ""}`}
            onClick={() => setLayoutMode("table")}
            title="Detailed Table View"
          >
            <FaList size={13} />
          </button>
        </div>
      </div>

      {/* ── Content View ── */}
      {loading ? (
        <div className="aivt-loading">
          <FaSpinner className="aivt-spin" size={28} />
          <p>Loading Video Templates Library…</p>
        </div>
      ) : displayedTemplates.length === 0 ? (
        <div className="aivt-empty">
          <div className="aivt-empty__icon"><FaFilm size={36} /></div>
          <h3>No templates match your search</h3>
          <p>Try clearing your search query or create a brand new template using the button above.</p>
          <button className="aivt-btn-hero aivt-btn-hero--primary" onClick={openCreateModal} style={{ marginTop: 12 }}>
            <FaPlus size={12} /> Create New Template
          </button>
        </div>
      ) : layoutMode === "grid" ? (
        /* ══════════════ GRID CARDS VIEW ══════════════ */
        <div className="aivt-grid">
          {displayedTemplates.map((t) => {
            const isCopied = copiedId === t._id;
            const desc = getDescription(t);
            return (
              <div key={t._id} className="aivt-card-item">
                {/* Header with Title and Type */}
                <div className="aivt-card-item__head">
                  <div className="aivt-card-item__title-row">
                    <h3 className="aivt-card-item__title" title={t.templateName}>
                      {t.templateName}
                    </h3>
                    <span className="aivt-badge-pill aivt-badge-pill--custom">StoreSparc Studio</span>
                  </div>

                  {/* PROMINENT TEMPLATE ID BADGE WITH 1-CLICK COPY */}
                  <div
                    className={`aivt-id-badge ${isCopied ? "copied" : ""}`}
                    onClick={(e) => copyId(String(t.templateId || t._id), e)}
                    title="Click to copy Template ID"
                  >
                    <span className="aivt-id-badge__prefix">ID:</span>
                    <code className="aivt-id-badge__val">#{t.templateId || (templates.indexOf(t) + 1)}</code>
                    <span className="aivt-id-badge__icon">
                      {isCopied ? <FaCheck size={10} color="#16A34A" /> : <FaCopy size={10} />}
                    </span>
                  </div>
                </div>

                {/* Canvas Preview Frame */}
                <div
                  className="aivt-card-item__preview-frame"
                  onClick={() => setViewingTemplate(t)}
                >
                  <TemplateCanvasPreview template={t} />
                  <div className="aivt-card-item__overlay-hover">
                    <FaPlay size={14} style={{ marginRight: 6, color: "#11B5BB" }} />
                    <span>Click to View Preview</span>
                  </div>
                </div>

                {/* Description Preview */}
                <p className="aivt-card-item__desc">
                  {desc || "Standard retail video template specification."}
                </p>

                {/* Specs Chips */}
                <div className="aivt-card-item__specs">
                  <span className="aivt-spec-chip">
                    <FaClock size={9} /> {t.videoDuration || 10}s
                  </span>
                  <span className="aivt-spec-chip">
                    🎨 {t.aspectRatio || "9:16"}
                  </span>
                  <span className="aivt-spec-chip aivt-spec-chip--status">
                    {t.status || "Active"}
                  </span>
                </div>

                {/* Actions Footer */}
                <div className="aivt-card-item__foot">
                  {(() => {
                    const match = adVideos.find((v) => String(v.templateId) === String(t.templateId || t._id));
                    if (!match) return null;
                    return (
                      <button
                        className="aivt-card-btn aivt-card-btn--advideo"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPreviewVideo(match);
                        }}
                        title="Watch Rendered Ad Video for this template"
                      >
                        <FaPlay size={10} /> Ad Video
                      </button>
                    );
                  })()}
                  <button
                    className="aivt-card-btn aivt-card-btn--make-video"
                    onClick={(e) => {
                      e.stopPropagation();
                      openMakeVideoModal(t);
                    }}
                    title="Create video with this template"
                  >
                    <FaMagic size={11} /> Create Video
                  </button>

                  <button
                    className="aivt-card-btn aivt-card-btn--view"
                    onClick={() => setViewingTemplate(t)}
                    title="View Details"
                  >
                    <FaEye size={12} /> View
                  </button>

                  <button
                    className="aivt-card-btn aivt-card-btn--edit"
                    onClick={() => openEditModal(t)}
                    title="Edit in Visual Canvas Studio"
                  >
                    <FaFilm size={11} /> Edit in Studio
                  </button>

                  {onNavigate && (
                    <button
                      className="aivt-card-btn aivt-card-btn--social"
                      onClick={() => onNavigate("socialScheduler", { templateId: t._id })}
                      title="Schedule this template to Social Media"
                    >
                      <FaCalendarAlt size={12} /> Social
                    </button>
                  )}

                  <button
                    className="aivt-card-btn aivt-card-btn--delete"
                    onClick={() => setDeleteTarget(t)}
                    title="Delete Template"
                  >
                    <FaTrash size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ══════════════ TABLE VIEW ══════════════ */
        <div className="aivt-table-card">
          <div className="aivt-table-wrap">
            <table className="aivt-table">
              <thead>
                <tr>
                  <th>Template Name</th>
                  <th>Template ID (Click to Copy)</th>
                  <th>Ratio &amp; Specs</th>
                  <th>Description Preview</th>
                  <th>AI Engine</th>
                  <th>Status</th>
                  <th style={{ textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedTemplates.map((t) => {
                  const isCopied = copiedId === t._id;
                  const desc = getDescription(t);
                  return (
                    <tr key={t._id}>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <strong style={{ color: "#0B2830", fontSize: "0.92rem" }}>
                            {t.templateName}
                          </strong>
                          {t.isDummy ? (
                            <span style={{ fontSize: "0.68rem", color: "#4338CA", fontWeight: 700 }}>
                              🔒 Built-in Preset
                            </span>
                          ) : (
                            <span style={{ fontSize: "0.68rem", color: "#15803D", fontWeight: 700 }}>
                              ✨ Custom Template
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div
                          className={`aivt-id-badge ${isCopied ? "copied" : ""}`}
                          onClick={(e) => copyId(String(t.templateId || t._id), e)}
                          title="Click to copy Template ID"
                        >
                          <code className="aivt-id-badge__val">#{t.templateId || (templates.indexOf(t) + 1)}</code>
                          <span className="aivt-id-badge__icon">
                            {isCopied ? <FaCheck size={10} color="#16A34A" /> : <FaCopy size={10} />}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: "0.78rem" }}>
                          <span style={{ fontWeight: 800, color: "#0B2830" }}>{t.aspectRatio || "9:16"}</span>
                          <span style={{ color: "#64848D" }}>{t.videoDuration || 10}s · {t.animationStyle || "Fade"}</span>
                        </div>
                      </td>
                      <td>
                        <span className="aivt-table-desc" title={desc}>
                          {desc || "No description configured"}
                        </span>
                      </td>
                      <td>
                        <span className="aivt-engine-pill">
                          🎨 {t.aspectRatio || "9:16"}
                        </span>
                      </td>
                      <td>
                        <span className={`aivt-status-badge aivt-status-badge--${(t.status || "Active").toLowerCase()}`}>
                          {t.status || "Active"}
                        </span>
                      </td>
                      <td>
                        <div className="aivt-table-actions">
                          <button
                            className="aivt-tbl-btn aivt-tbl-btn--make-video"
                            title="Create Video from this Template"
                            onClick={() => openMakeVideoModal(t)}
                            style={{ color: "#F05A28", background: "rgba(240, 90, 40, 0.12)" }}
                          >
                            <FaMagic size={12} />
                          </button>

                          <button
                            className="aivt-tbl-btn aivt-tbl-btn--view"
                            title="View Full Specification"
                            onClick={() => setViewingTemplate(t)}
                          >
                            <FaEye size={12} />
                          </button>

                          <button
                            className="aivt-tbl-btn aivt-tbl-btn--edit"
                            title="Edit in Visual Canvas Studio"
                            onClick={() => openEditModal(t)}
                          >
                            <FaEdit size={12} />
                          </button>

                          {onNavigate && (
                            <button
                              className="aivt-tbl-btn aivt-tbl-btn--social"
                              title="Schedule to Social Media"
                              onClick={() => onNavigate("socialScheduler", { templateId: t._id })}
                            >
                              <FaCalendarAlt size={12} />
                            </button>
                          )}

                          <button
                            className="aivt-tbl-btn aivt-tbl-btn--delete"
                            title="Delete Template"
                            onClick={() => setDeleteTarget(t)}
                          >
                            <FaTrash size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <div className="aivt-pagination">
          <span className="aivt-pagination__info">
            Showing Page {page} of {totalPages} ({filteredTemplates.length} templates)
          </span>
          <div className="aivt-pagination__btns">
            <button
              className="aivt-page-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <FaChevronLeft size={10} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
              <button
                key={pNum}
                className={`aivt-page-btn aivt-page-btn--num ${page === pNum ? "active" : ""}`}
                onClick={() => setPage(pNum)}
              >
                {pNum}
              </button>
            ))}
            <button
              className="aivt-page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <FaChevronRight size={10} />
            </button>
          </div>
        </div>
      )}
        </>
      ) : (
        /* ── DEDICATED AD VIDEOS GALLERY SECTION ── */
        <div className="aivt-ad-videos-view">
          {/* Ad Videos Controls Bar */}
          <div className="aivt-controls">
            <div className="aivt-search-box">
              <FaSearch className="aivt-search-icon" size={13} />
              <input
                type="text"
                className="aivt-search-input"
                placeholder="Search Ad Videos by title, offer or Template ID…"
                value={adVideoSearch}
                onChange={(e) => setAdVideoSearch(e.target.value)}
              />
              {adVideoSearch && (
                <button className="aivt-search-clear" onClick={() => setAdVideoSearch("")}>
                  <FaTimes size={10} />
                </button>
              )}
            </div>

            <div className="aivt-filter-chips">
              {[
                ["all", `All (${adVideos.length})`],
                ["16:9", "16:9 Landscape"],
                ["9:16", "9:16 Vertical (Reels/Shorts)"],
                ["1:1", "1:1 Square"],
                ["4:5", "4:5 Portrait"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={`aivt-chip ${adVideoRatioFilter === key ? "active" : ""}`}
                  onClick={() => setAdVideoRatioFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="aivt-btn-hero aivt-btn-hero--outline"
              onClick={fetchAdVideos}
              style={{ marginLeft: "auto", height: 38 }}
            >
              <FaVideo size={12} /> Refresh Videos
            </button>
          </div>

          {loadingAdVideos ? (
            <div className="aivt-loading">
              <FaSpinner className="aivt-spin" size={28} />
              <p>Loading rendered Ad Videos…</p>
            </div>
          ) : filteredAdVideos.length === 0 ? (
            <div className="aivt-empty">
              <div className="aivt-empty__icon"><FaVideo size={36} /></div>
              <h3>No Ad Videos Found</h3>
              <p>Generate promotional offer videos via <code>POST /api/external/video</code> or click "Generate MP4" in the Visual Studio.</p>
              <button
                className="aivt-btn-hero aivt-btn-hero--primary"
                onClick={() => {
                  if (onNavigate) onNavigate("templateEditor");
                  else window.location.href = "/store_user/template-editor";
                }}
                style={{ marginTop: 12 }}
              >
                <FaFilm size={12} /> Open Visual Studio to Render
              </button>
            </div>
          ) : (
            <div className="aivt-ad-grid">
              {filteredAdVideos.map((vid: any) => {
                const ratio = vid.ratio || "16:9";
                return (
                  <div key={vid._id} className="aivt-ad-card">
                    {/* Video Screen / Player */}
                    <div className="aivt-ad-card__player-box" onClick={() => setSelectedPreviewVideo(vid)}>
                      <video
                        src={vid.url}
                        controls
                        preload="metadata"
                        className="aivt-ad-card__video"
                      />
                      <span className={`aivt-ad-card__ratio-badge aivt-ratio--${ratio.replace(":", "-")}`}>
                        {ratio}
                      </span>
                      {vid.duration && (
                        <span className="aivt-ad-card__duration-badge">
                          <FaClock size={9} /> {vid.duration}s
                        </span>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="aivt-ad-card__content">
                      <div className="aivt-ad-card__tpl-tag">
                        <span>{vid.templateName}</span>
                        {vid.templateId && <code>ID: #{vid.templateId}</code>}
                      </div>

                      <h4 className="aivt-ad-card__title" title={vid.name}>
                        {vid.name}
                      </h4>

                      <div className="aivt-ad-card__meta-bar">
                        <span>Created: {new Date(vid.createdAt).toLocaleDateString()}</span>
                        <span className="aivt-ad-card__status-dot">● Available in Media</span>
                      </div>

                      {/* Action Buttons */}
                      <div className="aivt-ad-card__actions">
                        <button
                          type="button"
                          className="aivt-card-btn aivt-card-btn--view"
                          onClick={() => setSelectedPreviewVideo(vid)}
                          title="Watch Full-Screen Video Preview"
                        >
                          <FaPlay size={11} /> Preview
                        </button>

                        <a
                          href={vid.url}
                          download
                          className="aivt-card-btn aivt-card-btn--download"
                          title="Download MP4 Video"
                        >
                          <FaDownload size={11} /> MP4
                        </a>

                        {onNavigate && (
                          <button
                            type="button"
                            className="aivt-card-btn aivt-card-btn--social"
                            onClick={() =>
                              onNavigate("socialScheduler", {
                                mediaUrl: vid.url,
                                templateId: vid.templateId,
                                title: vid.name,
                              })
                            }
                            title="Schedule this Ad Video to Social Media"
                          >
                            <FaCalendarAlt size={11} /> Schedule
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Visual Studio is used exclusively for creating and editing templates ── */}
      {false && !!editingTemplate && (
        <div className="aivt-modal-overlay" onClick={() => setIsEditorModalOpen(false)}>
          <div className="aivt-modal aivt-modal--md" onClick={(e) => e.stopPropagation()}>
            <div className="aivt-modal__header">
              <div className="aivt-modal__icon">
                {editingTemplate ? <FaEdit size={16} /> : <FaPlus size={16} />}
              </div>
              <div>
                <h3 className="aivt-modal__title">
                  {editingTemplate ? "Edit Video Template" : "Create New Video Template"}
                </h3>
                <p className="aivt-modal__subtitle">
                  {editingTemplate ? `Editing ID: ${(editingTemplate as VideoTemplate)._id}` : "Configure template prompt, ratios & durations"}
                </p>
              </div>
              <button className="aivt-modal__close" onClick={() => setIsEditorModalOpen(false)}>
                <FaTimes size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="aivt-modal__body">
              {editingTemplate?.isDummy && (
                <div className="aivt-dummy-pill" style={{ margin: 0 }}>
                  🔒 Editing Built-in Template — Your customized changes will override this template.
                </div>
              )}

              {/* Template Name */}
              <div className="aivt-form-group">
                <label className="aivt-form-label">Template Name <span style={{ color: "#EF4444" }}>*</span></label>
                <input
                  type="text"
                  className={`aivt-form-input ${formErrors.templateName ? "error" : ""}`}
                  placeholder="e.g. Mega Weekend Flash Sale — 9:16 Vertical"
                  value={templateName}
                  onChange={(e) => {
                    setTemplateName(e.target.value);
                    if (formErrors.templateName) setFormErrors((p) => ({ ...p, templateName: "" }));
                  }}
                  required
                />
                {formErrors.templateName && <span className="aivt-form-error">{formErrors.templateName}</span>}
              </div>

              {/* Description & AI Prompt */}
              <div className="aivt-form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="aivt-form-label">
                    Prompt Specification &amp; AI Brief <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <button
                    type="button"
                    className="aivt-btn-synthesise"
                    onClick={handleSynthesise}
                    disabled={synthesising || !description.trim()}
                    title="AI will turn notes into a production prompt"
                  >
                    {synthesising ? (
                      <><FaSpinner className="aivt-spin" size={11} /> Synthesising…</>
                    ) : (
                      <><FaMagic size={11} /> ✨ AI Synthesise</>
                    )}
                  </button>
                </div>
                <textarea
                  className={`aivt-form-input aivt-textarea ${formErrors.description ? "error" : ""}`}
                  rows={7}
                  placeholder={`Write your layout details or brief:\n\n"Bold orange sale banner with 50% OFF sticker. Product photo centered with drop shadow. Dynamic bouncing CTA button. 9:16 vertical format looping smoothly."`}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (formErrors.description) setFormErrors((p) => ({ ...p, description: "" }));
                  }}
                  required
                />
                {formErrors.description && <span className="aivt-form-error">{formErrors.description}</span>}
              </div>

              {/* Specs Grid */}
              <div className="aivt-form-grid">
                <div className="aivt-form-group">
                  <label className="aivt-form-label">Aspect Ratio</label>
                  <select
                    className="aivt-form-select"
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                  >
                    <option value="9:16">9:16 — Vertical Reel / Signage</option>
                    <option value="16:9">16:9 — Landscape TV / Screen</option>
                    <option value="1:1">1:1 — Square Feed / Post</option>
                    <option value="4:5">4:5 — Portrait Social</option>
                  </select>
                </div>

                <div className="aivt-form-group">
                  <label className="aivt-form-label">Video Duration</label>
                  <select
                    className="aivt-form-select"
                    value={videoDuration}
                    onChange={(e) => setVideoDuration(Number(e.target.value))}
                  >
                    <option value={5}>5 Seconds</option>
                    <option value={8}>8 Seconds</option>
                    <option value={10}>10 Seconds</option>
                    <option value={15}>15 Seconds</option>
                    <option value={30}>30 Seconds</option>
                  </select>
                </div>

                <div className="aivt-form-group">
                  <label className="aivt-form-label">Animation Style</label>
                  <select
                    className="aivt-form-select"
                    value={animationStyle}
                    onChange={(e) => setAnimationStyle(e.target.value)}
                  >
                    <option value="Fade">Fade &amp; Dissolve</option>
                    <option value="Slide">Dynamic Slide</option>
                    <option value="Zoom">Cinematic Zoom</option>
                    <option value="Bounce">Energetic Bounce</option>
                    <option value="Pulse">Pulse Glow</option>
                  </select>
                </div>

                <div className="aivt-form-group">
                  <label className="aivt-form-label">AI Video Engine</label>
                  <select
                    className="aivt-form-select"
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                  >
                    <option value="Veo 3.1">🎬 Google Flow Veo 3.1</option>
                    <option value="Wan 2.1">⚡ Wan 2.1 (Fal AI)</option>
                    <option value="Wan Pro">🔥 Wan Pro (Fal AI)</option>
                    <option value="Kling 2.0 Pro">✨ Kling 2.0 Pro</option>
                  </select>
                </div>
              </div>

              <div className="aivt-modal__actions">
                <button
                  type="button"
                  className="aivt-btn-cancel"
                  onClick={() => setIsEditorModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="aivt-btn-primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    <><FaSpinner className="aivt-spin" size={12} /> Saving…</>
                  ) : editingTemplate ? (
                    <><FaEdit size={12} /> Update Template</>
                  ) : (
                    <><FaPlus size={12} /> Save Template</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── CSS Styles ── */}
      <style>{`

        /* ── Modern Pill Tab Switcher ── */
        .aivt-tab-nav {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 6px 0 16px 0;
          padding: 6px 8px;
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          width: fit-content;
        }
        .aivt-tab-nav__btn {
          display: inline-flex;
          flex-direction: row;
          align-items: center;
          gap: 8px;
          padding: 8px 18px;
          border: 1px solid transparent;
          background: transparent;
          font-size: 0.88rem;
          font-weight: 700;
          color: #64748B;
          cursor: pointer;
          border-radius: 10px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
          outline: none;
        }
        .aivt-tab-nav__btn:hover {
          color: #0F172A;
          background: #FFFFFF;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .aivt-tab-nav__btn.active {
          color: #0F172A;
          background: #FFFFFF;
          border-color: #E2E8F0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          font-weight: 800;
        }
        .aivt-tab-nav__btn.active .aivt-tab-icon {
          color: #F05A28;
        }
        .aivt-tab-icon {
          color: #94A3B8;
          transition: color 0.2s ease;
          display: inline-block;
          flex-shrink: 0;
        }
        .aivt-tab-label {
          font-size: 0.88rem;
          line-height: 1;
        }
        .aivt-tab-count {
          font-size: 0.74rem;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 20px;
          background: #E2E8F0;
          color: #475569;
          line-height: 1;
        }
        .aivt-tab-nav__btn.active .aivt-tab-count {
          background: #F1F5F9;
          color: #0F172A;
        }
        .aivt-tab-count--promo {
          background: rgba(240, 90, 40, 0.12);
          color: #EA580C;
        }
        .aivt-tab-pill {
          background: linear-gradient(135deg, #F05A28, #EA580C);
          color: #FFFFFF;
          font-size: 0.65rem;
          font-weight: 800;
          padding: 2px 7px;
          border-radius: 20px;
          letter-spacing: 0.5px;
          line-height: 1;
          box-shadow: 0 2px 6px rgba(240, 90, 40, 0.35);
        }

        /* ── Ad Videos Section & Grid ── */
        .aivt-ad-videos-view {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .aivt-ad-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
          margin-top: 10px;
        }
        .aivt-ad-card {
          background: #FFFFFF;
          border-radius: 14px;
          border: 1px solid #E2E8F0;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.05);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: all 0.22s ease;
        }
        .aivt-ad-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(15, 23, 42, 0.1);
          border-color: #11B5BB;
        }
        .aivt-ad-card__player-box {
          position: relative;
          background: #061519;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          overflow: hidden;
        }
        .aivt-ad-card__video {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #000;
        }
        .aivt-ad-card__ratio-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 800;
          background: rgba(0,0,0,0.75);
          color: #fff;
          backdrop-filter: blur(4px);
        }
        .aivt-ratio--16-9 { border: 1px solid #11B5BB; color: #11B5BB; }
        .aivt-ratio--9-16 { border: 1px solid #F05A28; color: #F05A28; }
        .aivt-ratio--1-1 { border: 1px solid #A855F7; color: #A855F7; }
        .aivt-ratio--4-5 { border: 1px solid #3B82F6; color: #3B82F6; }

        .aivt-ad-card__duration-badge {
          position: absolute;
          bottom: 10px;
          right: 10px;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          background: rgba(0,0,0,0.75);
          color: #cbd5e1;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .aivt-ad-card__content {
          padding: 16px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .aivt-ad-card__tpl-tag {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.75rem;
          font-weight: 700;
          color: #11B5BB;
          margin-bottom: 6px;
        }
        .aivt-ad-card__tpl-tag code {
          background: #F1F5F9;
          padding: 1px 6px;
          border-radius: 4px;
          color: #475569;
          font-size: 0.7rem;
        }
        .aivt-ad-card__title {
          font-size: 0.95rem;
          font-weight: 800;
          color: #0B2830;
          margin: 0 0 10px 0;
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .aivt-ad-card__meta-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
          color: #64848D;
          margin-bottom: 14px;
          border-top: 1px solid #F1F5F9;
          padding-top: 8px;
        }
        .aivt-ad-card__status-dot {
          color: #16A34A;
          font-weight: 700;
        }
        .aivt-ad-card__actions {
          display: flex;
          gap: 8px;
          margin-top: auto;
        }
        .aivt-card-btn--download {
          background: #F8FAFB;
          color: #162B30;
          border: 1px solid #D6E6E9;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .aivt-card-btn--download:hover {
          background: #EAF6F8;
          border-color: #11B5BB;
        }
        .aivt-card-btn--advideo {
          background: rgba(240, 90, 40, 0.1);
          color: #F05A28;
          border: 1px solid rgba(240, 90, 40, 0.3);
          font-weight: 800;
        }
        .aivt-card-btn--advideo:hover {
          background: #F05A28;
          color: #fff;
        }

        .aivt-root {
          display: flex;
          flex-direction: column;
          gap: 20px;
          font-family: 'Inter', -apple-system, sans-serif;
          color: #0B2830;
        }

        .aivt-toast {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 18px;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 700;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }
        .aivt-toast--success { background: #DCFCE7; color: #15803D; border: 1px solid #86EFAC; }
        .aivt-toast--error { background: #FEE2E2; color: #B91C1C; border: 1px solid #FCA5A5; }
        .aivt-toast button { background: none; border: none; cursor: pointer; color: inherit; }

        /* Hero */
        .aivt-hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        .aivt-hero__left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .aivt-hero__icon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: linear-gradient(135deg, #0B2830, #11B5BB);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(17, 181, 187, 0.25);
        }
        .aivt-hero__title {
          font-size: 1.45rem;
          font-weight: 800;
          color: #0B2830;
          margin: 0;
        }
        .aivt-hero__subtitle {
          font-size: 0.84rem;
          color: #64848D;
          margin: 3px 0 0;
        }
        .aivt-hero__actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .aivt-btn-hero {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 18px;
          border-radius: 10px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .aivt-btn-hero--primary {
          background: linear-gradient(135deg, #0B2830, #11B5BB);
          color: #fff;
          box-shadow: 0 4px 12px rgba(17, 181, 187, 0.25);
        }
        .aivt-btn-hero--primary:hover { filter: brightness(1.1); }
        .aivt-btn-hero--make-video {
          background: linear-gradient(135deg, #F05A28, #FF7043);
          color: #fff;
          box-shadow: 0 4px 14px rgba(240, 90, 40, 0.35);
        }
        .aivt-btn-hero--make-video:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        .aivt-card-btn--make-video {
          background: rgba(240, 90, 40, 0.12);
          color: #F05A28;
          border-color: rgba(240, 90, 40, 0.3);
          font-weight: 700;
        }
        .aivt-card-btn--make-video:hover {
          background: #F05A28;
          color: #ffffff;
          border-color: #F05A28;
        }
        .aivt-btn-hero--studio {
          background: #0B2830;
          color: #11B5BB;
          border: 1.5px solid #11B5BB;
        }
        .aivt-btn-hero--studio:hover {
          background: #11B5BB;
          color: #0B2830;
        }
        .aivt-btn-hero--outline {
          background: #fff;
          color: #0B2830;
          border: 1.5px solid #CBD5E1;
        }
        .aivt-btn-hero--outline:hover { background: #F8FAFC; }

        /* Controls Bar */
        .aivt-controls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #fff;
          padding: 12px 18px;
          border-radius: 14px;
          border: 1px solid #E2E8F0;
          gap: 14px;
          flex-wrap: wrap;
        }
        .aivt-search-box {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 260px;
        }
        .aivt-search-icon {
          position: absolute;
          left: 12px;
          color: #94A3B8;
        }
        .aivt-search-input {
          width: 100%;
          padding: 8px 34px 8px 34px;
          border-radius: 9px;
          border: 1.5px solid #CBD5E1;
          font-size: 0.84rem;
          outline: none;
        }
        .aivt-search-input:focus {
          border-color: #11B5BB;
        }
        .aivt-search-clear {
          position: absolute;
          right: 10px;
          background: none;
          border: none;
          color: #94A3B8;
          cursor: pointer;
        }

        .aivt-filter-chips {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .aivt-chip {
          padding: 5px 12px;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
          background: #F8FAFC;
          font-size: 0.74rem;
          font-weight: 700;
          color: #64748B;
          cursor: pointer;
          transition: all 0.2s;
        }
        .aivt-chip.active {
          background: #0B2830;
          color: #fff;
          border-color: #0B2830;
        }

        .aivt-view-toggle {
          display: flex;
          background: #F1F5F9;
          padding: 3px;
          border-radius: 8px;
          gap: 3px;
        }
        .aivt-toggle-btn {
          width: 32px;
          height: 30px;
          border: none;
          background: transparent;
          border-radius: 6px;
          cursor: pointer;
          color: #64748B;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .aivt-toggle-btn.active {
          background: #fff;
          color: #0B2830;
          box-shadow: 0 2px 5px rgba(0,0,0,0.06);
        }

        /* ── Grid Cards Layout ── */
        .aivt-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }
        .aivt-card-item {
          background: #fff;
          border-radius: 14px;
          border: 1.5px solid #E2E8F0;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 0.25s ease;
          position: relative;
        }
        .aivt-card-item:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 24px rgba(0,0,0,0.08);
          border-color: #11B5BB;
        }
        .aivt-card-item__head {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .aivt-card-item__title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }
        .aivt-card-item__title {
          margin: 0;
          font-size: 0.98rem;
          font-weight: 800;
          color: #0B2830;
          line-height: 1.3;
        }
        .aivt-badge-pill {
          padding: 2px 7px;
          border-radius: 6px;
          font-size: 0.65rem;
          font-weight: 800;
          flex-shrink: 0;
        }
        .aivt-badge-pill--builtin { background: #EFF6FF; color: #3B82F6; border: 1px solid #BFDBFE; }
        .aivt-badge-pill--custom { background: #ECFDF5; color: #10B981; border: 1px solid #A7F3D0; }

        /* PROMINENT TEMPLATE ID BADGE */
        .aivt-id-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #F0F9FF;
          border: 1.5px dashed #0284C7;
          border-radius: 7px;
          padding: 4px 8px;
          cursor: pointer;
          width: fit-content;
          transition: all 0.2s;
        }
        .aivt-id-badge:hover {
          background: #E0F2FE;
          border-style: solid;
        }
        .aivt-id-badge.copied {
          background: #DCFCE7;
          border-color: #16A34A;
        }
        .aivt-id-badge__prefix {
          font-size: 0.65rem;
          font-weight: 800;
          color: #0369A1;
          letter-spacing: 0.04em;
        }
        .aivt-id-badge__val {
          font-family: monospace;
          font-size: 0.76rem;
          font-weight: 700;
          color: #0B2830;
        }
        .aivt-id-badge__icon {
          color: #0284C7;
          display: flex;
          align-items: center;
        }

        /* Preview Frame */
        .aivt-card-item__preview-frame {
          height: 160px;
          background: #0B2830;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          cursor: pointer;
          overflow: hidden;
        }
        .aivt-card-item__overlay-hover {
          position: absolute;
          inset: 0;
          background: rgba(11, 40, 48, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 0.78rem;
          font-weight: 700;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .aivt-card-item__preview-frame:hover .aivt-card-item__overlay-hover { opacity: 1; }

        .aivt-card-item__desc {
          margin: 0;
          font-size: 0.78rem;
          color: #64748B;
          line-height: 1.45;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .aivt-card-item__specs {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .aivt-spec-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 7px;
          background: #F1F5F9;
          border-radius: 6px;
          font-size: 0.68rem;
          font-weight: 700;
          color: #475569;
        }
        .aivt-spec-chip--status {
          background: #DCFCE7;
          color: #15803D;
        }

        .aivt-card-item__foot {
          display: flex;
          align-items: center;
          gap: 6px;
          border-top: 1px solid #F1F5F9;
          padding-top: 10px;
          margin-top: auto;
        }
        .aivt-card-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 0.74rem;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid #CBD5E1;
          background: #fff;
          color: #0B2830;
          transition: all 0.2s;
        }
        .aivt-card-btn:hover { background: #F8FAFC; }
        .aivt-card-btn--view { flex: 1; }
        .aivt-card-btn--edit { flex: 1; }
        .aivt-card-btn--social {
          background: #EFF6FF;
          color: #1D4ED8;
          border-color: #BFDBFE;
          flex: 1.2;
        }
        .aivt-card-btn--social:hover { background: #DBEAFE; }
        .aivt-card-btn--delete {
          color: #DC2626;
          border-color: #FECACA;
          background: #FEF2F2;
        }
        .aivt-card-btn--delete:hover { background: #FEE2E2; }

        /* ── Table Layout ── */
        .aivt-table-card {
          background: #fff;
          border-radius: 14px;
          border: 1px solid #E2E8F0;
          overflow: hidden;
        }
        .aivt-table-wrap { overflow-x: auto; }
        .aivt-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .aivt-table th {
          background: #F8FAFC;
          padding: 12px 16px;
          font-size: 0.74rem;
          font-weight: 800;
          color: #64848D;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid #E2E8F0;
        }
        .aivt-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #F1F5F9;
          vertical-align: middle;
        }
        .aivt-table-desc {
          max-width: 260px;
          font-size: 0.78rem;
          color: #64748B;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .aivt-engine-pill {
          background: #F3E8FF;
          color: #7E22CE;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 700;
        }
        .aivt-status-badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 800;
        }
        .aivt-status-badge--active { background: #DCFCE7; color: #15803D; }
        .aivt-status-badge--inactive { background: #F1F5F9; color: #64748B; }

        .aivt-table-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .aivt-tbl-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
          background: #fff;
          color: #475569;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .aivt-tbl-btn:hover { background: #F8FAFC; color: #0B2830; }
        .aivt-tbl-btn--social { color: #2563EB; border-color: #BFDBFE; background: #EFF6FF; }
        .aivt-tbl-btn--delete:hover { background: #FEE2E2; color: #DC2626; border-color: #FCA5A5; }

        /* Pagination */
        .aivt-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #fff;
          padding: 10px 18px;
          border-radius: 12px;
          border: 1px solid #E2E8F0;
        }
        .aivt-pagination__info { font-size: 0.8rem; color: #64748B; font-weight: 600; }
        .aivt-pagination__btns { display: flex; gap: 4px; }
        .aivt-page-btn {
          min-width: 30px;
          height: 30px;
          border-radius: 6px;
          border: 1px solid #E2E8F0;
          background: #fff;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .aivt-page-btn--num.active { background: #0B2830; color: #fff; border-color: #0B2830; }

        /* Modal Elements */
        .aivt-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }
        .aivt-modal {
          background: #fff;
          border-radius: 16px;
          width: 100%;
          box-shadow: 0 20px 50px rgba(0,0,0,0.3);
          max-height: 90vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .aivt-modal--lg { max-width: 720px; }

        /* Multi-Aspect Ratio Modal & Grid Styles */
        .aivt-modal--multi-aspect {
          max-width: 980px !important;
          width: 95vw !important;
        }
        .aivt-badge-id {
          background: #E0F2FE;
          color: #0284C7;
          font-weight: 800;
          font-size: 0.75rem;
          padding: 2px 8px;
          border-radius: 6px;
        }
        .aivt-badge-4ratios {
          background: #ECFDF5;
          color: #059669;
          font-weight: 700;
          font-size: 0.72rem;
          padding: 2px 8px;
          border-radius: 6px;
          border: 1px solid #A7F3D0;
        }
        .aivt-top-studio-btn {
          background: #11B5BB;
          color: #051419;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.78rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: background 0.15s;
        }
        .aivt-top-studio-btn:hover {
          background: #14D0D7;
        }
        .aivt-ratio-tab-bar {
          display: flex;
          gap: 6px;
          align-items: center;
          background: #0B2830;
          padding: 6px;
          border-radius: 10px;
          overflow-x: auto;
        }
        .aivt-ratio-tab-divider {
          width: 1px;
          height: 20px;
          background: rgba(255,255,255,0.15);
          margin: 0 4px;
        }
        .aivt-ratio-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: #94A3B8;
          padding: 7px 12px;
          border-radius: 7px;
          cursor: pointer;
          font-size: 0.78rem;
          font-weight: 600;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .aivt-ratio-tab:hover {
          color: #fff;
          background: rgba(255,255,255,0.06);
        }
        .aivt-ratio-tab--active {
          background: #11B5BB !important;
          color: #051419 !important;
          font-weight: 800;
        }
        .aivt-tab-count {
          background: rgba(0,0,0,0.3);
          color: inherit;
          font-size: 0.7rem;
          padding: 1px 6px;
          border-radius: 10px;
          font-weight: 800;
        }
        .aivt-ratio-res-tag {
          font-size: 0.68rem;
          opacity: 0.75;
          font-family: monospace;
        }
        .aivt-4ratios-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-top: 4px;
        }
        @media (max-width: 900px) {
          .aivt-4ratios-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 500px) {
          .aivt-4ratios-grid {
            grid-template-columns: 1fr;
          }
        }
        .aivt-ratio-card {
          background: #081B22;
          border: 1px solid #163B45;
          border-radius: 12px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
        }
        .aivt-ratio-card:hover {
          border-color: #11B5BB;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        }
        .aivt-ratio-card__head {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .aivt-ratio-card__title-box {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .aivt-ratio-card__badge {
          background: #11B5BB;
          color: #051419;
          font-weight: 800;
          font-size: 0.7rem;
          padding: 1px 6px;
          border-radius: 4px;
        }
        .aivt-ratio-card__name {
          color: #fff;
          font-size: 0.82rem;
          font-weight: 700;
        }
        .aivt-ratio-card__res {
          font-size: 0.65rem;
          color: #64848D;
          font-family: monospace;
        }
        .aivt-ratio-card__preview-frame {
          background: #040D11;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 180px;
          cursor: pointer;
          position: relative;
        }
        .aivt-canvas-aspect-box {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .aivt-canvas-aspect-box--16x9 {
          max-width: 100%;
          max-height: 100%;
          aspect-ratio: 16/9;
        }
        .aivt-canvas-aspect-box--9x16 {
          max-width: 100%;
          max-height: 100%;
          aspect-ratio: 9/16;
        }
        .aivt-canvas-aspect-box--1x1 {
          max-width: 100%;
          max-height: 100%;
          aspect-ratio: 1/1;
        }
        .aivt-canvas-aspect-box--4x5 {
          max-width: 100%;
          max-height: 100%;
          aspect-ratio: 4/5;
        }
        .aivt-ratio-card__hover-zoom {
          position: absolute;
          inset: 0;
          background: rgba(11,40,48,0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #11B5BB;
          font-size: 0.75rem;
          font-weight: 700;
          gap: 6px;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .aivt-ratio-card__preview-frame:hover .aivt-ratio-card__hover-zoom {
          opacity: 1;
        }
        .aivt-ratio-card__footer {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .aivt-ratio-card__tag {
          font-size: 0.68rem;
          color: #94A3B8;
          text-align: center;
        }
        .aivt-ratio-card__edit-btn {
          background: #11B5BB;
          color: #051419;
          border: none;
          border-radius: 6px;
          padding: 6px 10px;
          font-size: 0.74rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          justify-content: center;
          transition: background 0.15s;
        }
        .aivt-ratio-card__edit-btn:hover {
          background: #14D0D7;
        }
        .aivt-single-focus-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #051419;
          border-radius: 12px;
          padding: 24px;
          border: 1px solid #163B45;
        }
        .aivt-single-focus-stage {
          background: #000;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .aivt-btn-studio--highlight {
          background: #F05A28 !important;
          color: #fff !important;
        }
        .aivt-btn-studio--highlight:hover {
          background: #E04D1B !important;
        }

        .aivt-modal--md { max-width: 580px; }
        .aivt-modal__header {
          padding: 20px 24px;
          border-bottom: 1px solid #E2E8F0;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
        }
        .aivt-modal__icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #0B2830, #11B5BB);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .aivt-modal__icon--danger { background: #DC2626; }
        .aivt-modal__title { margin: 0; font-size: 1.15rem; font-weight: 800; color: #0B2830; }
        .aivt-modal__subtitle { margin: 3px 0 0; font-size: 0.8rem; color: #64848D; }
        .aivt-modal__close {
          position: absolute;
          right: 20px;
          top: 20px;
          background: none;
          border: none;
          cursor: pointer;
          color: #94A3B8;
        }
        .aivt-modal__body { padding: 22px 24px; display: flex; flex-direction: column; gap: 16px; }
        .aivt-modal__actions {
          padding: 16px 24px;
          background: #F8FAFC;
          border-top: 1px solid #E2E8F0;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        /* ID Banner */
        .aivt-id-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #F0F9FF;
          border: 1.5px solid #0284C7;
          border-radius: 10px;
          padding: 10px 14px;
          gap: 12px;
        }
        .aivt-id-banner__left { display: flex; flex-direction: column; gap: 2px; }
        .aivt-id-banner__label { font-size: 0.65rem; font-weight: 800; color: #0369A1; text-transform: uppercase; }
        .aivt-id-banner__code { font-family: monospace; font-size: 0.95rem; font-weight: 800; color: #0B2830; }
        .aivt-id-banner__copy-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #0284C7;
          color: #fff;
          border: none;
          padding: 6px 12px;
          border-radius: 7px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }

        .aivt-dummy-pill {
          background: #EFF6FF;
          color: #2563EB;
          border: 1px solid #BFDBFE;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 0.8rem;
          font-weight: 700;
        }

        .aivt-desc-box {
          background: #F8FAFB;
          border: 1.5px solid #E2E8F0;
          border-radius: 10px;
          padding: 14px 16px;
          font-size: 0.86rem;
          line-height: 1.6;
        }
        .aivt-desc-box__tag { font-size: 0.68rem; font-weight: 800; color: #64848D; letter-spacing: 0.05em; }

        /* View Modal Preview */
        .aivt-view-preview-wrap {
          background: #0B2830;
          border-radius: 12px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .aivt-view-preview-label {
          font-size: 0.62rem;
          font-weight: 800;
          color: #11B5BB;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          align-self: flex-start;
        }
        .aivt-view-preview-stage {
          position: relative;
          border-radius: 10px;
          overflow: hidden;
          background: #051419;
          box-shadow: 0 8px 28px rgba(0,0,0,0.4);
          max-width: 100%;
        }
        .aivt-view-preview-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding-bottom: 10px;
          background: linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 50%);
          pointer-events: none;
        }
        .aivt-preview-play-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(17,181,187,0.9);
          color: #fff;
          border: none;
          border-radius: 20px;
          padding: 6px 14px;
          font-size: 0.72rem;
          font-weight: 700;
          cursor: pointer;
          pointer-events: all;
          backdrop-filter: blur(4px);
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          transition: all 0.2s;
        }
        .aivt-preview-play-btn:hover { background: rgba(17,181,187,1); transform: scale(1.05); }
        .aivt-view-preview-meta {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .aivt-specs-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .aivt-spec-tile {
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .aivt-spec-tile__lbl { font-size: 0.65rem; color: #64848D; font-weight: 800; text-transform: uppercase; }
        .aivt-spec-tile__val { font-size: 0.85rem; font-weight: 800; color: #0B2830; }

        .aivt-btn-social {
          background: #EFF6FF;
          color: #1D4ED8;
          border: 1.5px solid #BFDBFE;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .aivt-btn-studio {
          background: #0B2830;
          color: #11B5BB;
          border: 1.5px solid #11B5BB;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .aivt-btn-primary {
          background: linear-gradient(135deg, #0B2830, #11B5BB);
          color: #fff;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .aivt-btn-cancel {
          background: #fff;
          border: 1.5px solid #CBD5E1;
          color: #475569;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
        }
        .aivt-btn-delete {
          background: #DC2626;
          color: #fff;
          border: none;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Form */
        .aivt-form-group { display: flex; flex-direction: column; gap: 5px; }
        .aivt-form-label { font-size: 0.78rem; font-weight: 800; color: #0B2830; }
        .aivt-form-input, .aivt-form-select {
          width: 100%;
          border: 1.5px solid #CBD5E1;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 0.85rem;
          color: #0B2830;
          outline: none;
        }
        .aivt-form-input:focus, .aivt-form-select:focus { border-color: #11B5BB; }
        .aivt-form-input.error { border-color: #EF4444; }
        .aivt-form-error { font-size: 0.72rem; color: #EF4444; }
        .aivt-btn-synthesise {
          background: #F3E8FF;
          color: #7E22CE;
          border: 1px solid #D8B4FE;
          border-radius: 6px;
          padding: 3px 8px;
          font-size: 0.72rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .aivt-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .aivt-spin { animation: aivt-rotate 1s linear infinite; }
        @keyframes aivt-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .aivt-empty, .aivt-loading {
          text-align: center;
          padding: 60px 20px;
          background: #fff;
          border-radius: 14px;
          border: 1px solid #E2E8F0;
        }
        .aivt-empty__icon { color: #CBD5E1; margin-bottom: 8px; }
        .aivt-empty h3 { margin: 8px 0 4px; color: #0B2830; font-size: 1.15rem; }
        .aivt-empty p { margin: 0; color: #64848D; font-size: 0.85rem; }
      `}</style>
    </div>
  );
}
