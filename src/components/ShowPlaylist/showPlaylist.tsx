"use client";
import React, { useState, useEffect } from "react";
import { Trash2, Edit, XCircle, ImageIcon, Music, Video, PlusCircle, Volume2 } from "lucide-react";
import toast from "react-hot-toast";

// Mock functions for standalone functionality
const generateUniqueId = () => Math.random().toString(36).substring(2, 15);

// Interfaces for types
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
  minVolume?: number; // Added minVolume
  maxVolume?: number; // Added maxVolume
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
  shuffle?: boolean;
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
  shuffle: boolean;
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
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState<boolean>(true);
  const [isLoadingMedia, setIsLoadingMedia] = useState<boolean>(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedPlaylist, setEditedPlaylist] = useState<EditablePlaylist | null>(null);
  const [availableMediaFiles, setAvailableMediaFiles] = useState<MediaFile[]>([]);
  const [localMediaFiles, setLocalMediaFiles] = useState<MediaFile[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchPlaylists();
    }
  }, [userId]);

  useEffect(() => {
    if (userId && localMediaFiles.length === 0) {
      fetchMedia();
    }
  }, [userId, localMediaFiles.length]);

  useEffect(() => {
    if (isEditing && editedPlaylist) {
      updateAvailableMediaFiles();
    }
  }, [isEditing, editedPlaylist, localMediaFiles]);

  const updateAvailableMediaFiles = () => {
    if (!editedPlaylist) return;
    const playlistPaths = editedPlaylist.files.map((file) => file.path);
    const available = localMediaFiles.filter(
      (media) => !playlistPaths.includes(media.url)
    );
    setAvailableMediaFiles(available);
  };

  const fetchMedia = async () => {
    if (!userId) return;
    setIsLoadingMedia(true);
    try {
      const response = await fetch(`/api/media?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch media files");
      const data = await response.json();
      const mediaFiles = data.media || [];
      const processedMediaFiles = mediaFiles.map((file: any) => ({
        ...file,
        id: file.id || generateUniqueId(),
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
      const response = await fetch(`/api/playlists?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch playlists");
      const data = await response.json();
      setPlaylists(data || []);
    } catch (error) {
      console.error("Error fetching playlists:", error);
      toast.error("Failed to fetch playlists");
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  const handleEditClick = async (e: React.MouseEvent, playlist: Playlist) => {
    e.stopPropagation();
    if (localMediaFiles.length === 0) {
      const loadingToast = toast.loading("Loading media files...");
      try {
        await fetchMedia();
        toast.dismiss(loadingToast);
      } catch (error) {
        toast.error("Failed to load media files for editing.");
        return;
      }
    }
    setIsEditing(true);
    initializeEditedPlaylist(playlist);
  };
  
  const handleSearch = (term: string) => {
    if (!term.trim()) {
      fetchPlaylists();
      return;
    }
    const filtered = playlists.filter(
      (p) => p.name.toLowerCase().includes(term.toLowerCase())
    );
    setPlaylists(filtered);
  };


  const initializeEditedPlaylist = (playlist: Playlist) => {
    setEditedPlaylist({
      id: playlist._id,
      name: playlist.name,
      type: playlist.type,
      startTime: playlist.startTime || "00:00",
      endTime: playlist.endTime || "23:59",
      startDate: playlist.startDate || "",
      endDate: playlist.endDate || "",
      daysOfWeek: playlist.daysOfWeek || [],
      shuffle: playlist.shuffle || false,
      status: playlist.status || 'active',
      files: playlist.files.map((file, index) => ({
        id: file.id || generateUniqueId(),
        name: file.name,
        type: file.type,
        displayOrder: index + 1,
        path: file.path,
        delay: file.delay || 0,
        backgroundImageEnabled: file.backgroundImageEnabled || false,
        backgroundImage: file.backgroundImage || null,
        minVolume: file.minVolume || 0, // Initialize minVolume
        maxVolume: file.maxVolume || 100, // Initialize maxVolume
      })),
    });
  };

  const handleAddFileToPlaylist = (mediaFile: MediaFile) => {
    if (!editedPlaylist) return;
    const newFile: PlaylistFile = {
      id: generateUniqueId(),
      name: mediaFile.name,
      type: mediaFile.type,
      path: mediaFile.url,
      delay: 0,
      backgroundImageEnabled: false,
      backgroundImage: null,
      minVolume: 0, // Default values for new files
      maxVolume: 100,
    };
    setEditedPlaylist({
      ...editedPlaylist,
      files: [...editedPlaylist.files, newFile],
    });
    setAvailableMediaFiles(
      availableMediaFiles.filter((m) => m.url !== mediaFile.url)
    );
  };

  const handleRemoveFileFromPlaylist = (fileId: string) => {
    if (!editedPlaylist) return;
    const fileToRemove = editedPlaylist.files.find((f) => f.id === fileId);
    setEditedPlaylist({
      ...editedPlaylist,
      files: editedPlaylist.files.filter((f) => f.id !== fileId),
    });
    if (fileToRemove) {
      const mediaFileToAdd = localMediaFiles.find(
        (m) => m.url === fileToRemove.path
      );
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
          ...playlist,
          files: playlist.files.map((file, index) => ({
            ...file,
            displayOrder: index + 1,
            // Ensure volume values are sent to the API
            minVolume: file.minVolume || 0,
            maxVolume: file.maxVolume || 100,
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
    if (!playlistId || !confirm("Are you sure you want to delete this playlist?")) return;
    
    try {
      const response = await fetch(`/api/playlists/id?id=${playlistId}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to delete");

      toast.success("Playlist deleted successfully");
      await fetchPlaylists();
      if (selectedPlaylist?._id === playlistId) setSelectedPlaylist(null);
    } catch (error) {
      console.error("Error deleting playlist:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete playlist");
    }
  };

  const renderMediaIcon = (type: string, size = 16) => {
    if (type.includes("image")) return <ImageIcon size={size} className="text-green-500" />;
    if (type.includes("video")) return <Video size={size} className="text-blue-500" />;
    if (type.includes("audio")) return <Music size={size} className="text-purple-500" />;
    return null;
  };

  const daysList = [
    { label: "Sun", value: "Sunday" }, { label: "Mon", value: "Monday" },
    { label: "Tue", value: "Tuesday" }, { label: "Wed", value: "Wednesday" },
    { label: "Thu", value: "Thursday" }, { label: "Fri", value: "Friday" },
    { label: "Sat", value: "Saturday" },
  ];

  const handleDayToggle = (day: string) => {
    if (!editedPlaylist) return;
    const { daysOfWeek } = editedPlaylist;
    const updatedDays = daysOfWeek.includes(day)
      ? daysOfWeek.filter((d) => d !== day)
      : [...daysOfWeek, day];
    setEditedPlaylist({ ...editedPlaylist, daysOfWeek: updatedDays });
  };
  
  // Generic handler for updating a file property
  const handleFileUpdate = (fileId: string, updatedProps: Partial<PlaylistFile>) => {
    if (!editedPlaylist) return;
    setEditedPlaylist(prev => ({
        ...prev!,
        files: prev!.files.map(file => 
            file.id === fileId ? { ...file, ...updatedProps } : file
        )
    }));
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm p-6 text-black transition-all duration-300 ${isEditing ? 'bg-gray-50' : 'bg-white'}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{isEditing ? `Editing: ${editedPlaylist?.name}` : "Playlists"}</h2>
        {!isEditing && <input type="text" placeholder="Search playlists..." className="px-3 py-2 border rounded-lg" onChange={(e) => handleSearch(e.target.value)} />}
      </div>
      
      {isLoadingPlaylists ? (
        <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>
      ) : isEditing && editedPlaylist ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4 border-b pb-2">Playlist Settings</h3>
              <div className="space-y-4">
                <div><label className="block text-sm font-medium mb-1">Playlist Name</label><input type="text" value={editedPlaylist.name} onChange={(e) => setEditedPlaylist({...editedPlaylist, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div className="flex items-center justify-between"><span className="text-sm font-medium">Status</span><select value={editedPlaylist.status} onChange={(e) => setEditedPlaylist({...editedPlaylist, status: e.target.value as 'active' | 'inactive'})} className="px-3 py-2 border rounded-lg"><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
                <div className="flex items-center justify-between"><span className="text-sm font-medium">Shuffle Playlist</span><label htmlFor="shuffle" className="relative inline-flex items-center cursor-pointer"><input type="checkbox" id="shuffle" className="sr-only peer" checked={editedPlaylist.shuffle} onChange={(e) => setEditedPlaylist({...editedPlaylist, shuffle: e.target.checked})} /><div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div></label></div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4 border-b pb-2">Schedule</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Start Date</label><input type="date" value={editedPlaylist.startDate} onChange={(e) => setEditedPlaylist({...editedPlaylist, startDate: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div><div><label className="block text-sm font-medium mb-1">End Date</label><input type="date" value={editedPlaylist.endDate} onChange={(e) => setEditedPlaylist({...editedPlaylist, endDate: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Start Time</label><input type="time" value={editedPlaylist.startTime} onChange={(e) => setEditedPlaylist({...editedPlaylist, startTime: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div><div><label className="block text-sm font-medium mb-1">End Time</label><input type="time" value={editedPlaylist.endTime} onChange={(e) => setEditedPlaylist({...editedPlaylist, endTime: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div></div>
                <div><label className="block text-sm font-medium mb-2">Days of Week</label><div className="flex flex-wrap gap-2">{daysList.map((day) => (<button key={day.value} type="button" onClick={() => handleDayToggle(day.value)} className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${editedPlaylist.daysOfWeek?.includes(day.value) ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>{day.label}</button>))}</div></div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg border"><h3 className="text-lg font-semibold mb-4 border-b pb-2">Available Media</h3><div className="max-h-[400px] overflow-y-auto space-y-3">{isLoadingMedia ? <p>Loading...</p> : availableMediaFiles.length > 0 ? availableMediaFiles.filter(m => !m.type.includes("image")).map(m => (<div key={m.id} className="flex items-center gap-3 p-2 border rounded-lg">{renderMediaIcon(m.type, 20)}<span className="text-sm font-medium flex-1 truncate">{m.name}</span><button onClick={() => handleAddFileToPlaylist(m)} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-full"><PlusCircle size={20} /></button></div>)) : <p>No media to add.</p>}</div></div>
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold mb-4 border-b pb-2">Playlist Content ({editedPlaylist.files.length})</h3>
              <div className="max-h-[400px] overflow-y-auto space-y-3">
                {editedPlaylist.files.length > 0 ? (editedPlaylist.files.map((file, index) => (
                  <div key={file.id} className="p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-3"><span className="text-sm font-bold text-gray-400">{index + 1}</span>{renderMediaIcon(file.type, 20)}<span className="text-sm flex-1 truncate">{file.name}</span><button onClick={() => handleRemoveFileFromPlaylist(file.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-full"><Trash2 size={16} /></button></div>
                    {file.type.includes("audio") && (
                      <div className="mt-3 pl-8 space-y-4 border-l-2 ml-2.5">
                        <div className="flex items-center gap-2"><label className="text-sm">Delay (s):</label><input type="number" min="0" value={file.delay || 0} onChange={(e) => handleFileUpdate(file.id, { delay: parseInt(e.target.value) })} className="w-20 px-2 py-1 border rounded text-sm"/></div>
                        
                        {/* --- NEW: VOLUME CONTROLS --- */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700 w-20">Min Volume</label>
                                <input type="range" min="0" max="100" value={file.minVolume || 0} onChange={(e) => handleFileUpdate(file.id, { minVolume: parseInt(e.target.value) })} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                                <span className="text-sm font-mono text-gray-600 w-10 text-right">{file.minVolume || 0}%</span>
                            </div>
                             <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700 w-20">Max Volume</label>
                                <input type="range" min="0" max="100" value={file.maxVolume || 100} onChange={(e) => handleFileUpdate(file.id, { maxVolume: parseInt(e.target.value) })} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                                <span className="text-sm font-mono text-gray-600 w-10 text-right">{file.maxVolume || 100}%</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t"><input type="checkbox" id={`bg-${file.id}`} checked={file.backgroundImageEnabled} onChange={(e) => handleFileUpdate(file.id, { backgroundImageEnabled: e.target.checked, backgroundImage: e.target.checked ? file.backgroundImage : null })} className="h-4 w-4"/><label htmlFor={`bg-${file.id}`} className="text-sm">Add Background Image</label></div>
                        {file.backgroundImageEnabled && (
                          <div>
                            <select value={file.backgroundImage || ""} onChange={(e) => handleFileUpdate(file.id, { backgroundImage: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="">Select an image...</option>{localMediaFiles.filter(m => m.type.includes("image")).map(img => (<option key={img.id} value={img.url}>{img.name}</option>))}</select>
                            {file.backgroundImage && <div className="relative mt-2 inline-block"><img src={file.backgroundImage} alt="BG" className="w-24 h-24 rounded-lg"/><button onClick={() => handleFileUpdate(file.id, { backgroundImage: null })} className="absolute -top-2 -right-2 p-1 bg-white rounded-full shadow-md"><XCircle size={16} className="text-red-500" /></button></div>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))) : <p>Add media to build your playlist.</p>}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-4 pt-6 border-t mt-4"><button onClick={() => { setIsEditing(false); setEditedPlaylist(null); }} className="px-5 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium">Cancel</button><button onClick={() => handleEditPlaylist(editedPlaylist)} className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium">Save Changes</button></div>
        </div>
      ) : playlists && playlists.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {playlists.map((playlist) => (
            <div key={playlist._id} className="border rounded-lg p-4 flex flex-col justify-between hover:shadow-lg hover:border-blue-500 transition-all">
              <div>
                <h3 className="text-lg font-semibold truncate">{playlist.name}</h3>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${playlist.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{playlist.status}</span>
                <p className="text-sm text-gray-600 mt-2">Files: {playlist.files?.length || 0}</p>
                <p className="text-sm text-gray-600">Schedule: {playlist.daysOfWeek?.join(', ') || 'Not set'}</p>
                <p className="text-sm text-gray-500">Created: {new Date(playlist.createdAt || '').toLocaleDateString()}</p>
              </div>
              <div className="flex justify-end gap-2 mt-4 border-t pt-3">
                <button onClick={(e) => handleEditClick(e, playlist)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><Edit size={18} /></button>
                <button onClick={(e) => { e.stopPropagation(); handleDeletePlaylistWithFiles(playlist._id); }} className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4">No playlists found. Create one to get started!</p>
      )}
    </div>
  );
};

export default PlaylistManager;