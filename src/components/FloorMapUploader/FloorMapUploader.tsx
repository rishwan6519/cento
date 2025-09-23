"use client";
import React, { useState } from "react";
import toast from "react-hot-toast";

const CLOUDINARY_UPLOAD_PRESET = "media_upload_preset";
const CLOUDINARY_CLOUD_NAME = "dzb0gggua"; // ✅ Replace if needed

export default function FloorMapUploader() {
  const [floorPlanName, setFloorPlanName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  const convertToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  const handleUpload = async () => {
    if (!file || !floorPlanName) {
      toast.error("Please provide both floor name and image");
      return;
    }

    const userId = localStorage.getItem("userId");
    if (!userId) {
      toast.error("User not logged in");
      return;
    }

    try {
      // 1. Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const cloudData = await cloudRes.json();
      if (!cloudRes.ok) {
        throw new Error(cloudData.error?.message || "Cloudinary upload failed");
      }

      const secureUrl = cloudData.secure_url || cloudData.url;

      // 2. Save metadata to your backend
      const res = await fetch("/api/floor-map", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: floorPlanName,
          userId,
          fileName: file.name,
          image: secureUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Uploaded!");
        setPreviewUrl(data.data.imageUrl || secureUrl);
      } else {
        toast.error(data.message || "Upload failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Upload error");
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg max-w-lg mx-auto mt-10 border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Upload Floor Map
      </h2>

      <div className="mb-4">
        <label
          htmlFor="floorPlanName"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Floor Plan Name
        </label>
        <input
          id="floorPlanName"
          type="text"
          className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter floor plan name"
          value={floorPlanName}
          onChange={(e) => setFloorPlanName(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label
          htmlFor="fileUpload"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Upload Image
        </label>
        <input
          id="fileUpload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="w-full text-sm file:bg-blue-600 file:text-white file:px-4 file:py-2 file:rounded-lg file:cursor-pointer"
        />
      </div>

      {previewUrl && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preview
          </label>
          <img
            src={previewUrl}
            alt="Preview"
            className="rounded-lg border w-full max-h-64 object-contain"
          />
        </div>
      )}

      <button
        onClick={handleUpload}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
      >
        Upload Floor Map
      </button>
    </div>
  );
}
