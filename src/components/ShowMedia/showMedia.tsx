// "use client";

// import React, { useState, useEffect } from "react";
// import { Trash2, Play, Pause, Music, Video, ImageIcon, Search, List, Grid, X, Maximize2, Download } from "lucide-react";
// import toast from "react-hot-toast";

// interface MediaFile {
//   _id: string;
//   name: string;
//   type: string;
//   url: string;
//   createdAt?: string;
//   size?: number;
// }

// interface ShowMediaProps {
//   onCancel: () => void;
// }

// const ShowMedia: React.FC<ShowMediaProps> = ({ onCancel }) => {
//   const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
//   const [filteredFiles, setFilteredFiles] = useState<MediaFile[]>([]);
//   const [isLoading, setIsLoading] = useState<boolean>(false);
//   const [searchTerm, setSearchTerm] = useState<string>("");
//   const [playingMedia, setPlayingMedia] = useState<string | null>(null);
//   const [viewMode, setViewMode] = useState<"grid" | "table">("table");
//   const [sortBy, setSortBy] = useState<string>("date");
//   const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
//   const [previewMedia, setPreviewMedia] = useState<MediaFile | null>(null);
//   const [userId, setUserId] = useState<string | null>(null);

//   useEffect(() => {
//     const storedUserId = localStorage.getItem("userId");
//     if (storedUserId) {
//       setUserId(storedUserId);
//     } else {
//       console.error("User ID not found in local storage");
//       toast.error("Authentication required");
//     }
//   }, []);

//   useEffect(() => {
//     if (searchTerm.trim() === "") {
//       setFilteredFiles(mediaFiles);
//     } else {
//       const filtered = mediaFiles.filter(
//         (media) =>
//           media.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//           media.type.toLowerCase().includes(searchTerm.toLowerCase())
//       );
//       setFilteredFiles(filtered);
//     }
//   }, [searchTerm, mediaFiles]);

//   useEffect(() => {
//     const handleEscKey = (event: KeyboardEvent) => {
//       if (event.key === 'Escape' && previewMedia) {
//         setPreviewMedia(null);
//       }
//     };

//     window.addEventListener('keydown', handleEscKey);
//     return () => window.removeEventListener('keydown', handleEscKey);
//   }, [previewMedia]);

//   useEffect(() => {
//     if (userId) {
//       fetchMedia();
//     }
//   }, [userId]);

//   useEffect(() => {
//     return () => {
//       // Clean up any playing media when component unmounts
//       document.querySelectorAll<HTMLMediaElement>('audio, video').forEach(el => {
//         el.pause();
//       });
//     };
//   }, []);

//   const fetchMedia = async () => {
//     setIsLoading(true);
//     try {
//       if (!userId) {
//         throw new Error("User ID not available");
//       }
//       const response = await fetch(`/api/media?userId=${userId}`);
//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.message || "Failed to fetch media files");
//       }
//       const data = await response.json();
//       const mediaData = data.media || [];
//       setMediaFiles(mediaData);
//       setFilteredFiles(mediaData);
//     } catch (error) {
//       console.error("Error fetching media:", error);
//       toast.error(error instanceof Error ? error.message : "Failed to fetch media files");
//       setMediaFiles([]);
//       setFilteredFiles([]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handlePlayPause = (mediaId: string, mediaElement: HTMLMediaElement): void => {
//     if (playingMedia === mediaId) {
//       mediaElement.pause();
//       setPlayingMedia(null);
//     } else {
//       // Pause any currently playing media
//       document.querySelectorAll<HTMLMediaElement>('audio, video').forEach(el => {
//         if (el !== mediaElement) {
//           el.pause();
//           el.classList.remove("media-playing");
//         }
//       });
//       mediaElement.play().catch(error => {
//         console.error("Playback failed:", error);
//         toast.error("Failed to play media");
//       });
//       mediaElement.classList.add("media-playing");
//       setPlayingMedia(mediaId);
//     }
//   };

//   const handleDeleteMedia = async (mediaId: string): Promise<void> => {
//     if (!confirm("Are you sure you want to delete this media file? This will permanently remove the file from the server.")) {
//       return;
//     }
//     setIsLoading(true);
//     try {
//       const response = await fetch("/api/media", {
//         method: "DELETE",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({ id: mediaId }),
//       });
      
