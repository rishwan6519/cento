"use client";
import React, { useEffect, useRef, useState } from "react";
import { FiUpload, FiList, FiMonitor, FiCheck } from "react-icons/fi";
import { FaPlay, FaTrash, FaSearch } from "react-icons/fa";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MediaItem {
  _id: string;
  name: string;
  type: string;
  uploadMonth?: string;
  url?: string;
}

interface DeviceItem {
  _id: string;
  name: string;
  serialNumber?: string;
  status?: string;
}

interface PlaylistCfg {
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  daysOfWeek: string[];
  globalMinVolume: number;
  globalMaxVolume: number;
  selectedDeviceId: string;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function typeColor(type: string) {
  const t = (type || "").toLowerCase();
  if (t.includes("video")) return { bg: "#e0f2fe", color: "#0369a1" };
  if (t.includes("audio")) return { bg: "#dcfce7", color: "#16a34a" };
  if (t.includes("image")) return { bg: "#fef9c3", color: "#ca8a04" };
  return { bg: "#f1f5f9", color: "#475569" };
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  backgroundColor: "#f8fafc",
  color: "#334155",
  fontSize: "0.85rem",
  outline: "none",
  fontFamily: "Inter, sans-serif",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.78rem",
  fontWeight: 600,
  color: "#334155",
  marginBottom: "6px",
};

// ─── Step Header ──────────────────────────────────────────────────────────────
const StepHeader: React.FC<{ num: number; title: string; sub: string }> = ({ num, title, sub }) => (
  <div style={{ background: "#10353C", borderRadius: "12px 12px 0 0", padding: "16px 24px", display: "flex", alignItems: "center", gap: "16px" }}>
    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#FF5C16", color: "#fff", fontWeight: 700, fontSize: "0.95rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {num}
    </div>
    <div>
      <p style={{ margin: 0, fontWeight: 700, color: "#fff", fontSize: "1rem" }}>{title}</p>
      <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8" }}>{sub}</p>
    </div>
  </div>
);

// ─── Volume Slider ─────────────────────────────────────────────────────────────
const VolumeSlider: React.FC<{
  min: number; max: number;
  onChangeMin: (v: number) => void;
  onChangeMax: (v: number) => void;
}> = ({ min, max, onChangeMin, onChangeMax }) => (
  <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "18px 20px", border: "1px solid #e2e8f0" }}>
    <p style={{ margin: "0 0 14px", fontWeight: 700, fontSize: "0.88rem", color: "#10353C" }}>Global volume settings</p>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.8rem", fontWeight: 700 }}>
      <span style={{ color: "#3B82F6" }}>Min : {min}%</span>
      <span style={{ color: "#EF4444" }}>Max : {max}%</span>
    </div>
    <div style={{ position: "relative", height: "8px", borderRadius: "4px", background: "#fca5a5", margin: "0 0 6px" }}>
      <div style={{ position: "absolute", left: `${min}%`, width: `${max - min}%`, height: "100%", background: "#FF5C16", borderRadius: "4px" }} />
      <input type="range" min={0} max={100} value={min}
        onChange={e => onChangeMin(Math.min(Number(e.target.value), max - 5))}
        style={{ position: "absolute", width: "100%", opacity: 0, height: "100%", cursor: "pointer", zIndex: 2 }} />
      <input type="range" min={0} max={100} value={max}
        onChange={e => onChangeMax(Math.max(Number(e.target.value), min + 5))}
        style={{ position: "absolute", width: "100%", opacity: 0, height: "100%", cursor: "pointer", zIndex: 3 }} />
    </div>
    <button style={{ marginTop: "12px", padding: "7px 16px", background: "#fff", border: "1px solid #FF5C16", color: "#10353C", borderRadius: "6px", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
      Apply volume for all files
    </button>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
interface CreatePlaylistViewProps {
  onNavigate?: (view: any) => void;
}

const CreatePlaylistView: React.FC<CreatePlaylistViewProps> = ({ onNavigate }) => {
  const [sourceMode, setSourceMode] = useState<"none" | "upload" | "existing">("none");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterType, setFilterType] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [confirmedFiles, setConfirmedFiles] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);

  const [cfg, setCfg] = useState<PlaylistCfg>({
    name: "", type: "", startDate: "", endDate: "",
    startTime: "", endTime: "",
    daysOfWeek: ["Tue", "Fri"],
    globalMinVolume: 30, globalMaxVolume: 80,
    selectedDeviceId: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") ?? "" : "";

  // Fetch existing media from library
  useEffect(() => {
    if (sourceMode !== "existing") return;
    setLoadingMedia(true);
    fetch(`/api/media?userId=${userId}`)
      .then(r => r.json())
      .then(d => setMediaItems(d.media || d.mediaFiles || d.data || []))
      .catch(() => toast.error("Failed to load media"))
      .finally(() => setLoadingMedia(false));
  }, [sourceMode]);

  // Fetch real devices assigned to this store
  useEffect(() => {
    if (!userId) return;
    setLoadingDevices(true);
    fetch(`/api/assign-device?userId=${userId}`)
      .then(r => r.json())
      .then(d => {
        const assignments = d.data || [];
        setDevices(assignments.map((a: any) => ({
          _id: a.deviceId?._id || a._id,
          name: a.deviceId?.name || "Unknown Device",
          serialNumber: a.deviceId?.serialNumber || "N/A",
          status: a.deviceId?.status || "inactive",
        })));
      })
      .catch(() => setDevices([]))
      .finally(() => setLoadingDevices(false));
  }, [userId]);

  const filteredMedia = mediaItems.filter(m => {
    const matchType = filterType ? (m.type || "").toLowerCase().includes(filterType.toLowerCase()) : true;
    const matchMonth = filterMonth ? (m.uploadMonth || "").toLowerCase().includes(filterMonth.toLowerCase()) : true;
    const matchSearch = filterSearch ? (m.name || "").toLowerCase().includes(filterSearch.toLowerCase()) : true;
    return matchType && matchMonth && matchSearch;
  });

  const toggleDay = (d: string) =>
    setCfg(p => ({ ...p, daysOfWeek: p.daysOfWeek.includes(d) ? p.daysOfWeek.filter(x => x !== d) : [...p.daysOfWeek, d] }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(files);
  };

  const handleConfirmExisting = () => {
    if (selectedIds.length === 0) { toast.error("No files selected"); return; }
    setConfirmedFiles(selectedIds);
    toast.success(`${selectedIds.length} file(s) confirmed`);
  };

  const handleSubmit = async () => {
    if (!cfg.name) { toast.error("Playlist name is required"); return; }
    
    if (sourceMode === "upload" && uploadedFiles.length === 0) { toast.error("Please explicitly select a media file to upload"); return; }
    if (sourceMode === "existing" && confirmedFiles.length === 0) { toast.error("Please confirm your selection for existing files"); return; }
    
    setSubmitting(true);
    let finalMediaIds = [...confirmedFiles];

    try {
      // 1) Handle file upload if we're in upload mode
      if (sourceMode === "upload" && uploadedFiles.length > 0) {
        const formData = new FormData();
        formData.append("userId", userId);
        formData.append("userRole", "store");
        uploadedFiles.forEach((file, index) => {
          formData.append(`files[${index}]`, file);
          formData.append(`fileNames[${index}]`, file.name);
        });

        const uploadRes = await fetch("/api/media/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        
        if (uploadData.success) {
          finalMediaIds = uploadData.files.map((f: any) => f._id || f.id);
          // Optional async refetch for existing list next time
          fetch(`/api/media?userId=${userId}`)
            .then(r => r.json())
            .then(d => setMediaItems(d.media || d.mediaFiles || d.data || []));
        } else {
          toast.error(uploadData.message || "Failed to upload files");
          setSubmitting(false);
          return;
        }
      }

      // 2) Save Playlist Data
      const body = { userId, ...cfg, mediaIds: finalMediaIds };
      const res = await fetch("/api/playlists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      
      if (data.success) { 
        toast.success("Playlist created and saved!"); 
        if (onNavigate) onNavigate("dashboard"); else window.history.back(); 
      }
      else { toast.error(data.message || "Failed to create playlist"); }
    } catch { toast.error("Network error"); }
    finally { setSubmitting(false); }
  };

  const showExistingTable = sourceMode === "existing" && confirmedFiles.length === 0;
  const playlistStep = sourceMode !== "none";
  const stepNum = showExistingTable ? 3 : (playlistStep ? 2 : undefined);

  return (
    <div style={{ fontFamily: "Inter, sans-serif", display: "flex", flexDirection: "column", gap: "20px", maxWidth: 900, margin: "0 auto" }}>

      {/* ── STEP 1: Select Media ──────────────────────────────────────────────── */}
      <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <StepHeader num={1} title="Select media" sub="Audio, video, image. Size upto 5kb" />
        <div style={{ background: "#fff", padding: "24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: sourceMode === "upload" ? "20px" : 0 }}>
            {/* Upload New */}
            <button
              onClick={() => { setSourceMode("upload"); setConfirmedFiles([]); fileInputRef.current?.click(); }}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px",
                padding: "28px 16px", borderRadius: "10px", cursor: "pointer",
                border: `2px dashed ${sourceMode === "upload" ? "#FF5C16" : "#f97316"}`,
                background: sourceMode === "upload" ? "#fff8f5" : "#fff",
                transition: "all 0.2s",
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: "8px", background: "#fff3ee", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF5C16" }}>
                <FiUpload size={22} />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: 0, fontWeight: 700, color: "#10353C", fontSize: "0.9rem" }}>Upload new</p>
                <p style={{ margin: "4px 0 0", fontSize: "0.72rem", color: "#94a3b8" }}>Add media from your device</p>
              </div>
            </button>

            {/* Select from Existing */}
            <button
              onClick={() => { setSourceMode("existing"); setConfirmedFiles([]); }}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px",
                padding: "28px 16px", borderRadius: "10px", cursor: "pointer",
                border: `2px dashed ${sourceMode === "existing" ? "#FF5C16" : "#f97316"}`,
                background: sourceMode === "existing" ? "#fff8f5" : "#fff",
                transition: "all 0.2s",
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: "8px", background: "#fff3ee", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF5C16" }}>
                <FiList size={22} />
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ margin: 0, fontWeight: 700, color: "#10353C", fontSize: "0.9rem" }}>Select from existing list</p>
                <p style={{ margin: "4px 0 0", fontSize: "0.72rem", color: "#94a3b8" }}>Choose from previously uploaded media</p>
              </div>
            </button>
          </div>

          {/* Upload panel */}
          {sourceMode === "upload" && (
            <div style={{ marginTop: "20px" }}>
              <label style={labelStyle}>Upload files</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{ border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 14px", cursor: "pointer", background: "#f8fafc", color: uploadedFiles.length > 0 ? "#334155" : "#94a3b8", fontSize: "0.85rem", minHeight: 44, display: "flex", alignItems: "center" }}
              >
                {uploadedFiles.length > 0 ? uploadedFiles.map(f => f.name).join(", ") : "Click to select files from your device…"}
              </div>
              <input ref={fileInputRef} type="file" multiple hidden accept="audio/*,video/*,image/*" onChange={handleFileChange} />

              {uploadedFiles.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px" }}>
                  <span style={{ fontSize: "0.8rem", color: "#FF5C16", fontWeight: 600 }}>{uploadedFiles.length} file(s) ready to upload on save</span>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button style={{ padding: "8px 18px", border: "1px solid #e2e8f0", borderRadius: "6px", background: "#fff", color: "#334155", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}>Preview selected media</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── STEP 2: Select from Existing List table ────────────────────────────── */}
      {showExistingTable && (
        <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <StepHeader num={2} title="Select from existing list" sub="Choose from previously uploaded media" />
          <div style={{ background: "#fff", padding: "24px" }}>
            {/* Filters */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                <span style={{ fontSize: "0.78rem", color: "#64748B", whiteSpace: "nowrap" }}>Filter by</span>
                <div style={{ position: "relative", flex: 1 }}>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...inputStyle, paddingRight: 32, appearance: "none" }}>
                    <option value="">File type</option>
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                    <option value="image">Image</option>
                  </select>
                </div>
                <div style={{ position: "relative", flex: 1 }}>
                  <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ ...inputStyle, paddingRight: 32, appearance: "none" }}>
                    <option value="">All months</option>
                    <option value="january">January 2026</option>
                    <option value="february">February 2026</option>
                    <option value="march">March 2026</option>
                  </select>
                </div>
              </div>
              <div style={{ position: "relative" }}>
                <FaSearch style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "0.8rem" }} />
                <input value={filterSearch} onChange={e => setFilterSearch(e.target.value)} placeholder="Search…" style={{ ...inputStyle, paddingLeft: 30, width: 160 }} />
              </div>
            </div>

            {/* Table */}
            <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ width: 40, padding: "10px 14px", textAlign: "left" }}>
                      <input type="checkbox" onChange={e => setSelectedIds(e.target.checked ? filteredMedia.map(m => m._id) : [])} checked={selectedIds.length === filteredMedia.length && filteredMedia.length > 0} />
                    </th>
                    {["MEDIA NAME", "TYPE", "UPLOAD MONTH", "PREVIEW", ""].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: "0.72rem", color: "#64748B", letterSpacing: "0.04em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingMedia ? (
                    <tr><td colSpan={6} style={{ padding: "24px", textAlign: "center", color: "#94a3b8" }}>Loading media…</td></tr>
                  ) : filteredMedia.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: "24px", textAlign: "center", color: "#94a3b8" }}>No media files found.</td></tr>
                  ) : filteredMedia.map((m, i) => {
                    const tc = typeColor(m.type);
                    const isSelected = selectedIds.includes(m._id);
                    return (
                      <tr key={m._id} style={{ borderTop: "1px solid #f1f5f9", background: isSelected ? "#fff8f5" : i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "12px 14px" }}>
                          <input type="checkbox" checked={isSelected} onChange={() => setSelectedIds(p => p.includes(m._id) ? p.filter(x => x !== m._id) : [...p, m._id])} />
                        </td>
                        <td style={{ padding: "12px 14px", fontWeight: 600, color: "#1e293b" }}>{m.name}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ background: tc.bg, color: tc.color, padding: "3px 10px", borderRadius: "20px", fontSize: "0.72rem", fontWeight: 700 }}>{m.type}</span>
                        </td>
                        <td style={{ padding: "12px 14px", color: "#64748B" }}>{m.uploadMonth || "—"}</td>
                        <td style={{ padding: "12px 14px" }}>
                          {m.url && (
                            <button style={{ display: "flex", alignItems: "center", gap: "6px", color: "#FF5C16", background: "none", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "0.8rem" }}>
                              <FaPlay size={10} /> Preview
                            </button>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <button style={{ color: "#fca5a5", background: "none", border: "none", cursor: "pointer" }}><FaTrash size={13} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Confirm existing selection */}
            {selectedIds.length > 0 && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "14px" }}>
                <button onClick={handleConfirmExisting} style={{ padding: "10px 24px", background: "#FF5C16", border: "none", borderRadius: "8px", color: "#fff", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}>
                  Confirm selection ({selectedIds.length})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STEP 2/3: Set up Playlist ──────────────────────────────────────────── */}
      {playlistStep && (
        <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <StepHeader
            num={showExistingTable ? 3 : 2}
            title="Let's setup your playlist"
            sub="Setup your playlist here"
          />
          <div style={{ background: "#fff", padding: "28px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Name + Type */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={labelStyle}>Playlist name</label>
                <input style={inputStyle} placeholder="Enter playlist name" value={cfg.name} onChange={e => setCfg(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>Type</label>
                <select style={{ ...inputStyle, appearance: "none" }} value={cfg.type} onChange={e => setCfg(p => ({ ...p, type: e.target.value }))}>
                  <option value="">Select type</option>
                  <option value="audio">Audio</option>
                  <option value="video">Video</option>
                  <option value="image">Image</option>
                </select>
              </div>
            </div>

            {/* Start + End date */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={labelStyle}>Start date</label>
                <input style={inputStyle} type="text" placeholder="dd-mm-yyyy" value={cfg.startDate} onChange={e => setCfg(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>End date</label>
                <input style={inputStyle} type="text" placeholder="dd-mm-yyyy" value={cfg.endDate} onChange={e => setCfg(p => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>

            {/* Start + End time */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={labelStyle}>Start time</label>
                <input style={inputStyle} type="text" placeholder="--:--" value={cfg.startTime} onChange={e => setCfg(p => ({ ...p, startTime: e.target.value }))} />
              </div>
              <div>
                <label style={labelStyle}>End time</label>
                <input style={inputStyle} type="text" placeholder="--:--" value={cfg.endTime} onChange={e => setCfg(p => ({ ...p, endTime: e.target.value }))} />
              </div>
            </div>

            {/* Days of the week */}
            <div>
              <label style={labelStyle}>Days of the week</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "6px" }}>
                {DAYS.map(d => {
                  const active = cfg.daysOfWeek.includes(d);
                  return (
                    <button key={d} onClick={() => toggleDay(d)} style={{ width: 44, height: 36, borderRadius: "6px", border: "1px solid #e2e8f0", background: active ? "#FF5C16" : "#fff", color: active ? "#fff" : "#64748B", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Volume */}
            <VolumeSlider
              min={cfg.globalMinVolume} max={cfg.globalMaxVolume}
              onChangeMin={v => setCfg(p => ({ ...p, globalMinVolume: v }))}
              onChangeMax={v => setCfg(p => ({ ...p, globalMaxVolume: v }))}
            />

            {/* Select device */}
            <div>
              <label style={labelStyle}>Select device</label>
              {loadingDevices ? (
                <div style={{ padding: "16px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>Loading devices…</div>
              ) : devices.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem", border: "1px dashed #e2e8f0", borderRadius: "8px" }}>
                  No devices connected to this store.
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px", marginTop: "8px" }}>
                  {devices.map(d => {
                    const isSelected = cfg.selectedDeviceId === d._id;
                    const isOnline = (d.status || "").toLowerCase() === "active" || (d.status || "").toLowerCase() === "online";
                    return (
                      <div
                        key={d._id}
                        onClick={() => setCfg(p => ({ ...p, selectedDeviceId: isSelected ? "" : d._id }))}
                        style={{ border: `2px solid ${isSelected ? "#FF5C16" : "#e2e8f0"}`, background: isSelected ? "#fff8f5" : "#fff", borderRadius: "10px", padding: "14px", cursor: "pointer", position: "relative", transition: "all 0.15s" }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ color: "#FF5C16", background: "#fff5f2", padding: "8px", borderRadius: "6px" }}>
                            <FiMonitor size={16} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: "0 0 2px", fontSize: "0.82rem", fontWeight: 700, color: "#10353C", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</p>
                            <span style={{ fontSize: "0.7rem", fontWeight: 600, color: isOnline ? "#22c55e" : "#ef4444" }}>
                              {isOnline ? "● Online" : "● Offline"}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <div style={{ position: "absolute", top: "10px", right: "10px", color: "#FF5C16" }}>
                            <FiCheck size={14} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer buttons */}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
              <button 
                onClick={() => onNavigate ? onNavigate("dashboard") : window.history.back()} 
                style={{ padding: "10px 28px", background: "#fff", border: "1px solid #e2e8f0", color: "#64748B", borderRadius: "8px", fontWeight: 600, fontSize: "0.88rem", cursor: "pointer" }}
              >
                Reset
              </button>
              <button onClick={handleSubmit} disabled={submitting} style={{ padding: "10px 24px", background: submitting ? "#94a3b8" : "#FF5C16", border: "none", color: "#fff", borderRadius: "8px", fontWeight: 600, fontSize: "0.88rem", cursor: submitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/><path d="M8 12l4-4 4 4M12 8v8"/></svg>
                {submitting ? "Creating…" : "Connect playlist to device"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePlaylistView;
