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
  Settings,
  PlayCircle,
  ListMusic,
  Upload,
  Menu
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { FcDataConfiguration } from "react-icons/fc";
import { CgPlayList, CgPlayListAdd } from "react-icons/cg";
import { MdPlaylistAddCheckCircle, MdPlaylistAddCircle, MdAudiotrack } from "react-icons/md";


interface DeviceType {
  id: string;
  name: string;
  type: 'robot' | 'other';
}

interface Device {
  id: string;
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
  file: File;  // Add this property
}

// First, update the Playlist interface
interface Playlist {
  id?: string; // Make it clear that id is optional
  name: string;
  type: 'image' | 'video' | 'audio';
  files: SelectedFile[];
  backgroundAudio?: File;
  volume: {
    main: number;
    background: number;
  };
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
  activeDays: string[];
  exemptDays: string[];
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

export default function RobotAdminDashboard() {
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [customDeviceName, setCustomDeviceName] = useState<string>("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
  const [newDevice, setNewDevice] = useState<{ name: string; imageFile: File | null; typeId: string }>({
    name: "",
    imageFile: null,
    typeId: "",
  });
  const [activeSection, setActiveSection] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [configuredDevices, setConfiguredDevices] = useState<Device[]>([]);

  const [deviceDetails, setDeviceDetails] = useState<Device>({
    id: "",
    name: "",
    imageUrl: "",
    type: "",
    serialNumber: "",
    color: "",
    description: "",
    features: [],
    handMovements: [],
  });

  // Update the playlist state
  const [playlist, setPlaylist] = useState<Playlist>({
    name: '',
    type: 'image',
    files: [],
    backgroundAudio: undefined,
    volume: {
      main: 100,
      background: 50
    }
  });

  // And update the playlists state to use the interface
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);

  // Add these state variables
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
  const [selectedDeviceType, setSelectedDeviceType] = useState<string>("");

  // Update the scheduleSettings state
  const [scheduleSettings, setScheduleSettings] = useState<PlaylistSchedule>({
    deviceTypeId: "",
    playlists: [],
    startDate: "",
    endDate: "",
    startTime: "09:00",
    endTime: "17:00",
    activeDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    exemptDays: []
  });

  // Add this new state for managing playlist durations
  const [playlistDurations, setPlaylistDurations] = useState<{[key: string]: number}>({});

  // Add this state for mobile sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Add these to your existing component
  const [files, setFiles] = useState<Array<File & { id: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Add these to your existing state declarations
  const [modelPreviews, setModelPreviews] = useState<ModelPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Add to your existing state declarations
const [orderedPlaylists, setOrderedPlaylists] = useState<Playlist[]>([]);
const [searchTerm, setSearchTerm] = useState("");
const [sortBy, setSortBy] = useState("name");

  // Add this function to handle day selection
const toggleDay = (day: string) => {
  setScheduleSettings(prev => ({
    ...prev,
    activeDays: prev.activeDays.includes(day)
      ? prev.activeDays.filter(d => d !== day)
      : [...prev.activeDays, day]
  }));
};

  useEffect(() => {
    fetchDeviceTypes();
    fetchDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      const device = devices.find(d => d.id === selectedDevice);
      if (device) {
        setDeviceDetails({
          ...device,
          features: device.features || [],
          handMovements: device.handMovements || []
        });
      }
    }
  }, [selectedDevice, devices]);

  useEffect(() => {
    if (activeSection === "showConfiguredDevices") {
      getConfiguredDevices();
    }
  }, [activeSection]);

  // Add useEffect to fetch playlists when component mounts
  useEffect(() => {
    if (activeSection === 'showPlaylists') {
      fetchPlaylists();
    }
  }, [activeSection]);

  // Add this useEffect in your component, alongside other useEffect hooks
useEffect(() => {
  if (activeSection === "playlistSetup") {
    fetchPlaylists();
  }
}, [activeSection]);

// Add useEffect to reset device selection when type changes
useEffect(() => {
  setSelectedDevice("");
}, [selectedDeviceType]);

// Add this useEffect
useEffect(() => {
  if (selectedDeviceType) {
    getConfiguredDevices(selectedDeviceType);
  }
}, [selectedDeviceType]);

  const fetchDevices = async () => {
    try {
      const response = await fetch("/api/devices");
      if (!response.ok) throw new Error(`Failed to fetch devices: ${response.status}`);
      const data = await response.json();
      alert(data)
      console.log(data,"data")
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

  const handleImageUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Image upload error:", errorData);
        throw new Error(`Image upload failed: ${response.status}`);
      }

      const data = await response.json();
      return data.imageUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const addDevice = async () => {
    if (!newDevice.name) {
      toast.error("Device name is required!");
      return;
    }
    
    if (!newDevice.imageFile) {
      toast.error("Device image is required!");
      return;
    }

    setIsLoading(true);
    
    try {
      const imageUrl = await handleImageUpload(newDevice.imageFile);
      const response = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newDevice.name, 
          imageUrl,
          typeId: newDevice.typeId || "ROBO"
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Device save error:", errorData);
        throw new Error(`Failed to add device: ${response.status}`);
      }
      
      const result = await response.json();
      toast.success("Device added successfully!");
      setNewDevice({ name: "", imageFile: null, typeId: "" });
      fetchDevices();
      setActiveSection("");
    } catch (error) {
      console.error("Error adding device:", error);
      toast.error("Failed to add device!");
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
        getConfiguredDevices(); // Refresh only the configured devices list
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
      toast.error(isConfigured ? "Failed to delete device configuration!" : "Failed to delete device!");
    }
  };

  const addDeviceType = async () => {
    if (!customDeviceName) {
      toast.error("Please enter a name!");
      return;
    }
  
    try {
      const response = await fetch("/api/device-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customDeviceName,
        }),
      });
  
      if (!response.ok) {
        throw new Error("Failed to add device type");
      }
  
      const newType = await response.json();
      toast.success("Device type added successfully!");
      setDeviceTypes(prev => [...prev, newType]);
      setCustomDeviceName("");
      setActiveSection("");
    } catch (error) {
      console.error("Error adding device type:", error);
      toast.error("Failed to add device type!");
    }
  };

  const configureDevice = async () => {
    if (!selectedDevice) {
      toast.error("Please select a device to configure!");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const configData = {
        ...deviceDetails,
        id: selectedDevice
      };

      const response = await fetch("/api/configure-device", {
        method: isEditing ? "PUT" : "POST", // Use PUT for updates, POST for new configs
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Device configuration error:", errorData);
        throw new Error("Failed to configure device");
      }
      
      toast.success(isEditing ? "Device updated successfully!" : "Device configured successfully!");
      getConfiguredDevices(); // Refresh the configured devices list
      setActiveSection("showConfiguredDevices"); // Keep showing the configured devices list
      resetForm();
    } catch (error) {
      console.error("Error configuring device:", error);
      toast.error(isEditing ? "Failed to update device!" : "Failed to configure device!");
    } finally {
      setIsLoading(false);
    }
  };

  // Add this helper function to reset the form
  const resetForm = () => {
    setDeviceDetails({
      id: "",
      name: "",
      imageUrl: "",
      type: "",
      serialNumber: "",
      color: "",
      description: "",
      features: [],
      handMovements: [],
    });
    setSelectedDevice("");
    setIsEditing(false);
  };

  const handleConfigInputChange = (field: keyof Device, value: any) => {
    setDeviceDetails((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const editDevice = (device: Device) => {
    setDeviceDetails({
      ...device,
      features: device.features || [],
      handMovements: device.handMovements || [],
      serialNumber: device.serialNumber || "",
      color: device.color || "",
      description: device.description || ""
    });
    setSelectedDevice(device.id);
    setIsEditing(true);
    setActiveSection("configureDevice");
  };

  const getConfiguredDevices = async () => {
    try { 
      const response = await fetch("/api/configure-device");
      if (!response.ok) throw new Error("Failed to fetch configured devices");
      
      const data = await response.json();
      console.log('Configured Devices:', data); // Debug log
      
      // Make sure we're setting the correct data structure
      setConfiguredDevices(Array.isArray(data) ? data : data.devices || []);
    } catch (error) {
      console.error("Error fetching configured devices:", error);
      toast.error("Failed to fetch configured devices!");
      setConfiguredDevices([]); // Set empty array on error
    }
  };

  // Add this helper function to generate unique IDs
  const generateUniqueId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  // Add this function to handle file selection
  const handleFileSelection = (e: FileChangeEvent) => {
    const newFiles = Array.from(e.target.files || []).map(file => ({
      id: generateUniqueId(),
      name: file.name,
      file: file  // Make sure to include the file object
    }));
    
    setPlaylist(prev => ({
      ...prev,
      files: [...prev.files, ...newFiles]
    }));
  };

  // Add this function to handle file deletion
  const handleFileDelete = (id: string) => {
    setPlaylist(prev => ({
      ...prev,
      files: prev.files.filter(file => file.id !== id)
    }));
  };

  // Update the handlePlaylistCreate function
const handlePlaylistCreate = async () => {
  if (playlist.files.length === 0) {
    toast.error("Please select at least one file");
    alert("Please select at least one file");
    return;
  }

  // Show loading toast
  const loadingToast = toast.loading('Creating playlist...');

  try {
    const formData = new FormData();
    
    // Add all files from playlist
    playlist.files.forEach((file) => {
      formData.append('files', file.file);
      formData.append('fileNames', file.name);
    });

    // Make the API call
    const response = await fetch("/api/media/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload media files");
    }

    const data = await response.json();
    
    // Update success toast
    toast.success('Media uploaded successfully!', {
      id: loadingToast,
    });

    // Reset the form
    setPlaylist(prev => ({
      ...prev,
      files: []
    }));
    setActiveSection("");

    // Refresh playlists if needed
    fetchPlaylists();

  } catch (error) {
    // Update error toast
    toast.error(error instanceof Error ? error.message : 'Failed to upload media', {
      id: loadingToast,
    });
    console.error("Error uploading media:", error);
  }
};


// Add this function to fetch playlists from medialist.json
const fetchPlaylists = async () => {
  setIsLoadingPlaylists(true);
  try {
    const response = await fetch('/medialist.json');
    if (!response.ok) throw new Error('Failed to fetch media list');
    
    const data = await response.json();
   
    console.log(data,"kkkkk")
    setPlaylists(data.media || []);
  } catch (error) {
    console.error('Error fetching media list:', error);
    toast.error('Failed to fetch media list');
  } finally {
    setIsLoadingPlaylists(false);
  }
};

  const handleEditPlaylist = (playlist: any) => {
    setPlaylist({
      ...playlist,
      id: playlist.id,
      volume: playlist.volume || { main: 100, background: 50 },
    });
    setIsEditing(true); // Enable editing mode
    setActiveSection("generatePlaylist");
  };
  

  const handleDeletePlaylist = async (playlistId: string | undefined) => {
    if (!playlistId) {
      toast.error("Invalid playlist ID");
      return;
    }

    if (!confirm("Are you sure you want to delete this playlist?")) {
      return;
    }
    
   try {
    const response = await fetch(`/api/playlist?id=${playlistId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete playlist');
    }

    // Remove the playlist from the state
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));
    toast.success('Playlist deleted successfully');
  } catch (error) {
    console.error('Error deleting playlist:', error);
    toast.error('Failed to delete playlist');
  }
  };

  // Add these functions
  const handleDeviceTypeChange = (input: string | DeviceTypeChangeEvent) => {
    let selectedId: string;
  
    if (typeof input === 'string') {
      selectedId = input;
    } else {
      selectedId = input.target.value;
    }
  
    setSelectedDeviceType(selectedId);
    setSelectedDevice(""); // Reset selected device when type changes
    console.log('Type changed to:', selectedId); // Debug log
  };

  const handlePlaylistSelection = (playlistId: string | undefined) => {
    if (!playlistId) return; // Guard clause for undefined id
    setSelectedPlaylists(prev => 
      prev.includes(playlistId) 
        ? prev.filter(id => id !== playlistId)
        : [...prev, playlistId]
    );
  };

  const handlePlaylistSetup = async () => {
    if (!scheduleSettings.deviceTypeId) {
      toast.error("Please select a device type");
      return;
    }
  
    if (scheduleSettings.playlists.length === 0) {
      toast.error("Please select at least one playlist");
      return;
    }
  
    if (!scheduleSettings.startDate || !scheduleSettings.endDate) {
      toast.error("Please select both start and end dates");
      return;
    }
  
    try {
      const response = await fetch("/api/playlist-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scheduleSettings)
      });
  
      if (!response.ok) {
        throw new Error("Failed to save playlist schedule");
      }
  
      const data = await response.json();
      if (data.success) {
        toast.success("Playlist schedule saved successfully!");
        setActiveSection("");
        // Reset the schedule settings
        setScheduleSettings({
          deviceTypeId: "",
          playlists: [],
          startDate: "",
          endDate: "",
          startTime: "09:00",
          endTime: "17:00",
          activeDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          exemptDays: []
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error saving playlist schedule:", error);
      toast.error("Failed to save playlist schedule");
    }
  };
  
  const handleUpload = async () => {
    if (files.length === 0) return;
  
    setIsUploading(true);
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
  
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
  
      if (!response.ok) {
        throw new Error('Upload failed');
      }
  
      const data = await response.json();
      if (data.success) {
        toast.success('Files uploaded successfully!');
        setFiles([]);
        setActiveSection('');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  // Add these handler functions
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };
  
  const handleFiles = (files: File[]) => {
    const newModels = files.map(file => ({
      id: generateUniqueId(),
      file,
      preview: URL.createObjectURL(file)
    }));
    
    setModelPreviews(prev => [...prev, ...newModels]);
  };

  const handlePlaylistSort = (type: string) => {
    setSortBy(type);
    const sorted = [...playlists].sort((a, b) => {
      if (type === 'name') return a.name.localeCompare(b.name);
      if (type === 'type') return a.type.localeCompare(b.type);
      return 0;
    });
    setPlaylists(sorted);
  };
  
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const filtered = playlists.filter(playlist => 
      playlist.name.toLowerCase().includes(term.toLowerCase()) ||
      playlist.type.toLowerCase().includes(term.toLowerCase())
    );
    setPlaylists(filtered);
  };
  
  const handleDurationChange = (playlistId: string, duration: number) => {
    setOrderedPlaylists(prev => 
      prev.map(p => p.id === playlistId ? {...p, duration} : p)
    );
  };
  
  const sidebarItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard size={20} />,
    },
    {
      id: 'addDevice',
      label: 'Add Device',
      icon: <PlusCircle size={20} className="text-green-500" />,
    },
    {
      id: 'addDeviceType',
      label: 'Add Device Type',
      icon: <Database size={20} className="text-blue-500" />,
    },
    {
      id: 'configureDevice',
      label: 'Configure Device',
      icon: <Settings size={20} className="text-purple-500" />,
    },
    {
      id: 'showConfiguredDevices',
      label: 'Configured Devices',
      icon: <Database size={20} className="text-orange-500" />,
    },
    {
      id: 'generatePlaylist',
      label: 'Create Playlist',
      icon: <PlayCircle size={20} className="text-green-500" />,
    },
    {
      id: 'showPlaylists',
      label: 'Saved Playlists',
      icon: <ListMusic size={20} className="text-blue-500" />,
    },
    {
      id: 'playlistSetup',
      label: 'Playlist Setup',
      icon: <CgPlayListAdd size={20} className="text-purple-500" />,
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
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:relative z-20 w-64 h-full bg-white shadow-lg transition-transform duration-200 ease-in-out`}
      >
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-800"> Centor Admin...</h1>
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
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
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
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Devices</p>
            <h3 className="text-3xl font-bold text-blue-600 mt-2">{devices.length}</h3>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <Database size={24} className="text-blue-500" />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-500">All registered devices in the system</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Configured Devices</p>
            <h3 className="text-3xl font-bold text-green-600 mt-2">{configuredDevices.length}</h3>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <Settings size={24} className="text-green-500" />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-500">Devices with active configurations</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Total Playlists</p>
            <h3 className="text-3xl font-bold text-purple-600 mt-2">{playlists.length}</h3>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <PlayCircle size={24} className="text-purple-500" />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-500">Active content playlists</p>
        </div>
      </div>
    </div>

    {/* Devices List */}
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold mb-4">All Devices..</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((device) => {
  // Find the matching device type using the 'type' field instead of 'typeId'
  const deviceType = deviceTypes.find(type => type.id === device.type);
  
  return (
    <div key={device.id} className="border rounded-lg p-4 hover:shadow-md transition-all">
      <div className="flex flex-col h-full">
        <div className="relative h-48 mb-3">
          <img
            src={device.imageUrl}
            alt={device.name}
            className="h-[90%] object-fill  rounded-lg"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder-image.jpg";
            }}
          />
        </div>
        <div className="flex-grow">
          <h4 className="font-semibold text-lg mb-2">{device.name}</h4>
          {deviceType && (
            <p className="text-sm text-gray-600 mb-2">
              Type: {deviceType.name}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
          <button
            onClick={() => editDevice(device)}
            className="flex items-center gap-1 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit size={16} />
            Edit
          </button>
          <button
            onClick={() => deleteDevice(device.id)}
            className="flex items-center gap-1 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
})}
      </div>
    </div>
  </div>
)}

          {/* Keep all your existing modal content, but remove the fixed positioning */}
          {activeSection === "addDevice" && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold mb-6">Add New Device</h2>
              <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Device Name
                </label>
                <input
                  value={newDevice.name}
                  onChange={(e) =>
                    setNewDevice({ ...newDevice, name: e.target.value })
                  }
                  placeholder="Enter device name"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Device Image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setNewDevice({
                      ...newDevice,
                      imageFile: e.target.files?.[0] || null,
                    })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {newDevice.imageFile && (
                  <p className="mt-1 text-sm text-gray-500">
                    Selected: {newDevice.imageFile.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Device Type
                </label>
                <select
                  value={newDevice.typeId}
                  onChange={(e) =>
                    setNewDevice({ ...newDevice, typeId: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a type</option>
                  {deviceTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={addDevice}
                disabled={isLoading}
                className={`w-full py-3 rounded-lg ${
                  isLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                } text-white font-semibold transition-colors duration-200 ease-in-out transform hover:scale-105`}
              >
                {isLoading ? "Adding..." : "Add Device"}
              </button>
            </div>
            </div>
          )}

          {/* Do the same for all other sections */}
          {activeSection === "addDeviceType" && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold mb-6">Add Device Type</h2>
              <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Device Type Name
                </label>
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter device type name"
                  value={customDeviceName}
                  onChange={(e) => setCustomDeviceName(e.target.value)}
                />
              </div>

              <button
                onClick={addDeviceType}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg
                          transition-colors duration-200 ease-in-out transform hover:scale-105"
              >
                Add Device Type
              </button>
            </div>
            </div>
          )}

          {activeSection === "configureDevice" && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold mb-6">
              {isEditing ? "Edit Device Configuration" : "Configure New Device"}
              </h2>
              <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Device
                </label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  disabled={isEditing}
                >
                  <option value="">Select a device</option>
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Serial Number
                </label>
                <input
                  type="text"
                  value={deviceDetails.serialNumber || ""}
                  onChange={(e) => handleConfigInputChange("serialNumber", e.target.value)}
                  placeholder="Enter serial number"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Color
                </label>
                <input
                  type="text"
                  value={deviceDetails.color || ""}
                  onChange={(e) => handleConfigInputChange("color", e.target.value)}
                  placeholder="Enter color"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={deviceDetails.description || ""}
                  onChange={(e) => handleConfigInputChange("description", e.target.value)}
                  placeholder="Enter description"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Features (comma-separated)
                </label>
                <input
                  type="text"
                  value={deviceDetails.features?.join(",") || ""}
                  onChange={(e) => handleConfigInputChange("features", e.target.value.split(",").map(item => item.trim()))}
                  placeholder="Enter features"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Hand Movements (comma-separated)
                </label>
                <input
                  type="text"
                  value={deviceDetails.handMovements?.join(",") || ""}
                  onChange={(e) => handleConfigInputChange("handMovements", e.target.value.split(",").map(item => item.trim()))}
                  placeholder="Enter hand movements"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={configureDevice}
                disabled={isLoading || !selectedDevice}
                className={`w-full py-3 rounded-lg ${
                  isLoading || !selectedDevice
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                } text-white font-semibold transition-colors duration-200 ease-in-out transform hover:scale-105`}
              >
                {isLoading 
                  ? "Saving..." 
                  : isEditing 
                    ? "Update Configuration" 
                    : "Save Configuration"}
              </button>
            </div>
            </div>
          )}

          {activeSection === "showConfiguredDevices" && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold mb-6">Configured Devices..</h2>
              {configuredDevices.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No configured devices found</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {configuredDevices.map((device) => (
                  <div key={device.id} className="border rounded-xl p-4 relative hover:shadow-md transition-shadow bg-gray-50">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="md:w-1/4">
                        <div className="h-48 mb-2 overflow-hidden rounded-md bg-gray-100 flex items-center justify-center">
                          <img
                            src={device.imageUrl}
                            alt={device.name}
                            className="object-contain h-full w-full"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder-image.jpg";
                            }}
                          />
                        </div>
                      </div>
                      <div className="md:w-3/4">
                        <h3 className="font-semibold text-xl mb-2">{device.name}</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {device.serialNumber && (
                            <div>
                              <span className="font-semibold">Serial Number:</span> {device.serialNumber}
                            </div>
                          )}
                          
                          {device.color && (
                            <div>
                              <span className="font-semibold">Color:</span> {device.color}
                            </div>
                          )}
                        </div>
                        
                        {device.description && (
                          <div className="mt-2">
                            <span className="font-semibold">Description:</span> {device.description}
                          </div>
                        )}
                        
                        {device.features && device.features.length > 0 && (
                          <div className="mt-2">
                            <span className="font-semibold">Features:</span> {device.features.join(", ")}
                          </div>
                        )}
                        
                        {device.handMovements && device.handMovements.length > 0 && (
                          <div className="mt-2">
                            <span className="font-semibold">Hand Movements:</span> {device.handMovements.join(", ")}
                          </div>
                        )}
                        
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={() => editDevice(device)}
                            className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            <Edit size={16} /> Edit
                          </button>
                          
                          <button
                            onClick={() => deleteDevice(device.id, true)}
                            className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          )}

          {activeSection === "generatePlaylist" && (
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold">Create New Playlist</h2>
              </div>
              
              <div className="p-6">
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* Left Column - Upload Section */}
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Upload Media
        </h3>
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer"
          onClick={() => document.getElementById('media-upload')?.click()}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm font-medium text-gray-600">
            Click to upload or drag and drop
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Supports images, videos, and audio files
          </p>
          <input
            id="media-upload"
            type="file"
            multiple
            hidden
            accept="image/*,video/*,audio/*"
            onChange={handleFileSelection}
          />
        </div>
      </div>
    </div>

    {/* Right Column - Preview Section */}
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="font-semibold text-gray-800 mb-4">Media Preview</h3>
      <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
        {playlist.files.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No files selected yet
          </div>
        ) : (
          playlist.files.map((file: SelectedFile) => (
            <div
              key={file.id}
              className="bg-white rounded-lg shadow-sm p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* File Icon */}
                  <div className="flex-shrink-0">
                    {file.file.type.startsWith('image/') && (
                      <ImageIcon size={20} className="text-blue-500" />
                    )}
                    {file.file.type.startsWith('video/') && (
                      <Video size={20} className="text-green-500" />
                    )}
                    {file.file.type.startsWith('audio/') && (
                      <Music size={20} className="text-purple-500" />
                    )}
                  </div>
                  
                  {/* File Preview */}
                  <div className="flex-grow min-w-0">
                    {file.file.type.startsWith('image/') && (
                      <img
                        src={URL.createObjectURL(file.file)}
                        alt={file.name}
                        className="h-20 w-20 object-cover rounded"
                      />
                    )}
                    {file.file.type.startsWith('video/') && (
                      <video
                        src={URL.createObjectURL(file.file)}
                        className="h-20 w-20 object-cover rounded"
                        controls
                      />
                    )}
                    {file.file.type.startsWith('audio/') && (
                      <audio
                        src={URL.createObjectURL(file.file)}
                        className="max-w-full"
                        controls
                      />
                    )}
                    <p className="mt-1 text-sm text-gray-600 truncate">
                      {file.name}
                    </p>
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleFileDelete(file.id)}
                  className="text-red-500 hover:text-red-700 p-2"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  </div>
</div>
              
              <div className="p-6 border-t bg-gray-50">
                <div className="flex justify-end gap-4">
                  <button 
                    onClick={() => setActiveSection("")}
                    className="px-6 py-2 text-gray-700 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePlaylistCreate}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create Media
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === "showPlaylists" && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold mb-6">Saved Playlists</h2>
              {isLoadingPlaylists ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : playlists.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No playlists found</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {playlists.map((playlist: Playlist) => (
                  <div key={playlist.id ?? playlist.name} className="border rounded-xl p-4 relative hover:shadow-md transition-shadow bg-gray-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {playlist.type === 'image' && <ImageIcon size={20} className="text-blue-500" />}
                          {playlist.type === 'video' && <Video size={20} className="text-green-500" />}
                          {playlist.type === 'audio' && <Music size={20} className="text-purple-500" />}
                          <h3 className="font-semibold text-xl">{playlist.name}</h3>
                        </div>

                        <div className="text-sm text-gray-600">
                          <p>Type: <span className="capitalize">{playlist.type}</span></p>
                          <p>Files: {playlist.files.length}</p>
                          {playlist.backgroundAudio && (
                            <p>Background Audio: Yes</p>
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {playlist.files.map((file: SelectedFile) => (
                            <div
                              key={`${playlist.id}-${file.id}`} // Combining playlist and file ids for uniqueness
                              className="px-3 py-1 bg-white rounded-full text-sm border shadow-sm"
                            >
                              {file.name}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 flex-shrink-0">
                       <button onClick={() => handleEditPlaylist(playlist)}  className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          <Edit size={16} />
                          Edit
                        </button>

                        <button
                          onClick={() => handleDeletePlaylist(playlist.id)}
                          className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          <Trash2 size={16} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          )}

          {activeSection === "playlistSetup" && (
  <div className="bg-white rounded-xl shadow-sm p-6">
    <h2 className="text-2xl font-bold mb-6">Setup Playlist Schedule</h2>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Left Side - Device Type and Device Selection */}
      <div className="md:col-span-1">
        {/* Device Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Device Type
          </label>
          <select 
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={selectedDeviceType}
            onChange={handleDeviceTypeChange}
          >
            <option value="">Select a device type</option>
            {deviceTypes.map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>

        {/* Devices of Selected Type */}
        {selectedDeviceType && (
  <div className="mb-6">
    <label className="block text-sm font-semibold text-gray-700 mb-2">
      Select Device
    </label>
    <div className="space-y-2">
      {configuredDevices
        .filter(device => {
          // Debug logs
          console.log('Filtering device:', device);
          console.log('Device type:', device.type);
          console.log('Selected type:', selectedDeviceType);
          
          // More flexible comparison
          return device.type?.toString() === selectedDeviceType?.toString();
        })
        .map((device) => (
          <button
            key={device.id}
            onClick={() => {
              setSelectedDevice(device.id);
              setActiveSection("generatePlaylist");
            }}
            className={`w-full p-3 border rounded-lg flex items-center gap-3 transition-colors
              ${device.id === selectedDevice 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:bg-gray-50'}`}
          >
            <img 
              src={device.imageUrl || '/placeholder-image.jpg'} 
              alt={device.name}
              className="w-12 h-12 rounded-lg object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder-image.jpg';
              }}
            />
            <div className="text-left">
              <h4 className="font-medium">{device.name}</h4>
              <p className="text-sm text-gray-500">{device.type}</p>
            </div>
          </button>
      ))}
      
      {/* No devices message */}
      {configuredDevices.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          No configured devices available
        </p>
      ) : configuredDevices.filter(device => 
          device.type?.toString() === selectedDeviceType?.toString()
        ).length === 0 && (
        <p className="text-gray-500 text-center py-4">
          No devices found for this type
        </p>
      )}
    </div>
  </div>
)}
      </div>

      {/* Right Side - Media List */}
      <div className="md:col-span-2">
        {selectedDevice ? (
          <>
            <h3 className="text-lg font-semibold mb-4">Available Media</h3>
            {/* Your existing media list code */}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Please select a device type and device first
          </div>
        )}
      </div>
    </div>
  </div>
)}
        </div>
      </div>
    </div>
  );
}
