"use client";
import React, { useState, useEffect } from "react";
import { Trash2, Edit, XCircle, Mic, Upload, Clock, Calendar, PlusCircle } from "lucide-react";
import toast from "react-hot-toast";

// --- INTERFACES ---

// Represents a single announcement audio file
interface AnnouncementFile {
  _id: string;
  name: string;
  path: string;
  type: 'recorded' | 'generated';
  voice?: string;
}

// Represents an announcement item within a playlist's state
interface PlaylistAnnouncementItem {
  file: string; // This will hold the _id of the AnnouncementFile
  name: string; // For display purposes
  type: 'recorded' | 'generated'; // For display
  delay: number;
}

// Represents the structure of a playlist for display and fetching
interface AnnouncementPlaylist {
  _id: string;
  name: string;
  announcements: {
    file: AnnouncementFile | string; // Can be populated object or just ID
    displayOrder: number;
    delay: number;
  }[];
  schedule: {
    scheduleType: 'hourly' | 'timed';
    time?: string;
    frequency?: number;
    startDate?: string;
    endDate?: string;
    daysOfWeek?: string[];
    startTime?: string;
    endTime?: string;
  };
  status: 'active' | 'inactive' | 'scheduled';
  createdAt: string;
}

// Represents the state of the playlist being edited
interface EditablePlaylist {
  _id: string;
  name: string;
  status: 'active' | 'inactive' | 'scheduled';
  schedule: {
    scheduleType: 'hourly' | 'timed';
    frequency: number;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    daysOfWeek: string[];
  };
  announcements: PlaylistAnnouncementItem[];
}


