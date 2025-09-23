"use client";
import React, { useState, useEffect } from "react";
import { Trash2, Edit, XCircle, ImageIcon, Music, Video } from "lucide-react";
import toast from "react-hot-toast";

// Mock functions for standalone functionality
const generateUniqueId = () => Math.random().toString(36).substring(2, 15);
const defaultActiveSection = "showPlaylist";

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
}

interface Playlist {
  _id?: string;
  name: string;
  type: string;
  contentType: string;
  files: PlaylistFile[];
  startTime?: string;
  endTime?: string;
  startDate?: string;    // Add this
  endDate?: string;      // Add this
  daysOfWeek?: string[]; // Add this
  createdAt?: string;
  status?: 'active' | 'inactive';
}

interface EditablePlaylist {
  id?: string;
  name: string;
  type: string;
  startTime: string;
  endTime: string;
  startDate: string;    // Add this
  endDate: string;      // Add this
  daysOfWeek: string[]; // Add this
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

  // Load userId from localStorage only once on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  // Fetch playlists when userId is available and we're on the playlist section
  useEffect(() => {
    if (defaultActiveSection === "showPlaylist" && userId) {
      fetchPlaylists();
    }
  }, [userId, defaultActiveSection]);

  // Fetch media files when needed
  useEffect(() => {
    if (defaultActiveSection === "showPlaylist" && userId && localMediaFiles.length === 0) {
      fetchMedia();
    }
  }, [userId, defaultActiveSection, localMediaFiles.length]);

  // Update available media files when editing a playlist
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
      
      // Ensure each media file has an id
      const processedMediaFiles = mediaFiles.map((file: any) => ({
        ...file,
        id: file.id || generateUniqueId()
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
      setPlaylists([]);
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  const handleEditClick = async (e: React.MouseEvent, playlist: Playlist) => {
    e.stopPropagation();
    
    if (localMediaFiles.length === 0) {
      toast.loading("Loading media files...");
      try {
        await fetchMedia();
        toast.dismiss();
        setIsEditing(true);
        initializeEditedPlaylist(playlist);
      } catch (error) {
        toast.error("Failed to load media files");
        console.error("Error loading media files:", error);
      }
    } else {
      setIsEditing(true);
      initializeEditedPlaylist(playlist);
    }
  };

  const handleSearch = (term: string) => {
    if (!term.trim()) {
      fetchPlaylists(); // Reload all if search is cleared
      return;
    }
    
    const filtered = playlists.filter(
      (playlist) =>
        playlist.name.toLowerCase().includes(term.toLowerCase()) ||
        playlist.type.toLowerCase().includes(term.toLowerCase())
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
      // Ensure daysOfWeek is properly initialized from database data
      daysOfWeek: playlist.daysOfWeek || [],
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
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: playlist.name,
                type: playlist.type,
                startTime: playlist.startTime,
                endTime: playlist.endTime,
                startDate: playlist.startDate,
                endDate: playlist.endDate,
                // Ensure daysOfWeek is included in the update
                daysOfWeek: playlist.daysOfWeek || [], 
                status: playlist.status,
                files: playlist.files.map((file, index) => ({
                    id: file.id,
                    name: file.name,
                    type: file.type,
                    url: file.path,
                    displayOrder: index + 1,
                    delay: file.delay || 0,
                    backgroundImageEnabled: file.backgroundImageEnabled || false,
                    backgroundImage: file.backgroundImage || null,
                })),
            }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to update playlist");
        }
        
        // After successful update, refresh the playlists
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
    if (!playlistId) {
      toast.error("Invalid playlist ID");
      return;
    }
    
    if (!confirm("Are you sure you want to delete this playlist and its files? This will also remove the playlist from all devices.")) {
      return;
    }
    
    try {
      const params = new URLSearchParams({ id: playlistId });
      const response = await fetch(`/api/playlists/id?${params.toString()}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success("Playlist deleted successfully");
        // Refresh playlists
        await fetchPlaylists();
        // Clear selected playlist if it was the deleted one
        if (selectedPlaylist?._id === playlistId) {
          setSelectedPlaylist(null);
        }
      } else {
        throw new Error(data.error || "Failed to delete playlist");
      }
    } catch (error) {
      console.error("Error deleting playlist:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete playlist");
    }
  };

  // Exit early if not on the playlist section
  if (defaultActiveSection !== "showPlaylist") {
    return null;
  }

  // Helper function to render media icon based on type
  const renderMediaIcon = (type: string, size = 16) => {
    if (type.includes("image")) return <ImageIcon size={size} className="text-green-500" />;
    if (type.includes("video")) return <Video size={size} className="text-blue-500" />;
    if (type.includes("audio")) return <Music size={size} className="text-purple-500" />;
    return null;
  };

  const daysOfWeek = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 text-black">
      {/* Edit window/modal */}
      {isEditing && editedPlaylist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-2xl relative">
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700"
              onClick={() => { setIsEditing(false); setEditedPlaylist(null); }}
              aria-label="Close"
            >
              <XCircle size={28} />
            </button>
            <h2 className="text-xl font-bold mb-4">Edit Playlist</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Playlist Name</label>
                <input
                  type="text"
                  value={editedPlaylist.name}
                  onChange={e => setEditedPlaylist({ ...editedPlaylist, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={editedPlaylist.status}
                  onChange={e => setEditedPlaylist({ ...editedPlaylist, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input
                    type="time"
                    value={editedPlaylist.startTime}
                    onChange={e => setEditedPlaylist({ ...editedPlaylist, startTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input
                    type="time"
                    value={editedPlaylist.endTime}
                    onChange={e => setEditedPlaylist({ ...editedPlaylist, endTime: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editedPlaylist.startDate}
                    onChange={e => setEditedPlaylist({ ...editedPlaylist, startDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    value={editedPlaylist.endDate}
                    onChange={e => setEditedPlaylist({ ...editedPlaylist, endDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Days of Week</label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map(day => (
                    <label key={day} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editedPlaylist.daysOfWeek?.includes(day) || false}
                        onChange={e => {
                          const updatedDays = e.target.checked
                            ? [...(editedPlaylist.daysOfWeek || []), day]
                            : (editedPlaylist.daysOfWeek || []).filter(d => d !== day);
                          setEditedPlaylist({ ...editedPlaylist, daysOfWeek: updatedDays });
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{day}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Playlist Files Section */}
              <div>
                <label className="block text-sm font-medium mb-2">Playlist Files</label>
                {editedPlaylist.files.length === 0 ? (
                  <div className="text-gray-500 text-sm mb-2">No files in this playlist.</div>
                ) : (
                  <ul className="mb-2">
                    {editedPlaylist.files.map((file, idx) => (
                      <li key={file.id} className="flex items-center justify-between py-1">
                        <span className="flex items-center gap-2">
                          {renderMediaIcon(file.type)}
                          <span className="text-sm">{file.name}</span>
                        </span>
                        <button
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleRemoveFileFromPlaylist(file.id)}
                          type="button"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Add Media Section */}
              <div>
                <label className="block text-sm font-medium mb-2">Add Media</label>
                {availableMediaFiles.length === 0 ? (
                  <div className="text-gray-500 text-sm">No available media to add.</div>
                ) : (
                  <ul>
                    {availableMediaFiles.map((media) => (
                      <li key={media.id} className="flex items-center justify-between py-1">
                        <span className="flex items-center gap-2">
                          {renderMediaIcon(media.type)}
                          <span className="text-sm">{media.name}</span>
                        </span>
                        <button
                          className="text-blue-500 hover:text-blue-700"
                          onClick={() => handleAddFileToPlaylist(media)}
                          type="button"
                        >
                          Add
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={() => { setIsEditing(false); setEditedPlaylist(null); }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleEditPlaylist(editedPlaylist)}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table view (always visible unless editing) */}
      {!isEditing && (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Playlists</h2>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search playlist"
                  className="pl-10 pr-4 py-2 border rounded-lg w-64"
                  onChange={(e) => handleSearch(e.target.value)}
                />
                <svg
                  className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-4.35-4.35M16.65 16.65A7.5 7.5 0 1110 2.5a7.5 7.5 0 016.65 14.15z"
                  />
                </svg>
              </div>
              {/* Filter dropdown */}
              <select className="px-3 py-2 border rounded-lg">
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              {/* View toggle (list/grid) */}
              <div className="flex items-center gap-2">
                <button className="p-2 rounded-lg border hover:bg-gray-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <button className="p-2 rounded-lg border hover:bg-gray-100">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h7v7H4zM13 6h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-gray-600 text-sm">
                  <th className="px-4 py-2">Playlist Name</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Tracks</th>
                  <th className="px-4 py-2">Schedule</th>
                  <th className="px-4 py-2">Date Created</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {playlists.map((playlist) => (
                  <tr
                    key={playlist._id}
                    className="bg-blue-50 hover:bg-blue-100 rounded-xl transition"
                  >
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      <span className="p-2 bg-blue-900 text-white rounded-lg">
                        🎵
                      </span>
                      {playlist.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          playlist.status === "active"
                            ? "bg-green-100 text-green-600"
                            : "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {playlist.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{playlist.files?.length || 0}</td>
                    <td className="px-4 py-3">
                      {playlist.daysOfWeek?.join(", ") || "Everyday"}
                    </td>
                    <td className="px-4 py-3">
                      {playlist.createdAt
                        ? new Date(playlist.createdAt).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button
                        onClick={(e) => handleEditClick(e, playlist)}
                        className="p-2 bg-white border rounded-lg hover:bg-gray-100"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeletePlaylistWithFiles(playlist._id)}
                        className="p-2 bg-white border rounded-lg text-red-500 hover:bg-red-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default PlaylistManager;

