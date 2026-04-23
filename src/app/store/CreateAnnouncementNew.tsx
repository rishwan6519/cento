"use client";

import React, { useState, useEffect } from "react";
import { 
  Upload, 
  Mic, 
  Type, 
  Library, 
  Search, 
  Store, 
  ChevronDown, 
  X, 
  Play, 
  Volume2, 
  Clock, 
  Calendar,
  Check,
  AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";

interface StoreItem {
  _id: string;
  name: string;
  address: string;
  status: string;
}

const CreateAnnouncementNew: React.FC = () => {
  const [activeSource, setActiveSource] = useState<"upload" | "record" | "tts" | "library">("upload");
  const [playlistName, setPlaylistName] = useState("");
  const [type, setType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>(["Tue", "Fri"]);
  const [volume, setVolume] = useState({ min: 30, max: 80 });
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) return;
      
      const response = await fetch(`/api/assign-device?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        // Mapped from devices/assignments to "stores" as seen in screenshot
        const mappedStores = data.data.map((item: any) => ({
          _id: item.userId?._id || item._id,
          name: item.userId?.storeName || item.deviceId?.name || "Store name",
          address: item.userId?.storeLocation || "123 Main St, Sale, VIC 3850",
          status: "Active"
        }));
        
        // De-duplicate stores by ID
        const uniqueStores = Array.from(new Map(mappedStores.map((s: any) => [s._id, s])).values()) as StoreItem[];
        setStores(uniqueStores);
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleStore = (storeId: string) => {
    setSelectedStores(prev => 
      prev.includes(storeId) ? prev.filter(id => id !== storeId) : [...prev, storeId]
    );
  };

  const handleSelectAllStores = () => {
    if (selectedStores.length === stores.length) {
      setSelectedStores([]);
    } else {
      setSelectedStores(stores.map(s => s._id));
    }
  };

  const handleSubmit = async () => {
    if (!playlistName) {
      toast.error("Please enter a playlist name");
      return;
    }
    if (selectedStores.length === 0) {
      toast.error("Please select at least one store");
      return;
    }

    setIsLoading(true);
    // Simulating API call
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Announcement connected to stores successfully!");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#f0f9fa] p-4 lg:p-8 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-[#10353C] mb-1">Create announcement</h1>
        <p className="text-slate-500 text-sm mb-8">Create new announcement</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Left Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Upload Announcement Card */}
            <div className="bg-[#DFF4F7] rounded-3xl p-6 shadow-sm border border-cyan-100">
              <h2 className="text-lg font-bold text-[#10353C] mb-6">Upload Announcement</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <button 
                  onClick={() => setActiveSource("upload")}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all ${activeSource === "upload" ? "bg-[#FF5C16] text-white shadow-lg" : "bg-white text-slate-600 hover:bg-white/80"}`}
                >
                  <Upload size={24} className="mb-2" />
                  <span className="text-sm font-semibold">Upload new</span>
                </button>
                <button 
                  onClick={() => setActiveSource("record")}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all ${activeSource === "record" ? "bg-[#FF5C16] text-white shadow-lg" : "bg-white text-slate-600 hover:bg-white/80"}`}
                >
                  <Mic size={24} className="mb-2" />
                  <span className="text-sm font-semibold">Record</span>
                </button>
                <button 
                  onClick={() => setActiveSource("tts")}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all ${activeSource === "tts" ? "bg-[#FF5C16] text-white shadow-lg" : "bg-white text-slate-600 hover:bg-white/80"}`}
                >
                  <Type size={24} className="mb-2" />
                  <span className="text-sm font-semibold">Text to Speech</span>
                </button>
                <button 
                  onClick={() => setActiveSource("library")}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all ${activeSource === "library" ? "bg-[#FF5C16] text-white shadow-lg" : "bg-white text-slate-600 hover:bg-white/80"}`}
                >
                  <Library size={24} className="mb-2" />
                  <span className="text-sm font-semibold">Library</span>
                </button>
              </div>

              {/* Upload Dropzone */}
              <div className="bg-white rounded-2xl border-2 border-dashed border-cyan-200 p-10 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-[#fff3ee] rounded-full flex items-center justify-center mb-4">
                  <Upload size={32} className="text-[#FF5C16]" />
                </div>
                <h3 className="text-lg font-bold text-[#10353C] mb-2">Upload file</h3>
                <p className="text-slate-400 text-xs mb-6 max-w-xs">
                  Add media from your device. Audio, video, image. Size upto 5kb
                </p>
                <button className="bg-[#FF5C16] text-white px-8 py-2.5 rounded-xl font-bold shadow-md hover:bg-[#e44d0f] transition-colors">
                  Start uploading
                </button>
              </div>
            </div>

            {/* Config Form Card */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#10353C]">Playlist name</label>
                  <input 
                    type="text" 
                    placeholder="Enter playlist name"
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#10353C]">Type</label>
                  <div className="relative">
                    <select 
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all cursor-pointer"
                    >
                      <option value="">Select type</option>
                      <option value="audio">Audio</option>
                      <option value="video">Video</option>
                    </select>
                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#10353C]">Start date</label>
                  <input 
                    type="text" 
                    placeholder="dd-mm-yyyy"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#10353C]">End date</label>
                  <input 
                    type="text" 
                    placeholder="dd-mm-yyyy"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#10353C]">Start time</label>
                  <input 
                    type="text" 
                    placeholder="--:--"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[#10353C]">End time</label>
                  <div className="relative">
                    <select 
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all cursor-pointer"
                    >
                      <option value="">--:--</option>
                      {/* Generating some mocked times */}
                      {Array.from({ length: 24 }).map((_, i) => (
                        <option key={i} value={`${i.toString().padStart(2, '0')}:00`}>{`${i.toString().padStart(2, '0')}:00`}</option>
                      ))}
                    </select>
                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Day Selection */}
              <div className="mb-10">
                <label className="text-sm font-bold text-[#10353C] block mb-4">Days of the week</label>
                <div className="flex flex-wrap gap-2">
                  {days.map(day => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`w-12 h-10 rounded-lg font-bold text-xs transition-all ${selectedDays.includes(day) ? "bg-[#FF5C16] text-white shadow-md shadow-orange-200" : "bg-white border border-slate-200 text-slate-400 hover:border-[#FF5C16]"}`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Volume Slider Mock */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-[#10353C]">Global volume settings</h3>
                  <div className="flex gap-4">
                    <span className="text-xs font-bold text-blue-600">Min : {volume.min}%</span>
                    <span className="text-xs font-bold text-red-600">Max : {volume.max}%</span>
                  </div>
                </div>
                <div className="relative h-2 bg-slate-200 rounded-full mb-8">
                  <div 
                    className="absolute h-full bg-[#FF5C16] rounded-full" 
                    style={{ left: `${volume.min}%`, right: `${100 - volume.max}%` }}
                  ></div>
                  <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-[#FF5C16] rounded-full shadow-sm" style={{ left: `${volume.min}%`, transform: 'translate(-50%, -50%)' }}></div>
                  <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-[#FF5C16] rounded-full shadow-sm" style={{ left: `${volume.max}%`, transform: 'translate(-50%, -50%)' }}></div>
                </div>
                <button className="bg-white border border-[#FF5C16] text-[#10353C] text-xs font-bold px-4 py-2 rounded-lg hover:bg-orange-50 transition-colors">
                  Apply volume for all files
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Summary & Stores */}
          <div className="space-y-8">
            
            {/* Broadcast Summary Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold text-[#10353C] mb-6">Broadcast Summary</h2>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                    <Store size={24} className="text-[#FF5C16] opacity-20" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Target stores</p>
                    <p className="text-2xl font-bold text-[#10353C]">{selectedStores.length}</p>
                    <p className="text-[10px] text-slate-500">Stores selected</p>
                  </div>
                  <div className="ml-auto opacity-10">
                    <Store size={40} />
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center shadow-sm">
                    <Upload size={24} className="text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Announcement Method</p>
                    <p className="text-sm font-bold text-[#10353C]">Upload new file</p>
                    <p className="text-[10px] text-slate-500">Ready to upload</p>
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex gap-3">
                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertCircle size={14} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-orange-900">Incomplete</p>
                    <p className="text-[10px] text-orange-700">Please select stores. Start uploading.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Select Stores Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col max-h-[600px]">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-[#10353C]">Select stores</h2>
                <div className="flex gap-2">
                  <div className="relative">
                    <select className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold appearance-none pr-8 cursor-pointer text-slate-500">
                      <option>Location</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  <button 
                    onClick={handleSelectAllStores}
                    className="text-[#FF5C16] text-xs font-bold px-3 py-1.5 rounded-lg border border-[#FF5C16] hover:bg-orange-50 transition-colors"
                  >
                    {selectedStores.length === stores.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
              </div>
              
              <p className="text-[10px] text-slate-500 mb-4">Choose which stores will play this announcement</p>
              
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {stores.map(store => (
                  <div 
                    key={store._id}
                    onClick={() => toggleStore(store._id)}
                    className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer border-2 transition-all ${selectedStores.includes(store._id) ? "border-[#FF5C16] bg-orange-50" : "border-slate-50 bg-white hover:border-slate-200"}`}
                  >
                    <div className="w-12 h-12 bg-[#fff3ee] rounded-xl flex items-center justify-center flex-shrink-0">
                      <Store size={22} className="text-[#FF5C16]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-[#10353C] truncate">{store.name}</p>
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      </div>
                      <p className="text-[9px] text-slate-400 truncate mt-0.5">{store.address}</p>
                      <p className="text-[9px] font-bold text-green-600 mt-1">Active</p>
                    </div>
                    {selectedStores.includes(store._id) && (
                      <div className="ml-auto w-5 h-5 bg-[#FF5C16] rounded-full flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-6 border-t border-slate-100 flex gap-3">
                <button className="flex-1 bg-slate-50 text-slate-600 text-sm font-bold py-3 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                  Reset
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex-[2] bg-[#FF5C16] text-white text-sm font-bold py-3 rounded-xl shadow-lg shadow-orange-100 hover:bg-[#e44d0f] transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Check size={18} />
                      <span>Connect announcement to stores</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

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
};

export default CreateAnnouncementNew;
