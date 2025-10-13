// "use client";
// import React, { useState, useEffect } from "react";
// import { Trash2, Edit, XCircle, Mic, Upload, Clock, Calendar, PlusCircle, Volume2 } from "lucide-react";
// import toast from "react-hot-toast";

// // --- INTERFACES ---

// interface AnnouncementFile {
//   _id: string;
//   name: string;
//   path: string;
//   type: 'recorded' | 'generated';
//   voice?: string;
// }

// interface PlaylistAnnouncementItem {
//   file: string; 
//   name: string;
//   type: 'recorded' | 'generated';
//   delay: number;
//   maxVolume: number;
// }

// interface AnnouncementPlaylist {
//   _id: string;
//   name: string;
//   announcements: {
//     file: AnnouncementFile | string;
//     displayOrder: number;
//     delay: number;
//     maxVolume?: number;
//   }[];
//   schedule: {
//     scheduleType: 'hourly' | 'timed';
//     time?: string;
//     frequency?: number;
//     startDate?: string;
//     endDate?: string;
//     daysOfWeek?: string[];
//     startTime?: string;
//     endTime?: string;
//   };
//   status: 'active' | 'inactive' | 'scheduled';
//   createdAt: string;
// }

// interface EditablePlaylist {
//   _id: string;
//   name: string;
//   status: 'active' | 'inactive' | 'scheduled';
//   schedule: {
//     scheduleType: 'hourly' | 'timed';
//     frequency: number;
//     startDate: string;
//     endDate: string;
//     startTime: string;
//     endTime: string;
//     daysOfWeek: string[];
//   };
//   announcements: PlaylistAnnouncementItem[];
// }

// const AnnouncementList: React.FC = () => {
//   const [isLoading, setIsLoading] = useState<boolean>(true);
//   const [playlists, setPlaylists] = useState<AnnouncementPlaylist[]>([]);
//   const [allAnnouncementFiles, setAllAnnouncementFiles] = useState<AnnouncementFile[]>([]);
//   const [isEditing, setIsEditing] = useState<boolean>(false);
//   const [editedPlaylist, setEditedPlaylist] = useState<EditablePlaylist | null>(null);
//   const [availableFiles, setAvailableFiles] = useState<AnnouncementFile[]>([]);
//   const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
//   const [userId, setUserId] = useState<string | null>(null);

//   useEffect(() => {
//     const storedUserId = localStorage.getItem("userId");
//     if (storedUserId) {
//       setUserId(storedUserId);
//       fetchPlaylists(storedUserId);
//       fetchAnnouncementFiles(storedUserId);
//     } else {
//       setIsLoading(false);
//       toast.error("User not found. Please log in.");
//     }
//   }, []);

//   useEffect(() => {
//     if (isEditing && editedPlaylist) {
//       const playlistFileIds = new Set(editedPlaylist.announcements.map(a => a.file));
//       const available = allAnnouncementFiles.filter(file => !playlistFileIds.has(file._id));
//       setAvailableFiles(available);
//     }
//   }, [isEditing, editedPlaylist, allAnnouncementFiles]);

//   const fetchPlaylists = async (currentUserId: string) => {
//     setIsLoading(true);
//     try {
//       const response = await fetch(`/api/announcement/playlist?userId=${currentUserId}`);
//       if (!response.ok) throw new Error("Failed to fetch playlists");
//       const data = await response.json();
      
//       const playlistsData = Array.isArray(data) ? data : data.playlists;
//       setPlaylists(Array.isArray(playlistsData) ? playlistsData : []);

//     } catch (error) {
//       console.error("Error fetching playlists:", error);
//       toast.error("Failed to load playlists.");
//       setPlaylists([]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const fetchAnnouncementFiles = async (currentUserId: string) => {
//     try {
//       const response = await fetch(`/api/announcement/list?userId=${currentUserId}`);
//       if (!response.ok) throw new Error("Failed to fetch announcement files");
//       const data = await response.json();
//       const filesData = Array.isArray(data) ? data : data.announcements || data.files;
//       setAllAnnouncementFiles(Array.isArray(filesData) ? filesData : []);
//     } catch (error) {
//       console.error("Error fetching announcement files:", error);
//       toast.error("Could not load available announcement files.");
//     }
//   };
  
//   const handleSearch = (term: string) => {
//      if (!userId) return;
//      if (!term.trim()) {
//       fetchPlaylists(userId); 
//       return;
//     }
//     const filtered = playlists.filter(p => p.name.toLowerCase().includes(term.toLowerCase()));
//     setPlaylists(filtered);
//   }

//   const initializeEditedPlaylist = (playlist: AnnouncementPlaylist) => {
//     const populatedAnnouncements: PlaylistAnnouncementItem[] = playlist.announcements
//       .map(item => {
//         const fileDetails = allAnnouncementFiles.find(f => 
//           typeof item.file === 'string' ? f._id === item.file : f._id === (item.file as AnnouncementFile)._id
//         );
//         if (!fileDetails) return null;
//         return {
//           file: fileDetails._id,
//           name: fileDetails.name,
//           type: fileDetails.type,
//           delay: item.delay || 0,
//           maxVolume: item.maxVolume ?? 100,
//         };
//       })
//       .filter((item): item is PlaylistAnnouncementItem => item !== null);

//     setEditedPlaylist({
//       _id: playlist._id,
//       name: playlist.name,
//       status: playlist.status,
//       schedule: {
//         scheduleType: playlist.schedule.scheduleType,
//         frequency: playlist.schedule.frequency || 60,
//         startDate: playlist.schedule.startDate?.split('T')[0] || "",
//         endDate: playlist.schedule.endDate?.split('T')[0] || "",
//         startTime: playlist.schedule.startTime || "00:00",
//         endTime: playlist.schedule.endTime || "23:59",
//         daysOfWeek: playlist.schedule.daysOfWeek || [],
//       },
//       announcements: populatedAnnouncements,
//     });
//     setIsEditing(true);
//   };
  
//   const handleAddFileToPlaylist = (file: AnnouncementFile) => {
//       if (!editedPlaylist) return;
//       const newItem: PlaylistAnnouncementItem = {
//           file: file._id,
//           name: file.name,
//           type: file.type,
//           delay: 2,
//           maxVolume: 100,
//       };
//       setEditedPlaylist({
//           ...editedPlaylist,
//           announcements: [...editedPlaylist.announcements, newItem]
//       });
//   };

//   const handleRemoveFileFromPlaylist = (fileId: string) => {
//       if (!editedPlaylist) return;
//       setEditedPlaylist({
//           ...editedPlaylist,
//           announcements: editedPlaylist.announcements.filter(a => a.file !== fileId)
//       });
//   };

//   const handleUpdateAnnouncementItem = (fileId: string, updatedProps: Partial<PlaylistAnnouncementItem>) => {
//     if(!editedPlaylist) return;
//     setEditedPlaylist(prev => ({
//         ...prev!,
//         announcements: prev!.announcements.map(a => 
//             a.file === fileId ? {...a, ...updatedProps} : a
//         )
//     }));
//   };

//   const handleScheduleChange = (updatedProps: Partial<EditablePlaylist['schedule']>) => {
//     if (!editedPlaylist) return;
//     setEditedPlaylist(prev => ({
//       ...prev!,
//       schedule: {
//         ...prev!.schedule,
//         ...updatedProps,
//       },
//     }));
//   };

//   const handleSaveChanges = async () => {
//     if (!editedPlaylist || !userId) return;
//     const updateBody = {
//         _id: editedPlaylist._id,
//         name: editedPlaylist.name,
//         status: editedPlaylist.status,
//         schedule: editedPlaylist.schedule,
//         announcements: editedPlaylist.announcements.map((item, index) => ({
//             file: item.file,
//             delay: item.delay,
//             maxVolume: item.maxVolume,
//             displayOrder: index + 1,
//         })),
//     };

//     toast.loading("Saving changes...");
//     try {
//         const response = await fetch(`/api/announcement/playlist/id?id=${editedPlaylist._id}&userId=${userId}`, {
//             method: 'PUT',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify(updateBody),
//         });

//         if (!response.ok) {
//             const errorData = await response.json();
//             throw new Error(errorData.error || "Failed to update playlist");
//         }
        
//         toast.dismiss();
//         toast.success("Playlist updated successfully!");
//         await fetchPlaylists(userId);
//         setIsEditing(false);
//         setEditedPlaylist(null);