//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.message || "Failed to delete media");
//       }
      
//       toast.success("Media file deleted successfully");
//       setMediaFiles(prev => prev.filter(file => file._id !== mediaId));
//       setFilteredFiles(prev => prev.filter(file => file._id !== mediaId));
      
//       if (previewMedia?._id === mediaId) {
//         setPreviewMedia(null);
//       }
//     } catch (error) {
//       console.error("Error deleting media:", error);
//       toast.error(error instanceof Error ? error.message : "Failed to delete media");
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

//   const handlePreviewClick = (media: MediaFile, e?: React.MouseEvent) => {
//     if (e) e.stopPropagation();
//     // Check if media is actually playable
//     if (media.type.startsWith('audio/') || media.type.startsWith('video/')) {
//       const test = new Audio(media.url);
//       test.onerror = () => {
//         toast.error("This media file cannot be played");
//         return;
//       };
//       test.src = media.url;
//     }
//     setPreviewMedia(media);
//   };

//   const closePreview = () => {
//     setPreviewMedia(null);
//   };

//   const downloadMedia = (url: string, filename: string) => {
//     const link = document.createElement('a');
//     link.href = url;
//     link.download = filename;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//   };

//   const getFileTypeIcon = (type: string) => {
//     if (type.startsWith("image/")) {
//       return <ImageIcon size={16} className="text-green-500" />;
//     } else if (type.startsWith("video/")) {
//       return <Video size={16} className="text-blue-500" />;
//     } else if (type.startsWith("audio/")) {
//       return <Music size={16} className="text-purple-500" />;
//     }
//     return null;
//   };

//   const formatSize = (bytes?: number) => {
//     if (!bytes) return "Unknown";
//     const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
//     if (bytes === 0) return '0 Byte';
//     const i = Math.floor(Math.log(bytes) / Math.log(1024));
//     return `${Math.round(bytes / Math.pow(1024, i))} ${sizes[i]}`;
//   };

//   return (
//     <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 text-black">
//       {/* Header Section */}
//       <div className="flex flex-col gap-4 mb-6">
//         <h2 className="text-xl sm:text-2xl font-bold">Media Files</h2>
        
