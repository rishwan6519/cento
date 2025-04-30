"use client";

import React, { useState, useEffect } from "react";
import { Trash2, Play, Pause, Music, Video, ImageIcon, Search, List, Grid, X, Maximize2, Download } from "lucide-react";
import toast from "react-hot-toast";

interface MediaFile {
  _id: string;
  name: string;
  type: string;
  url: string;
  createdAt?: string;
  size?: number;
}

interface ShowMediaProps {
  onCancel: () => void;
}

const ShowMedia: React.FC<ShowMediaProps> = ({ onCancel }) => {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<MediaFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [playingMedia, setPlayingMedia] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [previewMedia, setPreviewMedia] = useState<MediaFile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      console.error("User ID not found in local storage");
      toast.error("Authentication required");
    }
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredFiles(mediaFiles);
    } else {
      const filtered = mediaFiles.filter(
        (media) =>
          media.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          media.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredFiles(filtered);
    }
  }, [searchTerm, mediaFiles]);

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && previewMedia) {
        setPreviewMedia(null);
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, [previewMedia]);

  useEffect(() => {
    if (userId) {
      fetchMedia();
    }
  }, [userId]);

  useEffect(() => {
    return () => {
      // Clean up any playing media when component unmounts
      document.querySelectorAll<HTMLMediaElement>('audio, video').forEach(el => {
        el.pause();
      });
    };
  }, []);

  const fetchMedia = async () => {
    setIsLoading(true);
    try {
      if (!userId) {
        throw new Error("User ID not available");
      }
      const response = await fetch(`/api/media?userId=${userId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch media files");
      }
      const data = await response.json();
      const mediaData = data.media || [];
      setMediaFiles(mediaData);
      setFilteredFiles(mediaData);
    } catch (error) {
      console.error("Error fetching media:", error);
      toast.error(error instanceof Error ? error.message : "Failed to fetch media files");
      setMediaFiles([]);
      setFilteredFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayPause = (mediaId: string, mediaElement: HTMLMediaElement): void => {
    if (playingMedia === mediaId) {
      mediaElement.pause();
      setPlayingMedia(null);
    } else {
      // Pause any currently playing media
      document.querySelectorAll<HTMLMediaElement>('audio, video').forEach(el => {
        if (el !== mediaElement) {
          el.pause();
          el.classList.remove("media-playing");
        }
      });
      mediaElement.play().catch(error => {
        console.error("Playback failed:", error);
        toast.error("Failed to play media");
      });
      mediaElement.classList.add("media-playing");
      setPlayingMedia(mediaId);
    }
  };

  const handleDeleteMedia = async (mediaId: string): Promise<void> => {
    if (!confirm("Are you sure you want to delete this media file? This will permanently remove the file from the server.")) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/media", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: mediaId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete media");
      }
      
      toast.success("Media file deleted successfully");
      setMediaFiles(prev => prev.filter(file => file._id !== mediaId));
      setFilteredFiles(prev => prev.filter(file => file._id !== mediaId));
      
      if (previewMedia?._id === mediaId) {
        setPreviewMedia(null);
      }
    } catch (error) {
      console.error("Error deleting media:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete media");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (criteria: string) => {
    if (sortBy === criteria) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(criteria);
      setSortOrder("asc");
    }
    
    const sortedFiles = [...filteredFiles].sort((a, b) => {
      let comparison = 0;
      
      switch (criteria) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "type":
          comparison = a.type.localeCompare(b.type);
          break;
        case "date":
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    setFilteredFiles(sortedFiles);
  };

  const handlePreviewClick = (media: MediaFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Check if media is actually playable
    if (media.type.startsWith('audio/') || media.type.startsWith('video/')) {
      const test = new Audio(media.url);
      test.onerror = () => {
        toast.error("This media file cannot be played");
        return;
      };
      test.src = media.url;
    }
    setPreviewMedia(media);
  };

  const closePreview = () => {
    setPreviewMedia(null);
  };

  const downloadMedia = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileTypeIcon = (type: string) => {
    if (type.startsWith("image/")) {
      return <ImageIcon size={16} className="text-green-500" />;
    } else if (type.startsWith("video/")) {
      return <Video size={16} className="text-blue-500" />;
    } else if (type.startsWith("audio/")) {
      return <Music size={16} className="text-purple-500" />;
    }
    return null;
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return "Unknown";
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i))} ${sizes[i]}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 text-black">
      {/* Header Section */}
      <div className="flex flex-col gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold">Media Files</h2>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          {/* Search Bar */}
          <div className="relative flex-grow">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search media..."
              className="pl-10 pr-4 py-2 border rounded-lg w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* View Toggle */}
          <div className="flex border rounded-lg self-end sm:self-auto">
            <button 
              onClick={() => setViewMode("table")}
              className={`p-2 ${viewMode === 'table' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}
              title="Table view"
              aria-label="Table view"
            >
              <List size={18} />
            </button>
            <button 
              onClick={() => setViewMode("grid")}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}
              title="Grid view"
              aria-label="Grid view"
            >
              <Grid size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No media files found</p>
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="mt-2 text-blue-500 hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      ) : viewMode === "table" ? (
        // Table View
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center">
                    Name
                    {sortBy === "name" && (
                      <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("type")}
                >
                  <div className="flex items-center">
                    Type
                    {sortBy === "type" && (
                      <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => handleSort("date")}
                >
                  <div className="flex items-center">
                    Date
                    {sortBy === "date" && (
                      <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preview
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFiles.map((media) => (
                <tr key={media._id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getFileTypeIcon(media.type)}
                      <span className="ml-2 text-sm font-medium text-gray-900 truncate max-w-[120px] sm:max-w-xs">
                        {media.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {media.type.split("/")[0]}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {media.createdAt ? new Date(media.createdAt).toLocaleDateString() : 'Unknown'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {media.type.startsWith("image/") && (
                      <div 
                        className="relative cursor-pointer group"
                        onClick={(e) => handlePreviewClick(media, e)}
                      >
                        <img 
                          src={media.url} 
                          alt={media.name} 
                          className="h-10 w-16 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/placeholder-image.png';
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded">
                          <Maximize2 size={14} className="text-white opacity-0 group-hover:opacity-100" />
                        </div>
                      </div>
                    )}
                    {media.type.startsWith("video/") && (
                      <video 
                        src={media.url} 
                        className="h-10 w-16 object-cover rounded cursor-pointer"
                        controls={false}
                        muted
                        onClick={(e) => handlePreviewClick(media, e)}
                        onMouseOver={(e) => e.currentTarget.play()}
                        onMouseOut={(e) => e.currentTarget.pause()}
                      />
                    )}
                    {media.type.startsWith("audio/") && (
                      <audio 
                        src={media.url} 
                        className="w-32 h-8" 
                        controls 
                        onPlay={(e) => handlePlayPause(media._id, e.currentTarget)}
                      />
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {(media.type.startsWith("video/") || media.type.startsWith("audio/")) && (
                        <button
                          onClick={() => {
                            const element = document.querySelector(
                              `${media.type.startsWith("video/") ? "video" : "audio"}[src="${media.url}"]`
                            ) as HTMLMediaElement;
                            if (element) handlePlayPause(media._id, element);
                          }}
                          className="p-1 rounded text-gray-500 hover:bg-gray-100"
                          aria-label={playingMedia === media._id ? "Pause" : "Play"}
                        >
                          {playingMedia === media._id ? (
                            <Pause size={16} className="text-gray-600" />
                          ) : (
                            <Play size={16} className="text-gray-600" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => downloadMedia(media.url, media.name)}
                        className="p-1 rounded text-gray-500 hover:bg-blue-50 hover:text-blue-500"
                        aria-label="Download"
                      >
                        <Download size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMedia(media._id);
                        }}
                        className="p-1 rounded text-gray-500 hover:bg-red-50 hover:text-red-500"
                        aria-label="Delete"
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
      ) : (
        // Grid View
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFiles.map((media) => (
            <div
              key={media._id}
              className="border rounded-xl p-3 hover:shadow-md transition-shadow bg-gray-50"
            >
              <div className="flex flex-col gap-3">
                {/* Media Preview */}
                {media.type.startsWith("image/") && (
                  <div 
                    className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
                    onClick={(e) => handlePreviewClick(media, e)}
                  >
                    <div className="relative group h-full">
                      <img
                        src={media.url}
                        alt={media.name}
                        className="w-full h-full object-contain"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/placeholder-image.png';
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center group-hover:bg-opacity-30 transition-all">
                        <Maximize2 size={20} className="text-white opacity-0 group-hover:opacity-100" />
                      </div>
                    </div>
                  </div>
                )}
                
                {media.type.startsWith("video/") && (
                  <div 
                    className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden"
                    onClick={(e) => handlePreviewClick(media, e)}
                  >
                    <div className="h-full group cursor-pointer">
                      <video
                        src={media.url}
                        controls
                        className="w-full h-full object-contain"
                        onPlay={(e) => handlePlayPause(media._id, e.currentTarget)}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-opacity-0 group-hover:bg-opacity-20 transition-all pointer-events-none">
                        <Maximize2 size={24} className="text-white opacity-0 group-hover:opacity-100" />
                      </div>
                    </div>
                  </div>
                )}
                
                {media.type.startsWith("audio/") && (
                  <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 p-4">
                      <div className="w-full max-w-md">
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
                          onPlay={(e) => handlePlayPause(media._id, e.currentTarget)}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Media Info */}
                <div className="flex justify-between items-center">
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-800 text-sm truncate">
                      {media.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 capitalize">
                        {media.type.split("/")[0]}
                      </span>
                      {media.createdAt && (
                        <span className="text-xs text-gray-400">
                          • {new Date(media.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadMedia(media.url, media.name);
                      }}
                      className="p-1 sm:p-2 text-gray-600 hover:text-blue-600 rounded-lg transition-colors"
                      aria-label="Download"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteMedia(media._id);
                      }}
                      className="p-1 sm:p-2 text-gray-600 hover:text-red-600 rounded-lg transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Footer */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 border-t gap-3">
        <p className="text-sm text-gray-500 order-2 sm:order-1">
          {filteredFiles.length} {filteredFiles.length === 1 ? 'item' : 'items'}
        </p>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm order-1 sm:order-2"
        >
          Back to Dashboard
        </button>
      </div>

      {/* Media Preview Modal */}
      {previewMedia && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-2 sm:p-4 md:p-8"
          onClick={closePreview}
        >
          <div 
            className="relative max-w-full w-full max-h-full bg-white rounded-lg overflow-hidden mx-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-3 sm:p-4 border-b">
              <h3 className="font-medium truncate text-sm sm:text-base max-w-[70%]">{previewMedia.name}</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => downloadMedia(previewMedia.url, previewMedia.name)}
                  className="p-1 sm:p-2 text-gray-600 hover:text-blue-600 rounded-full hover:bg-gray-100"
                  aria-label="Download"
                >
                  <Download size={18} />
                </button>
                <button 
                  onClick={closePreview}
                  className="p-1 sm:p-2 text-gray-600 hover:text-red-600 rounded-full hover:bg-gray-100"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="bg-gray-900 flex items-center justify-center" style={{ height: '70vh' }}>
              {previewMedia.type.startsWith("image/") && (
                <div className="w-full h-full flex items-center justify-center p-2">
                  <img 
                    src={previewMedia.url} 
                    alt={previewMedia.name} 
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = '/placeholder-image.png';
                    }}
                  />
                </div>
              )}
              {previewMedia.type.startsWith("video/") && (
                <video 
                  src={previewMedia.url} 
                  controls 
                  autoPlay
                  className="max-w-full max-h-full"
                />
              )}
              {previewMedia.type.startsWith("audio/") && (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <audio 
                    src={previewMedia.url} 
                    controls
                    autoPlay
                    className="w-full max-w-md"
                  />
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t flex flex-col sm:flex-row justify-between items-center bg-white gap-2">
              <span className="text-xs sm:text-sm text-gray-500">
                {previewMedia.type}
                {previewMedia.createdAt && 
                  ` • Added ${new Date(previewMedia.createdAt).toLocaleDateString()}`
                }
                {previewMedia.size && 
                  ` • ${formatSize(previewMedia.size)}`
                }
              </span>
              <button
                onClick={closePreview}
                className="px-3 py-1 sm:px-4 sm:py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors text-sm w-full sm:w-auto text-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShowMedia;