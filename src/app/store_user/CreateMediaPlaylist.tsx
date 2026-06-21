import React, { useState, useEffect, useRef } from "react";
import { ViewKey } from "./page";
import { FaUpload, FaPlay, FaTrash, FaDesktop, FaCheck, FaArrowLeft, FaEye } from "react-icons/fa";

interface Props {
  onNavigate: (view: ViewKey) => void;
  editingPlaylist?: any;
}

export default function CreateMediaPlaylist({ onNavigate, editingPlaylist }: Props) {
  const [selectionMode, setSelectionMode] = useState<"upload" | "existing" | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>(["Tue", "Fri"]);
  const [volume, setVolume] = useState(30);
  const [playlistName, setPlaylistName] = useState("");
  const [playlistType, setPlaylistType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real media from API
  const [existingMediaData, setExistingMediaData] = useState<any[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [availableBgImages, setAvailableBgImages] = useState<any[]>([]);
  const [bgSettings, setBgSettings] = useState<Record<string, { enabled: boolean; imageId: string | null }>>({});

  // Real devices from API
  const [devices, setDevices] = useState<any[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectionConfirmed, setSelectionConfirmed] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);
  const [previewMediaName, setPreviewMediaName] = useState("");

  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") ?? "" : "";

  // Populate from editingPlaylist
  useEffect(() => {
    if (editingPlaylist) {
      const formatDate = (d: any) => {
        if (!d) return "";
        const date = new Date(d);
        return isNaN(date.getTime()) ? "" : date.toISOString().split('T')[0];
      };

      setPlaylistName(editingPlaylist.name || "");
      setPlaylistType(editingPlaylist.type || "");
      setStartDate(formatDate(editingPlaylist.startDate));
      setEndDate(formatDate(editingPlaylist.endDate));
      setStartTime(editingPlaylist.startTime || "");
      setEndTime(editingPlaylist.endTime || "");
      setSelectedDays(editingPlaylist.daysOfWeek || []);
      setVolume(editingPlaylist.globalMaxVolume || 30);
      setSelectedDeviceIds(editingPlaylist.deviceIds || []);

      if (editingPlaylist.files && editingPlaylist.files.length > 0) {
        setSelectionMode("existing");
        setSelectedMediaIds(editingPlaylist.files.map((f: any) => f.fileId || f._id));

        const newBgSettings: Record<string, any> = {};
        editingPlaylist.files.forEach((f: any) => {
          const id = f.fileId || f._id;
          if (f.backgroundImageEnabled) {
            newBgSettings[id] = { enabled: true, imageId: f.backgroundImage || null };
          }
        });
        setBgSettings(newBgSettings);
      }
    }
  }, [editingPlaylist]);

  // Fetch devices
  useEffect(() => {
    if (!userId) { setLoadingDevices(false); return; }
    fetch(`/api/assign-device?userId=${userId}`).then(r => r.json()).then(d => {
      const a = d.data || [];
      const individualDevices = a.map((x: any) => ({
        _id: x.deviceId?._id || x._id,
        name: x.deviceId?.name || "Unknown Device",
        sn: x.deviceId?.serialNumber || "N/A",
        type: x.deviceId?.typeId?.name || "Device",
        status: x.deviceId?.status || "inactive",
        address: x.userId?.storeLocation || "N/A"
      }));
      setDevices(individualDevices);
    }).catch(() => setDevices([])).finally(() => setLoadingDevices(false));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/media?userId=${userId}`).then(r => r.json())
      .then(d => {
        const allMedia = d.media || d.mediaFiles || d.data || [];
        const images = allMedia.filter((m: any) => m.type && m.type.toLowerCase().includes('image'));
        setAvailableBgImages(images);
      })
      .catch(() => { });
  }, [userId]);

  // Fetch existing media when mode = existing
  useEffect(() => {
    if (selectionMode !== "existing" || !userId) return;
    setLoadingMedia(true);
    fetch(`/api/media?userId=${userId}`).then(r => r.json())
      .then(d => setExistingMediaData(d.media || d.mediaFiles || d.data || []))
      .catch(() => setExistingMediaData([]))
      .finally(() => setLoadingMedia(false));
  }, [selectionMode, userId]);

  const toggleDay = (day: string) => setSelectedDays(p => p.includes(day) ? p.filter(d => d !== day) : [...p, day]);
  const toggleDevice = (id: string) => {
    setSelectedDeviceIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };
  const toggleMedia = (id: string) => setSelectedMediaIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleDisconnectDevice = async (e: React.MouseEvent, deviceId: string) => {
    e.stopPropagation();
    if (!editingPlaylist || (!editingPlaylist._id && !editingPlaylist.id)) return;

    setDisconnectingId(deviceId);
    try {
      const res = await fetch('/api/playlists/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlistId: editingPlaylist._id || editingPlaylist.id,
          deviceId
        })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedDeviceIds(p => p.filter(x => x !== deviceId));
      } else {
        alert("Failed to disconnect: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      console.error(error);
      alert("Error disconnecting device");
    } finally {
      setDisconnectingId(null);
    }
  };

  const handleUploadFiles = async () => {
    if (selectedFiles.length === 0) {
      alert("Please select files first");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("userId", userId);
      fd.append("userRole", "store");
      selectedFiles.forEach((f, i) => {
        fd.append(`files[${i}]`, f);
        fd.append(`fileNames[${i}]`, f.name);
      });
      const r = await fetch("/api/media/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (d.success) {
        const newBgSettings = { ...bgSettings };
        const newIds = d.files.map((f: any, idx: number) => {
          const id = f._id || f.id;
          const originalName = selectedFiles[idx]?.name || f.name;
          if (newBgSettings[originalName]) {
            newBgSettings[id] = newBgSettings[originalName];
          }
          return id;
        });
        setBgSettings(newBgSettings);
        setSelectedMediaIds(prev => [...prev, ...newIds]);
        setSelectedFiles([]);
        setSelectionConfirmed(false);
        setSelectionMode("existing");
      } else {
        alert("Upload failed: " + (d.error || "Unknown error"));
      }
    } catch (e) {
      console.error(e);
      alert("Error uploading files");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!playlistName.trim() || selectedDeviceIds.length === 0) return;
    setSubmitting(true);
    try {
      let filesPayload: any[] = [];
      if (selectionMode === "upload" && selectedFiles.length > 0) {
        const fd = new FormData(); fd.append("userId", userId); fd.append("userRole", "store");
        selectedFiles.forEach((f, i) => { fd.append(`files[${i}]`, f); fd.append(`fileNames[${i}]`, f.name); });
        const r = await fetch("/api/media/upload", { method: "POST", body: fd }); const d = await r.json();
        if (d.success) {
          filesPayload = d.files.map((f: any, idx: number) => {
            const originalName = selectedFiles[idx]?.name;
            const bg = bgSettings[originalName] || { enabled: false, imageId: null };
            return {
              fileId: f._id || f.id,
              backgroundImageEnabled: bg.enabled,
              backgroundImage: bg.imageId
            };
          });
        }
      } else {
        filesPayload = selectedMediaIds.map(id => {
          const bg = bgSettings[id] || { enabled: false, imageId: null };
          return {
            fileId: id,
            backgroundImageEnabled: bg.enabled,
            backgroundImage: bg.imageId
          };
        });
      }

      const body = {
        userId,
        name: playlistName,
        type: playlistType || "media",
        startDate,
        endDate,
        startTime,
        endTime,
        daysOfWeek: selectedDays,
        globalMinVolume: 30,
        globalMaxVolume: volume,
        deviceIds: selectedDeviceIds,
        files: filesPayload,
        id: editingPlaylist?._id || editingPlaylist?.id
      };
      const method = editingPlaylist ? "PUT" : "POST";
      const res = await fetch("/api/playlists", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) onNavigate("dashboard");
    } catch { } finally { setSubmitting(false); }
  };
  return (
    <div className="store-create-playlist-view">
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button onClick={() => onNavigate("mediaManagement")} style={{ background: "none", border: "none", cursor: "pointer", color: "#162B30", display: "flex", alignItems: "center", padding: 0 }}>
          <FaArrowLeft size={18} />
        </button>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#162B30", margin: 0 }}>Create New Media Playlist</h1>
      </div>
      {/* Step 1: Select Media */}
      <div className="store-step-card">
        <div className="store-step-header">
          <div className="store-step-number">1</div>
          <div>
            <h2 className="store-step-title">Select media</h2>
            <p className="store-step-subtitle">Audio, video, image. Size upto 5kb</p>
          </div>
        </div>

        <div className="store-step-content">
          <div className="store-media-selection-options">
            <div
              className={`store-media-option-box ${selectionMode === "upload" ? "store-media-option-box--active" : ""}`}
              onClick={() => setSelectionMode("upload")}
            >
              <div className="store-media-option-icon">
                <FaUpload />
              </div>
              <h3>Upload new</h3>
              <p>Add media from your device</p>
            </div>

            <div
              className={`store-media-option-box ${selectionMode === "existing" ? "store-media-option-box--active" : ""}`}
              onClick={() => setSelectionMode("existing")}
            >
              <div className="store-media-option-icon">
                <FaUpload />
              </div>
              <h3>Select from existing list</h3>
              <p>Choose from previously uploaded media</p>
            </div>
          </div>

          {selectionMode === "upload" && (
            <div className="store-upload-file-section">
              <label className="store-input-label">Upload files</label>
              <div className="store-file-dropzone" onClick={() => fileInputRef.current?.click()}>
                <FaUpload size={24} style={{ marginBottom: 12, opacity: 0.5 }} />
                <p>Click to browse or drag and drop files</p>
                <span style={{ fontSize: '.75rem', color: '#A4B6B9' }}>Audio, Video or Images</span>
                <input ref={fileInputRef} type="file" multiple hidden onChange={e => {
                  const newFiles = Array.from(e.target.files || []);
                  setSelectedFiles(prev => [...prev, ...newFiles]);
                  setSelectionConfirmed(false);
                }} />
              </div>

              {selectedFiles.length > 0 && (
                <div className="store-selected-files-list">
                  {selectedFiles.map((file, idx) => (
                    <div key={`${file.name}-${idx}`} className="store-selected-file-item" style={{ display: 'block', padding: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
                        <div className="store-file-info">
                          <div className="store-file-icon-sm">
                            {file.type.startsWith('image/') ? <FaDesktop /> : <FaPlay size={10} />}
                          </div>
                          <span className="store-file-name">{file.name}</span>
                        </div>
                        <div className="store-file-actions">
                          <button className="store-file-action-btn" title="Preview" onClick={(e) => { e.stopPropagation(); setPreviewFile(file); }}>
                            <FaEye size={12} />
                          </button>
                          <button className="store-file-action-btn store-file-action-btn--remove" title="Remove" onClick={(e) => { e.stopPropagation(); setSelectedFiles(prev => prev.filter((_, i) => i !== idx)); }}>
                            <FaTrash size={11} />
                          </button>
                        </div>
                      </div>
                      {file.type.startsWith('audio/') && (
                        <div style={{ padding: '12px 16px', background: '#F8FAFB', borderTop: '1px solid #EAEFEF', borderBottomLeftRadius: 10, borderBottomRightRadius: 10 }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#162B30' }}>
                            <input type="checkbox"
                              checked={bgSettings[file.name]?.enabled || false}
                              onChange={(e) => setBgSettings(p => ({ ...p, [file.name]: { ...p[file.name], enabled: e.target.checked } }))}
                            />
                            Enable BG image
                          </label>
                          {bgSettings[file.name]?.enabled && (
                            <div style={{ marginTop: 8 }}>
                              {availableBgImages.length === 0 ? (
                                <p style={{ fontSize: '0.75rem', color: '#64848D', marginTop: 4 }}>No background images available. Please upload an image first.</p>
                              ) : (
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                                  {availableBgImages.map(img => {
                                    const isSelected = bgSettings[file.name]?.imageId === img._id;
                                    const imgUrl = img.url || img.fileUrl;
                                    return (
                                      <div
                                        key={img._id}
                                        onClick={(e) => { e.stopPropagation(); setBgSettings(p => ({ ...p, [file.name]: { ...p[file.name], imageId: isSelected ? "" : img._id } })); }}
                                        style={{
                                          width: 60, height: 45, borderRadius: 6, overflow: 'hidden',
                                          border: isSelected ? '2px solid #F05A28' : '1px solid #EAEFEF',
                                          cursor: 'pointer', position: 'relative'
                                        }}
                                        title={img.name}
                                      >
                                        {imgUrl && <img src={imgUrl} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                        {isSelected && <div style={{ position: 'absolute', top: 2, right: 2, background: '#F05A28', color: '#fff', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaCheck size={8} /></div>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="store-upload-actions-bar">
                <span className="store-file-selected-text">{selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected</span>
                <div className="store-upload-actions-right">
                  <button className="store-btn-outline-orange" onClick={handleUploadFiles} disabled={uploading}>
                    {uploading ? "Uploading..." : "Upload"}
                  </button>
                  <button className="store-btn-solid-orange" onClick={() => { if (selectedFiles.length > 0) setSelectionConfirmed(true); else alert("Please select files first"); }}>
                    {selectionConfirmed ? "✓ Selection Confirmed" : "Confirm selection"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step 2: Select from existing list (Only if 'existing' is selected) */}
      {selectionMode === "existing" && (
        <div className="store-step-card">
          <div className="store-step-header">
            <div className="store-step-number">2</div>
            <div>
              <h2 className="store-step-title">Select from existing list</h2>
              <p className="store-step-subtitle">Choose from previously uploaded media</p>
            </div>
          </div>
          <div className="store-step-content store-step-content--no-pad">
            <div className="store-existing-filters">
              <div className="store-filter-group">
                <label>Media type</label>
                <div className="store-select-wrap">
                  <span className="store-select-prefix">Filter by:</span>
                  <select>
                    <option>All type</option>
                  </select>
                </div>
              </div>
              <div className="store-filter-group">
                <label>Upload month</label>
                <select>
                  <option>All months</option>
                </select>
              </div>
              <button className="store-btn-solid-orange store-btn-go">Go</button>
            </div>

            {loadingMedia ? <div style={{ padding: 32, textAlign: 'center', color: '#A4B6B9' }}>Loading media…</div> : existingMediaData.length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: '#A4B6B9' }}>No media files found. Upload media first.</div> : (
              <table className="store-existing-table">
                <thead><tr><th style={{ width: '40px' }}></th><th>MEDIA NAME</th><th>TYPE</th><th>UPLOAD DATE</th><th>PREVIEW</th><th style={{ width: '60px' }}></th></tr></thead>
                <tbody>
                  {existingMediaData.map((media: any) => {
                    const id = media._id || media.id;
                    const t = (media.type || "").toLowerCase();
                    const badge = t.includes('video') ? 'video' : t.includes('audio') ? 'audio' : 'image';
                    return (
                      <tr key={id}>
                        <td><input type="checkbox" className="store-checkbox" checked={selectedMediaIds.includes(id)} onChange={() => toggleMedia(id)} /></td>
                        <td style={{ fontWeight: 500, color: '#445459' }}>
                          {media.name}
                          {badge === 'audio' && selectedMediaIds.includes(id) && (
                            <div style={{ marginTop: 8, padding: '8px 10px', background: '#F8FAFB', borderRadius: 6, border: '1px dashed #D6E6E9', maxWidth: 220 }}>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: '#162B30' }}>
                                <input type="checkbox"
                                  checked={bgSettings[id]?.enabled || false}
                                  onChange={(e) => setBgSettings(p => ({ ...p, [id]: { ...p[id], enabled: e.target.checked } }))}
                                />
                                Enable BG image
                              </label>
                              {bgSettings[id]?.enabled && (
                                <div style={{ marginTop: 6 }}>
                                  {availableBgImages.length === 0 ? (
                                    <p style={{ fontSize: '0.75rem', color: '#64848D', marginTop: 4 }}>No background images available. Please upload an image first.</p>
                                  ) : (
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                                      {availableBgImages.map(img => {
                                        const isSelected = bgSettings[id]?.imageId === img._id;
                                        const imgUrl = img.url || img.fileUrl;
                                        return (
                                          <div
                                            key={img._id}
                                            onClick={(e) => { e.stopPropagation(); setBgSettings(p => ({ ...p, [id]: { ...p[id], imageId: isSelected ? "" : img._id } })); }}
                                            style={{
                                              width: 50, height: 38, borderRadius: 4, overflow: 'hidden',
                                              border: isSelected ? '2px solid #F05A28' : '1px solid #EAEFEF',
                                              cursor: 'pointer', position: 'relative'
                                            }}
                                            title={img.name}
                                          >
                                            {imgUrl && <img src={imgUrl} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                            {isSelected && <div style={{ position: 'absolute', top: 2, right: 2, background: '#F05A28', color: '#fff', borderRadius: '50%', width: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaCheck size={6} /></div>}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td><span className={`store-type-badge store-type-badge--${badge}`}>{media.type || 'Media'}</span></td>
                        <td style={{ color: '#445459' }}>{media.createdAt ? new Date(media.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}</td>
                        <td><button className="store-preview-btn" onClick={() => { setPreviewMediaUrl(media.url || media.fileUrl); setPreviewMediaName(media.name); }}><FaPlay size={10} /> Preview</button></td>
                        <td><button className="store-table-action-btn store-table-action-btn--delete"><FaTrash /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Step 2/3: Setup Playlist */}
      <div className="store-step-card">
        <div className="store-step-header">
          <div className="store-step-number">{selectionMode === "existing" ? "3" : "2"}</div>
          <div>
            <h2 className="store-step-title">Let's setup your playlist</h2>
            <p className="store-step-subtitle">Setup your playlist here</p>
          </div>
        </div>

        <div className="store-step-content">
          <div className="store-form-grid">
            <div className="store-form-group">
              <label>Playlist name</label>
              <input type="text" placeholder="Enter playlist name" value={playlistName} onChange={e => setPlaylistName(e.target.value)} />
            </div>
            <div className="store-form-group">
              <label>Type</label>
              <select value={playlistType} onChange={e => setPlaylistType(e.target.value)}><option value="">Select type</option><option value="media">Media</option><option value="promotional">Promotional</option></select>
            </div>
            <div className="store-form-group"><label>Start date</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
            <div className="store-form-group"><label>End date</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
            <div className="store-form-group"><label>Start time</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
            <div className="store-form-group"><label>End time</label><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></div>
          </div>

          <div className="store-form-group store-form-group--full mt-4">
            <label>Days of the week</label>
            <div className="store-days-selector">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
              <button key={day} className={`store-day-pill ${selectedDays.includes(day) ? "store-day-pill--active" : ""}`} onClick={() => toggleDay(day)}>{day}</button>
            ))}</div>
          </div>

          <div className="store-volume-settings-box">
            <h4>Global volume settings</h4>
            <div className="store-volume-controls">
              <span className="store-volume-label store-volume-label--min">Min : 30%</span>
              <div className="store-volume-slider-wrap"><input type="range" min="0" max="100" value={volume} onChange={e => setVolume(Number(e.target.value))} className="store-volume-slider" /></div>
              <span className="store-volume-label store-volume-label--max">Max : {volume}%</span>
            </div>
            <button className="store-btn-outline-orange mt-3">Apply volume for all files</button>
          </div>

          {/* Select Stores - Real devices */}
          <div className="store-form-group store-form-group--full mt-4">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div><label style={{ fontSize: '.95rem', fontWeight: 700 }}>Select Device</label><p style={{ fontSize: '.78rem', color: '#64848D', marginTop: 4 }}>Choose which store will play this playlist</p></div>
              {devices.length > 0 && <button style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid #F05A28', color: '#F05A28', background: '#fff', fontWeight: 600, fontSize: '.8rem', cursor: 'pointer' }} onClick={() => { const all = devices.flatMap(d => d.deviceIds); setSelectedDeviceIds(selectedDeviceIds.length === all.length ? [] : all); }}>Select All</button>}
            </div>
            {loadingDevices ? <div style={{ padding: 24, textAlign: 'center', color: '#A4B6B9' }}>Loading stores…</div>
              : devices.length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: '#A4B6B9', border: '1px dashed #D6E6E9', borderRadius: 12, background: '#F8FAFB' }}>No devices connected to this store yet.</div>
                : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                  {devices.map(s => {
                    const isSel = selectedDeviceIds.includes(s._id);
                    const isOnline = (s.status || "").toLowerCase() === "online";
                    return (<div key={s._id} onClick={() => toggleDevice(s._id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, border: `2px solid ${isSel ? '#F05A28' : '#EAEFEF'}`, borderRadius: 14, cursor: 'pointer', background: isSel ? '#FFF8F5' : '#fff', position: 'relative' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: '#EAF6F8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F05A28' }}><FaDesktop size={14} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: '.82rem', color: '#162B30' }}>{s.name} <span style={{ color: isOnline ? '#16A34A' : '#DC2626', fontSize: 10 }}>●</span></p>
                        <p style={{ fontSize: '.7rem', color: '#A4B6B9', marginTop: 2 }}>{s.address}</p>
                        <p style={{ fontSize: '.7rem', fontWeight: 700, color: isOnline ? '#16A34A' : '#DC2626', marginTop: 4 }}>{s.status || "Inactive"}</p>
                        {isSel && editingPlaylist && (
                          <button
                            onClick={(e) => handleDisconnectDevice(e, s._id)}
                            disabled={disconnectingId === s._id}
                            style={{
                              marginTop: 6,
                              padding: '4px 8px',
                              background: '#FFF2F2',
                              color: '#DC2626',
                              border: '1px solid #FECACA',
                              borderRadius: 4,
                              fontSize: '0.7rem',
                              cursor: disconnectingId === s._id ? 'not-allowed' : 'pointer',
                              opacity: disconnectingId === s._id ? 0.6 : 1
                            }}
                          >
                            {disconnectingId === s._id ? 'Disconnecting...' : 'Disconnect'}
                          </button>
                        )}
                      </div>
                      {isSel && <div style={{ position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: '50%', background: '#F05A28', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><FaCheck size={8} /></div>}
                    </div>);
                  })}
                </div>}
          </div>

          <div className="store-form-actions">
            <button className="store-btn-outline-grey" onClick={() => { setPlaylistName(''); setSelectedDeviceIds([]); setSelectedMediaIds([]); setSelectedFiles([]) }}>Reset</button>
            <button className="store-btn-solid-orange store-btn-solid-orange--icon" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Creating…' : 'Connect playlist to stores'}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div className="store-modal-overlay" onClick={() => setPreviewFile(null)}>
          <div className="store-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="store-modal-header">
              <h3>Preview: {previewFile.name}</h3>
              <button className="store-modal-close" onClick={() => setPreviewFile(null)}>×</button>
            </div>
            <div className="store-modal-body">
              {previewFile.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(previewFile)} alt="Preview" style={{ maxWidth: '100%', borderRadius: 8 }} />
              ) : previewFile.type.startsWith('audio/') ? (
                <audio src={URL.createObjectURL(previewFile)} controls style={{ width: '100%' }} autoPlay />
              ) : previewFile.type.startsWith('video/') ? (
                <video src={URL.createObjectURL(previewFile)} controls style={{ maxWidth: '100%', borderRadius: 8 }} autoPlay />
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: '#64848D' }}>
                  Preview not available for this file type ({previewFile.type})
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Existing Media Preview Modal */}
      {previewMediaUrl && (
        <div className="store-modal-overlay" onClick={() => setPreviewMediaUrl(null)}>
          <div className="store-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="store-modal-header">
              <h3>Preview: {previewMediaName}</h3>
              <button className="store-modal-close" onClick={() => setPreviewMediaUrl(null)}>×</button>
            </div>
            <div className="store-modal-body">
              {previewMediaUrl.match(/\.(mp3|wav|ogg)$/i) || previewMediaUrl.includes('audio') ? (
                <audio src={previewMediaUrl} controls style={{ width: '100%' }} autoPlay />
              ) : previewMediaUrl.match(/\.(mp4|webm|ogg)$/i) || previewMediaUrl.includes('video') ? (
                <video src={previewMediaUrl} controls style={{ maxWidth: '100%', borderRadius: 8 }} autoPlay />
              ) : (
                <img src={previewMediaUrl} alt="Preview" style={{ maxWidth: '100%', borderRadius: 8 }} />
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .store-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.7);
          display: flex; align-items: center; justify-content: center; z-index: 1000;
          backdrop-filter: blur(4px);
        }
        .store-preview-modal {
          background: #fff; width: 90%; max-width: 600px; border-radius: 16px;
          overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.3);
        }
        .store-modal-header {
          padding: 16px 24px; border-bottom: 1px solid #EAEFEF;
          display: flex; justify-content: space-between; align-items: center;
        }
        .store-modal-header h3 { font-size: 1rem; font-weight: 700; color: #162B30; margin: 0; }
        .store-modal-close {
          background: none; border: none; font-size: 1.5rem; color: #A4B6B9;
          cursor: pointer; line-height: 1;
        }
        .store-modal-body {
          padding: 24px; display: flex; align-items: center; justify-content: center;
          background: #F8FAFB; min-height: 200px;
        }
        
        .store-create-playlist-view {
          display: flex; flex-direction: column; gap: 24px;
        }

        .store-step-card {
          background: #fff; border-radius: 12px; overflow: hidden;
          border: 1px solid #D6E6E9; border-left: 3px solid #F05A28;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }

        .store-step-header {
          display: flex; align-items: center; gap: 16px;
          background: #0B2830; padding: 20px 24px;
          color: #fff;
        }
        .store-step-number {
          width: 32px; height: 32px; background: #fff; border-radius: 8px;
          color: #F05A28; font-size: 1rem; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
        }
        .store-step-title { font-size: 1.15rem; font-weight: 700; margin-bottom: 2px; }
        .store-step-subtitle { font-size: 0.8rem; color: #8CABB3; }

        .store-step-content { padding: 32px; }
        .store-step-content--no-pad { padding: 0; }

        .store-media-selection-options {
          display: flex; gap: 24px; margin-bottom: 24px;
        }
        @media (max-width: 600px) { .store-media-selection-options { flex-direction: column; } }

        .store-media-option-box {
          flex: 1; border: 1px dashed #D6E6E9; border-radius: 12px;
          padding: 24px; display: flex; flex-direction: column; align-items: center;
          text-align: center; cursor: pointer; transition: all 0.2s;
        }
        .store-media-option-box:hover { border-color: #F05A28; background: #FFF2F2; }
        .store-media-option-box--active { border-color: #F05A28; border-style: solid; background: #FFF2F2; }
        
        .store-media-option-icon {
          width: 48px; height: 48px; background: #fff; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          color: #F05A28; font-size: 1.1rem; margin-bottom: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .store-media-option-box h3 { font-size: 0.95rem; font-weight: 700; color: #162B30; margin-bottom: 6px; }
        .store-media-option-box p { font-size: 0.8rem; color: #64848D; }

        .store-upload-file-section {
          margin-top: 16px; display: flex; flex-direction: column; gap: 12px;
        }
        .store-file-dropzone {
          width: 100%; padding: 32px; border: 2px dashed #D6E6E9; border-radius: 12px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          background: #F8FAFB; color: #64848D; cursor: pointer; transition: 0.2s;
        }
        .store-file-dropzone:hover { border-color: #F05A28; background: #FFF8F5; color: #F05A28; }
        .store-file-dropzone p { font-size: 0.9rem; font-weight: 600; margin-bottom: 4px; }

        .store-selected-files-list {
          display: flex; flex-direction: column; gap: 8px; margin-top: 8px;
          max-height: 240px; overflow-y: auto; padding-right: 4px;
        }
        .store-selected-file-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px; background: #fff; border: 1px solid #EAEFEF; border-radius: 10px;
          transition: 0.2s;
        }
        .store-selected-file-item:hover { border-color: #D6E6E9; background: #F8FAFB; }
        .store-file-info { display: flex; align-items: center; gap: 12px; }
        .store-file-icon-sm {
          width: 32px; height: 32px; border-radius: 6px; background: #EAF6F8;
          display: flex; align-items: center; justify-content: center; color: #F05A28;
        }
        .store-file-name { font-size: 0.85rem; font-weight: 600; color: #162B30; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
        
        .store-file-actions { display: flex; gap: 8px; }
        .store-file-action-btn {
          width: 28px; height: 28px; border-radius: 6px; border: none;
          background: #F1F6F8; color: #11B5BB; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: 0.2s;
        }
        .store-file-action-btn:hover { background: #11B5BB; color: #fff; }
        .store-file-action-btn--remove { color: #DC2626; background: #FFF2F2; }
        .store-file-action-btn--remove:hover { background: #DC2626; color: #fff; }

        .store-input-label { font-size: 0.85rem; font-weight: 600; color: #162B30; }
        
        .store-upload-actions-bar {
          display: flex; align-items: center; justify-content: space-between;
          background: #F8FAFB; padding: 12px 16px; border-radius: 8px;
          margin-top: 8px;
        }
        .store-file-selected-text { font-size: 0.85rem; color: #F05A28; font-weight: 600; }
        .store-upload-actions-right { display: flex; gap: 12px; }

        .store-btn-text-orange { background: none; border: none; color: #F05A28; font-weight: 600; font-size: 0.9rem; cursor: pointer; }
        .store-btn-solid-orange { background: #F05A28; color: #fff; border: none; border-radius: 6px; padding: 10px 20px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: 0.15s; }
        .store-btn-solid-orange:hover { background: #DC4B1D; }

        /* Step 2 Existing List */
        .store-existing-filters {
          display: flex; align-items: flex-end; gap: 16px; padding: 24px;
        }
        .store-filter-group { display: flex; flex-direction: column; gap: 6px; }
        .store-filter-group label { font-size: 0.8rem; font-weight: 600; color: #162B30; }
        .store-filter-group select {
          appearance: none; background: #fff; border: 1px solid #EAEFEF; border-radius: 6px;
          padding: 10px 32px 10px 14px; font-size: 0.85rem; color: #445459; outline: none;
        }
        .store-select-wrap { display: flex; align-items: center; border: 1px solid #EAEFEF; border-radius: 6px; padding-left: 14px; }
        .store-select-prefix { font-size: 0.85rem; color: #A4B6B9; margin-right: 4px; }
        .store-select-wrap select { border: none; padding-left: 0; background: transparent; }
        .store-btn-go { height: 38px; padding: 0 24px; }

        .store-existing-table { width: 100%; border-collapse: collapse; }
        .store-existing-table thead tr { border-bottom: 1px solid #EAEFEF; background: #F8FAFB; }
        .store-existing-table th {
          padding: 14px 20px; text-align: left; font-size: 0.75rem; font-weight: 700; color: #162B30;
        }
        .store-existing-table td { padding: 16px 20px; font-size: 0.85rem; border-bottom: 1px solid #F4F7F8; }
        .store-checkbox { width: 16px; height: 16px; cursor: pointer; }
        
        .store-type-badge { padding: 4px 10px; border-radius: 12px; font-size: 0.7rem; font-weight: 700; }
        .store-type-badge--video { background: #F3E8FF; color: #9333EA; }
        .store-type-badge--audio { background: #DCFCE7; color: #16A34A; }
        .store-type-badge--image { background: #E0E7FF; color: #4F46E5; }

        .store-preview-btn {
          background: none; border: none; color: #F05A28; font-weight: 600; font-size: 0.8rem;
          display: flex; align-items: center; gap: 6px; cursor: pointer;
        }
        .store-table-action-btn--delete {
          background: #FFF2F2; color: #DC2626; border: none; width: 30px; height: 30px; border-radius: 6px;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
        }

        /* Form Grid */
        .store-form-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 20px 24px;
        }
        @media (max-width: 600px) { .store-form-grid { grid-template-columns: 1fr; } }
        
        .store-form-group { display: flex; flex-direction: column; gap: 8px; }
        .store-form-group--full { grid-column: 1 / -1; }
        .store-form-group label { font-size: 0.85rem; font-weight: 600; color: #162B30; }
        .store-form-group input, .store-form-group select {
          padding: 12px 16px; border: 1px solid #EAEFEF; border-radius: 8px;
          font-size: 0.9rem; color: #162B30; outline: none; background: #F8FAFB;
        }

        .mt-4 { margin-top: 24px; }
        .mt-3 { margin-top: 16px; }

        /* Days Selector */
        .store-days-selector { display: flex; flex-wrap: wrap; gap: 10px; }
        .store-day-pill {
          padding: 8px 18px; border: 1px solid #D6E6E9; border-radius: 6px;
          background: #fff; color: #64848D; font-size: 0.85rem; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
        }
        .store-day-pill--active { background: #F05A28; color: #fff; border-color: #F05A28; }

        /* Volume Settings */
        .store-volume-settings-box {
          background: #F8FAFB; border-radius: 12px; padding: 24px; margin-top: 24px;
        }
        .store-volume-settings-box h4 { font-size: 0.95rem; font-weight: 700; color: #162B30; margin-bottom: 20px; }
        
        .store-volume-controls { display: flex; align-items: center; gap: 16px; }
        .store-volume-label { font-size: 0.85rem; font-weight: 700; }
        .store-volume-label--min { color: #11B5BB; }
        .store-volume-label--max { color: #F05A28; }
        
        .store-volume-slider-wrap { flex: 1; }
        .store-volume-slider { width: 100%; accent-color: #F05A28; cursor: pointer; }
        
        .store-btn-outline-orange {
          background: none; border: 1px solid #F05A28; color: #F05A28;
          border-radius: 6px; padding: 8px 16px; font-weight: 600; font-size: 0.8rem;
          cursor: pointer;
        }

        .store-form-actions { display: flex; gap: 16px; margin-top: 32px; }
        .store-btn-outline-grey {
          background: #fff; border: 1px solid #D6E6E9; color: #445459;
          border-radius: 8px; padding: 12px 24px; font-weight: 600; font-size: 0.9rem;
          cursor: pointer;
        }
        .store-btn-solid-orange--icon { display: flex; align-items: center; gap: 8px; }
      `}</style>
    </div>
  );
}
