"use client";

import React, { useState, useEffect, useRef } from "react";
import { Upload, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface SelectedFile {
  id: string;
  name: string;
  type: string;
  file: File;
  previewUrl: string; // Storing the URL here prevents flickering
  status: "uploading" | "completed" | "failed" | "pending";
  progress: number;   // Real progress 0-100
}

interface CreateMediaProps {
  onCancel: () => void;
  onSuccess: () => void;
}

const CreateMedia: React.FC<CreateMediaProps> = ({ onCancel, onSuccess }) => {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Cleanup object URLs when component unmounts to prevent memory leaks
  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
  }, []);

  const generateUniqueId = () => Math.random().toString(36).substring(2, 11);

  const getFileType = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) return "image/jpeg";
    if (["mp4", "webm", "mov"].includes(ext || "")) return "video/mp4";
    if (["mp3", "wav", "ogg"].includes(ext || "")) return "audio/mpeg";
    return "application/octet-stream";
  };

  const processFiles = (incomingFiles: File[]) => {
    const newFiles: SelectedFile[] = incomingFiles.map((file) => ({
      id: generateUniqueId(),
      name: file.name,
      type: file.type || getFileType(file.name),
      file,
      previewUrl: URL.createObjectURL(file), // Generate ONCE
      status: "pending",
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) processFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileDelete = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  // Helper: Upload a single file with progress tracking
  const uploadFileWithProgress = (fileObj: SelectedFile, userId: string) => {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      // Maintain your specific backend field names
      formData.append("files[0]", fileObj.file);
      formData.append("fileNames[0]", fileObj.name);
      formData.append("userId", userId);

      xhr.open("POST", "/api/media/upload", true);

      // Track Progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileObj.id ? { ...f, status: "uploading", progress: percent } : f
            )
          );
        }
      };

      // Handle Success/Error
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setFiles((prev) =>
            prev.map((f) => (f.id === fileObj.id ? { ...f, status: "completed", progress: 100 } : f))
          );
          resolve();
        } else {
          try {
            const resp = JSON.parse(xhr.responseText);
            reject(new Error(resp.message || "Upload failed"));
          } catch {
            reject(new Error("Upload failed"));
          }
        }
      };

      xhr.onerror = () => reject(new Error("Network error"));

      xhr.send(formData);
    });
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
      // Filter only files that haven't completed yet
      const filesToUpload = files.filter(f => f.status !== "completed");

      // Upload sequentially (or use Promise.all for parallel)
      for (const fileObj of filesToUpload) {
        try {
            await uploadFileWithProgress(fileObj, userId);
        } catch (err) {
            console.error(err);
            setFiles((prev) => prev.map((f) => (f.id === fileObj.id ? { ...f, status: "failed" } : f)));
        }
      }

      const anyFailed = files.some(f => f.status === "failed");
      
      if (!anyFailed) {
        toast.success("All files uploaded successfully", { id: loadingToast });
        setFiles([]);
        onSuccess();
      } else {
        toast.error("Some files failed to upload", { id: loadingToast });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Unexpected error occurred", { id: loadingToast });
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
                Supports image files
              </p>
              <input
                id="media-upload"
                type="file"
                multiple
                hidden
                accept="image/*"
                onChange={handleFileSelection}
              />
            </div>
          </div>

          {/* Preview Section */}
          <div>
            <h3 className="font-semibold mb-3">Media Preview</h3>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
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
                      
                      {/* 
                         Using file.previewUrl instead of URL.createObjectURL(file.file) 
                         prevents the player from resetting/flickering during state updates 
                      */}
                      {file.type.startsWith("audio/") && (
                        <audio controls className="w-full mt-2" src={file.previewUrl} />
                      )}
                      {file.type.startsWith("video/") && (
                        <video controls className="w-full mt-2 h-20 rounded object-cover" src={file.previewUrl} />
                      )}
                      {file.type.startsWith("image/") && (
                        <img src={file.previewUrl} alt={file.name} className="mt-2 h-20 w-20 object-cover rounded" />
                      )}

                      {/* Progress Bar */}
                      <div className="w-full h-1 bg-gray-200 rounded mt-2 overflow-hidden">
                        <div
                          className={`h-1 rounded transition-all duration-200 ease-out ${
                            file.status === "failed" ? "bg-red-500" :
                            file.status === "completed" ? "bg-green-500" :
                            "bg-orange-500"
                          }`}
                          // If pending/uploading but 0, show a tiny bit so they know it's there
                          style={{ width: `${Math.max(file.progress, 0)}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex justify-between mt-1">
                        <p className="text-xs text-gray-500">
                            {file.status === "pending" && "Ready to upload"}
                            {file.status === "uploading" && `Uploading... ${file.progress}%`}
                            {file.status === "completed" && "Upload completed"}
                            {file.status === "failed" && "Upload failed"}
                        </p>
                      </div>
                    </div>
                    
                    <button 
                        onClick={() => handleFileDelete(file.id)} 
                        className="text-red-500 hover:text-red-700 ml-4 p-2"
                        disabled={isLoading}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-center gap-4 mt-12">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-6 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || files.length === 0}
            className={`px-6 py-2 rounded-md text-white transition-colors ${
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