"use client";
import React, { useState, useEffect } from "react";
import { XCircle, Clock, Play, Calendar, Mic, Upload, Volume2 } from "lucide-react";

// Interfaces
interface AnnouncementFile {
  _id: string;
  name: string;
  path: string;
  type: 'recorded' | 'generated';
  voice?: string;
}

interface AnnouncementItem {
  file: string;
  displayOrder: number;
  delay: number;
  maxVolume: number; // Added maxVolume property
}

interface Schedule {
  scheduleType:  'hourly' | 'timed';
  time?: string;
  frequency?: number;
  startDate?: string;
  endDate?: string;
  daysOfWeek?: string[];
  startTime?: string;
  endTime?: string;
}

interface AnnouncementPlaylist {
  name: string;
  announcements: AnnouncementItem[];
  schedule: Schedule;
  status: 'active' | 'inactive' | 'scheduled';
}

interface AnnouncementCreatorProps {
  onCancel?: () => void;
  onSuccess?: () => void;
}

const AnnouncementCreator: React.FC<AnnouncementCreatorProps> = ({ onCancel, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [announcementFiles, setAnnouncementFiles] = useState<AnnouncementFile[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [savedPlaylistName, setSavedPlaylistName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [playlist, setPlaylist] = useState<AnnouncementPlaylist>({
    name: "",
    announcements: [],
    schedule: {
      scheduleType: 'hourly',
      frequency: 60,
    },
    status: 'active'
  });

  useEffect(() => {
    const id = localStorage.getItem("userId");
    setUserId(id);
  }, []);

  useEffect(() => {
    const fetchAnnouncementFiles = async () => {
      if (!userId) {
        setIsLoadingFiles(false);
        return;
      }
      setIsLoadingFiles(true);
      setError(null);
      try {
        const response = await fetch(`/api/announcement/list?userId=${userId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch announcement files: ${response.status}`);
        }
        const data = await response.json();
        const files = data.announcements || data.files || data || [];
        setAnnouncementFiles(Array.isArray(files) ? files : []);
      } catch (error) {
        console.error("Error fetching announcement files:", error);
        setError("Failed to load announcement files. Please try again.");
        setAnnouncementFiles([]);
      } finally {
        setIsLoadingFiles(false);
      }
    };
    fetchAnnouncementFiles();
  }, [userId]);

  const daysList = [
    { label: "Sun", value: "sunday" },
    { label: "Mon", value: "monday" },
    { label: "Tue", value: "tuesday" },
    { label: "Wed", value: "wednesday" },
    { label: "Thu", value: "thursday" },
    { label: "Fri", value: "friday" },
    { label: "Sat", value: "saturday" },
  ];

  const handleScheduleTypeChange = (type: 'hourly' | 'timed') => {
    setPlaylist(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        scheduleType: type,
        frequency: type === 'hourly' ? prev.schedule.frequency || 60 : undefined,
        time: type === 'timed' ? prev.schedule.time : undefined,
      }
    }));
  };

  const handleDayToggle = (day: string) => {
    setPlaylist(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        daysOfWeek: prev.schedule.daysOfWeek?.includes(day)
          ? prev.schedule.daysOfWeek.filter(d => d !== day)
          : [...(prev.schedule.daysOfWeek || []), day]
      }
    }));
  };

  const handleFileToggle = (file: AnnouncementFile) => {
    const isSelected = playlist.announcements.some(a => a.file === file._id);
    
    if (isSelected) {
      setPlaylist(prev => ({
        ...prev,
        announcements: prev.announcements.filter(a => a.file !== file._id)
      }));
    } else {
      const newItem: AnnouncementItem = {
        file: file._id,
        displayOrder: playlist.announcements.length + 1,
        delay: 2,
        maxVolume: 100, // Initialize with default max volume
      };
      setPlaylist(prev => ({
        ...prev,
        announcements: [...prev.announcements, newItem]
      }));
    }
  };

  const updateAnnouncementDelay = (fileId: string, delay: number) => {
    setPlaylist(prev => ({
      ...prev,
      announcements: prev.announcements.map(a => 
        a.file === fileId ? { ...a, delay } : a
      )
    }));
  };

  // New function to handle volume changes
  const updateAnnouncementVolume = (fileId: string, volume: number) => {
    setPlaylist(prev => ({
      ...prev,
      announcements: prev.announcements.map(a => 
        a.file === fileId ? { ...a, maxVolume: volume } : a
      )
    }));
  };

  const removeAnnouncement = (fileId: string) => {
    setPlaylist(prev => ({
      ...prev,
      announcements: prev.announcements
        .filter(a => a.file !== fileId)
        .map((a, index) => ({ ...a, displayOrder: index + 1 }))
    }));
  };

  const validatePlaylist = (): string | null => {
    if (!playlist.name.trim()) return "Please enter a playlist name";
    if (playlist.announcements.length === 0) return "Please select at least one announcement file";
    const { scheduleType, startDate, endDate, startTime, endTime, frequency } = playlist.schedule;
    if (scheduleType === 'hourly') {
      if (!startDate || !endDate || !startTime || !endTime) return "Please set the full date and time range for the schedule";
      if (!frequency || frequency < 1) return "Please set a valid frequency (at least 1 minute)";
    }
    if (scheduleType === 'timed') {
      if (!startDate || !endDate || !startTime || !endTime) return "Please set the full date and time range for the schedule";
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validatePlaylist();
    if (validationError) {
      alert(validationError);
      return;
    }
    if (!userId) {
      alert("User not authenticated");
      return;
    }
    setIsLoading(true);
    try {
      // The entire playlist state, including maxVolume, is sent to the API
      const response = await fetch(`/api/announcement/playlist-setup?userId=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(playlist),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save announcement playlist");
      }
      setSavedPlaylistName(playlist.name);
      setIsSaved(true);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error saving playlist:', error);
      alert(error instanceof Error ? error.message : 'Failed to save announcement playlist');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setIsSaved(false);
    setSavedPlaylistName("");
    setPlaylist({
      name: "",
      announcements: [],
      schedule: { scheduleType: 'hourly', frequency: 60 },
      status: 'active'
    });
  };
  
  const getSelectedFile = (fileId: string) => {
    return announcementFiles.find(f => f._id === fileId);
  };

  const getScheduleDescription = () => {
    const { scheduleType, time, frequency, daysOfWeek } = playlist.schedule;
    switch (scheduleType) {
      case 'hourly':
        const freq = frequency || 60;
        return `Plays every ${freq} minute${freq > 1 ? 's' : ''}`;
      case 'timed':
        const timeStr = time || 'Not set';
        const daysStr = daysOfWeek && daysOfWeek.length > 0 ? ` on ${daysOfWeek.join(', ')}` : ' daily';
        return `Plays at ${timeStr}${daysStr}`;
      default:
        return '';
    }
  };

  const refreshAnnouncementFiles = async () => {
    if (!userId) return;
    setIsLoadingFiles(true);
    setError(null);
    try {
      const response = await fetch(`/api/announcement/list?userId=${userId}`);
      if (!response.ok) throw new Error(`Failed to refresh files: ${response.status}`);
      const data = await response.json();
      const files = data.announcements || data.files || data || [];
      setAnnouncementFiles(Array.isArray(files) ? files : []);
    } catch (error) {
      console.error("Error refreshing files:", error);
      setError("Failed to refresh files");
    } finally {
      setIsLoadingFiles(false);
    }
  };

  if (isSaved) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 text-black text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Success!</h2>
          <p className="text-gray-600 mt-2">Announcement playlist "{savedPlaylistName}" has been saved.</p>
        </div>
        <div className="flex justify-center gap-4">
          <button onClick={() => console.log('View all playlists')} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium">View All Playlists</button>
          <button onClick={handleCreateNew} className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium">Create Another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 text-black">
      <div className="mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold">Create Announcement Playlist</h2>
        <p className="text-gray-600 text-sm mt-1">Schedule and organize your announcements</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Playlist Name</label>
          <input type="text" value={playlist.name} onChange={(e) => setPlaylist(prev => ({ ...prev, name: e.target.value }))} className="w-full p-3 border rounded-lg text-sm" placeholder="e.g., Daily Store Closing Announcements" />
        </div>

        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-semibold flex items-center gap-2"><Clock size={18} /> Schedule Configuration</h3>
          <div>
            <label className="block text-sm font-medium mb-2">Schedule Type</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[{ type: 'hourly' as const, label: 'Frequency Based', desc: 'Play at regular intervals', icon: Clock }, { type: 'timed' as const, label: 'Scheduled Time', desc: 'Play at specific times', icon: Calendar }].map(({ type, label, desc, icon: Icon }) => (
                <div key={type} onClick={() => handleScheduleTypeChange(type)} className={`p-3 border rounded-lg cursor-pointer transition-all ${playlist.schedule.scheduleType === type ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex items-center gap-2 mb-1"><Icon size={16} /><span className="font-medium">{label}</span></div>
                  <p className="text-xs text-gray-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playlist.schedule.scheduleType === 'hourly' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Frequency (min)</label>
                  <input type="number" min="1" value={playlist.schedule.frequency || 60} onChange={(e) => setPlaylist(prev => ({ ...prev, schedule: { ...prev.schedule, frequency: parseInt(e.target.value, 10) || 1 } }))} className="w-full p-2 border rounded text-sm" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input type="date" value={playlist.schedule.startDate || ''} onChange={(e) => setPlaylist(prev => ({ ...prev, schedule: { ...prev.schedule, startDate: e.target.value } }))} className="w-full p-2 border rounded text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input type="date" value={playlist.schedule.endDate || ''} onChange={(e) => setPlaylist(prev => ({ ...prev, schedule: { ...prev.schedule, endDate: e.target.value } }))} className="w-full p-2 border rounded text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Start Time</label>
                <input type="time" value={playlist.schedule.startTime || ''} onChange={(e) => setPlaylist(prev => ({ ...prev, schedule: { ...prev.schedule, startTime: e.target.value } }))} className="w-full p-2 border rounded text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">End Time</label>
                <input type="time" value={playlist.schedule.endTime || ''} onChange={(e) => setPlaylist(prev => ({ ...prev, schedule: { ...prev.schedule, endTime: e.target.value } }))} className="w-full p-2 border rounded text-sm" />
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium mb-1">Days of Week (Optional)</label>
                <div className="flex gap-2 flex-wrap">
                  {daysList.map((day) => (
                    <button key={day.value} type="button" onClick={() => handleDayToggle(day.value)} className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${playlist.schedule.daysOfWeek?.includes(day.value) ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}>
                      {day.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Leave all unchecked to run every day within the date range.</p>
              </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Select Announcement Files</label>
              <button onClick={refreshAnnouncementFiles} disabled={isLoadingFiles} className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50">{isLoadingFiles ? 'Loading...' : 'Refresh'}</button>
            </div>
            <div className="max-h-80 overflow-y-auto border rounded-lg p-3">
              {isLoadingFiles ? (
                <div className="text-center py-8"><div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div><p className="text-sm text-gray-500">Loading files...</p></div>
              ) : error ? (
                <div className="text-center py-8"><p className="text-sm text-red-600 mb-2">{error}</p><button onClick={refreshAnnouncementFiles} className="text-xs text-blue-600 hover:text-blue-800">Try Again</button></div>
              ) : announcementFiles.length === 0 ? (
                <div className="text-center py-8 text-gray-500"><Mic className="h-8 w-8 mx-auto mb-2 text-gray-300" /><p className="text-sm">No announcement files found</p></div>
              ) : (
                announcementFiles.map((file) => (
                  <div key={file._id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded">
                    <input type="checkbox" checked={playlist.announcements.some(a => a.file === file._id)} onChange={() => handleFileToggle(file)} className="h-4 w-4" />
                    <div className="flex items-center gap-2">{file.type === 'recorded' ? <Mic className="h-4 w-4 text-red-500" /> : <Upload className="h-4 w-4 text-blue-500" />}</div>
                    <div className="flex-1"><p className="font-medium text-sm">{file.name}</p></div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Selected Files Order ({playlist.announcements.length})</h4>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {playlist.announcements.length === 0 ? (
                <div className="text-center py-8 text-gray-500"><Play className="h-8 w-8 mx-auto mb-2 text-gray-300" /><p className="text-sm">No files selected</p></div>
              ) : (
                playlist.announcements.map((item, index) => {
                  const file = getSelectedFile(item.file);
                  if (!file) return null;
                  
                  return (
                    <div key={item.file} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                      <span className="text-gray-500 text-sm font-medium w-6">{index + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{file.name}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-2">
                           {/* Delay Control */}
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600">Delay(s)</label>
                            <input type="number" min="0" max="300" value={item.delay} onChange={(e) => updateAnnouncementDelay(item.file, parseInt(e.target.value) || 0)} className="w-16 p-1 border rounded text-sm" />
                          </div>
                          {/* --- NEW: VOLUME CONTROL --- */}
                          <div className="flex items-center gap-2 flex-1">
                            <Volume2 size={16} className="text-gray-500 flex-shrink-0" />
                            <input type="range" min="0" max="100" value={item.maxVolume} onChange={(e) => updateAnnouncementVolume(item.file, parseInt(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                            <span className="text-xs font-mono text-gray-600 w-10 text-right">{item.maxVolume}%</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => removeAnnouncement(item.file)} className="text-red-500 hover:text-red-700"><XCircle size={16} /></button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button onClick={onCancel || (() => console.log('Cancel'))} className="px-6 py-2 text-gray-600 hover:text-gray-900">Cancel</button>
          <button onClick={handleSave} disabled={isLoading || playlist.announcements.length === 0 || !playlist.name.trim()} className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium">
            {isLoading ? (<div className="flex items-center gap-2"><div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div><span>Saving...</span></div>) : ('Save Playlist')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementCreator;