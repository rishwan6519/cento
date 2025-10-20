"use client";

import React, { useState, useRef, ChangeEvent, MouseEvent } from "react";

// Define types for better type safety
interface CameraMarker {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  floorMapId: string;
}

interface TempMarker {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SaveMarkerResponse {
  success: boolean;
  data?: CameraMarker;
  error?: string;
}

// --- API Functions ---
const saveMarker = async (marker: {
  cameraId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  floorMapId: string;
}): Promise<SaveMarkerResponse> => {
  try {
    const res = await fetch("/api/camera-marker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(marker),
    });
    console.log(marker);
    const data = await res.json();
    if (data.success) {
      console.log("Marker saved:", data.data);
      return { success: true, data: data.data };
    } else {
      console.error("Save failed:", data.error);
      return { success: false, error: data.error };
    }
  } catch (error: any) {
    console.error("Save marker error:", error);
    return { success: false, error: error.message };
  }
};

const uploadFloorPlan = async (file: File, name: string): Promise<{ success: boolean; floorMapId?: string; error?: string }> => {
  console.log("Uploading floor plan:", name, file.name);
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("floorName", name);
    
    const res = await fetch("/api/floor-map", {
      method: "POST",
      body: formData,
    });
    
    const data = await res.json();
    if (data.success && data.floorMapId) {
      console.log("Floor plan uploaded:", data.floorMapId);
      return { success: true, floorMapId: data.floorMapId };
    } else {
      return { success: false, error: data.error || "Failed to upload floor plan." };
    }
  } catch (error: any) {
    console.error("Upload error:", error);
    return { success: false, error: error.message };
  }
};
// --- End API Functions ---

