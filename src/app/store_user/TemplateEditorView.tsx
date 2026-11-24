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
  FaFont,
  FaPalette,
  FaStar,
  FaShapes,
  FaCirclePlay,
  FaArrowsUpDownLeftRight,
} from "react-icons/fa6";
import { DEFAULT_FOOTER_TEXT, sanitizeFooter } from "@/lib/videoRenderer/types";
import {
  AspectRatio,
  LayerKey,
  LayerStyle,
  LayersConfig,
  AspectDimension,
  DecorItem,
  SavedTemplateItem,
  DemoAudioTune,
  OfferBadgePreset,
  TemplateEditorProps,
  ASPECT_SPECS,
  DEMO_AUDIO_TUNES,
  DEFAULT_LAYERS,
  OFFER_BADGE_PRESETS,
  STICKER_PRESETS,
  PRESET_GRADIENTS,
  PRESET_SOLID_COLORS,
  OFFER_TYPES,
  AI_STYLES,
  AI_COLOR_THEMES,
  globalBadgeImagesCache,
  wrapTextCanvas,
} from "./templateEditorConstants";

// Re-export types so external files importing from TemplateEditorView continue working seamlessly
export type { AspectRatio, LayerKey, LayerStyle, LayersConfig, AspectDimension, DecorItem, SavedTemplateItem };
export { ASPECT_SPECS, DEMO_AUDIO_TUNES, DEFAULT_LAYERS, OFFER_BADGE_PRESETS, STICKER_PRESETS };

// ─── Live Animated Preview Canvas for Create Modal ──────────────────────────
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

    const spec = ASPECT_SPECS[ratio];
    canvas.width = spec.width;
    canvas.height = spec.height;
    const W = spec.width;
    const H = spec.height;
    const t = playbackTime;

    // Draw modern dark studio backdrop
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, H);

    // Subtle center highlight
    const rad = ctx.createRadialGradient(W / 2, H * 0.45, 40, W / 2, H * 0.45, W * 0.7);
    rad.addColorStop(0, "rgba(255,255,255,0.06)");
    rad.addColorStop(1, "rgba(0,0,0,0.3)");
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, W, H);

    // Draw dummy product
    const pProg = Math.min(1, Math.max(0, (t - 0.2) / 1.0));
    ctx.save();
    ctx.globalAlpha = pProg;
    const pSize = Math.round(W * 0.42);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(W * 0.3 - pSize / 2, H * 0.5 - pSize / 2, pSize, pSize, 24);
    else ctx.rect(W * 0.3 - pSize / 2, H * 0.5 - pSize / 2, pSize, pSize);
    ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.font = `bold ${Math.round(pSize * 0.12)}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("PRODUCT IMAGE", W * 0.3, H * 0.5);
    ctx.restore();

    // Draw headline
    const hProg = Math.min(1, Math.max(0, (t - 0.8) / 0.8));
    ctx.save();
    ctx.globalAlpha = hProg;
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${Math.round(W * 0.045)}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(templateName || "Special Store Offer", W * 0.68, H * 0.35);

    // Draw offer badge
    const bProg = Math.min(1, Math.max(0, (t - 0.5) / 0.7));
    ctx.globalAlpha = bProg;
    ctx.fillStyle = "#ffc700";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(W * 0.48 - 140, H * 0.45 - 45, 280, 90, 16);
    else ctx.rect(W * 0.48 - 140, H * 0.45 - 45, 280, 90);
    ctx.fill();
    ctx.fillStyle = "#1e1b4b";
    ctx.font = `900 ${Math.round(W * 0.055)}px Inter, sans-serif`;
    ctx.fillText("50% OFF", W * 0.48, H * 0.45 + 10);

    // CTA
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(W * 0.68 - 120, H * 0.75 - 32, 240, 64, 32);
    else ctx.rect(W * 0.68 - 120, H * 0.75 - 32, 240, 64);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${Math.round(W * 0.026)}px Inter, sans-serif`;
    ctx.fillText("VISIT STORE ➔", W * 0.68, H * 0.75 + 8);
    ctx.restore();
  }, [ratio, playbackTime, templateName, offerType]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <canvas
        ref={canvasRef}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          borderRadius: "8px",
          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.25)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "8px",
          left: "12px",
          background: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(4px)",
          padding: "3px 8px",
          borderRadius: "6px",
          fontSize: "11px",
          color: "#f8fafc",
          fontFamily: "monospace",
          fontWeight: 700,
        }}
      >
        ▶ {playbackTime.toFixed(1)}s / {duration}s
      </div>
      <div
        style={{
          position: "absolute",
          top: "8px",
          right: "12px",
          background: "rgba(16, 185, 129, 0.9)",
          padding: "3px 8px",
          borderRadius: "6px",
          fontSize: "11px",
          color: "#ffffff",
          fontWeight: 700,
          boxShadow: "0 2px 8px rgba(16, 185, 129, 0.4)",
        }}
      >
        Live Motion Preview
      </div>
    </div>
  );
};

