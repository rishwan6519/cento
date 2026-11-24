// ─── Interfaces & Types for Template Editor Studio ───────────────────────────
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
  x: number; // 0.0 - 1.0 (relative percentage)
  y: number; // 0.0 - 1.0 (relative percentage)
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
  shape?: "none" | "circle" | "pill" | "rect" | "ribbon" | "parallelogram" | "rounded" | "origami" | "sticker";
  badgeImageUrl?: string;
  badgeStyle?: string;
  overlayText?: boolean;
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
  defaultAspectRatio?: string;
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
  offertypeId?: string;
  offertypename?: string;
  offer_type?: {
    id?: string;
    name?: string;
    offertypeId?: string;
    offertypename?: string;
  };
  offerTitle?: string;
  offerDescription?: string;
  ctaButtonText?: string;
  discountLabel?: string;
  priceLabel?: string;
  footerText?: string;
  thumbnail?: string;
  updatedAt?: string;
  lastRenderedVideoUrl?: string;
}

export interface DemoAudioTune {
  id: string;
  name: string;
  desc: string;
  url: string;
  icon: string;
}

export interface OfferBadgePreset {
  id: string;
  name: string;
  dataUrl: string;
}

export interface TemplateEditorProps {
  onNavigate?: (view: any, extra?: any) => void;
  initialTemplateId?: string;
  initialRatio?: AspectRatio;
}

export const ASPECT_SPECS: Record<AspectRatio, AspectDimension> = {
  "9:16": { ratio: "9:16", label: "Stories & Reels (9:16)", width: 1080, height: 1920 },
  "16:9": { ratio: "16:9", label: "Display TV & Landscape (16:9)", width: 1920, height: 1080 },
  "1:1":  { ratio: "1:1",  label: "Square Feed (1:1)", width: 1080, height: 1080 },
  "4:5":  { ratio: "4:5",  label: "Portrait Post (4:5)", width: 1080, height: 1350 },
};

export const DEMO_AUDIO_TUNES: DemoAudioTune[] = [
  { id: "upbeat_retail", name: "Upbeat Retail Pop", desc: "Catchy, energetic retail beat with modern groove", url: "/audio/presets/upbeat_retail.mp3", icon: "" },
  { id: "energetic_promo", name: "Energetic Promo Funk", desc: "Driving brass & funk rhythm, perfect for flash sales", url: "/audio/presets/energetic_promo.mp3", icon: "" },
  { id: "chill_acoustic", name: "Chill Acoustic Cafe", desc: "Warm guitar strumming, ideal for lifestyle & organic stores", url: "/audio/presets/chill_acoustic.mp3", icon: "" },
  { id: "minimal_electronic", name: "Minimal Modern Beat", desc: "Subtle electronic pulse, great for tech & premium brands", url: "/audio/presets/minimal_electronic.mp3", icon: "" },
  { id: "festive_celebration", name: "Festive Celebration Spark", desc: "Uplifting celebratory bells & bounce for holiday promotions", url: "/audio/presets/festive_celebration.mp3", icon: "" },
];

