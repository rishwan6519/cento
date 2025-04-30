import React, { useState, useEffect } from "react";
import { Device, Playlist } from "../types";
// If you need to add these interfaces to your types.ts file:
/*
interface Device {
  _id: string | number;
  name: string;
  status: string;
  typeId: { name: string };
  batteryLevel: string;
  lastActive: string;
  imageUrl: string;
}

interface Playlist {
  id: number;
  name: string;
  type: string;
  contentType: string;
  startTime: string;
  endTime: string;
  files: Array<{
    id: string;
    name: string;
    path: string;
    type: string;
    displayOrder: number;
    delay: number;
    backgroundImageEnabled: boolean;
    backgroundImage: string | null;
  }>;
  status: string;
  createdAt: Date;
  deviceIds: number[];
}
*/
import Card from "../Card";
import Button from "../Button";
import EmptyState from "../EmpthyState"; // Fixed typo in the import name
import PlaylistCard from "../PlaylistCard";
import Image from "next/image";
import { BsMusicNoteList } from "react-icons/bs";
import { StatusBadge } from "../StatusBadge";
import { MdPlaylistAdd } from "react-icons/md";

interface ConnectedPlaylistsViewProps {
  devices: Device[];
  playlists?: Playlist[]; // Make playlists optional since we'll fetch them
  selectedDevice: Device | null;
  onAddNewPlaylist: () => void;
  onConnectPlaylist: (playlistId: number, deviceId: number) => void;
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
  const [playlists, setPlaylists] = useState<Playlist[]>(initialPlaylists || []);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch playlist data from API
  useEffect(() => {
    const fetchPlaylists = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get userId from localStorage
        const userId = localStorage.getItem('userId');
        
        if (!userId) {
          throw new Error("User ID not found in local storage");
        }
        
        const response = await fetch(`/api/device-playlists?userId=${userId}`);
        
        if (!response.ok) {
          throw new Error(`Error fetching playlists: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // For debugging
        console.log("API Response:", data);
        
        // Check if data has the expected structure
        if (!data || !data.playlistIds || !Array.isArray(data.playlistIds)) {
          throw new Error("Invalid response format from API");
        }

        // Transform API data to match our Playlist type
        const formattedPlaylists = data.playlistIds.map((playlist: any) => ({
          id: parseInt(playlist._id.toString().substring(0, 8), 16) || Math.floor(Math.random() * 1000000), // Convert ObjectId to number or use random ID
          name: playlist.name,
          type: playlist.type,
          contentType: playlist.contentType,
          startTime: playlist.startTime,
          endTime: playlist.endTime,
          files: Array.isArray(playlist.files) ? playlist.files.map((file: any) => ({
            id: file._id ? 
              (typeof file._id === 'string' ? file._id : file._id.toString()) : 
              file.id,
            name: file.name,
            path: file.path,
            type: file.type,
            displayOrder: typeof file.displayOrder === 'object' ? 
              parseInt(file.displayOrder.$numberInt) : 
              typeof file.displayOrder === 'string' ? 
                parseInt(file.displayOrder) : file.displayOrder || 0,
            delay: typeof file.delay === 'object' ? 
              parseInt(file.delay.$numberInt) : 
              typeof file.delay === 'string' ? 
                parseInt(file.delay) : file.delay || 0,
            backgroundImageEnabled: file.backgroundImageEnabled,
            backgroundImage: file.backgroundImage || null
          })) : [],
          status: playlist.status,
          createdAt: playlist.createdAt instanceof Date ? 
            playlist.createdAt : 
            new Date(playlist.createdAt.$date ? 
              playlist.createdAt.$date.$numberLong : playlist.createdAt),
          deviceIds: data.deviceId ? 
            [typeof data.deviceId === 'string' ? 
              parseInt(data.deviceId) : 
              parseInt(data.deviceId.toString().substring(0, 8), 16)] : 
            [], // Convert deviceId to number
        }));
        
        setPlaylists(formattedPlaylists);
      } catch (err) {
        console.error("Failed to fetch playlists:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch playlists");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaylists();
  }, []);

  // Filter playlists for the selected device if one is selected
  const filteredPlaylists = selectedDevice
    ? playlists.filter((p) => {
        // Handle both string and number ID types
        const deviceId = typeof selectedDevice._id === 'string' 
          ? parseInt(selectedDevice._id) 
          : selectedDevice._id;
        return p.deviceIds.includes(deviceId);
      })
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
                src={selectedDevice.imageUrl}
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
                <span>{selectedDevice.typeId.name}</span>
                <span>•</span>
                <span>{selectedDevice.batteryLevel} battery</span>
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
                ? `No playlists are connected to ${selectedDevice.typeId.name} yet. Create a new playlist to get started.`
                : "You haven't created any playlists yet. Create a new playlist to get started."
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