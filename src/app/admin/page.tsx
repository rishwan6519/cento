"use client";
import { useState, useEffect } from "react";
import { PlusCircle, Database, XCircle, Trash2, PlusCircleIcon, Edit, ImageIcon, Music, Upload, Video, Edit2 } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { FcDataConfiguration } from "react-icons/fc";
import { CgPlayList } from "react-icons/cg";
import { MdPlaylistAddCheckCircle, MdPlaylistAddCircle, MdAudiotrack } from "react-icons/md";

interface DeviceType {
  id: string;
  name: string;
  type: 'robot' | 'other';
}

interface Device {
  id: string;
  name: string;
  imageUrl: string;
  typeId: string;
  serialNumber?: string;
  color?: string;
  description?: string;
  features?: string[];
  handMovements?: string[];
}

// First, add this interface for selected files
interface SelectedFile {
  id: string;
  file: File;
  name: string;
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
    typeId: "",
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

  const fetchDevices = async () => {
    try {
      const response = await fetch("/api/devices");
      if (!response.ok) throw new Error(`Failed to fetch devices: ${response.status}`);
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
      typeId: "",
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
      console.log(data,"data");

      setConfiguredDevices(data.devices);
    } catch (error) {
      console.error("Error fetching configured devices:", error);
      toast.error("Failed to fetch configured devices!");
    }
  };