export const DEFAULT_LAYERS: Record<AspectRatio, LayersConfig> = {
  "16:9": {
    product:     { type: "product", x: 0.28, y: 0.52, size: 40, hidden: false, bgMode: "transparent", animation: "slide_up", animStart: 0.2, animEnd: 1.2 },
    discount:    { type: "text", text: "75% OFF", x: 0.72, y: 0.35, size: 5.2, hidden: false, shape: "origami", fontColor: "#ffffff", bgColor: "#ffc700", border: "1", borderColor: "#047857", font: "Arial", animation: "zoom_bounce", animStart: 0.6, animEnd: 1.4 },
    headline:    { type: "text", text: "Grab the crunch before it's gone!!", x: 0.72, y: 0.20, size: 3.6, boxWidth: 46, hidden: false, shape: "none", fontColor: "#ffffff", font: "Arial", fontWeight: "bold", textAlign: "center", animation: "fade_in", animStart: 1.0, animEnd: 1.8 },
    description: { type: "text", text: "Ritz Crackers 300g available at an exclusive discount!!", x: 0.72, y: 0.49, size: 2.2, boxWidth: 44, hidden: false, shape: "none", fontColor: "#cbd5e1", font: "Arial", textAlign: "center", animation: "fade_up", animStart: 1.4, animEnd: 2.2 },
    price:       { type: "text", text: "$4.99", x: 0.64, y: 0.64, size: 3.2, hidden: false, shape: "none", fontColor: "#ffffff", font: "Arial", fontWeight: "bold", animation: "fade_in", animStart: 1.8, animEnd: 2.4 },
    oldPrice:    { type: "text", text: "$9.99", x: 0.82, y: 0.64, size: 2.6, hidden: false, shape: "none", fontColor: "#fca5a5", font: "Arial", animation: "fade_in", animStart: 1.8, animEnd: 2.4 },
    validity:    { type: "text", text: "Offer Validity: 1st Aug - 31st Dec 2026", x: 0.72, y: 0.75, size: 2.0, hidden: false, shape: "pill", fontColor: "#111111", bgColor: "#ffffff", border: "0", font: "Arial", animation: "slide_up", animStart: 2.0, animEnd: 2.7 },
    cta:         { type: "text", text: "VISIT STORE ➔", x: 0.72, y: 0.86, size: 2.4, hidden: false, shape: "pill", fontColor: "#ffffff", bgColor: "#e51a24", border: "0", font: "Arial", fontWeight: "bold", animation: "pulse", animStart: 2.2, animEnd: 3.0 },
    qrCode:      { type: "text", text: "Scan Me", x: 0.90, y: 0.86, size: 1.8, hidden: false, shape: "rect", fontColor: "#111111", bgColor: "#ffffff", font: "Arial", animation: "fade_in", animStart: 2.4, animEnd: 3.2 },
    storeName:   { type: "text", text: "URBAN RAIN", x: 0.14, y: 0.05, size: 2.0, hidden: false, shape: "none", fontColor: "#38bdf8", font: "Arial", fontWeight: "bold", animation: "fade_in", animStart: 0.1, animEnd: 0.8 },
    footer:      { type: "text", text: "*T&C apply. Images for representation only.", x: 0.50, y: 0.96, size: 1.3, hidden: false, shape: "none", fontColor: "#94a3b8", font: "Arial", animation: "fade_in", animStart: 2.6, animEnd: 3.2 },
    logo:        { type: "logo", x: 0.14, y: 0.09, size: 10, hidden: false, animation: "fade_in", animStart: 0.1, animEnd: 0.8 },
  },
  "9:16": {
    product:     { type: "product", x: 0.50, y: 0.42, size: 48, hidden: false, bgMode: "transparent", animation: "slide_up", animStart: 0.2, animEnd: 1.2 },
    discount:    { type: "text", text: "75% OFF", x: 0.76, y: 0.28, size: 5.4, hidden: false, shape: "origami", fontColor: "#ffffff", bgColor: "#ffc700", border: "1", borderColor: "#047857", font: "Arial", animation: "zoom_bounce", animStart: 0.6, animEnd: 1.4 },
    headline:    { type: "text", text: "Grab the crunch before it's gone!!", x: 0.50, y: 0.17, size: 3.5, boxWidth: 84, hidden: false, shape: "none", fontColor: "#ffffff", font: "Arial", fontWeight: "bold", textAlign: "center", animation: "fade_in", animStart: 1.0, animEnd: 1.8 },
    description: { type: "text", text: "Ritz Crackers 300g available at an exclusive discount!!", x: 0.50, y: 0.65, size: 2.2, boxWidth: 80, hidden: false, shape: "none", fontColor: "#cbd5e1", font: "Arial", textAlign: "center", animation: "fade_up", animStart: 1.4, animEnd: 2.2 },
    price:       { type: "text", text: "$4.99", x: 0.38, y: 0.74, size: 3.4, hidden: false, shape: "none", fontColor: "#ffffff", font: "Arial", fontWeight: "bold", animation: "fade_in", animStart: 1.8, animEnd: 2.4 },
    oldPrice:    { type: "text", text: "$9.99", x: 0.62, y: 0.74, size: 2.7, hidden: false, shape: "none", fontColor: "#fca5a5", font: "Arial", animation: "fade_in", animStart: 1.8, animEnd: 2.4 },
    validity:    { type: "text", text: "Offer Validity: 1st Aug - 31st Dec 2026", x: 0.50, y: 0.81, size: 1.9, hidden: false, shape: "pill", fontColor: "#111111", bgColor: "#ffffff", border: "0", font: "Arial", animation: "slide_up", animStart: 2.0, animEnd: 2.7 },
    cta:         { type: "text", text: "VISIT STORE ➔", x: 0.50, y: 0.88, size: 2.4, hidden: false, shape: "pill", fontColor: "#ffffff", bgColor: "#e51a24", border: "0", font: "Arial", fontWeight: "bold", animation: "pulse", animStart: 2.2, animEnd: 3.0 },
    qrCode:      { type: "text", text: "Scan Me", x: 0.86, y: 0.88, size: 1.8, hidden: false, shape: "rect", fontColor: "#111111", bgColor: "#ffffff", font: "Arial", animation: "fade_in", animStart: 2.4, animEnd: 3.2 },
    storeName:   { type: "text", text: "URBAN RAIN", x: 0.50, y: 0.05, size: 2.1, hidden: false, shape: "none", fontColor: "#38bdf8", font: "Arial", fontWeight: "bold", animation: "fade_in", animStart: 0.1, animEnd: 0.8 },
    footer:      { type: "text", text: "*T&C apply. Images for representation only.", x: 0.50, y: 0.96, size: 1.3, hidden: false, shape: "none", fontColor: "#94a3b8", font: "Arial", animation: "fade_in", animStart: 2.6, animEnd: 3.2 },
    logo:        { type: "logo", x: 0.50, y: 0.09, size: 10, hidden: false, animation: "fade_in", animStart: 0.1, animEnd: 0.8 },
  },
  "1:1": {
    product:     { type: "product", x: 0.28, y: 0.52, size: 38, hidden: false, bgMode: "transparent", animation: "slide_up", animStart: 0.2, animEnd: 1.2 },
    discount:    { type: "text", text: "75% OFF", x: 0.74, y: 0.30, size: 5.2, hidden: false, shape: "origami", fontColor: "#ffffff", bgColor: "#ffc700", border: "1", borderColor: "#047857", font: "Arial", animation: "zoom_bounce", animStart: 0.6, animEnd: 1.4 },
    headline:    { type: "text", text: "Grab the crunch before it's gone!!", x: 0.50, y: 0.15, size: 3.4, boxWidth: 84, hidden: false, shape: "none", fontColor: "#ffffff", font: "Arial", fontWeight: "bold", textAlign: "center", animation: "fade_in", animStart: 1.0, animEnd: 1.8 },
    description: { type: "text", text: "Ritz Crackers 300g available at an exclusive discount!!", x: 0.74, y: 0.44, size: 2.1, boxWidth: 42, hidden: false, shape: "none", fontColor: "#cbd5e1", font: "Arial", textAlign: "center", animation: "fade_up", animStart: 1.4, animEnd: 2.2 },
    price:       { type: "text", text: "$4.99", x: 0.65, y: 0.59, size: 3.2, hidden: false, shape: "none", fontColor: "#ffffff", font: "Arial", fontWeight: "bold", animation: "fade_in", animStart: 1.8, animEnd: 2.4 },
    oldPrice:    { type: "text", text: "$9.99", x: 0.83, y: 0.59, size: 2.5, hidden: false, shape: "none", fontColor: "#fca5a5", font: "Arial", animation: "fade_in", animStart: 1.8, animEnd: 2.4 },
    validity:    { type: "text", text: "Offer Validity: 1st Aug - 31st Dec 2026", x: 0.74, y: 0.71, size: 1.8, hidden: false, shape: "pill", fontColor: "#111111", bgColor: "#ffffff", border: "0", font: "Arial", animation: "slide_up", animStart: 2.0, animEnd: 2.7 },
    cta:         { type: "text", text: "VISIT STORE ➔", x: 0.74, y: 0.83, size: 2.3, hidden: false, shape: "pill", fontColor: "#ffffff", bgColor: "#e51a24", border: "0", font: "Arial", fontWeight: "bold", animation: "pulse", animStart: 2.2, animEnd: 3.0 },
    qrCode:      { type: "text", text: "Scan Me", x: 0.90, y: 0.83, size: 1.8, hidden: false, shape: "rect", fontColor: "#111111", bgColor: "#ffffff", font: "Arial", animation: "fade_in", animStart: 2.4, animEnd: 3.2 },
    storeName:   { type: "text", text: "URBAN RAIN", x: 0.14, y: 0.05, size: 1.9, hidden: false, shape: "none", fontColor: "#38bdf8", font: "Arial", fontWeight: "bold", animation: "fade_in", animStart: 0.1, animEnd: 0.8 },
    footer:      { type: "text", text: "*T&C apply. Images for representation only.", x: 0.50, y: 0.96, size: 1.3, hidden: false, shape: "none", fontColor: "#94a3b8", font: "Arial", animation: "fade_in", animStart: 2.6, animEnd: 3.2 },
    logo:        { type: "logo", x: 0.14, y: 0.09, size: 9, hidden: false, animation: "fade_in", animStart: 0.1, animEnd: 0.8 },
  },
  "4:5": {
    product:     { type: "product", x: 0.30, y: 0.50, size: 40, hidden: false, bgMode: "transparent", animation: "slide_up", animStart: 0.2, animEnd: 1.2 },
    discount:    { type: "text", text: "75% OFF", x: 0.74, y: 0.28, size: 5.2, hidden: false, shape: "origami", fontColor: "#ffffff", bgColor: "#ffc700", border: "1", borderColor: "#047857", font: "Arial", animation: "zoom_bounce", animStart: 0.6, animEnd: 1.4 },
    headline:    { type: "text", text: "Grab the crunch before it's gone!!", x: 0.50, y: 0.13, size: 3.4, boxWidth: 84, hidden: false, shape: "none", fontColor: "#ffffff", font: "Arial", fontWeight: "bold", textAlign: "center", animation: "fade_in", animStart: 1.0, animEnd: 1.8 },
    description: { type: "text", text: "Ritz Crackers 300g available at an exclusive discount!!", x: 0.74, y: 0.42, size: 2.1, boxWidth: 42, hidden: false, shape: "none", fontColor: "#cbd5e1", font: "Arial", textAlign: "center", animation: "fade_up", animStart: 1.4, animEnd: 2.2 },
    price:       { type: "text", text: "$4.99", x: 0.65, y: 0.58, size: 3.2, hidden: false, shape: "none", fontColor: "#ffffff", font: "Arial", fontWeight: "bold", animation: "fade_in", animStart: 1.8, animEnd: 2.4 },
    oldPrice:    { type: "text", text: "$9.99", x: 0.83, y: 0.58, size: 2.5, hidden: false, shape: "none", fontColor: "#fca5a5", font: "Arial", animation: "fade_in", animStart: 1.8, animEnd: 2.4 },
    validity:    { type: "text", text: "Offer Validity: 1st Aug - 31st Dec 2026", x: 0.74, y: 0.70, size: 1.8, hidden: false, shape: "pill", fontColor: "#111111", bgColor: "#ffffff", border: "0", font: "Arial", animation: "slide_up", animStart: 2.0, animEnd: 2.7 },
    cta:         { type: "text", text: "VISIT STORE ➔", x: 0.74, y: 0.82, size: 2.3, hidden: false, shape: "pill", fontColor: "#ffffff", bgColor: "#e51a24", border: "0", font: "Arial", fontWeight: "bold", animation: "pulse", animStart: 2.2, animEnd: 3.0 },
    qrCode:      { type: "text", text: "Scan Me", x: 0.90, y: 0.82, size: 1.8, hidden: false, shape: "rect", fontColor: "#111111", bgColor: "#ffffff", font: "Arial", animation: "fade_in", animStart: 2.4, animEnd: 3.2 },
    storeName:   { type: "text", text: "URBAN RAIN", x: 0.16, y: 0.05, size: 1.9, hidden: false, shape: "none", fontColor: "#38bdf8", font: "Arial", fontWeight: "bold", animation: "fade_in", animStart: 0.1, animEnd: 0.8 },
    footer:      { type: "text", text: "*T&C apply. Images for representation only.", x: 0.50, y: 0.96, size: 1.3, hidden: false, shape: "none", fontColor: "#94a3b8", font: "Arial", animation: "fade_in", animStart: 2.6, animEnd: 3.2 },
    logo:        { type: "logo", x: 0.16, y: 0.08, size: 9, hidden: false, animation: "fade_in", animStart: 0.1, animEnd: 0.8 },
  },
};