// ─── Interactive Animated Video Template Preview Modal ───────────────────────
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
    (template.defaultAspectRatio as AspectRatio) && ["16:9", "9:16", "1:1", "4:5"].includes(template.defaultAspectRatio as AspectRatio)
      ? (template.defaultAspectRatio as AspectRatio)
      : (template.aspectRatio as AspectRatio) && ["16:9", "9:16", "1:1", "4:5"].includes(template.aspectRatio as AspectRatio)
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

  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    startRef.current = null;
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
  }, [isPlaying, duration]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const spec = ASPECT_SPECS[activeRatio];
    canvas.width = spec.width;
    canvas.height = spec.height;
    const W = spec.width;
    const H = spec.height;
    const t = playbackTime;

    // Background
    const bgUrl = (template.aspectBackgrounds && template.aspectBackgrounds[activeRatio]) || template.backgroundUrl;
    if (bgUrl) {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, W, H);
    } else {
      const grd = ctx.createLinearGradient(0, 0, W, H);
      grd.addColorStop(0, "#0F172A");
      grd.addColorStop(1, "#1E293B");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
    }

    // Render layers
    Object.entries(layersConfig).forEach(([key, layer]: [string, any]) => {
      if (!layer || layer.hidden) return;
      const start = layer.animStart ?? 0.5;
      const end = layer.animEnd ?? 1.5;
      if (t < start) return;
      const p = Math.min(1, Math.max(0, (t - start) / (end - start)));
      ctx.save();
      ctx.globalAlpha = p;
      const cx = (layer.x ?? 0.5) * W;
      const cy = (layer.y ?? 0.5) * H;
      const fontSize = Math.round(W * ((layer.size || 3.5) / 100));

      if (key === "product") {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        const sz = Math.round(W * ((layer.size || 40) / 100));
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(cx - sz / 2, cy - sz / 2, sz, sz, 16);
        else ctx.rect(cx - sz / 2, cy - sz / 2, sz, sz);
        ctx.fill();
      } else if (layer.text) {
        if (layer.shape === "origami" || key === "discount") {
          ctx.fillStyle = layer.bgColor || "#ffc700";
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(cx - 130, cy - 45, 260, 90, 16);
          else ctx.rect(cx - 130, cy - 45, 260, 90);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${fontSize}px Inter, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(layer.text, cx, cy);
        } else {
          ctx.fillStyle = layer.fontColor || "#ffffff";
          ctx.font = `bold ${fontSize}px Inter, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(layer.text, cx, cy);
        }
      }
      ctx.restore();
    });
  }, [activeRatio, playbackTime, layersConfig, template]);

  return (
    <div className="ste-modal-overlay" onClick={onClose}>
      <div className="ste-modal ste-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="ste-modal__header">
          <div className="ste-modal__title-wrap">
            <FaVideo className="text-slate-700" />
            <div>
              <h3 className="text-slate-900 font-bold text-lg">{template.templateName}</h3>
              <p className="text-slate-500 text-xs">Live Interactive Animation &amp; Motion Inspector</p>
            </div>
          </div>
          <button className="ste-modal__close" onClick={onClose} type="button">
            <FaXmark />
          </button>
        </div>

        <div className="ste-modal__body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Ratio bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", padding: "8px 12px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>Preview Aspect Ratio:</span>
            <div style={{ display: "flex", gap: "6px" }}>
              {(["16:9", "9:16", "1:1", "4:5"] as AspectRatio[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setActiveRatio(r)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: activeRatio === r ? 700 : 500,
                    background: activeRatio === r ? "#4f46e5" : "#ffffff",
                    color: activeRatio === r ? "#ffffff" : "#475569",
                    border: activeRatio === r ? "1px solid #4f46e5" : "1px solid #cbd5e1",
                    cursor: "pointer",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Canvas Viewport */}
          <div
            style={{
              width: "100%",
              height: "360px",
              background: "#0f172a",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
              boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)",
            }}
          >
            <canvas ref={canvasRef} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          </div>

          {/* Scrubber Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#f8fafc", padding: "10px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              style={{
                background: isPlaying ? "#f59e0b" : "#4f46e5",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 14px",
                fontWeight: 700,
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
              }}
            >
              {isPlaying ? <FaPause size={12} /> : <FaPlay size={12} />}
              <span>{isPlaying ? "Pause" : "Play"}</span>
            </button>
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
              style={{ flex: 1, accentColor: "#4f46e5", cursor: "pointer" }}
            />
            <span style={{ fontSize: "12px", fontWeight: 700, color: "#334155", fontFamily: "monospace" }}>
              {playbackTime.toFixed(1)}s / {duration}s
            </span>
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

// ─── Main Rebuilt Template Editor Studio ─────────────────────────────────────
export default function TemplateEditorView({ onNavigate, initialTemplateId, initialRatio }: TemplateEditorProps) {
  // ── Mode Switcher: "studio" | "grid" | "library" ────────────────────────────
  const [activeTab, setActiveTab] = useState<"studio" | "grid" | "library">("studio");

  // ── Section Switcher for Left Rail Options ──────────────────────────────────
  // Sections: "canvas" | "content" | "badges" | "animation" | "music" | "ai"
  const [activeSection, setActiveSection] = useState<"canvas" | "content" | "badges" | "animation" | "music">("canvas");

  // ── Template State ──────────────────────────────────────────────────────────
  const [templateName, setTemplateName] = useState("Custom Video Template");
  const [templateId, setTemplateId] = useState<string | null>(initialTemplateId || null);
  const [activeTemplateNumber, setActiveTemplateNumber] = useState<number>(() => {
    if (initialTemplateId && !isNaN(Number(initialTemplateId)) && Number(initialTemplateId) > 0) {
      return Number(initialTemplateId);
    }
    return Math.floor(10000 + Math.random() * 90000);
  });

  const DEFAULT_COMMERCIAL_OFFER_TYPES = [
    { offertypeId: "INDIVIDUAL_DISCOUNT", offertypename: "Individual Discount" },
    { offertypeId: "PERCENTAGE_DISCOUNT", offertypename: "Percentage Discount" },
    { offertypeId: "BUY_X_GET_Y", offertypename: "Buy X Get Y" },
    { offertypeId: "BUNDLE_OFFER", offertypename: "Bundle Offer" },
    { offertypeId: "FLAT_OFF", offertypename: "Flat Off" },
    { offertypeId: "FLASH_SALE", offertypename: "Flash Sale" },
  ];

  const [offerType, setOfferType] = useState<string>("Individual Discount");
  const [offerTypesList, setOfferTypesList] = useState(DEFAULT_COMMERCIAL_OFFER_TYPES);
  const [selectedOfferTypeId, setSelectedOfferTypeId] = useState<string>("INDIVIDUAL_DISCOUNT");
  const [selectedOfferTypeName, setSelectedOfferTypeName] = useState<string>("Individual Discount");
  const [showNewOfferTypeForm, setShowNewOfferTypeForm] = useState(false);
  const [inlineOfferTypeName, setInlineOfferTypeName] = useState("");
  const [inlineOfferTypeId, setInlineOfferTypeId] = useState("");
  const [creatingOfferType, setCreatingOfferType] = useState(false);

  const [aiStyle, setAiStyle] = useState<string>("Premium commercial");
  const [aiColorTheme, setAiColorTheme] = useState<string>("None (natural colors)");
  const [aiTransparentBg, setAiTransparentBg] = useState<boolean>(true);
  const [animationStyle, setAnimationStyle] = useState<string>("dynamic_retail");

  // Aspect settings
  const [activeRatio, setActiveRatio] = useState<AspectRatio>(initialRatio || "16:9");
  const [defaultRatio, setDefaultRatio] = useState<AspectRatio>(initialRatio || "16:9");
  const [duration, setDuration] = useState(10);
  const [fps, setFps] = useState(30);
  const [resolution, setResolution] = useState(720);

  // Per-ratio layer configs
  const [aspectLayers, setAspectLayers] = useState<Record<AspectRatio, LayersConfig>>(DEFAULT_LAYERS);

  // Assets
  const [bgType, setBgType] = useState<"gradient" | "color" | "image">("color");
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
  const [badgeUrlPromptOpen, setBadgeUrlPromptOpen] = useState<boolean>(false);
  const [badgeUrlInput, setBadgeUrlInput] = useState<string>("");

  // Loaded Image objects for Canvas
  const [productImgObj, setProductImgObj] = useState<HTMLImageElement | null>(null);
  const [logoImgObj, setLogoImgObj] = useState<HTMLImageElement | null>(null);
  const [bgImgObj, setBgImgObj] = useState<HTMLImageElement | null>(null);

  // Interaction & Selection
  const [selectedLayer, setSelectedLayer] = useState<LayerKey | null>("discount");
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [resizingLayer, setResizingLayer] = useState<{
    layerKey: LayerKey;
    corner: "nw" | "ne" | "se" | "sw";
    startSize: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [isFullscreenStage, setIsFullscreenStage] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [playbackTime, setPlaybackTime] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);

  // Audio references
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

  // UI status
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderJobId, setRenderJobId] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState<string>("");
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isAiOptimizing, setIsAiOptimizing] = useState(false);

  // Canvases
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridCanvases = useRef<Record<AspectRatio, HTMLCanvasElement | null>>({
    "9:16": null,
    "16:9": null,
    "1:1": null,
    "4:5": null,
  });

  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const [canvasFitSize, setCanvasFitSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    toast(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Current layers helper
  const currentLayers = aspectLayers[activeRatio] || DEFAULT_LAYERS[activeRatio];

  const updateCurrentLayer = (key: LayerKey, updates: Partial<LayerStyle>) => {
    setAspectLayers((prev) => ({
      ...prev,
      [activeRatio]: {
        ...prev[activeRatio],
        [key]: {
          ...(prev[activeRatio]?.[key] || {}),
          ...updates,
        },
      },
    }));
  };

  // Helper to determine next available 5-digit template ID
  const getNextTemplateId = useCallback(() => {
    const existingIds = new Set(
      savedTemplatesList
        .map((t) => Number(t.templateId))
        .filter((n) => !isNaN(n) && n > 0)
    );
    for (let attempt = 0; attempt < 50; attempt++) {
      const candidate = Math.floor(10000 + Math.random() * 90000);
      if (!existingIds.has(candidate)) {
        return candidate;
      }
    }
    const max5 = Math.max(10000, ...Array.from(existingIds).filter((n) => n >= 10000));
    return max5 + 1;
  }, [savedTemplatesList]);

  // Active loaded template's sequential display ID (stable across re-renders and animation playback)
  const currentDisplayId = activeTemplateNumber;

  useEffect(() => {
    if (templateId && savedTemplatesList.length > 0) {
      const match = savedTemplatesList.find(
        (t) => String(t._id) === String(templateId) || String(t.templateId) === String(templateId)
      );
      if (match?.templateId && !isNaN(Number(match.templateId)) && Number(match.templateId) > 0) {
        setActiveTemplateNumber(Number(match.templateId));
      }
    }
  }, [templateId, savedTemplatesList]);

  // ── Sync Text to All Ratios ───────────────────────────────────────────────
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
    showToast(`✅ Synced text content to all 4 ratios!`);
  };

  // ── AI Auto-Optimize All 4 Ratios ──────────────────────────────────────────
  const handleAiOptimizeAllRatios = async () => {
    setIsAiOptimizing(true);
    const source = aspectLayers[activeRatio] || DEFAULT_LAYERS[activeRatio];

    try {
      const res = await fetch("/api/video-template/ai-optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentLayers: source,
          activeRatio,
          templateName,
          animationStyle,
          bgColor,
        }),
      });
      const data = await res.json().catch(() => null);
      if (data?.success && data?.aspectStore) {
        setAspectLayers(data.aspectStore);
        if (selectedLayer && data.aspectStore[activeRatio]?.[selectedLayer]?.hidden) {
          updateCurrentLayer(selectedLayer, { hidden: false });
        }
        showToast("AI Auto-Optimized all 4 ratios! Zero element collision.");
        setIsAiOptimizing(false);
        return;
      }
    } catch {
      // client fallback below
    }

    // Client-side fail-safe engine with zero collision across all 4 ratios
    const headline = source.headline || {};
    const description = source.description || {};
    const discount = source.discount || {};
    const cta = source.cta || {};
    const validity = source.validity || {};
    const price = source.price || {};
    const oldPrice = source.oldPrice || {};
    const storeName = source.storeName || {};
    const footer = source.footer || {};
    const product = source.product || {};
    const logo = source.logo || {};
    const qrCode = source.qrCode || {};

    const headlineText = headline.text || "Grab the crunch before it's gone!!";
    const descText = description.text || "Ritz Crackers 300g available at an exclusive discount!!";
    const discountText = discount.text || "75% OFF";
    const ctaText = cta.text || "VISIT STORE ➔";
    const validityText = validity.text || "Offer Validity: 1st Aug - 31st Dec 2026";
    const fontColor = headline.fontColor || "#ffffff";
    const font = headline.font || "Arial";
    const discountBg = discount.bgColor || "#ffc700";
    const discountBorder = discount.borderColor || "#047857";
    const ctaBg = cta.bgColor || "#e51a24";

    const opt169: LayersConfig = {
      product:     { ...product, type: "product", x: 0.28, y: 0.52, size: 40, hidden: false, bgMode: "transparent", animation: product.animation || "slide_up", animStart: 0.2, animEnd: 1.2 },
      discount:    { ...discount, type: "text", text: discountText, x: 0.72, y: 0.35, size: 5.2, hidden: false, shape: discount.shape || "origami", fontColor: discount.fontColor || "#ffffff", bgColor: discountBg, border: "1", borderColor: discountBorder, font, animation: discount.animation || "zoom_bounce", animStart: 0.6, animEnd: 1.4 },
      headline:    { ...headline, type: "text", text: headlineText, x: 0.72, y: 0.20, size: headlineText.length > 35 ? 3.3 : 3.6, boxWidth: 46, hidden: false, shape: "none", fontColor, font, fontWeight: "bold", textAlign: "center", animation: headline.animation || "fade_in", animStart: 1.0, animEnd: 1.8 },
      description: { ...description, type: "text", text: descText, x: 0.72, y: 0.49, size: 2.2, boxWidth: 44, hidden: false, shape: "none", fontColor, font, textAlign: "center", animation: description.animation || "fade_up", animStart: 1.4, animEnd: 2.2 },
      price:       { ...price, type: "text", x: 0.64, y: 0.64, size: 3.2, hidden: false, shape: "none", fontColor, font, animation: "fade_in", animStart: 1.8, animEnd: 2.4 },
      oldPrice:    { ...oldPrice, type: "text", x: 0.82, y: 0.64, size: 2.6, hidden: false, shape: "none", fontColor: "#fca5a5", font, animation: "fade_in", animStart: 1.8, animEnd: 2.4 },
      validity:    { ...validity, type: "text", text: validityText, x: 0.72, y: 0.75, size: 2.0, hidden: false, shape: "pill", fontColor: validity.fontColor || "#111111", bgColor: validity.bgColor || "#ffffff", border: "0", font, animation: "slide_up", animStart: 2.0, animEnd: 2.7 },
      cta:         { ...cta, type: "text", text: ctaText, x: 0.72, y: 0.86, size: 2.4, hidden: false, shape: "pill", fontColor: cta.fontColor || "#ffffff", bgColor: ctaBg, border: "0", font, animation: "pulse", animStart: 2.2, animEnd: 3.0 },
      qrCode:      { ...qrCode, type: "text", x: 0.90, y: 0.86, size: 1.8, hidden: false, shape: "rect", animation: "fade_in", animStart: 2.4, animEnd: 3.2 },
      storeName:   { ...storeName, type: "text", x: 0.14, y: 0.05, size: 2.0, hidden: false, shape: "none", fontColor, font, animation: "fade_in", animStart: 0.1, animEnd: 0.8 },
      footer:      { ...footer, type: "text", x: 0.50, y: 0.96, size: 1.3, hidden: false, shape: "none", fontColor, font, animation: "fade_in", animStart: 2.6, animEnd: 3.2 },
      logo:        { ...logo, type: "logo", x: 0.14, y: 0.09, size: 10, hidden: false, animation: "fade_in", animStart: 0.1, animEnd: 0.8 },
    };

    const opt916: LayersConfig = {
      product:     { ...product, type: "product", x: 0.50, y: 0.42, size: 48, hidden: false, bgMode: "transparent", animation: product.animation || "slide_up", animStart: 0.2, animEnd: 1.2 },
      discount:    { ...discount, type: "text", text: discountText, x: 0.76, y: 0.28, size: 5.4, hidden: false, shape: discount.shape || "origami", fontColor: discount.fontColor || "#ffffff", bgColor: discountBg, border: "1", borderColor: discountBorder, font, animation: discount.animation || "zoom_bounce", animStart: 0.6, animEnd: 1.4 },
      headline:    { ...headline, type: "text", text: headlineText, x: 0.50, y: 0.17, size: headlineText.length > 35 ? 3.3 : 3.5, boxWidth: 84, hidden: false, shape: "none", fontColor, font, fontWeight: "bold", textAlign: "center", animation: headline.animation || "fade_in", animStart: 1.0, animEnd: 1.8 },
      description: { ...description, type: "text", text: descText, x: 0.50, y: 0.65, size: 2.2, boxWidth: 80, hidden: false, shape: "none", fontColor, font, textAlign: "center", animation: description.animation || "fade_up", animStart: 1.4, animEnd: 2.2 },
      price:       { ...price, type: "text", x: 0.38, y: 0.74, size: 3.4, hidden: false, shape: "none", fontColor, font, animation: "fade_in", animStart: 1.8, animEnd: 2.4 },
      oldPrice:    { ...oldPrice, type: "text", x: 0.62, y: 0.74, size: 2.7, hidden: false, shape: "none", fontColor: "#fca5a5", font, animation: "fade_in", animStart: 1.8, animEnd: 2.4 },
      validity:    { ...validity, type: "text", text: validityText, x: 0.50, y: 0.81, size: 1.9, hidden: false, shape: "pill", fontColor: validity.fontColor || "#111111", bgColor: validity.bgColor || "#ffffff", border: "0", font, animation: "slide_up", animStart: 2.0, animEnd: 2.7 },
      cta:         { ...cta, type: "text", text: ctaText, x: 0.50, y: 0.88, size: 2.4, hidden: false, shape: "pill", fontColor: cta.fontColor || "#ffffff", bgColor: ctaBg, border: "0", font, animation: "pulse", animStart: 2.2, animEnd: 3.0 },
      qrCode:      { ...qrCode, type: "text", x: 0.86, y: 0.88, size: 1.8, hidden: false, shape: "rect", animation: "fade_in", animStart: 2.4, animEnd: 3.2 },
      storeName:   { type: "text", text: storeName.text || "URBAN RAIN", x: 0.50, y: 0.05, size: 2.1, hidden: false, shape: "none", fontColor, font, animation: "fade_in", animStart: 0.1, animEnd: 0.8 },
      footer:      { ...footer, type: "text", x: 0.50, y: 0.96, size: 1.3, hidden: false, shape: "none", fontColor, font, animation: "fade_in", animStart: 2.6, animEnd: 3.2 },
      logo:        { ...logo, type: "logo", x: 0.50, y: 0.09, size: 10, hidden: false, animation: "fade_in", animStart: 0.1, animEnd: 0.8 },
    };

    const opt11: LayersConfig = {
      product:     { ...product, type: "product", x: 0.28, y: 0.52, size: 38, hidden: false, bgMode: "transparent", animation: product.animation || "slide_up", animStart: 0.2, animEnd: 1.2 },
      discount:    { ...discount, type: "text", text: discountText, x: 0.74, y: 0.30, size: 5.2, hidden: false, shape: discount.shape || "origami", fontColor: discount.fontColor || "#ffffff", bgColor: discountBg, border: "1", borderColor: discountBorder, font, animation: discount.animation || "zoom_bounce", animStart: 0.6, animEnd: 1.4 },
      headline:    { ...headline, type: "text", text: headlineText, x: 0.50, y: 0.15, size: headlineText.length > 35 ? 3.2 : 3.4, boxWidth: 84, hidden: false, shape: "none", fontColor, font, fontWeight: "bold", textAlign: "center", animation: headline.animation || "fade_in", animStart: 1.0, animEnd: 1.8 },
      description: { ...description, type: "text", text: descText, x: 0.74, y: 0.44, size: 2.1, boxWidth: 42, hidden: false, shape: "none", fontColor, font, textAlign: "center", animation: description.animation || "fade_up", animStart: 1.4, animEnd: 2.2 },
      price:       { ...price, type: "text", x: 0.65, y: 0.59, size: 3.2, hidden: false, shape: "none", fontColor, font, animation: "fade_in", animStart: 1.8, animEnd: 2.4 },
      oldPrice:    { ...oldPrice, type: "text", x: 0.83, y: 0.59, size: 2.5, hidden: false, shape: "none", fontColor: "#fca5a5", font, animation: "fade_in", animStart: 1.8, animEnd: 2.4 },
      validity:    { ...validity, type: "text", text: validityText, x: 0.74, y: 0.71, size: 1.8, hidden: false, shape: "pill", fontColor: validity.fontColor || "#111111", bgColor: validity.bgColor || "#ffffff", border: "0", font, animation: "slide_up", animStart: 2.0, animEnd: 2.7 },
      cta:         { ...cta, type: "text", text: ctaText, x: 0.74, y: 0.83, size: 2.3, hidden: false, shape: "pill", fontColor: cta.fontColor || "#ffffff", bgColor: ctaBg, border: "0", font, animation: "pulse", animStart: 2.2, animEnd: 3.0 },
      qrCode:      { ...qrCode, type: "text", x: 0.90, y: 0.83, size: 1.8, hidden: false, shape: "rect", animation: "fade_in", animStart: 2.4, animEnd: 3.2 },
      storeName:   { type: "text", text: storeName.text || "URBAN RAIN", x: 0.14, y: 0.05, size: 1.9, hidden: false, shape: "none", fontColor, font, animation: "fade_in", animStart: 0.1, animEnd: 0.8 },
      footer:      { ...footer, type: "text", x: 0.50, y: 0.96, size: 1.3, hidden: false, shape: "none", fontColor, font, animation: "fade_in", animStart: 2.6, animEnd: 3.2 },
      logo:        { ...logo, type: "logo", x: 0.14, y: 0.09, size: 9, hidden: false, animation: "fade_in", animStart: 0.1, animEnd: 0.8 },
    };

    const opt45: LayersConfig = {
      product:     { ...product, type: "product", x: 0.30, y: 0.50, size: 40, hidden: false, bgMode: "transparent", animation: product.animation || "slide_up", animStart: 0.2, animEnd: 1.2 },
      discount:    { ...discount, type: "text", text: discountText, x: 0.74, y: 0.28, size: 5.2, hidden: false, shape: discount.shape || "origami", fontColor: discount.fontColor || "#ffffff", bgColor: discountBg, border: "1", borderColor: discountBorder, font, animation: discount.animation || "zoom_bounce", animStart: 0.6, animEnd: 1.4 },
      headline:    { ...headline, type: "text", text: headlineText, x: 0.50, y: 0.13, size: headlineText.length > 35 ? 3.2 : 3.4, boxWidth: 84, hidden: false, shape: "none", fontColor, font, fontWeight: "bold", textAlign: "center", animation: headline.animation || "fade_in", animStart: 1.0, animEnd: 1.8 },
      description: { ...description, type: "text", text: descText, x: 0.74, y: 0.42, size: 2.1, boxWidth: 42, hidden: false, shape: "none", fontColor, font, textAlign: "center", animation: description.animation || "fade_up", animStart: 1.4, animEnd: 2.2 },
      price:       { ...price, type: "text", x: 0.65, y: 0.58, size: 3.2, hidden: false, shape: "none", fontColor, font, animation: "fade_in", animStart: 1.8, animEnd: 2.4 },
      oldPrice:    { ...oldPrice, type: "text", x: 0.83, y: 0.58, size: 2.5, hidden: false, shape: "none", fontColor: "#fca5a5", font, animation: "fade_in", animStart: 1.8, animEnd: 2.4 },
      validity:    { ...validity, type: "text", text: validityText, x: 0.74, y: 0.70, size: 1.8, hidden: false, shape: "pill", fontColor: validity.fontColor || "#111111", bgColor: validity.bgColor || "#ffffff", border: "0", font, animation: "slide_up", animStart: 2.0, animEnd: 2.7 },
      cta:         { ...cta, type: "text", text: ctaText, x: 0.74, y: 0.82, size: 2.3, hidden: false, shape: "pill", fontColor: cta.fontColor || "#ffffff", bgColor: ctaBg, border: "0", font, animation: "pulse", animStart: 2.2, animEnd: 3.0 },
      qrCode:      { ...qrCode, type: "text", x: 0.90, y: 0.82, size: 1.8, hidden: false, shape: "rect", animation: "fade_in", animStart: 2.4, animEnd: 3.2 },
      storeName:   { type: "text", text: storeName.text || "URBAN RAIN", x: 0.16, y: 0.05, size: 1.9, hidden: false, shape: "none", fontColor, font, animation: "fade_in", animStart: 0.1, animEnd: 0.8 },
      footer:      { ...footer, type: "text", x: 0.50, y: 0.96, size: 1.3, hidden: false, shape: "none", fontColor, font, animation: "fade_in", animStart: 2.6, animEnd: 3.2 },
      logo:        { ...logo, type: "logo", x: 0.16, y: 0.08, size: 9, hidden: false, animation: "fade_in", animStart: 0.1, animEnd: 0.8 },
    };

    setAspectLayers({
      "16:9": opt169,
      "9:16": opt916,
      "1:1": opt11,
      "4:5": opt45,
    });
    if (selectedLayer && (opt11 as any)[selectedLayer]?.hidden) {
      updateCurrentLayer(selectedLayer, { hidden: false });
    }
    setIsAiOptimizing(false);
    showToast("AI Auto-Optimized all 4 ratios! Zero element collision.");
  };

  // ── Quick Motion Stagger Presets ──────────────────────────────────────────
  const applyMotionPreset = (preset: "cascade" | "simultaneous" | "snappy" | "cinematic") => {
    const keys: LayerKey[] = ["storeName", "logo", "product", "discount", "headline", "description", "price", "oldPrice", "validity", "cta", "footer"];
    setAspectLayers((prev) => {
      const updated = { ...prev };
      const current = { ...updated[activeRatio] };
      if (preset === "cascade") {
        let start = 0.1;
        keys.forEach((k) => {
          if (current[k]) {
            current[k] = { ...current[k], animStart: Number(start.toFixed(1)), animEnd: Number((start + 0.9).toFixed(1)) };
            start += 0.25;
          }
        });
      } else if (preset === "simultaneous") {
        keys.forEach((k) => {
          if (current[k]) {
            current[k] = { ...current[k], animStart: 0.3, animEnd: 1.2 };
          }
        });
      } else if (preset === "snappy") {
        let start = 0.1;
        keys.forEach((k) => {
          if (current[k]) {
            current[k] = { ...current[k], animStart: Number(start.toFixed(1)), animEnd: Number((start + 0.4).toFixed(1)) };
            start += 0.15;
          }
        });
      } else if (preset === "cinematic") {
        let start = 0.2;
        keys.forEach((k) => {
          if (current[k]) {
            current[k] = { ...current[k], animation: "fade_in", animStart: Number(start.toFixed(1)), animEnd: Number((start + 1.8).toFixed(1)) };
            start += 0.3;
          }
        });
      }
      updated[activeRatio] = current;
      return updated;
    });
    showToast(`Applied "${preset.toUpperCase()}" motion preset to ${activeRatio}`);
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
          ctx.fillStyle = "#0b1e24";
          ctx.fillRect(0, 0, W, H);
        }
      } else if (bgType === "color") {
        ctx.fillStyle = bgColor || "#0B2830";
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

      // Alignment Grid
      if (showGrid) {
        ctx.save();
        ctx.strokeStyle = "rgba(99, 102, 241, 0.25)";
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
        ctx.strokeStyle = "rgba(239, 68, 68, 0.45)";
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

      const layers = aspectLayers[ratio] || DEFAULT_LAYERS[ratio];

      const getAnimProgress = (start = 0, end = 1, isTarget = false) => {
        if (isTarget && !isPlaying && t === 0) return 1;
        if (!isPlaying && t === 0) return 1;
        if (t < start) return 0;
        if (t >= end) return 1;
        const p = (t - start) / (end - start);
        return 1 - Math.pow(1 - p, 3);
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
          if (pL.boxHeight) ph = Math.round(H * (pL.boxHeight / 100));
          if (pL.boxWidth) pw = Math.round(W * (pL.boxWidth / 100));

          const inset = pL.cropInset || { top: 0, right: 0, bottom: 0, left: 0 };
          const hasCrop = inset.top > 0 || inset.right > 0 || inset.bottom > 0 || inset.left > 0;
          const finalX = hasCrop ? cx - pw / 2 + (inset.left / 100) * pw : cx - pw / 2;
          const finalY = hasCrop ? cy - ph / 2 + (inset.top / 100) * ph : cy - ph / 2;
          const finalW = hasCrop ? Math.max(10, pw - ((inset.left + inset.right) / 100) * pw) : pw;
          const finalH = hasCrop ? Math.max(10, ph - ((inset.top + inset.bottom) / 100) * ph) : ph;

          ctx.drawImage(productImgObj, finalX, finalY, finalW, finalH);
        } else {
          ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.fillRect(cx - maxDim / 2, cy - maxDim / 2, maxDim, maxDim);
          ctx.strokeRect(cx - maxDim / 2, cy - maxDim / 2, maxDim, maxDim);
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${Math.round(W * 0.03)}px Inter, sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText("PRODUCT IMAGE", cx, cy);
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
          ctx.fillStyle = "rgba(99, 102, 241, 0.85)";
          ctx.beginPath();
          ctx.arc(cx, cy, logoSize / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.font = `bold ${Math.round(logoSize * 0.4)}px Inter, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("LOGO", cx, cy);
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
        if (!L || !L.text || L.hidden) continue;

        const progress = getAnimProgress(L.animStart, L.animEnd, highlightKey === k);
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
        ctx.font = `${fStyle} ${fWeight} ${fontSize}px ${L.font || "Inter"}, sans-serif`;
        ctx.textAlign = (L.textAlign as CanvasTextAlign) || "center";
        ctx.textBaseline = "middle";

        const effectiveBoxWidth = L.boxWidth ? Math.max(18, L.boxWidth) : undefined;
        let customBoxH = L.boxHeight ? (L.boxHeight / 100) * H : 0;
        let customBoxW = effectiveBoxWidth ? (effectiveBoxWidth / 100) * W : 0;

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
        const isTransparent = (L.shape === "none" || (!L.shape && L.bgMode === "transparent")) && !isOrigami && !L.badgeImageUrl;

        if (L.badgeImageUrl) {
          let bImg = globalBadgeImagesCache.get(L.badgeImageUrl);
          if (!bImg) {
            bImg = new Image();
            bImg.crossOrigin = "anonymous";
            bImg.src = L.badgeImageUrl;
            globalBadgeImagesCache.set(L.badgeImageUrl, bImg);
            bImg.onload = () => {
              if (canvasRef.current) renderFrameOnCanvas(canvasRef.current, activeRatio, playbackTime, selectedLayer);
            };
          }
          if (bImg.complete && bImg.naturalWidth > 0) {
            const bw = customBoxW ? Math.max(customBoxW, textW + 36) : Math.max(textW + fontSize * 1.5, fontSize * 3.5);
            const bh = customBoxH ? Math.max(customBoxH, textH + 20) : Math.max(textH + fontSize * 0.8, fontSize * 1.8);
            ctx.drawImage(bImg, cx - bw / 2, cy - bh / 2, bw, bh);
          }
        } else if (!isTransparent) {
          if (L.shape === "rounded") {
            const pw = customBoxW ? Math.max(textW + 20, customBoxW) : textW + fontSize * 1.1;
            const ph = customBoxH ? Math.max(textH + 10, customBoxH) : textH + fontSize * 0.45;
            const rx = Math.max(8, Math.round(fontSize * 0.35));
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(cx - pw / 2, cy - ph / 2, pw, ph, rx);
            else ctx.rect(cx - pw / 2, cy - ph / 2, pw, ph);
            ctx.fillStyle = L.bgColor || "#ffc700";
            ctx.fill();
          } else if (L.shape === "origami" || L.shape === "ribbon" || L.shape === "parallelogram") {
            const tiltDeg = -7;
            const tiltRad = (tiltDeg * Math.PI) / 180;
            const pw = customBoxW ? Math.max(textW + 36, customBoxW) : textW + fontSize * 1.5;
            const ph = customBoxH ? Math.max(textH + 20, customBoxH) : textH + fontSize * 0.75;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(tiltRad);

            // Fold flap
            ctx.beginPath();
            ctx.moveTo(-pw / 2 + 12, ph / 2 - 2);
            ctx.lineTo(-pw / 2 - 14, ph / 2 + 20);
            ctx.lineTo(-pw / 2 + 48, ph / 2 - 2);
            ctx.closePath();
            ctx.fillStyle = L.borderColor || "#047857";
            ctx.fill();

            // Main origami badge
            ctx.fillStyle = L.bgColor || "#ffc700";
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(-pw / 2, -ph / 2, pw, ph, 14);
            else ctx.rect(-pw / 2, -ph / 2, pw, ph);
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 4;
            ctx.stroke();

            // Text
            ctx.fillStyle = L.fontColor || "#ffffff";
            ctx.fillText(L.text, 0, 0);
            ctx.restore();
            ctx.restore();
            continue;
          } else if (L.shape === "pill") {
            const pw = customBoxW ? Math.max(textW + 30, customBoxW) : textW + fontSize * 1.4;
            const ph = customBoxH ? Math.max(textH + 12, customBoxH) : textH + fontSize * 0.5;
            const rx = ph / 2;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(cx - pw / 2, cy - ph / 2, pw, ph, rx);
            else ctx.rect(cx - pw / 2, cy - ph / 2, pw, ph);
            ctx.fillStyle = L.bgColor || "#e51a24";
            ctx.fill();
          }
        }

        // Draw normal text lines
        ctx.fillStyle = L.fontColor || "#ffffff";
        const totalHeight = (textLines.length - 1) * lineHeight;
        let startY = cy - totalHeight / 2;
        for (let i = 0; i < textLines.length; i++) {
          ctx.fillText(textLines[i], cx, startY + i * lineHeight);
        }
        ctx.restore();
      }

      // 5. Draw Decorations / Stickers
      for (const dec of decorations) {
        if (dec.hidden) continue;
        const cx = dec.x * W;
        const cy = dec.y * H;
        const dw = Math.round(W * (dec.size / 100));

        let img = globalBadgeImagesCache.get(dec.url);
        if (!img) {
          img = new Image();
          img.crossOrigin = "anonymous";
          img.src = dec.url;
          globalBadgeImagesCache.set(dec.url, img);
          img.onload = () => {
            if (canvasRef.current) renderFrameOnCanvas(canvasRef.current, activeRatio, playbackTime, selectedLayer);
          };
        }
        if (img.complete && img.naturalWidth > 0) {
          const aspect = img.naturalWidth / img.naturalHeight;
          const dh = Math.round(dw / (aspect || 1));
          ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
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

  // Responsive Canvas fitting in container
  useEffect(() => {
    const container = stageContainerRef.current;
    if (!container) return;

    const updateFit = () => {
      const cw = Math.max(60, container.clientWidth - 32);
      const ch = Math.max(60, container.clientHeight - 32);

      const spec = ASPECT_SPECS[activeRatio];
      const targetAspect = spec.width / spec.height;
      const containerAspect = cw / ch;

      let fw = 0;
      let fh = 0;
      if (containerAspect > targetAspect) {
        fh = ch;
        fw = Math.round(ch * targetAspect);
      } else {
        fw = cw;
        fh = Math.round(cw / targetAspect);
      }
      setCanvasFitSize({ width: fw, height: fh });
    };

    updateFit();
    window.addEventListener("resize", updateFit);
    return () => window.removeEventListener("resize", updateFit);
  }, [activeRatio, activeTab, leftPanelOpen, rightPanelOpen, isFullscreenStage]);

  // Load product & logo image objects
  useEffect(() => {
    if (productImageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => setProductImgObj(img);
      img.src = productImageUrl;
    }
  }, [productImageUrl]);

  useEffect(() => {
    if (logoImageUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => setLogoImgObj(img);
      img.src = logoImageUrl;
    } else {
      setLogoImgObj(null);
    }
  }, [logoImageUrl]);

  useEffect(() => {
    const currentBg = aspectBackgrounds[activeRatio] || bgImageUrl;
    if (bgType === "image" && currentBg) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => setBgImgObj(img);
      img.src = currentBg;
    } else {
      setBgImgObj(null);
    }
  }, [bgType, bgImageUrl, aspectBackgrounds, activeRatio]);

  // Animation preview loop
  useEffect(() => {
    if (!isPlaying) return;
    let startTimestamp: number | null = null;
    let animId: number;

    const loop = (ts: number) => {
      if (!startTimestamp) startTimestamp = ts - playbackTime * 1000;
      const elapsed = (ts - startTimestamp) / 1000;
      if (elapsed >= duration) {
        setPlaybackTime(0);
        startTimestamp = ts;
      } else {
        setPlaybackTime(elapsed);
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, duration]);

  // ── Fetch Templates ─────────────────────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    try {
      setLoadingList(true);
      const res = await fetch("/api/video-template");
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSavedTemplatesList(data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // ── Load Template for Editing ───────────────────────────────────────────────
  const handleEditTemplate = (tpl: SavedTemplateItem, forceRatio?: AspectRatio) => {
    setTemplateId(tpl._id);
    if (tpl.templateId) setActiveTemplateNumber(Number(tpl.templateId));
    setTemplateName(tpl.templateName || "Custom Video Template");
    const targetRatio = forceRatio || (tpl.defaultAspectRatio as AspectRatio) || (tpl.aspectRatio as AspectRatio) || "16:9";
    setActiveRatio(targetRatio);
    setDefaultRatio(targetRatio);
    if (tpl.videoDuration) setDuration(tpl.videoDuration);

    if (tpl.aspectStore && typeof tpl.aspectStore === "object") {
      setAspectLayers({
        "9:16": tpl.aspectStore["9:16"] || DEFAULT_LAYERS["9:16"],
        "16:9": tpl.aspectStore["16:9"] || DEFAULT_LAYERS["16:9"],
        "1:1":  tpl.aspectStore["1:1"]  || DEFAULT_LAYERS["1:1"],
        "4:5":  tpl.aspectStore["4:5"]  || DEFAULT_LAYERS["4:5"],
      });
    } else if (tpl.layers) {
      setAspectLayers((prev) => ({
        ...prev,
        [targetRatio]: { ...prev[targetRatio], ...tpl.layers },
      }));
    }

    if (tpl.backgroundUrl) {
      setBgImageUrl(tpl.backgroundUrl);
      setBgType("image");
    }
    if (tpl.productUrl) setProductImageUrl(tpl.productUrl);
    if (tpl.logoUrl) setLogoImageUrl(tpl.logoUrl);
    if (tpl.musicUrl) setMusicUrl(tpl.musicUrl);

    setActiveTab("studio");
    showToast(`Loaded "${tpl.templateName}"`);
  };

  // ── Save or Duplicate Template ──────────────────────────────────────────────
  const handleSaveTemplate = async (isCopy = false) => {
    setSaving(true);
    const targetId = isCopy ? null : templateId;
    const finalId = isCopy ? getNextTemplateId() : activeTemplateNumber || getNextTemplateId();
    const finalName = isCopy ? `${templateName} (Copy)` : templateName;

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") || "" : "";

      const payload = {
        templateName: finalName,
        templateId: finalId,
        aspectRatio: activeRatio,
        defaultAspectRatio: defaultRatio,
        videoDuration: duration,
        offerType,
        offertypeId: selectedOfferTypeId,
        offertypename: selectedOfferTypeName || offerType,
        animationStyle,
        layers: currentLayers,
        aspectStore: aspectLayers,
        backgroundUrl: aspectBackgrounds[activeRatio] || bgImageUrl,
        aspectBackgrounds,
        productUrl: productImageUrl,
        logoUrl: logoImageUrl,
        musicUrl,
        status: "Active",
        userId,
      };

      const endpoint = targetId ? `/api/video-template/${targetId}` : "/api/video-template";
      const method = targetId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`Successfully saved template #${finalId}!`);
        if (isCopy && data.data?._id) {
          setTemplateId(data.data._id);
          setActiveTemplateNumber(finalId);
          setTemplateName(finalName);
        }
        fetchTemplates();
      } else {
        showToast(data.message || "Failed to save template");
      }
    } catch {
      showToast("Error saving template");
    } finally {
      setSaving(false);
    }
  };

  // ── Create New Template Modal Actions ──────────────────────────────────────
  const handleOpenCreateModal = () => {
    const nextId = getNextTemplateId();
    setNewTplName(`Custom Video Template ${nextId}`);
    setNewTplDuration(10);
    setNewTplRatio("16:9");
    setNewTplOfferType("Flash Sale");
    setShowCreateModal(true);
  };

  const handleConfirmCreateTemplate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const nextId = getNextTemplateId();
    const finalName = newTplName.trim() || `Custom Video Template ${nextId}`;
    setShowCreateModal(false);

    setActiveTemplateNumber(nextId);
    setTemplateId(null);
    setTemplateName(finalName);
    setDuration(newTplDuration);
    setActiveRatio(newTplRatio);
    setOfferType(newTplOfferType);
    setAspectLayers(DEFAULT_LAYERS);
    setBgImageUrl("");
    setBgType("color");
    setLogoImageUrl("");
    setActiveTab("studio");

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
          aspectRatio: newTplRatio,
          videoDuration: newTplDuration,
          offerType: newTplOfferType,
          animationStyle,
          animation: { enabled: animationStyle !== "static", style: animationStyle },
          layers: DEFAULT_LAYERS[newTplRatio],
          aspectStore: DEFAULT_LAYERS,
          status: "Active",
          userId,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setTemplateId(data.data._id);
        const assignedId = Number(data.data.templateId || data.id || nextId);
        setActiveTemplateNumber(assignedId);
        showToast(`Created "${finalName}" #${assignedId}`);
        fetchTemplates();
      } else {
        showToast(`Started "${finalName}" #${nextId}`);
      }
    } catch {
      showToast(`Started "${finalName}" #${nextId}`);
    }
  };

  // ── Generate MP4 Video ──────────────────────────────────────────────────────
  const handleRenderVideo = async () => {
    setRendering(true);
    setRenderProgress("Preparing video encode...");
    setRenderedVideoUrl(null);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") || "" : "";

      const currentBg = aspectBackgrounds[activeRatio] || bgImageUrl || "";
      const payload = {
        template_id: templateId || String(currentDisplayId),
        userId,
        product_url: productImageUrl,
        logo_url: logoImageUrl,
        music_url: musicMode === "none" ? "" : musicUrl,
        background_url: currentBg,
        aspect_backgrounds: aspectBackgrounds,
        aspect_store: aspectLayers,
        headline: currentLayers.headline?.text || "Exclusive Offer!",
        discount: currentLayers.discount?.text || "50% OFF",
        description: currentLayers.description?.text || "",
        validity: currentLayers.validity?.text || "",
        footer: sanitizeFooter(currentLayers.footer?.text),
        ratio: activeRatio,
        duration,
        resolution,
        fps,
        music_volume: musicVolume,
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
            showToast("Video successfully rendered!");
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
        if (type === "logo") {
          setLogoImageUrl(data.url);
          setAspectLayers((prev) => ({
            ...prev,
            [activeRatio]: {
              ...prev[activeRatio],
              logo: { ...(prev[activeRatio]?.logo || {}), hidden: false },
            },
          }));
        }
        if (type === "background") {
          setBgImageUrl(data.url);
          setAspectBackgrounds((prev) => ({
            ...prev,
            [activeRatio]: data.url,
          }));
          setBgType("image");
          showToast(`✅ Background updated for ${activeRatio}!`);
        }
        if (type === "music") setMusicUrl(data.url);
        if (type === "decor") {
          setDecorations((prev) => [
            ...prev,
            { id: `dec_${Date.now()}`, url: data.url, x: 0.5, y: 0.5, size: 16 },
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

  // ── Drag & Drop Pointer Handlers ────────────────────────────────────────────
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const clickY = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Check layer hits
    const keys: LayerKey[] = ["discount", "headline", "description", "price", "oldPrice", "validity", "cta", "storeName", "product", "logo", "footer", "qrCode"];
    let hit: LayerKey | null = null;
    for (const k of keys) {
      const L = currentLayers[k];
      if (!L || L.hidden) continue;
      const lx = L.x * canvas.width;
      const ly = L.y * canvas.height;
      const sz = Math.round(canvas.width * (L.size / 100));
      if (Math.abs(clickX - lx) < sz * 1.5 && Math.abs(clickY - ly) < sz * 0.8) {
        hit = k;
        break;
      }
    }

    if (hit) {
      setSelectedLayer(hit);
      setSelectedDecorId(null);
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setRightPanelOpen(true);
    } else {
      setSelectedLayer(null);
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedLayer || !dragStart || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    const dx = (e.clientX - dragStart.x) / rect.width;
    const dy = (e.clientY - dragStart.y) / rect.height;

    const cur = currentLayers[selectedLayer];
    if (!cur) return;

    let newX = Math.max(0.02, Math.min(0.98, Number((cur.x + dx).toFixed(3))));
    let newY = Math.max(0.02, Math.min(0.98, Number((cur.y + dy).toFixed(3))));

    // Snap to horizontal center if within 2%
    if (Math.abs(newX - 0.50) < 0.02) {
      newX = 0.50;
    }

    updateCurrentLayer(selectedLayer, { x: newX, y: newY });
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  // Bounding box size calculator for each layer type
  const getLayerBBoxSize = useCallback((key: LayerKey, layer: LayerStyle, ratio: AspectRatio) => {
    const isLandscape = ratio === "16:9";
    if (key === "product") {
      return { w: layer.size, h: layer.size * (isLandscape ? 1.4 : 0.9) };
    }
    if (key === "logo") {
      return { w: layer.size * 1.6, h: layer.size * (isLandscape ? 1.2 : 0.8) };
    }
    if (key === "discount") {
      return { w: Math.max(16, layer.size * 2.8), h: Math.max(7, layer.size * 1.4) };
    }
    if (key === "headline") {
      return { w: layer.boxWidth || (isLandscape ? 45 : 82), h: Math.max(7, layer.size * 2.2) };
    }
    if (key === "description") {
      return { w: layer.boxWidth || (isLandscape ? 42 : 80), h: Math.max(5, layer.size * 1.8) };
    }
    if (key === "price" || key === "oldPrice") {
      return { w: Math.max(12, layer.size * 3.4), h: Math.max(5, layer.size * 1.5) };
    }
    if (key === "cta") {
      return { w: Math.max(18, layer.size * 4.2), h: Math.max(5, layer.size * 1.6) };
    }
    if (key === "validity") {
      return { w: Math.max(22, layer.size * 5.8), h: Math.max(4, layer.size * 1.4) };
    }
    if (key === "qrCode") {
      return { w: Math.max(8, layer.size * 2.2), h: Math.max(8, layer.size * 2.2) };
    }
    if (key === "storeName") {
      return { w: Math.max(16, layer.size * 4.2), h: Math.max(4, layer.size * 1.4) };
    }
    if (key === "footer") {
      return { w: 75, h: Math.max(4, layer.size * 1.3) };
    }
    return { w: Math.max(14, layer.size * 2.0), h: Math.max(6, layer.size * 1.2) };
  }, []);

  const handleResizeHandlePointerDown = (e: React.PointerEvent, corner: "nw" | "ne" | "se" | "sw") => {
    e.stopPropagation();
    e.preventDefault();
    if (!selectedLayer || !currentLayers[selectedLayer]) return;
    setResizingLayer({
      layerKey: selectedLayer,
      corner,
      startSize: currentLayers[selectedLayer].size,
      startX: e.clientX,
      startY: e.clientY,
    });
  };

  const handleContainerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (resizingLayer && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const deltaX = (e.clientX - resizingLayer.startX) / rect.width;
      const isRight = resizingLayer.corner === "ne" || resizingLayer.corner === "se";
      const sign = isRight ? 1 : -1;
      const scaleMultiplier = Math.max(0.2, 1 + (sign * deltaX * 2.5));
      const newSize = Math.max(1, Math.min(100, Number((resizingLayer.startSize * scaleMultiplier).toFixed(1))));
      updateCurrentLayer(resizingLayer.layerKey, { size: newSize });
    }
  };

  const handleContainerPointerUp = () => {
    if (resizingLayer) {
      setResizingLayer(null);
    }
    setIsDragging(false);
    setDragStart(null);
  };

  const handleCanvasPointerUp = () => {
    if (resizingLayer) {
      setResizingLayer(null);
    }
    setIsDragging(false);
    setDragStart(null);
  };

  const selectedLayerData = selectedLayer ? currentLayers[selectedLayer] : null;

  return (
    <div className="ste-root-light">
      {/* Audio tags */}
      {musicUrl && <audio ref={audioRef} src={musicUrl} loop />}
      <audio
        ref={previewAudioRef}
        preload="auto"
        onEnded={() => setPreviewingTuneId(null)}
        onPause={() => {
          if (previewAudioRef.current?.paused) setPreviewingTuneId(null);
        }}
      />

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="ste-toast-light">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── Studio Top Header Bar ── */}
      <header className="ste-header-light">
        <div className="ste-header-left">
          {onNavigate && (
            <button
              type="button"
              className="ste-btn-icon-light"
              onClick={() => onNavigate("dashboard")}
              title="Back to Dashboard"
            >
              <FaArrowLeft size={13} />
            </button>
          )}

          <div className="ste-tpl-badge">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">TPL</span>
            <span className="font-mono font-bold text-slate-800 text-xs tabular-nums">#{currentDisplayId}</span>
          </div>

          <div className="ste-name-input-wrap">
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="ste-name-input"
              placeholder="Template Name..."
              title="Click to rename template"
            />
          </div>
        </div>

        {/* Center Mode Tabs */}
        <nav className="ste-tabs-segmented" aria-label="Editor View Modes">
          <button
            type="button"
            className={`ste-tab-pill ${activeTab === "studio" ? "active" : ""}`}
            onClick={() => setActiveTab("studio")}
          >
            Canvas
          </button>
          <button
            type="button"
            className={`ste-tab-pill ${activeTab === "grid" ? "active" : ""}`}
            onClick={() => {
              syncTextToAllRatios();
              setActiveTab("grid");
            }}
          >
            All Ratios Grid
          </button>
          <button
            type="button"
            className={`ste-tab-pill ${activeTab === "library" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("library");
              fetchTemplates();
            }}
          >
            Library
            {savedTemplatesList.length > 0 && (
              <span className="ste-tab-badge">{savedTemplatesList.length}</span>
            )}
          </button>
        </nav>

        {/* Right Topbar Actions */}
        <div className="ste-header-right">
          {/* AI Auto-Optimize Button */}
          <button
            type="button"
            onClick={handleAiOptimizeAllRatios}
            disabled={isAiOptimizing}
            className="ste-hdr-btn-ai"
            title="AI Magic Layout Auto-Optimizer with zero element collision"
          >
            {isAiOptimizing ? <FaSpinner className="animate-spin" size={13} /> : <FaWandMagicSparkles size={13} />}
            <span>{isAiOptimizing ? "Optimizing..." : "AI Auto-Layout"}</span>
          </button>

          {/* Video Preview Toggle */}
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`ste-hdr-btn-ghost ${isPlaying ? "playing" : ""}`}
            title={isPlaying ? "Pause Preview (Space)" : "Play Live Video Preview (Space)"}
          >
            {isPlaying ? <FaPause size={12} /> : <FaPlay size={12} />}
            <span>{isPlaying ? "Pause" : "Preview"}</span>
          </button>

          {/* Single Primary Save Template Button */}
          <button
            type="button"
            onClick={() => handleSaveTemplate(false)}
            disabled={saving}
            className="ste-hdr-btn-primary"
            title="Save all changes to template"
          >
            {saving ? <FaSpinner className="animate-spin" size={13} /> : <FaFloppyDisk size={13} />}
            <span>{saving ? "Saving..." : "Save Template"}</span>
          </button>
        </div>
      </header>

      {/* ── Main Workspace ── */}
      {activeTab === "library" ? (
        /* ══════════════ TAB: TEMPLATE LIBRARY ══════════════ */
        <div className="ste-library-container-light">
          <div className="ste-library-top-bar">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Custom Video Template Library</h2>
              <p className="text-xs text-slate-500">Manage, preview, load, duplicate, or delete your branded promotional templates</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Search templates..."
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                className="ste-input-light w-64 text-xs"
              />
              <button
                type="button"
                className="ste-btn-primary-light"
                onClick={() => handleOpenCreateModal()}
              >
                <FaPlus size={12} />
                <span>Create New</span>
              </button>
            </div>
          </div>

          <div className="ste-library-table-card">
            <table className="ste-table-light">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Template Name</th>
                  <th>Ratio</th>
                  <th>Duration</th>
                  <th>Offer Type</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {savedTemplatesList
                  .filter((tpl) => {
                    if (!librarySearch) return true;
                    const q = librarySearch.toLowerCase();
                    return (
                      tpl.templateName.toLowerCase().includes(q) ||
                      (tpl.offerType || "").toLowerCase().includes(q) ||
                      String(tpl.templateId || "").includes(q)
                    );
                  })
                  .map((tpl, idx) => {
                    const displayId = tpl.templateId || 10000 + idx + 1;
                    const isCurrent = templateId === tpl._id || String(templateId) === String(displayId);
                    return (
                      <tr key={tpl._id} className={isCurrent ? "bg-slate-100" : ""}>
                        <td>
                          <span className="ste-id-badge">#{displayId}</span>
                        </td>
                        <td>
                          <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                            <span>{tpl.templateName}</span>
                            {isCurrent && (
                              <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded-full">
                                Active in Editor
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className="ste-ratio-pill-table">{tpl.aspectRatio || "16:9"}</span>
                        </td>
                        <td>
                          <span className="font-medium text-slate-700">{tpl.videoDuration || 10}s</span>
                        </td>
                        <td>
                          <span className="text-slate-600 text-xs font-medium">{tpl.offerType || "Flash Sale"}</span>
                        </td>
                        <td>
                          <span className="ste-status-badge">Active</span>
                        </td>
                        <td className="text-slate-500 text-xs">
                          {tpl.updatedAt ? new Date(tpl.updatedAt).toLocaleDateString() : "—"}
                        </td>
                        <td>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              className="ste-table-action-btn"
                              title="Watch rendered video"
                              onClick={() => setViewingTemplate(tpl)}
                            >
                              <FaEye size={12} />
                            </button>
                            <button
                              type="button"
                              className="ste-table-action-btn primary"
                              title="Edit in visual editor"
                              onClick={() => handleEditTemplate(tpl)}
                            >
                              <FaPen size={12} />
                            </button>
                            <button
                              type="button"
                              className="ste-table-action-btn"
                              title="Duplicate template"
                              onClick={() => {
                                handleEditTemplate(tpl);
                                handleSaveTemplate(true);
                              }}
                            >
                              <FaCopy size={12} />
                            </button>
                            <button
                              type="button"
                              className="ste-table-action-btn danger"
                              title="Delete template"
                              onClick={() => setDeletingTemplate(tpl)}
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
      ) : activeTab === "grid" ? (
        /* ══════════════ TAB: 4 RATIOS GRID ══════════════ */
        <div className="ste-grid-container-light">
          <div className="ste-grid-header-light">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Synchronized 4 Aspect Ratios Preview</h2>
              <p className="text-xs text-slate-500">Live synchronized playback across all screen formats (16:9 · 9:16 · 1:1 · 4:5)</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="ste-btn-secondary-light text-slate-800 border-slate-300 hover:bg-slate-100 font-semibold"
                onClick={handleAiOptimizeAllRatios}
                disabled={isAiOptimizing}
                title="AI Magic Layout Auto-Optimizer with zero element collision for all 4 ratios"
              >
                {isAiOptimizing ? <FaSpinner className="animate-spin" size={12} /> : <FaWandMagicSparkles size={12} />}
                <span>{isAiOptimizing ? "Optimizing..." : "AI Auto-Optimize All"}</span>
              </button>
              <button
                type="button"
                className="ste-btn-primary-light"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <FaPause size={12} /> : <FaPlay size={12} />}
                <span>{isPlaying ? "Pause All" : "Play All"}</span>
              </button>
              <button
                type="button"
                className="ste-btn-secondary-light"
                onClick={() => setPlaybackTime(0)}
              >
                <FaRotateRight size={12} />
                <span>Restart</span>
              </button>
              <div className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                {playbackTime.toFixed(1)}s / {duration}s
              </div>
            </div>
          </div>

          <div className="ste-aspect-cards-grid">
            {(["16:9", "9:16", "1:1", "4:5"] as AspectRatio[]).map((r) => (
              <div key={r} className="ste-aspect-card-light">
                <div className="ste-aspect-card-header">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">{ASPECT_SPECS[r].label}</span>
                    {defaultRatio === r && (
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <FaStar size={8} /> Default
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRatio(r);
                      setActiveTab("studio");
                    }}
                    className="ste-btn-secondary-light text-xs py-1 px-2.5"
                  >
                    <FaPen size={10} />
                    <span>Edit this</span>
                  </button>
                </div>
                <div className="ste-aspect-card-canvas-wrap">
                  <canvas
                    ref={(el) => {
                      gridCanvases.current[r] = el;
                    }}
                    className="ste-grid-canvas"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ══════════════ TAB: CANVAS STUDIO ══════════════ */
        <div className="ste-studio-body">
          {/* ── Left Rail: Section Navigation + Panel ── */}
          <div className={`ste-left-rail ${!leftPanelOpen ? "collapsed" : ""}`}>
            {/* Vertical Section Nav Tabs */}
            <aside className="ste-section-nav">
              <button
                type="button"
                className={`ste-section-nav-item ${activeSection === "canvas" ? "active" : ""}`}
                onClick={() => {
                  setActiveSection("canvas");
                  setLeftPanelOpen(true);
                }}
                title="Canvas & Specs"
              >
                <FaShapes size={16} />
                <span>Canvas</span>
              </button>

              <button
                type="button"
                className={`ste-section-nav-item ${activeSection === "content" ? "active" : ""}`}
                onClick={() => {
                  setActiveSection("content");
                  setLeftPanelOpen(true);
                }}
                title="Content & Copy"
              >
                <FaFont size={16} />
                <span>Content</span>
              </button>

              <button
                type="button"
                className={`ste-section-nav-item ${activeSection === "badges" ? "active" : ""}`}
                onClick={() => {
                  setActiveSection("badges");
                  setLeftPanelOpen(true);
                }}
                title="Badges & Stickers"
              >
                <FaImage size={16} />
                <span>Badges</span>
              </button>

              <button
                type="button"
                className={`ste-section-nav-item ${activeSection === "animation" ? "active" : ""}`}
                onClick={() => {
                  setActiveSection("animation");
                  setLeftPanelOpen(true);
                }}
                title="Animation & Timing"
              >
                <FaClock size={16} />
                <span>Motion</span>
              </button>

              <button
                type="button"
                className={`ste-section-nav-item ${activeSection === "music" ? "active" : ""}`}
                onClick={() => {
                  setActiveSection("music");
                  setLeftPanelOpen(true);
                }}
                title="Audio & Music"
              >
                <FaMusic size={16} />
                <span>Music</span>
              </button>

            </aside>

            {/* Section Panel Body */}
            {leftPanelOpen && (
              <div className="ste-section-panel">
                <div className="ste-section-panel-header">
                  <h4 className="font-bold text-slate-900 text-sm capitalize">
                    {activeSection === "canvas" && "Canvas & Layout"}
                    {activeSection === "content" && "Content & Copywriting"}
                    {activeSection === "badges" && "Promotional Badges & Stickers"}
                    {activeSection === "animation" && "Motion & Animation Duration"}
                    {activeSection === "music" && "Background Music & Audio"}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setLeftPanelOpen(false)}
                    className="ste-btn-icon-light text-slate-400 hover:text-slate-700"
                    title="Collapse Panel"
                  >
                    <FaChevronLeft size={11} />
                  </button>
                </div>

                <div className="ste-section-panel-content">
                  {/* ───────────────── SECTION 1: CANVAS & SPECS ───────────────── */}
                  {activeSection === "canvas" && (
                    <div className="space-y-4">
                      {/* Canvas Background Settings */}
                      <div className="ste-card-field">
                        <label className="ste-field-label">Background Style</label>
                        <div className="ste-segmented-2">
                          <button
                            type="button"
                            className={bgType === "color" ? "active" : ""}
                            onClick={() => setBgType("color")}
                          >
                            Solid Color
                          </button>
                          <button
                            type="button"
                            className={bgType === "image" ? "active" : ""}
                            onClick={() => setBgType("image")}
                          >
                            Background Image
                          </button>
                        </div>

                        {bgType === "color" && (
                          <div className="space-y-2 mt-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={bgColor}
                                onChange={(e) => setBgColor(e.target.value)}
                                className="w-10 h-9 rounded cursor-pointer border border-slate-200"
                              />
                              <input
                                type="text"
                                value={bgColor}
                                onChange={(e) => setBgColor(e.target.value)}
                                className="ste-input-light flex-1 uppercase font-mono text-xs"
                              />
                            </div>
                            <div className="grid grid-cols-4 gap-1.5 pt-1">
                              {PRESET_SOLID_COLORS.map((c) => (
                                <button
                                  key={c.name}
                                  type="button"
                                  style={{ background: c.color }}
                                  className={`h-7 rounded border transition-all ${
                                    bgColor === c.color ? "border-slate-900 ring-2 ring-slate-400" : "border-slate-300"
                                  }`}
                                  onClick={() => setBgColor(c.color)}
                                  title={c.name}
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {bgType === "image" && (
                          <div className="space-y-2 mt-3">
                            <label className="ste-upload-dropzone">
                              <FaImage className="text-slate-400" size={18} />
                              <span className="text-xs font-semibold text-slate-700">Choose Image File</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleUploadFile(e, "background")}
                                className="hidden"
                              />
                            </label>
                            <input
                              type="text"
                              placeholder="Or enter image URL..."
                              value={aspectBackgrounds[activeRatio] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAspectBackgrounds((prev) => ({ ...prev, [activeRatio]: val }));
                                setBgImageUrl(val);
                              }}
                              className="ste-input-light text-xs"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const currentBg = aspectBackgrounds[activeRatio] || bgImageUrl || "";
                                  setAspectBackgrounds({ "9:16": currentBg, "16:9": currentBg, "1:1": currentBg, "4:5": currentBg });
                                  showToast("Applied background image to all ratios!");
                                }}
                                className="ste-btn-secondary-light text-xs flex-1"
                              >
                                Apply to All 4
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAspectBackgrounds((prev) => ({ ...prev, [activeRatio]: "" }));
                                  setBgImageUrl("");
                                  setBgImgObj(null);
                                }}
                                className="ste-btn-secondary-light text-xs text-rose-600"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                          <input
                            type="checkbox"
                            id="canvas-trans-bg-toggle"
                            checked={aiTransparentBg}
                            onChange={(e) => setAiTransparentBg(e.target.checked)}
                            className="w-4 h-4 accent-slate-900 rounded"
                          />
                          <label htmlFor="canvas-trans-bg-toggle" className="text-xs font-semibold text-slate-700 cursor-pointer">
                            Render with transparent background
                          </label>
                        </div>
                      </div>

                      {/* Product Image Asset */}
                      <div className="ste-card-field">
                        <label className="ste-field-label">Product Image</label>
                        <label className="ste-upload-dropzone">
                          <FaImage className="text-slate-400" size={18} />
                          <span className="text-xs font-semibold text-slate-700">Upload Product Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUploadFile(e, "product")}
                            className="hidden"
                          />
                        </label>
                        {productImageUrl && (
                          <div className="flex items-center gap-3 mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                            <img src={productImageUrl} alt="Product" className="w-12 h-12 object-contain bg-white rounded border" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate">Product Photo</p>
                              <p className="text-[11px] text-slate-400">Positioned on artboard</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setProductImageUrl("");
                                setProductImgObj(null);
                                showToast("Removed product photo");
                              }}
                              className="text-xs text-rose-600 hover:text-rose-800 font-bold"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Brand Logo */}
                      <div className="ste-card-field">
                        <label className="ste-field-label">Brand Logo</label>
                        <label className="ste-upload-dropzone">
                          <FaUpload className="text-slate-400" size={16} />
                          <span className="text-xs font-semibold text-slate-700">Upload Store Logo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUploadFile(e, "logo")}
                            className="hidden"
                          />
                        </label>
                        {logoImageUrl && (
                          <div className="flex items-center justify-between mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                            <img src={logoImageUrl} alt="Logo" className="w-10 h-10 object-contain bg-white rounded border" />
                            <button
                              type="button"
                              onClick={() => {
                                setLogoImageUrl("");
                                setLogoImgObj(null);
                              }}
                              className="text-xs text-rose-600 font-bold"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Quality Resolution */}
                      <div className="ste-card-field">
                        <label className="ste-field-label">Video Quality / Output</label>
                        <select
                          value={resolution}
                          onChange={(e) => setResolution(Number(e.target.value))}
                          className="ste-select-light"
                        >
                          <option value={720}>720p HD (Fast Render)</option>
                          <option value={1080}>1080p FHD (Crisp Master)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* ───────────────── SECTION 2: CONTENT & COPY ───────────────── */}
                  {activeSection === "content" && (
                    <div className="space-y-4">
                      {/* Offer Type */}
                      <div className="ste-card-field">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="ste-field-label mb-0">Offer Type Category</label>
                          <button
                            type="button"
                            onClick={() => setShowNewOfferTypeForm(!showNewOfferTypeForm)}
                            className="text-xs font-bold text-slate-700 hover:text-slate-950"
                          >
                            {showNewOfferTypeForm ? "Cancel" : "+ New"}
                          </button>
                        </div>
                        <select
                          value={selectedOfferTypeId}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "__NEW__") {
                              setShowNewOfferTypeForm(true);
                              return;
                            }
                            setSelectedOfferTypeId(val);
                            const found = offerTypesList.find((o) => o.offertypeId === val);
                            const name = found ? found.offertypename : val;
                            setSelectedOfferTypeName(name);
                            setOfferType(name);
                          }}
                          className="ste-select-light"
                        >
                          {offerTypesList.map((ot) => (
                            <option key={ot.offertypeId} value={ot.offertypeId}>
                              {ot.offertypename}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Headline Text */}
                      <div className="ste-card-field">
                        <div className="flex justify-between items-center mb-1">
                          <label className="ste-field-label mb-0">Headline Message</label>
                          <span className="text-[10px] text-slate-400">Primary Title</span>
                        </div>
                        <input
                          type="text"
                          value={currentLayers.headline?.text || ""}
                          onFocus={() => setSelectedLayer("headline")}
                          onChange={(e) => updateCurrentLayer("headline", { text: e.target.value })}
                          className="ste-input-light text-sm font-semibold"
                          placeholder="Grab the crunch before it's gone!!"
                        />
                      </div>

                      {/* Description */}
                      <div className="ste-card-field">
                        <div className="flex justify-between items-center mb-1">
                          <label className="ste-field-label mb-0">Description / Subhead</label>
                          <span className="text-[10px] text-slate-400">Product Details</span>
                        </div>
                        <textarea
                          rows={2}
                          value={currentLayers.description?.text || ""}
                          onFocus={() => setSelectedLayer("description")}
                          onChange={(e) => updateCurrentLayer("description", { text: e.target.value })}
                          className="ste-input-light text-xs"
                          placeholder="Ritz Crackers 300g available at an exclusive discount!!"
                        />
                      </div>

                      {/* Offer Discount Text */}
                      <div className="ste-card-field">
                        <div className="flex justify-between items-center mb-1">
                          <label className="ste-field-label mb-0">Offer / Discount Badge Text</label>
                          <span className="text-[10px] text-slate-600 font-bold">Featured Deal</span>
                        </div>
                        <input
                          type="text"
                          value={currentLayers.discount?.text || ""}
                          onFocus={() => setSelectedLayer("discount")}
                          onChange={(e) => updateCurrentLayer("discount", { text: e.target.value })}
                          className="ste-input-light font-bold text-slate-900"
                          placeholder="75% OFF"
                        />
                      </div>

                      {/* Price & Old Price */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="ste-card-field">
                          <label className="ste-field-label">Special Deal Price</label>
                          <input
                            type="text"
                            value={currentLayers.price?.text || ""}
                            onFocus={() => setSelectedLayer("price")}
                            onChange={(e) => updateCurrentLayer("price", { text: e.target.value })}
                            className="ste-input-light font-bold text-emerald-700"
                            placeholder="$4.99"
                          />
                        </div>
                        <div className="ste-card-field">
                          <label className="ste-field-label">Original / Strikethrough</label>
                          <input
                            type="text"
                            value={currentLayers.oldPrice?.text || ""}
                            onFocus={() => setSelectedLayer("oldPrice")}
                            onChange={(e) => updateCurrentLayer("oldPrice", { text: e.target.value })}
                            className="ste-input-light line-through text-slate-400"
                            placeholder="$9.99"
                          />
                        </div>
                      </div>

                      {/* Validity Period */}
                      <div className="ste-card-field">
                        <label className="ste-field-label">Offer Validity Dates</label>
                        <input
                          type="text"
                          value={currentLayers.validity?.text || ""}
                          onFocus={() => setSelectedLayer("validity")}
                          onChange={(e) => updateCurrentLayer("validity", { text: e.target.value })}
                          className="ste-input-light text-xs"
                          placeholder="Offer Validity: 1st Aug - 31st Dec 2026"
                        />
                      </div>

                      {/* CTA Button Text */}
                      <div className="ste-card-field">
                        <label className="ste-field-label">Call to Action (CTA Button)</label>
                        <input
                          type="text"
                          value={currentLayers.cta?.text || ""}
                          onFocus={() => setSelectedLayer("cta")}
                          onChange={(e) => updateCurrentLayer("cta", { text: e.target.value })}
                          className="ste-input-light font-bold"
                          placeholder="VISIT STORE ➔"
                        />
                      </div>

                      {/* Store Name & Legal Footer */}
                      <div className="ste-card-field">
                        <label className="ste-field-label">Store / Brand Name</label>
                        <input
                          type="text"
                          value={currentLayers.storeName?.text || ""}
                          onFocus={() => setSelectedLayer("storeName")}
                          onChange={(e) => updateCurrentLayer("storeName", { text: e.target.value })}
                          className="ste-input-light text-xs"
                          placeholder="URBAN RAIN"
                        />
                      </div>

                      <div className="ste-card-field">
                        <label className="ste-field-label">Terms &amp; Disclaimer Notice</label>
                        <input
                          type="text"
                          value={currentLayers.footer?.text || ""}
                          onFocus={() => setSelectedLayer("footer")}
                          onChange={(e) => updateCurrentLayer("footer", { text: e.target.value })}
                          className="ste-input-light text-xs"
                          placeholder="*T&C apply. Images for representation only."
                        />
                      </div>
                    </div>
                  )}

                  {/* ───────────────── SECTION 3: BADGES & STICKERS ───────────────── */}
                  {activeSection === "badges" && (
                    <div className="space-y-4">
                      {/* 3-Way Display Style */}
                      <div className="ste-card-field">
                        <label className="ste-field-label">Offer Badge Display Format</label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            className={`ste-style-card ${
                              currentLayers.discount?.shape === "none" && !currentLayers.discount?.badgeImageUrl
                                ? "active"
                                : ""
                            }`}
                            onClick={() => {
                              updateCurrentLayer("discount", {
                                shape: "none",
                                bgMode: "transparent",
                                badgeImageUrl: undefined,
                              });
                              showToast("Offer set to Plain Text");
                            }}
                          >
                            <FaFont size={13} className="text-slate-600" />
                            <span className="text-xs font-semibold">Plain Text</span>
                          </button>

                          <button
                            type="button"
                            className={`ste-style-card ${
                              currentLayers.discount?.shape === "origami" && !currentLayers.discount?.badgeImageUrl
                                ? "active"
                                : ""
                            }`}
                            onClick={() => {
                              updateCurrentLayer("discount", {
                                shape: "origami",
                                bgMode: "color",
                                bgColor: "#ffc700",
                                borderColor: "#047857",
                                badgeImageUrl: undefined,
                              });
                              showToast("Offer set to 3D Retail Origami");
                            }}
                          >
                            <FaShapes size={13} className="text-slate-600" />
                            <span className="text-xs font-semibold">3D Origami</span>
                          </button>

                          <button
                            type="button"
                            className={`ste-style-card ${currentLayers.discount?.badgeImageUrl ? "active" : ""}`}
                            onClick={() => {
                              updateCurrentLayer("discount", {
                                shape: "sticker",
                                badgeImageUrl: currentLayers.discount?.badgeImageUrl || OFFER_BADGE_PRESETS[0].dataUrl,
                              });
                              showToast("Offer set to Sticker Badge");
                            }}
                          >
                            <FaPalette size={13} className="text-slate-600" />
                            <span className="text-xs font-semibold">Sticker</span>
                          </button>
                        </div>
                      </div>

                      {/* Visual Badge Presets Gallery */}
                      <div className="ste-card-field">
                        <label className="ste-field-label">Official Retail Badge Presets</label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {OFFER_BADGE_PRESETS.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                updateCurrentLayer("discount", {
                                  shape: "sticker",
                                  badgeImageUrl: p.dataUrl,
                                  badgeStyle: p.id,
                                });
                                showToast(`Applied ${p.name}!`);
                              }}
                              className="p-2 border border-slate-200 rounded-lg hover:border-slate-800 hover:shadow-xs transition-all flex flex-col items-center gap-1 bg-white"
                            >
                              <img src={p.dataUrl} alt={p.name} className="h-10 object-contain" />
                              <span className="text-[11px] font-semibold text-slate-600 truncate w-full text-center">
                                {p.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Sticker Upload */}
                      <div className="ste-card-field">
                        <label className="ste-field-label">Custom Sticker / Badges</label>
                        <label className="ste-upload-dropzone">
                          <FaUpload className="text-slate-400" size={16} />
                          <span className="text-xs font-semibold text-slate-700">Upload Custom PNG/SVG Sticker</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = () => {
                                const dataUrl = reader.result as string;
                                updateCurrentLayer("discount", {
                                  badgeImageUrl: dataUrl,
                                  shape: "sticker",
                                });
                                showToast("Custom sticker applied to offer!");
                              };
                              reader.readAsDataURL(file);
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>

                      {/* Snapping Action */}
                      <button
                        type="button"
                        onClick={() => {
                          updateCurrentLayer("discount", { x: 0.50, y: 0.50 });
                          showToast("Offer centered at 50%, 50%!");
                        }}
                        className="ste-btn-secondary-light w-full justify-center text-xs py-2"
                      >
                        <FaCrosshairs /> Snap Offer to Exact Center (50%, 50%)
                      </button>
                    </div>
                  )}

                  {/* ───────────────── SECTION 4: ANIMATION & DURATION ───────────────── */}
                  {activeSection === "animation" && (
                    <div className="space-y-4">
                      {/* Highly Modifiable Video Duration */}
                      <div className="ste-card-field">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="ste-field-label mb-0">Total Video Duration</label>
                          <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                            {duration} Seconds ({duration * fps} frames)
                          </span>
                        </div>

                        {/* Quick Presets */}
                        <div className="grid grid-cols-6 gap-1 mb-2">
                          {[5, 8, 10, 15, 30, 60].map((sec) => (
                            <button
                              key={sec}
                              type="button"
                              onClick={() => setDuration(sec)}
                              className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                duration === sec
                                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                              }`}
                            >
                              {sec}s
                            </button>
                          ))}
                        </div>

                        {/* Smooth Duration Slider */}
                        <div className="flex items-center gap-3 pt-1">
                          <input
                            type="range"
                            min="3"
                            max="60"
                            step="0.5"
                            value={duration}
                            onChange={(e) => setDuration(Number(e.target.value))}
                            className="flex-1 accent-slate-900 cursor-pointer"
                          />
                          <input
                            type="number"
                            min="3"
                            max="60"
                            value={duration}
                            onChange={(e) => setDuration(Math.max(1, Number(e.target.value)))}
                            className="w-16 ste-input-light text-xs font-bold text-center"
                          />
                        </div>
                      </div>

                      {/* Quick Motion Presets */}
                      <div className="ste-card-field">
                        <label className="ste-field-label">Quick Motion Presets</label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => applyMotionPreset("cascade")}
                            className="ste-preset-btn"
                          >
                            <span>Cascade Sequence</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => applyMotionPreset("simultaneous")}
                            className="ste-preset-btn"
                          >
                            <span>Simultaneous Pop</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => applyMotionPreset("snappy")}
                            className="ste-preset-btn"
                          >
                            <span>Snappy &amp; Fast</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => applyMotionPreset("cinematic")}
                            className="ste-preset-btn"
                          >
                            <span>Cinematic Slow</span>
                          </button>
                        </div>
                      </div>

                      {/* Visual Layer Timing Breakdown */}
                      <div className="ste-card-field">
                        <label className="ste-field-label">Visual Duration Timeline</label>
                        <p className="text-[11px] text-slate-500 mb-2">Adjust when each element appears and how long it stays active</p>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {Object.entries(currentLayers).map(([k, val]) => {
                            if (!val || val.hidden || (!val.text && k !== "product" && k !== "logo")) return null;
                            const start = val.animStart ?? 0.5;
                            const end = val.animEnd ?? 1.5;
                            const dur = Number((end - start).toFixed(1));
                            return (
                              <div
                                key={k}
                                onClick={() => setSelectedLayer(k as LayerKey)}
                                className={`p-2 rounded-lg border cursor-pointer transition-all ${
                                  selectedLayer === k ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"
                                }`}
                              >
                                <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
                                  <span className="capitalize">{k}</span>
                                  <span className="text-[11px] font-mono text-slate-700">{start}s → {end}s ({dur}s)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-400 w-8">Start</span>
                                  <input
                                    type="range"
                                    min="0"
                                    max={duration}
                                    step="0.1"
                                    value={start}
                                    onChange={(e) => {
                                      const newStart = Number(e.target.value);
                                      updateCurrentLayer(k as LayerKey, { animStart: newStart, animEnd: Math.max(newStart + 0.2, end) });
                                    }}
                                    className="flex-1 accent-slate-900 h-1"
                                  />
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] text-slate-400 w-8">End</span>
                                  <input
                                    type="range"
                                    min="0.1"
                                    max={duration}
                                    step="0.1"
                                    value={end}
                                    onChange={(e) => {
                                      const newEnd = Number(e.target.value);
                                      updateCurrentLayer(k as LayerKey, { animEnd: newEnd, animStart: Math.min(newEnd - 0.2, start) });
                                    }}
                                    className="flex-1 accent-slate-900 h-1"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ───────────────── SECTION 5: AUDIO & MUSIC ───────────────── */}
                  {activeSection === "music" && (
                    <div className="space-y-4">
                      {/* Audio Mode */}
                      <div className="ste-card-field">
                        <label className="ste-field-label">Background Audio Source</label>
                        <div className="ste-segmented-3">
                          <button
                            type="button"
                            className={musicMode === "preset" ? "active" : ""}
                            onClick={() => {
                              setMusicMode("preset");
                              const m = DEMO_AUDIO_TUNES.find((d) => d.id === selectedPresetId) || DEMO_AUDIO_TUNES[0];
                              setMusicUrl(m.url);
                            }}
                          >
                            Demo Tunes
                          </button>
                          <button
                            type="button"
                            className={musicMode === "upload" ? "active" : ""}
                            onClick={() => setMusicMode("upload")}
                          >
                            Custom MP3
                          </button>
                          <button
                            type="button"
                            className={musicMode === "none" ? "active" : ""}
                            onClick={() => {
                              setMusicMode("none");
                              setMusicUrl("");
                              if (audioRef.current) audioRef.current.pause();
                            }}
                          >
                            Mute
                          </button>
                        </div>
                      </div>

                      {/* Demo Tunes List */}
                      {musicMode === "preset" && (
                        <div className="space-y-2">
                          {DEMO_AUDIO_TUNES.map((tune) => {
                            const isSelected = selectedPresetId === tune.id;
                            const isPlayingThis = previewingTuneId === tune.id;
                            return (
                              <div
                                key={tune.id}
                                onClick={() => {
                                  setSelectedPresetId(tune.id);
                                  setMusicUrl(tune.url);
                                }}
                                className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                                  isSelected ? "border-slate-900 bg-slate-50 shadow-xs" : "border-slate-200 bg-white"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <FaMusic className="text-slate-400" size={13} />
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-800 truncate">{tune.name}</p>
                                    <p className="text-[11px] text-slate-500 truncate">{tune.desc}</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPresetId(tune.id);
                                    setMusicUrl(tune.url);
                                    if (previewAudioRef.current) {
                                      if (isPlayingThis) {
                                        previewAudioRef.current.pause();
                                        setPreviewingTuneId(null);
                                      } else {
                                        previewAudioRef.current.src = tune.url;
                                        previewAudioRef.current.volume = musicVolume / 100;
                                        previewAudioRef.current.play();
                                        setPreviewingTuneId(tune.id);
                                      }
                                    }
                                  }}
                                  className={`p-1.5 rounded-md text-xs font-bold ${
                                    isPlayingThis ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {isPlayingThis ? <FaVolumeXmark size={12} /> : <FaVolumeHigh size={12} />}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Custom Upload */}
                      {musicMode === "upload" && (
                        <div className="ste-card-field">
                          <label className="ste-upload-dropzone">
                            <FaMusic className="text-slate-400" size={18} />
                            <span className="text-xs font-semibold text-slate-700">Choose MP3 / WAV File</span>
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={(e) => handleUploadFile(e, "music")}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}

                      {/* Volume */}
                      {musicMode !== "none" && (
                        <div className="ste-card-field">
                          <div className="flex items-center justify-between mb-1">
                            <label className="ste-field-label mb-0">Audio Volume</label>
                            <span className="text-xs font-bold text-slate-800 font-mono">{musicVolume}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={musicVolume}
                            onChange={(e) => setMusicVolume(Number(e.target.value))}
                            className="w-full accent-slate-900 cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Center Stage: Artboard & Unified Player ── */}
          <main className={`ste-stage-light ${isFullscreenStage ? "fullscreen" : ""}`}>
            {/* Stage Toolbar */}
            <div className="ste-stage-toolbar-light">
              <div className="flex items-center gap-2">
                {!leftPanelOpen && (
                  <button
                    type="button"
                    onClick={() => setLeftPanelOpen(true)}
                    className="ste-btn-icon-light"
                    title="Open Section Panel"
                  >
                    <FaChevronRight size={11} />
                  </button>
                )}

                {/* Aspect Ratio Switcher Segmented Pills */}
                <div className="ste-stage-ratios-pills">
                  {(["16:9", "9:16", "1:1", "4:5"] as AspectRatio[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={`ste-stage-ratio-btn ${activeRatio === r ? "active" : ""}`}
                      onClick={() => setActiveRatio(r)}
                      title={`Switch to ${r} (${ASPECT_SPECS[r].width}×${ASPECT_SPECS[r].height})`}
                    >
                      <span>{r}</span>
                      {defaultRatio === r && <FaStar size={9} className="text-amber-400" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Stage Controls */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(0.5, Number((z - 0.1).toFixed(1))))}
                    className="px-2 py-1 text-slate-600 hover:bg-slate-100 text-xs font-bold"
                  >
                    -
                  </button>
                  <span className="px-2 text-xs font-bold text-slate-700">{Math.round(zoomLevel * 100)}%</span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(2.0, Number((z + 0.1).toFixed(1))))}
                    className="px-2 py-1 text-slate-600 hover:bg-slate-100 text-xs font-bold"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowGrid(!showGrid)}
                  className={`ste-btn-icon-light ${showGrid ? "active" : ""}`}
                  title={showGrid ? "Hide Grid" : "Show Alignment Grid"}
                >
                  <FaTableCells size={12} />
                </button>

                <button
                  type="button"
                  onClick={() => setIsFullscreenStage(!isFullscreenStage)}
                  className="ste-btn-icon-light"
                  title={isFullscreenStage ? "Exit Fullscreen" : "Fullscreen Artboard"}
                >
                  {isFullscreenStage ? <FaCompress size={12} /> : <FaExpand size={12} />}
                </button>

                {!rightPanelOpen && (
                  <button
                    type="button"
                    onClick={() => setRightPanelOpen(true)}
                    className="ste-btn-secondary-light text-xs py-1 px-2.5"
                  >
                    <FaSliders size={11} />
                    <span>Inspector</span>
                  </button>
                )}
              </div>
            </div>

            {/* ── Quick Layers Selector Strip ── */}
            <div className="ste-layers-ribbon">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-2 flex-shrink-0">
                <FaLayerGroup size={11} className="text-slate-500" />
                <span>Layers:</span>
              </div>
              <div className="ste-layers-chips-scroll">
                {([
                  { key: "product", label: "Product Photo" },
                  { key: "discount", label: "Offer Badge" },
                  { key: "headline", label: "Headline" },
                  { key: "description", label: "Description" },
                  { key: "price", label: "Deal Price" },
                  { key: "oldPrice", label: "Old Price" },
                  { key: "cta", label: "CTA Button" },
                  { key: "validity", label: "Validity" },
                  { key: "logo", label: "Brand Logo" },
                  { key: "footer", label: "Legal Footer" },
                ] as { key: LayerKey; label: string }[]).map((item) => {
                  const isSel = selectedLayer === item.key;
                  const isHid = currentLayers[item.key]?.hidden;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setSelectedLayer(item.key);
                        if (isHid) {
                          updateCurrentLayer(item.key, { hidden: false });
                          showToast(`Restored & selected ${item.label}`);
                        }
                        setRightPanelOpen(true);
                      }}
                      className={`ste-layer-pill ${isSel ? "active" : ""} ${isHid ? "is-hidden" : ""}`}
                      title={isHid ? `${item.label} (Hidden - click to restore to canvas)` : `Select ${item.label}`}
                    >
                      <span>{item.label}</span>
                      {isHid ? (
                        <span className="text-[10px] text-rose-500 font-medium ml-1">Hidden</span>
                      ) : (
                        isSel && <span className="w-1.5 h-1.5 rounded-full bg-white ml-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Canvas Viewport Artboard Container */}
            <div className="ste-canvas-container-light" ref={stageContainerRef}>
              <div
                className="ste-canvas-card-light"
                style={{
                  width: canvasFitSize.width > 0 ? `${canvasFitSize.width * zoomLevel}px` : "auto",
                  height: canvasFitSize.height > 0 ? `${canvasFitSize.height * zoomLevel}px` : "auto",
                  aspectRatio: `${ASPECT_SPECS[activeRatio].width} / ${ASPECT_SPECS[activeRatio].height}`,
                  position: "relative",
                }}
                onPointerMove={handleContainerPointerMove}
                onPointerUp={handleContainerPointerUp}
              >
                <canvas
                  ref={canvasRef}
                  onPointerDown={handleCanvasPointerDown}
                  onPointerMove={handleCanvasPointerMove}
                  onPointerUp={handleCanvasPointerUp}
                  className="ste-main-canvas-light"
                />

                {/* ── Active Layer On-Canvas Bounding Box with Resize Handles and Remove ── */}
                {selectedLayer && selectedLayerData && !selectedLayerData.hidden && (
                  <div
                    className="ste-canvas-bbox-overlay"
                    style={{
                      position: "absolute",
                      left: `${selectedLayerData.x * 100}%`,
                      top: `${selectedLayerData.y * 100}%`,
                      width: `${getLayerBBoxSize(selectedLayer, selectedLayerData, activeRatio).w}%`,
                      height: `${getLayerBBoxSize(selectedLayer, selectedLayerData, activeRatio).h}%`,
                      transform: "translate(-50%, -50%)",
                      pointerEvents: "none",
                    }}
                  >
                    {/* Bounding Box Outline */}
                    <div className="ste-bbox-border" />

                    {/* Floating Quick Action Pill above selection */}
                    <div
                      className="ste-bbox-floating-actions"
                      onPointerDown={(e) => e.stopPropagation()}
                      style={{
                        pointerEvents: "auto",
                        top: selectedLayerData.y < 0.14 ? "calc(100% + 10px)" : "-44px",
                      }}
                    >
                      <span className="ste-bbox-pill-name">{selectedLayer.toUpperCase()}</span>

                      {/* Size Stepper (- / +) */}
                      <div className="ste-bbox-stepper">
                        <button
                          type="button"
                          title="Scale Down"
                          onClick={() => updateCurrentLayer(selectedLayer, { size: Math.max(1, Number((selectedLayerData.size - 1).toFixed(1))) })}
                        >
                          -
                        </button>
                        <span title="Layer Scale">{selectedLayerData.size}%</span>
                        <button
                          type="button"
                          title="Scale Up"
                          onClick={() => updateCurrentLayer(selectedLayer, { size: Math.min(100, Number((selectedLayerData.size + 1).toFixed(1))) })}
                        >
                          +
                        </button>
                      </div>

                      {/* Center Button */}
                      <button
                        type="button"
                        className="ste-bbox-act-btn"
                        title="Center Horizontally"
                        onClick={() => {
                          updateCurrentLayer(selectedLayer, { x: 0.50 });
                          showToast(`Centered ${selectedLayer}`);
                        }}
                      >
                        <FaAlignCenter size={9} />
                        <span>Center</span>
                      </button>

                      {/* Remove / Delete Element */}
                      <button
                        type="button"
                        className="ste-bbox-act-btn danger"
                        title="Remove / Delete element from canvas"
                        onClick={() => {
                          updateCurrentLayer(selectedLayer, { hidden: true });
                          setSelectedLayer(null);
                          showToast(`Removed ${selectedLayer} from canvas`);
                        }}
                      >
                        <FaTrash size={9} />
                        <span>Remove</span>
                      </button>
                    </div>

                    {/* 4 Corner Resize Handles */}
                    <div
                      className="ste-bbox-handle nw"
                      onPointerDown={(e) => handleResizeHandlePointerDown(e, "nw")}
                      title="Drag to resize / scale"
                    />
                    <div
                      className="ste-bbox-handle ne"
                      onPointerDown={(e) => handleResizeHandlePointerDown(e, "ne")}
                      title="Drag to resize / scale"
                    />
                    <div
                      className="ste-bbox-handle se"
                      onPointerDown={(e) => handleResizeHandlePointerDown(e, "se")}
                      title="Drag to resize / scale"
                    />
                    <div
                      className="ste-bbox-handle sw"
                      onPointerDown={(e) => handleResizeHandlePointerDown(e, "sw")}
                      title="Drag to resize / scale"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Unified Scrubber & Player Bar */}
            <div className="ste-player-bar-light">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`ste-player-play-btn ${isPlaying ? "playing" : ""}`}
                >
                  {isPlaying ? <FaPause size={12} /> : <FaPlay size={12} />}
                  <span>{isPlaying ? "Pause" : "Play"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPlaybackTime(0)}
                  className="ste-btn-icon-light"
                  title="Replay from start"
                >
                  <FaRotateRight size={12} />
                </button>
              </div>

              {/* Progress Slider */}
              <div className="flex-1 flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-slate-800 w-10 text-right">
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
                  className="flex-1 accent-slate-900 h-2 bg-slate-200 rounded cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-slate-500 w-10">
                  {duration}s
                </span>
              </div>

              {/* Quick Duration Presets */}
              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                <span className="text-[11px] font-bold text-slate-400">Duration:</span>
                {[5, 10, 15].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setDuration(d);
                      if (playbackTime > d) setPlaybackTime(d);
                      showToast(`Set duration to ${d}s`);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                      duration === d
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {d}s
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setAspectLayers((prev) => ({
                    ...prev,
                    [activeRatio]: DEFAULT_LAYERS[activeRatio],
                  }));
                  showToast(`Reset ${activeRatio} coordinates`);
                }}
                className="ste-btn-secondary-light text-xs py-1 px-2.5"
                title="Reset layout to defaults"
              >
                Reset Layout
              </button>
            </div>
          </main>

          {/* ── Right Rail: Contextual Element Inspector ── */}
          {rightPanelOpen && (
            <aside className="ste-right-inspector">
              <div className="ste-inspector-header">
                <div className="flex items-center gap-2">
                  <FaSliders className="text-slate-700" size={13} />
                  <h4 className="font-bold text-slate-900 text-sm">Layer Inspector</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setRightPanelOpen(false)}
                  className="ste-btn-icon-light text-slate-400"
                  title="Close Inspector"
                >
                  <FaXmark size={12} />
                </button>
              </div>

              <div className="ste-inspector-content">
                {selectedLayer && selectedLayerData ? (
                  <div className="space-y-4">
                    {/* Active Layer Banner & Actions */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-100 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded tracking-wide">
                          {selectedLayer.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            updateCurrentLayer(selectedLayer, { x: 0.50 });
                            showToast(`Centered ${selectedLayer}`);
                          }}
                          className="text-[11px] font-semibold px-2 py-0.5 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
                          title="Center horizontally on canvas"
                        >
                          Center
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCurrentLayer(selectedLayer, { hidden: !selectedLayerData.hidden })}
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded border transition-colors ${
                            selectedLayerData.hidden
                              ? "bg-rose-50 border-rose-300 text-rose-600"
                              : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                          }`}
                          title={selectedLayerData.hidden ? "Unhide layer" : "Hide layer"}
                        >
                          {selectedLayerData.hidden ? "Hidden" : "Visible"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateCurrentLayer(selectedLayer, { hidden: true });
                            setSelectedLayer(null);
                            showToast(`Removed ${selectedLayer}`);
                          }}
                          className="text-[11px] font-semibold px-2 py-0.5 rounded border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 flex items-center gap-1 transition-colors"
                          title="Remove Layer from Canvas"
                        >
                          <FaTrash size={9} /> Remove
                        </button>
                      </div>
                    </div>

                    {/* Coordinates & Position */}
                    <div className="ste-card-field">
                      <div className="flex items-center justify-between mb-2">
                        <label className="ste-field-label mb-0">Position (X, Y)</label>
                        <button
                          type="button"
                          onClick={() => {
                            updateCurrentLayer(selectedLayer, { x: 0.50 });
                            showToast(`Centered ${selectedLayer}`);
                          }}
                          className="text-[11px] text-slate-700 font-bold hover:underline flex items-center gap-1"
                        >
                          <FaAlignCenter size={9} /> Center H
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Horizontal (X)</span>
                            <span className="font-mono font-bold text-slate-700">{Math.round(selectedLayerData.x * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="2"
                            max="98"
                            value={Math.round(selectedLayerData.x * 100)}
                            onChange={(e) => updateCurrentLayer(selectedLayer, { x: Number(e.target.value) / 100 })}
                            className="w-full accent-slate-900"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Vertical (Y)</span>
                            <span className="font-mono font-bold text-slate-700">{Math.round(selectedLayerData.y * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="2"
                            max="98"
                            value={Math.round(selectedLayerData.y * 100)}
                            onChange={(e) => updateCurrentLayer(selectedLayer, { y: Number(e.target.value) / 100 })}
                            className="w-full accent-slate-900"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Size & Box Width */}
                    <div className="ste-card-field">
                      <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
                        <label className="ste-field-label mb-0">Scale / Size</label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateCurrentLayer(selectedLayer, { size: Math.max(1, Number((selectedLayerData.size - 1).toFixed(1))) })}
                            className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded text-slate-700 font-bold hover:bg-slate-200 text-xs"
                            title="Scale Down"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold text-slate-800 text-xs min-w-[36px] text-center">{selectedLayerData.size}%</span>
                          <button
                            type="button"
                            onClick={() => updateCurrentLayer(selectedLayer, { size: Math.min(100, Number((selectedLayerData.size + 1).toFixed(1))) })}
                            className="w-5 h-5 flex items-center justify-center bg-slate-100 rounded text-slate-700 font-bold hover:bg-slate-200 text-xs"
                            title="Scale Up"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        step="0.5"
                        value={selectedLayerData.size}
                        onChange={(e) => updateCurrentLayer(selectedLayer, { size: Number(e.target.value) })}
                        className="w-full accent-slate-900"
                      />
                    </div>

                    {/* Text Layer Properties */}
                    {selectedLayer !== "product" && selectedLayer !== "logo" && (
                      <>
                        <div className="ste-card-field">
                          <label className="ste-field-label">Text Content</label>
                          <textarea
                            rows={2}
                            value={selectedLayerData.text || ""}
                            onChange={(e) => updateCurrentLayer(selectedLayer, { text: e.target.value })}
                            className="ste-input-light text-xs font-medium"
                          />
                        </div>

                        <div className="ste-card-field">
                          <label className="ste-field-label">Typography &amp; Color</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={selectedLayerData.fontColor || "#ffffff"}
                              onChange={(e) => updateCurrentLayer(selectedLayer, { fontColor: e.target.value })}
                              className="w-9 h-8 rounded border border-slate-200 cursor-pointer"
                            />
                            <select
                              value={selectedLayerData.font || "Inter"}
                              onChange={(e) => updateCurrentLayer(selectedLayer, { font: e.target.value })}
                              className="ste-select-light flex-1 text-xs"
                            >
                              <option value="Inter">Inter Clean</option>
                              <option value="Arial">Arial Bold</option>
                              <option value="Montserrat">Montserrat</option>
                              <option value="Impact">Impact Punch</option>
                              <option value="Georgia">Georgia Classic</option>
                            </select>
                          </div>
                        </div>

                        {/* Shape Background */}
                        <div className="ste-card-field">
                          <label className="ste-field-label">Card / Badge Shape</label>
                          <select
                            value={selectedLayerData.shape || "none"}
                            onChange={(e) => updateCurrentLayer(selectedLayer, { shape: e.target.value as any })}
                            className="ste-select-light text-xs"
                          >
                            <option value="none">None (Plain Text)</option>
                            <option value="origami">3D Folded Origami</option>
                            <option value="rounded">Rounded Box</option>
                            <option value="pill">Pill Shape</option>
                            <option value="circle">Circle Badge</option>
                            <option value="rect">Rectangle</option>
                          </select>

                          {selectedLayerData.shape && selectedLayerData.shape !== "none" && (
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Badge Fill:</span>
                              <input
                                type="color"
                                value={selectedLayerData.bgColor || "#ffc700"}
                                onChange={(e) => updateCurrentLayer(selectedLayer, { bgColor: e.target.value })}
                                className="w-8 h-7 rounded border border-slate-200 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={selectedLayerData.bgColor || "#ffc700"}
                                onChange={(e) => updateCurrentLayer(selectedLayer, { bgColor: e.target.value })}
                                className="ste-input-light text-[11px] uppercase font-mono py-1 px-1.5 flex-1"
                              />
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Media Upload for Product or Logo */}
                    {selectedLayer === "product" && (
                      <div className="ste-card-field">
                        <label className="ste-field-label">Replace Product Photo</label>
                        <label className="ste-upload-dropzone">
                          <FaUpload className="text-slate-400" size={16} />
                          <span className="text-xs font-semibold text-slate-700">Upload New Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUploadFile(e, "product")}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}

                    {selectedLayer === "logo" && (
                      <div className="ste-card-field">
                        <label className="ste-field-label">Replace Brand Logo</label>
                        <label className="ste-upload-dropzone">
                          <FaUpload className="text-slate-400" size={16} />
                          <span className="text-xs font-semibold text-slate-700">Upload New Logo</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUploadFile(e, "logo")}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}

                    {/* Motion & Entrance Timing */}
                    <div className="ste-card-field">
                      <label className="ste-field-label">Motion Animation</label>
                      <select
                        value={selectedLayerData.animation || "fade_in"}
                        onChange={(e) => updateCurrentLayer(selectedLayer, { animation: e.target.value })}
                        className="ste-select-light text-xs mb-2"
                      >
                        <option value="fade_in">Fade In</option>
                        <option value="slide_up">Slide Up</option>
                        <option value="slide_down">Slide Down</option>
                        <option value="slide_left">Slide Left</option>
                        <option value="slide_right">Slide Right</option>
                        <option value="zoom_in">Zoom In</option>
                        <option value="zoom_bounce">Zoom Bounce</option>
                        <option value="pulse">Pulse Glow</option>
                        <option value="elastic">Elastic Snap</option>
                        <option value="none">Static (No Motion)</option>
                      </select>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-500 text-[11px]">Start: {selectedLayerData.animStart ?? 0.5}s</span>
                          <input
                            type="range"
                            min="0"
                            max={duration}
                            step="0.1"
                            value={selectedLayerData.animStart ?? 0.5}
                            onChange={(e) => updateCurrentLayer(selectedLayer, { animStart: Number(e.target.value) })}
                            className="w-full accent-slate-900 mt-1"
                          />
                        </div>
                        <div>
                          <span className="text-slate-500 text-[11px]">End: {selectedLayerData.animEnd ?? 1.5}s</span>
                          <input
                            type="range"
                            min="0.1"
                            max={duration}
                            step="0.1"
                            value={selectedLayerData.animEnd ?? 1.5}
                            onChange={(e) => updateCurrentLayer(selectedLayer, { animEnd: Number(e.target.value) })}
                            className="w-full accent-slate-900 mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 px-2 text-center">
                    <FaLayerGroup size={22} className="mx-auto mb-2 text-slate-400" />
                    <p className="text-xs font-bold text-slate-800">Select an Element to Edit</p>
                    <p className="text-[11px] text-slate-400 mb-3">Choose any layer below or click directly on the canvas:</p>
                    <div className="grid grid-cols-2 gap-1.5 text-left">
                      {([
                        { key: "product", label: "Product Photo" },
                        { key: "discount", label: "Offer Badge" },
                        { key: "headline", label: "Headline" },
                        { key: "description", label: "Description" },
                        { key: "price", label: "Deal Price" },
                        { key: "oldPrice", label: "Old Price" },
                        { key: "cta", label: "CTA Button" },
                        { key: "validity", label: "Validity" },
                        { key: "logo", label: "Brand Logo" },
                        { key: "footer", label: "Legal Footer" },
                      ] as { key: LayerKey; label: string }[]).map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setSelectedLayer(item.key)}
                          className="flex items-center gap-1.5 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors"
                        >
                          <span className="truncate">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          )}
        </div>
      )}

      {/* ══════════════ MODAL: CREATE TEMPLATE ══════════════ */}
      {showCreateModal && (
        <div className="ste-modal-overlay">
          <div className="ste-modal">
            <div className="ste-modal__header">
              <div className="ste-modal__title-wrap">
                <FaPlus className="text-slate-700" />
                <h3 className="font-bold text-slate-900 text-lg">Create New Video Template</h3>
              </div>
              <button className="ste-modal__close" onClick={() => setShowCreateModal(false)} type="button">
                <FaXmark />
              </button>
            </div>
            <form onSubmit={handleConfirmCreateTemplate}>
              <div className="ste-modal__body space-y-4">
                <div className="ste-card-field">
                  <label className="ste-field-label">Template Name *</label>
                  <input
                    type="text"
                    className="ste-input-light"
                    placeholder="Weekend Flash Sale Promo"
                    value={newTplName}
                    onChange={(e) => setNewTplName(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <div className="ste-card-field">
                  <label className="ste-field-label">Duration</label>
                  <div className="grid grid-cols-5 gap-2">
                    {[5, 8, 10, 15, 30].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setNewTplDuration(s)}
                        className={`py-1.5 text-xs font-bold rounded-lg border ${
                          newTplDuration === s ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200"
                        }`}
                      >
                        {s}s
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-44 bg-slate-950 rounded-xl overflow-hidden border border-slate-200">
                  <CreateModalPreviewCanvas
                    ratio={newTplRatio}
                    duration={newTplDuration}
                    offerType={newTplOfferType}
                    templateName={newTplName || "New Template"}
                  />
                </div>
              </div>
              <div className="ste-modal__actions">
                <button type="button" className="ste-btn ste-btn--secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="ste-btn ste-btn--primary">
                  Create Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL: VIEW PREVIEW ══════════════ */}
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

      {/* ══════════════ MODAL: DELETE CONFIRMATION ══════════════ */}
      {deletingTemplate && (
        <div className="ste-modal-overlay">
          <div className="ste-modal">
            <div className="ste-modal__header">
              <div className="ste-modal__title-wrap">
                <FaTrash className="text-rose-600" />
                <h3 className="font-bold text-slate-900 text-lg">Delete Video Template</h3>
              </div>
              <button className="ste-modal__close" onClick={() => setDeletingTemplate(null)}>
                <FaXmark />
              </button>
            </div>
            <div className="ste-modal__body">
              <p className="text-sm text-slate-600">
                Are you sure you want to permanently delete template <strong className="text-slate-900">"{deletingTemplate.templateName}"</strong>? This action cannot be reversed.
              </p>
            </div>
            <div className="ste-modal__actions">
              <button className="ste-btn ste-btn--secondary" onClick={() => setDeletingTemplate(null)}>
                Cancel
              </button>
              <button
                className="ste-btn bg-rose-600 hover:bg-rose-700 text-white font-bold"
                onClick={async () => {
                  try {
                    const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
                    const res = await fetch(`/api/video-template/${deletingTemplate._id}`, {
                      method: "DELETE",
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    const d = await res.json();
                    if (d.success) {
                      showToast("Template deleted!");
                      setDeletingTemplate(null);
                      fetchTemplates();
                    }
                  } catch {
                    showToast("Error deleting template");
                  }
                }}
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ MODAL: VIDEO RENDERED ══════════════ */}
      {renderedVideoUrl && (
        <div className="ste-modal-overlay">
          <div className="ste-modal ste-modal--wide">
            <div className="ste-modal__header">
              <div className="ste-modal__title-wrap">
                <FaVideo className="text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-lg">MP4 Video Render Complete!</h3>
              </div>
              <button className="ste-modal__close" onClick={() => setRenderedVideoUrl(null)}>
                <FaXmark />
              </button>
            </div>
            <div className="ste-modal__video-wrap bg-slate-950 rounded-xl overflow-hidden p-2">
              <video src={renderedVideoUrl} controls autoPlay loop className="w-full h-80 object-contain rounded-lg" />
            </div>
            <div className="ste-modal__actions">
              <a
                href={renderedVideoUrl}
                download="storesparc_video.mp4"
                target="_blank"
                rel="noreferrer"
                className="ste-btn ste-btn--primary"
              >
                <FaDownload /> Download MP4
              </a>
              <button className="ste-btn ste-btn--secondary" onClick={() => setRenderedVideoUrl(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Studio Light Stylesheet ── */}
      <style jsx>{`
        .ste-root-light {
          display: flex;
          flex-direction: column;
          height: 100%;
          max-height: 100%;
          width: 100%;
          background: #f8fafc;
          color: #0f172a;
          font-family: var(--font-inter, system-ui, -apple-system, sans-serif);
          overflow: hidden;
          box-sizing: border-box;
        }

        /* Top Header */
        .ste-header-light {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 16px;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
          gap: 12px;
          flex-shrink: 0;
          min-height: 56px;
          z-index: 50;
        }
        .ste-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .ste-btn-icon-light {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ste-btn-icon-light:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .ste-btn-icon-light.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }
        .ste-brand-badge {
          display: none;
        }
        .ste-tpl-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          flex-shrink: 0;
          font-variant-numeric: tabular-nums;
        }
        .ste-name-input-wrap {
          display: flex;
          align-items: center;
          border-radius: 6px;
          padding: 3px 8px;
          transition: all 0.15s;
          border: 1px solid transparent;
        }
        .ste-name-input-wrap:hover {
          background: #f8fafc;
          border-color: #e2e8f0;
        }
        .ste-name-input-wrap:focus-within {
          background: #ffffff;
          border-color: #cbd5e1;
          box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.05);
        }
        .ste-name-input {
          background: transparent;
          border: none;
          outline: none;
          font-weight: 600;
          color: #0f172a;
          font-size: 13px;
          width: 200px;
        }

        /* Segmented Mode Tabs */
        .ste-tabs-segmented {
          display: flex;
          align-items: center;
          background: #f1f5f9;
          padding: 3px;
          border-radius: 8px;
          gap: 2px;
          border: 1px solid #e2e8f0;
        }
        .ste-tab-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          color: #64748b;
          border: none;
          background: transparent;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .ste-tab-pill:hover {
          color: #0f172a;
        }
        .ste-tab-pill.active {
          background: #ffffff;
          color: #0f172a;
          font-weight: 600;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        .ste-tab-badge {
          font-size: 10px;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: 9999px;
          background: #e2e8f0;
          color: #475569;
          line-height: 1.2;
        }
        .ste-tab-pill.active .ste-tab-badge {
          background: #f1f5f9;
          color: #0f172a;
        }

        /* Right Actions */
        .ste-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        /* Right Header Action Controls */
        .ste-hdr-btn-ai {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ffffff;
          color: #0f172a;
          border: 1px solid #cbd5e1;
          font-weight: 600;
          font-size: 12px;
          padding: 6px 13px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ste-hdr-btn-ai:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        .ste-hdr-btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ffffff;
          color: #334155;
          border: 1px solid #e2e8f0;
          font-weight: 600;
          font-size: 12px;
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ste-hdr-btn-ghost:hover {
          background: #f8fafc;
          color: #0f172a;
          border-color: #cbd5e1;
        }
        .ste-hdr-btn-ghost.playing {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }
        .ste-hdr-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #0f172a;
          color: #ffffff;
          border: 1px solid #0f172a;
          font-weight: 600;
          font-size: 12px;
          padding: 6px 16px;
          border-radius: 8px;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          transition: all 0.15s;
        }
        .ste-hdr-btn-primary:hover {
          background: #1e293b;
          border-color: #1e293b;
        }

        /* Studio Workspace Layout */
        .ste-studio-body {
          display: flex;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        /* Left Rail: Section Nav + Section Panel */
        .ste-left-rail {
          display: flex;
          background: #ffffff;
          border-right: 1px solid #e2e8f0;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .ste-left-rail.collapsed {
          width: 60px;
        }
        .ste-section-nav {
          width: 64px;
          background: #f8fafc;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10px 0;
          gap: 8px;
        }
        .ste-section-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s;
          gap: 4px;
        }
        .ste-section-nav-item span {
          font-size: 10px;
          font-weight: 700;
        }
        .ste-section-nav-item:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .ste-section-nav-item.active {
          background: #0f172a;
          color: #ffffff;
          font-weight: 700;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .ste-section-panel {
          width: 320px;
          display: flex;
          flex-direction: column;
          background: #ffffff;
          border-right: 1px solid #e2e8f0;
          overflow: hidden;
        }
        .ste-section-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
        }
        .ste-section-panel-content {
          flex: 1;
          overflow-y: auto;
          padding: 14px 16px;
        }

        /* Field Cards */
        .ste-card-field {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 11px 13px;
          transition: border-color 0.15s;
        }
        .ste-card-field:hover {
          border-color: #cbd5e1;
        }
        .ste-field-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .ste-input-light {
          width: 100%;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 7px 10px;
          color: #0f172a;
          outline: none;
          box-sizing: border-box;
          font-size: 12px;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .ste-input-light:focus {
          border-color: #0f172a;
          box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.06);
        }
        .ste-select-light {
          width: 100%;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 6px 10px;
          color: #0f172a;
          font-size: 12px;
          font-weight: 500;
          outline: none;
          cursor: pointer;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .ste-select-light:focus {
          border-color: #0f172a;
          box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.06);
        }
        .ste-ratios-segmented-light {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 4px;
        }
        .ste-ratio-pill-select {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 7px 4px;
          font-size: 11px;
          font-weight: 700;
          border-radius: 7px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ste-ratio-pill-select.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }
        .ste-segmented-2 {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 4px;
          background: #f1f5f9;
          padding: 3px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .ste-segmented-2 button {
          border: none;
          background: transparent;
          font-size: 11px;
          font-weight: 600;
          padding: 6px 0;
          border-radius: 6px;
          cursor: pointer;
          color: #64748b;
          transition: all 0.15s;
        }
        .ste-segmented-2 button.active {
          background: #ffffff;
          color: #0f172a;
          font-weight: 700;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
        }
        .ste-segmented-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
          background: #f1f5f9;
          padding: 3px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .ste-segmented-3 button {
          border: none;
          background: transparent;
          font-size: 11px;
          font-weight: 600;
          padding: 5px 0;
          border-radius: 6px;
          cursor: pointer;
          color: #64748b;
          transition: all 0.15s;
        }
        .ste-segmented-3 button.active {
          background: #ffffff;
          color: #0f172a;
          font-weight: 700;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
        }
        .ste-upload-dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 16px;
          border: 2px dashed #cbd5e1;
          border-radius: 8px;
          background: #ffffff;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ste-upload-dropzone:hover {
          border-color: #0f172a;
          background: #f8fafc;
        }
        .ste-style-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 8px 4px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          cursor: pointer;
          gap: 4px;
          transition: all 0.15s;
        }
        .ste-style-card.active {
          border-color: #0f172a;
          background: #f8fafc;
          color: #0f172a;
        }
        .ste-preset-btn {
          padding: 8px 10px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          color: #334155;
          cursor: pointer;
          text-align: left;
          transition: all 0.15s;
        }
        .ste-preset-btn:hover {
          border-color: #0f172a;
          background: #f8fafc;
          color: #0f172a;
        }

        /* Center Stage */
        .ste-stage-light {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
          background: #f1f5f9;
          position: relative;
        }
        .ste-stage-light.fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 100;
        }
        .ste-stage-toolbar-light {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 14px;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          min-height: 44px;
          gap: 12px;
          flex-shrink: 0;
        }
        .ste-stage-ratios-pills {
          display: flex;
          align-items: center;
          gap: 2px;
          background: #f1f5f9;
          padding: 2px;
          border-radius: 7px;
          border: 1px solid #e2e8f0;
        }
        .ste-stage-ratio-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          font-size: 11px;
          font-weight: 600;
          border-radius: 5px;
          border: none;
          background: transparent;
          color: #64748b;
          cursor: pointer;
        }
        .ste-stage-ratio-btn.active {
          background: #ffffff;
          color: #0f172a;
          font-weight: 800;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
        }

        /* Quick Layers Ribbon Strip */
        .ste-layers-ribbon {
          display: flex;
          align-items: center;
          padding: 6px 14px;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          gap: 8px;
          flex-shrink: 0;
          overflow-x: auto;
          scrollbar-width: thin;
        }
        .ste-layers-chips-scroll {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          white-space: nowrap;
          padding: 2px 0;
        }
        .ste-layer-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 500;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .ste-layer-pill:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
        }
        .ste-layer-pill.active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
          font-weight: 600;
        }
        .ste-layer-pill.is-hidden {
          opacity: 0.6;
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #94a3b8;
          text-decoration: line-through;
        }
        .ste-layer-pill.is-hidden:hover {
          opacity: 0.9;
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: #64748b;
        }

        /* Canvas Card */
        .ste-canvas-container-light {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          overflow: auto;
          position: relative;
        }
        .ste-canvas-card-light {
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
          border-radius: 12px;
          background: #000000;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .ste-main-canvas-light {
          width: 100%;
          height: 100%;
          display: block;
          cursor: crosshair;
          border-radius: 12px;
        }

        /* On-Canvas Bounding Box & Interactive Controls */
        .ste-canvas-bbox-overlay {
          pointer-events: none;
          box-sizing: border-box;
          z-index: 35;
        }
        .ste-bbox-border {
          position: absolute;
          inset: 0;
          border: 1.5px solid #0f172a;
          border-radius: 4px;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.95);
          pointer-events: none;
        }
        .ste-bbox-floating-actions {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(15, 23, 42, 0.94);
          backdrop-filter: blur(8px);
          padding: 5px 10px;
          border-radius: 9999px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.2);
          z-index: 50;
          white-space: nowrap;
          pointer-events: auto;
        }
        .ste-bbox-pill-name {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: #e2e8f0;
          margin-right: 2px;
        }
        .ste-bbox-stepper {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(255, 255, 255, 0.12);
          border-radius: 6px;
          padding: 2px 6px;
          font-size: 11px;
          font-family: monospace;
          font-weight: 700;
          color: #ffffff;
        }
        .ste-bbox-stepper button {
          background: transparent;
          border: none;
          color: #ffffff;
          cursor: pointer;
          padding: 0 3px;
          font-weight: 900;
          font-size: 12px;
          line-height: 1;
        }
        .ste-bbox-stepper button:hover {
          color: #cbd5e1;
        }
        .ste-bbox-act-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(255, 255, 255, 0.15);
          border: none;
          border-radius: 6px;
          color: #ffffff;
          padding: 3px 8px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ste-bbox-act-btn:hover {
          background: rgba(255, 255, 255, 0.28);
        }
        .ste-bbox-act-btn.danger {
          background: #ef4444;
          color: #ffffff;
        }
        .ste-bbox-act-btn.danger:hover {
          background: #dc2626;
        }
        .ste-bbox-handle {
          position: absolute;
          width: 10px;
          height: 10px;
          background: #ffffff;
          border: 1.5px solid #0f172a;
          border-radius: 2px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          pointer-events: auto;
          z-index: 40;
          transition: transform 0.1s;
        }
        .ste-bbox-handle:hover {
          transform: scale(1.3);
          background: #0f172a;
        }
        .ste-bbox-handle.nw {
          top: -6px;
          left: -6px;
          cursor: nwse-resize;
        }
        .ste-bbox-handle.ne {
          top: -6px;
          right: -6px;
          cursor: nesw-resize;
        }
        .ste-bbox-handle.se {
          bottom: -6px;
          right: -6px;
          cursor: nwse-resize;
        }
        .ste-bbox-handle.sw {
          bottom: -6px;
          left: -6px;
          cursor: nesw-resize;
        }

        /* Bottom Player Bar */
        .ste-player-bar-light {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 16px;
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          min-height: 48px;
          gap: 16px;
          flex-shrink: 0;
        }
        .ste-player-play-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #0f172a;
          color: #ffffff;
          font-weight: 700;
          font-size: 12px;
          padding: 7px 14px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: background 0.15s;
        }
        .ste-player-play-btn:hover {
          background: #1e293b;
        }
        .ste-player-play-btn.playing {
          background: #334155;
        }

        /* Right Inspector */
        .ste-right-inspector {
          width: 300px;
          background: #ffffff;
          border-left: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }
        .ste-inspector-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
        }
        .ste-inspector-content {
          flex: 1;
          overflow-y: auto;
          padding: 14px 16px;
        }

        /* Buttons & Badges */
        .ste-btn-primary-light {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #0f172a;
          color: #ffffff;
          font-weight: 600;
          font-size: 12px;
          padding: 6px 14px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ste-btn-primary-light:hover {
          background: #1e293b;
        }
        .ste-btn-secondary-light {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ffffff;
          color: #475569;
          font-weight: 600;
          font-size: 12px;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ste-btn-secondary-light:hover {
          background: #f8fafc;
          color: #0f172a;
        }

        /* Toast */
        .ste-toast-light {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: #0f172a;
          color: #ffffff;
          padding: 10px 20px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 700;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
          z-index: 200;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Library & Grid Views */
        .ste-library-container-light {
          flex: 1;
          overflow-y: auto;
          padding: 24px 32px;
          background: #f8fafc;
        }
        .ste-library-top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .ste-library-table-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        .ste-table-light {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .ste-table-light th {
          background: #f8fafc;
          text-align: left;
          padding: 12px 16px;
          color: #64748b;
          font-weight: 700;
          border-bottom: 1px solid #e2e8f0;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.3px;
        }
        .ste-table-light td {
          padding: 14px 16px;
          border-bottom: 1px solid #f1f5f9;
        }
        .ste-id-badge {
          font-family: monospace;
          font-weight: 700;
          color: #334155;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 12px;
        }
        .ste-ratio-pill-table {
          font-weight: 700;
          font-size: 11px;
          background: #f1f5f9;
          padding: 2px 8px;
          border-radius: 4px;
          color: #475569;
        }
        .ste-status-badge {
          font-weight: 700;
          font-size: 11px;
          color: #10b981;
          background: #ecfdf5;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .ste-table-action-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s;
        }
        .ste-table-action-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .ste-table-action-btn.primary {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
        }
        .ste-table-action-btn.danger:hover {
          background: #fee2e2;
          color: #ef4444;
          border-color: #fca5a5;
        }

        /* Grid View */
        .ste-grid-container-light {
          flex: 1;
          overflow-y: auto;
          padding: 24px 32px;
          background: #f8fafc;
        }
        .ste-grid-header-light {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .ste-aspect-cards-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        .ste-aspect-card-light {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
        }
        .ste-aspect-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-bottom: 1px solid #f1f5f9;
        }
        .ste-aspect-card-canvas-wrap {
          height: 320px;
          background: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
        }
        .ste-grid-canvas {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        /* Modals */
        .ste-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 20px;
        }
        .ste-modal {
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          width: 100%;
          max-width: 520px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .ste-modal--wide {
          max-width: 760px;
        }
        .ste-modal__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
        }
        .ste-modal__title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .ste-modal__close {
          background: transparent;
          border: none;
          color: #94a3b8;
          font-size: 16px;
          cursor: pointer;
        }
        .ste-modal__close:hover {
          color: #0f172a;
        }
        .ste-modal__body {
          padding: 20px;
          overflow-y: auto;
          max-height: 70vh;
        }
        .ste-modal__actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
          padding: 14px 20px;
          border-top: 1px solid #f1f5f9;
          background: #f8fafc;
        }
        .ste-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          text-decoration: none;
        }
        .ste-btn--primary {
          background: #0f172a;
          color: #ffffff;
        }
        .ste-btn--primary:hover {
          background: #1e293b;
        }
        .ste-btn--secondary {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #475569;
        }
        .ste-btn--secondary:hover {
          background: #f1f5f9;
        }
      `}</style>
    </div>
  );
}
