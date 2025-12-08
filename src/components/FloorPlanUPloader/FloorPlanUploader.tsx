"use client";

import React, { useState, useRef, ChangeEvent, MouseEvent, useEffect } from "react";

// --- Types ---
interface CameraMarker {
  id: string;
  cameraId: string; // This serves as the Name
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
  cameraId: string; // User Name goes here
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
    
    const data = await res.json();
    if (data.success) {
      console.log(`Marker saved (${marker.cameraId}):`, data.data);
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
      return { success: true, floorMapId: data.floorMapId };
    } else {
      return { success: false, error: data.error || "Failed to upload floor plan." };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// --- Main Component ---
const FloorPlanUploader: React.FC = () => {
  const [step, setStep] = useState<"upload" | "cameraCount" | "naming" | "marking" | "done" | "error">("upload");
  
  const [floorPlanFile, setFloorPlanFile] = useState<File | null>(null);
  const [floorPlanImageUrl, setFloorPlanImageUrl] = useState<string>("");
  const [floorName, setFloorName] = useState<string>("");
  const [floorMapId, setFloorMapId] = useState<string>("");
  
  const [cameraCount, setCameraCount] = useState<number>(1);
  const [cameraNames, setCameraNames] = useState<string[]>([]); // Stores the user entered names
  
  const [tempMarkers, setTempMarkers] = useState<TempMarker[]>([]);
  const [cameraMarkers, setCameraMarkers] = useState<CameraMarker[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<TempMarker | null>(null);
  const [redoMarkers, setRedoMarkers] = useState<TempMarker[]>([]);

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
    // Initialize empty names array based on count
    const initialNames = Array(cameraCount).fill("");
    setCameraNames(initialNames);
    setErrorMessage("");
    setStep("naming"); // Proceed to Naming Step
  };

  const handleNameChange = (index: number, value: string) => {
    const updatedNames = [...cameraNames];
    updatedNames[index] = value;
    setCameraNames(updatedNames);
  };

  const handleNamingSubmit = () => {
    if (cameraNames.some(name => !name.trim())) {
      setErrorMessage("Please enter a name for all cameras.");
      return;
    }
    setErrorMessage("");
    setStep("marking"); // Proceed to Drawing Step
  };

  // --- Drawing Logic ---
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

    setTempMarkers((prev) => [...prev, currentRect]);
    setRedoMarkers([]); 
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentRect(null);

    // Increment index to move to next camera
    if (currentCameraIndex + 1 < cameraCount) {
      setCurrentCameraIndex((prev) => prev + 1);
    } else {
      setCurrentCameraIndex((prev) => prev + 1);
    }
  };

  const handleUndo = () => {
    if (tempMarkers.length === 0 || isLoading) return;
    setTempMarkers(prev => {
      const newArr = [...prev];
      const removed = newArr.pop();
      if (removed) setRedoMarkers(r => [removed, ...r]);
      return newArr;
    });
    setCurrentCameraIndex(prev => Math.max(0, prev - 1));
  };

  // --- Final Save Logic ---
  const uploadAndSaveAll = async () => {
    if (!floorPlanFile) return;
    setIsLoading(true);
    setErrorMessage("");

    try {
      // 1. Upload Floor Plan
      const uploadRes = await uploadFloorPlan(floorPlanFile, floorName);
      if (!uploadRes.success || !uploadRes.floorMapId) {
        throw new Error(uploadRes.error || "Failed to upload floor plan.");
      }
      const uploadedFloorMapId = uploadRes.floorMapId;
      setFloorMapId(uploadedFloorMapId);

      // 2. Save Markers using the User Entered Names
      const savedMarkersData: CameraMarker[] = [];

      for (let i = 0; i < tempMarkers.length; i++) {
        const tempMarker = tempMarkers[i];
        const enteredName = cameraNames[i]; // Get the specific name entered for this camera

        const markerData = {
          cameraId: enteredName, // Sending Name as ID
          x: tempMarker.x,
          y: tempMarker.y,
          width: tempMarker.width,
          height: tempMarker.height,
          floorMapId: uploadedFloorMapId,
        };

        const response = await saveMarker(markerData);
        if (response.success && response.data) {
          savedMarkersData.push(response.data);
        } else {
          throw new Error(response.error || `Failed to save ${enteredName}`);
        }
      }

      setCameraMarkers(savedMarkersData);
      setStep("done");
    } catch (error: any) {
      setErrorMessage(error.message || "An unexpected error occurred.");
      setStep("error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (step === "marking" && tempMarkers.length === cameraCount && !isLoading) {
      uploadAndSaveAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tempMarkers]);

  const resetForm = () => {
    setStep("upload");
    setFloorPlanFile(null);
    setFloorPlanImageUrl("");
    setFloorName("");
    setFloorMapId("");
    setCameraCount(1);
    setCameraNames([]);
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
      {/* Sidebar */}
      <aside className="w-full md:w-80 p-6 bg-white shadow-lg flex flex-col justify-between h-screen overflow-y-auto sticky top-0">
        <div>
          <h1 className="text-3xl font-bold text-indigo-700 mb-6">Floor Plan Setup</h1>

          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{errorMessage}</span>
            </div>
          )}

          {step === "upload" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">Step 1: Upload Floor Plan</h2>
              <input
                type="text"
                value={floorName}
                onChange={(e) => setFloorName(e.target.value)}
                placeholder="Floor Plan Name"
                className="w-full px-3 py-2 border rounded-md"
              />
              <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm" />
              <button
                onClick={handleUploadSubmit}
                disabled={!floorPlanFile || !floorName.trim()}
                className="w-full py-2 bg-indigo-600 text-white rounded-md disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}

          {step === "cameraCount" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">Step 2: How many cameras?</h2>
              <input
                type="number"
                min={1}
                value={cameraCount}
                onChange={(e) => setCameraCount(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-md"
              />
              <button
                onClick={handleCameraCountSubmit}
                disabled={cameraCount < 1}
                className="w-full py-2 bg-indigo-600 text-white rounded-md disabled:opacity-50"
              >
                Next: Name Cameras
              </button>
            </div>
          )}

          {step === "naming" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">Step 3: Name Cameras</h2>
              <div className="max-h-60 overflow-y-auto pr-2 space-y-3">
                {cameraNames.map((name, index) => (
                  <div key={index}>
                    <label className="text-xs font-bold text-gray-500">Camera {index + 1}</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => handleNameChange(index, e.target.value)}
                      placeholder={`e.g. Entrance Cam`}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={handleNamingSubmit}
                className="w-full py-2 bg-indigo-600 text-white rounded-md"
              >
                Start Marking
              </button>
            </div>
          )}

          {step === "marking" && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">Step 4: Draw Areas</h2>
              {tempMarkers.length > 0 && (
                <button onClick={handleUndo} className="w-full py-2 bg-gray-200 rounded-md">Undo Last</button>
              )}
              {currentCameraIndex < cameraCount ? (
                <div className="bg-blue-50 border border-blue-300 text-blue-700 px-4 py-3 rounded">
                  <p className="font-bold">Draw: {cameraNames[currentCameraIndex]}</p>
                </div>
              ) : (
                <div className="text-green-600 font-bold">Saving...</div>
              )}
            </div>
          )}

          {(step === "done" || step === "error") && (
            <div className="text-center">
              {step === "done" && <div className="text-green-600 font-bold mb-4">All Saved Successfully!</div>}
              <button onClick={resetForm} className="w-full py-2 bg-gray-600 text-white rounded-md">Start Over</button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Canvas */}
      <main className="flex-1 p-6 flex items-center justify-center bg-gray-100 h-screen overflow-hidden">
        {floorPlanImageUrl && (
          <div 
            className="relative border-2 border-dashed border-gray-300 bg-white p-2 shadow-md overflow-auto max-h-[90vh] max-w-full"
            onMouseDown={step === "marking" && !isLoading && currentCameraIndex < cameraCount ? handleMouseDown : undefined}
            onMouseMove={step === "marking" && !isLoading ? handleMouseMove : undefined}
            onMouseUp={step === "marking" && !isLoading ? handleMouseUp : undefined}
          >
            <div className="relative inline-block cursor-crosshair">
              <img
                ref={floorPlanImageRef}
                src={floorPlanImageUrl}
                alt="Floor Plan"
                className="block max-w-full h-auto select-none pointer-events-none"
              />
              {/* Drawn Markers */}
              {tempMarkers.map((m, i) => (
                <div key={i} className="absolute border-2 border-yellow-500 bg-yellow-500/30"
                  style={{ left: m.x, top: m.y, width: m.width, height: m.height }}>
                  <span className="absolute -top-6 left-0 bg-yellow-500 text-white text-xs px-1 rounded">
                    {cameraNames[i]}
                  </span>
                </div>
              ))}
              {/* Current Drawing */}
              {currentRect && (
                <div className="absolute border-2 border-blue-500 bg-blue-500/20"
                  style={{ left: currentRect.x, top: currentRect.y, width: currentRect.width, height: currentRect.height }}>
                   <span className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-1 rounded">
                    {cameraNames[currentCameraIndex]}
                  </span>
                </div>
              )}
              {/* Final Saved Markers */}
              {step === "done" && cameraMarkers.map((m) => (
                <div key={m.id} className="absolute border-2 border-green-500 bg-green-500/30 pointer-events-none"
                  style={{ left: m.x, top: m.y, width: m.width, height: m.height }}>
                  <span className="absolute -top-6 left-0 bg-green-500 text-white text-xs px-1 rounded">
                    {m.cameraId} ✓
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default FloorPlanUploader;