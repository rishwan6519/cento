// "use client";

// import React, { useState } from "react";
// import { Upload, Trash2 } from "lucide-react";
// import toast from "react-hot-toast";

// interface SelectedFile {
//   id: string;
//   name: string;
//   type: string;
//   file: File;
// }

// interface CreateMediaProps {
//   onCancel: () => void;
//   onSuccess: () => void;
// }

// // ✅ You can move these to env variables later
// const CLOUDINARY_UPLOAD_PRESET = "media_upload_preset";
// const CLOUDINARY_CLOUD_NAME = "dzb0gggua"; // ✅ Replace if needed

// const CreateMedia: React.FC<CreateMediaProps> = ({ onCancel, onSuccess }) => {
//   const [files, setFiles] = useState<SelectedFile[]>([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isDragging, setIsDragging] = useState(false);

//   const generateUniqueId = () => Math.random().toString(36).substring(2, 11);

//   const getFileType = (fileName: string) => {
//     const ext = fileName.split(".").pop()?.toLowerCase();
//     if (["jpg", "jpeg", "png", "gif"].includes(ext || "")) return "image";
//     if (["mp4", "webm"].includes(ext || "")) return "video";
//     if (["mp3", "wav"].includes(ext || "")) return "audio";
//     return "unknown";
//   };

//   const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const newFiles = Array.from(e.target.files || []).map((file) => ({
//       id: generateUniqueId(),
//       name: file.name,
//       type: file.type || getFileType(file.name),
//       file: file,
//     }));
//     setFiles((prev) => [...prev, ...newFiles]);
//   };

//   const handleFileDelete = (id: string) => {
//     setFiles((prev) => prev.filter((file) => file.id !== id));
//   };

//   const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
//     e.preventDefault();
//     setIsDragging(true);
//   };

//   const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
//     e.preventDefault();
//     setIsDragging(false);
//   };

//   const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
//     e.preventDefault();
//     setIsDragging(false);
//     const droppedFiles = Array.from(e.dataTransfer.files).map((file) => ({
//       id: generateUniqueId(),
//       name: file.name,
//       type: file.type || getFileType(file.name),
//       file: file,
//     }));
//     setFiles((prev) => [...prev, ...droppedFiles]);
//   };

//   const handleSubmit = async () => {
//     if (files.length === 0) {
//       toast.error("Please select at least one file");
//       return;
//     }

//     if (!CLOUDINARY_UPLOAD_PRESET) {
//       toast.error("Uploading preset not found");
//       return;  
//     }

//     const userId = localStorage.getItem("userId");
//     if (!userId) {
//       toast.error("User not authenticated");
//       return;
//     }

//     setIsLoading(true);
//     const loadingToast = toast.loading("Uploading media files...");

//     try {
//       const uploadedItems = [];

//       for (const fileObj of files) {
//         // Cloudinary Upload
//         const formData = new FormData();
//         formData.append("file", fileObj.file);
//         formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

//         const cloudRes = await fetch(
//           `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
//           {
//             method: "POST",
//             body: formData,
//           }
//         );

//         const cloudData = await cloudRes.json();
//         if (!cloudRes.ok) {
//           throw new Error(cloudData.error?.message || "Cloudinary upload failed");
//         }

//         const secureUrl = cloudData.secure_url || cloudData.url;

//         // Save Metadata to DB
//         const metadataRes = await fetch("/api/media/upload", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({
//             userId,
//             name: fileObj.name,
//             type: fileObj.type,
//             url: secureUrl,
//           }),
//         });

//         if (!metadataRes.ok) {
//           const errorMeta = await metadataRes.json();
//           throw new Error(errorMeta.message || "Failed to save metadata");
//         }

//         const saved = await metadataRes.json();
//         uploadedItems.push(saved);
//       }

//       toast.success("Media files uploaded successfully", { id: loadingToast });
//       setFiles([]);
//       onSuccess();
//     } catch (error) {
//       console.error("Upload error:", error);
//       toast.error(
//         error instanceof Error ? error.message : "Failed to upload media files",
//         { id: loadingToast }
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="bg-white rounded-xl shadow-sm text-black">
//       <div className="p-6 border-b">
//         <h2 className="text-2xl font-bold">Create New Media</h2>
//       </div>

