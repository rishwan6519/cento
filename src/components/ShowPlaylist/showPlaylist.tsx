"use client";
import React, { useState, useEffect } from "react";
import { 
  Trash2, Edit, XCircle, ImageIcon, Music, Video, 
  Plus, Calendar, Clock, ChevronDown, ChevronUp, 
  Play, Pause, Save, ArrowLeft, Search
} from "lucide-react";
import toast from "react-hot-toast";
import { FaListUl } from "react-icons/fa6";
import { BsFillGridFill } from "react-icons/bs";
import { RiArrowDropDownLine } from "react-icons/ri";
import { MdQueueMusic } from "react-icons/md";

// --- Constants & Utilities ---
const ASSET_BASE_URL = "https://iot.centelon.com";
const generateUniqueId = () => Math.random().toString(36).substring(2, 15);
const defaultActiveSection = "showPlaylist";

// Helper to ensure all media links point to the correct domain
const getAbsoluteUrl = (path: string | undefined | null) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  // Ensure we don't double slash
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${ASSET_BASE_URL}${cleanPath}`;
};

// --- Interfaces ---
interface PlaylistFile {
  id: string;
  name: string;
  type: string;
  path: string;
  file?: File;
  displayOrder?: number;
  delay?: number;
  backgroundImageEnabled?: boolean;
  backgroundImage?: string | null;
}

interface Playlist {
  _id?: string;
  name: string;
  type: string;
  contentType: string;
  files: PlaylistFile[];
  startTime?: string;
  endTime?: string;
  startDate?: string;
  endDate?: string;
  daysOfWeek?: string[];
  createdAt?: string;
  status?: 'active' | 'inactive';
}

interface EditablePlaylist {
  id?: string;
  name: string;
  type: string;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  daysOfWeek: string[];
  files: PlaylistFile[];
  status?: 'active' | 'inactive';
}

interface MediaFile {
  id: string;
  name: string;
  type: string;
  url: string;
}

const PlaylistManager: React.FC = () => {
  // --- State ---
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState<boolean>(true);
  const [isLoadingMedia, setIsLoadingMedia] = useState<boolean>(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedPlaylist, setEditedPlaylist] = useState<EditablePlaylist | null>(null);
  const [availableMediaFiles, setAvailableMediaFiles] = useState<MediaFile[]>([]);
  const [localMediaFiles, setLocalMediaFiles] = useState<MediaFile[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  
  // UI State for editing
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const [mediaSearchTerm, setMediaSearchTerm] = useState<string>("");
  const [playingMediaId, setPlayingMediaId] = useState<string | null>(null);

  // --- Effects ---
  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) setUserId(storedUserId);
  }, []);

  useEffect(() => {
    if (defaultActiveSection === "showPlaylist" && userId) fetchPlaylists();
  }, [userId, defaultActiveSection]);

  useEffect(() => {
    if (defaultActiveSection === "showPlaylist" && userId && localMediaFiles.length === 0) {
      fetchMedia();
    }
  }, [userId, defaultActiveSection, localMediaFiles.length]);

  useEffect(() => {
    if (isEditing && editedPlaylist) updateAvailableMediaFiles();
  }, [isEditing, editedPlaylist, localMediaFiles]);

  // --- Logic Helpers ---
  const updateAvailableMediaFiles = () => {
    if (!editedPlaylist) return;
    // Compare paths using normalized URLs to ensure accurate filtering
    const playlistPaths = editedPlaylist.files.map((file) => file.path);
    const available = localMediaFiles.filter((media) => !playlistPaths.includes(media.url));
    setAvailableMediaFiles(available);
  };

  const fetchMedia = async () => {
    if (!userId) return;
    setIsLoadingMedia(true);
    try {
      const response = await fetch(`/api/media?userId=${encodeURIComponent(userId)}`);
      if (!response.ok) throw new Error("Failed to fetch media files");
      const data = await response.json();
      const mediaFiles = data.media || [];
      
      // Process media files and normalize URLs immediately
      const processedMediaFiles = mediaFiles.map((file: any) => ({
        ...file,
        id: file.id || generateUniqueId(),
        url: getAbsoluteUrl(file.url) // Fix relative paths here
      }));

      setLocalMediaFiles(processedMediaFiles);
      return processedMediaFiles;
    } catch (error) {
      console.error("Error fetching media:", error);
      toast.error("Failed to fetch media files");
      return [];
    } finally {
      setIsLoadingMedia(false);
    }
  };

  const fetchPlaylists = async () => {
    if (!userId) return;
    setIsLoadingPlaylists(true);
    try {
      const response = await fetch(`/api/playlists?userId=${encodeURIComponent(userId)}`);
      if (!response.ok) throw new Error("Failed to fetch playlists");
      const data = await response.json();
      setPlaylists(data || []);
    } catch (error) {
      console.error("Error fetching playlists:", error);
      toast.error("Failed to fetch playlists");
      setPlaylists([]);
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  const handleEditClick = async (_e: React.MouseEvent, playlist: Playlist) => {
    if (localMediaFiles.length === 0) {
      toast.loading("Loading media files...");
      try {
        await fetchMedia();
        toast.dismiss();
        initializeEditedPlaylist(playlist);
        setIsEditing(true);
      } catch (error) {
        toast.error("Failed to load media files");
      }
    } else {
      initializeEditedPlaylist(playlist);
      setIsEditing(true);
    }
  };

  const initializeEditedPlaylist = (playlist: Playlist) => {
    const safeFiles = Array.isArray(playlist.files) ? playlist.files : [];
    
    setEditedPlaylist({
      id: playlist._id,
      name: playlist.name || "",
      type: playlist.type || "",
      startTime: playlist.startTime || "00:00",
      endTime: playlist.endTime || "23:59",
      startDate: playlist.startDate || "",
      endDate: playlist.endDate || "",
      daysOfWeek: Array.isArray(playlist.daysOfWeek) ? playlist.daysOfWeek : [],
      status: playlist.status || 'active',
      // Map files and fix URLs if they are relative
      files: safeFiles.map((file, index) => ({
        id: file.id || generateUniqueId(),
        name: file.name,
        type: file.type,
        displayOrder: index + 1,
        path: getAbsoluteUrl(file.path), // Fix path
        delay: file.delay || 0,
        backgroundImageEnabled: !!file.backgroundImageEnabled,
        backgroundImage: file.backgroundImage ? getAbsoluteUrl(file.backgroundImage) : null, // Fix bg image
      })),
    });
  };

  const handleSearch = (term: string) => {
    if (!term.trim()) {
      fetchPlaylists();
      return;
    }
    const filtered = playlists.filter(
      (playlist) =>
        playlist.name.toLowerCase().includes(term.toLowerCase()) ||
        playlist.type.toLowerCase().includes(term.toLowerCase())
    );
    setPlaylists(filtered);
  };

  const handleAddFileToPlaylist = (mediaFile: MediaFile) => {
    if (!editedPlaylist) return;
    const newFile: PlaylistFile = {
      id: generateUniqueId(),
      name: mediaFile.name,
      type: mediaFile.type,
      path: mediaFile.url, // This is already absolute from fetchMedia
      delay: 0,
      backgroundImageEnabled: false,
      backgroundImage: null,
    };
    setEditedPlaylist({
      ...editedPlaylist,
      files: [...editedPlaylist.files, newFile],
    });
    setAvailableMediaFiles(availableMediaFiles.filter((m) => m.url !== mediaFile.url));
  };

  const handleRemoveFileFromPlaylist = (fileId: string) => {
    if (!editedPlaylist) return;
    const fileToRemove = editedPlaylist.files.find((f) => f.id === fileId);
    setEditedPlaylist({
      ...editedPlaylist,
      files: editedPlaylist.files.filter((f) => f.id !== fileId),
    });
    if (fileToRemove) {
      const mediaFileToAdd = localMediaFiles.find((m) => m.url === fileToRemove.path);
      if (mediaFileToAdd) {
        setAvailableMediaFiles([...availableMediaFiles, mediaFileToAdd]);
      }
    }
  };

  const handleEditPlaylist = async (playlist: EditablePlaylist | null) => {
    if (!playlist || !playlist.id) return;
    try {
      const response = await fetch(`/api/playlists/id?id=${playlist.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: playlist.name,
          type: playlist.type,
          startTime: playlist.startTime,
          endTime: playlist.endTime,
          startDate: playlist.startDate,
          endDate: playlist.endDate,
          daysOfWeek: playlist.daysOfWeek || [],
          status: playlist.status,
          files: playlist.files.map((file, index) => ({
            id: file.id,
            name: file.name,
            type: file.type,
            url: file.path, // Sending the full URL back to DB
            displayOrder: index + 1,
            delay: file.delay || 0,
            path: file.path,
            backgroundImageEnabled: file.backgroundImageEnabled || false,
            backgroundImage: file.backgroundImage || null,
          })),
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update playlist");
      }
      
      await fetchPlaylists();
      toast.success("Playlist updated successfully");
      setIsEditing(false);
      setEditedPlaylist(null);
    } catch (error) {
      console.error("Error updating playlist:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update playlist");
    }
  };

  const handleDeletePlaylistWithFiles = async (playlistId: string | undefined) => {
    if (!playlistId) return toast.error("Invalid playlist ID");
    if (!confirm("Are you sure you want to delete this playlist?")) return;

    try {
      const params = new URLSearchParams({ id: playlistId });
      const response = await fetch(`/api/playlists/id?${params.toString()}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Playlist deleted successfully");
        await fetchPlaylists();
        if (selectedPlaylist?._id === playlistId) setSelectedPlaylist(null);
      } else {
        throw new Error(data.error || "Failed to delete playlist");
      }
    } catch (error) {
      console.error("Error deleting playlist:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete playlist");
    }
  };

  const toggleFileExpansion = (id: string) => {
    setExpandedFileId(expandedFileId === id ? null : id);
  };

  // --- Render Helpers ---
  const renderMediaIcon = (type: string, size = 18) => {
    if (type.includes("image")) return <ImageIcon size={size} className="text-emerald-500" />;
    if (type.includes("video")) return <Video size={size} className="text-blue-500" />;
    if (type.includes("audio")) return <Music size={size} className="text-purple-500" />;
    return <XCircle size={size} />;
  };

  const filteredPlaylists = playlists.filter((playlist) => {
    if (statusFilter === "all") return true;
    return playlist.status === statusFilter;
  });

  const filteredAvailableMedia = availableMediaFiles.filter(media => 
    media.name.toLowerCase().includes(mediaSearchTerm.toLowerCase()) &&
    (media.type.includes("audio") || media.type.includes("video"))
  );

  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  if (defaultActiveSection !== "showPlaylist") return null;

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 text-slate-800 font-sans">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
            {isEditing ? "Edit Playlist" : "Playlist Manager"}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {isEditing ? "Manage tracks and scheduling details" : "Create and manage your digital signage content"}
          </p>
        </div>
        
        {!isEditing && (
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
             {/* Search */}
             <div className="relative flex-grow sm:flex-grow-0">
                <input
                  type="text"
                  placeholder="Search..."
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full sm:w-64 bg-white border-none rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-sm text-sm"
                />
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </div>

              {/* Filter */}
              <div className="relative">
                <select
                  className="pl-3 pr-8 py-2 bg-white rounded-xl shadow-sm border-none text-sm focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <RiArrowDropDownLine className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              </div>

              {/* View Toggle */}
              <div className="flex bg-white rounded-xl shadow-sm p-1">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-slate-100 text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
                >
                  <FaListUl size={16} />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-slate-100 text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
                >
                  <BsFillGridFill size={16} />
                </button>
              </div>
          </div>
        )}
      </div>

      {isLoadingPlaylists ? (
        <div className="flex flex-col justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-500">Loading your content...</p>
        </div>
      ) : isEditing && editedPlaylist ? (
        
        // --- EDIT MODE ---
        <div className="animate-in fade-in duration-300">
          {/* Top Controls: Back & Save */}
          <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm sticky top-2 z-20">
            <button 
              onClick={() => { setIsEditing(false); setEditedPlaylist(null); }}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft size={18} /> Back
            </button>
            <div className="flex gap-3">
              <button 
                onClick={() => { setIsEditing(false); setEditedPlaylist(null); }}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleEditPlaylist(editedPlaylist)}
                className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition shadow-md hover:shadow-lg"
              >
                <Save size={16} /> Save Changes
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT COLUMN: Playlist Settings & Tracks (8 cols) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* General Info Card */}
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Edit size={18} className="text-blue-500" /> General Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Name</label>
                    <input
                      type="text"
                      value={editedPlaylist.name}
                      onChange={(e) => setEditedPlaylist({ ...editedPlaylist, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Status</label>
                    <select
                      value={editedPlaylist.status}
                      onChange={(e) => setEditedPlaylist({ ...editedPlaylist, status: e.target.value as any })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Schedule Accordion */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                   <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1"><Clock size={12}/> Start Time</label>
                        <input type="time" value={editedPlaylist.startTime} onChange={(e) => setEditedPlaylist({...editedPlaylist, startTime: e.target.value})} className="w-full p-2 rounded border border-slate-200 text-sm"/>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1"><Clock size={12}/> End Time</label>
                        <input type="time" value={editedPlaylist.endTime} onChange={(e) => setEditedPlaylist({...editedPlaylist, endTime: e.target.value})} className="w-full p-2 rounded border border-slate-200 text-sm"/>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1"><Calendar size={12}/> Start Date</label>
                        <input type="date" value={editedPlaylist.startDate} onChange={(e) => setEditedPlaylist({...editedPlaylist, startDate: e.target.value})} className="w-full p-2 rounded border border-slate-200 text-sm"/>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1"><Calendar size={12}/> End Date</label>
                        <input type="date" value={editedPlaylist.endDate} onChange={(e) => setEditedPlaylist({...editedPlaylist, endDate: e.target.value})} className="w-full p-2 rounded border border-slate-200 text-sm"/>
                      </div>
                   </div>
                   <div>
                      <label className="text-xs text-slate-500 mb-2 block">Active Days</label>
                      <div className="flex flex-wrap gap-2">
                        {daysOfWeek.map((day) => {
                          const isSelected = editedPlaylist.daysOfWeek?.includes(day);
                          return (
                            <button
                              key={day}
                              onClick={() => {
                                const updatedDays = isSelected
                                  ? (editedPlaylist.daysOfWeek || []).filter((d) => d !== day)
                                  : [...(editedPlaylist.daysOfWeek || []), day];
                                setEditedPlaylist({ ...editedPlaylist, daysOfWeek: updatedDays });
                              }}
                              className={`px-3 py-1 text-xs rounded-full border transition-all ${isSelected ? 'bg-blue-500 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
                            >
                              {day.charAt(0).toUpperCase() + day.slice(1,3)}
                            </button>
                          );
                        })}
                      </div>
                   </div>
                </div>
              </div>

              {/* Selected Tracks List */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <MdQueueMusic size={18} className="text-blue-500"/> 
                    Playlist Tracks <span className="text-xs font-normal text-slate-400">({editedPlaylist.files.length})</span>
                  </h3>
                </div>

                <div className="divide-y divide-slate-100 min-h-[200px]">
                  {editedPlaylist.files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <Music size={40} className="mb-2 opacity-20"/>
                      <p>No tracks added yet.</p>
                      <p className="text-xs">Select media from the library on the right.</p>
                    </div>
                  ) : (
                    editedPlaylist.files.map((file, index) => (
                      <div key={file.id} className="bg-white group">
                        {/* Track Header / Main Row */}
                        <div className="flex items-center p-3 hover:bg-blue-50/30 transition-colors gap-3">
                          <span className="text-xs font-bold text-slate-300 w-6 text-center">{index + 1}</span>
                          
                          {/* Thumbnail / Icon */}
                          <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-200">
                             {file.type.includes("image") ? (
                               <img src={file.path} alt="" className="h-full w-full object-cover"/>
                             ) : renderMediaIcon(file.type)}
                          </div>

                          <div className="flex-1 min-w-0">
                             <h4 className="text-sm font-medium text-slate-700 truncate">{file.name}</h4>
                             <p className="text-xs text-slate-400 capitalize">{file.type.split('/')[0]}</p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                             {file.type.includes("audio") && (
                               <button 
                                 onClick={() => toggleFileExpansion(file.id)}
                                 className={`p-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${expandedFileId === file.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                               >
                                  Settings {expandedFileId === file.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                               </button>
                             )}
                             <button 
                               onClick={() => handleRemoveFileFromPlaylist(file.id)}
                               className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                             >
                               <Trash2 size={16}/>
                             </button>
                          </div>
                        </div>

                        {/* Expanded Settings (Audio only usually) */}
                        {expandedFileId === file.id && file.type.includes("audio") && (
                          <div className="bg-slate-50 p-4 border-t border-b border-slate-100 animate-in slide-in-from-top-2 duration-200">
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                   <label className="text-xs font-semibold text-slate-500 mb-1 block">Audio Player</label>
                                   <audio src={file.path} controls className="w-full h-8"/>
                                </div>
                                
                                <div>
                                   <label className="text-xs font-semibold text-slate-500 mb-1 block">Delay (Seconds)</label>
                                   <input 
                                     type="number" 
                                     min="0"
                                     value={file.delay || 0}
                                     onChange={(e) => {
                                        const newFiles = [...editedPlaylist.files];
                                        newFiles[index] = { ...file, delay: parseInt(e.target.value) };
                                        setEditedPlaylist({ ...editedPlaylist, files: newFiles });
                                     }}
                                     className="w-full p-1.5 text-sm border border-slate-300 rounded"
                                   />
                                </div>

                                <div className="sm:col-span-2 border-t border-slate-200 pt-3 mt-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-slate-600">Background Image Display</label>
                                        <div className="relative inline-block w-10 h-5 align-middle select-none transition duration-200 ease-in">
                                            <input 
                                              type="checkbox" 
                                              checked={file.backgroundImageEnabled}
                                              onChange={(e) => {
                                                const newFiles = [...editedPlaylist.files];
                                                newFiles[index] = { ...file, backgroundImageEnabled: e.target.checked, backgroundImage: e.target.checked ? file.backgroundImage : null };
                                                setEditedPlaylist({ ...editedPlaylist, files: newFiles });
                                              }}
                                              className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer"
                                            />
                                            <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${file.backgroundImageEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}></label>
                                        </div>
                                    </div>
                                    
                                    {file.backgroundImageEnabled && (
                                      <div className="bg-white p-3 rounded-lg border border-slate-200">
                                         {file.backgroundImage ? (
                                            <div className="relative group w-24 h-24">
                                               <img src={file.backgroundImage} className="w-full h-full object-cover rounded-md border"/>
                                               <button 
                                                 onClick={() => {
                                                    const newFiles = [...editedPlaylist.files];
                                                    newFiles[index] = { ...file, backgroundImage: null };
                                                    setEditedPlaylist({ ...editedPlaylist, files: newFiles });
                                                 }}
                                                 className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition"
                                               >
                                                 <XCircle size={14}/>
                                               </button>
                                            </div>
                                         ) : (
                                            <select 
                                              onChange={(e) => {
                                                const img = localMediaFiles.find(m => m.url === e.target.value);
                                                if(img) {
                                                   const newFiles = [...editedPlaylist.files];
                                                   newFiles[index] = { ...file, backgroundImage: img.url };
                                                   setEditedPlaylist({ ...editedPlaylist, files: newFiles });
                                                }
                                              }}
                                              className="w-full p-2 text-sm border rounded"
                                            >
                                               <option value="">Select an image from library...</option>
                                               {localMediaFiles.filter(m => m.type.includes('image')).map(img => (
                                                  <option key={img.id} value={img.url}>{img.name}</option>
                                               ))}
                                            </select>
                                         )}
                                      </div>
                                    )}
                                </div>
                             </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Available Media (4 cols) */}
            <div className="lg:col-span-5">
               <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[calc(100vh-140px)] sticky top-24">
                  <div className="p-4 border-b border-slate-100">
                     <h3 className="font-bold text-slate-800 mb-2">Media Library</h3>
                     <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <input 
                          type="text" 
                          placeholder="Search available files..." 
                          value={mediaSearchTerm}
                          onChange={(e) => setMediaSearchTerm(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border-none rounded-lg text-sm focus:ring-1 focus:ring-blue-500"
                        />
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                     {filteredAvailableMedia.length === 0 ? (
                        <p className="text-center text-slate-400 text-sm mt-10">No matching media found.</p>
                     ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 gap-3">
                           {filteredAvailableMedia.map((media) => (
                              <div key={media.id} className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all">
                                 {/* Thumbnail Area */}
                                 <div className="aspect-square bg-slate-100 relative">
                                    {media.type.includes("image") && <img src={media.url} alt={media.name} className="w-full h-full object-cover"/>}
                                    {media.type.includes("video") && (
                                      playingMediaId === media.id ? (
                                        <video src={media.url} autoPlay controls className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                            <Video className="text-white/50" size={32}/>
                                        </div>
                                      )
                                    )}
                                    {media.type.includes("audio") && (
                                       <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
                                          <Music className="text-purple-400" size={32}/>
                                       </div>
                                    )}

                                    {/* Overlay Play Button (for Video/Audio) */}
                                    {(media.type.includes("video") || media.type.includes("audio")) && playingMediaId !== media.id && (
                                       <button 
                                         onClick={(e) => { e.stopPropagation(); setPlayingMediaId(media.id); }}
                                         className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all"
                                       >
                                          <div className="bg-white/90 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all">
                                             <Play size={16} className="text-blue-600 ml-0.5"/>
                                          </div>
                                       </button>
                                    )}
                                 </div>

                                 {/* Card Footer */}
                                 <div className="p-2.5">
                                    <p className="text-xs font-medium text-slate-700 truncate mb-2" title={media.name}>{media.name}</p>
                                    <button 
                                      onClick={() => handleAddFileToPlaylist(media)}
                                      className="w-full py-1.5 bg-slate-900 text-white text-xs rounded-md hover:bg-blue-600 transition flex items-center justify-center gap-1"
                                    >
                                       <Plus size={12}/> Add
                                    </button>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               </div>
            </div>

          </div>
        </div>

      ) : (
        // --- VIEW MODE: LIST / GRID ---
        <div className="animate-in fade-in duration-500">
          {filteredPlaylists.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
              <MdQueueMusic className="mx-auto h-16 w-16 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No playlists found</h3>
              <p className="text-slate-500">Create a new playlist to get started.</p>
            </div>
          ) : viewMode === "list" ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Schedule</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tracks</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {filteredPlaylists.map((playlist) => (
                      <tr key={playlist._id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center text-white">
                              <MdQueueMusic size={20} />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-slate-900">{playlist.name}</div>
                              <div className="text-xs text-slate-500">Created: {new Date(playlist.createdAt!).toLocaleDateString()}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${playlist.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                            {playlist.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          <div className="flex items-center gap-1">
                             <Clock size={14} className="text-slate-400"/>
                             {playlist.daysOfWeek?.length === 7 ? "Everyday" : playlist.daysOfWeek?.join(", ") || "No schedule"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                           {playlist.files?.length || 0} items
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => handleEditClick(e, playlist)}
                              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition shadow-sm"
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeletePlaylistWithFiles(playlist._id)}
                              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition shadow-sm"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredPlaylists.map((playlist) => (
                <div key={playlist._id} className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-100 transition-all p-5 flex flex-col relative group">
                  <div className="flex items-start justify-between mb-4">
                     <div className="p-3 bg-slate-900 rounded-xl text-white">
                        <MdQueueMusic size={24} />
                     </div>
                     <span className={`px-2 py-1 text-xs font-semibold rounded-md ${playlist.status === 'active' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-slate-50 text-slate-600 border border-slate-100'}`}>
                        {playlist.status}
                     </span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-900 mb-1 truncate" title={playlist.name}>{playlist.name}</h3>
                  <div className="text-sm text-slate-500 mb-4 flex items-center gap-2">
                     <span className="flex items-center gap-1"><FaListUl size={12}/> {playlist.files?.length || 0} Tracks</span>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                     <span>{new Date(playlist.createdAt!).toLocaleDateString()}</span>
                     <div className="flex gap-2">
                        <button onClick={(e) => handleEditClick(e, playlist)} className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition"><Edit size={16}/></button>
                        <button onClick={() => handleDeletePlaylistWithFiles(playlist._id)} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition"><Trash2 size={16}/></button>
                     </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
};

export default PlaylistManager;