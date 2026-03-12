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
  const [blockCodingEnabled, setBlockCodingEnabled] = useState<boolean>(false);


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
          blockCodingEnabled: blockCodingEnabled, 

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
    <div className="bg-white/50 backdrop-blur-md rounded-[2.5rem] p-10 min-h-600 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="mb-10 text-center md:text-left">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Model Definition</h2>
        <p className="text-lg text-slate-500 font-medium">Engineer new hardware blueprints for the ecosystem.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-8">
          {/* Device Type Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Model Designation</label>
            <input
              value={customDeviceName}
              onChange={(e) => setCustomDeviceName(e.target.value)}
              placeholder="e.g. Sentinel-7 Series"
              className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none transition-all text-xl shadow-sm hover:shadow-md"
            />
          </div>
          
          {/* Movements Container */}
          <div className="bg-white/40 rounded-[2rem] p-8 border border-slate-100 shadow-sm space-y-8">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-4">Kinematic Parameters</h3>
            
            {/* Hand Movements */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Hand Gestures / Articulations</label>
              <input
                value={handMovements}
                onChange={(e) => setHandMovements(e.target.value)}
                placeholder="wave, grab, index_point"
                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none transition-all"
              />
              <p className="text-[10px] text-slate-400 font-medium pl-2 italic">Format: CSV string</p>
            </div>
            
            {/* Body Movements */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Locomotion / Body Control</label>
              <input
                value={bodyMovements}
                onChange={(e) => setBodyMovements(e.target.value)}
                placeholder="bipedal_walk, rotate_360, squat"
                className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="space-y-8">
           {/* Screen Geometry */}
           <div className="bg-white/40 rounded-[2rem] p-8 border border-slate-100 shadow-sm space-y-8">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-4">Display Geometry</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Horizontal (px)</label>
                <input
                  type="number"
                  value={screenWidth}
                  onChange={(e) => setScreenWidth(e.target.value)}
                  placeholder="1080"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-6 py-3 font-bold text-slate-900 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Vertical (px)</label>
                <input
                  type="number"
                  value={screenHeight}
                  onChange={(e) => setScreenHeight(e.target.value)}
                  placeholder="1920"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-6 py-3 font-bold text-slate-900 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Media & Configuration */}
          <div className="bg-white/40 rounded-[2rem] p-8 border border-slate-100 shadow-sm space-y-8">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest border-b border-slate-50 pb-4">Model Assets</h3>
            
            {/* Image Upload */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Architecture Schema (Image)</label>
              <div className="relative group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setDeviceTypeImage(e.target.files?.[0] || null)
                  }
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-full bg-slate-50 border-2 border-dashed border-slate-200 group-hover:border-blue-500 rounded-2xl px-6 py-8 flex flex-col items-center justify-center transition-all bg-white group-hover:bg-blue-50/50">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:scale-110 transition-all mb-3">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                       </svg>
                    </div>
                    <span className="text-sm font-bold text-slate-600">
                      {deviceTypeImage ? deviceTypeImage.name : "Select technical snapshot"}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">PNG, JPG, SVG supported</span>
                </div>
              </div>
            </div>

            {/* Block Coding */}
            <div className="pt-4">
              <label className="flex items-center gap-4 cursor-pointer group">
                <div className="relative">
                   <input
                    type="checkbox"
                    checked={blockCodingEnabled}
                    onChange={(e) => setBlockCodingEnabled(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-14 h-8 rounded-full transition-colors duration-300 ${blockCodingEnabled ? 'bg-blue-600' : 'bg-slate-200'}`} />
                  <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 ${blockCodingEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black text-slate-900 tracking-tight">Logic Engine Support</span>
                  <span className="text-xs text-slate-400 font-medium tracking-tight">Enables Drag-and-Drop Block Coding for this model.</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer Actions */}
      <div className="flex flex-col sm:flex-row justify-end gap-6 mt-12 pt-10 border-t border-slate-100/50">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-10 py-4 text-slate-400 font-bold hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all order-2 sm:order-1"
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
          className={`px-12 py-4 rounded-2xl font-extrabold shadow-xl text-white transition-all transform active:scale-95 flex items-center justify-center gap-3 order-1 sm:order-2 ${
            isLoading ||
            !customDeviceName ||
            !deviceTypeImage ||
            !handMovements ||
            !bodyMovements ||
            !screenWidth ||
            !screenHeight
              ? "bg-slate-300 shadow-none cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/25"
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Compiling...
            </>
          ) : (
            "Authorize Model Definition"
          )}
        </button>
      </div>
    </div>
  );
};

export default AddDeviceType;