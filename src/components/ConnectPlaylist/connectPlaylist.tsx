"use client";

import React, { useState, useEffect } from "react";
import { Database, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

interface Device {
  _id: string;
  name: string;
  deviceId: {
    serialNumber: string;
    imageUrl: string;
    name: string;
    
  };
  typeId:{
    _id: string;
    name: string;
    handMovements: string[];
    bodyMovements: string[];
    screenSize: string;
  }
  imageUrl?: string;
  serialNumber?: string;
  type?: string;
}

interface Playlist {
  _id?: string;
  name: string;
  files: any[];
  contentType: string;
}

interface ConnectPlaylistProps {
  onCancel: () => void;
  onSuccess: () => void;
}

const ConnectPlaylist: React.FC<ConnectPlaylistProps> = ({
  onCancel,
  onSuccess
}) => {
  const [connectStep, setConnectStep] = useState<number>(1);
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedDeviceForPlaylist, setSelectedDeviceForPlaylist] = useState<Device | null>(null);
  const [selectedPlaylistsForDevice, setSelectedPlaylistsForDevice] = useState<string[]>([]);
  const [connectedPlaylists, setConnectedPlaylists] = useState<{[deviceId: string]: string[]}>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
      fetchPlaylists();
    }
  }, [userId]);

  useEffect(() => {
    if (selectedDeviceForPlaylist?._id) {
      fetchConnectedPlaylists(selectedDeviceForPlaylist._id);
    }
  }, [selectedDeviceForPlaylist]);

  const fetchAvailableDevices = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/onboarded-devices?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch devices");
      const data = await response.json();
      // console.log(data.data, "Available devices data");
      setAvailableDevices(data.data || []);
    } catch (error) {
      console.error("Error fetching devices:", error);
      toast.error("Failed to fetch devices");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlaylists = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/playlists?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch playlists");
      const data = await response.json();
      setPlaylists(data || []);
    } catch (error) {
      console.error("Error fetching playlists:", error);
      toast.error("Failed to fetch playlists");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConnectedPlaylists = async (deviceId: string) => {
    try {
      const response = await fetch(`/api/connected-playlist?deviceId=${deviceId}`);
      if (!response.ok) throw new Error("Failed to fetch connected playlists");
      const data = await response.json();
      setConnectedPlaylists((prev) => ({
        ...prev,
        [deviceId]: data.playlistIds || [],
      }));
    } catch (error) {
      console.error("Error fetching connected playlists:", error);
      toast.error("Failed to fetch connected playlists");
    }
  };

  const handleConnectPlaylistToDevice = async () => {
    if (!selectedDeviceForPlaylist?._id) {
      toast.error("Please select a device");
      return;
    }
    
    if (selectedPlaylistsForDevice.length === 0) {
      toast.error("Please select at least one playlist");
      return;
    }
    
    // Filter out any empty strings or invalid IDs
    const validPlaylistIds = selectedPlaylistsForDevice.filter(
      (id) => id && id.trim() !== ""
    );
    
    if (validPlaylistIds.length === 0) {
      toast.error("No valid playlists selected");
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch("/api/device-playlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deviceId: selectedDeviceForPlaylist._id,
          playlistIds: validPlaylistIds,
          userId: userId,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to connect playlists");
      }
      
      toast.success("Playlists connected successfully");
      resetForm();
      onSuccess();
    } catch (error) {
      console.error("Error connecting playlists:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to connect playlists"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setConnectStep(1);
    setSelectedDeviceForPlaylist(null);
    setSelectedPlaylistsForDevice([]);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold text-black">
          Connect Playlist to Device
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Step {connectStep} of 2:{" "}
          {connectStep === 1 ? "Select Device" : "Choose Playlists"}
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
                  if (device._id) {
                    setSelectedDeviceForPlaylist(device);
                    setConnectStep(2);
                  } else {
                    toast.error("Invalid device selected");
                  }
                }}
                className={`p-4 border rounded-lg text-left transition-all ${
                  selectedDeviceForPlaylist?._id === device._id
                    ? "border-blue-500 ring-2 ring-blue-500 ring-opacity-50"
                    : "hover:border-blue-500"
                }`}
              >
                <div className="flex items-center gap-3">
                  {device.deviceId.imageUrl ? (
                    <img
                      src={device.deviceId.imageUrl}
                      alt={device.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Database size={24} className="text-gray-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {device.deviceId.name||"N/A"}
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
                setSelectedPlaylistsForDevice([]);
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
              {selectedDeviceForPlaylist?.name} (
              {`${selectedDeviceForPlaylist?.deviceId.name} serial Number :-${selectedDeviceForPlaylist?.deviceId.serialNumber}`})
            </p>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">
                Available Playlists
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {playlists.map((playlist) => {
                  const isConnected = connectedPlaylists[
                    selectedDeviceForPlaylist?._id || ""
                  ]?.includes(playlist._id || "");
                  
                  return (
                    <div
                      key={playlist._id}
                      className={`p-4 border rounded-lg ${
                        isConnected
                          ? "border-gray-300 bg-gray-50 cursor-not-allowed"
                          : selectedPlaylistsForDevice.includes(
                              playlist._id || ""
                            )
                          ? "border-blue-500 bg-blue-50"
                          : "hover:border-blue-500"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="relative">
                          {/* Content type tag in corner */}
                          <span className="absolute -top-2 -left-2 text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                            {playlist?.contentType}
                          </span>
                          <h4 className="font-medium text-gray-900 mt-3">
                            {playlist.name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {playlist.files?.length || 0} files
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isConnected ? (
                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                              Already Connected
                            </span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={selectedPlaylistsForDevice.includes(
                                playlist._id || ""
                              )}
                              onChange={() => {
                                const playlistId = playlist._id || "";
                                setSelectedPlaylistsForDevice((prev) =>
                                  prev.includes(playlistId)
                                    ? prev.filter(
                                        (id) => id !== playlistId
                                      )
                                    : [...prev, playlistId]
                                );
                              }}
                              className="h-5 w-5 text-blue-600 rounded"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {playlists.length === 0 && !isLoading && (
                <p className="text-center text-gray-500 py-4">
                  No playlists available. Please create playlists first.
                </p>
              )}
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              onClick={() => {
                setConnectStep(1);
                setSelectedPlaylistsForDevice([]);
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={handleConnectPlaylistToDevice}
              disabled={selectedPlaylistsForDevice.length === 0 || isLoading}
              className={`px-6 py-2 rounded-lg ${
                selectedPlaylistsForDevice.length === 0 || isLoading
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
              } text-white`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Connecting...</span>
                </div>
              ) : (
                "Connect Playlists"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectPlaylist;