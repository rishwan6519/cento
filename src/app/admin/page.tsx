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
  url?: string;
  file: File; // Add this property
}

// First, update the Playlist interface
interface Playlist {
  _id?: string; // Make it clear that id is optional
  name: string;
  type: string;
  url?: string;
  files: SelectedFile[];
  backgroundAudio?: File;
  volume: {
    main: number;
    background: number;
  };
  createdAt?: string;
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

// Add these interfaces at the top of your file with other interfaces
interface PlaylistConfigFile {
  path: string;
  name: string;
  type: string;
  displayOrder: number;
  delay: number;
  backgroundImageEnabled?: boolean;
  backgroundImage?: string | File | null; // Update this to allow both string and File types
}

interface PlaylistConfiguration {
  id: string;
  name: string;
  type: string;
  serialNumber: string;
  startTime: string;
  endTime: string;
  files: PlaylistConfigFile[];
  backgroundAudio: {
    enabled: boolean;
    file: string | null;
    volume: number;
  };
}

// Add to your interfaces at the top
interface EditablePlaylist {
  id?: string;
  name: string;
  type: string;
  files: {
    id: string;
    name: string;
    type: string;
    url?: string;
    file?: File;
  }[];
  volume: {
    main: number;
    background: number;
  };
  backgroundAudio?: {
    enabled: boolean;
    file: string | null;
    volume: number;
  };
}

export default function RobotAdminDashboard() {
  const [customDeviceName, setCustomDeviceName] = useState<string>("");
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

  // Update the playlist state
  const [playlist, setPlaylist] = useState<Playlist>({
    name: "",
    type: "image",
    files: [],
    backgroundAudio: undefined,
    volume: {
      main: 100,
      background: 50,
    },
  });

  // Update the component state with these new variables
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editedPlaylist, setEditedPlaylist] = useState<EditablePlaylist | null>(
    null
  );

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
    activeDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    exemptDays: [],
  });

  // Add this new state for managing playlist durations
  const [playlistDurations, setPlaylistDurations] = useState<{
    [key: string]: number;
  }>({});

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

  // Add this new state at the beginning of your component
  const [playingMedia, setPlayingMedia] = useState<string | null>(null);

  // Add these state variables at the top of your component
  const [setupStep, setSetupStep] = useState(1);
  const [selectedDeviceConfig, setSelectedDeviceConfig] = useState<any>(null);
  const [playlistConfig, setPlaylistConfig] = useState<PlaylistConfiguration>({
    id: "",
    name: "",
    type: "mixed",
    serialNumber: "",
    startTime: "00:00:00",
    endTime: "00:10:00",
    files: [] as PlaylistConfigFile[],
    backgroundAudio: {
      enabled: false,
      file: null,
      volume: 50,
    },
  });

  // Add this state at the top of your component
  const [showBgImageInput, setShowBgImageInput] = useState<{
    [key: string]: boolean;
  }>({});
  const [bgImages, setBgImages] = useState<{ [key: string]: File }>({});

  // Add this state at the beginning of your component
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [deviceTypeImage, setDeviceTypeImage] = useState<File | null>(null);

  const [handMovements, setHandMovements] = useState<string>("");
  const [bodyMovements, setBodyMovements] = useState<string>("");
  const [screenWidth, setScreenWidth] = useState<string>("");
  const [screenHeight, setScreenHeight] = useState<string>("");


