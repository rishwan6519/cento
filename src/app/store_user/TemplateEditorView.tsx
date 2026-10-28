"use client";
import toast from "react-hot-toast";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  FaCrop,
  FaPlay,
  FaPause,
  FaRotateRight,
  FaFloppyDisk,
  FaVideo,
  FaFilm,
  FaLayerGroup,
  FaImage,
  FaMusic,
  FaClock,
  FaSliders,
  FaEye,
  FaArrowLeft,
  FaPlus,
  FaTrash,
  FaExpand,
  FaCompress,
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaSpinner,
  FaDownload,
  FaXmark,
  FaBookOpen,
  FaCopy,
  FaTableCells,
  FaPen,
  FaWandMagicSparkles,
  FaVolumeHigh,
  FaVolumeXmark,
  FaArrowUpRightFromSquare,
  FaCalendarDays,
  FaAlignCenter,
  FaAlignLeft,
  FaAlignRight,
  FaCrosshairs,
  FaUpload,
} from "react-icons/fa6";

// ─── Interfaces & Types ───────────────────────────────────────────────────────
export type AspectRatio = "9:16" | "16:9" | "1:1" | "4:5";
export type LayerKey =
  | "product"
  | "discount"
  | "headline"
  | "description"
  | "price"
  | "oldPrice"
  | "validity"
  | "cta"
  | "qrCode"
  | "storeName"
  | "footer"
  | "logo";

export interface LayerStyle {
  type: "text" | "product" | "logo" | "decor";
  text?: string;
  x: number; // 0.0 - 1.0 (relative)
  y: number; // 0.0 - 1.0 (relative)
  size: number; // percentage scale
  boxHeight?: number; // custom box height scale or percentage
  boxWidth?: number; // custom box width scale or percentage
  cropInset?: { top: number; right: number; bottom: number; left: number };
  font?: string;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
  hidden?: boolean;
  fontColor?: string;
  shape?: "none" | "circle" | "pill" | "rect" | "ribbon" | "parallelogram" | "rounded" | "origami";
  borderRadius?: number;
  borderWidth?: number;
  shadow?: boolean;
  bgMode?: "color" | "transparent";
  bgColor?: string;
  border?: "0" | "1";
  borderColor?: string;
  animation?: string;
  animStart?: number;
  animEnd?: number;
}

export type LayersConfig = Record<LayerKey, LayerStyle>;

export interface AspectDimension {
  ratio: AspectRatio;
  label: string;
  width: number;
  height: number;
}

export interface DecorItem {
  id: string;
  url: string;
  x: number;
  y: number;
  size: number;
  name?: string;
  hidden?: boolean;
  animation?: string;
  borderRadius?: number;
  shape?: string;
  borderWidth?: number;
  borderColor?: string;
  shadow?: boolean;
}

export interface SavedTemplateItem {
  _id: string;
  templateId?: number | string;
  templateName: string;
  templateDescription?: string;
  aspectRatio?: string;
  videoDuration?: number;
  status?: string;
  layers?: any;
  aspectStore?: any;
  backgroundUrl?: string;
  aspectBackgrounds?: Record<string, string>;
  logoUrl?: string;
  productUrl?: string;
  musicUrl?: string;
  animationStyle?: string;
  animation?: any;
  offerType?: string;
  aiStyle?: string;
  aiColorTheme?: string;
  createdAt?: string;
  updatedAt?: string;
  isDummy?: boolean;
  decorations?: DecorItem[];
  lastRenderedVideoUrl?: string;
}

const ASPECT_SPECS: Record<AspectRatio, AspectDimension> = {
  "9:16": { ratio: "9:16", label: "9:16 Portrait (Reels/Mobile)", width: 1080, height: 1920 },
  "16:9": { ratio: "16:9", label: "16:9 Landscape (TV/Signage)", width: 1920, height: 1080 },
  "1:1": { ratio: "1:1", label: "1:1 Square (Feed/Post)", width: 1080, height: 1080 },
  "4:5": { ratio: "4:5", label: "4:5 Portrait (Social Ad)", width: 1080, height: 1350 },
};

export interface DemoAudioTune {
  id: string;
  name: string;
  desc: string;
  url: string;
  icon: string;
}

export const DEMO_AUDIO_TUNES: DemoAudioTune[] = [
  { id: "upbeat_retail", name: "Bright Retail Chime", desc: "Soft acoustic bells & gentle marimba chords (Pure tune, no vocals)", url: "/audio/presets/upbeat_retail.mp3", icon: "🔔" },
  { id: "ambient_piano", name: "Soft Ambient Piano", desc: "Calm, relaxing instrumental piano chord progression", url: "/audio/presets/ambient_piano.mp3", icon: "🎹" },
  { id: "energetic_sale", name: "Retail Marimba Beat", desc: "Clean wooden marimba plucks with a subtle store groove", url: "/audio/presets/energetic_sale.mp3", icon: "🛍️" },
  { id: "luxury_minimal", name: "Luxury Ambient Lounge", desc: "Warm soothing synth pads & glass bell accents", url: "/audio/presets/luxury_minimal.mp3", icon: "✨" },
  { id: "modern_store", name: "Gentle Acoustic Melody", desc: "Warm nylon-pluck acoustic guitar arpeggios", url: "/audio/presets/modern_store.mp3", icon: "🎸" },
  { id: "electric_pulse", name: "Modern Tech Pulse", desc: "Minimalist, rhythmic digital background tune", url: "/audio/presets/electric_pulse.mp3", icon: "⚡" },
];

const DEFAULT_LAYERS: Record<AspectRatio, LayersConfig> = {
  "16:9": {
    product: { type: "product", x: 0.18, y: 0.45, size: 38, shape: "none", bgMode: "transparent", bgColor: "transparent", animation: "slide_up", animStart: 0.2, animEnd: 1.2 },
    discount: { type: "text", text: "75% OFF", x: 0.44, y: 0.54, size: 7.2, shape: "origami", fontColor: "#ffffff", bgColor: "#ffc700", border: "1", borderColor: "#047857", font: "Arial", animation: "zoom_bounce", animStart: 0.8, animEnd: 1.5 },
    headline: { type: "text", text: "Grab the crunch before it's gone!!", x: 0.74, y: 0.36, size: 3.8, boxWidth: 44, shape: "none", fontColor: "#ffffff", font: "Arial", fontWeight: "bold", textAlign: "center", animation: "fade_in", animStart: 1.4, animEnd: 2.2 },
    description: { type: "text", text: "Ritz Crackers 300g available at an exclusive discount!!", x: 0.74, y: 0.58, size: 2.4, boxWidth: 38, shape: "none", fontColor: "#ffffff", font: "Arial", textAlign: "center", animation: "fade_up", animStart: 1.8, animEnd: 2.6 },
    price: { type: "text", text: "", x: 0.64, y: 0.68, size: 3.2, shape: "none", fontColor: "#ffffff", font: "Arial", animation: "fade_in", animStart: 2.0, animEnd: 2.7 },
    oldPrice: { type: "text", text: "", x: 0.84, y: 0.68, size: 2.6, shape: "none", fontColor: "#fca5a5", font: "Arial", animation: "fade_in", animStart: 2.0, animEnd: 2.7 },
    validity: { type: "text", text: "Offer Validity: 1st Aug - 31st Dec 2026", x: 0.74, y: 0.78, size: 2.0, shape: "pill", fontColor: "#111111", bgColor: "#ffffff", border: "0", font: "Arial", animation: "slide_up", animStart: 2.4, animEnd: 3.1 },
    cta: { type: "text", text: "VISIT STORE ➔", x: 0.74, y: 0.88, size: 2.4, shape: "pill", fontColor: "#ffffff", bgColor: "#e51a24", border: "0", font: "Arial", animation: "pulse", animStart: 2.6, animEnd: 3.4 },
    qrCode: { type: "text", text: "", x: 0.90, y: 0.84, size: 1.8, shape: "rect", fontColor: "#ffffff", bgColor: "#051419", border: "1", borderColor: "#ffffff", animation: "fade_in", animStart: 2.8, animEnd: 3.6 },
    storeName: { type: "text", text: "URBAN RAIN", x: 0.165, y: 0.05, size: 2.0, shape: "none", fontColor: "#ffffff", font: "Arial", animation: "fade_in", animStart: 0.1, animEnd: 0.8 },
    footer: { type: "text", text: "*T&C apply. Images for representation only.", x: 0.50, y: 0.96, size: 1.5, shape: "none", fontColor: "#ffffff", font: "Arial", animation: "fade_in", animStart: 3.0, animEnd: 3.6 },
    logo: { type: "logo", x: 0.165, y: 0.09, size: 10, animation: "fade_in", animStart: 0.1, animEnd: 0.8 },
  },
  "9:16": {
    product: { type: "product", x: 0.50, y: 0.28, size: 65, animation: "slide_up", animStart: 0.2, animEnd: 1.2 },
    discount: { type: "text", text: "75% OFF", x: 0.50, y: 0.46, size: 7.5, shape: "origami", fontColor: "#ffffff", bgColor: "#ffc700", border: "1", borderColor: "#047857", font: "Arial", animation: "zoom_bounce", animStart: 0.8, animEnd: 1.5 },
    headline: { type: "text", text: "Grab the crunch before it's gone!!", x: 0.50, y: 0.58, size: 3.8, boxWidth: 80, shape: "none", fontColor: "#ffffff", font: "Arial", textAlign: "center", animation: "fade_in", animStart: 1.4, animEnd: 2.2 },
    description: { type: "text", text: "Ritz Crackers 300g available at an exclusive discount!!", x: 0.50, y: 0.69, size: 2.4, boxWidth: 75, shape: "none", fontColor: "#ffffff", font: "Arial", textAlign: "center", animation: "fade_up", animStart: 1.8, animEnd: 2.6 },
    price: { type: "text", text: "", x: 0.35, y: 0.76, size: 3.5, shape: "none", fontColor: "#ffffff", font: "Arial", animation: "fade_in", animStart: 2.0, animEnd: 2.7 },
    oldPrice: { type: "text", text: "", x: 0.65, y: 0.76, size: 2.8, shape: "none", fontColor: "#fca5a5", font: "Arial", animation: "fade_in", animStart: 2.0, animEnd: 2.7 },
    validity: { type: "text", text: "Offer Validity: 1st Aug - 31st Dec 2026", x: 0.50, y: 0.79, size: 2.0, shape: "pill", fontColor: "#111111", bgColor: "#ffffff", border: "0", font: "Arial", animation: "slide_up", animStart: 2.4, animEnd: 3.1 },
    cta: { type: "text", text: "VISIT STORE ➔", x: 0.50, y: 0.88, size: 2.5, shape: "pill", fontColor: "#ffffff", bgColor: "#e51a24", border: "0", font: "Arial", animation: "pulse", animStart: 2.6, animEnd: 3.4 },
    qrCode: { type: "text", text: "", x: 0.86, y: 0.90, size: 1.8, shape: "rect", fontColor: "#ffffff", bgColor: "#051419", border: "1", borderColor: "#ffffff", animation: "fade_in", animStart: 2.8, animEnd: 3.6 },
    storeName: { type: "text", text: "URBAN RAIN", x: 0.50, y: 0.05, size: 2.2, shape: "none", fontColor: "#ffffff", font: "Arial", animation: "fade_in", animStart: 0.1, animEnd: 0.8 },
    footer: { type: "text", text: "*Terms & Conditions Apply · StoreSparc Video", x: 0.50, y: 0.95, size: 1.5, shape: "none", fontColor: "#ffffff", font: "Arial", animation: "fade_in", animStart: 3.0, animEnd: 3.6 },
    logo: { type: "logo", x: 0.50, y: 0.05, size: 11, animation: "fade_in", animStart: 0.1, animEnd: 0.8 },
  },
  "1:1": {
    product: { type: "product", x: 0.28, y: 0.42, size: 50, animation: "slide_up", animStart: 0.2, animEnd: 1.2 },
    discount: { type: "text", text: "75% OFF", x: 0.35, y: 0.65, size: 7.0, shape: "origami", fontColor: "#ffffff", bgColor: "#ffc700", border: "1", borderColor: "#047857", font: "Arial", animation: "zoom_bounce", animStart: 0.8, animEnd: 1.5 },
    headline: { type: "text", text: "Grab the crunch before it's gone!!", x: 0.70, y: 0.28, size: 3.6, boxWidth: 48, shape: "none", fontColor: "#ffffff", font: "Arial", textAlign: "center", animation: "fade_in", animStart: 1.4, animEnd: 2.2 },
    description: { type: "text", text: "Ritz Crackers 300g available at an exclusive discount!!", x: 0.70, y: 0.48, size: 2.4, boxWidth: 44, shape: "none", fontColor: "#ffffff", font: "Arial", textAlign: "center", animation: "fade_up", animStart: 1.8, animEnd: 2.6 },
    price: { type: "text", text: "", x: 0.62, y: 0.60, size: 3.8, shape: "none", fontColor: "#ffffff", font: "Arial", animation: "zoom_bounce", animStart: 2.0, animEnd: 2.7 },
    oldPrice: { type: "text", text: "", x: 0.82, y: 0.60, size: 2.8, shape: "none", fontColor: "#fca5a5", font: "Arial", animation: "fade_in", animStart: 2.0, animEnd: 2.7 },
    validity: { type: "text", text: "Offer Validity: 1st Aug - 31st Dec 2026", x: 0.70, y: 0.68, size: 2.0, shape: "pill", fontColor: "#111111", bgColor: "#ffffff", border: "0", font: "Arial", animation: "slide_up", animStart: 2.4, animEnd: 3.1 },
    cta: { type: "text", text: "VISIT STORE ➔", x: 0.70, y: 0.80, size: 2.5, shape: "pill", fontColor: "#ffffff", bgColor: "#e51a24", border: "0", font: "Arial", animation: "pulse", animStart: 2.6, animEnd: 3.4 },
    qrCode: { type: "text", text: "", x: 0.88, y: 0.88, size: 1.8, shape: "rect", fontColor: "#ffffff", bgColor: "#051419", border: "1", borderColor: "#ffffff", animation: "fade_in", animStart: 2.8, animEnd: 3.6 },
    storeName: { type: "text", text: "URBAN RAIN", x: 0.50, y: 0.05, size: 2.2, shape: "none", fontColor: "#ffffff", font: "Arial", animation: "fade_in", animStart: 0.1, animEnd: 0.8 },
    footer: { type: "text", text: "*Terms & Conditions Apply · StoreSparc Video", x: 0.75, y: 0.94, size: 1.4, shape: "none", fontColor: "#ffffff", font: "Arial", animation: "fade_in", animStart: 3.0, animEnd: 3.6 },
    logo: { type: "logo", x: 0.22, y: 0.08, size: 10, animation: "fade_in", animStart: 0.1, animEnd: 0.8 },
  },
  "4:5": {
    product: { type: "product", x: 0.28, y: 0.40, size: 52, animation: "slide_up", animStart: 0.2, animEnd: 1.2 },
    discount: { type: "text", text: "75% OFF", x: 0.36, y: 0.64, size: 7.2, shape: "origami", fontColor: "#ffffff", bgColor: "#ffc700", border: "1", borderColor: "#047857", font: "Arial", animation: "zoom_bounce", animStart: 0.8, animEnd: 1.5 },
    headline: { type: "text", text: "Grab the crunch before it's gone!!", x: 0.70, y: 0.28, size: 3.6, boxWidth: 48, shape: "none", fontColor: "#ffffff", font: "Arial", textAlign: "center", animation: "fade_in", animStart: 1.4, animEnd: 2.2 },
    description: { type: "text", text: "Ritz Crackers 300g available at an exclusive discount!!", x: 0.70, y: 0.48, size: 2.4, boxWidth: 44, shape: "none", fontColor: "#ffffff", font: "Arial", textAlign: "center", animation: "fade_up", animStart: 1.8, animEnd: 2.6 },
    price: { type: "text", text: "", x: 0.36, y: 0.76, size: 4.2, shape: "none", fontColor: "#ffffff", font: "Arial", animation: "zoom_bounce", animStart: 2.0, animEnd: 2.7 },
    oldPrice: { type: "text", text: "", x: 0.64, y: 0.76, size: 3.0, shape: "none", fontColor: "#fca5a5", font: "Arial", animation: "fade_in", animStart: 2.0, animEnd: 2.7 },
    validity: { type: "text", text: "Offer Validity: 1st Aug - 31st Dec 2026", x: 0.70, y: 0.68, size: 2.0, shape: "pill", fontColor: "#111111", bgColor: "#ffffff", border: "0", font: "Arial", animation: "slide_up", animStart: 2.4, animEnd: 3.1 },
    cta: { type: "text", text: "VISIT STORE ➔", x: 0.70, y: 0.80, size: 2.5, shape: "pill", fontColor: "#ffffff", bgColor: "#e51a24", border: "0", font: "Arial", animation: "pulse", animStart: 2.6, animEnd: 3.4 },
    qrCode: { type: "text", text: "", x: 0.86, y: 0.90, size: 1.8, shape: "rect", fontColor: "#ffffff", bgColor: "#051419", border: "1", borderColor: "#ffffff", animation: "fade_in", animStart: 2.8, animEnd: 3.6 },
    storeName: { type: "text", text: "URBAN RAIN", x: 0.50, y: 0.05, size: 2.2, shape: "none", fontColor: "#ffffff", font: "Arial", animation: "fade_in", animStart: 0.1, animEnd: 0.8 },
    footer: { type: "text", text: "*Terms & Conditions Apply · StoreSparc Video", x: 0.75, y: 0.94, size: 1.4, shape: "none", fontColor: "#ffffff", font: "Arial", animation: "fade_in", animStart: 3.0, animEnd: 3.6 },
    logo: { type: "logo", x: 0.23, y: 0.08, size: 10, animation: "fade_in", animStart: 0.1, animEnd: 0.8 },
  },
};


const STICKER_PRESETS = [
  {
    name: "75% OFF Retail Badge",
    defaultSize: 18,
    url: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" width="200" height="120">
      <defs>
        <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffdd00"/>
          <stop offset="100%" stop-color="#ff8800"/>
        </linearGradient>
        <filter id="f1" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity="0.5"/>
        </filter>
      </defs>
      <!-- Shadow Green Flap -->
      <polygon points="18,102 4,118 42,102" fill="#047857" stroke="#ffffff" stroke-width="2"/>
      <!-- Main Badge -->
      <rect x="10" y="10" width="180" height="88" rx="14" fill="url(#g1)" stroke="#ffffff" stroke-width="4" filter="url(#f1)" transform="rotate(-6 100 54)"/>
      <text x="100" y="66" font-family="Arial, sans-serif" font-weight="900" font-size="34" fill="#ffffff" text-anchor="middle" transform="rotate(-6 100 54)">75% OFF</text>
    </svg>`),
  },
  {
    name: "Hot Deal Fire Badge",
    defaultSize: 16,
    url: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100">
      <defs>
        <linearGradient id="gf" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ef4444"/>
          <stop offset="100%" stop-color="#f97316"/>
        </linearGradient>
      </defs>
      <rect x="6" y="8" width="188" height="84" rx="42" fill="url(#gf)" stroke="#ffffff" stroke-width="3"/>
      <text x="100" y="60" font-family="Arial, sans-serif" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle">🔥 HOT DEAL</text>
    </svg>`),
  },
  {
    name: "Flash Sale Badge",
    defaultSize: 16,
    url: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100">
      <rect x="6" y="8" width="188" height="84" rx="12" fill="#051419" stroke="#eab308" stroke-width="3.5"/>
      <rect x="12" y="14" width="176" height="72" rx="8" fill="#eab308"/>
      <text x="100" y="58" font-family="Arial, sans-serif" font-weight="900" font-size="24" fill="#000000" text-anchor="middle">⚡ FLASH SALE</text>
    </svg>`),
  },
  {
    name: "Best Seller Star",
    defaultSize: 16,
    url: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100">
      <defs>
        <linearGradient id="gb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e3a8a"/>
          <stop offset="100%" stop-color="#3b82f6"/>
        </linearGradient>
      </defs>
      <rect x="6" y="8" width="188" height="84" rx="20" fill="url(#gb)" stroke="#fbbf24" stroke-width="3"/>
      <text x="100" y="58" font-family="Arial, sans-serif" font-weight="900" font-size="24" fill="#ffffff" text-anchor="middle">⭐ BEST SELLER</text>
    </svg>`),
  },
  {
    name: "Free Shipping Badge",
    defaultSize: 16,
    url: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100">
      <rect x="6" y="8" width="188" height="84" rx="42" fill="#047857" stroke="#ffffff" stroke-width="3"/>
      <text x="100" y="58" font-family="Arial, sans-serif" font-weight="900" font-size="22" fill="#ffffff" text-anchor="middle">🚚 FREE SHIPPING</text>
    </svg>`),
  },
  {
    name: "Special Offer Ribbon",
    defaultSize: 17,
    url: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100">
      <defs>
        <linearGradient id="gso" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#7c3aed"/>
          <stop offset="100%" stop-color="#db2777"/>
        </linearGradient>
      </defs>
      <polygon points="10,12 190,12 178,50 190,88 10,88 22,50" fill="url(#gso)" stroke="#ffffff" stroke-width="2.5"/>
      <text x="100" y="58" font-family="Arial, sans-serif" font-weight="900" font-size="22" fill="#ffffff" text-anchor="middle">🏷️ SPECIAL OFFER</text>
    </svg>`),
  },
];

const PRESET_GRADIENTS = [
  { name: "Centelon Dark", grad: "linear-gradient(135deg, #0B2830 0%, #163B45 50%, #051419 100%)", c1: "#0B2830", c2: "#051419" },
  { name: "Midnight Onyx", grad: "linear-gradient(135deg, #18181B 0%, #27272A 60%, #09090B 100%)", c1: "#18181B", c2: "#09090B" },
  { name: "Deep Slate", grad: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #020617 100%)", c1: "#0f172a", c2: "#020617" },
  { name: "Teal Aqua", grad: "linear-gradient(135deg, #11B5BB 0%, #0B6B6F 60%, #06393B 100%)", c1: "#11B5BB", c2: "#06393B" },
  { name: "Sunset Ember", grad: "linear-gradient(135deg, #F05A28 0%, #DC4B1D 60%, #871900 100%)", c1: "#F05A28", c2: "#871900" },
  { name: "Royal Indigo", grad: "linear-gradient(135deg, #4338CA 0%, #312E81 60%, #1E1B4B 100%)", c1: "#4338CA", c2: "#1E1B4B" },
  { name: "Emerald Forest", grad: "linear-gradient(135deg, #065f46 0%, #047857 50%, #022c22 100%)", c1: "#065f46", c2: "#022c22" },
  { name: "Crimson Velvet", grad: "linear-gradient(135deg, #991b1b 0%, #7f1d1d 60%, #450a0a 100%)", c1: "#991b1b", c2: "#450a0a" },
  { name: "Cyber Purple", grad: "linear-gradient(135deg, #6b21a8 0%, #581c87 60%, #3b0764 100%)", c1: "#6b21a8", c2: "#3b0764" },
];

const PRESET_SOLID_COLORS = [
  { name: "Centelon Dark", color: "#0B2830" },
  { name: "Midnight Black", color: "#09090B" },
  { name: "Deep Slate", color: "#0f172a" },
  { name: "Dark Navy", color: "#0b192c" },
  { name: "Clean White", color: "#ffffff" },
  { name: "Forest Green", color: "#064e3b" },
  { name: "Crimson Red", color: "#7f1d1d" },
  { name: "Charcoal Gray", color: "#1e293b" },
];

const OFFER_TYPES = [
  "Flash Sale",
  "Percentage Discount",
  "Flat Rate Off",
  "Buy 1 Get 1 (BOGO)",
  "Weekend Special",
  "Clearance Sale",
  "Festive Offer",
  "New Arrival Spotlight",
  "Member Exclusive",
];

const AI_STYLES = [
  "Premium commercial",
  "Luxury",
  "Minimal",
  "Natural / organic",
  "Vibrant / colorful",
  "Soft lifestyle",
  "Studio product shot",
  "Funny / playful",
  "Elegant",
  "Bold retail",
];

const AI_COLOR_THEMES = [
  "None (natural colors)",
  "Warm neutrals",
  "Cool neutrals",
  "Black & white",
  "Gold",
  "Rose gold",
  "Silver",
  "Emerald",
  "Purple",
  "Red",
  "Blue",
  "Pink",
  "Orange",
  "Earth tones",
];

export interface TemplateEditorProps {
  onNavigate?: (view: any, extra?: any) => void;
  initialTemplateId?: string;
  initialRatio?: AspectRatio;
}



// ─── Live Animated Preview Canvas for Create Template Modal ─────────────────
const CreateModalPreviewCanvas: React.FC<{
  ratio: AspectRatio;
  duration: number;
  offerType: string;
  templateName: string;
}> = ({ ratio, duration, offerType, templateName }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const animRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    startRef.current = null;
    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = (timestamp - startRef.current) / 1000;
      if (elapsed >= duration) {
        startRef.current = timestamp;
        setPlaybackTime(0);
      } else {
        setPlaybackTime(elapsed);
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [ratio, duration]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const spec = ASPECT_SPECS[ratio] || ASPECT_SPECS["16:9"];
    const W = spec.width;
    const H = spec.height;
    canvas.width = W;
    canvas.height = H;

    const t = playbackTime;
    const layers = DEFAULT_LAYERS[ratio];

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, PRESET_GRADIENTS[0].c1);
    grad.addColorStop(1, PRESET_GRADIENTS[0].c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const radial = ctx.createRadialGradient(W / 2, H * 0.35, 50, W / 2, H * 0.35, W * 0.85);
    radial.addColorStop(0, "rgba(255, 255, 255, 0.08)");
    radial.addColorStop(1, "rgba(0, 0, 0, 0.42)");
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, W, H);

    const getProgress = (start = 0, end = 1) => {
      if (t < start) return 0;
      if (t >= end) return 1;
      const p = (t - start) / (end - start);
      return 1 - Math.pow(1 - p, 3);
    };

    // Product placeholder with motion
    if (layers.product) {
      const pL = layers.product;
      const prog = getProgress(pL.animStart || 0.2, pL.animEnd || 1.2);
      const maxDim = Math.round(W * (pL.size / 100));
      const pTransY = (1 - prog) * (H * 0.08);

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, prog));
      const cx = Math.round(pL.x * W);
      const cy = Math.round(pL.y * H + pTransY);
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 2;
      ctx.fillRect(cx - maxDim / 2, cy - maxDim / 2, maxDim, maxDim);
      ctx.strokeRect(cx - maxDim / 2, cy - maxDim / 2, maxDim, maxDim);
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.round(W * 0.03)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("PRODUCT IMAGE", cx, cy);
      ctx.restore();
    }

    // Logo placeholder
    if (layers.logo) {
      const lL = layers.logo;
      const prog = getProgress(lL.animStart || 0.1, lL.animEnd || 0.8);
      const logoSize = Math.round(Math.min(W, H) * (lL.size / 100));
      ctx.save();
      ctx.globalAlpha = prog;
      const cx = Math.round(lL.x * W);
      const cy = Math.round(lL.y * H);
      ctx.fillStyle = "#11B5BB";
      ctx.beginPath();
      ctx.arc(cx, cy, logoSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.round(logoSize * 0.4)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("LOGO", cx, cy);
      ctx.restore();
    }

    // Text layers
    const textKeys: LayerKey[] = [
      "discount", "headline", "description", "validity", "cta"
    ];

    for (const k of textKeys) {
      const L = layers[k];
      if (!L || !L.text) continue;
      const prog = getProgress(L.animStart || 0.5, L.animEnd || 1.5);
      const cx = Math.round(L.x * W);
      const cy = Math.round(L.y * H);

      let transX = 0, transY = 0, scale = 1;
      const animStyle = L.animation || (k === "discount" ? "zoom_bounce" : k === "cta" ? "pulse" : "fade_in");
      if (animStyle === "zoom_bounce") {
        if (prog < 1) {
          scale = prog === 0 ? 0 : Math.sin(prog * Math.PI * 0.7) * 1.16;
          if (prog > 0.8) scale = 1.16 - ((prog - 0.8) / 0.2) * 0.16;
        } else {
          scale = 1;
        }
      } else if (animStyle === "slide_up" || animStyle === "fade_up") {
        transY = (1 - prog) * (H * 0.08);
      } else if (animStyle === "pulse") {
        if (t >= (L.animStart || 0)) {
          scale = 1 + Math.sin((t - (L.animStart || 0)) * 5) * 0.04;
        }
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, prog));
      if (transX !== 0 || transY !== 0 || scale !== 1) {
        ctx.translate(cx + transX, cy + transY);
        ctx.scale(scale, scale);
        ctx.translate(-cx, -cy);
      }

      const fontSize = Math.round(W * ((L.size || 3) / 100));
      ctx.font = `bold ${fontSize}px ${L.font || "Arial"}, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const textW = ctx.measureText(L.text).width;
      const textH = fontSize * 1.3;

      if (L.shape === "rounded") {
        const pw = textW + fontSize * 1.1;
        const ph = textH + fontSize * 0.45;
        const rx = Math.max(6, Math.round(fontSize * 0.35));
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(cx - pw / 2, cy - ph / 2, pw, ph, rx);
        else ctx.rect(cx - pw / 2, cy - ph / 2, pw, ph);
        ctx.fillStyle = L.bgColor || "#ffc700";
        ctx.fill();
      } else if (L.shape === "pill") {
        const pw = textW + fontSize * 1.3;
        const ph = textH + fontSize * 0.5;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(cx - pw / 2, cy - ph / 2, pw, ph, ph / 2);
        else ctx.rect(cx - pw / 2, cy - ph / 2, pw, ph);
        ctx.fillStyle = L.bgColor || "#ffffff";
        ctx.fill();
      }

      ctx.fillStyle = L.fontColor || "#ffffff";
      ctx.fillText(L.text, cx, cy);
      ctx.restore();
    }
  }, [ratio, duration, playbackTime, offerType, templateName]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <canvas
        ref={canvasRef}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          borderRadius: "4px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "6px",
          left: "8px",
          background: "rgba(0,0,0,0.6)",
          padding: "2px 6px",
          borderRadius: "4px",
          fontSize: "10px",
          color: "#11B5BB",
          fontFamily: "monospace",
          fontWeight: 700,
        }}
      >
        ▶ {playbackTime.toFixed(1)}s / {duration}s
      </div>
      <div
        style={{
          position: "absolute",
          top: "6px",
          right: "8px",
          background: "rgba(34,197,94,0.2)",
          border: "1px solid #22c55e",
          padding: "2px 6px",
          borderRadius: "4px",
          fontSize: "10px",
          color: "#22c55e",
          fontWeight: 700,
        }}
      >
        Live Motion Preview
      </div>
    </div>
  );
};

// ─── Interactive Animated Video Template Preview Modal ──────────────────────────────
interface TemplateViewPreviewModalProps {
  template: SavedTemplateItem;
  onClose: () => void;
  onEdit: () => void;
}

const TemplateViewPreviewModal: React.FC<TemplateViewPreviewModalProps> = ({
  template,
  onClose,
  onEdit,
}) => {
  const [activeRatio, setActiveRatio] = useState<AspectRatio>(
    (template.aspectRatio as AspectRatio) && ["16:9", "9:16", "1:1", "4:5"].includes(template.aspectRatio as AspectRatio)
      ? (template.aspectRatio as AspectRatio)
      : "16:9"
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  const duration = template.videoDuration || 10;
  const layersConfig: LayersConfig =
    (template.aspectStore && template.aspectStore[activeRatio]) ||
    template.layers ||
    (DEFAULT_LAYERS[activeRatio] as LayersConfig);

  // Background images / product images
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
  const [productImg, setProductImg] = useState<HTMLImageElement | null>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const bgUrl = (template.aspectBackgrounds && template.aspectBackgrounds[activeRatio]) || template.backgroundUrl;
    if (bgUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => setBgImg(img);
      img.onerror = () => setBgImg(null);
      img.src = bgUrl;
    } else {
      setBgImg(null);
    }
  }, [template, activeRatio]);

  useEffect(() => {
    if (template.productUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => setProductImg(img);
      img.onerror = () => setProductImg(null);
      img.src = template.productUrl;
    } else {
      setProductImg(null);
    }
  }, [template.productUrl]);

  useEffect(() => {
    if (template.logoUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => setLogoImg(img);
      img.onerror = () => setLogoImg(null);
      img.src = template.logoUrl;
    } else {
      setLogoImg(null);
    }
  }, [template.logoUrl]);

  // Animation Loop (60fps)
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp - playbackTime * 1000;
      const elapsed = (timestamp - startRef.current) / 1000;
      if (elapsed >= duration) {
        startRef.current = timestamp;
        setPlaybackTime(0);
      } else {
        setPlaybackTime(elapsed);
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, duration, playbackTime]);

  // Draw frame on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const spec = ASPECT_SPECS[activeRatio] || ASPECT_SPECS["16:9"];
    const W = spec.width;
    const H = spec.height;
    canvas.width = W;
    canvas.height = H;

    const t = playbackTime;
    const bgType = (template as any).bgType || (template.backgroundUrl ? "image" : "gradient");
    const bgColor = (template as any).bgColor || "#0B2830";
    const bgGradIndex = typeof (template as any).bgGradIndex === "number" ? (template as any).bgGradIndex : 0;

    // 1. Draw Background
    if (bgType === "image" && bgImg) {
      const imgRatio = bgImg.width / bgImg.height;
      const cRatio = W / H;
      let dw = W, dh = H, dx = 0, dy = 0;
      if (imgRatio > cRatio) {
        dh = H;
        dw = H * imgRatio;
        dx = (W - dw) / 2;
      } else {
        dw = W;
        dh = W / imgRatio;
        dy = (H - dh) / 2;
      }
      ctx.drawImage(bgImg, dx, dy, dw, dh);
    } else if (bgType === "color") {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, W, H);
    } else {
      const gradSpec = PRESET_GRADIENTS[bgGradIndex] || PRESET_GRADIENTS[0];
      const grd = ctx.createLinearGradient(0, 0, W, H);
      grd.addColorStop(0, gradSpec.c1);
      grd.addColorStop(1, gradSpec.c2);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);

      const radial = ctx.createRadialGradient(W / 2, H * 0.35, 50, W / 2, H * 0.35, W * 0.85);
      radial.addColorStop(0, "rgba(255, 255, 255, 0.08)");
      radial.addColorStop(1, "rgba(0, 0, 0, 0.42)");
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, W, H);
    }

    const getProgress = (start = 0, end = 1) => {
      if (t < start) return 0;
      if (t >= end) return 1;
      const p = (t - start) / (end - start);
      return 1 - Math.pow(1 - p, 3);
    };

    // 2. Draw Product
    if (layersConfig.product) {
      const pL = layersConfig.product;
      const prog = getProgress(pL.animStart || 0.2, pL.animEnd || 1.2);
      const maxDim = Math.round(W * (pL.size / 100));

      let pTransY = 0;
      let pScale = 1;
      if (pL.animation === "zoom_bounce") {
        pScale = prog === 0 ? 0 : Math.sin(prog * Math.PI * 0.7) * 1.12;
        if (prog > 0.8) pScale = 1.12 - ((prog - 0.8) / 0.2) * 0.12;
      } else {
        pTransY = (1 - prog) * (H * 0.08);
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, prog));
      const cx = Math.round(pL.x * W);
      const cy = Math.round(pL.y * H + pTransY);
      if (pScale !== 1) {
        ctx.translate(cx, cy);
        ctx.scale(pScale, pScale);
        ctx.translate(-cx, -cy);
      }

      if (productImg) {
        const aspect = productImg.width / productImg.height;
        let pw = maxDim, ph = maxDim / aspect;
        if (ph > maxDim) { ph = maxDim; pw = maxDim * aspect; }

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
          ctx.shadowBlur = 12;
          ctx.shadowOffsetY = 4;
        }
        if (r > 0) {
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(cx - pw / 2, cy - ph / 2, pw, ph, r);
          else ctx.rect(cx - pw / 2, cy - ph / 2, pw, ph);
          ctx.clip();
          ctx.drawImage(productImg, cx - pw / 2, cy - ph / 2, pw, ph);
          ctx.restore();

          if (pL.border === "1" || (pL.borderWidth && pL.borderWidth > 0)) {
            ctx.save();
            ctx.strokeStyle = pL.borderColor || "#ffffff";
            ctx.lineWidth = pL.borderWidth || 2;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(cx - pw / 2, cy - ph / 2, pw, ph, r);
            else ctx.rect(cx - pw / 2, cy - ph / 2, pw, ph);
            ctx.stroke();
            ctx.restore();
          }
        } else {
          ctx.drawImage(productImg, cx - pw / 2, cy - ph / 2, pw, ph);
          ctx.restore();
          if (pL.border === "1" || (pL.borderWidth && pL.borderWidth > 0)) {
            ctx.save();
            ctx.strokeStyle = pL.borderColor || "#ffffff";
            ctx.lineWidth = pL.borderWidth || 2;
            ctx.strokeRect(cx - pw / 2, cy - ph / 2, pw, ph);
            ctx.restore();
          }
        }
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.fillRect(cx - maxDim / 2, cy - maxDim / 2, maxDim, maxDim);
        ctx.strokeRect(cx - maxDim / 2, cy - maxDim / 2, maxDim, maxDim);
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${Math.round(W * 0.03)}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("PRODUCT", cx, cy);
      }
      ctx.restore();
    }

    // 3. Draw Logo
    if (layersConfig.logo) {
      const lL = layersConfig.logo;
      const prog = getProgress(lL.animStart || 0.1, lL.animEnd || 0.8);
      const logoSize = Math.round(Math.min(W, H) * (lL.size / 100));
      ctx.save();
      ctx.globalAlpha = prog;
      const cx = Math.round(lL.x * W);
      const cy = Math.round(lL.y * H);
      if (logoImg) {
        const lAspect = logoImg.width / logoImg.height;
        let lw = logoSize, lh = logoSize / lAspect;
        ctx.drawImage(logoImg, cx - lw / 2, cy - lh / 2, lw, lh);
      } else {
        ctx.fillStyle = "rgba(17, 181, 187, 0.9)";
        ctx.beginPath();
        ctx.arc(cx, cy, logoSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${Math.round(logoSize * 0.4)}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("LOGO", cx, cy);
      }
      ctx.restore();
    }

    // 4. Draw Text & Badges
    const textKeys: LayerKey[] = [
      "discount", "headline", "description", "price", "oldPrice", "validity", "cta", "qrCode", "storeName", "footer"
    ];

    for (const k of textKeys) {
      const L = (layersConfig as any)[k];
      if (!L || !L.text || L.hidden) continue;

      const prog = getProgress(L.animStart || 0.5, L.animEnd || 1.5);
      const cx = Math.round(L.x * W);
      const cy = Math.round(L.y * H);

      let transX = 0, transY = 0, scale = 1;
      const animStyle = L.animation || (k === "discount" ? "zoom_bounce" : k === "cta" ? "pulse" : "fade_in");
      if (animStyle === "zoom_bounce") {
        if (prog < 1) {
          scale = prog === 0 ? 0 : Math.sin(prog * Math.PI * 0.7) * 1.16;
          if (prog > 0.8) scale = 1.16 - ((prog - 0.8) / 0.2) * 0.16;
        } else {
          scale = 1;
        }
      } else if (animStyle === "slide_up" || animStyle === "fade_up") {
        transY = (1 - prog) * (H * 0.08);
      } else if (animStyle === "slide_left") {
        transX = (1 - prog) * (W * 0.10);
      } else if (animStyle === "slide_right") {
        transX = -(1 - prog) * (W * 0.10);
      } else if (animStyle === "pulse") {
        if (t >= (L.animStart || 0)) {
          scale = 1 + Math.sin((t - (L.animStart || 0)) * 5) * 0.04;
        }
      }

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, prog));
      if (transX !== 0 || transY !== 0 || scale !== 1) {
        ctx.translate(cx + transX, cy + transY);
        ctx.scale(scale, scale);
        ctx.translate(-cx, -cy);
      }

      const fontSize = Math.round(W * ((L.size || 3) / 100));
      const fWeight = L.fontWeight || "bold";
      const fStyle = L.fontStyle || "normal";
      ctx.font = `${fStyle} ${fWeight} ${fontSize}px ${L.font || "Arial"}, sans-serif`;
      ctx.textAlign = (L.textAlign as CanvasTextAlign) || "center";
      ctx.textBaseline = "middle";

      const textLines = (L.text || "").split("\n");
      const lineHeight = fontSize * 1.25;
      let textW = 0;
      for (const line of textLines) {
        const w = ctx.measureText(line).width;
        if (w > textW) textW = w;
      }
      const textH = Math.max(fontSize * 1.2, textLines.length * lineHeight);

      const isOrigami = L.shape === "origami" || L.shape === "ribbon" || L.shape === "parallelogram";
      const isTransparent = (L.shape === "none" || (!L.shape && L.bgMode === "transparent")) && !isOrigami;
      if (!isTransparent) {
        if (L.shape === "rounded") {
          const pw = textW + fontSize * 1.1;
          const ph = textH + fontSize * 0.45;
          const rx = Math.max(8, Math.round(fontSize * 0.35));
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(cx - pw / 2, cy - ph / 2, pw, ph, rx);
          else ctx.rect(cx - pw / 2, cy - ph / 2, pw, ph);
          ctx.fillStyle = L.bgColor || "#ffc700";
          ctx.fill();
          if (L.border === "1") {
            ctx.strokeStyle = L.borderColor || "#000000";
            ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.08));
            ctx.stroke();
          }
        } else if (L.shape === "origami" || L.shape === "ribbon" || L.shape === "parallelogram") {
          const tiltDeg = -7;
          const tiltRad = (tiltDeg * Math.PI) / 180;
          const pw = textW + fontSize * 1.5;
          const ph = textH + fontSize * 0.75;
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

          // 2. Main Yellow Rounded Box
          const rx = Math.max(8, Math.round(fontSize * 0.22));
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(-pw / 2, -ph / 2, pw, ph, rx);
          else ctx.rect(-pw / 2, -ph / 2, pw, ph);
          ctx.fillStyle = L.bgColor || "#ffc700";
          ctx.fill();

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
          drawTriangle(pw / 2 + cs * 1.2, -ph / 2 - cs * 0.8, cs * 1.1, -0.4, "#facc15");
          drawTriangle(pw / 2 + cs * 2.2, -ph / 2 + cs * 1.5, cs * 0.85, 0.7, "#ef4444");
          drawTriangle(pw / 2 + cs * 1.6, ph / 2 + cs * 0.8, cs * 0.9, 0.3, "#facc15");
          drawTriangle(-pw / 2 - cs * 1.8, ph / 2 + cs * 0.6, cs * 1.1, -0.7, "#ef4444");

          ctx.restore();
        } else if (L.shape === "circle") {
          const radius = Math.max(textW, textH) / 2 + fontSize * 0.4;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fillStyle = L.bgColor || "#ffc700";
          ctx.fill();
        } else if (L.shape === "pill") {
          const pw = textW + fontSize * 1.4;
          const ph = textH + fontSize * 0.6;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(cx - pw / 2, cy - ph / 2, pw, ph, ph / 2);
          else ctx.rect(cx - pw / 2, cy - ph / 2, pw, ph);
          ctx.fillStyle = L.bgColor || "#ffc700";
          ctx.fill();
        } else if (L.shape === "rect") {
          const pw = textW + fontSize * 0.8;
          const ph = textH + fontSize * 0.4;
          ctx.fillStyle = L.bgColor || "#ffffff";
          ctx.fillRect(cx - pw / 2, cy - ph / 2, pw, ph);
        }
      }

      const isOrigamiBadge = L.shape === "origami" || L.shape === "ribbon" || L.shape === "parallelogram";
      if (isOrigamiBadge) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((-7 * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }

      ctx.fillStyle = L.fontColor || "#ffffff";
      const textAlign = (L.textAlign as CanvasTextAlign) || "center";
      ctx.textAlign = textAlign;
      const startY = cy - ((textLines.length - 1) * lineHeight) / 2;
      textLines.forEach((line: string, idx: number) => {
        let lineX = cx;
        if (textAlign === "left") {
          lineX = cx - textW / 2;
        } else if (textAlign === "right") {
          lineX = cx + textW / 2;
        }
        ctx.fillText(line, lineX, startY + idx * lineHeight);
      });

      if (isOrigamiBadge) {
        ctx.restore();
      }

      if (k === "oldPrice") {
        ctx.strokeStyle = L.fontColor || "#EF4444";
        ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.1));
        ctx.beginPath();
        ctx.moveTo(cx - textW / 2 - 4, cy);
        ctx.lineTo(cx + textW / 2 + 4, cy);
        ctx.stroke();
      }

      ctx.restore();
    }

    // 5. Draw Decorations in Preview Modal
    const modalDecors = template.decorations || [];
    if (Array.isArray(modalDecors) && modalDecors.length > 0) {
      for (const dec of modalDecors) {
        if (dec.hidden || !dec.url) continue;
        const dImg = new Image();
        dImg.crossOrigin = "anonymous";
        dImg.src = dec.url;
        if (dImg.complete && dImg.naturalWidth > 0) {
          const cx = Math.round(dec.x * W);
          const cy = Math.round(dec.y * H);
          const baseDim = Math.min(W, H);
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
  }, [activeRatio, playbackTime, template, layersConfig, bgImg, productImg, logoImg]);

  return (
    <div className="ste-modal-overlay" onClick={onClose}>
      <div
        className="ste-modal ste-modal--wide"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "860px", width: "95%" }}
      >
        <div className="ste-modal__header">
          <div className="ste-modal__title-wrap">
            <FaFilm className="ste-accent-icon" />
            <h3>Live Video Preview: {template.templateName}</h3>
            <span
              style={{
                fontFamily: "monospace",
                fontWeight: 700,
                color: "#11B5BB",
                background: "rgba(17,181,187,0.12)",
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "0.8rem",
              }}
            >
              #{template.templateId || 1}
            </span>
          </div>
          <button className="ste-modal__close" onClick={onClose}>
            <FaXmark />
          </button>
        </div>

        <div className="ste-modal__body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Ratio Selector Tabs */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              {(["16:9", "9:16", "1:1", "4:5"] as AspectRatio[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`ste-ratio-chip ${activeRatio === r ? "ste-ratio-chip--active" : ""}`}
                  onClick={() => setActiveRatio(r)}
                  style={{ padding: "5px 12px", fontSize: "0.8rem", fontWeight: 700 }}
                >
                  {r} {r === "16:9" ? "📺 Landscape" : r === "9:16" ? "📱 Vertical" : r === "1:1" ? "⏹️ Square" : "📸 Portrait"}
                </button>
              ))}
            </div>

            <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
              {ASPECT_SPECS[activeRatio].label} · {duration}s Duration
            </span>
          </div>

          {/* Animated Video Canvas Player Stage */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "360px",
              background: "#030c0f",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              border: "1px solid rgba(17, 181, 187, 0.25)",
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                borderRadius: "6px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.7)",
              }}
            />
          </div>

          {/* Playback Controls Toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              background: "rgba(11, 40, 48, 0.95)",
              border: "1px solid rgba(17, 181, 187, 0.3)",
              borderRadius: "10px",
              padding: "10px 16px",
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
                <span>{isPlaying ? "Pause" : "Play Preview"}</span>
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
                title="Replay from start"
              >
                <FaRotateRight size={11} /> Replay
              </button>
            </div>

            {/* Scrubber */}
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
                  display: "inline-block",
                }}
              />
              {isPlaying ? "Playing 60fps" : "Paused"}
            </span>
          </div>

          {/* Layer animation breakdown chips */}
          <div>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Configured Layer Entrance Animations:
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
              {Object.entries(layersConfig).map(([key, val]: [string, any]) => {
                if (!val || val.hidden || (!val.text && key !== "product" && key !== "logo")) return null;
                const isCurrent = playbackTime >= (val.animStart || 0) && playbackTime <= (val.animEnd || 1.5);
                return (
                  <span
                    key={key}
                    style={{
                      fontSize: "11px",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      background: isCurrent ? "rgba(17, 181, 187, 0.25)" : "rgba(255, 255, 255, 0.05)",
                      border: isCurrent ? "1px solid #11B5BB" : "1px solid rgba(255, 255, 255, 0.1)",
                      color: isCurrent ? "#fff" : "#94a3b8",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <strong style={{ color: isCurrent ? "#11B5BB" : "#cbd5e1" }}>{key}:</strong>{" "}
                    {val.animation || (key === "discount" ? "zoom_bounce" : "fade_in")} ({val.animStart ?? 0.5}s - {val.animEnd ?? 1.5}s)
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="ste-modal__actions">
          <button className="ste-btn ste-btn--secondary" onClick={onClose}>
            Close
          </button>
          <button className="ste-btn ste-btn--primary" onClick={onEdit}>
            <FaPen /> Open in Canvas Editor
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Advanced Canvas 2D Text Auto-Wrap Engine
 * Wraps text down to new lines when it reaches the specified maxWidth limit.
 * Supports both normal word boundary wrapping and long continuous string character wrapping.
 */
function wrapTextCanvas(
  ctx: CanvasRenderingContext2D | null,
  text: string,
  maxWidth: number,
  fontSize: number
): string[] {
  if (!text) return [""];
  const effectiveMaxW = Math.max(30, maxWidth);
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
      // If a single word or unbroken string is wider than effectiveMaxW, break it into character chunks
      if (wordW > effectiveMaxW) {
        if (curLine) {
          result.push(curLine);
          curLine = "";
        }
        let chunk = "";
        for (const char of word) {
          const testChunk = chunk + char;
          if (measure(testChunk) <= effectiveMaxW) {
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
        if (measure(testLine) <= effectiveMaxW) {
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

export default function TemplateEditorView({ onNavigate, initialTemplateId, initialRatio }: TemplateEditorProps) {
  // ── Mode Switcher: "studio" | "grid" | "library" ────────────────────────────
  const [activeTab, setActiveTab] = useState<"studio" | "grid" | "library">("studio");

  // ── Template State ──────────────────────────────────────────────────────────
  const [templateName, setTemplateName] = useState("Custom Video Template");
  const [templateId, setTemplateId] = useState<string | null>(initialTemplateId || null);
  const [activeTemplateNumber, setActiveTemplateNumber] = useState<number | null>(
    initialTemplateId && !isNaN(Number(initialTemplateId)) ? Number(initialTemplateId) : null
  );
  const [offerType, setOfferType] = useState<string>("Flash Sale");
  const [aiStyle, setAiStyle] = useState<string>("Premium commercial");
  const [aiColorTheme, setAiColorTheme] = useState<string>("None (natural colors)");
  const [aiTransparentBg, setAiTransparentBg] = useState<boolean>(true);
  const [animationStyle, setAnimationStyle] = useState<string>("dynamic_retail");

  // Aspect settings
  const [activeRatio, setActiveRatio] = useState<AspectRatio>(initialRatio || "16:9");
  const [duration, setDuration] = useState(10);
  const [fps, setFps] = useState(30);
  const [resolution, setResolution] = useState(720);

  // Per-ratio layer configs
  const [aspectLayers, setAspectLayers] = useState<Record<AspectRatio, LayersConfig>>(DEFAULT_LAYERS);

  // Assets
  const [bgType, setBgType] = useState<"gradient" | "color" | "image">("gradient");
  const [bgGradIndex, setBgGradIndex] = useState(0);
  const [bgColor, setBgColor] = useState<string>("#0B2830");
  const [aspectBackgrounds, setAspectBackgrounds] = useState<Record<AspectRatio, string>>({
    "16:9": "",
    "9:16": "",
    "1:1": "",
    "4:5": "",
  });
  const [bgImageUrl, setBgImageUrl] = useState<string>("");
  const [logoImageUrl, setLogoImageUrl] = useState<string>("");
  const [productImageUrl, setProductImageUrl] = useState<string>(
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30"
  );
  const [musicUrl, setMusicUrl] = useState<string>("");
  const [musicVolume, setMusicVolume] = useState<number>(70);
  const [musicMode, setMusicMode] = useState<"preset" | "upload" | "none">("preset");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("upbeat_retail");
  const [previewingTuneId, setPreviewingTuneId] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Decorations
  const [decorations, setDecorations] = useState<DecorItem[]>([]);
  const [selectedDecorId, setSelectedDecorId] = useState<string | null>(null);
  const [showAddImageModal, setShowAddImageModal] = useState<boolean>(false);
  const decorImagesMap = useRef<Map<string, HTMLImageElement>>(new Map());

  // Loaded Image objects for Canvas
  const [productImgObj, setProductImgObj] = useState<HTMLImageElement | null>(null);
  const [logoImgObj, setLogoImgObj] = useState<HTMLImageElement | null>(null);
  const [bgImgObj, setBgImgObj] = useState<HTMLImageElement | null>(null);

  // Interaction & Selection
  const [selectedLayer, setSelectedLayer] = useState<LayerKey | null>("discount");
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [isFullscreenStage, setIsFullscreenStage] = useState(false);
  const [showFullscreenInspector, setShowFullscreenInspector] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // Animation timeline state
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // ── In-Place On-Canvas Crop & Delete Tool Engine ──────────────────────────
  const [inPlaceCropLayer, setInPlaceCropLayer] = useState<LayerKey | null>(null);

  const handleDeleteLayer = (key: LayerKey) => {
    updateCurrentLayer(key, { hidden: true });
    if (inPlaceCropLayer === key) setInPlaceCropLayer(null);
    setSelectedLayer(null);
    const friendlyName = key === "discount" ? "Offer Card (30% off)" : key === "product" ? "Product Image" : key.toUpperCase();
    toast.success(`${friendlyName} removed from canvas`);
  };

  const handleRestoreLayer = (key: LayerKey) => {
    updateCurrentLayer(key, { hidden: false });
    setSelectedLayer(key);
    const friendlyName = key === "discount" ? "Offer Card" : key === "product" ? "Product Image" : key.toUpperCase();
    toast.success(`${friendlyName} restored to canvas`);
  };

  const resetCrop = (key: LayerKey) => {
    updateCurrentLayer(key, { cropInset: { top: 0, right: 0, bottom: 0, left: 0 } });
    toast.success("Crop reset to full dimensions");
  };

  const handleStartTransform = (
    e: React.PointerEvent<HTMLDivElement>,
    key: LayerKey,
    mode: "move" | "resize" | "crop",
    handle?: "nw" | "ne" | "se" | "sw" | "n" | "s" | "e" | "w"
  ) => {
    e.stopPropagation();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const L = currentLayers[key];
    if (!L) return;

    const currentInset = L.cropInset || { top: 0, right: 0, bottom: 0, left: 0 };
    dragTrackingRef.current = {
      layerKey: key,
      mode,
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startLayerX: L.x,
      startLayerY: L.y,
      startSize: L.size || 10,
      startBoxHeight: L.boxHeight || L.size || 10,
      startBoxWidth: L.boxWidth || L.size || 10,
      startCropInset: { ...currentInset },
      rectWidth: rect.width,
      rectHeight: rect.height,
    };
    setIsDragging(true);
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [playbackTime, setPlaybackTime] = useState(10); // current preview time in seconds (defaults to complete frame)
  const animFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Template Library & Modals
  const [savedTemplatesList, setSavedTemplatesList] = useState<SavedTemplateItem[]>([]);
  const [librarySearch, setLibrarySearch] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [viewingTemplate, setViewingTemplate] = useState<SavedTemplateItem | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<SavedTemplateItem | null>(null);

  // Create Template Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTplName, setNewTplName] = useState("");
  const [newTplDuration, setNewTplDuration] = useState(10);
  const [newTplRatio, setNewTplRatio] = useState<AspectRatio>("9:16");
  const [newTplOfferType, setNewTplOfferType] = useState<string>("Flash Sale");

  // Rename Template State
  const [renamingTemplate, setRenamingTemplate] = useState<SavedTemplateItem | null>(null);
  const [renameInput, setRenameInput] = useState("");

  // Quick Rename Handler
  const handleQuickRename = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!renamingTemplate || !renameInput.trim()) return;
    const trimmed = renameInput.trim();
    if (!renamingTemplate._id || renamingTemplate._id === "temp") {
      setTemplateName(trimmed);
      showToast(`✏️ Template name set to "${trimmed}"`);
      setRenamingTemplate(null);
      return;
    }
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
      const res = await fetch(`/api/video-template/${renamingTemplate._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ templateName: trimmed }),
      });
      const data = await res.json();
      if (data.success) {
        if (templateId === renamingTemplate._id) {
          setTemplateName(trimmed);
        }
        showToast(`✏️ Renamed template to "${trimmed}"`);
        setRenamingTemplate(null);
        fetchTemplates();
      } else {
        showToast(data.message || "Failed to rename template");
      }
    } catch {
      showToast("Network error while renaming template");
    }
  };

  // Helper to determine next available template ID starting with 1
  const getNextTemplateId = useCallback(() => {
    const validNumericIds = savedTemplatesList
      .map((t) => Number(t.templateId))
      .filter((n) => !isNaN(n) && n > 0);
    return validNumericIds.length > 0
      ? Math.max(...validNumericIds) + 1
      : (savedTemplatesList.length + 1 || 1);
  }, [savedTemplatesList]);

  // Active loaded template's sequential display ID starting with 1
  const activeTplMatch = savedTemplatesList.find(
    (t) => String(t._id) === String(templateId) || (templateId && String(t.templateId) === String(templateId)) || (activeTemplateNumber !== null && Number(t.templateId) === Number(activeTemplateNumber))
  );
  const currentDisplayId =
    activeTemplateNumber ??
    activeTplMatch?.templateId ??
    (templateId && !isNaN(Number(templateId))
      ? Number(templateId)
      : (templateId ? (savedTemplatesList.findIndex((t) => t._id === templateId) + 1 || 1) : (savedTemplatesList.length > 0 ? getNextTemplateId() : 1)));

  // UI status
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderJobId, setRenderJobId] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState<string>("");
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Canvases
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridCanvases = useRef<Record<AspectRatio, HTMLCanvasElement | null>>({
    "9:16": null,
    "16:9": null,
    "1:1": null,
    "4:5": null,
  });

  // Responsive Canvas Sizing (Mathematically fits exact aspect ratio into available stage space)
  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const [canvasFitSize, setCanvasFitSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    const container = stageContainerRef.current;
    if (!container) return;

    const updateFit = () => {
      // 20px padding (10px on each side)
      const cw = Math.max(60, container.clientWidth - 20);
      const ch = Math.max(60, container.clientHeight - 20);

      const spec = ASPECT_SPECS[activeRatio];
      const targetAspect = spec.width / spec.height;
      const containerAspect = cw / ch;

      let fw = 0;
      let fh = 0;
      if (containerAspect > targetAspect) {
        // Height constrained
        fh = ch;
        fw = Math.round(ch * targetAspect);
      } else {
        // Width constrained
        fw = cw;
        fh = Math.round(cw / targetAspect);
      }
      setCanvasFitSize({ width: fw, height: fh });
    };

    updateFit();
    const ro = new ResizeObserver(updateFit);
    ro.observe(container);
    window.addEventListener("resize", updateFit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateFit);
    };
  }, [activeRatio, leftPanelOpen, rightPanelOpen, isFullscreenStage]);

  // ── Toast Helper ────────────────────────────────────────────────────────────
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ── Image Preloading ────────────────────────────────────────────────────────
  const loadImg = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  };

  useEffect(() => {
    if (productImageUrl) {
      loadImg(productImageUrl)
        .then(setProductImgObj)
        .catch(() => setProductImgObj(null));
    }
  }, [productImageUrl]);

  useEffect(() => {
    if (logoImageUrl) {
      loadImg(logoImageUrl)
        .then(setLogoImgObj)
        .catch(() => setLogoImgObj(null));
    }
  }, [logoImageUrl]);

  useEffect(() => {
    const curUrl = aspectBackgrounds[activeRatio] || bgImageUrl || "";
    if (bgType === "image" && curUrl) {
      loadImg(curUrl)
        .then(setBgImgObj)
        .catch(() => setBgImgObj(null));
    } else {
      setBgImgObj(null);
    }
  }, [activeRatio, aspectBackgrounds, bgImageUrl, bgType]);

  // ── Fetch Saved Templates ───────────────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    setLoadingList(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
      const res = await fetch("/api/video-template", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSavedTemplatesList(data.data);
        if (data.data.length > 0) {
          if (initialTemplateId && activeTemplateNumber === null) {
            const match = data.data.find((t: any) => String(t._id) === String(initialTemplateId) || String(t.templateId) === String(initialTemplateId));
            if (match) {
              setActiveTemplateNumber(match.templateId || 1);
              if (!templateId) setTemplateId(match._id);
            }
          } else if (!templateId && !initialTemplateId) {
            // New template creation mode by default: auto-assign next sequential ID
            const validIds = data.data.map((t: any) => Number(t.templateId)).filter((n: number) => !isNaN(n) && n > 0);
            const nextId = validIds.length > 0 ? Math.max(...validIds) + 1 : (data.data.length + 1 || 1);
            setTemplateName((prev) => (!prev || prev === "Commercial Diagonal Retail Promo" || prev === "Custom Video Template" || prev.startsWith("Custom Video Template")) ? `Custom Video Template ${nextId}` : prev);
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingList(false);
    }
  }, [activeTemplateNumber, initialTemplateId, templateId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);


  // ── Animation Playback Loop ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      return;
    }

    // If canvas animation begins, pause standalone demo tune preview
    if (previewAudioRef.current && !previewAudioRef.current.paused) {
      previewAudioRef.current.pause();
      setPreviewingTuneId(null);
    }

    if (musicUrl && audioRef.current) {
      audioRef.current.volume = musicVolume / 100;
      audioRef.current.play().catch(() => {});
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp - playbackTime * 1000;
      const elapsed = (timestamp - startTimeRef.current) / 1000;
      if (elapsed >= duration) {
        startTimeRef.current = timestamp; // loop
        setPlaybackTime(0);
        if (audioRef.current) audioRef.current.currentTime = 0;
      } else {
        setPlaybackTime(elapsed);
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, duration, playbackTime, musicUrl, musicVolume]);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      startTimeRef.current = null;
      setIsPlaying(true);
    }
  };

  const handleReplay = () => {
    setPlaybackTime(0);
    startTimeRef.current = null;
    if (audioRef.current) audioRef.current.currentTime = 0;
    if (!isPlaying) setIsPlaying(true);
  };

  // ── Active Layers Accessor & Updater ────────────────────────────────────────
  const currentLayers = aspectLayers[activeRatio];

  const updateCurrentLayer = (key: LayerKey, updates: Partial<LayerStyle>) => {
    const isImage = key === "product" || key === "logo";
    setAspectLayers((prev) => {
      const updated = { ...prev };
      // 1. Update the active ratio
      updated[activeRatio] = {
        ...prev[activeRatio],
        [key]: {
          ...prev[activeRatio][key],
          ...updates,
          ...(!isImage ? { cropInset: undefined } : {}),
        },
      };

      // 2. Automatically sync text content, shape, and colors to all 4 ratios
      if (
        updates.text !== undefined ||
        updates.shape !== undefined ||
        updates.bgColor !== undefined ||
        updates.fontColor !== undefined ||
        updates.borderColor !== undefined ||
        updates.border !== undefined ||
        updates.textAlign !== undefined
      ) {
        (["9:16", "16:9", "1:1", "4:5"] as AspectRatio[]).forEach((r) => {
          if (r === activeRatio) return;
          if (updated[r] && updated[r][key]) {
            updated[r] = {
              ...updated[r],
              [key]: {
                ...updated[r][key],
                ...(updates.text !== undefined ? { text: updates.text } : {}),
                ...(updates.shape !== undefined ? { shape: updates.shape } : {}),
                ...(updates.bgColor !== undefined ? { bgColor: updates.bgColor } : {}),
                ...(updates.fontColor !== undefined ? { fontColor: updates.fontColor } : {}),
                ...(updates.borderColor !== undefined ? { borderColor: updates.borderColor } : {}),
                ...(updates.border !== undefined ? { border: updates.border } : {}),
                ...(updates.textAlign !== undefined ? { textAlign: updates.textAlign } : {}),
              },
            };
          }
        });
      }

      return updated;
    });
  };

  // ── Sync Text Content Across All 4 Ratios ────────────────────────────────────
  // Copies the TEXT/COLOR values from the current ratio to all other ratios,
  // but KEEPS each ratio's own x/y/size/shape/animation positions intact.
  const syncTextToAllRatios = () => {
    const source = aspectLayers[activeRatio];
    setAspectLayers((prev) => {
      const updated = { ...prev };
      (["9:16", "16:9", "1:1", "4:5"] as AspectRatio[]).forEach((r) => {
        if (r === activeRatio) return;
        const target = { ...prev[r] };
        (Object.keys(source) as LayerKey[]).forEach((key) => {
          const srcLayer = source[key];
          if (!srcLayer) return;
          // Only sync text content, colors, font — NOT positions/size/animation
          if ((srcLayer.type === "text" || (key !== "product" && key !== "logo")) && target[key]) {
            target[key] = {
              ...target[key],
              text: srcLayer.text,
              fontColor: srcLayer.fontColor,
              bgColor: srcLayer.bgColor,
              borderColor: srcLayer.borderColor,
              font: srcLayer.font,
              shape: srcLayer.shape,
              border: srcLayer.border,
            };
          }
        });
        updated[r] = target;
      });
      return updated;
    });
    showToast(`✅ Text content synced from ${activeRatio} to all 4 aspect ratios!`);
  };

  // ── Reset a ratio back to its default layout ─────────────────────────────────
  const resetRatioToDefault = (r: AspectRatio) => {
    setAspectLayers((prev) => ({
      ...prev,
      [r]: DEFAULT_LAYERS[r],
    }));
    showToast(`🔄 Reset ${r} layout to default positions`);
  };

  // ── Canvas Rendering Engine ─────────────────────────────────────────────────
  const renderFrameOnCanvas = useCallback(
    (
      canvas: HTMLCanvasElement,
      ratio: AspectRatio,
      t: number,
      highlightKey: LayerKey | null
    ) => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const spec = ASPECT_SPECS[ratio];
      const W = spec.width;
      const H = spec.height;

      canvas.width = W;
      canvas.height = H;

      // 1. Draw Background
      if (bgType === "image") {
        if (bgImgObj) {
          // Draw uploaded background image cleanly
          const imgRatio = bgImgObj.width / bgImgObj.height;
          const cRatio = W / H;
          let dw = W, dh = H, dx = 0, dy = 0;
          if (imgRatio > cRatio) {
            dh = H;
            dw = H * imgRatio;
            dx = (W - dw) / 2;
          } else {
            dw = W;
            dh = W / imgRatio;
            dy = (H - dh) / 2;
          }
          ctx.drawImage(bgImgObj, dx, dy, dw, dh);
        } else {
          // No image uploaded yet: clean neutral dark canvas (no default promo image!)
          ctx.fillStyle = "#0b1e24";
          ctx.fillRect(0, 0, W, H);
          if (!isPlaying) {
            ctx.save();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 8]);
            ctx.strokeRect(20, 20, W - 40, H - 40);
            ctx.setLineDash([]);
            ctx.restore();
          }
        }
      } else if (bgType === "color") {
        // Clean solid color background
        ctx.fillStyle = bgColor || "#0B2830";
        ctx.fillRect(0, 0, W, H);
      } else {
        // Clean linear gradient background with subtle lighting
        const gradSpec = PRESET_GRADIENTS[bgGradIndex] || PRESET_GRADIENTS[0];
        const grd = ctx.createLinearGradient(0, 0, W, H);
        grd.addColorStop(0, gradSpec.c1);
        grd.addColorStop(1, gradSpec.c2);
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, W, H);

        const radial = ctx.createRadialGradient(W / 2, H * 0.35, 50, W / 2, H * 0.35, W * 0.85);
        radial.addColorStop(0, "rgba(255, 255, 255, 0.08)");
        radial.addColorStop(1, "rgba(0, 0, 0, 0.42)");
        ctx.fillStyle = radial;
        ctx.fillRect(0, 0, W, H);
      }

      // Designer Alignment Grid overlay (helpful for responsive positioning)
      if (showGrid) {
        ctx.save();
        ctx.strokeStyle = "rgba(17, 181, 187, 0.16)";
        ctx.lineWidth = 1;
        const stepX = Math.round(W / 10);
        for (let x = stepX; x < W; x += stepX) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, H);
          ctx.stroke();
        }
        const stepY = Math.round(H / 10);
        for (let y = stepY; y < H; y += stepY) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(W, y);
          ctx.stroke();
        }
        // Center crosshairs
        ctx.strokeStyle = "rgba(240, 90, 40, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(W / 2, 0);
        ctx.lineTo(W / 2, H);
        ctx.moveTo(0, H / 2);
        ctx.lineTo(W, H / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      const layers = aspectLayers[ratio];

      const getAnimProgress = (start = 0, end = 1, isTarget = false) => {
        // The selected layer in design mode (not playing) is always visible for drag/editing
        if (isTarget && !isPlaying && t === 0) return 1;
        // In design / editing mode when not playing and at time 0, show all layers fully visible
        if (!isPlaying && t === 0) return 1;
        if (t < start) return 0;
        if (t >= end) return 1;
        const p = (t - start) / (end - start);
        return 1 - Math.pow(1 - p, 3); // ease-out cubic
      };

      // 2. Draw Product Image
      if (layers.product && !layers.product.hidden) {
        const pL = layers.product;
        const progress = getAnimProgress(pL.animStart, pL.animEnd, highlightKey === "product");
        const maxDim = Math.round(W * (pL.size / 100));

        let pTransY = 0;
        let pScale = 1;
        if (isPlaying || t > 0) {
          if (pL.animation === "zoom_bounce") {
            pScale = progress === 0 ? 0 : Math.sin(progress * Math.PI * 0.7) * 1.12;
            if (progress > 0.8) pScale = 1.12 - ((progress - 0.8) / 0.2) * 0.12;
          } else {
            pTransY = (1 - progress) * (H * 0.08);
          }
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, progress));
        const cx = Math.round(pL.x * W);
        const cy = Math.round(pL.y * H + pTransY);
        if (pScale !== 1) {
          ctx.translate(cx, cy);
          ctx.scale(pScale, pScale);
          ctx.translate(-cx, -cy);
        }

        if (productImgObj) {
          const aspect = productImgObj.width / productImgObj.height;
          let pw = maxDim;
          let ph = maxDim / aspect;
          if (ph > maxDim) {
            ph = maxDim;
            pw = maxDim * aspect;
          }
          if (pL.boxHeight) {
            ph = Math.round(H * (pL.boxHeight / 100));
          }
          if (pL.boxWidth) {
            pw = Math.round(W * (pL.boxWidth / 100));
          }

          // Product background card: only drawn IF user explicitly enabled a colored card shape
          const hasProductBgCard = pL.bgMode === "color" && pL.bgColor && pL.bgColor !== "transparent" && pL.shape && pL.shape !== "none";
          if (hasProductBgCard) {
            const cardPad = Math.round(Math.min(pw, ph) * 0.08);
            const cardW = pw + cardPad * 2;
            const cardH = ph + cardPad * 2;
            ctx.save();
            ctx.fillStyle = pL.bgColor!;
            ctx.shadowColor = "rgba(0,0,0,0.22)";
            ctx.shadowBlur = 14;
            ctx.shadowOffsetY = 4;
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 16);
            } else {
              ctx.rect(cx - cardW / 2, cy - cardH / 2, cardW, cardH);
            }
            ctx.fill();
            if (pL.border === "1") {
              ctx.strokeStyle = pL.borderColor || "rgba(0,0,0,0.08)";
              ctx.lineWidth = 2;
              ctx.stroke();
            }
            ctx.restore();
          }

          const inset = pL.cropInset || { top: 0, right: 0, bottom: 0, left: 0 };
          const hasCrop = inset.top > 0 || inset.right > 0 || inset.bottom > 0 || inset.left > 0;
          const finalX = hasCrop ? cx - pw / 2 + (inset.left / 100) * pw : cx - pw / 2;
          const finalY = hasCrop ? cy - ph / 2 + (inset.top / 100) * ph : cy - ph / 2;
          const finalW = hasCrop ? Math.max(10, pw - ((inset.left + inset.right) / 100) * pw) : pw;
          const finalH = hasCrop ? Math.max(10, ph - ((inset.top + inset.bottom) / 100) * ph) : ph;

          let r = 0;
          if (pL.shape === "circle") {
            r = Math.min(finalW, finalH) / 2;
          } else if (typeof pL.borderRadius === "number" && pL.borderRadius > 0) {
            r = pL.borderRadius <= 50 ? (pL.borderRadius / 100) * Math.min(finalW, finalH) : Math.min(pL.borderRadius, finalW / 2, finalH / 2);
          } else if (pL.shape === "rounded") {
            r = Math.min(finalW, finalH) * 0.12;
          }

          ctx.save();
          if (pL.shadow) {
            ctx.shadowColor = "rgba(0,0,0,0.45)";
            ctx.shadowBlur = 16;
            ctx.shadowOffsetY = 6;
          }

          if (r > 0) {
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(finalX, finalY, finalW, finalH, r);
            } else {
              ctx.rect(finalX, finalY, finalW, finalH);
            }
            ctx.clip();
            ctx.drawImage(productImgObj, cx - pw / 2, cy - ph / 2, pw, ph);
            ctx.restore();

            if (pL.border === "1" || (pL.borderWidth && pL.borderWidth > 0)) {
              ctx.save();
              ctx.strokeStyle = pL.borderColor || "#ffffff";
              ctx.lineWidth = pL.borderWidth || 3;
              ctx.beginPath();
              if (ctx.roundRect) ctx.roundRect(finalX, finalY, finalW, finalH, r);
              else ctx.rect(finalX, finalY, finalW, finalH);
              ctx.stroke();
              ctx.restore();
            }
          } else if (hasCrop) {
            ctx.beginPath();
            ctx.rect(finalX, finalY, finalW, finalH);
            ctx.clip();
            ctx.drawImage(productImgObj, cx - pw / 2, cy - ph / 2, pw, ph);
            ctx.restore();

            if (pL.border === "1" || (pL.borderWidth && pL.borderWidth > 0)) {
              ctx.save();
              ctx.strokeStyle = pL.borderColor || "#ffffff";
              ctx.lineWidth = pL.borderWidth || 3;
              ctx.strokeRect(finalX, finalY, finalW, finalH);
              ctx.restore();
            }
          } else {
            ctx.drawImage(productImgObj, cx - pw / 2, cy - ph / 2, pw, ph);
            ctx.restore();

            if (pL.border === "1" || (pL.borderWidth && pL.borderWidth > 0)) {
              ctx.save();
              ctx.strokeStyle = pL.borderColor || "#ffffff";
              ctx.lineWidth = pL.borderWidth || 3;
              ctx.strokeRect(finalX, finalY, finalW, finalH);
              ctx.restore();
            }
          }

// Product highlight handled by interactive HTML overlay
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.fillRect(cx - maxDim / 2, cy - maxDim / 2, maxDim, maxDim);
          ctx.strokeRect(cx - maxDim / 2, cy - maxDim / 2, maxDim, maxDim);
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${Math.round(W * 0.03)}px Arial`;
          ctx.textAlign = "center";
          ctx.fillText("PRODUCT IMAGE", cx, cy);

// Product placeholder highlight handled by overlay
        }
        ctx.restore();
      }

      // 3. Draw Logo
      if (layers.logo && !layers.logo.hidden) {
        const lL = layers.logo;
        const progress = getAnimProgress(lL.animStart, lL.animEnd, highlightKey === "logo");
        const logoSize = Math.round(Math.min(W, H) * (lL.size / 100));
        ctx.save();
        ctx.globalAlpha = progress;
        const cx = Math.round(lL.x * W);
        const cy = Math.round(lL.y * H);

        if (logoImgObj) {
          const lAspect = logoImgObj.width / logoImgObj.height;
          let lw = logoSize;
          let lh = logoSize / lAspect;
          ctx.drawImage(logoImgObj, cx - lw / 2, cy - lh / 2, lw, lh);
        } else {
          ctx.fillStyle = "rgba(17, 181, 187, 0.85)";
          ctx.beginPath();
          ctx.arc(cx, cy, logoSize / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${Math.round(logoSize * 0.4)}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("LOGO", cx, cy);
        }

        if (highlightKey === "logo") {
          ctx.strokeStyle = "#11B5BB";
          ctx.lineWidth = 3;
          ctx.strokeRect(cx - logoSize / 2 - 6, cy - logoSize / 2 - 6, logoSize + 12, logoSize + 12);
        }
        ctx.restore();
      }

      // 4. Draw Text & Badges
      const textKeys: LayerKey[] = [
        "discount",
        "headline",
        "description",
        "price",
        "oldPrice",
        "validity",
        "cta",
        "qrCode",
        "storeName",
        "footer",
      ];

      for (const k of textKeys) {
        const L = layers[k];
        if (!L || !L.text) continue;

        const progress = getAnimProgress(L.animStart, L.animEnd, highlightKey === k);
        if (L.hidden) continue;

        const cx = Math.round(L.x * W);
        const cy = Math.round(L.y * H);

        let transX = 0;
        let transY = 0;
        let scale = 1;

        if (isPlaying || t > 0) {
          const animStyle = L.animation || (k === "discount" ? "zoom_bounce" : k === "cta" ? "pulse" : "fade_in");
          if (animStyle === "zoom_bounce") {
            if (progress < 1) {
              scale = progress === 0 ? 0 : Math.sin(progress * Math.PI * 0.7) * 1.18;
              if (progress > 0.8) scale = 1.18 - ((progress - 0.8) / 0.2) * 0.18;
            } else {
              // Continuous retail breathing pulse animation
              scale = 1 + Math.sin(t * 4.5) * 0.035;
            }
          } else if (animStyle === "slide_up" || animStyle === "fade_up") {
            transY = (1 - progress) * (H * 0.08);
          } else if (animStyle === "slide_left") {
            transX = (1 - progress) * (W * 0.10);
          } else if (animStyle === "slide_right") {
            transX = -(1 - progress) * (W * 0.10);
          } else if (animStyle === "pulse") {
            if (t >= (L.animStart || 0)) {
              scale = 1 + Math.sin((t - (L.animStart || 0)) * 5) * 0.04;
            }
          }
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, progress));
        if (transX !== 0 || transY !== 0 || scale !== 1) {
          ctx.translate(cx + transX, cy + transY);
          ctx.scale(scale, scale);
          ctx.translate(-cx, -cy);
        }
        const fontSize = Math.round(W * (L.size / 100));
        const fWeight = L.fontWeight || "bold";
        const fStyle = L.fontStyle || "normal";
        ctx.font = `${fStyle} ${fWeight} ${fontSize}px ${L.font || "Arial"}, sans-serif`;
        ctx.textAlign = (L.textAlign as CanvasTextAlign) || "center";
        ctx.textBaseline = "middle";

        // Minimum clamped boxWidth so text never collapses into a needle
        const effectiveBoxWidth = L.boxWidth ? Math.max(18, L.boxWidth) : undefined;
        let customBoxH = L.boxHeight ? (L.boxHeight / 100) * H : 0;
        let customBoxW = effectiveBoxWidth ? (effectiveBoxWidth / 100) * W : 0;

        // Auto-wrap words down to next line when reaching boxWidth limit
        const maxWrapW = customBoxW ? Math.max(220, customBoxW - fontSize * 0.8) : Math.max(260, W * 0.45);
        const textLines = wrapTextCanvas(ctx, L.text || "", maxWrapW, fontSize);
        const lineHeight = fontSize * 1.30;

        let maxLineW = 0;
        for (const line of textLines) {
          const w = ctx.measureText(line).width;
          if (w > maxLineW) maxLineW = w;
        }
        let textW = maxLineW;
        let textH = Math.max(fontSize * 1.2, textLines.length * lineHeight);

        const isOrigami = L.shape === "origami" || L.shape === "ribbon" || L.shape === "parallelogram";
        const isTransparent = (L.shape === "none" || (!L.shape && L.bgMode === "transparent")) && !isOrigami;
        if (!isTransparent) {
          if (L.shape === "rounded") {
            const pw = customBoxW ? Math.max(textW + 20, customBoxW) : textW + fontSize * 1.1;
            const ph = customBoxH ? Math.max(textH + 10, customBoxH) : textH + fontSize * 0.45;
            const rx = Math.max(8, Math.round(fontSize * 0.35));
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(cx - pw / 2, cy - ph / 2, pw, ph, rx);
            } else {
              ctx.rect(cx - pw / 2, cy - ph / 2, pw, ph);
            }
            ctx.fillStyle = L.bgColor || "#ffc700";
            ctx.fill();
            if (L.border === "1") {
              ctx.strokeStyle = L.borderColor || "#000000";
              ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.08));
              ctx.stroke();
            }
          } else if (L.shape === "origami" || L.shape === "ribbon" || L.shape === "parallelogram") {
            // ── 3D Origami Folded Retail Banner Badge (Image 2 style) ──
            const tiltDeg = -7;
            const tiltRad = (tiltDeg * Math.PI) / 180;
            const pw = customBoxW ? Math.max(textW + 36, customBoxW) : textW + fontSize * 1.5;
            const ph = customBoxH ? Math.max(textH + 20, customBoxH) : textH + fontSize * 0.75;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(tiltRad);

            // 1. Folded 3D green origami ribbon flap underneath at bottom-left
            const foldW = fontSize * 0.95;
            const foldH = fontSize * 0.85;
            ctx.beginPath();
            ctx.moveTo(-pw / 2 + 12, ph / 2 - 2);
            ctx.lineTo(-pw / 2 - foldW * 0.45, ph / 2 + foldH);
            ctx.lineTo(-pw / 2 + foldW * 0.7, ph / 2 - 2);
            ctx.closePath();
            ctx.fillStyle = L.borderColor || "#047857"; // Deep green fold shadow
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.08));
            ctx.stroke();

            // 2. Main Angled Banner Box with Rounded Corners & Drop Shadow
            ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
            ctx.shadowBlur = Math.round(fontSize * 0.35);
            ctx.shadowOffsetX = -2;
            ctx.shadowOffsetY = 6;

            const rx = Math.max(8, Math.round(fontSize * 0.22));
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(-pw / 2, -ph / 2, pw, ph, rx);
            } else {
              ctx.rect(-pw / 2, -ph / 2, pw, ph);
            }
            ctx.fillStyle = L.bgColor || "#ffc700"; // Vibrant golden yellow
            ctx.fill();

            // Reset shadow for crisp borders
            ctx.shadowColor = "transparent";

            // Crisp White Outline Border
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = Math.max(3, Math.round(fontSize * 0.12));
            ctx.stroke();

            // 3. Festive Confetti Burst Triangles (around the badge like Image 2)
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
            // Top-left confetti: red, yellow, green
            drawTriangle(-pw / 2 - cs * 1.5, -ph / 2 + cs, cs * 1.1, 0.4, "#ef4444");
            drawTriangle(-pw / 2 - cs * 0.8, -ph / 2 - cs * 1.4, cs, -0.6, "#facc15");
            drawTriangle(-pw / 2 + cs * 1.2, -ph / 2 - cs * 1.8, cs * 0.9, 0.8, "#10b981");

            // Top-right confetti: yellow & red
            drawTriangle(pw / 2 + cs * 1.2, -ph / 2 - cs * 0.8, cs * 1.1, -0.4, "#facc15");
            drawTriangle(pw / 2 + cs * 2.2, -ph / 2 + cs * 1.5, cs * 0.85, 0.7, "#ef4444");

            // Bottom-right confetti: yellow & green
            drawTriangle(pw / 2 + cs * 1.6, ph / 2 + cs * 0.8, cs * 0.9, 0.3, "#facc15");
            drawTriangle(pw / 2 - cs * 1.2, ph / 2 + cs * 1.8, cs * 1.0, -0.5, "#10b981");

            // Bottom-left confetti: red
            drawTriangle(-pw / 2 - cs * 1.8, ph / 2 + cs * 0.6, cs * 1.1, -0.7, "#ef4444");

            ctx.restore();
          } else if (L.shape === "circle") {
            const radius = Math.max(textW, textH) / 2 + fontSize * 0.4;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fillStyle = L.bgColor || "#F05A28";
            ctx.fill();
            if (L.border === "1") {
              ctx.strokeStyle = L.borderColor || "#ffffff";
              ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.08));
              ctx.stroke();
            }
          } else if (L.shape === "pill") {
            const pw = customBoxW ? Math.max(textW + 20, customBoxW) : textW + fontSize * 1.2;
            const ph = customBoxH ? Math.max(textH + 10, customBoxH) : textH + fontSize * 0.4;
            const r = ph / 2;
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(cx - pw / 2, cy - ph / 2, pw, ph, r);
            } else {
              ctx.rect(cx - pw / 2, cy - ph / 2, pw, ph);
            }
            ctx.fillStyle = L.bgColor || "#ffffff";
            ctx.fill();
            if (L.border === "1") {
              ctx.strokeStyle = L.borderColor || "#000000";
              ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.08));
              ctx.stroke();
            }
          } else if (L.shape === "rect") {
            const pw = customBoxW ? Math.max(textW + 20, customBoxW) : textW + fontSize * 0.8;
            const ph = customBoxH ? Math.max(textH + 10, customBoxH) : textH + fontSize * 0.4;
            ctx.fillStyle = L.bgColor || "#ffffff";
            ctx.fillRect(cx - pw / 2, cy - ph / 2, pw, ph);
            if (L.border === "1") {
              ctx.strokeStyle = L.borderColor || "#000000";
              ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.08));
              ctx.strokeRect(cx - pw / 2, cy - ph / 2, pw, ph);
            }
          }
        }

        // Production-ready text rendering: perfectly centered, crisp, unclipped
        const isOrigamiBadge = L.shape === "origami" || L.shape === "ribbon" || L.shape === "parallelogram";
        if (isOrigamiBadge) {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate((-7 * Math.PI) / 180);
          ctx.translate(-cx, -cy);
        }

        ctx.fillStyle = L.fontColor || "#ffffff";
        const textAlign = (L.textAlign as CanvasTextAlign) || "center";
        ctx.textAlign = textAlign;
        ctx.textBaseline = "middle";

        const padX = fontSize * 0.6;
        const pw = customBoxW ? Math.max(textW + padX * 2, customBoxW) : textW + padX * 2;

        const startY = cy - ((textLines.length - 1) * lineHeight) / 2;
        textLines.forEach((line: string, idx: number) => {
          let lineX = cx;
          if (textAlign === "left") {
            lineX = cx - pw / 2 + padX;
          } else if (textAlign === "right") {
            lineX = cx + pw / 2 - padX;
          }
          ctx.fillText(line, lineX, startY + idx * lineHeight);
        });

        if (isOrigamiBadge) {
          ctx.restore();
        }

        // Strikethrough line for old price
        if (k === "oldPrice") {
          ctx.strokeStyle = L.fontColor || "#EF4444";
          ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.1));
          ctx.beginPath();
          ctx.moveTo(cx - textW / 2 - 4, cy);
          ctx.lineTo(cx + textW / 2 + 4, cy);
          ctx.stroke();
        }

        // Target brackets for QR Code badge
        if (k === "qrCode") {
          const qSize = Math.max(textW, fontSize * 2.2);
          ctx.strokeStyle = L.borderColor || "#11B5BB";
          ctx.lineWidth = 2;
          const bl = 7;
          ctx.beginPath();
          ctx.moveTo(cx - qSize / 2, cy - qSize / 2 + bl);
          ctx.lineTo(cx - qSize / 2, cy - qSize / 2);
          ctx.lineTo(cx - qSize / 2 + bl, cy - qSize / 2);
          ctx.moveTo(cx + qSize / 2 - bl, cy - qSize / 2);
          ctx.lineTo(cx + qSize / 2, cy - qSize / 2);
          ctx.lineTo(cx + qSize / 2, cy - qSize / 2 + bl);
          ctx.moveTo(cx - qSize / 2, cy + qSize / 2 - bl);
          ctx.lineTo(cx - qSize / 2, cy + qSize / 2);
          ctx.lineTo(cx - qSize / 2 + bl, cy + qSize / 2);
          ctx.moveTo(cx + qSize / 2 - bl, cy + qSize / 2);
          ctx.lineTo(cx + qSize / 2, cy + qSize / 2);
          ctx.lineTo(cx + qSize / 2, cy + qSize / 2 - bl);
          ctx.stroke();
        }

// Highlight handled cleanly by interactive HTML overlay

        ctx.restore();
      }

      // 5. Draw Custom Added Images & Stickers (Decorations)
      if (decorations && decorations.length > 0) {
        for (const dec of decorations) {
          if (dec.hidden || !dec.url) continue;
          let img = decorImagesMap.current.get(dec.url);
          if (!img) {
            img = new Image();
            img.crossOrigin = "anonymous";
            img.src = dec.url;
            decorImagesMap.current.set(dec.url, img);
            img.onload = () => {
              if (canvasRef.current) renderFrameOnCanvas(canvasRef.current, activeRatio, playbackTime, selectedLayer);
            };
          }
          if (img.complete && img.naturalWidth > 0) {
            const cx = Math.round(dec.x * W);
            const cy = Math.round(dec.y * H);
            const baseDim = Math.min(W, H);
            const dw = Math.round(baseDim * ((dec.size || 15) / 100));
            const aspect = img.naturalWidth / img.naturalHeight;
            const dh = Math.round(dw / (aspect || 1));

            ctx.save();
            ctx.translate(cx, cy);
            let dr = 0;
            if (dec.shape === "circle") {
              dr = Math.min(dw, dh) / 2;
            } else if (typeof dec.borderRadius === "number" && dec.borderRadius > 0) {
              dr = dec.borderRadius <= 50 ? (dec.borderRadius / 100) * Math.min(dw, dh) : Math.min(dec.borderRadius, dw / 2, dh / 2);
            }
            if (dr > 0) {
              ctx.save();
              ctx.beginPath();
              if (ctx.roundRect) ctx.roundRect(-dw / 2, -dh / 2, dw, dh, dr);
              else ctx.rect(-dw / 2, -dh / 2, dw, dh);
              ctx.clip();
              ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
              ctx.restore();
            } else {
              ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
            }

            if (selectedDecorId === dec.id) {
              ctx.strokeStyle = "#11B5BB";
              ctx.lineWidth = 3;
              ctx.strokeRect(-dw / 2 - 4, -dh / 2 - 4, dw + 8, dh + 8);
            }
            ctx.restore();
          }
        }
      }
    },
    [aspectLayers, bgType, bgGradIndex, bgColor, bgImgObj, logoImgObj, productImgObj, isPlaying, showGrid, decorations, selectedDecorId]
  );

  // Redraw active single canvas in Studio mode
  useEffect(() => {
    if (activeTab === "studio" && canvasRef.current) {
      renderFrameOnCanvas(canvasRef.current, activeRatio, playbackTime, selectedLayer);
    }
  }, [renderFrameOnCanvas, activeTab, activeRatio, playbackTime, selectedLayer, isPlaying]);

  // Redraw all 4 canvases in Grid mode
  useEffect(() => {
    if (activeTab === "grid") {
      (["9:16", "16:9", "1:1", "4:5"] as AspectRatio[]).forEach((r) => {
        const c = gridCanvases.current[r];
        if (c) renderFrameOnCanvas(c, r, playbackTime, null);
      });
    }
  }, [renderFrameOnCanvas, activeTab, playbackTime]);

  // ── Drag & Drop Interaction Engine ──────────────────────────────────────────
  const checkKeys: LayerKey[] = [
    "discount",
    "headline",
    "description",
    "price",
    "oldPrice",
    "validity",
    "cta",
    "qrCode",
    "storeName",
    "footer",
    "logo",
    "product",
  ];

  const dragTrackingRef = useRef<{
    layerKey: LayerKey;
    mode: "move" | "resize" | "crop";
    handle?: "nw" | "ne" | "se" | "sw" | "n" | "s" | "e" | "w";
    startClientX: number;
    startClientY: number;
    startLayerX: number;
    startLayerY: number;
    startSize: number;
    startBoxHeight: number;
    startBoxWidth: number;
    startCropInset: { top: number; right: number; bottom: number; left: number };
    rectWidth: number;
    rectHeight: number;
  } | null>(null);

  const [hoveredLayer, setHoveredLayer] = useState<LayerKey | null>(null);

  // Exact rectangular bounding box calculation for every element type
  const getLayerBounds = useCallback(
    (
      key: LayerKey,
      W: number,
      H: number,
      layers: LayersConfig
    ) => {
      const L = layers[key];
      if (!L || L.hidden) return null;
      const cx = L.x * W;
      const cy = L.y * H;

      if (key === "product") {
        const maxDim = Math.round(W * (L.size / 100));
        let pw = maxDim;
        let ph = maxDim;
        if (productImgObj && productImgObj.width && productImgObj.height) {
          const aspect = productImgObj.width / productImgObj.height;
          if (aspect > 1) {
            pw = maxDim;
            ph = maxDim / aspect;
          } else {
            ph = maxDim;
            pw = maxDim * aspect;
          }
        }
        if (L.boxHeight) {
          ph = Math.max(20, Math.round(H * (L.boxHeight / 100)));
        }
        if (L.boxWidth) {
          pw = Math.max(20, Math.round(W * (L.boxWidth / 100)));
        }
        const inset = L.cropInset || { top: 0, right: 0, bottom: 0, left: 0 };
        const cLeft = (inset.left / 100) * pw;
        const cTop = (inset.top / 100) * ph;
        const cRight = (inset.right / 100) * pw;
        const cBottom = (inset.bottom / 100) * ph;
        const finalLeft = cx - pw / 2 + cLeft;
        const finalTop = cy - ph / 2 + cTop;
        const finalW = Math.max(20, pw - cLeft - cRight);
        const finalH = Math.max(20, ph - cTop - cBottom);
        return {
          left: finalLeft,
          top: finalTop,
          right: finalLeft + finalW,
          bottom: finalTop + finalH,
          width: finalW,
          height: finalH,
          cx,
          cy,
          rawW: pw,
          rawH: ph,
        };
      }

      if (key === "logo") {
        const logoSize = Math.round(Math.min(W, H) * (L.size / 100));
        return {
          left: cx - logoSize / 2,
          top: cy - logoSize / 2,
          right: cx + logoSize / 2,
          bottom: cy + logoSize / 2,
          width: logoSize,
          height: logoSize,
          cx,
          cy,
        };
      }

      // Text layers with dynamic line wrapping down
      const fontSize = Math.round(W * (L.size / 100));
      const textStr = L.text || "";
      const effectiveBoxW = L.boxWidth ? Math.max(18, L.boxWidth) : undefined;
      const maxWrapW = effectiveBoxW ? Math.max(220, (effectiveBoxW / 100) * W - fontSize * 0.8) : Math.max(260, W * 0.45);
      const textLines = wrapTextCanvas(null, textStr, maxWrapW, fontSize);
      const lineHeight = fontSize * 1.30;
      const totalTextH = Math.max(fontSize * 1.2, textLines.length * lineHeight);

      let maxLineChars = 1;
      for (const l of textLines) {
        if (l.length > maxLineChars) maxLineChars = l.length;
      }
      const approxTextW = maxLineChars * fontSize * 0.58;

      const padX = fontSize * 0.6;
      const padY = fontSize * 0.4;

      let hitW = effectiveBoxW ? Math.max(approxTextW + padX * 2, (effectiveBoxW / 100) * W) : approxTextW + padX * 2;
      let hitH = L.boxHeight ? Math.max(totalTextH + padY * 2, (L.boxHeight / 100) * H) : totalTextH + padY * 2;

      hitW = Math.max(200, hitW);
      hitH = Math.max(40, hitH);

      // Text bounds are always cleanly centered on (cx, cy)
      const finalLeft = cx - hitW / 2;
      const finalTop = cy - hitH / 2;

      return {
        left: finalLeft,
        top: finalTop,
        right: finalLeft + hitW,
        bottom: finalTop + hitH,
        width: hitW,
        height: hitH,
        cx,
        cy,
        rawW: hitW,
        rawH: hitH,
      };
    },
    [productImgObj]
  );

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const W = canvas.width;
    const H = canvas.height;

    // Check if clicked on any decor image / sticker first
    let hitDecor: DecorItem | null = null;
    if (decorations && decorations.length > 0) {
      for (let i = decorations.length - 1; i >= 0; i--) {
        const dec = decorations[i];
        if (dec.hidden || !dec.url) continue;
        const baseDim = Math.min(W, H);
        const dw = Math.round(baseDim * ((dec.size || 15) / 100));
        const dh = dw;
        const dcx = dec.x * W;
        const dcy = dec.y * H;
        if (clickX >= dcx - dw / 2 && clickX <= dcx + dw / 2 && clickY >= dcy - dh / 2 && clickY <= dcy + dh / 2) {
          hitDecor = dec;
          break;
        }
      }
    }

    if (hitDecor) {
      setSelectedDecorId(hitDecor.id);
      setSelectedLayer(null);
      setRightPanelOpen(true);
      return;
    }

    const hitKey = checkKeys.find((key) => {
      const bounds = getLayerBounds(key, W, H, currentLayers);
      if (!bounds) return false;
      return (
        clickX >= bounds.left &&
        clickX <= bounds.right &&
        clickY >= bounds.top &&
        clickY <= bounds.bottom
      );
    });

    if (hitKey) {
      setSelectedDecorId(null);
    }

    if (hitKey) {
      const L = currentLayers[hitKey];
      setSelectedLayer(hitKey);
      setRightPanelOpen(true);
      setIsDragging(true);
      dragTrackingRef.current = {
        layerKey: hitKey,
        mode: "move",
        startSize: L.size || 10,
        startBoxHeight: L.boxHeight || L.size || 10,
        startBoxWidth: L.boxWidth || L.size || 10,
        startCropInset: L.cropInset || { top: 0, right: 0, bottom: 0, left: 0 },
        startClientX: e.clientX,
        startClientY: e.clientY,
        startLayerX: L.x,
        startLayerY: L.y,
        rectWidth: rect.width,
        rectHeight: rect.height,
      };
      try {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}
    } else {
      setSelectedLayer(null);
    }
  };

  // Window-level pointer listeners for 60fps tracking across all screen sizes and fullscreen
  useEffect(() => {
    const handleWindowPointerMove = (e: PointerEvent) => {
      const tracking = dragTrackingRef.current;
      if (!tracking) {
        // Hover detection when not dragging
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          if (
            rect.width > 0 &&
            rect.height > 0 &&
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          ) {
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const px = (e.clientX - rect.left) * scaleX;
            const py = (e.clientY - rect.top) * scaleY;
            const hoverKey = checkKeys.find((k) => {
              const b = getLayerBounds(k, canvas.width, canvas.height, currentLayers);
              return b && px >= b.left && px <= b.right && py >= b.top && py <= b.bottom;
            });
            setHoveredLayer(hoverKey || null);
          } else {
            setHoveredLayer(null);
          }
        }
        return;
      }

      // Actively dragging (Move, Resize, or Crop)
      const dx = (e.clientX - tracking.startClientX) / tracking.rectWidth;
      const dy = (e.clientY - tracking.startClientY) / tracking.rectHeight;

      if (tracking.mode === "move") {
        const newX = Math.max(0.04, Math.min(0.96, Number((tracking.startLayerX + dx).toFixed(4))));
        const newY = Math.max(0.04, Math.min(0.96, Number((tracking.startLayerY + dy).toFixed(4))));
        updateCurrentLayer(tracking.layerKey, { x: newX, y: newY });
      } else if (tracking.mode === "resize") {
        if (tracking.handle === "e" || tracking.handle === "w") {
          // Horizontal edge handles: ONLY resize boxWidth! Font size remains unchanged
          const widthDelta = (tracking.handle === "e" ? dx : -dx) * 70;
          const currentBW = tracking.startBoxWidth || 45;
          const newBW = Math.max(18, Math.min(95, Number((currentBW + widthDelta).toFixed(1))));
          updateCurrentLayer(tracking.layerKey, { boxWidth: newBW });
        } else if (tracking.handle === "s" || tracking.handle === "n") {
          // Vertical edge handles: ONLY resize boxHeight! Font size remains unchanged
          const heightDelta = (tracking.handle === "s" ? dy : -dy) * 70;
          const currentBH = tracking.startBoxHeight || 20;
          const newBH = Math.max(6, Math.min(95, Number((currentBH + heightDelta).toFixed(1))));
          updateCurrentLayer(tracking.layerKey, { boxHeight: newBH });
        } else {
          // Corner handles ("se", "sw", "ne", "nw"): scale Font Size
          let delta = 0;
          if (tracking.handle === "se") delta = (dx + dy) / 2;
          else if (tracking.handle === "sw") delta = (-dx + dy) / 2;
          else if (tracking.handle === "ne") delta = (dx - dy) / 2;
          else if (tracking.handle === "nw") delta = (-dx - dy) / 2;
          else delta = (dx + dy) / 2;

          const scaleFactor = delta * 40;
          const newSize = Math.max(0.5, Math.min(70, Number((tracking.startSize + scaleFactor).toFixed(1))));
          updateCurrentLayer(tracking.layerKey, { size: newSize });
        }
      } else if (tracking.mode === "crop") {
        const inset = { ...tracking.startCropInset };
        const pctX = dx * 100;
        const pctY = dy * 100;
        if (tracking.handle === "e") {
          inset.right = Math.max(0, Math.min(85, Math.round(tracking.startCropInset.right - pctX)));
        } else if (tracking.handle === "w") {
          inset.left = Math.max(0, Math.min(85, Math.round(tracking.startCropInset.left + pctX)));
        } else if (tracking.handle === "s") {
          inset.bottom = Math.max(0, Math.min(85, Math.round(tracking.startCropInset.bottom - pctY)));
        } else if (tracking.handle === "n") {
          inset.top = Math.max(0, Math.min(85, Math.round(tracking.startCropInset.top + pctY)));
        } else if (tracking.handle === "se") {
          inset.right = Math.max(0, Math.min(85, Math.round(tracking.startCropInset.right - pctX)));
          inset.bottom = Math.max(0, Math.min(85, Math.round(tracking.startCropInset.bottom - pctY)));
        } else if (tracking.handle === "sw") {
          inset.left = Math.max(0, Math.min(85, Math.round(tracking.startCropInset.left + pctX)));
          inset.bottom = Math.max(0, Math.min(85, Math.round(tracking.startCropInset.bottom - pctY)));
        } else if (tracking.handle === "ne") {
          inset.right = Math.max(0, Math.min(85, Math.round(tracking.startCropInset.right - pctX)));
          inset.top = Math.max(0, Math.min(85, Math.round(tracking.startCropInset.top + pctY)));
        } else if (tracking.handle === "nw") {
          inset.left = Math.max(0, Math.min(85, Math.round(tracking.startCropInset.left + pctX)));
          inset.top = Math.max(0, Math.min(85, Math.round(tracking.startCropInset.top + pctY)));
        }
        updateCurrentLayer(tracking.layerKey, { cropInset: inset });
      }
    };

    const handleWindowPointerUp = () => {
      if (dragTrackingRef.current) {
        dragTrackingRef.current = null;
        setIsDragging(false);
      }
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
    };
  }, [currentLayers, activeRatio, getLayerBounds]);

  // Press ESC to exit Fullscreen Stage Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreenStage) {
        setIsFullscreenStage(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreenStage]);

  // Auto-collapse sidebars on narrower displays so stage has generous room
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        if (window.innerWidth < 1250) {
          setLeftPanelOpen(false);
        }
        if (window.innerWidth < 960) {
          setRightPanelOpen(false);
        }
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Save Template (All 4 Aspect Ratios Together) ─────────────────────────────
  const handleSaveTemplate = async (isSaveAsNew = false) => {
    setSaving(true);
    showToast("💾 Saving all 4 aspect ratios together...");
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") || "" : "";

      const nameToSave = isSaveAsNew ? `${templateName} (Copy)` : templateName;
      const targetNumericId: number = isSaveAsNew
        ? getNextTemplateId()
        : (typeof currentDisplayId === "number" ? currentDisplayId : Number(currentDisplayId) || getNextTemplateId());
      if (isSaveAsNew) {
        setActiveTemplateNumber(targetNumericId);
      }

      // Always save all 4 ratio configs together under this template ID
      const payload = {
        templateName: nameToSave,
        templateId: targetNumericId,
        aspectRatio: activeRatio,       // primary/active ratio
        videoDuration: duration || 10,
        musicUrl: musicMode === "none" ? "" : (musicUrl || `/audio/presets/${selectedPresetId}.mp3`),
        fps,
        resolution,
        layers: currentLayers,          // active ratio layers (for backward compat)
        aspectStore: aspectLayers,      // ← ALL 4 ratios: 9:16, 16:9, 1:1, 4:5
        backgroundUrl: aspectBackgrounds[activeRatio] || bgImageUrl,
        aspectBackgrounds,
        bgType,
        bgColor,
        bgGradIndex,
        logoUrl: logoImageUrl,
        productUrl: productImageUrl,
        offerType,
        animationStyle,
        animation: { enabled: animationStyle !== "static", style: animationStyle },
        aiStyle,
        aiColorTheme,
        decorations,
        status: "Active",
        userId,
      };

      const targetId = isSaveAsNew ? null : templateId;
      const method = targetId ? "PUT" : "POST";
      const url = targetId ? `/api/video-template/${targetId}` : "/api/video-template";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        if (data.data?._id) setTemplateId(data.data._id);
        else if (data.templateId) setTemplateId(data.templateId);
        const assignedId = Number(data.data?.templateId || data.id || targetNumericId);
        setActiveTemplateNumber(assignedId);
        if (isSaveAsNew) setTemplateName(nameToSave);
        showToast(
          isSaveAsNew
            ? `✨ Saved as new template #${assignedId} with all 4 aspect ratios!`
            : `✅ Template #${assignedId} updated — all 4 ratios saved`
        );
        fetchTemplates();
      } else {
        showToast(data.message || "Failed to save template");
      }
    } catch {
      showToast("Network error while saving template");
    } finally {
      setSaving(false);
    }
  };

  // ── Load Template for Editing ───────────────────────────────────────────────
  const handleEditTemplate = (tpl: SavedTemplateItem, preferRatio?: AspectRatio) => {
    setTemplateId(tpl._id);
    setActiveTemplateNumber(tpl.templateId ? Number(tpl.templateId) : (savedTemplatesList.indexOf(tpl) + 1));
    setTemplateName(tpl.templateName);
    if (tpl.offerType) setOfferType(tpl.offerType);
    if (tpl.decorations && Array.isArray(tpl.decorations)) setDecorations(tpl.decorations);
    else setDecorations([]);
    const tplDur = Number(tpl.videoDuration || (tpl as any).video_duration || (tpl as any).duration);
    if (tplDur && !isNaN(tplDur)) setDuration(tplDur);

    const targetRatio: AspectRatio = preferRatio || initialRatio || (tpl.aspectRatio && ["9:16", "16:9", "1:1", "4:5"].includes(tpl.aspectRatio) ? tpl.aspectRatio as AspectRatio : "16:9");
    setActiveRatio(targetRatio);

    // Helper to deeply sanitize and merge layers ensuring type: "text" is never missing
    const sanitizeLayers = (layersObj: any, ratio: AspectRatio): LayersConfig => {
      const base = { ...DEFAULT_LAYERS[ratio] };
      if (!layersObj || typeof layersObj !== "object") return base;
      const merged: any = { ...base };
      for (const [key, val] of Object.entries(layersObj)) {
        if (val && typeof val === "object") {
          const def = (base as any)[key] || {};
          const layerType = (val as any).type || def.type || (key === "product" ? "product" : key === "logo" ? "logo" : "text");
          const cleanedVal: any = { ...val };
          if (key === "product") {
            // Strip legacy white card background on product so product photo is clean and unboxed
            if (cleanedVal.bgColor === "#ffffff" || cleanedVal.shape === "rounded") {
              cleanedVal.shape = "none";
              cleanedVal.bgMode = "transparent";
              cleanedVal.bgColor = "transparent";
            }
          }
          merged[key] = {
            ...def,
            ...cleanedVal,
            type: layerType,
          };
        }
      }
      return merged as LayersConfig;
    };

    // Merge saved aspectStore with DEFAULT_LAYERS to guarantee every ratio has complete layout positions & layer types
    if (tpl.aspectStore && typeof tpl.aspectStore === 'object') {
      const merged: Record<AspectRatio, LayersConfig> = {
        "9:16": sanitizeLayers(tpl.aspectStore["9:16"], "9:16"),
        "16:9": sanitizeLayers(tpl.aspectStore["16:9"], "16:9"),
        "1:1":  sanitizeLayers(tpl.aspectStore["1:1"],  "1:1"),
        "4:5":  sanitizeLayers(tpl.aspectStore["4:5"],  "4:5"),
      };
      setAspectLayers(merged);
    } else if (tpl.layers) {
      setAspectLayers((prev) => ({
        ...prev,
        [targetRatio]: sanitizeLayers({ ...prev[targetRatio], ...tpl.layers }, targetRatio),
      }));
    }

    if ((tpl as any).bgType) setBgType((tpl as any).bgType);
    if ((tpl as any).bgColor) setBgColor((tpl as any).bgColor);
    if (typeof (tpl as any).bgGradIndex === "number") setBgGradIndex((tpl as any).bgGradIndex);

    if (tpl.aspectBackgrounds && typeof tpl.aspectBackgrounds === "object") {
      setAspectBackgrounds(tpl.aspectBackgrounds);
      if (tpl.aspectBackgrounds[targetRatio]) {
        setBgImageUrl(tpl.aspectBackgrounds[targetRatio]);
      }
      setBgType("image");
    } else if (tpl.backgroundUrl) {
      setBgImageUrl(tpl.backgroundUrl);
      setAspectBackgrounds({
        "9:16": tpl.backgroundUrl,
        "16:9": tpl.backgroundUrl,
        "1:1": tpl.backgroundUrl,
        "4:5": tpl.backgroundUrl,
      });
      setBgType("image");
    }
    if (tpl.logoUrl) setLogoImageUrl(tpl.logoUrl);
    if (tpl.productUrl) setProductImageUrl(tpl.productUrl);
    const tplMusic = tpl.musicUrl || (tpl as any).music_url || "";
    if (tplMusic) {
      setMusicUrl(tplMusic);
      const matched = DEMO_AUDIO_TUNES.find(d => d.url === tplMusic || tplMusic.includes(d.id));
      if (matched) {
        setMusicMode("preset");
        setSelectedPresetId(matched.id);
      } else {
        setMusicMode("upload");
      }
    } else {
      setMusicMode("preset");
      setSelectedPresetId("upbeat_retail");
      setMusicUrl("/audio/presets/upbeat_retail.mp3");
    }
    if (tpl.animationStyle) setAnimationStyle(tpl.animationStyle);
    else if (tpl.animation && tpl.animation.style) setAnimationStyle(tpl.animation.style);

    setActiveTab("studio");
    showToast(`✏️ Loaded "${tpl.templateName}" into visual editor!`);
  };

  useEffect(() => {
    const queryId = typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("templateId") || new URLSearchParams(window.location.search).get("id")) : null;
    const queryRatio = typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("ratio") as AspectRatio) : undefined;
    const targetId = initialTemplateId || queryId;
    const targetRatio = initialRatio || queryRatio;

    if (!targetId) return;

    if (savedTemplatesList.length > 0) {
      const match = savedTemplatesList.find(
        (x) => x._id === targetId || String(x.templateId) === String(targetId)
      );
      if (match) {
        handleEditTemplate(match, targetRatio);
        return;
      }
    }
    // Fetch directly by ID or numeric templateId if not in memory
    const fetchDirect = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
        const res = await fetch(`/api/video-template/${targetId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.data) {
          handleEditTemplate(data.data, targetRatio);
        }
      } catch {
        // ignore
      }
    };
    fetchDirect();
  }, [initialTemplateId, initialRatio, savedTemplatesList]);

  // ── Delete Template ─────────────────────────────────────────────────────────
  const handleDeleteTemplate = async (tpl: SavedTemplateItem) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
      const res = await fetch(`/api/video-template/${tpl._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        showToast(`🗑️ Template "${tpl.templateName}" deleted.`);
        setDeletingTemplate(null);
        if (templateId === tpl._id) {
          setTemplateId(null);
          setTemplateName("New Untitled Template");
        }
        fetchTemplates();
      } else {
        showToast(data.message || "Failed to delete template");
      }
    } catch {
      showToast("Network error while deleting template");
    }
  };

  // ── Open Create Template Modal ─────────────────────────────────────────────
    // ── Start Fresh New Template Session (Auto-assigns next sequential ID) ──
  const handleStartNewTemplateSession = () => {
    const nextId = getNextTemplateId();
    setTemplateId(null);
    setActiveTemplateNumber(nextId);
    setTemplateName(`Custom Video Template ${nextId}`);
    setAspectLayers(DEFAULT_LAYERS);
    setDecorations([]);
    setSelectedLayer(null);
    setSelectedDecorId(null);
    setActiveTab("studio");
    showToast(`✨ Started Template #${nextId}. Click "+ Save As New (#${nextId})" when ready!`);
  };

  const handleOpenCreateModal = () => {
    const nextId = getNextTemplateId();
    setNewTplName(`Custom Video Template ${nextId}`);
    setNewTplDuration(10);
    setNewTplRatio("9:16");
    setNewTplOfferType("Flash Sale");
    setShowCreateModal(true);
  };

  // ── Confirm Create Template (User Enters Name & Duration) ───────────────────
  const handleConfirmCreateTemplate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const nextId = getNextTemplateId();
    const finalName = newTplName.trim() || `Custom Video Template ${nextId}`;
    setShowCreateModal(false);

    // Immediately update active display ID to the newly created template's sequential ID!
    setActiveTemplateNumber(nextId);
    setTemplateId(null);
    setTemplateName(finalName);
    setDuration(newTplDuration);
    setActiveRatio(newTplRatio);
    setOfferType(newTplOfferType);
    setAspectLayers(DEFAULT_LAYERS);
    setBgImageUrl("");
    setBgType("gradient");
    setLogoImageUrl("");
    setActiveTab("studio");

    // Auto-persist to backend with the assigned sequential templateId
    // All 4 aspect ratio layouts (9:16, 16:9, 1:1, 4:5) are saved together
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") || "" : "";
      const res = await fetch("/api/video-template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          templateName: finalName,
          templateId: nextId,
          aspectRatio: newTplRatio,          // primary ratio
          videoDuration: newTplDuration,
          offerType: newTplOfferType,
          animationStyle,
          animation: { enabled: animationStyle !== "static", style: animationStyle },
          layers: DEFAULT_LAYERS[newTplRatio], // active ratio layers
          aspectStore: DEFAULT_LAYERS,          // ← ALL 4 default ratio layouts
          status: "Active",
          userId,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setTemplateId(data.data._id);
        const assignedId = Number(data.data.templateId || data.id || nextId);
        setActiveTemplateNumber(assignedId);
        showToast(`✨ Created "${finalName}" #${assignedId} — All 4 ratios initialized (9:16 · 16:9 · 1:1 · 4:5)`);
        fetchTemplates();
      } else {
        showToast(`✨ Started "${finalName}" #${nextId} — 4 ratio layouts ready`);
      }
    } catch {
      showToast(`✨ Started "${finalName}" #${nextId} — 4 ratio layouts ready`);
    }
  };

  // ── Direct Video Render ─────────────────────────────────────────────────────
  const handleRenderVideo = async (renderPack = false) => {
    setRendering(true);
    setRenderProgress("Queuing render job...");
    setRenderedVideoUrl(null);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") || "" : "";

      const currentBg = aspectBackgrounds[activeRatio] || bgImageUrl || "";
      const payload = {
        template_id: templateId || (activeTemplateNumber ? String(activeTemplateNumber) : "1"),
        userId,
        product_url: productImageUrl,
        background_url: currentBg,
        aspect_backgrounds: aspectBackgrounds,
        aspect_store: aspectLayers,
        headline: currentLayers.headline?.text || "Mega Weekend Flash Sale",
        discount: currentLayers.discount?.text || "50% OFF",
        description: currentLayers.description?.text || "Exclusive In-Store Deals",
        validity: currentLayers.validity?.text || "Valid Till Sunday",
        footer: currentLayers.footer?.text || "*T&C Apply · StoreSparc Video",
        ratio: activeRatio,
        duration,
        resolution,
        fps,
        music_volume: musicVolume,
        batchSpawn: renderPack, // render all 4 ratios if pack is requested
        layers: currentLayers,
        decorations,
        price: currentLayers.price?.text || "",
        old_price: currentLayers.oldPrice?.text || "",
        cta: currentLayers.cta?.text || "",
      };

      const res = await fetch("/api/external/video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success || !data.job_id) {
        showToast(data.message || "Failed to start render job");
        setRendering(false);
        return;
      }

      const jobId = data.job_id;
      setRenderJobId(jobId);
      setRenderProgress("Encoding video frames with FFmpeg...");

      const pollTimer = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/external/video/${jobId}`);
          const pollData = await pollRes.json();

          if (pollData.success && pollData.status === "completed") {
            clearInterval(pollTimer);
            setRendering(false);
            setRenderedVideoUrl(pollData.url);
            showToast("🎉 Video successfully rendered!");
          } else if (pollData.status === "failed") {
            clearInterval(pollTimer);
            setRendering(false);
            showToast(pollData.error || "Rendering failed");
          } else {
            setRenderProgress(`Rendering (${pollData.status || "processing"})...`);
          }
        } catch {
          // keep polling
        }
      }, 1500);
    } catch {
      setRendering(false);
      showToast("Error connecting to render engine");
    }
  };

  // ── Asset Upload ────────────────────────────────────────────────────────────
  const handleUploadFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "product" | "logo" | "background" | "music" | "decor"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);

    try {
      showToast(`Uploading ${type}...`);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success && data.url) {
        if (type === "product") setProductImageUrl(data.url);
        if (type === "logo") setLogoImageUrl(data.url);
        if (type === "background") {
          setBgImageUrl(data.url);
          setAspectBackgrounds((prev) => ({
            ...prev,
            [activeRatio]: data.url,
          }));
          setBgType("image");
          showToast(`✅ Background image updated for ${activeRatio}!`);
        }
        if (type === "music") setMusicUrl(data.url);
        if (type === "decor") {
          setDecorations((prev) => [
            ...prev,
            { id: `dec_${Date.now()}`, url: data.url, x: 0.85, y: 0.15, size: 14 },
          ]);
        }
        showToast(`✅ ${type} uploaded!`);
      } else {
        showToast("Upload failed");
      }
    } catch {
      showToast("Network error uploading file");
    }
  };

  const selectedLayerData = selectedLayer ? currentLayers[selectedLayer] : null;
  const isTextLayer = Boolean(selectedLayer && selectedLayer !== "product" && selectedLayer !== "logo");

  return (
    <div className="ste-root">
      {/* ── Audio elements for music ── */}
      {musicUrl && <audio ref={audioRef} src={musicUrl} loop />}
      <audio
        ref={previewAudioRef}
        preload="auto"
        onEnded={() => setPreviewingTuneId(null)}
        onPause={() => {
          if (previewAudioRef.current?.paused) setPreviewingTuneId(null);
        }}
      />

      {/* ── Toast ── */}
      {toastMessage && <div className="ste-toast">{toastMessage}</div>}
      {/* ── Header Topbar ── */}
      <header className="ste-topbar">
        <div className="ste-topbar__left" style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, minWidth: 0 }}>
          {onNavigate && (
            <button
              className="ste-back-btn"
              onClick={() => onNavigate("dashboard")}
              title="Back to Dashboard"
              style={{ width: "32px", height: "32px", borderRadius: "6px", flexShrink: 0 }}
            >
              <FaArrowLeft size={13} />
            </button>
          )}

          <div className="ste-title-group" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "nowrap", flexShrink: 0 }}>
            <span className="ste-badge" style={{ whiteSpace: "nowrap", flexShrink: 0, padding: "4px 8px", fontSize: "0.70rem" }}>
              STORESPARC STUDIO
            </span>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                background: "rgba(17, 181, 187, 0.15)",
                border: "1px solid rgba(17, 181, 187, 0.4)",
                padding: "3px 8px",
                borderRadius: "6px",
                fontSize: "0.76rem",
                fontFamily: "monospace",
                color: "#11B5BB",
                fontWeight: 800,
                whiteSpace: "nowrap",
                flexShrink: 0,
                lineHeight: 1,
              }}
              title="Current Template ID"
            >
              Template #{currentDisplayId}
            </span>

            <div className="ste-topbar-name-block" style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#11B5BB", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "3px" }}>
                <FaPen size={9} /> Name:
              </span>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="ste-template-name-input"
                style={{ height: "28px", padding: "3px 8px", fontSize: "0.80rem", width: "160px", borderRadius: "6px" }}
                placeholder="Enter template name..."
                title="Click to edit template name"
              />
            </div>
          </div>
        </div>

        {/* Studio Tabs — Clean single-line pills */}
        <div className="ste-mode-tabs" style={{ display: "flex", alignItems: "center", gap: "3px", padding: "3px", borderRadius: "8px", flexShrink: 0 }}>
          <button
            className={`ste-mode-tab ${activeTab === "studio" ? "active" : ""}`}
            onClick={() => setActiveTab("studio")}
            style={{ whiteSpace: "nowrap", padding: "5px 12px", fontSize: "0.78rem" }}
          >
            <FaPen size={11} /> <span>Canvas Editor</span>
          </button>
          <button
            className={`ste-mode-tab ${activeTab === "grid" ? "active" : ""}`}
            onClick={() => { syncTextToAllRatios(); setActiveTab("grid"); }}
            style={{ whiteSpace: "nowrap", padding: "5px 12px", fontSize: "0.78rem" }}
          >
            <FaTableCells size={11} /> <span>4 Ratios Grid</span>
          </button>
          <button
            className={`ste-mode-tab ${activeTab === "library" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("library");
              fetchTemplates();
            }}
            style={{ whiteSpace: "nowrap", padding: "5px 12px", fontSize: "0.78rem" }}
          >
            <FaBookOpen size={11} /> <span>Library ({savedTemplatesList.length})</span>
          </button>
        </div>

        {/* Action Buttons — Clean, single-row, no overflow */}
        <div className="ste-topbar__right" style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <button
            type="button"
            className={`ste-btn ste-topbar-btn ${isPlaying ? "ste-btn--danger" : "ste-btn--accent"}`}
            onClick={togglePlay}
            title={isPlaying ? "Pause Preview Animation (Space)" : "Play Live Video Preview with Setted Animations"}
            style={{
              fontWeight: 700,
              gap: "5px",
              padding: "6px 12px",
              fontSize: "0.78rem",
              whiteSpace: "nowrap",
              boxShadow: isPlaying ? "0 0 10px rgba(239, 68, 68, 0.4)" : "0 0 10px rgba(240, 90, 40, 0.35)",
            }}
          >
            {isPlaying ? <FaPause size={10} /> : <FaPlay size={10} />}
            <span className="ste-btn-label">{isPlaying ? "Pause" : "Preview"}</span>
          </button>

          <button
            className="ste-btn ste-topbar-btn ste-btn--secondary"
            onClick={() => handleSaveTemplate(false)}
            disabled={saving}
            title={templateId ? `Update Template #${currentDisplayId} with all changes` : `Save as Template #${currentDisplayId}`}
            style={{ padding: "6px 12px", fontSize: "0.78rem", whiteSpace: "nowrap" }}
          >
            {saving ? <FaSpinner className="ste-spin" size={10} /> : <FaFloppyDisk size={10} />}
            <span className="ste-btn-label">{saving ? "Saving..." : (templateId ? `Update #${currentDisplayId}` : `Save Template #${currentDisplayId}`)}</span>
          </button>

          <button
            className="ste-btn ste-topbar-btn ste-btn--primary"
            onClick={() => handleSaveTemplate(true)}
            disabled={saving}
            title={`Save as a brand new template copy with ID #${getNextTemplateId()}`}
            style={{ fontWeight: 700, padding: "6px 12px", fontSize: "0.78rem", whiteSpace: "nowrap" }}
          >
            <FaCopy size={10} />
            <span className="ste-btn-label">Save As Copy</span>
          </button>

          <button
            className="ste-btn ste-topbar-btn ste-btn--accent"
            onClick={() => handleRenderVideo(false)}
            disabled={rendering}
            title="Generate &amp; Render MP4 Video"
            style={{ padding: "6px 14px", fontSize: "0.78rem", whiteSpace: "nowrap" }}
          >
            {rendering ? <FaSpinner className="ste-spin" size={10} /> : <FaVideo size={10} />}
            <span className="ste-btn-label">{rendering ? renderProgress : "Generate MP4"}</span>
          </button>
        </div>
      </header>

      {/* ── Main Workspace ── */}
      {activeTab === "library" ? (
        /* ══════════════ TAB: SAVED TEMPLATES LIBRARY ══════════════ */
        <div className="ste-library-view">
          <div className="ste-library-header">
            <div>
              <h2>Template Library</h2>
              <p>Browse, preview, edit, duplicate, or delete your custom video templates</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, maxWidth: "360px", margin: "0 20px" }}>
              <input
                type="text"
                placeholder="🔍 Search templates by name, offer..."
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                className="ste-input"
                style={{ padding: "8px 14px", borderRadius: "8px" }}
              />
              {librarySearch && (
                <button
                  className="ste-btn ste-btn--ghost ste-btn--sm"
                  onClick={() => setLibrarySearch("")}
                >
                  Clear
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="ste-btn ste-btn--secondary" onClick={fetchTemplates}>
                <FaRotateRight /> Refresh List
              </button>
              <button className="ste-btn ste-btn--primary" onClick={handleOpenCreateModal}>
                <FaPlus /> Create New Template
              </button>
            </div>
          </div>

          {loadingList ? (
            <div className="ste-loading-wrap">
              <FaSpinner className="ste-spin" style={{ fontSize: "2rem", color: "#11B5BB" }} />
              <p>Loading your templates...</p>
            </div>
          ) : savedTemplatesList.length === 0 ? (
            <div className="ste-empty-box">
              <FaBookOpen style={{ fontSize: "3rem", opacity: 0.4 }} />
              <h3>No templates found</h3>
              <p>Create your first custom video template by entering a template name and duration.</p>
              <button className="ste-btn ste-btn--primary" onClick={handleOpenCreateModal}>
                <FaPlus /> Start First Template
              </button>
            </div>
          ) : (
            <div className="ste-table-wrap">
              <table className="ste-table">
                <thead>
                  <tr>
                    <th style={{ width: "120px" }}>Template ID</th>
                    <th>Template Name</th>
                    <th>Aspect Ratio</th>
                    <th>Duration</th>
                    <th>Offer Type</th>
                    <th>Status</th>
                    <th>Last Modified</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {savedTemplatesList
                    .filter((tpl) => {
                      if (!librarySearch.trim()) return true;
                      const q = librarySearch.toLowerCase();
                      return (
                        tpl.templateName.toLowerCase().includes(q) ||
                        (tpl.offerType || "").toLowerCase().includes(q) ||
                        (tpl.templateDescription || "").toLowerCase().includes(q) ||
                        (tpl.aspectRatio || "").toLowerCase().includes(q) ||
                        String(tpl.templateId || "").includes(q)
                      );
                    })
                    .map((tpl, idx) => {
                      const displayId = tpl.templateId || (idx + 1);
                      const isCurrent = templateId === tpl._id || String(templateId) === String(displayId);
                      return (
                        <tr key={tpl._id} className={isCurrent ? "is-active-row" : ""}>
                          <td>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                background: "rgba(17, 181, 187, 0.15)",
                                border: "1px solid rgba(17, 181, 187, 0.4)",
                                padding: "4px 9px",
                                borderRadius: "6px",
                                fontSize: "0.82rem",
                                fontFamily: "monospace",
                                color: "#11B5BB",
                                fontWeight: 800,
                                cursor: "pointer",
                              }}
                              onClick={() => {
                                navigator.clipboard.writeText(String(displayId));
                                showToast(`Copied Template ID: #${displayId}`);
                              }}
                              title="Click to copy Template ID"
                            >
                              <span>#{displayId}</span>
                              <FaCopy size={10} />
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <strong style={{ color: "#fff", fontSize: "0.95rem" }}>
                                  {tpl.templateName}
                                </strong>
                                <button
                                  className="ste-btn ste-btn--ghost ste-btn--sm"
                                  style={{ padding: "2px 6px", fontSize: "0.7rem", color: "#11B5BB" }}
                                  onClick={() => {
                                    setRenamingTemplate(tpl);
                                    setRenameInput(tpl.templateName);
                                  }}
                                  title="Rename this template"
                                >
                                  <FaPen size={9} /> Rename
                                </button>
                              </div>
                              {isCurrent && (
                                <span style={{ fontSize: "0.7rem", color: "#11B5BB", fontWeight: 700 }}>
                                  ● Currently Loaded in Canvas Editor
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="ste-badge-chip">{tpl.aspectRatio || "9:16"}</span>
                          </td>
                          <td>
                            <strong style={{ color: "#fff" }}>{tpl.videoDuration || 10}s</strong>
                          </td>
                      <td>{tpl.offerType || "Flash Sale"}</td>
                      <td>
                        <span className="ste-badge-soft">{tpl.status || "Active"}</span>
                      </td>
                      <td style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
                        {tpl.updatedAt ? new Date(tpl.updatedAt).toLocaleDateString() : "—"}
                      </td>
                      <td>
                        <div className="ste-actions-cell">
                          {/* 1. View Option */}
                          {tpl.lastRenderedVideoUrl && (
                            <button
                              className="ste-action-btn"
                              style={{ background: "rgba(240, 90, 40, 0.2)", color: "#F05A28", border: "1px solid rgba(240, 90, 40, 0.4)", fontWeight: 700 }}
                              title="Watch Latest Rendered Ad Video"
                              onClick={() => setRenderedVideoUrl(tpl.lastRenderedVideoUrl || null)}
                            >
                              <FaPlay /> <span>Ad Video</span>
                            </button>
                          )}
                          <button
                            className="ste-action-btn ste-action-btn--view"
                            title="View Full Template Configuration"
                            onClick={() => setViewingTemplate(tpl)}
                          >
                            <FaEye /> <span>View</span>
                          </button>

                          {/* 2. Edit Option */}
                          <button
                            className="ste-action-btn ste-action-btn--edit"
                            title="Load and Edit in Canvas Studio"
                            onClick={() => handleEditTemplate(tpl)}
                          >
                            <FaPen /> <span>Edit</span>
                          </button>

                          {/* 3. Social Media Schedule */}
                          {onNavigate && (
                            <button
                              className="ste-action-btn"
                              style={{ background: "rgba(37, 99, 235, 0.2)", color: "#93C5FD", border: "1px solid rgba(147, 197, 253, 0.3)" }}
                              title="Schedule to Social Media"
                              onClick={() => onNavigate("socialScheduler", { templateId: tpl._id })}
                            >
                              <FaCalendarDays /> <span>Social</span>
                            </button>
                          )}

                          {/* Rename Option */}
                          <button
                            className="ste-action-btn"
                            style={{ background: "rgba(17, 181, 187, 0.12)", color: "#11B5BB" }}
                            title="Rename Template"
                            onClick={() => {
                              setRenamingTemplate(tpl);
                              setRenameInput(tpl.templateName);
                            }}
                          >
                            <FaPen /> <span>Rename</span>
                          </button>

                          {/* 4. Duplicate Option */}
                          <button
                            className="ste-action-btn"
                            style={{ background: "rgba(255,255,255,0.08)", color: "#cbd5e1" }}
                            title="Duplicate this template"
                            onClick={() => {
                              handleEditTemplate(tpl);
                              handleSaveTemplate(true);
                            }}
                          >
                            <FaCopy /> <span>Copy</span>
                          </button>

                          {/* 5. Delete Option */}
                          <button
                            className="ste-action-btn ste-action-btn--delete"
                            title="Delete Template Permanently"
                            onClick={() => setDeletingTemplate(tpl)}
                          >
                            <FaTrash /> <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === "grid" ? (
        /* ══════════════ TAB: ALL 4 RATIOS SYNCHRONIZED GRID ══════════════ */
        <div className="ste-grid-view">
          <div className="ste-grid-toolbar">
            <div>
              <h3>All 4 Aspect Ratios (Synchronized Preview)</h3>
              <p>Watch your animation playback simultaneously across all screen formats</p>
            </div>
            <div className="ste-playback-controls" style={{ background: "#0B2830", padding: "8px 16px", borderRadius: "10px" }}>
              <button
                className="ste-ctrl-btn ste-ctrl-btn--play"
                onClick={togglePlay}
                title={isPlaying ? "Pause" : "Play Animations"}
              >
                {isPlaying ? <FaPause /> : <FaPlay />}
              </button>
              <button className="ste-ctrl-btn" onClick={handleReplay} title="Replay">
                <FaRotateRight />
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: "220px" }}>
                <span className="ste-time-label">{playbackTime.toFixed(1)}s</span>
                <input
                  type="range"
                  min="0"
                  max={duration}
                  step="0.05"
                  value={playbackTime}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setPlaybackTime(Number(e.target.value));
                  }}
                  className="ste-scrub-input"
                />
                <span className="ste-time-label">{duration}s</span>
              </div>
            </div>
          </div>

          <div className="ste-aspect-tiles-grid">
            {(["16:9", "9:16", "1:1", "4:5"] as AspectRatio[]).map((r) => (
              <div key={r} className="ste-aspect-tile-card">
                <div className="ste-aspect-tile-head">
                  <span className="ste-aspect-tile-label">{ASPECT_SPECS[r].label}</span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      className="ste-btn ste-btn--secondary ste-btn--sm"
                      onClick={() => {
                        setActiveRatio(r);
                        setActiveTab("studio");
                        setIsFullscreenStage(false);
                      }}
                      title="Edit in Studio Editor"
                    >
                      <FaPen /> Edit
                    </button>
                    <button
                      className="ste-btn ste-btn--primary ste-btn--sm"
                      onClick={() => {
                        setActiveRatio(r);
                        setActiveTab("studio");
                        setIsFullscreenStage(true);
                      }}
                      title="Edit in Fullscreen Responsive Stage"
                    >
                      <FaExpand /> Full Screen
                    </button>
                  </div>
                </div>
                <div className="ste-tile-canvas-wrap">
                  <div
                    className="ste-tile-canvas-viewport"
                    style={{
                      aspectRatio: `${ASPECT_SPECS[r].width} / ${ASPECT_SPECS[r].height}`,
                    }}
                  >
                    <canvas
                      ref={(el) => {
                        gridCanvases.current[r] = el;
                      }}
                      className="ste-tile-canvas"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ══════════════ TAB: CANVAS STUDIO ══════════════ */
        <div className="ste-workspace">
          {/* ── Left Rail: Storesparc Video Controls ── */}
          <aside className={`ste-panel ste-panel--assets ${!leftPanelOpen ? "ste-panel--collapsed" : ""}`}>
            <div className="ste-panel__header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FaLayerGroup />
                <h4>Template Specifications</h4>
              </div>
              <button
                className="ste-panel-collapse-btn"
                onClick={() => setLeftPanelOpen(false)}
                title="Collapse Specifications Panel"
              >
                <FaChevronLeft size={11} />
              </button>
            </div>

            <div className="ste-panel__body">
              {/* Template Name & ID */}
              <div className="ste-field-group">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label className="ste-label">Template Name</label>
                  <span style={{ fontSize: "0.72rem", color: "#11B5BB", fontWeight: 800, fontFamily: "monospace" }}>
                    ID: #{currentDisplayId}
                  </span>
                </div>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    className="ste-input"
                    style={{ paddingRight: "30px", fontWeight: 600, color: "#fff", background: "#06181d", borderColor: "rgba(17,181,187,0.4)" }}
                    placeholder="Enter template name..."
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                  <FaPen
                    size={11}
                    style={{
                      position: "absolute",
                      right: "10px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#11B5BB",
                      pointerEvents: "none",
                      opacity: 0.8,
                    }}
                  />
                </div>
                <span className="ste-sublabel">Enter or edit the name for this video template.</span>
                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  <button
                    type="button"
                    className="ste-btn ste-btn--secondary ste-btn--sm"
                    style={{ width: "100%", padding: "5px 10px", fontSize: "0.75rem", color: "#11B5BB", justifyContent: "center" }}
                    onClick={() => {
                      showToast(`Template name saved as "${templateName}"`);
                    }}
                  >
                    <FaCheck size={10} /> Set Name
                  </button>
                </div>
              </div>

              {/* Ratio Selector — All 4 saved together */}
              <div className="ste-field-group">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label className="ste-label" style={{ margin: 0 }}>Active Aspect Ratio</label>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    background: "rgba(17,181,187,0.15)", border: "1px solid rgba(17,181,187,0.35)",
                    borderRadius: "5px", padding: "2px 7px", fontSize: "0.62rem",
                    color: "#11B5BB", fontWeight: 800, letterSpacing: "0.03em"
                  }} title="All 4 aspect ratios are saved together under this template ID">
                    ✦ All 4 Saved Together
                  </span>
                </div>
                <div className="ste-ratio-chips" style={{ width: "100%", justifyContent: "space-between" }}>
                  {(["9:16", "16:9", "1:1", "4:5"] as AspectRatio[]).map((r) => (
                    <button
                      key={r}
                      className={`ste-ratio-chip ${activeRatio === r ? "ste-ratio-chip--active" : ""}`}
                      onClick={() => setActiveRatio(r)}
                      title={`Edit ${r} layout — ${ASPECT_SPECS[r].label}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                {/* Sync text content from current ratio to all other ratios */}
                <button
                  type="button"
                  onClick={syncTextToAllRatios}
                  style={{
                    marginTop: "8px",
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "6px 10px",
                    background: "rgba(17,181,187,0.12)",
                    border: "1px dashed rgba(17,181,187,0.5)",
                    borderRadius: "7px",
                    color: "#11B5BB",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  title={`Copy text content from ${activeRatio} to all other ratios (keeps each ratio's own positions)`}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(17,181,187,0.22)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(17,181,187,0.12)"; }}
                >
                  <FaArrowUpRightFromSquare size={11} />
                  Sync Text to All Ratios ({activeRatio} → others)
                </button>
                {/* Reset individual ratio */}
                <button
                  type="button"
                  onClick={() => resetRatioToDefault(activeRatio)}
                  style={{
                    marginTop: "5px",
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    padding: "5px 10px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px dashed rgba(255,255,255,0.15)",
                    borderRadius: "7px",
                    color: "#94a3b8",
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  title={`Reset ${activeRatio} layout to default positions`}
                >
                  <FaRotateRight size={10} />
                  Reset {activeRatio} to Default
                </button>
              </div>

              {/* Offer Type */}
              <div className="ste-field-group">
                <label className="ste-label">Offer Type</label>
                <select
                  value={offerType}
                  onChange={(e) => setOfferType(e.target.value)}
                  className="ste-select"
                >
                  {OFFER_TYPES.map((ot) => (
                    <option key={ot} value={ot}>{ot}</option>
                  ))}
                </select>
              </div>

              {/* AI Product Defaults Accordion */}
              <details className="ste-accordion">
                <summary className="ste-accordion__summary">
                  <FaWandMagicSparkles style={{ color: "#11B5BB" }} />
                  <span>AI Product Defaults</span>
                </summary>
                <div className="ste-accordion__content">
                  <div className="ste-field-group">
                    <label className="ste-label">Style</label>
                    <select
                      value={aiStyle}
                      onChange={(e) => setAiStyle(e.target.value)}
                      className="ste-select"
                    >
                      {AI_STYLES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="ste-field-group" style={{ marginTop: "10px" }}>
                    <label className="ste-label">Color Theme</label>
                    <select
                      value={aiColorTheme}
                      onChange={(e) => setAiColorTheme(e.target.value)}
                      className="ste-select"
                    >
                      {AI_COLOR_THEMES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      id="ai-trans-bg"
                      checked={aiTransparentBg}
                      onChange={(e) => setAiTransparentBg(e.target.checked)}
                      style={{ accentColor: "#11B5BB" }}
                    />
                    <label htmlFor="ai-trans-bg" style={{ fontSize: "0.8rem", color: "#cbd5e1", cursor: "pointer" }}>
                      Transparent background
                    </label>
                  </div>
                </div>
              </details>

              {/* Background Controls: Gradients | Solid Color | Background Image */}
              <div className="ste-field-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label className="ste-label" style={{ margin: 0 }}>
                    <FaImage /> Background
                  </label>
                  <span style={{ fontSize: "11px", color: "#11B5BB", fontWeight: 700 }}>
                    {bgType === "image" ? `Image (${activeRatio})` : (bgType === "color" ? "Solid Color" : "Gradient")}
                  </span>
                </div>

                {/* 3 Mode Switcher */}
                <div className="ste-btn-toggle" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", marginBottom: "10px" }}>
                  <button
                    className={`ste-btn-toggle__btn ${bgType === "gradient" ? "active" : ""}`}
                    onClick={() => setBgType("gradient")}
                    style={{ fontSize: "11px", padding: "6px 4px" }}
                  >
                    Gradients
                  </button>
                  <button
                    className={`ste-btn-toggle__btn ${bgType === "color" ? "active" : ""}`}
                    onClick={() => setBgType("color")}
                    style={{ fontSize: "11px", padding: "6px 4px" }}
                  >
                    Solid Color
                  </button>
                  <button
                    className={`ste-btn-toggle__btn ${bgType === "image" ? "active" : ""}`}
                    onClick={() => setBgType("image")}
                    style={{ fontSize: "11px", padding: "6px 4px" }}
                  >
                    Add BG Image
                  </button>
                </div>

                {/* Mode 1: Gradients */}
                {bgType === "gradient" && (
                  <div>
                    <div className="ste-gradient-presets" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                      {PRESET_GRADIENTS.map((p, idx) => (
                        <div
                          key={p.name}
                          className={`ste-grad-thumb ${bgGradIndex === idx ? "active" : ""}`}
                          style={{
                            background: p.grad,
                            height: "44px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            border: bgGradIndex === idx ? "2px solid #11B5BB" : "1px solid rgba(255,255,255,0.12)",
                            boxShadow: bgGradIndex === idx ? "0 0 10px rgba(17,181,187,0.4)" : "none",
                            transition: "all 0.2s"
                          }}
                          onClick={() => setBgGradIndex(idx)}
                          title={p.name}
                        />
                      ))}
                    </div>
                    <div style={{ marginTop: "6px", fontSize: "11px", color: "#94a3b8", textAlign: "center" }}>
                      Selected: <strong style={{ color: "#11B5BB" }}>{PRESET_GRADIENTS[bgGradIndex]?.name}</strong>
                    </div>
                  </div>
                )}

                {/* Mode 2: Solid Color */}
                {bgType === "color" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        style={{
                          width: "48px",
                          height: "38px",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          background: "transparent"
                        }}
                      />
                      <input
                        type="text"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="ste-input"
                        style={{ flex: 1, fontFamily: "monospace", textTransform: "uppercase" }}
                        placeholder="#0B2830"
                      />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                      {PRESET_SOLID_COLORS.map((c) => (
                        <button
                          key={c.color}
                          type="button"
                          onClick={() => setBgColor(c.color)}
                          style={{
                            height: "30px",
                            borderRadius: "5px",
                            background: c.color,
                            border: bgColor.toLowerCase() === c.color.toLowerCase() ? "2px solid #11B5BB" : "1px solid rgba(255,255,255,0.2)",
                            cursor: "pointer",
                          }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Mode 3: Background Image with Per-Aspect-Ratio Support */}
                {bgType === "image" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {/* Active Ratio Preview */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "8px",
                        background: "rgba(0,0,0,0.35)",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      <div
                        style={{
                          width: "56px",
                          height: "36px",
                          borderRadius: "4px",
                          overflow: "hidden",
                          background: "#1e293b",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {aspectBackgrounds[activeRatio] || bgImageUrl ? (
                          <img
                            src={aspectBackgrounds[activeRatio] || bgImageUrl}
                            alt="BG"
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <span style={{ fontSize: "9px", color: "#94a3b8" }}>No Image</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "#ffffff" }}>
                          {activeRatio} Background Image
                        </div>
                        <div style={{ fontSize: "10px", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {aspectBackgrounds[activeRatio] || bgImageUrl || "None (transparent/gradient)"}
                        </div>
                      </div>
                    </div>

                    {/* File Upload Box */}
                    <div className="ste-upload-box" style={{ padding: "8px" }}>
                      <input
                        type="file"
                        accept="image/*,.gif"
                        onChange={(e) => handleUploadFile(e, "background")}
                        id="ste-bg-upload"
                      />
                      <label htmlFor="ste-bg-upload" className="ste-upload-label" style={{ fontSize: "12px", gap: "6px" }}>
                        <FaImage /> Choose BG Image for {activeRatio}
                      </label>
                    </div>

                    {/* URL Input */}
                    <input
                      type="text"
                      placeholder="Or enter Image URL (https://...)"
                      value={aspectBackgrounds[activeRatio] || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAspectBackgrounds((prev) => ({ ...prev, [activeRatio]: val }));
                        setBgImageUrl(val);
                      }}
                      className="ste-input"
                      style={{ fontSize: "11px" }}
                    />

                    {/* Action Buttons: Remove & Apply All */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setAspectBackgrounds((prev) => ({ ...prev, [activeRatio]: "" }));
                          setBgImageUrl("");
                          setBgImgObj(null);
                          showToast(`🗑️ Background image removed for ${activeRatio}!`);
                        }}
                        style={{
                          padding: "7px 8px",
                          fontSize: "11px",
                          background: "rgba(239, 68, 68, 0.18)",
                          color: "#ef4444",
                          border: "1px solid rgba(239, 68, 68, 0.4)",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "5px",
                        }}
                      >
                        <FaTrash size={10} /> Clear Image
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const currentBg = aspectBackgrounds[activeRatio] || bgImageUrl || "";
                          setAspectBackgrounds({
                            "9:16": currentBg,
                            "16:9": currentBg,
                            "1:1": currentBg,
                            "4:5": currentBg,
                          });
                          showToast("✦ Background image applied to all 4 ratios!");
                        }}
                        style={{
                          padding: "7px 8px",
                          fontSize: "11px",
                          background: "rgba(255, 255, 255, 0.06)",
                          color: "#ffffff",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontWeight: 600,
                        }}
                        title="Copy this background image across 9:16, 16:9, 1:1, 4:5"
                      >
                        Apply to All Ratios
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Product Image */}
              <div className="ste-field-group">
                <label className="ste-label">Product Image</label>
                <div className="ste-upload-box">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadFile(e, "product")}
                    id="ste-prod-upload"
                  />
                  <label htmlFor="ste-prod-upload" className="ste-upload-label">
                    <FaImage /> Upload Product Image
                  </label>
                  {productImageUrl && (
                    <div className="ste-asset-preview">
                      <img src={productImageUrl} alt="Product" />
                    </div>
                  )}
                </div>
              </div>

              {/* Brand Logo */}
              <div className="ste-field-group">
                <label className="ste-label">Brand Logo</label>
                <div className="ste-upload-box">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadFile(e, "logo")}
                    id="ste-logo-upload"
                  />
                  <label htmlFor="ste-logo-upload" className="ste-upload-label">
                    <FaImage /> Upload Brand Logo
                  </label>
                  {logoImageUrl && (
                    <div className="ste-asset-preview">
                      <img src={logoImageUrl} alt="Logo" />
                    </div>
                  )}
                </div>
              </div>

              {/* Multi-Option Background Music & Demo Tunes */}
              <div className="ste-field-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label className="ste-label" style={{ margin: 0 }}>Background Music</label>
                  <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.06)", borderRadius: "6px", padding: "2px", gap: "2px" }}>
                    <button
                      type="button"
                      style={{
                        padding: "3px 8px",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        background: musicMode === "preset" ? "#11B5BB" : "transparent",
                        color: musicMode === "preset" ? "#0a192f" : "#cbd5e1",
                      }}
                      onClick={() => {
                        setMusicMode("preset");
                        const current = DEMO_AUDIO_TUNES.find(d => d.id === selectedPresetId) || DEMO_AUDIO_TUNES[0];
                        setMusicUrl(current.url);
                      }}
                    >
                      Demo Tunes
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: "3px 8px",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        background: musicMode === "upload" ? "#11B5BB" : "transparent",
                        color: musicMode === "upload" ? "#0a192f" : "#cbd5e1",
                      }}
                      onClick={() => setMusicMode("upload")}
                    >
                      Custom Upload
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: "3px 8px",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        background: musicMode === "none" ? "#ef4444" : "transparent",
                        color: musicMode === "none" ? "#ffffff" : "#94a3b8",
                      }}
                      onClick={() => {
                        setMusicMode("none");
                        setMusicUrl("");
                        if (audioRef.current) {
                          audioRef.current.pause();
                          setIsPlayingAudio(false);
                        }
                      }}
                    >
                      Mute
                    </button>
                  </div>
                </div>

                {/* 1. Demo Audio Presets List */}
                {musicMode === "preset" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
                    {DEMO_AUDIO_TUNES.map((tune) => {
                      const isSelected = selectedPresetId === tune.id;
                      const isPlayingThis = isPlayingAudio && previewingTuneId === tune.id;
                      return (
                        <div
                          key={tune.id}
                          onClick={() => {
                            setSelectedPresetId(tune.id);
                            setMusicUrl(tune.url);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            border: isSelected ? "1px solid #11B5BB" : "1px solid rgba(255,255,255,0.08)",
                            background: isSelected ? "rgba(17,181,187,0.12)" : "rgba(255,255,255,0.03)",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                            <span style={{ fontSize: "1.05rem" }}>{tune.icon}</span>
                            <div style={{ overflow: "hidden" }}>
                              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: isSelected ? "#11B5BB" : "#f1f5f9" }}>
                                {tune.name}
                              </div>
                              <div style={{ fontSize: "0.68rem", color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {tune.desc}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPresetId(tune.id);
                                setMusicUrl(tune.url);
                                if (!previewAudioRef.current) return;
                                if (previewingTuneId === tune.id && !previewAudioRef.current.paused) {
                                  previewAudioRef.current.pause();
                                  setPreviewingTuneId(null);
                                } else {
                                  if (audioRef.current) audioRef.current.pause();
                                  previewAudioRef.current.src = tune.url;
                                  previewAudioRef.current.volume = musicVolume / 100;
                                  previewAudioRef.current.currentTime = 0;
                                  previewAudioRef.current.play().then(() => {
                                    setPreviewingTuneId(tune.id);
                                  }).catch((err) => {
                                    console.warn('Playback error:', err);
                                  });
                                }
                              }}
                              style={{
                                padding: "4px 8px",
                                fontSize: "0.7rem",
                                borderRadius: "4px",
                                border: "none",
                                background: isPlayingThis ? "#ef4444" : "rgba(255,255,255,0.12)",
                                color: "#fff",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              {isPlayingThis ? <FaVolumeXmark size={11} /> : <FaVolumeHigh size={11} />}
                              <span>{isPlayingThis ? "Pause" : "Play"}</span>
                            </button>
                            <span
                              style={{
                                display: "inline-block",
                                width: "12px",
                                height: "12px",
                                borderRadius: "50%",
                                border: isSelected ? "3px solid #11B5BB" : "2px solid rgba(255,255,255,0.3)",
                                background: isSelected ? "#0a192f" : "transparent",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. Custom Upload Box */}
                {musicMode === "upload" && (
                  <div className="ste-upload-box">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => {
                        handleUploadFile(e, "music");
                        setSelectedPresetId("");
                      }}
                      id="ste-music-upload"
                    />
                    <label htmlFor="ste-music-upload" className="ste-upload-label">
                      <FaMusic /> Upload Audio Track (MP3/WAV)
                    </label>
                  </div>
                )}

                {/* 3. Mute Notice */}
                {musicMode === "none" && (
                  <div style={{ padding: "8px 12px", background: "rgba(239,68,68,0.1)", borderRadius: "6px", border: "1px solid rgba(239,68,68,0.25)", fontSize: "0.72rem", color: "#fca5a5" }}>
                    🔇 No background music will be attached. Video will render silent.
                  </div>
                )}

                {/* Track Status & Listen Button */}
                {musicUrl && musicMode !== "none" && (
                  <div style={{ marginTop: "6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        type="button"
                        className="ste-btn ste-btn--secondary ste-btn--sm"
                        onClick={() => {
                          if (!previewAudioRef.current || !musicUrl) return;
                          if (!previewAudioRef.current.paused) {
                            previewAudioRef.current.pause();
                            setPreviewingTuneId(null);
                          } else {
                            if (audioRef.current) audioRef.current.pause();
                            previewAudioRef.current.src = musicUrl;
                            previewAudioRef.current.volume = musicVolume / 100;
                            previewAudioRef.current.play().then(() => {
                              setPreviewingTuneId(selectedPresetId || 'active');
                            }).catch((err) => console.warn(err));
                          }
                        }}
                      >
                        {previewingTuneId ? <FaVolumeXmark /> : <FaVolumeHigh />}
                        <span>{previewingTuneId ? "Stop Audio" : "Listen Active"}</span>
                      </button>
                      <span style={{ fontSize: "0.72rem", color: "#11B5BB" }}>
                        {musicMode === "preset" ? `Track: ${DEMO_AUDIO_TUNES.find(d => d.id === selectedPresetId)?.name || 'Demo Preset'}` : "Custom Track Uploaded"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Volume Slider */}
                {musicMode !== "none" && (
                  <div className="ste-range-slider" style={{ marginTop: "8px" }}>
                    <span className="ste-sublabel">Volume: {musicVolume}%</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={musicVolume}
                      onChange={(e) => {
                        const vol = Number(e.target.value);
                        setMusicVolume(vol);
                        if (audioRef.current) audioRef.current.volume = vol / 100;
                        if (previewAudioRef.current) previewAudioRef.current.volume = vol / 100;
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Video Specs */}
              <div className="ste-field-group">
                <label className="ste-label">Timing &amp; Quality</label>
                <div className="ste-specs-grid">
                  <div>
                    <span className="ste-sublabel">Duration</span>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="ste-select"
                    >
                      <option value={5}>5 Seconds</option>
                      <option value={8}>8 Seconds</option>
                      <option value={10}>10 Seconds</option>
                      <option value={15}>15 Seconds</option>
                      <option value={30}>30 Seconds</option>
                    </select>
                  </div>
                  <div>
                    <span className="ste-sublabel">Resolution</span>
                    <select
                      value={resolution}
                      onChange={(e) => setResolution(Number(e.target.value))}
                      className="ste-select"
                    >
                      <option value={720}>720p HD</option>
                      <option value={1080}>1080p FHD</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* ── Center Stage: Interactive Canvas ── */}
          <main className={`ste-stage ${isFullscreenStage ? "ste-stage--fullscreen" : ""}`}>
            {/* Stage Toolbar */}
            <div className="ste-stage-toolbar">
              <div className="ste-stage-toolbar__left">
                {!leftPanelOpen && !isFullscreenStage && (
                  <button
                    className="ste-panel-toggle-pill"
                    onClick={() => setLeftPanelOpen(true)}
                    title="Expand Specifications Panel"
                  >
                    <FaChevronRight size={10} />
                    <span>Specs</span>
                  </button>
                )}

                <div className="ste-stage-ratio-pill" title={ASPECT_SPECS[activeRatio].label}>
                  <span>{activeRatio === "9:16" ? "📱" : activeRatio === "16:9" ? "📺" : activeRatio === "1:1" ? "⏹️" : "📸"}</span>
                  <span className="ste-stage-ratio-name">{activeRatio}</span>
                </div>

                <span className="ste-stage-res-badge">
                  {ASPECT_SPECS[activeRatio].width}×{ASPECT_SPECS[activeRatio].height}
                </span>

                {/* Ratio quick switcher directly on stage — all 4 saved together */}
                <div className="ste-stage-ratio-switcher">
                  {(["9:16", "16:9", "1:1", "4:5"] as AspectRatio[]).map((r) => (
                    <button
                      key={r}
                      className={`ste-stage-ratio-btn ${activeRatio === r ? "active" : ""}`}
                      onClick={() => setActiveRatio(r)}
                      title={`Switch to ${r} — ${ASPECT_SPECS[r].label} (all 4 ratios saved together)`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                {/* Quick sync text button on the stage toolbar */}
                <button
                  onClick={syncTextToAllRatios}
                  className="ste-stage-btn"
                  title={`Sync text content from ${activeRatio} to all other 3 ratios`}
                  style={{ fontSize: "0.68rem", gap: "4px", padding: "4px 8px", background: "rgba(17,181,187,0.15)", color: "#11B5BB", border: "1px solid rgba(17,181,187,0.3)" }}
                >
                  <FaArrowUpRightFromSquare size={9} />
                  <span>Sync All</span>
                </button>
              </div>

              <div className="ste-stage-toolbar__center">
                {selectedLayer && currentLayers[selectedLayer] ? (
                  <span className="ste-stage-hint ste-stage-hint--active" title={`Selected: ${selectedLayer.toUpperCase()}`}>
                    <span>🎯</span>
                    <span>{selectedLayer.toUpperCase()}</span>
                    <span className="ste-stage-coord-sub">({Math.round(currentLayers[selectedLayer].x * 100)}%, {Math.round(currentLayers[selectedLayer].y * 100)}%)</span>
                  </span>
                ) : hoveredLayer ? (
                  <span className="ste-stage-hint">
                    <span>👆</span> Move <strong>{hoveredLayer.toUpperCase()}</strong>
                  </span>
                ) : null}
              </div>

              <div className="ste-stage-toolbar__right">
                {/* Zoom & Alignment Grid Tools */}
                <div style={{ display: "flex", alignItems: "center", gap: "2px", background: "rgba(0,0,0,0.4)", borderRadius: "6px", padding: "2px 4px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(0.5, Number((z - 0.1).toFixed(1))))}
                    className="ste-stage-btn"
                    style={{ padding: "3px 6px", fontSize: "11px", minWidth: "22px", height: "24px" }}
                    title="Zoom Out (-)"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(1)}
                    className="ste-stage-btn"
                    style={{ padding: "3px 6px", fontSize: "10px", minWidth: "40px", height: "24px", color: zoomLevel === 1 ? "#11B5BB" : "#fff", fontWeight: 700 }}
                    title="Reset Zoom to 100%"
                  >
                    {Math.round(zoomLevel * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(2.0, Number((z + 0.1).toFixed(1))))}
                    className="ste-stage-btn"
                    style={{ padding: "3px 6px", fontSize: "11px", minWidth: "22px", height: "24px" }}
                    title="Zoom In (+)"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGrid((g) => !g)}
                    className={`ste-stage-btn ${showGrid ? "ste-stage-btn--active" : ""}`}
                    style={{ padding: "3px 6px", height: "24px" }}
                    title={showGrid ? "Hide Alignment Grid" : "Show Alignment Grid"}
                  >
                    <FaTableCells size={10} />
                  </button>
                </div>

                {isFullscreenStage && (
                  <button
                    className={`ste-stage-btn ${showFullscreenInspector ? "ste-stage-btn--active" : ""}`}
                    onClick={() => setShowFullscreenInspector(!showFullscreenInspector)}
                    title="Toggle Inspector in Fullscreen"
                  >
                    <FaSliders size={11} />
                    <span>Inspector</span>
                  </button>
                )}

                <button
                  className={`ste-stage-btn ${isFullscreenStage ? "ste-stage-btn--active" : ""}`}
                  onClick={() => setIsFullscreenStage(!isFullscreenStage)}
                  title={isFullscreenStage ? "Exit Fullscreen Stage (Esc)" : "Expand Stage to Fullscreen"}
                >
                  {isFullscreenStage ? <FaCompress size={11} /> : <FaExpand size={11} />}
                  <span>{isFullscreenStage ? "Exit" : "Expand"}</span>
                </button>

                {!rightPanelOpen && !isFullscreenStage && (
                  <button
                    className="ste-panel-toggle-pill"
                    onClick={() => setRightPanelOpen(true)}
                    title="Expand Layer Inspector Panel"
                  >
                    <span>Inspector</span>
                    <FaChevronLeft size={10} />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Layer Switcher Bar: Visual layer chips for instant selection & clear understandability */}
            {!isPlaying && (
              <div
                className="ste-stage-layer-strip"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  background: "rgba(5, 20, 25, 0.92)",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  overflowX: "auto",
                  scrollbarWidth: "none",
                  flexShrink: 0,
                  zIndex: 15,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "5px", paddingRight: "4px", borderRight: "1px solid rgba(255, 255, 255, 0.12)", marginRight: "2px" }}>
                  <FaLayerGroup size={11} style={{ color: "#11B5BB" }} />
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", whiteSpace: "nowrap" }}>
                    Layers:
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddImageModal(true)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "3px 10px",
                    borderRadius: "6px",
                    background: "rgba(17, 181, 187, 0.22)",
                    border: "1px solid #11B5BB",
                    color: "#11B5BB",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    marginRight: "6px",
                  }}
                  title="Upload custom image or add promotional stickers / graphic badges"
                >
                  <FaImage size={11} />
                  <span>+ Add Image / Sticker</span>
                </button>
                {([
                  ["headline", "Headline", "🏷️"],
                  ["discount", "Offer Badge", "💰"],
                  ["description", "Description", "📝"],
                  ["price", "Price", "💵"],
                  ["oldPrice", "Old Price", "✂️"],
                  ["product", "Product Image", "🖼️"],
                  ["cta", "CTA Button", "🔘"],
                  ["validity", "Validity", "📅"],
                  ["logo", "Logo", "🏢"],
                  ["storeName", "Store Name", "🏪"],
                  ["qrCode", "QR Code", "📱"],
                  ["footer", "Footer", "📌"],
                ] as [LayerKey, string, string][]).map(([k, label, icon]) => {
                  const exists = !!currentLayers[k];
                  const isSelected = selectedLayer === k;
                  if (!exists && k !== "headline" && k !== "discount" && k !== "product" && k !== "price" && k !== "description") {
                    return null;
                  }
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setSelectedLayer(k)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: isSelected ? 700 : 500,
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        background: isSelected ? "rgba(17, 181, 187, 0.25)" : "rgba(255, 255, 255, 0.05)",
                        border: isSelected ? "1px solid #11B5BB" : "1px solid rgba(255, 255, 255, 0.1)",
                        color: isSelected ? "#38bdf8" : "#cbd5e1",
                        boxShadow: isSelected ? "0 0 8px rgba(17, 181, 187, 0.35)" : "none",
                      }}
                      title={`Click to select & edit ${label}`}
                    >
                      <span style={{ fontSize: "12px" }}>{icon}</span>
                      <span>{label}</span>
                      {isSelected && (
                        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#11B5BB" }} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Docked Selection Bar: Sleek, compact single-row toolbar that never wraps vertically */}
            {selectedLayer && selectedLayerData && !isPlaying && (
              <div
                className="ste-docked-element-bar"
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0 12px",
                  height: "42px",
                  minHeight: "42px",
                  maxHeight: "42px",
                  background: "rgba(11, 40, 48, 0.98)",
                  borderBottom: "1px solid rgba(17, 181, 187, 0.35)",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.45)",
                  gap: "8px",
                  zIndex: 20,
                  flexShrink: 0,
                  flexWrap: "nowrap",
                  overflowX: "auto",
                  scrollbarWidth: "none",
                  whiteSpace: "nowrap",
                  boxSizing: "border-box",
                  animation: "fadeIn 0.15s ease-out",
                }}
              >
                {/* Active Layer Label */}
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: "#11B5BB",
                    background: "rgba(17, 181, 187, 0.15)",
                    border: "1px solid rgba(17, 181, 187, 0.35)",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    whiteSpace: "nowrap",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    flexShrink: 0,
                  }}
                >
                  <span>🎯</span>
                  <span>{selectedLayer === "discount" ? "Offer Badge" : selectedLayer === "product" ? "Product Image" : selectedLayer}</span>
                  <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 500, fontFamily: "monospace" }}>
                    ({Math.round(selectedLayerData.x * 100)}%, {Math.round(selectedLayerData.y * 100)}%)
                  </span>
                </span>

                <div style={{ width: "1px", height: "18px", background: "rgba(255, 255, 255, 0.12)", flexShrink: 0 }} />

                {/* Image Controls: Crop & Scale & Center */}
                {(selectedLayer === "product" || selectedLayer === "logo") && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                    {inPlaceCropLayer === selectedLayer ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setInPlaceCropLayer(null);
                            toast.success("Crop applied!");
                          }}
                          style={{
                            background: "#11B5BB",
                            border: "none",
                            color: "#051419",
                            borderRadius: "6px",
                            padding: "4px 9px",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <FaCheck size={11} /> Done Crop
                        </button>
                        <button
                          type="button"
                          onClick={() => resetCrop(selectedLayer)}
                          style={{
                            background: "rgba(255, 255, 255, 0.1)",
                            border: "1px solid rgba(255, 255, 255, 0.25)",
                            color: "#cbd5e1",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            fontSize: "11px",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Reset Crop
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setInPlaceCropLayer(selectedLayer)}
                        style={{
                          background: "rgba(2, 132, 199, 0.25)",
                          border: "1px solid #0284c7",
                          color: "#38bdf8",
                          borderRadius: "6px",
                          padding: "4px 9px",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          whiteSpace: "nowrap",
                        }}
                        title={`Crop & trim ${selectedLayer === "logo" ? "Logo" : "Product Image"} on canvas`}
                      >
                        <FaCrop size={11} /> Crop
                      </button>
                    )}

                    {selectedLayerData?.cropInset && (selectedLayerData.cropInset.top > 0 || selectedLayerData.cropInset.right > 0 || selectedLayerData.cropInset.bottom > 0 || selectedLayerData.cropInset.left > 0) && inPlaceCropLayer !== selectedLayer ? (
                      <button
                        type="button"
                        onClick={() => resetCrop(selectedLayer)}
                        style={{
                          background: "rgba(255, 255, 255, 0.08)",
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          color: "#94a3b8",
                          borderRadius: "6px",
                          padding: "4px 7px",
                          fontSize: "11px",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                        title="Revert back to uncropped original image"
                      >
                        Reset
                      </button>
                    ) : null}

                    {/* Quick Image Curvature Presets in Docked Toolbar */}
                    <div style={{ display: "flex", alignItems: "center", gap: "3px", borderLeft: "1px solid rgba(255,255,255,0.12)", paddingLeft: "6px" }}>
                      {[
                        { label: "Sharp", radius: 0, shape: "rect", title: "Sharp rectangular corners (0%)" },
                        { label: "Curved", radius: 16, shape: "rounded", title: "Curved rounded corners (16%)" },
                        { label: "Circle", radius: 50, shape: "circle", title: "Circular shape (50%)" },
                      ].map((preset) => {
                        const isCurActive = preset.shape === "circle"
                          ? selectedLayerData.shape === "circle" || selectedLayerData.borderRadius === 50
                          : preset.radius === 0
                          ? (!selectedLayerData.borderRadius || selectedLayerData.borderRadius === 0) && selectedLayerData.shape !== "circle"
                          : selectedLayerData.borderRadius === preset.radius;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              updateCurrentLayer(selectedLayer, {
                                shape: preset.shape as any,
                                borderRadius: preset.radius,
                              });
                            }}
                            style={{
                              background: isCurActive ? "rgba(17, 181, 187, 0.3)" : "rgba(255, 255, 255, 0.06)",
                              border: isCurActive ? "1px solid #11B5BB" : "1px solid rgba(255, 255, 255, 0.15)",
                              color: isCurActive ? "#38bdf8" : "#94a3b8",
                              borderRadius: "6px",
                              padding: "3px 6px",
                              fontSize: "10px",
                              fontWeight: 600,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                            title={preset.title}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Quick Image Size Adjustments & Steppers */}
                    <div style={{ display: "flex", alignItems: "center", gap: "3px", borderLeft: "1px solid rgba(255,255,255,0.12)", paddingLeft: "6px" }}>
                      <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600, marginRight: "1px" }}>Size:</span>
                      
                      <button
                        type="button"
                        onClick={() => {
                          const curSize = selectedLayerData.size || 50;
                          const newSize = Math.max(10, curSize - 5);
                          updateCurrentLayer(selectedLayer, { size: newSize });
                        }}
                        style={{
                          background: "rgba(255, 255, 255, 0.08)",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                          color: "#ffffff",
                          borderRadius: "4px",
                          width: "22px",
                          height: "22px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                        title="Decrease product image size (-5%)"
                      >
                        -
                      </button>

                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#11B5BB", minWidth: "30px", textAlign: "center" }}>
                        {selectedLayerData.size}%
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          const curSize = selectedLayerData.size || 50;
                          const newSize = Math.min(95, curSize + 5);
                          updateCurrentLayer(selectedLayer, { size: newSize });
                        }}
                        style={{
                          background: "rgba(255, 255, 255, 0.08)",
                          border: "1px solid rgba(255, 255, 255, 0.15)",
                          color: "#ffffff",
                          borderRadius: "4px",
                          width: "22px",
                          height: "22px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                        title="Increase product image size (+5%)"
                      >
                        +
                      </button>

                      {[
                        { label: "Medium", size: 50 },
                        { label: "Large", size: 65 },
                        { label: "Hero", size: 75 },
                      ].map((preset) => {
                        const isSizeActive = selectedLayerData.size === preset.size;
                        return (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              updateCurrentLayer(selectedLayer, { size: preset.size });
                            }}
                            style={{
                              background: isSizeActive ? "rgba(17, 181, 187, 0.3)" : "rgba(255, 255, 255, 0.06)",
                              border: isSizeActive ? "1px solid #11B5BB" : "1px solid rgba(255, 255, 255, 0.15)",
                              color: isSizeActive ? "#38bdf8" : "#94a3b8",
                              borderRadius: "6px",
                              padding: "3px 6px",
                              fontSize: "10px",
                              fontWeight: 600,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                            }}
                            title={`Set product size to ${preset.size}%`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Snap Image to Center of Canvas */}
                    <button
                      type="button"
                      onClick={() => {
                        updateCurrentLayer(selectedLayer, { x: 0.50 });
                        toast.success("Centered on Canvas (X: 50%)");
                      }}
                      style={{
                        background: Math.round(selectedLayerData.x * 100) === 50 ? "rgba(17, 181, 187, 0.25)" : "rgba(255, 255, 255, 0.06)",
                        border: Math.round(selectedLayerData.x * 100) === 50 ? "1px solid #11B5BB" : "1px solid rgba(255, 255, 255, 0.15)",
                        color: Math.round(selectedLayerData.x * 100) === 50 ? "#38bdf8" : "#e2e8f0",
                        borderRadius: "6px",
                        padding: "4px 8px",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        whiteSpace: "nowrap",
                      }}
                      title="Snap image directly to horizontal center of canvas (X: 50%)"
                    >
                      <FaCrosshairs size={10} /> Center
                    </button>
                  </div>
                )}

                {/* Text Controls: Input, Alignment, Center, Shape, Size, Width */}
                {isTextLayer && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                    {/* Quick Text Input */}
                    <input
                      type="text"
                      value={selectedLayerData.text || ""}
                      onChange={(e) => updateCurrentLayer(selectedLayer, { text: e.target.value })}
                      placeholder="Edit text..."
                      style={{
                        background: "#051419",
                        border: "1px solid #163B45",
                        borderRadius: "6px",
                        color: "#fff",
                        padding: "3px 8px",
                        fontSize: "11px",
                        fontWeight: 600,
                        width: "130px",
                        outline: "none",
                        height: "26px",
                        boxSizing: "border-box",
                      }}
                    />

                    {/* Text Center & Alignment Option */}
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        background: "#051419",
                        border: "1px solid #163B45",
                        borderRadius: "6px",
                        padding: "2px",
                        gap: "2px",
                        height: "26px",
                        boxSizing: "border-box",
                      }}
                      title="Text Alignment: Left, Center, or Right"
                    >
                      <button
                        type="button"
                        onClick={() => updateCurrentLayer(selectedLayer, { textAlign: "left" })}
                        style={{
                          background: selectedLayerData.textAlign === "left" ? "#11B5BB" : "transparent",
                          color: selectedLayerData.textAlign === "left" ? "#041d24" : "#94a3b8",
                          border: "none",
                          borderRadius: "4px",
                          padding: "2px 5px",
                          fontSize: "11px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          fontWeight: 700,
                          height: "20px",
                        }}
                        title="Align text Left"
                      >
                        <FaAlignLeft size={10} />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCurrentLayer(selectedLayer, { textAlign: "center" })}
                        style={{
                          background: (!selectedLayerData.textAlign || selectedLayerData.textAlign === "center") ? "#11B5BB" : "transparent",
                          color: (!selectedLayerData.textAlign || selectedLayerData.textAlign === "center") ? "#041d24" : "#94a3b8",
                          border: "none",
                          borderRadius: "4px",
                          padding: "2px 6px",
                          fontSize: "10px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          fontWeight: 700,
                          height: "20px",
                        }}
                        title="Align text Center (Text Center Option)"
                      >
                        <FaAlignCenter size={10} />
                        <span>Center</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => updateCurrentLayer(selectedLayer, { textAlign: "right" })}
                        style={{
                          background: selectedLayerData.textAlign === "right" ? "#11B5BB" : "transparent",
                          color: selectedLayerData.textAlign === "right" ? "#041d24" : "#94a3b8",
                          border: "none",
                          borderRadius: "4px",
                          padding: "2px 5px",
                          fontSize: "11px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          fontWeight: 700,
                          height: "20px",
                        }}
                        title="Align text Right"
                      >
                        <FaAlignRight size={10} />
                      </button>
                    </div>

                    {/* Snap Text to Center of Canvas (X = 50%) */}
                    <button
                      type="button"
                      onClick={() => {
                        updateCurrentLayer(selectedLayer, { x: 0.50 });
                        toast.success("Centered on Canvas (X: 50%)");
                      }}
                      style={{
                        background: Math.round(selectedLayerData.x * 100) === 50 ? "rgba(17, 181, 187, 0.25)" : "rgba(255, 255, 255, 0.06)",
                        border: Math.round(selectedLayerData.x * 100) === 50 ? "1px solid #11B5BB" : "1px solid rgba(255, 255, 255, 0.15)",
                        color: Math.round(selectedLayerData.x * 100) === 50 ? "#38bdf8" : "#e2e8f0",
                        borderRadius: "6px",
                        padding: "3px 7px",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        whiteSpace: "nowrap",
                        height: "26px",
                        boxSizing: "border-box",
                      }}
                      title="Snap text directly to horizontal center of canvas (X: 50%)"
                    >
                      <FaCrosshairs size={10} />
                      <span>Center</span>
                    </button>

                    {/* Shape selector */}
                    <select
                      value={selectedLayerData.shape || "none"}
                      onChange={(e) =>
                        updateCurrentLayer(selectedLayer, {
                          shape: e.target.value as any,
                          bgMode: e.target.value === "none" ? "transparent" : "color",
                        })
                      }
                      style={{
                        background: "#051419",
                        border: "1px solid #163B45",
                        borderRadius: "6px",
                        color: "#fff",
                        padding: "2px 6px",
                        fontSize: "11px",
                        fontWeight: 500,
                        outline: "none",
                        cursor: "pointer",
                        height: "26px",
                      }}
                      title="Card background shape"
                    >
                      <option value="none">No BG (Transparent)</option>
                      <option value="origami">🏷️ 3D Folded Banner (Retail)</option>
                      <option value="rounded">Rounded Badge</option>
                      <option value="pill">Pill Shape</option>
                      <option value="circle">Circle Badge</option>
                      <option value="rect">Rectangle</option>
                      <option value="ribbon">Angled Ribbon</option>
                    </select>

                    {/* Quick Font Size Stepper */}
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        background: "#051419",
                        border: "1px solid #163B45",
                        borderRadius: "6px",
                        overflow: "hidden",
                        height: "26px",
                        boxSizing: "border-box",
                      }}
                      title="Adjust Font Size"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          updateCurrentLayer(selectedLayer, {
                            size: Math.max(0.5, Number((selectedLayerData.size - 0.2).toFixed(1))),
                          })
                        }
                        style={{
                          background: "rgba(255, 255, 255, 0.06)",
                          border: "none",
                          color: "#11B5BB",
                          padding: "0 6px",
                          fontSize: "11px",
                          fontWeight: 800,
                          cursor: "pointer",
                          height: "100%",
                        }}
                        title="Decrease font size"
                      >
                        A-
                      </button>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "#ffffff",
                          padding: "0 5px",
                          minWidth: "32px",
                          textAlign: "center",
                        }}
                      >
                        {selectedLayerData.size}%
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateCurrentLayer(selectedLayer, {
                            size: Math.min(60, Number((selectedLayerData.size + 0.2).toFixed(1))),
                          })
                        }
                        style={{
                          background: "rgba(255, 255, 255, 0.06)",
                          border: "none",
                          color: "#11B5BB",
                          padding: "0 6px",
                          fontSize: "11px",
                          fontWeight: 800,
                          cursor: "pointer",
                          height: "100%",
                        }}
                        title="Increase font size"
                      >
                        A+
                      </button>
                    </div>

                    {/* Quick Box Width Stepper */}
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        background: "#051419",
                        border: "1px solid #163B45",
                        borderRadius: "6px",
                        overflow: "hidden",
                        height: "26px",
                        boxSizing: "border-box",
                      }}
                      title="Adjust Box Width: text wraps down when width reached"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          const curW = selectedLayerData.boxWidth || 45;
                          updateCurrentLayer(selectedLayer, { boxWidth: Math.max(10, curW - 5) });
                        }}
                        style={{
                          background: "rgba(255, 255, 255, 0.06)",
                          border: "none",
                          color: "#38bdf8",
                          padding: "0 6px",
                          fontSize: "11px",
                          fontWeight: 800,
                          cursor: "pointer",
                          height: "100%",
                        }}
                        title="Decrease Width"
                      >
                        W-
                      </button>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#cbd5e1",
                          padding: "0 5px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        W: {selectedLayerData.boxWidth ? `${selectedLayerData.boxWidth}%` : "Auto"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const curW = selectedLayerData.boxWidth || 45;
                          updateCurrentLayer(selectedLayer, { boxWidth: Math.min(95, curW + 5) });
                        }}
                        style={{
                          background: "rgba(255, 255, 255, 0.06)",
                          border: "none",
                          color: "#38bdf8",
                          padding: "0 6px",
                          fontSize: "11px",
                          fontWeight: 800,
                          cursor: "pointer",
                          height: "100%",
                        }}
                        title="Increase Width"
                      >
                        W+
                      </button>
                    </div>
                  </div>
                )}

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Actions: Delete, Close, Inspector */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => handleDeleteLayer(selectedLayer)}
                    style={{
                      background: "rgba(220, 38, 38, 0.25)",
                      border: "1px solid #ef4444",
                      color: "#fca5a5",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      whiteSpace: "nowrap",
                      height: "26px",
                    }}
                    title={`Delete / remove ${selectedLayer} from canvas`}
                  >
                    <FaTrash size={10} /> Delete
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLayer(null);
                      setInPlaceCropLayer(null);
                    }}
                    style={{
                      background: "rgba(255, 255, 255, 0.08)",
                      border: "1px solid rgba(255, 255, 255, 0.18)",
                      color: "#94a3b8",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      height: "26px",
                    }}
                    title="Deselect active layer"
                  >
                    ✕ Close
                  </button>

                  <button
                    type="button"
                    onClick={() => setRightPanelOpen(true)}
                    style={{
                      background: "#163B45",
                      border: "1px solid rgba(17, 181, 187, 0.4)",
                      color: "#11B5BB",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      height: "26px",
                    }}
                    title="Open full inspector panel on right"
                  >
                    Inspector &gt;
                  </button>
                </div>
              </div>
            )}

            {/* Canvas Container & Mathematically Responsive Viewport */}
            <div ref={stageContainerRef} className="ste-canvas-container">
              <div
                className="ste-canvas-viewport"
                style={{
                  width: canvasFitSize.width > 0 ? `${canvasFitSize.width}px` : "auto",
                  height: canvasFitSize.height > 0 ? `${canvasFitSize.height}px` : "auto",
                  aspectRatio: `${ASPECT_SPECS[activeRatio].width} / ${ASPECT_SPECS[activeRatio].height}`,
                  transform: zoomLevel !== 1 ? `scale(${zoomLevel})` : undefined,
                  transformOrigin: "center center",
                  transition: "transform 0.18s ease-out, width 0.1s ease-out, height 0.1s ease-out",
                  position: "relative",
                  maxWidth: "100%",
                  maxHeight: "100%",
                }}
              >
                <canvas
                  ref={canvasRef}
                  className="ste-interactive-canvas"
                  onPointerDown={handleCanvasPointerDown}
                  style={{
                    cursor: isDragging ? "grabbing" : hoveredLayer ? "grab" : "crosshair",
                  }}
                />

                {/* Interactive On-Canvas In-Place Crop & Resize Overlay */}
                {(() => {
                  if (!selectedLayer || !currentLayers[selectedLayer] || currentLayers[selectedLayer].hidden || isPlaying) return null;
                  const spec = ASPECT_SPECS[activeRatio];
                  const bounds = getLayerBounds(selectedLayer, spec.width, spec.height, currentLayers);
                  if (!bounds) return null;

                  const leftPct = (bounds.left / spec.width) * 100;
                  const topPct = (bounds.top / spec.height) * 100;
                  const widthPct = (bounds.width / spec.width) * 100;
                  const heightPct = (bounds.height / spec.height) * 100;
                  const isCropping = inPlaceCropLayer === selectedLayer;
                  const layerData = currentLayers[selectedLayer];

                  return (
                    <div
                      className="ste-canvas-element-overlay"
                      style={{
                        position: "absolute",
                        left: `${leftPct}%`,
                        top: `${topPct}%`,
                        width: `${widthPct}%`,
                        height: `${heightPct}%`,
                        border: isCropping ? "2px solid #38bdf8" : "2px dashed #11B5BB",
                        borderRadius: !isCropping && (layerData?.shape === "circle" || (typeof layerData?.borderRadius === "number" && layerData.borderRadius >= 50))
                          ? "9999px"
                          : !isCropping && typeof layerData?.borderRadius === "number" && layerData.borderRadius > 0
                          ? `${layerData.borderRadius}px`
                          : !isCropping && layerData?.shape === "rounded"
                          ? "16px"
                          : !isCropping && layerData?.shape === "pill"
                          ? "9999px"
                          : "4px",
                        pointerEvents: "none",
                        zIndex: 30,
                        boxShadow: isCropping ? "0 0 0 9999px rgba(0, 0, 0, 0.4), 0 0 20px #0284c7" : "0 0 14px rgba(17, 181, 187, 0.45)",
                      }}
                    >
                      {/* Crop Mode Rule-of-Thirds Grid Lines */}
                      {isCropping && (
                        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                          <div style={{ position: "absolute", left: "33.33%", top: 0, bottom: 0, width: "1px", background: "rgba(56, 189, 248, 0.45)" }} />
                          <div style={{ position: "absolute", left: "66.66%", top: 0, bottom: 0, width: "1px", background: "rgba(56, 189, 248, 0.45)" }} />
                          <div style={{ position: "absolute", top: "33.33%", left: 0, right: 0, height: "1px", background: "rgba(56, 189, 248, 0.45)" }} />
                          <div style={{ position: "absolute", top: "66.66%", left: 0, right: 0, height: "1px", background: "rgba(56, 189, 248, 0.45)" }} />
                        </div>
                      )}

                      {/* 8 Interactive Resize / Crop Handles Right on the Element */}
                      {(["nw", "ne", "se", "sw"] as const).map((pos) => {
                        const isTop = pos.includes("n");
                        const isLeft = pos.includes("w");
                        return (
                          <div
                            key={pos}
                            onPointerDown={(e) => handleStartTransform(e, selectedLayer, isCropping ? "crop" : "resize", pos)}
                            style={{
                              position: "absolute",
                              top: isTop ? "-6px" : undefined,
                              bottom: !isTop ? "-6px" : undefined,
                              left: isLeft ? "-6px" : undefined,
                              right: !isLeft ? "-6px" : undefined,
                              width: isCropping ? "14px" : "11px",
                              height: isCropping ? "14px" : "11px",
                              background: isCropping ? "#38bdf8" : "#ffffff",
                              border: isCropping ? "2px solid #0369a1" : "2px solid #11B5BB",
                              borderRadius: isCropping ? "2px" : "3px",
                              cursor: pos === "nw" || pos === "se" ? "nwse-resize" : "nesw-resize",
                              pointerEvents: "auto",
                              zIndex: 35,
                              boxShadow: "0 2px 6px rgba(0,0,0,0.6)",
                            }}
                            title={isCropping ? `Drag to crop ${pos}` : `Drag to resize ${pos}`}
                          />
                        );
                      })}

                      {/* Edge Handles (Top, Bottom, Left, Right) - Resize or Crop */}
                      {(["n", "s", "w", "e"] as const).map((pos) => {
                        const isVertical = pos === "n" || pos === "s";
                        return (
                          <div
                            key={pos}
                            onPointerDown={(e) => handleStartTransform(e, selectedLayer, isCropping ? "crop" : "resize", pos)}
                            style={{
                              position: "absolute",
                              top: pos === "n" ? "-6px" : pos === "s" ? undefined : "50%",
                              bottom: pos === "s" ? "-6px" : undefined,
                              left: pos === "w" ? "-6px" : pos === "e" ? undefined : "50%",
                              right: pos === "e" ? "-6px" : undefined,
                              transform: isVertical ? "translateX(-50%)" : "translateY(-50%)",
                              width: isVertical ? "28px" : "10px",
                              height: isVertical ? "10px" : "28px",
                              background: isCropping ? "#38bdf8" : "#11B5BB",
                              border: isCropping ? "2px solid #0369a1" : "2px solid #ffffff",
                              borderRadius: "4px",
                              cursor: isVertical ? "ns-resize" : "ew-resize",
                              pointerEvents: "auto",
                              zIndex: 34,
                              boxShadow: "0 1px 5px rgba(0,0,0,0.5)",
                            }}
                            title={isCropping ? `Drag to crop ${pos === "n" ? "top" : pos === "s" ? "bottom" : pos === "w" ? "left" : "right"}` : `Drag to resize ${pos === "n" ? "top" : pos === "s" ? "bottom / height" : pos === "w" ? "left" : "right / width"}`}
                          />
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Snapped Center Guideline (shows when layer is centered at X: 50%) */}
                {selectedLayer && currentLayers[selectedLayer] && !isPlaying && Math.abs(currentLayers[selectedLayer].x - 0.50) < 0.015 && (
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: 0,
                      bottom: 0,
                      width: "1px",
                      background: "rgba(17, 181, 187, 0.7)",
                      boxShadow: "0 0 8px rgba(17, 181, 187, 0.8)",
                      pointerEvents: "none",
                      zIndex: 25,
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: "10px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "#11B5BB",
                        color: "#031d24",
                        fontSize: "9px",
                        fontWeight: 800,
                        padding: "1px 6px",
                        borderRadius: "4px",
                        letterSpacing: "0.5px",
                        whiteSpace: "nowrap",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                      }}
                    >
                      CENTER 50%
                    </span>
                  </div>
                )}

                {/* Drag Coordinate Tooltip following element */}
                {isDragging && selectedLayer && currentLayers[selectedLayer] && (
                  <div
                    className="ste-drag-coord-pill"
                    style={{
                      left: `${Math.round(currentLayers[selectedLayer].x * 100)}%`,
                      top: `${Math.round(currentLayers[selectedLayer].y * 100)}%`,
                    }}
                  >
                    {selectedLayer.toUpperCase()} · X: {Math.round(currentLayers[selectedLayer].x * 100)}% Y: {Math.round(currentLayers[selectedLayer].y * 100)}%
                  </div>
                )}

                {/* Aspect Ratio Badge in bottom right of canvas */}
                <div className="ste-viewport-ratio-tag">
                  {activeRatio} · {ASPECT_SPECS[activeRatio].width}×{ASPECT_SPECS[activeRatio].height}
                </div>
              </div>
            </div>

            {/* ── Unified Single Studio Video Animation Player Bar ── */}
            <div className="ste-unified-player-bar">
              {/* Play / Replay / Reset Layout */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                <button
                  type="button"
                  className={`ste-ctrl-btn ste-ctrl-btn--play ${isPlaying ? "ste-ctrl-btn--playing" : ""}`}
                  onClick={togglePlay}
                  title={isPlaying ? "Pause Preview (Space)" : "Play Live Animation Preview (Space)"}
                  style={{
                    width: "auto",
                    padding: "0 12px",
                    height: "32px",
                    borderRadius: "6px",
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: isPlaying ? "#ef4444" : "#f05a28",
                    boxShadow: isPlaying ? "0 0 12px rgba(239,68,68,0.4)" : "0 0 12px rgba(240,90,40,0.3)",
                    border: "none",
                    cursor: "pointer",
                    color: "#fff",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isPlaying ? <FaPause size={10} /> : <FaPlay size={10} />}
                  <span>{isPlaying ? "Pause" : "Play"}</span>
                </button>

                <button
                  type="button"
                  className="ste-ctrl-btn"
                  onClick={handleReplay}
                  title="Replay from 0.0s"
                  style={{
                    height: "32px",
                    width: "32px",
                    borderRadius: "6px",
                    background: "rgba(255,255,255,0.08)",
                    border: "none",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  <FaRotateRight size={11} />
                </button>

                <button
                  type="button"
                  className="ste-ctrl-btn"
                  onClick={() => {
                    setAspectLayers((prev) => ({
                      ...prev,
                      [activeRatio]: DEFAULT_LAYERS[activeRatio],
                    }));
                    showToast(`🔄 Reset ${activeRatio} layout to defaults`);
                  }}
                  title="Reset this ratio layout to default coordinates"
                  style={{
                    height: "32px",
                    width: "32px",
                    borderRadius: "6px",
                    background: "rgba(255,255,255,0.08)",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                  }}
                >
                  <FaSliders size={11} />
                </button>
              </div>

              {/* Scrubber Timeline */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  minWidth: "140px",
                  maxWidth: "460px",
                  margin: "0 4px",
                }}
              >
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#11B5BB", fontFamily: "monospace", minWidth: "32px" }}>
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
                    setPlaybackTime(Number(e.target.value));
                  }}
                  className="ste-scrub-input"
                  style={{ flex: 1, accentColor: "#11B5BB", cursor: "pointer", height: "4px" }}
                />
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8", fontFamily: "monospace", minWidth: "28px" }}>
                  {duration}s
                </span>
              </div>

              {/* Aspect Ratio Switcher & Live Status */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                <span
                  className="ste-player-status-tag"
                  style={{
                    fontSize: "10px",
                    color: isPlaying ? "#22c55e" : "#94a3b8",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    background: "rgba(0,0,0,0.35)",
                    padding: "3px 8px",
                    borderRadius: "5px",
                    border: "1px solid rgba(255,255,255,0.06)",
                    whiteSpace: "nowrap",
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
                  {isPlaying ? "Live 60fps" : "Paused"}
                </span>

                {/* Aspect Switcher */}
                <div style={{ display: "flex", background: "rgba(0,0,0,0.4)", borderRadius: "6px", padding: "2px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {(["16:9", "9:16", "1:1", "4:5"] as AspectRatio[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setActiveRatio(r)}
                      style={{
                        background: activeRatio === r ? "#11B5BB" : "transparent",
                        color: activeRatio === r ? "#07171d" : "#94a3b8",
                        border: "none",
                        borderRadius: "4px",
                        padding: "2px 6px",
                        fontSize: "10px",
                        fontWeight: activeRatio === r ? 800 : 500,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      title={`Switch to ${r}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating Inspector Drawer in Fullscreen Mode */}
            {isFullscreenStage && showFullscreenInspector && selectedLayer && selectedLayerData && (
              <div className="ste-fs-floating-inspector">
                <div className="ste-fs-floating-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <FaSliders style={{ color: "#11B5BB" }} />
                    <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#fff" }}>
                      {selectedLayer.toUpperCase()} Inspector
                    </span>
                  </div>
                  <button
                    className="ste-modal__close"
                    onClick={() => setShowFullscreenInspector(false)}
                    style={{ width: "26px", height: "26px" }}
                  >
                    <FaXmark size={12} />
                  </button>
                </div>
                <div className="ste-fs-floating-body">
                  {isTextLayer && (
                    <div className="ste-field-group">
                      <label className="ste-label">Text</label>
                      <input
                        type="text"
                        className="ste-input"
                        value={selectedLayerData.text || ""}
                        onChange={(e) => updateCurrentLayer(selectedLayer, { text: e.target.value })}
                      />

                      {/* Text Alignment */}
                      <div style={{ marginTop: "8px" }}>
                        <span className="ste-sublabel">Text Alignment</span>
                        <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                          <button
                            type="button"
                            onClick={() => updateCurrentLayer(selectedLayer, { textAlign: "left" })}
                            className={`ste-btn ste-btn--sm ${selectedLayerData.textAlign === "left" ? "ste-btn--primary" : "ste-btn--secondary"}`}
                            style={{ flex: 1, padding: "5px 4px", fontSize: "11px", fontWeight: 600, justifyContent: "center", gap: "4px" }}
                          >
                            <FaAlignLeft size={10} /> Left
                          </button>
                          <button
                            type="button"
                            onClick={() => updateCurrentLayer(selectedLayer, { textAlign: "center" })}
                            className={`ste-btn ste-btn--sm ${(!selectedLayerData.textAlign || selectedLayerData.textAlign === "center") ? "ste-btn--primary" : "ste-btn--secondary"}`}
                            style={{ flex: 1.2, padding: "5px 4px", fontSize: "11px", fontWeight: 700, justifyContent: "center", gap: "4px" }}
                          >
                            <FaAlignCenter size={10} /> Center
                          </button>
                          <button
                            type="button"
                            onClick={() => updateCurrentLayer(selectedLayer, { textAlign: "right" })}
                            className={`ste-btn ste-btn--sm ${selectedLayerData.textAlign === "right" ? "ste-btn--primary" : "ste-btn--secondary"}`}
                            style={{ flex: 1, padding: "5px 4px", fontSize: "11px", fontWeight: 600, justifyContent: "center", gap: "4px" }}
                          >
                            <FaAlignRight size={10} /> Right
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="ste-field-group">
                    <label className="ste-label">Size ({selectedLayerData.size}%)</label>
                    <input
                      type="range"
                      min="2"
                      max="90"
                      value={selectedLayerData.size}
                      onChange={(e) => updateCurrentLayer(selectedLayer, { size: Number(e.target.value) })}
                    />
                  </div>
                  <div className="ste-field-group">
                    <label className="ste-label">9-Point Quick Alignment</label>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px" }}>
                      {[
                        ["↖ TL", 0.15, 0.15],
                        ["↑ TC", 0.50, 0.15],
                        ["↗ TR", 0.85, 0.15],
                        ["← CL", 0.15, 0.50],
                        ["✦ C", 0.50, 0.50],
                        ["→ CR", 0.85, 0.50],
                        ["↙ BL", 0.15, 0.85],
                        ["↓ BC", 0.50, 0.85],
                        ["↘ BR", 0.85, 0.85],
                      ].map(([lbl, ax, ay]) => (
                        <button
                          key={lbl as string}
                          type="button"
                          className="ste-btn ste-btn--secondary ste-btn--sm"
                          style={{ padding: "4px", fontSize: "0.68rem", justifyContent: "center" }}
                          onClick={() => updateCurrentLayer(selectedLayer, { x: ax as number, y: ay as number })}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}


          </main>

          {/* ── Right Rail: Layer Inspector ── */}
          <aside className={`ste-panel ste-panel--inspector ${!rightPanelOpen ? "ste-panel--collapsed" : ""}`}>
            <div className="ste-panel__header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FaSliders />
                <h4>Layer Inspector</h4>
              </div>
              <button
                className="ste-panel-collapse-btn"
                onClick={() => setRightPanelOpen(false)}
                title="Collapse Inspector Panel"
              >
                <FaChevronRight size={11} />
              </button>
            </div>

            <div className="ste-panel__body">
              <div className="ste-element-chips">
                {(
                  [
                    ["product", "Product Image"],
                    ["discount", "Offer Badge"],
                    ["headline", "Headline"],
                    ["description", "Description"],
                    ["price", "Price"],
                    ["oldPrice", "Old Price"],
                    ["validity", "Validity"],
                    ["cta", "CTA Button"],
                    ["qrCode", "QR Code"],
                    ["storeName", "Store Name"],
                    ["logo", "Logo"],
                    ["footer", "Footer"],
                  ] as [LayerKey, string][]
                ).map(([k, label]) => (
                  <button
                    key={k}
                    className={`ste-elem-chip ${selectedLayer === k ? "ste-elem-chip--active" : ""}`}
                    onClick={() => setSelectedLayer(k)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {selectedLayer && selectedLayerData ? (
                <div className="ste-inspector-controls">
                  {/* Selected Layer Info Bar with Visibility Toggle */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "rgba(0,0,0,0.35)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", gap: "8px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 800, color: "#11B5BB", letterSpacing: "0.03em" }}>
                      LAYER: {selectedLayer.toUpperCase()}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {(selectedLayer === "product" || selectedLayer === "logo") && (
                        <button
                          type="button"
                          onClick={() => setInPlaceCropLayer(selectedLayer)}
                          style={{
                            background: "rgba(2, 132, 199, 0.25)",
                            border: "1px solid #0284c7",
                            color: "#38bdf8",
                            borderRadius: "6px",
                            padding: "3px 8px",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                          title={`Crop ${selectedLayer}`}
                        >
                          <FaCrop size={10} /> Crop
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => updateCurrentLayer(selectedLayer, { hidden: !selectedLayerData.hidden })}
                        className="ste-btn ste-btn--secondary ste-btn--sm"
                      style={{ padding: "3px 8px", fontSize: "10px", fontWeight: 700, color: selectedLayerData.hidden ? "#ef4444" : "#10b981", gap: "4px" }}
                      title={selectedLayerData.hidden ? "Show Layer on Canvas" : "Hide Layer from Canvas"}
                    >
                      {selectedLayerData.hidden ? "✕ Hidden" : "✓ Visible"}
                    </button>
                    </div>
                  </div>

                  {isTextLayer && (
                    <>
                      <div className="ste-field-group">
                        <label className="ste-label">Text Content</label>
                        <textarea
                          className="ste-input"
                          rows={2}
                          value={selectedLayerData.text || ""}
                          onChange={(e) =>
                            updateCurrentLayer(selectedLayer, { text: e.target.value })
                          }
                          placeholder="Enter text..."
                        />
                      </div>

                      {/* Typography & Formatting Controls */}
                      <div className="ste-field-group">
                        <label className="ste-label">Typography &amp; Style</label>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "6px" }}>
                          <div>
                            <span className="ste-sublabel">Font Family</span>
                            <select
                              value={selectedLayerData.font || "Arial"}
                              onChange={(e) => updateCurrentLayer(selectedLayer, { font: e.target.value })}
                              className="ste-select"
                              style={{ fontSize: "11px" }}
                            >
                              <option value="Arial">Arial (Clean Sans)</option>
                              <option value="Montserrat">Montserrat (Modern)</option>
                              <option value="Poppins">Poppins (Friendly)</option>
                              <option value="Inter">Inter (Sharp UI)</option>
                              <option value="Oswald">Oswald (Bold Promo)</option>
                              <option value="Impact">Impact (Sale Poster)</option>
                              <option value="Georgia">Georgia (Serif)</option>
                              <option value="Trebuchet MS">Trebuchet MS</option>
                              <option value="Courier New">Courier (Mono)</option>
                            </select>
                          </div>
                          <div>
                            <span className="ste-sublabel">Style &amp; Case</span>
                            <div style={{ display: "flex", gap: "4px" }}>
                              <button
                                type="button"
                                onClick={() => updateCurrentLayer(selectedLayer, { fontWeight: selectedLayerData.fontWeight === "normal" ? "bold" : "normal" })}
                                className={`ste-btn ste-btn--secondary ste-btn--sm ${selectedLayerData.fontWeight !== "normal" ? "active" : ""}`}
                                style={{ flex: 1, padding: "5px 2px", fontWeight: 800, justifyContent: "center" }}
                                title="Bold"
                              >
                                B
                              </button>
                              <button
                                type="button"
                                onClick={() => updateCurrentLayer(selectedLayer, { fontStyle: selectedLayerData.fontStyle === "italic" ? "normal" : "italic" })}
                                className={`ste-btn ste-btn--secondary ste-btn--sm ${selectedLayerData.fontStyle === "italic" ? "active" : ""}`}
                                style={{ flex: 1, padding: "5px 2px", fontStyle: "italic", justifyContent: "center" }}
                                title="Italic"
                              >
                                I
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const cur = selectedLayerData.text || "";
                                  const isUpper = cur === cur.toUpperCase();
                                  updateCurrentLayer(selectedLayer, { text: isUpper ? cur.toLowerCase() : cur.toUpperCase() });
                                }}
                                className="ste-btn ste-btn--secondary ste-btn--sm"
                                style={{ flex: 1, padding: "5px 2px", fontSize: "10px", fontWeight: 700, justifyContent: "center" }}
                                title="Toggle UPPERCASE / lowercase"
                              >
                                AA
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Dedicated Text Alignment Control in Inspector */}
                        <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <span className="ste-sublabel" style={{ fontWeight: 700, color: "#11B5BB" }}>
                              Text Alignment
                            </span>
                            <span style={{ fontSize: "10px", color: "#38bdf8", fontWeight: 700, textTransform: "capitalize" }}>
                              {selectedLayerData.textAlign || "center"}
                            </span>
                          </div>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={() => updateCurrentLayer(selectedLayer, { textAlign: "left" })}
                              className={`ste-btn ste-btn--sm ${selectedLayerData.textAlign === "left" ? "ste-btn--primary" : "ste-btn--secondary"}`}
                              style={{ flex: 1, padding: "5px 4px", fontSize: "11px", fontWeight: 600, justifyContent: "center", gap: "5px" }}
                              title="Align Text to Left"
                            >
                              <FaAlignLeft size={11} /> Left
                            </button>
                            <button
                              type="button"
                              onClick={() => updateCurrentLayer(selectedLayer, { textAlign: "center" })}
                              className={`ste-btn ste-btn--sm ${(!selectedLayerData.textAlign || selectedLayerData.textAlign === "center") ? "ste-btn--primary" : "ste-btn--secondary"}`}
                              style={{ flex: 1.3, padding: "5px 4px", fontSize: "11px", fontWeight: 700, justifyContent: "center", gap: "5px" }}
                              title="Align Text to Center (Text Center Option)"
                            >
                              <FaAlignCenter size={11} /> Center
                            </button>
                            <button
                              type="button"
                              onClick={() => updateCurrentLayer(selectedLayer, { textAlign: "right" })}
                              className={`ste-btn ste-btn--sm ${selectedLayerData.textAlign === "right" ? "ste-btn--primary" : "ste-btn--secondary"}`}
                              style={{ flex: 1, padding: "5px 4px", fontSize: "11px", fontWeight: 600, justifyContent: "center", gap: "5px" }}
                              title="Align Text to Right"
                            >
                              <FaAlignRight size={11} /> Right
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Position & Scale with Synchronized Number Inputs */}
                  <div className="ste-field-group">
                    <label className="ste-label">Coordinates &amp; Size</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                          <span className="ste-sublabel">X Position</span>
                          <span style={{ fontSize: "11px", color: "#11B5BB", fontWeight: 700 }}>{Math.round(selectedLayerData.x * 100)}%</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <input
                            type="range"
                            min="2"
                            max="98"
                            value={Math.round(selectedLayerData.x * 100)}
                            onChange={(e) => updateCurrentLayer(selectedLayer, { x: Number(e.target.value) / 100 })}
                            style={{ flex: 1 }}
                          />
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={Math.round(selectedLayerData.x * 100)}
                            onChange={(e) => updateCurrentLayer(selectedLayer, { x: Math.max(0, Math.min(100, Number(e.target.value))) / 100 })}
                            className="ste-input"
                            style={{ width: "48px", padding: "3px 4px", fontSize: "11px", textAlign: "center" }}
                          />
                        </div>
                      </div>

                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                          <span className="ste-sublabel">Y Position</span>
                          <span style={{ fontSize: "11px", color: "#11B5BB", fontWeight: 700 }}>{Math.round(selectedLayerData.y * 100)}%</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <input
                            type="range"
                            min="2"
                            max="98"
                            value={Math.round(selectedLayerData.y * 100)}
                            onChange={(e) => updateCurrentLayer(selectedLayer, { y: Number(e.target.value) / 100 })}
                            style={{ flex: 1 }}
                          />
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={Math.round(selectedLayerData.y * 100)}
                            onChange={(e) => updateCurrentLayer(selectedLayer, { y: Math.max(0, Math.min(100, Number(e.target.value))) / 100 })}
                            className="ste-input"
                            style={{ width: "48px", padding: "3px 4px", fontSize: "11px", textAlign: "center" }}
                          />
                        </div>
                      </div>

                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                          <span className="ste-sublabel">Scale / Size</span>
                          <span style={{ fontSize: "11px", color: "#11B5BB", fontWeight: 700 }}>{selectedLayerData.size}%</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <input
                            type="range"
                            min="2"
                            max="90"
                            value={selectedLayerData.size}
                            onChange={(e) => updateCurrentLayer(selectedLayer, { size: Number(e.target.value) })}
                            style={{ flex: 1 }}
                          />
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={selectedLayerData.size}
                            onChange={(e) => updateCurrentLayer(selectedLayer, { size: Math.max(1, Math.min(99, Number(e.target.value))) })}
                            className="ste-input"
                            style={{ width: "48px", padding: "3px 4px", fontSize: "11px", textAlign: "center" }}
                          />
                        </div>
                      </div>

                      {/* One-Click Center Snapping Buttons */}
                      <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
                        <button
                          type="button"
                          onClick={() => {
                            updateCurrentLayer(selectedLayer, { x: 0.50 });
                            toast.success("Centered horizontally (X: 50%)");
                          }}
                          className="ste-btn ste-btn--secondary ste-btn--sm"
                          style={{
                            flex: 1,
                            padding: "5px 6px",
                            fontSize: "11px",
                            fontWeight: 600,
                            justifyContent: "center",
                            gap: "5px",
                            background: Math.round(selectedLayerData.x * 100) === 50 ? "rgba(17, 181, 187, 0.2)" : undefined,
                            borderColor: Math.round(selectedLayerData.x * 100) === 50 ? "#11B5BB" : undefined,
                            color: Math.round(selectedLayerData.x * 100) === 50 ? "#38bdf8" : undefined,
                          }}
                          title="Snap directly to horizontal center of canvas (X: 50%)"
                        >
                          <FaCrosshairs size={10} /> Center X (50%)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateCurrentLayer(selectedLayer, { y: 0.50 });
                            toast.success("Centered vertically (Y: 50%)");
                          }}
                          className="ste-btn ste-btn--secondary ste-btn--sm"
                          style={{
                            flex: 1,
                            padding: "5px 6px",
                            fontSize: "11px",
                            fontWeight: 600,
                            justifyContent: "center",
                            gap: "5px",
                            background: Math.round(selectedLayerData.y * 100) === 50 ? "rgba(17, 181, 187, 0.2)" : undefined,
                            borderColor: Math.round(selectedLayerData.y * 100) === 50 ? "#11B5BB" : undefined,
                            color: Math.round(selectedLayerData.y * 100) === 50 ? "#38bdf8" : undefined,
                          }}
                          title="Snap directly to vertical center of canvas (Y: 50%)"
                        >
                          <FaCrosshairs size={10} /> Center Y (50%)
                        </button>
                      </div>
                    </div>

                    {/* Storesparc 9-Point Quick Alignment Grid + Center Buttons */}
                    <div style={{ marginTop: "10px", background: "rgba(0,0,0,0.35)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span className="ste-sublabel" style={{ fontWeight: 700, color: "#11B5BB" }}>
                          Quick Alignment
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px" }}>
                        {[
                          ["↖ TL", 0.15, 0.15],
                          ["↑ TC", 0.50, 0.15],
                          ["↗ TR", 0.85, 0.15],
                          ["← CL", 0.15, 0.50],
                          ["✦ C", 0.50, 0.50],
                          ["→ CR", 0.85, 0.50],
                          ["↙ BL", 0.15, 0.85],
                          ["↓ BC", 0.50, 0.85],
                          ["↘ BR", 0.85, 0.85],
                        ].map(([lbl, ax, ay]) => (
                          <button
                            key={lbl as string}
                            type="button"
                            className="ste-btn ste-btn--secondary ste-btn--sm"
                            style={{ padding: "4px", fontSize: "0.7rem", justifyContent: "center" }}
                            onClick={() => updateCurrentLayer(selectedLayer, { x: ax as number, y: ay as number })}
                          >
                            {lbl}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px", marginTop: "6px" }}>
                        <button
                          type="button"
                          className="ste-btn ste-btn--secondary ste-btn--sm"
                          style={{ fontSize: "10px", justifyContent: "center", padding: "4px" }}
                          onClick={() => updateCurrentLayer(selectedLayer, { x: 0.5 })}
                          title="Center Horizontally"
                        >
                          Center X
                        </button>
                        <button
                          type="button"
                          className="ste-btn ste-btn--secondary ste-btn--sm"
                          style={{ fontSize: "10px", justifyContent: "center", padding: "4px" }}
                          onClick={() => updateCurrentLayer(selectedLayer, { y: 0.5 })}
                          title="Center Vertically"
                        >
                          Center Y
                        </button>
                        <button
                          type="button"
                          className="ste-btn ste-btn--secondary ste-btn--sm"
                          style={{ fontSize: "10px", justifyContent: "center", padding: "4px", color: "#f59e0b" }}
                          onClick={() => {
                            const def = DEFAULT_LAYERS[activeRatio][selectedLayer];
                            if (def) updateCurrentLayer(selectedLayer, { x: def.x, y: def.y, size: def.size });
                          }}
                          title="Reset to default coordinates"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Badges, Shapes & Colors */}
                  {isTextLayer && (
                    <>
                      <div className="ste-field-group">
                        <label className="ste-label">Badge Shape / Background</label>
                        <select
                          value={selectedLayerData.shape || "none"}
                          onChange={(e) =>
                            updateCurrentLayer(selectedLayer, {
                              shape: e.target.value as any,
                              bgMode: e.target.value === "none" ? "transparent" : "color",
                            })
                          }
                          className="ste-select"
                        >
                          <option value="origami">🏷️ 3D Folded Banner (Retail Origami)</option>
                          <option value="rounded">Rounded Badge (Modern Curved)</option>
                          <option value="none">No Background Shape (Transparent Text)</option>
                          <option value="pill">Pill / Capsule</option>
                          <option value="circle">Circle Badge</option>
                          <option value="rect">Rectangle</option>
                          <option value="ribbon">Angled Ribbon / Parallelogram</option>
                        </select>
                        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                          <button
                            type="button"
                            onClick={() =>
                              updateCurrentLayer(selectedLayer, {
                                shape: "none",
                                bgMode: "transparent",
                              })
                            }
                            className="ste-btn-secondary"
                            style={{
                              flex: 1,
                              padding: "6px 8px",
                              fontSize: "11px",
                              fontWeight: 600,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "5px",
                              background: selectedLayerData.shape === "none" ? "#dc2626" : "#1e293b",
                              color: "#fff",
                              borderRadius: "6px",
                              border: "1px solid #475569",
                              cursor: "pointer",
                            }}
                            title="Remove background from this badge (make it transparent text only)"
                          >
                            <FaTrash style={{ fontSize: "10px" }} /> Remove Badge BG
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateCurrentLayer(selectedLayer, {
                                shape: "rounded",
                                bgMode: "color",
                                bgColor: selectedLayerData.bgColor || "#ffc700",
                              })
                            }
                            className="ste-btn-secondary"
                            style={{
                              flex: 1,
                              padding: "6px 8px",
                              fontSize: "11px",
                              fontWeight: 600,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "5px",
                              background: selectedLayerData.shape === "rounded" ? "#0284c7" : "#1e293b",
                              color: "#fff",
                              borderRadius: "6px",
                              border: "1px solid #475569",
                              cursor: "pointer",
                            }}
                            title="Make badge rounded"
                          >
                            <FaCheck style={{ fontSize: "10px" }} /> Make Rounded
                          </button>
                        </div>
                      </div>

                      {/* Quick Vibrant Retail Swatches Palette */}
                      <div style={{ marginBottom: "6px" }}>
                        <span className="ste-sublabel" style={{ display: "block", marginBottom: "4px" }}>Quick Color Swatches</span>
                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                          {["#ffffff", "#000000", "#ffc700", "#ef4444", "#10b981", "#3b82f6", "#8b5cf6", "#f97316", "#ec4899", "#11b5bb"].map((col) => (
                            <button
                              key={col}
                              type="button"
                              onClick={() => updateCurrentLayer(selectedLayer, { fontColor: col })}
                              style={{
                                width: "19px",
                                height: "19px",
                                borderRadius: "4px",
                                background: col,
                                border: selectedLayerData.fontColor?.toLowerCase() === col.toLowerCase() ? "2px solid #11b5bb" : "1px solid rgba(255,255,255,0.2)",
                                cursor: "pointer",
                              }}
                              title={`Apply ${col} to Text Color`}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="ste-colors-grid">
                        <div>
                          <span className="ste-sublabel">Text Color</span>
                          <input
                            type="color"
                            value={selectedLayerData.fontColor || "#ffffff"}
                            onChange={(e) =>
                              updateCurrentLayer(selectedLayer, { fontColor: e.target.value })
                            }
                            className="ste-color-picker"
                          />
                        </div>
                        <div>
                          <span className="ste-sublabel">Badge BG Color</span>
                          <input
                            type="color"
                            value={selectedLayerData.bgColor || "#ffc700"}
                            onChange={(e) =>
                              updateCurrentLayer(selectedLayer, { bgColor: e.target.value })
                            }
                            className="ste-color-picker"
                          />
                        </div>
                      </div>

                      <div className="ste-field-group">
                        <label className="ste-label">Border</label>
                        <div className="ste-border-row">
                          <select
                            value={selectedLayerData.border || "0"}
                            onChange={(e) =>
                              updateCurrentLayer(selectedLayer, { border: e.target.value as any })
                            }
                            className="ste-select"
                            style={{ flex: 1 }}
                          >
                            <option value="0">No Border</option>
                            <option value="1">With Border</option>
                          </select>
                          <input
                            type="color"
                            value={selectedLayerData.borderColor || "#ffffff"}
                            onChange={(e) =>
                              updateCurrentLayer(selectedLayer, { borderColor: e.target.value })
                            }
                            className="ste-color-picker"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Image Shape, Border Radius & Stroke Controls for Product Image & Logo */}
                  {(selectedLayer === "product" || selectedLayer === "logo") && (
                    <div className="ste-field-group" style={{ background: "rgba(17, 181, 187, 0.05)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(17, 181, 187, 0.25)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                        <label className="ste-label" style={{ margin: 0, color: "#11B5BB", fontWeight: 700 }}>
                          Image Shape & Curvature
                        </label>
                        <span style={{ fontSize: "11px", color: "#38bdf8", fontWeight: 700 }}>
                          {selectedLayerData.shape === "circle" || selectedLayerData.borderRadius === 50 ? "Circle (50%)" : `${selectedLayerData.borderRadius ?? (selectedLayerData.shape === "rounded" ? 16 : 0)}%`}
                        </span>
                      </div>

                      {/* Quick Shape Presets */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px", marginBottom: "10px" }}>
                        {[
                          { id: "rect", label: "Sharp", icon: "🟩", radius: 0, shape: "rect" },
                          { id: "subtle", label: "Curved", icon: "🔲", radius: 12, shape: "rounded" },
                          { id: "card", label: "Rounded", icon: "🔘", radius: 24, shape: "rounded" },
                          { id: "circle", label: "Circle", icon: "⚪", radius: 50, shape: "circle" },
                        ].map((preset) => {
                          const isActive = preset.shape === "circle"
                            ? selectedLayerData.shape === "circle" || selectedLayerData.borderRadius === 50
                            : preset.radius === 0
                            ? (!selectedLayerData.borderRadius || selectedLayerData.borderRadius === 0) && selectedLayerData.shape !== "circle"
                            : selectedLayerData.borderRadius === preset.radius;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                updateCurrentLayer(selectedLayer, {
                                  shape: preset.shape as any,
                                  borderRadius: preset.radius,
                                });
                              }}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                gap: "2px",
                                padding: "6px 4px",
                                borderRadius: "6px",
                                border: isActive ? "1.5px solid #11B5BB" : "1px solid rgba(255, 255, 255, 0.12)",
                                background: isActive ? "rgba(17, 181, 187, 0.2)" : "rgba(255, 255, 255, 0.04)",
                                color: isActive ? "#ffffff" : "#94a3b8",
                                fontSize: "10px",
                                fontWeight: isActive ? 700 : 500,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <span style={{ fontSize: "13px" }}>{preset.icon}</span>
                              <span>{preset.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Corner Radius Slider */}
                      <div style={{ marginBottom: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span className="ste-sublabel">Corner Radius</span>
                          <span style={{ fontSize: "10px", color: "#94a3b8" }}>{selectedLayerData.borderRadius ?? (selectedLayerData.shape === "rounded" ? 16 : 0)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="50"
                          step="1"
                          value={selectedLayerData.borderRadius ?? (selectedLayerData.shape === "circle" ? 50 : selectedLayerData.shape === "rounded" ? 16 : 0)}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            updateCurrentLayer(selectedLayer, {
                              borderRadius: val,
                              shape: val === 50 ? "circle" : val > 0 ? "rounded" : "rect",
                            });
                          }}
                          className="ste-slider"
                          style={{ width: "100%" }}
                        />
                      </div>

                      {/* Border Stroke & Color */}
                      <div style={{ marginBottom: "10px" }}>
                        <span className="ste-sublabel">Border Stroke</span>
                        <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
                          <select
                            value={selectedLayerData.borderWidth ?? (selectedLayerData.border === "1" ? 2 : 0)}
                            onChange={(e) => {
                              const w = Number(e.target.value);
                              updateCurrentLayer(selectedLayer, {
                                borderWidth: w,
                                border: w > 0 ? "1" : "0",
                              });
                            }}
                            className="ste-select"
                            style={{ flex: 1 }}
                          >
                            <option value="0">None (0px)</option>
                            <option value="1">Thin (1px)</option>
                            <option value="2">Medium (2px)</option>
                            <option value="3">Solid (3px)</option>
                            <option value="4">Bold (4px)</option>
                            <option value="6">Thick (6px)</option>
                          </select>
                          <input
                            type="color"
                            value={selectedLayerData.borderColor || "#ffffff"}
                            onChange={(e) =>
                              updateCurrentLayer(selectedLayer, {
                                borderColor: e.target.value,
                                border: "1",
                                borderWidth: selectedLayerData.borderWidth || 2,
                              })
                            }
                            className="ste-color-picker"
                            title="Border Stroke Color"
                          />
                        </div>
                      </div>

                      {/* Drop Shadow Toggle */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span className="ste-sublabel" style={{ margin: 0 }}>Drop Shadow</span>
                        <input
                          type="checkbox"
                          checked={Boolean(selectedLayerData.shadow)}
                          onChange={(e) => updateCurrentLayer(selectedLayer, { shadow: e.target.checked })}
                          style={{ cursor: "pointer", width: "16px", height: "16px", accentColor: "#11B5BB" }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Animation & Speed */}
                  <div className="ste-field-group">
                    <label className="ste-label">Entry Motion</label>
                    <select
                      value={selectedLayerData.animation || "fade_in"}
                      onChange={(e) =>
                        updateCurrentLayer(selectedLayer, { animation: e.target.value })
                      }
                      className="ste-select"
                    >
                      <option value="fade_in">Fade In</option>
                      <option value="fade_out">Fade Out</option>
                      <option value="slide_up">Slide Up</option>
                      <option value="slide_down">Slide Down</option>
                      <option value="slide_left">Slide Left</option>
                      <option value="slide_right">Slide Right</option>
                      <option value="zoom_in">Zoom In</option>
                      <option value="zoom_bounce">Zoom Bounce</option>
                      <option value="pulse">Pulse Glow</option>
                      <option value="float">Gentle Float</option>
                      <option value="shake">Shake Alert</option>
                      <option value="rotate">Rotation Entry</option>
                      <option value="elastic">Elastic Snap</option>
                      <option value="fade_up">Fade Up</option>
                      <option value="none">Static (No Animation)</option>
                    </select>

                    <div className="ste-timing-row">
                      <div>
                        <span className="ste-sublabel">Start (s)</span>
                        <input
                          type="number"
                          min="0"
                          max="20"
                          step="0.1"
                          value={selectedLayerData.animStart ?? 0.5}
                          onChange={(e) =>
                            updateCurrentLayer(selectedLayer, {
                              animStart: Number(e.target.value),
                            })
                          }
                          className="ste-input"
                        />
                      </div>
                      <div>
                        <span className="ste-sublabel">End (s)</span>
                        <input
                          type="number"
                          min="0.1"
                          max="20"
                          step="0.1"
                          value={selectedLayerData.animEnd ?? 1.5}
                          onChange={(e) =>
                            updateCurrentLayer(selectedLayer, {
                              animEnd: Number(e.target.value),
                            })
                          }
                          className="ste-input"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : selectedDecorId && decorations.find((d) => d.id === selectedDecorId) ? (
                (() => {
                  const decor = decorations.find((d) => d.id === selectedDecorId)!;
                  return (
                    <div className="ste-inspector-controls">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", background: "rgba(0,0,0,0.35)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", gap: "8px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 800, color: "#11B5BB", letterSpacing: "0.03em" }}>
                          STICKER / IMAGE
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setDecorations((prev) => prev.filter((d) => d.id !== selectedDecorId));
                            setSelectedDecorId(null);
                            showToast("🗑️ Sticker deleted");
                          }}
                          style={{
                            background: "rgba(239, 68, 68, 0.2)",
                            border: "1px solid #ef4444",
                            color: "#ef4444",
                            borderRadius: "6px",
                            padding: "3px 8px",
                            fontSize: "11px",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <FaTrash size={10} /> Delete
                        </button>
                      </div>

                      {/* Preview Image */}
                      <div style={{ display: "flex", justifyContent: "center", padding: "12px", background: "#051419", borderRadius: "8px", border: "1px solid #163B45" }}>
                        <img src={decor.url} alt="Sticker" style={{ maxHeight: "70px", maxWidth: "100%", objectFit: "contain" }} />
                      </div>

                      {/* Position X */}
                      <div className="ste-field-group">
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <label className="ste-label">Horizontal Position (X)</label>
                          <span style={{ fontSize: "11px", color: "#11B5BB", fontWeight: 700 }}>{Math.round(decor.x * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={Math.round(decor.x * 100)}
                          onChange={(e) => {
                            const val = Number(e.target.value) / 100;
                            setDecorations((prev) => prev.map((d) => d.id === decor.id ? { ...d, x: val } : d));
                          }}
                          className="ste-range"
                        />
                      </div>

                      {/* Position Y */}
                      <div className="ste-field-group">
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <label className="ste-label">Vertical Position (Y)</label>
                          <span style={{ fontSize: "11px", color: "#11B5BB", fontWeight: 700 }}>{Math.round(decor.y * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={Math.round(decor.y * 100)}
                          onChange={(e) => {
                            const val = Number(e.target.value) / 100;
                            setDecorations((prev) => prev.map((d) => d.id === decor.id ? { ...d, y: val } : d));
                          }}
                          className="ste-range"
                        />
                      </div>

                      {/* Size / Scale */}
                      <div className="ste-field-group">
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <label className="ste-label">Size / Scale</label>
                          <span style={{ fontSize: "11px", color: "#11B5BB", fontWeight: 700 }}>{decor.size}%</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="60"
                          value={decor.size}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setDecorations((prev) => prev.map((d) => d.id === decor.id ? { ...d, size: val } : d));
                          }}
                          className="ste-range"
                        />
                      </div>

                      {/* Sticker Corner Radius Slider */}
                      <div className="ste-field-group">
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <label className="ste-label">Corner Radius / Curve</label>
                          <span style={{ fontSize: "11px", color: "#11B5BB", fontWeight: 700 }}>{decor.borderRadius || 0}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="50"
                          value={decor.borderRadius || 0}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setDecorations((prev) => prev.map((d) => d.id === decor.id ? { ...d, borderRadius: val, shape: val === 50 ? "circle" : val > 0 ? "rounded" : "rect" } : d));
                          }}
                          className="ste-range"
                        />
                      </div>

                      {/* Center button */}
                      <button
                        type="button"
                        onClick={() => {
                          setDecorations((prev) => prev.map((d) => d.id === decor.id ? { ...d, x: 0.5, y: 0.5 } : d));
                          showToast("🎯 Centered on canvas");
                        }}
                        className="ste-btn ste-btn--secondary"
                        style={{ width: "100%", justifyContent: "center" }}
                      >
                        <FaCrosshairs /> Center Sticker (50%, 50%)
                      </button>
                    </div>
                  );
                })()
              ) : (
                <div className="ste-empty-inspector">
                  <FaEye />
                  <p>Click any layer or sticker on the canvas to inspect and edit its properties.</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ══════════════ MODAL: CREATE NEW VIDEO TEMPLATE ══════════════ */}
      {showCreateModal && (
        <div className="ste-modal-overlay">
          <div className="ste-modal">
            <div className="ste-modal__header">
              <div className="ste-modal__title-wrap">
                <FaPlus className="ste-accent-icon" />
                <h3>Create New Video Template</h3>
              </div>
              <button
                className="ste-modal__close"
                onClick={() => setShowCreateModal(false)}
                type="button"
              >
                <FaXmark />
              </button>
            </div>

            <form onSubmit={handleConfirmCreateTemplate}>
              <div className="ste-modal__body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Template ID info */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(17,181,187,0.1)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(17,181,187,0.25)" }}>
                  <span style={{ fontSize: "0.82rem", color: "#cbd5e1" }}>Assigned Sequential ID:</span>
                  <span style={{ fontWeight: 800, color: "#11B5BB", fontSize: "0.95rem", fontFamily: "monospace" }}>
                    Template #{getNextTemplateId()}
                  </span>
                </div>

                {/* Template Name */}
                <div className="ste-field-group">
                  <label className="ste-label">Template Name *</label>
                  <input
                    type="text"
                    className="ste-input"
                    placeholder="Enter template name (e.g. Weekend Flash Offer)"
                    value={newTplName}
                    onChange={(e) => setNewTplName(e.target.value)}
                    autoFocus
                    required
                  />
                  <span className="ste-sublabel">Give your template a recognizable name for future editing and scheduling.</span>
                </div>

                {/* Duration */}
                <div className="ste-field-group">
                  <label className="ste-label">Video Duration (Seconds) *</label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px" }}>
                    {[5, 8, 10, 15, 30].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        className={`ste-ratio-chip ${newTplDuration === sec ? "ste-ratio-chip--active" : ""}`}
                        style={{ padding: "8px 0", textAlign: "center", fontSize: "0.8rem", justifyContent: "center" }}
                        onClick={() => setNewTplDuration(sec)}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "6px" }}>
                    <span className="ste-sublabel">Or Custom Duration:</span>
                    <input
                      type="number"
                      min="3"
                      max="60"
                      className="ste-input"
                      style={{ width: "100px" }}
                      value={newTplDuration}
                      onChange={(e) => setNewTplDuration(Math.max(1, Number(e.target.value)))}
                    />
                    <span className="ste-sublabel">sec</span>
                  </div>
                </div>

                {/* Aspect Ratio */}
                <div className="ste-field-group">
                  <label className="ste-label">Initial Aspect Ratio</label>
                  <div className="ste-ratio-chips" style={{ width: "100%", justifyContent: "space-between" }}>
                    {(["9:16", "16:9", "1:1", "4:5"] as AspectRatio[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={`ste-ratio-chip ${newTplRatio === r ? "ste-ratio-chip--active" : ""}`}
                        onClick={() => setNewTplRatio(r)}
                      >
                        {r} {r === "9:16" ? "📱" : r === "16:9" ? "📺" : r === "1:1" ? "⏹️" : "📸"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Offer Type */}
                <div className="ste-field-group">
                  <label className="ste-label">Offer Type</label>
                  <select
                    className="ste-select"
                    value={newTplOfferType}
                    onChange={(e) => setNewTplOfferType(e.target.value)}
                  >
                    {OFFER_TYPES.map((ot) => (
                      <option key={ot} value={ot}>{ot}</option>
                    ))}
                  </select>
                </div>

                {/* Live Animated Preview in Creation Modal */}
                <div className="ste-field-group">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <label className="ste-label" style={{ marginBottom: 0 }}>
                      Live Animation &amp; Layout Preview ({newTplRatio})
                    </label>
                    <span style={{ fontSize: "0.75rem", color: "#11B5BB", fontWeight: 700 }}>
                      {newTplDuration}s · {ASPECT_SPECS[newTplRatio].label}
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "180px",
                      background: "#030c0f",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      border: "1px solid rgba(17, 181, 187, 0.3)",
                      position: "relative",
                    }}
                  >
                    <CreateModalPreviewCanvas
                      ratio={newTplRatio}
                      duration={newTplDuration}
                      offerType={newTplOfferType}
                      templateName={newTplName || "New Video Template"}
                    />
                  </div>
                </div>
              </div>

              <div className="ste-modal__actions">
                <button
                  type="button"
                  className="ste-btn ste-btn--secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ste-btn ste-btn--accent"
                >
                  <FaPlus /> Create Template (ID #{getNextTemplateId()})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL: LIVE ANIMATED VIDEO TEMPLATE PREVIEW ══════════════ */}
      {viewingTemplate && (
        <TemplateViewPreviewModal
          template={viewingTemplate}
          onClose={() => setViewingTemplate(null)}
          onEdit={() => {
            handleEditTemplate(viewingTemplate);
            setViewingTemplate(null);
          }}
        />
      )}

      {/* ══════════════ MODAL: ADD IMAGE / STICKER BADGE ══════════════ */}
      {showAddImageModal && (
        <div className="ste-modal-overlay" onClick={() => setShowAddImageModal(false)}>
          <div
            className="ste-modal ste-modal--wide"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "680px" }}
          >
            <div className="ste-modal__header">
              <div className="ste-modal__title-wrap">
                <FaImage className="ste-accent-icon" />
                <h3>Add Image / Promotional Sticker Badge</h3>
              </div>
              <button
                className="ste-modal__close"
                onClick={() => setShowAddImageModal(false)}
                type="button"
              >
                <FaXmark />
              </button>
            </div>

            <div className="ste-modal__body" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Option 1: Upload Custom Image */}
              <div style={{ background: "rgba(17, 181, 187, 0.08)", border: "1px dashed #11B5BB", padding: "18px", borderRadius: "10px", textAlign: "center" }}>
                <FaUpload size={24} style={{ color: "#11B5BB", marginBottom: "8px" }} />
                <h4 style={{ margin: "0 0 6px 0", color: "#ffffff", fontSize: "0.95rem" }}>Upload Custom Image from Computer</h4>
                <p style={{ margin: "0 0 12px 0", fontSize: "0.80rem", color: "#94a3b8" }}>
                  Supports transparent PNG logos, stickers, product cutouts, badges, or graphics (PNG, JPG, WebP, SVG).
                </p>
                <label className="ste-btn ste-btn--primary" style={{ display: "inline-flex", cursor: "pointer", alignItems: "center", gap: "6px" }}>
                  <FaUpload size={12} />
                  <span>Choose Image File</span>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      showToast("Uploading image...");
                      try {
                        const fd = new FormData();
                        fd.append("file", file);
                        const res = await fetch("/api/upload", { method: "POST", body: fd });
                        const data = await res.json();
                        const finalUrl = data.success && data.url ? data.url : URL.createObjectURL(file);
                        const newDec: DecorItem = {
                          id: `decor_${Date.now()}`,
                          url: finalUrl,
                          x: 0.5,
                          y: 0.5,
                          size: 18,
                        };
                        setDecorations((prev) => [...prev, newDec]);
                        setSelectedDecorId(newDec.id);
                        setSelectedLayer(null);
                        setShowAddImageModal(false);
                        showToast("✨ Custom image added to template! Drag to reposition.");
                      } catch {
                        const localUrl = URL.createObjectURL(file);
                        const newDec: DecorItem = {
                          id: `decor_${Date.now()}`,
                          url: localUrl,
                          x: 0.5,
                          y: 0.5,
                          size: 18,
                        };
                        setDecorations((prev) => [...prev, newDec]);
                        setSelectedDecorId(newDec.id);
                        setSelectedLayer(null);
                        setShowAddImageModal(false);
                        showToast("✨ Image added! Drag to reposition.");
                      }
                    }}
                  />
                </label>
              </div>

              {/* Option 2: Popular Retail Promo Stickers */}
              <div>
                <h4 style={{ margin: "0 0 10px 0", color: "#ffffff", fontSize: "0.90rem", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>🏷️ Ready-to-Use Retail Promotional Stickers &amp; Badges</span>
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                  {STICKER_PRESETS.map((sticker, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const newDec: DecorItem = {
                          id: `decor_${Date.now()}_${idx}`,
                          url: sticker.url,
                          x: 0.5,
                          y: 0.5,
                          size: sticker.defaultSize || 18,
                        };
                        setDecorations((prev) => [...prev, newDec]);
                        setSelectedDecorId(newDec.id);
                        setSelectedLayer(null);
                        setShowAddImageModal(false);
                        showToast(`✨ "${sticker.name}" added to template! Drag to reposition.`);
                      }}
                      style={{
                        background: "#081d24",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "8px",
                        padding: "12px 8px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      className="ste-sticker-card"
                    >
                      <img
                        src={sticker.url}
                        alt={sticker.name}
                        style={{ height: "54px", objectFit: "contain" }}
                      />
                      <span style={{ fontSize: "0.78rem", color: "#cbd5e1", fontWeight: 600 }}>
                        {sticker.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="ste-modal__actions">
              <button
                type="button"
                className="ste-btn ste-btn--secondary"
                onClick={() => setShowAddImageModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL: CONFIRM DELETE TEMPLATE ══════════════ */}
      {deletingTemplate && (
        <div className="ste-modal-overlay">
          <div className="ste-modal">
            <div className="ste-modal__header">
              <div className="ste-modal__title-wrap">
                <FaTrash style={{ color: "#ef4444" }} />
                <h3>Delete Video Template</h3>
              </div>
              <button
                className="ste-modal__close"
                onClick={() => setDeletingTemplate(null)}
              >
                <FaXmark />
              </button>
            </div>
            <div className="ste-modal__body">
              <p style={{ color: "#cbd5e1", margin: 0 }}>
                Are you sure you want to permanently delete template{" "}
                <strong style={{ color: "#fff" }}>
                  "#{deletingTemplate.templateId || (savedTemplatesList.indexOf(deletingTemplate) + 1)} - {deletingTemplate.templateName}"
                </strong>
                ? This action cannot be undone.
              </p>
            </div>
            <div className="ste-modal__actions">
              <button
                className="ste-btn ste-btn--secondary"
                onClick={() => setDeletingTemplate(null)}
              >
                Cancel
              </button>
              <button
                className="ste-btn"
                style={{ background: "#dc2626", color: "#fff" }}
                onClick={() => handleDeleteTemplate(deletingTemplate)}
              >
                <FaTrash /> Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL: RENAME TEMPLATE ══════════════ */}
      {renamingTemplate && (
        <div className="ste-modal-overlay">
          <div className="ste-modal">
            <div className="ste-modal__header">
              <div className="ste-modal__title-wrap">
                <FaPen className="ste-accent-icon" />
                <h3>Rename Template</h3>
              </div>
              <button
                className="ste-modal__close"
                onClick={() => setRenamingTemplate(null)}
              >
                <FaXmark />
              </button>
            </div>
            <form onSubmit={handleQuickRename}>
              <div className="ste-modal__body">
                <div style={{ background: "rgba(17,181,187,0.12)", border: "1px solid rgba(17,181,187,0.3)", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Template ID:</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#11B5BB", fontSize: "1rem" }}>
                    #{renamingTemplate.templateId || (savedTemplatesList.indexOf(renamingTemplate) + 1)}
                  </span>
                </div>
                <div className="ste-field-group">
                  <label className="ste-label">New Template Name *</label>
                  <input
                    type="text"
                    className="ste-input"
                    placeholder="Enter template name..."
                    value={renameInput}
                    onChange={(e) => setRenameInput(e.target.value)}
                    autoFocus
                    required
                  />
                  <span className="ste-sublabel">Enter a new recognizable title for this video template.</span>
                </div>
              </div>
              <div className="ste-modal__actions">
                <button
                  type="button"
                  className="ste-btn ste-btn--secondary"
                  onClick={() => setRenamingTemplate(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ste-btn ste-btn--accent"
                  disabled={!renameInput.trim()}
                >
                  <FaFloppyDisk /> Save New Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL: RENDERED VIDEO PREVIEW ══════════════ */}
      {renderedVideoUrl && (
        <div className="ste-modal-overlay">
          <div className="ste-modal ste-modal--wide">
            <div className="ste-modal__header">
              <div className="ste-modal__title-wrap">
                <FaVideo className="ste-accent-icon" />
                <h3>Video Render Complete!</h3>
              </div>
              <button
                className="ste-modal__close"
                onClick={() => setRenderedVideoUrl(null)}
              >
                <FaXmark />
              </button>
            </div>
            <div className="ste-modal__video-wrap">
              <video
                src={renderedVideoUrl}
                controls
                autoPlay
                loop
                className="ste-modal__video"
              />
            </div>
            <div className="ste-modal__actions">
              <a
                href={renderedVideoUrl}
                download="storesparc_video.mp4"
                target="_blank"
                rel="noreferrer"
                className="ste-btn ste-btn--accent"
                style={{ textDecoration: "none" }}
              >
                <FaDownload /> Download MP4
              </a>
              <button
                className="ste-btn ste-btn--secondary"
                onClick={() => setRenderedVideoUrl(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Studio Stylesheet ── */}
      <style jsx>{`
        .ste-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          max-height: 100%;
          width: 100%;
          background: #07171d;
          color: #f8fafc;
          font-family: "Inter", system-ui, -apple-system, sans-serif;
          overflow: hidden;
          box-sizing: border-box;
        }

        /* Topbar */
        .ste-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 18px;
          background: #0b2830;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          gap: 12px;
          flex-shrink: 0;
          height: 52px;
          box-sizing: border-box;
        }
        .ste-topbar__left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ste-back-btn {
          background: rgba(255, 255, 255, 0.08);
          border: none;
          color: #94a3b8;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .ste-back-btn:hover {
          background: rgba(255, 255, 255, 0.16);
          color: #fff;
        }
        .ste-title-group {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 1;
          min-width: 0;
        }
        .ste-badge {
          background: #11b5bb;
          color: #05191e;
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          padding: 3px 8px;
          border-radius: 4px;
        }
        .ste-template-name-input {
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.22);
          color: #fff;
          font-size: 0.95rem;
          font-weight: 700;
          padding: 6px 30px 6px 12px;
          border-radius: 8px;
          outline: none;
          min-width: 130px; max-width: 220px;
          transition: all 0.2s;
        }
        .ste-template-name-input:hover {
          border-color: rgba(17, 181, 187, 0.6);
          background: rgba(0, 0, 0, 0.65);
        }
        .ste-template-name-input:focus {
          background: #051419;
          border-color: #11b5bb;
          box-shadow: 0 0 0 2px rgba(17, 181, 187, 0.25);
        }

        /* Mode Tabs */
        .ste-mode-tabs {
          display: flex;
          background: rgba(0, 0, 0, 0.35);
          padding: 4px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          gap: 4px;
        }
        .ste-mode-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 0.8rem;
          font-weight: 700;
          padding: 6px 14px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ste-mode-tab:hover {
          color: #fff;
        }
        .ste-mode-tab.active {
          background: #11b5bb;
          color: #07171d;
        }

        /* Topbar buttons */
        .ste-topbar__right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ste-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          font-size: 0.82rem;
          font-weight: 700;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ste-btn--sm {
          padding: 6px 12px;
          font-size: 0.75rem;
        }
        .ste-btn--secondary {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        .ste-btn--secondary:hover {
          background: rgba(255, 255, 255, 0.18);
        }
        .ste-btn--accent {
          background: linear-gradient(135deg, #f05a28, #dc4b1d);
          color: #fff;
          box-shadow: 0 4px 14px rgba(240, 90, 40, 0.3);
        }
        .ste-btn--accent:hover {
          filter: brightness(1.1);
        }
        .ste-btn--primary {
          background: #11b5bb;
          color: #07171d;
        }
        .ste-btn--primary:hover {
          background: #0ea2a7;
        }
        .ste-btn--ghost {
          background: transparent;
          color: #94a3b8;
        }
        .ste-btn--ghost:hover {
          color: #fff;
        }

        /* Workspace Grid */
        .ste-workspace {
          display: flex;
          flex: 1;
          height: calc(100% - 52px);
          min-height: 0;
          overflow: hidden;
          position: relative;
        }
        .ste-panel {
          width: 260px;
          min-width: 260px;
          max-width: 260px;
          background: #092027;
          border-right: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          height: 100%;
          min-height: 0;
          transition: width 0.22s cubic-bezier(0.4, 0, 0.2, 1),
                      min-width 0.22s cubic-bezier(0.4, 0, 0.2, 1),
                      max-width 0.22s cubic-bezier(0.4, 0, 0.2, 1),
                      opacity 0.18s ease;
          overflow: hidden;
          z-index: 5;
        }
        .ste-panel--collapsed {
          width: 0 !important;
          min-width: 0 !important;
          max-width: 0 !important;
          border-right: none !important;
          border-left: none !important;
          opacity: 0;
          pointer-events: none;
        }
        .ste-panel--inspector {
          border-right: none;
          border-left: 1px solid rgba(255, 255, 255, 0.06);
        }
        .ste-panel__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          height: 46px;
          box-sizing: border-box;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          color: #11b5bb;
          font-size: 0.85rem;
          font-weight: 700;
          flex-shrink: 0;
          white-space: nowrap;
        }
        .ste-panel__header h4 {
          margin: 0;
          color: #fff;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.01em;
        }
        .ste-panel-collapse-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #94a3b8;
          width: 26px;
          height: 26px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .ste-panel-collapse-btn:hover {
          background: rgba(17, 181, 187, 0.15);
          border-color: #11b5bb;
          color: #11b5bb;
        }
        .ste-panel-toggle-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(17, 181, 187, 0.12);
          border: 1px solid rgba(17, 181, 187, 0.3);
          color: #11b5bb;
          padding: 4px 10px;
          border-radius: 16px;
          font-size: 0.72rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .ste-panel-toggle-pill:hover {
          background: #11b5bb;
          color: #07171d;
          box-shadow: 0 2px 8px rgba(17, 181, 187, 0.35);
        }
        .ste-panel__body {
          padding: 14px 16px 80px 16px;
          overflow-y: auto;
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        /* Form Controls */
        .ste-field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ste-label {
          font-size: 0.74rem;
          font-weight: 700;
          color: #cbd5e1;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .ste-sublabel {
          font-size: 0.72rem;
          color: #94a3b8;
        }
        .ste-input,
        .ste-select {
          background: #051419;
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #fff;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 0.84rem;
          outline: none;
          width: 100%;
          box-sizing: border-box;
        }
        .ste-input:focus,
        .ste-select:focus {
          border-color: #11b5bb;
        }

        .ste-ratio-chips {
          display: flex;
          background: rgba(0, 0, 0, 0.35);
          padding: 4px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          gap: 4px;
        }
        .ste-ratio-chip {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 5px 10px;
          border-radius: 5px;
          cursor: pointer;
        }
        .ste-ratio-chip--active {
          background: #11b5bb;
          color: #07171d;
        }

        .ste-accordion {
          background: #051419;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          overflow: hidden;
        }
        .ste-accordion__summary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          font-size: 0.8rem;
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.03);
        }
        .ste-accordion__content {
          padding: 12px 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .ste-btn-toggle {
          display: flex;
          background: #051419;
          border-radius: 6px;
          padding: 2px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .ste-btn-toggle__btn {
          flex: 1;
          padding: 6px;
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 0.74rem;
          font-weight: 700;
          border-radius: 4px;
          cursor: pointer;
        }
        .ste-btn-toggle__btn.active {
          background: #11b5bb;
          color: #07171d;
        }

        .ste-gradient-presets {
          display: flex;
          gap: 8px;
          margin-top: 6px;
        }
        .ste-grad-thumb {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          border: 2px solid transparent;
          transition: transform 0.15s;
        }
        .ste-grad-thumb:hover {
          transform: scale(1.1);
        }
        .ste-grad-thumb.active {
          border-color: #fff;
        }

        .ste-upload-box {
          position: relative;
        }
        .ste-upload-box input[type="file"] {
          display: none;
        }
        .ste-upload-label {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #051419;
          border: 1.5px dashed rgba(255, 255, 255, 0.18);
          color: #cbd5e1;
          padding: 9px;
          border-radius: 8px;
          font-size: 0.78rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ste-upload-label:hover {
          border-color: #11b5bb;
          color: #11b5bb;
        }
        .ste-asset-preview {
          margin-top: 6px;
          height: 55px;
          border-radius: 6px;
          overflow: hidden;
          background: #051419;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ste-asset-preview img {
          max-height: 100%;
          max-width: 100%;
          object-fit: contain;
        }
        .ste-file-badge {
          font-size: 0.7rem;
          color: #11b5bb;
          margin-top: 4px;
          display: block;
        }

        .ste-specs-grid,
        .ste-timing-row,
        .ste-border-row,
        .ste-colors-grid {
          display: flex;
          gap: 8px;
        }
        .ste-coords-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ste-color-picker {
          width: 44px;
          height: 36px;
          background: transparent;
          border: none;
          cursor: pointer;
        }

        /* Stage (Center) */
        .ste-stage {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: radial-gradient(circle at 50% 45%, #082129 0%, #030c10 100%);
          position: relative;
          overflow: hidden;
          min-width: 0;
          min-height: 0;
          height: 100%;
          transition: all 0.25s ease;
        }
        .ste-stage--fullscreen {
          position: fixed;
          inset: 0;
          z-index: 99999;
          width: 100vw;
          height: 100vh;
          background: radial-gradient(circle at 50% 45%, #0a2731 0%, #02090c 100%);
        }

        /* Stage Toolbar */
        .ste-stage-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 14px;
          height: 46px;
          background: rgba(7, 23, 29, 0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          gap: 10px;
          z-index: 10;
          flex-shrink: 0;
          box-sizing: border-box;
        }
        .ste-stage-toolbar__left {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .ste-stage-ratio-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(17, 181, 187, 0.14);
          border: 1px solid rgba(17, 181, 187, 0.35);
          padding: 3px 8px;
          border-radius: 16px;
          font-size: 0.72rem;
          font-weight: 700;
          color: #11b5bb;
          white-space: nowrap;
        }
        .ste-stage-res-badge {
          font-size: 0.7rem;
          color: #94a3b8;
          background: rgba(255, 255, 255, 0.06);
          padding: 2px 7px;
          border-radius: 5px;
          font-family: monospace;
          border: 1px solid rgba(255, 255, 255, 0.06);
          white-space: nowrap;
        }
        .ste-stage-ratio-switcher {
          display: flex;
          background: rgba(0, 0, 0, 0.4);
          padding: 2px;
          border-radius: 7px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          gap: 2px;
        }
        .ste-stage-ratio-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 3px 7px;
          border-radius: 5px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .ste-stage-ratio-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.06);
        }
        .ste-stage-ratio-btn.active {
          background: #11b5bb;
          color: #06181d;
        }

        .ste-stage-toolbar__center {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #cbd5e1;
          font-size: 0.74rem;
          flex: 1;
          min-width: 0;
          overflow: hidden;
        }
        .ste-stage-hint {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(255, 255, 255, 0.04);
          padding: 3px 10px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: #94a3b8;
          font-size: 0.72rem;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ste-stage-coord-sub {
          font-family: monospace;
          opacity: 0.85;
          font-size: 0.68rem;
        }
        .ste-stage-hint--active {
          background: rgba(240, 90, 40, 0.15);
          border-color: rgba(240, 90, 40, 0.4);
          color: #f05a28;
          font-weight: 700;
        }

        .ste-stage-toolbar__right {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .ste-stage-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #fff;
          padding: 4px 10px;
          border-radius: 7px;
          font-size: 0.72rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .ste-stage-btn:hover {
          background: rgba(255, 255, 255, 0.16);
          border-color: #11b5bb;
          color: #11b5bb;
        }
        .ste-stage-btn--active {
          background: #f05a28;
          border-color: #f05a28;
          color: #fff;
        }
        .ste-stage-btn--active:hover {
          background: #dc4b1d;
          color: #fff;
        }

        /* Canvas Container & Mathematically Responsive Viewport */
        .ste-stage-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px;
          height: 40px;
          min-height: 40px;
          max-height: 40px;
          background: rgba(7, 23, 29, 0.95);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          gap: 8px;
          z-index: 10;
          flex-shrink: 0;
          box-sizing: border-box;
          overflow-x: auto;
          scrollbar-width: none;
          white-space: nowrap;
        }
        .ste-stage-toolbar::-webkit-scrollbar {
          display: none;
        }
        .ste-stage-layer-strip {
          height: 36px;
          min-height: 36px;
          max-height: 36px;
          overflow-x: auto;
          scrollbar-width: none;
          white-space: nowrap;
          box-sizing: border-box;
        }
        .ste-stage-layer-strip::-webkit-scrollbar {
          display: none;
        }
        .ste-docked-element-bar {
          height: 42px;
          min-height: 42px;
          max-height: 42px;
          overflow-x: auto;
          scrollbar-width: none;
          white-space: nowrap;
          box-sizing: border-box;
        }
        .ste-docked-element-bar::-webkit-scrollbar {
          display: none;
        }
        .ste-unified-player-bar {
          height: 44px;
          min-height: 44px;
          max-height: 44px;
          overflow-x: auto;
          scrollbar-width: none;
          white-space: nowrap;
          box-sizing: border-box;
        }
        .ste-unified-player-bar::-webkit-scrollbar {
          display: none;
        }
        .ste-canvas-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          position: relative;
          overflow: hidden;
          min-height: 0;
          min-width: 0;
          box-sizing: border-box;
          width: 100%;
          height: 100%;
        }
        .ste-canvas-viewport {
          position: relative;
          max-width: 100%;
          max-height: 100%;
          width: auto;
          height: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          overflow: hidden;
          background: #000;
          touch-action: none;
          user-select: none;
        }
        .ste-interactive-canvas {
          width: 100%;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          display: block;
          object-fit: contain;
          touch-action: none;
          user-select: none;
        }
        .ste-drag-coord-pill {
          position: absolute;
          transform: translate(-50%, -135%);
          background: rgba(7, 23, 29, 0.94);
          border: 1.5px solid #11b5bb;
          color: #fff;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 0.72rem;
          font-weight: 700;
          pointer-events: none;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.65);
          white-space: nowrap;
          z-index: 50;
        }
        .ste-viewport-ratio-tag {
          position: absolute;
          bottom: 10px;
          right: 12px;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          color: #94a3b8;
          font-size: 0.68rem;
          font-family: monospace;
          padding: 3px 8px;
          border-radius: 4px;
          pointer-events: none;
          border: 1px solid rgba(255, 255, 255, 0.08);
          z-index: 5;
        }

        /* Floating Fullscreen Inspector */
        .ste-fs-floating-inspector {
          position: absolute;
          top: 60px;
          right: 20px;
          width: 320px;
          max-height: calc(100vh - 140px);
          background: rgba(9, 32, 39, 0.94);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 12px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
          z-index: 60;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .ste-fs-floating-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: rgba(5, 20, 25, 0.85);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .ste-fs-floating-body {
          padding: 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* Unified Responsive Player Bar */
        .ste-unified-player-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 14px;
          height: 44px;
          min-height: 44px;
          background: #081d24;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          gap: 8px;
          flex-shrink: 0;
          box-sizing: border-box;
          z-index: 10;
          width: 100%;
        }

        .ste-topbar-btn {
          padding: 6px 12px !important;
          font-size: 0.78rem !important;
          white-space: nowrap !important;
          flex-shrink: 0 !important;
          height: 32px !important;
        }

        /* Playback Bar (legacy fallback) */
        .ste-playback-bar {
          display: flex;
          align-items: center;
          padding: 0 14px;
          height: 44px;
          background: #081d24;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          gap: 12px;
          flex-shrink: 0;
          box-sizing: border-box;
          z-index: 10;
        }
        .ste-playback-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .ste-ctrl-btn {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.08);
          border: none;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          font-size: 0.85rem;
        }
        .ste-ctrl-btn:hover {
          background: #11b5bb;
          color: #07171d;
        }
        .ste-ctrl-btn--play {
          background: #f05a28;
        }
        .ste-ctrl-btn--play:hover {
          background: #dc4b1d;
        }
        .ste-scrub-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .ste-time-label {
          font-size: 0.72rem;
          color: #94a3b8;
          font-family: monospace;
          min-width: 32px;
          text-align: center;
        }
        .ste-scrub-input {
          flex: 1;
          accent-color: #11b5bb;
          cursor: pointer;
          height: 4px;
        }

        /* Element Chips */
        .ste-element-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .ste-elem-chip {
          background: #051419;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          font-size: 0.72rem;
          padding: 5px 9px;
          border-radius: 6px;
          cursor: pointer;
        }
        .ste-elem-chip--active {
          background: rgba(17, 181, 187, 0.15);
          border-color: #11b5bb;
          color: #11b5bb;
          font-weight: 700;
        }

        .ste-empty-inspector {
          text-align: center;
          padding: 40px 10px;
          color: #64748b;
          font-size: 0.82rem;
        }
        .ste-empty-inspector svg {
          font-size: 1.8rem;
          margin-bottom: 10px;
        }

        /* ── All 4 Ratios Grid View ── */
        .ste-grid-view {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #040e13;
          overflow-y: auto;
          padding: 20px 24px;
        }
        .ste-grid-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }
        .ste-grid-toolbar h3 {
          margin: 0;
          color: #fff;
          font-size: 1.2rem;
        }
        .ste-grid-toolbar p {
          margin: 4px 0 0;
          color: #94a3b8;
          font-size: 0.85rem;
        }
        .ste-aspect-tiles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }
        .ste-aspect-tile-card {
          background: #092027;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .ste-aspect-tile-head {
          padding: 12px 16px;
          background: #0b2830;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .ste-aspect-tile-label {
          font-size: 0.82rem;
          font-weight: 700;
          color: #11b5bb;
        }
        .ste-tile-canvas-wrap {
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
          min-height: 240px;
          box-sizing: border-box;
        }
        .ste-tile-canvas-viewport {
          position: relative;
          max-width: 100%;
          max-height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7);
          border-radius: 8px;
          overflow: hidden;
          background: #000;
        }
        .ste-tile-canvas {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
          border-radius: 8px;
        }

        /* ── Saved Templates Library View ── */
        .ste-library-view {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #040e13;
          overflow-y: auto;
          padding: 28px 36px;
        }
        .ste-library-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .ste-library-header h2 {
          margin: 0;
          font-size: 1.5rem;
          color: #fff;
        }
        .ste-library-header p {
          margin: 4px 0 0;
          color: #94a3b8;
          font-size: 0.85rem;
        }

        .ste-table-wrap {
          background: #092027;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          overflow: hidden;
        }
        .ste-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .ste-table th {
          background: #0b2830;
          padding: 14px 18px;
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .ste-table td {
          padding: 14px 18px;
          font-size: 0.85rem;
          color: #cbd5e1;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          vertical-align: middle;
        }
        .ste-table tr:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        .ste-table tr.is-active-row {
          background: rgba(17, 181, 187, 0.06);
        }

        .ste-badge-chip {
          background: #051419;
          color: #11b5bb;
          border: 1px solid rgba(17, 181, 187, 0.3);
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 700;
        }
        .ste-badge-soft {
          background: rgba(22, 163, 74, 0.15);
          color: #22c55e;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 700;
        }

        .ste-actions-cell {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
        }
        .ste-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          font-size: 0.75rem;
          font-weight: 700;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ste-action-btn--view {
          background: rgba(17, 181, 187, 0.15);
          color: #11b5bb;
        }
        .ste-action-btn--view:hover {
          background: #11b5bb;
          color: #05191e;
        }
        .ste-action-btn--edit {
          background: rgba(240, 90, 40, 0.15);
          color: #f05a28;
        }
        .ste-action-btn--edit:hover {
          background: #f05a28;
          color: #fff;
        }
        .ste-action-btn--delete {
          background: rgba(220, 38, 38, 0.15);
          color: #ef4444;
        }
        .ste-action-btn--delete:hover {
          background: #dc2626;
          color: #fff;
        }

        .ste-loading-wrap,
        .ste-empty-box {
          text-align: center;
          padding: 80px 20px;
          color: #94a3b8;
          background: #092027;
          border-radius: 12px;
          border: 1px dashed rgba(255, 255, 255, 0.1);
        }
        .ste-empty-box h3 {
          color: #fff;
          margin: 12px 0 6px;
        }

        /* Toast */
        .ste-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          background: #11b5bb;
          color: #05191e;
          padding: 12px 20px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.88rem;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
        }

        /* Modals */
        .ste-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .ste-modal {
          background: #0b2830;
          border-radius: 16px;
          width: 100%;
          max-width: 540px;
          overflow: hidden;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .ste-modal--wide {
          max-width: 680px;
        }
        .ste-modal__header {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .ste-modal__title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ste-modal__title-wrap h3 {
          margin: 0;
          font-size: 1rem;
          color: #fff;
        }
        .ste-accent-icon {
          color: #f05a28;
        }
        .ste-modal__close {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 1rem;
          cursor: pointer;
        }
        .ste-modal__body {
          padding: 20px;
          max-height: 70vh;
          overflow-y: auto;
        }
        .ste-detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          font-size: 0.85rem;
          background: #051419;
          padding: 14px;
          border-radius: 8px;
        }
        .ste-json-box {
          background: #000;
          color: #11b5bb;
          padding: 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          max-height: 180px;
          overflow-y: auto;
        }
        .ste-modal__video-wrap {
          padding: 16px;
          background: #000;
          display: flex;
          justify-content: center;
        }
        .ste-modal__video {
          max-height: 60vh;
          width: 100%;
          border-radius: 8px;
        }
        .ste-modal__actions {
          padding: 16px 20px;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .ste-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* ══════════════════════════════════════════════════════════
           RESPONSIVE DESIGN & USER-FRIENDLY ADAPTIVE SYSTEM
           ══════════════════════════════════════════════════════════ */
        @media (max-width: 1500px) {
          .ste-panel {
            width: 250px;
            min-width: 250px;
            max-width: 250px;
          }
          .ste-template-name-input {
            max-width: 160px;
            min-width: 110px;
            font-size: 0.85rem;
          }
          .ste-topbar {
            padding: 6px 12px;
            gap: 6px;
          }
          .ste-topbar-btn {
            padding: 5px 9px !important;
            font-size: 0.74rem !important;
          }
        }

        @media (max-width: 1280px) {
          .ste-topbar {
            height: auto;
            min-height: 46px;
            padding: 4px 10px;
          }
          .ste-panel {
            width: 240px;
            min-width: 240px;
            max-width: 240px;
          }
          .ste-template-name-input {
            max-width: 130px;
          }
          .ste-btn-label {
            display: inline;
          }
          .ste-player-status-tag {
            display: none !important;
          }
        }

        @media (max-width: 1200px) {
          .ste-topbar {
            height: auto;
            min-height: 48px;
            padding: 6px 12px;
            flex-wrap: wrap;
            gap: 8px;
          }
          .ste-topbar__left {
            flex-wrap: wrap;
            gap: 6px;
          }
          .ste-topbar__right {
            flex-wrap: wrap;
            gap: 6px;
          }
          .ste-workspace {
            position: relative;
            height: calc(100% - 64px);
          }
          /* Overlay Drawer Mode for Sidebars on Medium Screens */
          .ste-panel--assets {
            position: absolute;
            top: 0;
            bottom: 0;
            left: 0;
            z-index: 100;
            background: rgba(9, 32, 39, 0.98);
            backdrop-filter: blur(16px);
            box-shadow: 6px 0 28px rgba(0, 0, 0, 0.7);
          }
          .ste-panel--inspector {
            position: absolute;
            top: 0;
            bottom: 0;
            right: 0;
            z-index: 100;
            background: rgba(9, 32, 39, 0.98);
            backdrop-filter: blur(16px);
            box-shadow: -6px 0 28px rgba(0, 0, 0, 0.7);
          }
          .ste-stage {
            width: 100% !important;
            flex: 1;
          }
        }

        @media (max-width: 1400px) {
          .ste-panel {
            width: 235px;
            min-width: 235px;
            max-width: 235px;
          }
          .ste-topbar {
            padding: 6px 12px;
            gap: 8px;
          }
          .ste-template-name-input {
            max-width: 160px;
          }
        }

        @media (max-width: 1200px) {
          .ste-panel {
            width: 215px;
            min-width: 215px;
            max-width: 215px;
          }
        }

        @media (max-width: 1024px) {
          .ste-panel {
            position: absolute;
            top: 0;
            bottom: 0;
            z-index: 60;
            width: 260px !important;
            min-width: 260px !important;
            max-width: 260px !important;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.85);
          }
          .ste-panel--specs {
            left: 0;
          }
          .ste-panel--inspector {
            right: 0;
          }
        }

        @media (max-width: 992px) {
          .ste-playback-bar {
            padding: 0 10px;
            gap: 8px;
          }
        }

        @media (max-width: 768px) {
          .ste-topbar {
            padding: 4px 8px;
          }
          .ste-template-name-input {
            width: 140px;
            min-width: 120px;
            font-size: 0.82rem;
          }
          .ste-panel {
            width: 280px;
            max-width: 85vw;
          }
          .ste-mode-tabs {
            order: 4;
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
