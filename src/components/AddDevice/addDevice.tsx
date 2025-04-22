"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

interface DeviceType {
  id: string;
  name: string;
  type?: string;
  description?: string;
  imageUrl?: string;
}

interface AddDeviceProps {
  activeSection: string;
  deviceTypes: DeviceType[];
  onCancel: () => void;
  onSuccess: () => void;
}

const AddDevice: React.FC<AddDeviceProps> = ({
  activeSection,
  deviceTypes,
  onCancel,
  onSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [newDevice, setNewDevice] = useState<{
    name: string;
    typeId: string;
    color: string;
    serialNumber: string;
  }>({
    name: "",
    typeId: "",
    color: "",
    serialNumber: "",
  });

  // Skip rendering if not the active section
  if (activeSection !== "addDevice") {
    return null;
  }

  const addDevice = async () => {
    if (!newDevice.name || !newDevice.typeId || !newDevice.serialNumber) {
      toast.error("Please fill in all required fields!");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Get the device type to access its image
      const deviceType = deviceTypes.find(
        (type) => type.id === newDevice.typeId
      );
      
      if (!deviceType?.imageUrl) {
        throw new Error("Device type image not found");
      }
      
      const response = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDevice.name,
          color: newDevice.color,
          typeId: newDevice.typeId,
          serialNumber: newDevice.serialNumber,
          imageUrl: deviceType.imageUrl, // Include the device type's image
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add device");
      }
      
      const newDeviceData = await response.json();
      toast.success("Device added successfully!");
      
      // Reset form
      setNewDevice({ name: "", typeId: "", serialNumber: "", color: "" });
      
      // Notify parent component
      onSuccess();
    } catch (error) {
      console.error("Error adding device:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add device"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const resetDeviceForm = () => {
    setNewDevice({
      name: "",
      typeId: "",
      serialNumber: "",
      color: "",
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-2xl font-bold mb-6 text-black">
        Add New Device
      </h2>
      
      {/* Step 1: Device Type Selection */}
      {!newDevice.typeId && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-700">
            Step 1: Select Device Type
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deviceTypes.map((type) => (
              <button
                key={type.id}
                onClick={() =>
                  setNewDevice({ ...newDevice, typeId: type.id })
                }
                className="relative group p-4 border rounded-lg hover:border-blue-500 transition-all text-left"
              >
                {type.imageUrl && (
                  <div className="mb-4 aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={type.imageUrl}
                      alt={type.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                )}
                <h4 className="font-medium text-gray-800">
                  {type.name}
                </h4>
                {type.description && (
                  <p className="text-sm text-gray-500 mt-1">
                    {type.description}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Step 2: Device Details Form */}
      {newDevice.typeId && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={resetDeviceForm}
              className="text-blue-500 hover:text-blue-600 flex items-center gap-1"
            >
              <ArrowLeft size={20} />
              <span>Back to Device Types</span>
            </button>
          </div>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Selected Type Preview */}
            <div className="w-full md:w-1/3">
              {deviceTypes.find((t) => t.id === newDevice.typeId)
                ?.imageUrl && (
                <div className="rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={
                      deviceTypes.find((t) => t.id === newDevice.typeId)
                        ?.imageUrl
                    }
                    alt="Selected type"
                    className="w-full h-auto object-cover"
                  />
                </div>
              )}
            </div>
            
            {/* Device Details Form */}
            <div className="w-full md:w-2/3 space-y-4">
              <h3 className="text-lg font-semibold text-gray-700">
                Step 2: Enter Device Details
              </h3>
              
              {/* Serial Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serial Number
                </label>
                <input
                  type="text"
                  placeholder="Enter device serial number"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                  value={newDevice.serialNumber}
                  onChange={(e) =>
                    setNewDevice({
                      ...newDevice,
                      serialNumber: e.target.value,
                    })
                  }
                />
              </div>
              
              {/* Device Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Name
                </label>
                <input
                  type="text"
                  value={newDevice.name}
                  onChange={(e) =>
                    setNewDevice({ ...newDevice, name: e.target.value })
                  }
                  placeholder="Enter device name"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                />
              </div>
              
              {/* Device color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Color
                </label>
                <input
                  type="text"
                  value={newDevice.color}
                  onChange={(e) =>
                    setNewDevice({
                      ...newDevice,
                      color: e.target.value,
                    })
                  }
                  placeholder="Enter device color"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                />
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={onCancel}
                  disabled={isLoading}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={addDevice}
                  disabled={
                    isLoading ||
                    !newDevice.name ||
                    !newDevice.serialNumber
                  }
                  className={`px-6 py-3 rounded-lg ${
                    isLoading ||
                    !newDevice.name ||
                    !newDevice.serialNumber
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  } text-white font-semibold transition-colors`}
                >
                  {isLoading ? "Adding..." : "Add Device"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddDevice;