// "use client";

// import React, { useState, useEffect, useRef } from "react";
// import { Trash2, Play, Pause, Mic, Upload, Search, List, Grid, X, Maximize2, Download } from "lucide-react";
// import toast from "react-hot-toast";

// interface AnnouncementFile {
//   _id: string;
//   name: string;
//   path: string; // URL
//   type: 'recorded' | 'generated';
//   voice?: string;
//   createdAt?: string;
//   duration?: number; // in seconds
// }

// interface ShowAnnouncementProps {
//   onCancel: () => void;
// }

// const ShowAnnouncement: React.FC<ShowAnnouncementProps> = ({ onCancel }) => {
//   const [announcementFiles, setAnnouncementFiles] = useState<AnnouncementFile[]>([]);
//   const [filteredFiles, setFilteredFiles] = useState<AnnouncementFile[]>([]);
//   const [isLoading, setIsLoading] = useState<boolean>(false);
//   const [searchTerm, setSearchTerm] = useState<string>("");
//   const [previewFile, setPreviewFile] = useState<AnnouncementFile | null>(null);
//   const [viewMode, setViewMode] = useState<"grid" | "table">("table");
//   const [sortBy, setSortBy] = useState<string>("date");
//   const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
//   const [userId, setUserId] = useState<string | null>(null);
//   const [playingId, setPlayingId] = useState<string | null>(null);

//   useEffect(() => {
//     const storedUserId = localStorage.getItem("userId");
//     if (storedUserId) {
//       setUserId(storedUserId);
//     } else {
//       toast.error("Authentication required");
//     }
//   }, []);

//   useEffect(() => {
//     if (searchTerm.trim() === "") {
//       setFilteredFiles(announcementFiles);
//     } else {
//       const filtered = announcementFiles.filter(
//         (file) =>
//           file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//           file.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
//           (file.voice && file.voice.toLowerCase().includes(searchTerm.toLowerCase()))
//       );
//       setFilteredFiles(filtered);
//     }
//   }, [searchTerm, announcementFiles]);

//   useEffect(() => {
//     if (userId) {
//       fetchAnnouncements();
//     }
//   }, [userId]);

//   const fetchAnnouncements = async () => {
//     setIsLoading(true);
//     try {
//       const response = await fetch(`/api/announcement/list?userId=${userId}`);
//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.message || "Failed to fetch announcement files");
//       }
//       const data = await response.json();
//       const files = data || data || [];
//       setAnnouncementFiles(files);
//       setFilteredFiles(files);
//     } catch (error) {
//       toast.error(error instanceof Error ? error.message : "Failed to fetch announcement files");
//       setAnnouncementFiles([]);
//       setFilteredFiles([]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleDeleteAnnouncement = async (fileId: string): Promise<void> => {
//     if (!confirm("Are you sure you want to delete this announcement file?")) {
//       return;
//     }
//     setIsLoading(true);
//     try {
//       const response = await fetch("/api/announcement/delete", {
//         method: "DELETE",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ id: fileId }),
//       });
//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.message || "Failed to delete announcement");
//       }
//       toast.success("Announcement file deleted successfully");
//       setAnnouncementFiles(prev => prev.filter(file => file._id !== fileId));
//       setFilteredFiles(prev => prev.filter(file => file._id !== fileId));
//       if (previewFile?._id === fileId) {
//         setPreviewFile(null);
//       }
//     } catch (error) {
//       toast.error(error instanceof Error ? error.message : "Failed to delete announcement");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleSort = (criteria: string) => {
//     if (sortBy === criteria) {
//       setSortOrder(sortOrder === "asc" ? "desc" : "asc");
//     } else {
//       setSortBy(criteria);
//       setSortOrder("asc");
//     }
//     const sortedFiles = [...filteredFiles].sort((a, b) => {
//       let comparison = 0;
//       switch (criteria) {
//         case "name":
//           comparison = a.name.localeCompare(b.name);
//           break;
//         case "type":
//           comparison = a.type.localeCompare(b.type);
//           break;
//         case "date":
//           const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
//           const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
//           comparison = dateA - dateB;
//           break;
//       }
//       return sortOrder === "asc" ? comparison : -comparison;
//     });
//     setFilteredFiles(sortedFiles);
//   };

//   const handlePreviewClick = (file: AnnouncementFile, e?: React.MouseEvent) => {
//     if (e) e.stopPropagation();
//     setPreviewFile(file);
//   };

//   const closePreview = () => {
//     setPreviewFile(null);
//   };

//   const downloadAnnouncement = (url: string, filename: string) => {
//     const link = document.createElement('a');
//     link.href = url;
//     link.download = filename;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   };

//   const handlePlayPause = (file: AnnouncementFile) => {
//     const audioEl = document.getElementById(`audio-${file._id}`) as HTMLAudioElement | null;
//     if (!audioEl) return;
//     if (playingId === file._id) {
//       audioEl.pause();
//       setPlayingId(null);
//     } else {
//       // Pause any other playing audio
//       document.querySelectorAll("audio").forEach(el => el !== audioEl && el.pause());
//       audioEl.play();
//       setPlayingId(file._id);
//     }
//   };

//   return (
//     <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 text-black">
//       {/* Header Section */}
//       <div className="flex flex-col gap-4 mb-6">
//         <h2 className="text-xl sm:text-2xl font-bold">Announcement Files</h2>
//         <div className="flex flex-col sm:flex-row gap-3 w-full">
//           {/* Search Bar */}
//           <div className="relative flex-grow">
//             <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
//             <input
//               type="text"
//               placeholder="Search announcements..."
//               className="pl-10 pr-4 py-2 border rounded-lg w-full"
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//             />
//           </div>
//           {/* View Toggle */}
//           <div className="flex border rounded-lg self-end sm:self-auto">
//             <button 
//               onClick={() => setViewMode("table")}
//               className={`p-2 ${viewMode === 'table' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}
//               title="Table view"
//               aria-label="Table view"
//             >
//               <List size={18} />
//             </button>
//             <button 
//               onClick={() => setViewMode("grid")}
//               className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}
//               title="Grid view"
//               aria-label="Grid view"
//             >
//               <Grid size={18} />
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Loading State */}
//       {isLoading ? (
//         <div className="flex justify-center items-center py-8">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
//         </div>
//       ) : filteredFiles.length === 0 ? (
//         <div className="text-center py-8 bg-gray-50 rounded-lg">
//           <p className="text-gray-500">No announcement files found</p>
//           {searchTerm && (
//             <button 
//               onClick={() => setSearchTerm('')} 
//               className="mt-2 text-blue-500 hover:underline"
//             >
//               Clear search
//             </button>
//           )}
//         </div>
//       ) : viewMode === "table" ? (
//         // Table View
//         <div className="overflow-x-auto">
//           <table className="min-w-full divide-y divide-gray-200">
//             <thead className="bg-gray-50">
//               <tr>
//                 <th 
//                   className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
//                   onClick={() => handleSort("name")}
//                 >
//                   <div className="flex items-center">
//                     Name
//                     {sortBy === "name" && (
//                       <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
//                     )}
//                   </div>
//                 </th>
//                 <th 
//                   className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
//                   onClick={() => handleSort("type")}
//                 >
//                   <div className="flex items-center">
//                     Type
//                     {sortBy === "type" && (
//                       <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
//                     )}
//                   </div>
//                 </th>
//                 <th 
//                   className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
//                   onClick={() => handleSort("date")}
//                 >
//                   <div className="flex items-center">
//                     Date
//                     {sortBy === "date" && (
//                       <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
//                     )}
//                   </div>
//                 </th>
//                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Preview
//                 </th>
//                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                   Actions
//                 </th>
//               </tr>
//             </thead>
//             <tbody className="bg-white divide-y divide-gray-200">
//               {filteredFiles.map((file) => (
//                 <tr key={file._id} className="hover:bg-gray-50">
//                   <td className="px-4 py-4 whitespace-nowrap">
//                     <div className="flex items-center">
//                       {file.type === "recorded" ? (
//                         <Mic size={16} className="text-red-500" />
//                       ) : (
//                         <Upload size={16} className="text-blue-500" />
//                       )}
//                       <span className="ml-2 text-sm font-medium text-gray-900 truncate max-w-[120px] sm:max-w-xs">
//                         {file.name}
//                       </span>
//                     </div>
//                   </td>
//                   <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
//                     {file.type}
//                   </td>
//                   <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
//                     {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : 'Unknown'}
//                   </td>
//                   <td className="px-4 py-4 whitespace-nowrap flex items-center gap-2">
//                     <button
//                       onClick={() => handlePlayPause(file)}
//                       className="p-1 rounded text-gray-500 hover:bg-gray-100"
//                       aria-label={playingId === file._id ? "Pause" : "Play"}
//                     >
//                       {playingId === file._id ? <Pause size={16} /> : <Play size={16} />}
//                     </button>
//                     <audio
//                       id={`audio-${file._id}`}
//                       src={file.path}
//                       onEnded={() => setPlayingId(null)}
//                       style={{ display: "none" }}
//                     />
//                     <button
//                       onClick={(e) => handlePreviewClick(file, e)}
//                       className="p-1 rounded text-gray-500 hover:bg-gray-100"
//                       aria-label="Preview"
//                     >
//                       <Maximize2 size={16} />
//                     </button>
//                   </td>
//                   <td className="px-4 py-4 whitespace-nowrap">
//                     <div className="flex items-center gap-2">
//                       <button
//                         onClick={() => downloadAnnouncement(file.path, file.name)}
//                         className="p-1 rounded text-gray-500 hover:bg-blue-50 hover:text-blue-500"
//                         aria-label="Download"
//                       >
//                         <Download size={16} />
//                       </button>
//                       <button
//                         onClick={() => handleDeleteAnnouncement(file._id)}
//                         className="p-1 rounded text-gray-500 hover:bg-red-50 hover:text-red-500"
//                         aria-label="Delete"
//                       >
//                         <Trash2 size={16} />
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       ) : (
//         // Grid View
//         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
//           {filteredFiles.map((file) => (
//             <div
//               key={file._id}
//               className="border rounded-xl p-3 hover:shadow-md transition-shadow bg-gray-50"
//             >
//               <div className="flex flex-col gap-3">
//                 {/* Announcement Preview */}
//                 <div 
//                   className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
//                   onClick={(e) => handlePreviewClick(file, e)}
//                 >
//                   <div className="relative group h-full flex items-center justify-center">
//                     {file.type === "recorded" ? (
//                       <Mic size={32} className="text-red-500" />
//                     ) : (
//                       <Upload size={32} className="text-blue-500" />
//                     )}
//                   </div>
//                 </div>
//                 {/* Announcement Info */}
//                 <div className="flex justify-between items-center">
//                   <div className="min-w-0">
//                     <h3 className="font-medium text-gray-800 text-sm truncate">
//                       {file.name}
//                     </h3>
//                     <div className="flex items-center gap-2">
//                       <span className="text-xs text-gray-500 capitalize">
//                         {file.type}
//                       </span>
//                       {file.createdAt && (
//                         <span className="text-xs text-gray-400">
//                           • {new Date(file.createdAt).toLocaleDateString()}
//                         </span>
//                       )}
//                       {file.voice && (
//                         <span className="text-xs text-blue-500">• {file.voice}</span>
//                       )}
//                     </div>
//                   </div>
//                   {/* Actions */}
//                   <div className="flex items-center gap-1">
//                     <button
//                       onClick={() => downloadAnnouncement(file.path, file.name)}
//                       className="p-1 sm:p-2 text-gray-600 hover:text-blue-600 rounded-lg transition-colors"
//                       aria-label="Download"
//                     >
//                       <Download size={16} />
//                     </button>
//                     <button
//                       onClick={() => handleDeleteAnnouncement(file._id)}
//                       className="p-1 sm:p-2 text-gray-600 hover:text-red-600 rounded-lg transition-colors"
//                       aria-label="Delete"
//                     >
//                       <Trash2 size={16} />
//                     </button>
//                   </div>
//                 </div>
//                 <div className="flex items-center justify-center gap-2 mt-2">
//                   <button
//                     onClick={() => handlePlayPause(file)}
//                     className="p-1 rounded text-gray-500 hover:bg-gray-100"
//                     aria-label={playingId === file._id ? "Pause" : "Play"}
//                   >
//                     {playingId === file._id ? <Pause size={16} /> : <Play size={16} />}
//                   </button>
//                   <audio
//                     id={`audio-${file._id}`}
//                     src={file.path}
//                     onEnded={() => setPlayingId(null)}
//                     style={{ display: "none" }}
//                   />
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* Footer */}
//       <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 border-t gap-3">
//         <p className="text-sm text-gray-500 order-2 sm:order-1">
//           {filteredFiles.length} {filteredFiles.length === 1 ? 'item' : 'items'}
//         </p>
//         <button
//           onClick={onCancel}
//           className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm order-1 sm:order-2"
//         >
//           Back to Dashboard
//         </button>
//       </div>

