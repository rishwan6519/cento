import React, { useState } from "react";
import { Device, Playlist } from "../Platform/types";
import Card from "./Card";
import { BsCollectionPlay } from "react-icons/bs";
import { FaEllipsisV } from "react-icons/fa";
import { motion } from "framer-motion";

// Helper function to format duration
const formatDuration = (startTime: string, endTime: string): string => {
  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);
  const diff = end.getTime() - start.getTime();
  const minutes = Math.floor(diff / 60000);
  return `${minutes} mins`;
};

// Helper function to get file icon
const getFileIcon = (type: string) => {
  switch (type) {
    case "audio":
      return "🎵";
    case "video":
      return "🎬";
    default:
      return "📄";
  }
};

interface PlaylistCardProps {
  playlist: Playlist;
  devices: Device[];
  onConnect: (playlistId: string, deviceId: string) => void; // Changed from number to string
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({
  playlist,
  devices,
  onConnect,
}) => {
  const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);
  const [showTracks, setShowTracks] = useState(false);

  // Add a helper function to check if a device is connected
  const isDeviceConnected = (deviceId: string) => {
    return playlist.deviceIds.some((d) => d.id === deviceId);
  };

  // Add error handling for device connection
  const handleConnect = (deviceId: string) => {
    try {
      if (!playlist.id || !deviceId) {
        console.error("Invalid playlist or device ID");
        return;
      }
      onConnect(playlist.id, deviceId);
      setShowDeviceDropdown(false);
    } catch (err) {
      console.error("Error connecting device:", err);
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-900 flex items-center">
          <BsCollectionPlay className="mr-2 text-primary-500" />
          {playlist.name}
        </h4>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-4">
        <div>
          <p className="text-gray-500">Tracks</p>
          <button
            onClick={() => setShowTracks(!showTracks)}
            className="text-gray-800 font-medium hover:text-primary-500 flex items-center"
          >
            {playlist.files?.length || 0}{" "}
            {playlist.files?.length === 1 ? "track" : "tracks"}
            <span className="ml-1 text-xs">
              {showTracks ? "(hide)" : "(show)"}
            </span>
          </button>
        </div>
        <div>
          <p className="text-gray-500">Duration</p>
          <p className="text-gray-800 font-medium">
            {formatDuration(playlist.startTime, playlist.endTime)}
          </p>
        </div>
      </div>

      {showTracks && playlist.files && playlist.files.length > 0 && (
        <div className="mb-4 border-t border-gray-100 pt-3">
          <ul className="space-y-2">
            {playlist.files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center justify-between text-sm px-2 py-1.5 hover:bg-gray-50 rounded"
              >
                <div className="flex items-center">
                  <span className="text-gray-400 mr-3 w-4">{index + 1}</span>
                  <span className="mr-2">{getFileIcon(file.type)}</span>
                  <span className="text-gray-800">{file.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                    Delay: {file.delay}s
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-auto">
        <p className="text-xs text-gray-500 mb-1">
          Connected Devices ({playlist.deviceIds.length})
        </p>
        <div className="flex flex-wrap gap-1 mt-1">
          {playlist.deviceIds.length > 0 ? (
            playlist.deviceIds.map((deviceId, ind) => {
              const connectedDevice = devices.find(
                (d) => d._id.toString() === deviceId.id
              );
              console.log("Connected Devices:", connectedDevice,devices);
              const deviceStatus = connectedDevice?.status || deviceId.status;
              const statusColor =
                deviceStatus === "Connected"
                  ? "bg-green-50 text-green-700"
                  : "bg-blue-50 text-blue-700";

              return (
                <span
                  key={`device-${deviceId.id || Math.random()}`}
                  className={`inline-flex items-center px-2 py-1 rounded-md ${statusColor} text-xs group relative`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                      deviceStatus === "Connected"
                        ? "bg-green-500"
                        : "bg-blue-500"
                    }`}
                  ></span>
                  {deviceId.name ||
                    connectedDevice?.deviceId?.name ||
                    `Device ${deviceId.id}`}

                  {/* Status tooltip on hover */}
                  <div className="hidden group-hover:block absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap">
                    {deviceStatus}
                  </div>
                </span>
              );
            })
          ) : (
            <span className="text-xs text-gray-500">
              Not connected to any device
            </span>
          )}
        </div>

        {/* Show total count if more than 2 devices */}
        {playlist.deviceIds.length > 2 && (
          <p className="text-xs text-gray-500 mt-1">
            Total {playlist.deviceIds.length} devices connected
          </p>
        )}
      </div>
    </Card>
  );
};

export default PlaylistCard;
