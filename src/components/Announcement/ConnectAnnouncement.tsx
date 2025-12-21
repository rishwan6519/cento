"use client";

import React, { useState, useEffect } from "react";
import { Database } from "lucide-react";
import toast from "react-hot-toast";

interface Device {
  _id: string;
  name: string;
  deviceId: {
    _id: string;
    serialNumber: string;
    imageUrl: string;
    name: string;
    status: string;
  };
  typeId: {
    _id: string;
    name: string;
  };
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
      toast.error("Failed to fetch connected announcements");
    }
  };

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
      const alreadyConnectedIds = connectedAnnouncements[selectedDevice.deviceId._id] || [];
      const combinedIds = [...new Set([...alreadyConnectedIds, ...selectedAnnouncements])];

      const response = await fetch("/api/announcement/device-announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: selectedDevice.deviceId._id,
          announcementPlaylistIds: combinedIds,
          userId: userId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to connect announcements");
      }

      toast.success("Announcements connected successfully");
      setConnectedAnnouncements(prev => ({ ...prev, [selectedDevice.deviceId._id]: combinedIds }));
      setSelectedAnnouncements([]);
      onSuccess();

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to connect announcements");
    } finally {
      setIsLoading(false);
    }
  };

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
      toast.error(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
      setIsDisconnecting(null);
    }
  };

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
    <div className="bg-[#f0f9fb] min-h-screen p-6">
      <h2 className="text-xl font-bold mb-6">Connect announcement to device</h2>

      {/* Available Devices */}
      <h3 className="text-lg font-semibold mb-3">Available Devices</h3>
      {isLoading && availableDevices.length === 0 ? (
        <p>Loading devices...</p>
      ) : availableDevices.length === 0 ? (
        <p>No devices available.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-10">
          {availableDevices.map((device) => {
            const imageUrl = device.deviceId?.imageUrl || "/placeholder.jpg";
            const deviceName = device.deviceId?.name || device.name;

            return (
              <div
                key={device._id}
                className={`bg-[#0f3b50] text-white rounded-2xl shadow-lg overflow-hidden cursor-pointer transform hover:scale-105 transition-transform ${
                  selectedDevice?._id === device._id ? "ring-2 ring-orange-400" : ""
                }`}
                onClick={() => setSelectedDevice(device)}
              >
                {/* Device Image */}
                <div className="relative h-40 w-full bg-gray-800 flex items-center justify-center">
                  {device.deviceId.imageUrl ? (
                    <img
                      src={device.deviceId.imageUrl}
                      alt={deviceName}
                      className="h-16 w-16 object-cover rounded-full"
                    />
                  ) : (
                    <Database size={40} className="text-white" />
                  )}
               
                </div>

                {/* Device Info */}
                <div className="p-4 flex flex-col gap-2">
                  <h4 className="font-bold text-lg truncate">{deviceName}</h4>
                  <p className="text-xs text-gray-300 truncate">
                    Serial: {device.deviceId?.serialNumber || "N/A"}
                  </p>
                
                </div>

                {/* Action Buttons */}
                <div className="flex justify-around bg-[#0b2735] py-3 text-sm font-medium border-t border-gray-700">
                  <button
                    className="hover:text-orange-400 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDevice(device);
                    }}
                  >
                    Select
                  </button>
                  <button className="text-gray-500 cursor-not-allowed" disabled>
                    Restart
                  </button>
                  <button className="text-gray-500 cursor-not-allowed" disabled>
                    Reassign
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Device & Announcements */}
      {selectedDevice && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white rounded-xl p-6 shadow">
          {/* Selected Device */}
          <div className="flex flex-col">
            <h3 className="font-semibold mb-3">Your selected device</h3>
            <div className="border-2 border-dashed border-[#FFB6A3] mt-6 rounded-xl p-6 text-center w-[300px] bg-white">
              <div className="flex justify-center mb-3">
                {selectedDevice.deviceId.imageUrl ? (
                  <img
                    src={selectedDevice.deviceId.imageUrl}
                    alt={selectedDevice.deviceId.name}
                    className="w-14 h-14 rounded-full"
                  />
                ) : (
                  <Database size={40} className="text-[#0A2E3C]" />
                )}
              </div>
              <p className="text-base font-semibold text-[#00353E] mb-1">
                {selectedDevice.deviceId.name}
              </p>
              <p className="text-xs text-gray-500 mb-3">
                Serial: {selectedDevice.deviceId.serialNumber}
              </p>
              <div className="flex justify-center items-center gap-3 text-xs mb-4">
                <span className="flex items-center gap-1 text-green-600">
                  <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                  {selectedDevice.deviceId.status === "active" ? "Online" : selectedDevice.deviceId.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedDevice(null)}
                className="px-4 py-1 border border-[#00353E] rounded-lg text-xs text-[#00353E] hover:bg-[#00353E] hover:text-white transition-all"
              >
                Switch device
              </button>
            </div>
          </div>

          {/* Announcements */}
          <div>
            <h3 className="font-semibold mb-3">Available Announcement</h3>
            {isLoading && announcementPlaylists.length === 0 ? (
              <p>Loading announcements...</p>
            ) : announcementPlaylists.length === 0 ? (
              <p>No announcement playlists available.</p>
            ) : (
              <div className="space-y-3">
                {announcementPlaylists.map((playlist) => {
                  const isConnected = connectedPlaylistDetails.some(p => p._id === playlist._id);
                  const isSelected = selectedAnnouncements.includes(playlist._id);
                  const isBeingDisconnected = isDisconnecting === playlist._id;
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
                      className={`flex justify-between items-center bg-[#e8f8fc] p-3 rounded-lg ${
                        isDisabled ? "opacity-50 cursor-not-allowed" :
                        isConnected ? "ring-2 ring-green-400" :
                        isSelected ? "ring-2 ring-orange-500" :
                        "hover:shadow-md cursor-pointer"
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
                      <div>
                        <p className="font-medium">{playlist.name}</p>
                        <p className="text-xs text-gray-500">
                          {playlist.announcements?.length || 0} Tracks
                        </p>
                        <p className="text-xs text-gray-500">
                          Schedule: {playlist.schedule.scheduleType}
                        </p>
                      </div>
                      {isConnected ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDisconnectAnnouncement(playlist._id);
                          }}
                          disabled={isBeingDisconnected}
                          className="px-3 py-1 text-xs bg-red-100 text-red-600 rounded-full hover:bg-red-200 disabled:opacity-50"
                        >
                          {isBeingDisconnected ? "Wait..." : "Disconnect"}
                        </button>
                      ) : isDisabled ? (
                        <span className="px-3 py-1 text-xs bg-gray-200 text-gray-600 rounded-full">
                          Slot taken
                        </span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="accent-orange-500 w-5 h-5 cursor-pointer"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {selectedDevice && (
        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleConnectAnnouncementsToDevice}
            disabled={isLoading || selectedAnnouncements.length === 0}
            className="px-6 py-2 rounded-lg bg-[#07323C] text-white hover:bg-[#006377] disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? "Connecting..." : "Connect announcement"}
          </button>
        </div>
      )}

      {!selectedDevice && (
        <div className="flex justify-center mt-8">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default ConnectAnnouncement;