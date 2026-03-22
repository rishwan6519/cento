"use client";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  PlusCircle,
  Database,
  XCircle,
  Trash2,
  Edit,
  Menu,
  Users,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { FcDataConfiguration } from "react-icons/fc";

import GptAiComponent from "@/components/GptAiComponent/GptAiComponent";
import AddDeviceType from "@/components/AddDeviceTypes/addDeviceTypes";
import AddDevice from "@/components/AddDevice/addDevice";
import UserManagement from "@/components/UseManagement/UserManagement";
import ShowDevices from "@/components/ShowDevices/ShowDevices";
import ManageDeviceTypes from "@/components/ManageDeviceTypes/ManageDeviceTypes";
import CreateSlider from "@/components/CreatSlider/CreateSlider";
import SliderManager from "@/components/showSlider/showSlider";
import CreateImage from "@/components/UploadImage/UploadImage";
import ShowMedia from "@/components/ShowMedia/showMedia";
import AssignDevice from "@/components/AssignDevice/AssignDevice";
import { ImageIcon, Film, Upload } from "lucide-react";

interface DeviceType {
  id: string;
  name: string;
  type: "robot" | "other";
  description?: string;
  imageUrl?: string;
}

interface Device {
  _id: string;
  name: string;
  imageUrl?: string;
  typeId: string;
  serialNumber?: string;
  color?: string;
  description?: string;
  features?: string[];
  handMovements?: string[];
}

import { useRouter } from "next/navigation";

export default function RobotAdminDashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [activeSection, setActiveSection] = useState<string>("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [usersCount, setUsersCount] = useState<number>(0);
  const [editingDeviceType, setEditingDeviceType] = useState<any>(null);
  const [editingSlider, setEditingSlider] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Authentication Check
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("userRole");
    
    if (!token || role !== "admin") {
      toast.error("Unauthorized access. Please login first.");
      router.push("/admin/login");
      return;
    }
  }, [router]);

  useEffect(() => {
    if (!activeSection) {
      fetchDeviceTypes();
      fetchDevices();
      fetchUsersCount();
    }
  }, [activeSection]);

  const fetchUsersCount = async () => {
    try {
      const controllerId = localStorage.getItem("userId");
      const url = controllerId 
        ? `/api/user?controllerId=${controllerId}`
        : `/api/user`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      if (data.success) {
        // Filter for superUsers only
        const count = data.data.filter((u: any) => u.role === 'superUser').length;
        setUsersCount(count);
      }
    } catch (error) {
      console.error("Error fetching users count:", error);
    }
  };

  const fetchDevices = async () => {
    try {
      const response = await fetch("/api/devices");
      if (!response.ok)
        throw new Error(`Failed to fetch devices: ${response.status}`);
      const data = await response.json();

      setDevices(data);
      console.log(data, "devices data");
    } catch (error) {
      console.error("Error fetching devices:", error);
      toast.error("Error fetching devices!");
    }
  };

  const fetchDeviceTypes = async () => {
    try {
      const response = await fetch("/api/device-types");
      if (!response.ok) throw new Error(`Failed to fetch device types`);
      const data = await response.json();
      setDeviceTypes(data);
      console.log(data, "device types data");
    } catch (error) {
      console.error("Error fetching device types:", error);
      toast.error("Error fetching device types!");
    }
  };

  const sidebarItems = [
    {
      category: "Navigation",
      items: [
        {
          id: "",
          label: "Dashboard",
          icon: <LayoutDashboard size={20} className="text-cyan-400" />,
          description: "System overview and statistics",
        },
      ],
    },
    {
      category: "Device Management",
      items: [
        {
          id: "addDevice",
          label: "Add Device",
          icon: <PlusCircle size={20} className="text-emerald-500" />,
          description: "Register a new device in the system",
        },
        {
          id: "manageDeviceTypes",
          label: "Device Types",
          icon: <Database size={20} className="text-indigo-500" />,
          description: "Manage device categories and types",
        }, // Add this to your sidebarItems array
        {
          id: "users",
          label: "User Management",
          icon: <Users size={20} className="text-violet-500" />,
        },
        {
          id: "showDevices",
          label: "View Devices",
          icon: <Database size={20} className="text-purple-500" />,
          description: "View all registered devices",
        },
        {
          id: "assignDevice",
          label: "Assign Device",
          icon: <Database size={20} className="text-pink-500" />,
          description: "Assign devices to Resellers",
        },
      ],
    },
    {
      category: "Media Management",
      items: [
        {
          id: "uploadMedia",
          label: "Upload Media",
          icon: <Upload size={20} className="text-orange-500" />,
          description: "Upload new media for sliders and content",
        },
        {
          id: "showMedia",
          label: "Media Library",
          icon: <Film size={20} className="text-purple-500" />,
          description: "View and manage uploaded media files",
        },
      ],
    },
    {
      category: "Slider Management",
      items: [
        {
          id: "createSlider",
          label: "Create Slider",
          icon: <ImageIcon size={20} className="text-emerald-500" />,
          description: "Create a new image slider group",
        },
        {
          id: "showSlider",
          label: "View Sliders",
          icon: <ImageIcon size={20} className="text-blue-500" />,
          description: "Manage existing slider groups",
        },
      ],
    },
  ];

  const handleLogout = () => {
    localStorage.clear();
    router.push("/admin/login");
  };

  return (
    <div className="flex h-screen bg-[#F1F5F9] text-slate-900 font-sans overflow-hidden">
      
      {/* Sidebar - Desktop */}
      <aside className={`
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 fixed md:relative z-40 w-72 h-full bg-[#07323C] text-white shadow-2xl transition-transform duration-300 ease-in-out flex flex-col
      `}>
        <div className="p-8 border-b border-teal-800 flex items-center gap-4">
          <div className="bg-gradient-to-br from-cyan-400 to-blue-500 p-2 rounded-xl shadow-lg shadow-cyan-500/20">
            <LayoutDashboard size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Multimedia Platform Admin</h1>
            <p className="text-[10px] text-teal-400 font-bold uppercase tracking-[0.2em]">Operational Console</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-8 overflow-y-auto space-y-8">
          {sidebarItems.map((category) => (
            <div key={category.category} className="space-y-3">
              <h3 className="px-4 text-[10px] font-bold text-teal-500 uppercase tracking-[0.15em]">
                {category.category}
              </h3>
              <div className="space-y-1">
                {category.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group
                      ${activeSection === item.id
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-blue-500/25"
                        : "text-teal-100/60 hover:bg-[#041C22] hover:text-white"
                      }
                    `}
                  >
                    <div className={`p-2 rounded-lg transition-colors ${
                      activeSection === item.id ? "bg-white/20" : "bg-teal-900/50 group-hover:bg-teal-800"
                    }`}>
                      {item.icon}
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-semibold tracking-wide">
                        {item.label}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-6 border-t border-teal-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all duration-300 font-bold text-sm"
          >
            <XCircle size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4 lg:hidden">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <Menu size={24} />
            </button>
            <h1 className="font-bold text-lg">Centor Admin</h1>
          </div>
          
          <div className="hidden lg:block">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              {activeSection ? activeSection.replace(/([A-Z])/g, ' $1').trim() : "Dashboard Overview"}
            </h2>
          </div>

          <div className="flex items-center gap-4">
             <div className="flex flex-col items-end mr-4">
                <span className="text-sm font-bold text-slate-900">System Admin</span>
                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">Master Mode</span>
             </div>
             <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden text-slate-400 flex items-center justify-center font-bold">
                A
             </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto">
            {!activeSection ? (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
                       Admin Dashboard
                    </h1>
                    <p className="text-slate-500 font-medium text-lg">
                      Real-time insights and system control at your fingertips.
                    </p>
                  </div>
                  <button 
                    onClick={() => setActiveSection("addDevice")}
                    className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-slate-900/20"
                  >
                    <PlusCircle size={20} />
                    Register New Device
                  </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-xl transition-all duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500" />
                    <div className="relative z-10">
                      <div className="w-14 h-14 bg-blue-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-6">
                        <Database size={28} />
                      </div>
                      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Total Devices</p>
                      <h3 className="text-4xl font-black text-slate-900">{devices.length}</h3>
                      <div className="mt-6 flex items-center gap-2 text-blue-600 font-bold text-sm cursor-pointer hover:underline" onClick={() => setActiveSection("showDevices")}>
                        Analyze fleet →
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-xl transition-all duration-500">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500" />
                    <div className="relative z-10">
                      <div className="w-14 h-14 bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6">
                        <Users size={28} />
                      </div>
                      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">Active Users</p>
                      <h3 className="text-4xl font-black text-slate-900">{usersCount}</h3>
                      <div className="mt-6 flex items-center gap-2 text-indigo-600 font-bold text-sm cursor-pointer hover:underline" onClick={() => setActiveSection("users")}>
                        Manage accounts →
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main View Split */}
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                  <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <h3 className="text-xl font-black text-slate-900">Fleet Overview</h3>
                    <button 
                      onClick={() => setActiveSection("showDevices")} 
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all font-bold text-xs"
                    >
                      <span>View More</span>
                      <Database size={16} />
                    </button>
                  </div>
                  <div className="p-4">
                    {devices.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {devices.slice(0, 4).map((device) => (
                           <div key={device._id} className="flex items-center gap-5 p-5 rounded-3xl bg-slate-50/50 hover:bg-white hover:shadow-md transition-all duration-300 border border-transparent hover:border-slate-100 group">
                              <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center p-2 group-hover:scale-110 transition-transform">
                                 <img src={device.imageUrl || "/placeholder.jpg"} className="w-full h-full object-contain" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-900 truncate">{device.name}</h4>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">{device.serialNumber || "No Serial"}</p>
                              </div>
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button 
                                    onClick={() => setActiveSection("showDevices")}
                                    className="p-2.5 bg-white text-slate-400 hover:text-blue-500 hover:shadow-sm rounded-xl border border-slate-100"
                                 >
                                    <Edit size={16} />
                                 </button>
                                 <button className="p-2.5 bg-white text-slate-400 hover:text-red-500 hover:shadow-sm rounded-xl border border-slate-100">
                                    <Trash2 size={16} />
                                 </button>
                              </div>
                           </div>
                         ))}
                      </div>
                    ) : (
                      <div className="py-20 flex flex-col items-center text-center">
                         <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300">
                            <Database size={40} />
                         </div>
                         <h4 className="font-bold text-slate-900 text-xl">No devices connected</h4>
                         <p className="text-slate-400 mt-2 max-w-xs">Start by registering your first device in the system.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full">
                <button 
                  onClick={() => setActiveSection("")}
                  className="mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold transition-colors"
                >
                  <LayoutDashboard size={20} />
                  Back to Dashboard
                </button>
                
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden h-full min-h-[600px]">
                   {activeSection === "manageDeviceTypes" && (
                    <ManageDeviceTypes 
                      onBack={() => setActiveSection("")} 
                      onEdit={(type) => {
                        setEditingDeviceType(type);
                        setActiveSection("editDeviceType");
                      }}
                      onAdd={() => {
                        setEditingDeviceType(null);
                        setActiveSection("addDeviceType");
                      }}
                    />
                  )}

                  {(activeSection === "addDeviceType" || activeSection === "editDeviceType") && (
                    <AddDeviceType
                      activeSection={activeSection}
                      initialData={editingDeviceType}
                      onCancel={() => setActiveSection("manageDeviceTypes")}
                      onSuccess={() => {
                        setActiveSection("manageDeviceTypes");
                        fetchDeviceTypes();
                      }}
                    />
                  )}

                  {activeSection === "addDevice" && (
                    <AddDevice
                      activeSection={activeSection}
                      deviceTypes={deviceTypes}
                      onCancel={() => setActiveSection("")}
                      onSuccess={() => {
                        fetchDevices();
                        setActiveSection("");
                      }}
                    />
                  )}

                  {activeSection === "showDevices" && (
                    <ShowDevices onBack={() => setActiveSection("")} />
                  )}

                  {activeSection === "assignDevice" && (
                    <AssignDevice onSuccess={() => setActiveSection("")} defaultAction="assign" />
                  )}

                  {activeSection === "users" && <UserManagement />}

                  {activeSection === "createSlider" && (
                    <CreateSlider
                      editingSlider={editingSlider}
                      onCancel={() => {
                        setEditingSlider(null);
                        setActiveSection("showSlider");
                      }}
                      onSuccess={() => {
                        setEditingSlider(null);
                        setActiveSection("showSlider");
                      }}
                    />
                  )}

                  {activeSection === "showSlider" && (
                    <SliderManager 
                      onEdit={(slider) => {
                        setEditingSlider(slider);
                        setActiveSection("createSlider");
                      }} 
                    />
                  )}

                  {activeSection === "gptAi" && <GptAiComponent />}

                  {activeSection === "uploadMedia" && (
                    <CreateImage 
                      onCancel={() => setActiveSection("")} 
                      onSuccess={() => setActiveSection("showMedia")} 
                    />
                  )}

                  {activeSection === "showMedia" && (
                    <ShowMedia />
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// "use client";
// import { useState, useEffect } from "react";
// import {
//   LayoutDashboard,
//   PlusCircle,
//   Database,
//   XCircle,
//   Trash2,
//   Edit,
//   ImageIcon,
//   Music,
//   Video,
//   PlayCircle,
//   ListMusic,
//   Upload,
//   Menu,
//   Pause,
//   Play,
//   ArrowLeft,
// } from "lucide-react";
// import toast, { Toaster } from "react-hot-toast";
// import { FcDataConfiguration } from "react-icons/fc";
// import { CgPlayList, CgPlayListAdd } from "react-icons/cg";

// import GptAiComponent from "@/components/GptAiComponent/GptAiComponent";
// import PlaylistManager from "@/components/ShowPlaylist/showPlaylist";
// import PlaylistSetup from "@/components/PlaylistSetup/PlaylistSetup";
// import ConnectPlaylist from "@/components/ConnectPlaylist/connectPlaylist";
// import ShowMedia from "@/components/ShowMedia/showMedia";
// import CreateMedia from "@/components/CreateMedia/createMedia";
// import AddDeviceType from "@/components/AddDeviceTypes/addDeviceTypes";
// import AddDevice from "@/components/AddDevice/addDevice";

// interface DeviceType {
//   id: string;
//   name: string;
//   type: "robot" | "other";
//   description?: string;
//   imageUrl?: string; // Add this property
// }

// interface Device {
//   _id: string;
//   name: string;
//   imageUrl?: string; // Add this property
//   typeId: string;
//   serialNumber?: string;
//   color?: string;
//   description?: string;
//   features?: string[];
//   handMovements?: string[];
//   // Add any other fields that come from your API
// }

// // First, add this interface for selected files
// interface SelectedFile {
//   id: string;
//   name: string;
//   type: string;
//   url?: string;
//   file: File;
//   delay?: number;
//   backgroundImageEnabled?: boolean;
//   backgroundImage?: string | null;
// }

// interface Playlist {
//   _id?: string;
//   name: string;
//   type: string;
//   url?: string;
//   files: SelectedFile[];
//   contentType: string;
//   createdAt?: string;
//   startTime?: string;
//   endTime?: string;
// }

// // Add these interfaces at the top of your file
// interface PlaylistSchedule {
//   deviceTypeId: string;
//   playlists: {
//     playlistId: string;
//     duration: number; // duration in minutes
//   }[];
//   startDate: string;
//   endDate: string;
//   startTime: string;
//   endTime: string;
// }

// // First add this interface for the model preview
// interface ModelPreview {
//   id: string;
//   file: File;
//   preview: string;
// }

// // Add these types near your other interfaces
// type DeviceTypeChangeEvent = React.ChangeEvent<HTMLSelectElement>;
// type FileChangeEvent = React.ChangeEvent<HTMLInputElement>;
// type DragEvent = React.DragEvent<HTMLDivElement>;

// // Add these interfaces at the top of your file with other interfaces
// interface PlaylistConfigFile {
//   path: string;
//   name: string;
//   type: string;
//   displayOrder: number;
//   delay: number;
//   backgroundImageEnabled?: boolean;
//   backgroundImage?: string | File | null; // Update this to allow both string and File types
//   backgroundImageName?: string | null; // Add this line
// }

// interface PlaylistConfiguration {
//   id: string;
//   name: string;
//   type: string;
//   contentType: "playlist" | "announcement"; // Update this line
//   serialNumber: string;
//   startTime: string;
//   endTime: string;
//   files: PlaylistConfigFile[];
// }

// export default function RobotAdminDashboard() {
//   const [devices, setDevices] = useState<Device[]>([]);
//   const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
//   const [newDevice, setNewDevice] = useState<{
//     name: string;
//     typeId: string;
//     color: string;
//     serialNumber: string;
//   }>({
//     name: "",
//     typeId: "",
//     color: "",
//     serialNumber: "",
//   });
//   const [activeSection, setActiveSection] = useState<string>("");
//   const [isLoading, setIsLoading] = useState(false);
// // Add these missing state variables
// const [isLoadingMedia, setIsLoadingMedia] = useState(false);
// const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
// const [isUploading, setIsUploading] = useState(false);
//   // And update the playlists state to use the interface
//   const [playlists, setPlaylists] = useState<Playlist[]>([]);

//   // Add these state variables
//   const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
//   const [selectedDeviceType, setSelectedDeviceType] = useState<string>("");

//   // Update the scheduleSettings state

//   // Add this new state for managing playlist durations
//   const [playlistDurations, setPlaylistDurations] = useState<{
//     [key: string]: number;
//   }>({});

//   // Add this state for mobile sidebar
//   const [isSidebarOpen, setIsSidebarOpen] = useState(false);

//   // Add these to your existing component
//   const [files, setFiles] = useState<Array<File & { id: string }>>([]);

//   const [playingMedia, setPlayingMedia] = useState<string | null>(null);

//   // Add this state at the beginning of your component
//   const [mediaFiles, setMediaFiles] = useState<any[]>([]);

//   const [availableDevices, setAvailableDevices] = useState<Device[]>([]);

//   // Add this function to handle day selection

//   //fetch media function
//   // Add this function to fetch media files
//   const fetchMedia = async () => {
//     setIsLoadingMedia(true);
//     try {
//       const response = await fetch("/api/media");
//       if (!response.ok) throw new Error("Failed to fetch media files");

//       const data = await response.json();
//       setMediaFiles(data.media || []);
//     } catch (error) {
//       console.error("Error fetching media:", error);
//       toast.error("Failed to fetch media files");
//       setMediaFiles([]);
//     } finally {
//       setIsLoadingMedia(false);
//     }
//   };

//   // Update fetchPlaylists function
//   const fetchPlaylists = async () => {
//     setIsLoadingPlaylists(true);
//     try {
//       const response = await fetch("/api/playlists");
//       if (!response.ok) throw new Error("Failed to fetch playlists");

//       const data = await response.json();

//       if (!data) {
//         throw new Error(data.error || "Failed to fetch playlists");
//       }

//       setPlaylists(data || []);
//       console.log("playlists", playlists);
//     } catch (error) {
//       console.error("Error fetching playlists:", error);
//       toast.error("Failed to fetch playlists");
//       setPlaylists([]);
//     } finally {
//       setIsLoadingPlaylists(false);
//     }
//   };

//   // Add this helper function
//   const getFileType = (fileName: string) => {
//     const ext = fileName.split(".").pop()?.toLowerCase();
//     if (["jpg", "jpeg", "png", "gif"].includes(ext || "")) return "image";
//     if (["mp4", "webm"].includes(ext || "")) return "video";
//     if (["mp3", "wav"].includes(ext || "")) return "audio";
//     return "unknown";
//   };

//   useEffect(() => {
//     fetchDeviceTypes();
//     fetchDevices();
//   }, []);

//   // Add this useEffect in your component, alongside other useEffect hooks
//   useEffect(() => {
//     if (activeSection === "playlistSetup") {
//       fetchMedia(); // Fetch media files when entering playlist setup
//     }
//   }, [activeSection]);
//    useEffect(() => {
//       if (activeSection === "showPlaylist") {

//         fetchPlaylists();

//       }
//     }, [activeSection]);

//   // Add this useEffect
//   useEffect(() => {
//     if (selectedDeviceType) {
//       // Fetch devices based on selected type
//     }
//   }, [selectedDeviceType]);

//   // Update this useEffect
//   useEffect(() => {
//     if (activeSection === "showMedia") {
//       fetchMedia(); // Change from fetchPlaylists to fetchMedia
//     }
//   }, [activeSection]);

//   const fetchDevices = async () => {
//     try {
//       const response = await fetch("/api/devices");
//       if (!response.ok)
//         throw new Error(`Failed to fetch devices: ${response.status}`);
//       const data = await response.json();

//       setDevices(data);
//       console.log(data, "devices data");
//     } catch (error) {
//       console.error("Error fetching devices:", error);
//       toast.error("Error fetching devices!");
//     }
//   };

//   const fetchDeviceTypes = async () => {
//     try {
//       const response = await fetch("/api/device-types");
//       if (!response.ok) throw new Error(`Failed to fetch device types`);
//       const data = await response.json();
//       setDeviceTypes(data);
//       console.log(data, "device types data");
//     } catch (error) {
//       console.error("Error fetching device types:", error);
//       toast.error("Error fetching device types!");
//     }
//   };

//   // Update the addDevice function in your page.tsx
//   const addDevice = async () => {
//     if (!newDevice.name || !newDevice.typeId || !newDevice.serialNumber) {
//       toast.error("Please fill in all required fields!");
//       return;
//     }

//     setIsLoading(true);

//     try {
//       // Get the device type to access its image
//       const deviceType = deviceTypes.find(
//         (type) => type.id === newDevice.typeId
//       );
//       if (!deviceType?.imageUrl) {
//         throw new Error("Device type image not found");
//       }

//       const response = await fetch("/api/devices", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           name: newDevice.name,
//           color: newDevice.color,
//           typeId: newDevice.typeId,
//           serialNumber: newDevice.serialNumber,
//           imageUrl: deviceType.imageUrl, // Include the device type's image
//         }),
//       });

//       if (!response.ok) {
//         const data = await response.json();
//         throw new Error(data.error || "Failed to add device");
//       }

//       const newDeviceData = await response.json();
//       toast.success("Device added successfully!");

//       // Reset form
//       setNewDevice({ name: "", typeId: "", serialNumber: "", color: "" });

//       // Refresh devices list
//       fetchDevices();

//       // Close the add device section
//       setActiveSection("");
//     } catch (error) {
//       console.error("Error adding device:", error);
//       toast.error(
//         error instanceof Error ? error.message : "Failed to add device"
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const deleteDevice = async (id: string, isConfigured: boolean = false) => {
//     if (!confirm("Are you sure you want to delete this device?")) {
//       return;
//     }

//     try {
//       // If it's a configured device, only delete the configuration
//       if (isConfigured) {
//         const configDeleteResponse = await fetch("/api/configure-device", {
//           method: "DELETE",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ id }),
//         });

//         if (!configDeleteResponse.ok) {
//           throw new Error("Failed to delete device configuration");
//         }

//         toast.success("Device configuration deleted successfully!");
//         return; // Exit early without deleting the main device
//       }

//       // Only execute this part if deleting a main device (when isConfigured is false)
//       const deviceDeleteResponse = await fetch("/api/devices", {
//         method: "DELETE",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ id }),
//       });

//       if (!deviceDeleteResponse.ok) {
//         throw new Error("Failed to delete device");
//       }

//       toast.success("Device deleted successfully!");
//       fetchDevices();
//     } catch (error) {
//       console.error("Error deleting device:", error);
//       toast.error(
//         isConfigured
//           ? "Failed to delete device configuration!"
//           : "Failed to delete device!"
//       );
//     }
//   };

//   // Add this helper function to generate unique IDs
//   const generateUniqueId = () => {
//     return Math.random().toString(36).substr(2, 9);
//   };

//   // Update the fetchPlaylists function in page.tsx

//   // Update the handleDeletePlaylist function in page.tsx
//   const handleDeletePlaylist = async (playlistId: string | undefined) => {
//     alert("Deleting media...");
//     if (!playlistId) {
//       toast.error("Invalid media ID");
//       return;
//     }

//     if (!confirm("Are you sure you want to delete this media?")) {
//       return;
//     }

//     try {
//       const response = await fetch("/api/media", {
//         method: "DELETE",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ id: playlistId }),
//       });

//       if (!response.ok) {
//         throw new Error("Failed to delete media");
//       }

//       setPlaylists((prev) => prev.filter((p) => p._id !== playlistId));
//       toast.success("Media deleted successfully");
//     } catch (error) {
//       console.error("Error deleting media:", error);
//       toast.error("Failed to delete media");
//     }
//   };

//   // Add these functions
//   const handleDeviceTypeChange = (input: string | DeviceTypeChangeEvent) => {
//     let selectedId: string;

//     if (typeof input === "string") {
//       selectedId = input;
//     } else {
//       selectedId = input.target.value;
//     }

//     setSelectedDeviceType(selectedId);
//     console.log("Type changed to:", selectedId); // Debug log
//   };

//   const handlePlaylistSelection = (playlistId: string | undefined) => {
//     if (!playlistId) return; // Guard clause for undefined id
//     setSelectedPlaylists((prev) =>
//       prev.includes(playlistId)
//         ? prev.filter((id) => id !== playlistId)
//         : [...prev, playlistId]
//     );
//   };

//   const handleUpload = async () => {
//     if (files.length === 0) return;

//     setIsUploading(true);
//     const formData = new FormData();
//     files.forEach((file) => {
//       formData.append("files", file);
//     });

//     try {
//       const response = await fetch("/api/upload", {
//         method: "POST",
//         body: formData,
//       });

//       if (!response.ok) {
//         throw new Error("Upload failed");
//       }

//       const data = await response.json();
//       if (data.success) {
//         toast.success("Files uploaded successfully!");
//         setFiles([]);
//         setActiveSection("");
//       } else {
//         throw new Error(data.error);
//       }
//     } catch (error) {
//       console.error("Upload error:", error);
//       toast.error("Failed to upload files");
//     } finally {
//       setIsUploading(false);
//     }
//   };

//   console.log(availableDevices, "avaible devivds");

//   const sidebarItems = [
//     {
//       id: "addDevice",
//       label: "Add Device",
//       icon: <PlusCircle size={20} className="text-green-500" />,
//     },
//     {
//       id: "addDeviceType",
//       label: "Add Device Type",
//       icon: <Database size={20} className="text-blue-500" />,
//     },

//     {
//       id: "gptAi",
//       label: "GPT AI",
//       icon: <FcDataConfiguration size={20} className="text-purple-500" />,
//     },

//   ];

//   // Update the return statement with responsive classes
//   return (
//     <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
//       {/* Mobile Sidebar Toggle */}
//       <div className="md:hidden fixed top-4 left-4 z-30">
//         <button
//           onClick={() => setIsSidebarOpen(!isSidebarOpen)}
//           className="p-2 rounded-lg bg-white shadow-lg"
//         >
//           {isSidebarOpen ? (
//             <XCircle size={24} className="text-gray-600" />
//           ) : (
//             <Menu size={24} className="text-gray-600" />
//           )}
//         </button>
//       </div>

//       {/* Sidebar */}
//       <div
//         className={`${
//           isSidebarOpen ? "translate-x-0" : "-translate-x-full"
//         } md:translate-x-0 fixed md:relative z-20 w-64 h-full bg-white shadow-lg transition-transform duration-200 ease-in-out`}
//       >
//         <div className="p-6 border-b">
//           <h1 className="text-xl font-bold text-gray-800"> Centor Admin</h1>
//         </div>
//         <nav className="p-4 overflow-y-auto h-[calc(100vh-88px)]">
//           {sidebarItems.map((item) => (
//             <button
//               key={item.id}
//               onClick={() => {
//                 setActiveSection(item.id);
//                 setIsSidebarOpen(false); // Close sidebar on mobile after selection
//               }}
//               className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
//                 activeSection === item.id
//                   ? "bg-blue-50 text-blue-600"
//                   : "text-gray-600 hover:bg-gray-50"
//               }`}
//             >
//               {item.icon}
//               <span className="text-sm font-medium">{item.label}</span>
//             </button>
//           ))}
//         </nav>
//       </div>

//       {/* Overlay for mobile */}
//       {isSidebarOpen && (
//         <div
//           className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
//           onClick={() => setIsSidebarOpen(false)}
//         />
//       )}

//       {/* Main Content */}
//       <div className="flex-1 w-full md:w-auto p-4 md:p-8 pt-20 md:pt-8">
//         <div className="max-w-7xl mx-auto">
//           {/* Dashboard Overview */}
//           {!activeSection && (
//             <div className="space-y-6">
//               {/* Stats Overview Cards */}
//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//                 <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
//                   <div className="flex items-center justify-between mb-4">
//                     <div className="p-3 bg-blue-50 rounded-lg">
//                       <Database size={24} className="text-blue-500" />
//                     </div>
//                     <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
//                       Total
//                     </span>
//                   </div>
//                   <h3 className="text-2xl font-bold text-gray-800 mb-1">
//                     {devices.length}
//                   </h3>
//                   <p className="text-sm text-gray-500">Registered Devices</p>
//                 </div>
// 
//                 <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
//                   <div className="flex items-center justify-between mb-4">
//                     <div className="p-3 bg-orange-50 rounded-lg">
//                       <CgPlayList size={24} className="text-orange-500" />
//                     </div>
//                     <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
//                       Types
//                     </span>
//                   </div>
//                   <h3 className="text-2xl font-bold text-gray-800 mb-1">
//                     {deviceTypes.length}
//                   </h3>
//                   <p className="text-sm text-gray-500">Device Types</p>
//                 </div>
//               </div>

//               {/* Quick Actions */}
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 {/* Recent Devices */}
//                 <div className="bg-white rounded-xl shadow-sm p-6">
//                   <div className="flex items-center justify-between mb-6">
//                     <h3 className="text-lg font-semibold">Recent Devices</h3>
//                     <button
//                       onClick={() => setActiveSection("showConfiguredDevices")}
//                       className="text-sm text-blue-600 hover:text-blue-700"
//                     >
//                       View All
//                     </button>
//                   </div>
//                   <div className="space-y-4">
//                     {devices.slice(0, 3).map((device) => (
//                       <div
//                         key={device._id}
//                         className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50"
//                       >
//                         <img
//                           src={device.imageUrl || "/placeholder-image.jpg"}
//                           alt={device.name}
//                           className="w-12 h-12 rounded-lg object-cover"
//                         />
//                         <div className="flex-1">
//                           <h4 className="font-medium text-gray-800">
//                             {device.name}
//                           </h4>
//                           <p className="text-sm text-gray-500">
//                             {deviceTypes.find((type) => type.id === device.typeId)
//                               ?.name || null}
//                           </p>
//                         </div>
//                         <button className="p-2 text-gray-400 hover:text-blue-500">
//                           <Edit size={16} />
//                         </button>
//                       </div>
//                     ))}
//                   </div>
//                 </div>

//               </div>

//             </div>
//           )}

//           {/*add device type */}
//           {activeSection === "addDeviceType" && (
//             <AddDeviceType
//               activeSection={activeSection}
//               onCancel={() => setActiveSection("")}
//               onSuccess={(newType) => {
//                 setDeviceTypes((prev) => [...prev, newType]);
//                 setActiveSection("");
//               }}
//             />
//           )}

//           {activeSection === "addDevice" && (
//             <AddDevice
//               activeSection={activeSection}
//               deviceTypes={deviceTypes}
//               onCancel={() => setActiveSection("")}
//               onSuccess={() => {
//                 fetchDevices();
//                 setActiveSection("");
//               }}
//             />
//           )}

//           {activeSection === "gptAi" && <GptAiComponent />}
//           {/* Replace the existing showPlaylists section with this code */}

//         </div>
//       </div>
//     </div>
//   );
// }