//         <div className="flex flex-col sm:flex-row gap-3 w-full">
//           {/* Search Bar */}
//           <div className="relative flex-grow">
//             <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
//             <input
//               type="text"
//               placeholder="Search media..."
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
//           <p className="text-gray-500">No media files found</p>
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
//               {filteredFiles.map((media) => (
//                 <tr key={media._id} className="hover:bg-gray-50">
//                   <td className="px-4 py-4 whitespace-nowrap">
//                     <div className="flex items-center">
//                       {getFileTypeIcon(media.type)}
//                       <span className="ml-2 text-sm font-medium text-gray-900 truncate max-w-[120px] sm:max-w-xs">
//                         {media.name}
//                       </span>
//                     </div>
//                   </td>
//                   <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
//                     {media.type.split("/")[0]}
//                   </td>
//                   <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
//                     {media.createdAt ? new Date(media.createdAt).toLocaleDateString() : 'Unknown'}
//                   </td>
//                   <td className="px-4 py-4 whitespace-nowrap">
//                     {media.type.startsWith("image/") && (
//                       <div 
//                         className="relative cursor-pointer group"
//                         onClick={(e) => handlePreviewClick(media, e)}
//                       >
//                         <img 
//                           src={media.url} 
//                           alt={media.name} 
//                           className="h-10 w-16 object-cover rounded"
//                           onError={(e) => {
//                             e.currentTarget.onerror = null;
//                             e.currentTarget.src = '/placeholder-image.png';
//                           }}
//                         />
//                         <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded">
//                           <Maximize2 size={14} className="text-white opacity-0 group-hover:opacity-100" />
//                         </div>
//                       </div>
//                     )}
//                     {media.type.startsWith("video/") && (
//                       <video 
//                         src={media.url} 
//                         className="h-10 w-16 object-cover rounded cursor-pointer"
//                         controls={false}
//                         muted
//                         onClick={(e) => handlePreviewClick(media, e)}
//                         onMouseOver={(e) => e.currentTarget.play()}
//                         onMouseOut={(e) => e.currentTarget.pause()}
//                       />
//                     )}
//                     {media.type.startsWith("audio/") && (
//                       <audio 
//                         src={media.url} 
//                         className="w-32 h-8" 
//                         controls 
//                         onPlay={(e) => handlePlayPause(media._id, e.currentTarget)}
//                       />
//                     )}
//                   </td>
//                   <td className="px-4 py-4 whitespace-nowrap">
//                     <div className="flex items-center gap-2">
//                       {(media.type.startsWith("video/") || media.type.startsWith("audio/")) && (
//                         <button
//                           onClick={() => {
//                             const element = document.querySelector(
//                               `${media.type.startsWith("video/") ? "video" : "audio"}[src="${media.url}"]`
//                             ) as HTMLMediaElement;
//                             if (element) handlePlayPause(media._id, element);
//                           }}
//                           className="p-1 rounded text-gray-500 hover:bg-gray-100"
//                           aria-label={playingMedia === media._id ? "Pause" : "Play"}
//                         >
//                           {playingMedia === media._id ? (
//                             <Pause size={16} className="text-gray-600" />
//                           ) : (
//                             <Play size={16} className="text-gray-600" />
//                           )}
//                         </button>
//                       )}
//                       <button
//                         onClick={() => downloadMedia(media.url, media.name)}
//                         className="p-1 rounded text-gray-500 hover:bg-blue-50 hover:text-blue-500"
//                         aria-label="Download"
//                       >
//                         <Download size={16} />
//                       </button>
//                       <button
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           handleDeleteMedia(media._id);
//                         }}
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
//           {filteredFiles.map((media) => (
//             <div
//               key={media._id}
//               className="border rounded-xl p-3 hover:shadow-md transition-shadow bg-gray-50"
//             >
//               <div className="flex flex-col gap-3">
//                 {/* Media Preview */}
//                 {media.type.startsWith("image/") && (
//                   <div 
//                     className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden cursor-pointer"
//                     onClick={(e) => handlePreviewClick(media, e)}
//                   >
//                     <div className="relative group h-full">
//                       <img
//                         src={media.url}
//                         alt={media.name}
//                         className="w-full h-full object-contain"
//                         loading="lazy"
//                         onError={(e) => {
//                           e.currentTarget.onerror = null;
//                           e.currentTarget.src = '/placeholder-image.png';
//                         }}
//                       />
//                       <div className="absolute inset-0 flex items-center justify-center group-hover:bg-opacity-30 transition-all">
//                         <Maximize2 size={20} className="text-white opacity-0 group-hover:opacity-100" />
//                       </div>
//                     </div>
//                   </div>
//                 )}
                
//                 {media.type.startsWith("video/") && (
//                   <div 
//                     className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden"
//                     onClick={(e) => handlePreviewClick(media, e)}
//                   >
//                     <div className="h-full group cursor-pointer">
//                       <video
//                         src={media.url}
//                         controls
//                         className="w-full h-full object-contain"
//                         onPlay={(e) => handlePlayPause(media._id, e.currentTarget)}
//                       />
//                       <div className="absolute inset-0 flex items-center justify-center bg-opacity-0 group-hover:bg-opacity-20 transition-all pointer-events-none">
//                         <Maximize2 size={24} className="text-white opacity-0 group-hover:opacity-100" />
//                       </div>
//                     </div>
//                   </div>
//                 )}
                
//                 {media.type.startsWith("audio/") && (
//                   <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
//                     <div className="absolute inset-0 flex items-center justify-center bg-gray-50 p-4">
//                       <div className="w-full max-w-md">
//                         <div className="flex items-center gap-4 mb-2">
//                           <Music size={24} className="text-gray-400" />
//                           <span className="text-sm font-medium text-gray-600 truncate">
//                             {media.name}
//                           </span>
//                         </div>
//                         <audio
//                           src={media.url}
//                           controls
//                           className="w-full mt-1"
//                           controlsList="nodownload"
//                           onPlay={(e) => handlePlayPause(media._id, e.currentTarget)}
//                         />
//                       </div>
//                     </div>
//                   </div>
//                 )}
                
