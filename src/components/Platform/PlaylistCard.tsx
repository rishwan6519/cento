import React, { useState } from "react";
import { Device, Playlist } from "../Platform/types";
import  Card  from "./Card";
import { BsCollectionPlay } from "react-icons/bs";
import { FaEllipsisV } from "react-icons/fa";
import { motion } from "framer-motion";

interface PlaylistCardProps {
  playlist: Playlist;
  devices: Device[];
  onConnect: (playlistId: number, deviceId: number) => void;
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({
  playlist,
  devices,
  onConnect,
}) => {
  const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);
  return (
    <Card className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-900 flex items-center">
          <BsCollectionPlay className="mr-2 text-primary-500" />
          {playlist.name}
        </h4>
        <div className="relative">
          <button
            onClick={() => setShowDeviceDropdown(!showDeviceDropdown)}
            className="p-1.5 rounded-full hover:bg-gray-100"
          >
            <FaEllipsisV className="text-gray-500" />
          </button>
          {showDeviceDropdown && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-100 z-10"
            >
              <div className="p-2">
                <p className="text-xs font-medium text-gray-500 px-3 py-1.5">
                  Connect to device
                </p>
                {devices.filter((d) => !playlist.deviceIds.includes(d._id))
                  .length > 0 ? (
                  devices
                    .filter((d) => !playlist.deviceIds.includes(d._id))
                    .map((device) => (
                      <button
                        key={device._id}
                        onClick={() => {
                          onConnect(playlist.id, device._id);
                          setShowDeviceDropdown(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center"
                      >
                        <span className="w-2 h-2 rounded-full mr-2 bg-gray-400"></span>
                        {device.name}
                      </button>
                    ))
                ) : (
                  <p className="text-xs text-gray-500 px-3 py-1.5">
                    Connected to all devices
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-4">
        <div>
          <p className="text-gray-500">Tracks</p>
          <p className="text-gray-800 font-medium">{playlist.tracks}</p>
        </div>
        <div>
          <p className="text-gray-500">Duration</p>
          <p className="text-gray-800 font-medium">{playlist.duration}</p>
        </div>
      </div>
      <div className="mt-auto">
        <p className="text-xs text-gray-500">Connected to:</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {playlist.deviceIds.length > 0 ? (
            playlist.deviceIds.map((id) => {
              const connectedDevice = devices.find((d) => d._id === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs"
                >
                  {connectedDevice?.name || `Device ${id}`}
                </span>
              );
            })
          ) : (
            <span className="text-xs text-gray-500">
              Not connected to any device
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};

export default PlaylistCard;