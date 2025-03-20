'use client';

import React, { useEffect, useState, useRef } from 'react';
import { toast, Toaster } from 'react-hot-toast';

interface Device {
  id: string;
  name: string;
  typeId: string;
}

interface Playlist {
  id: string;
  name: string;
  files: {
    id: string;
    name: string;
    url: string;
  }[];
  backgroundAudio?: {
    name: string;
    url: string;
  };
  volume: {
    main: number;
    background: number;
  };
}

interface Schedule {
  id: string;
  deviceTypeId: string;
  playlists: {
    playlistId: string;
    duration: number;
  }[];
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

const DemoPage: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const backgroundAudioRef = useRef<HTMLAudioElement>(null);

  // Fetch devices on component mount
  useEffect(() => {
    fetchDevices();
  }, []);

  // Fetch schedules when device is selected
  useEffect(() => {
    if (selectedDevice) {
      fetchSchedules(selectedDevice);
    }
  }, [selectedDevice]);

  const fetchDevices = async () => {
    try {
      const response = await fetch('/api/device-types');
      if (!response.ok) throw new Error('Failed to fetch devices');
      
      const data = await response.json();
      console.log('Device types response:', data); // Debug log
      
      if (data.length > 0) { 
        alert('Devices fetched successfully!'); // Changed from data.devices to data.deviceTypes
        setDevices(data.map((type: any) => ({
          id: type.id,
          name: type.name,
          typeId: type.id
        })));
        console.log(devices)
        alert(devices)
      
       // Debug log
      
        
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast.error('Failed to fetch devices');
    }
  };
  console.log(devices,",,,,,,,,,,,,,");

  const fetchSchedules = async (deviceId: string) => {
    try {
      const device = devices.find(d => d.id === deviceId);
      if (!device) return;

      const response = await fetch(`/api/playlist-schedule?deviceTypeId=${device.typeId}`);
      if (!response.ok) throw new Error('Failed to fetch schedules');
      
      const data = await response.json();
      if (data.success) {
        setSchedules(data.schedules);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Failed to fetch schedules');
    }
  };

  const playPlaylist = async (playlistId: string) => {
    try {
      const response = await fetch(`/api/playlists/${playlistId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch playlist');
      }
      
      const data = await response.json();
      if (data.success) {
        setCurrentPlaylist(data.playlist);
        setIsPlaying(true);

        // Play main audio if available
        if (audioRef.current && data.playlist.files[0]) {
          audioRef.current.src = data.playlist.files[0].url;
          audioRef.current.volume = data.playlist.volume.main / 100;
          await audioRef.current.play().catch(console.error);
        }

        // Play background audio if available
        if (backgroundAudioRef.current && data.playlist.backgroundAudio) {
          backgroundAudioRef.current.src = data.playlist.backgroundAudio.url;
          backgroundAudioRef.current.volume = data.playlist.volume.background / 100;
          await backgroundAudioRef.current.play().catch(console.error);
        }
      }
    } catch (error) {
      console.error('Error fetching playlist:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to play playlist');
    }
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (backgroundAudioRef.current) {
      backgroundAudioRef.current.pause();
      backgroundAudioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  return (
    <div className="p-6">
      <Toaster />
      <h1 className="text-2xl font-bold mb-6">Device Playlist Demo</h1>

      {/* Device Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Device Type</label>
        <select
          value={selectedDevice}
          onChange={(e) => setSelectedDevice(e.target.value)}
          className="w-full p-2 border rounded-lg"
        >
          <option value="">Select a device type......</option>
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name }
            </option>
          ))}
        </select>
      </div>

      {/* Schedules and Playlists */}
      {selectedDevice && schedules.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Available Playlists</h2>
          {schedules.map((schedule) => (
            <div key={schedule.id} className="border p-4 rounded-lg">
              <h3 className="font-medium mb-2">Schedule: {schedule.startTime} - {schedule.endTime}</h3>
              <div className="space-y-2">
                {schedule.playlists.map((playlist) => (
                  <button
                    key={playlist.playlistId}
                    onClick={() => playPlaylist(playlist.playlistId)}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Play Playlist {playlist.playlistId}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : selectedDevice ? (
        <p>No schedules found for this device.</p>
      ) : null}

      {/* Playback Controls */}
      {isPlaying && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <p className="font-medium">Now Playing: {currentPlaylist?.name}</p>
            </div>
            <button
              onClick={stopPlayback}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Hidden Audio Elements */}
      <audio ref={audioRef} />
      <audio ref={backgroundAudioRef} loop />
    </div>
  );
};

export default DemoPage;