//     } catch (error) {
//         toast.dismiss();
//         toast.error(error instanceof Error ? error.message : "An unknown error occurred.");
//     }
//   };

//   const handleDeletePlaylist = async (playlistId: string) => {
//     if (!userId || !window.confirm("Are you sure you want to delete this playlist? This action cannot be undone.")) return;
    
//     toast.loading("Deleting playlist...");
//     try {
//         const response = await fetch(`/api/announcement/playlist/id?id=${playlistId}`, { method: 'DELETE' });
//         if (!response.ok) {
//             const errorData = await response.json();
//             throw new Error(errorData.error || "Failed to delete playlist");
//         }
//         toast.dismiss();
//         toast.success("Playlist deleted.");
//         fetchPlaylists(userId);
//         if(selectedPlaylistId === playlistId) setSelectedPlaylistId(null);
//     } catch(error) {
//         toast.dismiss();
//         toast.error(error instanceof Error ? error.message : "Failed to delete playlist.");
//     }
//   }

//   const daysOfWeekOptions = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  
//   const renderFileIcon = (type: 'recorded' | 'generated') => {
//       return type === 'recorded' 
//         ? <Mic className="h-4 w-4 text-red-500" /> 
//         : <Upload className="h-4 w-4 text-blue-500" />;
//   }

//   if (isLoading) {
//     return (
//       <div className="flex justify-center items-center p-10"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
//     );
//   }