const AnnouncementList: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [playlists, setPlaylists] = useState<AnnouncementPlaylist[]>([]);
  const [allAnnouncementFiles, setAllAnnouncementFiles] = useState<AnnouncementFile[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedPlaylist, setEditedPlaylist] = useState<EditablePlaylist | null>(null);
  const [availableFiles, setAvailableFiles] = useState<AnnouncementFile[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Load userId from localStorage and fetch initial data
  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      setUserId(storedUserId);
      fetchPlaylists(storedUserId);
      fetchAnnouncementFiles(storedUserId);
    } else {
      setIsLoading(false);
      toast.error("User not found. Please log in.");
    }
  }, []);

  // Update the list of available files whenever the edited playlist changes
  useEffect(() => {
    if (isEditing && editedPlaylist) {
      const playlistFileIds = new Set(editedPlaylist.announcements.map(a => a.file));
      const available = allAnnouncementFiles.filter(file => !playlistFileIds.has(file._id));
      setAvailableFiles(available);
    }
  }, [isEditing, editedPlaylist, allAnnouncementFiles]);

  const fetchPlaylists = async (currentUserId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/announcement/playlist?userId=${currentUserId}`);
      if (!response.ok) throw new Error("Failed to fetch playlists");
      const data = await response.json();
      setPlaylists(data.playlists || []);
    } catch (error) {
      console.error("Error fetching playlists:", error);
      toast.error("Failed to load playlists.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnnouncementFiles = async (currentUserId: string) => {
    try {
      const response = await fetch(`/api/announcement/list?userId=${currentUserId}`);
      if (!response.ok) throw new Error("Failed to fetch announcement files");
      const data = await response.json();
      setAllAnnouncementFiles(data.announcements || data.files || []);
    } catch (error) {
      console.error("Error fetching announcement files:", error);
      toast.error("Could not load available announcement files.");
    }
  };
  
  const handleSearch = (term: string) => {
     if (!userId) return;
     if (!term.trim()) {
      fetchPlaylists(userId); 
      return;
    }
    const filtered = playlists.filter(p => p.name.toLowerCase().includes(term.toLowerCase()));
    setPlaylists(filtered);
  }

  const initializeEditedPlaylist = (playlist: AnnouncementPlaylist) => {
    const populatedAnnouncements: PlaylistAnnouncementItem[] = playlist.announcements
      .map(item => {
        // Find the full file object from allAnnouncementFiles
        const fileDetails = allAnnouncementFiles.find(f => 
          typeof item.file === 'string' ? f._id === item.file : f._id === (item.file as AnnouncementFile)._id
        );
        if (!fileDetails) return null; // Or handle as an error
        return {
          file: fileDetails._id,
          name: fileDetails.name,
          type: fileDetails.type,
          delay: item.delay || 0,
        };
      })
      .filter((item): item is PlaylistAnnouncementItem => item !== null);

    setEditedPlaylist({
      _id: playlist._id,
      name: playlist.name,
      status: playlist.status,
      schedule: {
        scheduleType: playlist.schedule.scheduleType,
        frequency: playlist.schedule.frequency || 60,
        startDate: playlist.schedule.startDate || "",
        endDate: playlist.schedule.endDate || "",
        startTime: playlist.schedule.startTime || "00:00",
        endTime: playlist.schedule.endTime || "23:59",
        daysOfWeek: playlist.schedule.daysOfWeek || [],
      },
      announcements: populatedAnnouncements,
    });
    setIsEditing(true);
  };
  
  const handleAddFileToPlaylist = (file: AnnouncementFile) => {
      if (!editedPlaylist) return;

      const newItem: PlaylistAnnouncementItem = {
          file: file._id,
          name: file.name,
          type: file.type,
          delay: 2, // Default delay
      };

      setEditedPlaylist({
          ...editedPlaylist,
          announcements: [...editedPlaylist.announcements, newItem]
      });
  };

  const handleRemoveFileFromPlaylist = (fileId: string) => {
      if (!editedPlaylist) return;

      setEditedPlaylist({
          ...editedPlaylist,
          announcements: editedPlaylist.announcements.filter(a => a.file !== fileId)
      });
  };

  const handleUpdateDelay = (fileId: string, delay: number) => {
      if(!editedPlaylist) return;

      setEditedPlaylist({
          ...editedPlaylist,
          announcements: editedPlaylist.announcements.map(a => 
              a.file === fileId ? {...a, delay: delay} : a
          )
      });
  };


  const handleSaveChanges = async () => {
    if (!editedPlaylist || !userId) return;

    // Reconstruct the body to match the backend model
    const updateBody = {
        name: editedPlaylist.name,
        status: editedPlaylist.status,
        schedule: editedPlaylist.schedule,
        announcements: editedPlaylist.announcements.map((item, index) => ({
            file: item.file, // Send only the ID
            delay: item.delay,
            displayOrder: index + 1,
        })),
    };

    toast.loading("Saving changes...");
    try {
        const response = await fetch(`/api/announcement/playlist?id=${editedPlaylist._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateBody),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to update playlist");
        }
        
        toast.dismiss();
        toast.success("Playlist updated successfully!");
        await fetchPlaylists(userId);
        setIsEditing(false);
        setEditedPlaylist(null);

    } catch (error) {
        toast.dismiss();
        toast.error(error instanceof Error ? error.message : "An unknown error occurred.");
        console.error("Error saving playlist:", error);
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    if (!userId || !window.confirm("Are you sure you want to delete this playlist? This action cannot be undone.")) {
      return;
    }
    
    toast.loading("Deleting playlist...");
    try {
        const response = await fetch(`/api/announcement/playlist/${playlistId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
             const errorData = await response.json();
            throw new Error(errorData.error || "Failed to delete playlist");
        }
        
        toast.dismiss();
        toast.success("Playlist deleted.");
        fetchPlaylists(userId);
        if(selectedPlaylistId === playlistId) {
            setSelectedPlaylistId(null);
        }

    } catch(error) {
        toast.dismiss();
        toast.error(error instanceof Error ? error.message : "Failed to delete playlist.");
        console.error("Error deleting playlist:", error);
    }
  }

  const daysOfWeekOptions = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
  const renderFileIcon = (type: 'recorded' | 'generated') => {
      return type === 'recorded' 
        ? <Mic className="h-4 w-4 text-red-500" /> 
        : <Upload className="h-4 w-4 text-blue-500" />;
  }

  // --- RENDER LOGIC ---

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isEditing && editedPlaylist) {
    // --- EDITING VIEW ---
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 text-black space-y-6">
        <h2 className="text-2xl font-bold border-b pb-4">Edit "{editedPlaylist.name}"</h2>
        
        {/* Basic Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="block text-sm font-medium mb-1">Playlist Name</label>
                <input type="text" value={editedPlaylist.name} onChange={e => setEditedPlaylist({...editedPlaylist, name: e.target.value})} className="w-full p-2 border rounded-lg"/>
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select value={editedPlaylist.status} onChange={e => setEditedPlaylist({...editedPlaylist, status: e.target.value as 'active' | 'inactive'})} className="w-full p-2 border rounded-lg bg-white">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="scheduled">Scheduled</option>
                </select>
            </div>
        </div>

        {/* Schedule Configuration */}
        <div className="border rounded-lg p-4 space-y-4">
             <h3 className="font-semibold flex items-center gap-2"><Clock size={18}/> Schedule Details</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => setEditedPlaylist({...editedPlaylist, schedule: {...editedPlaylist.schedule, scheduleType: 'hourly'}})}
                  className={`p-3 border rounded-lg cursor-pointer ${editedPlaylist.schedule.scheduleType === 'hourly' ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-400'}`}
                >
                    <div className="flex items-center gap-2 font-medium"><Clock size={16}/> Frequency Based</div>
                    <p className="text-xs text-gray-600">Plays at regular intervals.</p>
                </div>
                 <div
                  onClick={() => setEditedPlaylist({...editedPlaylist, schedule: {...editedPlaylist.schedule, scheduleType: 'timed'}})}
                  className={`p-3 border rounded-lg cursor-pointer ${editedPlaylist.schedule.scheduleType === 'timed' ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-400'}`}
                >
                    <div className="flex items-center gap-2 font-medium"><Calendar size={16}/> Timed</div>
                    <p className="text-xs text-gray-600">Plays at a specific time of day.</p>
                </div>
             </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                 {editedPlaylist.schedule.scheduleType === 'hourly' && (
                    <div>
                        <label className="block text-sm font-medium mb-1">Frequency (min)</label>
                        <input type="number" min="1" value={editedPlaylist.schedule.frequency} onChange={e => setEditedPlaylist({...editedPlaylist, schedule: {...editedPlaylist.schedule, frequency: parseInt(e.target.value)}})} className="w-full p-2 border rounded-lg"/>
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium mb-1">Start Date</label>
                    <input type="date" value={editedPlaylist.schedule.startDate} onChange={e => setEditedPlaylist({...editedPlaylist, schedule: {...editedPlaylist.schedule, startDate: e.target.value}})} className="w-full p-2 border rounded-lg"/>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">End Date</label>
                    <input type="date" value={editedPlaylist.schedule.endDate} onChange={e => setEditedPlaylist({...editedPlaylist, schedule: {...editedPlaylist.schedule, endDate: e.target.value}})} className="w-full p-2 border rounded-lg"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium mb-1">Start Time</label>
                    <input type="time" value={editedPlaylist.schedule.startTime} onChange={e => setEditedPlaylist({...editedPlaylist, schedule: {...editedPlaylist.schedule, startTime: e.target.value}})} className="w-full p-2 border rounded-lg"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium mb-1">End Time</label>
                    <input type="time" value={editedPlaylist.schedule.endTime} onChange={e => setEditedPlaylist({...editedPlaylist, schedule: {...editedPlaylist.schedule, endTime: e.target.value}})} className="w-full p-2 border rounded-lg"/>
                </div>
            </div>
             <div>
                <label className="block text-sm font-medium mb-2">Days of Week</label>
                <div className="flex flex-wrap gap-2">
                    {daysOfWeekOptions.map(day => (
                        <label key={day} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer text-sm ${editedPlaylist.schedule.daysOfWeek.includes(day) ? 'bg-blue-500 text-white border-blue-500' : 'bg-gray-100'}`}>
                            <input type="checkbox" className="sr-only" checked={editedPlaylist.schedule.daysOfWeek.includes(day)} onChange={e => {
                                const updatedDays = e.target.checked
                                    ? [...editedPlaylist.schedule.daysOfWeek, day]
                                    : editedPlaylist.schedule.daysOfWeek.filter(d => d !== day);
                                setEditedPlaylist({...editedPlaylist, schedule: {...editedPlaylist.schedule, daysOfWeek: updatedDays}})
                            }}/>
                            {day.substring(0,3)}
                        </label>
                    ))}
                </div>
            </div>
        </div>

        {/* File Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Available Files */}
            <div>
                <h3 className="font-semibold mb-2">Available Files</h3>
                <div className="border rounded-lg p-2 h-64 overflow-y-auto space-y-2">
                    {availableFiles.length > 0 ? availableFiles.map(file => (
                        <div key={file._id} className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded">
                           {renderFileIcon(file.type)}
                            <span className="flex-1 text-sm font-medium truncate">{file.name}</span>
                            <button onClick={() => handleAddFileToPlaylist(file)} className="text-blue-600 hover:text-blue-800"><PlusCircle size={18}/></button>
                        </div>
                    )) : <p className="text-sm text-gray-500 text-center p-4">No other files available.</p>}
                </div>
            </div>
            {/* Selected Files */}
             <div>
                <h3 className="font-semibold mb-2">Selected Files ({editedPlaylist.announcements.length})</h3>
                <div className="border rounded-lg p-2 h-64 overflow-y-auto space-y-2">
                     {editedPlaylist.announcements.length > 0 ? editedPlaylist.announcements.map((item, index) => (
                        <div key={item.file} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                           <span className="text-sm font-bold text-gray-400">{index + 1}</span>
                           {renderFileIcon(item.type)}
                            <span className="flex-1 text-sm font-medium truncate">{item.name}</span>
                            <div className="flex items-center gap-1">
                                <label className="text-xs">Delay:</label>
                                <input type="number" min="0" value={item.delay} onChange={e => handleUpdateDelay(item.file, parseInt(e.target.value))} className="w-14 p-1 border rounded text-sm"/>
                            </div>
                            <button onClick={() => handleRemoveFileFromPlaylist(item.file)} className="text-red-500 hover:text-red-700"><XCircle size={18}/></button>
                        </div>
                    )) : <p className="text-sm text-gray-500 text-center p-4">Select files from the left.</p>}
                </div>
            </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pt-6 border-t">
          <button onClick={() => setIsEditing(false)} className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancel</button>
          <button onClick={handleSaveChanges} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
        </div>
      </div>
    )
  }

  // --- LIST VIEW ---
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 text-black">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Announcement Playlists</h2>
        <input
            type="text"
            placeholder="Search playlists..."
            className="px-3 py-2 border rounded-lg text-sm"
            onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {playlists.length > 0 ? (
        <div className="space-y-4">
          {playlists.map(playlist => (
            <div key={playlist._id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                  <div className="cursor-pointer flex-1" onClick={() => setSelectedPlaylistId(selectedPlaylistId === playlist._id ? null : playlist._id)}>
                    <h3 className="text-lg font-semibold text-gray-800">{playlist.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span><strong className="font-medium">Files:</strong> {playlist.announcements.length}</span>
                        <span><strong className="font-medium">Status:</strong> <span className={`capitalize px-2 py-0.5 rounded-full text-xs ${playlist.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{playlist.status}</span></span>
                        <span><strong className="font-medium">Schedule:</strong> <span className="capitalize">{playlist.schedule.scheduleType}</span></span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => initializeEditedPlaylist(playlist)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={18}/></button>
                     <button onClick={() => handleDeletePlaylist(playlist._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button>
                  </div>
              </div>

              {selectedPlaylistId === playlist._id && (
                  <div className="mt-4 border-t pt-4">
                      <h4 className="font-semibold text-gray-700 mb-2">Details</h4>
                       <div className="text-sm space-y-1">
                          <p><strong>Days:</strong> {playlist.schedule.daysOfWeek?.join(', ') || 'Every Day'}</p>
                           <p><strong>Time Window:</strong> {playlist.schedule.startTime} - {playlist.schedule.endTime}</p>
                           <p><strong>Date Range:</strong> {playlist.schedule.startDate} - {playlist.schedule.endDate}</p>
                           {playlist.schedule.scheduleType === 'hourly' && <p><strong>Frequency:</strong> Every {playlist.schedule.frequency} minutes</p>}
                       </div>
                  </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-gray-500">
          <p className="font-semibold">No Playlists Found</p>
          <p className="text-sm mt-1">Create a new announcement playlist to get started.</p>
        </div>
      )}
    </div>
  );
};

export default AnnouncementList;