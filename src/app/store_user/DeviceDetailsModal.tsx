"use client";
import React, { useState, useEffect } from "react";
import { FaTimes, FaPlay, FaChevronDown, FaEye } from "react-icons/fa";
import { MdComputer } from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";

interface DeviceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: any;
  onEditPlaylist?: (playlist: any, isMedia: boolean) => void;
}

export default function DeviceDetailsModal({ isOpen, onClose, device, onEditPlaylist }: DeviceDetailsModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPlaying, setCurrentPlaying] = useState<any>(null);
  const [showScreenshot, setShowScreenshot] = useState(false);

  // Poll for Currently Playing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen && device) {
      const fetchCurrent = async () => {
        try {
          const res = await fetch(`/api/devices/current-playing?serialNumber=${device.sn}&_t=${Date.now()}`);
          const resData = await res.json();
          if (resData.success && resData.data) {
            setCurrentPlaying(resData.data);
          } else {
            setCurrentPlaying(null);
          }
        } catch (e) {}
      };
      fetchCurrent();
      interval = setInterval(fetchCurrent, 3000);
    } else {
      setCurrentPlaying(null);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, device]);

  useEffect(() => {
    if (isOpen && device) {
      setLoading(true);
      setExpandedId(null);
      setPreviewMedia(null);
      fetch(`/api/full-data?serialNumber=${device.sn}`)
        .then(res => res.json())
        .then(resData => {
          if (resData.success) setData(resData);
        })
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    } else {
      setData(null);
      setPreviewMedia(null);
      setExpandedId(null);
    }
  }, [isOpen, device]);

  const handleDisconnect = async (item: any, isMedia: boolean) => {
    if (!device?.id && !device?._id && !device?.sn) return;
    const deviceId = data?.device?.id;
    if (!deviceId) return;
    
    try {
      let url = "";
      if (isMedia) {
        url = `/api/device-playlists?deviceId=${deviceId}&playlistId=${item._id}`;
      } else {
        url = `/api/announcement/device-announcement?deviceId=${deviceId}&announcementPlaylistId=${item._id}`;
      }
      const response = await fetch(url, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to disconnect");
      
      // Refresh data
      setLoading(true);
      const res = await fetch(`/api/full-data?serialNumber=${device.sn}`);
      const resData = await res.json();
      if (resData.success) setData(resData);
      setExpandedId(null);
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert("Failed to disconnect playlist");
    }
  };

  const handleUpdateFileCategory = async (e: React.ChangeEvent<HTMLSelectElement>, playlistId: string, mediaId: string, path: string) => {
    e.stopPropagation();
    if (!mediaId && !path) {
       alert("Cannot update this file because it does not have a linked media record.");
       return;
    }
    const newCategory = e.target.value;
    try {
      const url = mediaId ? `/api/media?mediaId=${mediaId}` : `/api/media?path=${encodeURIComponent(path)}`;
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileCategory: newCategory })
      });
      if (res.ok) {
        // Optimistically update local data
        if (playlistId === 'currently_playing') {
          setCurrentPlaying((prev: any) => prev ? { ...prev, fileCategory: newCategory } : prev);
        }
        setData((prev: any) => {
           if (!prev || !prev.playlists) return prev;
           const newPlaylists = prev.playlists.map((pl: any) => {
              if (pl.id === playlistId) {
                 return {
                    ...pl,
                    files: pl.files.map((f: any) => {
                      const isMatch = mediaId ? (f.mediaId === mediaId) : (f.path === path);
                      return isMatch ? { ...f, fileCategory: newCategory } : f;
                    })
                 };
              }
              return pl;
           });
           return { ...prev, playlists: newPlaylists };
        });
      } else {
        alert("Failed to update category");
      }
    } catch {
      alert("Error updating category");
    }
  };

  if (!isOpen || !device) return null;

  const playlists = data?.playlists || [];
  const announcements = data?.announcements || [];
  const allItems = [
    ...playlists.map((pl: any, i: number) => ({ ...pl, _type: 'media', _idx: i })),
    ...announcements.map((ann: any, i: number) => ({ ...ann, _type: 'announcement', _idx: i })),
  ];
  const statusOnline = (device.status || '').toLowerCase() === 'online';

  const getFileIcon = (type: string) => {
    if ((type || '').includes('video')) return '🎬';
    if ((type || '').includes('audio') || (type || '').includes('mp3')) return '🎵';
    if ((type || '').includes('image') || (type || '').includes('jpg') || (type || '').includes('png')) return '🖼️';
    return '📄';
  };

  const getFileName = (path: string) => {
    const name = (path || '').split('/').pop() || 'Unknown File';
    // Decode URI and trim long names
    try { return decodeURIComponent(name); } catch { return name; }
  };

  return (
    <>
      {/* CSS-in-JS styles for the modal */}
      <style>{`
        .ddm-overlay {
          position: fixed; inset: 0; z-index: 9999;
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          background: rgba(11, 40, 48, 0.6);
          backdrop-filter: blur(8px);
        }
        .ddm-modal {
          background: #fff; border-radius: 20px;
          width: 100%; max-width: 640px; max-height: 88vh;
          display: flex; flex-direction: column;
          box-shadow: 0 25px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05);
          overflow: hidden;
        }

        /* Header */
        .ddm-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 24px;
          background: linear-gradient(135deg, #0B3D44 0%, #155E68 100%);
          color: #fff;
        }
        .ddm-header-left { display: flex; align-items: center; gap: 16px; }
        .ddm-device-icon {
          width: 48px; height: 48px; border-radius: 14px;
          background: rgba(255,255,255,0.15); backdrop-filter: blur(10px);
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 1.3rem;
        }
        .ddm-device-name { font-size: 1.15rem; font-weight: 700; margin-bottom: 2px; }
        .ddm-device-meta { font-size: 0.78rem; color: rgba(255,255,255,0.7); font-weight: 500; }
        .ddm-status-dot {
          display: inline-block; width: 8px; height: 8px; border-radius: 50%;
          margin-right: 5px; vertical-align: middle;
        }
        .ddm-close-btn {
          width: 36px; height: 36px; border-radius: 10px; border: none;
          background: rgba(255,255,255,0.1); color: #fff; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        .ddm-close-btn:hover { background: rgba(255,255,255,0.25); }

        /* Summary bar */
        .ddm-summary {
          display: flex; gap: 0; border-bottom: 1px solid #EAEFEF;
          background: #F8FAFB;
        }
        .ddm-summary-item {
          flex: 1; text-align: center; padding: 14px 12px;
          border-right: 1px solid #EAEFEF;
        }
        .ddm-summary-item:last-child { border-right: none; }
        .ddm-summary-value { font-size: 1.4rem; font-weight: 800; color: #162B30; }
        .ddm-summary-label { font-size: 0.68rem; color: #64848D; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px; }

        /* Content */
        .ddm-content {
          flex: 1; overflow-y: auto; padding: 20px 24px;
          background: #F5F7F8;
        }

        /* Accordion */
        .ddm-accordion {
          background: #fff; border-radius: 14px; margin-bottom: 12px;
          border: 1.5px solid #E8ECEE;
          overflow: hidden;
          transition: border-color 0.25s, box-shadow 0.25s;
        }
        .ddm-accordion.ddm-accordion--open {
          border-color: #11B5BB;
          box-shadow: 0 4px 20px rgba(17, 181, 187, 0.1);
        }
        .ddm-accordion-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; cursor: pointer;
          background: #fff; border: none; width: 100%;
          transition: background 0.15s;
        }
        .ddm-accordion-header:hover { background: #FAFBFC; }
        .ddm-accordion-left { display: flex; align-items: center; gap: 14px; }
        .ddm-accordion-badge {
          width: 42px; height: 42px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem; font-weight: 700; flex-shrink: 0;
        }
        .ddm-accordion-badge--media { background: #EEF6FF; color: #2563EB; }
        .ddm-accordion-badge--announcement { background: #F0FDF9; color: #0D9488; }
        .ddm-accordion-title { font-size: 0.92rem; font-weight: 700; color: #162B30; text-align: left; }
        .ddm-accordion-subtitle { font-size: 0.72rem; color: #8CA3AB; font-weight: 600; margin-top: 2px; text-align: left; }
        .ddm-accordion-chevron {
          width: 28px; height: 28px; border-radius: 8px;
          background: #F1F5F9; color: #94A3B8;
          display: flex; align-items: center; justify-content: center;
          transition: transform 0.3s, background 0.2s;
          flex-shrink: 0; font-size: 0.75rem;
        }
        .ddm-accordion--open .ddm-accordion-chevron {
          transform: rotate(180deg);
          background: #E0F7FA; color: #0D9488;
        }

        /* Expanded content */
        .ddm-accordion-body { padding: 0 20px 20px; }
        .ddm-schedule-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 10px; margin-bottom: 16px;
        }
        .ddm-schedule-card {
          background: #F8FAFB; border-radius: 10px; padding: 12px 14px;
          display: flex; align-items: flex-start; gap: 10px;
        }
        .ddm-schedule-card.full { grid-column: 1 / -1; }
        .ddm-schedule-icon {
          font-size: 1rem; margin-top: 1px; flex-shrink: 0;
        }
        .ddm-schedule-label { font-size: 0.65rem; color: #8CA3AB; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .ddm-schedule-value { font-size: 0.82rem; color: #334155; font-weight: 600; margin-top: 2px; }

        /* File list */
        .ddm-files-header {
          font-size: 0.7rem; font-weight: 700; color: #8CA3AB;
          text-transform: uppercase; letter-spacing: 0.05em;
          margin-bottom: 10px; padding-left: 2px;
        }
        .ddm-file-item {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 14px; border-radius: 10px;
          background: #fff; border: 1px solid #E8ECEE;
          margin-bottom: 8px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .ddm-file-item:hover {
          border-color: #CBD5E1;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .ddm-file-icon {
          width: 36px; height: 36px; border-radius: 8px;
          background: #F1F5F9; display: flex; align-items: center; justify-content: center;
          font-size: 1rem; flex-shrink: 0;
        }
        .ddm-file-name {
          flex: 1; font-size: 0.82rem; font-weight: 600; color: #334155;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          min-width: 0;
        }
        .ddm-file-type {
          font-size: 0.65rem; color: #94A3B8; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.03em;
        }
        .ddm-preview-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: 8px; border: none;
          background: linear-gradient(135deg, #F05A28, #E04818);
          color: #fff; font-size: 0.72rem; font-weight: 700;
          cursor: pointer; white-space: nowrap; flex-shrink: 0;
          transition: transform 0.15s, box-shadow 0.15s;
          box-shadow: 0 2px 8px rgba(240, 90, 40, 0.25);
        }
        .ddm-preview-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(240, 90, 40, 0.35);
        }

        /* Preview overlay */
        .ddm-preview-overlay {
          position: fixed; inset: 0; z-index: 10000;
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
          background: rgba(0,0,0,0.85);
          backdrop-filter: blur(12px);
        }
        .ddm-preview-container {
          position: relative; width: 100%; max-width: 720px;
        }
        .ddm-preview-close {
          position: absolute; top: -48px; right: 0;
          width: 36px; height: 36px; border-radius: 50%; border: none;
          background: rgba(255,255,255,0.15); color: #fff; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        .ddm-preview-close:hover { background: rgba(255,255,255,0.3); }
        .ddm-preview-box {
          width: 100%; border-radius: 16px; overflow: hidden;
          background: #111; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .ddm-preview-box video, .ddm-preview-box img {
          width: 100%; max-height: 75vh; object-fit: contain; display: block;
        }
        .ddm-preview-audio {
          display: flex; flex-direction: column; align-items: center;
          gap: 20px; padding: 48px 32px;
        }
        .ddm-preview-audio-icon {
          width: 80px; height: 80px; border-radius: 50%;
          background: linear-gradient(135deg, #0D9488, #11B5BB);
          display: flex; align-items: center; justify-content: center;
          font-size: 2rem; color: #fff;
          box-shadow: 0 8px 30px rgba(13, 148, 136, 0.3);
        }
        .ddm-preview-audio-name {
          color: #fff; font-size: 1rem; font-weight: 600;
          text-align: center; max-width: 100%;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .ddm-preview-audio audio { width: 100%; max-width: 400px; }

        /* Loading */
        .ddm-loading {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 60px 20px; color: #8CA3AB;
        }
        .ddm-spinner {
          width: 36px; height: 36px; border: 3px solid #E8ECEE;
          border-top-color: #F05A28; border-radius: 50%;
          animation: ddm-spin 0.8s linear infinite; margin-bottom: 16px;
        }
        @keyframes ddm-spin { to { transform: rotate(360deg); } }

        /* Empty */
        .ddm-empty {
          text-align: center; padding: 48px 20px; color: #8CA3AB;
        }
        .ddm-empty-icon {
          font-size: 2.5rem; margin-bottom: 12px; opacity: 0.5;
        }
        .ddm-empty-title { font-size: 1rem; font-weight: 700; color: #64848D; margin-bottom: 4px; }
        .ddm-empty-text { font-size: 0.82rem; }

        /* Responsive */
        /* Now Playing Premium Banner */
        .ddm-now-playing {
          position: relative;
          padding: 16px 24px;
          display: flex; align-items: center; gap: 16px;
          background: linear-gradient(90deg, #1e293b, #0f172a);
          color: #fff;
          overflow: hidden;
        }
        .ddm-now-playing--empty {
          background: #F8FAFB;
          border-bottom: 1px solid #EAEFEF;
        }
        .ddm-now-playing-bg-blur {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(139, 92, 246, 0.15));
          z-index: 0; pointer-events: none;
        }
        .ddm-now-playing-icon-box {
          position: relative; z-index: 1;
          width: 44px; height: 44px; border-radius: 12px;
          background: linear-gradient(135deg, #38BDF8, #6366F1);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; box-shadow: 0 4px 15px rgba(56, 189, 248, 0.35);
          color: #fff;
        }
        .ddm-now-playing--empty .ddm-now-playing-icon-box {
          background: #E2E8F0; box-shadow: none; color: #94A3B8;
        }
        .ddm-now-playing-details {
          position: relative; z-index: 1; flex: 1; overflow: hidden;
        }
        .ddm-now-playing-label {
          font-size: 0.68rem; font-weight: 700; color: #94A3B8;
          text-transform: uppercase; letter-spacing: 0.12em;
          display: flex; align-items: center; gap: 8px; margin-bottom: 3px;
        }
        .ddm-now-playing-label span.live-dot {
          width: 6px; height: 6px; border-radius: 50%; background: #22C55E;
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.8);
          animation: pulse-live 2s infinite;
        }
        @keyframes pulse-live {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        .ddm-now-playing-title {
          font-size: 0.95rem; font-weight: 600; color: #fff;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .ddm-now-playing--empty .ddm-now-playing-title {
          color: #64748B; font-weight: 500; font-style: italic;
        }
        .ddm-now-playing-action {
          position: relative; z-index: 1;
        }
        
        @media (max-width: 640px) {
          .ddm-modal { max-width: 100%; border-radius: 16px; }
          .ddm-schedule-grid { grid-template-columns: 1fr; }
          .ddm-file-item { flex-wrap: wrap; }
        }
      `}</style>

      <AnimatePresence>
        <motion.div
          className="ddm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="ddm-modal"
            initial={{ y: 30, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", bounce: 0, duration: 0.35 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="ddm-header">
              <div className="ddm-header-left">
                <div className="ddm-device-icon"><MdComputer size={22} /></div>
                <div>
                  <div className="ddm-device-name" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {device.name}
                    {data?.device?.latestScreenshotUrl && (
                      <button 
                        onClick={() => setShowScreenshot(true)}
                        style={{
                          background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
                          color: '#fff', fontSize: '0.65rem', padding: '3px 8px', borderRadius: '6px',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                          fontWeight: 'bold', letterSpacing: '0.05em'
                        }}
                      >
                        <FaEye size={10} /> View Screen
                      </button>
                    )}
                  </div>
                  <div className="ddm-device-meta">
                    <span className="ddm-status-dot" style={{ background: statusOnline ? '#22C55E' : '#EF4444' }} />
                    {statusOnline ? 'Online' : 'Offline'} • SN: {device.sn}
                  </div>
                </div>
              </div>
              <button className="ddm-close-btn" onClick={onClose}><FaTimes size={14} /></button>
            </div>

            {/* Currently Playing Section */}
            <div className={`ddm-now-playing ${!currentPlaying ? 'ddm-now-playing--empty' : ''}`}>
              {currentPlaying && <div className="ddm-now-playing-bg-blur" />}
              <div className="ddm-now-playing-icon-box">
                 <FaPlay size={14} style={{ marginLeft: '2px' }} />
              </div>
              <div className="ddm-now-playing-details">
                <div className="ddm-now-playing-label">
                  {currentPlaying && <span className="live-dot" />}
                  Currently Playing
                </div>
                <div className="ddm-now-playing-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {currentPlaying ? getFileName(currentPlaying.fullPath || currentPlaying.path) : "No active media currently playing"}
                  {currentPlaying && currentPlaying.fullPath && (
                     <select 
                       value={(currentPlaying.fileCategory || "other").toLowerCase()}
                       onChange={(e) => handleUpdateFileCategory(e, 'currently_playing', currentPlaying.mediaId, currentPlaying.fullPath)}
                       onClick={e => e.stopPropagation()}
                       style={{ border: "1px solid rgba(255,255,255,0.2)", outline: "none", cursor: "pointer", background: "rgba(0,0,0,0.3)", color: "#38BDF8", padding: "2px 8px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700, textTransform: "capitalize" }}
                     >
                       <option value="video">Video</option>
                       <option value="audio">Audio</option>
                       <option value="image">Image</option>
                       <option value="offer">Offer</option>
                       <option value="generic">Generic</option>
                       <option value="general">General</option>
                       <option value="featured">Featured</option>
                       <option value="other">Other</option>
                     </select>
                  )}
                </div>
              </div>
              <div className="ddm-now-playing-action">
                {currentPlaying && (
                   <button 
                      className="ddm-preview-btn"
                      style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', boxShadow: 'none' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                      onClick={() => {
                          const actualPath = currentPlaying.fullPath || currentPlaying.path;
                          const pathLower = actualPath.toLowerCase();
                          let type = 'file';
                          if (pathLower.endsWith('.mp4') || pathLower.endsWith('.webm') || pathLower.endsWith('.ogg')) type = 'video';
                          else if (pathLower.endsWith('.mp3') || pathLower.endsWith('.wav')) type = 'audio';
                          else if (pathLower.endsWith('.jpg') || pathLower.endsWith('.jpeg') || pathLower.endsWith('.png')) type = 'image';
                          setPreviewMedia({ path: actualPath, name: getFileName(actualPath), type });
                      }}
                   >
                     <FaEye size={12} /> Preview
                   </button>
                )}
              </div>
            </div>

            {/* Summary counts */}
            {!loading && (playlists.length > 0 || announcements.length > 0) && (
              <div className="ddm-summary">
                <div className="ddm-summary-item">
                  <div className="ddm-summary-value">{allItems.length}</div>
                  <div className="ddm-summary-label">Total Playlists</div>
                </div>
                <div className="ddm-summary-item">
                  <div className="ddm-summary-value">{playlists.length}</div>
                  <div className="ddm-summary-label">Media</div>
                </div>
                <div className="ddm-summary-item">
                  <div className="ddm-summary-value">{announcements.length}</div>
                  <div className="ddm-summary-label">Announcements</div>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="ddm-content">
              {loading ? (
                <div className="ddm-loading">
                  <div className="ddm-spinner" />
                  <p style={{ fontWeight: 600 }}>Loading playlists...</p>
                </div>
              ) : allItems.length === 0 ? (
                <div className="ddm-empty">
                  <div className="ddm-empty-icon">📭</div>
                  <div className="ddm-empty-title">No Connected Playlists</div>
                  <div className="ddm-empty-text">This device has no active playlists.</div>
                </div>
              ) : (
                allItems.map((item: any) => {
                  const id = `${item._type}-${item._idx}`;
                  const isMedia = item._type === 'media';
                  const isExpanded = expandedId === id;
                  const files = isMedia ? (item.files || []) : (item.announcements || []);
                  const fileCount = files.length;

                  return (
                    <div key={id} className={`ddm-accordion ${isExpanded ? 'ddm-accordion--open' : ''}`}>
                      <button className="ddm-accordion-header" onClick={() => setExpandedId(isExpanded ? null : id)}>
                        <div className="ddm-accordion-left">
                          <div className={`ddm-accordion-badge ${isMedia ? 'ddm-accordion-badge--media' : 'ddm-accordion-badge--announcement'}`}>
                            {isMedia ? '🎬' : '📢'}
                          </div>
                          <div>
                            <div className="ddm-accordion-title">{item.name || (isMedia ? `Media Playlist ${item._idx + 1}` : `Announcement ${item._idx + 1}`)}</div>
                            <div className="ddm-accordion-subtitle">
                              {isMedia ? `${fileCount} media file${fileCount !== 1 ? 's' : ''}` : `${fileCount} announcement${fileCount !== 1 ? 's' : ''}`}
                              {isMedia && item.contentType ? ` • ${item.contentType}` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="ddm-accordion-chevron"><FaChevronDown size={11} /></div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div className="ddm-accordion-body">
                              {/* Schedule info */}
                              <div className="ddm-schedule-grid">
                                {isMedia ? (
                                  <>
                                    <div className="ddm-schedule-card">
                                      <span className="ddm-schedule-icon">📅</span>
                                      <div>
                                        <div className="ddm-schedule-label">Date Range</div>
                                        <div className="ddm-schedule-value">
                                          {item.startDate ? new Date(item.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                          {' → '}
                                          {item.endDate ? new Date(item.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="ddm-schedule-card">
                                      <span className="ddm-schedule-icon">⏰</span>
                                      <div>
                                        <div className="ddm-schedule-label">Active Hours</div>
                                        <div className="ddm-schedule-value">{item.startTime || '00:00'} – {item.endTime || '23:59'}</div>
                                      </div>
                                    </div>
                                    <div className="ddm-schedule-card full">
                                      <span className="ddm-schedule-icon">🗓️</span>
                                      <div>
                                        <div className="ddm-schedule-label">Active Days</div>
                                        <div className="ddm-schedule-value" style={{ textTransform: 'capitalize' }}>
                                          {item.daysOfWeek?.length ? item.daysOfWeek.join(', ') : 'Everyday'}
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="ddm-schedule-card">
                                      <span className="ddm-schedule-icon">📋</span>
                                      <div>
                                        <div className="ddm-schedule-label">Schedule Type</div>
                                        <div className="ddm-schedule-value" style={{ textTransform: 'capitalize' }}>{item.schedule?.scheduleType || 'Standard'}</div>
                                      </div>
                                    </div>
                                    {(item.schedule?.startDate || item.schedule?.endDate) && (
                                      <div className="ddm-schedule-card">
                                        <span className="ddm-schedule-icon">📅</span>
                                        <div>
                                          <div className="ddm-schedule-label">Date Range</div>
                                          <div className="ddm-schedule-value">
                                            {item.schedule?.startDate ? new Date(item.schedule.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                            {' → '}
                                            {item.schedule?.endDate ? new Date(item.schedule.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    <div className="ddm-schedule-card full">
                                      <span className="ddm-schedule-icon">🗓️</span>
                                      <div>
                                        <div className="ddm-schedule-label">Active Days</div>
                                        <div className="ddm-schedule-value" style={{ textTransform: 'capitalize' }}>
                                          {item.schedule?.daysOfWeek?.length ? item.schedule.daysOfWeek.join(', ') : 'Everyday'}
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                              
                              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                                <button 
                                  className="ddm-preview-btn" 
                                  style={{ background: '#11B5BB', boxShadow: 'none' }}
                                  onClick={() => {
                                    if (onEditPlaylist) {
                                      onEditPlaylist(item, isMedia);
                                      onClose();
                                    }
                                  }}
                                >
                                  ✏️ Edit Playlist
                                </button>
                                <button 
                                  className="ddm-preview-btn" 
                                  style={{ background: '#F87171', boxShadow: 'none' }}
                                  onClick={() => handleDisconnect(item, isMedia)}
                                >
                                  🗑️ Disconnect
                                </button>
                              </div>

                              {/* Files list */}
                              <div className="ddm-files-header">{isMedia ? 'Media Files' : 'Announcements'} ({fileCount})</div>
                              {files.map((f: any, fidx: number) => {
                                const fileName = isMedia ? getFileName(f.path) : (f.name || 'Unknown');
                                const fileType = isMedia ? (f.type || 'file') : 'audio';
                                return (
                                  <div className="ddm-file-item" key={fidx}>
                                    <div className="ddm-file-icon">{getFileIcon(isMedia ? (f.type || f.path || '') : 'audio')}</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div className="ddm-file-name">{fileName}</div>
                                      <div className="ddm-file-type" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {fileType}{!isMedia && f.delay ? ` • Delay: ${f.delay}s` : ''}
                                        {isMedia && (
                                            <select 
                                              value={(f.fileCategory || "other").toLowerCase()}
                                              onChange={(e) => handleUpdateFileCategory(e, item.id || item._id, f.mediaId, f.path)}
                                              onClick={e => e.stopPropagation()}
                                              style={{ border: "1px solid #D6E6E9", outline: "none", cursor: "pointer", background: "#e6f7f8", color: "#11b5bb", padding: "1px 6px", borderRadius: "4px", fontSize: "0.65rem", fontWeight: 700, textTransform: "capitalize" }}
                                            >
                                              <option value="video">Video</option>
                                              <option value="audio">Audio</option>
                                              <option value="image">Image</option>
                                              <option value="offer">Offer</option>
                                              <option value="generic">Generic</option>
                                              <option value="general">General</option>
                                              <option value="featured">Featured</option>
                                              <option value="other">Other</option>
                                            </select>
                                        )}
                                      </div>
                                    </div>
                                    <button
                                      className="ddm-preview-btn"
                                      onClick={() => setPreviewMedia(isMedia ? f : { ...f, type: 'audio' })}
                                    >
                                      <FaEye size={11} /> Preview
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Screenshot Overlay */}
      <AnimatePresence>
        {showScreenshot && data?.device?.latestScreenshotUrl && (
          <motion.div
            className="ddm-preview-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowScreenshot(false)}
            style={{ zIndex: 10005 }}
          >
            <motion.div
              className="ddm-preview-container"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <button className="ddm-preview-close" onClick={() => setShowScreenshot(false)}>
                <FaTimes size={16} />
              </button>
              <div className="ddm-preview-box" style={{ background: '#000' }}>
                <img src={data.device.latestScreenshotUrl} alt="Device Screenshot" style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview overlay */}
      <AnimatePresence>
        {previewMedia && (
          <motion.div
            className="ddm-preview-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewMedia(null)}
          >
            <div className="ddm-preview-container" onClick={e => e.stopPropagation()}>
              <button className="ddm-preview-close" onClick={() => setPreviewMedia(null)}><FaTimes size={14} /></button>
              <div className="ddm-preview-box">
                {previewMedia.type?.includes('video') ? (
                  <div className="ddm-preview-video" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="ddm-preview-audio-name" style={{ color: 'white', marginBottom: '10px', fontSize: '1.2rem' }}>{previewMedia.name || getFileName(previewMedia.path)}</div>
                    <video src={previewMedia.path} controls autoPlay style={{ maxHeight: '70vh', maxWidth: '100%' }} />
                  </div>
                ) : previewMedia.type === 'audio' ? (
                  <div className="ddm-preview-audio">
                    <div className="ddm-preview-audio-icon">🎵</div>
                    <div className="ddm-preview-audio-name">{previewMedia.name || getFileName(previewMedia.path)}</div>
                    <audio src={previewMedia.path} controls autoPlay />
                  </div>
                ) : (
                  <div className="ddm-preview-image" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="ddm-preview-audio-name" style={{ color: 'white', marginBottom: '10px', fontSize: '1.2rem' }}>{previewMedia.name || getFileName(previewMedia.path)}</div>
                    <img src={previewMedia.path} alt="Preview" style={{ maxHeight: '70vh', maxWidth: '100%' }} />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