//                 {/* Media Info */}
//                 <div className="flex justify-between items-center">
//                   <div className="min-w-0">
//                     <h3 className="font-medium text-gray-800 text-sm truncate">
//                       {media.name}
//                     </h3>
//                     <div className="flex items-center gap-2">
//                       <span className="text-xs text-gray-500 capitalize">
//                         {media.type.split("/")[0]}
//                       </span>
//                       {media.createdAt && (
//                         <span className="text-xs text-gray-400">
//                           • {new Date(media.createdAt).toLocaleDateString()}
//                         </span>
//                       )}
//                     </div>
//                   </div>
                  
//                   {/* Actions */}
//                   <div className="flex items-center gap-1">
//                     <button
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         downloadMedia(media.url, media.name);
//                       }}
//                       className="p-1 sm:p-2 text-gray-600 hover:text-blue-600 rounded-lg transition-colors"
//                       aria-label="Download"
//                     >
//                       <Download size={16} />
//                     </button>
//                     <button
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         handleDeleteMedia(media._id);
//                       }}
//                       className="p-1 sm:p-2 text-gray-600 hover:text-red-600 rounded-lg transition-colors"
//                       aria-label="Delete"
//                     >
//                       <Trash2 size={16} />
//                     </button>
//                   </div>
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

//       {/* Media Preview Modal */}
//       {previewMedia && (
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
//               <h3 className="font-medium truncate text-sm sm:text-base max-w-[70%]">{previewMedia.name}</h3>
//               <div className="flex items-center gap-2">
//                 <button 
//                   onClick={() => downloadMedia(previewMedia.url, previewMedia.name)}
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
//             <div className="bg-gray-900 flex items-center justify-center" style={{ height: '70vh' }}>
//               {previewMedia.type.startsWith("image/") && (
//                 <div className="w-full h-full flex items-center justify-center p-2">
//                   <img 
//                     src={previewMedia.url} 
//                     alt={previewMedia.name} 
//                     className="max-w-full max-h-full object-contain"
//                     onError={(e) => {
//                       e.currentTarget.onerror = null;
//                       e.currentTarget.src = '/placeholder-image.png';
//                     }}
//                   />
//                 </div>
//               )}
//               {previewMedia.type.startsWith("video/") && (
//                 <video 
//                   src={previewMedia.url} 
//                   controls 
//                   autoPlay
//                   className="max-w-full max-h-full"
//                 />
//               )}
//               {previewMedia.type.startsWith("audio/") && (
//                 <div className="w-full h-full flex items-center justify-center bg-gray-100">
//                   <audio 
//                     src={previewMedia.url} 
//                     controls
//                     autoPlay
//                     className="w-full max-w-md"
//                   />
//                 </div>
//               )}
//             </div>
            
//             {/* Modal Footer */}
//             <div className="p-3 sm:p-4 border-t flex flex-col sm:flex-row justify-between items-center bg-white gap-2">
//               <span className="text-xs sm:text-sm text-gray-500">
//                 {previewMedia.type}
//                 {previewMedia.createdAt && 
//                   ` • Added ${new Date(previewMedia.createdAt).toLocaleDateString()}`
//                 }
//                 {previewMedia.size && 
//                   ` • ${formatSize(previewMedia.size)}`
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

// export default ShowMedia;


"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Trash2,
  Music,
  Video,
  ImageIcon,
  Search,
  List,
  Grid,
  X,
  Maximize2,
  Download,
  AlertCircle,
  Play,
  FileAudio
} from "lucide-react";
import toast from "react-hot-toast";

/**
 * Configuration
 */
const BASE_URL = "https://iot.centelon.com";

let audioPlayer: HTMLAudioElement | null = null; // Single audio player instance

interface MediaFile {
  _id: string;
  name: string;
  type: "audio" | "video" | "image" | string;
  mime?: string;
  url: string;
  createdAt?: string;
  size?: number;
}

