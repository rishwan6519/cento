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
      
      const response = await fetch("/api/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDevice.name,
          color: newDevice.color,
          typeId: newDevice.typeId,
          serialNumber: newDevice.serialNumber,
          imageUrl: deviceType?.imageUrl || "", // Allow empty image if not provided
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
    <div className="bg-white/50 backdrop-blur-md rounded-[2.5rem] p-10 min-h-600 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-10 text-center md:text-left">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">System Onboarding</h2>
        <p className="text-lg text-slate-500 font-medium">Provision new hardware into the operational framework.</p>
      </div>
      
      {/* Step 1: Device Type Selection */}
      {!newDevice.typeId && (
        <div className="space-y-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-black shadow-lg shadow-blue-500/20">1</div>
            <h3 className="text-xl font-black text-slate-900">Select Hardware Architecture</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {deviceTypes.map((type) => (
              <button
                key={type.id}
                onClick={() =>
                  setNewDevice({ ...newDevice, typeId: type.id })
                }
                className="group relative flex flex-col bg-white rounded-[2rem] p-6 border-2 border-slate-50 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 text-left overflow-hidden translate-z-0"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-12 -mt-12 group-hover:bg-blue-50 transition-colors" />
                
                {type.imageUrl && (
                  <div className="relative z-10 mb-6 aspect-video rounded-2xl overflow-hidden bg-slate-50 border border-slate-100/50">
                    <img
                      src={type.imageUrl}
                      alt={type.name}
                      className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-700"
                    />
                  </div>
                )}
                <div className="relative z-10 flex flex-col h-full">
                  <h4 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                    {type.name}
                  </h4>
                  {type.description && (
                    <p className="text-sm text-slate-400 font-medium mt-2 line-clamp-2">
                      {type.description}
                    </p>
                  )}
                  <div className="mt-6 flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                    Deploy this model →
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Step 2: Device Details Form */}
      {newDevice.typeId && (
        <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-black shadow-lg shadow-blue-500/20">2</div>
              <h3 className="text-xl font-black text-slate-900">Define Operational Identity</h3>
            </div>
            <button
              onClick={resetDeviceForm}
              className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
            >
              <ArrowLeft size={16} />
              Switch Model
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-12 bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
            {/* Selected Type Preview */}
            <div className="w-full lg:w-2/5 flex flex-col items-center">
              <div className="w-full aspect-square rounded-[2rem] overflow-hidden bg-slate-50 border border-slate-100 p-8 shadow-inner group">
                {deviceTypes.find((t) => t.id === newDevice.typeId)?.imageUrl && (
                  <img
                    src={deviceTypes.find((t) => t.id === newDevice.typeId)?.imageUrl}
                    alt="Selected type"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700"
                  />
                )}
              </div>
              <div className="mt-6 text-center">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block">Architecture</span>
                 <h4 className="text-xl font-black text-slate-900">{deviceTypes.find((t) => t.id === newDevice.typeId)?.name}</h4>
              </div>
            </div>
            
            {/* Device Details Form */}
            <div className="flex-1 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Serial Number */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">
                    System Serial (UID) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SN-882-QX"
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none transition-all"
                    value={newDevice.serialNumber}
                    onChange={(e) =>
                      setNewDevice({
                        ...newDevice,
                        serialNumber: e.target.value,
                      })
                    }
                  />
                </div>
                
                {/* Device color */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">
                    Finish / Color <span className="text-slate-400/50 normal-case">(Optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newDevice.color}
                      onChange={(e) =>
                        setNewDevice({
                          ...newDevice,
                          color: e.target.value,
                        })
                      }
                      placeholder="e.g. Phantom Black"
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none transition-all pl-12"
                    />
                    <div 
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border border-slate-200"
                      style={{ backgroundColor: newDevice.color || 'transparent' }}
                    />
                  </div>
                </div>
              </div>

              {/* Device Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">
                  Operational Designation (Name) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newDevice.name}
                  onChange={(e) =>
                    setNewDevice({ ...newDevice, name: e.target.value })
                  }
                  placeholder="e.g. Concierge Alpha"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none transition-all text-xl"
                />
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-4 pt-8">
                <button
                  onClick={onCancel}
                  disabled={isLoading}
                  className="px-10 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 hover:text-slate-900 transition-all order-2 sm:order-1"
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
                  className={`px-12 py-4 rounded-2xl font-extrabold shadow-xl text-white transition-all transform active:scale-95 flex items-center justify-center gap-3 order-1 sm:order-2 ${
                    isLoading ||
                    !newDevice.name ||
                    !newDevice.serialNumber
                      ? "bg-slate-300 shadow-none cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/25"
                  }`}
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Initializing...
                    </>
                  ) : (
                    "Authorize Provisioning"
                  )}
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