//       {/* Announcement Preview Modal */}
//       {previewFile && (
//         <div 
//           className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-2 sm:p-4 md:p-8"
//           onClick={closePreview}
//         >
//           <div 
//             className="relative max-w-full w-full max-h-full bg-white rounded-lg overflow-hidden mx-2"
//             onClick={(e) => e.stopPropagation()}
//           >
//             {/* Modal Header */}
//             <div className="flex justify-between items-center p-3 sm:p-4 border-b">
//               <h3 className="font-medium truncate text-sm sm:text-base max-w-[70%]">{previewFile.name}</h3>
//               <div className="flex items-center gap-2">
//                 <button 
//                   onClick={() => downloadAnnouncement(previewFile.path, previewFile.name)}
//                   className="p-1 sm:p-2 text-gray-600 hover:text-blue-600 rounded-full hover:bg-gray-100"
//                   aria-label="Download"
//                 >
//                   <Download size={18} />
//                 </button>
//                 <button 
//                   onClick={closePreview}
//                   className="p-1 sm:p-2 text-gray-600 hover:text-red-600 rounded-full hover:bg-gray-100"
//                   aria-label="Close"
//                 >
//                   <X size={18} />
//                 </button>
//               </div>
//             </div>
//             {/* Modal Content */}
//             <div className="bg-gray-900 flex items-center justify-center" style={{ height: '40vh' }}>
//               <div className="w-full h-full flex flex-col items-center justify-center p-2">
//                 {previewFile.type === "recorded" ? (
//                   <Mic size={64} className="text-red-500 mb-4" />
//                 ) : (
//                   <Upload size={64} className="text-blue-500 mb-4" />
//                 )}
//                 <p className="text-white text-lg font-semibold">{previewFile.name}</p>
//                 {previewFile.voice && (
//                   <p className="text-blue-200 text-sm mt-2">Voice: {previewFile.voice}</p>
//                 )}
//                 {previewFile.duration && (
//                   <p className="text-gray-200 text-xs mt-2">Duration: {previewFile.duration}s</p>
//                 )}
//                 <audio src={previewFile.path} controls className="mt-4 w-full max-w-md" />
//               </div>
//             </div>
//             {/* Modal Footer */}
//             <div className="p-3 sm:p-4 border-t flex flex-col sm:flex-row justify-between items-center bg-white gap-2">
//               <span className="text-xs sm:text-sm text-gray-500">
//                 {previewFile.type}
//                 {previewFile.createdAt && 
//                   ` • Added ${new Date(previewFile.createdAt).toLocaleDateString()}`
//                 }
//                 {previewFile.duration && 
//                   ` • Duration ${previewFile.duration}s`
//                 }
//               </span>
//               <button
//                 onClick={closePreview}
//                 className="px-3 py-1 sm:px-4 sm:py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors text-sm w-full sm:w-auto text-center"
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default ShowAnnouncement;



