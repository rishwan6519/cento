"use client";
import React, { useState, useEffect, useRef } from "react";
import { FaUpload, FaMicrophone, FaVolumeUp, FaFolderOpen, FaDesktop, FaCheck, FaStop, FaRedo, FaStore, FaArrowLeft, FaEye, FaTrash } from "react-icons/fa";
import { ViewKey } from "./page";

interface Props {
  onNavigate: (view: ViewKey) => void;
  isInstant?: boolean;
  editingPlaylist?: any;
}

export default function CreateAnnouncement({ onNavigate, isInstant = false, editingPlaylist }: Props) {
  const [method, setMethod] = useState<"upload" | "record" | "tts" | "library">("upload");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [playlistName, setPlaylistName] = useState("");
  const [announcementType, setAnnouncementType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [frequencyInMinutes, setFrequencyInMinutes] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  const [volumeMin] = useState(30);
  const [volumeMax] = useState(80);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") ?? "" : "";

  // Populate from editingPlaylist
  useEffect(() => {
    if (editingPlaylist) {
      const formatDate = (d: any) => {
        if (!d) return "";
        const date = new Date(d);
        return isNaN(date.getTime()) ? "" : date.toISOString().split('T')[0];
      };

      // Support both PlaylistConfig and AnnouncementPlaylist structures
      const schedule = editingPlaylist.schedule || {};
      
      setPlaylistName(editingPlaylist.name || "");
      setAnnouncementType(editingPlaylist.type || "");
      setStartDate(formatDate(editingPlaylist.startDate || schedule.startDate));
      setEndDate(formatDate(editingPlaylist.endDate || schedule.endDate));
      setStartTime(editingPlaylist.startTime || schedule.startTime || "");
      setEndTime(editingPlaylist.endTime || schedule.endTime || "");
      setFrequencyInMinutes(editingPlaylist.frequencyInMinutes || schedule.frequency || "");
      setSelectedDays(editingPlaylist.daysOfWeek || schedule.daysOfWeek || []);
      
      // Device IDs mapping (depends on how we fetch connections in ViewAllCampaigns)
      setSelectedDeviceIds(editingPlaylist.deviceIds || []);

      const items = editingPlaylist.announcements || [];
      if (items.length > 0) {
        setMethod("library");
        // For AnnouncementPlaylist, the URL is stored directly in item.file (string)
        const mediaUrls = items.map((item: any) => item.file?._id || item.file || item._id);
        setSelectedLibraryIds(mediaUrls);
      }
    }
  }, [editingPlaylist]);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecordingSaved, setIsRecordingSaved] = useState(false);
  const timerRef = useRef<any>(null);

  // TTS state
  const [ttsText, setTtsText] = useState("");
  const [ttsAudioUrl, setTtsAudioUrl] = useState<string | null>(null);
  const [ttsBlob, setTtsBlob] = useState<Blob | null>(null);
  const [isTtsGenerating, setIsTtsGenerating] = useState(false);
  const [isTtsSaved, setIsTtsSaved] = useState(false);
  const [ttsVoice, setTtsVoice] = useState("Puck"); // Professional Male

  // Library state
  const [libraryMedia, setLibraryMedia] = useState<any[]>([]);
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<string[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);

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
          storeName: a.userId?.storeName || a.userId?.username || "Store",
          address: a.userId?.storeLocation || "123 Main St, Sale, VIC 3850",
          status: a.deviceId?.status || "inactive",
          serialNumber: a.deviceId?.serialNumber || "N/A",
          deviceIds: [a.deviceId?._id || a._id]
        }));
        setDevices(individualDevices);
      })
      .catch(() => setDevices([]))
      .finally(() => setLoadingDevices(false));
  }, [userId]);

  // Fetch library when method=library
  useEffect(() => {
    if (method !== "library" || !userId) return;
    setLoadingLibrary(true);
    fetch(`/api/media?userId=${userId}`).then(r => r.json())
      .then(d => {
        const mediaList = d.media || d.mediaFiles || d.data || [];
        setLibraryMedia(mediaList);
        
        // Map any URLs currently in selectedLibraryIds to their actual _id
        setSelectedLibraryIds(prev => prev.map(idOrUrl => {
          const match = mediaList.find((m: any) => m.url === idOrUrl);
          return match ? match._id : idOrUrl;
        }));
      })
      .catch(() => setLibraryMedia([]))
      .finally(() => setLoadingLibrary(false));
  }, [method, userId]);

  const toggleDay = (d: string) => setSelectedDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);
  const toggleStore = (id: string) => {
    const devId = id; // id is actually the deviceId now
    setSelectedDeviceIds(p => p.includes(devId) ? p.filter(x => x !== devId) : [...p, devId]);
  };

  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  const handleDisconnectDevice = async (e: React.MouseEvent, deviceId: string) => {
    e.stopPropagation();
    if (!editingPlaylist || (!editingPlaylist._id && !editingPlaylist.id)) return;

    setDisconnectingId(deviceId);
    try {
      const res = await fetch('/api/announcement/disconnect', {
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

  const formatDur = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const startRecording = async () => {
    try {
      setRecordedBlob(null); setIsRecordingSaved(false);
      if (audioUrl) URL.revokeObjectURL(audioUrl); setAudioUrl(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: Blob[] = [];
      rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      rec.onstop = () => { const b = new Blob(chunks, { type: 'audio/webm' }); if (b.size > 0) { setRecordedBlob(b); setAudioUrl(URL.createObjectURL(b)); } stream.getTracks().forEach(t => t.stop()); };
      rec.start(); setMediaRecorder(rec); setIsRecording(true); setRecordingDuration(0);
      timerRef.current = setInterval(() => setRecordingDuration(p => p + 1), 1000);
    } catch { alert('Could not access microphone'); }
  };
  const stopRecording = () => { if (mediaRecorder && isRecording) { mediaRecorder.stop(); setIsRecording(false); if (timerRef.current) clearInterval(timerRef.current); } };
  const saveRecording = () => setIsRecordingSaved(true);

  const handleTtsGenerate = async () => {
    if (!ttsText || !userId) return;
    setIsTtsGenerating(true);
    setTtsAudioUrl(null);
    setTtsBlob(null);
    setIsTtsSaved(false);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: ttsText, voice: ttsVoice, userId })
      });
      if (res.ok) {
        const blob = await res.blob();
        setTtsBlob(blob);
        setTtsAudioUrl(URL.createObjectURL(blob));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to generate TTS");
      }
    } catch {
      alert("Network error during TTS generation");
    } finally {
      setIsTtsGenerating(false);
    }
  };
  const saveTts = () => setIsTtsSaved(true);

  const getMethodSummary = () => {
    if (method === 'upload') return selectedFiles.length > 0 ? 'Ready to upload' : 'Pending selection';
    if (method === 'record') return isRecordingSaved ? 'Recording saved' : isRecording ? 'Recording...' : 'Ready to record';
    if (method === 'tts') return isTtsSaved ? 'TTS saved' : isTtsGenerating ? 'Generating...' : ttsText ? 'Ready to generate' : 'Pending input';
    if (method === 'library') return selectedLibraryIds.length > 0 ? `${selectedLibraryIds.length} item(s) selected` : 'Pending selection';
    return '';
  };
  const getMethodLabel = () => ({ upload: 'Upload new file', record: 'Record Audio', tts: 'Text to Speech', library: 'Library Selection' }[method]);
  const getMethodIcon = () => ({ upload: <FaUpload size={14} />, record: <FaMicrophone size={14} />, tts: <FaVolumeUp size={14} />, library: <FaFolderOpen size={14} /> }[method]);

  const handleSubmit = async () => {
    if (selectedDeviceIds.length === 0) return;
    setSubmitting(true);
    try {
      let mediaUrls: string[] = [];
      if (method === "upload" && selectedFiles.length > 0) {
        const fd = new FormData();
        fd.append("userId", userId); fd.append("userRole", "store");
        selectedFiles.forEach((f, i) => { fd.append(`files[${i}]`, f); fd.append(`fileNames[${i}]`, f.name); });
        const r = await fetch("/api/media/upload", { method: "POST", body: fd });
        const d = await r.json();
        if (d.success) mediaUrls = d.files.map((f: any) => f.url);
      } else if (method === "record" && recordedBlob && isRecordingSaved) {
        const fd = new FormData();
        fd.append("userId", userId); fd.append("userRole", "store");
        const fn = `recording_${Date.now()}.wav`;
        fd.append('files[0]', new File([recordedBlob], fn, { type: 'audio/wav' }));
        fd.append('fileNames[0]', fn);
        const r = await fetch("/api/media/upload", { method: "POST", body: fd });
        const d = await r.json();
        if (d.success) mediaUrls = d.files.map((f: any) => f.url);
      } else if (method === "tts" && ttsBlob && isTtsSaved) {
        const fd = new FormData();
        fd.append("userId", userId); fd.append("userRole", "store");
        const fn = `tts_${Date.now()}.wav`;
        fd.append('files[0]', new File([ttsBlob], fn, { type: 'audio/wav' }));
        fd.append('fileNames[0]', fn);
        const r = await fetch("/api/media/upload", { method: "POST", body: fd });
        const d = await r.json();
        if (d.success) mediaUrls = d.files.map((f: any) => f.url);
      } else if (method === "library" && selectedLibraryIds.length > 0) {
        // Map selected library IDs to their corresponding URLs
        mediaUrls = selectedLibraryIds.map(id => {
          const item = libraryMedia.find((m: any) => (m._id || m.id) === id);
          return item ? item.url : id;
        });
      }

      // Convert edit data to keep previous media if no new media was provided
      if (mediaUrls.length === 0 && editingPlaylist?.announcements) {
        mediaUrls = editingPlaylist.announcements.map((a: any) => a.file);
      }

      if (mediaUrls.length === 0) {
        alert("Please select or upload at least one file.");
        return;
      }

      // ========== INSTANT ANNOUNCEMENT FLOW ==========
      if (isInstant) {
        const audioUrl = mediaUrls[0]; // Use the first file for instant
        let successCount = 0;
        let failCount = 0;

        for (const deviceId of selectedDeviceIds) {
          // Find the device's serial number
          const device = devices.find((d: any) => d._id === deviceId);
          const serialNumber = device?.serialNumber;
          if (!serialNumber || serialNumber === "N/A") {
            failCount++;
            continue;
          }

          const sendRes = await fetch("/api/instant-announcement/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              deviceId: serialNumber,
              audioUrl,
              announcementName: playlistName || "Instant Announcement"
            })
          });

          const sendData = await sendRes.json();
          if (sendRes.ok && sendData.success) {
            successCount++;
          } else {
            failCount++;
          }
        }

        if (successCount > 0) {
          alert(`Instant announcement broadcast to ${successCount} device(s)${failCount > 0 ? ` (${failCount} failed)` : ''}`);
          onNavigate("dashboard");
        } else {
          alert("Failed to broadcast instant announcement to any device.");
        }
        return;
      }

      // ========== REGULAR ANNOUNCEMENT FLOW ==========
      const payload = {
        userId,
        name: playlistName,
        type: announcementType || "announcement",
        announcements: mediaUrls.map((url, index) => ({
          file: url,
          displayOrder: index + 1,
          delay: 0,
          maxVolume: volumeMax
        })),
        schedule: {
          scheduleType: frequencyInMinutes ? 'hourly' : 'timed',
          frequency: frequencyInMinutes ? Number(frequencyInMinutes) : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          daysOfWeek: selectedDays.length > 0 ? selectedDays : undefined
        },
        status: 'active'
      };

      const fetchUrl = editingPlaylist 
        ? `/api/announcement/playlist/id?id=${editingPlaylist._id || editingPlaylist.id}`
        : "/api/announcement/playlist";
      const fetchMethod = editingPlaylist ? "PUT" : "POST";
      
      const res = await fetch(fetchUrl, {
        method: fetchMethod,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Extract playlist ID from response — POST returns `announcementPlaylistId`, PUT returns `playlist`
        const playlistId = data.announcementPlaylistId || data.playlist?._id || (editingPlaylist?._id || editingPlaylist?.id);
        
        // Assign to selected devices
        const assignRes = await fetch("/api/announcement/assign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            deviceIds: selectedDeviceIds,
            announcementPlaylistId: playlistId
          })
        });
        
        const assignData = await assignRes.json();
        
        if (!assignRes.ok) {
          alert(assignData.error || "Conflict occurred during assignment.");
          // We don't navigate to dashboard if assignment failed due to conflict
          return;
        }
        
        onNavigate("dashboard");
      } else {
        alert(data.error || "Failed to save announcement");
      }
    } catch { 
      alert("Error saving announcement");
    } finally { 
      setSubmitting(false); 
    }
  };

  const selectedStoreCount = devices.filter(s => s._id && selectedDeviceIds.includes(s._id)).length;

  const renderMethodContent = () => {
    if (method === 'record') return (
      <div className="su-ca-upload-area">
        <div className="su-ca-upload-icon" style={{ background: isRecording ? '#FEE2E2' : undefined, color: isRecording ? '#DC2626' : undefined }}><FaMicrophone size={24} /></div>
        <h3>{isRecording ? 'Recording in progress...' : audioUrl ? 'Recording ready' : 'Ready to record'}</h3>
        {!audioUrl && <p>{isRecording ? `Recording: ${formatDur(recordingDuration)}` : 'Click the button below to start recording your announcement.'}</p>}
        {audioUrl && <div style={{ width: '100%', maxWidth: 340, margin: '12px auto' }}><audio src={audioUrl} controls style={{ width: '100%' }} /></div>}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {audioUrl ? (isRecordingSaved ? (
            <button className="su-ca-upload-btn" style={{ background: '#fff', color: '#445459', border: '1px solid #D6E6E9' }} onClick={() => { setRecordedBlob(null); setAudioUrl(null); setIsRecordingSaved(false); startRecording(); }}>Re-record</button>
          ) : (<>
            <button className="su-ca-upload-btn" style={{ background: '#fff', color: '#445459', border: '1px solid #D6E6E9' }} onClick={() => { setRecordedBlob(null); setAudioUrl(null); startRecording(); }}>Re-record</button>
            <button className="su-ca-upload-btn" onClick={saveRecording}><FaCheck size={12} /> Save</button>
          </>)) : (
            <button className="su-ca-upload-btn" onClick={isRecording ? stopRecording : startRecording}>
              {isRecording ? <><FaStop size={12} /> Stop Recording</> : 'Start Recording'}
            </button>
          )}
        </div>
      </div>
    );
    if (method === 'tts') return (
      <div className="su-ca-upload-area" style={{ cursor: 'default' }}>
        <div style={{ width: '100%', textAlign: 'left', marginBottom: 12 }}>
          <label style={{ fontSize: '.82rem', fontWeight: 700, color: '#162B30' }}>Announcement text</label>
          <textarea value={ttsText} onChange={e => setTtsText(e.target.value)} placeholder="Welcome to our store! Today we have..." style={{ width: '100%', minHeight: 100, padding: 12, border: '1px solid #EAEFEF', borderRadius: 10, resize: 'none', marginTop: 8, fontFamily: 'inherit', fontSize: '.88rem' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}><span style={{ fontSize: '.72rem', color: '#A4B6B9' }}>{ttsText.length} characters</span><span style={{ fontSize: '.72rem', color: '#A4B6B9', fontStyle: 'italic' }}>Recommended: 30-200 words</span></div>
        </div>
        {ttsAudioUrl && <div style={{ width: '100%', maxWidth: 340, margin: '12px auto' }}><audio src={ttsAudioUrl} controls style={{ width: '100%' }} /></div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%', marginBottom: 16 }}>
          <div><label style={{ fontSize: '.75rem', fontWeight: 700, color: '#64848D' }}>Language & Accent</label><select style={{ width: '100%', padding: '10px 14px', border: '1px solid #EAEFEF', borderRadius: 8, marginTop: 6, fontSize: '.85rem' }}><option>English (US)</option><option>English (UK)</option></select></div>
          <div><label style={{ fontSize: '.75rem', fontWeight: 700, color: '#64848D' }}>Voice style</label><select value={ttsVoice} onChange={e => setTtsVoice(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid #EAEFEF', borderRadius: 8, marginTop: 6, fontSize: '.85rem' }}><option value="Puck">Professional Male</option><option value="Kore">Warm Female</option><option value="Charon">Soft Male</option><option value="Fenrir">Bold Male</option></select></div>
        </div>
        <div style={{ display: 'flex', gap: 12, width: '100%' }}>
          <button className="su-ca-upload-btn" style={{ flex: 1, background: '#162B30' }} onClick={handleTtsGenerate} disabled={isTtsGenerating || !ttsText}>{isTtsGenerating ? 'Generating...' : 'Generate & Preview'}</button>
          {ttsAudioUrl && !isTtsSaved && <button className="su-ca-upload-btn" style={{ flex: 0.5 }} onClick={saveTts}><FaCheck size={12} /> Save</button>}
        </div>
      </div>
    );
    if (method === 'library') return (
      <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loadingLibrary ? <div style={{ padding: 32, textAlign: 'center', color: '#A4B6B9' }}>Loading library…</div>
          : libraryMedia.length === 0 ? <div style={{ padding: 32, textAlign: 'center', color: '#A4B6B9', border: '1px dashed #D6E6E9', borderRadius: 12 }}>No saved announcements found.</div>
            : libraryMedia.map(item => (
              <div key={item._id} onClick={() => setSelectedLibraryIds(p => p.includes(item._id) ? p.filter(id => id !== item._id) : [...p, item._id])} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, cursor: 'pointer', border: `2px solid ${selectedLibraryIds.includes(item._id) ? '#F05A28' : '#EAEFEF'}`, background: selectedLibraryIds.includes(item._id) ? '#FFF8F5' : '#fff' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FFF2F2', color: '#F05A28', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaVolumeUp size={16} /></div>
                <div style={{ flex: 1, minWidth: 0 }}><p style={{ fontWeight: 700, fontSize: '.85rem', color: '#162B30' }}>{item.name}</p><p style={{ fontSize: '.72rem', color: '#64848D' }}>{item.type || 'Uploaded'} • {item.duration || '0:45'}</p></div>
                <button className="su-ca-file-btn" style={{ marginRight: selectedLibraryIds.includes(item._id) ? 8 : 0 }} onClick={(e) => { e.stopPropagation(); setPreviewFile(item); }}><FaEye size={12} /></button>
                {selectedLibraryIds.includes(item._id) && <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid #F05A28', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F05A28' }}><FaCheck size={10} /></div>}
              </div>
            ))}
      </div>
    );
    // default: upload
    return (
      <div className="su-ca-upload-container">
        <div className="su-ca-upload-area" onClick={() => fileInputRef.current?.click()}>
          <div className="su-ca-upload-icon"><FaUpload size={24} /></div>
          <h3>Upload file</h3>
          <p>Add media from your device. Audio, video, image.</p>
          <button className="su-ca-upload-btn">Browse files</button>
          <input ref={fileInputRef} type="file" multiple hidden onChange={e => {
            const newFiles = Array.from(e.target.files || []);
            setSelectedFiles(prev => [...prev, ...newFiles]);
          }} />
        </div>

        {selectedFiles.length > 0 && (
          <div className="su-ca-file-list">
            {selectedFiles.map((file, idx) => (
              <div key={`${file.name}-${idx}`} className="su-ca-file-item">
                <div className="su-ca-file-info">
                  <div className="su-ca-file-icon">
                    {file.type.startsWith('image/') ? <FaDesktop size={12} /> : <FaVolumeUp size={12} />}
                  </div>
                  <span className="su-ca-file-name">{file.name}</span>
                </div>
                <div className="su-ca-file-actions">
                  <button className="su-ca-file-btn" onClick={(e) => { e.stopPropagation(); setPreviewFile(file); }}><FaEye size={12} /></button>
                  <button className="su-ca-file-btn su-ca-file-btn--danger" onClick={(e) => { e.stopPropagation(); setSelectedFiles(prev => prev.filter((_, i) => i !== idx)); }}><FaTrash size={11} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="su-ca-view">
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
        <button onClick={() => onNavigate("mediaManagement")} style={{ background: "none", border: "none", cursor: "pointer", color: "#162B30", display: "flex", alignItems: "center", padding: 0 }}>
          <FaArrowLeft size={18} />
        </button>
        <h1 className="su-ca-title" style={{ margin: 0 }}>{isInstant ? "Create Instant Announcement" : "Create announcement"}</h1>
      </div>
      <p className="su-ca-subtitle" style={{ marginLeft: "30px" }}>{isInstant ? "Mission control for immediate broadcast announcements" : "Create new announcement campaign"}</p>

      <div className="su-ca-main-grid">
        {/* Left Column */}
        <div className="su-ca-left su-ca-full-width">
          {/* Upload Section */}
          <div className="su-ca-upload-section">
            <h3 className="su-ca-section-title">Upload Announcement</h3>
            <div className="su-ca-method-grid">
              {[
                { id: "upload", icon: <FaUpload />, label: "Upload new" },
                { id: "record", icon: <FaMicrophone />, label: "Record" },
                { id: "tts", icon: <FaVolumeUp />, label: "Text to Speech" },
                { id: "library", icon: <FaFolderOpen />, label: "Library" },
              ].map(m => (
                <button key={m.id} className={`su-ca-method-btn ${method === m.id ? "su-ca-method-btn--active" : ""}`} onClick={() => setMethod(m.id as any)}>
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
            {renderMethodContent()}
          </div>

          {/* Playlist Setup Form */}
          <div className="su-ca-card">
            <div className="su-ca-form-grid">
              <div className="su-ca-form-group"><label>{isInstant ? "Instant announcement name" : "Playlist name"}</label><input type="text" placeholder="Enter name" value={playlistName} onChange={e => setPlaylistName(e.target.value)} /></div>
              <div className="su-ca-form-group"><label>Type</label><select value={announcementType} onChange={e => setAnnouncementType(e.target.value)}><option value="">Select type</option><option value="offer">Offer</option><option value="alert">Alert</option></select></div>
              {!isInstant && (
                <>
                  <div className="su-ca-form-group"><label>Start date</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                  <div className="su-ca-form-group"><label>End date</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
                  <div className="su-ca-form-group"><label>Start time</label><input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
                  <div className="su-ca-form-group"><label>End time</label><input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} /></div>
                  <div className="su-ca-form-group"><label>Frequency (minutes)</label><input type="number" placeholder="e.g. 15" value={frequencyInMinutes} onChange={e => setFrequencyInMinutes(e.target.value)} min="1" /></div>
                </>
              )}

            </div>
            {!isInstant && (
              <div className="su-ca-form-group su-ca-form-group--full" style={{ marginTop: 20 }}>
                <label>Days of the week</label>
                <div className="su-ca-days">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                  <button key={d} className={`su-ca-day ${selectedDays.includes(d) ? "su-ca-day--active" : ""}`} onClick={() => toggleDay(d)}>{d}</button>
                ))}</div>
              </div>
            )}
            <div className="su-ca-volume-box">
              <h4>Global volume settings</h4>
              <div className="su-ca-volume-row">
                <span className="su-ca-vol-min">Min : {volumeMin}%</span>
                <div className="su-ca-vol-track"><div className="su-ca-vol-fill" style={{ left: `${volumeMin}%`, right: `${100 - volumeMax}%` }} /></div>
                <span className="su-ca-vol-max">Max : {volumeMax}%</span>
              </div>
              <button className="su-ca-vol-apply">Apply volume for all files</button>
            </div>
          </div>
        </div>
      </div>

      {/* Select Stores */}
      <div className="su-ca-card su-ca-stores-section">
        <div className="su-ca-stores-header">
          <div><h3 className="su-ca-section-title">Select stores</h3><p className="su-ca-stores-sub">Choose which store will play this announcement</p></div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <select style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #EAEFEF", fontSize: "0.8rem" }}><option>Location</option></select>
            <button className="su-ip-select-all-btn2" onClick={() => { const all = devices.flatMap(d => d.deviceIds); setSelectedDeviceIds(selectedDeviceIds.length === all.length ? [] : all); }}>Select All</button>
          </div>
        </div>
        {loadingDevices ? <div className="su-ip-empty">Loading…</div> : (
          <div className="su-ip-stores-grid2">
            {devices.map(s => {
              const isSelected = selectedDeviceIds.includes(s._id);
              const isOnline = (s.status || "").toLowerCase() === "online";
              return (
                <div key={s._id} className={`su-ip-store-card2 ${isSelected ? "su-ip-store-card2--sel" : ""}`} onClick={() => toggleStore(s._id)}>
                  <div className="su-ip-sicon"><FaStore size={16} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p className="su-ip-sname">{s.storeName} <span style={{ color: isOnline ? "#16A34A" : "#DC2626", fontSize: 10 }}>●</span></p>
                    <p className="su-ip-sdev" style={{ fontSize: '0.75rem', color: '#64848D', marginBottom: 2 }}>{s.name} ({s.serialNumber})</p>
                    <p className="su-ip-saddr">{s.address}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <p style={{ fontSize: "0.7rem", fontWeight: 700, color: isOnline ? "#16A34A" : "#DC2626", margin: 0 }}>{isOnline ? "Active" : "Offline"}</p>
                      {isSelected && editingPlaylist && <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600 }}>Assigned</span>}
                    </div>
                    {isSelected && editingPlaylist && (
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
                  {isSelected && <div className="su-ip-scheck"><FaCheck size={8} /></div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="su-ca-bottom-actions">
        <button className="su-ca-reset-btn" onClick={() => { setPlaylistName(""); setSelectedDeviceIds([]); setSelectedFiles([]); }}>Reset</button>
        <button className="su-ca-connect-btn" onClick={handleSubmit} disabled={submitting}>
          <FaUpload size={12} /> {submitting ? "Broadcasting..." : isInstant ? "Broadcast Now" : "Connect announcement to stores"}
        </button>
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div className="su-modal-overlay" onClick={() => setPreviewFile(null)}>
          <div className="su-preview-modal" onClick={e => e.stopPropagation()}>
            <div className="su-modal-header">
              <h3>Preview: {previewFile.name}</h3>
              <button className="su-modal-close" onClick={() => setPreviewFile(null)}>×</button>
            </div>
            <div className="su-modal-body">
              {previewFile instanceof File ? (
                // Browser File object (from upload)
                previewFile.type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(previewFile)} alt="Preview" style={{ maxWidth: '100%', borderRadius: 8 }} />
                ) : previewFile.type.startsWith('audio/') ? (
                  <audio src={URL.createObjectURL(previewFile)} controls style={{ width: '100%' }} autoPlay />
                ) : previewFile.type.startsWith('video/') ? (
                  <video src={URL.createObjectURL(previewFile)} controls style={{ maxWidth: '100%', borderRadius: 8 }} autoPlay />
                ) : (
                  <div style={{ padding: 40, textAlign: 'center', color: '#64848D' }}>Preview not available</div>
                )
              ) : (
                // Library item (API object with .url and .type)
                (previewFile.type || '').includes('image') ? (
                  <img src={previewFile.url} alt="Preview" style={{ maxWidth: '100%', borderRadius: 8 }} />
                ) : (previewFile.type || '').includes('audio') ? (
                  <audio src={previewFile.url} controls style={{ width: '100%' }} autoPlay />
                ) : (previewFile.type || '').includes('video') ? (
                  <video src={previewFile.url} controls style={{ maxWidth: '100%', borderRadius: 8 }} autoPlay />
                ) : (
                  <div style={{ padding: 40, textAlign: 'center', color: '#64848D' }}>Preview not available</div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .su-ca-view{display:flex;flex-direction:column;gap:24px}
        .su-ca-title{font-size:1.5rem;font-weight:700;color:#162B30;margin:0}
        .su-ca-subtitle{font-size:.88rem;color:#64848D;margin:0}
        .su-ca-card{background:#fff;border-radius:14px;padding:28px;border:1px solid #EAEFEF}
        .su-ca-section-title{font-size:1.05rem;font-weight:700;color:#162B30;margin-bottom:20px}
        .su-ca-main-grid{display:grid;grid-template-columns:1fr;gap:24px}
        .su-ca-full-width{grid-column:1/-1}
        
        .su-ca-upload-container { display: flex; flex-direction: column; gap: 16px; width: 100%; }
        .su-ca-file-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; max-height: 200px; overflow-y: auto; }
        .su-ca-file-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #fff; border: 1px solid #D6E6E9; border-radius: 12px; }
        .su-ca-file-info { display: flex; align-items: center; gap: 10px; }
        .su-ca-file-icon { width: 28px; height: 28px; background: #FFF2F2; color: #F05A28; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
        .su-ca-file-name { font-size: 0.85rem; font-weight: 600; color: #162B30; }
        .su-ca-file-actions { display: flex; gap: 6px; }
        .su-ca-file-btn { width: 26px; height: 26px; border-radius: 6px; border: none; background: #F8FAFB; color: #11B5BB; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .su-ca-file-btn--danger { color: #DC2626; background: #FFF2F2; }

        .su-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; backdrop-filter: blur(4px); }
        .su-preview-modal { background: #fff; width: 90%; max-width: 600px; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.3); }
        .su-modal-header { padding: 16px 24px; border-bottom: 1px solid #EAEFEF; display: flex; justify-content: space-between; align-items: center; }
        .su-modal-header h3 { font-size: 1rem; font-weight: 700; color: #162B30; margin: 0; }
        .su-modal-close { background: none; border: none; font-size: 1.5rem; color: #A4B6B9; cursor: pointer; line-height: 1; }
        .su-modal-body { padding: 24px; display: flex; align-items: center; justify-content: center; background: #F8FAFB; min-height: 200px; }

        @media(max-width:1000px){.su-ca-main-grid{grid-template-columns:1fr}}
        .su-ca-left{display:flex;flex-direction:column;gap:24px}
        .su-ca-upload-section{background:#EAF6F8;border-radius:16px;padding:28px}
        .su-ca-method-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
        @media(max-width:600px){.su-ca-method-grid{grid-template-columns:repeat(2,1fr)}}
        .su-ca-method-btn{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px;border-radius:10px;border:none;cursor:pointer;background:#fff;color:#445459;font-size:.78rem;font-weight:600;transition:.15s}
        .su-ca-method-btn--active{background:#F05A28;color:#fff}
        .su-ca-upload-area{background:#fff;border:2px dashed #D6E6E9;border-radius:16px;padding:40px;text-align:center;cursor:pointer;transition:.15s}
        .su-ca-upload-area:hover{border-color:#F05A28}
        .su-ca-upload-icon{width:56px;height:56px;background:#FFF2F2;border-radius:14px;display:flex;align-items:center;justify-content:center;color:#F05A28;margin:0 auto 16px}
        .su-ca-upload-area h3{font-size:1rem;font-weight:700;color:#162B30;margin-bottom:6px}
        .su-ca-upload-area p{font-size:.82rem;color:#64848D;margin-bottom:20px}
        .su-ca-upload-btn{background:#F05A28;color:#fff;border:none;padding:10px 24px;border-radius:10px;font-weight:600;font-size:.88rem;cursor:pointer}
        .su-ca-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px 24px}
        @media(max-width:600px){.su-ca-form-grid{grid-template-columns:1fr}}
        .su-ca-form-group{display:flex;flex-direction:column;gap:8px}
        .su-ca-form-group--full{grid-column:1/-1}
        .su-ca-form-group label{font-size:.82rem;font-weight:700;color:#162B30}
        .su-ca-form-group input,.su-ca-form-group select{padding:12px 16px;border:1px solid #EAEFEF;border-radius:10px;font-size:.88rem;color:#162B30;outline:none;background:#F8FAFB;font-family:inherit}
        .su-ca-days{display:flex;flex-wrap:wrap;gap:10px}
        .su-ca-day{padding:8px 18px;border:1px solid #D6E6E9;border-radius:6px;background:#fff;color:#64848D;font-size:.85rem;font-weight:600;cursor:pointer;transition:.15s}
        .su-ca-day--active{background:#F05A28;color:#fff;border-color:#F05A28}
        .su-ca-volume-box{background:#F8FAFB;border-radius:12px;padding:24px;margin-top:24px}
        .su-ca-volume-box h4{font-size:.95rem;font-weight:700;color:#162B30;margin-bottom:20px}
        .su-ca-volume-row{display:flex;align-items:center;gap:16px}
        .su-ca-vol-min{font-size:.85rem;font-weight:700;color:#11B5BB}
        .su-ca-vol-max{font-size:.85rem;font-weight:700;color:#F05A28}
        .su-ca-vol-track{flex:1;height:8px;background:#FFE0D6;border-radius:4px;position:relative}
        .su-ca-vol-fill{position:absolute;height:100%;background:#F05A28;border-radius:4px}
        .su-ca-vol-apply{margin-top:16px;background:none;border:1px solid #F05A28;color:#162B30;border-radius:6px;padding:8px 16px;font-weight:600;font-size:.8rem;cursor:pointer}
        .su-ca-summary-item{background:#fff;border:1px solid #EAEFEF;border-radius:12px;padding:18px;margin-bottom:14px}
        .su-ca-summary-label{font-size:.8rem;font-weight:700;color:#162B30;margin-bottom:8px}
        .su-ca-summary-big{font-size:2.2rem;font-weight:800;color:#162B30;line-height:1}
        .su-ca-summary-sub{font-size:.72rem;color:#A4B6B9;margin-top:4px}
        .su-ca-method-icon-sm{width:36px;height:36px;border-radius:8px;background:#EAF6F8;display:flex;align-items:center;justify-content:center;color:#F05A28;flex-shrink:0}
        .su-ca-status-box{display:flex;gap:14px;align-items:flex-start;padding:18px;border-radius:12px;border:1px solid #F59E0B;background:#fff}
        .su-ca-status-box--ok{border-color:#BBF7D0;background:#F0FDF4}
        .su-ca-status-icon{width:24px;height:24px;border-radius:50%;border:2px solid #F59E0B;display:flex;align-items:center;justify-content:center;color:#F59E0B;font-weight:700;font-size:.7rem;flex-shrink:0}
        .su-ca-status-icon--ok{border-color:#16A34A;background:#DCFCE7;color:#166534}
        .su-ca-stores-section{background:#F8FAFB}
        .su-ca-stores-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:12px}
        .su-ca-stores-sub{font-size:.82rem;color:#64848D;margin-top:4px}
        .su-ip-select-all-btn2{padding:6px 16px;border-radius:6px;border:1px solid #F05A28;color:#F05A28;background:#fff;font-weight:600;font-size:.8rem;cursor:pointer}
        .su-ip-stores-grid2{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
        @media(max-width:900px){.su-ip-stores-grid2{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:600px){.su-ip-stores-grid2{grid-template-columns:1fr}}
        .su-ip-store-card2{display:flex;align-items:center;gap:12px;padding:16px;border:2px solid #EAEFEF;border-radius:14px;cursor:pointer;background:#fff;position:relative;transition:.15s}
        .su-ip-store-card2--sel{border-color:#F05A28;background:#FFF8F5}
        .su-ip-sicon{width:36px;height:36px;border-radius:8px;background:#EAF6F8;display:flex;align-items:center;justify-content:center;color:#F05A28;flex-shrink:0}
        .su-ip-sname{font-size:.82rem;font-weight:700;color:#162B30}
        .su-ip-saddr{font-size:.7rem;color:#A4B6B9;margin-top:2px}
        .su-ip-scheck{position:absolute;top:8px;right:8px;width:20px;height:20px;border-radius:50%;background:#F05A28;display:flex;align-items:center;justify-content:center;color:#fff}
        .su-ip-empty{padding:32px;text-align:center;color:#A4B6B9;font-size:.9rem}
        .su-ca-bottom-actions{display:flex;gap:16px}
        .su-ca-reset-btn{padding:12px 24px;background:#fff;border:1px solid #D6E6E9;border-radius:8px;color:#445459;font-weight:600;font-size:.9rem;cursor:pointer}
        .su-ca-connect-btn{padding:12px 24px;background:#F05A28;color:#fff;border:none;border-radius:8px;font-weight:600;font-size:.9rem;cursor:pointer;display:flex;align-items:center;gap:8px}
        .su-ca-connect-btn:disabled{opacity:.5;cursor:not-allowed}
      `}</style>
    </div>
  );
}
