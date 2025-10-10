"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Music,
  Video,
  Search,
  Trash2,
  X,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon,
  Link2,
  RefreshCw,
  Monitor,
  XCircle,
  Clock, // Added for new playlist setup
  Calendar, // Added for new playlist setup
  Mic, // Added for new playlist setup
  Upload, // Added for new playlist setup
  Play, // Added for new playlist setup
  Volume2, // Added for new playlist setup
} from "lucide-react";
import toast from "react-hot-toast";
import PlaylistManager from "../ShowPlaylist/showPlaylist"; // keep if you use it
import { Device, MenuKey } from "@/components/Platform/types";
import { FaPlay } from "react-icons/fa6";
import { FaInfoCircle, FaPauseCircle, FaSyncAlt } from "react-icons/fa";

// Add this above your PlaylistSetup component or at the bottom of the file
function AnnouncementPlaylistSummary({ userId }: { userId: string | null }) {
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`/api/announcement/playlist?userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        setPlaylists(Array.isArray(data) ? data : data.playlists || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="text-gray-400 text-sm text-center py-20">Loading...</div>;
  if (!playlists.length) {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="bg-white rounded-xl shadow p-6 flex items-center gap-4 w-full">
          <div className="bg-[#07323C] rounded-full w-14 h-14 flex items-center justify-center">
            <i className="fa fa-info text-white text-2xl" />
            {/* Or use Lucide/React Icons */}
            <FaInfoCircle size={32} className="text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-lg mb-1">No schedule</h4>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {playlists.map((pl: any) => (
        <div key={pl._id} className="bg-white rounded-xl shadow p-6 flex items-center gap-4 w-full">
          <div className="bg-[#07323C] rounded-md w-24 h-16 flex items-center justify-center">
            {pl.type === "video" ? (
              <Video size={32} className="text-white" />
            ) : (
              <Music size={32} className="text-white" />
            )}
          </div>
          <div>
            <h4 className="font-semibold text-lg mb-1">{pl.name || "Playlist name"}</h4>
            <div className="text-sm text-gray-600 mb-1">
              {pl.type === "video" ? "Video playlist" : "Audio playlist"}
            </div>
            <div className="text-xs text-gray-500">
              Schedule : {pl.schedule?.startDate || "?"}
              {pl.schedule?.endDate ? `-${pl.schedule.endDate}` : ""}
              {pl.schedule?.daysOfWeek?.length
                ? ` | ${pl.schedule.daysOfWeek.join(", ")}` 
                : " | Weekdays"}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Types
interface MediaFile {
  _id?: string;
  id?: string;
  name: string;
  type: string; // e.g. "audio/mp3" or "audio"
  url: string;
}

interface PlaylistConfigFile {
  _id?: string; // Added _id to track media item
  path: string;
  name: string;
  type: string;
  displayOrder: number;
  delay: number;
  backgroundImageEnabled?: boolean;
  backgroundImage?: string | null;
  backgroundImageName?: string | null;
  minVolume: number; // Added minVolume
  maxVolume: number; // Added maxVolume
}

interface AnnouncementItem {
  file: string; // This will store the _id of the MediaFile
  delay: number;
  maxVolume: number;
}

interface PlaylistConfiguration {
  id: string;
  name: string;
  type: string;
  serialNumber: string;
  startTime: string;
  endTime: string;
  files: PlaylistConfigFile[];
  startDate?: string;
  endDate?: string;
  daysOfWeek?: string[];
  shuffle?: boolean; // Added shuffle property
}

// New Playlist Model for the "Create Announcement Playlist" section
interface NewPlaylist {
  _id?: string;
  name: string;
  userId: string;
  announcements: AnnouncementItem[];
  schedule: {
    scheduleType: 'hourly' | 'timed';
    frequency?: number; // In minutes, for hourly type
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    daysOfWeek?: string[];
  };
  connectedDevices?: string[]; // Array of device _ids
  status?: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

interface UserData {
  _id: string;
  username: string;
  role: string;
}
export default function PlaylistSetup() {
  // UI & data state
  const [userId, setUserId] = useState<string | null>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  // playlist config (original)
  const [playlistConfig, setPlaylistConfig] = useState<PlaylistConfiguration>({
    id: "",
    name: "",
    type: "mixed",
    serialNumber: "",
    startTime: "00:00:00",
    endTime: "00:10:00",
    files: [] as PlaylistConfigFile[],
    startDate: "",
    endDate: "",
    daysOfWeek: [],
    shuffle: false, // Default shuffle to false
  });

  // NEW playlist state for the refactored section
  const [playlist, setPlaylist] = useState<NewPlaylist>({
    name: '',
    userId: '', // This will be set from localStorage
    announcements: [],
    schedule: {
      scheduleType: 'hourly',
      frequency: 60,
      startDate: '',
      endDate: '',
      startTime: '09:00',
      endTime: '17:00',
      daysOfWeek: [],
    },
  });

  const [announcementFiles, setAnnouncementFiles] = useState<MediaFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // UI controls
  const [activeTab, setActiveTab] = useState<"all" | "uploaded" | "recorded" | "tts">("all");
  const [search, setSearch] = useState("");
  const [isLoadingSave, setIsLoadingSave] = useState(false);
  const [bgModalFor, setBgModalFor] = useState<string | null>(null); // file.path for which to choose BG
  const [showPlaylistManager, setShowPlaylistManager] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedPlaylistName, setSavedPlaylistName] = useState("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Used for general loading now
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const userRole = localStorage.getItem("userRole");
    if (userRole !== "user") {
      toast.error("You are not authorized to access this page.");
      window.location.href = "/login";
      return;
    }

    const fetchUserData = async () => {
      try {
        const userId = localStorage.getItem("userId");
        if (!userId) return;

        const response = await fetch(`/api/user/users?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          setUserData(data);
          setPlaylist(prev => ({ ...prev, userId: userId })); // Set userId for new playlist
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    };

    const fetchAssignedDevices = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const userId = localStorage.getItem("userId");
        if (!userId) {
          setError("Please log in to view devices");
          return;
        }

        const response = await fetch(`/api/assign-device?userId=${userId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch assigned devices");
        }

        const data = await response.json();
        if (data?.success && Array.isArray(data.data)) {
          const mappedDevices = data.data
            .map((assignment: any) => ({
              _id: assignment._id || "unknown-id",
              deviceId: {
                _id: assignment.deviceId?._id || "unknown-device-id",
                name: assignment.deviceId?.name || "Unknown Device",
                serialNumber: assignment.deviceId?.serialNumber || "N/A",
                status: assignment.deviceId?.status || "inactive",
                imageUrl:
                  assignment.deviceId?.imageUrl || "/default-device-image.png",
              },
              typeId: {
                _id: assignment.deviceId?.typeId?._id || "unknown-type",
                name: assignment.deviceId?.typeId?.name || "Standard Device",
              },
              userId: { _id: userId },
              connectedPlaylists: [],
              createdAt: assignment.assignedAt || new Date().toISOString(),
              updatedAt: assignment.updatedAt || new Date().toISOString(),
              __v: 0,
              status:
                assignment.deviceId?.status === "active"
                  ? "Connected"
                  : "Disconnected",
              lastActive: assignment.updatedAt
                ? new Date(assignment.updatedAt).toLocaleString()
                : "N/A",
            }))
            .filter(Boolean);
          setDevices(mappedDevices);
        } else {
          setDevices([]);
        }
      } catch (err) {
        console.error("Error fetching devices:", err);
        setError(err instanceof Error ? err.message : "Failed to load devices");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
    fetchAssignedDevices();
  }, []);

  // days list
  const daysList = [
    { label: "Sun", value: "sunday" },
    { label: "Mon", value: "monday" },
    { label: "Tue", value: "tuesday" },
    { label: "Wed", value: "wednesday" },
    { label: "Thu", value: "thursday" },
    { label: "Fri", value: "friday" },
    { label: "Sat", value: "saturday" },
  ];

  // Get userId from localStorage (same approach as your original)
  useEffect(() => {
    try {
      const id = localStorage.getItem("userId");
      setUserId(id);
      setPlaylist(prev => ({ ...prev, userId: id || '' })); // Set userId for new playlist
    } catch (e) {
      setUserId(null);
    }
  }, []);

  // Fetch media files when userId is available
  useEffect(() => {
    const fetchAnnouncementFiles = async () => {
      if (!userId) return;
      setLoadingMedia(true);
      try {
        const res = await fetch(`/api/announcement/list?userId=${userId}`);
        if (!res.ok) throw new Error("Failed to fetch announcement files");
        const json = await res.json();
        const items = json?.announcements ?? json?.files ?? json ?? [];
        setMediaFiles(items);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load announcement files");
        setMediaFiles([]);
      } finally {
        setLoadingMedia(false);
      }
    };
    fetchAnnouncementFiles();
  }, [userId]);

  // NEW: Fetch Announcement Files for the new playlist section
  const refreshAnnouncementFiles = async () => {
    if (!userId) {
      setError("User ID not found. Please log in.");
      return;
    }
    setIsLoadingFiles(true);
    setError(null);
    try {
      const response = await fetch(`/api/announcement/list?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch announcement files');
      }
      const data = await response.json();
      setAnnouncementFiles(data?.announcements || []);
    } catch (err) {
      console.error("Error fetching announcement files:", err);
      setError(err instanceof Error ? err.message : "Failed to load announcement files.");
      setAnnouncementFiles([]);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    refreshAnnouncementFiles();
  }, [userId]); // Depend on userId to fetch files

  // Helpers
  const filePath = (m: MediaFile) => m.url || (m as any).path || m._id || m.id || m.name;

  const isImageFile = (m: MediaFile) => {
    const ext = m.name.split(".").pop()?.toLowerCase() || "";
    return ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext) || m.type.startsWith("image/");
  };

  // filtered media shows playable media (exclude pure images)
  const filteredMedia = useMemo(
    () =>
      mediaFiles.filter((m) => {
        if (activeTab !== "all") {
          if (activeTab === "uploaded" && !m.type.includes("uploaded")) return false;
          if (activeTab === "recorded" && !m.type.includes("recorded")) return false;
          if (activeTab === "tts" && !m.type.includes("tts")) return false;
        }
        if (isImageFile(m)) return false; // exclude images from playable list
        if (!m.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [mediaFiles, activeTab, search]
  );

  // images for BG modal
  const imageFiles = useMemo(() => mediaFiles.filter((m) => isImageFile(m)), [mediaFiles]);

  // selection helpers (for original playlist config)
  const isSelected = (m: MediaFile) =>
    playlistConfig.files.some((f) => f.path === filePath(m));

  const toggleSelect = (m: MediaFile) => {
    const path = filePath(m);
    const fileName = m.name.replace(/\.\w+$/, "");
    const newFile: PlaylistConfigFile = {
      name: fileName,
      path,
      type: m.type.startsWith("video") ? "video" : "audio",
      displayOrder: playlistConfig.files.length + 1,
      delay: 2,
      backgroundImageEnabled: false,
      backgroundImage: null,
      backgroundImageName: null,
      minVolume: 0,
      maxVolume: 80
    };

    // Update playlistConfig.files
    if (playlistConfig.files.some((f) => f.path === path)) {
      setPlaylistConfig((prev) => ({
        ...prev,
        files: prev.files.filter((f) => f.path !== path),
      }));
      // Also remove from playlist.announcements
      setPlaylist((prev) => ({
        ...prev,
        announcements: prev.announcements.filter((a) => a.file !== m._id),
      }));
    } else {
      setPlaylistConfig((prev) => ({
        ...prev,
        files: [...prev.files, newFile],
      }));
      // Also add to playlist.announcements
      setPlaylist((prev) => ({
        ...prev,
        announcements: [
          ...prev.announcements,
          { file: m._id!, delay: 0, maxVolume: 80 }
        ],
      }));
    }
  };

  // reorder selected files (for original playlist config)
  const moveUp = (index: number) => {
    if (index <= 0) return;
    setPlaylistConfig((prev) => {
      const arr = [...prev.files];
      [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      // update displayOrder
      return { ...prev, files: arr.map((f, i) => ({ ...f, displayOrder: i + 1 })) };
    });
  };
  const moveDown = (index: number) => {
    setPlaylistConfig((prev) => {
      const arr = [...prev.files];
      if (index >= arr.length - 1) return prev;
      [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
      return { ...prev, files: arr.map((f, i) => ({ ...f, displayOrder: i + 1 })) };
    });
  };

  const updateDelay = (index: number, value: number) => {
    setPlaylistConfig((prev) => {
      const arr = [...prev.files];
      arr[index].delay = Math.max(0, value);
      return { ...prev, files: arr };
    });
  };

  const removeSelected = (index: number) => {
    setPlaylistConfig((prev) => {
      const arr = prev.files.filter((_, i) => i !== index);
      return { ...prev, files: arr.map((f, i) => ({ ...f, displayOrder: i + 1 })) };
    });
  };

  // toggle BG enable: open modal if enabling and images available; otherwise toggle off
  const toggleBgEnabled = (index: number) => {
    const f = playlistConfig.files[index];
    if (!f) return;
    if (!f.backgroundImageEnabled) {
      if (imageFiles.length > 0) {
        setBgModalFor(f.path);
      } else {
        // just enable but no image present
        setPlaylistConfig((prev) => {
          const arr = [...prev.files];
          arr[index].backgroundImageEnabled = true;
          return { ...prev, files: arr };
        });
      }
    } else {
      // disable and clear
      setPlaylistConfig((prev) => {
        const arr = [...prev.files];
        arr[index].backgroundImageEnabled = false;
        arr[index].backgroundImage = null;
        arr[index].backgroundImageName = null;
        return { ...prev, files: arr };
      });
    }
  };
  const openBgImageSelector = (audioPath: string) => {
    const modalContainer = document.createElement("div");
    modalContainer.className =
      "fixed inset-0 z-50 flex items-center justify-center";
    modalContainer.innerHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-50"></div>
      <div class="relative bg-white rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto m-4">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-semibold">Select Background Image</h3>
          <button id="closeBgImageSelector" class="text-red-500 hover:text-gray-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        ${
          mediaFiles.length > 0
            ? `
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" id="bgImageGrid">
              ${mediaFiles
                .filter((file) => {
                  const extension = file.name.split(".").pop()?.toLowerCase() || "";
                  const imageExtensions = [
                    "jpg",
                    "jpeg",
                    "png",
                    "gif",
                    "webp",
                    "svg",
                    "bmp",
                  ];
                  return imageExtensions.includes(extension);
                })
                .map(
                  (image) => `
                <div class="aspect-square relative group cursor-pointer hover:opacity-90 bg-white rounded-lg overflow-hidden"
                  data-image-url="${image.url}"
                  data-image-name="${image.name}"
                  data-audio-path="${audioPath}">
                  <img src="${image.url}"
                    alt="${image.name}"
                    loading="lazy"
                    class="w-full h-full object-cover"/>
                  <div class="absolute inset-0 flex items-center justify-center p-5bg-opacity-0 group-hover:bg-opacity-20 transition-all">
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
            id="cancelBgImageSelector"
            class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modalContainer);

    // Set up event listeners
    document.querySelectorAll("[data-audio-path]").forEach((element) => {
      element.addEventListener("click", function (e) {
        const target = e.currentTarget as HTMLElement;
        const audioPath = target.getAttribute("data-audio-path");
        const imageUrl = target.getAttribute("data-image-url");
        const imageName = target.getAttribute("data-image-name");

        if (audioPath && imageUrl && imageName) {
          // Update playlist config with selected image
          const updatedFiles = playlistConfig.files.map((f) => {
            if (f.path === audioPath) {
              return {
                ...f,
                backgroundImageEnabled: true,
                backgroundImage: imageUrl,
                backgroundImageName: imageName,
              } as PlaylistConfigFile;
            }
            return f;
          });

          setPlaylistConfig({
            ...playlistConfig,
            files: updatedFiles,
          });

          // Remove the modal
          document.body.removeChild(modalContainer);
        }
      });
    });

    // Close button handler
    const closeButton = modalContainer.querySelector("#closeBgImageSelector");
    if (closeButton) {
      closeButton.addEventListener("click", () => {
        document.body.removeChild(modalContainer);
      });
    }

    // Cancel button handler
    const cancelButton = modalContainer.querySelector(
      "#cancelBgImageSelector"
    );
    if (cancelButton) {
      cancelButton.addEventListener("click", () => {
        document.body.removeChild(modalContainer);
      });
    }
  };
  // when choosing image from modal
  const chooseBgImage = (image: MediaFile) => {
    if (!bgModalFor) return;
    setPlaylistConfig((prev) => {
      const arr = prev.files.map((f) =>
        f.path === bgModalFor
          ? { ...f, backgroundImageEnabled: true, backgroundImage: image.url, backgroundImageName: image.name }
          : f
      );
      return { ...prev, files: arr };
    });
    setBgModalFor(null);
  };

  // days toggle (for original playlist config)
  const handleDayToggle = (day: string) => {
    setPlaylistConfig((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek?.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...(prev.daysOfWeek || []), day],
    }));
  };

  // Save playlist (same endpoint approach as your original)
  const handleSavePlaylistConfig = async () => {
    if (
      !playlistConfig.name ||
      playlistConfig.files.length === 0 ||
      !playlistConfig.startDate ||
      !playlistConfig.endDate ||
      !playlistConfig.daysOfWeek ||
      playlistConfig.daysOfWeek.length === 0
    ) {
      toast.error(
        `Please add a name, at least one file, date range, and select at least one day for the playlist`
      );
      return;
    }
    setIsLoading(true);
    try {
      const configToSend = {
        name: playlistConfig.name,
        type: "mixed",
        startTime: playlistConfig.startTime || "00:00:00",
        endTime: playlistConfig.endTime || "00:10:00",
        startDate: playlistConfig.startDate,
        endDate: playlistConfig.endDate,
        daysOfWeek: playlistConfig.daysOfWeek,
        shuffle: playlistConfig.shuffle, // Include shuffle in the payload
        files: playlistConfig.files.map((file, index) => ({
          mediaId: file._id,
          name: file.name,
          path: file.path,
          type: file.type,
          displayOrder: index + 1,
          delay: file.delay || 0,
          backgroundImageEnabled: file.backgroundImageEnabled || false,
          backgroundImage: file.backgroundImage || null,
          backgroundImageName: file.backgroundImageName || null,
         
        })),
      };
      const formData = new FormData();
      formData.append("config", JSON.stringify(configToSend));

      const response = await fetch(`/api/announcement/playlist-setup?userId=${userId}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save announcement playlist");
      }

      toast.success("Announcement playlist saved successfully");

      // Store the saved playlist info for the success screen
      setSavedPlaylistName(playlistConfig.name);

      // Show the success component
      setIsSaved(true);
    } catch (error) {
      console.error("Error saving announcement playlist:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save announcement playlist"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // NEW: Handlers for the refactored playlist section
  const handleScheduleTypeChange = (type: 'hourly' | 'timed') => {
    setPlaylist(prev => ({
      ...prev,
      schedule: { ...prev.schedule, scheduleType: type }
    }));
  };

  const handleFileToggle = (file: MediaFile) => {
    setPlaylist(prev => {
      const exists = prev.announcements.some(a => a.file === file._id);
      if (exists) {
        return {
          ...prev,
          announcements: prev.announcements.filter(a => a.file !== file._id),
        };
      } else {
        return {
          ...prev,
          announcements: [...prev.announcements, { file: file._id!, delay: 0, maxVolume: 80 }], // Default volume to 80
        };
      }
    });
  };

  const updateAnnouncementDelay = (fileId: string, delay: number) => {
    setPlaylist(prev => ({
      ...prev,
      announcements: prev.announcements.map(item =>
        item.file === fileId ? { ...item, delay: delay } : item
      ),
    }));
  };

  const updateAnnouncementVolume = (fileId: string, volume: number) => {
    setPlaylist(prev => ({
      ...prev,
      announcements: prev.announcements.map(item =>
        item.file === fileId ? { ...item, maxVolume: volume } : item
      ),
    }));
  };

  const removeAnnouncement = (fileId: string) => {
    setPlaylist(prev => ({
      ...prev,
      announcements: prev.announcements.filter(item => item.file !== fileId),
    }));
  };

  const getSelectedFile = (fileId: string) => announcementFiles.find(file => file._id === fileId);

  // NEW: Handle Save for the refactored playlist section
  const handleSave = async () => {
    if (!playlist.name.trim()) {
      toast.error("Playlist name cannot be empty.");
      return;
    }
    if (playlist.announcements.length === 0) {
      toast.error("Please select at least one announcement file.");
      return;
    }
    if (!playlist.schedule.startDate || !playlist.schedule.endDate || !playlist.schedule.startTime || !playlist.schedule.endTime) {
      toast.error("Please fill in all schedule date and time fields.");
      return;
    }
    if (playlist.schedule.scheduleType === 'hourly' && (!playlist.schedule.frequency || playlist.schedule.frequency < 1)) {
      toast.error("Frequency must be at least 1 minute for hourly schedules.");
      return;
    }

    setIsLoading(true);

    // Build announcements array with displayOrder
    const announcements = playlist.announcements.map((item, idx) => ({
      file: item.file, // must be the _id of the media file
      displayOrder: idx + 1, // required by backend
      delay: item.delay ?? 0,
      maxVolume: item.maxVolume ?? 100,
    }));

    // Build payload
    const payload = {
      name: playlist.name,
      userId: playlist.userId,
      announcements, // <-- send this array!
      schedule: playlist.schedule,
      status: "active",
    };

    try {
      const response = await fetch(`/api/announcement/playlist-setup?userId=${playlist.userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save announcement playlist.');
      }

      toast.success('Announcement playlist created successfully!');
      setSavedPlaylistName(playlist.name);
      setIsSaved(true);
    } catch (err) {
      console.error('Error saving new playlist:', err);
      toast.error(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const onCancel = () => {
    setPlaylist({
      name: '',
      userId: userId || '',
      announcements: [],
      schedule: {
        scheduleType: 'hourly',
        frequency: 60,
        startDate: '',
        endDate: '',
        startTime: '09:00',
        endTime: '17:00',
        daysOfWeek: [],
      },
    });
    toast('Playlist setup cancelled and reset.');
  };

  // If saved show simple success card (you can replace with your ShowPlaylist)
  if (isSaved) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-white rounded-xl p-6 text-center shadow">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Success!</h2>
          <p className="text-gray-600 mt-2">Playlist "{savedPlaylistName}" has been saved successfully.</p>
          <div className="mt-6 flex justify-center gap-4">
            <button
              onClick={() => {
                setIsSaved(false);
                setSavedPlaylistName("");
                // Reset original playlist config if needed
                setPlaylistConfig({
                  id: "",
                  name: "",
                  type: "mixed",
                  serialNumber: "",
                  startTime: "00:00:00",
                  endTime: "00:10:00",
                  files: [],
                  startDate: "",
                  endDate: "",
                  daysOfWeek: [],
                });
                // Reset new playlist config
                setPlaylist({
                  name: '',
                  userId: userId || '',
                  announcements: [],
                  schedule: {
                    scheduleType: 'hourly',
                    frequency: 60,
                    startDate: '',
                    endDate: '',
                    startTime: '09:00',
                    endTime: '17:00',
                    daysOfWeek: [],
                  },
                });
              }}
              className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
            >
              Create Another Playlist
            </button>
            <button
              onClick={() => setShowPlaylistManager(true)}
              className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium"
            >
              View All Playlists
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If user wants to open PlaylistManager (keeps parity with your earlier file)
  if (showPlaylistManager) return <PlaylistManager />;

  // sample schedules & devices (replace or fetch real ones)
  const schedulesSample = [
    { id: "sch1", name: "Morning - Lobby", subtitle: "Audio", range: "01 Sep - 15 Sep" },
    { id: "sch2", name: "Evening - Store", subtitle: "Audio", range: "01 Sep - 15 Sep" },
  ];
  const devicesSample = [
    { id: "dev1", name: "Entrance Speaker", type: "audio", zone: "Entrance", status: "online", lastSync: "2 min ago", playlist: "Not connected" },
    { id: "dev2", name: "Cafeteria Display", type: "video", zone: "Cafeteria", status: "offline", lastSync: "10 min ago", playlist: "Promo Ad" },
  ];
  const handleEditDevice = async (device: Device): Promise<void> => {
    try {
      const newStatus = device.status === "Connected" ? "Disconnected" : "Connected";
      const apiStatus = newStatus === "Connected" ? "active" : "inactive";

      const response = await fetch(`/api/assigned-devices/${device._id}`, {
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
        toast.success(`Device status updated to ${newStatus}`);
      }
    } catch (err) {
      console.error("Error updating device:", err);
      toast.error(err instanceof Error ? err.message : "Failed to update device status.");
    }
  };
  const DeviceCard = ({ device }: { device: Device }) => {
    // Dummy placeholders for last sync and playlist playing info
    const isConnected = device.status === "Connected" || "Online";
    const lastSync = "5 min ago";
    // Use device connectedPlaylists or mock if empty
    const playingPlaylist = device.connectedPlaylists?.length
      ? device.connectedPlaylists[0].name
      : isConnected
        ? "Soft Playlist"
        : null;
    const remainingTime = isConnected ? "30 min left" : null;

    return (
      <div
        className={`relative flex flex-col rounded-xl shadow-lg overflow-hidden w-72 cursor-pointer select-none transition-transform transform hover:scale-[1.02] ${
          isConnected ? "bg-gradient-to-tr from-blue-200 to-blue-100" : "bg-gray-100"}`}
      >
        {/* Device Image */}
        <div className="relative h-44 w-full overflow-hidden rounded-t-xl">
          <img
            src={device.deviceId.imageUrl ?? "/default-device-image.png"}
            alt={device.deviceId.name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
          {/* Status Icon */}
          <div className="absolute top-3 right-3">
            {isConnected ? (
              <div className="bg-orange-500 rounded-full p-2 shadow-lg" title="Playing">
                <FaPlay className="text-white w-4 h-4" />
              </div>
            ) : (
              <div className="bg-gray-500 rounded-full p-2 shadow-lg" title="Info">
                <FaInfoCircle className="text-white w-4 h-4" />
              </div>
            )}
          </div>
        </div>
        {/* Info Section */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-lg text-gray-900">{device.deviceId.name || "Device Name"}</h3>
            <p className="text-xs text-gray-600 mt-1">
              Type : Audio player
              <span className="mx-1">|</span>
              Zone : Entrance
            </p>
            {/* Status Details */}
            <div className="mt-2 space-y-1 text-sm">
              <p className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full inline-block ${
                    isConnected ? "bg-green-500" : "bg-red-500"
                  }`}
                />{" "}
                {isConnected ? "Connected" : "Online"}
              </p>
              <p className="flex items-center gap-2">
                <FaSyncAlt className="inline" />
                Last sync - {lastSync}
              </p>
              <p className="flex items-center gap-2 truncate">
                {isConnected && playingPlaylist ? (
                  <>
                    <FaPlay className="inline text-orange-600" />
                    Playing {playingPlaylist} | {remainingTime}
                  </>
                ) : (
                  <>
                    <FaPauseCircle className="inline text-red-600" />
                    Playlist is not connected
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Footer with actions */}
        <div className="bg-slate-900 text-white flex justify-between rounded-b-xl px-4 py-2">
          {isConnected ? (
            <>
              <button
                onClick={() => handleEditDevice(device)}
                className="text-sm hover:underline focus:outline-none"
                title="Disconnect"
              >
                Disconnect
              </button>
              <button
                onClick={() => alert("Restart device functionality")}
                className="text-sm hover:underline focus:outline-none"
                title="Restart"
              >
                Restart
              </button>
              <button
                onClick={() => alert("Reassign device functionality")}
                className="text-sm hover:underline focus:outline-none"
                title="Reassign"
              >
                Reassign
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleEditDevice(device)}
                className="text-sm hover:underline focus:outline-none"
                title="Connect"
              >
                Connect
              </button>
              <button
                onClick={() => alert("Restart device functionality")}
                className="text-sm hover:underline focus:outline-none"
                title="Restart"
              >
                Restart
              </button>
              <button
                onClick={() => alert("Reassign device functionality")}
                className="text-sm hover:underline focus:outline-none"
                title="Reassign"
              >
                Reassign
              </button>
            </>
          )}
        </div>
      </div>
    );
  };
  return (
    <div className="p-6 bg-[#E9FBFF]-50 min-h-screen">
      <div className="max-w-[1200px] mx-auto space-y-6">
        {/* TOP ROW: Select Media (left) & Selected Media (right) */}
        <div className="grid grid-cols-12 gap-6">
          {/* Select Media */}
          <div className="col-span-7 ">
              <h3 className="text-lg font-bold text-slate-800 mb-3">Select Media</h3>
          <div className=" bg-white rounded-2xl shadow p-5 flex flex-col">


            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
              </div>
            </div>


            {/* Tabs */}
<div className="flex justify-center ">
  <div className="inline-flex shrink-0 w-fit rounded-[20px] overflow-hidden border border-[#07323C]/90 [border-width:0.3px]">
    {(["all", "uploaded", "recorded", "tts"] as const).map((t, i, arr) => (
      <button
        key={t}
        onClick={() => setActiveTab(t)}
        className={`text-sm px-4 py-2 font-medium transition-colors ${
          activeTab === t
            ? "bg-[#07323C] text-white"
            : "bg-white text-[#07323C] hover:bg-slate-100"
        } ${i < arr.length - 1 ? "border-r border-[#07323C]" : ""}`}
      >
        {t === "all"
          ? "All"
          : t === "tts"
          ? "TTS"
          : t[0].toUpperCase() + t.slice(1)}
      </button>
    ))}
  </div>
</div>


<br/>

            {/* Media list */}
            <div className="flex-1 overflow-y-auto max-h-[420px] pr-2">
              {loadingMedia ? (
                <div className="text-center py-6 text-sm text-gray-500">Loading media...</div>
              ) : filteredMedia.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-500">No media files available</div>
              ) : (
<div className="space-y-0">
  {filteredMedia.map((m, idx) => {
    const ext = m.name.split(".").pop()?.toLowerCase() || "";
    const checked = isSelected(m);
     const isAudio = m.type.startsWith("audio/");
                    const isImage = m.type.startsWith("image/");
                    const fileExtension = m.name
                      .split(".")
                      .pop()
                      ?.toLowerCase();
                    const fileName = m.name
                      .split(".")
                      .slice(0, -1)
                      .join(".");
                    if (isImage) {
                      return null;
                    }

    // Find file config in playlist
    const fileConfig = playlistConfig.files.find((f) => f.path === filePath(m));
    const bgEnabled = fileConfig?.backgroundImageEnabled || false;

    return (
      <div
        key={filePath(m)}
        className={`flex items-center justify-between gap-3 p-3 ${
          idx !== filteredMedia.length - 1 ? "border-b border-gray-200" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={checked}
            onChange={() => toggleSelect(m)}
            className="accent-[#FF4500] w-5 h-5"
          />

          <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center text-slate-700">
            {m.type.startsWith("audio") ? <Music /> : <Video />}
          </div>

          <div>
            <div className="font-medium">{m.name.replace(/\.\w+$/, "")}</div>
            <div className="text-xs text-gray-400">{ext}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* BG Image Label */}
          {/* <span className="text-xs font-medium">BG Image</span> */}


          {isAudio &&
                          playlistConfig.files.some(
                            (f) => f.path === m.url
                          ) && (
                            <div className="flex items-center gap-2">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={
                                    playlistConfig.files.find(
                                      (f) => f.path === m.url
                                    )?.backgroundImageEnabled
                                  }
                                  onChange={() => {
                                    const updatedFiles =
                                      playlistConfig.files.map((f) => {
                                        if (f.path === m.url) {
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
                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF4500]"></div>
                                <span className="ml-2 text-xs text-gray-600">
                                  BG Image
                                </span>
                              </label>
                              {playlistConfig.files.find(
                                (f) => f.path === m.url
                              )?.backgroundImageEnabled && (
                                <button
                                  onClick={() => openBgImageSelector(m.url)}
                                  className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                                >
                                  {playlistConfig.files.find(
                                    (f) => f.path === m.url
                                  )?.backgroundImage
                                    ? "Change BG Image"
                                    : "Add BG Image"}
                                </button>
                              )}
                            </div>
                          )}
        </div>
      </div>
    );
  })}
</div>


              )}
            </div>
          </div>
</div>
          {/* Selected Media */}
          <div className="col-span-5 ">
              <h3 className="text-lg font-bold text-slate-800 mb-3">Selected Media</h3>
          <div className=" bg-white rounded-2xl shadow p-5 flex flex-col">

            <div className="flex items-center justify-between mb-4">
            </div>

            <div className="flex-1 overflow-y-auto max-h-[460px] space-y-3">
              {playlistConfig.files.length === 0 ? (
                <div className="text-center text-sm text-gray-400 py-21">No media selected</div>
              ) : (
playlistConfig.files.map((file, index) => (
                  <div
                    key={file.path}
                    className="flex items-center gap-3 p-2 md:p-3 bg-gray-50 rounded"
                  >
                    <span className="text-gray-500 text-sm">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {file.name}
                      </p>
                      {file.type === "audio" && file.backgroundImageEnabled && (
                        <div className="mt-2">
                          {file.backgroundImage ? (
                            <div className="relative w-20 h-20">
                              <img
                                src={
                                  typeof file.backgroundImage === "string"
                                    ? file.backgroundImage
                                    : "#"
                                }
                                alt="Background"
                                className="w-full h-full object-cover rounded-lg"
                              />
                              <button
                                onClick={() => {
                                  const updatedFiles = playlistConfig.files.map(
                                    (f) => {
                                      if (f.path === file.path) {
                                        return {
                                          ...f,
                                          backgroundImage: null,
                                          backgroundImageName: null,
                                        };
                                      }
                                      return f;
                                    }
                                  );
                                  setPlaylistConfig({
                                    ...playlistConfig,
                                    files: updatedFiles,
                                  });
                                }}
                                className="absolute -top-2 -right-2 p-1 bg-white rounded-full shadow-md"
                              >
                                <XCircle size={16} className="text-red-500" />
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
                            newFiles[index].delay =
                              parseInt(e.target.value) || 0;
                            setPlaylistConfig({
                              ...playlistConfig,
                              files: newFiles,
                            });
                          }}
                          className="w-16 p-1 border rounded text-sm"
                        />
                      </div>
                      {/* NEW: Volume Controls */}
                      <div className="mt-3 space-y-2">
                        <div>
                          <label className="text-xs text-gray-600">
                            Min Volume: {file.minVolume}
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={file.minVolume}
                            onChange={(e) => {
                              const newFiles = [...playlistConfig.files];
                              newFiles[index].minVolume = parseInt(
                                e.target.value
                              );
                              setPlaylistConfig({
                                ...playlistConfig,
                                files: newFiles,
                              });
                            }}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">
                            Max Volume: {file.maxVolume}
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={file.maxVolume}
                            onChange={(e) => {
                              const newFiles = [...playlistConfig.files];
                              newFiles[index].maxVolume = parseInt(
                                e.target.value
                              );
                              setPlaylistConfig({
                                ...playlistConfig,
                                files: newFiles,
                              });
                            }}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div></div>

        {/* MIDDLE ROW: Let's setup your playlist (left) & Your Schedules (right) */}
        <div className="grid grid-cols-12 gap-6">
          {/* Playlist Setup - REFACTORED SECTION */}
          <div className="col-span-7">
            <div className="bg-white rounded-xl shadow-sm p-6 text-black">
              <div className="mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold">Create Announcement Playlist</h2>
                <p className="text-gray-600 text-sm mt-1">Schedule and organize your announcements</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Playlist Name</label>
                  <input
                    type="text"
                    value={playlist.name}
                    onChange={(e) => setPlaylist(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-3 border rounded-lg text-sm"
                    placeholder="e.g., Daily Store Closing Announcements"
                  />
                </div>

                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Clock size={18} /> Schedule Configuration
                  </h3>
                  <div>
                    <label className="block text-sm font-medium mb-2">Schedule Type</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[{ type: 'hourly', label: 'Frequency Based', desc: 'Play at regular intervals', icon: Clock }, { type: 'timed', label: 'Scheduled Time', desc: 'Play at specific times', icon: Calendar }].map(({ type, label, desc, icon: Icon }) => (
                        <div
                          key={type}
                          onClick={() => handleScheduleTypeChange(type as 'hourly' | 'timed')}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${playlist.schedule.scheduleType === type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon size={16} />
                            <span className="font-medium">{label}</span>
                          </div>
                          <p className="text-xs text-gray-600">{desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {playlist.schedule.scheduleType === 'hourly' && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Frequency (min)</label>
                        <input
                          type="number"
                          min="1"
                          value={playlist.schedule.frequency || 60}
                          onChange={(e) => setPlaylist(prev => ({
                            ...prev,
                            schedule: { ...prev.schedule, frequency: parseInt(e.target.value, 10) || 1 }
                          }))}
                          className="w-full p-2 border rounded text-sm"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium mb-1">Start Date</label>
                      <input
                        type="date"
                        value={playlist.schedule.startDate || ''}
                        onChange={(e) => setPlaylist(prev => ({
                          ...prev,
                          schedule: { ...prev.schedule, startDate: e.target.value }
                        }))}
                        className="w-full p-2 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">End Date</label>
                      <input
                        type="date"
                        value={playlist.schedule.endDate || ''}
                        onChange={(e) => setPlaylist(prev => ({
                          ...prev,
                          schedule: { ...prev.schedule, endDate: e.target.value }
                        }))}
                        className="w-full p-2 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Start Time</label>
                      <input
                        type="time"
                        value={playlist.schedule.startTime || ''}
                        onChange={(e) => setPlaylist(prev => ({
                          ...prev,
                          schedule: { ...prev.schedule, startTime: e.target.value }
                        }))}
                        className="w-full p-2 border rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">End Time</label>
                      <input
                        type="time"
                        value={playlist.schedule.endTime || ''}
                        onChange={(e) => setPlaylist(prev => ({
                          ...prev,
                          schedule: { ...prev.schedule, endTime: e.target.value }
                        }))}
                        className="w-full p-2 border rounded text-sm"
                      />
                    </div>
                    <div className="md:col-span-2 lg:col-span-3">
                      <label className="block text-sm font-medium mb-1">Days of Week (Optional)</label>
                      <div className="flex gap-2 flex-wrap">
                        {daysList.map((day) => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => setPlaylist(prev => ({
                              ...prev,
                              schedule: {
                                ...prev.schedule,
                                daysOfWeek: prev.schedule.daysOfWeek?.includes(day.value)
                                  ? prev.schedule.daysOfWeek.filter(d => d !== day.value)
                                  : [...(prev.schedule.daysOfWeek || []), day.value],
                              }
                            }))}
                            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${playlist.schedule.daysOfWeek?.includes(day.value) ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Leave all unchecked to run every day within the date range.</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                   
                   


                  </div>

                  <div>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {playlist.announcements.length === 0 ? null : (
                        playlist.announcements.map((item, index) => {
                          const file = getSelectedFile(item.file);
                          if (!file) return null;

                          return (
                            <div key={item.file} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                              <span className="text-gray-500 text-sm font-medium w-6">{index + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{file.name}</p>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-2">
                                  {/* Delay Control */}
                                  <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-600">Delay(s)</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="300"
                                      value={item.delay}
                                      onChange={(e) => updateAnnouncementDelay(item.file, parseInt(e.target.value) || 0)}
                                      className="w-16 p-1 border rounded text-sm"
                                    />
                                  </div>
                                  {/* Volume Control */}
                                  <div className="flex items-center gap-2 flex-1">
                                    <Volume2 size={16} className="text-gray-500 flex-shrink-0" />
                                    <input
                                      type="range"
                                      min="0"
                                      max="100"
                                      value={item.maxVolume}
                                      onChange={(e) => updateAnnouncementVolume(item.file, parseInt(e.target.value))}
                                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <span className="text-xs font-mono text-gray-600 w-10 text-right">{item.maxVolume}%</span>
                                  </div>
                                </div>
                              </div>
                              <button onClick={() => removeAnnouncement(item.file)} className="text-red-500 hover:text-red-700">
                                <XCircle size={16} />
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button onClick={onCancel || (() => console.log('Cancel'))} className="px-6 py-2 text-gray-600 hover:text-gray-900">Cancel</button>
                  <button
                    onClick={handleSave}
                    disabled={isLoading || playlist.announcements.length === 0 || !playlist.name.trim()}
                    className={`px-6 py-2 rounded-lg font-medium ${
                      isLoading || playlist.announcements.length === 0 || !playlist.name.trim()
                        ? "bg-blue-300 cursor-not-allowed text-white"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                    }`}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        <span>Saving...</span>
                      </div>
                    ) : (
                      'Save Playlist'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>


          {/* Your Schedules */}
          <div className="col-span-5 ">
            <h3 className="text-2xl font-bold text-[#07323C] mb-6">Your Announcement</h3>
            <div className="bg-[#E9FBFF] rounded-2xl p-6">
              <AnnouncementPlaylistSummary userId={userId} />
            </div>
          </div>
        
        
        </div>





        {/* BOTTOM ROW: Available Devices (full width) */}
          <section>
        <h2 className="text-lg font-semibold font-sans mb-5">Available Devices</h2>
        {isLoading ? (
          <p className="text-gray-500 font-sans">Loading devices...</p>
        ) : devices.length === 0 ? (
          <p className="text-gray-500 font-sans">No devices found.</p>
        ) : (
          <div className="flex flex-wrap gap-6">
            {devices.map((device) => (
              <DeviceCard key={device._id} device={device} />
            ))}
          </div>
        )}
      </section>
      </div>

      {/* BG Image Modal */}
      {bgModalFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setBgModalFor(null)} />
          <div className="relative z-10 bg-white rounded-xl p-6 w-[880px] max-w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Select Background Image</h4>
              <button onClick={() => setBgModalFor(null)} className="p-1 rounded hover:bg-gray-100"><X /></button>
            </div>

            <div className="grid grid-cols-4 gap-4 max-h-[420px] overflow-y-auto">
              {imageFiles.length === 0 && <div className="col-span-4 text-center text-gray-400 py-8">No images available</div>}
              {imageFiles.map((img) => (
                <div key={filePath(img)} className="rounded overflow-hidden cursor-pointer border hover:scale-[1.02] transform transition" onClick={() => chooseBgImage(img)}>
                  <img src={img.url} alt={img.name} className="w-full h-36 object-cover" />
                  <div className="p-2 text-sm text-center">{img.name}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-4">
              <button onClick={() => setBgModalFor(null)} className="px-4 py-2 rounded bg-gray-100">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}