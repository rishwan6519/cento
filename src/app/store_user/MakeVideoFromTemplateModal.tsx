"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  FaMagic, FaFilm, FaTimes, FaPlay, FaPause, FaRedo, FaUpload,
  FaCheckCircle, FaSpinner, FaDownload, FaCalendarAlt, FaVideo,
  FaFolderOpen, FaImage, FaTag, FaSlidersH,
  FaMusic, FaCheck, FaExclamationTriangle, FaStore, FaClock
} from "react-icons/fa";
import { VideoTemplate, AspectRatio, TemplateCanvasPreview } from "./AIVideoTemplatesView";

// Preset gradients matching Studio
const PREVIEW_GRADIENTS = [
  { name: "Teal Studio", c1: "#0B2830", c2: "#051419" },
  { name: "Vibrant Coral", c1: "#F05A28", c2: "#871900" },
  { name: "Ocean Slate", c1: "#11B5BB", c2: "#06393B" },
  { name: "Royal Luxury", c1: "#4338CA", c2: "#1E1B4B" },
  { name: "Carbon Dark", c1: "#18181B", c2: "#09090B" },
];

// Sample product photos for instant 1-click testing
const SAMPLE_PRODUCTS = [
  { name: "Supermarket Basket", url: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80" },
  { name: "Smartphone", url: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80" },
  { name: "Sneakers", url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80" },
  { name: "Coffee Beans", url: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&q=80" },
];

export interface MakeVideoModalProps {
  initialTemplate: VideoTemplate | null;
  allTemplates: VideoTemplate[];
  onClose: () => void;
  onSuccess?: () => void;
  onNavigate?: (view: any, extra?: any) => void;
  onSwitchToAdVideos?: () => void;
}

export default function MakeVideoFromTemplateModal({
  initialTemplate,
  allTemplates,
  onClose,
  onSuccess,
  onNavigate,
  onSwitchToAdVideos,
}: MakeVideoModalProps) {
  // ── Selected Template State ──
  const [selectedTemplate, setSelectedTemplate] = useState<VideoTemplate | null>(
    initialTemplate || (allTemplates.length > 0 ? allTemplates[0] : null)
  );

  // ── Active Tabs in Edit Form ──
  const [activeTab, setActiveTab] = useState<"offer" | "photo" | "description" | "settings">("offer");

  // ── Aspect Ratio & Settings ──
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    (initialTemplate?.aspectRatio as AspectRatio) || (selectedTemplate?.aspectRatio as AspectRatio) || "16:9"
  );
  const [generatePack, setGeneratePack] = useState<boolean>(true);
  const initialDur = Number(
    selectedTemplate?.videoDuration ||
    (selectedTemplate as any)?.video_duration ||
    (selectedTemplate as any)?.duration ||
    10
  );
  const [duration, setDuration] = useState<number>(initialDur);
  const [musicPreset, setMusicPreset] = useState<string>("upbeat_retail");

  // ── Editable Fields: Photo & Visuals ──
  const [productImageUrl, setProductImageUrl] = useState<string>(selectedTemplate?.productUrl || "");
  const [bgType, setBgType] = useState<"gradient" | "custom">(
    selectedTemplate?.backgroundUrl ? "custom" : "gradient"
  );
  const [bgGradIndex, setBgGradIndex] = useState<number>(
    typeof (selectedTemplate as any)?.bgGradIndex === "number" ? (selectedTemplate as any).bgGradIndex : 0
  );
  const [bgImageUrl, setBgImageUrl] = useState<string>(selectedTemplate?.backgroundUrl || "");
  const [logoUrl, setLogoUrl] = useState<string>(selectedTemplate?.logoUrl || "");

  // ── Editable Fields: Offer & Texts ──
  const initLayers = (selectedTemplate?.aspectStore && selectedTemplate.aspectStore[aspectRatio]) || selectedTemplate?.layers || {};
  const [headline, setHeadline] = useState<string>(
    initLayers.headline?.text || selectedTemplate?.templateName || "MEGA WEEKEND FLASH SALE"
  );
  const [discount, setDiscount] = useState<string>(
    initLayers.discount?.text || "50% OFF"
  );
  const [validity, setValidity] = useState<string>(
    initLayers.validity?.text || "Valid Till Sunday"
  );
  const [price, setPrice] = useState<string>(initLayers.price?.text || "$19.99");
  const [oldPrice, setOldPrice] = useState<string>(initLayers.oldPrice?.text || "$39.99");
  const [cta, setCta] = useState<string>(initLayers.cta?.text || "Shop In-Store");

  // ── Editable Fields: Description ──
  const [description, setDescription] = useState<string>(
    initLayers.description?.text || selectedTemplate?.templateDescription || selectedTemplate?.description || "Special limited-time promotional discount across all store departments. Don't miss out!"
  );
  const [footer, setFooter] = useState<string>(
    initLayers.footer?.text || "*T&C Apply · StoreSparc Video"
  );

  // ── Upload & AI Helper States ──
  const [uploadingProduct, setUploadingProduct] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatingAiImg, setGeneratingAiImg] = useState(false);
  const [showAiInput, setShowAiInput] = useState(false);

  // ── Rendering & Job Progress ──
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState("");
  const [renderPercent, setRenderPercent] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [completedVideos, setCompletedVideos] = useState<any[] | null>(null);
  const [primaryVideoUrl, setPrimaryVideoUrl] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  // ── Canvas Preview Playback Controls ──
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const startRef = useRef<number | null>(null);

  // Animation Loop for Canvas
  useEffect(() => {
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

  // ── Handle Switching Template from Dropdown ──
  const handleSelectTemplate = (t: VideoTemplate) => {
    setSelectedTemplate(t);
    const targetRatio = (t.aspectRatio as AspectRatio) || "16:9";
    setAspectRatio(targetRatio);

    // Get layer definitions for this template
    const lyr = (t.aspectStore && t.aspectStore[targetRatio]) || t.layers || {};

    setHeadline(lyr.headline?.text || t.templateName || "MEGA WEEKEND FLASH SALE");
    setDiscount(lyr.discount?.text || "50% OFF");
    setValidity(lyr.validity?.text || "Valid Till Sunday");
    setPrice(lyr.price?.text || "$19.99");
    setOldPrice(lyr.oldPrice?.text || "$39.99");
    setCta(lyr.cta?.text || "Shop In-Store");
    setDescription(lyr.description?.text || t.templateDescription || t.description || "Exclusive promotional offer available at your nearest store!");
    setFooter(lyr.footer?.text || "*T&C Apply · StoreSparc Video");

    if (t.productUrl) setProductImageUrl(t.productUrl);
    if (t.backgroundUrl) {
      setBgImageUrl(t.backgroundUrl);
      setBgType("custom");
    } else {
      setBgType("gradient");
      setBgGradIndex(typeof (t as any).bgGradIndex === "number" ? (t as any).bgGradIndex : 0);
    }
    if (t.logoUrl) setLogoUrl(t.logoUrl);
    const tDur = Number(
      t.videoDuration ||
      (t as any)?.video_duration ||
      (t as any)?.duration ||
      10
    );
    setDuration(tDur);

    // Reset playback
    startRef.current = null;
    setPlaybackTime(0);
  };

  // ── Construct Dynamic Preview Template Object on the Fly ──
  // This blends the selected template's exact design & styling with live user edits!
  const dynamicPreviewTemplate = useMemo<VideoTemplate>(() => {
    if (!selectedTemplate) return {} as any;

    const base = { ...selectedTemplate };
    const currentRatio = aspectRatio;

    // Get base layers for the active aspect ratio
    const baseLayers = (base.aspectStore && base.aspectStore[currentRatio]) || base.layers || {};

    // Deep copy layers to avoid mutating base template
    const mergedLayers: Record<string, any> = {};
    for (const [k, v] of Object.entries(baseLayers)) {
      mergedLayers[k] = { ...(v as any) };
    }

    // Overlay user edits into corresponding layers
    if (mergedLayers.headline) {
      mergedLayers.headline = {
        ...mergedLayers.headline,
        text: headline,
        boxWidth: mergedLayers.headline.boxWidth || (currentRatio === "9:16" ? 82 : 46),
      };
    } else if (headline) {
      mergedLayers.headline = {
        text: headline,
        x: 0.5,
        y: currentRatio === "9:16" ? 0.16 : 0.15,
        size: currentRatio === "9:16" ? 4.2 : 5,
        boxWidth: currentRatio === "9:16" ? 82 : 46,
        fontColor: "#ffffff",
        animation: "fade_in"
      };
    }

    if (mergedLayers.discount) {
      mergedLayers.discount = { ...mergedLayers.discount, text: discount };
    } else if (discount) {
      mergedLayers.discount = {
        text: discount,
        x: currentRatio === "9:16" ? 0.8 : 0.76,
        y: currentRatio === "9:16" ? 0.30 : 0.28,
        size: currentRatio === "9:16" ? 4.5 : 5.5,
        fontColor: "#ffffff",
        bg: "#FF5722",
        badgeStyle: "circle",
        animation: "zoom_bounce"
      };
    }

    if (mergedLayers.description) {
      mergedLayers.description = {
        ...mergedLayers.description,
        text: description,
        boxWidth: mergedLayers.description.boxWidth || (currentRatio === "9:16" ? 80 : 42),
      };
    } else if (description) {
      mergedLayers.description = {
        text: description,
        x: 0.5,
        y: currentRatio === "9:16" ? 0.76 : 0.78,
        size: 2.8,
        boxWidth: currentRatio === "9:16" ? 80 : 42,
        fontColor: "#e2e8f0",
        animation: "fade_in"
      };
    }

    if (mergedLayers.validity) {
      mergedLayers.validity = { ...mergedLayers.validity, text: validity };
    }
    if (mergedLayers.price) {
      mergedLayers.price = { ...mergedLayers.price, text: price };
    }
    if (mergedLayers.oldPrice) {
      mergedLayers.oldPrice = { ...mergedLayers.oldPrice, text: oldPrice };
    }
    if (mergedLayers.cta) {
      mergedLayers.cta = { ...mergedLayers.cta, text: cta };
    }
    if (mergedLayers.footer) {
      mergedLayers.footer = { ...mergedLayers.footer, text: footer };
    }

    // Merge background
    const ratioBgs = { ...((base as any).aspectBackgrounds || {}) };
    if (bgType === "custom" && bgImageUrl) {
      ratioBgs[currentRatio] = bgImageUrl;
    }

    return {
      ...base,
      templateName: headline || base.templateName || "Offer Video",
      aspectRatio: currentRatio,
      productUrl: productImageUrl || base.productUrl,
      backgroundUrl: bgType === "custom" ? bgImageUrl : (base.backgroundUrl || undefined),
      aspectBackgrounds: ratioBgs,
      bgType: bgType === "custom" ? "image" : ((base as any).bgType || "gradient"),
      bgGradIndex: bgType === "gradient" ? bgGradIndex : ((base as any).bgGradIndex || 0),
      logoUrl: logoUrl || base.logoUrl,
      layers: mergedLayers,
      aspectStore: {
        ...(base.aspectStore || {}),
        [currentRatio]: mergedLayers,
      },
    };
  }, [
    selectedTemplate, aspectRatio, headline, discount, description, validity,
    price, oldPrice, cta, footer, productImageUrl, bgType, bgImageUrl, bgGradIndex, logoUrl
  ]);

  // Handle Local File Upload for Product Image
  const handleProductUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingProduct(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success && data.url) {
        setProductImageUrl(data.url);
      } else {
        alert(data.error || "Failed to upload file");
      }
    } catch {
      alert("Network error during upload");
    } finally {
      setUploadingProduct(false);
    }
  };

  // Handle Logo Upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success && data.url) {
        setLogoUrl(data.url);
      }
    } catch {
      // ignore
    } finally {
      setUploadingLogo(false);
    }
  };

  // Handle AI Product Image Generation helper
  const handleGenerateAiProductImage = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingAiImg(true);
    try {
      const res = await fetch("/api/external/ai-product-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: selectedTemplate?.templateId ? String(selectedTemplate.templateId) : "1",
          product_name: headline || "Retail Product",
          description: aiPrompt.trim(),
        }),
      });
      const data = await res.json();
      if (data.jobId) {
        let checks = 0;
        const pInt = setInterval(async () => {
          checks++;
          const chk = await fetch("/api/external/ai-product-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId: data.jobId }),
          });
          const cData = await chk.json();
          if (cData.status === "completed" && cData.data?.url) {
            clearInterval(pInt);
            setProductImageUrl(cData.data.url);
            setGeneratingAiImg(false);
            setShowAiInput(false);
          } else if (cData.status === "failed" || checks > 30) {
            clearInterval(pInt);
            setGeneratingAiImg(false);
          }
        }, 2000);
      }
    } catch {
      setGeneratingAiImg(false);
    }
  };

  // ─── Create & Render Video ────────────────────────────────────────────────
  const handleCreateVideo = async () => {
    if (!productImageUrl && !selectedTemplate?.productUrl) {
      alert("Please provide or upload a product photo to create your video!");
      setActiveTab("photo");
      return;
    }

    setRendering(true);
    setRenderProgress("Queuing video rendering job...");
    setRenderPercent(10);
    setRenderError(null);
    setCompletedVideos(null);
    setPrimaryVideoUrl(null);

    try {
      const userId = typeof window !== "undefined" ? localStorage.getItem("userId") || "" : "";
      const targetTplId = selectedTemplate?.templateId
        ? String(selectedTemplate.templateId)
        : (selectedTemplate?._id || "1");

      const payload = {
        template_id: targetTplId,
        userId,
        product_url: productImageUrl || selectedTemplate?.productUrl || "",
        background_url: bgType === "custom" ? bgImageUrl : "",
        headline,
        discount,
        description,
        validity,
        price,
        old_price: oldPrice,
        cta,
        footer,
        ratio: aspectRatio,
        duration,
        music_preset: musicPreset,
        batch_spawn: generatePack ? 1 : 0,
        layers: dynamicPreviewTemplate.layers,
      };

      const res = await fetch("/api/external/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to start render");
      }

      const jobId = data.job_id;
      setJobId(jobId);
      setRenderProgress("Rendering retail motion animation & audio...");
      setRenderPercent(35);

      // Poll until done
      let attempts = 0;
      const maxAttempts = 50;
      const pollTimer = setInterval(async () => {
        attempts++;
        try {
          const pollRes = await fetch(`/api/external/video/${jobId}`);
          const pollData = await pollRes.json();

          if (pollData.status === "completed") {
            clearInterval(pollTimer);
            setRenderPercent(100);
            setRenderProgress("Video successfully created and saved!");
            setRendering(false);
            setCompletedVideos(pollData.videos || [pollData]);
            setPrimaryVideoUrl(pollData.url);
            if (onSuccess) onSuccess();
          } else if (pollData.status === "failed") {
            clearInterval(pollTimer);
            setRendering(false);
            setRenderError(pollData.message || "Video rendering failed");
          } else {
            const nextPct = Math.min(95, 35 + attempts * 3);
            setRenderPercent(nextPct);
            setRenderProgress(`Applying animation effects & commercial music... (${nextPct}%)`);
          }
        } catch {
          // ignore transient poll errors
        }

        if (attempts >= maxAttempts) {
          clearInterval(pollTimer);
          setRendering(false);
          setRenderError("Rendering is taking longer than expected. Please check your Video Library in a moment.");
        }
      }, 1800);

    } catch (err: any) {
      setRendering(false);
      setRenderError(err.message || "Network error while starting render");
    }
  };

  return (
    <div className="mkv-overlay" onClick={onClose}>
      <div className="mkv-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* ── Modal Head ── */}
        <div className="mkv-head">
          <div className="mkv-head__left">
            <div className="mkv-head__icon">
              <FaMagic size={20} />
            </div>
            <div>
              <h2 className="mkv-head__title">Create Video from Template</h2>
              <p className="mkv-head__sub">
                Select template, customize photos, offer badges &amp; description, and generate commercial videos saved directly to your <strong>Template Library</strong> and <strong>Media Library</strong>.
              </p>
            </div>
          </div>
          <button className="mkv-close-btn" onClick={onClose} title="Close">
            <FaTimes size={16} />
          </button>
        </div>

        {/* ── Template Picker Bar ── */}
        <div className="mkv-tpl-picker">
          <span className="mkv-tpl-picker__label">
            <FaStore size={13} style={{ color: "#F05A28" }} />
            Active Template:
          </span>
          <select
            className="mkv-tpl-picker__select"
            value={selectedTemplate?._id || ""}
            onChange={(e) => {
              const match = allTemplates.find((t) => t._id === e.target.value);
              if (match) handleSelectTemplate(match);
            }}
          >
            {allTemplates.map((t, idx) => (
              <option key={t._id} value={t._id}>
                Template #{t.templateId || idx + 1}: {t.templateName} ({t.aspectRatio || "9:16"})
              </option>
            ))}
          </select>
          {selectedTemplate && (
            <span className="mkv-tpl-badge">
              ID #{selectedTemplate.templateId || "1"} · {selectedTemplate.aspectRatio || "9:16"}
            </span>
          )}
        </div>

        {/* ── Main Two-Column Studio ── */}
        <div className="mkv-body">
          
          {/* ════════════ LEFT COLUMN: EDITABLE FIELDS ════════════ */}
          <div className="mkv-editor-pane">
            
            {/* Tab navigation */}
            <div className="mkv-tabs">
              <button
                type="button"
                className={`mkv-tab-btn ${activeTab === "offer" ? "active" : ""}`}
                onClick={() => setActiveTab("offer")}
              >
                <FaTag size={12} /> Offer &amp; Deals
              </button>
              <button
                type="button"
                className={`mkv-tab-btn ${activeTab === "photo" ? "active" : ""}`}
                onClick={() => setActiveTab("photo")}
              >
                <FaImage size={12} /> Photo &amp; Style
              </button>
              <button
                type="button"
                className={`mkv-tab-btn ${activeTab === "description" ? "active" : ""}`}
                onClick={() => setActiveTab("description")}
              >
                <FaFilm size={12} /> Description
              </button>
              <button
                type="button"
                className={`mkv-tab-btn ${activeTab === "settings" ? "active" : ""}`}
                onClick={() => setActiveTab("settings")}
              >
                <FaSlidersH size={12} /> Video Output
              </button>
            </div>

            {/* TAB 1: OFFER & DEALS */}
            {activeTab === "offer" && (
              <div className="mkv-fields-group">
                <div className="mkv-field">
                  <label className="mkv-label">
                    Offer Headline / Product Title <span className="mkv-req">*</span>
                  </label>
                  <input
                    type="text"
                    className="mkv-input"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. MEGA WEEKEND FLASH SALE"
                  />
                  <span className="mkv-hint">Displays prominently with motion intro on this template</span>
                </div>

                <div className="mkv-grid-2">
                  <div className="mkv-field">
                    <label className="mkv-label">Discount / Offer Badge</label>
                    <input
                      type="text"
                      className="mkv-input"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="e.g. 50% OFF or BUY 1 GET 1"
                    />
                  </div>
                  <div className="mkv-field">
                    <label className="mkv-label">Offer Validity</label>
                    <input
                      type="text"
                      className="mkv-input"
                      value={validity}
                      onChange={(e) => setValidity(e.target.value)}
                      placeholder="e.g. Valid Till Sunday"
                    />
                  </div>
                </div>

                <div className="mkv-grid-2">
                  <div className="mkv-field">
                    <label className="mkv-label">Special Offer Price</label>
                    <input
                      type="text"
                      className="mkv-input"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="e.g. $19.99 or ₹499"
                    />
                  </div>
                  <div className="mkv-field">
                    <label className="mkv-label">Original / Strikethrough Price</label>
                    <input
                      type="text"
                      className="mkv-input"
                      value={oldPrice}
                      onChange={(e) => setOldPrice(e.target.value)}
                      placeholder="e.g. $39.99 or ₹999"
                    />
                  </div>
                </div>

                <div className="mkv-field">
                  <label className="mkv-label">Call to Action (CTA)</label>
                  <input
                    type="text"
                    className="mkv-input"
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    placeholder="e.g. Shop Now In-Store"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: PHOTO & STYLE */}
            {activeTab === "photo" && (
              <div className="mkv-fields-group">
                
                {/* Product Image */}
                <div className="mkv-field">
                  <label className="mkv-label">
                    Product Photo <span className="mkv-req">*</span>
                  </label>
                  
                  <div className="mkv-upload-row">
                    <input
                      type="text"
                      className="mkv-input"
                      value={productImageUrl}
                      onChange={(e) => setProductImageUrl(e.target.value)}
                      placeholder="Enter Image URL or upload from device"
                    />
                    <label className="mkv-upload-btn">
                      <FaUpload size={12} />
                      <span>{uploadingProduct ? "Uploading…" : "Browse File"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleProductUpload}
                        disabled={uploadingProduct}
                      />
                    </label>
                  </div>

                  {/* Sample presets */}
                  <div className="mkv-presets-row">
                    <span className="mkv-presets-label">Click sample photo:</span>
                    {SAMPLE_PRODUCTS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        className="mkv-sample-chip"
                        onClick={() => setProductImageUrl(p.url)}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>

                  {/* AI Generate Assistant */}
                  <div style={{ marginTop: 8 }}>
                    {!showAiInput ? (
                      <button
                        type="button"
                        className="mkv-ai-toggle-btn"
                        onClick={() => setShowAiInput(true)}
                      >
                        <FaMagic size={11} /> Generate Product Photo with AI
                      </button>
                    ) : (
                      <div className="mkv-ai-box">
                        <input
                          type="text"
                          className="mkv-input"
                          placeholder="Describe product photo: e.g. Gourmet organic apples on rustic wood"
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                        />
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                          <button
                            type="button"
                            className="mkv-btn-sm mkv-btn-sm--primary"
                            onClick={handleGenerateAiProductImage}
                            disabled={generatingAiImg}
                          >
                            {generatingAiImg ? <FaSpinner className="mkv-spin" size={12} /> : <FaMagic size={12} />}
                            {generatingAiImg ? "Generating with AI…" : "Generate Photo"}
                          </button>
                          <button
                            type="button"
                            className="mkv-btn-sm"
                            onClick={() => setShowAiInput(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Background Theme */}
                <div className="mkv-field" style={{ marginTop: 12 }}>
                  <label className="mkv-label">Background Style</label>
                  <div className="mkv-bg-selector">
                    {PREVIEW_GRADIENTS.map((g, idx) => (
                      <div
                        key={g.name}
                        className={`mkv-bg-swatch ${bgType === "gradient" && bgGradIndex === idx ? "selected" : ""}`}
                        style={{ background: `linear-gradient(135deg, ${g.c1}, ${g.c2})` }}
                        onClick={() => {
                          setBgType("gradient");
                          setBgGradIndex(idx);
                        }}
                        title={g.name}
                      >
                        {bgType === "gradient" && bgGradIndex === idx && <FaCheck size={10} color="#fff" />}
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <input
                      type="text"
                      className="mkv-input"
                      placeholder="Or enter custom background image URL (Optional)"
                      value={bgImageUrl}
                      onChange={(e) => {
                        setBgImageUrl(e.target.value);
                        if (e.target.value) setBgType("custom");
                      }}
                    />
                  </div>
                </div>

                {/* Optional Store Logo */}
                <div className="mkv-field" style={{ marginTop: 12 }}>
                  <label className="mkv-label">Store Logo (Optional watermark)</label>
                  <div className="mkv-upload-row">
                    <input
                      type="text"
                      className="mkv-input"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="Logo URL or upload PNG/JPG"
                    />
                    <label className="mkv-upload-btn">
                      <FaUpload size={12} />
                      <span>{uploadingLogo ? "Uploading…" : "Upload"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                      />
                    </label>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: DESCRIPTION */}
            {activeTab === "description" && (
              <div className="mkv-fields-group">
                <div className="mkv-field">
                  <label className="mkv-label">Offer Description / Subtitle</label>
                  <textarea
                    rows={4}
                    className="mkv-input mkv-textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter short description about this promotional offer..."
                  />
                  <span className="mkv-hint">Featured dynamically under the product visual</span>
                </div>

                <div className="mkv-field">
                  <label className="mkv-label">Terms &amp; Disclaimer Footer</label>
                  <input
                    type="text"
                    className="mkv-input"
                    value={footer}
                    onChange={(e) => setFooter(e.target.value)}
                    placeholder="e.g. *T&C Apply · StoreSparc Video"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: VIDEO OUTPUT SETTINGS */}
            {activeTab === "settings" && (
              <div className="mkv-fields-group">
                <div className="mkv-field">
                  <label className="mkv-label">Primary Aspect Ratio</label>
                  <div className="mkv-ratio-pills">
                    {(["16:9", "9:16", "1:1", "4:5"] as AspectRatio[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={`mkv-ratio-pill ${aspectRatio === r ? "active" : ""}`}
                        onClick={() => setAspectRatio(r)}
                      >
                        {r === "16:9" && "16:9 Landscape (TV / Screens)"}
                        {r === "9:16" && "9:16 Portrait (Reels / Stories)"}
                        {r === "1:1" && "1:1 Square (Feed)"}
                        {r === "4:5" && "4:5 Social Feed"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mkv-field">
                  <label className="mkv-checkbox-row">
                    <input
                      type="checkbox"
                      checked={generatePack}
                      onChange={(e) => setGeneratePack(e.target.checked)}
                    />
                    <span>
                      <strong>Generate All 4 Screen Formats (Multi-Screen Pack)</strong>
                      <span className="mkv-hint" style={{ display: "block" }}>
                        Renders 16:9, 9:16, 1:1, and 4:5 automatically in parallel so your offer is ready for any display or social channel.
                      </span>
                    </span>
                  </label>
                </div>

                <div className="mkv-grid-2">
                  <div className="mkv-field">
                    <label className="mkv-label">
                      <FaMusic size={11} style={{ marginRight: 4 }} />
                      Background Music
                    </label>
                    <select
                      className="mkv-input"
                      value={musicPreset}
                      onChange={(e) => setMusicPreset(e.target.value)}
                    >
                      <option value="upbeat_retail">🔔 Bright Retail Chime (Default Pure Tune)</option>
                      <option value="ambient_piano">🎹 Soft Ambient Piano</option>
                      <option value="energetic_sale">🛍️ Retail Marimba Beat</option>
                      <option value="luxury_minimal">✨ Luxury Ambient Lounge</option>
                      <option value="modern_store">🎸 Gentle Acoustic Melody</option>
                      <option value="electric_pulse">⚡ Modern Tech Pulse</option>
                      <option value="none">🚫 No Audio (Mute)</option>
                    </select>
                  </div>

                  <div className="mkv-field">
                    <label className="mkv-label">Duration</label>
                    <select
                      className="mkv-input"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                    >
                      <option value={5}>5 Seconds (Quick Clip)</option>
                      <option value={8}>8 Seconds (Dynamic Ad)</option>
                      <option value={10}>10 Seconds (Standard Retail)</option>
                      <option value={15}>15 Seconds (Extended Story)</option>
                      <option value={30}>30 Seconds (In-Store Loop)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions for Editor Pane */}
            <div className="mkv-actions-bar">
              <button
                type="button"
                className="mkv-btn mkv-btn--render"
                onClick={handleCreateVideo}
                disabled={rendering}
              >
                {rendering ? (
                  <>
                    <FaSpinner className="mkv-spin" size={15} />
                    <span>Rendering Video ({renderPercent}%)…</span>
                  </>
                ) : (
                  <>
                    <FaMagic size={15} />
                    <span>Create Video Now</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* ════════════ RIGHT COLUMN: DYNAMIC REAL TEMPLATE PREVIEW & RESULTS ════════════ */}
          <div className="mkv-preview-pane">
            <div className="mkv-preview-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="mkv-live-tag">LIVE DYNAMIC PREVIEW</span>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                  Template #{selectedTemplate?.templateId || 1}: {selectedTemplate?.templateName || "Template"}
                </span>
              </div>
              <div className="mkv-ratio-mini-tabs">
                {(["16:9", "9:16", "1:1", "4:5"] as AspectRatio[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`mkv-mini-ratio ${aspectRatio === r ? "active" : ""}`}
                    onClick={() => {
                      setAspectRatio(r);
                      // Update layers for this aspect ratio if defined
                      if (selectedTemplate?.aspectStore && selectedTemplate.aspectStore[r]) {
                        const rLyr = selectedTemplate.aspectStore[r];
                        if (rLyr.headline?.text) setHeadline(rLyr.headline.text);
                        if (rLyr.discount?.text) setDiscount(rLyr.discount.text);
                        if (rLyr.description?.text) setDescription(rLyr.description.text);
                      }
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Canvas / Video Stage with Adaptive Container Aspect Ratio */}
            <div
              className="mkv-canvas-stage-wrap"
              style={{
                aspectRatio:
                  aspectRatio === "9:16"
                    ? "9 / 16"
                    : aspectRatio === "1:1"
                    ? "1 / 1"
                    : aspectRatio === "4:5"
                    ? "4 / 5"
                    : "16 / 9",
                maxHeight: aspectRatio === "9:16" ? "460px" : "360px",
              }}
            >
              {primaryVideoUrl ? (
                /* Completed Rendered MP4 Video Player */
                <video
                  src={primaryVideoUrl}
                  controls
                  autoPlay
                  loop
                  className="mkv-video-player"
                />
              ) : (
                /* Real Dynamic Template Canvas Preview using exported engine */
                <TemplateCanvasPreview
                  template={dynamicPreviewTemplate}
                  overrideRatio={aspectRatio}
                  playbackTime={playbackTime}
                  isPlaying={isPlaying}
                  className="mkv-canvas"
                />
              )}
            </div>

            {/* Playback Controls Bar */}
            {!primaryVideoUrl && (
              <div className="mkv-playback-bar">
                <button
                  type="button"
                  className="mkv-play-btn"
                  onClick={() => setIsPlaying(!isPlaying)}
                  title={isPlaying ? "Pause Animation" : "Play Animation"}
                >
                  {isPlaying ? <FaPause size={10} /> : <FaPlay size={10} />}
                  <span>{isPlaying ? "Pause" : "Play"}</span>
                </button>
                <button
                  type="button"
                  className="mkv-play-btn"
                  onClick={() => {
                    startRef.current = null;
                    setPlaybackTime(0);
                    setIsPlaying(true);
                  }}
                  title="Replay animation"
                >
                  <FaRedo size={10} />
                  <span>Replay</span>
                </button>

                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, margin: "0 8px" }}>
                  <span style={{ fontSize: "0.72rem", color: "#11B5BB", fontFamily: "monospace", minWidth: "28px" }}>
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
                    style={{ flex: 1, accentColor: "#F05A28", cursor: "pointer", height: "4px" }}
                  />
                  <span style={{ fontSize: "0.72rem", color: "#64748b", fontFamily: "monospace" }}>
                    {duration}s
                  </span>
                </div>

                <span style={{ fontSize: "0.72rem", color: isPlaying ? "#22c55e" : "#64748b", fontWeight: 700 }}>
                  {isPlaying ? "Live Motion" : "Paused"}
                </span>
              </div>
            )}

            {/* Render Progress Overlay */}
            {rendering && (
              <div className="mkv-rendering-box">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0B2830" }}>
                    {renderProgress}
                  </span>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#F05A28" }}>
                    {renderPercent}%
                  </span>
                </div>
                <div className="mkv-progress-track">
                  <div
                    className="mkv-progress-fill"
                    style={{ width: `${renderPercent}%` }}
                  />
                </div>
                <p style={{ fontSize: "0.74rem", color: "#64748b", marginTop: 6 }}>
                  Rendering motion frames with retail typography &amp; background music. Saving to library upon completion...
                </p>
              </div>
            )}

            {/* Render Error */}
            {renderError && (
              <div className="mkv-error-box">
                <FaExclamationTriangle size={16} />
                <span>{renderError}</span>
              </div>
            )}

            {/* Completed Success Box with Quick Action Buttons */}
            {primaryVideoUrl && (
              <div className="mkv-success-card">
                <div className="mkv-success-card__badge">
                  <FaCheckCircle size={16} color="#16A34A" />
                  <span>Video Created &amp; Saved Successfully!</span>
                </div>

                <div className="mkv-saved-badges">
                  <span className="mkv-saved-pill">
                    <FaVideo size={11} /> Saved to Video Template Library
                  </span>
                  <span className="mkv-saved-pill">
                    <FaFolderOpen size={11} /> Saved to Media Library
                  </span>
                </div>

                <div className="mkv-results-actions">
                  <a
                    href={primaryVideoUrl}
                    download="storesparc_promo_video.mp4"
                    className="mkv-btn mkv-btn--download"
                  >
                    <FaDownload size={13} /> Download MP4
                  </a>

                  {onNavigate && (
                    <button
                      type="button"
                      className="mkv-btn mkv-btn--social"
                      onClick={() => {
                        onClose();
                        onNavigate("socialScheduler", { templateId: selectedTemplate?._id });
                      }}
                    >
                      <FaCalendarAlt size={13} /> Schedule to Social Media
                    </button>
                  )}

                  {onSwitchToAdVideos && (
                    <button
                      type="button"
                      className="mkv-btn mkv-btn--ad-library"
                      onClick={() => {
                        onClose();
                        onSwitchToAdVideos();
                      }}
                    >
                      <FaVideo size={13} /> View in Ad Videos
                    </button>
                  )}

                  {onNavigate && (
                    <button
                      type="button"
                      className="mkv-btn mkv-btn--media"
                      onClick={() => {
                        onClose();
                        onNavigate("mediaLibrary");
                      }}
                    >
                      <FaFolderOpen size={13} /> Open Media Library
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      <style jsx>{`
        .mkv-overlay {
          position: fixed;
          inset: 0;
          background: rgba(11, 40, 48, 0.75);
          backdrop-filter: blur(6px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .mkv-modal {
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35);
          width: 100%;
          max-width: 1150px;
          max-height: 94vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: mkvPop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes mkvPop {
          0% { transform: scale(0.96); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .mkv-head {
          padding: 18px 24px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #F8FAFC;
        }
        .mkv-head__left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .mkv-head__icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, #F05A28, #FF8A65);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(240, 90, 40, 0.3);
          flex-shrink: 0;
        }
        .mkv-head__title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
        }
        .mkv-head__sub {
          font-size: 0.8rem;
          color: #64748B;
          margin: 2px 0 0;
          max-width: 800px;
        }
        .mkv-close-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
        }
        .mkv-close-btn:hover {
          background: #fee2e2;
          color: #ef4444;
          border-color: #fca5a5;
        }
        .mkv-tpl-picker {
          padding: 10px 24px;
          background: #F1F5F9;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.84rem;
        }
        .mkv-tpl-picker__label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          color: #334155;
        }
        .mkv-tpl-picker__select {
          flex: 1;
          max-width: 450px;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-weight: 600;
          font-size: 0.84rem;
          color: #0F172A;
        }
        .mkv-tpl-badge {
          background: rgba(240, 90, 40, 0.12);
          color: #F05A28;
          font-weight: 800;
          font-size: 0.76rem;
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid rgba(240, 90, 40, 0.25);
        }
        .mkv-body {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 20px;
          padding: 20px 24px;
          overflow-y: auto;
          flex: 1;
        }
        @media (max-width: 900px) {
          .mkv-body {
            grid-template-columns: 1fr;
          }
        }
        .mkv-editor-pane {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .mkv-tabs {
          display: flex;
          gap: 6px;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 8px;
        }
        .mkv-tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          border: none;
          background: #F1F5F9;
          color: #64748B;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        .mkv-tab-btn:hover {
          background: #E2E8F0;
          color: #0F172A;
        }
        .mkv-tab-btn.active {
          background: #0B2830;
          color: #ffffff;
        }
        .mkv-fields-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #F8FAFC;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
        }
        .mkv-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .mkv-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: #334155;
        }
        .mkv-req {
          color: #ef4444;
        }
        .mkv-input {
          padding: 9px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 0.86rem;
          color: #0F172A;
          outline: none;
          transition: border-color 0.15s;
        }
        .mkv-input:focus {
          border-color: #F05A28;
          box-shadow: 0 0 0 3px rgba(240, 90, 40, 0.15);
        }
        .mkv-textarea {
          resize: vertical;
          font-family: inherit;
        }
        .mkv-hint {
          font-size: 0.72rem;
          color: #94a3b8;
        }
        .mkv-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .mkv-upload-row {
          display: flex;
          gap: 8px;
        }
        .mkv-upload-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          background: #0B2830;
          color: #ffffff;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: opacity 0.15s;
        }
        .mkv-upload-btn:hover {
          opacity: 0.9;
        }
        .mkv-presets-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 6px;
        }
        .mkv-presets-label {
          font-size: 0.72rem;
          color: #64748b;
          font-weight: 600;
        }
        .mkv-sample-chip {
          font-size: 0.72rem;
          padding: 3px 8px;
          border-radius: 6px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
          cursor: pointer;
          transition: all 0.12s;
        }
        .mkv-sample-chip:hover {
          border-color: #F05A28;
          color: #F05A28;
        }
        .mkv-ai-toggle-btn {
          background: none;
          border: none;
          color: #F05A28;
          font-size: 0.76rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 0;
        }
        .mkv-ai-toggle-btn:hover {
          text-decoration: underline;
        }
        .mkv-ai-box {
          background: #ffffff;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid #fed7aa;
        }
        .mkv-bg-selector {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }
        .mkv-bg-swatch {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid transparent;
          transition: transform 0.15s;
        }
        .mkv-bg-swatch:hover {
          transform: scale(1.1);
        }
        .mkv-bg-swatch.selected {
          border-color: #ffffff;
          box-shadow: 0 0 0 2px #F05A28;
        }
        .mkv-ratio-pills {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }
        .mkv-ratio-pill {
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          font-size: 0.78rem;
          font-weight: 700;
          color: #334155;
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
        }
        .mkv-ratio-pill:hover {
          border-color: #F05A28;
        }
        .mkv-ratio-pill.active {
          background: #F05A28;
          border-color: #F05A28;
          color: #ffffff;
        }
        .mkv-checkbox-row {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          font-size: 0.82rem;
          color: #334155;
          cursor: pointer;
        }
        .mkv-checkbox-row input {
          margin-top: 3px;
        }
        .mkv-actions-bar {
          margin-top: auto;
          padding-top: 10px;
        }
        .mkv-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: 10px;
          font-size: 0.92rem;
          font-weight: 800;
          cursor: pointer;
          border: none;
          transition: all 0.15s;
          width: 100%;
        }
        .mkv-btn--render {
          background: linear-gradient(135deg, #F05A28, #E04815);
          color: #ffffff;
          box-shadow: 0 6px 16px rgba(240, 90, 40, 0.35);
        }
        .mkv-btn--render:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(240, 90, 40, 0.45);
        }
        .mkv-btn--render:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .mkv-btn-sm {
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 0.76rem;
          font-weight: 700;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .mkv-btn-sm--primary {
          background: #0B2830;
          color: #ffffff;
          border-color: #0B2830;
        }

        /* ── Preview Pane ── */
        .mkv-preview-pane {
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: #0F172A;
          border-radius: 14px;
          padding: 14px;
          align-items: center;
        }
        .mkv-preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          width: 100%;
        }
        .mkv-live-tag {
          background: rgba(16, 185, 129, 0.2);
          color: #10B981;
          font-size: 0.68rem;
          font-weight: 900;
          letter-spacing: 0.05em;
          padding: 3px 8px;
          border-radius: 4px;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .mkv-ratio-mini-tabs {
          display: flex;
          gap: 4px;
        }
        .mkv-mini-ratio {
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 0.72rem;
          font-weight: 700;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: transparent;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
        }
        .mkv-mini-ratio.active {
          background: #F05A28;
          border-color: #F05A28;
          color: #ffffff;
        }
        .mkv-canvas-stage-wrap {
          width: 100%;
          background: #000000;
          border-radius: 10px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          margin: 0 auto;
        }
        .mkv-canvas {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }
        .mkv-video-player {
          width: 100%;
          height: 100%;
          object-fit: contain;
          background: #000;
        }
        .mkv-playback-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 6px 10px;
        }
        .mkv-play-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(255, 255, 255, 0.12);
          border: none;
          color: #fff;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.12s;
        }
        .mkv-play-btn:hover {
          background: #F05A28;
        }
        .mkv-rendering-box {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 10px;
          padding: 12px;
          margin-top: 4px;
          width: 100%;
        }
        .mkv-progress-track {
          width: 100%;
          height: 8px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }
        .mkv-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #F05A28, #11B5BB);
          transition: width 0.3s ease;
        }
        .mkv-error-box {
          background: #fee2e2;
          color: #b91c1c;
          border: 1px solid #f87171;
          border-radius: 8px;
          padding: 10px;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
        }
        .mkv-success-card {
          background: #ffffff;
          border-radius: 10px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }
        .mkv-success-card__badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          font-weight: 800;
          color: #166534;
        }
        .mkv-saved-badges {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .mkv-saved-pill {
          background: #F0FDF4;
          border: 1px solid #BBF7D0;
          color: #15803D;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .mkv-results-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          margin-top: 4px;
        }
        .mkv-btn--download {
          background: #0B2830;
          color: #ffffff;
          font-size: 0.78rem;
          padding: 8px 10px;
          text-decoration: none;
        }
        .mkv-btn--social {
          background: #1877F2;
          color: #ffffff;
          font-size: 0.78rem;
          padding: 8px 10px;
        }
        .mkv-btn--ad-library {
          background: #F05A28;
          color: #ffffff;
          font-size: 0.78rem;
          padding: 8px 10px;
        }
        .mkv-btn--media {
          background: #0D9488;
          color: #ffffff;
          font-size: 0.78rem;
          padding: 8px 10px;
        }
        .mkv-spin {
          animation: mkvSpin 1s linear infinite;
        }
        @keyframes mkvSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