  // Add this helper function to generate unique IDs
  const generateUniqueId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  // Add this function to handle file selection
  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []).map(file => ({
      id: generateUniqueId(),
      file,
      name: file.name
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

  // Add this function to your RobotAdminDashboard component
  const handlePlaylistCreate = async () => {
    if (!playlist.name || playlist.files.length === 0) {
      toast.error("Please provide a name and at least one file");
      return;
    }
  
    try {
      const formData = new FormData();
      formData.append("name", playlist.name);
      formData.append("type", playlist.type);
  
      // Add all files
      playlist.files.forEach((file) => {
        formData.append("files", file.file);
      });
  
      // Add background audio if present
      if (playlist.backgroundAudio) {
        formData.append("backgroundAudio", playlist.backgroundAudio);
      }
  
      // Determine if this is an update or a new playlist
      const url = isEditing ? `/api/playlist?id=${playlist.id}` : "/api/playlist";
      const method = isEditing ? "PUT" : "POST";
  
      const response = await fetch(url, {
        method,
        body: formData,
      });
  
      if (!response.ok) {
        throw new Error(isEditing ? "Failed to update playlist" : "Failed to create playlist");
      }
  
      const data = await response.json();
      if (data.success) {
        toast.success(isEditing ? "Playlist updated successfully!" : "Playlist created successfully!");
        setActiveSection("");
  
        // Reset form
        setPlaylist({
          name: "",
          type: "image",
          files: [],
          backgroundAudio: undefined,
          volume: {
            main: 100,
            background: 50,
          },
        });
        setIsEditing(false); // Reset editing state
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error(isEditing ? "Error updating playlist:" : "Error creating playlist:", error);
      toast.error(isEditing ? "Failed to update playlist" : "Failed to create playlist");
    }
  };
  

  // Add this function to fetch playlists
  const fetchPlaylists = async () => {
    setIsLoadingPlaylists(true);
    try {
      const response = await fetch('/api/playlist');
      if (!response.ok) throw new Error('Failed to fetch playlists');
      
      const data = await response.json();
      console.log('Fetched playlists:', data.playlists); // Add this for debugging
      setPlaylists(data.playlists || []);
    } catch (error) {
      console.error('Error fetching playlists:', error);
      toast.error('Failed to fetch playlists');
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
  const handleDeviceTypeChange = (typeId: string) => {
    setSelectedDeviceType(typeId);
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
  

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Toaster />
      <h1 className="text-center text-4xl font-bold text-gray-800 mb-8">
        🤖 Robot Admin Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="col-span-2">
          <h2 className="text-lg text-center font-semibold mt-2">Total Devices</h2>
          <p className="text-2xl font-bold text-center text-blue-500">{devices.length}</p>
        </div>
        
        <div
          className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
          onClick={() => setActiveSection("addDevice")}
        >
          <PlusCircle size={40} className="text-green-500 mx-auto" />
          <h2 className="text-lg text-center font-semibold mt-2">Add Device</h2>
        </div>

        <div
          className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
          onClick={() => setActiveSection("addDeviceType")}
        >
          <PlusCircleIcon size={40} className="text-blue-500 mx-auto" />
          <h2 className="text-lg text-center font-semibold mt-2">Add Device Type</h2>
        </div>

        <div
          className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
          onClick={() => setActiveSection("configureDevice")}
        >
          <FcDataConfiguration size={40} className="mx-auto" />
          <h2 className="text-lg text-center font-semibold mt-2">Configure Device</h2>
        </div>

        <div
          className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
          onClick={() => setActiveSection("showConfiguredDevices")}
        >
          <FcDataConfiguration size={40} className="mx-auto" />
          <h2 className="text-lg text-center font-semibold mt-2">Show Configured Devices</h2>
        </div>

        {/* // Add this new section for playlist generation */}

        <div
          className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
          onClick={() => setActiveSection("playlistSetup")}
        >
          <MdPlaylistAddCircle  size={40} className="mx-auto" />
          <h2 className="text-lg text-center font-semibold mt-2">Playlist Setup</h2>
        </div>


        {/* // Add this new section for playlist generation */}

        <div
          className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
          onClick={() => setActiveSection("generatePlaylist")}
        >
          <CgPlayList size={40} className="mx-auto" />
          <h2 className="text-lg text-center font-semibold mt-2">Playlist Genration</h2>
        </div>

        {/* Add this in your grid of buttons */}
        <div
          className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
          onClick={() => setActiveSection("showPlaylists")}
        >
          <MdPlaylistAddCheckCircle size={40} className="mx-auto" />
          <h2 className="text-lg text-center font-semibold mt-2">Show Saved Playlists</h2>
        </div>
      </div>

      {/* Device List */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Device List</h2>
        
        {devices.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No devices added yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((device) => (
              <div key={device.id} className="border rounded-xl p-4 relative hover:shadow-md transition-shadow">
                <button
                  onClick={() => deleteDevice(device.id)}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                  title="Delete device"
                >
                  <Trash2 size={20} />
                </button>
                
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
                <h3 className="font-semibold text-center">{device.name}</h3>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Device Modal */}
      {activeSection === "addDevice" && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={() => setActiveSection("")}
        >
          <div
            className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={() => setActiveSection("")}
            >
              <XCircle size={24} />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-gray-800">Add New Device</h2>
            
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
        </div>
      )}

      {/* Add Device Type Modal */}
      {activeSection === "addDeviceType" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={() => setActiveSection("")}
            >
              <XCircle size={24} />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-gray-800">Add Device Type</h2>

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
        </div>
      )}

      {/* Configure Device Modal */}
      {activeSection === "configureDevice" && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={() => {
            setActiveSection("");
            setIsEditing(false);
          }}
        >
          <div
            className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md relative overflow-y-auto max-h-screen"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={() => {
                setActiveSection("");
                setIsEditing(false);
              }}
            >
              <XCircle size={24} />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-gray-800">
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
        </div>
      )}

      {/* Show Configured Devices Modal */}
      {activeSection === "showConfiguredDevices" && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={() => setActiveSection("")}
        >
          <div
            className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-4xl relative overflow-y-auto max-h-screen"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={() => setActiveSection("")}
            >
              <XCircle size={24} />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-gray-800">Configured Devices</h2>
            
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
        </div>
      )}

      {/* Playlist Generation Modal */}
      {activeSection === "generatePlaylist" && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4 overflow-y-auto"
          onClick={() => setActiveSection("")}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl relative my-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-6 border-b">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                onClick={() => setActiveSection("")}
              >
                <XCircle size={24} />
              </button>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Create New Playlist</h2>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6">
              {/* Left Column - Playlist Details */}
              <div className="space-y-4 sm:space-y-6">
                {/* Playlist Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Playlist Name
                  </label>
                  <input
                    type="text"
                    value={playlist.name}
                    onChange={(e) => setPlaylist({ ...playlist, name: e.target.value })}
                    placeholder="Enter playlist name"
                    className="w-full p-2 sm:p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Playlist Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Playlist Type
                  </label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    {['image', 'video', 'audio'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setPlaylist({
                          ...playlist,
                          type: type as 'image' | 'video' | 'audio',
                          files: [],
                          backgroundAudio: undefined
                        })}
                        className={`p-2 sm:p-4 rounded-lg border-2 transition-all ${
                          playlist.type === type
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1 sm:gap-2">
                          {type === 'image' && <ImageIcon size={20} className="text-blue-500" />}
                          {type === 'video' && <Video size={20} className="text-green-500" />}
                          {type === 'audio' && <Music size={20} className="text-purple-500" />}
                          <span className="text-xs sm:text-sm capitalize">{type}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* File Upload */}
                <div className="flex flex-col gap-4">
                  <label className="block text-sm font-semibold text-gray-700">
                    Upload {playlist.type === 'image' ? 'Images' : 
                           playlist.type === 'video' ? 'Videos' : 'Audio Files'}
                  </label>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center hover:border-blue-500 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <Upload className="mx-auto h-8 sm:h-12 w-8 sm:w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Click to upload or drag and drop
                    </p>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      hidden
                      accept={playlist.type === 'image' ? 'image/*' :
                              playlist.type === 'video' ? 'video/*' :
                              'audio/*'}
                      onChange={handleFileSelection}
                    />
                  </div>
                </div>

                {/* Background Audio Section */}
                <div className="flex flex-col gap-4">
                  <label className="block text-sm font-semibold text-gray-700">
                    Background Audio {playlist.type === 'audio' ? '(Mix)' : '(Optional)'}
                  </label>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-4 text-center hover:border-blue-500 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('audio-upload')?.click()}
                  >
                    <Music className="mx-auto h-6 sm:h-8 w-6 sm:w-8 text-gray-400" />
                    <p className="mt-1 text-xs sm:text-sm text-gray-600">
                      {playlist.type === 'audio' ? 'Add background mix' : 'Add background music'}
                    </p>
                    <input
                      id="audio-upload"
                      type="file"
                      hidden
                      accept="audio/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setPlaylist({ ...playlist, backgroundAudio: file });
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column - Selected Files Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-4">Selected Files</h3>
                <div className="space-y-2 max-h-[calc(100vh-400px)] overflow-y-auto">
                  {playlist.files.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No files selected yet
                    </div>
                  ) : (
                    playlist.files.map((file: SelectedFile) => (
                      <div
                        key={file.id} // Using the unique id from SelectedFile interface
                        className="flex items-center justify-between p-2 sm:p-3 bg-white rounded-lg shadow-sm"
                      >
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          {/* File Icon */}
                          <div className="flex-shrink-0">
                            {playlist.type === 'image' && <ImageIcon size={18} className="text-blue-500" />}
                            {playlist.type === 'video' && <Video size={18} className="text-green-500" />}
                            {playlist.type === 'audio' && <Music size={18} className="text-purple-500" />}
                          </div>
                          {/* File Details */}
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm truncate max-w-[150px] sm:max-w-[200px]">
                              {file.name}
                            </span>
                            {(playlist.type === 'audio' || playlist.type === 'video') && (
                              <span className="text-xs text-gray-500">
                                Volume: {playlist.volume.main}%
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleFileDelete(file.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Volume Controls */}
                {(playlist.files.length > 0 || playlist.backgroundAudio) && (
                  <div className="mt-4 space-y-4 p-3 bg-white rounded-lg">
                    {playlist.files.length > 0 && (
                      <div>
                        <label className="block text-xs sm:text-sm text-gray-600 mb-1">
                          Main Volume
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={playlist.volume.main}
                            onChange={(e) => setPlaylist({
                              ...playlist,
                              volume: {
                                ...playlist.volume,
                                main: Number(e.target.value)
                              }
                            })}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-xs sm:text-sm text-gray-600 w-12">
                            {playlist.volume.main}%
                          </span>
                        </div>
                      </div>
                    )}

                    {playlist.backgroundAudio && (
                      <div>
                        <label className="block text-xs sm:text-sm text-gray-600 mb-1">
                          Background Volume
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={playlist.volume.background}
                            onChange={(e) => setPlaylist({
                              ...playlist,
                              volume: {
                                ...playlist.volume,
                                background: Number(e.target.value)
                              }
                            })}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-xs sm:text-sm text-gray-600 w-12">
                            {playlist.volume.background}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t p-4 sm:p-6 flex justify-end gap-3 sm:gap-4">
              <button
                onClick={() => setActiveSection("")}
                className="px-3 sm:px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handlePlaylistCreate}
                disabled={!playlist.name || playlist.files.length === 0}
                className={`px-4 sm:px-6 py-2 rounded-lg text-sm ${
                  !playlist.name || playlist.files.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white font-semibold transition-colors`}
              >
                Create Playlist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show Saved Playlists Modal */}
      {activeSection === "showPlaylists" && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={() => setActiveSection("")}
        >
          <div
            className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-4xl relative overflow-y-auto max-h-screen"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={() => setActiveSection("")}
            >
              <XCircle size={24} />
            </button>

            <h2 className="text-2xl font-bold mb-6 text-gray-800">Saved Playlists</h2>

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
        </div>
      )}


         {/* Playlist Setup Modal */}
{activeSection === "playlistSetup" && (
  <div
    className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"
    onClick={() => setActiveSection("")}
  >
    <div
      className="bg-white rounded-xl shadow-2xl w-full max-w-4xl relative max-h-[90vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="p-6 border-b sticky top-0 bg-white z-10">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          onClick={() => setActiveSection("")}
        >
          <XCircle size={24} />
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Setup Playlist Schedule</h2>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Device Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select Device Type
          </label>
          <select 
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={scheduleSettings.deviceTypeId}
            onChange={(e) => setScheduleSettings(prev => ({
              ...prev,
              deviceTypeId: e.target.value
            }))}
          >
            <option value="">Select a device type</option>
            {deviceTypes.map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>

        {/* Date Range Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Schedule Duration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={scheduleSettings.startDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setScheduleSettings(prev => ({
                  ...prev,
                  startDate: e.target.value
                }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={scheduleSettings.endDate}
                min={scheduleSettings.startDate}
                onChange={(e) => setScheduleSettings(prev => ({
                  ...prev,
                  endDate: e.target.value
                }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Time Range Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Daily Time Range</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={scheduleSettings.startTime}
                onChange={(e) => setScheduleSettings(prev => ({
                  ...prev,
                  startTime: e.target.value
                }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                End Time
              </label>
              <input
                type="time"
                value={scheduleSettings.endTime}
                onChange={(e) => setScheduleSettings(prev => ({
                  ...prev,
                  endTime: e.target.value
                }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Active Days Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Active Days</h3>
          <div className="flex flex-wrap gap-2">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
              <button
                key={day}
                onClick={() => {
                  setScheduleSettings(prev => ({
                    ...prev,
                    activeDays: prev.activeDays.includes(day)
                      ? prev.activeDays.filter(d => d !== day)
                      : [...prev.activeDays, day]
                  }))
                }}
                className={`px-4 py-2 rounded-full ${
                  scheduleSettings.activeDays.includes(day)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Exempt Days */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Exemption Days</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <input
                type="date"
                min={scheduleSettings.startDate}
                max={scheduleSettings.endDate}
                onChange={(e) => {
                  if (e.target.value) {
                    setScheduleSettings(prev => ({
                      ...prev,
                      exemptDays: [...new Set([...prev.exemptDays, e.target.value])]
                    }))
                  }
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {/* Display selected exempt days */}
          <div className="mt-4 flex flex-wrap gap-2">
            {scheduleSettings.exemptDays.map((date) => (
              <div key={date} className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full">
                <span>{new Date(date).toLocaleDateString()}</span>
                <button
                  onClick={() => setScheduleSettings(prev => ({
                    ...prev,
                    exemptDays: prev.exemptDays.filter(d => d !== date)
                  }))}
                  className="text-red-500 hover:text-red-700"
                >
                  <XCircle size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Playlist Selection with Duration */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Select Playlists & Duration</h3>
          {isLoadingPlaylists ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : playlists.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No playlists found</p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {playlists.map((playlist: Playlist) => (
                <div 
                  key={playlist.id}
                  className={`p-4 border rounded-lg transition-all ${
                    scheduleSettings.playlists.some(p => p.playlistId === playlist.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={scheduleSettings.playlists.some(p => p.playlistId === playlist.id)}
                        onChange={() => {
                          setScheduleSettings(prev => {
                            const isSelected = prev.playlists.some(p => p.playlistId === playlist.id);
                            return {
                              ...prev,
                              playlists: isSelected
                                ? prev.playlists.filter(p => p.playlistId !== playlist.id)
                                : [...prev.playlists, { playlistId: playlist.id || '', duration: 30 }]
                            };
                          });
                        }}
                        className="w-5 h-5 rounded border-gray-300"
                      />
                      <div>
                        <h4 className="font-medium">{playlist.name}</h4>
                        <p className="text-sm text-gray-500 capitalize">{playlist.type}</p>
                      </div>
                    </div>
                    {scheduleSettings.playlists.some(p => p.playlistId === playlist.id) && (
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Duration (minutes):</label>
                        <input
                          type="number"
                          min="1"
                          value={scheduleSettings.playlists.find(p => p.playlistId === playlist.id)?.duration || 30}
                          onChange={(e) => {
                            setScheduleSettings(prev => ({
                              ...prev,
                              playlists: prev.playlists.map(p => 
                                p.playlistId === playlist.id
                                  ? { ...p, duration: parseInt(e.target.value) || 30 }
                                  : p
                              )
                            }));
                          }}
                          className="w-20 p-1 border rounded"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-6 sticky bottom-0 bg-white">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {scheduleSettings.playlists.length} playlist(s) selected
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setActiveSection("")}
              className="px-6 py-2 text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handlePlaylistSetup}
              disabled={!scheduleSettings.deviceTypeId || scheduleSettings.playlists.length === 0}
              className={`px-6 py-2 rounded-lg ${
                !scheduleSettings.deviceTypeId || scheduleSettings.playlists.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white font-semibold`}
            >
              Save Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
      
       
    </div>
  );
}