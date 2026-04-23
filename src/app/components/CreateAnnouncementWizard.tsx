"use client";
import React, { useState, useEffect, useRef } from "react";
import { Upload, Mic, Volume2, FolderOpen, Store, AlertTriangle, Check, ChevronDown, Clock, Calendar, Hash, Music, Search, Zap, Megaphone } from "lucide-react";
import toast from "react-hot-toast";

interface CreateAnnouncementWizardProps {
  onNavigate?: (view: any) => void;
  userRole: "store" | "account_admin" | "account_marketing";
  userId: string;
  customerId?: string;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CreateAnnouncementWizard({ onNavigate, userRole, userId, customerId }: CreateAnnouncementWizardProps) {
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
  
  const [method, setMethod] = useState<"upload" | "record" | "tts" | "library">("upload");
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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        if (audioBlob.size > 0) {
          await handleRecordedUpload(audioBlob);
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
      toast.success("Recording stopped. Saving...");
    }
  };

  const handleRecordedUpload = async (blob: Blob) => {
    const formData = new FormData();
    
    const fileName = `recorded_announcement_${Date.now()}.webm`;
    const file = new File([blob], fileName, { type: 'audio/webm' });

    formData.append("userId", userId);
    formData.append("userRole", userRole);
    formData.append("files[0]", file);
    formData.append("fileNames[0]", fileName);

    try {
      const res = await fetch("/api/media/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        toast.success("Recording saved to library!");
        await fetchLibraryData();
        setMethod("library");
        if (data.files && data.files.length > 0) {
          setSelectedLibraryId(data.files[0]._id || data.files[0].id);
        }
      } else {
        toast.error("Failed to save recording.");
      }
    } catch (err) {
      toast.error("Error uploading recording.");
    }
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

  const toggleDevice = (id: string) => {
    setSelectedDeviceIds(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedDeviceIds.length === devices.length) {
      setSelectedDeviceIds([]);
    } else {
      setSelectedDeviceIds(devices.map(d => d.deviceId?._id || d._id));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  const handleSubmit = async () => {
    if (!playlistName) { toast.error("Please enter a playlist name"); return; }
    if (selectedDeviceIds.length === 0) { toast.error("Please select at least one store/device"); return; }
    
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
      } else {
         toast.error("Please provide media (upload or library selection) before connecting.");
         setSubmitting(false);
         return;
      }

      const body = {
        userId,
        name: playlistName,
        type: 'announcement',
        startDate,
        endDate,
        startTime,
        endTime,
        daysOfWeek: selectedDays,
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

  const isComplete = playlistName && selectedDeviceIds.length > 0 && (
    (method === "upload" && selectedFiles.length > 0) ||
    (method === "library" && selectedLibraryId) ||
    (method === "tts" && ttsText) ||
    (method === "record" && !isRecording)
  );

  const getMethodSummary = () => {
    switch(method) {
      case "upload": return selectedFiles.length > 0 ? "Ready to upload" : "Pending selection";
      case "library": return selectedLibraryId ? "1 announcement selected" : "Pending selection";
      case "tts": return ttsText ? `${ttsText.length} characters entered` : "Pending input";
      case "record": return isRecording ? "Recording..." : "Ready to record";
      default: return "";
    }
  };

  const renderMethodBox = () => {
    switch (method) {
      case "record":
        return (
          <div className="bg-white border-2 border-dashed border-[#BCDFE1] rounded-[24px] p-12 flex flex-col items-center justify-center text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-all duration-500 ${isRecording ? 'bg-red-50 text-red-500 scale-110 animate-pulse' : 'bg-[#FFF5F2] text-[#FF5722]'}`}>
              <Mic size={36} />
            </div>
            <h4 className="text-[22px] font-black text-[#10353C] mb-2">
              {isRecording ? "Recording in progress..." : "Ready to record"}
            </h4>
            <p className="text-[13px] font-medium text-[#64748B] max-w-[320px] mb-8 leading-relaxed">
              {isRecording 
                ? `Recording time: ${formatDuration(recordingDuration)}. Click stop when you're finished.` 
                : "Click the button below to start recording your announcement."}
            </p>
            <button 
              onClick={isRecording ? stopRecording : startRecording}
              className={`px-12 py-4 rounded-[16px] font-bold shadow-xl active:scale-95 transition-all text-sm ${
                isRecording 
                  ? 'bg-[#10353C] text-white hover:bg-black shadow-[#10353C]/30' 
                  : 'bg-[#FF5722] text-white hover:bg-[#F4511E] shadow-[#FF5722]/30'
              }`}
            >
              {isRecording ? "Stop Recording" : "Start Recording"}
            </button>
          </div>
        );
      
      case "tts":
        return (
          <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-8 space-y-6 shadow-sm">
            <div>
              <label className="block text-[13px] font-bold text-[#1E293B] mb-3 uppercase tracking-wider">Announcement text</label>
              <div className="relative">
                <textarea 
                  value={ttsText}
                  onChange={(e) => setTtsText(e.target.value)}
                  placeholder="Welcome to our store! Today we have..."
                  className="w-full h-36 p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[20px] text-sm text-[#475569] font-medium resize-none focus:ring-4 focus:ring-[#FF5722]/5 focus:border-[#FF5722] outline-none transition-all"
                />
                <div className="flex justify-between mt-3 px-1">
                   <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-widest">{ttsText.length} characters</span>
                   <span className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-widest italic">Recommended: 30-200 words</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#1E293B] uppercase tracking-wider">Language & Accent</label>
                <div className="relative">
                  <select className="w-full pl-4 pr-10 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[14px] text-xs font-bold text-[#475569] outline-none appearance-none hover:border-[#FF5722]/30 cursor-pointer">
                    <option>English (US)</option>
                    <option>English (UK)</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-[#1E293B] uppercase tracking-wider">Voice style</label>
                <div className="relative">
                  <select className="w-full pl-4 pr-10 py-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[14px] text-xs font-bold text-[#475569] outline-none appearance-none hover:border-[#FF5722]/30 cursor-pointer">
                    <option>Professional Male</option>
                    <option>Warm Female</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                </div>
              </div>
            </div>

            <button 
              onClick={() => toast.success("Generating preview...")}
              className="w-full py-4 bg-[#10353C] text-white rounded-[18px] font-bold hover:bg-[#0d2b31] transition-all text-xs uppercase tracking-widest shadow-lg shadow-[#10353C]/10"
            >
              Generate & Preview
            </button>
          </div>
        );

      case "library":
        return (
          <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-8 text-left shadow-sm">
            <h4 className="text-sm font-bold text-[#10353C] mb-6 flex items-center gap-3">
              <FolderOpen size={18} className="text-[#FF5722]" /> Saved Announcements
            </h4>
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
              {loadingLibrary ? (
                <div className="py-12 text-center text-[#94A3B8] text-sm font-medium animate-pulse">Checking library...</div>
              ) : libraryMedia.length === 0 ? (
                <div className="py-12 text-center text-[#94A3B8] text-sm border-2 border-dashed border-[#F8FAFC] rounded-2xl italic">No saved announcements found.</div>
              ) : libraryMedia.map((item) => (
                <div 
                  key={item._id}
                  onClick={() => setSelectedLibraryId(item._id)}
                  className={`flex items-center gap-5 p-5 rounded-[22px] cursor-pointer transition-all border-2 ${
                    selectedLibraryId === item._id 
                      ? 'border-[#FF5722] bg-[#FFF9F6] shadow-md shadow-[#FF5722]/5' 
                      : 'border-transparent bg-[#F8FAFC] hover:border-[#FFECD1]'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0 transition-all ${selectedLibraryId === item._id ? 'bg-[#FF5722] text-white' : 'bg-[#FFF5F1] text-[#FF5722]'}`}>
                    <Volume2 size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-[14px] font-bold text-[#10353C] truncate mb-0.5">{item.name}</h5>
                    <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                       {item.type || 'Media'} • {item.duration || '0:15'}
                    </p>
                  </div>
                  {selectedLibraryId === item._id && (
                    <div className="bg-[#FF5722] text-white rounded-full p-1.5 border-2 border-white shadow-sm">
                      <Check size={10} strokeWidth={4} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div 
            className="bg-white border-2 border-dashed border-[#CBD5E1] rounded-[24px] p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#FF5722] hover:bg-white/80 transition-all group shadow-sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-20 h-20 rounded-full bg-[#FFF5F2] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Upload size={36} className="text-[#FF5722]" />
            </div>
            <h4 className="text-[22px] font-black text-[#10353C] mb-3">
              {selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : "Upload file"}
            </h4>
            <p className="text-[13px] font-medium text-[#64748B] max-w-[280px] mb-8 leading-relaxed">
              Add media from your device. Audio, video, image. Size up to 5kb
            </p>
            <button className="px-12 py-4 bg-[#FF5722] text-white rounded-[16px] font-bold hover:bg-[#F4511E] shadow-xl shadow-[#FF5722]/30 active:scale-95 transition-all text-sm">
              {selectedFiles.length > 0 ? "Change selection" : "Start uploading"}
            </button>
            <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileChange} />
          </div>
        );
    }
  };

  return (
    <div className="pb-16 max-w-[1240px] mx-auto px-4 lg:px-8 bg-transparent" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column: Create Announcement */}
        <div className="flex-1 bg-[#EBF7F8] border border-[#BBE3E8] rounded-[32px] p-8 lg:p-10 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Megaphone size={120} />
           </div>
           
           <h3 className="text-[22px] font-extrabold text-[#10353C] mb-8 relative">Source Content</h3>
           
           {/* Source Selection Buttons */}
           <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
             {[
               { id: 'upload', icon: Upload, label: 'Upload new' },
               { id: 'record', icon: Mic, label: 'Record' },
               { id: 'tts', icon: Volume2, label: 'Text to Speech' },
               { id: 'library', icon: FolderOpen, label: 'Library' }
             ].map((item) => (
               <button
                 key={item.id}
                 onClick={() => setMethod(item.id as any)}
                 className={`flex flex-col items-center justify-center gap-3 py-5 rounded-[24px] border-2 transition-all duration-300 ${
                   method === item.id 
                     ? 'bg-[#FF5722] border-[#FF5722] text-white shadow-lg shadow-[#FF5722]/30 scale-105 z-10' 
                     : 'bg-white border-transparent text-[#64748B] hover:border-[#FFECD1] hover:bg-[#FFF9F6]'
                 }`}
               >
                 <item.icon size={22} className={method === item.id ? 'text-white' : 'text-[#FF5722]'} />
                 <span className="text-[11px] font-bold uppercase tracking-wider">{item.label}</span>
               </button>
             ))}
           </div>

           {renderMethodBox()}
        </div>

        {/* Right Column: Broadcast Summary */}
        <div className="w-full lg:w-[400px] bg-white rounded-[32px] border border-[#E2E8F0] p-8 shadow-sm flex flex-col gap-6">
           <h3 className="text-[20px] font-black text-[#10353C] mb-2">Broadcast Summary</h3>
           
           <div className="bg-[#F8FAFC] rounded-[24px] p-6 border border-[#F1F5F9] relative overflow-hidden group">
              <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-3">Target stores</p>
              <div className="flex justify-between items-center">
                <div className="text-5xl font-black text-[#10353C] group-hover:scale-110 transition-transform origin-left">{selectedDeviceIds.length}</div>
                <div className="w-12 h-12 rounded-[16px] bg-[#FFF5F2] flex items-center justify-center text-[#FF5722]">
                   <Store size={24} />
                </div>
              </div>
              <p className="text-[12px] font-semibold text-[#64748B] mt-2">Stores selected</p>
           </div>

           <div className="bg-[#F8FAFC] rounded-[24px] p-6 border border-[#F1F5F9]">
              <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest mb-5">Announcement Method</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-[16px] bg-white border border-[#F1F5F9] flex items-center justify-center text-[#FF5722] shadow-sm">
                   {method === 'upload' && <Upload size={22} />}
                   {method === 'record' && <Mic size={22} />}
                   {method === 'tts' && <Volume2 size={22} />}
                   {method === 'library' && <FolderOpen size={22} />}
                </div>
                <div>
                   <h4 className="text-[14px] font-bold text-[#10353C] capitalize tracking-tight">{method === 'upload' ? 'Upload new file' : method === 'tts' ? 'Text to Speech' : method === 'record' ? 'Record Audio' : 'Library Selection'}</h4>
                   <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider opacity-70">{getMethodSummary()}</p>
                </div>
              </div>
           </div>

           {/* Alert Area */}
           <div className={`rounded-[24px] p-5 flex gap-4 transition-all duration-500 border ${
             isComplete 
               ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]' 
               : 'bg-[#FFFBEB] border-[#FEF3C7] text-[#92400E]'
           }`}>
              <div className={`w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 ${isComplete ? 'bg-[#DCFCE7]' : 'bg-[#FEF3C7]'}`}>
                {isComplete ? <Check size={20} /> : <AlertTriangle size={20} />}
              </div>
              <div>
                 <h4 className="text-sm font-bold mb-1">{isComplete ? 'Ready to Start' : 'Action Required'}</h4>
                 <p className="text-xs font-medium opacity-80 leading-relaxed">
                   {isComplete 
                     ? "All fields are complete. You can now deploy the announcement to selected stores." 
                     : "Please ensure stores are selected and content is provided."}
                 </p>
              </div>
           </div>
        </div>
      </div>

      {/* Full Width Segments */}
      <div className="mt-8 space-y-8">
        {/* Playlist Details */}
        <div className="bg-white rounded-[32px] border border-[#E2E8F0] p-8 lg:p-10 shadow-sm">
          <h3 className="text-[20px] font-black text-[#10353C] mb-8 flex items-center gap-4 uppercase tracking-tighter">
            <Calendar className="text-[#FF5722]" /> Scheduling & Config
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-bold text-[#1E293B] mb-3 uppercase tracking-wider">Playlist name</label>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Enter playlist name" 
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    className="w-full p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[18px] text-sm font-bold text-[#10353C] focus:ring-4 focus:ring-[#FF5722]/5 focus:border-[#FF5722] outline-none transition-all"
                  />
                  <Hash size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#1E293B] mb-3 uppercase tracking-wider">Type</label>
                <div className="relative">
                  <select 
                    value={announcementType}
                    onChange={(e) => setAnnouncementType(e.target.value)}
                    className="w-full pl-5 pr-12 py-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[18px] text-sm font-bold text-[#475569] outline-none appearance-none hover:border-[#FF5722]/30 transition-all cursor-pointer"
                  >
                    <option value="">Select type</option>
                    <option value="offer">Special Offer</option>
                    <option value="alert">Emergency Alert</option>
                    <option value="info">Information</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-bold text-[#1E293B] mb-3 uppercase tracking-wider">Start Date</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[18px] text-sm font-bold text-[#10353C] outline-none focus:border-[#FF5722] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#1E293B] mb-3 uppercase tracking-wider">End Date</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[18px] text-sm font-bold text-[#10353C] outline-none focus:border-[#FF5722] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#1E293B] mb-3 uppercase tracking-wider">Start Time</label>
                <input 
                  type="time" 
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[18px] text-sm font-bold text-[#10353C] outline-none focus:border-[#FF5722] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#1E293B] mb-3 uppercase tracking-wider">End Time</label>
                <input 
                  type="time" 
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[18px] text-sm font-bold text-[#10353C] outline-none focus:border-[#FF5722] transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="mt-10">
            <label className="block text-[11px] font-bold text-[#94A3B8] mb-5 uppercase tracking-[3px]">Recurrence</label>
            <div className="flex flex-wrap gap-4">
              {DAYS.map(day => (
                <button 
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`px-8 py-3 rounded-[16px] text-xs font-black transition-all duration-300 ${
                    selectedDays.includes(day) 
                      ? 'bg-[#FF5722] text-white shadow-lg shadow-[#FF5722]/30 scale-105' 
                      : 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:bg-white hover:border-[#FFECD1]'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Volume Settings */}
          <div className="mt-12 bg-[#F8FAFC] rounded-[28px] p-8 border border-[#F1F5F9]">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <h3 className="text-sm font-bold text-[#10353C] uppercase tracking-wider">Global volume settings</h3>
                <div className="flex gap-6">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#38BDF8]"></div>
                      <span className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Min : {volumeMin}%</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#FF5722]"></div>
                      <span className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Max : {volumeMax}%</span>
                   </div>
                </div>
             </div>
             
             <div className="space-y-12">
                <div className="relative pt-2">
                  <div className="h-4 bg-[#FFE2D1] rounded-full relative group shadow-inner">
                    <div 
                      className="absolute h-full bg-gradient-to-r from-[#FF5722] to-[#FF8C66] rounded-full transition-all duration-500 shadow-[0_0_15px_rgba(255,87,34,0.3)]"
                      style={{ left: `${volumeMin}%`, width: `${volumeMax - volumeMin}%` }}
                    >
                       <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border-4 border-[#FF5722] shadow-xl group-hover:scale-125 transition-transform"></div>
                       <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border-4 border-[#FF5722] shadow-xl group-hover:scale-125 transition-transform"></div>
                    </div>
                  </div>
                  <div className="flex justify-between mt-6 px-1">
                    <input 
                      type="range" 
                      min="0" max="50" 
                      value={volumeMin} 
                      onChange={(e) => setVolumeMin(parseInt(e.target.value))}
                      className="w-[45%] h-1.5 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#FF5722]"
                    />
                    <input 
                      type="range" 
                      min="51" max="100" 
                      value={volumeMax} 
                      onChange={(e) => setVolumeMax(parseInt(e.target.value))}
                      className="w-[45%] h-1.5 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#FF5722]"
                    />
                  </div>
                </div>
                
                <button className="flex items-center gap-3 px-8 py-3.5 bg-white border border-[#E2E8F0] text-[#10353C] rounded-[18px] text-[11px] font-black uppercase tracking-[1.5px] hover:bg-[#FF5722] hover:text-white hover:border-[#FF5722] transition-all shadow-sm active:scale-95">
                   <Music size={14} /> Apply volume for all files
                </button>
             </div>
          </div>
        </div>

        {/* Store Selection Grid */}
        <div className="bg-white rounded-[32px] border border-[#E2E8F0] p-8 lg:p-10 shadow-sm">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-6 border-b border-[#F1F5F9]">
              <div>
                <h3 className="text-[20px] font-black text-[#10353C] uppercase tracking-tighter">Select stores</h3>
                <p className="text-[13px] font-medium text-[#64748B]">Choose which store will play this announcement</p>
              </div>
              <div className="flex flex-wrap gap-4 w-full md:w-auto items-center">
                  <div className="relative flex-1 md:flex-none">
                    <select className="w-full md:w-48 pl-5 pr-12 py-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[18px] text-[12px] font-bold text-[#475569] outline-none appearance-none hover:border-[#FF5722]/30 cursor-pointer transition-all">
                       <option>Location</option>
                       <option>Melbourne</option>
                       <option>Sydney</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  </div>
                  <button 
                    onClick={handleSelectAll}
                    className="px-8 py-3.5 border-2 border-[#FF5722] text-[#FF5722] rounded-[18px] text-[12px] font-black uppercase tracking-wider hover:bg-[#FF5722] hover:text-white transition-all active:scale-95 shadow-sm"
                  >
                    {selectedDeviceIds.length === devices.length ? 'Deselect All' : 'Select All'}
                  </button>
              </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {loadingDevices ? (
                Array(6).fill(0).map((_, i) => (
                  <div key={i} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[28px] p-6 animate-pulse">
                    <div className="flex gap-4 items-center mb-6">
                      <div className="w-12 h-12 bg-gray-200 rounded-2xl"></div>
                      <div className="flex-1 h-4 bg-gray-200 rounded"></div>
                    </div>
                    <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
                  </div>
                ))
              ) : devices.map((d: any) => {
                 const id = d.deviceId?._id || d._id;
                 const isSelected = selectedDeviceIds.includes(id);
                 return (
                   <div 
                    key={id}
                    onClick={() => toggleDevice(id)}
                    className={`group relative border-2 rounded-[28px] p-7 transition-all duration-300 cursor-pointer overflow-hidden ${
                      isSelected 
                        ? 'border-[#FF5722] bg-[#FFF9F6] shadow-xl shadow-[#FF5722]/5' 
                        : 'border-[#F1F5F9] bg-white hover:border-[#FFECD1] hover:shadow-lg'
                    }`}
                   >
                     {isSelected && (
                        <div className="absolute top-0 right-0 p-4">
                           <div className="bg-[#FF5722] text-white rounded-full p-1 shadow-md animate-in fade-in zoom-in">
                              <Check size={12} strokeWidth={4} />
                           </div>
                        </div>
                     )}
                     <div className="flex gap-5 items-start mb-6">
                        <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center transition-all ${isSelected ? 'bg-[#FF5722] text-white shadow-lg' : 'bg-[#FFF5F2] text-[#FF5722] group-hover:scale-110'}`}>
                           <Store size={26} />
                        </div>
                        <div className="flex-1 min-w-0">
                           <h4 className="font-black text-[#10353C] text-[15px] mb-1 group-hover:text-[#FF5722] transition-colors leading-tight truncate">{d.deviceId?.name || d.name || 'Store name'}</h4>
                           <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-green-500">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                              Online
                           </div>
                        </div>
                     </div>
                     <div className="space-y-1">
                        <p className="text-[11px] font-bold text-[#64748B] flex items-center gap-2">
                           <MapPin size={12} className="text-[#94A3B8]" /> VIC 3850, Australia
                        </p>
                        <p className="text-[11px] font-black text-[#94A3B8] uppercase tracking-[1px] opacity-70 ml-5">Active</p>
                     </div>
                   </div>
                 )
              })}
           </div>
        </div>

        {/* Global Footer Actions */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-[24px] shadow-2xl flex gap-3">
           <button 
             onClick={() => { setPlaylistName(""); setSelectedDeviceIds([]); }}
             className="px-10 py-4 bg-white/90 text-[#10353C] rounded-[20px] font-black text-xs uppercase tracking-widest hover:bg-[#10353C] hover:text-white transition-all shadow-xl"
           >
             Reset
           </button>
           <button 
             onClick={handleSubmit}
             disabled={!isComplete || submitting}
             className={`px-12 py-4 rounded-[20px] font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all shadow-2xl ${
               isComplete && !submitting 
                 ? 'bg-[#FF5722] text-white hover:bg-[#F4511E] scale-105 shadow-[#FF5722]/30 active:scale-95' 
                 : 'bg-[#CBD5E1] text-[#94A3B8] cursor-not-allowed opacity-70'
             }`}
           >
             <Zap size={16} fill="currentColor" /> 
             {submitting ? 'Connecting...' : 'Connect announcement to stores'}
           </button>
        </div>
      </div>
    </div>
  );
}

const MapPin = ({ size, className }: { size: number, className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
);
