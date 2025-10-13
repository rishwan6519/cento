"use client";
import React, { useState, useEffect } from "react";
import { Trash2, Edit, XCircle, ImageIcon, Music, Video } from "lucide-react";
import toast from "react-hot-toast";
import { FaListUl } from "react-icons/fa6";
import { LuLayoutGrid } from "react-icons/lu";
import { BsFillGridFill } from "react-icons/bs";
import { RiArrowDropDownLine } from "react-icons/ri";
import { MdQueueMusic } from "react-icons/md";

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
const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
const [viewMode, setViewMode] = useState<"list" | "grid">("list");
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
      const response = await fetch(`/api/media?userId=${encodeURIComponent(userId)}`);
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
        console.error("Error loading media files:", error);
      }
    } else {
      initializeEditedPlaylist(playlist);
      setIsEditing(true);
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
    const safeFiles = Array.isArray(playlist.files) ? playlist.files : [];
    setEditedPlaylist({
      id: playlist._id,
      name: playlist.name || "",
      type: playlist.type || "",
      startTime: playlist.startTime || "00:00",
      endTime: playlist.endTime || "23:59",
      startDate: playlist.startDate || "",
      endDate: playlist.endDate || "",
      // Ensure daysOfWeek is properly initialized from database data
      daysOfWeek: Array.isArray(playlist.daysOfWeek) ? playlist.daysOfWeek : [],
      status: playlist.status || 'active',
      files: safeFiles.map((file, index) => ({
        id: file.id || generateUniqueId(),
        name: file.name,
        type: file.type,
        displayOrder: index + 1,
        path: file.path,
        delay: file.delay || 0,
        backgroundImageEnabled: !!file.backgroundImageEnabled,
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

  // const handleEditPlaylist = async (playlist: EditablePlaylist | null) => {
  //   if (!playlist || !playlist.id) return;
    
  //   try {
  //       const response = await fetch(`/api/playlists/id?id=${playlist.id}`, {
  //           method: "PUT",
  //           headers: {
  //               "Content-Type": "application/json",
  //           },
  //           body: JSON.stringify({
  //               name: playlist.name,
  //               type: playlist.type,
  //               startTime: playlist.startTime,
  //               endTime: playlist.endTime,
  //               startDate: playlist.startDate,
  //               endDate: playlist.endDate,
  //               // Ensure daysOfWeek is included in the update
  //               daysOfWeek: playlist.daysOfWeek || [], 
  //               status: playlist.status,
  //               files: playlist.files.map((file, index) => ({
  //                   id: file.id,
  //                   name: file.name,
  //                   type: file.type,
  //                   url: file.path,
  //                   displayOrder: index + 1,
  //                   delay: file.delay || 0,
  //                   backgroundImageEnabled: file.backgroundImageEnabled || false,
  //                   backgroundImage: file.backgroundImage || null,
  //               })),
  //           }),
  //       });
        
  //       if (!response.ok) {
  //           const errorData = await response.json();
  //           throw new Error(errorData.error || "Failed to update playlist");
  //       }
        
  //       // After successful update, refresh the playlists
  //       await fetchPlaylists();
  //       toast.success("Playlist updated successfully");
  //       setIsEditing(false);
  //       setEditedPlaylist(null);
  //   } catch (error) {
  //       console.error("Error updating playlist:", error);
  //       toast.error(error instanceof Error ? error.message : "Failed to update playlist");
  //   }
  // };
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
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
  ];
const filteredPlaylists = playlists.filter((playlist) => {
  if (statusFilter === "all") return true;
  return playlist.status === statusFilter;
});

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 text-black">
      <div >
        <h2 className="text-2xl font-bold">
          {isEditing ? "Edit Playlist" : "Playlists"}
        </h2>
        {!isEditing && (
          // <div className="flex gap-4">
          //   <input
          //     type="text"
          //     placeholder="Search playlists..."
          //     className="px-3 py-2 border rounded-lg"
          //     onChange={(e) => handleSearch(e.target.value)}
          //   />
          // </div>
         
          <div > <br/>
  <div className="flex justify-between items-center mb-6">
    {/* <h2 className="text-2xl font-bold">Playlists</h2> */}
    <div className="flex items-center gap-3">
      {/* Search */}
      <div className="relative">
        {/* <input
          type="text"
          placeholder="Search playlist"
          className="pl-10 pr-4 py-2  rounded-lg w-64"
          onChange={(e) => handleSearch(e.target.value)}
        /> */}
        <input
  type="text"
  placeholder="Search playlist"
  onChange={(e) => handleSearch(e.target.value)}
  className="pl-10 pr-4 py-2  rounded-[9px] focus:outline-none shadow-[2px_4px_10px_0px_rgba(0,0,0,0.12)]"
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
      {/* <select className="px-3 py-2 border rounded-lg">
        <option value="all">All</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>

     
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
      </div> */}
 <div className="relative inline-block">
  <select
    className="px-3 py-2 pr-8 rounded-lg shadow-md focus:outline-none appearance-none"
    value={statusFilter}
    onChange={(e) =>
      setStatusFilter(e.target.value as "all" | "active" | "inactive")
    }
    style={{
      boxShadow: "2px 4px 10px 0px rgba(0,0,0,0.12)",
    }}
  >
    <option value="all">All</option>
    <option value="active">Active</option>
    <option value="inactive">Inactive</option>
  </select>

  {/* Custom dropdown icon */}
  <RiArrowDropDownLine
    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6"
    color="#FF4500"
  />
</div>

<div className="flex items-center gap-2">
  {/* <button
    onClick={() => setViewMode("list")}
    className={`p-2 rounded-lg border hover:bg-gray-100 ${viewMode === "list" ? "bg-gray-200" : ""}`}
    aria-label="List view"
  >
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  </button>
  <button
    onClick={() => setViewMode("grid")}
    className={`p-2 rounded-lg border hover:bg-gray-100 ${viewMode === "grid" ? "bg-gray-200" : ""}`}
    aria-label="Grid view"
  >
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h7v7H4zM13 6h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
    </svg>
  </button> */}
 <button
  onClick={() => setViewMode("list")}
  className={`p-2 rounded-lg shadow-md hover:shadow-lg hover:bg-gray-100 ${
    viewMode === "list" ? "bg-gray-200" : ""
  }`}
  aria-label="List view"
>
  <FaListUl className="w-5 h-5" color="#FF4500" />
</button>

<button
  onClick={() => setViewMode("grid")}
  className={`p-2 rounded-lg shadow-md hover:shadow-lg hover:bg-gray-100 ${
    viewMode === "grid" ? "bg-gray-200" : ""
  }`}
  aria-label="Grid view"
>
  <BsFillGridFill className="w-5 h-5" color="#FF4500" />
</button>
</div>

    </div>
  </div>
{viewMode === "list" ? (
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
        {filteredPlaylists.map((playlist) => (
          // <tr key={playlist._id} className="bg-blue-50 hover:bg-blue-100 rounded-xl transition">
            <tr
            key={playlist._id}
            className="bg-blue-50 hover:bg-blue-100 rounded-xl transition"
          >
            <td className="px-4 py-3 font-medium flex items-center gap-2">
              {/* <span className="p-2 bg-blue-900 text-white rounded-lg">
                🎵
              </span> */}
              <span
  className="flex items-center justify-center rounded-[10px]"
  style={{
    backgroundColor: "#07323C",
    width: "40px",
    height: "40px",
  }}
>
  <MdQueueMusic size={20} color="#FFFFFF" />
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
              {/* <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditClick(e, playlist);
                }}
                className="p-2 bg-white border rounded-lg hover:bg-gray-100"
              >
                <Edit size={16} />
              </button> */}
               {/* <button
                    onClick={(e) => handleEditClick(e, playlist)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    aria-label="Edit playlist"
                  >
                    <Edit size={18} />
                  </button>
              <button
                onClick={() => handleDeletePlaylistWithFiles(playlist._id)}
                className="p-2 bg-white border rounded-lg text-red-500 hover:bg-red-100"
              >
                <Trash2 size={16} />
              </button> */}
              <button
  onClick={(e) => handleEditClick(e, playlist)}
  className="p-2 rounded-lg shadow-md hover:shadow-lg transition-colors"
  aria-label="Edit playlist"
>
  <Edit size={18} color="#FF4500" />
</button>

<button
  onClick={() => handleDeletePlaylistWithFiles(playlist._id)}
  className="p-2 rounded-lg shadow-md hover:shadow-lg transition-colors"
  aria-label="Delete playlist"
>
  <Trash2 size={16} color="#FF4500" />
</button>

            </td>
          </tr>
          
        ))}
      </tbody>
    </table>
  </div>
) : (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
    {filteredPlaylists.map((playlist) => (
      <div key={playlist._id} className="bg-blue-50 p-4 rounded-lg hover:bg-blue-100 transition cursor-pointer">
        <div className="flex items-center gap-2 mb-2">
          {/* <span className="p-2 bg-blue-900 text-white rounded-lg">🎵</span> */}
          <span
  className="flex items-center justify-center rounded-[10px]"
  style={{
    backgroundColor: "#07323C",
    // width: "40px",
    // height: "40px",
    padding: "6px",
  }}
>
  <MdQueueMusic size={20} color="#FFFFFF" />
</span>
          <h3 className="font-semibold">{playlist.name}</h3>
        </div>
        <p>Status: <span className={`px-2 py-1 text-xs rounded ${playlist.status === "active" ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-600"}`}>{playlist.status}</span></p>
        <p>Tracks: {playlist.files?.length || 0}</p>
        <p>Schedule: {playlist.daysOfWeek?.join(", ") || "Everyday"}</p>
        <p>Date Created: {playlist.createdAt ? new Date(playlist.createdAt).toLocaleDateString() : "N/A"}</p>
        <div className="flex gap-2 mt-3">
              <button
  onClick={(e) => handleEditClick(e, playlist)}
  className="p-2 rounded-lg shadow-md hover:shadow-lg transition-colors"
  aria-label="Edit playlist"
>
  <Edit size={18} color="#FF4500" />
</button>

<button
  onClick={() => handleDeletePlaylistWithFiles(playlist._id)}
  className="p-2 rounded-lg shadow-md hover:shadow-lg transition-colors"
  aria-label="Delete playlist"
>
  <Trash2 size={16} color="#FF4500" />
</button>
        </div>
      </div>
    ))}
  </div>
)}

  {/* Table */}
  
  
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
                Status
              </label>
              <select
                value={editedPlaylist.status}
                onChange={(e) =>
                  setEditedPlaylist({
                    ...editedPlaylist,
                    status: e.target.value as 'active' | 'inactive',
                  })
                }
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  value={editedPlaylist.startTime}
                  onChange={(e) =>
                    setEditedPlaylist({
                      ...editedPlaylist,
                      startTime: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  value={editedPlaylist.endTime}
                  onChange={(e) =>
                    setEditedPlaylist({
                      ...editedPlaylist,
                      endTime: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={editedPlaylist.startDate}
                  onChange={(e) =>
                    setEditedPlaylist({
                      ...editedPlaylist,
                      startDate: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={editedPlaylist.endDate}
                  onChange={(e) =>
                    setEditedPlaylist({
                      ...editedPlaylist,
                      endDate: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-2">
                Days of Week
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {daysOfWeek.map((day) => (
                  <label key={day} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={editedPlaylist.daysOfWeek?.includes(day) || false}
                      onChange={(e) => {
                        const updatedDays = e.target.checked
                          ? [...(editedPlaylist.daysOfWeek || []), day]
                          : (editedPlaylist.daysOfWeek || []).filter((d) => d !== day);
                        setEditedPlaylist({
                          ...editedPlaylist,
                          daysOfWeek: updatedDays,
                        });
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{day}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          {/* Available Media Files Section */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Available Media Files ({availableMediaFiles.length || 0})
            </label>
            {isLoadingMedia ? (
              <div className="flex justify-center items-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-sm text-gray-600">
                  Loading media files...
                </span>
              </div>
            ) : availableMediaFiles.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">
                No more media files available to add
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableMediaFiles
                  .filter((media) => media.type.includes("audio") || media.type.includes("video") )
                  .map((media) => (
                    <div
                      key={media.id}
                      className="border rounded-lg p-3 transition-all hover:border-blue-500 hover:bg-blue-50"
                    >
                      <div className="flex items-center gap-3">
                        {renderMediaIcon(media.type, 20)}
                        <div className="flex-1">
                          <span className="text-sm font-medium">{media.name}</span>
                          {media.type.includes("audio") && (
                            <audio src={media.url} controls className="w-full mt-2" />
                          )}
                          {media.type.includes("video") && (
                            <video src={media.url} controls className="w-full mt-2" />
                          )}
                          {media.type.includes("image") && (
                            <img src={media.url} alt={media.name} className="w-full h-24 object-cover mt-2 rounded" />
                          )}
                        </div>
                        <button
                          onClick={() => handleAddFileToPlaylist(media)}
                          className="ml-auto px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
          
          {/* Selected Files Order Section */}
          {editedPlaylist.files.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Selected Files Order ({editedPlaylist.files.length} items)
              </label>
              <div className="space-y-2">
                {editedPlaylist.files.map((file, index) => (
                  <div
                    key={file.id}
                    className="flex flex-col p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">{index + 1}</span>
                      <div className="flex items-center gap-2 flex-1">
                        {renderMediaIcon(file.type)}
                        <span className="text-sm">{file.name}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveFileFromPlaylist(file.id)}
                        className="text-red-500 hover:text-red-700"
                        aria-label="Remove file"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mt-2">
                      {file.type.includes("image") && (
                        <img src={file.path} alt={file.name} className="w-full h-32 object-cover rounded-lg" />
                      )}
                      {file.type.includes("video") && (
                        <video src={file.path} controls className="w-full rounded-lg" />
                      )}
                      {file.type.includes("audio") && (
                        <audio src={file.path} controls className="w-full" />
                      )}
                    </div>
                    
                    {/* Audio file options */}
                    {file.type.includes("audio") && (
                      <div className="mt-3 pl-8 space-y-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`bg-image-checkbox-${file.id}`}
                            checked={file.backgroundImageEnabled}
                            onChange={(e) => {
                              const updatedFiles = [...editedPlaylist.files];
                              updatedFiles[index] = {
                                ...file,
                                backgroundImageEnabled: e.target.checked,
                                backgroundImage: e.target.checked ? file.backgroundImage : null,
                              };
                              setEditedPlaylist({
                                ...editedPlaylist,
                                files: updatedFiles,
                              });
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <label htmlFor={`bg-image-checkbox-${file.id}`} className="text-sm">
                            Enable Background Image
                          </label>
                        </div>
                        
                        {file.backgroundImageEnabled && (
                          <div className="space-y-2">
                            {file.backgroundImage ? (
                              <div className="relative inline-block">
                                <img 
                                  src={file.backgroundImage} 
                                  alt="Background" 
                                  className="w-32 h-32 object-cover rounded-lg" 
                                />
                                <button
                                  onClick={() => {
                                    const updatedFiles = [...editedPlaylist.files];
                                    updatedFiles[index] = { ...file, backgroundImage: null };
                                    setEditedPlaylist({
                                      ...editedPlaylist,
                                      files: updatedFiles,
                                    });
                                  }}
                                  className="absolute -top-2 -right-2 p-1 bg-white rounded-full shadow-md"
                                  aria-label="Remove background image"
                                >
                                  <XCircle size={16} className="text-red-500" />
                                </button>
                              </div>
                            ) : (
                              <div>
                                <select
                                  value={file.backgroundImage || ""}
                                  onChange={(e) => {
                                    const selectedImage = localMediaFiles.find(m => m.url === e.target.value);
                                    if (selectedImage) {
                                      const updatedFiles = [...editedPlaylist.files];
                                      updatedFiles[index] = { ...file, backgroundImage: selectedImage.url };
                                      setEditedPlaylist({
                                        ...editedPlaylist,
                                        files: updatedFiles,
                                      });
                                    }
                                  }}
                                  className="w-full px-3 py-2 border rounded-lg text-sm"
                                >
                                  <option value="">Select background image</option>
                                  {localMediaFiles
                                    .filter(m => m.type.includes("image"))
                                    .map((image) => (
                                      <option key={image.id} value={image.url}>
                                        {image.name}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <label htmlFor={`delay-input-${file.id}`} className="text-sm">Delay (seconds):</label>
                          <input
                            id={`delay-input-${file.id}`}
                            type="number"
                            min="0"
                            value={file.delay || 0}
                            onChange={(e) => {
                              const updatedFiles = [...editedPlaylist.files];
                              updatedFiles[index] = {
                                ...file,
                                delay: parseInt(e.target.value),
                              };
                              setEditedPlaylist({
                                ...editedPlaylist,
                                files: updatedFiles,
                              });
                            }}
                            className="w-20 px-2 py-1 border rounded text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-6 border-t">
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
              onClick={() => handleEditPlaylist(editedPlaylist)}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Save Changes
            </button>
          </div>
        </div>
      ) : playlists && playlists.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {/*  */}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4">No playlists found</p>
      )}
    </div>
    

  );
};

export default PlaylistManager;