const [selectedDeviceForPlaylist, setSelectedDeviceForPlaylist] = useState<Device | null>(null);
const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
const [connectStep, setConnectStep] = useState<number>(1);
const [selectedPlaylistsForDevice, setSelectedPlaylistsForDevice] = useState<string[]>([]);

  // Add this function to handle day selection
  const toggleDay = (day: string) => {
    setScheduleSettings((prev) => ({
      ...prev,
    }));
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

  useEffect(() => {
    if (activeSection === "showPlaylists") {
      fetchPlaylists();
    }
  }, [activeSection]);

  // Add this useEffect in your component, alongside other useEffect hooks
  useEffect(() => {
    if (activeSection === "playlistSetup") {
      fetchMedia(); // Fetch media files when entering playlist setup
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


  useEffect(() => {
    if (activeSection === 'connectPlaylist') {
      fetchAvailableDevices();
      fetchPlaylists();
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

  const addDeviceType = async () => {
    if (
      !customDeviceName ||
      !deviceTypeImage ||
      !handMovements ||
      !bodyMovements ||
      !screenWidth ||
      !screenHeight
    ) {
      toast.error("Please fill in all required fields!");
      return;
    }

    setIsLoading(true);

    try {
      // First upload the image
      const formData = new FormData();
      formData.append("file", deviceTypeImage);

      const imageUploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!imageUploadResponse.ok) {
        throw new Error("Failed to upload image");
      }

      const imageData = await imageUploadResponse.json();
      const imageUrl = imageData.url;

      // Then create the device type
      const response = await fetch("/api/device-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customDeviceName,
          imageUrl: imageUrl,
          handMovements: handMovements.split(",").map((m) => m.trim()),
          bodyMovements: bodyMovements.split(",").map((m) => m.trim()),
          screenSize: {
            width: parseInt(screenWidth),
            height: parseInt(screenHeight),
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add device type");
      }

      const newType = await response.json();
      toast.success("Device type added successfully!");

      // Reset form
      setCustomDeviceName("");
      setDeviceTypeImage(null);
      setHandMovements("");
      setBodyMovements("");
      setScreenWidth("");
      setScreenHeight("");

      // Update device types list
      setDeviceTypes((prev) => [...prev, newType]);
    } catch (error) {
      console.error("Error adding device type:", error);
      toast.error("Failed to add device type!");
    } finally {
      setIsLoading(false);
    }
  };

  // Add this helper function to generate unique IDs
  const generateUniqueId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  // Update the handleFileSelection function
  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isEditing && editedPlaylist) {
      const newFiles = Array.from(e.target.files || []).map((file) => ({
        id: generateUniqueId(),
        name: file.name,
        file: file,
      }));

      setEditedPlaylist({
        ...editedPlaylist,
        files: [...editedPlaylist.files, ...newFiles],
      });
    } else {
      const newFiles = Array.from(e.target.files || []).map((file) => ({
        id: generateUniqueId(),
        name: file.name,
        file: file,
      }));

      setPlaylist((prev) => ({
        ...prev,
        files: [...prev.files, ...newFiles],
      }));
    }
  };

  // Add this function to handle file deletion
  const handleFileDelete = (id: string) => {
    setPlaylist((prev) => ({
      ...prev,
      files: prev.files.filter((file) => file.id !== id),
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
    const loadingToast = toast.loading("Creating playlist...");

    try {
      const formData = new FormData();

      // Add all files from playlist
      playlist.files.forEach((file) => {
        formData.append("files", file.file);
        formData.append("fileNames", file.name);
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
      toast.success("Media uploaded successfully!", {
        id: loadingToast,
      });

      // Reset the form
      setPlaylist((prev) => ({
        ...prev,
        files: [],
      }));
      setActiveSection("");

      // Refresh playlists if needed
      fetchPlaylists();
    } catch (error) {
      // Update error toast
      toast.error(
        error instanceof Error ? error.message : "Failed to upload media",
        {
          id: loadingToast,
        }
      );
      console.error("Error uploading media:", error);
    }
  };

  // Update the fetchPlaylists function in page.tsx

  // Add these functions to your component
  const handleEditPlaylist = async (playlist: EditablePlaylist) => {
    try {
      const response = await fetch(`/api/playlist/${playlist.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: playlist.id,
          name: playlist.name,
          type: playlist.type,
          files: playlist.files,
          volume: playlist.volume,
          backgroundAudio: playlist.backgroundAudio
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update playlist');
      }

      toast.success('Playlist updated successfully');
      fetchPlaylists(); // Refresh the list
    } catch (error) {
      console.error('Error updating playlist:', error);
      toast.error('Failed to update playlist');
    }
  };

  // Update handleEditPlaylist function
  const handleEditPlaylistOld = async (playlist: Playlist) => {
    try {
      const response = await fetch(`/api/playlist`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: playlist.id,
          name: playlist.name,
          type: playlist.type,
          files: playlist.files,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update playlist");
      }

      toast.success("Playlist updated successfully");
      fetchPlaylists(); // Refresh the list
    } catch (error) {
      console.error("Error updating playlist:", error);
      toast.error("Failed to update playlist");
    }
  };

  // Update the edit button click handler
  const handleEditClick = (e: React.MouseEvent, playlist: Playlist) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditedPlaylist({
      id: playlist._id,
      name: playlist.name,
      type: playlist.type,
      files: playlist.files.map(file => ({
        id: generateUniqueId(),
        name: file.name,
        type: file.file?.type || getFileType(file.name),
        url: file.url,
        file: file.file
      })),
      volume: {
        main: playlist.volume?.main || 100,
        background: playlist.volume?.background || 50
      },
      backgroundAudio: playlist.backgroundAudio || {
        enabled: false,
        file: null,
        volume: 50
      }
    });
  };

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
        body: JSON.stringify(scheduleSettings),
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
          activeDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          exemptDays: [],
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
    const newModels = files.map((file) => ({
      id: generateUniqueId(),
      file,
      preview: URL.createObjectURL(file),
    }));

    setModelPreviews((prev) => [...prev, ...newModels]);
  };

  const handlePlaylistSort = (type: string) => {
    setSortBy(type);
    const sorted = [...playlists].sort((a, b) => {
      if (type === "name") return a.name.localeCompare(b.name);
      if (type === "type") return a.type.localeCompare(b.type);
      return 0;
    });
    setPlaylists(sorted);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const filtered = playlists.filter(
      (playlist) =>
        playlist.name.toLowerCase().includes(term.toLowerCase()) ||
        playlist.type.toLowerCase().includes(term.toLowerCase())
    );
    setPlaylists(filtered);
  };

  const handleDurationChange = (playlistId: string, duration: number) => {
    setOrderedPlaylists((prev) =>
      prev.map((p) => (p._id === playlistId ? { ...p, duration } : p))
    );
  };

  // Add this new function to handle play/pause
  const handlePlayPause = (mediaId: string, mediaElement: HTMLMediaElement) => {
    if (playingMedia === mediaId) {
      mediaElement.pause();
      setPlayingMedia(null);
    } else {
      // Pause any currently playing media
      const currentlyPlaying =
        document.querySelector<HTMLMediaElement>(".media-playing");
      if (currentlyPlaying) {
        currentlyPlaying.pause();
        currentlyPlaying.classList.remove("media-playing");
      }
      mediaElement.play();
      mediaElement.classList.add("media-playing");
      setPlayingMedia(mediaId);
    }
  };

  // Update the handleSavePlaylistConfig function to properly handle FormData
  const handleSavePlaylistConfig = async () => {
    if (!playlistConfig.name || playlistConfig.files.length === 0) {
      toast.error("Please add a name and at least one file");
      return;
    }

    setIsLoading(true);

    try {
      const configToSend = {
        name: playlistConfig.name,
        type: "mixed",
        startTime: playlistConfig.startTime || "00:00:00",
        endTime: playlistConfig.endTime || "00:10:00",
        files: playlistConfig.files.map((file, index) => ({
          name: file.name,
          path: file.path,
          type: file.type,
          displayOrder: index + 1,
          delay: file.delay || 0,
          backgroundImageEnabled: file.backgroundImageEnabled || false,
          backgroundImage: file.backgroundImage || null,
        })),
        backgroundAudio: {
          enabled: playlistConfig.backgroundAudio?.enabled || false,
          file: playlistConfig.backgroundAudio?.file || null,
          volume: playlistConfig.backgroundAudio?.volume || 50,
        },
      };

      const formData = new FormData();
      formData.append("config", JSON.stringify(configToSend));

      const response = await fetch("/api/playlist-config", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save playlist");
      }

      toast.success("Playlist saved successfully");
      setActiveSection("showPlaylists");
      fetchPlaylists(); // Refresh the playlists list
    } catch (error) {
      console.error("Error saving playlist:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save playlist"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Update the openBgImageSelector function
  const openBgImageSelector = (audioPath: string) => {
    const imageFiles = playlists.filter(
      (media) =>
        media.type?.toLowerCase().includes("image") ||
        media.type?.startsWith("image/")
    );

    const input = document.createElement("div");
    input.className = "fixed inset-0 z-50 flex items-center justify-center";
    input.innerHTML = `
    <div class="fixed inset-0 bg-white bg-opacity-30"></div>
    <div class="relative bg-black rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto m-4">
      <div class="flex justify-between items-center mb-6">
        <h3 class="text-lg font-semibold text-gray-900">Select Background Image</h3>
        <button onclick="closeBgImageSelector()" class="text-red-500 hover:text-gray-700">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      ${
        mediaFiles.length > 0
          ? `
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4" id="bgImageGrid ">
          ${mediaFiles
            .map(
              (image) => `
            <div class="aspect-square relative group cursor-pointer hover:opacity-90 bg-white rounded-lg overflow-hidden " 
                 data-image-url="${image.url}"
                 onclick="selectBgImage('${audioPath}', '${image.url}')">
              <img src="${image.url}" 
                   alt="${image.name}"
                   loading="lazy"
                   class="w-full h-full object-cover"/>
              <div class="absolute inset-0 flex items-center justify-cente p-5 bg-opacity-0 group-hover:bg-opacity-20 transition-all">
                <span class="text-sm font-medium text-white opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 px-3 py-1 rounded-full">
                  Select
                </span>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      `
          : `
        <div class="text-center py-8">
          <p class="text-gray-500">No images available. Please upload some images first.</p>
        </div>
      `
      }
      
      <div class="flex justify-end mt-6 pt-4 border-t">
        <button 
          onclick="closeBgImageSelector()" 
          class="px-4 py-2 text-sm font-medium text-cyan-50 hover:text-gray-900"
        >
          Cancel
        </button>
      </div>
    </div>
  `;

    document.body.appendChild(input);

    // Add the selection handler to window
    (window as any).selectBgImage = (audioPath: string, imageUrl: string) => {
      const updatedFiles = playlistConfig.files.map((f) => {
        if (f.path === audioPath) {
          return {
            ...f,
            backgroundImageEnabled: true,
            backgroundImage: imageUrl,
          } as PlaylistConfigFile;
        }
        return f;
      });
      setPlaylistConfig({
        ...playlistConfig,
        files: updatedFiles,
      });
      document.body.removeChild(input);
    };

    // Add the close handler to window
    (window as any).closeBgImageSelector = () => {
      document.body.removeChild(input);
    };
  };

  // Add these functions to your component
const fetchAvailableDevices = async () => {
  try {
    const response = await fetch('/api/devices');
    if (!response.ok) throw new Error('Failed to fetch devices');
    const data = await response.json();
    setAvailableDevices(data);
  } catch (error) {
    console.error('Error fetching devices:', error);
    toast.error('Failed to fetch devices');
  }
};

const handleConnectPlaylistToDevice = async () => {
 
  if (!selectedDeviceForPlaylist?._id) {
    toast.error('Please select a device');
    return;
  }

  if (selectedPlaylistsForDevice.length === 0) {
    toast.error('Please select at least one playlist');
    return;
  }

  console.log(selectedPlaylistsForDevice)

  // Filter out any empty strings or invalid IDs
  const validPlaylistIds = selectedPlaylistsForDevice.filter(id => id && id.trim() !== '');

  if (validPlaylistIds.length === 0) {
    toast.error('No valid playlists selected');
    return;
  }

  try {
    const response = await fetch('/api/device-playlists', {

      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceId: selectedDeviceForPlaylist._id,
        playlistIds: validPlaylistIds
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to connect playlists');
    }

    toast.success('Playlists connected successfully');
    setActiveSection('');
    setConnectStep(1);
    setSelectedDeviceForPlaylist(null);
    setSelectedPlaylistsForDevice([]);
  } catch (error) {
    console.error('Error connecting playlists:', error);
    toast.error(error instanceof Error ? error.message : 'Failed to connect playlists');
  }
};

  // Update the handleDeletePlaylistWithFiles function


  const handleDeletePlaylistWithFiles = async (
    playlistId: string | undefined
  ) => {
    if (!playlistId) {
      toast.error("Invalid playlist ID");
      return;
    }

    if (
      !confirm("Are you sure you want to delete this playlist and its files?")
    ) {
      return;
    }

    try {
      // Add proper headers and use URLSearchParams
      const params = new URLSearchParams({ id: playlistId });
      const response = await fetch(`/api/playlist?${params.toString()}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      console.log("Delete response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete playlist");
      }

      if (data.success) {
        toast.success("Playlist deleted successfully");
        // Refresh the playlists list
        await fetchPlaylists();
      } else {
        throw new Error(data.error || "Failed to delete playlist");
      }
    } catch (error) {
      console.error("Error deleting playlist:", error);
      toast.error("Failed to delete playlist");
    }
  };

  // Add this function with your other functions
  const fetchMedia = async () => {
    setIsLoadingMedia(true);
    try {
      const response = await fetch("/api/media");
      if (!response.ok) throw new Error("Failed to fetch media");

      const data = await response.json();
      if (data.media) {
        setMediaFiles(data.media);
      }
    } catch (error) {
      console.error("Error fetching media:", error);
      toast.error("Failed to fetch media");
      setMediaFiles([]);
    } finally {
      setIsLoadingMedia(false);
    }
  };


  console.log(availableDevices,"avaible devivds")

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
      label: "Create Playlist",
      icon: <PlayCircle size={20} className="text-green-500" />,
    },
    {
      id: "showMedia", // changed from 'showPlaylists'
      label: "Show Mediass",
      icon: <CgPlayList size={20} className="text-indigo-500" />,
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

          {/* Keep all your existing modal content, but remove the fixed positioning */}

          {activeSection === "addDeviceType" && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold mb-6 text-black">
                Add New Device Type
              </h2>
              <div className="space-y-6">
                {/* Device Type Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Device Type Name
                  </label>
                  <input
                    value={customDeviceName}
                    onChange={(e) => setCustomDeviceName(e.target.value)}
                    placeholder="Enter device type name"
                    className="w-full p-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Hand Movements */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Hand Movements
                  </label>
                  <input
                    value={handMovements}
                    onChange={(e) => setHandMovements(e.target.value)}
                    placeholder="Enter hand movements (comma-separated)"
                    className="w-full p-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Example: wave, grab, point
                  </p>
                </div>

                {/* Body Movements */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Body Movements
                  </label>
                  <input
                    value={bodyMovements}
                    onChange={(e) => setBodyMovements(e.target.value)}
                    placeholder="Enter body movements (comma-separated)"
                    className="w-full p-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Example: walk, turn, dance
                  </p>
                </div>

                {/* Screen Size */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Screen Size
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        type="number"
                        value={screenWidth}
                        onChange={(e) => setScreenWidth(e.target.value)}
                        placeholder="Width (px)"
                        className="w-full p-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={screenHeight}
                        onChange={(e) => setScreenHeight(e.target.value)}
                        placeholder="Height (px)"
                        className="w-full p-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Device Type Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setDeviceTypeImage(e.target.files?.[0] || null)
                    }
                    className="w-full p-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={addDeviceType}
                  disabled={
                    isLoading ||
                    !customDeviceName ||
                    !deviceTypeImage ||
                    !handMovements ||
                    !bodyMovements ||
                    !screenWidth ||
                    !screenHeight
                  }
                  className={`w-full py-3 rounded-lg ${
                    isLoading ||
                    !customDeviceName ||
                    !deviceTypeImage ||
                    !handMovements ||
                    !bodyMovements ||
                    !screenWidth ||
                    !screenHeight
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  } text-white font-semibold transition-colors`}
                >
                  {isLoading ? "Adding..." : "Add Device Type"}
                </button>
              </div>
            </div>
          )}
          {activeSection === "addDevice" && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-2xl font-bold mb-6 text-black">
                Add New Device
              </h2>

              {/* Step 1: Device Type Selection */}
              {!newDevice.typeId && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-700">
                    Step 1: Select Device Type
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {deviceTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() =>
                          setNewDevice({ ...newDevice, typeId: type.id })
                        }
                        className="relative group p-4 border rounded-lg hover:border-blue-500 transition-all text-left"
                      >
                        {type.imageUrl && (
                          <div className="mb-4 aspect-square rounded-lg overflow-hidden bg-gray-100">
                            <img
                              src={type.imageUrl}
                              alt={type.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                        )}
                        <h4 className="font-medium text-gray-800">
                          {type.name}
                        </h4>
                        {type.description && (
                          <p className="text-sm text-gray-500 mt-1">
                            {type.description}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Device Details Form */}
              {newDevice.typeId && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={() =>
                        setNewDevice({
                          name: "",
                          typeId: "",
                          serialNumber: "",
                          color: "",
                        })
                      }
                      className="text-blue-500 hover:text-blue-600 flex items-center gap-1"
                    >
                      <ArrowLeft size={20} />
                      <span>Back to Device Types</span>
                    </button>
                  </div>

                  <div className="flex gap-6">
                    {/* Selected Type Preview */}
                    <div className="w-1/3">
                      {deviceTypes.find((t) => t.id === newDevice.typeId)
                        ?.imageUrl && (
                        <div className="rounded-lg overflow-hidden bg-gray-100">
                          <img
                            src={
                              deviceTypes.find((t) => t.id === newDevice.typeId)
                                ?.imageUrl
                            }
                            alt="Selected type"
                            className="w-full h-auto object-cover"
                          />
                        </div>
                      )}
                    </div>

                    {/* Device Details Form */}
                    <div className="w-2/3 space-y-4">
                      <h3 className="text-lg font-semibold text-gray-700">
                        Step 2: Enter Device Details
                      </h3>

                      {/* Serial Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Serial Number
                        </label>
                        <input
                          type="text"
                          placeholder="Enter device serial number"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                          value={newDevice.serialNumber}
                          onChange={(e) =>
                            setNewDevice({
                              ...newDevice,
                              serialNumber: e.target.value,
                            })
                          }
                        />
                      </div>

                      {/* Device Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Device Name
                        </label>
                        <input
                          type="text"
                          value={newDevice.name}
                          onChange={(e) =>
                            setNewDevice({ ...newDevice, name: e.target.value })
                          }
                          placeholder="Enter device name"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                        />
                      </div>
                      {/* Device color */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Device Color
                        </label>
                        <input
                          type="text"
                          value={newDevice.color}
                          onChange={(e) =>
                            setNewDevice({
                              ...newDevice,
                              color: e.target.value,
                            })
                          }
                          placeholder="Enter device name"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                        />
                      </div>

                      {/* Submit Button */}
                      <button
                        onClick={addDevice}
                        disabled={
                          isLoading ||
                          !newDevice.name ||
                          !newDevice.serialNumber
                        }
                        className={`w-full py-3 rounded-lg ${
                          isLoading ||
                          !newDevice.name ||
                          !newDevice.serialNumber
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700"
                        } text-white font-semibold transition-colors mt-4`}
                      >
                        {isLoading ? "Adding..." : "Add Device"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {activeSection === "connectPlaylist" && (
  <div className="bg-white rounded-xl shadow-sm p-6">
    <div className="mb-6 border-b pb-4">
      <h2 className="text-2xl font-bold text-black">Connect Playlist to Device</h2>
      <p className="text-sm text-gray-500 mt-1">
        Step {connectStep} of 2: {connectStep === 1 ? 'Select Device' : 'Choose Playlists'}
      </p>
    </div>

    {connectStep === 1 ? (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableDevices.map((device) => (
            <button
            key={device._id}
            onClick={() => {
              if (device._id) {  // Add this check
                setSelectedDeviceForPlaylist(device);
                setConnectStep(2);
              } else {
                toast.error('Invalid device selected');
              }
            }}
            className={`p-4 border rounded-lg text-left transition-all ${
              selectedDeviceForPlaylist?._id === device._id
                ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-50'
                : 'hover:border-blue-500'
            }`}
          >
              <div className="flex items-center gap-3">
                {device.imageUrl ? (
                  <img
                    src={device.imageUrl}
                    alt={device.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Database size={24} className="text-gray-400" />
                  </div>
                )}
                <div>
                  <h3 className="font-medium text-gray-900">{device.name}</h3>
                  <p className="text-sm text-gray-500">ID: {device.serialNumber}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    ) : (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => {
              setConnectStep(1);
              setSelectedPlaylistsForDevice([]);
            }}
            className="text-blue-500 hover:text-blue-600 flex items-center gap-1"
          >
            <ArrowLeft size={20} />
            <span>Back to Devices</span>
          </button>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="font-medium text-blue-900">Selected Device</h3>
          <p className="text-sm text-blue-700 mt-1">
            {selectedDeviceForPlaylist?.name} ({selectedDeviceForPlaylist?.serialNumber})
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Available Playlists</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {playlists.map((playlist) => (
              <div
                key={playlist._id}
                className={`p-4 border rounded-lg ${
                  selectedPlaylistsForDevice.includes(playlist._id || '')
                    ? 'border-blue-500 bg-blue-50'
                    : 'hover:border-blue-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{playlist.name}</h4>
                    <p className="text-sm text-gray-500">
                      {playlist.files?.length || 0} files
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedPlaylistsForDevice.includes(playlist._id || '')}
                    onChange={() => {
                      const playlistId = playlist._id || '';
                      setSelectedPlaylistsForDevice(prev =>
                        prev.includes(playlistId)
                          ? prev.filter(id => id !== playlistId)
                          : [...prev, playlistId]
                      );
                    }}
                    className="h-5 w-5 text-blue-600 rounded"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <button
            onClick={() => {
              setConnectStep(1);
              setSelectedPlaylistsForDevice([]);
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleConnectPlaylistToDevice}
            disabled={selectedPlaylistsForDevice.length === 0}
            className={`px-6 py-2 rounded-lg ${
              selectedPlaylistsForDevice.length === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}
          >
            Connect Playlists
          </button>
        </div>
      </div>
    )}
  </div>
)}

          {activeSection === "generatePlaylist" && (
            <div className="bg-white rounded-xl shadow-sm text-black">
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
                        onClick={() =>
                          document.getElementById("media-upload")?.click()
                        }
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
                    <h3 className="font-semibold text-gray-800 mb-4">
                      Media Preview
                    </h3>
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
                                {file.file.type.startsWith("image/") && (
                                  <img
                                    src={URL.createObjectURL(file.file)}
                                    alt={file.name}
                                    className="h-20 w-20 object-cover rounded"
                                  />
                                )}
                                {file.file.type.startsWith("video/") && (
                                  <video
                                    src={URL.createObjectURL(file.file)}
                                    className="h-20 w-20 object-cover rounded"
                                    controls
                                  />
                                )}
                                {file.file.type.startsWith("audio/") && (
                                  <audio
                                    src={URL.createObjectURL(file.file)}
                                    className="max-w-full"
                                    controls
                                  />
                                )}
                                <p className="text-sm text-gray-600 truncate">
                                  {file.name}
                                </p>
                              </div>
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

          {activeSection === "showMedia" && (
            <div className="bg-white rounded-xl shadow-sm p-6 text-black">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Available Media</h2>
                <div className="flex gap-4">
                  <select
                    onChange={(e) => handlePlaylistSort(e.target.value)}
                    className="px-3 py-2 border rounded-lg"
                  >
                    <option value="name">Sort by Name</option>
                    <option value="type">Sort by Type</option>
                    <option value="date">Sort by Date</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Search media..."
                    className="px-3 py-2 border rounded-lg"
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>
              </div>

              {isLoadingMedia ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : mediaFiles.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No media files found
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mediaFiles.map((media) => (
                    <div
                      key={media.id}
                      className="border rounded-xl p-3 md:p-4 hover:shadow-md transition-shadow bg-gray-50"
                    >
                      <div className="flex flex-col gap-3 md:gap-4">
                        {/* Media Preview */}
                        <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                          {media.type.startsWith("image/") && (
                            <img
                              src={media.url}
                              alt={media.name}
                              className="w-full h-full object-contain"
                              loading="lazy"
                            />
                          )}
                          {media.type.startsWith("video/") && (
                            <div className="h-full">
                              <video
                                src={media.url}
                                controls
                                className="w-full h-full object-contain"
                                onPlay={() =>
                                  handlePlayPause(
                                    media.id,
                                    document.querySelector(
                                      `video[src="${media.url}"]`
                                    )!
                                  )
                                }
                              />
                            </div>
                          )}
                          {media.type.startsWith("audio/") && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                              <div className="w-full max-w-md px-4">
                                <div className="flex items-center gap-4 mb-2">
                                  <Music size={24} className="text-gray-400" />
                                  <span className="text-sm font-medium text-gray-600 truncate">
                                    {media.name}
                                  </span>
                                </div>
                                <audio
                                  src={media.url}
                                  controls
                                  className="w-full mt-1"
                                  controlsList="nodownload"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Media Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <h3 className="font-medium text-gray-800 text-sm md:text-base truncate ">
                              {media.name}
                            </h3>
                            <div className="flex items-center gap-2">
                              <span className="text-xs md:text-sm text-gray-500 capitalize">
                                {media.type.split("/")[0]}
                              </span>
                              {media.createdAt && (
                                <span className="text-xs text-gray-400">
                                  •{" "}
                                  {new Date(
                                    media.createdAt
                                  ).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {(media.type.startsWith("video/") ||
                              media.type.startsWith("audio/")) && (
                              <button
                                onClick={() =>
                                  handlePlayPause(
                                    media.id,
                                    document.querySelector(
                                      `${
                                        media.type.startsWith("video/")
                                          ? "video"
                                          : "audio"
                                      }[src="${media.url}"]`
                                    )!
                                  )
                                }
                                className="p-2 text-gray-600 hover:text-blue-600 rounded-lg transition-colors"
                                aria-label={
                                  playingMedia === media.id ? "Pause" : "Play"
                                }
                              >
                                {playingMedia === media.id ? (
                                  <Pause size={18} />
                                ) : (
                                  <Play size={18} />
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeletePlaylist(media.id)}
                              className="p-2 text-gray-600 hover:text-red-600 rounded-lg transition-colors"
                              aria-label="Delete media"
                            >
                              <Trash2 size={18} />
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

          {activeSection === "playlistSetup" && (
            <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 text-black">
              <div className="mb-4 md:mb-6 border-b pb-4">
                <h2 className="text-xl md:text-2xl font-bold">
                  Create Playlist Configuration
                </h2>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Playlist Name
                      </label>
                      <input
                        type="text"
                        value={playlistConfig.name}
                        onChange={(e) =>
                          setPlaylistConfig({
                            ...playlistConfig,
                            name: e.target.value,
                          })
                        }
                        className="w-full p-2 border rounded text-sm"
                        placeholder="Enter playlist name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={playlistConfig.startTime}
                          onChange={(e) =>
                            setPlaylistConfig({
                              ...playlistConfig,
                              startTime: e.target.value,
                            })
                          }
                          className="w-full p-2 border rounded text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={playlistConfig.endTime}
                          onChange={(e) =>
                            setPlaylistConfig({
                              ...playlistConfig,
                              endTime: e.target.value,
                            })
                          }
                          className="w-full p-2 border rounded text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Select Media Files
                      </label>
                      <div className="max-h-[300px] md:max-h-[400px] overflow-y-auto border rounded p-3">
                        {mediaFiles.map((media: any) => {
                          const isAudio = media.type.startsWith("audio/");
                          const isImage = media.type.startsWith("image/");
                          const fileExtension = media.name
                            .split(".")
                            .pop()
                            ?.toLowerCase();
                          const fileName = media.name
                            .split(".")
                            .slice(0, -1)
                            .join(".");

                          if (isImage) {
                            return null;
                          }

                          return (
                            <div
                              key={media.id}
                              className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded"
                            >
                              <input
                                type="checkbox"
                                checked={playlistConfig.files.some(
                                  (f) => f.path === media.url
                                )}
                                onChange={() => {
                                  const file = {
                                    name: fileName,
                                    path: media.url,
                                    type: media.type.split("/")[0],
                                    displayOrder:
                                      playlistConfig.files.length + 1,
                                    delay: 2,
                                    backgroundImageEnabled: false,
                                    backgroundImage: null,
                                  } as PlaylistConfigFile;
                                  setPlaylistConfig({
                                    ...playlistConfig,
                                    files: playlistConfig.files.some(
                                      (f) => f.path === media.url
                                    )
                                      ? playlistConfig.files.filter(
                                          (f) => f.path !== media.url
                                        )
                                      : [...playlistConfig.files, file],
                                  });
                                }}
                                className="h-4 w-4"
                              />
                              <span className="text-sm truncate">
                                {fileName}
                                <span className="text-gray-500 text-xs ml-1">
                                  ({fileExtension})
                                </span>
                              </span>
                              {isAudio &&
                                playlistConfig.files.some(
                                  (f) => f.path === media.url
                                ) && (
                                  <div className="flex items-center gap-2">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                      <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={
                                          playlistConfig.files.find(
                                            (f) => f.path === media.url
                                          )?.backgroundImageEnabled
                                        }
                                        onChange={() => {
                                          const updatedFiles =
                                            playlistConfig.files.map((f) => {
                                              if (f.path === media.url) {
                                                return {
                                                  ...f,
                                                  backgroundImageEnabled:
                                                    !f.backgroundImageEnabled,
                                                  backgroundImage:
                                                    !f.backgroundImageEnabled
                                                      ? null
                                                      : f.backgroundImage,
                                                } as PlaylistConfigFile;
                                              }
                                              return f;
                                            });
                                          setPlaylistConfig({
                                            ...playlistConfig,
                                            files: updatedFiles,
                                          });
                                        }}
                                      />
                                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                      <span className="ml-2 text-xs text-gray-600">
                                        BG Image
                                      </span>
                                    </label>
                                    {playlistConfig.files.find(
                                      (f) => f.path === media.url
                                    )?.backgroundImageEnabled && (
                                      <button
                                        onClick={() =>
                                          openBgImageSelector(media.url)
                                        }
                                        className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                      >
                                        {playlistConfig.files.find(
                                          (f) => f.path === media.url
                                        )?.backgroundImage
                                          ? "Change BG Image"
                                          : "Add BG Image"}
                                      </button>
                                    )}
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-6">
                    <h4 className="font-medium mb-4">Selected Media Order</h4>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {playlistConfig.files.map((file, index) => (
                        <div
                          key={file.path}
                          className="flex items-center gap-3 p-2 md:p-3 bg-gray-50 rounded"
                        >
                          <span className="text-gray-500 text-sm">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {file.name}
                            </p>
                            {file.type === "audio" &&
                              file.backgroundImageEnabled && (
                                <div className="mt-2">
                                  {file.backgroundImage ? (
                                    <div className="relative w-20 h-20">
                                      <img
                                        src={
                                          typeof file.backgroundImage ===
                                          "string"
                                            ? file.backgroundImage
                                            : URL.createObjectURL(
                                                file.backgroundImage
                                              )
                                        }
                                        alt="Background"
                                        className="w-full h-full object-cover rounded-lg"
                                      />
                                      <button
                                        onClick={() => {
                                          const updatedFiles =
                                            playlistConfig.files.map((f) => {
                                              if (f.path === file.path) {
                                                return {
                                                  ...f,
                                                  backgroundImage: null,
                                                };
                                              }
                                              return f;
                                            });
                                          setPlaylistConfig({
                                            ...playlistConfig,
                                            files: updatedFiles,
                                          });
                                        }}
                                        className="absolute -top-2 -right-2 p-1 bg-white rounded-full shadow-md"
                                      >
                                        <XCircle
                                          size={16}
                                          className="text-red-500"
                                        />
                                      </button>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-500">
                                      No background image selected
                                    </p>
                                  )}
                                </div>
                              )}
                            <div className="flex items-center gap-2 mt-2">
                              <label className="text-xs text-gray-600">
                                Delay (s)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={file.delay}
                                onChange={(e) => {
                                  const newFiles = [...playlistConfig.files];
                                  newFiles[index].delay = parseInt(
                                    e.target.value
                                  );
                                  setPlaylistConfig({
                                    ...playlistConfig,
                                    files: newFiles,
                                  });
                                }}
                                className="w-16 p-1 border rounded text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Background Audio Section */}
                <div className="mt-6 border-t pt-4">
                  <div className="flex items-center gap-3 mb-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={playlistConfig.backgroundAudio.enabled}
                        onChange={() => {
                          setPlaylistConfig({
                            ...playlistConfig,
                            backgroundAudio: {
                              ...playlistConfig.backgroundAudio,
                              enabled: !playlistConfig.backgroundAudio.enabled,
                              file: null,
                            },
                          });
                        }}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      <span className="ml-3 text-sm font-medium text-gray-700">
                        Enable Background Audio
                      </span>
                    </label>
                  </div>

                  {playlistConfig.backgroundAudio.enabled && (
                    <div className="space-y-4 pl-4">
                      <div className="max-h-[200px] overflow-y-auto border rounded p-3">
                        {mediaFiles
                          .filter((media) => media.type.startsWith("audio/"))
                          .map((audio: any) => (
                            <div
                              key={audio.id}
                              className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded"
                            >
                              <input
                                type="radio"
                                name="backgroundAudio"
                                checked={
                                  playlistConfig.backgroundAudio.file ===
                                  audio.url
                                }
                                onChange={() => {
                                  setPlaylistConfig({
                                    ...playlistConfig,
                                    backgroundAudio: {
                                      ...playlistConfig.backgroundAudio,
                                      file: audio.url,
                                    },
                                  });
                                }}
                                className="h-4 w-4"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {audio.name}
                                </p>
                                <audio
                                  src={audio.url}
                                  controls
                                  className="w-full mt-1"
                                  controlsList="nodownload"
                                />
                              </div>
                            </div>
                          ))}
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="text-sm font-medium">
                          Background Volume:
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={playlistConfig.backgroundAudio.volume}
                          onChange={(e) => {
                            setPlaylistConfig({
                              ...playlistConfig,
                              backgroundAudio: {
                                ...playlistConfig.backgroundAudio,
                                volume: parseInt(e.target.value),
                              },
                            });
                          }}
                          className="flex-1"
                        />
                        <span className="text-sm text-gray-600">
                          {playlistConfig.backgroundAudio.volume}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                  <button
                    onClick={() => setActiveSection("")}
                    className="px-4 md:px-6 py-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePlaylistConfig}
                    disabled={
                      !playlistConfig.name || playlistConfig.files.length === 0
                    }
                    className={`px-4 md:px-6 py-2 text-sm rounded ${
                      !playlistConfig.name || playlistConfig.files.length === 0
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700"
                    } text-white transition-colors`}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Saving...</span>
                      </div>
                    ) : (
                      "Save Configuration"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Replace the existing showPlaylists section with this code */}
          {activeSection === "showPlaylists" && (
            <div className="bg-white rounded-xl shadow-sm p-6 text-black">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">
                  {isEditing ? "Edit Playlist" : "Playlists"}
                </h2>
                {!isEditing && (
                  <div className="flex gap-4">
                    <input
                      type="text"
                      placeholder="Search playlists..."
                      className="px-3 py-2 border rounded-lg"
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {isLoadingPlaylists ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : isEditing && editedPlaylist ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Playlist Name
                      </label>
                      <input
                        type="text"
                        value={editedPlaylist.name}
                        onChange={(e) =>
                          setEditedPlaylist({
                            ...editedPlaylist,
                            name: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Playlist Type
                      </label>
                      <select
                        value={editedPlaylist.type}
                        onChange={(e) =>
                          setEditedPlaylist({
                            ...editedPlaylist,
                            type: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="mixed">Mixed</option>
                        <option value="image">Image</option>
                        <option value="video">Video</option>
                        <option value="audio">Audio</option>
                      </select>
                    </div>
                  </div>

                  {/* Files Section */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Files
                    </label>
                    <div className="space-y-2">
                      {editedPlaylist.files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {file.type.includes("image") && (
                              <ImageIcon size={20} className="text-green-500" />
                            )}
                            {file.type.includes("video") && (
                              <Video size={20} className="text-blue-500" />
                            )}
                            {file.type.includes("audio") && (
                              <Music size={20} className="text-purple-500" />
                            )}
                            <span className="text-sm">{file.name}</span>
                          </div>
                          <button
                            onClick={() => {
                              setEditedPlaylist({
                                ...editedPlaylist,
                                files: editedPlaylist.files.filter(
                                  (f) => f.id !== file.id
                                ),
                              });
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <input
                      type="file"
                      id="add-files"
                      multiple
                      hidden
                      onChange={(e) => {
                        const newFiles = Array.from(e.target.files || []).map(
                          (file) => ({
                            id: generateUniqueId(),
                            name: file.name,
                            type: file.type,
                            file: file,
                          })
                        );
                        setEditedPlaylist({
                          ...editedPlaylist,
                          files: [...editedPlaylist.files, ...newFiles],
                        });
                      }}
                    />
                    <button
                      onClick={() =>
                        document.getElementById("add-files")?.click()
                      }
                      className="mt-4 px-4 py-2 text-sm border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50"
                    >
                      Add Files
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-4 pt-4 border-t">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditedPlaylist(null);
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        await handleEditPlaylist(editedPlaylist);
                        setIsEditing(false);
                        setEditedPlaylist(null);
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : playlists && playlists.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {playlists.map((playlist) => (
                    <div
                      key={playlist._id}
                      className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                        selectedPlaylist?._id === playlist._id
                          ? "ring-2 ring-blue-500"
                          : ""
                      }`}
                      onClick={() =>
                        setSelectedPlaylist(
                          selectedPlaylist?._id === playlist._id ? null : playlist
                        )
                      }
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold">
                            {playlist.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Type: {playlist.type}
                          </p>
                          <p className="text-sm text-gray-600">
                            Files: {playlist.files?.length || 0} items
                          </p>
                          <p className="text-sm text-gray-600">
                            Created:{" "}
                            {new Date(
                              playlist.createdAt || ""
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => handleEditClick(e, playlist)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePlaylistWithFiles(playlist._id);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      {/* Expanded View */}
                      {selectedPlaylist?._id === playlist._id && (
                        <div className="mt-4 border-t pt-4">
                          <h4 className="font-medium mb-3">Playlist Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {playlist.files?.map((file: any, index: number) => (
                              <div
                                key={index}
                                className="bg-gray-50 rounded-lg p-4"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  {file.type === "image" && (
                                    <ImageIcon
                                      size={16}
                                      className="text-green-500"
                                    />
                                  )}
                                  {file.type === "video" && (
                                    <Video
                                      size={16}
                                      className="text-blue-500"
                                    />
                                  )}
                                  {file.type === "audio" && (
                                    <Music
                                      size={16}
                                      className="text-purple-500"
                                    />
                                  )}
                                  <span className="font-medium text-sm">
                                    {file.name}
                                  </span>
                                </div>

                                {file.file && (
                                  <div className="mt-2">
                                    {file.file.type.startsWith("image/") && (
                                      <img
                                        src={URL.createObjectURL(file.file)}
                                        alt={file.name}
                                        className="w-full h-32 object-cover rounded-lg"
                                      />
                                    )}
                                    {file.file.type.startsWith("video/") && (
                                      <video
                                        src={URL.createObjectURL(file.file)}
                                        controls
                                        className="w-full rounded-lg"
                                      />
                                    )}
                                    {file.file.type.startsWith("audio/") && (
                                      <audio
                                        src={URL.createObjectURL(file.file)}
                                        controls
                                        className="w-full"
                                      />
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No playlists found
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
