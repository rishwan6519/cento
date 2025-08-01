"use client";

import React, { useState, useEffect } from "react";
import { Database, ArrowLeft, Mic, Upload, Clock, Calendar } from "lucide-react";
import toast from "react-hot-toast";

// --- INTERFACES ---

// Re-using the Device interface from your example
interface Device {
  _id: string;
  name: string;
  deviceId: {
    _id: string;
    serialNumber: string;
    imageUrl: string;
    name: string;
  };
  typeId:{
    _id: string;
    name: string;
  }
}

// Interface for the announcement playlists we'll fetch
interface AnnouncementPlaylist {
  _id: string;
  name: string;
  announcements: any[]; // We only need the length for the UI
  schedule: {
    scheduleType: 'hourly' | 'timed';
  };
}

interface ConnectAnnouncementProps {
  onCancel: () => void;
  onSuccess: () => void;
}

const ConnectAnnouncement: React.FC<ConnectAnnouncementProps> = ({
  onCancel,
  onSuccess
}) => {
  const [connectStep, setConnectStep] = useState<number>(1);
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [announcementPlaylists, setAnnouncementPlaylists] = useState<AnnouncementPlaylist[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [selectedAnnouncements, setSelectedAnnouncements] = useState<string[]>([]);
  const [connectedAnnouncements, setConnectedAnnouncements] = useState<{[deviceId: string]: string[]}>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  // Fetch initial data when userId is set
  useEffect(() => {
    if (userId) {
      fetchAvailableDevices();
      fetchAnnouncementPlaylists(); // Fetch announcements instead of playlists
    }
  }, [userId]);

  // Fetch already-connected announcements when a device is selected
  useEffect(() => {
    if (selectedDevice?.deviceId._id) {
      fetchConnectedAnnouncements(selectedDevice.deviceId._id);
    }
  }, [selectedDevice]);

  const fetchAvailableDevices = async () => {
    if(!userId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/onboarded-devices?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch devices");
      const data = await response.json();
      setAvailableDevices(data.data || []);
    } catch (error) {
      console.error("Error fetching devices:", error);
      toast.error("Failed to fetch devices");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnnouncementPlaylists = async () => {
    if(!userId) return;
    setIsLoading(true);
    try {
      // API endpoint for fetching announcement playlists
      const response = await fetch(`/api/announcement/playlist?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch announcement playlists");
      const data = await response.json();
      setAnnouncementPlaylists(data.playlists || []);
    } catch (error) {
      console.error("Error fetching announcement playlists:", error);
      toast.error("Failed to fetch announcement playlists");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConnectedAnnouncements = async (deviceId: string) => {
    try {
      // Assumes an API endpoint to get announcements connected to a device
      const response = await fetch(`/api/announcement/device-announcement?deviceId=${deviceId}`);
      if (!response.ok) {
          // It's okay if this fails (e.g., 404), means no connections exist
          if(response.status === 404) {
             setConnectedAnnouncements((prev) => ({ ...prev, [deviceId]: [] }));
             return;
          }
          throw new Error("Failed to fetch connected announcements");
      }
      const data = await response.json();
      setConnectedAnnouncements((prev) => ({
        ...prev,
        [deviceId]: data.announcementPlaylistIds || [],
      }));
    } catch (error) {
      console.error("Error fetching connected announcements:", error);
      toast.error("Failed to fetch connected announcements");
    }
  };

  const handleConnectAnnouncementsToDevice = async () => {
    if (!selectedDevice?.deviceId._id) {
      toast.error("Please select a device");
      return;
    }
    
    const validAnnouncementIds = selectedAnnouncements.filter(id => id && id.trim() !== "");
    
    if (validAnnouncementIds.length === 0) {
      toast.error("Please select at least one announcement playlist");
      return;
    }
    
    setIsLoading(true);
    try {
      // Assumes a POST endpoint to create the device-announcement connection
      const response = await fetch("/api/announcement/device-announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: selectedDevice.deviceId._id,
          announcementPlaylistIds: validAnnouncementIds, // Changed key
          userId: userId,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to connect announcements");
      }
      
      toast.success("Announcements connected successfully");
      resetForm();
      onSuccess();
    } catch (error) {
      console.error("Error connecting announcements:", error);
      toast.error(error instanceof Error ? error.message : "Failed to connect announcements");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setConnectStep(1);
    setSelectedDevice(null);
    setSelectedAnnouncements([]);
  };

  const renderScheduleIcon = (scheduleType: 'hourly' | 'timed') => {
    return scheduleType === 'hourly' 
      ? <Clock size={14} className="text-gray-500" /> 
      : <Calendar size={14} className="text-gray-500" />;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 text-black">
      <div className="mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold">
          Connect Announcement to Device
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Step {connectStep} of 2:{" "}
          {connectStep === 1 ? "Select Device" : "Choose Announcements"}
        </p>
      </div>
      
      {isLoading && connectStep === 1 ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : connectStep === 1 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableDevices.map((device) => (
              <button
                key={device._id}
                onClick={() => {
                  setSelectedDevice(device);
                  setConnectStep(2);
                }}
                className={`p-4 border rounded-lg text-left transition-all hover:border-blue-500`}
              >
                <div className="flex items-center gap-3">
                  {device.deviceId.imageUrl ? (
                    <img
                      src={device.deviceId.imageUrl}
                      alt={device.deviceId.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Database size={24} className="text-gray-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {device.deviceId.name || "N/A"}
                    </h3>
                    <p className="text-sm text-gray-500">
                      ID: {device.deviceId.serialNumber || "N/A"}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          {availableDevices.length === 0 && !isLoading && (
            <p className="text-center text-gray-500 py-4">
              No devices available. Please add devices first.
            </p>
          )}
          
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => {
                setConnectStep(1);
                setSelectedAnnouncements([]);
              }}
              className="text-blue-500 hover:text-blue-600 flex items-center gap-1"
            >
              <ArrowLeft size={20} />
              <span>Back to Devices</span>
            </button>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="font-medium text-blue-900">
              Selected Device
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              {selectedDevice?.deviceId.name} (Serial: {selectedDevice?.deviceId.serialNumber})
            </p>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">
                Available Announcement Playlists
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {announcementPlaylists.map((playlist) => {
                  const isConnected = connectedAnnouncements[
                    selectedDevice?.deviceId._id || ""
                  ]?.includes(playlist._id || "");
                  
                  return (
                    <div
                      key={playlist._id}
                      className={`p-4 border rounded-lg ${
                        isConnected
                          ? "border-gray-300 bg-gray-50 cursor-not-allowed"
                          : selectedAnnouncements.includes(playlist._id)
                          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500"
                          : "hover:border-blue-500 cursor-pointer"
                      }`}
                      onClick={() => {
                          if (isConnected) return;
                          const playlistId = playlist._id || "";
                          setSelectedAnnouncements((prev) =>
                              prev.includes(playlistId)
                                ? prev.filter((id) => id !== playlistId)
                                : [...prev, playlistId]
                          );
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {playlist.name}
                          </h4>
                          <div className="flex items-center gap-3 text-sm text-gray-500 mt-2">
                            <span className="flex items-center gap-1"><Mic size={14}/> {playlist.announcements?.length || 0} files</span>
                            <span className="flex items-center gap-1 capitalize">{renderScheduleIcon(playlist.schedule.scheduleType)} {playlist.schedule.scheduleType}</span>
                          </div>
                        </div>
                        {isConnected ? (
                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full font-medium">
                              Connected
                            </span>
                          ) : (
                            <input
                              type="checkbox"
                              readOnly
                              checked={selectedAnnouncements.includes(playlist._id)}
                              className="h-5 w-5 text-blue-600 rounded border-gray-300"
                            />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {announcementPlaylists.length === 0 && !isLoading && (
                <p className="text-center text-gray-500 py-4">
                  No announcement playlists found. Please create one first.
                </p>
              )}
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleConnectAnnouncementsToDevice}
              disabled={selectedAnnouncements.length === 0 || isLoading}
              className="px-6 py-2 rounded-lg text-white font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Connecting...</span>
                </div>
              ) : (
                `Connect ${selectedAnnouncements.length} Announcement${selectedAnnouncements.length === 1 ? '' : 's'}`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectAnnouncement;