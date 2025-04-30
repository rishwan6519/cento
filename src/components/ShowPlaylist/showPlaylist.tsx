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
  createdAt?: string;
}

interface EditablePlaylist {
  id?: string;
  name: string;
  type: string;
  startTime: string;
  endTime: string;
  files: PlaylistFile[];
  backgroundAudio?: {
    enabled: boolean;
    file: string | null;
    volume: number;
  };
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
      files: playlist.files.map((file, index) => ({
        id: file.id || generateUniqueId(),
        name: file.name,
        type: file.type,
        displayOrder: index + 1,
        path: file.path , // Handle both path and url properties
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
      const processedFiles = playlist.files.map((file, index) => {
        // Determine file type based on extension and current type
        let fileType = file.type;
        
        if (
          file.name.toLowerCase().endsWith(".mp3") ||
          file.name.toLowerCase().endsWith(".wav") ||
          file.name.toLowerCase().endsWith(".ogg") ||
          file.type.includes("audio")
        ) {
          fileType = "audio";
        }
        
        if (
          file.name.toLowerCase().endsWith(".mp4") ||
          file.name.toLowerCase().endsWith(".webm") ||
          file.name.toLowerCase().endsWith(".mov") ||
          file.type.includes("video")
        ) {
          fileType = "video";
        }
        
        return {
          id: file.id,
          name: file.name,
          type: fileType,
          url: file.path,
          displayOrder: index + 1,
          delay: file.delay || 0,
          backgroundImageEnabled: file.backgroundImageEnabled || false,
          backgroundImage: file.backgroundImage || null,
        };
      });
      
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
          files: processedFiles,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update playlist");
      }
      
      toast.success("Playlist updated successfully");
      fetchPlaylists();
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
    
    if (!confirm("Are you sure you want to delete this playlist and its files?")) {
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
      
      if (data.success) {
        toast.success("Playlist deleted successfully");
        fetchPlaylists();
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

  return (
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
          {playlists.map((playlist) => (
            <div
              key={playlist._id || `playlist-${generateUniqueId()}`}
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
                  <h3 className="text-lg font-semibold">{playlist.name}</h3>
                  <p className="text-sm text-gray-600">
                    Type: {playlist.contentType || playlist.type}
                  </p>
                  <p className="text-sm text-gray-600">
                    Files: {playlist.files?.length || 0} items
                  </p>
                  <p className="text-sm text-gray-600">
                    Created:{" "}
                    {playlist.createdAt ? new Date(playlist.createdAt).toLocaleDateString() : "N/A"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => handleEditClick(e, playlist)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    aria-label="Edit playlist"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlaylistWithFiles(playlist._id);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    aria-label="Delete playlist"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              {/* Expanded Playlist Details */}
              {selectedPlaylist?._id === playlist._id && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="font-medium mb-3">Playlist Details</h4>
                  {playlist.files && playlist.files.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {playlist.files.map((file: any, index: number) => (
                        <div
                          key={file.id || `playlist-file-${index}`}
                          className="bg-gray-50 rounded-lg p-4"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {renderMediaIcon(file.type || "")}
                            <span className="font-medium text-sm">{file.name}</span>
                          </div>
                          {(file.url || file.path) && (
                            <div className="mt-2">
                              {(file.type?.includes("image") || file.name?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/)) && (
                                <img
                                  src={file.url || file.path}
                                  alt={file.name}
                                  className="w-full h-32 object-cover rounded-lg"
                                />
                              )}
                              {(file.type?.includes("video") || file.name?.toLowerCase().match(/\.(mp4|webm|mov)$/)) && (
                                <video
                                  src={file.url || file.path}
                                  controls
                                  className="w-full rounded-lg"
                                />
                              )}
                              {(file.type?.includes("audio") || file.name?.toLowerCase().match(/\.(mp3|wav|ogg)$/)) && (
                                <audio
                                  src={file.url || file.path}
                                  controls
                                  className="w-full"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No files in this playlist</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-4">No playlists found</p>
      )}
    </div>
  );
};

export default PlaylistManager;