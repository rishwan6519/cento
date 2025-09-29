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

import React, { useEffect, useState } from "react";
import {
  Trash2,
  Play,
  Pause,
  Music,
  Video,
  ImageIcon,
  Search,
  List,
  Grid,
  X,
  Maximize2,
  Download,
  Heart,
  RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
/**
 * Media Library UI
 * - Recreated to match the uploaded design closely (colors, spacing, actions)
 * - Contains working Search, "All media" filter dropdown, List/Grid toggle
 * - Action buttons: Play/Pause (audio), Loop toggle, Favorite, Download, Delete
 * - Preview modal for image/video/audio
 *
 * NOTE: This component uses demo data. Replace the demo data with your API
 * fetch and wire the `url` fields to real media URLs.
 */

let audioPlayer: HTMLAudioElement | null = null; // single audio player to control audio playback

interface MediaFile {
  _id: string;
  name: string;
  type: "audio" | "video" | "image" | string; // simplified for demo
  mime?: string; // optional real mime (e.g. "audio/mp3")
  url: string;
  createdAt?: string; // ISO date or display-friendly
  size?: number;
}

export default function ShowMedia() {
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [filtered, setFiltered] = useState<MediaFile[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "audio" | "video" | "image">("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [loops, setLoops] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<MediaFile | null>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Demo data (use real API in production)
  // useEffect(() => {
  //   const demo: MediaFile[] = [
  //     { _id: "m1", name: "Morning Chill", type: "audio", url: "/demo/morning-chill.mp3", createdAt: "2025-09-11" },
  //     { _id: "m2", name: "Afternoon vibe", type: "audio", url: "/demo/afternoon-vibe.mp3", createdAt: "2025-09-11" },
  //     { _id: "m3", name: "Slow evening", type: "video", url: "/demo/slow-evening.mp4", createdAt: "2025-09-11" },
  //     { _id: "m4", name: "Relaxing song", type: "video", url: "/demo/relaxing-song.mp4", createdAt: "2025-09-11" },
  //     { _id: "m5", name: "Soothing melody for relaxation", type: "video", url: "/demo/soothing.mp4", createdAt: "2025-09-09" },
  //     { _id: "m6", name: "Relaxing song", type: "audio", url: "/demo/relaxing-2.mp3", createdAt: "2025-09-11" },
  //   ];

  //   setMedia(demo);
  //   setFiltered(demo);
  // }, []);

  // // Apply search + filter
  // useEffect(() => {
  //   const q = search.trim().toLowerCase();
  //   const out = media.filter((m) => {
  //     const matchesType = filterType === "all" ? true : m.type === filterType;
  //     const matchesSearch = q === "" ? true : m.name.toLowerCase().includes(q);
  //     return matchesType && matchesSearch;
  //   });
  //   setFiltered(out);
  // }, [search, filterType, media]);
  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const userId = localStorage.getItem("userId");
        const res = await fetch(`/api/media${userId ? `?userId=${userId}` : ""}`);
        if (!res.ok) throw new Error("Failed to fetch media");

        const data = await res.json();
        const rawList: any[] = data.media || data || [];

        // Normalize types to base categories and keep original mime
        const mediaList: MediaFile[] = rawList.map((item) => {
          const originalType: string = item.type || "";
          const category = originalType.startsWith("image/")
            ? "image"
            : originalType.startsWith("video/")
            ? "video"
            : originalType.startsWith("audio/")
            ? "audio"
            : (item.type as string) || "";
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

  // Search + type filter
  useEffect(() => {
    const q = search.trim().toLowerCase();
    const out = media.filter((m) => {
      const matchesType = filterType === "all" ? true : m.type === filterType;
      const matchesSearch = q === "" ? true : m.name.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
    setFiltered(out);
  }, [search, filterType, media]);
  // Play / Pause for audio using a single audioPlayer instance
  const togglePlay = (m: MediaFile) => {
    if (m.type !== "audio") return; // we only handle audio with this player

    // If currently playing same id -> pause
    if (playingId === m._id && audioPlayer) {
      audioPlayer.pause();
      audioPlayer = null;
      setPlayingId(null);
      return;
    }

    // If another audio was playing, stop it first
    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer = null;
      setPlayingId(null);
    }

    // start new audio
    try {
      audioPlayer = new Audio(m.url);
      audioPlayer.loop = !!loops[m._id];
      audioPlayer.play().catch((err) => {
        console.error("audio play failed", err);
        setPlayingId(null);
      });
      audioPlayer.onended = () => setPlayingId(null);
      setPlayingId(m._id);
    } catch (err) {
      console.error(err);
      setPlayingId(null);
    }
  };

  const toggleLoop = (m: MediaFile) => {
    setLoops((prev) => {
      const next = { ...prev, [m._id]: !prev[m._id] };
      if (audioPlayer && playingId === m._id) {
        audioPlayer.loop = !!next[m._id];
      }
      return next;
    });
  };

  const toggleFavorite = (m: MediaFile) => {
    setFavorites((prev) => ({ ...prev, [m._id]: !prev[m._id] }));
  };

  const downloadFile = (m: MediaFile) => {
    // If real URL, this will trigger download. For demo URLs (like "/demo/..."), browser may not download.
    const link = document.createElement("a");
    link.href = m.url.startsWith("/") || m.url.startsWith("http") ? m.url : `/${m.url}`;
    link.download = m.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const normalizeUrl = (url?: string): string => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return url.startsWith("/") ? url : `/${url}`;
  };

  const inferMimeFromUrl = (url?: string): string | undefined => {
    if (!url) return undefined;
    const lower = url.toLowerCase();
    if (lower.endsWith(".mp4")) return "video/mp4";
    if (lower.endsWith(".webm")) return "video/webm";
    if (lower.endsWith(".mov")) return "video/quicktime";
    if (lower.endsWith(".mp3")) return "audio/mpeg";
    if (lower.endsWith(".wav")) return "audio/wav";
    if (lower.endsWith(".ogg")) return "audio/ogg";
    return undefined;
  };

  // const deleteFile = (m: MediaFile) => {
  //   if (!confirm(`Delete "${m.name}" permanently?`)) return;
  //   setMedia((prev) => prev.filter((x) => x._id !== m._id));
  // };
 const handleDelete = async (id: string) => {
    try {
const res = await fetch(`/api/media/?userId=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setMedia(media.filter((m) => m._id !== id));
      toast.success("Media deleted");
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    }
  };
  const isUrlReachable = async (url: string): Promise<boolean> => {
    try {
      const res = await fetch(url, { method: "HEAD" });
      return res.ok;
    } catch {
      return false;
    }
  };
  const extractFilename = (url: string): string => {
    try {
      const parts = url.split("/");
      return parts[parts.length - 1] || url;
    } catch {
      return url;
    }
  };

  const openPreview = async (m: MediaFile) => {
    // Stop list audio if playing to avoid conflicts
    if (audioPlayer) {
      try { audioPlayer.pause(); } catch {}
      audioPlayer = null;
      setPlayingId(null);
    }

    const primaryUrl = m.url.startsWith("http") || m.url.startsWith("/") ? m.url : `/${m.url}`;
    let resolvedUrl = primaryUrl;
    if (m.type === "video" || m.type === "audio") {
      const ok = await isUrlReachable(primaryUrl);
      if (!ok) {
        // Fallback: try flat uploads root with just the filename
        const filename = extractFilename(primaryUrl);
        const flatUrl = `/uploads/${filename}`;
        const okFlat = await isUrlReachable(flatUrl);
        if (okFlat) {
          resolvedUrl = flatUrl;
        } else {
          toast.error(`File not found at ${primaryUrl}`);
          return;
        }
      }
    }
    setPreview({ ...m, url: resolvedUrl });
  };

  const closePreview = () => {
    setPreview(null);
    // pause any playing audio inside preview
    document.querySelectorAll<HTMLMediaElement>("audio,video").forEach((el) => el.pause());
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePreview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const formatDate = (d?: string) => {
    if (!d) return "Unknown";
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString();
    } catch {
      return d;
    }
  };

  return (
    // <div className="min-h-screen bg-[#EAF9FB] p-8">
    //   <div className="max-w-7xl mx-auto">
    //     <div className="bg-white rounded-2xl shadow-xl p-6">
    //       {/* Header */}
    //       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
    //         <div>
    //           <h1 className="text-slate-900 text-2xl font-semibold">Media Library</h1>
    //         </div>

    //         <div className="flex-1">
    //           {/* search + all media + view toggles */}
    //           <div className="flex items-center gap-3">
    //             {/* Search container */}
    //             <div className="flex items-center bg-white border rounded-full px-3 shadow-sm flex-1 sm:flex-none w-full sm:w-[520px]">
    //               <Search size={16} className="text-slate-400 mr-3" />
    //               <input
    //                 value={search}
    //                 onChange={(e) => setSearch(e.target.value)}
    //                 placeholder="Search media"
    //                 className="outline-none py-3 w-full text-sm"
    //               />
    //             </div>

    //             {/* All Media dropdown */}
    //             <div className="relative">
    //               <button
    //                 onClick={() => setShowFilterDropdown((s) => !s)}
    //                 className="flex items-center gap-2 bg-white border rounded-full px-4 py-2 shadow-sm text-sm"
    //               >
    //                 {filterType === "all"
    //                   ? "All media"
    //                   : filterType.charAt(0).toUpperCase() + filterType.slice(1)}
    //                 <svg
    //                   className="w-3 h-3 text-slate-600"
    //                   viewBox="0 0 20 20"
    //                   fill="currentColor"
    //                 >
    //                   <path
    //                     fillRule="evenodd"
    //                     d="M5.23 7.21a.75.75 0 011.06.02L10 11.293l3.71-4.06a.75.75 0 011.12 1L10.53 13.03a.75.75 0 01-1.06 0L5.2 8.27a.75.75 0 01.03-1.06z"
    //                     clipRule="evenodd"
    //                   />
    //                 </svg>
    //               </button>

    //               {showFilterDropdown && (
    //                 <div className="absolute right-0 mt-2 w-40 bg-white border rounded-md shadow-lg z-20">
    //                   <button
    //                     onClick={() => {
    //                       setFilterType("all");
    //                       setShowFilterDropdown(false);
    //                     }}
    //                     className={`w-full text-left px-3 py-2 text-sm ${filterType === "all" ? "bg-slate-50" : ""}`}
    //                   >
    //                     All media
    //                   </button>
    //                   <button
    //                     onClick={() => {
    //                       setFilterType("audio");
    //                       setShowFilterDropdown(false);
    //                     }}
    //                     className={`w-full text-left px-3 py-2 text-sm ${filterType === "audio" ? "bg-slate-50" : ""}`}
    //                   >
    //                     Audio
    //                   </button>
    //                   <button
    //                     onClick={() => {
    //                       setFilterType("video");
    //                       setShowFilterDropdown(false);
    //                     }}
    //                     className={`w-full text-left px-3 py-2 text-sm ${filterType === "video" ? "bg-slate-50" : ""}`}
    //                   >
    //                     Video
    //                   </button>
    //                   <button
    //                     onClick={() => {
    //                       setFilterType("image");
    //                       setShowFilterDropdown(false);
    //                     }}
    //                     className={`w-full text-left px-3 py-2 text-sm ${filterType === "image" ? "bg-slate-50" : ""}`}
    //                   >
    //                     Image
    //                   </button>
    //                 </div>
    //               )}
    //             </div>

    //             {/* View toggles */}
    //             <div className="ml-auto sm:ml-0 flex items-center gap-2">
    //               <button
    //                 onClick={() => setViewMode("list")}
    //                 title="List view"
    //                 className={`p-2 rounded-lg ${viewMode === "list" ? "bg-orange-50 text-orange-500" : "bg-white text-slate-500"} shadow-sm`}
    //               >
    //                 <List size={18} />
    //               </button>
    //               <button
    //                 onClick={() => setViewMode("grid")}
    //                 title="Grid view"
    //                 className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-orange-50 text-orange-500" : "bg-white text-slate-500"} shadow-sm`}
    //               >
    //                 <Grid size={18} />
    //               </button>
    //             </div>
    //           </div>
    //         </div>
    //       </div>

    //       {/* Content area */}
    //       <div className="mt-4">
    //         {/* List layout (rows with pill background) */}
    //         {viewMode === "list" ? (
    //           <div className="space-y-3">
    //             {filtered.map((m) => (
    //               <div key={m._id} className="flex items-center gap-4 bg-[#E9FBFD] rounded-xl px-4 py-3 shadow-sm">
    //                 <div className="flex items-center gap-3 w-1/3 min-w-[220px]">
    //                   <div className="h-10 w-10 rounded-2xl bg-[#00343A] flex items-center justify-center text-white shadow">
    //                     {/* file icon inside dark teal square */}
    //                     {m.type === "audio" && <Music size={18} />}
    //                     {m.type === "video" && <Video size={18} />}
    //                     {m.type === "image" && <ImageIcon size={18} />}
    //                   </div>
    //                   <div className="min-w-0">
    //                     <div className="text-sm font-semibold text-slate-900 truncate">{m.name}</div>
    //                   </div>
    //                 </div>

    //                 <div className="flex-1 flex justify-center text-sm text-slate-700">{m.type.charAt(0).toUpperCase() + m.type.slice(1)}</div>

    //                 <div className="w-40 text-center text-sm text-slate-700">{formatDate(m.createdAt)}</div>

    //                 <div className="flex items-center gap-2 ml-auto">
    //                   {/* Play / Pause for audio */}
    //                   {/* <button
    //                     onClick={() => togglePlay(m)}
    //                     title={playingId === m._id ? "Pause" : "Play"}
    //                     className="h-8 w-8 rounded-full bg-white shadow flex items-center justify-center hover:scale-95 transition"
    //                   >
    //                     {m.type === "audio" && playingId === m._id ? (
    //                       <Pause size={14} className="text-orange-500" />
    //                     ) : (
    //                       <Play size={14} className="text-orange-500" />
    //                     )}
    //                   </button> */}

    //                   {/* Loop/Repeat */}
    //                   {/* <button
    //                     onClick={() => toggleLoop(m)}
    //                     title={loops[m._id] ? "Loop on" : "Loop off"}
    //                     className={`h-8 w-8 rounded-full bg-white shadow flex items-center justify-center ${loops[m._id] ? "ring-2 ring-orange-100" : ""}`}
    //                   >
    //                     <RotateCcw size={14} className="text-orange-500" />
    //                   </button> */}

    //                   {/* Favorite */}
    //                   {/* <button
    //                     onClick={() => toggleFavorite(m)}
    //                     title={favorites[m._id] ? "Remove favourite" : "Add favourite"}
    //                     className="h-8 w-8 rounded-full bg-white shadow flex items-center justify-center"
    //                   >
    //                     <Heart size={14} className={favorites[m._id] ? "text-orange-500" : "text-slate-400"} />
    //                   </button> */}

    //                   {/* Download */}
    //                   <button
    //                     onClick={() => downloadFile(m)}
    //                     title="Download"
    //                     className="h-8 w-8 rounded-full bg-white shadow flex items-center justify-center"
    //                   >
    //                     <Download size={14} className="text-orange-500" />
    //                   </button>

    //                   {/* Delete */}
    //                   <button
    //                    onClick={() => handleDelete(m._id)}
    //                     title="Delete"
    //                     className="h-8 w-8 rounded-full bg-white shadow flex items-center justify-center hover:bg-red-50"
    //                   >
    //                     <Trash2 size={14} className="text-red-500" />
    //                   </button>

    //                   {/* Preview / Expand */}
    //                   <button
    //                     onClick={() => openPreview(m)}
    //                     title="Preview"
    //                     className="h-8 w-8 rounded-full bg-white shadow flex items-center justify-center"
    //                   >
    //                     <Maximize2 size={14} className="text-orange-500" />
    //                   </button>
    //                 </div>
    //               </div>
    //             ))}
    //           </div>
    //         ) : (
    //           // Grid view - card like
    //           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    //             {filtered.map((m) => (
    //               <div key={m._id} className="bg-[#E9FBFD] rounded-xl p-4 shadow-sm">
    //                 <div className="flex items-center gap-3 mb-3">
    //                   <div className="h-10 w-10 rounded-2xl bg-[#00343A] flex items-center justify-center text-white shadow">
    //                     {m.type === "audio" && <Music size={18} />}
    //                     {m.type === "video" && <Video size={18} />}
    //                     {m.type === "image" && <ImageIcon size={18} />}
    //                   </div>
    //                   <div>
    //                     <div className="text-sm font-semibold text-slate-900 truncate">{m.name}</div>
    //                     <div className="text-xs text-slate-600">{formatDate(m.createdAt)}</div>
    //                   </div>
    //                 </div>

    //                 <div className="flex items-center gap-2 mt-2">
    //                   {/* <button
    //                     onClick={() => togglePlay(m)}
    //                     className="h-9 w-9 rounded-full bg-white shadow flex items-center justify-center"
    //                   >
    //                     {m.type === "audio" && playingId === m._id ? (
    //                       <Pause size={16} className="text-orange-500" />
    //                     ) : (
    //                       <Play size={16} className="text-orange-500" />
    //                     )}
    //                   </button> */}

    //                   {/* <button onClick={() => toggleLoop(m)} className="h-9 w-9 rounded-full bg-white shadow flex items-center justify-center">
    //                     <RotateCcw size={16} className={`text-orange-500 ${loops[m._id] ? "opacity-100" : "opacity-80"}`} />
    //                   </button> */}

    //                   {/* <button onClick={() => toggleFavorite(m)} className="h-9 w-9 rounded-full bg-white shadow flex items-center justify-center">
    //                     <Heart size={16} className={favorites[m._id] ? "text-orange-500" : "text-slate-400"} />
    //                   </button> */}

    //                   <button onClick={() => downloadFile(m)} className="h-9 w-9 rounded-full bg-white shadow flex items-center justify-center">
    //                     <Download size={16} className="text-orange-500" />
    //                   </button>

    //                   <button onClick={() => handleDelete(m._id)} className="h-9 w-9 rounded-full bg-white shadow flex items-center justify-center hover:bg-red-50">
    //                     <Trash2 size={16} className="text-red-500" />
    //                   </button>

    //                   <button onClick={() => openPreview(m)} className="ml-auto h-9 w-9 rounded-full bg-white shadow flex items-center justify-center">
    //                     <Maximize2 size={16} className="text-orange-500" />
    //                   </button>
    //                 </div>
    //               </div>
    //             ))}
    //           </div>
    //         )}

    //         {/* Footer count */}
    //         <div className="mt-6 text-sm text-slate-600">{filtered.length} {filtered.length === 1 ? "item" : "items"}</div>
    //       </div>
    //     </div>
    //   </div>

    //   {/* Preview Modal */}
    //   {preview && (
    //     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
    //       <div className="bg-white rounded-lg max-w-4xl w-full overflow-hidden">
    //         <div className="flex items-center justify-between p-4 border-b">
    //           <div className="text-sm font-medium truncate max-w-[70%]">{preview.name}</div>
    //           <div className="flex items-center gap-2">
    //             <button onClick={() => downloadFile(preview)} className="p-2 rounded hover:bg-slate-50">
    //               <Download size={18} className="text-orange-500" />
    //             </button>
    //             <button onClick={closePreview} className="p-2 rounded hover:bg-slate-50">
    //               <X size={18} />
    //             </button>
    //           </div>
    //         </div>

    //         <div className="bg-black flex items-center justify-center" style={{ height: "60vh" }}>
    //           {(() => {
    //             const url = normalizeUrl(preview.url);
    //             const mime = preview.mime || inferMimeFromUrl(url);
    //             if (preview.type === "image") {
    //               return (
    //                 <img src={url} alt={preview.name} className="max-w-full max-h-full object-contain" />
    //               );
    //             }
    //             if (preview.type === "video") {
    //               return (
    //                 <video controls playsInline preload="metadata" className="max-w-full max-h-full pointer-events-auto" onError={() => toast.error("Unable to load or play this video")}>
    //                   <source src={url} type={mime || "video/mp4"} />
    //                 </video>
    //               );
    //             }
    //             if (preview.type === "audio") {
    //               return (
    //                 <div className="p-6 w-full max-w-2xl bg-white rounded-md">
    //                   <audio controls preload="metadata" className="w-full pointer-events-auto" onError={() => toast.error("Unable to load or play this audio")}>
    //                     <source src={url} type={mime || "audio/mpeg"} />
    //                   </audio>
    //                 </div>
    //               );
    //             }
    //             return null;
    //           })()}
    //         </div>

    //         <div className="p-3 border-t flex items-center justify-between">
    //           <div className="text-xs text-slate-600">{preview.type} • {formatDate(preview.createdAt)}</div>
    //           <div>
    //             <button onClick={closePreview} className="px-4 py-2 bg-slate-100 rounded">Close</button>
    //           </div>
    //         </div>
    //       </div>
    //     </div>
    //   )}
    // </div>
    <div className="min-h-screen bg-[#EAF9FB] p-4 sm:p-8">
  <div className="max-w-7xl mx-auto">
    <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <h1 className="text-slate-900 text-xl sm:text-2xl font-semibold truncate">
          Media Library
        </h1>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {/* Search */}
          <div className="flex items-center bg-white border rounded-full px-3 shadow-sm flex-1 sm:flex-none w-full sm:w-[320px]">
            <Search size={16} className="text-slate-400 mr-2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search media"
              className="outline-none py-2 sm:py-3 w-full text-sm"
            />
          </div>

          {/* Filter Dropdown */}
          <div className="relative w-full sm:w-auto">
            <button
              onClick={() => setShowFilterDropdown((s) => !s)}
              className="flex items-center justify-between gap-2 bg-white border rounded-full px-4 py-2 shadow-sm w-full sm:w-auto text-sm"
            >
              {filterType === "all" ? "All media" : filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              <svg className="w-3 h-3 text-slate-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.293l3.71-4.06a.75.75 0 011.12 1L10.53 13.03a.75.75 0 01-1.06 0L5.2 8.27a.75.75 0 01.03-1.06z" clipRule="evenodd"/>
              </svg>
            </button>
            {showFilterDropdown && (
              <div className="absolute right-0 mt-2 w-40 bg-white border rounded-md shadow-lg z-20">
                {["all", "audio", "video", "image"].map((type) => (
                  <button
                    key={type}
                    onClick={() => { setFilterType(type as any); setShowFilterDropdown(false); }}
                    className={`w-full text-left px-3 py-2 text-sm ${filterType === type ? "bg-slate-50" : ""}`}
                  >
                    {type === "all" ? "All media" : type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View toggles */}
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <button onClick={() => setViewMode("list")} title="List view" className={`p-2 rounded-lg ${viewMode === "list" ? "bg-orange-50 text-orange-500" : "bg-white text-slate-500"} shadow-sm`}>
              <List size={18} />
            </button>
            <button onClick={() => setViewMode("grid")} title="Grid view" className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-orange-50 text-orange-500" : "bg-white text-slate-500"} shadow-sm`}>
              <Grid size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === "list" ? (
        <div className="space-y-3">
          {filtered.map((m) => (
            <div key={m._id} className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 bg-[#E9FBFD] rounded-xl px-3 py-2 sm:px-4 sm:py-3 shadow-sm">
              <div className="flex items-center gap-2 w-full sm:w-1/3 min-w-[180px]">
                <div className="h-10 w-10 rounded-2xl bg-[#00343A] flex items-center justify-center text-white shadow">
                  {m.type === "audio" && <Music size={18} />}
                  {m.type === "video" && <Video size={18} />}
                  {m.type === "image" && <ImageIcon size={18} />}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{m.name}</div>
                </div>
              </div>
              <div className="flex-1 flex justify-between sm:justify-center text-sm text-slate-700 w-full">
                <div className="truncate">{m.type.charAt(0).toUpperCase() + m.type.slice(1)}</div>
                <div className="hidden sm:block w-40 text-center">{formatDate(m.createdAt)}</div>
              </div>

              <div className="flex gap-2 ml-auto flex-wrap mt-2 sm:mt-0">
                <button onClick={() => downloadFile(m)} title="Download" className="h-8 w-8 rounded-full bg-white shadow flex items-center justify-center">
                  <Download size={14} className="text-orange-500" />
                </button>
                <button onClick={() => handleDelete(m._id)} title="Delete" className="h-8 w-8 rounded-full bg-white shadow flex items-center justify-center hover:bg-red-50">
                  <Trash2 size={14} className="text-red-500" />
                </button>
                <button onClick={() => openPreview(m)} title="Preview" className="h-8 w-8 rounded-full bg-white shadow flex items-center justify-center">
                  <Maximize2 size={14} className="text-orange-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((m) => (
            <div key={m._id} className="bg-[#E9FBFD] rounded-xl p-3 sm:p-4 shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-10 w-10 rounded-2xl bg-[#00343A] flex items-center justify-center text-white shadow">
                  {m.type === "audio" && <Music size={18} />}
                  {m.type === "video" && <Video size={18} />}
                  {m.type === "image" && <ImageIcon size={18} />}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{m.name}</div>
                  <div className="text-xs text-slate-600">{formatDate(m.createdAt)}</div>
                </div>
              </div>
              <div className="flex gap-2 mt-auto flex-wrap">
                <button onClick={() => downloadFile(m)} className="h-9 w-9 rounded-full bg-white shadow flex items-center justify-center">
                  <Download size={16} className="text-orange-500" />
                </button>
                <button onClick={() => handleDelete(m._id)} className="h-9 w-9 rounded-full bg-white shadow flex items-center justify-center hover:bg-red-50">
                  <Trash2 size={16} className="text-red-500" />
                </button>
                <button onClick={() => openPreview(m)} className="ml-auto h-9 w-9 rounded-full bg-white shadow flex items-center justify-center">
                  <Maximize2 size={16} className="text-orange-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer count */}
      <div className="mt-4 text-sm text-slate-600">{filtered.length} {filtered.length === 1 ? "item" : "items"}</div>
    </div>
  </div>

 {/* Preview Modal */}
       {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="text-sm font-medium truncate max-w-[70%]">{preview.name}</div>
              <div className="flex items-center gap-2">
                <button onClick={() => downloadFile(preview)} className="p-2 rounded hover:bg-slate-50">
                  <Download size={18} className="text-orange-500" />
                </button>
                <button onClick={closePreview} className="p-2 rounded hover:bg-slate-50">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="bg-black flex items-center justify-center" style={{ height: "60vh" }}>
              {(() => {
                const url = normalizeUrl(preview.url);
                const mime = preview.mime || inferMimeFromUrl(url);
                if (preview.type === "image") {
                  return (
                    <img src={url} alt={preview.name} className="max-w-full max-h-full object-contain" />
                  );
                }
                if (preview.type === "video") {
                  return (
                    <video controls playsInline preload="metadata" className="max-w-full max-h-full pointer-events-auto" onError={() => toast.error("Unable to load or play this video")}>
                      <source src={url} type={mime || "video/mp4"} />
                    </video>
                  );
                }
                if (preview.type === "audio") {
                  return (
                    <div className="p-6 w-full max-w-2xl bg-white rounded-md">
                      <audio controls preload="metadata" className="w-full pointer-events-auto" onError={() => toast.error("Unable to load or play this audio")}>
                        <source src={url} type={mime || "audio/mpeg"} />
                      </audio>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className="p-3 border-t flex items-center justify-between">
              <div className="text-xs text-slate-600">{preview.type} • {formatDate(preview.createdAt)}</div>
              <div>
                <button onClick={closePreview} className="px-4 py-2 bg-slate-100 rounded">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
</div>

  );
}