export default function ShowMedia() {
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [filtered, setFiltered] = useState<MediaFile[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "audio" | "video" | "image">("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [preview, setPreview] = useState<MediaFile | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Media
  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const userId = localStorage.getItem("userId");
        const res = await fetch(`/api/media${userId ? `?userId=${userId}` : ""}`);
        if (!res.ok) throw new Error("Failed to fetch media");

        const data = await res.json();
        const rawList: any[] = data.media || data || [];

        const mediaList: MediaFile[] = rawList.map((item) => {
          const originalType: string = item.type || "";
          // Robust type detection
          let category = "file";
          if (originalType.startsWith("image") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(item.url)) category = "image";
          else if (originalType.startsWith("video") || /\.(mp4|webm|mov|mkv)$/i.test(item.url)) category = "video";
          else if (originalType.startsWith("audio") || /\.(mp3|wav|ogg|m4a)$/i.test(item.url)) category = "audio";

          return {
            _id: item._id,
            name: item.name,
            type: category,
            mime: originalType,
            url: item.url,
            createdAt: item.createdAt,
            size: item.size,
          } as MediaFile;
        });

        setMedia(mediaList);
        setFiltered(mediaList);
      } catch (err) {
        console.error("Error fetching media:", err);
        toast.error("Failed to load media");
        setMedia([]);
        setFiltered([]);
      }
    };

    fetchMedia();
  }, []);

  // Filter Logic
  useEffect(() => {
    const q = search.trim().toLowerCase();
    const out = media.filter((m) => {
      const matchesType = filterType === "all" ? true : m.type === filterType;
      const matchesSearch = q === "" ? true : m.name.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
    setFiltered(out);
  }, [search, filterType, media]);

  // --- Helper Functions ---

  const normalizeUrl = (url?: string): string => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    
    // Remove leading slash to ensure clean concatenation
    const cleanPath = url.startsWith("/") ? url.slice(1) : url;
    return `${BASE_URL}/${cleanPath}`;
  };

  const formatDate = (d?: string) => {
    if (!d) return "Unknown";
    try {
      return new Date(d).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return d;
    }
  };

  // --- Actions ---

  const downloadFile = (m: MediaFile) => {
    const fullUrl = normalizeUrl(m.url);
    const link = document.createElement("a");
    link.href = fullUrl;
    link.target = "_blank";
    link.download = m.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Are you sure you want to delete this file?")) return;
    
    try {
      const userId = localStorage.getItem("userId");
      const res = await fetch(`/api/media/?userId=${userId}&mediaId=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      
      const newMedia = media.filter((m) => m._id !== id);
      setMedia(newMedia);
      // Re-filter immediately
      const q = search.trim().toLowerCase();
      setFiltered(newMedia.filter(m => {
          const matchesType = filterType === "all" ? true : m.type === filterType;
          const matchesSearch = q === "" ? true : m.name.toLowerCase().includes(q);
          return matchesType && matchesSearch;
      }));
      toast.success("Media deleted");
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    }
  };

  const openPreview = (m: MediaFile) => {
    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer = null;
    }
    setPreview(m);
  };

  const closePreview = () => {
    setPreview(null);
    document.querySelectorAll<HTMLMediaElement>("audio,video").forEach((el) => el.pause());
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen bg-[#EAF9FB] p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 min-h-[500px]">
          
          {/* --- Header Section --- */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <h1 className="text-slate-900 text-2xl font-semibold">
              Media Library
            </h1>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="flex items-center bg-white border border-slate-200 rounded-full px-4 shadow-sm flex-1 sm:w-80 transition-colors focus-within:border-orange-400">
                <Search size={18} className="text-slate-400 mr-2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="outline-none py-2.5 w-full text-sm text-slate-700 placeholder:text-slate-400"
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowFilterDropdown((s) => !s)}
                    className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-full px-4 py-2.5 shadow-sm min-w-[140px] text-sm text-slate-700 hover:bg-slate-50 transition"
                  >
                    <span className="capitalize">{filterType === "all" ? "All Media" : filterType}</span>
                    <svg className={`w-4 h-4 text-slate-500 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.293l3.71-4.06a.75.75 0 011.12 1L10.53 13.03a.75.75 0 01-1.06 0L5.2 8.27a.75.75 0 01.03-1.06z" clipRule="evenodd"/>
                    </svg>
                  </button>
                  
                  {showFilterDropdown && (
                    <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-100 rounded-xl shadow-lg z-20 overflow-hidden py-1">
                      {["all", "audio", "video", "image"].map((type) => (
                        <button
                          key={type}
                          onClick={() => { setFilterType(type as any); setShowFilterDropdown(false); }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-orange-50 hover:text-orange-600 transition ${filterType === type ? "bg-orange-50 text-orange-600 font-medium" : "text-slate-600"}`}
                        >
                          {type === "all" ? "All Media" : type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex bg-slate-100 p-1 rounded-full">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-full transition ${viewMode === "list" ? "bg-white text-orange-500 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    <List size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-full transition ${viewMode === "grid" ? "bg-white text-orange-500 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    <Grid size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* --- Content Area --- */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
               <div className="bg-slate-50 p-6 rounded-full mb-3">
                 <Search size={32} className="opacity-50" />
               </div>
               <p>No media found</p>
            </div>
          ) : viewMode === "list" ? (
            // LIST VIEW
            <div className="space-y-3">
              {filtered.map((m) => (
                <div key={m._id} className="group flex flex-col sm:flex-row sm:items-center gap-3 bg-[#E9FBFD] hover:bg-[#dff6fa] transition rounded-xl px-3 py-3 shadow-sm border border-transparent hover:border-orange-100">
                  
                  {/* Media Thumbnail Area (Left) */}
                  <div className="flex items-center gap-4 w-full sm:w-2/5">
                    <div 
                      className="h-16 w-24 shrink-0 rounded-lg bg-slate-200 overflow-hidden relative cursor-pointer"
                      onClick={() => openPreview(m)}
                    >
                      <MediaThumbnail file={m} normalizeUrl={normalizeUrl} />
                    </div>
                    
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate" title={m.name}>{m.name}</div>
                      <div className="text-xs text-slate-500 sm:hidden mt-1">{formatDate(m.createdAt)}</div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center justify-between sm:justify-center w-full sm:w-1/5 text-sm text-slate-600">
                    <span className="capitalize bg-white/50 px-2 py-0.5 rounded text-xs border border-slate-100">
                        {m.type}
                    </span>
                  </div>
                  <div className="hidden sm:block sm:w-1/5 text-center text-sm text-slate-600">
                    {formatDate(m.createdAt)}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-2 sm:mt-0 ml-auto">
                    {/* Play Button for Video/Audio */}
                    {(m.type === "video" || m.type === "audio") && (
                       <button onClick={() => openPreview(m)} title="Play" className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-500 hover:text-green-600 hover:scale-105 transition">
                        <Play size={14} className="ml-0.5 fill-current" />
                      </button>
                    )}
                    
                    <button onClick={() => downloadFile(m)} title="Download" className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-500 hover:text-orange-500 hover:scale-105 transition">
                      <Download size={15} />
                    </button>
                    <button onClick={() => handleDelete(m._id)} title="Delete" className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 hover:scale-105 transition">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // GRID VIEW
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((m) => (
                <div key={m._id} className="group bg-[#E9FBFD] hover:bg-[#dff6fa] rounded-xl overflow-hidden shadow-sm border border-transparent hover:border-orange-100 flex flex-col transition h-full">
                  
                  {/* Media Thumbnail Area (Top of Card) */}
                  <div 
                    className="aspect-video w-full bg-slate-200 relative cursor-pointer overflow-hidden"
                    onClick={() => openPreview(m)}
                  >
                    <MediaThumbnail file={m} normalizeUrl={normalizeUrl} />
                  </div>

                  <div className="p-3 flex flex-col flex-1">
                    <div className="mb-2">
                      <div className="text-sm font-semibold text-slate-900 truncate" title={m.name}>{m.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5 flex justify-between">
                        <span>{formatDate(m.createdAt)}</span>
                        <span className="uppercase text-[10px] bg-slate-200/50 px-1.5 rounded">{m.type}</span>
                      </div>
                    </div>
                    
                    <div className="mt-auto pt-2 flex items-center justify-end gap-2 border-t border-slate-200/50">
                       {(m.type === "video" || m.type === "audio") && (
                         <button onClick={() => openPreview(m)} className="h-8 w-8 rounded-full bg-white hover:bg-green-50 shadow-sm flex items-center justify-center text-slate-500 hover:text-green-600 transition">
                          <Play size={14} className="ml-0.5 fill-current" />
                        </button>
                       )}
                       <button onClick={() => downloadFile(m)} className="h-8 w-8 rounded-full bg-white hover:bg-orange-50 shadow-sm flex items-center justify-center text-slate-500 hover:text-orange-500 transition">
                        <Download size={14} />
                      </button>
                      <button onClick={() => handleDelete(m._id)} className="h-8 w-8 rounded-full bg-white hover:bg-red-50 shadow-sm flex items-center justify-center text-slate-500 hover:text-red-500 transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 text-sm text-slate-500 text-center sm:text-left">
            Showing {filtered.length} {filtered.length === 1 ? "item" : "items"}
          </div>
        </div>
      </div>

      {/* --- Preview Modal --- */}
      {preview && (
        <PreviewModal 
          file={preview} 
          onClose={closePreview} 
          onDownload={() => downloadFile(preview)}
          normalizeUrl={normalizeUrl}
        />
      )}
    </div>
  );
}

// --- Thumbnail Component for Grid/List ---
function MediaThumbnail({ file, normalizeUrl }: { file: MediaFile, normalizeUrl: (s: string) => string }) {
  const fullUrl = normalizeUrl(file.url);

  if (file.type === "image") {
    return (
      <img 
        src={fullUrl} 
        alt={file.name} 
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        crossOrigin="anonymous" 
        loading="lazy"
      />
    );
  }

  if (file.type === "video") {
    return (
      <div className="w-full h-full relative bg-black flex items-center justify-center group/video">
        <video 
          src={fullUrl} 
          className="w-full h-full object-cover opacity-80"
          muted 
          preload="metadata"
          crossOrigin="anonymous"
        />
        {/* Play Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover/video:scale-110 transition">
              <Play size={18} className="text-white fill-white ml-1" />
            </div>
        </div>
      </div>
    );
  }

  // Audio Fallback
  if (file.type === "audio") {
    return (
      <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-50 flex flex-col items-center justify-center text-orange-400">
         <FileAudio size={28} />
      </div>
    );
  }

  // Generic
  return (
    <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
      <AlertCircle size={24} />
    </div>
  );
}

// --- Preview Modal ---
function PreviewModal({ 
  file, 
  onClose, 
  onDownload, 
  normalizeUrl 
}: { 
  file: MediaFile, 
  onClose: () => void, 
  onDownload: () => void,
  normalizeUrl: (url: string) => string
}) {
  const fullUrl = normalizeUrl(file.url);
  const [error, setError] = useState(false);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-5xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <h3 className="text-base font-semibold text-slate-800 truncate pr-4">{file.name}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={onDownload} 
              className="p-2 rounded-full hover:bg-slate-100 text-slate-600 hover:text-orange-600 transition"
              title="Download"
            >
              <Download size={20} />
            </button>
            <button 
              onClick={onClose} 
              className="p-2 rounded-full hover:bg-red-50 text-slate-600 hover:text-red-600 transition"
              title="Close"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-black/95 flex items-center justify-center flex-1 overflow-hidden p-4 relative min-h-[400px]">
          {error ? (
            <div className="text-center text-slate-400">
              <AlertCircle size={48} className="mx-auto mb-2 text-red-400" />
              <p>Failed to load media.</p>
              <p className="text-xs mt-1 opacity-60 break-all">{fullUrl}</p>
            </div>
          ) : (
            <>
              {file.type === "image" && (
                <img 
                  key={file._id}
                  src={fullUrl} 
                  alt={file.name} 
                  className="max-w-full max-h-[70vh] object-contain rounded-md" 
                  crossOrigin="anonymous"
                  onError={() => setError(true)}
                />
              )}
              {file.type === "video" && (
                <video 
                  key={file._id}
                  controls 
                  playsInline 
                  autoPlay 
                  className="max-w-full max-h-[70vh] rounded-md focus:outline-none"
                  crossOrigin="anonymous"
                  onError={() => setError(true)}
                >
                  <source src={fullUrl} />
                  Your browser does not support the video tag.
                </video>
              )}
              {file.type === "audio" && (
                <div className="w-full max-w-md bg-white/10 p-8 rounded-2xl backdrop-blur-md flex flex-col items-center">
                    <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30 animate-pulse">
                        <Music size={40} className="text-white" />
                    </div>
                    <audio 
                      key={file._id}
                      controls 
                      autoPlay 
                      className="w-full"
                      crossOrigin="anonymous"
                      onError={() => setError(true)}
                    >
                        <source src={fullUrl} />
                        Your browser does not support the audio element.
                    </audio>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
            <span>Type: <span className="uppercase">{file.type}</span></span>
        </div>
      </div>
    </div>
  );
}