"use client";

import React, { useState, useEffect, useRef } from "react";
import { Trash2, Play, Pause, Mic, Upload, Search, List, Grid, X, Maximize2, Download } from "lucide-react";
import toast from "react-hot-toast";
import { FaListUl } from "react-icons/fa6";
import { BsFillGridFill } from "react-icons/bs";
import { RiArrowDropDownLine } from "react-icons/ri";

// interface AnnouncementFile {
//   _id: string;
//   name: string;
//   path: string; // URL
//   type: 'recorded' | 'generated';
//   voice?: string;
//   createdAt?: string;
//   duration?: number; // in seconds
// }
interface AnnouncementFile {
  _id: string;
  name: string;
  path: string; // URL
  type: 'recorded' | 'uploaded' | 'tts'; // Updated types
  voice?: string | null;
  createdAt?: string;
  duration?: number; // in seconds
  userId?: string;
}


interface ShowAnnouncementProps {
  onCancel: () => void;
}

const ShowAnnouncement: React.FC<ShowAnnouncementProps> = ({ onCancel }) => {
  const [announcementFiles, setAnnouncementFiles] = useState<AnnouncementFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<AnnouncementFile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [previewFile, setPreviewFile] = useState<AnnouncementFile | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const [sortBy, setSortBy] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [userId, setUserId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      toast.error("Authentication required");
    }
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredFiles(announcementFiles);
    } else {
      const filtered = announcementFiles.filter(
        (file) =>
          file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          file.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (file.voice && file.voice.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredFiles(filtered);
    }
  }, [searchTerm, announcementFiles]);

  useEffect(() => {
    if (userId) {
      fetchAnnouncements();
    }
  }, [userId]);

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/announcement/list?userId=${userId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch announcement files");
      }
      const data = await response.json();
      const files = data || data || [];
      setAnnouncementFiles(files);
      setFilteredFiles(files);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch announcement files");
      setAnnouncementFiles([]);
      setFilteredFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAnnouncement = async (fileId: string): Promise<void> => {
    if (!confirm("Are you sure you want to delete this announcement file?")) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/announcement/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: fileId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete announcement");
      }
      toast.success("Announcement file deleted successfully");
      setAnnouncementFiles(prev => prev.filter(file => file._id !== fileId));
      setFilteredFiles(prev => prev.filter(file => file._id !== fileId));
      if (previewFile?._id === fileId) {
        setPreviewFile(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete announcement");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (criteria: string) => {
    if (sortBy === criteria) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(criteria);
      setSortOrder("asc");
    }
    const sortedFiles = [...filteredFiles].sort((a, b) => {
      let comparison = 0;
      switch (criteria) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "type":
          comparison = a.type.localeCompare(b.type);
          break;
        case "date":
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    setFilteredFiles(sortedFiles);
  };

  const handlePreviewClick = (file: AnnouncementFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPreviewFile(file);
  };

  const closePreview = () => {
    setPreviewFile(null);
  };

  const downloadAnnouncement = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePlayPause = (file: AnnouncementFile) => {
    const audioEl = document.getElementById(`audio-${file._id}`) as HTMLAudioElement | null;
    if (!audioEl) return;
    if (playingId === file._id) {
      audioEl.pause();
      setPlayingId(null);
    } else {
      // Pause any other playing audio
      document.querySelectorAll("audio").forEach(el => el !== audioEl && el.pause());
      audioEl.play();
      setPlayingId(file._id);
    }
  };
// Inside the component, add a state for filter type
const [filterType, setFilterType] = useState<"all" | "uploaded" | "tts" | "recorded">("all");

// Update the filteredFiles useEffect
useEffect(() => {
  let filtered = [...announcementFiles];

  // Search filter
  if (searchTerm.trim() !== "") {
    filtered = filtered.filter(
      file =>
        file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (file.voice && file.voice.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }

  // Type filter
  if (filterType !== "all") {
    filtered = filtered.filter((file) => {
      switch (filterType) {
        case "uploaded":
          return file.type === "uploaded";
        case "tts":
          return file.type === "tts";
        case "recorded":
          return file.type === "recorded";
        default:
          return true;
      }
    });
  }

  setFilteredFiles(filtered);
}, [searchTerm, announcementFiles, filterType]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 text-black">
      {/* Header Section */}
      <div className="flex flex-col gap-4 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold">Announcement Library</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          {/* Search Bar */}
          <div className="relative flex-grow">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search announcements..."
              className="pl-10 pr-4 py-2 shadow-[2px_4px_10px_0px_rgba(0,0,0,0.12)] rounded-lg w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {/* <div className="flex items-center gap-2">
  <select
    value={filterType}
    onChange={(e) => setFilterType(e.target.value as any)}
    className="pl-2 pr-4 py-2 shadow-[2px_4px_10px_0px_rgba(0,0,0,0.12)] rounded-lg"
  >
    <option value="all">All</option>
    <option value="uploaded">Uploaded</option>
    <option value="tts">TTS</option>
    <option value="recorded">Recorded</option>
  </select>
</div> */}
 <div className="relative inline-block w-full sm:w-auto">
        <select
          className="px-3 py-2 pr-8 rounded-lg shadow-md focus:outline-none appearance-none w-full sm:w-auto"
           value={filterType}
        onChange={(e) => setFilterType(e.target.value as any)}
          style={{ boxShadow: "2px 4px 10px 0px rgba(0,0,0,0.12)" }}
        >
          <option value="all">All</option>
    <option value="uploaded">Uploaded</option>
    <option value="tts">TTS</option>
    <option value="recorded">Recorded</option>
        </select>
        <RiArrowDropDownLine className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6" color="#FF4500" />
      </div>

          {/* View Toggle */}
          <div className="flex  rounded-lg self-end sm:self-auto">
            <button 
              onClick={() => setViewMode("table")}
              // className={`p-2 ${viewMode === 'table' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}
              className={`p-2 rounded-lg shadow-md hover:shadow-lg hover:bg-gray-100 transition ${
            viewMode === "table" ? "bg-gray-200" : ""
          }`}
              title="Table view"
              aria-label="Table view"
            >
                        <FaListUl className="w-5 h-5" color="#FF4500" />
              
            </button>
            <button 
              onClick={() => setViewMode("grid")}
              // className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-500'}`}
              className={`p-2 rounded-lg shadow-md hover:shadow-lg hover:bg-gray-100 transition ${
            viewMode === "grid" ? "bg-gray-200" : ""
          }`}
              title="Grid view"
              aria-label="Grid view"
            >
                        <BsFillGridFill className="w-5 h-5" color="#FF4500" />
              
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No announcement files found</p>
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="mt-2 text-blue-500 hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      ) : viewMode === "table" ? (
        // Table View
        <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-3">
  <thead className="bg-gray-50">
    <tr>
      <th
        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
        onClick={() => handleSort("name")}
      >
        <div className="flex items-center">
          Name
          {sortBy === "name" && (
            <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
          )}
        </div>
      </th>
      <th
        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
        onClick={() => handleSort("type")}
      >
        <div className="flex items-center">
          Type
          {sortBy === "type" && (
            <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
          )}
        </div>
      </th>
      <th
        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
        onClick={() => handleSort("date")}
      >
        <div className="flex items-center">
          Date
          {sortBy === "date" && (
            <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>
          )}
        </div>
      </th>
      {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Preview
      </th> */}
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Actions
      </th>
    </tr>
  </thead>

  <tbody>
    {filteredFiles.map((file) => (
      <tr
        key={file._id}
        className="bg-[#E9FBFF] rounded-xl shadow-sm hover:bg-[#d9f4f9] transition"
      >
        <td className="px-4 py-4 whitespace-nowrap">
          <div className="flex items-center gap-3">
            <div className="bg-[#07323C] rounded-[10px] p-2 flex items-center justify-center">
              {file.type === "recorded" ? (
                <Mic size={16} className="text-white" />
              ) : (
                <Upload size={16} className="text-white" />
              )}
            </div>
            <span className="text-sm font-medium text-gray-900 truncate max-w-[120px] sm:max-w-xs">
              {file.name}
            </span>
          </div>
        </td>

        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
          {file.type}
        </td>

        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
          {file.createdAt
            ? new Date(file.createdAt).toLocaleDateString()
            : "Unknown"}
        </td>

        {/* <td className="px-4 py-4 whitespace-nowrap flex items-center gap-2">
         
        </td> */}

        {/* <td className="px-4 py-4 whitespace-nowrap">
          <div className="flex items-center gap-2">
             <button
            onClick={() => handlePlayPause(file)}
            className="p-1 rounded text-gray-500 hover:bg-gray-100"
            aria-label={playingId === file._id ? "Pause" : "Play"}
          >
            {playingId === file._id ? (
              <Pause size={16} />
            ) : (
              <Play size={16} />
            )}
          </button>
          <audio
            id={`audio-${file._id}`}
            src={file.path}
            onEnded={() => setPlayingId(null)}
            style={{ display: "none" }}
          />
          <button
            onClick={(e) => handlePreviewClick(file, e)}
            className="p-1 rounded text-gray-500 hover:bg-gray-100"
            aria-label="Preview"
          >
            <Maximize2 size={16} />
          </button>
            <button
              onClick={() => downloadAnnouncement(file.path, file.name)}
              className="p-1 rounded text-gray-500 hover:bg-blue-50 hover:text-blue-500"
              aria-label="Download"
            >
              <Download size={16} />
            </button>
            <button
              onClick={() => handleDeleteAnnouncement(file._id)}
              className="p-1 rounded text-gray-500 hover:bg-red-50 hover:text-red-500"
              aria-label="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </td> */}
        <td className="px-4 py-4 whitespace-nowrap">
  <div className="flex items-center gap-2">
    <button
      onClick={() => handlePlayPause(file)}
      className="p-2 rounded-[9px] bg-white shadow-md"
      style={{ boxShadow: "0px 3px 15px 0px #00000026" }}
      aria-label={playingId === file._id ? "Pause" : "Play"}
    >
      {playingId === file._id ? (
        <Pause size={16} className="text-[#FF4500]" />
      ) : (
        <Play size={16} className="text-[#FF4500]" />
      )}
    </button>

    <audio
      id={`audio-${file._id}`}
      src={file.path}
      onEnded={() => setPlayingId(null)}
      style={{ display: "none" }}
    />

    <button
      onClick={(e) => handlePreviewClick(file, e)}
      className="p-2 rounded-[9px] bg-white shadow-md"
      style={{ boxShadow: "0px 3px 15px 0px #00000026" }}
      aria-label="Preview"
    >
      <Maximize2 size={16} className="text-[#FF4500]" />
    </button>

    <button
      onClick={() => downloadAnnouncement(file.path, file.name)}
      className="p-2 rounded-[9px] bg-white shadow-md"
      style={{ boxShadow: "0px 3px 15px 0px #00000026" }}
      aria-label="Download"
    >
      <Download size={16} className="text-[#FF4500]" />
    </button>

    <button
      onClick={() => handleDeleteAnnouncement(file._id)}
      className="p-2 rounded-[9px] bg-white shadow-md"
      style={{ boxShadow: "0px 3px 15px 0px #00000026" }}
      aria-label="Delete"
    >
      <Trash2 size={16} className="text-[#FF4500]" />
    </button>
  </div>
</td>

      </tr>
    ))}
  </tbody>
</table>

        </div>
      ) : (
        // Grid View
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFiles.map((file) => (
            <div
              key={file._id}
              className="border rounded-xl p-3 hover:shadow-md transition-shadow bg-gray-50"
            >
              <div className="flex flex-col gap-3">
                {/* Announcement Preview */}
                <div 
                  className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
                  onClick={(e) => handlePreviewClick(file, e)}
                >
                  {/* <div className="relative group h-full flex items-center justify-center">
                    {file.type === "recorded" ? (
                      <Mic size={32} className="text-red-500" />
                    ) : (
                      <Upload size={32} className="text-blue-500" />
                    )}
                  </div> */}
                  <div className="bg-[#07323C]  relative group h-full flex items-center justify-center">
              {file.type === "recorded" ? (
                <Mic size={32} className="text-white" />
              ) : (
                <Upload size={32} className="text-white" />
              )}
            </div>
                </div>
                {/* Announcement Info */}
                <div className="flex justify-between items-center">
                  <div className="min-w-0">
                    <h3 className="font-medium text-gray-800 text-sm truncate">
                      {file.name}
                    </h3>
                    {/* <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 capitalize">
                        {file.type}
                      </span>
                      {file.createdAt && (
                        <span className="text-xs text-gray-400">
                          • {new Date(file.createdAt).toLocaleDateString()}
                        </span>
                      )}
                      {file.voice && (
                        <span className="text-xs text-blue-500">• {file.voice}</span>
                      )}
                    </div> */}
                    <div className="flex flex-col gap-1 text-xs">
  <span className="text-gray-500 capitalize">{file.type}</span>
  {file.createdAt && (
    <span className="text-gray-400">
      {new Date(file.createdAt).toLocaleDateString()}
    </span>
  )}
  {file.voice && <span className="text-blue-500">{file.voice}</span>}
</div>

                  </div>
                  {/* Actions */}
                  {/* <div className="flex items-center gap-1">
                    <button
                      onClick={() => downloadAnnouncement(file.path, file.name)}
                      className="p-1 sm:p-2 text-gray-600 hover:text-blue-600 rounded-lg transition-colors"
                      aria-label="Download"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteAnnouncement(file._id)}
                      className="p-1 sm:p-2 text-gray-600 hover:text-red-600 rounded-lg transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div> */}
                  <div className="flex items-center gap-2">
  <button
    onClick={() => downloadAnnouncement(file.path, file.name)}
    className="p-2 bg-white rounded-[9px]"
    style={{ boxShadow: "0px 3px 15px 0px #00000026" }}
    aria-label="Download"
  >
    <Download size={16} className="text-[#FF4500]" />
  </button>

  <button
    onClick={() => handleDeleteAnnouncement(file._id)}
    className="p-2 bg-white rounded-[9px]"
    style={{ boxShadow: "0px 3px 15px 0px #00000026" }}
    aria-label="Delete"
  >
    <Trash2 size={16} className="text-[#FF4500]" />
  </button>
  {/* <div className="flex items-center justify-center gap-2 mt-2"> */}
  <button
    onClick={() => handlePlayPause(file)}
    className="p-2 bg-white rounded-[9px]"
    style={{ boxShadow: "0px 3px 15px 0px #00000026" }}
    aria-label={playingId === file._id ? "Pause" : "Play"}
  >
    {playingId === file._id ? (
      <Pause size={16} className="text-[#FF4500]" />
    ) : (
      <Play size={16} className="text-[#FF4500]" />
    )}
  </button>

  <audio
    id={`audio-${file._id}`}
    src={file.path}
    onEnded={() => setPlayingId(null)}
    style={{ display: "none" }}
  />
{/* </div> */}

</div>

                </div>
                
                {/* <div className="flex items-center justify-center gap-2 mt-2">
                  <button
                    onClick={() => handlePlayPause(file)}
                    className="p-1 rounded text-gray-500 hover:bg-gray-100"
                    aria-label={playingId === file._id ? "Pause" : "Play"}
                  >
                    {playingId === file._id ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <audio
                    id={`audio-${file._id}`}
                    src={file.path}
                    onEnded={() => setPlayingId(null)}
                    style={{ display: "none" }}
                  />
                </div> */}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {/* <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 border-t gap-3">
        <p className="text-sm text-gray-500 order-2 sm:order-1">
          {filteredFiles.length} {filteredFiles.length === 1 ? 'item' : 'items'}
        </p>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm order-1 sm:order-2"
        >
          Back to Dashboard
        </button>
      </div> */}

      {/* Announcement Preview Modal */}
      {previewFile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-2 sm:p-4 md:p-8"
          onClick={closePreview}
        >
          <div 
            className="relative max-w-full w-full max-h-full bg-white rounded-lg overflow-hidden mx-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-3 sm:p-4 border-b">
              <h3 className="font-medium truncate text-sm sm:text-base max-w-[70%]">{previewFile.name}</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => downloadAnnouncement(previewFile.path, previewFile.name)}
                  className="p-1 sm:p-2 text-gray-600 hover:text-blue-600 rounded-full hover:bg-gray-100"
                  aria-label="Download"
                >
                  <Download size={18} />
                </button>
                <button 
                  onClick={closePreview}
                  className="p-1 sm:p-2 text-gray-600 hover:text-red-600 rounded-full hover:bg-gray-100"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            {/* Modal Content */}
            <div className="bg-gray-900 flex items-center justify-center" style={{ height: '40vh' }}>
              <div className="w-full h-full flex flex-col items-center justify-center p-2">
                {previewFile.type === "recorded" ? (
                  <Mic size={64} className="text-red-500 mb-4" />
                ) : (
                  <Upload size={64} className="text-blue-500 mb-4" />
                )}
                <p className="text-white text-lg font-semibold">{previewFile.name}</p>
                {previewFile.voice && (
                  <p className="text-blue-200 text-sm mt-2">Voice: {previewFile.voice}</p>
                )}
                {previewFile.duration && (
                  <p className="text-gray-200 text-xs mt-2">Duration: {previewFile.duration}s</p>
                )}
                <audio src={previewFile.path} controls className="mt-4 w-full max-w-md" />
              </div>
            </div>
            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t flex flex-col sm:flex-row justify-between items-center bg-white gap-2">
              <span className="text-xs sm:text-sm text-gray-500">
                {previewFile.type}
                {previewFile.createdAt && 
                  ` • Added ${new Date(previewFile.createdAt).toLocaleDateString()}`
                }
                {previewFile.duration && 
                  ` • Duration ${previewFile.duration}s`
                }
              </span>
              <button
                onClick={closePreview}
                className="px-3 py-1 sm:px-4 sm:py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors text-sm w-full sm:w-auto text-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShowAnnouncement;