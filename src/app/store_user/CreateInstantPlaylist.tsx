"use client";
import React, { useEffect, useState } from "react";
import { FaPlus, FaTrash, FaMusic, FaVideo, FaImage, FaDesktop, FaCheck, FaStore, FaArrowLeft } from "react-icons/fa";
import { ViewKey } from "./page";

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
  address?: string;
  storeName?: string;
}

interface Props {
  onNavigate: (view: ViewKey) => void;
  editingPlaylist?: any;
}

export default function CreateInstantPlaylist({ onNavigate, editingPlaylist }: Props) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [playlistItems, setPlaylistItems] = useState<MediaItem[]>([]);
  const [activeFilter, setActiveFilter] = useState("All");

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

  // Populate from editingPlaylist
  useEffect(() => {
    if (editingPlaylist) {
      const formatDate = (d: any) => {
        if (!d) return "";
        const date = new Date(d);
        return isNaN(date.getTime()) ? "" : date.toISOString().split('T')[0];
      };

      setName(editingPlaylist.name || "");
      setCategory(editingPlaylist.type || "");
      setEndDate(formatDate(editingPlaylist.endDate));
      setEndTime(editingPlaylist.endTime || "");
      setDescription(editingPlaylist.description || "");
      setSelectedDevices(editingPlaylist.deviceIds || []);
      
      if (editingPlaylist.files && editingPlaylist.files.length > 0) {
        // Need to find the actual media objects from mediaItems once they load
        // But for now, we'll map the IDs
      }
    }
  }, [editingPlaylist]);

  useEffect(() => {
    if (!userId) return;
    setLoadingMedia(true);
    fetch(`/api/media?userId=${userId}`)
      .then(r => r.json())
      .then(data => setMediaItems(data.media || data.mediaFiles || data.data || []))
      .catch(() => setMediaItems([]))
      .finally(() => setLoadingMedia(false));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setLoadingDevices(true);
    fetch(`/api/assign-device?userId=${userId}`)
      .then(r => r.json())
      .then(d => {
        const assignments = d.data || [];
        const individualDevices = assignments.map((a: any) => ({
          _id: a.deviceId?._id || a._id,
          name: a.deviceId?.name || "Unknown Device",
          serialNumber: a.deviceId?.serialNumber || "N/A",
          status: a.deviceId?.status || "inactive",
          address: a.userId?.storeLocation || "123 Main St, Sale, VIC 3850",
          storeName: a.userId?.storeName || a.userId?.username || "Store",
        }));
        setDevices(individualDevices);
      })
      .catch(() => setDevices([]))
      .finally(() => setLoadingDevices(false));
  }, [userId]);

  const getMediaIcon = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("video")) return <FaVideo />;
    if (t.includes("audio")) return <FaMusic />;
    if (t.includes("image")) return <FaImage />;
    return <FaDesktop />;
  };

  const getMediaIconColor = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("video")) return { bg: "#FFF5F2", color: "#F05A28" };
    if (t.includes("audio")) return { bg: "#F0FDF4", color: "#16A34A" };
    if (t.includes("image")) return { bg: "#F3E8FF", color: "#9333EA" };
    return { bg: "#F8FAFB", color: "#64848D" };
  };

  const filteredMedia = mediaItems.filter(m => {
    if (activeFilter === "All") return true;
    return (m.type || "").toLowerCase().includes(activeFilter.toLowerCase());
  });

  const addToPlaylist = (m: MediaItem) => {
    if (!playlistItems.find(p => p._id === m._id)) {
      setPlaylistItems(prev => [...prev, m]);
    }
  };

  const removeFromPlaylist = (id: string) => setPlaylistItems(prev => prev.filter(p => p._id !== id));

  const toggleDevice = (id: string) =>
    setSelectedDevices(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    if (playlistItems.length === 0) return;
    if (selectedDevices.length === 0) return;
    setSubmitting(true);
    try {
      const body = { 
        userId, name, category, endDate, endTime, description, 
        mediaIds: playlistItems.map(p => p._id), 
        deviceIds: selectedDevices,
        id: editingPlaylist?._id || editingPlaylist?.id
      };
      const fetchMethod = editingPlaylist ? "PUT" : "POST";
      const res = await fetch("/api/playlists", { 
        method: fetchMethod, 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(body) 
      });
      const data = await res.json();
      if (data.success) onNavigate("dashboard");
    } catch { }
    finally { setSubmitting(false); }
  };

  return (
    <div className="su-instant-playlist-view">
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
        <button onClick={() => onNavigate("mediaManagement")} style={{ background: "none", border: "none", cursor: "pointer", color: "#162B30", display: "flex", alignItems: "center", padding: 0 }}>
          <FaArrowLeft size={18} />
        </button>
        <h1 className="su-ip-title" style={{ margin: 0 }}>Create New Instant Playlist</h1>
      </div>
      <p className="su-ip-subtitle" style={{ marginLeft: "30px" }}>Build instant playlist by selecting and ordering media files</p>

      {/* Instant Playlist Information */}
      <div className="su-ip-card">
        <h3 className="su-ip-card-title">Instant Playlist Information</h3>
        <div className="su-ip-form-grid">
          <div className="su-ip-form-group">
            <label>Instant playlist name <span className="su-required">*</span></label>
            <input type="text" placeholder="e.g., Immediate Sale Background" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="su-ip-form-group">
            <label>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">Select category</option>
              <option value="promotional">Promotional</option>
              <option value="educational">Educational</option>
              <option value="ambient">Ambient</option>
            </select>
          </div>
          <div className="su-ip-form-group">
            <label>Auto-stop date <span className="su-required">*</span></label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{width:'100%',padding:'12px 16px',border:'1px solid #EAEFEF',borderRadius:10}} />
          </div>
          <div className="su-ip-form-group">
            <label>Auto-stop time <span className="su-required">*</span></label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={{width:'100%',padding:'12px 16px',border:'1px solid #EAEFEF',borderRadius:10}} />
          </div>
        </div>
        <div className="su-ip-form-group su-ip-form-group--full">
          <label>Description</label>
          <textarea placeholder="Add a description..." value={description} onChange={e => setDescription(e.target.value)} />
        </div>
      </div>

      {/* Media Selection */}
      <div className="su-ip-media-row">
        {/* Available Media */}
        <div className="su-ip-card su-ip-media-available">
          <div className="su-ip-media-header">
            <h3 className="su-ip-card-title">Available Media</h3>
            <div className="su-ip-filter-pills">
              {["All", "Audio", "Video", "Image"].map(f => (
                <button
                  key={f}
                  className={`su-ip-filter-pill ${activeFilter === f ? "su-ip-filter-pill--active" : ""}`}
                  onClick={() => setActiveFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loadingMedia ? (
            <div className="su-ip-empty">Loading media…</div>
          ) : filteredMedia.length === 0 ? (
            <div className="su-ip-empty">No media files found. Upload media first.</div>
          ) : (
            <div className="su-ip-media-list">
              {filteredMedia.map(m => {
                const colors = getMediaIconColor(m.type);
                return (
                  <div key={m._id} className="su-ip-media-item">
                    <div className="su-ip-media-icon" style={{ backgroundColor: colors.bg, color: colors.color }}>
                      {getMediaIcon(m.type)}
                    </div>
                    <div className="su-ip-media-info">
                      <p className="su-ip-media-name">{m.name}</p>
                      <p className="su-ip-media-meta">{m.duration || "0:45"}</p>
                    </div>
                    <button className="su-ip-add-btn" onClick={() => addToPlaylist(m)}>
                      <FaPlus size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Playlist Items */}
        <div className="su-ip-card su-ip-playlist-items">
          <h3 className="su-ip-card-title">Playlist Items ({playlistItems.length})</h3>
          {playlistItems.length === 0 ? (
            <div className="su-ip-empty-playlist">
              <div className="su-ip-empty-icon">
                <FaPlus size={18} />
              </div>
              <p className="su-ip-empty-title">No items added yet</p>
              <p className="su-ip-empty-text">Add media from the left panel</p>
            </div>
          ) : (
            <div className="su-ip-media-list">
              {playlistItems.map((m, i) => {
                const colors = getMediaIconColor(m.type);
                return (
                  <div key={m._id} className="su-ip-media-item">
                    <span className="su-ip-item-number">{i + 1}</span>
                    <div className="su-ip-media-icon" style={{ backgroundColor: colors.bg, color: colors.color }}>
                      {getMediaIcon(m.type)}
                    </div>
                    <span className="su-ip-media-name" style={{ flex: 1 }}>{m.name}</span>
                    <button className="su-ip-remove-btn" onClick={() => removeFromPlaylist(m._id)}>
                      <FaTrash size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Select Stores */}
      <div className="su-ip-card su-ip-stores-section">
        <div className="su-ip-stores-header">
          <div>
            <h3 className="su-ip-card-title">Select stores</h3>
            <p className="su-ip-stores-subtitle">Choose which store will play this announcement</p>
          </div>
          {devices.length > 0 && (
            <button className="su-ip-select-all-btn" onClick={() => setSelectedDevices(devices.map(d => d._id))}>
              Select All
            </button>
          )}
        </div>

        {loadingDevices ? (
          <div className="su-ip-empty">Loading stores…</div>
        ) : devices.length === 0 ? (
          <div className="su-ip-empty">No stores connected yet.</div>
        ) : (
          <div className="su-ip-stores-grid">
            {devices.map(d => {
              const isSel = selectedDevices.includes(d._id);
              const isOnline = (d.status || "").toLowerCase() === "online";
              return (
                <div key={d._id} className={`su-ip-store-card ${isSel ? "su-ip-store-card--sel" : ""}`} onClick={() => toggleDevice(d._id)}>
                  <div className="su-ip-store-icon">
                    <FaStore size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="su-ip-store-name">{d.storeName} <span style={{ color: isOnline ? "#16A34A" : "#DC2626", fontSize: 10 }}>●</span></p>
                    <p style={{ fontSize: "0.75rem", color: "#64848D", marginBottom: 2 }}>{d.name} ({d.serialNumber})</p>
                    <p className="su-ip-store-addr">{d.address}</p>
                    <p style={{ fontSize: "0.7rem", fontWeight: 700, color: isOnline ? "#16A34A" : "#DC2626", marginTop: 4 }}>{isOnline ? "Active" : "Offline"}</p>
                  </div>
                  {isSel && (
                    <div className="su-ip-store-check">
                      <FaCheck size={8} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {selectedDevices.length > 0 && (
          <div className="su-ip-selection-bar">
            <div>
              <p className="su-ip-selection-count">{selectedDevices.length} store{selectedDevices.length !== 1 ? "s" : ""} selected</p>
              <p className="su-ip-selection-text">Ready to broadcast announcement</p>
            </div>
            <button className="su-ip-clear-btn" onClick={() => setSelectedDevices([])}>Clear Selection</button>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="su-ip-actions">
        <button
          className="su-ip-submit-btn"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Creating…" : "Create instant playlist"}
        </button>
      </div>

      <style>{`
        .su-instant-playlist-view { display: flex; flex-direction: column; gap: 24px; }
        .su-ip-title { font-size: 1.5rem; font-weight: 700; color: #162B30; margin-bottom: 0; }
        .su-ip-subtitle { font-size: 0.88rem; color: #64848D; margin-bottom: 4px; }

        .su-ip-card {
          background: #fff; border-radius: 14px; padding: 28px;
          border: 1px solid #EAEFEF;
        }
        .su-ip-card-title { font-size: 1.05rem; font-weight: 700; color: #162B30; margin-bottom: 20px; }
        .su-required { color: #DC2626; }

        .su-ip-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 24px; }
        @media (max-width: 600px) { .su-ip-form-grid { grid-template-columns: 1fr; } }
        .su-ip-form-group { display: flex; flex-direction: column; gap: 8px; }
        .su-ip-form-group--full { margin-top: 18px; }
        .su-ip-form-group label { font-size: 0.82rem; font-weight: 700; color: #162B30; }
        .su-ip-form-group input, .su-ip-form-group select {
          padding: 12px 16px; border: 1px solid #EAEFEF; border-radius: 10px;
          font-size: 0.88rem; color: #162B30; outline: none; background: #fff; font-family: inherit;
        }
        .su-ip-form-group textarea {
          padding: 12px 16px; border: 1px solid #EAEFEF; border-radius: 10px;
          font-size: 0.88rem; color: #162B30; outline: none; background: #fff; font-family: inherit;
          min-height: 80px; resize: none;
        }

        .su-ip-media-row { display: flex; gap: 24px; }
        @media (max-width: 900px) { .su-ip-media-row { flex-direction: column; } }
        .su-ip-media-available { flex: 1.2; }
        .su-ip-playlist-items { flex: 1; }

        .su-ip-media-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
        .su-ip-media-header .su-ip-card-title { margin-bottom: 0; }

        .su-ip-filter-pills { display: flex; gap: 8px; }
        .su-ip-filter-pill {
          padding: 5px 14px; border-radius: 20px; border: 1px solid #EAEFEF;
          background: #fff; color: #64848D; font-size: 0.78rem; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .su-ip-filter-pill--active { background: #F05A28; color: #fff; border-color: #F05A28; }

        .su-ip-media-list { display: flex; flex-direction: column; gap: 10px; max-height: 340px; overflow-y: auto; }
        .su-ip-media-item {
          display: flex; align-items: center; gap: 12px; padding: 12px 14px;
          border: 1px solid #F4F7F8; border-radius: 10px; background: #FAFCFC;
        }
        .su-ip-media-icon {
          width: 36px; height: 36px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.85rem; flex-shrink: 0;
        }
        .su-ip-media-info { flex: 1; min-width: 0; }
        .su-ip-media-name { font-size: 0.88rem; font-weight: 600; color: #162B30; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .su-ip-media-meta { font-size: 0.72rem; color: #A4B6B9; }
        .su-ip-item-number { font-size: 0.75rem; color: #A4B6B9; min-width: 18px; }

        .su-ip-add-btn {
          background: none; border: none; color: #16A34A; cursor: pointer;
          width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .su-ip-remove-btn {
          background: none; border: none; color: #DC2626; cursor: pointer;
          flex-shrink: 0;
        }

        .su-ip-empty { padding: 32px; text-align: center; color: #A4B6B9; font-size: 0.9rem; }
        .su-ip-empty-playlist {
          height: 280px; border: 1px dashed #D6E6E9; border-radius: 10px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 10px; background: #FAFCFC;
        }
        .su-ip-empty-icon {
          width: 44px; height: 44px; border-radius: 50%; border: 1px dashed #D6E6E9;
          display: flex; align-items: center; justify-content: center; color: #A4B6B9;
        }
        .su-ip-empty-title { font-size: 0.9rem; font-weight: 600; color: #64848D; }
        .su-ip-empty-text { font-size: 0.82rem; color: #A4B6B9; }

        /* Stores */
        .su-ip-stores-section { background: #F8FAFB; }
        .su-ip-stores-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .su-ip-stores-subtitle { font-size: 0.82rem; color: #64848D; margin-top: 4px; }
        .su-ip-select-all-btn {
          padding: 8px 18px; border-radius: 8px; border: 1px solid #F05A28;
          color: #F05A28; background: #fff; font-weight: 600; font-size: 0.82rem;
          cursor: pointer;
        }

        .su-ip-stores-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;
        }
        @media (max-width: 900px) { .su-ip-stores-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .su-ip-stores-grid { grid-template-columns: 1fr; } }

        .su-ip-store-card {
          display: flex; align-items: center; gap: 12px; padding: 16px;
          border: 2px solid #EAEFEF; border-radius: 14px; cursor: pointer;
          background: #fff; position: relative; transition: all 0.15s;
        }
        .su-ip-store-card--selected { border-color: #F05A28; background: #FFF8F5; }

        .su-ip-store-icon-wrap {
          width: 40px; height: 40px; border-radius: 10px; background: #EAF6F8;
          display: flex; align-items: center; justify-content: center;
          color: #F05A28; flex-shrink: 0;
        }
        .su-ip-store-info { flex: 1; min-width: 0; }
        .su-ip-store-name { font-size: 0.85rem; font-weight: 700; color: #162B30; display: flex; align-items: center; gap: 6px; }
        .su-ip-store-dot { font-size: 10px; }
        .su-ip-store-dot--online { color: #16A34A; }
        .su-ip-store-dot--offline { color: #DC2626; }
        .su-ip-store-address { font-size: 0.72rem; color: #A4B6B9; margin-top: 2px; }
        .su-ip-store-status { font-size: 0.7rem; font-weight: 700; margin-top: 4px; }
        .su-ip-store-status--online { color: #16A34A; }
        .su-ip-store-status--offline { color: #DC2626; }

        .su-ip-store-check {
          position: absolute; top: 10px; right: 10px;
          width: 22px; height: 22px; border-radius: 50%; background: #F05A28;
          display: flex; align-items: center; justify-content: center; color: #fff;
        }

        .su-ip-selection-bar {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 18px; background: #F0FDF4; border-radius: 10px;
          border: 1px dashed #BBF7D0; margin-top: 18px;
        }
        .su-ip-selection-count { font-size: 0.88rem; font-weight: 700; color: #166534; }
        .su-ip-selection-text { font-size: 0.78rem; color: #64848D; }
        .su-ip-clear-btn { background: none; border: none; color: #F05A28; font-weight: 700; font-size: 0.85rem; cursor: pointer; }

        .su-ip-actions { display: flex; gap: 12px; }
        .su-ip-submit-btn {
          padding: 14px 32px; background: #F05A28; color: #fff; border: none;
          border-radius: 10px; font-weight: 700; font-size: 0.95rem; cursor: pointer;
          transition: background 0.15s;
        }
        .su-ip-submit-btn:hover { background: #DC4B1D; }
        .su-ip-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
