import React from "react";
import { Device, Playlist } from "../types";
import  Card from "../Card";
import  Button from "../Button";
import  EmptyState from "../EmpthyState";
import  PlaylistCard from "../PlaylistCard";
import Image from "next/image";
import { BsMusicNoteList } from "react-icons/bs";
import { StatusBadge } from "../StatusBadge";
import { MdPlaylistAdd } from "react-icons/md";

interface ConnectedPlaylistsViewProps {
  devices: Device[];
  playlists: Playlist[];
  selectedDevice: Device | null;
  onAddNewPlaylist: () => void;
  onConnectPlaylist: (playlistId: number, deviceId: number) => void;
  onBackToDevices: () => void;
}

const ConnectedPlaylistsView: React.FC<ConnectedPlaylistsViewProps> = ({
  devices,
  playlists,
  selectedDevice,
  onAddNewPlaylist,
  onConnectPlaylist,
  onBackToDevices,
}) => {
  // Filter playlists for the selected device if one is selected
  const filteredPlaylists = selectedDevice
    ? playlists.filter((p) => p.deviceIds.includes(selectedDevice.id))
    : playlists;
    
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
        <Button onClick={onAddNewPlaylist} icon={<MdPlaylistAdd />}>
          Create New Playlist
        </Button>
      </div>
      {selectedDevice && (
        <Card className="p-4" hoverEffect={false}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={selectedDevice.image}
                alt={selectedDevice.name}
                width={48}
                height={48}
                className="object-cover"
              />
            </div>
            <div className="flex-grow">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900">
                  {selectedDevice.name}
                </h4>
                <StatusBadge status={selectedDevice.status} />
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                <span>{selectedDevice.type}</span>
                <span>•</span>
                <span>{selectedDevice.batteryLevel} battery</span>
                <span>•</span>
                <span>Last active: {selectedDevice.lastActive}</span>
              </div>
            </div>
          </div>
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlaylists.length > 0 ? (
          filteredPlaylists.map((playlist) => (
            <PlaylistCard
              key={playlist.id}
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
              ? `No playlists are connected to ${selectedDevice.name} yet. Create a new playlist to get started.`
              : "You haven't created any playlists yet. Create a new playlist to get started."
          }
          icon={<BsMusicNoteList className="text-blue-500 text-3xl" />}
          buttonText="Create New Playlist"
        />
      )}
    </div>
  </div>
);
};

export default ConnectedPlaylistsView;