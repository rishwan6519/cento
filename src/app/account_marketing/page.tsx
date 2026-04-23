"use client";
import React, { useState, useEffect, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import CreateAnnouncementWizard from "../components/CreateAnnouncementWizard";
import {
  LayoutDashboard,
  Store,
  Users,
  ImageIcon,
  User,
  HeadphonesIcon,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  AlertTriangle,
  ArrowRight,
  Plus,
  MonitorSmartphone,
  Megaphone,
  BarChart,
  List as ListIcon,
  Music,
  Upload,
  Eye,
  Zap,
  Edit,
  Trash2,
  Video,
  FileAudio,
  Mic,
  FolderOpen,
  Volume2,
  CheckCircle2,
  Shield,
  Building,
  MapPin,
  Clock
} from "lucide-react";
import { useRouter } from "next/navigation";

// --- Sub-components for different views ---

const DashboardView = ({ setActiveView, userData }: { setActiveView: (view: string) => void, userData?: any }) => {
  const [stats, setStats] = useState({ storesAssigned: 0, centralCampaigns: 0, storesNoCampaigns: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        let assignedCount = 0;
        let storesArray: any[] = [];
        
        // Fetch Stores
        if (userData.hasAllStoreAccess) {
          const res = await fetch(`/api/user?controllerId=${userData.controllerId}`);
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            storesArray = data.data.filter((u: any) => u.role === 'store');
            assignedCount = storesArray.length;
          }
        } else if (userData.assignedStoreId) {
          assignedCount = 1;
          const res = await fetch(`/api/user?userId=${userData.assignedStoreId}`);
          const data = await res.json();
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            storesArray = [data.data[0]];
          } else if (data.success && data.data && !Array.isArray(data.data)) {
            storesArray = [data.data];
          }
        }
        
        // Fetch Central Campaigns
        let campaignsCount = 0;
        let campaignsArray: any[] = [];
        const currentUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : "";
        if (currentUserId) {
          const pRes = await fetch(`/api/playlists?userId=${currentUserId}`);
          if (pRes.ok) {
            const pData = await pRes.json();
            if (Array.isArray(pData)) {
              campaignsArray = pData;
              campaignsCount = pData.length;
            }
          }
        }
        
        // Calculate stores with no active campaigns
        let storesWithNoCampaigns = 0;
        if (storesArray.length > 0) {
           const storeIdsWithCentralCampaigns = new Set(
               campaignsArray.map((c: any) => c.selectedDeviceId).filter(Boolean)
           );
           storesArray.forEach((store: any) => {
               if (!storeIdsWithCentralCampaigns.has(store._id?.toString())) {
                   storesWithNoCampaigns++;
               }
           });
           // If stores hasn't loaded properly, fallback
        } else if (assignedCount > 0 && campaignsCount === 0) {
           storesWithNoCampaigns = assignedCount;
        }
        
        setStats({ 
          storesAssigned: assignedCount, 
          centralCampaigns: campaignsCount, 
          storesNoCampaigns: storesWithNoCampaigns 
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userData]);

  const userName = userData?.operatorName || userData?.username || "Bastien Morel";

  return (
  <div className="space-y-8 pb-12">
    {/* Welcome Banner */}
    <div className="bg-[#1A454D] rounded-3xl p-8 text-white shadow-xl">
      <h1 className="text-3xl font-bold mb-2">Welcome back, {userName} !</h1>
      <p className="text-white/80 mb-8">Here's what's happening with your accounts today.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/10 rounded-2xl p-6 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-[#A1F4FD]">No. of stores assigned</h3>
            <Store size={20} className="text-[#A1F4FD]" />
          </div>
          <h2 className="text-5xl font-bold text-white">{loading ? "-" : stats.storesAssigned}</h2>
        </div>

        <div className="bg-white/10 rounded-2xl p-6 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-[#A1F4FD]">Central level campaigns</h3>
            <User size={20} className="text-[#A1F4FD]" />
          </div>
          <h2 className="text-5xl font-bold text-white">{loading ? "-" : stats.centralCampaigns}</h2>
        </div>
      </div>
    </div>

    {/* Middle Layout Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
      <div>
        {/* Attention Required Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-[#1A454D] text-white rounded-lg">
              <AlertTriangle size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Attention Required</h2>
          </div>

          <div className="grid grid-cols-1 gap-4 max-w-xl">
            <div className="bg-white rounded-3xl p-6 border-l-4 border-l-[#FF5722] shadow-sm hover:shadow-md transition-shadow flex flex-col items-center justify-center text-center py-10">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-6">
                <BarChart className="text-[#FF5722]" size={20} />
              </div>
              <h3 className="text-sm font-medium text-gray-800 mb-4 h-5">Stores with no active campaigns</h3>
              <div className="text-4xl font-bold text-gray-900 mb-6">{stats.storesNoCampaigns}</div>
              <button className="text-[#FF5722] text-sm flex items-center justify-center gap-2 font-bold hover:gap-3 transition-all">
                Check now <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Quick Actions */}
      <div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mt-14 sticky top-0">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-6">
            <button 
              onClick={() => setActiveView("view_central_campaigns")}
              className="w-full py-4 px-6 bg-[#FF5722] text-white rounded-2xl font-bold hover:bg-[#F4511E] transition-all flex items-center justify-between shadow-lg shadow-[#FF5722]/20 group"
            >
              <span className="text-left text-sm md:text-base">View central level campaigns</span>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform shrink-0" />
            </button>
            <button 
              onClick={() => setActiveView("create_central_campaign")}
              className="w-full py-4 px-6 bg-[#00BCD4] text-white rounded-2xl font-bold hover:bg-[#00ACC1] transition-all flex items-center justify-between shadow-lg shadow-[#00BCD4]/20 group"
            >
              <span className="text-left text-sm md:text-base">Create new central level campaigns</span>
              <Plus size={20} className="group-hover:scale-125 transition-transform shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

// --- NEW VIEWS ---

const ViewStoreCampaignsView = ({ userData }: { userData?: any }) => {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData) { setLoading(false); return; }
    const fetchStores = async () => {
      setLoading(true);
      try {
        if (userData.hasAllStoreAccess) {
          const res = await fetch(`/api/user?controllerId=${userData.controllerId}`);
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            setStores(data.data.filter((u: any) => u.role === 'store'));
          }
        } else if (userData.assignedStoreId) {
          const res = await fetch(`/api/user?userId=${userData.assignedStoreId}`);
          const data = await res.json();
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setStores([data.data[0]]);
          } else if (data.success && data.data && !Array.isArray(data.data)) {
            setStores([data.data]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch stores", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStores();
  }, [userData]);

  return (
    <div className="pb-12 max-w-[1200px]">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by username, name, or location..." 
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50"
          />
        </div>
        <select className="w-48 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 bg-white">
          <option>Location</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-[#0E3B43] px-6 py-4">
          <h3 className="text-white font-bold">Store Campaigns</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-bold text-gray-900 uppercase">
                <th className="px-6 py-4">STORE NAME</th>
                <th className="px-6 py-4">LOCATION</th>
                <th className="px-6 py-4">NO OF ACTIVE CAMPAIGNS</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-center text-gray-500">Loading stores...</td>
                </tr>
              ) : stores.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-center text-gray-500">No stores assigned or found.</td>
                </tr>
              ) : stores.map((store, i) => (
                <tr key={store._id || i} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-6 py-6 text-gray-800">{store.storeName || store.username || "Store"}</td>
                  <td className="px-6 py-6 text-gray-800">{store.storeLocation || store.location || "N/A"}</td>
                  <td className="px-6 py-6 text-gray-800">0</td>
                  <td className="px-6 py-6 text-right">
                    <button className="px-6 py-2.5 bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-xl font-bold transition-all shadow-md shadow-[#FF5722]/20">
                      Request status
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>Showing {stores.length} of {stores.length} store campaigns</span>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">Previous</button>
            <button className="px-4 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CreateCentralCampaignMenuView = ({ setActiveView }: { setActiveView: (v: string) => void }) => {
  return (
    <div className="pb-12 max-w-[1200px] space-y-8">
      <div>
        <div className="bg-[#0E3B43] rounded-t-2xl p-6 flex items-center gap-4 text-white">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#FF5722]">
            <Music size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Media playlist</h2>
            <p className="text-white/70 text-sm">Create and manage video and audio content</p>
          </div>
        </div>
        <div className="bg-white rounded-b-2xl shadow-sm border border-gray-100 border-t-0 p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-gray-200 rounded-2xl p-8 hover:shadow-md transition-shadow flex flex-col items-start bg-white">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-[#FF5722] mb-6">
                <Plus size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Create new playlist</h3>
              <p className="text-sm text-gray-500 mb-8 h-10">Start building a new media playlist from scratch</p>
              <button onClick={() => setActiveView("create_central_campaign_form")} className="w-full py-3 bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-xl font-bold transition-all shadow-md shadow-[#FF5722]/20 mt-auto">
                Create playlist
              </button>
            </div>
            <div className="border border-gray-200 rounded-2xl p-8 hover:shadow-md transition-shadow flex flex-col items-start bg-white">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-[#FF5722] mb-6">
                <Eye size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">View playlist</h3>
              <p className="text-sm text-gray-500 mb-8 h-10">Browse and manage all existing media playlist</p>
              <button onClick={() => setActiveView("view_playlist")} className="w-full py-3 bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-xl font-bold transition-all shadow-md shadow-[#FF5722]/20 mt-auto">
                View playlist
              </button>
            </div>
            <div className="border border-gray-200 rounded-2xl p-8 hover:shadow-md transition-shadow flex flex-col items-start bg-white">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-[#FF5722] mb-6">
                <Zap size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Instant playlist</h3>
              <p className="text-sm text-gray-500 mb-8 h-10">Quick access to create instant playlist</p>
              <button onClick={() => setActiveView("create_instant_playlist")} className="w-full py-3 bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-xl font-bold transition-all shadow-md shadow-[#FF5722]/20 mt-auto">
                Instant playlist
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="bg-[#0E3B43] rounded-t-2xl p-6 flex items-center gap-4 text-white">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#FF5722]">
            <Music size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Announcement playlist</h2>
            <p className="text-white/70 text-sm">Broadcast important messages and notifications</p>
          </div>
        </div>
        <div className="bg-white rounded-b-2xl shadow-sm border border-gray-100 border-t-0 p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-gray-200 rounded-2xl p-8 hover:shadow-md transition-shadow flex flex-col items-start bg-white">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-[#FF5722] mb-6">
                <Plus size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Create announcements</h3>
              <p className="text-sm text-gray-500 mb-8 h-10">Design new announcement campaigns and messages</p>
              <button onClick={() => setActiveView("create_announcement")} className="w-full py-3 bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-xl font-bold transition-all shadow-md shadow-[#FF5722]/20 mt-auto">
                Create announcements
              </button>
            </div>
            <div className="border border-gray-200 rounded-2xl p-8 hover:shadow-md transition-shadow flex flex-col items-start bg-white">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-[#FF5722] mb-6">
                <Eye size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">View announcements</h3>
              <p className="text-sm text-gray-500 mb-8 h-10">Review and manage existing announcements</p>
              <button className="w-full py-3 bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-xl font-bold transition-all shadow-md shadow-[#FF5722]/20 mt-auto">
                View announcements
              </button>
            </div>
            <div className="border border-gray-200 rounded-2xl p-8 hover:shadow-md transition-shadow flex flex-col items-start bg-white">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-[#FF5722] mb-6">
                <Zap size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Instant announcements</h3>
              <p className="text-sm text-gray-500 mb-8 h-10">Send urgent messages using instant announcements</p>
              <button className="w-full py-3 bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-xl font-bold transition-all shadow-md shadow-[#FF5722]/20 mt-auto">
                Instant announcements
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CreateCentralCampaignFormView = ({ userData, editData, setActiveView, setEditingCampaign }: { userData?: any, editData?: any, setActiveView?: any, setEditingCampaign?: any }) => {
  const [sourceMode, setSourceMode] = useState<"none" | "upload" | "existing">("none");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedDays, setSelectedDays] = useState<string[]>(['Tue', 'Fri']);
  const [stores, setStores] = useState<any[]>([]);

  useEffect(() => {
    if (!userData) return;
    const fetchStores = async () => {
      try {
        if (userData.hasAllStoreAccess) {
          const res = await fetch(`/api/user?controllerId=${userData.controllerId}`);
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            setStores(data.data.filter((u: any) => u.role === 'store'));
          }
        } else if (userData.assignedStoreId) {
          const res = await fetch(`/api/user?userId=${userData.assignedStoreId}`);
          const data = await res.json();
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setStores([data.data[0]]);
          } else if (data.success && data.data && !Array.isArray(data.data)) {
            setStores([data.data]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch stores", err);
      }
    };
    fetchStores();
  }, [userData]);

  // Playlist Config
  const [cfg, setCfg] = useState({
    name: "", type: "", startDate: "", endDate: "", startTime: "", endTime: ""
  });
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);

  useEffect(() => {
    if (editData) {
      setCfg(prev => ({
        ...prev,
        name: editData.name || "",
        type: editData.type || "media",
        startDate: editData.startDate ? new Date(editData.startDate).toISOString().split('T')[0] : "",
        endDate: editData.endDate ? new Date(editData.endDate).toISOString().split('T')[0] : "",
        startTime: editData.startTime || "",
        endTime: editData.endTime || "",
      }));
      if (editData.deviceIds && editData.deviceIds.length > 0) setSelectedStoreIds(editData.deviceIds);
      else if (editData.selectedDeviceId) setSelectedStoreIds([editData.selectedDeviceId]);

      if (editData.daysOfWeek && editData.daysOfWeek.length > 0) setSelectedDays(editData.daysOfWeek);
      if (editData.files) setSelectedMediaIds(editData.files.map((f: any) => f.fileId || f._id || f));
    }
  }, [editData]);
  
  // Media State
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [globalVol, setGlobalVol] = useState({ min: 30, max: 80 });

  const fetchMedia = async () => {
    const currentUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : "";
    if (!currentUserId) return;
    setLoadingMedia(true);
    try {
      const res = await fetch(`/api/media?userId=${currentUserId}`);
      const data = await res.json();
      setMediaItems(data.media || data.mediaFiles || data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMedia(false);
    }
  };

  useEffect(() => {
    if (sourceMode === "existing") fetchMedia();
  }, [sourceMode]);

  const toggleDay = (day: string) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(files);
  };

  const handleUploadConfirm = async () => {
    if (uploadedFiles.length === 0) return toast.error("No files selected");
    setUploading(true);
    const formData = new FormData();
    const currentUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : "";
    formData.append("userId", currentUserId || "");
    formData.append("userRole", "account_marketing");
    uploadedFiles.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
      formData.append(`fileNames[${index}]`, file.name);
    });

    try {
      const res = await fetch("/api/media/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        toast.success("Files uploaded successfully!");
        setUploadedFiles([]);
        setSourceMode("existing");
      } else {
        toast.error(data.message || "Upload failed");
      }
    } catch (err) {
      toast.error("Upload error");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitPlaylist = async () => {
    if (!cfg.name || selectedStoreIds.length === 0) return toast.error("Playlist name and store selection are required");
    if (selectedMediaIds.length === 0) return toast.error("Please select existing media before connecting");

    setSubmitting(true);
    const currentUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : "";

    const method = editData ? 'PUT' : 'POST';
    const body = {
      ...(editData && { id: editData._id }),
      userId: currentUserId,
      name: cfg.name,
      type: cfg.type || "media",
      startDate: cfg.startDate,
      endDate: cfg.endDate,
      startTime: cfg.startTime,
      endTime: cfg.endTime,
      daysOfWeek: selectedDays,
      globalMinVolume: globalVol.min,
      globalMaxVolume: globalVol.max,
      selectedDeviceId: selectedStoreIds[0],
      deviceIds: selectedStoreIds,
      mediaIds: selectedMediaIds
    };

    try {
        const res = await fetch("/api/playlists", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        const data = await res.json();
        if (data.success) {
           toast.success(`Playlist ${editData ? 'updated' : 'connected'} successfully!`);
           setCfg({ name: "", type: "", startDate: "", endDate: "", startTime: "", endTime: "" });
           setSelectedStoreIds([]);
           setSelectedMediaIds([]);
           setSelectedDays(['Tue', 'Fri']);
           if (setActiveView && setEditingCampaign) {
             setEditingCampaign(null);
             setActiveView("view_central_campaigns");
           }
        } else {
           toast.error(data.message || "Failed to create playlist");
        }
    } catch(err) { 
        toast.error("Error creating playlist"); 
    } finally {
        setSubmitting(false);
    }
  };

  return (
    <div className="pb-12 max-w-[1000px] flex gap-8">
      <div className="w-2 bg-[#FF5722] rounded-full shrink-0"></div>
      
      <div className="flex-1 space-y-8">
        {/* Step 1 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-[#0E3B43] px-8 py-6 flex items-center gap-6">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#0E3B43] font-bold text-xl">1</div>
            <div>
              <h2 className="text-white text-xl font-bold">Select media</h2>
              <p className="text-white/70 text-sm">Audio, video, image. Size upto 5kb</p>
            </div>
          </div>
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <div 
                onClick={() => { setSourceMode("upload"); fileInputRef.current?.click(); }}
                className={`border border-dashed ${sourceMode === "upload" ? "border-[#FF5722] bg-orange-50/50" : "border-[#FF5722] hover:bg-orange-50/50"} rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors`}
              >
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-[#FF5722] border border-orange-100 mb-4">
                  <Upload size={20} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Upload new</h3>
                <p className="text-xs text-gray-500">Add media from your device</p>
              </div>
              <div 
                onClick={() => setSourceMode("existing")}
                className={`border border-dashed ${sourceMode === "existing" ? "border-[#FF5722] bg-orange-50/50" : "border-gray-300 hover:bg-gray-50"} rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors`}
              >
                <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-[#FF5722] border border-orange-100 mb-4">
                  <Upload size={20} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Select from existing list</h3>
                <p className="text-xs text-gray-500">Choose from previously uploaded media</p>
              </div>
            </div>

            {sourceMode === "upload" && (
              <div className="mt-8 pt-6 border-t border-gray-100 animate-in fade-in slide-in-from-top-4 duration-300">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Upload files</label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-4 border border-gray-200 rounded-xl bg-gray-50 cursor-pointer text-gray-700 text-sm font-medium min-h-[52px] flex items-center"
                >
                  {uploadedFiles.length > 0 ? uploadedFiles.map(f => f.name).join(", ") : "Click to select files…"}
                </div>
                <input ref={fileInputRef} type="file" multiple hidden accept="audio/*,video/*,image/*" onChange={handleFileChange} />
                
                {uploadedFiles.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between mt-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                     <span className="text-sm text-[#FF5722] font-bold mb-4 sm:mb-0">{uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} selected</span>
                     <div className="flex gap-4 w-full sm:w-auto">
                       <button className="flex-1 sm:flex-none px-6 py-2.5 bg-white border border-gray-200 text-[#FF5722] rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors">
                         Preview media
                       </button>
                       <button 
                         onClick={handleUploadConfirm}
                         disabled={uploading}
                         className={`flex-1 sm:flex-none px-6 py-2.5 ${uploading ? 'bg-orange-300' : 'bg-[#FF5722] hover:bg-[#F4511E]'} text-white rounded-lg text-sm font-bold shadow-sm transition-colors`}
                       >
                         {uploading ? "Uploading..." : "Confirm selection"}
                       </button>
                     </div>
                  </div>
                )}
              </div>
            )}
            
            {sourceMode === "existing" && (
               <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-center justify-center py-4 animate-in fade-in slide-in-from-top-4 duration-300 w-full overflow-x-auto">
                 {loadingMedia ? (
                   <p className="text-gray-500 font-medium my-8">Loading media...</p>
                 ) : mediaItems.length === 0 ? (
                   <div className="text-center py-8">
                     <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mb-4 mx-auto">
                       <ListIcon size={24} />
                     </div>
                     <p className="text-gray-500 font-medium mb-4 text-sm">No media found in your library.</p>
                   </div>
                 ) : (
                   <div className="w-full">
                     <table className="w-full text-left border-collapse text-sm">
                       <thead>
                         <tr className="border-b border-gray-100 bg-gray-50 text-gray-500">
                           <th className="p-3"></th>
                           <th className="p-3 font-semibold">Media Name</th>
                           <th className="p-3 font-semibold">Type</th>
                         </tr>
                       </thead>
                       <tbody>
                         {mediaItems.map(m => (
                           <tr key={m._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                             <td className="p-3">
                               <input 
                                 type="checkbox" 
                                 className="cursor-pointer"
                                 checked={selectedMediaIds.includes(m._id)} 
                                 onChange={() => setSelectedMediaIds(prev => prev.includes(m._id) ? prev.filter(x => x !== m._id) : [...prev, m._id])}
                               />
                             </td>
                             <td className="p-3 text-gray-800 font-semibold">{m.name}</td>
                             <td className="p-3 text-gray-500 font-medium uppercase text-xs">{m.type}</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                     {selectedMediaIds.length > 0 && (
                       <div className="mt-4 flex justify-end">
                         <div className="px-4 py-2 bg-green-50 text-green-700 text-sm rounded-lg font-bold border border-green-200">
                           {selectedMediaIds.length} file(s) confirmed selected
                         </div>
                       </div>
                     )}
                   </div>
                 )}
               </div>
            )}
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-[#0E3B43] px-8 py-6 flex items-center gap-6">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#0E3B43] font-bold text-xl">2</div>
            <div>
              <h2 className="text-white text-xl font-bold">Let's setup your playlist</h2>
              <p className="text-white/70 text-sm">Setup your playlist here</p>
            </div>
          </div>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Playlist name</label>
                <input type="text" placeholder="Enter playlist name" value={cfg.name} onChange={e => setCfg({...cfg, name: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                <select value={cfg.type} onChange={e => setCfg({...cfg, type: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 text-gray-500">
                  <option value="">Select type</option>
                  <option value="audio">Audio</option>
                  <option value="video">Video</option>
                  <option value="image">Image</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Start date</label>
                <input type="date" value={cfg.startDate} onChange={e => setCfg({...cfg, startDate: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 text-gray-700 uppercase" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">End date</label>
                <input type="date" value={cfg.endDate} onChange={e => setCfg({...cfg, endDate: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 text-gray-700 uppercase" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Start time</label>
                <input type="time" value={cfg.startTime} onChange={e => setCfg({...cfg, startTime: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 text-gray-700 uppercase" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">End time</label>
                <input type="time" value={cfg.endTime} onChange={e => setCfg({...cfg, endTime: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 text-gray-700 uppercase" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Days of the week</label>
              <div className="flex flex-wrap gap-3">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                  const isActive = selectedDays.includes(day);
                  return (
                    <button 
                      key={day} 
                      onClick={() => toggleDay(day)}
                      className={`px-5 py-2 rounded-lg font-medium text-sm border transition-colors ${isActive ? 'bg-[#FF5722] text-white border-[#FF5722]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-6">Global volume settings</h3>
              <div className="flex gap-4 text-[10px] font-bold mb-4">
                <span className="text-[#00BCD4] uppercase">Min: {globalVol.min}%</span>
                <span className="text-[#FF5722] uppercase">Max: {globalVol.max}%</span>
              </div>
              <div className="flex gap-6 mb-8">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 font-bold mb-2 block uppercase tracking-wide">Min Volume</label>
                  <input 
                    type="range" 
                    min="0" max="100" 
                    value={globalVol.min} 
                    onChange={(e) => setGlobalVol({...globalVol, min: parseInt(e.target.value)})} 
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#00BCD4]"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 font-bold mb-2 block uppercase tracking-wide">Max Volume</label>
                  <input 
                    type="range" 
                    min="0" max="100" 
                    value={globalVol.max} 
                    onChange={(e) => setGlobalVol({...globalVol, max: parseInt(e.target.value)})} 
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF5722]"
                  />
                </div>
              </div>
              <button onClick={() => toast.success("Volume applied for all files")} className="px-6 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg text-sm font-bold hover:bg-gray-50">
                Apply volume for all files
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-700">Apply to stores</label>
                <div className="text-xs text-gray-500 font-medium">Selected: <span className="text-[#FF5722] font-bold">{selectedStoreIds.length}</span>/{stores.length}</div>
              </div>
              <div className="border border-gray-200 rounded-xl bg-gray-50 max-h-60 overflow-y-auto p-4 custom-scrollbar">
                {stores.length === 0 ? (
                  <p className="text-gray-500 text-center text-sm py-4">No stores available</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {stores.map(store => {
                      const isSelected = selectedStoreIds.includes(store._id);
                      return (
                        <div 
                          key={store._id}
                          onClick={() => setSelectedStoreIds(prev => prev.includes(store._id) ? prev.filter(id => id !== store._id) : [...prev, store._id])}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'bg-orange-50/50 border-[#FF5722]' : 'bg-white border-gray-200 hover:border-[#FF5722]/50'}`}
                        >
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 text-[#FF5722] border-gray-300 focus:ring-[#FF5722] rounded"
                          />
                          <div className="flex-1 truncate font-medium text-sm text-gray-800">
                            {store.storeName || store.username || `Store (${store._id})`}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 pt-6 mt-4 border-t border-gray-100">
              <button 
                onClick={() => {
                  setCfg({ name: "", type: "", startDate: "", endDate: "", startTime: "", endTime: "" });
                  setSelectedStoreIds([]);
                  setSelectedMediaIds([]);
                  setSelectedDays(['Tue', 'Fri']);
                }}
                className="px-8 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
               >
                Reset
              </button>
              <button 
                onClick={handleSubmitPlaylist}
                disabled={submitting}
                className={`flex items-center gap-2 px-8 py-3 ${submitting ? 'bg-orange-300' : 'bg-[#FF5722] hover:bg-[#F4511E]'} text-white rounded-xl font-bold transition-all shadow-md shadow-[#FF5722]/20`}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                {submitting ? "Connecting..." : "Connect playlist to stores"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ViewCentralCampaignsView = ({ setActiveView, setEditingCampaign }: { setActiveView?: any, setEditingCampaign?: any }) => {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlaylists = async () => {
    const currentUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : "";
    if(!currentUserId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/playlists?userId=${currentUserId}`);
      const data = await res.json();
      setPlaylists(Array.isArray(data) ? data : []);
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlaylists(); }, []);

  const handleDelete = async (id: string) => {
    if(!confirm("Are you sure you want to delete this campaign?")) return;
    try {
      const res = await fetch("/api/playlists", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if(data.success) {
        toast.success("Campaign deleted");
        fetchPlaylists();
      } else {
        toast.error("Failed to delete");
      }
    } catch(err) {
      toast.error("Error deleting campaign");
    }
  };

  return (
    <div className="pb-12 max-w-[1200px]">
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex gap-4 flex-1">
          <div className="flex items-center text-gray-500 font-medium px-4">Filter by</div>
          <select className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 bg-white">
            <option>Campaign type</option>
          </select>
          <select className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 bg-white">
            <option>End date</option>
          </select>
        </div>
        <button 
          onClick={() => setActiveView && setActiveView("create_central_campaign")}
          className="flex items-center gap-2 px-6 py-4 bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-xl font-bold transition-all shadow-md shadow-[#FF5722]/20 shrink-0"
        >
          <Plus size={20} /> Create new campaign
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-[#0E3B43] px-6 py-4">
          <h3 className="text-white font-bold">Central Campaigns</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-bold text-gray-900 uppercase">
                <th className="px-6 py-4">PLAYLIST NAME</th>
                <th className="px-6 py-4">START DATE</th>
                <th className="px-6 py-4">END DATE</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium">
              {loading ? (
                <tr><td colSpan={4} className="p-6 text-center text-gray-500">Loading campaigns...</td></tr>
              ) : playlists.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-gray-500">No campaigns found</td></tr>
              ) : playlists.map((row, i) => (
                <tr key={row._id || i} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-6 py-6 text-gray-800">
                    <p className="font-bold">{row.name}</p>
                    <p className="text-xs text-[#FF5722] uppercase">{row.type}</p>
                  </td>
                  <td className="px-6 py-6 text-gray-800">{row.startDate ? new Date(row.startDate).toLocaleDateString() : '-'}</td>
                  <td className="px-6 py-6 text-gray-800">{row.endDate ? new Date(row.endDate).toLocaleDateString() : '-'}</td>
                  <td className="px-6 py-6 flex items-center justify-end gap-5">
                    <button 
                      onClick={() => {
                        if (setActiveView && setEditingCampaign) {
                          setEditingCampaign(row);
                          setActiveView("create_central_campaign_form");
                        }
                      }}
                      className="text-[#00BCD4] hover:text-[#00ACC1]"
                    >
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(row._id)} className="text-red-500 hover:text-red-600"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>Showing {playlists.length} of {playlists.length} central campaigns</span>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50">Previous</button>
            <button className="px-4 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ViewPlaylistView = () => {
  return (
    <div className="pb-12 max-w-[1200px]">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">View playlist</h1>
      <p className="text-sm text-gray-500 mb-8">View your playlist here</p>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by playlist name" 
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50"
          />
        </div>
        <select className="w-48 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 bg-white">
          <option>Status</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-[#0E3B43] px-6 py-4">
          <h3 className="text-white font-bold">Playlist</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-bold text-gray-900 uppercase">
                <th className="px-6 py-4">PLAYLIST NAME</th>
                <th className="px-6 py-4">SCHEDULE</th>
                <th className="px-6 py-4">PREVIEW</th>
                <th className="px-6 py-4">STATUS</th>
                <th className="px-6 py-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium">
              {[
                { name: "Playlist name", schedule: "Mon.Tue | 9am to 11am", status: "Paused", statusColor: "text-red-500" },
                { name: "Playlist name", schedule: "Mon.Tue | 9am to 11am", status: "Running", statusColor: "text-green-500" },
                { name: "Playlist name", schedule: "Mon.Tue | 9am to 11am", status: "Upcoming", statusColor: "text-yellow-500" },
                { name: "Playlist name", schedule: "Mon.Tue | 9am to 11am", status: "Running", statusColor: "text-green-500" }
              ].map((row, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-6 py-6 text-gray-800">{row.name}</td>
                  <td className="px-6 py-6 text-gray-800">{row.schedule}</td>
                  <td className="px-6 py-6 text-gray-500">[Display file link uploaded by A/c user]</td>
                  <td className={`px-6 py-6 ${row.statusColor}`}>{row.status}</td>
                  <td className="px-6 py-6 flex items-center justify-end gap-5">
                    <button className="text-[#00BCD4] hover:text-[#00ACC1]"><Edit size={18} /></button>
                    <button className="text-red-500 hover:text-red-600"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const CreateInstantPlaylistView = () => {
  return (
    <div className="pb-12 max-w-[1200px]">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Create New Instant Playlist</h1>
      <p className="text-sm text-gray-500 mb-8">Build instant playlist by selecting and ordering media files</p>

      <div className="space-y-6">
        {/* Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h3 className="font-bold text-gray-900 mb-6">Instant Playlist Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Instant playlist name <span className="text-red-500">*</span></label>
              <input type="text" placeholder="e.g., Summer Campaign 2024" className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
              <select className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 text-gray-500">
                <option></option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">End date <span className="text-red-500">*</span></label>
              <input type="text" placeholder="dd-mm-yyyy" className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">End time <span className="text-red-500">*</span></label>
              <input type="text" placeholder="--:--" className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
              <textarea rows={3} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
            </div>
          </div>
        </div>

        {/* Media Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col h-[400px]">
             <div className="flex items-center gap-4 mb-6">
               <h3 className="font-bold text-gray-900">Available Media</h3>
               <div className="flex border border-gray-200 rounded-lg overflow-hidden text-xs font-bold ml-auto">
                 <button className="px-3 py-1.5 bg-[#FF5722] text-white">All</button>
                 <button className="px-3 py-1.5 bg-white text-gray-600 hover:bg-gray-50">Audio</button>
                 <button className="px-3 py-1.5 bg-white text-gray-600 hover:bg-gray-50 border-l border-r border-gray-200">Video</button>
                 <button className="px-3 py-1.5 bg-white text-gray-600 hover:bg-gray-50">Image</button>
               </div>
             </div>
             
             <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
               {[
                 { name: "summer_sale_2024.mp4", duration: "0:45", icon: Video, color: "text-[#FF5722]", bg: "bg-orange-50" },
                 { name: "product_showcase.mp4", duration: "1:30", icon: Video, color: "text-[#FF5722]", bg: "bg-orange-50" },
                 { name: "background_music.mp3", duration: "3:24", icon: Music, color: "text-amber-500", bg: "bg-amber-50" },
                 { name: "brand_logo.png", duration: "5s", icon: ImageIcon, color: "text-[#FF5722]", bg: "bg-orange-50" },
                 { name: "seasonal_promo.jpg", duration: "8s", icon: ImageIcon, color: "text-[#FF5722]", bg: "bg-orange-50" },
               ].map((item, idx) => (
                 <div key={idx} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-[#00BCD4]/30 bg-gray-50 group cursor-pointer transition-colors">
                   <div className="flex items-center gap-3">
                     <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center ${item.color}`}>
                       <item.icon size={18} />
                     </div>
                     <div>
                       <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                       <p className="text-xs text-gray-500">{item.duration}</p>
                     </div>
                   </div>
                   <button className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-[#00BCD4] group-hover:bg-[#00BCD4] group-hover:border-[#00BCD4] group-hover:text-white transition-colors">
                     <Plus size={14} />
                   </button>
                 </div>
               ))}
             </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col h-[400px]">
            <h3 className="font-bold text-gray-900 mb-6">Playlist Items (0)</h3>
            <div className="border-2 border-dashed border-gray-200 rounded-xl flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50 text-gray-400">
               <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                 <Plus size={20} className="text-gray-300" />
               </div>
               <p className="font-medium text-gray-600 mb-1">No items added yet</p>
               <p className="text-sm">Add media from the left panel</p>
            </div>
          </div>
        </div>

        {/* Store Selection */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
           <div className="flex justify-between items-center mb-6">
             <div>
               <h3 className="font-bold text-gray-900">Select stores</h3>
               <p className="text-sm text-gray-500">Choose which store will play this announcement</p>
             </div>
             <button className="px-6 py-2 border border-[#FF5722] text-[#FF5722] rounded-lg font-bold text-sm hover:bg-orange-50">Select All</button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
             {[1, 2, 3, 4, 5, 6].map((idx) => {
               const isActive = idx === 2;
               return (
               <div key={idx} className={`border ${isActive ? 'border-[#FF5722] shadow-sm bg-orange-50/20' : 'border-gray-200 bg-white'} rounded-xl p-6 flex items-start gap-4 cursor-pointer relative`}>
                 {isActive && <div className="absolute top-4 right-4 text-[#FF5722]"><CheckCircle2 size={20} /></div>}
                 <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-[#FF5722] shrink-0">
                   <Store size={20} />
                 </div>
                 <div>
                   <h4 className="font-bold text-gray-900 flex items-center gap-2">Store name <span className="w-2 h-2 rounded-full bg-green-500"></span></h4>
                   <p className="text-xs text-gray-500 mb-1">123 Main St, Sale, VIC 3850</p>
                   <span className="text-xs font-bold text-green-600">Active</span>
                 </div>
               </div>
             )})}
           </div>
           
           <div className="flex justify-between items-center pt-6 border-t border-gray-100">
             <div>
               <p className="font-bold text-gray-900 text-sm">1 store selected</p>
               <p className="text-xs text-gray-500">Ready to broadcast announcement</p>
             </div>
             <button className="text-red-500 font-bold text-sm hover:text-red-600">Clear Selection</button>
           </div>
        </div>

        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-8 py-3 bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-xl font-bold transition-all shadow-md shadow-[#FF5722]/20">
            <Music size={18} />
            Create instant playlist
          </button>
          <button className="px-8 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-colors">
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};const CreateAnnouncementView = ({ userData, setActiveView }: { userData: any, setActiveView: (view: any) => void }) => {
  return (
    <div className="pb-12">
      <h1 className="text-3xl font-bold text-[#10353C] mb-1">Create announcement</h1>
      <p className="text-sm text-[#64748B] mb-8">Configure and broadcast your audio announcement across your assigned stores.</p>
      
      <CreateAnnouncementWizard 
        userId={userData?._id}
        customerId={userData?.customerId}
        userRole="account_marketing"
        onNavigate={setActiveView}
      />
    </div>
  );
};
;

const MediaProvisioningView = () => {
  const [loading, setLoading] = useState(true);
  const [provisioned, setProvisioned] = useState(false);
  const [provisionedSince, setProvisionedSince] = useState("");
  const [wantsAccess, setWantsAccess] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      const id = localStorage.getItem("userId");
      if (!id) { setLoading(false); return; }
      try {
        const res = await fetch(`/api/user?userId=${id}`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          const u = data.data[0];
          setProvisioned(!!u.mediaProvisioning);
          if (u.updatedAt) setProvisionedSince(new Date(u.updatedAt).toLocaleDateString());
        }
      } catch (err) {
        console.error("Failed to fetch provisioning status", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const handleConfirm = async () => {
    if (!wantsAccess) return toast.error("Please select 'Yes' to request access");
    if (!startDate || !endDate) return toast.error("Please select both start and end dates");
    if (new Date(endDate) < new Date(startDate)) return toast.error("End date must be after start date");

    setSaving(true);
    const id = localStorage.getItem("userId");
    try {
      const res = await fetch(`/api/user?userId=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaProvisioning: true })
      });
      const data = await res.json();
      if (data.success) {
        setProvisioned(true);
        setProvisionedSince(new Date().toLocaleDateString());
        toast.success("Media provisioning request sent successfully!");
      } else {
        toast.error("Failed to save provisioning request");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    const id = localStorage.getItem("userId");
    try {
      const res = await fetch(`/api/user?userId=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaProvisioning: false })
      });
      const data = await res.json();
      if (data.success) {
        setProvisioned(false);
        setWantsAccess(false);
        setStartDate("");
        setEndDate("");
        toast.success("Media provisioning access removed.");
      } else {
        toast.error("Failed to remove provisioning");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-[#FF5722] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-12 max-w-[1200px] mx-auto">
      <h1 className="text-3xl font-bold text-[#0E3B43] mb-1">Media provisioning</h1>
      <p className="text-sm text-gray-500 mb-8">Manage your media provisioning access with the platform.</p>

      {provisioned ? (
        /* ---- ALREADY GRANTED STATE ---- */
        <div className="space-y-6">
          {/* Status Banner */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-green-800 mb-1">Provisioning Access Granted</h3>
              <p className="text-sm text-green-700">Your media provisioning access has been granted by the reseller. You can now upload and manage media content.</p>
              {provisionedSince && <p className="text-xs text-green-600 mt-2">Access granted since: <span className="font-bold">{provisionedSince}</span></p>}
            </div>
          </div>

          {/* Info Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h3 className="font-bold text-gray-900 text-lg mb-4">What you can do with provisioning access:</h3>
            <ul className="space-y-3">
              {[
                "Upload new media files (image, video, audio)",
                "Manage existing media library",
                "Create and schedule central level campaigns",
                "View all uploaded media across stores"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-gray-700">
                  <span className="w-2 h-2 rounded-full bg-[#FF5722] shrink-0"></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Remove Provision */}
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-8">
            <h3 className="font-bold text-gray-900 mb-2">Remove provisioning access</h3>
            <p className="text-sm text-gray-500 mb-6">This will revoke your media upload and management permissions. The reseller will need to re-grant access.</p>
            <button
              onClick={handleRemove}
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3 bg-white border-2 border-red-400 text-red-500 rounded-xl font-bold hover:bg-red-50 transition-all disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              {saving ? "Removing..." : "Remove Provision"}
            </button>
          </div>
        </div>
      ) : (
        /* ---- NOT YET GRANTED STATE ---- */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">
          {/* Status Banner */}
          <div className="flex items-start gap-4 p-4 bg-orange-50 border border-orange-100 rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF5722" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            <div>
              <p className="text-sm font-bold text-orange-800">Access not yet granted</p>
              <p className="text-xs text-orange-600 mt-1">Your reseller has not yet granted media provisioning access. You can request it below.</p>
            </div>
          </div>

          {/* Request Access */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Do you want to provide media provisioning access?</h3>
            <p className="text-sm text-gray-500 mb-6">This allows the platform vendor to upload and manage media playlist and announcement playlist.</p>
            <button
              onClick={() => setWantsAccess(!wantsAccess)}
              className={`px-8 py-2 rounded-lg font-bold text-sm border transition-colors ${wantsAccess ? 'bg-[#FF5722] text-white border-[#FF5722]' : 'bg-white text-[#FF5722] border-[#FF5722] hover:bg-orange-50'}`}
            >
              Yes
            </button>
          </div>

          {/* Date Pickers */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-4">Confirm start and end date for access provision</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Start Date</p>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full p-3 px-4 border border-gray-200 rounded-xl bg-gray-50 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5722]/50 cursor-pointer"
                />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">End Date</p>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  min={startDate || new Date().toISOString().split("T")[0]}
                  className="w-full p-3 px-4 border border-gray-200 rounded-xl bg-gray-50 text-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5722]/50 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex items-center gap-2 px-8 py-3 bg-[#FF5722] hover:bg-[#F4511E] disabled:bg-gray-300 text-white rounded-xl font-bold transition-all shadow-md shadow-[#FF5722]/20 disabled:shadow-none"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
            {saving ? "Confirming..." : "Confirm Provisioning"}
          </button>
        </div>
      )}
    </div>
  );
};

const ProfileView = ({ userData }: { userData?: any }) => {
  const userName = userData?.operatorName || userData?.username || "Unknown User";
  const initial = userName.charAt(0).toUpperCase();
  const email = userData?.email || "-";
  const phone = userData?.phone || "-";
  const company = userData?.companyName || "-";
  const location = userData?.location || "-";
  const roleName = userData?.role === "account_marketing" ? "Account marketing" : (userData?.role || "Unknown Role");
  
  const lastLogin = userData?.updatedAt || userData?.createdAt ? new Date(userData.updatedAt || userData.createdAt).toLocaleString() : "-";
  const accountCreated = userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : "-";
  const sessions = userData?.sessions || "-";

  return (
    <div className="pb-12 max-w-[1200px] mx-auto">
      <h1 className="text-3xl font-bold text-[#0E3B43] mb-1">Profile</h1>
      <p className="text-sm text-gray-500 mb-8">Manage your account information and settings</p>

      {/* Top Banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="h-32 bg-[#0E3B43] w-full"></div>
        <div className="px-8 pb-8 relative">
          <div className="absolute -top-12 border-4 border-white rounded-2xl w-24 h-24 bg-[#FF5722] text-white flex items-center justify-center text-4xl font-bold shadow-md">
            {initial}
          </div>
          <div className="pt-16">
            <h2 className="text-2xl font-bold text-gray-900">{userName}</h2>
            <p className="text-gray-500 text-sm">{email}</p>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Personal Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-500">
              <User size={20} />
            </div>
            <h3 className="font-bold text-[#0E3B43]">Personal Information</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">Full Name</p>
              <p className="text-sm font-bold text-gray-900">{userName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">Phone number</p>
              <p className="text-sm font-bold text-gray-900">{phone}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">Email Address</p>
              <p className="text-sm font-bold text-gray-900">{email}</p>
            </div>
          </div>
        </div>

        {/* Access Level */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-500">
              <Shield size={20} />
            </div>
            <h3 className="font-bold text-[#0E3B43]">Access Level</h3>
          </div>
          <div className="space-y-5">
            <div>
              <p className="text-xs text-gray-400 font-medium mb-2">Role</p>
              <span className="inline-block px-3 py-1 bg-teal-50 text-teal-600 rounded-full text-xs font-bold">{roleName}</span>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">Description</p>
              <p className="text-sm font-medium text-gray-700 leading-relaxed pr-8">
                Manage customer accounts - Create account users, map devices to accounts
              </p>
            </div>
          </div>
        </div>

        {/* Organization */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-500">
              <Building size={20} />
            </div>
            <h3 className="font-bold text-[#0E3B43]">Organization</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">Company Name</p>
              <p className="text-sm font-bold text-gray-900">{company}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">Location</p>
              <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5"><MapPin size={14} className="text-gray-400"/> {location}</p>
            </div>
          </div>
        </div>

        {/* Account Activity */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-500">
              <Clock size={20} />
            </div>
            <h3 className="font-bold text-[#0E3B43]">Account Activity</h3>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">Last Login</p>
              <p className="text-sm font-bold text-gray-900">{lastLogin}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">Account Created</p>
              <p className="text-sm font-bold text-gray-900">{accountCreated}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">Total Sessions</p>
              <p className="text-sm font-bold text-gray-900">{sessions}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Permissions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6">
        <h3 className="font-bold text-[#0E3B43] mb-6 text-lg">Your Permissions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00BCD4] mt-1.5 shrink-0"></div>
            <p className="text-sm font-medium text-gray-700">View all store level campaigns</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00BCD4] mt-1.5 shrink-0"></div>
            <p className="text-sm font-medium text-gray-700">View All Central Campaigns</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00BCD4] mt-1.5 shrink-0"></div>
            <p className="text-sm font-medium text-gray-700">Upload & view media (Image, Video, Audio)</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00BCD4] mt-1.5 shrink-0"></div>
            <p className="text-sm font-medium text-gray-700">Schedule, Create & View Playlists (Including Quick Playlists)</p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00BCD4] mt-1.5 shrink-0"></div>
            <p className="text-sm font-medium text-gray-700">Schedule, Create, & View Announcements (Including Instant Announcements)</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button className="px-8 py-3 bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-xl font-bold transition-all shadow-md shadow-[#FF5722]/20">
          Edit Profile
        </button>
        <button className="px-8 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors">
          Change Password
        </button>
      </div>

    </div>
  );
};

export default function AccountMarketingDashboard() {
  const router = useRouter();
  const [expandedMenu, setExpandedMenu] = useState<string>("");
  const [activeView, setActiveView] = useState("dashboard"); // Default
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const role = typeof window !== "undefined" ? localStorage.getItem("userRole") : null;
    if (role && role !== "account_marketing" && role !== "account_admin") {
      router.push("/login");
      return;
    }

    const fetchUser = async () => {
      const id = localStorage.getItem("userId");
      if (!id) return;
      try {
        const res = await fetch(`/api/user?userId=${id}`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          setUserData(data.data[0]);
        }
      } catch (err) {
        console.error("Failed to fetch user", err);
      }
    };
    fetchUser();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    toast.success("Logged out successfully!");
    router.push("/login");
  };

  const userName = userData?.operatorName || userData?.username || "Bastien Morel";
  const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const sidebarLinks = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { 
      id: "store_campaigns", 
      label: "Store level campaigns", 
      icon: Store,
      subItems: [
        { id: "view_store_campaigns", label: "View store campaigns", icon: ListIcon }
      ]
    },
    { 
      id: "central_campaigns", 
      label: "central level campaigns", 
      icon: Megaphone,
      subItems: [
        { id: "create_central_campaign", label: "Create new central campaign", icon: Plus },
        { id: "view_central_campaigns", label: "View central level campaigns", icon: ListIcon }
      ]
    },
    { id: "media_provisioning", label: "Media provisioning", icon: ImageIcon },
    { id: "profile", label: "Profile", icon: User },
    { id: "support", label: "Support", icon: HeadphonesIcon },
  ];

  const handleMenuClick = (linkId: string, hasSubItems: boolean) => {
    if (linkId === "support") {
      window.location.href = "mailto:support@centelon.com";
      return;
    }
    if (hasSubItems) {
      setExpandedMenu(expandedMenu === linkId ? "" : linkId);
    } else {
      setActiveView(linkId);
      setExpandedMenu("");
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case "dashboard": return <DashboardView setActiveView={setActiveView} userData={userData} />;
      case "view_store_campaigns": return <ViewStoreCampaignsView userData={userData} />;
      case "create_central_campaign": return <CreateCentralCampaignMenuView setActiveView={setActiveView} />;
      case "create_central_campaign_form": return <CreateCentralCampaignFormView userData={userData} editData={editingCampaign} setActiveView={setActiveView} setEditingCampaign={setEditingCampaign} />;
      case "view_central_campaigns": return <ViewCentralCampaignsView setActiveView={setActiveView} setEditingCampaign={setEditingCampaign} />;
      case "view_playlist": return <ViewPlaylistView />;
      case "create_instant_playlist": return <CreateInstantPlaylistView />;
      case "create_announcement": return <CreateAnnouncementView userData={userData} setActiveView={setActiveView} />;
      case "media_provisioning": return <MediaProvisioningView />;
      case "profile": return <ProfileView userData={userData} />;
      default: return <div className="text-gray-500 font-medium">This module is under development.</div>;
    }
  };

  return (
    <div className="flex h-screen bg-[#EBF5F6] font-sans overflow-hidden">
      <Toaster position="top-right" />
      {/* Sidebar */}
      <aside className="w-[260px] bg-[#122A30] flex flex-col h-full text-white/80 shrink-0 shadow-xl z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00BCD4] flex items-center justify-center shrink-0 text-white shadow-md">
            <MonitorSmartphone size={24} />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">DeviceHub</h1>
            <p className="text-[#00BCD4] text-[10px]">Account marketing user</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {sidebarLinks.map((link) => {
             const isExpanded = expandedMenu === link.id;
             const isDirectlyActive = activeView === link.id;
             const isParentOfActive = link.subItems?.some(sub => sub.id === activeView);
             
             return (
               <div key={link.id} className="mb-1">
                 <button
                   onClick={() => handleMenuClick(link.id, !!link.subItems)}
                   className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 ${
                     isDirectlyActive
                       ? "bg-[#FF5722] text-white shadow-lg shadow-[#FF5722]/20"
                       : "hover:bg-white/5 text-white/70 hover:text-white"
                   }`}
                 >
                   <div className="flex items-center gap-3">
                     <link.icon size={20} className={(isDirectlyActive || isParentOfActive) && !isDirectlyActive ? "text-[#00BCD4]" : (isDirectlyActive ? "text-white" : "text-[#00BCD4]")} />
                     <span className="text-sm font-medium pr-2">{link.label}</span>
                   </div>
                   {link.subItems && (
                     <ChevronDown size={16} className={`opacity-60 transition-transform ${isExpanded ? "rotate-180" : ""} ${isDirectlyActive ? "text-white" : ""}`} />
                   )}
                 </button>

                 {/* Expanded Sub-items */}
                 {link.subItems && isExpanded && (
                   <div className="mt-2 space-y-1 ml-4 pl-4 border-l border-white/10">
                     {link.subItems.map(subItem => (
                       <button
                         key={subItem.id}
                         onClick={() => setActiveView(subItem.id)}
                         className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                           activeView === subItem.id
                             ? "bg-[#FF5722] text-white shadow-sm"
                             : "text-white/60 hover:text-white hover:bg-white/5"
                         }`}
                       >
                         {activeView === subItem.id ? <subItem.icon size={16} className="text-white opacity-100 shrink-0" /> : <ListIcon size={16} className="opacity-60 shrink-0"/>}
                         <span className="truncate text-left">{subItem.label}</span>
                       </button>
                     ))}
                   </div>
                 )}
               </div>
             );
          })}

          <div className="mt-4 pt-4 border-t border-white/10">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 hover:bg-white/5 text-white/70 hover:text-white">
              <LogOut size={20} className="text-[#00BCD4]" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </nav>

        <div className="p-6 mt-auto border-t border-white/5">
          <div className="bg-[#18363D] rounded-xl p-4">
            <p className="text-white/40 text-[10px] mb-1">Platform Version</p>
            <p className="text-white font-bold text-sm">v2.4.1</p>
            <div className="h-px bg-white/10 my-3 w-full"></div>
            <p className="text-white/40 text-[10px]">
              Last login: {userData?.updatedAt || userData?.createdAt ? new Date(userData.updatedAt || userData.createdAt).toLocaleString() : "Just now"}
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-[72px] bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0 z-10 shadow-sm relative z-30">
          <div className="w-[500px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search devices, stores, media..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 transition-all font-medium"
            />
          </div>
          
          <div className="flex items-center gap-6">
            <button className="relative p-2 text-gray-500 hover:text-gray-900 transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            
            <div className="flex items-center gap-3 border-l border-gray-100 pl-6 cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-[#00BCD4] text-white flex items-center justify-center font-bold shadow-md shadow-[#00BCD4]/20 uppercase">
                {initials}
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">{userName}</h3>
                <p className="text-[10px] font-bold text-gray-500 tracking-wider">Account marketing user</p>
              </div>
              <ChevronDown size={14} className="text-gray-400 ml-2" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 content-scrollbar bg-[#EBF5F6]">
          <div className="max-w-[1200px] mx-auto">
             {renderContent()}
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .content-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .content-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .content-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
