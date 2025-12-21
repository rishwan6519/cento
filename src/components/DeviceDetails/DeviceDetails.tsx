"use client";

import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Database, Calendar, Volume2, Play, Pause, Maximize2, Download, X, Image as ImageIcon, Video, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface PlaylistFile {
  id: string;
  name: string;
  type: string;
  path: string;
  delay?: number;
  backgroundImageEnabled?: boolean;
  backgroundImage?: string | null;
}

interface Playlist {
  _id: string;
  name: string;
  files: PlaylistFile[];
  contentType: string;
  daysOfWeek: string[];
  startTime?: string;
  endTime?: string;
  startDate?: string;
  endDate?: string;
  status?: 'active' | 'inactive';
}

interface AnnouncementFile {
  _id: string;
  name: string;
  path: string;
  type: 'recorded' | 'uploaded' | 'tts';
  voice?: string | null;
  createdAt?: string;
  duration?: number;
}

interface AnnouncementPlaylist {
  _id: string;
  name: string;
  announcements: AnnouncementFile[];
  schedule: {
    scheduleType: 'hourly' | 'timed';
  };
  startDate?: string;
  endDate?: string;
}

interface DeviceDetailsProps {
  device: any;
  onBack: () => void;
}

const DeviceDetails: React.FC<DeviceDetailsProps> = ({ device, onBack }) => {
  const [connectedPlaylists, setConnectedPlaylists] = useState<Playlist[]>([]);
  const [connectedAnnouncements, setConnectedAnnouncements] = useState<AnnouncementPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [expandedPlaylistId, setExpandedPlaylistId] = useState<string | null>(null);
  const [expandedAnnouncementId, setExpandedAnnouncementId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{type: 'playlist' | 'announcement', file: any} | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [disconnectingPlaylistId, setDisconnectingPlaylistId] = useState<string | null>(null);
  const [disconnectingAnnouncementId, setDisconnectingAnnouncementId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
    const [storeLocation, setStoreLocation] = useState<string | null>(null); // Add store location state


  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  useEffect(() => {
    if (userId && device?.deviceId?._id) {
      fetchConnectedDetails();
            fetchUserDetails(); 
    }
  }, [userId, device]);


    const fetchUserDetails = async () => {
    try {
      const response = await fetch(`/api/user/users?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch user details");
      const userData = await response.json();
      setStoreLocation(userData.storeLocation || null);
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  const fetchConnectedDetails = async () => {
    setIsLoading(true);
    try {
      // Fetch connected playlists
      const playlistResponse = await fetch(`/api/connected-playlist?deviceId=${device.deviceId._id}`);
      if (!playlistResponse.ok) throw new Error("Failed to fetch connected playlists");
      const playlistData = await playlistResponse.json();
      
      // Fetch all playlists to get full details
      const allPlaylistsResponse = await fetch(`/api/playlists?userId=${userId}`);
      if (!allPlaylistsResponse.ok) throw new Error("Failed to fetch playlists");
      const allPlaylistsData = await allPlaylistsResponse.json();
      
      // Match connected playlist IDs with full playlist details
      const connectedPlaylistDetails = allPlaylistsData.filter((playlist: Playlist) => 
        playlistData.playlistIds?.includes(playlist._id)
      );
      setConnectedPlaylists(connectedPlaylistDetails);

      // Fetch connected announcements
      const announcementResponse = await fetch(`/api/announcement/device-announcement?deviceId=${device.deviceId._id}`);
      if (!announcementResponse.ok) {
        if (announcementResponse.status === 404) {
          setConnectedAnnouncements([]);
          return;
        }
        throw new Error("Failed to fetch connected announcements");
      }
      const announcementData = await announcementResponse.json();
      
      // Fetch all announcement playlists to get full details
      const allAnnouncementsResponse = await fetch(`/api/announcement/playlist?userId=${userId}`);
      if (!allAnnouncementsResponse.ok) throw new Error("Failed to fetch announcement playlists");
      const allAnnouncementsData = await allAnnouncementsResponse.json();
      
      // Match connected announcement IDs with full details
      const connectedAnnouncementDetails = allAnnouncementsData.playlists.filter((announcement: AnnouncementPlaylist) => 
        announcementData.announcementPlaylistIds?.includes(announcement._id)
      );
      setConnectedAnnouncements(connectedAnnouncementDetails);
    } catch (error) {
      console.error("Error fetching connected details:", error);
      toast.error("Failed to load connected details");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlaylistExpansion = (playlistId: string) => {
    setExpandedPlaylistId(expandedPlaylistId === playlistId ? null : playlistId);
    setExpandedAnnouncementId(null);
  };

  const toggleAnnouncementExpansion = (announcementId: string) => {
    setExpandedAnnouncementId(expandedAnnouncementId === announcementId ? null : announcementId);
    setExpandedPlaylistId(null);
  };

  const handlePreviewClick = (type: 'playlist' | 'announcement', file: any) => {
    setPreviewFile({ type, file });
  };

  const closePreview = () => {
    setPreviewFile(null);
  };

  const handlePlayPause = (file: any) => {
    const fullPath = file.path.startsWith("http") ? file.path : `https://iot.centelon.com${file.path}`;
    
    if (playingId === file._id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingId(null);
    } else {
      // Pause any other playing audio
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      // Create new audio element
      const audio = new Audio(fullPath);
      audio.onended = () => setPlayingId(null);
      audio.play();
      audioRef.current = audio;
      setPlayingId(file._id);
    }
  };

  const downloadFile = (url: string, filename: string) => {
    const fullPath = url.startsWith("http") ? url : `https://iot.centelon.com${url}`;
    const link = document.createElement('a');
    link.href = fullPath;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDisconnectPlaylist = async (playlistId: string) => {
    setDisconnectingPlaylistId(playlistId);
    try {
      const response = await fetch(
        `/api/device-playlists?deviceId=${device.deviceId._id}&playlistId=${playlistId}`,
        { method: "DELETE" }
      );
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to disconnect playlist.");
      }
      
      toast.success("Playlist disconnected successfully.");
      // Remove the disconnected playlist from state
      setConnectedPlaylists(prev => prev.filter(p => p._id !== playlistId));
      if (expandedPlaylistId === playlistId) {
        setExpandedPlaylistId(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to disconnect playlist.");
    } finally {
      setDisconnectingPlaylistId(null);
    }
  };

  const handleDisconnectAnnouncement = async (announcementId: string) => {
    setDisconnectingAnnouncementId(announcementId);
    try {
      const response = await fetch(
        `/api/announcement/device-announcement?deviceId=${device.deviceId._id}&announcementPlaylistId=${announcementId}`,
        { method: "DELETE" }
      );
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to disconnect announcement.");
      }
      
      toast.success("Announcement disconnected successfully.");
      // Remove the disconnected announcement from state
      setConnectedAnnouncements(prev => prev.filter(a => a._id !== announcementId));
      if (expandedAnnouncementId === announcementId) {
        setExpandedAnnouncementId(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to disconnect announcement.");
    } finally {
      setDisconnectingAnnouncementId(null);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes("image")) return <ImageIcon className="text-green-500" size={20} />;
    if (type.includes("video")) return <Video className="text-blue-500" size={20} />;
    if (type.includes("audio")) return <Volume2 className="text-purple-500" size={20} />;
    return <Database className="text-gray-500" size={20} />;
  };

  const getFileTypeLabel = (type: string) => {
    if (type.includes("image")) return "Image";
    if (type.includes("video")) return "Video";
    if (type.includes("audio")) return "Audio";
    return "File";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="bg-[#f0f9fb] min-h-screen p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center">
          <button 
            onClick={onBack}
            className="flex items-center text-[#07323C] hover:text-[#006377] mr-4"
          >
            <ArrowLeft className="mr-2" />
            Back to Devices
          </button>
          <h2 className="text-xl font-bold">Device Details</h2>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm"
        >
          Cancel
        </button>
      </div>

      {/* Device Info Card */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="flex flex-col md:flex-row items-center">
          <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden mb-4 md:mb-0 md:mr-6">
            {device.deviceId?.imageUrl ? (
              <img 
                src={device.deviceId.imageUrl} 
                alt={device.deviceId.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="bg-gray-200 w-full h-full flex items-center justify-center">
                <Database size={40} className="text-gray-400" />
              </div>
            )}
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full border-2 border-white ${
              device.deviceId?.status === "active" ? "bg-green-500" : "bg-red-500"
            }`}></div>
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">{device.deviceId?.name || "Unnamed Device"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center">
                <span className="text-gray-500 w-32">Serial Number:</span>
                <span className="font-medium">{device.deviceId?.serialNumber || "N/A"}</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-500 w-32">Device Type:</span>
                <span className="font-medium">{device.typeId?.name || "N/A"}</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-500 w-32">Status:</span>
                <span className={`font-medium ${
                  device.deviceId?.status === "active" ? "text-green-600" : "text-red-600"
                }`}>
                  {device.deviceId?.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-500 w-32">Assigned:</span>
                <span className="font-medium">User Account</span>
              </div>
                {storeLocation && ( 
                <div className="flex items-center">
                  <span className="text-gray-500 w-32">Store Location:</span>
                  <span className="font-medium">{storeLocation}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Connected Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connected Playlists */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center mb-4">
            <Play className="text-[#07323C] mr-2" />
            <h3 className="text-lg font-bold">Connected Playlists</h3>
            <span className="ml-2 bg-[#07323C] text-white text-xs rounded-full px-2 py-1">
              {connectedPlaylists.length}
            </span>
          </div>
          
          {isLoading ? (
            <p className="text-gray-500">Loading playlists...</p>
          ) : connectedPlaylists.length === 0 ? (
            <div className="text-center py-8">
              <Play className="mx-auto text-gray-300 mb-2" size={40} />
              <p className="text-gray-500">No playlists connected to this device</p>
            </div>
          ) : (
            <div className="space-y-4">
              {connectedPlaylists.map((playlist) => (
                <div key={playlist._id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div 
                    className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => togglePlaylistExpansion(playlist._id)}
                  >
                    <div className="flex items-center">
                      <div className="bg-blue-100 p-2 rounded-lg mr-3">
                        <Play className="text-blue-600" size={20} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{playlist.name}</h4>
                        <p className="text-xs text-gray-500">{playlist.files?.length || 0} files • {playlist.contentType}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">
                        {playlist.daysOfWeek?.slice(0, 2).join(", ") || "No schedule"}
                        {playlist.daysOfWeek?.length > 2 ? ` +${playlist.daysOfWeek.length - 2}` : ""}
                      </span>
                      <button className="p-1 text-gray-500">
                        <svg 
                          className={`transform transition-transform ${expandedPlaylistId === playlist._id ? 'rotate-180' : ''}`} 
                          width="20" 
                          height="20" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {expandedPlaylistId === playlist._id && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-700 mb-2">Playlist Details</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div className="flex">
                            <span className="text-gray-500 w-28">Status:</span>
                            <span className={`font-medium ${
                              playlist.status === 'active' ? 'text-green-600' : 'text-gray-600'
                            }`}>
                              {playlist.status === 'active' ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="flex">
                            <span className="text-gray-500 w-28">Schedule:</span>
                            <span className="font-medium">{playlist.daysOfWeek?.join(", ") || "Not scheduled"}</span>
                          </div>
                          <div className="flex">
                            <span className="text-gray-500 w-28">Start Date:</span>
                            <span className="font-medium">{formatDate(playlist.startDate)}</span>
                          </div>
                          <div className="flex">
                            <span className="text-gray-500 w-28">End Date:</span>
                            <span className="font-medium">{formatDate(playlist.endDate)}</span>
                          </div>
                          {playlist.startTime && (
                            <div className="flex">
                              <span className="text-gray-500 w-28">Start Time:</span>
                              <span className="font-medium">{playlist.startTime}</span>
                            </div>
                          )}
                          {playlist.endTime && (
                            <div className="flex">
                              <span className="text-gray-500 w-28">End Time:</span>
                              <span className="font-medium">{playlist.endTime}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="font-medium text-gray-700">Files ({playlist.files?.length || 0})</h5>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDisconnectPlaylist(playlist._id);
                            }}
                            disabled={!!disconnectingPlaylistId}
                            className="flex items-center text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                          >
                            {disconnectingPlaylistId === playlist._id ? (
                              <>
                                <span className="animate-spin h-4 w-4 border-b-2 border-red-600 rounded-full mr-1"></span>
                                Disconnecting...
                              </>
                            ) : (
                              <>
                                <Trash2 size={16} className="mr-1" />
                                Disconnect
                              </>
                            )}
                          </button>
                        </div>
                        <div className="max-h-60 overflow-y-auto border rounded-lg">
                          {playlist.files?.map((file, index) => (
                            <div key={file.id || index} className="flex items-center p-3 border-b border-gray-100 last:border-0 hover:bg-white">
                              <span className="text-xs text-gray-500 w-6">{index + 1}.</span>
                              <div className="mr-3">
                                {getFileIcon(file.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">{getFileTypeLabel(file.type)}</p>
                              </div>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePreviewClick('playlist', file);
                                }}
                                className="p-2 text-gray-500 hover:text-blue-500 rounded-full hover:bg-blue-50"
                              >
                                <Maximize2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Connected Announcements */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center mb-4">
            <Volume2 className="text-[#07323C] mr-2" />
            <h3 className="text-lg font-bold">Connected Announcements</h3>
            <span className="ml-2 bg-[#07323C] text-white text-xs rounded-full px-2 py-1">
              {connectedAnnouncements.length}
            </span>
          </div>
          
          {isLoading ? (
            <p className="text-gray-500">Loading announcements...</p>
          ) : connectedAnnouncements.length === 0 ? (
            <div className="text-center py-8">
              <Volume2 className="mx-auto text-gray-300 mb-2" size={40} />
              <p className="text-gray-500">No announcements connected to this device</p>
            </div>
          ) : (
            <div className="space-y-4">
              {connectedAnnouncements.map((announcement) => (
                <div key={announcement._id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div 
                    className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleAnnouncementExpansion(announcement._id)}
                  >
                    <div className="flex items-center">
                      <div className="bg-orange-100 p-2 rounded-lg mr-3">
                        <Volume2 className="text-orange-600" size={20} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{announcement.name}</h4>
                        <p className="text-xs text-gray-500">{announcement.announcements?.length || 0} tracks • {announcement.schedule.scheduleType}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <button className="p-1 text-gray-500">
                        <svg 
                          className={`transform transition-transform ${expandedAnnouncementId === announcement._id ? 'rotate-180' : ''}`} 
                          width="20" 
                          height="20" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {expandedAnnouncementId === announcement._id && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-700 mb-2">Announcement Details</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div className="flex">
                            <span className="text-gray-500 w-28">Schedule:</span>
                            <span className="font-medium capitalize">{announcement.schedule.scheduleType}</span>
                          </div>
                          <div className="flex">
                            <span className="text-gray-500 w-28">Tracks:</span>
                            <span className="font-medium">{announcement.announcements?.length || 0} files</span>
                          </div>
                          <div className="flex">
                            <span className="text-gray-500 w-28">Start Date:</span>
                            <span className="font-medium">{formatDate(announcement.startDate)}</span>
                          </div>
                          <div className="flex">
                            <span className="text-gray-500 w-28">End Date:</span>
                            <span className="font-medium">{formatDate(announcement.endDate)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <h5 className="font-medium text-gray-700">Tracks ({announcement.announcements?.length || 0})</h5>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDisconnectAnnouncement(announcement._id);
                            }}
                            disabled={!!disconnectingAnnouncementId}
                            className="flex items-center text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                          >
                            {disconnectingAnnouncementId === announcement._id ? (
                              <>
                                <span className="animate-spin h-4 w-4 border-b-2 border-red-600 rounded-full mr-1"></span>
                                Disconnecting...
                              </>
                            ) : (
                              <>
                                <Trash2 size={16} className="mr-1" />
                                Disconnect
                              </>
                            )}
                          </button>
                        </div>
                        <div className="max-h-60 overflow-y-auto border rounded-lg">
                          {announcement.announcements?.map((file, index) => (
                            <div key={file._id || index} className="flex items-center p-3 border-b border-gray-100 last:border-0 hover:bg-white">
                              <span className="text-xs text-gray-500 w-6">{index + 1}.</span>
                              <div className="mr-3">
                                <Volume2 className="text-red-500" size={20} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">{file.type}{file.voice ? ` • ${file.voice}` : ''}</p>
                              </div>
                              <div className="flex items-center">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePlayPause(file);
                                  }}
                                  className="p-2 text-gray-500 hover:text-blue-500 rounded-full hover:bg-blue-50 mr-1"
                                >
                                  {playingId === file._id ? <Pause size={16} /> : <Play size={16} />}
                                </button>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePreviewClick('announcement', file);
                                  }}
                                  className="p-2 text-gray-500 hover:text-blue-500 rounded-full hover:bg-blue-50"
                                >
                                  <Maximize2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={closePreview}
        >
          <div 
            className="relative max-w-4xl w-full bg-white rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold truncate max-w-[80%]">
                {previewFile.file.name}
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => downloadFile(previewFile.file.path, previewFile.file.name)}
                  className="p-2 text-gray-600 hover:text-blue-600 rounded-full hover:bg-gray-200"
                  title="Download"
                >
                  <Download size={20} />
                </button>
                <button 
                  onClick={closePreview}
                  className="p-2 text-gray-600 hover:text-red-600 rounded-full hover:bg-gray-200"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {previewFile.type === 'playlist' ? (
                <div className="flex flex-col items-center">
                  <div className="bg-gray-100 rounded-xl w-full h-96 flex items-center justify-center mb-6 overflow-hidden">
                    {previewFile.file.type.includes('image') ? (
                      <img 
                        src={previewFile.file.path.startsWith("http") ? previewFile.file.path : `https://iot.centelon.com${previewFile.file.path}`} 
                        alt={previewFile.file.name} 
                        className="max-h-96 object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder-image.png';
                        }}
                      />
                    ) : previewFile.file.type.includes('video') ? (
                      <video 
                        src={previewFile.file.path.startsWith("http") ? previewFile.file.path : `https://iot.centelon.com${previewFile.file.path}`} 
                        controls 
                        className="max-h-96 w-full"
                        onError={(e) => {
                          const target = e.target as HTMLVideoElement;
                          target.innerHTML = '<div class="text-gray-500">Video failed to load</div>';
                        }}
                      />
                    ) : previewFile.file.type.includes('audio') ? (
                      <div className="flex flex-col items-center w-full">
                        <div className="bg-blue-100 p-6 rounded-full mb-6">
                          <Volume2 size={60} className="text-blue-600" />
                        </div>
                        <div className="w-full max-w-md">
                          <audio 
                            src={previewFile.file.path.startsWith("http") ? previewFile.file.path : `https://iot.centelon.com${previewFile.file.path}`} 
                            controls 
                            className="w-full"
                            onError={(e) => {
                              const target = e.target as HTMLAudioElement;
                              target.innerHTML = '<div class="text-gray-500">Audio failed to load</div>';
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Database size={60} className="text-gray-400 mb-4" />
                        <p className="text-gray-500">File type not supported for preview</p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-700 mb-2">File Information</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-gray-500">Name:</span> {previewFile.file.name}</p>
                        <p><span className="text-gray-500">Type:</span> {getFileTypeLabel(previewFile.file.type)}</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-700 mb-2">Actions</h4>
                      <button
                        onClick={() => downloadFile(previewFile.file.path, previewFile.file.name)}
                        className="flex items-center text-blue-600 hover:text-blue-800"
                      >
                        <Download size={16} className="mr-1" />
                        Download File
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-xl w-full h-96 flex flex-col items-center justify-center mb-6 text-white p-6">
                    <div className="bg-blue-500 p-6 rounded-full mb-6">
                      <Volume2 size={60} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{previewFile.file.name}</h3>
                    <div className="flex flex-wrap justify-center gap-4 mt-2">
                      {previewFile.file.voice && (
                        <span className="bg-blue-700 px-3 py-1 rounded-full text-sm">Voice: {previewFile.file.voice}</span>
                      )}
                      {previewFile.file.duration && (
                        <span className="bg-indigo-700 px-3 py-1 rounded-full text-sm">Duration: {previewFile.file.duration}s</span>
                      )}
                      <span className="bg-purple-700 px-3 py-1 rounded-full text-sm capitalize">{previewFile.file.type}</span>
                    </div>
                    <div className="w-full max-w-md mt-6">
                      <audio 
                        src={previewFile.file.path.startsWith("http") ? previewFile.file.path : `https://iot.centelon.com${previewFile.file.path}`} 
                        controls 
                        className="w-full"
                        onError={(e) => {
                          const target = e.target as HTMLAudioElement;
                          target.innerHTML = '<div class="text-gray-300">Audio failed to load</div>';
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-700 mb-2">Announcement Information</h4>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-gray-500">Name:</span> {previewFile.file.name}</p>
                        <p><span className="text-gray-500">Type:</span> {previewFile.file.type}</p>
                        {previewFile.file.voice && (
                          <p><span className="text-gray-500">Voice:</span> {previewFile.file.voice}</p>
                        )}
                        {previewFile.file.duration && (
                          <p><span className="text-gray-500">Duration:</span> {previewFile.file.duration} seconds</p>
                        )}
                        {previewFile.file.createdAt && (
                          <p><span className="text-gray-500">Created:</span> {new Date(previewFile.file.createdAt).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-700 mb-2">Actions</h4>
                      <div className="space-y-2">
                        <button
                          onClick={() => downloadFile(previewFile.file.path, previewFile.file.name)}
                          className="flex items-center text-blue-600 hover:text-blue-800"
                        >
                          <Download size={16} className="mr-1" />
                          Download Audio
                        </button>
                        <button
                          onClick={() => {
                            handlePlayPause(previewFile.file);
                          }}
                          className="flex items-center text-green-600 hover:text-green-800"
                        >
                          {playingId === previewFile.file._id ? (
                            <>
                              <Pause size={16} className="mr-1" />
                              Pause Audio
                            </>
                          ) : (
                            <>
                              <Play size={16} className="mr-1" />
                              Play Audio
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={closePreview}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
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

export default DeviceDetails;