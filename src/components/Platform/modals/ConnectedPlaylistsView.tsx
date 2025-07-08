import React, { useState, useEffect } from "react";
import { Device, Playlist, DeviceReference } from "../types";
import Card from "../Card";
import Button from "../Button";
import EmptyState from "../EmpthyState"; // Fixed typo
import PlaylistCard from "../PlaylistCard";
import Image from "next/image";
import { BsMusicNoteList } from "react-icons/bs";
import { MdPlaylistAdd } from "react-icons/md";
import { log } from "console";

interface ConnectedPlaylistsViewProps {
  devices: Device[];
  playlists?: Playlist[];
  selectedDevice: Device | null;
  onAddNewPlaylist: () => void;
  onConnectPlaylist: (playlistId: string, deviceId: string) => void; // Changed to string IDs
  onBackToDevices: () => void;
}

const ConnectedPlaylistsView: React.FC<ConnectedPlaylistsViewProps> = ({
  devices,
  playlists: initialPlaylists,
  selectedDevice,
  onAddNewPlaylist,
  onConnectPlaylist,
  onBackToDevices,
}) => {
  const [playlists, setPlaylists] = useState<Playlist[]>(
    initialPlaylists || []
  );
  const [isLoading, setIsLoading] = useState<boolean>(!initialPlaylists);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const userId = localStorage.getItem("userId");
        if (!userId) throw new Error("User ID not found");

        const response = await fetch(`/api/device-playlists?userId=${userId}`);
        if (!response.ok) throw new Error(`Error: ${response.statusText}`);

        const data = await response.json();
        console.log("Fetched playlists:", data);

        // Transform API data to match Playlist interface
        const formattedPlaylists = data.map((item: any) => ({
          id: item.playlistId,
          name: item.playlistData.name,
          type: item.playlistData.type || "default",
          contentType: item.playlistData.contentType,
          startTime: item.playlistData.startTime,
          endTime: item.playlistData.endTime,
          files:
            item.playlistData.files?.map((file: any) => ({
              name: file.name,
              path: file.path,
              type: file.type,
              displayOrder: Number(file.displayOrder) || 0,
              delay: Number(file.delay) || 0,
              backgroundImageEnabled: Boolean(file.backgroundImageEnabled),
              backgroundImage: file.backgroundImage || null,
            })) || [],
          status: item.playlistData.status || "active",
          createdAt: new Date(item.playlistData.createdAt),
          deviceIds: (item.deviceIds || []).map((deviceId: string) => {
            const device = devices.find((d) => d._id === deviceId);
            return {
              _id: deviceId,
              name: device?.deviceId?.name || "Unknown Device",
              status: device?.status || "Disconnected",
              typeId: device?.typeId?.name || "",
              batteryLevel: device?.batteryLevel || "",
              lastActive: device?.lastActive || "",
              imageUrl: device?.deviceId?.imageUrl || "",
            };
          }),
        }));

        setPlaylists(formattedPlaylists);
        console.log("Formatted playlists:", formattedPlaylists);
      } catch (err) {
        console.error("Failed to fetch playlists:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch playlists"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaylists();
  }, [devices]);

  // Update filtering logic to show unconnected playlists for selected device
  const filteredPlaylists = selectedDevice
    ? playlists.filter(
        (playlist) =>
          !playlist.deviceIds.some((device) => device.id === selectedDevice._id)
      )
    : playlists;
    console.log("playlists", playlists);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          {selectedDevice ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onBackToDevices}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Connected Playlists: {selectedDevice.name}
                </h3>
                <p className="text-gray-500">
                  Manage media playlists for this device
                </p>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                All Playlists
              </h3>
              <p className="text-gray-500">
                Manage and connect playlists to your devices
              </p>
            </div>
          )}
        </div>
      </div>
      {selectedDevice && (
        <Card className="p-4" hoverEffect={false}>
          <div className="flex items-center gap-4">
            <div className="flex-grow">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900">
                  {selectedDevice.name}
                </h4>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                <span>{selectedDevice.typeId.name}</span>
                <span>•</span>
                <span>Serial: {selectedDevice.deviceId.serialNumber}</span>
                <span>•</span>
                <span>Last active: {selectedDevice.lastActive}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          <p>{error}</p>
          <button
            className="mt-2 text-sm font-medium text-red-700 hover:text-red-800"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      )}

      {/* Playlist grid */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlaylists && filteredPlaylists.length > 0 ? (
            filteredPlaylists.map((playlist) => (
              <PlaylistCard
                key={
                  playlist.id || playlist.id || playlist.name || Math.random()
                }
                playlist={playlist}
                devices={devices}
                onConnect={onConnectPlaylist}
              />
            ))
          ) : (
            <EmptyState
              onAddNew={onAddNewPlaylist}
              message={
                selectedDevice
                  ? `No playlists available to connect to ${selectedDevice.deviceId.name}`
                  : "No playlists available. Create a new playlist to get started."
              }
              icon={<BsMusicNoteList className="text-blue-500 text-3xl" />}
              buttonText="Create New Playlist"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectedPlaylistsView;
