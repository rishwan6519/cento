"use client";

import React, { useState, useEffect } from "react";
import { Database, ArrowLeft, Mic, Clock, Calendar, XCircle, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";

// --- INTERFACES (no changes) ---
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

interface AnnouncementPlaylist {
  _id: string;
  name: string;
  announcements: any[];
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
  const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      setUserId(storedUserId);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchAvailableDevices();
      fetchAnnouncementPlaylists();
    }
  }, [userId]);

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
      const response = await fetch(`/api/announcement/device-announcement?deviceId=${deviceId}`);
      if (!response.ok) {
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

  // --- MODIFIED CONNECT FUNCTION ---
  const handleConnectAnnouncementsToDevice = async () => {
    if (!selectedDevice?.deviceId._id || !userId) {
      toast.error("Please select a device.");
      return;
    }
    
    if (selectedAnnouncements.length === 0) {
      toast.error("Please select an announcement playlist to connect.");
      return;
    }
    
    setIsLoading(true);
    try {
      // Combine newly selected playlists with existing ones
      const alreadyConnectedIds = connectedAnnouncements[selectedDevice.deviceId._id] || [];
      const combinedIds = [...new Set([...alreadyConnectedIds, ...selectedAnnouncements])];

      const response = await fetch("/api/announcement/device-announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: selectedDevice.deviceId._id,
          announcementPlaylistIds: combinedIds, // Send the full list
          userId: userId,
        }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to connect announcements");
      }
      
      toast.success("Announcements connected successfully");

      // Update local state for immediate UI feedback
      setConnectedAnnouncements(prev => ({ ...prev, [selectedDevice.deviceId._id]: combinedIds }));
      setSelectedAnnouncements([]); // Clear selection
      onSuccess();

    } catch (error) {
      console.error("Error connecting announcements:", error);
      toast.error(error instanceof Error ? error.message : "Failed to connect announcements");
    } finally {
      setIsLoading(false);
    }
  };
  
  // --- Disconnect function (no changes) ---
  const handleDisconnectAnnouncement = async (playlistId: string) => {
    if (!selectedDevice?.deviceId._id) {
        toast.error("No device selected for disconnection.");
        return;
    }

    setIsDisconnecting(playlistId);
    try {
        const response = await fetch(
            `/api/announcement/device-announcement?deviceId=${selectedDevice.deviceId._id}&announcementPlaylistId=${playlistId}`,
            { method: "DELETE" }
        );

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || "Failed to disconnect announcement.");
        }

        toast.success("Announcement disconnected successfully.");

        setConnectedAnnouncements((prev) => {
            const currentIds = prev[selectedDevice.deviceId._id] || [];
            return {
                ...prev,
                [selectedDevice.deviceId._id]: currentIds.filter(id => id !== playlistId),
            };
        });

    } catch (error) {
        console.error("Error disconnecting announcement:", error);
        toast.error(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
        setIsDisconnecting(null);
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

  // --- LOGIC TO ENFORCE SELECTION RULES ---
  const connectedPlaylistDetails = announcementPlaylists.filter(p => 
      connectedAnnouncements[selectedDevice?.deviceId._id || ""]?.includes(p._id)
  );
  const selectedPlaylistDetails = announcementPlaylists.filter(p => selectedAnnouncements.includes(p._id));

  const isTimedSlotTaken = 
    connectedPlaylistDetails.some(p => p.schedule.scheduleType === 'timed') ||
    selectedPlaylistDetails.some(p => p.schedule.scheduleType === 'timed');

  const isHourlySlotTaken = 
    connectedPlaylistDetails.some(p => p.schedule.scheduleType === 'hourly') ||
    selectedPlaylistDetails.some(p => p.schedule.scheduleType === 'hourly');


  return (
    <div className="bg-white rounded-xl shadow-sm p-6 text-black">
      {/* Header and Step 1 JSX remain the same */}
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
              onClick={resetForm}
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
                Available Announcement Playlists (Max: 1 Timed, 1 Hourly)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {announcementPlaylists.map((playlist) => {
                  const isConnected = connectedPlaylistDetails.some(p => p._id === playlist._id);
                  const isSelected = selectedAnnouncements.includes(playlist._id);
                  const isBeingDisconnected = isDisconnecting === playlist._id;
                  
                  // --- NEW: Determine if the card should be disabled ---
                  let isDisabled = false;
                  if (playlist.schedule.scheduleType === 'timed' && isTimedSlotTaken && !isSelected && !isConnected) {
                    isDisabled = true;
                  }
                  if (playlist.schedule.scheduleType === 'hourly' && isHourlySlotTaken && !isSelected && !isConnected) {
                    isDisabled = true;
                  }

                  return (
                    <div
                      key={playlist._id}
                      className={`p-4 border rounded-lg transition-all ${
                        isDisabled ? "bg-gray-100 opacity-60 cursor-not-allowed" :
                        isConnected ? "border-green-300 bg-green-50" :
                        isSelected ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500" : 
                        "hover:border-blue-500 cursor-pointer"
                      }`}
                      onClick={() => {
                          if (isConnected || isDisabled) return;
                          setSelectedAnnouncements((prev) =>
                              prev.includes(playlist._id)
                                ? prev.filter((id) => id !== playlist._id)
                                : [...prev, playlist._id]
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
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDisconnectAnnouncement(playlist._id); }}
                              disabled={isBeingDisconnected}
                              className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full hover:bg-red-200 disabled:opacity-50 flex items-center gap-1"
                            >
                              <XCircle size={14} />
                              {isBeingDisconnected ? 'Wait' : 'Disconnect'}
                            </button>
                        ) : isDisabled ? (
                            <span className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-200 rounded-full">Slot taken</span>
                        ) : (
                          <div className={`h-5 w-5 rounded-md flex items-center justify-center ${isSelected ? 'bg-blue-600' : 'border border-gray-300'}`}>
                            {isSelected && <CheckCircle size={14} className="text-white"/>}
                          </div>
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