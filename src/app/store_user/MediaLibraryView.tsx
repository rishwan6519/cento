"use client";
import React, { useState, useEffect, useMemo } from "react";
import { FaEye, FaTrash, FaSearch, FaTimes, FaPlay, FaFilter, FaThLarge, FaList } from "react-icons/fa";

type ViewMode = "grid" | "list";
type FilterType = "all" | "image" | "video" | "audio";

const getFileIcon = (type: string) => {
  const t = (type || "").toLowerCase();
  if (t.includes("video") || t.includes("mp4")) return "🎬";
  if (t.includes("audio") || t.includes("mp3") || t.includes("wav")) return "🎵";
  if (t.includes("image") || t.includes("jpg") || t.includes("png") || t.includes("jpeg") || t.includes("gif") || t.includes("webp") || t.includes("svg")) return "🖼️";
  return "📄";
};

const getFileCategory = (type: string): FilterType => {
  const t = (type || "").toLowerCase();
  if (t.includes("video") || t.includes("mp4")) return "video";
  if (t.includes("audio") || t.includes("mp3") || t.includes("wav")) return "audio";
  if (t.includes("image") || t.includes("jpg") || t.includes("png") || t.includes("jpeg") || t.includes("gif") || t.includes("webp") || t.includes("svg")) return "image";
  return "all";
};

const formatFileSize = (bytes: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function MediaLibraryView() {
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [playlistFiles, setPlaylistFiles] = useState<any[]>([]);
  const [announcementFiles, setAnnouncementFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") ?? "" : "";

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/media?userId=${userId}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/playlists?userId=${userId}`).then(r => r.json()).catch(() => []),
      fetch(`/api/announcement/playlist?userId=${userId}`).then(r => r.json()).catch(() => []),
    ]).then(([mediaRes, playlistRes, announcementRes]) => {
      // 1. Direct media uploads
      const media = mediaRes.media || mediaRes.mediaFiles || mediaRes.data || [];
      setMediaItems(media);

      // 2. Playlist files
      const playlists = Array.isArray(playlistRes) ? playlistRes : (playlistRes.playlists || playlistRes.data || []);
      const pFiles: any[] = [];
      playlists.forEach((p: any) => {
        (p.files || []).forEach((f: any) => {
          pFiles.push({
            _id: f._id || `pf-${Math.random()}`,
            name: f.name || (f.path || "").split("/").pop() || "Unknown",
            type: f.type || "file",
            url: f.path || "",
            source: "playlist",
            sourceName: p.name || "Untitled Playlist",
            createdAt: p.createdAt,
          });
        });
      });
      setPlaylistFiles(pFiles);

      // 3. Announcement files
      const announcements = Array.isArray(announcementRes) ? announcementRes : (announcementRes.playlists || announcementRes.data || []);
      const aFiles: any[] = [];
      announcements.forEach((a: any) => {
        (a.announcements || []).forEach((ann: any) => {
          const file = ann.file || ann;
          aFiles.push({
            _id: file._id || `af-${Math.random()}`,
            name: file.name || (file.path || "").split("/").pop() || "Unknown",
            type: file.type || "audio",
            url: file.path || file.url || "",
            source: "announcement",
            sourceName: a.name || "Untitled Announcement",
            createdAt: a.createdAt,
          });
        });
      });
      setAnnouncementFiles(aFiles);
    }).finally(() => setLoading(false));
  }, [userId]);

  // De-duplicate by url, merge all sources
  const allFiles = useMemo(() => {
    const uploadedWithSource = mediaItems.map(m => ({ ...m, source: "upload", sourceName: "Direct Upload" }));
    const all = [...uploadedWithSource, ...playlistFiles, ...announcementFiles];
    const unique = new Map<string, any>();
    all.forEach(f => {
      const key = f.url || f._id;
      if (!unique.has(key)) {
        unique.set(key, f);
      }
    });
    return Array.from(unique.values());
  }, [mediaItems, playlistFiles, announcementFiles]);

  const filteredFiles = useMemo(() => {
    return allFiles.filter(item => {
      const matchSearch = !searchTerm ||
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sourceName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchFilter = filter === "all" || getFileCategory(item.type) === filter;
      return matchSearch && matchFilter;
    });
  }, [allFiles, searchTerm, filter]);

  const counts = useMemo(() => ({
    all: allFiles.length,
    image: allFiles.filter(f => getFileCategory(f.type) === "image").length,
    video: allFiles.filter(f => getFileCategory(f.type) === "video").length,
    audio: allFiles.filter(f => getFileCategory(f.type) === "audio").length,
  }), [allFiles]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this media item?")) return;
    try {
      const res = await fetch(`/api/media?userId=${id}`, { method: "DELETE" });
      if (res.ok) {
        setMediaItems(prev => prev.filter(m => m._id !== id));
      } else {
        alert("Failed to delete media");
      }
    } catch {
      alert("Error deleting media");
    }
  };

  const handleUpdateCategory = async (e: React.ChangeEvent<HTMLSelectElement>, id: string) => {
    e.stopPropagation();
    const newCategory = e.target.value;
    try {
      const res = await fetch(`/api/media?mediaId=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileCategory: newCategory })
      });
      if (res.ok) {
        setMediaItems(prev => prev.map(m => (m._id === id ? { ...m, fileCategory: newCategory, videoCategory: newCategory } : m)));
      } else {
        alert("Failed to update category");
      }
    } catch {
      alert("Error updating category");
    }
  };

  const getPreviewUrl = (item: any) => {
    const url = item.url || "";
    if (url.startsWith("http")) return url;
    return url.startsWith("/") ? url : `/${url}`;
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        /* ── Media Library Styles ── */
        .ml-header { margin-bottom: 28px; }
        .ml-title { font-size: 1.6rem; font-weight: 800; color: #162B30; margin: 0 0 4px; }
        .ml-subtitle { font-size: 0.88rem; color: #64848D; margin: 0; font-weight: 500; }

        /* Stats cards */
        .ml-stats { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        .ml-stat-card {
          flex: 1; min-width: 120px; padding: 16px 20px;
          border-radius: 14px; cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.2s ease;
          position: relative; overflow: hidden;
        }
        .ml-stat-card::before {
          content: ''; position: absolute; top: 0; right: 0;
          width: 60px; height: 60px; border-radius: 50%;
          opacity: 0.08; transform: translate(20px, -20px);
        }
        .ml-stat-card--all { background: #F5F7F8; }
        .ml-stat-card--all::before { background: #162B30; }
        .ml-stat-card--image { background: #FFF7ED; }
        .ml-stat-card--image::before { background: #F59E0B; }
        .ml-stat-card--video { background: #EFF6FF; }
        .ml-stat-card--video::before { background: #3B82F6; }
        .ml-stat-card--audio { background: #F0FDF4; }
        .ml-stat-card--audio::before { background: #22C55E; }
        .ml-stat-card--active { border-color: #F05A28 !important; box-shadow: 0 4px 16px rgba(240,90,40,0.12); }
        .ml-stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .ml-stat-value { font-size: 1.5rem; font-weight: 800; color: #162B30; line-height: 1; }
        .ml-stat-label { font-size: 0.7rem; font-weight: 700; color: #8CA3AB; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 6px; }

        /* Toolbar */
        .ml-toolbar {
          display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .ml-search-wrap {
          flex: 1; min-width: 200px; display: flex; align-items: center;
          background: #fff; border: 1.5px solid #E8ECEE; border-radius: 12px;
          padding: 10px 16px; gap: 10px;
          transition: border-color 0.2s;
        }
        .ml-search-wrap:focus-within { border-color: #11B5BB; }
        .ml-search-input {
          border: none; background: none; outline: none; font-size: 0.85rem;
          color: #162B30; font-family: inherit; width: 100%;
        }
        .ml-search-input::placeholder { color: #A4B6B9; }

        .ml-view-toggle {
          display: flex; border: 1.5px solid #E8ECEE; border-radius: 10px;
          overflow: hidden; background: #fff;
        }
        .ml-view-btn {
          padding: 10px 14px; border: none; background: transparent;
          color: #8CA3AB; cursor: pointer; display: flex; align-items: center;
          font-size: 0.85rem; transition: all 0.15s;
        }
        .ml-view-btn--active { background: #162B30; color: #fff; }

        /* Grid view */
        .ml-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }
        .ml-grid-card {
          background: #fff; border-radius: 16px; border: 1.5px solid #E8ECEE;
          overflow: hidden; cursor: pointer; transition: all 0.25s ease;
          position: relative;
        }
        .ml-grid-card:hover { border-color: #CBD5E1; box-shadow: 0 8px 24px rgba(0,0,0,0.06); transform: translateY(-2px); }
        .ml-grid-thumb {
          height: 140px; background: #F5F7F8; display: flex; align-items: center;
          justify-content: center; font-size: 2.5rem; position: relative;
          overflow: hidden;
        }
        .ml-grid-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .ml-grid-overlay {
          position: absolute; inset: 0; background: rgba(0,0,0,0.4);
          display: flex; align-items: center; justify-content: center; gap: 8px;
          opacity: 0; transition: opacity 0.2s;
        }
        .ml-grid-card:hover .ml-grid-overlay { opacity: 1; }
        .ml-grid-overlay-btn {
          width: 36px; height: 36px; border-radius: 10px; border: none;
          background: rgba(255,255,255,0.9); color: #162B30;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: transform 0.15s; font-size: 0.8rem;
        }
        .ml-grid-overlay-btn:hover { transform: scale(1.1); }
        .ml-grid-overlay-btn--delete { color: #DC2626; }
        .ml-grid-info { padding: 14px 16px; }
        .ml-grid-name {
          font-size: 0.82rem; font-weight: 700; color: #162B30; margin: 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .ml-grid-meta { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
        .ml-grid-type {
          font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.04em; padding: 3px 8px; border-radius: 6px;
        }
        .ml-grid-type--image { background: #FFF7ED; color: #D97706; }
        .ml-grid-type--video { background: #EFF6FF; color: #2563EB; }
        .ml-grid-type--audio { background: #F0FDF4; color: #16A34A; }
        .ml-grid-type--file { background: #F5F7F8; color: #64748B; }
        .ml-grid-source {
          font-size: 0.68rem; color: #94A3B8; font-weight: 500;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .ml-grid-date { font-size: 0.68rem; color: #CBD5E1; margin-top: 4px; }

        /* List view */
        .ml-list-header {
          display: grid; grid-template-columns: 2fr 0.8fr 1fr 0.8fr 100px;
          padding: 10px 16px; font-size: 0.65rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.05em; color: #94A3B8;
          border-bottom: 1px solid #EAEFEF; background: #F8FAFB; border-radius: 10px 10px 0 0;
        }
        .ml-list-item {
          display: grid; grid-template-columns: 2fr 0.8fr 1fr 0.8fr 100px;
          align-items: center; padding: 14px 16px;
          border-bottom: 1px solid #F1F5F9; background: #fff;
          transition: background 0.15s; cursor: pointer;
        }
        .ml-list-item:hover { background: #FAFBFC; }
        .ml-list-item:last-child { border-radius: 0 0 10px 10px; }
        .ml-list-name-col { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .ml-list-icon {
          width: 36px; height: 36px; border-radius: 8px; background: #F5F7F8;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem; flex-shrink: 0;
        }
        .ml-list-name {
          font-size: 0.82rem; font-weight: 600; color: #162B30;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .ml-list-cell { font-size: 0.78rem; color: #64748B; font-weight: 500; }
        .ml-list-actions { display: flex; gap: 6px; justify-content: flex-end; }
        .ml-list-action-btn {
          width: 30px; height: 30px; border-radius: 8px; border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.15s;
        }
        .ml-list-action-btn--view { background: #EFF6FF; color: #2563EB; }
        .ml-list-action-btn--view:hover { background: #DBEAFE; }
        .ml-list-action-btn--delete { background: #FEF2F2; color: #DC2626; }
        .ml-list-action-btn--delete:hover { background: #FEE2E2; }

        /* Loading / Empty */
        .ml-loading {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 80px 20px; color: #8CA3AB;
        }
        .ml-spinner {
          width: 36px; height: 36px; border: 3px solid #E8ECEE;
          border-top-color: #F05A28; border-radius: 50%;
          animation: ml-spin 0.8s linear infinite; margin-bottom: 16px;
        }
        @keyframes ml-spin { to { transform: rotate(360deg); } }
        .ml-empty {
          text-align: center; padding: 60px 20px; color: #8CA3AB;
          background: #fff; border-radius: 16px; border: 1.5px dashed #D6E6E9;
        }
        .ml-empty-icon { font-size: 2.5rem; margin-bottom: 12px; opacity: 0.5; }
        .ml-empty-title { font-size: 1rem; font-weight: 700; color: #64848D; margin-bottom: 4px; }

        /* Preview modal */
        .ml-preview-overlay {
          position: fixed; inset: 0; z-index: 10000;
          display: flex; align-items: center; justify-content: center;
          padding: 24px; background: rgba(0,0,0,0.85); backdrop-filter: blur(12px);
        }
        .ml-preview-container { position: relative; width: 100%; max-width: 720px; }
        .ml-preview-close {
          position: absolute; top: -48px; right: 0;
          width: 36px; height: 36px; border-radius: 50%; border: none;
          background: rgba(255,255,255,0.15); color: #fff; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        .ml-preview-close:hover { background: rgba(255,255,255,0.3); }
        .ml-preview-box {
          width: 100%; border-radius: 16px; overflow: hidden;
          background: #111; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .ml-preview-box video, .ml-preview-box img {
          width: 100%; max-height: 75vh; object-fit: contain; display: block;
        }
        .ml-preview-audio {
          display: flex; flex-direction: column; align-items: center;
          gap: 20px; padding: 48px 32px;
        }
        .ml-preview-audio-icon {
          width: 80px; height: 80px; border-radius: 50%;
          background: linear-gradient(135deg, #F05A28, #E04818);
          display: flex; align-items: center; justify-content: center;
          font-size: 2rem; color: #fff;
          box-shadow: 0 8px 30px rgba(240,90,40,0.3);
        }
        .ml-preview-name {
          color: #fff; font-size: 1rem; font-weight: 600;
          text-align: center; max-width: 100%;
          padding: 12px 24px; background: rgba(255,255,255,0.05);
          border-radius: 10px;
        }

        @media (max-width: 768px) {
          .ml-stats { flex-direction: column; }
          .ml-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
          .ml-list-header, .ml-list-item { grid-template-columns: 2fr 1fr 80px; }
          .ml-list-header > *:nth-child(3), .ml-list-item > *:nth-child(3),
          .ml-list-header > *:nth-child(4), .ml-list-item > *:nth-child(4) { display: none; }
        }
      `}</style>

      {/* Header */}
      <div className="ml-header">
        <h1 className="ml-title">Media Library</h1>
        <p className="ml-subtitle">All media files across your uploads, playlists, and announcements</p>
      </div>

      {/* Stat cards */}
      <div className="ml-stats">
        {([
          { key: "all" as FilterType, label: "All Files", icon: "📁", cls: "all" },
          { key: "image" as FilterType, label: "Images", icon: "🖼️", cls: "image" },
          { key: "video" as FilterType, label: "Videos", icon: "🎬", cls: "video" },
          { key: "audio" as FilterType, label: "Audio", icon: "🎵", cls: "audio" },
        ]).map(s => (
          <div
            key={s.key}
            className={`ml-stat-card ml-stat-card--${s.cls} ${filter === s.key ? "ml-stat-card--active" : ""}`}
            onClick={() => setFilter(s.key)}
          >
            <div className="ml-stat-value">{counts[s.key]}</div>
            <div className="ml-stat-label">{s.icon} {s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="ml-toolbar">
        <div className="ml-search-wrap">
          <FaSearch color="#A4B6B9" size={14} />
          <input
            className="ml-search-input"
            type="text"
            placeholder="Search by name, type, or source..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <FaTimes color="#A4B6B9" size={12} style={{ cursor: "pointer" }} onClick={() => setSearchTerm("")} />
          )}
        </div>
        <div className="ml-view-toggle">
          <button className={`ml-view-btn ${viewMode === "grid" ? "ml-view-btn--active" : ""}`} onClick={() => setViewMode("grid")}>
            <FaThLarge size={13} />
          </button>
          <button className={`ml-view-btn ${viewMode === "list" ? "ml-view-btn--active" : ""}`} onClick={() => setViewMode("list")}>
            <FaList size={13} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="ml-loading">
          <div className="ml-spinner" />
          <p style={{ fontWeight: 600 }}>Loading your media library...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="ml-empty">
          <div className="ml-empty-icon">📭</div>
          <div className="ml-empty-title">{searchTerm || filter !== "all" ? "No matching files" : "No media found"}</div>
          <p style={{ fontSize: "0.82rem" }}>{searchTerm || filter !== "all" ? "Try adjusting your search or filter." : "Upload media or create a playlist to see files here."}</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="ml-grid">
          {filteredFiles.map(item => {
            const category = getFileCategory(item.type);
            const previewUrl = getPreviewUrl(item);
            const isImage = category === "image";
            return (
              <div key={item._id} className="ml-grid-card" onClick={() => setPreviewFile(item)}>
                <div className="ml-grid-thumb">
                  {isImage ? (
                    <img src={previewUrl} alt={item.name} loading="lazy" />
                  ) : (
                    <span>{getFileIcon(item.type)}</span>
                  )}
                  <div className="ml-grid-overlay">
                    <button className="ml-grid-overlay-btn" onClick={e => { e.stopPropagation(); setPreviewFile(item); }}>
                      <FaEye size={13} />
                    </button>
                    {item.source === "upload" && (
                      <button className="ml-grid-overlay-btn ml-grid-overlay-btn--delete" onClick={e => handleDelete(e, item._id)}>
                        <FaTrash size={11} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="ml-grid-info">
                  <p className="ml-grid-name">{item.name}</p>
                  <div className="ml-grid-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <span className={`ml-grid-type ml-grid-type--${category}`}>{category}</span>
                    {item.source === "upload" ? (
                      <select 
                        value={(item.fileCategory || item.videoCategory || "other").toLowerCase()}
                        onChange={(e) => handleUpdateCategory(e, item._id)}
                        onClick={e => e.stopPropagation()}
                        className="ml-grid-type"
                        style={{ border: "1px solid #D6E6E9", outline: "none", cursor: "pointer", background: "#fff", color: "#162B30", padding: "2px 6px" }}
                      >
                        <option value="video">video</option>
                        <option value="audio">audio</option>
                        <option value="image">image</option>
                        <option value="offer">offer</option>
                        <option value="generic">generic</option>
                        <option value="general">general</option>
                        <option value="featured">featured</option>
                        <option value="other">other</option>
                      </select>
                    ) : (
                      <span className="ml-grid-type" style={{ background: "#F5F7F8", color: "#64748B" }}>
                         {item.fileCategory || item.videoCategory || "other"}
                      </span>
                    )}
                    <span className="ml-grid-source" style={{ width: '100%' }}>{item.sourceName}</span>
                  </div>
                  {item.createdAt && <p className="ml-grid-date">{new Date(item.createdAt).toLocaleDateString()}</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: "12px", border: "1.5px solid #E8ECEE", overflow: "hidden" }}>
          <div className="ml-list-header">
            <span>Name</span>
            <span>Type</span>
            <span>Source</span>
            <span>Date</span>
            <span style={{ textAlign: "right" }}>Actions</span>
          </div>
          {filteredFiles.map(item => {
            const category = getFileCategory(item.type);
            return (
              <div key={item._id} className="ml-list-item" onClick={() => setPreviewFile(item)}>
                <div className="ml-list-name-col">
                  <div className="ml-list-icon">{getFileIcon(item.type)}</div>
                  <span className="ml-list-name">{item.name}</span>
                </div>
                <span className="ml-list-cell">
                  <span className={`ml-grid-type ml-grid-type--${category}`}>{category}</span>
                  {item.source === "upload" ? (
                      <select 
                        value={(item.fileCategory || item.videoCategory || "other").toLowerCase()}
                        onChange={(e) => handleUpdateCategory(e, item._id)}
                        onClick={e => e.stopPropagation()}
                        className="ml-grid-type"
                        style={{ border: "1px solid #D6E6E9", outline: "none", cursor: "pointer", background: "#fff", color: "#162B30", marginLeft: "8px", padding: "2px 6px" }}
                      >
                        <option value="video">video</option>
                        <option value="audio">audio</option>
                        <option value="image">image</option>
                        <option value="offer">offer</option>
                        <option value="generic">generic</option>
                        <option value="general">general</option>
                        <option value="featured">featured</option>
                        <option value="other">other</option>
                      </select>
                    ) : (
                      <span className="ml-grid-type" style={{ background: "#F5F7F8", color: "#64748B", marginLeft: "8px" }}>
                         {item.fileCategory || item.videoCategory || "other"}
                      </span>
                  )}
                </span>
                <span className="ml-list-cell">{item.sourceName}</span>
                <span className="ml-list-cell">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}</span>
                <div className="ml-list-actions">
                  <button className="ml-list-action-btn ml-list-action-btn--view" onClick={e => { e.stopPropagation(); setPreviewFile(item); }}>
                    <FaEye size={12} />
                  </button>
                  {item.source === "upload" && (
                    <button className="ml-list-action-btn ml-list-action-btn--delete" onClick={e => handleDelete(e, item._id)}>
                      <FaTrash size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="ml-preview-overlay" onClick={() => setPreviewFile(null)}>
          <div className="ml-preview-container" onClick={e => e.stopPropagation()}>
            <button className="ml-preview-close" onClick={() => setPreviewFile(null)}>
              <FaTimes size={14} />
            </button>
            <div className="ml-preview-box">
              {(() => {
                const url = getPreviewUrl(previewFile);
                const t = (previewFile.type || "").toLowerCase();
                if (t.includes("image") || t.includes("jpg") || t.includes("png") || t.includes("jpeg") || t.includes("gif") || t.includes("webp") || t.includes("svg")) {
                  return <img src={url} alt={previewFile.name} />;
                } else if (t.includes("video") || t.includes("mp4")) {
                  return <video src={url} controls autoPlay />;
                } else if (t.includes("audio") || t.includes("mp3") || t.includes("wav")) {
                  return (
                    <div className="ml-preview-audio">
                      <div className="ml-preview-audio-icon">🎵</div>
                      <div className="ml-preview-name">{previewFile.name}</div>
                      <audio src={url} controls autoPlay style={{ width: "100%", maxWidth: "400px" }} />
                    </div>
                  );
                } else {
                  return (
                    <div style={{ padding: "60px", textAlign: "center", color: "#8CA3AB" }}>
                      <p style={{ fontSize: "2rem", marginBottom: "12px" }}>📄</p>
                      <p style={{ fontWeight: 700, color: "#fff" }}>Preview not available for this file type</p>
                    </div>
                  );
                }
              })()}
            </div>
            <div className="ml-preview-name" style={{ marginTop: "16px", borderRadius: "10px" }}>
              {previewFile.name}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