//   if (isEditing && editedPlaylist) {
//     return (
//       <div className="bg-white rounded-xl shadow-sm p-6 text-black space-y-6">
//         <h2 className="text-2xl font-bold border-b pb-4">Edit "{editedPlaylist.name}"</h2>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//             <div><label className="block text-sm font-medium mb-1">Playlist Name</label><input type="text" value={editedPlaylist.name} onChange={e => setEditedPlaylist({...editedPlaylist, name: e.target.value})} className="w-full p-2 border rounded-lg"/></div>
//             <div><label className="block text-sm font-medium mb-1">Status</label><select value={editedPlaylist.status} onChange={e => setEditedPlaylist({...editedPlaylist, status: e.target.value as any})} className="w-full p-2 border rounded-lg bg-white"><option value="active">Active</option><option value="inactive">Inactive</option><option value="scheduled">Scheduled</option></select></div>
//         </div>
//         <div className="border rounded-lg p-4 space-y-4">
//             <h3 className="font-semibold flex items-center gap-2"><Clock size={18}/> Schedule Details</h3>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div onClick={() => handleScheduleChange({ scheduleType: 'hourly' })} className={`p-3 border rounded-lg cursor-pointer ${editedPlaylist.schedule.scheduleType === 'hourly' ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-400'}`}><div className="flex items-center gap-2 font-medium"><Clock size={16}/> Frequency Based</div><p className="text-xs text-gray-600">Plays at regular intervals.</p></div>
//                 <div onClick={() => handleScheduleChange({ scheduleType: 'timed' })} className={`p-3 border rounded-lg cursor-pointer ${editedPlaylist.schedule.scheduleType === 'timed' ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-400'}`}><div className="flex items-center gap-2 font-medium"><Calendar size={16}/> Timed</div><p className="text-xs text-gray-600">Plays at a specific time of day.</p></div>
//             </div>
//             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
//                 {editedPlaylist.schedule.scheduleType === 'hourly' && (<div><label className="block text-sm font-medium mb-1">Frequency (min)</label><input type="number" min="1" value={editedPlaylist.schedule.frequency} onChange={e => handleScheduleChange({ frequency: parseInt(e.target.value) || 1 })} className="w-full p-2 border rounded-lg"/></div>)}
//                 <div><label className="block text-sm font-medium mb-1">Start Date</label><input type="date" value={editedPlaylist.schedule.startDate} onChange={e => handleScheduleChange({ startDate: e.target.value })} className="w-full p-2 border rounded-lg"/></div>
//                 <div><label className="block text-sm font-medium mb-1">End Date</label><input type="date" value={editedPlaylist.schedule.endDate} onChange={e => handleScheduleChange({ endDate: e.target.value })} className="w-full p-2 border rounded-lg"/></div>
//                 <div><label className="block text-sm font-medium mb-1">Start Time</label><input type="time" value={editedPlaylist.schedule.startTime} onChange={e => handleScheduleChange({ startTime: e.target.value })} className="w-full p-2 border rounded-lg"/></div>
//                 <div><label className="block text-sm font-medium mb-1">End Time</label><input type="time" value={editedPlaylist.schedule.endTime} onChange={e => handleScheduleChange({ endTime: e.target.value })} className="w-full p-2 border rounded-lg"/></div>
//             </div>
//             <div>
//                 <label className="block text-sm font-medium mb-2">Days of Week</label>
//                 <div className="flex flex-wrap gap-2">{daysOfWeekOptions.map(day => (<label key={day} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer text-sm ${editedPlaylist.schedule.daysOfWeek.includes(day) ? 'bg-blue-500 text-white border-blue-500' : 'bg-gray-100'}`}><input type="checkbox" className="sr-only" checked={editedPlaylist.schedule.daysOfWeek.includes(day)} onChange={e => { const updatedDays = e.target.checked ? [...editedPlaylist.schedule.daysOfWeek, day] : editedPlaylist.schedule.daysOfWeek.filter(d => d !== day); handleScheduleChange({ daysOfWeek: updatedDays }); }}/>{day.substring(0,3)}</label>))}</div>
//             </div>
//         </div>
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//             <div>
//                 <h3 className="font-semibold mb-2">Available Files</h3>
//                 <div className="border rounded-lg p-2 h-72 overflow-y-auto space-y-2">{availableFiles.length > 0 ? availableFiles.map(file => (<div key={file._id} className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded">{renderFileIcon(file.type)}<span className="flex-1 text-sm font-medium truncate">{file.name}</span><button onClick={() => handleAddFileToPlaylist(file)} className="text-blue-600 hover:text-blue-800"><PlusCircle size={18}/></button></div>)) : <p className="text-sm text-gray-500 text-center p-4">No other files available.</p>}</div>
//             </div>
//             <div>
//                 <h3 className="font-semibold mb-2">Selected Files ({editedPlaylist.announcements.length})</h3>
//                 <div className="border rounded-lg p-2 h-72 overflow-y-auto space-y-2">
//                     {editedPlaylist.announcements.length > 0 ? editedPlaylist.announcements.map((item, index) => (
//                         <div key={item.file} className="p-2 bg-gray-50 rounded border">
//                             <div className="flex items-center gap-3">
//                                <span className="text-sm font-bold text-gray-400">{index + 1}</span>
//                                {renderFileIcon(item.type)}
//                                 <span className="flex-1 text-sm font-medium truncate">{item.name}</span>
//                                 <button onClick={() => handleRemoveFileFromPlaylist(item.file)} className="text-red-500 hover:text-red-700"><XCircle size={18}/></button>
//                             </div>
//                             <div className="pl-6 pt-2 mt-2 border-t space-y-3">
//                                 <div className="flex items-center gap-2">
//                                     <label className="text-xs font-medium w-12">Delay:</label>
//                                     <input type="number" min="0" value={item.delay} onChange={e => handleUpdateAnnouncementItem(item.file, { delay: parseInt(e.target.value) || 0 })} className="w-16 p-1 border rounded text-sm"/>
//                                     <span className="text-xs text-gray-500">(s)</span>
//                                 </div>
//                                 <div className="flex items-center gap-2">
//                                     <label className="text-xs font-medium flex items-center gap-1 w-12"><Volume2 size={14}/> Vol:</label>
//                                     <input type="range" min="0" max="100" value={item.maxVolume} onChange={e => handleUpdateAnnouncementItem(item.file, { maxVolume: parseInt(e.target.value) })} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
//                                     <span className="text-xs font-mono text-gray-600 w-10 text-right">{item.maxVolume}%</span>
//                                 </div>
//                             </div>
//                         </div>
//                     )) : <p className="text-sm text-gray-500 text-center p-4">Select files from the left.</p>}
//                 </div>
//             </div>
//         </div>
//         <div className="flex justify-end gap-4 pt-6 border-t"><button onClick={() => setIsEditing(false)} className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancel</button><button onClick={handleSaveChanges} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button></div>
//       </div>
//     )
//   }

