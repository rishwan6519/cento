"use client";
import React, { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

// Icons
import { 
  HiOutlineChevronDown, 
  HiOutlineChevronRight, 
  HiOutlineLogout, 
  HiOutlineMenuAlt2, 
  HiOutlineSearch, 
  HiOutlineBell 
} from "react-icons/hi";
import { 
  FaRobot, 
  FaRegFileAudio, 
  FaListAlt, 
  FaPlug, 
  FaMobileAlt, 
  FaUser, 
  FaChevronRight, 
  FaTachometerAlt,
  FaMobile,
  FaStore,
  FaUpload,
  FaVideo,
  FaMusic
} from "react-icons/fa";
import { RiDashboardLine } from "react-icons/ri";
import { BsMusicNoteList } from "react-icons/bs";
import { IoMdSettings } from "react-icons/io";
import { MdOutlinePlaylistPlay } from "react-icons/md";
import { FaRegFileImage } from "react-icons/fa6";

// Components
import Button from "@/components/Platform/Button";
import Card from "@/components/Platform/Card";
import DashboardView from "@/components/Platform/views/DashboardView";
import ManageDevicesView from "@/components/Platform/views/ManageDevicesView";
import ConnectedPlaylistsView from "@/components/Platform/modals/ConnectedPlaylistsView";
import AddPlaylistModal from "@/components/Platform/modals/AddPlaylistModal";
import PlaylistManager from "@/components/ShowPlaylist/showPlaylist";
import PlaylistSetup from "@/components/PlaylistSetup/PlaylistSetup";
import CreateMedia from "@/components/CreateMedia/createMedia";
import ShowMedia from "@/components/ShowMedia/showMedia";
import ConnectPlaylist from "@/components/ConnectPlaylist/connectPlaylist";
import OnboardingPage from "@/components/onboardDevice/onboardDevice";
import CreateUser from "@/components/CreateUser/CreateUser";
import LoadingState from "@/components/Platform/LoadingState";
import ShowUsers from "@/components/ShowUsers/ShowUsers";
import AssignDevice from "@/components/AssignDevice/AssignDevice";
import Announcement from "@/components/Announcement/Announcement";
import CreateAnnouncement from "@/components/CreateAnnouncement/CreateAnnouncement";
import ShowAnnouncement from "@/components/Announcement/ShowAnnouncement";
import InstantaneousAnnouncement from "@/components/InstantaneousAnnouncement/InstantaneousAnnouncement";
import AssignApiKey from "@/components/AssignApiKey/AssignApiKey";

import StoreManagement from "@/components/StoreManagement/StoreManagement";
import AccountSettings from "@/components/AccountSettings/AccountSettings";
import ViewGroups from "@/components/ViewGroups/ViewGroups";
import CreateImage from "@/components/UploadImage/UploadImage";
import CreateAudio from "@/components/UploadAudio/UploadAudio";
import CreateSlider from "@/components/CreatSlider/CreateSlider";
import SliderManager from "@/components/showSlider/showSlider";
import AssignSlider from "@/components/AssignSlider/AssignSlider";

// Types
import { 
  Device, 
  Playlist, 
  MenuKey, 
  MenuItem,
  DeviceFormData, 
  DeviceReference 
} from "@/components/Platform/types";

// --- Constants ---
const menuSections: { title: string; items: MenuItem[] }[] = [
  {
    title: "General",
    items: [
      { key: "storeManagement", label: "Stores", icon: <FaStore /> },
      { key: "dashboard", label: "All Devices", icon: <RiDashboardLine /> },
      { key: "accountSettings", label: "Account Settings", icon: <IoMdSettings /> },
    ],
  },
  {
    title: "Devices",
    items: [
      { key: "onboardDevice", label: "Onboard Device", icon: <FaMobileAlt /> },
      { key: "assignDevice", label: "Connect Device", icon: <FaRobot /> },
      { key: "assignApi", label: "API Key", icon: <IoMdSettings /> },
    ],
  },
  {
    title: "Media",
    items: [
      { key: "uploadImage", label: "Upload Image", icon: <FaUpload /> },
      { key: "showMedia", label: "All Media", icon: <FaRegFileAudio /> },
      { key: "setupPlaylist", label: "Create Playlist", icon: <FaListAlt /> },
      { key: "showPlaylist", label: "Show Playlist", icon: <MdOutlinePlaylistPlay /> },
      { key: "viewGroups", label: "Quick Playlist", icon: <RiDashboardLine /> },
      { key: "connectPlaylist", label: "Connect Playlist", icon: <FaPlug /> },
    ],
  },
  {
    title: "Announcement",
    items: [
      { key: "createAnnouncement", label: "Create Announcement", icon: <IoMdSettings /> },
      { key: "setupAnnouncement", label: "Connect Announcements", icon: <IoMdSettings /> },
      { key: "showAnnouncement", label: "View All", icon: <IoMdSettings /> },
      { key: "instantAnnouncement", label: "Quick Send", icon: <IoMdSettings /> },
    ]
  },
  {
    title: "Slider",
    items: [
      { key: "createSlider", label: "Create Slider", icon: <FaRegFileImage /> },
      { key: "showSlider", label: "All Sliders", icon: <FaRegFileImage /> },
      { key: "assignSlider", label: "Connect Slider", icon: <FaPlug /> },
    ],
  },
  {
    title: "Store Management",
    items: [
      { key: "createUser", label: "Create Store", icon: <FaStore /> },
      { key: "showUser", label: "Show Stores", icon: <FaStore /> },
    ],
  },
];

export default function RoboticPlatform(): React.ReactElement {
  // --- State Management (Fully Restored) ---
  const [selectedMenu, setSelectedMenu] = useState<MenuKey>("dashboard");
  const [devices, setDevices] = useState<Device[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [devicePlaylists, setDevicePlaylists] = useState<any[]>([]);
  const [deviceAnnouncements, setDeviceAnnouncements] = useState<any[]>([]);
  const [showOnboardModal, setShowOnboardModal] = useState<boolean>(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState<boolean>(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [menuExpanded, setMenuExpanded] = useState<Record<string, boolean>>({
    devices: false,
    media: true,
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSlider, setEditingSlider] = useState<any>(null);


  const fetchDevices = async () => {
    try {
      setIsLoading(true);
      const userId = localStorage.getItem("userId");
      if (!userId) {
        setError("Please log in to view devices");
        return;
      }

      const response = await fetch(`/api/onboarded-devices?userId=${userId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch devices");
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setDevices(
          data.data.map((device: any) => ({
            ...device,
            lastActive: new Date(device.updatedAt).toLocaleString(),
            status: device.deviceId.status === "active" ? "Connected" : "Disconnected",
          }))
        );
      } else {
        throw new Error("Invalid data format received from server");
      }
    } catch (err) {
      console.error("Error fetching devices:", err);
      setError(err instanceof Error ? err.message : "Failed to load devices");
      setDevices([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchPlaylists = async () => {
    try {
      const userId = localStorage.getItem("userId");
      if (userId) {
        // Fetch ALL global playlists mapped to devices (don't limit by userId since we are on the superUser platform)
        const response = await fetch(`/api/device-playlists`);
        if (response.ok) {
          const data = await response.json();
          setDevicePlaylists(data);
        }
      }
    } catch (err) {
      console.error("Error fetching playlists:", err);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const response = await fetch('/api/announcement/all-connections');
      const data = await response.json();
      if (data.success) {
        setDeviceAnnouncements(data.data);
      }
    } catch (err) {
      console.error("Error fetching announcements:", err);
    }
  };

  // --- Auth & Initial Fetch (Fully Restored) ---
  useEffect(() => {
    const userRole = localStorage.getItem("userRole");
    if (userRole === "superUser") {
      toast.success("Welcome Super User!", {
        style: { background: "#1e293b", color: "#fff" },
        duration: 2000,
      });
    } else {
      toast.error("You are not authorized to access this page.");
      window.location.href = "/login";
    }

    fetchDevices();
    fetchPlaylists();
    fetchAnnouncements();

    (window as any).refreshPlatformData = () => {
      fetchDevices();
      fetchPlaylists();
      fetchAnnouncements();
    };
  }, []);

  // --- Derived Data ---
  const devicesWithPlaylistInfo = useMemo(() => 
    devices.map((device) => {
      const regularConnected = devicePlaylists
        .filter((p) => p.deviceIds && p.deviceIds.includes(device.deviceId._id.toString()))
        .map((p) => ({
          id: p.playlistData._id,
          name: p.playlistData.name || "Unnamed Playlist",
          status: "active",
          files: p.playlistData.files || [],
          type: 'regular'
        }));

      const announcementConnected = deviceAnnouncements
        .filter((conn) => conn.deviceId.toString() === device.deviceId._id.toString())
        .flatMap((conn) => (conn.announcementPlaylistIds || []).map((ap: any) => ({
            id: ap._id,
            name: ap.name || "Announcement Playlist",
            status: "active",
            files: [], // Announcement playlists might not have top-level files in the same structure
            type: 'announcement'
          })));

      return {
        ...device,
        connectedPlaylists: [...regularConnected, ...announcementConnected],
      };
    }), [devices, devicePlaylists, deviceAnnouncements]);

  // --- Handlers (Fully Restored) ---
  const toggleMenuExpansion = (menuSection: string) => {
    setMenuExpanded((prev) => ({ ...prev, [menuSection]: !prev[menuSection] }));
  };

  const addNewDevice = async (deviceData: DeviceFormData): Promise<void> => {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) throw new Error("User ID not found");

      const response = await fetch("/api/onboarded-devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...deviceData, userId, status: "active" }),
      });

      if (!response.ok) throw new Error("Failed to add device");

      const data = await response.json();
      if (data.success) {
        const newDevice = {
          ...data.data,
          batteryLevel: "100%",
          location: "Not specified",
          lastActive: "Just now",
          status: "Connected",
          connectedPlaylists: [],
        };
        setDevices([...devices, newDevice]);
        setShowOnboardModal(false);
        toast.success("Device onboarded successfully");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add device");
    }
  };

  const addNewPlaylist = (name: string): void => {
    const newPlaylist: Playlist = {
      id: String(Date.now()),
      name,
      type: "default",
      contentType: "audio",
      startTime: "",
      endTime: "",
      files: [],
      deviceIds: [],
      status: "active",
      createdAt: new Date(),
    };
    setPlaylists([...playlists, newPlaylist]);
    setShowPlaylistModal(false);
    toast.success("Playlist created");
  };

  const connectPlaylist = (playlistId: string, deviceId: string): void => {
    const deviceToConnect = devices.find((d) => d._id === deviceId);
    if (!deviceToConnect) return;

    const deviceReference: DeviceReference = { id: deviceId, name: deviceToConnect.name };

    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === playlistId ? { ...p, deviceIds: [...p.deviceIds, deviceReference] } : p
      )
    );
    toast.success("Playlist connected to device");
  };

  const unlinkPlaylist = async (deviceId: string, playlistId: string, type: 'regular' | 'announcement') => {
    try {
      let url = '';
      if (type === 'regular') {
        url = `/api/device-playlists?deviceId=${deviceId}&playlistId=${playlistId}`;
      } else {
        url = `/api/announcement/device-announcement?deviceId=${deviceId}&announcementPlaylistId=${playlistId}`;
      }

      const response = await fetch(url, { method: 'DELETE' });
      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Disconnected successfully");
        fetchPlaylists();
        fetchAnnouncements();
      } else {
        toast.error(data.error || "Failed to disconnect");
      }
    } catch (err) {
      console.error("Error unlinking:", err);
      toast.error("An error occurred");
    }
  };

  const handleEditDevice = async (device: Device): Promise<void> => {
    try {
      const newStatus = device.status === "Connected" ? "Disconnected" : "Connected";
      const apiStatus = newStatus === "Connected" ? "active" : "inactive";

      const response = await fetch(`/api/onboarded-devices/${device._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: apiStatus }),
      });

      if (!response.ok) throw new Error("Failed to update device");

      const data = await response.json();
      if (data.success) {
        setDevices(
          devices.map((d) =>
            d._id === device._id
              ? { ...d, status: newStatus, lastActive: new Date().toLocaleString() }
              : d
          )
        );
        toast.success(`Device ${newStatus}`);
      }
    } catch (err) {
      toast.error("Failed to update device");
    }
  };

  const handleManagePlaylists = (device: Device): void => {
    setSelectedDevice(device);
    setSelectedMenu("connectedPlaylists");
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // Helper to find label for Breadcrumbs
  const getActiveLabel = () => {
    for (const section of menuSections) {
      for (const item of section.items) {
        if (item.key === selectedMenu) return item.label;
        if (item.subItems) {
          const sub = item.subItems.find(s => s.key === selectedMenu);
          if (sub) return sub.label;
        }
      }
    }
    return "Platform";
  };

  // --- Render Content Switch Case (Full restoration) ---
  const renderContent = (): React.ReactElement => {
    if (isLoading) return <LoadingState />;

    if (error) {
      return (
        <Card className="flex flex-col items-center justify-center py-16 text-center border-none shadow-xl bg-white/80 backdrop-blur-md">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Error Loading Data</h3>
          <p className="text-slate-500 max-w-md mb-8">{error}</p>
          <Button variant="primary" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </Card>
      );
    }

    switch (selectedMenu) {
      case "createSlider":
        return <CreateSlider editingSlider={editingSlider} onCancel={() => { setEditingSlider(null); setSelectedMenu("showSlider"); }} onSuccess={() => { setEditingSlider(null); setSelectedMenu("showSlider"); }} />;
      case "showSlider":
        return <SliderManager onEdit={(slider) => { setEditingSlider(slider); setSelectedMenu("createSlider"); }} />;
      case "assignSlider":
        return <AssignSlider onSuccess={() => setSelectedMenu("dashboard")} />;
      case "dashboard":
        return (
          <DashboardView
            devices={devicesWithPlaylistInfo as any}
            setDevices={setDevices}
            onAddNew={() => setSelectedMenu("onboardDevice")}
            onEditDevice={handleEditDevice}
            onManagePlaylists={handleManagePlaylists}
            onUnlinkPlaylist={unlinkPlaylist}
            userRole={localStorage.getItem("userRole") || undefined}
          />
        );
      case "storeManagement":
        return (
          <StoreManagement
            onNavigate={(menu) => setSelectedMenu(menu as MenuKey)}
          />
        );
      case "onboardDevice":
        return <OnboardingPage onSuccess={() => setSelectedMenu("dashboard")} />;
      case "connectedPlaylists":
        return (
          <ConnectedPlaylistsView
            devices={devicesWithPlaylistInfo}
            playlists={playlists}
            selectedDevice={selectedDevice}
            onAddNewPlaylist={() => setShowPlaylistModal(true)}
            onConnectPlaylist={connectPlaylist}
            onBackToDevices={() => {
              setSelectedDevice(null);
              setSelectedMenu("dashboard");
            }}
          />
        );
      case "setupPlaylist":
        return <PlaylistSetup onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("showPlaylist")} />;
      case "setupAnnouncement":
        return <Announcement />;
      case "createAnnouncement":
        return <CreateAnnouncement onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("setupAnnouncement")} />;
      case "showAnnouncement":
        return <ShowAnnouncement onCancel={() => setSelectedMenu("dashboard")} />;
      case "instantAnnouncement":
        return <InstantaneousAnnouncement onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("dashboard")} />;
      case "assignDevice":
        return (
          <AssignDevice 
            onSuccess={() => {
              if ((window as any).refreshPlatformData) (window as any).refreshPlatformData();
              setSelectedMenu("dashboard");
            }} 
          />
        );
      case "assignApi":
        return <AssignApiKey />;
      case "showUser":
        return <ShowUsers />;
      case "showPlaylist":
        return <PlaylistManager />;

      case "createMedia":
      case "uploadVideo":
      case "uploadImage":
        return <CreateImage onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => { fetchPlaylists(); fetchAnnouncements(); setSelectedMenu("showMedia"); }} />;
      case "uploadAudio":
        return <CreateAudio onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => { fetchPlaylists(); fetchAnnouncements(); setSelectedMenu("showMedia"); }} />;
      case "showMedia":
        return <ShowMedia />;
      case "connectPlaylist":
        return <ConnectPlaylist onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => { fetchPlaylists(); fetchAnnouncements(); setSelectedMenu("showPlaylist"); }} />;
      case "viewGroups":
        return <ViewGroups />;
      case "createUser":
        return <CreateUser />;
      case "accountSettings":
        return <AccountSettings />;
      default:
        return (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
             <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                <FaRobot size={32} />
             </div>
             <p className="text-slate-500 font-medium">Please select a menu item to continue.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">

      {/* --- SIDEBAR --- */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 will-change-transform
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ transform: "translateZ(0)" }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-8 flex items-center justify-between">
            <div 
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setSelectedMenu("dashboard")}
            >
              <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
                <FaRobot className="text-white text-2xl" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">System</span>
            </div>
            <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
              <HiOutlineMenuAlt2 size={24} />
            </button>
          </div>

          {/* Nav Links */}
          <nav className="flex-1 px-4 overflow-y-auto space-y-8 scrollbar-hide pb-10">
            {menuSections.map((section) => (
              <div key={section.title}>
                <h5 className="px-4 text-[11px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-3">
                  {section.title}
                </h5>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = selectedMenu === item.key || item.subItems?.some(s => s.key === selectedMenu);
                    
                    return (
                      <div key={item.key}>
                        <button
                          onClick={() => item.subItems ? toggleMenuExpansion(item.key) : (setSelectedMenu(item.key), setIsMobileMenuOpen(false))}
                          className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group
                          ${isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "hover:bg-slate-800 hover:text-white"}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`${isActive ? "text-white" : "text-slate-500 group-hover:text-indigo-400"} transition-colors`}>
                              {item.icon}
                            </span>
                            <span className="font-medium text-[14px]">{item.label}</span>
                          </div>
                          {item.subItems && (
                            <HiOutlineChevronDown className={`transition-transform duration-200 ${menuExpanded[item.key] ? "rotate-180" : ""}`} />
                          )}
                        </button>
                        
                        {/* Nested Items */}
                        <AnimatePresence>
                          {item.subItems && menuExpanded[item.key] && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden mt-1 ml-4 pl-4 border-l border-slate-800 space-y-1"
                            >
                              {item.subItems.map(sub => (
                                <button
                                  key={sub.key}
                                  onClick={() => { setSelectedMenu(sub.key); setIsMobileMenuOpen(false); }}
                                  className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors 
                                  ${selectedMenu === sub.key ? "text-indigo-400 font-semibold" : "text-slate-500 hover:text-slate-300"}`}
                                >
                                  {sub.label}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Device Stats Visualizer */}
            <div className="px-4 mt-6">
               <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-slate-400 font-medium">Active Devices</span>
                    <span className="text-xs text-indigo-400 font-bold">
                      {devices.filter(d => d.status === "Connected").length}/{devices.length}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(devices.filter(d => d.status === "Connected").length / (devices.length || 1)) * 100}%` }}
                      className="h-full bg-indigo-500"
                    />
                  </div>
               </div>
            </div>
          </nav>

          {/* Logout Section */}
          <div className="p-4 border-t border-slate-800">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all duration-200 group"
            >
              <HiOutlineLogout className="text-lg group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-sm">Sign Out System</span>
            </button>
          </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-6 md:px-10 z-40 sticky top-0">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors" onClick={() => setIsMobileMenuOpen(true)}>
              <HiOutlineMenuAlt2 size={24} />
            </button>
            <div 
              className="hidden md:flex items-center gap-3 text-sm font-medium cursor-pointer hover:opacity-70 transition-opacity"
              onClick={() => setSelectedMenu("dashboard")}
            >
              <span className="text-slate-400">Platform</span>
              <FaChevronRight size={10} className="text-slate-300" />
              {selectedMenu !== "dashboard" && selectedMenu !== "storeManagement" ? (
                <button 
                  onClick={() => setSelectedMenu("dashboard")}
                  className="flex items-center gap-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-1.5 rounded-full transition-all group"
                >
                  <RiDashboardLine size={14} className="group-hover:scale-110 transition-transform" />
                  <span className="uppercase text-[11px] font-bold tracking-wider">Back to Dashboard</span>
                </button>
              ) : (
                <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase text-[11px] font-bold tracking-wider">
                  {getActiveLabel()}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-bold text-slate-800 leading-none">Super User</p>
                <p className="text-[11px] text-slate-500 mt-1 uppercase font-bold tracking-tighter">Administrator</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 overflow-hidden font-bold">
                SU
              </div>
            </div>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto">
            {/* Page Title & Intro */}
            <div className="mb-10">
                <motion.h1 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight"
                >
                  {getActiveLabel()}
                </motion.h1>
                <motion.p 
                   initial={{ opacity: 0, x: -20 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: 0.1 }}
                   className="text-slate-500 mt-2 font-medium"
                >
                  Configure and monitor your automated robotics network.
                </motion.p>
            </div>

            {/* View Switching Logic with Animations */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedMenu}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* --- GLOBAL MODALS (Restored) --- */}
      <AnimatePresence>
        {showPlaylistModal && (
          <AddPlaylistModal
            onClose={() => setShowPlaylistModal(false)}
            onSave={addNewPlaylist}
          />
        )}
      </AnimatePresence>

      <style jsx global>{`
        body {
          scrollbar-gutter: stable;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
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