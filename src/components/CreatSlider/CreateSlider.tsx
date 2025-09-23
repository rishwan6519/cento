"use client";

import React, { useState } from "react";
import { Upload, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

interface SelectedFile {
  id: string;
  name: string;
  file: File;
  description: string;
}

interface CreateSliderProps {
  onCancel: () => void;
  onSuccess: () => void;
}

const CreateSlider: React.FC<CreateSliderProps> = ({ onCancel, onSuccess }) => {
  const [sliderName, setSliderName] = useState(""); // New field
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const generateUniqueId = () => Math.random().toString(36).substring(2, 11);

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []).map((file) => ({
      id: generateUniqueId(),
      name: file.name,
      file,
      description: "",
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleFileDelete = (id: string) => setFiles((prev) => prev.filter((file) => file.id !== id));

  const handleDescriptionChange = (id: string, value: string) => {
    setFiles((prev) =>
      prev.map((file) => (file.id === id ? { ...file, description: value } : file))
    );
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
      file,
      description: "",
    }));
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  const handleSubmit = async () => {
    if (!sliderName.trim()) {
      toast.error("Please enter a slider name");
      return;
    }

    if (files.length === 0) {
      toast.error("Please upload at least one slider image");
      return;
    }

    if (files.some((f) => f.description.trim() === "")) {
      toast.error("Each image must have a description");
      return;
    }

    const userId = localStorage.getItem("userId");
    if (!userId) {
      toast.error("User not authenticated");
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Uploading sliders...");

    try {
      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("sliderName", sliderName); // Send slider name
      files.forEach((fileObj) => {
        formData.append("files[]", fileObj.file);
        formData.append("descriptions[]", fileObj.description);
      });

      const res = await fetch("/api/sliders", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to upload slider");
      }

      toast.success("Sliders uploaded successfully", { id: loadingToast });
      setFiles([]);
      setSliderName("");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload sliders", { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm text-black max-w-3xl mx-auto">
      <div className="p-6 border-b">
        <h2 className="text-2xl font-bold">Create New Sliders</h2>
      </div>

      <div className="p-6 space-y-6">
        {/* Slider Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Slider Name</label>
          <input
            type="text"
            value={sliderName}
            onChange={(e) => setSliderName(e.target.value)}
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter slider name"
          />
        </div>

        {/* Upload Area */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Upload Slider Images</h3>
          <div
            className={`border-2 border-dashed ${
              isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
            } rounded-lg p-6 text-center hover:border-blue-500 transition-colors cursor-pointer`}
            onClick={() => document.getElementById("slider-upload")?.click()}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm font-medium text-gray-600">Click to upload or drag and drop</p>
            <p className="mt-1 text-xs text-gray-500">Supports JPG, PNG, GIF</p>
            <input
              id="slider-upload"
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={handleFileSelection}
            />
          </div>
        </div>

        {/* Preview */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Preview</h3>
          <div className="space-y-3">
            {files.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No image selected</div>
            ) : (
              files.map((file) => (
                <div key={file.id} className="bg-white rounded-lg shadow-sm p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={URL.createObjectURL(file.file)}
                        alt={file.name}
                        className="h-20 w-20 object-cover rounded"
                      />
                      <p className="text-sm text-gray-600 truncate">{file.name}</p>
                    </div>
                    <button
                      onClick={() => handleFileDelete(file.id)}
                      className="text-red-500 hover:text-red-700 p-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <textarea
                    className="w-full p-2 border rounded-lg text-sm"
                    placeholder="Enter description..."
                    value={file.description}
                    onChange={(e) => handleDescriptionChange(file.id, e.target.value)}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
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
            disabled={isLoading || files.length === 0 || !sliderName.trim()}
            className={`px-6 py-2 rounded-lg ${
              isLoading || files.length === 0 || !sliderName.trim()
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
              "Create Sliders"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateSlider;
