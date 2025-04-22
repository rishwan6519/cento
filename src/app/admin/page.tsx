"use client";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  PlusCircle,
  Database,
  XCircle,
  Trash2,
  Edit,
  ImageIcon,
  Music,
  Video,
  PlayCircle,
  ListMusic,
  Upload,
  Menu,
  Pause,
  Play,
  ArrowLeft,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { FcDataConfiguration } from "react-icons/fc";
import { CgPlayList, CgPlayListAdd } from "react-icons/cg";
import {
  MdPlaylistAddCheckCircle,
  MdPlaylistAddCircle,
  MdAudiotrack,
} from "react-icons/md";
import GptAiComponent from "@/components/GptAiComponent/GptAiComponent";
import PlaylistManager from "@/components/ShowPlaylist/showPlaylist";
import PlaylistSetup from "@/components/PlaylistSetup/PlaylistSetup";
import ConnectPlaylist from "@/components/ConnectPlaylist/connectPlaylist";
import ShowMedia from "@/components/ShowMedia/showMedia";
import CreateMedia from "@/components/CreateMedia/createMedia";
import AddDeviceType from "@/components/AddDeviceTypes/addDeviceTypes";
import AddDevice from "@/components/AddDevice/addDevice";

interface DeviceType {
  id: string;
  name: string;
  type: "robot" | "other";
  description?: string;
  imageUrl?: string; // Add this property
}

interface Device {
  _id: string;
  name: string;
  imageUrl?: string; // Add this property
  type: string;
  serialNumber?: string;
  color?: string;
  description?: string;
  features?: string[];
  handMovements?: string[];
  // Add any other fields that come from your API
}

// First, add this interface for selected files
interface SelectedFile {
  id: string;
  name: string;
  type: string;
  url?: string;
  file: File;
  delay?: number;
  backgroundImageEnabled?: boolean;
  backgroundImage?: string | null;
}

interface Playlist {
  _id?: string;
  name: string;
  type: string;
  url?: string;
  files: SelectedFile[];
  contentType: string;
  createdAt?: string;
  startTime?: string;
  endTime?: string;
}

// Add these interfaces at the top of your file
interface PlaylistSchedule {
  deviceTypeId: string;
  playlists: {
    playlistId: string;
    duration: number; // duration in minutes
  }[];
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

// First add this interface for the model preview
interface ModelPreview {
  id: string;
  file: File;
  preview: string;
}

// Add these types near your other interfaces
type DeviceTypeChangeEvent = React.ChangeEvent<HTMLSelectElement>;
type FileChangeEvent = React.ChangeEvent<HTMLInputElement>;
type DragEvent = React.DragEvent<HTMLDivElement>;

// Add these interfaces at the top of your file with other interfaces
interface PlaylistConfigFile {
  path: string;
  name: string;
  type: string;
  displayOrder: number;
  delay: number;
  backgroundImageEnabled?: boolean;
  backgroundImage?: string | File | null; // Update this to allow both string and File types
  backgroundImageName?: string | null; // Add this line
}

interface PlaylistConfiguration {
  id: string;
  name: string;
  type: string;
  contentType: "playlist" | "announcement"; // Update this line
  serialNumber: string;
  startTime: string;
  endTime: string;
  files: PlaylistConfigFile[];
}

export default function RobotAdminDashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [newDevice, setNewDevice] = useState<{
    name: string;
    typeId: string;
    color: string;
    serialNumber: string;
  }>({
    name: "",
    typeId: "",
    color: "",
    serialNumber: "",
  });
  const [activeSection, setActiveSection] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
// Add these missing state variables
const [isLoadingMedia, setIsLoadingMedia] = useState(false);
const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
const [isUploading, setIsUploading] = useState(false);
  // And update the playlists state to use the interface
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  // Add these state variables
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
  const [selectedDeviceType, setSelectedDeviceType] = useState<string>("");

  // Update the scheduleSettings state


  // Add this new state for managing playlist durations
  const [playlistDurations, setPlaylistDurations] = useState<{
    [key: string]: number;
  }>({});

  // Add this state for mobile sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Add these to your existing component
  const [files, setFiles] = useState<Array<File & { id: string }>>([]);

  const [playingMedia, setPlayingMedia] = useState<string | null>(null);

  // Add this state at the beginning of your component
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);

  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);

  // Add this function to handle day selection
 

  //fetch media function
  // Add this function to fetch media files
  const fetchMedia = async () => {
    setIsLoadingMedia(true);
    try {
      const response = await fetch("/api/media");
      if (!response.ok) throw new Error("Failed to fetch media files");

      const data = await response.json();
      setMediaFiles(data.media || []);
    } catch (error) {
      console.error("Error fetching media:", error);
      toast.error("Failed to fetch media files");
      setMediaFiles([]);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  // Update fetchPlaylists function
  const fetchPlaylists = async () => {
    setIsLoadingPlaylists(true);
    try {
      const response = await fetch("/api/playlists");
      if (!response.ok) throw new Error("Failed to fetch playlists");

      const data = await response.json();

      if (!data) {
        throw new Error(data.error || "Failed to fetch playlists");
      }

      setPlaylists(data || []);
      console.log("playlists", playlists);
    } catch (error) {
      console.error("Error fetching playlists:", error);
      toast.error("Failed to fetch playlists");
      setPlaylists([]);
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  // Add this helper function
  const getFileType = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif"].includes(ext || "")) return "image";
    if (["mp4", "webm"].includes(ext || "")) return "video";
    if (["mp3", "wav"].includes(ext || "")) return "audio";
    return "unknown";
  };

  useEffect(() => {
    fetchDeviceTypes();
    fetchDevices();
  }, []);

  // Add this useEffect in your component, alongside other useEffect hooks
  useEffect(() => {
    if (activeSection === "playlistSetup") {
      fetchMedia(); // Fetch media files when entering playlist setup
    }
  }, [activeSection]);
   useEffect(() => {
      if (activeSection === "showPlaylist") {
          
        fetchPlaylists();
       

      }
    }, [activeSection]);

  // Add this useEffect
  useEffect(() => {
    if (selectedDeviceType) {
      // Fetch devices based on selected type
    }
  }, [selectedDeviceType]);

  // Update this useEffect
  useEffect(() => {
    if (activeSection === "showMedia") {
      fetchMedia(); // Change from fetchPlaylists to fetchMedia
    }
  }, [activeSection]);

  const fetchDevices = async () => {
    try {
      const response = await fetch("/api/devices");
      if (!response.ok)
        throw new Error(`Failed to fetch devices: ${response.status}`);
      const data = await response.json();

      setDevices(data);
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
    } catch (error) {
      console.error("Error fetching device types:", error);
      toast.error("Error fetching device types!");
    }
  };

  // Update the addDevice function in your page.tsx
  const addDevice = async () => {
    if (!newDevice.name || !newDevice.typeId || !newDevice.serialNumber) {
      toast.error("Please fill in all required fields!");
      return;
    }

    setIsLoading(true);

    try {
      // Get the device type to access its image
      const deviceType = deviceTypes.find(
        (type) => type.id === newDevice.typeId
      );
      if (!deviceType?.imageUrl) {
        throw new Error("Device type image not found");
      }

      const response = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDevice.name,
          color: newDevice.color,
          typeId: newDevice.typeId,
          serialNumber: newDevice.serialNumber,
          imageUrl: deviceType.imageUrl, // Include the device type's image
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add device");
      }

      const newDeviceData = await response.json();
      toast.success("Device added successfully!");

      // Reset form
      setNewDevice({ name: "", typeId: "", serialNumber: "", color: "" });

      // Refresh devices list
      fetchDevices();

      // Close the add device section
      setActiveSection("");
    } catch (error) {
      console.error("Error adding device:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add device"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const deleteDevice = async (id: string, isConfigured: boolean = false) => {
    if (!confirm("Are you sure you want to delete this device?")) {
      return;
    }

    try {
      // If it's a configured device, only delete the configuration
      if (isConfigured) {
        const configDeleteResponse = await fetch("/api/configure-device", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });

        if (!configDeleteResponse.ok) {
          throw new Error("Failed to delete device configuration");
        }

        toast.success("Device configuration deleted successfully!");
        return; // Exit early without deleting the main device
      }

      // Only execute this part if deleting a main device (when isConfigured is false)
      const deviceDeleteResponse = await fetch("/api/devices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!deviceDeleteResponse.ok) {
        throw new Error("Failed to delete device");
      }

      toast.success("Device deleted successfully!");
      fetchDevices();
    } catch (error) {
      console.error("Error deleting device:", error);
      toast.error(
        isConfigured
          ? "Failed to delete device configuration!"
          : "Failed to delete device!"
      );
    }
  };

  // Add this helper function to generate unique IDs
  const generateUniqueId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  // Update the fetchPlaylists function in page.tsx

  // Update the handleDeletePlaylist function in page.tsx
  const handleDeletePlaylist = async (playlistId: string | undefined) => {
    alert("Deleting media...");
    if (!playlistId) {
      toast.error("Invalid media ID");
      return;
    }

    if (!confirm("Are you sure you want to delete this media?")) {
      return;
    }

    try {
      const response = await fetch("/api/media", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: playlistId }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete media");
      }

      setPlaylists((prev) => prev.filter((p) => p._id !== playlistId));
      toast.success("Media deleted successfully");
    } catch (error) {
      console.error("Error deleting media:", error);
      toast.error("Failed to delete media");
    }
  };

  // Add these functions
  const handleDeviceTypeChange = (input: string | DeviceTypeChangeEvent) => {
    let selectedId: string;

    if (typeof input === "string") {
      selectedId = input;
    } else {
      selectedId = input.target.value;
    }

    setSelectedDeviceType(selectedId);
    console.log("Type changed to:", selectedId); // Debug log
  };

  const handlePlaylistSelection = (playlistId: string | undefined) => {
    if (!playlistId) return; // Guard clause for undefined id
    setSelectedPlaylists((prev) =>
      prev.includes(playlistId)
        ? prev.filter((id) => id !== playlistId)
        : [...prev, playlistId]
    );
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      if (data.success) {
        toast.success("Files uploaded successfully!");
        setFiles([]);
        setActiveSection("");
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload files");
    } finally {
      setIsUploading(false);
    }
  };

  console.log(availableDevices, "avaible devivds");

  const sidebarItems = [
    {
      id: "addDevice",
      label: "Add Device",
      icon: <PlusCircle size={20} className="text-green-500" />,
    },
    {
      id: "addDeviceType",
      label: "Add Device Type",
      icon: <Database size={20} className="text-blue-500" />,
    },
    {
      id: "generatePlaylist",
      label: "Create Media",
      icon: <PlayCircle size={20} className="text-green-500" />,
    },
    {
      id: "showMedia", // changed from 'showPlaylists'
      label: "Show Medias",
      icon: <CgPlayList size={20} className="text-indigo-500" />,
    },
    {
      id: "gptAi",
      label: "GPT AI",
      icon: <FcDataConfiguration size={20} className="text-purple-500" />,
    },

    {
      id: "connectPlaylist",
      label: "Connect Playlist",
      icon: <ListMusic size={20} className="text-purple-500" />,
    },
    {
      id: "playlistSetup",
      label: "Playlist Setup",
      icon: <CgPlayListAdd size={20} className="text-purple-500" />,
    },
    {
      id: "showPlaylists",
      label: "Show Playlists",
      icon: <CgPlayList size={20} className="text-indigo-500" />,
    },
  ];

  // Update the return statement with responsive classes
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100">
      {/* Mobile Sidebar Toggle */}
      <div className="md:hidden fixed top-4 left-4 z-30">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-lg bg-white shadow-lg"
        >
          {isSidebarOpen ? (
            <XCircle size={24} className="text-gray-600" />
          ) : (
            <Menu size={24} className="text-gray-600" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:relative z-20 w-64 h-full bg-white shadow-lg transition-transform duration-200 ease-in-out`}
      >
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-800"> Centor Admin</h1>
        </div>
        <nav className="p-4 overflow-y-auto h-[calc(100vh-88px)]">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                setIsSidebarOpen(false); // Close sidebar on mobile after selection
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                activeSection === item.id
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {item.icon}
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 w-full md:w-auto p-4 md:p-8 pt-20 md:pt-8">
        <div className="max-w-7xl mx-auto">
          {/* Dashboard Overview */}
          {!activeSection && (
            <div className="space-y-6">
              {/* Stats Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <Database size={24} className="text-blue-500" />
                    </div>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                      Total
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-1">
                    {devices.length}
                  </h3>
                  <p className="text-sm text-gray-500">Registered Devices</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <PlayCircle size={24} className="text-purple-500" />
                    </div>
                    <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                      Media
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-1">
                    {playlists.length}
                  </h3>
                  <p className="text-sm text-gray-500">Total Media Files</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-orange-50 rounded-lg">
                      <CgPlayList size={24} className="text-orange-500" />
                    </div>
                    <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                      Types
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-1">
                    {deviceTypes.length}
                  </h3>
                  <p className="text-sm text-gray-500">Device Types</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recent Devices */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">Recent Devices</h3>
                    <button
                      onClick={() => setActiveSection("showConfiguredDevices")}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      View All
                    </button>
                  </div>
                  <div className="space-y-4">
                    {devices.slice(0, 3).map((device) => (
                      <div
                        key={device._id}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50"
                      >
                        <img
                          src={device.imageUrl || "/placeholder-image.jpg"}
                          alt={device.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">
                            {device.name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {deviceTypes.find((type) => type.id === device.type)
                              ?.name || "Unknown Type"}
                          </p>
                        </div>
                        <button className="p-2 text-gray-400 hover:text-blue-500">
                          <Edit size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Media */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">Recent Media</h3>
                    <button
                      onClick={() => setActiveSection("showMedia")}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      View All
                    </button>
                    <div className="space-y-4">
                      {playlists.slice(0, 3).map((media: any) => (
                        <div
                          key={media.id}
                          className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50"
                        >
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                            {media.type.includes("image") && (
                              <ImageIcon size={20} className="text-gray-500" />
                            )}
                            {media.type.includes("video") && (
                              <Video size={20} className="text-gray-500" />
                            )}
                            {media.type.includes("audio") && (
                              <Music size={20} className="text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800">
                              {media.name}
                            </h4>
                            <p className="text-sm text-gray-500 capitalize">
                              {media.type.split("/")[0]}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(media.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                  onClick={() => setActiveSection("generatePlaylist")}
                  className="p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-3"
                >
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <PlayCircle size={20} className="text-blue-500" />
                  </div>
                  <span className="font-medium text-gray-700">
                    Create Playlist
                  </span>
                </button>

                <button
                  onClick={() => setActiveSection("playlistSetup")}
                  className="p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-3"
                >
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <CgPlayListAdd size={20} className="text-orange-500" />
                  </div>
                  <span className="font-medium text-gray-700">
                    Setup Playlist
                  </span>
                </button>
              </div>
            </div>
          )}

          {/*add device type */}
          {activeSection === "addDeviceType" && (
            <AddDeviceType
              activeSection={activeSection}
              onCancel={() => setActiveSection("")}
              onSuccess={(newType) => {
                setDeviceTypes((prev) => [...prev, newType]);
                setActiveSection("");
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

          {activeSection === "connectPlaylist" && (
            <ConnectPlaylist
              activeSection={activeSection}
              onCancel={() => setActiveSection("")}
              onSuccess={() => setActiveSection("")}
            />
          )}

          {activeSection === "generatePlaylist" && (
            <CreateMedia
              activeSection={activeSection}
              onCancel={() => setActiveSection("")}
              onSuccess={() => {
                setActiveSection("");
                fetchMedia(); // Refetch media after successful upload
              }}
            />
          )}
          {activeSection === "showMedia" && (
            <ShowMedia
              activeSection={activeSection}
              onCancel={() => setActiveSection("")}
            />
          )}

          {activeSection === "playlistSetup" && (
            <PlaylistSetup
              activeSection={activeSection}
              mediaFiles={mediaFiles}
              onSaveSuccess={() => {
                setActiveSection("showPlaylists");
                fetchPlaylists();
              }}
              onCancel={() => setActiveSection("")}
            />
          )}

          {activeSection === "gptAi" && <GptAiComponent />}
          {/* Replace the existing showPlaylists section with this code */}

          {activeSection === "showPlaylists" && (
            <PlaylistManager
              activeSection="showPlaylist"
              mediaFiles={mediaFiles}
              generateUniqueId={generateUniqueId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
