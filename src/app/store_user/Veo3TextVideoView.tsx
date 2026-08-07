"use client";

import React, { useState, useRef, useEffect } from "react";
import { FaPlay, FaCheckCircle, FaExternalLinkAlt, FaRedo, FaSpinner, FaCopy, FaHashtag } from "react-icons/fa";

// ─── Types ────────────────────────────────────────────────────────────────────
type AspectRatio = "16:9" | "9:16" | "1:1";
type JobStatus = "idle" | "submitting" | "processing" | "done" | "error";

interface JobResult {
  videoUrl: string;
  mediaId?: string;
  enhancedPrompt?: string;
  voiceoverScript?: string;
  socialMediaHeading?: string;
  socialMediaCaption?: string;
  hashTags?: string[];
  aspectRatio?: string;
}

const ASPECT_OPTIONS: { value: AspectRatio; label: string; icon: string }[] = [
  { value: "16:9", label: "16:9 Landscape", icon: "⬛" },
  { value: "9:16", label: "9:16 Portrait", icon: "▮" },
  { value: "1:1", label: "1:1 Square", icon: "■" },
];

// ─── Google colour dots ────────────────────────────────────────────────────────
const GDot: React.FC<{ color: string; size?: number }> = ({ color, size = 10 }) => (
  <span style={{ display: "inline-block", width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0 }} />
);

// ─── Animated dots loader ─────────────────────────────────────────────────────
const Dots: React.FC<{ label: string }> = ({ label }) => {
  const [d, setD] = useState(".");
  useEffect(() => {
    const iv = setInterval(() => setD((p) => (p.length >= 3 ? "." : p + ".")), 500);
    return () => clearInterval(iv);
  }, []);
  return <span style={{ fontWeight: 700, color: "#4285F4" }}>{label}<span style={{ display: "inline-block", width: 22 }}>{d}</span></span>;
};

// ─── Spinner ──────────────────────────────────────────────────────────────────
const Spin: React.FC = () => (
  <div style={{
    width: 56, height: 56,
    border: "4px solid #E8F0FE",
    borderTop: "4px solid #4285F4",
    borderRadius: "50%",
    animation: "gf-spin 0.9s linear infinite",
  }} />
);

// ─── Copy util ────────────────────────────────────────────────────────────────
const copyText = (t: string) => navigator.clipboard?.writeText(t).catch(() => {});

// ─── Main Component ───────────────────────────────────────────────────────────
const Veo3TextVideoView: React.FC = () => {
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") || "" : "";

  const [text, setText] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [offerId, setOfferId] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [imageName, setImageName] = useState("");
  const [status, setStatus] = useState<JobStatus>("idle");
  const [jobId, setJobId] = useState("");
  const [pollCount, setPollCount] = useState(0);
  const [result, setResult] = useState<JobResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedField, setCopiedField] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setImageBase64(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageBase64("");
    setImageName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Stop polling on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const stopPolling = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  // Poll /api/external/google-flow/get-video every 20s
  const startPolling = (jId: string) => {
    setPollCount(0);
    stopPolling();
    pollRef.current = setInterval(async () => {
      setPollCount((p) => p + 1);
      try {
        const res = await fetch("/api/external/google-flow/get-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: jId }),
        });
        const data = await res.json();

        if (data.status === "completed" && data.videoUrl) {
          stopPolling();
          setResult({
            videoUrl: data.videoUrl,
            mediaId: data.mediaId,
            enhancedPrompt: data.enhancedPrompt,
            voiceoverScript: data.voiceoverScript,
            socialMediaHeading: data.socialMediaHeading,
            socialMediaCaption: data.socialMediaCaption,
            hashTags: data.hashTags,
            aspectRatio: data.aspectRatio,
          });
          setStatus("done");
        } else if (data.status === "failed") {
          stopPolling();
          setErrorMsg(data.message || "Veo 3.1 generation failed.");
          setStatus("error");
        }
        // else still processing — continue polling
      } catch (err) {
        console.warn("[Veo3TextVideoView] Poll error:", err);
      }
    }, 20000); // poll every 20 seconds
  };

  const handleSubmit = async () => {
    if (!text.trim() || !userId) return;
    setStatus("submitting");
    setErrorMsg("");
    setResult(null);
    setJobId("");
    setPollCount(0);

    try {
      const res = await fetch("/api/external/google-flow/create-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          text: text.trim(),
          aspectRatio,
          duration: 8,
          ...(offerId.trim() ? { offerId: offerId.trim() } : {}),
          ...(imageBase64 ? { imageBase64 } : {}),
        }),
      });
      const data = await res.json();

      if (!data.success || !data.jobId) {
        throw new Error(data.message || "Failed to start video generation");
      }

      setJobId(data.jobId);
      setStatus("processing");
      startPolling(data.jobId);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit generation request.");
      setStatus("error");
    }
  };

  const handleReset = () => {
    stopPolling();
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
    setJobId("");
    setPollCount(0);
    setText("");
    setOfferId("");
    clearImage();
  };

  const handleCopy = (val: string, field: string) => {
    copyText(val);
    setCopiedField(field);
    setTimeout(() => setCopiedField(""), 2000);
  };

  const isIdle = status === "idle";
  const isSubmitting = status === "submitting";
  const isProcessing = status === "processing";
  const isDone = status === "done";
  const isError = status === "error";
  const isBusy = isSubmitting || isProcessing;

  return (
    <>
      <style>{`
        @keyframes gf-spin { to { transform: rotate(360deg); } }
        @keyframes gf-fadein { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @keyframes gf-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
        @keyframes gf-shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .gf-animate { animation: gf-fadein 0.35s ease forwards; }
        .gf-card { background: #fff; border-radius: 20px; padding: 28px 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); border: 1px solid #E8EAED; }
        .gf-btn-primary {
          background: linear-gradient(135deg, #4285F4 0%, #0F9D58 50%, #F4B400 75%, #DB4437 100%);
          background-size: 200% 200%;
          animation: gf-shimmer 3s linear infinite;
          color: #fff; border: none; border-radius: 12px;
          padding: 14px 32px; font-size: 1rem; font-weight: 700;
          cursor: pointer; display: flex; align-items: center; gap: 10px;
          font-family: "Inter", sans-serif; transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 4px 18px rgba(66,133,244,0.35);
        }
        .gf-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(66,133,244,0.45); }
        .gf-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
        .gf-btn-ghost {
          background: none; border: 1.5px solid #DADCE0; color: #5F6368;
          border-radius: 10px; padding: 10px 20px; font-size: 0.84rem;
          font-weight: 600; cursor: pointer; font-family: "Inter", sans-serif;
          display: flex; align-items: center; gap: 7px; transition: all 0.15s;
        }
        .gf-btn-ghost:hover { border-color: #4285F4; color: #4285F4; }
        .gf-ar-pill {
          padding: 10px 18px; border-radius: 24px; border: 2px solid #DADCE0;
          background: #F8F9FA; cursor: pointer; font-size: 0.85rem; font-weight: 600;
          color: #5F6368; transition: all 0.15s; font-family: "Inter", sans-serif;
          display: flex; align-items: center; gap: 6px;
        }
        .gf-ar-pill:hover { border-color: #4285F4; color: #4285F4; }
        .gf-ar-pill--active {
          background: linear-gradient(135deg, #E8F0FE, #d2e3fc);
          border-color: #4285F4; color: #1A73E8; font-weight: 700;
        }
        .gf-textarea {
          width: 100%; resize: vertical; background: #F8F9FA;
          border: 2px solid #DADCE0; border-radius: 14px;
          padding: 14px 18px; font-size: 0.95rem; color: #202124;
          font-family: "Inter", sans-serif; line-height: 1.7;
          box-sizing: border-box; outline: none; transition: border-color 0.15s;
        }
        .gf-textarea:focus { border-color: #4285F4; box-shadow: 0 0 0 3px rgba(66,133,244,0.12); }
        .gf-input {
          width: 100%; background: #F8F9FA; border: 2px solid #DADCE0;
          border-radius: 10px; padding: 11px 16px; font-size: 0.88rem;
          color: #202124; font-family: "Inter", sans-serif; outline: none; transition: border-color 0.15s;
        }
        .gf-input:focus { border-color: #4285F4; box-shadow: 0 0 0 3px rgba(66,133,244,0.12); }
        .gf-meta-tag {
          display: inline-flex; align-items: center; gap: 5px;
          background: #E8F0FE; color: #1A73E8; border-radius: 20px;
          padding: 4px 12px; font-size: 0.78rem; font-weight: 600;
        }
        .gf-copy-btn {
          background: none; border: none; cursor: pointer; color: #9AA0A6;
          display: flex; align-items: center; gap: 4px; font-size: 0.75rem;
          font-weight: 600; font-family: "Inter", sans-serif; padding: 4px 8px;
          border-radius: 6px; transition: all 0.15s;
        }
        .gf-copy-btn:hover { color: #4285F4; background: #E8F0FE; }
        .gf-progress-bar {
          height: 6px; background: #E8EAED; border-radius: 99px; overflow: hidden; margin-top: 16px;
        }
        .gf-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #4285F4, #0F9D58, #F4B400, #DB4437, #4285F4);
          background-size: 400% 100%;
          border-radius: 99px;
          animation: gf-shimmer 2s linear infinite;
        }
        .gf-stat-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9AA0A6; margin: 0; }
        .gf-stat-value { font-size: 0.9rem; font-weight: 700; color: #202124; margin: 2px 0 0; }
        .gf-video-el { width: 100%; border-radius: 14px; display: block; background: #000; max-height: 480px; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 24, fontFamily: "Inter, sans-serif", maxWidth: 900, margin: "0 auto" }}>

        {/* ── Hero Header ────────────────────────────────────────────────── */}
        <div className="gf-animate" style={{
          background: "linear-gradient(135deg, #0D1F3C 0%, #1A237E 40%, #0F4C3A 100%)",
          borderRadius: 24, padding: "40px 40px 36px", position: "relative", overflow: "hidden",
        }}>
          {/* Background decoration */}
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(66,133,244,0.15)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -30, left: 60, width: 140, height: 140, borderRadius: "50%", background: "rgba(15,157,88,0.12)", pointerEvents: "none" }} />

          <div style={{ display: "flex", alignItems: "flex-start", gap: 20, position: "relative" }}>
            {/* Google-coloured logo block */}
            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
              <div style={{ display: "flex", gap: 3 }}>
                <GDot color="#4285F4" size={14} />
                <GDot color="#EA4335" size={14} />
              </div>
              <div style={{ display: "flex", gap: 3 }}>
                <GDot color="#34A853" size={14} />
                <GDot color="#FBBC05" size={14} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, background: "rgba(66,133,244,0.25)", color: "#A8C7FA", padding: "3px 10px", borderRadius: 20, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Google Flow
                </span>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, background: "rgba(15,157,88,0.25)", color: "#81C995", padding: "3px 10px", borderRadius: 20, letterSpacing: "0.05em" }}>
                  Veo 3.1
                </span>
              </div>
              <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800, color: "#fff", lineHeight: 1.2, letterSpacing: "-0.01em" }}>
                Text to Video Generation
              </h1>
              <p style={{ margin: "10px 0 0", fontSize: "0.9rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>
                Powered by Google's Veo 3.1 model · cinematic quality · native audio · premium commercial output
              </p>
            </div>
          </div>

          {/* Feature chips */}
          <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
            {["🎬 Text & Image to Video", "🖼️ Reference Frame Upload", "🔊 Native Audio", "🌐 16:9 / 9:16 / 1:1", "✨ AI Enhanced Prompt", "📱 Social Ready"].map((chip) => (
              <span key={chip} style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)", padding: "5px 14px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 600, border: "1px solid rgba(255,255,255,0.12)" }}>
                {chip}
              </span>
            ))}
          </div>
        </div>

        {/* ── Input Form ─────────────────────────────────────────────────── */}
        {(isIdle || isError) && (
          <div className="gf-card gf-animate">
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #4285F4, #0F9D58)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "1.1rem", flexShrink: 0 }}>
                ✍️
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#202124" }}>Describe Your Video</h2>
                <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#5F6368" }}>AI enhances your idea into a cinematic Veo 3.1 prompt automatically</p>
              </div>
            </div>

            {/* Text prompt */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#5F6368", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Your Idea <span style={{ color: "#DB4437" }}>*</span>
              </label>
              <textarea
                className="gf-textarea"
                rows={4}
                placeholder="e.g. A luxury perfume bottle rotating on a dark velvet surface with cinematic lighting and golden particles floating around it..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <p style={{ margin: "6px 0 0", fontSize: "0.75rem", color: "#9AA0A6" }}>
                {text.length} characters · Be descriptive — the AI will refine it into a professional cinematic prompt
              </p>
            </div>

            {/* Optional Reference Image (Image-to-Video) */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#5F6368", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                🖼️ Reference Image <span style={{ color: "#9AA0A6", fontWeight: 400, textTransform: "none" }}>(optional — for Image-to-Video generation)</span>
              </label>

              {!imageBase64 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: "2px dashed #DADCE0",
                    borderRadius: 14,
                    padding: "20px",
                    textAlign: "center",
                    cursor: "pointer",
                    background: "#F8F9FA",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#4285F4"; e.currentTarget.style.background = "#F1F5FE"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#DADCE0"; e.currentTarget.style.background = "#F8F9FA"; }}
                >
                  <div style={{ fontSize: "1.6rem", marginBottom: 6 }}>🌅</div>
                  <p style={{ margin: 0, fontWeight: 700, color: "#202124", fontSize: "0.9rem" }}>Click to select a reference image or initial frame</p>
                  <p style={{ margin: "4px 0 0", color: "#5F6368", fontSize: "0.78rem" }}>Supports JPG, PNG, WEBP — Veo 3.1 will use this image to animate your video!</p>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 14, background: "#E8F0FE", border: "1.5px solid #4285F4", borderRadius: 14, padding: "12px 16px" }}>
                  <img src={imageBase64} alt="Preview" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid #DADCE0", flexShrink: 0 }} />
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <p style={{ margin: 0, fontWeight: 700, color: "#1A73E8", fontSize: "0.9rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{imageName || "Reference Image"}</p>
                    <p style={{ margin: "2px 0 0", color: "#174EA6", fontSize: "0.76rem" }}>✨ Image will be submitted to Veo 3.1 as visual reference</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); clearImage(); }}
                    style={{ background: "#fff", border: "1px solid #DADCE0", borderRadius: 20, padding: "6px 12px", fontSize: "0.78rem", fontWeight: 700, color: "#DB4437", cursor: "pointer" }}
                  >
                    ✕ Remove
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: "none" }}
              />
            </div>

            {/* Aspect Ratio */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#5F6368", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Aspect Ratio
              </label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {ASPECT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`gf-ar-pill${aspectRatio === opt.value ? " gf-ar-pill--active" : ""}`}
                    onClick={() => setAspectRatio(opt.value)}
                  >
                    <span style={{ fontSize: "1rem" }}>{opt.icon}</span>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Offer ID */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#5F6368", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Offer ID <span style={{ color: "#9AA0A6", fontWeight: 400, textTransform: "none" }}>(optional)</span>
              </label>
              <input
                className="gf-input"
                type="text"
                placeholder="Link this video to an offer ID (optional)"
                value={offerId}
                onChange={(e) => setOfferId(e.target.value)}
              />
            </div>

            {/* Info box */}
            <div style={{ background: "#E8F0FE", borderRadius: 12, padding: "14px 18px", marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: "1.1rem", marginTop: 1 }}>ℹ️</span>
              <div>
                <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700, color: "#1A73E8" }}>How it works</p>
                <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#174EA6", lineHeight: 1.6 }}>
                  Your text is first enhanced by OpenAI into a cinematic prompt, then submitted to Veo 3.1.
                  Generation takes <strong>2–5 minutes</strong>. The page will automatically poll every 20 seconds.
                </p>
              </div>
            </div>

            <button
              className="gf-btn-primary"
              onClick={handleSubmit}
              disabled={!text.trim() || !userId}
              style={{ width: "100%", justifyContent: "center", fontSize: "1.05rem", padding: "16px 32px" }}
            >
              <FaPlay />
              Generate with Veo 3.1
            </button>

            {isError && (
              <div style={{ marginTop: 16, background: "#FDECEA", border: "1.5px solid #F5C6C6", borderRadius: 12, padding: "14px 18px", display: "flex", gap: 12 }}>
                <span style={{ fontSize: "1.1rem" }}>⚠️</span>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: "#C62828", fontSize: "0.9rem" }}>Error</p>
                  <p style={{ margin: "4px 0 0", color: "#B71C1C", fontSize: "0.84rem" }}>{errorMsg}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Processing State ───────────────────────────────────────────── */}
        {isBusy && (
          <div className="gf-card gf-animate" style={{ textAlign: "center", padding: "48px 32px" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
              <Spin />
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: "1.25rem", fontWeight: 800, color: "#202124" }}>
              {isSubmitting ? "Submitting to Google Flow..." : "Veo 3.1 is Generating"}
            </h2>
            <p style={{ margin: "0 0 24px", fontSize: "0.88rem", color: "#5F6368", lineHeight: 1.6 }}>
              {isSubmitting
                ? "Enhancing your prompt with AI and submitting to Google Veo 3.1..."
                : <>Your video is being rendered. This typically takes <strong>2–5 minutes</strong>.<br />The page polls automatically every 20 seconds.</>
              }
            </p>

            {isProcessing && jobId && (
              <>
                <div style={{ background: "#F8F9FA", borderRadius: 12, padding: "16px 20px", display: "inline-flex", flexDirection: "column", gap: 6, marginBottom: 20, textAlign: "left", minWidth: 280 }}>
                  <div style={{ display: "flex", gap: 20 }}>
                    <div>
                      <p className="gf-stat-label">Job ID</p>
                      <p className="gf-stat-value" style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>{jobId.slice(0, 16)}...</p>
                    </div>
                    <div>
                      <p className="gf-stat-label">Model</p>
                      <p className="gf-stat-value">Veo 3.1</p>
                    </div>
                    <div>
                      <p className="gf-stat-label">Provider</p>
                      <p className="gf-stat-value">Google Flow</p>
                    </div>
                    <div>
                      <p className="gf-stat-label">Checks</p>
                      <p className="gf-stat-value">{pollCount} polls</p>
                    </div>
                  </div>
                </div>
                <div className="gf-progress-bar" style={{ maxWidth: 400, margin: "0 auto" }}>
                  <div className="gf-progress-fill" style={{ width: "100%" }} />
                </div>
                <p style={{ margin: "10px 0 0", fontSize: "0.76rem", color: "#9AA0A6" }}>
                  {pollCount < 3 ? "Initializing Google Cloud GPU cluster..." : pollCount < 8 ? "Veo 3.1 is rendering your video..." : "Finalizing and encoding your video..."}
                </p>
              </>
            )}

            {/* Google colour dots decoration */}
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 28 }}>
              {["#4285F4", "#EA4335", "#FBBC05", "#34A853"].map((c, i) => (
                <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c, animation: `gf-pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {/* ── Done: Video Result ─────────────────────────────────────────── */}
        {isDone && result && (
          <div className="gf-animate">
            {/* Success header */}
            <div style={{ background: "linear-gradient(135deg, #0D1F3C, #0F4C3A)", borderRadius: 20, padding: "20px 28px", marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#34A853", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "1.2rem", flexShrink: 0 }}>
                <FaCheckCircle />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 800, color: "#fff", fontSize: "1.1rem" }}>Video Generated Successfully!</p>
                <p style={{ margin: "3px 0 0", fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
                  Veo 3.1 · Saved to Media Library
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {["#4285F4", "#34A853", "#FBBC05", "#EA4335"].map((c) => <GDot key={c} color={c} size={10} />)}
              </div>
            </div>

            {/* Video player */}
            <div className="gf-card" style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#202124" }}>Your Generated Video</h3>
                <a href={result.videoUrl} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 6, color: "#4285F4", fontSize: "0.82rem", fontWeight: 700, textDecoration: "none" }}>
                  <FaExternalLinkAlt size={11} /> Open in New Tab
                </a>
              </div>
              <video
                className="gf-video-el"
                src={result.videoUrl}
                controls
                autoPlay
                muted
              />
              <div style={{ marginTop: 12, background: "#F8F9FA", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: "0.74rem", color: "#5F6368", fontFamily: "monospace", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{result.videoUrl}</span>
                <button className="gf-copy-btn" onClick={() => handleCopy(result.videoUrl, "url")}>
                  <FaCopy size={11} /> {copiedField === "url" ? "Copied!" : "Copy URL"}
                </button>
              </div>
            </div>

            {/* AI-generated metadata */}
            {(result.enhancedPrompt || result.voiceoverScript || result.socialMediaHeading) && (
              <div className="gf-card" style={{ marginBottom: 20 }}>
                <h3 style={{ margin: "0 0 20px", fontSize: "1rem", fontWeight: 700, color: "#202124" }}>✨ AI-Generated Metadata</h3>

                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {result.enhancedPrompt && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#5F6368", textTransform: "uppercase", letterSpacing: "0.04em" }}>Enhanced Cinematic Prompt</label>
                        <button className="gf-copy-btn" onClick={() => handleCopy(result.enhancedPrompt!, "prompt")}>
                          <FaCopy size={10} /> {copiedField === "prompt" ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <div style={{ background: "linear-gradient(135deg, #E8F0FE, #d2e3fc)", border: "1.5px solid #A8C7FA", borderRadius: 12, padding: "14px 16px", fontSize: "0.86rem", color: "#174EA6", lineHeight: 1.7, fontStyle: "italic" }}>
                        {result.enhancedPrompt}
                      </div>
                    </div>
                  )}

                  {result.voiceoverScript && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#5F6368", textTransform: "uppercase", letterSpacing: "0.04em" }}>🎙️ Voiceover Script</label>
                        <button className="gf-copy-btn" onClick={() => handleCopy(result.voiceoverScript!, "vo")}>
                          <FaCopy size={10} /> {copiedField === "vo" ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <div style={{ background: "#F8F9FA", border: "1.5px solid #DADCE0", borderRadius: 12, padding: "14px 16px", fontSize: "0.9rem", color: "#202124", lineHeight: 1.7, fontWeight: 500 }}>
                        "{result.voiceoverScript}"
                      </div>
                    </div>
                  )}

                  {result.socialMediaHeading && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#5F6368", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>📱 Social Heading</label>
                        <div style={{ background: "#E6F4EA", border: "1.5px solid #81C995", borderRadius: 10, padding: "12px 14px", fontSize: "0.88rem", color: "#137333", fontWeight: 700 }}>
                          {result.socialMediaHeading}
                        </div>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#5F6368", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>📝 Caption</label>
                        <div style={{ background: "#FEF9E7", border: "1.5px solid #F8C22B", borderRadius: 10, padding: "12px 14px", fontSize: "0.85rem", color: "#7B5800", lineHeight: 1.5 }}>
                          {result.socialMediaCaption}
                        </div>
                      </div>
                    </div>
                  )}

                  {result.hashTags && result.hashTags.length > 0 && (
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#5F6368", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
                        <FaHashtag size={10} style={{ marginRight: 4 }} />Hashtags
                      </label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {result.hashTags.map((tag, i) => (
                          <span key={i} className="gf-meta-tag" onClick={() => handleCopy(tag, `tag-${i}`)} style={{ cursor: "pointer" }}>
                            {tag}
                          </span>
                        ))}
                        <button className="gf-copy-btn" onClick={() => handleCopy(result.hashTags!.join(" "), "tags")}>
                          <FaCopy size={10} /> {copiedField === "tags" ? "Copied all!" : "Copy all"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 12 }}>
              <button className="gf-btn-primary" onClick={handleReset}>
                <FaRedo /> Generate Another Video
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default Veo3TextVideoView;