//       <div className="p-6">
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//           {/* Upload Area */}
//           <div className="space-y-6">
//             <h3 className="text-lg font-semibold text-gray-800">Upload Media</h3>
//             <div
//               className={`border-2 border-dashed ${
//                 isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
//               } rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer`}
//               onClick={() => document.getElementById("media-upload")?.click()}
//               onDragEnter={handleDragEnter}
//               onDragLeave={handleDragLeave}
//               onDragOver={(e) => e.preventDefault()}
//               onDrop={handleDrop}
//             >
//               <Upload className="mx-auto h-12 w-12 text-gray-400" />
//               <p className="mt-2 text-sm font-medium text-gray-600">
//                 Click to upload or drag and drop
//               </p>
//               <p className="mt-1 text-xs text-gray-500">
//                 Supports images, videos, and audio files
//               </p>
//               <input
//                 id="media-upload"
//                 type="file"
//                 multiple
//                 hidden
//                 accept="image/*,video/*,audio/*"
//                 onChange={handleFileSelection}
//               />
//             </div>
//           </div>

//           {/* File Preview */}
//           <div className="bg-gray-50 rounded-lg p-4">
//             <h3 className="font-semibold text-gray-800 mb-4">Media Preview</h3>
//             <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
//               {files.length === 0 ? (
//                 <div className="text-center py-8 text-gray-500">
//                   No files selected yet
//                 </div>
//               ) : (
//                 files.map((file) => (
//                   <div
//                     key={file.id}
//                     className="bg-white rounded-lg shadow-sm p-3"
//                   >
//                     <div className="flex items-center justify-between">
//                       <div className="flex items-center gap-3">
//                         {file.type.startsWith("image/") && (
//                           <img
//                             src={URL.createObjectURL(file.file)}
//                             alt={file.name}
//                             className="h-20 w-20 object-cover rounded"
//                           />
//                         )}
//                         {file.type.startsWith("video/") && (
//                           <video
//                             src={URL.createObjectURL(file.file)}
//                             className="h-20 w-20 object-cover rounded"
//                             controls
//                           />
//                         )}
//                         {file.type.startsWith("audio/") && (
//                           <audio
//                             src={URL.createObjectURL(file.file)}
//                             className="max-w-full"
//                             controls
//                           />
//                         )}
//                         <p className="text-sm text-gray-600 truncate">
//                           {file.name}
//                         </p>
//                       </div>
//                       <button
//                         onClick={() => handleFileDelete(file.id)}
//                         className="text-red-500 hover:text-red-700 p-2"
//                       >
//                         <Trash2 size={16} />
//                       </button>
//                     </div>
//                   </div>
//                 ))
//               )}
//             </div>
//           </div>
//         </div>
//       </div>

//       <div className="p-6 border-t bg-gray-50">
//         <div className="flex justify-end gap-4">
//           <button
//             onClick={onCancel}
//             disabled={isLoading}
//             className="px-6 py-2 text-gray-700 hover:text-gray-900"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={handleSubmit}
//             disabled={isLoading || files.length === 0}
//             className={`px-6 py-2 rounded-lg ${
//               isLoading || files.length === 0
//                 ? "bg-gray-400 cursor-not-allowed"
//                 : "bg-blue-600 hover:bg-blue-700"
//             } text-white`}
//           >
//             {isLoading ? (
//               <div className="flex items-center gap-2">
//                 <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
//                 <span>Uploading...</span>
//               </div>
//             ) : (
//               "Create Media"
//             )}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };
"use client";