export const OFFER_BADGE_PRESETS: OfferBadgePreset[] = [
  {
    id: "origami_retail",
    name: "3D Origami Retail Banner",
    dataUrl: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120" width="240" height="120">
      <defs>
        <filter id="ogShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="-2" dy="5" stdDeviation="4" flood-color="#000000" flood-opacity="0.4" />
        </filter>
        <linearGradient id="ogGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffd000"/>
          <stop offset="100%" stop-color="#ff9900"/>
        </linearGradient>
      </defs>
      <g transform="rotate(-6 120 60)">
        <polygon points="26,102 10,122 56,102" fill="#047857" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/>
        <rect x="20" y="16" width="200" height="88" rx="14" fill="url(#ogGrad)" stroke="#ffffff" stroke-width="4" filter="url(#ogShadow)"/>
        <polygon points="10,24 20,36 8,38" fill="#ef4444"/>
        <polygon points="220,18 232,28 222,34" fill="#facc15"/>
        <polygon points="226,98 238,108 226,114" fill="#ef4444"/>
        <polygon points="12,90 22,96 14,102" fill="#10b981"/>
      </g>
    </svg>`),
  },
  {
    id: "hot_deal_fire",
    name: "Hot Deal Fire Badge",
    dataUrl: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120" width="240" height="120">
      <defs>
        <linearGradient id="fireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#dc2626"/>
          <stop offset="50%" stop-color="#ea580c"/>
          <stop offset="100%" stop-color="#f59e0b"/>
        </linearGradient>
        <filter id="fireGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#ea580c" flood-opacity="0.5" />
        </filter>
      </defs>
      <rect x="12" y="18" width="216" height="84" rx="42" fill="url(#fireGrad)" stroke="#ffffff" stroke-width="4" filter="url(#fireGlow)"/>
      <rect x="18" y="24" width="204" height="72" rx="36" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-dasharray="6,4"/>
      <path d="M42,76 C32,76 26,68 28,58 C29,52 34,46 36,40 C38,48 42,48 45,43 C50,52 52,60 49,68 C48,72 45,76 42,76 Z" fill="#ffd000"/>
    </svg>`),
  },
  {
    id: "flash_sale_neon",
    name: "Flash Sale Neon",
    dataUrl: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120" width="240" height="120">
      <defs>
        <linearGradient id="neonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0f172a"/>
          <stop offset="100%" stop-color="#1e293b"/>
        </linearGradient>
      </defs>
      <polygon points="28,16 228,16 212,104 12,104" fill="url(#neonGrad)" stroke="#facc15" stroke-width="4"/>
      <polygon points="36,24 220,24 206,96 22,96" fill="none" stroke="#facc15" stroke-width="1.5" stroke-opacity="0.5"/>
    </svg>`),
  },
  {
    id: "best_seller_star",
    name: "Best Seller Gold Star",
    dataUrl: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120" width="240" height="120">
      <defs>
        <linearGradient id="bsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1e3a8a"/>
          <stop offset="100%" stop-color="#3b82f6"/>
        </linearGradient>
      </defs>
      <rect x="14" y="16" width="212" height="88" rx="18" fill="url(#bsGrad)" stroke="#fbbf24" stroke-width="4"/>
      <polygon points="38,54 41,62 49,63 43,69 45,77 38,72 31,77 33,69 27,63 35,62" fill="#fbbf24"/>
      <polygon points="202,54 205,62 213,63 207,69 209,77 202,72 195,77 197,69 191,63 199,62" fill="#fbbf24"/>
    </svg>`),
  },
  {
    id: "special_ribbon",
    name: "Special Offer Ribbon",
    dataUrl: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120" width="240" height="120">
      <defs>
        <linearGradient id="ribGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#7c3aed"/>
          <stop offset="50%" stop-color="#c026d3"/>
          <stop offset="100%" stop-color="#db2777"/>
        </linearGradient>
      </defs>
      <polygon points="12,20 228,20 214,60 228,100 12,100 26,60" fill="url(#ribGrad)" stroke="#ffffff" stroke-width="3"/>
    </svg>`),
  },
  {
    id: "cyber_neon_pill",
    name: "Cyber Neon Pill",
    dataUrl: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120" width="240" height="120">
      <defs>
        <linearGradient id="cybGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#06b6d4"/>
          <stop offset="50%" stop-color="#3b82f6"/>
          <stop offset="100%" stop-color="#8b5cf6"/>
        </linearGradient>
      </defs>
      <rect x="14" y="20" width="212" height="80" rx="40" fill="url(#cybGrad)" stroke="#ffffff" stroke-width="3.5"/>
    </svg>`),
  },
  {
    id: "emerald_saver",
    name: "Emerald Super Saver",
    dataUrl: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120" width="240" height="120">
      <defs>
        <linearGradient id="emGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#059669"/>
          <stop offset="100%" stop-color="#064e3b"/>
        </linearGradient>
      </defs>
      <rect x="14" y="18" width="212" height="84" rx="20" fill="url(#emGrad)" stroke="#34d399" stroke-width="3.5"/>
    </svg>`),
  },
];

export const globalBadgeImagesCache = new Map<string, HTMLImageElement>();

export const STICKER_PRESETS = [
  {
    name: "75% OFF Retail Badge",
    defaultSize: 18,
    url: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" width="200" height="120">
      <defs>
        <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#ffdd00"/>
          <stop offset="100%" stop-color="#ff8800"/>
        </linearGradient>
      </defs>
      <polygon points="18,102 4,118 42,102" fill="#047857" stroke="#ffffff" stroke-width="2"/>
      <rect x="10" y="10" width="180" height="88" rx="14" fill="url(#g1)" stroke="#ffffff" stroke-width="4" transform="rotate(-6 100 54)"/>
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
      <text x="100" y="60" font-family="Arial, sans-serif" font-weight="900" font-size="28" fill="#ffffff" text-anchor="middle">HOT DEAL</text>
    </svg>`),
  },
  {
    name: "Flash Sale Badge",
    defaultSize: 16,
    url: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100">
      <rect x="6" y="8" width="188" height="84" rx="12" fill="#051419" stroke="#eab308" stroke-width="3.5"/>
      <rect x="12" y="14" width="176" height="72" rx="8" fill="#eab308"/>
      <text x="100" y="58" font-family="Arial, sans-serif" font-weight="900" font-size="24" fill="#000000" text-anchor="middle">FLASH SALE</text>
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
      <text x="100" y="58" font-family="Arial, sans-serif" font-weight="900" font-size="24" fill="#ffffff" text-anchor="middle">BEST SELLER</text>
    </svg>`),
  },
  {
    name: "Free Shipping Badge",
    defaultSize: 16,
    url: "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100">
      <rect x="6" y="8" width="188" height="84" rx="42" fill="#047857" stroke="#ffffff" stroke-width="3"/>
      <text x="100" y="58" font-family="Arial, sans-serif" font-weight="900" font-size="22" fill="#ffffff" text-anchor="middle">FREE SHIPPING</text>
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
      <text x="100" y="58" font-family="Arial, sans-serif" font-weight="900" font-size="22" fill="#ffffff" text-anchor="middle">SPECIAL OFFER</text>
    </svg>`),
  },
];

export const PRESET_GRADIENTS = [
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

export const PRESET_SOLID_COLORS = [
  { name: "Centelon Dark", color: "#0B2830" },
  { name: "Pure Black", color: "#000000" },
  { name: "Deep Charcoal", color: "#0f172a" },
  { name: "Dark Slate", color: "#1e293b" },
  { name: "Cool Slate", color: "#334155" },
  { name: "Neutral Gray", color: "#64748b" },
  { name: "Soft Off-White", color: "#f8fafc" },
  { name: "Clean White", color: "#ffffff" },
];

export const OFFER_TYPES = [
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

export const AI_STYLES = [
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

export const AI_COLOR_THEMES = [
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

export function wrapTextCanvas(
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
        if (chunk) curLine = chunk;
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
    if (curLine) result.push(curLine);
  }
  return result.length > 0 ? result : [text];
}

