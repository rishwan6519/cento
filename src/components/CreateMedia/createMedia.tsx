"use client";

import React, { useState } from "react";
import { Upload, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface SelectedFile {
  id: string;
  name: string;
  type: string;
  file: File;
}

interface CreateMediaProps {
  onCancel: () => void;
  onSuccess: () => void;
}

const CreateMedia: React.FC<CreateMediaProps> = ({
  onCancel,
  onSuccess
}) => {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

 

  const generateUniqueId = () => {
    return Math.random().toString(36).substr(2, 9);
  };

  const getFileType = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif"].includes(ext || "")) return "image";
    if (["mp4", "webm"].includes(ext || "")) return "video";
    if (["mp3", "wav"].includes(ext || "")) return "audio";
    return "unknown";
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []).map((file) => ({
      id: generateUniqueId(),
      name: file.name,
      type: file.type || getFileType(file.name),
      file: file,
    }));
    
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleFileDelete = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files).map((file) => ({
      id: generateUniqueId(),
      name: file.name,
      type: file.type || getFileType(file.name),
      file: file,
    }));
    
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one file");
      return;
    }
    
    setIsLoading(true);
    const loadingToast = toast.loading("Uploading media files...");
    
    try {

      const userId = localStorage.getItem("userId");
    if (!userId) {
      throw new Error("User not authenticated");
    }

      const formData = new FormData();
      
      // Add all files to form data
      files.forEach((file) => {
        formData.append("files", file.file);
        formData.append("fileNames", file.name);
      });
      
      formData.append("userId", userId);
      // Make the API call
      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload media files");
      }
      
      const data = await response.json();
      
      // Show success message
      toast.success("Media uploaded successfully!", {
        id: loadingToast,
      });
      
      // Reset the form
      setFiles([]);
      
      // Notify parent component
      onSuccess();
    } catch (error) {
      console.error("Error uploading media:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload media files",
        { id: loadingToast }
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm text-black">
      <div className="p-6 border-b">
        <h2 className="text-2xl font-bold">Create New Media</h2>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Upload Section */}
          <div className="space-y-6">
            <div className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Upload Media
              </h3>
              <div
                className={`border-2 border-dashed ${
                  isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
                } rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer`}
                onClick={() =>
                  document.getElementById("media-upload")?.click()
                }
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm font-medium text-gray-600">
                  Click to upload or drag and drop
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Supports images, videos, and audio files
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
          </div>
          {/* Right Column - Preview Section */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-4">
              Media Preview
            </h3>
            <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
              {files.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No files selected yet
                </div>
              ) : (
                files.map((file) => (
                  <div
                    key={file.id}
                    className="bg-white rounded-lg shadow-sm p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {file.type.startsWith("image/") && (
                          <img
                            src={URL.createObjectURL(file.file)}
                            alt={file.name}
                            className="h-20 w-20 object-cover rounded"
                          />
                        )}
                        {file.type.startsWith("video/") && (
                          <video
                            src={URL.createObjectURL(file.file)}
                            className="h-20 w-20 object-cover rounded"
                            controls
                          />
                        )}
                        {file.type.startsWith("audio/") && (
                          <audio
                            src={URL.createObjectURL(file.file)}
                            className="max-w-full"
                            controls
                          />
                        )}
                        <p className="text-sm text-gray-600 truncate">
                          {file.name}
                        </p>
                      </div>
                      <button
                        onClick={() => handleFileDelete(file.id)}
                        className="text-red-500 hover:text-red-700 p-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="p-6 border-t bg-gray-50">
        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-6 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || files.length === 0}
            className={`px-6 py-2 rounded-lg ${
              isLoading || files.length === 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            } text-white`}
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