//   return (
//     <div className="bg-white rounded-xl shadow-sm p-6 text-black">
//       <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold">Announcement Playlists</h2><input type="text" placeholder="Search playlists..." className="px-3 py-2 border rounded-lg text-sm" onChange={(e) => handleSearch(e.target.value)}/></div>
//       {playlists.length > 0 ? (
//         <div className="space-y-4">{playlists.map(playlist => (<div key={playlist._id} className="border rounded-lg p-4"><div className="flex justify-between items-start"><div className="cursor-pointer flex-1" onClick={() => setSelectedPlaylistId(selectedPlaylistId === playlist._id ? null : playlist._id)}><h3 className="text-lg font-semibold text-gray-800">{playlist.name}</h3><div className="flex items-center gap-4 text-sm text-gray-600 mt-1"><span><strong className="font-medium">Files:</strong> {playlist.announcements.length}</span><span><strong className="font-medium">Status:</strong> <span className={`capitalize px-2 py-0.5 rounded-full text-xs ${playlist.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{playlist.status}</span></span><span><strong className="font-medium">Schedule:</strong> <span className="capitalize">{playlist.schedule.scheduleType}</span></span></div></div><div className="flex gap-2"><button onClick={() => initializeEditedPlaylist(playlist)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit size={18}/></button><button onClick={() => handleDeletePlaylist(playlist._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={18}/></button></div></div>{selectedPlaylistId === playlist._id && (<div className="mt-4 border-t pt-4"><h4 className="font-semibold text-gray-700 mb-2">Details</h4><div className="text-sm space-y-1"><p><strong>Days:</strong> {playlist.schedule.daysOfWeek?.join(', ') || 'Every Day'}</p><p><strong>Time Window:</strong> {playlist.schedule.startTime} - {playlist.schedule.endTime}</p><p><strong>Date Range:</strong> {playlist.schedule.startDate ? new Date(playlist.schedule.startDate).toLocaleDateString() : 'N/A'} - {playlist.schedule.endDate ? new Date(playlist.schedule.endDate).toLocaleDateString() : 'N/A'}</p>{playlist.schedule.scheduleType === 'hourly' && <p><strong>Frequency:</strong> Every {playlist.schedule.frequency} minutes</p>}</div></div>)}</div>))}</div>
//       ) : (<div className="text-center py-10 text-gray-500"><p className="font-semibold">No Playlists Found</p><p className="text-sm mt-1">Create a new announcement playlist to get started.</p></div>)}
//     </div>
//   );
// };



// export default AnnouncementList;



//new code 


"use client";
import React, { useState, useEffect } from "react";
import { Trash2, Edit, XCircle, Mic, Upload, Clock, Calendar, PlusCircle } from "lucide-react";
import toast from "react-hot-toast";
import { MdQueueMusic } from "react-icons/md";
import { RiArrowDropDownLine } from "react-icons/ri";
import { FaListUl } from "react-icons/fa6";
import { BsFillGridFill } from "react-icons/bs";

// --- INTERFACES ---
interface AnnouncementFile {
  _id: string;
  name: string;
  path: string;
  type: 'recorded' | 'generated';
  voice?: string;
}

interface PlaylistAnnouncementItem {
  file: string;
  name: string;
  type: 'recorded' | 'generated';
  delay: number;
}