const FloorPlanUploader: React.FC = () => {
  const [step, setStep] = useState<"upload" | "cameraCount" | "marking" | "done" | "error">("upload");
  const [floorPlanFile, setFloorPlanFile] = useState<File | null>(null);
  const [floorPlanImageUrl, setFloorPlanImageUrl] = useState<string>("");
  const [floorName, setFloorName] = useState<string>("");
  const [floorMapId, setFloorMapId] = useState<string>("");
  const [cameraCount, setCameraCount] = useState<number>(1);
  const [tempMarkers, setTempMarkers] = useState<TempMarker[]>([]);
  const [cameraMarkers, setCameraMarkers] = useState<CameraMarker[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<TempMarker | null>(null);

  const floorPlanImageRef = useRef<HTMLImageElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFloorPlanFile(file);
      setFloorPlanImageUrl(URL.createObjectURL(file));
      setErrorMessage("");
    } else {
      setFloorPlanFile(null);
      setFloorPlanImageUrl("");
    }
  };

  const handleUploadSubmit = () => {
    if (!floorPlanFile || !floorName.trim()) {
      setErrorMessage("Please provide a floor plan name and upload an image.");
      return;
    }
    setErrorMessage("");
    setStep("cameraCount");
  };

  const handleCameraCountSubmit = () => {
    if (cameraCount < 1) {
      setErrorMessage("Camera count must be at least 1.");
      return;
    }
    setErrorMessage("");
    setStep("marking");
  };

  const getRelativeCoordinates = (e: MouseEvent<HTMLDivElement>): { x: number; y: number } => {
    if (!floorPlanImageRef.current) return { x: 0, y: 0 };
    
    const img = floorPlanImageRef.current;
    const rect = img.getBoundingClientRect();
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (!floorPlanImageRef.current || isLoading || currentCameraIndex >= cameraCount) return;
    
    const coords = getRelativeCoordinates(e);
    setIsDrawing(true);
    setStartPoint(coords);
    setCurrentRect({ x: coords.x, y: coords.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPoint || !floorPlanImageRef.current) return;
    
    const coords = getRelativeCoordinates(e);
    const width = coords.x - startPoint.x;
    const height = coords.y - startPoint.y;
    
    setCurrentRect({
      x: width < 0 ? coords.x : startPoint.x,
      y: height < 0 ? coords.y : startPoint.y,
      width: Math.abs(width),
      height: Math.abs(height)
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentRect || currentRect.width < 5 || currentRect.height < 5) {
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentRect(null);
      return;
    }
    
    // Add the completed rectangle to temp markers
    setTempMarkers((prev) => [...prev, currentRect]);
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentRect(null);
    
    if (currentCameraIndex + 1 < cameraCount) {
      setCurrentCameraIndex((prev) => prev + 1);
    } else {
      // All markers placed, now upload floor plan and save all markers
      setCurrentCameraIndex((prev) => prev + 1);
      uploadAndSaveAll();
    }
  };

  const uploadAndSaveAll = async () => {
    if (!floorPlanFile) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      // Step 1: Upload floor plan image
      console.log("Step 1: Uploading floor plan...");
      const uploadRes = await uploadFloorPlan(floorPlanFile, floorName);
      if (!uploadRes.success || !uploadRes.floorMapId) {
        setErrorMessage(uploadRes.error || "Failed to upload floor plan.");
        setStep("error");
        setIsLoading(false);
        return;
      }

      const uploadedFloorMapId = uploadRes.floorMapId;
      setFloorMapId(uploadedFloorMapId);
      console.log("Floor plan uploaded successfully. ID:", uploadedFloorMapId);

      // Step 2: Save all camera markers with the floorMapId
      console.log("Step 2: Saving camera markers...");
      const savedMarkersData: CameraMarker[] = [];

      for (let i = 0; i < tempMarkers.length; i++) {
        const tempMarker = tempMarkers[i];
       const cameraId = `camera${i + 1}`;
        const markerData = {
          cameraId,
          x: tempMarker.x,
          y: tempMarker.y,
          width: tempMarker.width,
          height: tempMarker.height,
          floorMapId: uploadedFloorMapId,
        };

        console.log(`Saving marker ${i + 1} of ${tempMarkers.length}...`);
        const response = await saveMarker(markerData);

        if (response.success && response.data) {
          savedMarkersData.push(response.data);
          console.log(`Marker ${i + 1} saved successfully`);
        } else {
          setErrorMessage(response.error || `Failed to save marker ${i + 1}`);
          setStep("error");
          setIsLoading(false);
          return;
        }
      }

      setCameraMarkers(savedMarkersData);
      console.log("All markers saved successfully!");
      setStep("done");
    } catch (error: any) {
      setErrorMessage(error.message || "An unexpected error occurred.");
      setStep("error");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep("upload");
    setFloorPlanFile(null);
    setFloorPlanImageUrl("");
    setFloorName("");
    setFloorMapId("");
    setCameraCount(1);
    setTempMarkers([]);
    setCameraMarkers([]);
    setCurrentCameraIndex(0);
    setIsLoading(false);
    setErrorMessage("");
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentRect(null);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 text-gray-800">
      {/* Sidebar for controls */}
      <aside className="w-full md:w-80 p-6 bg-white shadow-lg flex flex-col justify-between">
        <div>
          <h1 className="text-3xl font-bold text-indigo-700 mb-6">Floor Plan Setup</h1>

          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{errorMessage}</span>
            </div>
          )}

          {step === "upload" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">Step 1: Upload Floor Plan</h2>
              <div>
                <label htmlFor="floorName" className="block text-sm font-medium text-gray-700 mb-1">
                  Floor Plan Name
                </label>
                <input
                  type="text"
                  id="floorName"
                  value={floorName}
                  onChange={(e) => setFloorName(e.target.value)}
                  placeholder="e.g., Ground Floor"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="floorPlanFile" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Floor Plan Image
                </label>
                <input
                  type="file"
                  id="floorPlanFile"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  disabled={isLoading}
                />
                {floorPlanFile && (
                  <p className="mt-2 text-sm text-gray-600">Selected: {floorPlanFile.name}</p>
                )}
              </div>
              <button
                onClick={handleUploadSubmit}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!floorPlanFile || !floorName.trim() || isLoading}
              >
                {isLoading ? "Processing..." : "Next: Set Camera Count"}
              </button>
            </div>
          )}

          {step === "cameraCount" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">Step 2: Number of Cameras</h2>
              <div>
                <label htmlFor="cameraCount" className="block text-sm font-medium text-gray-700 mb-1">
                  How many cameras will be placed?
                </label>
                <input
                  type="number"
                  id="cameraCount"
                  min={1}
                  value={cameraCount}
                  onChange={(e) => setCameraCount(Number(e.target.value))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={handleCameraCountSubmit}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={cameraCount < 1 || isLoading}
              >
                Start Drawing Cameras
              </button>
            </div>
          )}

          {step === "marking" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">Step 3: Draw Camera Areas</h2>
              {currentCameraIndex < cameraCount ? (
                <div className="bg-blue-50 border border-blue-300 text-blue-700 px-4 py-3 rounded">
                  <p className="font-medium text-lg mb-2">
                    Drawing Camera {currentCameraIndex + 1} of {cameraCount}
                  </p>
                  <p className="text-sm">Click and drag to draw a rectangle on the floor plan</p>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-3 rounded">
                  <p className="font-medium">All cameras marked! Uploading...</p>
                </div>
              )}
              {isLoading && (
                <div className="flex items-center space-x-2 text-indigo-600">
                  <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Uploading floor plan and saving markers...</span>
                </div>
              )}
              <div className="bg-gray-100 rounded p-3">
                <p className="text-sm text-gray-600">Progress: {tempMarkers.length} / {cameraCount} cameras drawn</p>
                <div className="mt-2 w-full bg-gray-300 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${(tempMarkers.length / cameraCount) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {(step === "done" || step === "error") && (
            <div className="space-y-4 text-center">
              {step === "done" && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
                  <strong className="font-bold">Success! </strong>
                  <span className="block sm:inline">
                    Floor plan uploaded and all {cameraCount} cameras have been marked and saved.
                  </span>
                  {floorMapId && (
                    <p className="text-xs mt-2">Floor Map ID: {floorMapId}</p>
                  )}
                </div>
              )}
              <button
                onClick={resetForm}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Start Over
              </button>
            </div>
          )}
        </div>
        <footer className="text-sm text-gray-500 mt-8">
          <p>&copy; {new Date().getFullYear()} Your Company. All rights reserved.</p>
        </footer>
      </aside>

      {/* Main content area for floor plan display */}
      <main className="flex-1 p-6 flex flex-col items-center justify-center bg-gray-100">
        {floorPlanImageUrl && (step === "marking" || step === "done" || step === "error" || step === "cameraCount") ? (
          <div 
            className="relative border-2 border-dashed border-gray-300 bg-white p-2 rounded-lg shadow-md max-w-full max-h-full overflow-auto"
            onMouseDown={step === "marking" && !isLoading && currentCameraIndex < cameraCount ? handleMouseDown : undefined}
            onMouseMove={step === "marking" && !isLoading ? handleMouseMove : undefined}
            onMouseUp={step === "marking" && !isLoading ? handleMouseUp : undefined}
            onMouseLeave={step === "marking" && isDrawing ? handleMouseUp : undefined}
            style={{
              cursor: step === "marking" && !isLoading && currentCameraIndex < cameraCount ? "crosshair" : "default"
            }}
          >
            <img
              ref={floorPlanImageRef}
              src={floorPlanImageUrl}
              alt="Floor Plan"
              className="block max-w-full h-auto select-none"
              style={{
                pointerEvents: "none",
                opacity: isLoading ? 0.7 : 1,
              }}
              draggable={false}
            />
            
            {/* Show temporary markers while marking */}
            {step === "marking" && tempMarkers.map((marker, index) => (
              <div
                key={`temp-${index}`}
                className="absolute border-4 border-yellow-500 bg-yellow-500 bg-opacity-30"
                style={{
                  left: marker.x,
                  top: marker.y,
                  width: marker.width,
                  height: marker.height,
                  pointerEvents: "none"
                }}
              >
                <div className="absolute -top-7 left-0 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
                  Cam {index + 1}
                </div>
              </div>
            ))}
            
            {/* Show current drawing rectangle */}
            {step === "marking" && currentRect && currentRect.width > 0 && currentRect.height > 0 && (
              <div
                className="absolute border-4 border-blue-500 bg-blue-500 bg-opacity-20"
                style={{
                  left: currentRect.x,
                  top: currentRect.y,
                  width: currentRect.width,
                  height: currentRect.height,
                  pointerEvents: "none"
                }}
              >
                <div className="absolute -top-7 left-0 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
                  Drawing...
                </div>
              </div>
            )}
            
            {/* Show saved markers after completion */}
            {step === "done" && cameraMarkers.map((marker, index) => (
              <div
                key={marker.id}
                className="absolute border-4 border-green-500 bg-green-500 bg-opacity-30"
                style={{
                  left: marker.x,
                  top: marker.y,
                  width: marker.width,
                  height: marker.height,
                  pointerEvents: "none"
                }}
              >
                <div className="absolute -top-7 left-0 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg">
                  Cam {index + 1} ✓
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 p-8 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <p className="mt-1 text-sm">Upload a floor plan image to begin.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default FloorPlanUploader;