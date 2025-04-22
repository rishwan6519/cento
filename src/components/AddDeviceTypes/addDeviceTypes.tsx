"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";

interface AddDeviceTypeProps {
  activeSection: string;
  onCancel: () => void;
  onSuccess: (newType: any) => void;
}

const AddDeviceType: React.FC<AddDeviceTypeProps> = ({
  activeSection,
  onCancel,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [customDeviceName, setCustomDeviceName] = useState<string>("");
  const [deviceTypeImage, setDeviceTypeImage] = useState<File | null>(null);
  const [handMovements, setHandMovements] = useState<string>("");
  const [bodyMovements, setBodyMovements] = useState<string>("");
  const [screenWidth, setScreenWidth] = useState<string>("");
  const [screenHeight, setScreenHeight] = useState<string>("");

  // Skip rendering if not the active section
  if (activeSection !== "addDeviceType") {
    return null;
  }

  const addDeviceType = async () => {
    if (
      !customDeviceName ||
      !deviceTypeImage ||
      !handMovements ||
      !bodyMovements ||
      !screenWidth ||
      !screenHeight
    ) {
      toast.error("Please fill in all required fields!");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // First upload the image
      const formData = new FormData();
      formData.append("file", deviceTypeImage);
      
      const imageUploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!imageUploadResponse.ok) {
        throw new Error("Failed to upload image");
      }
      
      const imageData = await imageUploadResponse.json();
      const imageUrl = imageData.url;
      
      // Then create the device type
      const response = await fetch("/api/device-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customDeviceName,
          imageUrl: imageUrl,
          handMovements: handMovements.split(",").map((m) => m.trim()),
          bodyMovements: bodyMovements.split(",").map((m) => m.trim()),
          screenSize: {
            width: parseInt(screenWidth),
            height: parseInt(screenHeight),
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to add device type");
      }
      
      const newType = await response.json();
      toast.success("Device type added successfully!");
      
      // Reset form
      resetForm();
      
      // Notify parent of success
      onSuccess(newType);
    } catch (error) {
      console.error("Error adding device type:", error);
      toast.error("Failed to add device type!");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCustomDeviceName("");
    setDeviceTypeImage(null);
    setHandMovements("");
    setBodyMovements("");
    setScreenWidth("");
    setScreenHeight("");
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-2xl font-bold mb-6 text-black">
        Add New Device Type
      </h2>
      <div className="space-y-6">
        {/* Device Type Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Device Type Name
          </label>
          <input
            value={customDeviceName}
            onChange={(e) => setCustomDeviceName(e.target.value)}
            placeholder="Enter device type name"
            className="w-full p-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* Hand Movements */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Hand Movements
          </label>
          <input
            value={handMovements}
            onChange={(e) => setHandMovements(e.target.value)}
            placeholder="Enter hand movements (comma-separated)"
            className="w-full p-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Example: wave, grab, point
          </p>
        </div>
        
        {/* Body Movements */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Body Movements
          </label>
          <input
            value={bodyMovements}
            onChange={(e) => setBodyMovements(e.target.value)}
            placeholder="Enter body movements (comma-separated)"
            className="w-full p-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Example: walk, turn, dance
          </p>
        </div>
        
        {/* Screen Size */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Screen Size
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <input
                type="number"
                value={screenWidth}
                onChange={(e) => setScreenWidth(e.target.value)}
                placeholder="Width (px)"
                className="w-full p-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <input
                type="number"
                value={screenHeight}
                onChange={(e) => setScreenHeight(e.target.value)}
                placeholder="Height (px)"
                className="w-full p-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
        
        {/* Image Upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Device Type Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setDeviceTypeImage(e.target.files?.[0] || null)
            }
            className="w-full p-3 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={addDeviceType}
            disabled={
              isLoading ||
              !customDeviceName ||
              !deviceTypeImage ||
              !handMovements ||
              !bodyMovements ||
              !screenWidth ||
              !screenHeight
            }
            className={`px-6 py-3 rounded-lg ${
              isLoading ||
              !customDeviceName ||
              !deviceTypeImage ||
              !handMovements ||
              !bodyMovements ||
              !screenWidth ||
              !screenHeight
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            } text-white font-semibold transition-colors`}
          >
            {isLoading ? "Adding..." : "Add Device Type"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddDeviceType;