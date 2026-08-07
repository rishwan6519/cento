"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  FaFilm, FaMagic, FaRedo, FaVideo, FaCheckCircle,
  FaExternalLinkAlt, FaSpinner, FaPlay, FaWallet,
  FaSync, FaBolt, FaClock, FaBan,
} from "react-icons/fa";

// ─── Types ────────────────────────────────────────────────────────────────────
type Resolution = "480p" | "720p" | "1080p" | "4K";
type AspectRatio = "16:9" | "9:16" | "1:1" | "4:3";
type GenerationStatus = "idle"|"generating-prompt"|"prompt-ready"|"generating-video"|"done"|"error";
interface GeneratedVideo { videoUrl: string; mediaId: string; }

// ─── Model catalogue ──────────────────────────────────────────────────────────
interface ModelInfo {
  name: string;
  slug: string;
  /** cost in USD per second for each supported resolution */
  costByRes: Partial<Record<Resolution, number>>;
  supportedResolutions: Resolution[];
  /** supported duration options in seconds */
  supportedDurations: number[];
  badge?: string;
  badgeColor?: string;
}

const MODELS: ModelInfo[] = [
  // ── Wan ───────────────────────────────────────────────────────────────────
  {
    name: "Wan Pro",
    slug: "fal-ai/wan-pro/text-to-video",
    costByRes: { "480p": 0.006, "720p": 0.010, "1080p": 0.014 },
    supportedResolutions: ["480p", "720p", "1080p"],
    supportedDurations: [3, 5, 8, 10],
    badge: "Pro", badgeColor: "#F05A28",
  },
  {
    name: "Wan 2.1",
    slug: "fal-ai/wan-t2v",
    costByRes: { "480p": 0.005, "720p": 0.008, "1080p": 0.012 },
    supportedResolutions: ["480p", "720p", "1080p"],
    supportedDurations: [3, 5, 8, 10],
    badge: "Fast", badgeColor: "#11B5BB",
  },
  {
    name: "Wan 2.1 (1.3B)",
    slug: "fal-ai/wan-t2v",
    costByRes: { "480p": 0.003, "720p": 0.004 },
    supportedResolutions: ["480p", "720p"],
    supportedDurations: [3, 5, 8],
    badge: "Budget", badgeColor: "#64848D",
  },
  // ── Kling ─────────────────────────────────────────────────────────────────
  {
    name: "Kling 1.6 Std",
    slug: "fal-ai/kling-video/v1.6/standard/text-to-video",
    costByRes: { "720p": 0.028, "1080p": 0.040 },
    supportedResolutions: ["720p", "1080p"],
    supportedDurations: [5, 10],
  },
  {
    name: "Kling 1.6 Pro",
    slug: "fal-ai/kling-video/v1.6/pro/text-to-video",
    costByRes: { "720p": 0.055, "1080p": 0.075, "4K": 0.110 },
    supportedResolutions: ["720p", "1080p", "4K"],
    supportedDurations: [5, 10],
    badge: "Pro", badgeColor: "#7C3AED",
  },
  {
    name: "Kling 2.0 Std",
    slug: "fal-ai/kling-video/o3/standard/text-to-video",
    costByRes: { "720p": 0.030, "1080p": 0.045 },
    supportedResolutions: ["720p", "1080p"],
    supportedDurations: [5, 10, 15],
    badge: "New", badgeColor: "#F05A28",
  },
  {
    name: "Kling 2.0 Pro",
    slug: "fal-ai/kling-video/o3/pro/text-to-video",
    costByRes: { "720p": 0.060, "1080p": 0.080, "4K": 0.120 },
    supportedResolutions: ["720p", "1080p", "4K"],
    supportedDurations: [5, 10, 15, 30],
    badge: "Pro", badgeColor: "#7C3AED",
  },
  // ── Google Flow Veo ───────────────────────────────────────────────────────
  {
    name: "Veo 3.1",
    slug: "google-flow/veo-3.1-lite",
    costByRes: { "720p": 0.08, "1080p": 0.12, "4K": 0.18 },
    supportedResolutions: ["720p", "1080p", "4K"],
    supportedDurations: [4, 5, 6, 8],
    badge: "Google Flow", badgeColor: "#4285F4",
  },
  // ── Seedance ──────────────────────────────────────────────────────────────
  {
    name: "Seedance 2 Pro",
    slug: "bytedance/seedance-2.0/text-to-video",
    costByRes: { "720p": 0.050, "1080p": 0.060 },
    supportedResolutions: ["720p", "1080p"],
    supportedDurations: [5, 10],
    badge: "Pro", badgeColor: "#7C3AED",
  },
  // ── HunyuanVideo ──────────────────────────────────────────────────────────
  {
    name: "HunyuanVideo",
    slug: "fal-ai/hunyuan-video",
    costByRes: { "480p": 0.012, "720p": 0.018, "1080p": 0.024 },
    supportedResolutions: ["480p", "720p", "1080p"],
    supportedDurations: [5, 10],
  },
  // ── Hailuo / MiniMax ──────────────────────────────────────────────────────
  {
    name: "Hailuo AI",
    slug: "fal-ai/minimax/video-01-live",
    costByRes: { "720p": 0.018, "1080p": 0.022 },
    supportedResolutions: ["720p", "1080p"],
    supportedDurations: [3, 5, 10],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtCost = (v: number) => `$${v.toFixed(3)}`;
const fmtTotal = (costPerSec: number, dur: number) => `$${(costPerSec * dur).toFixed(3)}`;

// ─── Sub-components ───────────────────────────────────────────────────────────
const LoadingDots: React.FC<{ label: string }> = ({ label }) => {
  const [dots, setDots] = React.useState(".");
  React.useEffect(() => {
    const iv = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 500);
    return () => clearInterval(iv);
  }, []);
  return <span style={{ color: "#11B5BB", fontWeight: 600 }}>{label}<span style={{ display: "inline-block", width: 24 }}>{dots}</span></span>;
};

const SpinnerRing: React.FC = () => (
  <div style={{ width: 64, height: 64, border: "5px solid #EAF6F8", borderTop: "5px solid #11B5BB", borderRadius: "50%", animation: "aivg-spin 0.9s linear infinite" }} />
);

const CreditBalance: React.FC = () => {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchBal = async () => {
    setLoading(true); setError(false);
    try {
      const res = await fetch("/api/ai-video/balance");
      const data = await res.json();
      setBalance(data.success && data.balance != null ? data.balance : null);
      if (!data.success) setError(true);
    } catch { setError(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBal(); }, []);

  const fmtBal = (v: number) => {
    const d = v > 100 ? v / 100 : v;
    return `$${d.toFixed(2)}`;
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, background: "linear-gradient(135deg, #0B3D44 0%, #155E68 100%)", borderRadius: 14, padding: "12px 18px", border: "1px solid rgba(255,255,255,0.1)", minWidth: 190 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
        <FaWallet size={14} />
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: "0.65rem", color: "rgba(255,255,255,0.6)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>fal.ai Credits</p>
        {loading
          ? <FaSpinner size={14} style={{ color: "#fff", animation: "aivg-spin 0.9s linear infinite", marginTop: 4 }} />
          : <p style={{ margin: "2px 0 0", fontSize: "1.2rem", fontWeight: 800, color: error ? "rgba(255,255,255,0.4)" : "#fff" }}>
              {error ? "N/A" : balance != null ? fmtBal(balance) : "—"}
            </p>
        }
      </div>
      <button onClick={fetchBal} disabled={loading} title="Refresh" style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.7)" }}>
        <FaSync size={10} style={{ animation: loading ? "aivg-spin 1s linear infinite" : "none" }} />
      </button>
    </div>
  );
};

// ─── Simple select ────────────────────────────────────────────────────────────
const Select: React.FC<{ id: string; label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }> = ({ id, label, value, onChange, options }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <label htmlFor={id} style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64848D", letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</label>
    <div style={{ position: "relative" }}>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", appearance: "none", background: "#F8FAFB", border: "1.5px solid #EAEFEF", borderRadius: 10, padding: "11px 38px 11px 14px", fontSize: "0.88rem", color: "#162B30", fontFamily: "Inter, sans-serif", fontWeight: 600, cursor: "pointer", outline: "none" }}
        onFocus={(e) => (e.target.style.borderColor = "#11B5BB")}
        onBlur={(e) => (e.target.style.borderColor = "#EAEFEF")}
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <svg style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#64848D" }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  </div>
);

// ─── Model card grid ──────────────────────────────────────────────────────────
const ModelGrid: React.FC<{ value: string; onChange: (v: string) => void; resolution: Resolution; duration: number; engine?: "fal" | "veo" }> = ({ value, onChange, resolution, duration, engine = "fal" }) => {
  const filteredModels = MODELS.filter((m) => (engine === "veo" ? m.slug.includes("google") : !m.slug.includes("google")));
  return (
    <div>
      <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#64848D", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 12 }}>
        AI Model ({engine === "veo" ? "Google Veo Engine" : "Fal.ai Engine"}) — showing compatibility for <span style={{ color: "#0B2830" }}>{resolution}</span>
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(195px, 1fr))", gap: 10 }}>
        {filteredModels.map((m) => {
          const supported = m.supportedResolutions.includes(resolution);
          const cps = supported ? m.costByRes[resolution]! : null;
          const total = cps != null ? fmtTotal(cps, duration) : null;
          const active = value === m.name && supported;

          return (
            <button key={m.name} onClick={() => supported && onChange(m.name)} disabled={!supported}
              style={{
                background: active
                  ? "linear-gradient(135deg, #0B3D44, #11B5BB)"
                  : supported ? "#F8FAFB" : "#F0F4F5",
                border: active ? "2px solid #11B5BB" : `1.5px solid ${supported ? "#EAEFEF" : "#E0E7EA"}`,
                borderRadius: 12, padding: "12px 14px", cursor: supported ? "pointer" : "not-allowed",
                textAlign: "left", transition: "all 0.15s", fontFamily: "Inter, sans-serif",
                position: "relative", overflow: "hidden", opacity: supported ? 1 : 0.55,
              }}>
              {m.badge && (
                <span style={{ position: "absolute", top: 8, right: 8, background: active ? "rgba(255,255,255,0.22)" : (m.badgeColor || "#64848D"), color: "#fff", fontSize: "0.58rem", fontWeight: 700, padding: "2px 7px", borderRadius: 20, letterSpacing: "0.04em" }}>
                  {m.badge}
                </span>
              )}
              {!supported && (
                <span style={{ position: "absolute", top: 8, right: m.badge ? 55 : 8, display: "flex", alignItems: "center", gap: 3, background: "#FEE2E2", color: "#DC2626", fontSize: "0.58rem", fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>
                  <FaBan size={8} /> N/A
                </span>
              )}
              <p style={{ margin: "0 0 6px", fontSize: "0.82rem", fontWeight: 700, color: active ? "#fff" : supported ? "#0B2830" : "#A4B6B9", paddingRight: 40 }}>
                {m.name}
              </p>
              {supported ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <FaBolt size={8} style={{ color: active ? "rgba(255,255,255,0.7)" : "#F05A28", flexShrink: 0 }} />
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: active ? "rgba(255,255,255,0.9)" : "#64848D" }}>
                      {fmtCost(cps!)}/s @ {resolution}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <FaClock size={8} style={{ color: active ? "rgba(255,255,255,0.6)" : "#A4B6B9", flexShrink: 0 }} />
                    <span style={{ fontSize: "0.72rem", color: active ? "rgba(255,255,255,0.7)" : "#A4B6B9" }}>
                      {duration}s = <strong style={{ color: active ? "#fff" : "#0B2830" }}>{total}</strong> total
                    </span>
                  </div>
                </div>
              ) : (
                <p style={{ margin: "0", fontSize: "0.72rem", color: "#A4B6B9" }}>Not supported at {resolution}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AIVideoGenerationView: React.FC = () => {
  const [resolution, setResolution] = useState<Resolution>("1080p");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [aiModel, setAiModel] = useState("Veo 3.1");
  const [duration, setDuration] = useState(4);
  const [numVideos, setNumVideos] = useState(1);
  const [roughPrompt, setRoughPrompt] = useState("");
  const [refinedPrompt, setRefinedPrompt] = useState("");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const [generationProgress, setGenerationProgress] = useState(0);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [engine, setEngine] = useState<"fal" | "veo">("veo");
  const [offerId, setOfferId] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<string[]>(["instagram", "facebook", "instore"]);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [pollingJobId, setPollingJobId] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [videoTemplates, setVideoTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") || "" : "";

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
    fetch("/api/video-template?sort=createdAt&order=desc", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setVideoTemplates(data.data.filter((t: any) => t.status === "Active"));
        }
      })
      .catch(() => {});
  }, []);

  const handleTemplateChange = (tId: string) => {
    setSelectedTemplateId(tId);
    const tmpl = videoTemplates.find((t) => t._id === tId);
    if (tmpl) {
      if (tmpl.aspectRatio) setAspectRatio(tmpl.aspectRatio as AspectRatio);
      if (tmpl.videoDuration && selectedModel.supportedDurations.includes(Number(tmpl.videoDuration))) setDuration(Number(tmpl.videoDuration));
      if (tmpl.aiModel && MODELS.some((m) => m.name === tmpl.aiModel)) {
        setAiModel(tmpl.aiModel);
        if (tmpl.aiModel.includes("Google") || tmpl.aiModel.includes("Veo")) setEngine("veo");
        else setEngine("fal");
      }
      if (!roughPrompt && !refinedPrompt) {
        setRefinedPrompt(`Video generation using active template "${tmpl.templateName}"`);
        setStatus("prompt-ready");
      }
    }
  };

  // Derive selected model info
  const selectedModel = MODELS.find((m) => m.name === aiModel) ?? MODELS[0];
  const modelSupportsRes = selectedModel.supportedResolutions.includes(resolution);
  const costPerSec = modelSupportsRes ? (selectedModel.costByRes[resolution] ?? 0) : 0;
  const totalEstCost = costPerSec * duration * numVideos;

  // When resolution changes, if current model no longer supports it, pick first compatible model
  const handleResolutionChange = (r: string) => {
    const res = r as Resolution;
    setResolution(res);
    const currentStillOk = MODELS.find((m) => m.name === aiModel)?.supportedResolutions.includes(res);
    if (!currentStillOk) {
      const first = MODELS.find((m) => m.supportedResolutions.includes(res) && (engine === "veo" ? m.slug.includes("google") : !m.slug.includes("google"))) || MODELS.find((m) => m.supportedResolutions.includes(res));
      if (first) setAiModel(first.name);
    }
  };

  // When model changes, clamp duration to supported
  const handleModelChange = (name: string) => {
    setAiModel(name);
    const m = MODELS.find((mm) => mm.name === name);
    if (m && !m.supportedDurations.includes(duration)) {
      setDuration(m.supportedDurations[0]);
    }
  };

  const durations = selectedModel.supportedDurations;

  // Progress
  const startProgress = () => {
    setGenerationProgress(0);
    if (progressRef.current) clearInterval(progressRef.current);
    progressRef.current = setInterval(() => {
      setGenerationProgress((p) => (p >= 90 ? p : p + Math.random() * 3));
    }, 1500);
  };
  const finishProgress = () => { if (progressRef.current) clearInterval(progressRef.current); setGenerationProgress(100); };

  // API calls
  const handleGeneratePrompt = async () => {
    if (!roughPrompt.trim()) return;
    setStatus("generating-prompt"); setErrorMsg("");
    try {
      const res = await fetch("/api/ai-video/generate-prompt", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roughPrompt, resolution, aspectRatio, model: aiModel }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setRefinedPrompt(data.refinedPrompt); setStatus("prompt-ready");
    } catch (err: any) { setErrorMsg(err.message || "Failed to generate prompt."); setStatus("error"); }
  };

  const handleGenerateVideo = async () => {
    if ((!refinedPrompt.trim() && !roughPrompt.trim() && !selectedTemplateId) || !userId) return;
    setStatus("generating-video"); setErrorMsg(""); setGeneratedVideos([]); startProgress(); setPollingJobId("");

    if (engine === "veo" || aiModel.includes("Veo") || aiModel.includes("Google")) {
      try {
        const fd = new FormData();
        fd.append("userId", userId);
        fd.append("text", refinedPrompt || roughPrompt || `Video generated via template`);
        fd.append("model", "Veo 3.1 Lite");
        fd.append("resolution", resolution);
        fd.append("aspectRatio", aspectRatio);
        fd.append("duration", String(duration));
        fd.append("numberOfVideos", String(numVideos));
        if (selectedTemplateId) fd.append("templateId", selectedTemplateId);
        if (offerId) fd.append("offerId", offerId);
        if (selectedChannels.length > 0) fd.append("channels", JSON.stringify(selectedChannels));
        uploadFiles.forEach((file) => fd.append("images ", file));

        const res = await fetch("/api/external/create-video", { method: "POST", body: fd });
        const data = await res.json();
        if (!data.success) throw new Error(data.message || "Failed to initiate Google Veo video generation.");

        const jobId = data.jobId;
        setPollingJobId(jobId);

        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(async () => {
          try {
            const pollRes = await fetch("/api/external/get-video", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jobId }),
            });
            const pollData = await pollRes.json();
            if (pollData.success && (pollData.status === "completed" || pollData.status === "success")) {
              if (pollingRef.current) clearInterval(pollingRef.current);
              finishProgress();
              setGeneratedVideos([{ videoUrl: pollData.videoUrl || pollData["video 1"] || "", mediaId: pollData.videoId || jobId }]);
              setStatus("done");
              setPollingJobId("");
            } else if (pollData.status === "failed") {
              if (pollingRef.current) clearInterval(pollingRef.current);
              finishProgress();
              setErrorMsg(pollData.message || "Google Veo generation failed during cloud processing.");
              setStatus("error");
              setPollingJobId("");
            }
          } catch (e) {
            console.error("Error polling Google Veo status:", e);
          }
        }, 5000);
        return;
      } catch (err: any) {
        finishProgress();
        if (pollingRef.current) clearInterval(pollingRef.current);
        setErrorMsg(err.message || "Google Veo video generation failed.");
        setStatus("error");
        setPollingJobId("");
        return;
      }
    }

    try {
      const res = await fetch("/api/ai-video/generate-video", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: refinedPrompt || roughPrompt, resolution, aspectRatio, model: aiModel, numVideos, duration, userId, templateId: selectedTemplateId || undefined }),
      });
      const data = await res.json();
      finishProgress();
      if (!data.success) throw new Error(data.message);
      setGeneratedVideos(data.videos || []); setStatus("done");
    } catch (err: any) { finishProgress(); setErrorMsg(err.message || "Video generation failed."); setStatus("error"); }
  };

  const handleReset = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setStatus("idle"); setRefinedPrompt(""); setRoughPrompt(""); setGeneratedVideos([]); setGenerationProgress(0); setErrorMsg(""); setPollingJobId("");
  };

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  // Styles
  const card: React.CSSProperties = { background: "#fff", borderRadius: 20, padding: "28px 32px", boxShadow: "0 4px 20px rgba(0,0,0,0.04)", border: "1px solid #EAF0F2" };
  const iconWrap = (bg: string): React.CSSProperties => ({ width: 36, height: 36, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "0.95rem", flexShrink: 0 });
  const orangeBtn: React.CSSProperties = { background: "#F05A28", color: "#fff", border: "none", borderRadius: 10, padding: "12px 26px", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "Inter, sans-serif" };
  const tealBtn: React.CSSProperties = { background: "#11B5BB", color: "#fff", border: "none", borderRadius: 10, padding: "12px 26px", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "Inter, sans-serif" };
  const ghostBtn: React.CSSProperties = { background: "none", border: "1.5px solid #EAEFEF", color: "#64848D", borderRadius: 10, padding: "10px 20px", fontSize: "0.84rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, fontFamily: "Inter, sans-serif" };

  const isGeneratingPrompt = status === "generating-prompt";
  const isGeneratingVideo = status === "generating-video";
  const isDone = status === "done";
  const isError = status === "error";
  const hasPrompt = status === "prompt-ready" || isDone || isGeneratingVideo;

  return (
    <>
      <style>{`
        @keyframes aivg-spin { to { transform: rotate(360deg); } }
        @keyframes aivg-fadein { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .aivg-animate { animation: aivg-fadein 0.35s ease forwards; }
        .aivg-ob:hover { background: #DC4B1D !important; }
        .aivg-tb:hover { background: #0E9C9F !important; }
        .aivg-gb:hover { border-color: #11B5BB !important; color: #11B5BB !important; }
        .aivg-ta:focus { outline: none; border-color: #11B5BB !important; box-shadow: 0 0 0 3px rgba(17,181,187,0.12); }
        .aivg-dur-btn { background:#F8FAFB; border:1.5px solid #EAEFEF; border-radius:9px; padding:9px 16px; font-size:0.85rem; font-weight:700; color:#162B30; cursor:pointer; font-family:Inter,sans-serif; transition:all 0.15s; }
        .aivg-dur-btn:hover { border-color:#11B5BB; color:#11B5BB; }
        .aivg-dur-btn--active { background:linear-gradient(135deg,#0B3D44,#11B5BB) !important; color:#fff !important; border-color:#11B5BB !important; }
        .aivg-video-preview { width:100%; border-radius:14px; max-height:420px; background:#000; display:block; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 24, fontFamily: "Inter, sans-serif" }}>

        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #0B3D44, #11B5BB)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "1.3rem", flexShrink: 0 }}>
              <FaFilm />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 800, color: "#0B2830" }}>AI Video Generation</h1>
              <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#64848D" }}>Powered by fal.ai · {MODELS.length} models</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {/* Live cost summary chip */}
            <div style={{ background: "#fff", border: "1.5px solid #EAEFEF", borderRadius: 14, padding: "10px 18px", display: "flex", gap: 18 }}>
              <div>
                <p style={{ margin: 0, fontSize: "0.62rem", color: "#64848D", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Model</p>
                <p style={{ margin: "2px 0 0", fontSize: "0.9rem", fontWeight: 700, color: "#0B2830" }}>{aiModel}</p>
              </div>
              <div style={{ width: 1, background: "#EAEFEF" }} />
              <div>
                <p style={{ margin: 0, fontSize: "0.62rem", color: "#64848D", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Rate @ {resolution}</p>
                <p style={{ margin: "2px 0 0", fontSize: "0.9rem", fontWeight: 700, color: modelSupportsRes ? "#F05A28" : "#DC2626" }}>
                  {modelSupportsRes ? `$${costPerSec.toFixed(3)}/s` : "N/A"}
                </p>
              </div>
              <div style={{ width: 1, background: "#EAEFEF" }} />
              <div>
                <p style={{ margin: 0, fontSize: "0.62rem", color: "#64848D", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Est. Total</p>
                <p style={{ margin: "2px 0 0", fontSize: "0.9rem", fontWeight: 800, color: "#0B2830" }}>
                  {modelSupportsRes ? `$${totalEstCost.toFixed(3)}` : "—"}
                </p>
              </div>
            </div>
            <CreditBalance />
            {isDone && (
              <div style={{ background: "#DCFCE7", color: "#166534", padding: "10px 16px", borderRadius: 12, fontSize: "0.8rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <FaCheckCircle /> Saved to Library
              </div>
            )}
          </div>
        </div>

        {/* ── Section 1: Configuration ──────────────────────────────────────── */}
        <div style={card} className="aivg-animate">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div style={iconWrap("#0B3D44")}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 0 0 4.93 19.07"/><path d="M4.93 4.93A10 10 0 0 1 19.07 19.07"/>
              </svg>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0B2830" }}>Configuration & Engine Selector</h2>
              <p style={{ margin: "2px 0 0", fontSize: "0.76rem", color: "#64848D" }}>Choose AI engine, resolution, aspect ratio, and campaign details</p>
            </div>
          </div>

          {/* ── Engine Switcher (Fal vs Google Veo) ───────────────────────── */}
          <div style={{ background: "#F0F4F5", padding: 6, borderRadius: 16, display: "flex", gap: 8, marginBottom: 26, border: "1px solid #EAEFEF" }}>
            <button
              type="button"
              onClick={() => {
                setEngine("veo");
                setAiModel("Veo 3.1");
                if (![4, 5, 6, 8].includes(duration)) setDuration(4);
              }}
              style={{
                flex: 1, padding: "12px 20px", borderRadius: 12, border: "none",
                background: engine === "veo" ? "linear-gradient(135deg, #1E3A8A, #3B82F6)" : "transparent",
                color: engine === "veo" ? "#fff" : "#64848D", fontWeight: 700, fontSize: "0.92rem",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", transition: "all 0.2s",
                boxShadow: engine === "veo" ? "0 4px 12px rgba(59,130,246,0.3)" : "none",
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>✨</span>
              <span>Google Veo Engine (Veo 3.1 Lite & Gemini)</span>
              <span style={{ background: engine === "veo" ? "rgba(255,255,255,0.2)" : "#3B82F6", color: "#fff", fontSize: "0.65rem", padding: "2px 8px", borderRadius: 20, fontWeight: 800 }}>DEFAULT</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEngine("fal");
                if (aiModel.includes("Veo") || aiModel.includes("Google")) setAiModel("Wan 2.1");
                if (duration === 4 || duration === 6) setDuration(5);
              }}
              style={{
                flex: 1, padding: "12px 20px", borderRadius: 12, border: "none",
                background: engine === "fal" ? "linear-gradient(135deg, #0B3D44, #11B5BB)" : "transparent",
                color: engine === "fal" ? "#fff" : "#64848D", fontWeight: 700, fontSize: "0.92rem",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", transition: "all 0.2s",
                boxShadow: engine === "fal" ? "0 4px 12px rgba(17,181,187,0.25)" : "none",
              }}
            >
              <FaBolt size={15} style={{ color: engine === "fal" ? "#F05A28" : "#A4B6B9" }} />
              <span>Fal.ai Engine (Wan 2.1, Kling, Pro)</span>
            </button>
          </div>

          {/* Row 1 — dropdowns */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 16, marginBottom: 28 }}>
            <Select id="aivg-tmpl" label="AI Video Template (Optional)" value={selectedTemplateId} onChange={handleTemplateChange}
              options={[
                { value: "", label: "None – Custom Setup" },
                ...videoTemplates.map((t) => ({ value: t._id, label: `${t.templateName} (${t.aspectRatio})` })),
              ]} />
            <Select id="aivg-res" label="Resolution" value={resolution} onChange={handleResolutionChange}
              options={[
                { value: "480p", label: "480p – SD" },
                { value: "720p", label: "720p – HD" },
                { value: "1080p", label: "1080p – Full HD" },
                { value: "4K", label: "4K – Ultra HD" },
              ]} />
            <Select id="aivg-ar" label="Aspect Ratio" value={aspectRatio} onChange={(v) => setAspectRatio(v as AspectRatio)}
              options={[
                { value: "16:9", label: "16:9 – Landscape" },
                { value: "9:16", label: "9:16 – Portrait" },
                { value: "1:1", label: "1:1 – Square" },
                { value: "4:3", label: "4:3 – Classic" },
              ]} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label htmlFor="aivg-nv" style={{ fontSize: "0.72rem", fontWeight: 600, color: "#64848D", letterSpacing: "0.04em", textTransform: "uppercase" }}>No. of Videos</label>
              <input id="aivg-nv" type="number" min={1} max={4} value={numVideos}
                onChange={(e) => setNumVideos(Math.max(1, Math.min(4, Number(e.target.value))))}
                style={{ width: "100%", background: "#F8FAFB", border: "1.5px solid #EAEFEF", borderRadius: 10, padding: "11px 14px", fontSize: "0.88rem", color: "#162B30", fontFamily: "Inter, sans-serif", fontWeight: 600, boxSizing: "border-box", outline: "none" }} />
            </div>
          </div>

          {/* Row 2 — Duration pills */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#64848D", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 10 }}>
              <FaClock size={10} style={{ marginRight: 5, verticalAlign: "middle" }} />
              Video Duration — <span style={{ color: "#0B2830" }}>{duration}s</span>
              {modelSupportsRes && <span style={{ color: "#64848D", fontWeight: 400 }}> · Est. {fmtCost(costPerSec * duration)} per video</span>}
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {durations.map((d) => (
                <button key={d} className={`aivg-dur-btn${duration === d ? " aivg-dur-btn--active" : ""}`} onClick={() => setDuration(d)}>
                  {d}s
                </button>
              ))}
            </div>
            {!durations.includes(duration) && (
              <p style={{ margin: "8px 0 0", fontSize: "0.76rem", color: "#F05A28" }}>
                ⚠ {selectedModel.name} supports: {durations.join("s, ")}s — auto-set to {durations[0]}s
              </p>
            )}
          </div>

          {/* ── Google Veo Extended Details (Offer, Channels, Image Upload) ──── */}
          {engine === "veo" && (
            <div style={{ background: "linear-gradient(135deg, #EFF6FF, #F8FAFC)", border: "1.5px solid #DBEAFE", borderRadius: 16, padding: "20px 22px", marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: "1.1rem" }}>🛠️</span>
                <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#1E40AF" }}>Google Veo Campaign Details & Reference Assets</h3>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18, marginBottom: 18 }}>
                <div>
                  <label htmlFor="aivg-offer" style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#3B82F6", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                    Offer ID Binding (Optional)
                  </label>
                  <input
                    id="aivg-offer"
                    type="text"
                    placeholder="e.g. OFFER-2026-9988"
                    value={offerId}
                    onChange={(e) => setOfferId(e.target.value)}
                    style={{ width: "100%", background: "#fff", border: "1.5px solid #BFDBFE", borderRadius: 10, padding: "10px 14px", fontSize: "0.88rem", color: "#1E3A8A", fontWeight: 600, outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#3B82F6", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                    Upload Reference Images (Image-to-Video)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.webp"
                    onChange={(e) => {
                      if (e.target.files) setUploadFiles(Array.from(e.target.files));
                    }}
                    style={{ fontSize: "0.82rem", color: "#1E40AF", background: "#fff", padding: "7px 12px", border: "1.5px solid #BFDBFE", borderRadius: 10, width: "100%", boxSizing: "border-box" }}
                  />
                  {uploadFiles.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      {uploadFiles.map((f, i) => (
                        <span key={i} style={{ background: "#DBEAFE", color: "#1E3A8A", fontSize: "0.72rem", padding: "3px 9px", borderRadius: 6, fontWeight: 600 }}>
                          📁 {f.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#3B82F6", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
                  Publishing Channels / Social Media Targets
                </label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["instagram", "facebook", "instore", "tiktok", "youtube", "twitter"].map((ch) => {
                    const sel = selectedChannels.includes(ch);
                    return (
                      <button
                        key={ch}
                        onClick={() => {
                          setSelectedChannels((prev) =>
                            prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
                          );
                        }}
                        type="button"
                        style={{
                          background: sel ? "#3B82F6" : "#fff",
                          color: sel ? "#fff" : "#3B82F6",
                          border: `1.5px solid ${sel ? "#3B82F6" : "#BFDBFE"}`,
                          borderRadius: 20, padding: "6px 14px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", transition: "all 0.15s", textTransform: "capitalize"
                        }}
                      >
                        {sel && "✓ "} {ch}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Row 3 — Model grid */}
          <ModelGrid value={aiModel} onChange={handleModelChange} resolution={resolution} duration={duration} engine={engine} />
        </div>

        {/* ── Section 2: Prompt ─────────────────────────────────────────────── */}
        <div style={card} className="aivg-animate">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
            <div style={iconWrap("#F05A28")}><FaMagic /></div>
            <div>
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0B2830" }}>Prompt</h2>
              <p style={{ margin: "2px 0 0", fontSize: "0.76rem", color: "#64848D" }}>Describe your idea — AI refines it into an optimized video prompt</p>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#64848D", marginBottom: 8 }}>Your rough idea</label>
            <textarea className="aivg-ta" value={roughPrompt} onChange={(e) => setRoughPrompt(e.target.value)}
              placeholder="e.g. A coffee shop on a rainy day, cozy and cinematic with warm lighting…" rows={3}
              style={{ width: "100%", resize: "vertical", background: "#F8FAFB", border: "1.5px solid #EAEFEF", borderRadius: 10, padding: "13px 16px", fontSize: "0.9rem", color: "#162B30", fontFamily: "Inter, sans-serif", lineHeight: 1.6, boxSizing: "border-box" }} />
          </div>

          <button style={{ ...orangeBtn, opacity: roughPrompt.trim() && !isGeneratingPrompt ? 1 : 0.5 }} className="aivg-ob" onClick={handleGeneratePrompt} disabled={!roughPrompt.trim() || isGeneratingPrompt}>
            {isGeneratingPrompt ? <><FaSpinner style={{ animation: "aivg-spin 0.9s linear infinite" }} /><LoadingDots label="Generating prompt" /></> : <><FaMagic /> Generate Prompt</>}
          </button>

          {hasPrompt && refinedPrompt && (
            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0B2830" }}>✨ Refined Prompt</label>
                <button style={{ ...ghostBtn, fontSize: "0.76rem", padding: "6px 14px" }} className="aivg-gb" onClick={handleGeneratePrompt} disabled={isGeneratingPrompt}>
                  <FaRedo size={10} /> Regenerate
                </button>
              </div>
              <div style={{ background: "linear-gradient(135deg, #EAF6F8, #F0FBF9)", border: "1.5px solid #C8E9EC", borderRadius: 12, padding: "16px 18px", fontSize: "0.88rem", color: "#162B30", lineHeight: 1.7, fontStyle: "italic" }}>
                {refinedPrompt}
              </div>
            </div>
          )}
        </div>

        {/* ── Section 3: Generate ───────────────────────────────────────────── */}
        {hasPrompt && !isDone && (
          <div style={card} className="aivg-animate">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
              <div style={iconWrap("#11B5BB")}><FaVideo /></div>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0B2830" }}>Generate Video</h2>
                <p style={{ margin: "2px 0 0", fontSize: "0.76rem", color: "#64848D" }}>Generation may take 1–3 minutes via fal.ai</p>
              </div>
              <div style={{ background: "#F8FAFB", border: "1.5px solid #EAEFEF", borderRadius: 10, padding: "8px 14px", display: "flex", gap: 10, fontSize: "0.78rem" }}>
                <span style={{ color: "#64848D" }}>{aiModel}</span>
                <span style={{ color: "#EAEFEF" }}>|</span>
                <span style={{ color: "#F05A28", fontWeight: 700 }}>{resolution}</span>
                <span style={{ color: "#EAEFEF" }}>|</span>
                <span style={{ fontWeight: 700, color: "#0B2830" }}>{duration}s × {numVideos}</span>
                <span style={{ color: "#EAEFEF" }}>|</span>
                <span style={{ fontWeight: 800, color: "#0B2830" }}>${totalEstCost.toFixed(3)}</span>
              </div>
            </div>

            {isGeneratingVideo ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, padding: "32px 0" }}>
                <SpinnerRing />
                <div style={{ textAlign: "center" }}>
                  <LoadingDots label={pollingJobId ? "Google Veo compositing on Cloud" : "Generating your video"} />
                  <p style={{ margin: "8px 0 0", fontSize: "0.82rem", color: "#64848D" }}>{aiModel} · {resolution} · {duration}s</p>
                  {pollingJobId && (
                    <div style={{ background: "#DBEAFE", color: "#1E40AF", padding: "6px 14px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 700, marginTop: 10, display: "inline-block" }}>
                      📡 Polling Google Cloud (Job ID: {pollingJobId.slice(0, 8)}...) — Checked every 5s
                    </div>
                  )}
                </div>
                <div style={{ width: "100%", maxWidth: 420, background: "#EAF0F2", borderRadius: 99, height: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: "linear-gradient(90deg, #11B5BB, #0E9C9F)", borderRadius: 99, width: `${Math.min(generationProgress, 100)}%`, transition: "width 1.5s ease" }} />
                </div>
                <p style={{ fontSize: "0.75rem", color: "#A4B6B9", margin: 0 }}>
                  {pollingJobId ? "Google Vertex AI is synthesizing high-definition cinematic frames..." : generationProgress < 30 ? "Initializing model…" : generationProgress < 60 ? "Rendering frames…" : generationProgress < 90 ? "Compositing output…" : "Finalizing…"}
                </p>
              </div>
            ) : (
              <button style={{ ...tealBtn, fontSize: "1rem", padding: "14px 32px" }} className="aivg-tb" onClick={handleGenerateVideo}>
                <FaPlay /> Generate Video
              </button>
            )}
          </div>
        )}

        {/* ── Section 4: Output ─────────────────────────────────────────────── */}
        {isDone && generatedVideos.length > 0 && (
          <div style={card} className="aivg-animate">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
              <div style={iconWrap("#166534")}><FaCheckCircle /></div>
              <div>
                <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0B2830" }}>Generated Videos</h2>
                <p style={{ margin: "2px 0 0", fontSize: "0.76rem", color: "#64848D" }}>Preview · automatically saved to Media Library</p>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {generatedVideos.map((vid, idx) => (
                <div key={vid.mediaId} style={{ borderRadius: 16, overflow: "hidden", border: "1.5px solid #EAF0F2" }}>
                  <div style={{ background: "#0B2830", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ color: "#fff", fontSize: "0.82rem", fontWeight: 600 }}>Video {idx + 1} of {generatedVideos.length}</span>
                    <span style={{ background: "#DCFCE7", color: "#166534", padding: "3px 10px", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700 }}>✓ Saved</span>
                  </div>
                  <video className="aivg-video-preview" src={vid.videoUrl} controls autoPlay={idx === 0} muted />
                  <div style={{ background: "#F8FAFB", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <span style={{ fontSize: "0.76rem", color: "#64848D", fontFamily: "monospace" }}>{vid.videoUrl}</span>
                    <a href={vid.videoUrl} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, color: "#11B5BB", fontSize: "0.8rem", fontWeight: 700, textDecoration: "none" }}>
                      <FaExternalLinkAlt size={11} /> Open Link
                    </a>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24 }}>
              <button style={orangeBtn} className="aivg-ob" onClick={handleReset}><FaFilm /> Generate Another</button>
            </div>
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────────── */}
        {isError && (
          <div className="aivg-animate" style={{ background: "#FFF5F5", border: "1.5px solid #FED7D7", borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ fontSize: "1.3rem" }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#C53030", fontSize: "0.9rem" }}>Something went wrong</p>
              <p style={{ margin: "0 0 14px", color: "#744210", fontSize: "0.84rem", lineHeight: 1.5 }}>{errorMsg}</p>
              <button style={{ ...ghostBtn, borderColor: "#FEB2B2", color: "#C53030" }} onClick={() => setStatus(refinedPrompt ? "prompt-ready" : "idle")}>Try Again</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AIVideoGenerationView;