import React, { useState } from "react";
import { Upload, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface SelectedFile {
  id: string;
  name: string;
  type: string;
  file: File;
  status: "uploading" | "completed" | "failed";
}

interface CreateMediaProps {
  onCancel: () => void;
  onSuccess: () => void;
}

const CreateMedia: React.FC<CreateMediaProps> = ({ onCancel, onSuccess }) => {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const generateUniqueId = () => Math.random().toString(36).substring(2, 11);

  const getFileType = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "png":
        return "image/png";
      case "gif":
        return "image/gif";
      case "webp":
        return "image/webp";
      case "mp4":
        return "video/mp4";
      case "webm":
        return "video/webm";
      case "mov":
        return "video/quicktime";
      case "mp3":
        return "audio/mpeg";
      case "wav":
        return "audio/wav";
      case "ogg":
        return "audio/ogg";
      default:
        return "application/octet-stream";
    }
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles: SelectedFile[] = Array.from(e.target.files || []).map((file) => ({
      id: generateUniqueId(),
      name: file.name,
      type: file.type || getFileType(file.name),
      file,
      status: "uploading",
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles: SelectedFile[] = Array.from(e.dataTransfer.files).map((file) => ({
      id: generateUniqueId(),
      name: file.name,
      type: file.type || getFileType(file.name),
      file,
      status: "uploading",
    }));
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  const handleFileDelete = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one file");
      return;
    }

    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (!userId) {
      toast.error("User not authenticated");
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Uploading media files...");

    try {
      for (const fileObj of files) {
        try {
          setFiles((prev) => prev.map((f) => (f.id === fileObj.id ? { ...f, status: "uploading" } : f)));

          // Backend upload
          const formData = new FormData();
          formData.append("files[0]", fileObj.file);
          formData.append("fileNames[0]", fileObj.name);
          formData.append("userId", userId);

          const res = await fetch("/api/media/upload", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const errJson = await res.json();
            throw new Error(errJson?.message || "Backend upload failed");
          }

          setFiles((prev) => prev.map((f) => (f.id === fileObj.id ? { ...f, status: "completed" } : f)));
        } catch (err) {
          setFiles((prev) => prev.map((f) => (f.id === fileObj.id ? { ...f, status: "failed" } : f)));
          toast.error(err instanceof Error ? err.message : "Failed to upload this file");
        }
      }

      const anyFailed = files.some((f) => f.status === "failed");
      if (!anyFailed) {
        toast.success("Media files uploaded successfully", { id: loadingToast });
        setFiles([]);
        onSuccess();
      } else {
        toast("Some files failed to upload.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload media files", { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#DFF4F7] min-h-screen flex justify-center items-center p-6">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-7xl p-6 min-h-[500px]">
        <h2 className="text-lg font-semibold mb-6">Let's create new media</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <div>
            <h3 className="font-semibold mb-3">Upload Media</h3>
            <div
              className={`border-2 border-dashed rounded-lg h-64 flex flex-col items-center justify-center cursor-pointer transition ${
                isDragging ? "border-teal-500 bg-teal-50" : "border-gray-300"
              }`}
              onClick={() => document.getElementById("media-upload")?.click()}
              onDragEnter={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 text-orange-500" />
              <p className="mt-2 text-gray-600 text-sm font-medium">
                Click to upload or drag & drop it here
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Supports images, audio and video files
              </p>
              <input
                id="media-upload"
                type="file"
                multiple
                hidden
                accept="image/*,video/*,audio/*"
                onChange={handleFileSelection}
              />
            </div>
          </div>

          {/* Preview Section */}
          <div>
            <h3 className="font-semibold mb-3">Media Preview</h3>
            <div className="space-y-4">
              {files.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No files selected yet
                </div>
              ) : (
                files.map((file) => (
                  <div
                    key={file.id}
                    className="bg-[#EAF8FC] rounded-lg p-4 shadow flex justify-between items-center"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{file.name}</p>
                      {file.type.startsWith("audio/") && (
                        <audio controls className="w-full mt-2" src={URL.createObjectURL(file.file)} />
                      )}
                      {file.type.startsWith("video/") && (
                        <video controls className="w-full mt-2 h-20 rounded" src={URL.createObjectURL(file.file)} />
                      )}
                      {file.type.startsWith("image/") && (
                        <img src={URL.createObjectURL(file.file)} alt={file.name} className="mt-2 h-20 w-20 object-cover rounded" />
                      )}

                      <div className="w-full h-1 bg-gray-200 rounded mt-2">
                        <div
                          className={`h-1 rounded ${
                            file.status === "uploading"
                              ? "bg-orange-500 w-1/2 animate-pulse"
                              : "bg-green-500 w-full"
                          }`}
                        ></div>
                      </div>
                      <p className="text-xs mt-1 text-gray-500">
                        {file.status === "uploading" ? "Uploading..." : "Upload completed"}
                      </p>
                    </div>
                    <button onClick={() => handleFileDelete(file.id)} className="text-red-500 hover:text-red-700 ml-4">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-center gap-4 mt-30">
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || files.length === 0}
            className={`px-6 py-2 rounded-md text-white ${
              isLoading || files.length === 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-teal-700 hover:bg-teal-800"
            }`}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Uploading...</span>
              </div>
            ) : (
              "Create Media"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateMedia;
