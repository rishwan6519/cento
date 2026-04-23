"use client";
import React, { useEffect, useState } from "react";
import { FiVideo, FiMusic, FiImage, FiPlus, FiCheck, FiMonitor, FiTrash2 } from "react-icons/fi";
import { MdOutlinePlaylistPlay } from "react-icons/md";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MediaItem {
  _id: string;
  name: string;
  type: string;
  url?: string;
  duration?: string;
}

interface DeviceItem {
  _id: string;
  name: string;
  serialNumber?: string;
  status?: string;
  typeId?: { name: string };
}

interface CreateInstantPlaylistProps {
  onNavigate?: (view: any) => void;
}

const CreateInstantPlaylist: React.FC<CreateInstantPlaylistProps> = ({ onNavigate }) => {
  const [activeMediaFilter, setActiveMediaFilter] = useState("All");
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [playlistItems, setPlaylistItems] = useState<MediaItem[]>([]);

  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") ?? "" : "";

  // Fetch real media from library
  useEffect(() => {
    if (!userId) return;
    setLoadingMedia(true);
    fetch(`/api/media?userId=${userId}`)
      .then(r => r.json())
      .then(data => setMediaItems(data.media || data.mediaFiles || data.data || []))
      .catch(() => {
        setMediaItems([]);
        toast.error("Failed to load media");
      })
      .finally(() => setLoadingMedia(false));
  }, [userId]);

  // Fetch real devices under this store
  useEffect(() => {
    if (!userId) return;
    setLoadingDevices(true);
    fetch(`/api/assign-device?userId=${userId}`)
      .then(r => r.json())
      .then(d => {
        const assignments = d.data || [];
        const mapped: DeviceItem[] = assignments.map((a: any) => ({
          _id: a.deviceId?._id || a._id,
          name: a.deviceId?.name || "Unknown Device",
          serialNumber: a.deviceId?.serialNumber || "N/A",
          status: a.deviceId?.status || "inactive",
          typeId: a.deviceId?.typeId,
        }));
        setDevices(mapped);
      })
      .catch(() => setDevices([]))
      .finally(() => setLoadingDevices(false));
  }, [userId]);

  const getMediaIcon = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("video")) return <div style={{ color: "#FF5C16", backgroundColor: "#fff5f2", padding: "8px", borderRadius: "6px" }}><FiVideo size={16} /></div>;
    if (t.includes("audio")) return <div style={{ color: "#22c55e", backgroundColor: "#f0fdf4", padding: "8px", borderRadius: "6px" }}><FiMusic size={16} /></div>;
    if (t.includes("image")) return <div style={{ color: "#a855f7", backgroundColor: "#faf5ff", padding: "8px", borderRadius: "6px" }}><FiImage size={16} /></div>;
    return <div style={{ color: "#64748b", backgroundColor: "#f8fafc", padding: "8px", borderRadius: "6px" }}><FiMonitor size={16} /></div>;
  };

  const filteredMedia = mediaItems.filter(m => {
    if (activeMediaFilter === "All") return true;
    return (m.type || "").toLowerCase().includes(activeMediaFilter.toLowerCase());
  });

  const addToPlaylist = (m: MediaItem) => {
    if (playlistItems.find(p => p._id === m._id)) {
      toast("Already in playlist", { icon: "ℹ️" });
      return;
    }
    setPlaylistItems(prev => [...prev, m]);
  };

  const removeFromPlaylist = (id: string) => setPlaylistItems(prev => prev.filter(p => p._id !== id));

  const toggleDevice = (id: string) =>
    setSelectedDevices(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Playlist name is required"); return; }
    if (playlistItems.length === 0) { toast.error("Add at least one media item"); return; }
    if (selectedDevices.length === 0) { toast.error("Select at least one device"); return; }
    setSubmitting(true);
    try {
      const body = { userId, name, category, endDate, endTime, description, mediaIds: playlistItems.map(p => p._id), deviceIds: selectedDevices };
      const res = await fetch("/api/playlists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) { 
        toast.success("Instant playlist created!"); 
        if (onNavigate) onNavigate("dashboard"); else window.history.back(); 
      }
      else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setSubmitting(false); }
  };

  const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", color: "#1a2c35", fontSize: "0.85rem", outline: "none", fontFamily: "inherit", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#1a2c35", marginBottom: "8px" };

  return (
    <div style={{ fontFamily: "Inter, sans-serif" }}>
      <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#10353C", margin: "0 0 6px" }}>Create New Instant Playlist</h2>
      <p style={{ fontSize: "0.85rem", color: "#64748B", margin: "0 0 24px" }}>Build instant playlist by selecting and ordering media files</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* ── Instant Playlist Information ──────────────────────────────── */}
        <div style={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "24px" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1a2c35", margin: "0 0 20px" }}>Instant Playlist Information</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", gap: "20px" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Instant playlist name <span style={{ color: "#ef4444" }}>*</span></label>
                <input style={inputStyle} placeholder="e.g., Summer Campaign 2024" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Category</label>
                <select style={{ ...inputStyle, appearance: "none" }} value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="">Select category</option>
                  <option value="promotional">Promotional</option>
                  <option value="educational">Educational</option>
                  <option value="ambient">Ambient</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: "20px" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>End date <span style={{ color: "#ef4444" }}>*</span></label>
                <input style={inputStyle} placeholder="dd-mm-yyyy" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>End time <span style={{ color: "#ef4444" }}>*</span></label>
                <input style={inputStyle} placeholder="--:--" value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea style={{ ...inputStyle, minHeight: "80px", resize: "none" }} value={description} onChange={e => setDescription(e.target.value)} />
            </div>
          </div>
        </div>

        {/* ── Media Selection ───────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: "20px" }}>

          {/* Available Media (real) */}
          <div style={{ flex: 2, backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1a2c35", margin: 0 }}>Available Media</h3>
              <div style={{ display: "flex", gap: "8px", marginLeft: "auto", flexWrap: "wrap" }}>
                {["All", "Audio", "Video", "Image"].map(f => (
                  <button key={f} onClick={() => setActiveMediaFilter(f)} style={{ padding: "5px 12px", borderRadius: "16px", border: activeMediaFilter === f ? "none" : "1px solid #e2e8f0", backgroundColor: activeMediaFilter === f ? "#FF5C16" : "#fff", color: activeMediaFilter === f ? "#fff" : "#64748B", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {loadingMedia ? (
              <div style={{ padding: "32px", textAlign: "center", color: "#94a3b8" }}>Loading media…</div>
            ) : filteredMedia.length === 0 ? (
              <div style={{ padding: "32px", textAlign: "center", color: "#94a3b8", border: "1px dashed #e2e8f0", borderRadius: "8px" }}>
                No media files found. Upload media first.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: 320, overflowY: "auto" }}>
                {filteredMedia.map(m => (
                  <div key={m._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", border: "1px solid #f1f5f9", borderRadius: "8px", backgroundColor: "#fafbfc" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                      {getMediaIcon(m.type)}
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "#1a2c35", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</p>
                        <p style={{ margin: 0, fontSize: "0.72rem", color: "#64748B" }}>{m.type}{m.duration ? ` • ${m.duration}` : ""}</p>
                      </div>
                    </div>
                    <button onClick={() => addToPlaylist(m)} style={{ background: "none", border: "none", color: "#22c55e", cursor: "pointer", flexShrink: 0, marginLeft: 8 }}>
                      <FiPlus size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Playlist Items */}
          <div style={{ flex: 1.5, backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "24px" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1a2c35", margin: "0 0 20px" }}>Playlist Items ({playlistItems.length})</h3>
            {playlistItems.length === 0 ? (
              <div style={{ height: "280px", border: "1px dashed #cbd5e1", borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", backgroundColor: "#f8fafc" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: "1px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
                  <FiPlus size={20} />
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ margin: "0 0 4px", fontSize: "0.85rem", fontWeight: 600, color: "#64748B" }}>No items added yet</p>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8" }}>Add media from the left panel</p>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: 320, overflowY: "auto" }}>
                {playlistItems.map((m, i) => (
                  <div key={m._id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff" }}>
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8", minWidth: 18 }}>{i + 1}</span>
                    {getMediaIcon(m.type)}
                    <span style={{ flex: 1, fontSize: "0.82rem", fontWeight: 600, color: "#1a2c35", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                    <button onClick={() => removeFromPlaylist(m._id)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", flexShrink: 0 }}>
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Select Device (real devices under this store) ───────────── */}
        <div style={{ backgroundColor: "#F8FAFC", borderRadius: "12px", padding: "24px", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: "1rem", fontWeight: 700, color: "#10353C" }}>Select device</h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748B" }}>Choose which device will play this playlist</p>
            </div>
            {devices.length > 0 && (
              <button onClick={() => setSelectedDevices(devices.map(d => d._id))} style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #FF5C16", color: "#FF5C16", backgroundColor: "#fff", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}>
                Select All
              </button>
            )}
          </div>

          {loadingDevices ? (
            <div style={{ padding: "24px", textAlign: "center", color: "#94a3b8" }}>Loading devices…</div>
          ) : devices.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#94a3b8", border: "1px dashed #e2e8f0", borderRadius: "10px", background: "#fff" }}>
              No devices connected to this store yet.
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "14px" }}>
              {devices.map(d => {
                const isSelected = selectedDevices.includes(d._id);
                const isOnline = (d.status || "").toLowerCase() === "active" || (d.status || "").toLowerCase() === "online";
                return (
                  <div
                    key={d._id}
                    onClick={() => toggleDevice(d._id)}
                    style={{ border: `2px solid ${isSelected ? "#FF5C16" : "#e2e8f0"}`, backgroundColor: isSelected ? "#fff8f5" : "#fff", borderRadius: "12px", padding: "16px", cursor: "pointer", position: "relative", transition: "all 0.15s" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ color: "#FF5C16", backgroundColor: "#fff5f2", padding: "10px", borderRadius: "8px" }}>
                        <FiMonitor size={20} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: "0 0 3px", fontSize: "0.85rem", fontWeight: 700, color: "#10353C", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {d.name}
                          <span style={{ color: isOnline ? "#22c55e" : "#ef4444", fontSize: "20px", lineHeight: "8px", verticalAlign: "middle", marginLeft: 4 }}>•</span>
                        </p>
                        <p style={{ margin: "0 0 2px", fontSize: "0.72rem", color: "#64748B" }}>SN: {d.serialNumber}</p>
                        <span style={{ fontSize: "0.7rem", fontWeight: 600, color: isOnline ? "#22c55e" : "#ef4444" }}>
                          {isOnline ? "Online" : "Offline"}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <div style={{ position: "absolute", top: "12px", right: "12px", color: "#FF5C16", backgroundColor: "#fff5f2", borderRadius: "50%", padding: "2px" }}>
                        <FiCheck size={13} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {selectedDevices.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", backgroundColor: "#f0fdf4", borderRadius: "8px", border: "1px dashed #bbf7d0", marginTop: "16px" }}>
              <div>
                <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: "0.85rem", color: "#166534" }}>{selectedDevices.length} device{selectedDevices.length !== 1 ? "s" : ""} selected</p>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "#64748B" }}>Ready to push playlist</p>
              </div>
              <button onClick={() => setSelectedDevices([])} style={{ border: "none", background: "none", color: "#ef4444", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>
                Clear Selection
              </button>
            </div>
          )}
        </div>

        {/* ── Action Buttons ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: "12px", marginTop: "4px" }}>
          <button onClick={handleSubmit} disabled={submitting} style={{ padding: "12px 28px", backgroundColor: submitting ? "#94a3b8" : "#FF5C16", border: "none", color: "#fff", borderRadius: "8px", fontWeight: 600, fontSize: "0.9rem", cursor: submitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
            <MdOutlinePlaylistPlay size={20} />
            {submitting ? "Creating…" : "Create instant playlist"}
          </button>
          <button onClick={() => onNavigate ? onNavigate("dashboard") : window.history.back()} style={{ padding: "12px 28px", backgroundColor: "#fff", border: "1px solid #e2e8f0", color: "#64748B", borderRadius: "8px", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer" }}>
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};

export default CreateInstantPlaylist;
