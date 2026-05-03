"use client";
import React, { useState, useEffect, useRef } from "react";
import { Upload, Mic, Volume2, FolderOpen, Store, AlertTriangle, Check, ChevronDown, Clock, Calendar, Hash, Music, Search, Zap, Megaphone, Type, Library, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

interface CreateAnnouncementWizardProps {
  onNavigate?: (view: any) => void;
  userRole: "store" | "account_admin" | "account_marketing";
  userId: string;
  customerId?: string;
  isInstant?: boolean;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CreateAnnouncementWizard({ onNavigate, userRole, userId, customerId, isInstant }: CreateAnnouncementWizardProps) {
  const [playlistName, setPlaylistName] = useState("");
  const [announcementType, setAnnouncementType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>(['Tue', 'Fri']);
  const [volumeMin, setVolumeMin] = useState(30);
  const [volumeMax, setVolumeMax] = useState(80);
  
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  
  const [method, setMethod] = useState<"upload" | "record" | "tts" | "library">(isInstant ? "record" : "upload");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  // TTS State
  const [ttsText, setTtsText] = useState("");

  // Library State
  const [libraryMedia, setLibraryMedia] = useState<any[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isRecordingSaved, setIsRecordingSaved] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId) return;
    setLoadingDevices(true);
    
    let url = `/api/assign-device?userId=${userId}`;
    if ((userRole === "account_admin" || userRole === "account_marketing") && customerId) {
       url = `/api/assign-device?customerId=${customerId}`;
    }

    fetch(url)
      .then(r => r.json())
      .then(d => {
        setDevices(d.data || []);
      })
      .catch(() => setDevices([]))
      .finally(() => setLoadingDevices(false));
  }, [userId, userRole, customerId]);

  const fetchLibraryData = async () => {
    if (!userId) return;
    setLoadingLibrary(true);
    try {
      const r = await fetch(`/api/media?userId=${userId}`);
      const d = await r.json();
      setLibraryMedia(d.media || d.mediaFiles || d.data || []);
    } catch (err) {
      setLibraryMedia([]);
    } finally {
      setLoadingLibrary(false);
    }
  };

  useEffect(() => {
    if (method === "library") {
      fetchLibraryData();
    }
  }, [method, userId]);

  const startRecording = async () => {
    try {
      setRecordedBlob(null);
      setIsRecordingSaved(false);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        if (audioBlob.size > 0) {
          setRecordedBlob(audioBlob);
          setAudioUrl(URL.createObjectURL(audioBlob));
        }
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      toast.success("Recording started...");
    } catch (err) {
      console.error("Recording error:", err);
      toast.error("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      toast.success("Recording stopped. Ready to preview and save.");
    }
  };

  const handleSaveRecording = () => {
    setIsRecordingSaved(true);
    toast.success("Recording saved. Ready to broadcast.");
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const handleSubmit = async () => {
    if (devices.length > 0 && selectedDeviceIds.length === 0) {
      toast.error("Please select at least one store.");
      return;
    }
    
    if (method === "library" && !selectedLibraryId) {
      toast.error("Please select an announcement from the library.");
      return;
    }
    if (!isInstant && method === "upload" && selectedFiles.length === 0) {
      toast.error("Please select a file to upload.");
      return;
    }
    
    setSubmitting(true);
    try {
      let mediaIds: string[] = [];

      if (method === "library" && selectedLibraryId) {
        mediaIds = [selectedLibraryId];
      } else if (method === "upload" && selectedFiles.length > 0) {
        const formData = new FormData();
        formData.append("userId", userId);
        formData.append("userRole", userRole);
        selectedFiles.forEach((file, i) => {
          formData.append(`files[${i}]`, file);
          formData.append(`fileNames[${i}]`, file.name);
        });

        const upRes = await fetch("/api/media/upload", { method: "POST", body: formData });
        const upData = await upRes.json();
        if (upData.success) {
          mediaIds = upData.files.map((f: any) => f._id || f.id);
        } else {
          throw new Error(upData.message || "Upload failed");
        }
      } else if (method === "record" && recordedBlob && isRecordingSaved) {
        const formData = new FormData();
        formData.append("userId", userId);
        formData.append("userRole", userRole);
        const fileName = `recorded_announcement_${Date.now()}.webm`;
        formData.append(`files[0]`, new File([recordedBlob], fileName, { type: 'audio/webm' }));
        formData.append(`fileNames[0]`, fileName);

        const upRes = await fetch("/api/media/upload", { method: "POST", body: formData });
        const upData = await upRes.json();
        if (upData.success) {
          mediaIds = upData.files.map((f: any) => f._id || f.id);
        } else {
          throw new Error(upData.message || "Upload failed");
        }
      } else {
         toast.error("Please provide media (upload or library selection) before connecting.");
         setSubmitting(false);
         return;
      }

      const body = {
        userId,
        name: isInstant ? "Instant Broadcast" : playlistName,
        type: isInstant ? "Instant Announcement" : (announcementType || "announcement"),
        startDate: isInstant ? new Date().toISOString().split('T')[0] : startDate,
        endDate: isInstant ? new Date().toISOString().split('T')[0] : endDate,
        startTime: isInstant ? new Date().toTimeString().split(' ')[0].substring(0, 5) : startTime,
        endTime: isInstant ? new Date(new Date().getTime() + 60*60*1000).toTimeString().split(' ')[0].substring(0, 5) : endTime,
        daysOfWeek: isInstant ? [DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]] : selectedDays,
        globalMinVolume: volumeMin,
        globalMaxVolume: volumeMax,
        selectedDeviceId: selectedDeviceIds[0],
        deviceIds: selectedDeviceIds,
        mediaIds
      };

      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Announcement created successfully!");
        if (onNavigate) onNavigate("dashboard");
      } else {
        toast.error(data.message || "Failed to save announcement");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const isComplete = selectedDeviceIds.length > 0 && (
    (!isInstant && playlistName && (
      (method === "upload" && selectedFiles.length > 0) ||
      (method === "library" && selectedLibraryId) ||
      (method === "tts" && ttsText) ||
      (method === "record" && isRecordingSaved)
    )) || (isInstant && (
      (method === "library" && selectedLibraryId) ||
      (method === "tts" && ttsText) ||
      (method === "record" && isRecordingSaved)
    ))
  );

  const getMethodSummary = () => {
    switch(method) {
      case "upload": return selectedFiles.length > 0 ? "Ready to upload" : "Pending selection";
      case "library": return selectedLibraryId ? "1 announcement selected" : "Pending selection";
      case "tts": return ttsText ? `${ttsText.length} characters entered` : "Pending input";
      case "record": return isRecordingSaved ? "Recording saved" : isRecording ? "Recording..." : "Ready to record";
      default: return "";
    }
  };

  const renderMethodBox = () => {
    switch (method) {
      case "record":
        return (
          <div className="bg-white rounded-[20px] border border-dashed border-[#E2E8F0] p-10 flex flex-col items-center justify-center text-center shadow-sm">
            <div className={`w-16 h-16 flex items-center justify-center mb-2 transition-all duration-500 ${isRecording ? 'text-red-500 scale-110 animate-pulse' : 'text-[#FF5722]'}`}>
              <Mic size={40} />
            </div>
            <h3 className="text-[18px] font-bold text-[#10353C] mb-2">
              {isRecording ? "Recording in progress..." : audioUrl ? "Recording ready" : "Ready to record"}
            </h3>
            
            {!audioUrl && (
              <p className="text-slate-500 text-[13px] mb-6 max-w-xs leading-relaxed">
                {isRecording 
                  ? `Recording time: ${formatDuration(recordingDuration)}. Click stop when you're finished.` 
                  : "Click the button below to start recording your announcement."}
              </p>
            )}

            {audioUrl && (
              <div className="mb-6 w-full max-w-sm">
                <audio src={audioUrl} controls className="w-full" />
              </div>
            )}

            <div className="flex gap-3">
              {audioUrl ? (
                isRecordingSaved ? (
                  <button 
                    onClick={() => { setRecordedBlob(null); setAudioUrl(null); setIsRecordingSaved(false); startRecording(); }}
                    className="px-8 py-3 bg-white border border-[#E2E8F0] text-slate-700 rounded-[12px] font-bold shadow-sm hover:bg-slate-50 active:scale-95 transition-all text-[13px]"
                  >
                    Re-record
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => { setRecordedBlob(null); setAudioUrl(null); startRecording(); }}
                      className="px-8 py-3 bg-white border border-[#E2E8F0] text-slate-700 rounded-[12px] font-bold shadow-sm hover:bg-slate-50 active:scale-95 transition-all text-[13px]"
                    >
                      Re-record
                    </button>
                    <button 
                      onClick={handleSaveRecording}
                      className="px-8 py-3 bg-[#FF5722] text-white rounded-[12px] font-bold shadow-md hover:bg-[#F4511E] shadow-[#FF5722]/30 active:scale-95 transition-all text-[13px] flex items-center gap-2"
                    >
                      <Check size={16} /> Save
                    </button>
                  </>
                )
              ) : (
                <button 
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`px-12 py-3.5 rounded-[12px] font-bold shadow-md transition-all text-[13px] ${
                    isRecording 
                      ? 'bg-slate-800 text-white hover:bg-black shadow-slate-800/30' 
                      : 'bg-[#FF5722] text-white hover:bg-[#F4511E] shadow-[#FF5722]/30'
                  }`}
                >
                  {isRecording ? "Stop Recording" : "Start Recording"}
                </button>
              )}
            </div>
          </div>
        );
      
      case "tts":
        return (
          <div className="bg-white rounded-[20px] border border-slate-200 p-8 space-y-6 shadow-sm">
            <div>
              <label className="text-[13px] font-bold text-[#10353C] block mb-2">Announcement text</label>
              <div className="relative">
                <textarea 
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  placeholder="Welcome to our store! Today we have..."
                  className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all resize-none"
                />
                <div className="flex justify-between mt-2 px-1">
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{ttsText.length} characters</span>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider italic">Recommended: 30-200 words</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Language & Accent</label>
                <div className="relative">
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer">
                    <option>English (US)</option>
                    <option>English (UK)</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Voice style</label>
                <div className="relative">
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer">
                    <option>Professional Male</option>
                    <option>Warm Female</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            <button 
              onClick={() => toast.success("Generating preview...")}
              className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-colors text-[13px] shadow-md"
            >
              Generate & Preview
            </button>
          </div>
        );

      case "library":
        return (
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {loadingLibrary ? (
                <div className="py-10 text-center text-slate-400 text-sm font-semibold animate-pulse">Checking library...</div>
              ) : libraryMedia.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-[20px] italic">No saved announcements found.</div>
              ) : libraryMedia.map((item) => (
                <div 
                  key={item._id}
                  onClick={() => setSelectedLibraryId(item._id)}
                  className={`flex items-center gap-4 p-4 rounded-[16px] cursor-pointer transition-all border-2 bg-white ${
                    selectedLibraryId === item._id 
                      ? 'border-[#FF5722] shadow-sm' 
                      : 'border-transparent hover:border-slate-200'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-[#FFF5F2] text-[#FF5722] flex items-center justify-center shrink-0">
                    <Volume2 size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-[13px] font-bold text-[#10353C] truncate mb-0.5">{item.name}</h5>
                    <p className="text-[11px] font-medium text-slate-500">
                       {item.type === 'record' ? 'Recorded' : item.type === 'tts' ? 'TTS' : 'Uploaded'} • {item.duration || '0:45'}
                    </p>
                  </div>
                  {selectedLibraryId === item._id && (
                    <div className="text-[#FF5722] shrink-0">
                      <div className="w-5 h-5 rounded-full border-2 border-[#FF5722] flex items-center justify-center">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        );

      default:
        return (
          <div 
            className="bg-white rounded-[20px] border-2 border-dashed border-[#E2E8F0] p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-cyan-400 transition-colors group shadow-sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-16 h-16 bg-[#FFF5F2] rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <Upload size={32} className="text-[#FF5722]" />
            </div>
            <h3 className="text-[18px] font-bold text-[#10353C] mb-2">
              {selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : "Upload file"}
            </h3>
            <p className="text-slate-500 text-[13px] mb-6 max-w-xs">
              Add media from your device. Audio, video, image. Size up to 5kb
            </p>
            <button className="bg-[#FF5722] text-white px-8 py-2.5 rounded-xl font-bold shadow-md hover:bg-[#F4511E] transition-colors">
              {selectedFiles.length > 0 ? "Change selection" : "Start uploading"}
            </button>
            <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileChange} />
          </div>
        );
    }
  };

  const storesMap = new Map();
  devices.forEach(d => {
     const storeId = d.userId?._id || 'unassigned';
     if (!storesMap.has(storeId)) {
        storesMap.set(storeId, {
           _id: storeId,
           name: d.userId?.storeName || d.userId?.username || 'Unknown Store',
           address: d.userId?.storeLocation || 'No location',
           status: "Active",
           deviceIds: []
        });
     }
     storesMap.get(storeId).deviceIds.push(d.deviceId?._id || d._id);
  });
  const uniqueStores = Array.from(storesMap.values());

  const toggleStore = (storeId: string) => {
    const store = uniqueStores.find(s => s._id === storeId);
    if (!store) return;
    const storeDeviceIds = store.deviceIds;
    const isSelected = storeDeviceIds.every((id: string) => selectedDeviceIds.includes(id)) && storeDeviceIds.length > 0;
    
    if (isSelected) {
      setSelectedDeviceIds(prev => prev.filter(id => !storeDeviceIds.includes(id)));
    } else {
      setSelectedDeviceIds(prev => Array.from(new Set([...prev, ...storeDeviceIds])));
    }
  };

  const handleSelectAllStores = () => {
    const allDeviceIds = devices.map(d => d.deviceId?._id || d._id);
    if (selectedDeviceIds.length === allDeviceIds.length) {
      setSelectedDeviceIds([]);
    } else {
      setSelectedDeviceIds(allDeviceIds);
    }
  };

  const selectedStoreCount = uniqueStores.filter(s => 
    s.deviceIds.every((id: string) => selectedDeviceIds.includes(id)) && s.deviceIds.length > 0
  ).length;

  return (
    <div className="font-sans text-slate-800">
      {/* Main Content Area */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Left Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Upload/Record Announcement Card */}
          <div className="bg-[#E1F6F9] rounded-[24px] p-6 lg:p-8 shadow-sm">
            <h2 className="text-[18px] font-bold text-[#10353C] mb-6">{isInstant ? "Record Announcement" : "Upload Announcement"}</h2>
            
           {/* Source Selection Buttons */}
           <div className={`grid gap-4 mb-6 ${isInstant ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
             {[
               ...(!isInstant ? [{ id: 'upload', icon: Upload, label: 'Upload new', colSpan: '' }] : []),
               { id: 'record', icon: Mic, label: 'Record', colSpan: '' },
               { id: 'tts', icon: Volume2, label: 'Text to Speech', colSpan: '' },
               { id: 'library', icon: FolderOpen, label: 'Library', colSpan: isInstant ? 'col-span-2' : '' }
             ].map((item) => (
               <button
                 key={item.id}
                 onClick={() => setMethod(item.id as any)}
                 className={`flex flex-col items-center justify-center p-4 rounded-[12px] transition-all shadow-sm ${item.colSpan} ${
                   method === item.id 
                     ? "bg-[#FF5722] text-white" 
                     : "bg-white text-gray-800 hover:bg-gray-50"
                 }`}
               >
                 <item.icon size={20} className={method === item.id ? 'text-white' : 'text-gray-800'} />
                 <span className="text-[12px] font-medium">{item.label}</span>
               </button>
             ))}
           </div>

            {renderMethodBox()}
          </div>

          {/* Config Form Card (Hidden for Instant) */}
          {!isInstant && (
          <div className="bg-white rounded-[24px] p-6 lg:p-8 shadow-sm border border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-[#10353C]">Playlist name</label>
                <input 
                  type="text" 
                  placeholder="Enter playlist name"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-[#10353C]">Type</label>
                <div className="relative">
                  <select 
                    value={announcementType}
                    onChange={(e) => setAnnouncementType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all cursor-pointer"
                  >
                    <option value="">Select type</option>
                    <option value="offer">Special Offer</option>
                    <option value="alert">Emergency Alert</option>
                    <option value="info">Information</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-[#10353C]">Start date</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-[#10353C]">End date</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-[#10353C]">Start time</label>
                <input 
                  type="time" 
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-[#10353C]">End time</label>
                <div className="relative">
                  <input 
                    type="time" 
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Day Selection */}
            <div className="mb-10">
              <label className="text-[13px] font-bold text-[#10353C] block mb-4">Days of the week</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(day => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`px-5 py-2 rounded-lg font-bold text-[13px] transition-all ${selectedDays.includes(day) ? "bg-[#FF5722] text-white shadow-md shadow-orange-200" : "bg-white border border-slate-200 text-slate-500 hover:border-[#FF5722]"}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Volume Slider */}
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[14px] font-bold text-[#10353C]">Global volume settings</h3>
                <div className="flex gap-4">
                  <span className="text-[12px] font-bold text-cyan-600">Min : {volumeMin}%</span>
                  <span className="text-[12px] font-bold text-red-500">Max : {volumeMax}%</span>
                </div>
              </div>
              <div className="relative h-2.5 bg-orange-100 rounded-full mb-8">
                <div 
                  className="absolute h-full bg-[#FF5722] rounded-full" 
                  style={{ left: `${volumeMin}%`, right: `${100 - volumeMax}%` }}
                ></div>
                <input 
                  type="range" min="0" max="50" 
                  value={volumeMin} onChange={(e) => setVolumeMin(parseInt(e.target.value))}
                  className="absolute top-1/2 -translate-y-1/2 w-1/2 opacity-0 cursor-pointer"
                  style={{ left: '0' }}
                />
                <input 
                  type="range" min="51" max="100" 
                  value={volumeMax} onChange={(e) => setVolumeMax(parseInt(e.target.value))}
                  className="absolute top-1/2 -translate-y-1/2 w-1/2 opacity-0 cursor-pointer"
                  style={{ left: '50%' }}
                />
                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-[#FF5722] rounded-full shadow-sm pointer-events-none" style={{ left: `${volumeMin}%`, transform: 'translate(-50%, -50%)' }}></div>
                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-[#FF5722] rounded-full shadow-sm pointer-events-none" style={{ left: `${volumeMax}%`, transform: 'translate(-50%, -50%)' }}></div>
              </div>
              <button className="bg-white border border-[#FF5722] text-[#10353C] text-[12px] font-bold px-4 py-2 rounded-lg hover:bg-orange-50 transition-colors">
                Apply volume for all files
              </button>
            </div>
          </div>
          )}
        </div>

        {/* Right Column: Broadcast Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100">
            <h2 className="text-[16px] font-bold text-[#10353C] mb-6">Broadcast Summary</h2>
            
            <div className="space-y-4">
              <div className="bg-white rounded-[16px] p-5 border border-slate-100 shadow-sm relative overflow-hidden group">
                 <p className="text-[12px] font-bold text-[#10353C] mb-2">Target stores</p>
                 <div className="flex justify-between items-center">
                   <div className="text-4xl font-bold text-[#10353C]">{selectedStoreCount}</div>
                   <div className="text-[#FF5722] opacity-40">
                      <Store size={36} strokeWidth={1.5} />
                   </div>
                 </div>
                 <p className="text-[11px] text-slate-400 mt-1">Store selected</p>
              </div>

              <div className="bg-white rounded-[16px] p-5 border border-slate-100 shadow-sm">
                 <p className="text-[12px] font-bold text-[#10353C] mb-3">Announcement Method</p>
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-[10px] bg-[#E1F6F9] flex items-center justify-center text-[#FF5722] shadow-sm">
                      {method === 'upload' && <Upload size={18} />}
                      {method === 'record' && <Mic size={18} />}
                      {method === 'tts' && <Type size={18} />}
                      {method === 'library' && <Library size={18} />}
                   </div>
                   <div>
                      <h4 className="text-[13px] font-bold text-[#10353C]">{method === 'upload' ? 'Upload new file' : method === 'tts' ? 'Text to Speech' : method === 'record' ? 'Record Audio' : 'Library Selection'}</h4>
                      <p className="text-[11px] text-[#64748B]">{getMethodSummary()}</p>
                   </div>
                 </div>
              </div>

              <div className={`rounded-[12px] p-5 flex gap-4 transition-all duration-500 border ${
                isComplete 
                  ? 'bg-[#F0FDF4] border-[#BBF7D0]' 
                  : 'bg-white border-[#F59E0B]'
              }`}>
                 <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isComplete ? 'bg-[#DCFCE7] text-[#166534]' : 'border-2 border-[#F59E0B] text-[#F59E0B]'}`}>
                   {isComplete ? <Check size={14} strokeWidth={3} /> : <span className="font-bold text-xs">!</span>}
                 </div>
                 <div>
                    <h4 className={`text-sm font-bold mb-1 ${isComplete ? 'text-[#166534]' : 'text-[#10353C]'}`}>{isComplete ? 'Ready to Start' : 'Incomplete'}</h4>
                    <p className={`text-xs font-medium leading-relaxed ${isComplete ? 'text-[#166534] opacity-80' : 'text-[#FF5722]'}`}>
                      {isComplete 
                        ? "All fields are complete. You can now deploy." 
                        : "Please select stores. Start recording."}
                    </p>
                 </div>
              </div>
            </div>
          </div>

          {/* If NOT instant, show Select Stores inside the right column */}
          {!isInstant && (
            <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex flex-col max-h-[500px]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-[16px] font-bold text-[#10353C]">Select stores</h2>
                <div className="flex gap-2">
                  <div className="relative">
                    <select className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-semibold appearance-none pr-6 cursor-pointer text-slate-500">
                      <option>Location</option>
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  <button 
                    onClick={handleSelectAllStores}
                    className="text-[#FF5722] text-[11px] font-bold px-2 py-1 rounded-lg border border-[#FF5722] hover:bg-orange-50 transition-colors"
                  >
                    {selectedDeviceIds.length === devices.length && devices.length > 0 ? "Deselect All" : "Select All"}
                  </button>
                </div>
              </div>
              
              <p className="text-[11px] text-slate-500 mb-4">Choose which store will play this announcement</p>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {loadingDevices ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 animate-pulse h-16"></div>
                  ))
                ) : uniqueStores.map(store => {
                  const storeDeviceIds = store.deviceIds;
                  const isSelected = storeDeviceIds.every((id: string) => selectedDeviceIds.includes(id)) && storeDeviceIds.length > 0;
                  
                  return (
                    <div 
                      key={store._id}
                      onClick={() => toggleStore(store._id)}
                      className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer border-2 transition-all ${
                        isSelected 
                          ? "border-[#FF5722] bg-white shadow-sm" 
                          : "border-slate-50 bg-white hover:border-slate-200"
                      }`}
                    >
                      <div className="w-10 h-10 bg-[#E1F6F9] rounded-xl flex items-center justify-center flex-shrink-0">
                        <Store size={18} className="text-[#FF5722]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[13px] font-bold text-[#10353C] truncate">{store.name}</p>
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{store.address}</p>
                        <p className="text-[10px] font-bold text-green-600 mt-1">{store.status}</p>
                      </div>
                      {isSelected && (
                        <div className="ml-auto w-5 h-5 bg-[#FF5722] rounded-full flex items-center justify-center shrink-0">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
                <button 
                  onClick={() => {
                    setPlaylistName("");
                    setSelectedDeviceIds([]);
                    setMethod("upload");
                    setSelectedFiles([]);
                  }}
                  className="flex-1 bg-slate-50 text-slate-600 text-[13px] font-bold py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  Reset
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={submitting || !isComplete}
                  className="flex-[2] bg-[#FF5722] text-white text-[13px] font-bold py-2.5 rounded-xl shadow-lg shadow-orange-100 hover:bg-[#F4511E] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Megaphone size={16} />
                      <span>Connect announcement</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* If Instant, show Select Stores Full Width at Bottom */}
      {isInstant && (
        <div className="mt-6 bg-white rounded-[24px] p-6 lg:p-8 shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-[18px] font-bold text-[#10353C]">Select stores</h2>
              <p className="text-[12px] text-slate-500 mt-1">Choose which store will play this announcement</p>
            </div>
            <div className="flex gap-3 items-center">
              <div className="relative">
                <select className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-[12px] font-semibold appearance-none pr-8 cursor-pointer text-slate-500 outline-none">
                  <option>Location</option>
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <button 
                onClick={handleSelectAllStores}
                className="text-[#FF5722] text-[12px] font-bold px-4 py-2 rounded-lg border border-[#FF5722] hover:bg-[#FFF5F2] transition-colors"
              >
                {selectedDeviceIds.length === devices.length && devices.length > 0 ? "Deselect All" : "Select All"}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {loadingDevices ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 animate-pulse h-20"></div>
              ))
            ) : uniqueStores.map(store => {
              const storeDeviceIds = store.deviceIds;
              const isSelected = storeDeviceIds.every((id: string) => selectedDeviceIds.includes(id)) && storeDeviceIds.length > 0;
              
              return (
                <div 
                  key={store._id}
                  onClick={() => toggleStore(store._id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer border-2 transition-all ${
                    isSelected 
                      ? "border-[#FF5722] shadow-sm ring-1 ring-[#FF5722]" 
                      : "border-slate-100 bg-white hover:border-slate-200"
                  }`}
                >
                  <div className="w-12 h-12 bg-[#E1F6F9] rounded-[14px] flex items-center justify-center flex-shrink-0">
                    <Store size={22} className="text-[#FF5722]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-bold text-[#10353C] truncate">{store.name}</p>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                    <p className="text-[12px] text-slate-400 truncate mt-0.5">{store.address}</p>
                    <p className="text-[11px] font-bold text-green-600 mt-1">{store.status}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end items-center gap-4 pt-6 border-t border-slate-100">
            <button 
              onClick={() => {
                setSelectedDeviceIds([]);
                setMethod("record");
              }}
              className="px-8 py-2.5 bg-white text-slate-600 text-[13px] font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={submitting || !isComplete}
              className={`px-8 py-2.5 text-[13px] font-bold rounded-xl flex items-center gap-2 transition-all ${
                !submitting && isComplete 
                  ? 'bg-slate-300 text-slate-800 hover:bg-slate-400 shadow-sm' 
                  : 'bg-[#cbd5e1] text-slate-500 cursor-not-allowed opacity-70'
              }`}
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Megaphone size={16} className={isComplete ? 'text-slate-700' : 'text-slate-400'} />
                  <span>Send Announcement</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