interface AnnouncementPlaylist {
  _id: string;
  name: string;
  announcements: {
    file: AnnouncementFile | string;
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

const daysOfWeekOptions = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const AnnouncementList: React.FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [playlists, setPlaylists] = useState<AnnouncementPlaylist[]>([]);
  const [allAnnouncementFiles, setAllAnnouncementFiles] = useState<AnnouncementFile[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedPlaylist, setEditedPlaylist] = useState<EditablePlaylist | null>(null);
  const [availableFiles, setAvailableFiles] = useState<AnnouncementFile[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // --- View Mode ---
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list'); // only list & grid

  // Filtered playlists by status and search
  const filteredPlaylists = playlists
    .filter(p => {
      if (statusFilter === "all") return true;
      return p.status === statusFilter;
    })
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // --- Fetch Data ---
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
    setSearchTerm(term);
  };

  // --- Editing Playlist ---
  const initializeEditedPlaylist = (playlist: AnnouncementPlaylist) => {
    const populatedAnnouncements: PlaylistAnnouncementItem[] = playlist.announcements
      .map(item => {
        const fileDetails = allAnnouncementFiles.find(f =>
          typeof item.file === 'string' ? f._id === item.file : f._id === (item.file as AnnouncementFile)._id
        );
        if (!fileDetails) return null;
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
      delay: 2,
    };
    setEditedPlaylist({
      ...editedPlaylist,
      announcements: [...editedPlaylist.announcements, newItem],
    });
  };

  const handleRemoveFileFromPlaylist = (fileId: string) => {
    if (!editedPlaylist) return;
    setEditedPlaylist({
      ...editedPlaylist,
      announcements: editedPlaylist.announcements.filter(a => a.file !== fileId),
    });
  };

  const handleUpdateDelay = (fileId: string, delay: number) => {
    if (!editedPlaylist) return;
    setEditedPlaylist({
      ...editedPlaylist,
      announcements: editedPlaylist.announcements.map(a =>
        a.file === fileId ? { ...a, delay: delay } : a
      ),
    });
  };

  const handleSaveChanges = async () => {
    if (!editedPlaylist || !userId) return;
    const updateBody = {
      name: editedPlaylist.name,
      status: editedPlaylist.status,
      schedule: editedPlaylist.schedule,
      announcements: editedPlaylist.announcements.map((item, index) => ({
        file: item.file,
        delay: item.delay,
        displayOrder: index + 1,
      })),
    };

    toast.loading("Saving changes...");
    try {
      const response = await fetch(`/api/announcement/playlist/id?id=${editedPlaylist._id}`, {
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
    if (!userId || !window.confirm("Are you sure you want to delete this playlist? This action cannot be undone.")) return;

    toast.loading("Deleting playlist...");
    try {
      const response = await fetch(`/api/announcement/playlist/id?id=${playlistId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete playlist");
      }
      toast.dismiss();
      toast.success("Playlist deleted.");
      fetchPlaylists(userId);
    } catch (error) {
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : "Failed to delete playlist.");
    }
  };

  const renderFileIcon = (type: 'recorded' | 'generated') => {
    return type === 'recorded'
      ? <Mic className="h-4 w-4 text-red-500" />
      : <Upload className="h-4 w-4 text-blue-500" />;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isEditing && editedPlaylist) {
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
    );
  }

  return (
  //   <div className="bg-white rounded-xl shadow-sm p-6 text-black">
  //     <div className="flex justify-between items-center mb-6">
  //       <h2 className="text-2xl font-bold">Announcement Playlists</h2>
  //       <div className="flex items-center gap-2">
  //         <input
  //           type="text"
  //           placeholder="Search playlist"
  //           value={searchTerm}
  //           onChange={(e) => handleSearch(e.target.value)}
  //           className="pl-10 pr-4 py-2 rounded-[9px] focus:outline-none shadow-[2px_4px_10px_0px_rgba(0,0,0,0.12)]"
  //         />
  //         <div className="relative inline-block">
  //           <select
  //             className="px-3 py-2 pr-8 rounded-lg shadow-md focus:outline-none appearance-none"
  //             value={statusFilter}
  //             onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
  //             style={{ boxShadow: "2px 4px 10px 0px rgba(0,0,0,0.12)" }}
  //           >
  //             <option value="all">All</option>
  //             <option value="active">Active</option>
  //             <option value="inactive">Inactive</option>
  //           </select>
  //           <RiArrowDropDownLine className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6" color="#FF4500" />
  //         </div>

  //         <div className="flex gap-2 ml-2">
  //           <button
  //             onClick={() => setViewMode('list')}
  //             className={`p-2 rounded-lg shadow-md hover:shadow-lg hover:bg-gray-100 ${
  //   viewMode === "list" ? "bg-gray-200" : ""
  // }`}
  //           >
  //            <FaListUl className="w-5 h-5" color="#FF4500" />
  //           </button>
  //           <button
  //             onClick={() => setViewMode('grid')}
  //             className={`p-2 rounded-lg shadow-md hover:shadow-lg hover:bg-gray-100 ${
  //   viewMode === "grid" ? "bg-gray-200" : ""
  // }`}>
  //               <BsFillGridFill className="w-5 h-5" color="#FF4500" />
              
  //           </button>
  //         </div>
  //       </div>
  //     </div>

  //     {/* --- LIST / TABLE VIEW --- */}
  //     {viewMode === 'list' && filteredPlaylists.length > 0 && (
  //       <table className="min-w-full border-separate border-spacing-y-2 text-sm">
  //         <thead>
  //           <tr className="text-left text-gray-600">
  //             <th className="px-4 py-2">Playlist Name</th>
  //             <th className="px-4 py-2">Status</th>
  //             <th className="px-4 py-2">Tracks</th>
  //             <th className="px-4 py-2">Schedule</th>
  //             <th className="px-4 py-2">Date Created</th>
  //             <th className="px-4 py-2">Actions</th>
  //           </tr>
  //         </thead>
  //         <tbody>
  //           {filteredPlaylists.map(playlist => (
  //             <tr key={playlist._id} className="bg-blue-50 hover:bg-blue-100 rounded-xl transition">
  //               <td className="px-4 py-3 font-medium flex items-center gap-2">
  //                 <span className="flex items-center justify-center rounded-[10px]" style={{ backgroundColor: "#07323C", width: "40px", height: "40px" }}>
  //                   <MdQueueMusic size={20} color="#FFFFFF" />
  //                 </span>
  //                 {playlist.name}
  //               </td>
  //               <td className="px-4 py-3">
  //                 <span className={`px-2 py-1 text-xs rounded ${playlist.status === "active" ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-600"}`}>
  //                   {playlist.status}
  //                 </span>
  //               </td>
  //               <td className="px-4 py-3">{playlist.announcements.length || 0}</td>
  //               <td className="px-4 py-2">{playlist.schedule.scheduleType}</td>
  //               <td className="px-4 py-2">{new Date(playlist.createdAt).toLocaleDateString()}</td>
  //               <td className="px-4 py-2 flex gap-2">
  //                 <button onClick={() => initializeEditedPlaylist(playlist)} className="p-2 rounded-lg shadow-md hover:shadow-lg transition-colors">
  //                   <Edit size={18} color="#FF4500" />
  //                 </button>
  //                 <button onClick={() => handleDeletePlaylist(playlist._id)} className="p-2 rounded-lg shadow-md hover:shadow-lg transition-colors">
  //                   <Trash2 size={16} color="#FF4500" />
  //                 </button>
  //               </td>
  //             </tr>
  //           ))}
  //         </tbody>
  //       </table>
  //     )}

  //     {/* --- GRID VIEW --- */}
  //     {viewMode === 'grid' && filteredPlaylists.length > 0 && (
  //       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  //         {filteredPlaylists.map(playlist => (
  //           <div key={playlist._id} className="border rounded-lg p-4 shadow-sm hover:shadow-md transition">
  //             <h3 className="font-semibold text-lg">{playlist.name}</h3>
  //             <p><strong>Status:</strong> {playlist.status}</p>
  //             <p><strong>Tracks:</strong> {playlist.announcements.length}</p>
  //             <p><strong>Schedule:</strong> {playlist.schedule.scheduleType}</p>
  //             <div className="flex gap-2 mt-2">
  //               <button onClick={() => initializeEditedPlaylist(playlist)} className="text-blue-600 hover:text-blue-800"><Edit size={18} /></button>
  //               <button onClick={() => handleDeletePlaylist(playlist._id)} className="text-red-600 hover:text-red-800"><Trash2 size={18} /></button>
  //             </div>
  //           </div>
  //         ))}
  //       </div>
  //     )}

  //     {/* --- No Playlists --- */}
  //     {filteredPlaylists.length === 0 && (
  //       <div className="text-center py-10 text-gray-500">
  //         <p className="font-semibold">No Playlists Found</p>
  //         <p className="text-sm mt-1">Create a new announcement playlist to get started.</p>
  //       </div>
  //     )}
  //   </div>
  <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 text-black">
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 md:gap-0">
    <h2 className="text-2xl font-bold">Announcement Playlists</h2>

    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
      {/* Search Input */}
      <input
        type="text"
        placeholder="Search playlist"
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
        className="pl-10 pr-4 py-2 rounded-[9px] focus:outline-none shadow-[2px_4px_10px_0px_rgba(0,0,0,0.12)] w-full sm:w-auto"
      />

      {/* Status Filter */}
      <div className="relative inline-block w-full sm:w-auto">
        <select
          className="px-3 py-2 pr-8 rounded-lg shadow-md focus:outline-none appearance-none w-full sm:w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
          style={{ boxShadow: "2px 4px 10px 0px rgba(0,0,0,0.12)" }}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <RiArrowDropDownLine className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6" color="#FF4500" />
      </div>

      {/* View Mode Buttons */}
      <div className="flex gap-2 mt-2 sm:mt-0 ml-0 sm:ml-2">
        <button
          onClick={() => setViewMode('list')}
          className={`p-2 rounded-lg shadow-md hover:shadow-lg hover:bg-gray-100 transition ${
            viewMode === "list" ? "bg-gray-200" : ""
          }`}
        >
          <FaListUl className="w-5 h-5" color="#FF4500" />
        </button>
        <button
          onClick={() => setViewMode('grid')}
          className={`p-2 rounded-lg shadow-md hover:shadow-lg hover:bg-gray-100 transition ${
            viewMode === "grid" ? "bg-gray-200" : ""
          }`}
        >
          <BsFillGridFill className="w-5 h-5" color="#FF4500" />
        </button>
      </div>
    </div>
  </div>

  {/* --- LIST / TABLE VIEW --- */}
  {viewMode === 'list' && filteredPlaylists.length > 0 && (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-y-2 text-sm">
        <thead>
          <tr className="text-left text-gray-600">
            <th className="px-4 py-2">Playlist Name</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Tracks</th>
            <th className="px-4 py-2">Schedule</th>
            <th className="px-4 py-2">Date Created</th>
            <th className="px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredPlaylists.map(playlist => (
            <tr key={playlist._id} className="bg-blue-50 hover:bg-blue-100 rounded-xl transition">
              <td className="px-4 py-3 font-medium flex items-center gap-2">
                <span className="flex items-center justify-center rounded-[10px]" style={{ backgroundColor: "#07323C", width: "40px", height: "40px" }}>
                  <MdQueueMusic size={20} color="#FFFFFF" />
                </span>
                {playlist.name}
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 text-xs rounded ${playlist.status === "active" ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-600"}`}>
                  {playlist.status}
                </span>
              </td>
              <td className="px-4 py-3">{playlist.announcements.length || 0}</td>
              <td className="px-4 py-2">{playlist.schedule.scheduleType}</td>
              <td className="px-4 py-2">{new Date(playlist.createdAt).toLocaleDateString()}</td>
              <td className="px-4 py-2 flex gap-2 flex-wrap">
                <button onClick={() => initializeEditedPlaylist(playlist)} className="p-2 rounded-lg shadow-md hover:shadow-lg transition-colors">
                  <Edit size={18} color="#FF4500" />
                </button>
                <button onClick={() => handleDeletePlaylist(playlist._id)} className="p-2 rounded-lg shadow-md hover:shadow-lg transition-colors">
                  <Trash2 size={16} color="#FF4500" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}

  {/* --- GRID VIEW --- */}
  {viewMode === 'grid' && filteredPlaylists.length > 0 && (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredPlaylists.map(playlist => (
        <div key={playlist._id} className="border rounded-lg p-4 shadow-sm hover:shadow-md transition">
          <h3 className="font-semibold text-lg">{playlist.name}</h3>
          <p><strong>Status:</strong> {playlist.status}</p>
          <p><strong>Tracks:</strong> {playlist.announcements.length}</p>
          <p><strong>Schedule:</strong> {playlist.schedule.scheduleType}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <button onClick={() => initializeEditedPlaylist(playlist)} className="text-blue-600 hover:text-blue-800">
              <Edit size={18} />
            </button>
            <button onClick={() => handleDeletePlaylist(playlist._id)} className="text-red-600 hover:text-red-800">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )}

  {/* --- No Playlists --- */}
  {filteredPlaylists.length === 0 && (
    <div className="text-center py-10 text-gray-500">
      <p className="font-semibold">No Playlists Found</p>
      <p className="text-sm mt-1">Create a new announcement playlist to get started.</p>
    </div>
  )}
</div>


  );
};

export default AnnouncementList;
