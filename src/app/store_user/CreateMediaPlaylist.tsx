import React, { useState, useEffect, useRef } from "react";
import { ViewKey } from "./page";
import { FaUpload, FaPlay, FaTrash, FaDesktop, FaCheck, FaArrowLeft } from "react-icons/fa";

interface Props { 
  onNavigate: (view: ViewKey) => void; 
  editingPlaylist?: any;
}

export default function CreateMediaPlaylist({ onNavigate, editingPlaylist }: Props) {
  const [selectionMode, setSelectionMode] = useState<"upload"|"existing"|null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>(["Tue","Fri"]);
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

  // Real devices from API
  const [devices, setDevices] = useState<any[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
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
      }
    }
  }, [editingPlaylist]);

  // Fetch devices
  useEffect(() => {
    if (!userId) { setLoadingDevices(false); return; }
    fetch(`/api/assign-device?userId=${userId}`).then(r=>r.json()).then(d => {
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
    }).catch(()=>setDevices([])).finally(()=>setLoadingDevices(false));
  }, [userId]);

  // Fetch existing media when mode = existing
  useEffect(() => {
    if (selectionMode !== "existing" || !userId) return;
    setLoadingMedia(true);
    fetch(`/api/media?userId=${userId}`).then(r=>r.json())
      .then(d => setExistingMediaData(d.media||d.mediaFiles||d.data||[]))
      .catch(()=>setExistingMediaData([]))
      .finally(()=>setLoadingMedia(false));
  }, [selectionMode, userId]);

  const toggleDay = (day: string) => setSelectedDays(p => p.includes(day) ? p.filter(d=>d!==day) : [...p,day]);
  const toggleDevice = (id: string) => {
    setSelectedDeviceIds(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);
  };
  const toggleMedia = (id: string) => setSelectedMediaIds(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);

  const handleSubmit = async () => {
    if (!playlistName.trim() || selectedDeviceIds.length === 0) return;
    setSubmitting(true);
    try {
      let mediaIds = [...selectedMediaIds];
      if (selectionMode === "upload" && selectedFiles.length > 0) {
        const fd = new FormData(); fd.append("userId",userId); fd.append("userRole", "store");
        selectedFiles.forEach((f,i) => { fd.append(`files[${i}]`,f); fd.append(`fileNames[${i}]`,f.name); });
        const r = await fetch("/api/media/upload",{method:"POST",body:fd}); const d = await r.json();
        if (d.success) mediaIds = d.files.map((f:any)=>f._id||f.id);
      }
      const body = { 
        userId, 
        name:playlistName, 
        type:playlistType||"media", 
        startDate, 
        endDate, 
        startTime, 
        endTime, 
        daysOfWeek:selectedDays, 
        globalMinVolume:30, 
        globalMaxVolume:volume, 
        deviceIds:selectedDeviceIds, 
        mediaIds,
        id: editingPlaylist?._id || editingPlaylist?.id
      };
      const method = editingPlaylist ? "PUT" : "POST";
      const res = await fetch("/api/playlists",{
        method,
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) onNavigate("dashboard");
    } catch {} finally { setSubmitting(false); }
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
              <div className="store-file-input-wrapper" onClick={()=>fileInputRef.current?.click()} style={{cursor:'pointer'}}>
                <input type="text" value={selectedFiles.length>0?selectedFiles.map(f=>f.name).join(', '):''} placeholder="Select a file..." readOnly className="store-file-input-display" />
                <input ref={fileInputRef} type="file" multiple hidden onChange={e=>setSelectedFiles(Array.from(e.target.files||[]))} />
              </div>
              <div className="store-upload-actions-bar">
                <span className="store-file-selected-text">{selectedFiles.length} file{selectedFiles.length!==1?'s':''} selected</span>
                <div className="store-upload-actions-right">
                  <button className="store-btn-text-orange">Preview media</button>
                  <button className="store-btn-solid-orange">Confirm selection</button>
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

            {loadingMedia ? <div style={{padding:32,textAlign:'center',color:'#A4B6B9'}}>Loading media…</div> : existingMediaData.length === 0 ? <div style={{padding:32,textAlign:'center',color:'#A4B6B9'}}>No media files found. Upload media first.</div> : (
            <table className="store-existing-table">
              <thead><tr><th style={{width:'40px'}}></th><th>MEDIA NAME</th><th>TYPE</th><th>UPLOAD DATE</th><th>PREVIEW</th><th style={{width:'60px'}}></th></tr></thead>
              <tbody>
                {existingMediaData.map((media:any) => {
                  const id = media._id||media.id;
                  const t = (media.type||"").toLowerCase();
                  const badge = t.includes('video')?'video':t.includes('audio')?'audio':'image';
                  return (
                    <tr key={id}>
                      <td><input type="checkbox" className="store-checkbox" checked={selectedMediaIds.includes(id)} onChange={()=>toggleMedia(id)} /></td>
                      <td style={{fontWeight:500,color:'#445459'}}>{media.name}</td>
                      <td><span className={`store-type-badge store-type-badge--${badge}`}>{media.type||'Media'}</span></td>
                      <td style={{color:'#445459'}}>{media.createdAt?new Date(media.createdAt).toLocaleDateString('en-US',{month:'long',year:'numeric'}):'—'}</td>
                      <td><button className="store-preview-btn"><FaPlay size={10}/> Preview</button></td>
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
              <input type="text" placeholder="Enter playlist name" value={playlistName} onChange={e=>setPlaylistName(e.target.value)} />
            </div>
            <div className="store-form-group">
              <label>Type</label>
              <select value={playlistType} onChange={e=>setPlaylistType(e.target.value)}><option value="">Select type</option><option value="media">Media</option><option value="promotional">Promotional</option></select>
            </div>
            <div className="store-form-group"><label>Start date</label><input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} /></div>
            <div className="store-form-group"><label>End date</label><input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} /></div>
            <div className="store-form-group"><label>Start time</label><input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} /></div>
            <div className="store-form-group"><label>End time</label><input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} /></div>
          </div>

          <div className="store-form-group store-form-group--full mt-4">
            <label>Days of the week</label>
            <div className="store-days-selector">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(day=>(
              <button key={day} className={`store-day-pill ${selectedDays.includes(day)?"store-day-pill--active":""}`} onClick={()=>toggleDay(day)}>{day}</button>
            ))}</div>
          </div>

          <div className="store-volume-settings-box">
            <h4>Global volume settings</h4>
            <div className="store-volume-controls">
              <span className="store-volume-label store-volume-label--min">Min : 30%</span>
              <div className="store-volume-slider-wrap"><input type="range" min="0" max="100" value={volume} onChange={e=>setVolume(Number(e.target.value))} className="store-volume-slider" /></div>
              <span className="store-volume-label store-volume-label--max">Max : {volume}%</span>
            </div>
            <button className="store-btn-outline-orange mt-3">Apply volume for all files</button>
          </div>

          {/* Select Stores - Real devices */}
          <div className="store-form-group store-form-group--full mt-4">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div><label style={{fontSize:'.95rem',fontWeight:700}}>Select stores</label><p style={{fontSize:'.78rem',color:'#64848D',marginTop:4}}>Choose which store will play this playlist</p></div>
              {devices.length>0 && <button style={{padding:'6px 16px',borderRadius:6,border:'1px solid #F05A28',color:'#F05A28',background:'#fff',fontWeight:600,fontSize:'.8rem',cursor:'pointer'}} onClick={()=>{const all=devices.flatMap(d=>d.deviceIds);setSelectedDeviceIds(selectedDeviceIds.length===all.length?[]:all);}}>Select All</button>}
            </div>
            {loadingDevices ? <div style={{padding:24,textAlign:'center',color:'#A4B6B9'}}>Loading stores…</div>
            : devices.length === 0 ? <div style={{padding:32,textAlign:'center',color:'#A4B6B9',border:'1px dashed #D6E6E9',borderRadius:12,background:'#F8FAFB'}}>No devices connected to this store yet.</div>
            : <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
              {devices.map(s => {
                const isSel = selectedDeviceIds.includes(s._id);
                const isOnline = (s.status || "").toLowerCase() === "online";
                return (<div key={s._id} onClick={()=>toggleDevice(s._id)} style={{display:'flex',alignItems:'center',gap:12,padding:16,border:`2px solid ${isSel?'#F05A28':'#EAEFEF'}`,borderRadius:14,cursor:'pointer',background:isSel?'#FFF8F5':'#fff',position:'relative'}}>
                  <div style={{width:36,height:36,borderRadius:8,background:'#EAF6F8',display:'flex',alignItems:'center',justifyContent:'center',color:'#F05A28'}}><FaDesktop size={14}/></div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontWeight:700,fontSize:'.82rem',color:'#162B30'}}>{s.name} <span style={{color:isOnline?'#16A34A':'#DC2626',fontSize:10}}>●</span></p>
                    <p style={{fontSize:'.7rem',color:'#A4B6B9',marginTop:2}}>{s.address}</p>
                    <p style={{fontSize:'.7rem',fontWeight:700,color:isOnline?'#16A34A':'#DC2626',marginTop:4}}>{s.status || "Inactive"}</p>
                  </div>
                  {isSel && <div style={{position:'absolute',top:8,right:8,width:20,height:20,borderRadius:'50%',background:'#F05A28',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff'}}><FaCheck size={8}/></div>}
                </div>);
              })}
            </div>}
            {selectedDeviceIds.length>0 && <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',background:'#F0FDF4',borderRadius:8,border:'1px dashed #BBF7D0',marginTop:14}}><div><p style={{fontWeight:700,fontSize:'.85rem',color:'#166534'}}>{selectedDeviceIds.length} device(s) selected</p><p style={{fontSize:'.75rem',color:'#64848D'}}>Ready to push playlist</p></div><button style={{border:'none',background:'none',color:'#F05A28',fontWeight:700,fontSize:'.85rem',cursor:'pointer'}} onClick={()=>setSelectedDeviceIds([])}>Clear</button></div>}
          </div>

          <div className="store-form-actions">
            <button className="store-btn-outline-grey" onClick={()=>{setPlaylistName('');setSelectedDeviceIds([]);setSelectedMediaIds([]);setSelectedFiles([])}}>Reset</button>
            <button className="store-btn-solid-orange store-btn-solid-orange--icon" onClick={handleSubmit} disabled={submitting}>
              {submitting?'Creating…':'Connect playlist to stores'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
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
          margin-top: 16px; display: flex; flex-direction: column; gap: 8px;
        }
        .store-input-label { font-size: 0.85rem; font-weight: 600; color: #162B30; }
        .store-file-input-wrapper { width: 100%; }
        .store-file-input-display {
          width: 100%; padding: 12px 16px; border: 1px solid #EAEFEF; border-radius: 8px;
          background: #F8FAFB; color: #445459; font-size: 0.9rem; outline: none; cursor: pointer;
        }
        
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
