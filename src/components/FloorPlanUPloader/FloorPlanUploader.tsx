"use client";

import React, { useState, useRef, ChangeEvent, MouseEvent, useEffect } from "react";

// --- Types ---
interface CameraConfig {
  id?: string;
  _id?: string;
  name: string;
  zones: any[];
}

interface CameraMarker {
  id?: string;
  cameraId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  floorMapId: string;
  zones: ZoneMarker[];
}

interface ZoneMarker {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TempMarker {
  x: number;
  y: number;
  width: number;
  height: number;
}

// --- API Functions ---
const fetchAvailableCameras = async (): Promise<CameraConfig[]> => {
  try {
    const res = await fetch("/api/cameras");
    if (!res.ok) throw new Error("API Error");
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw error;
  }
};

const saveMarker = async (marker: CameraMarker) => {
  try {
    const res = await fetch("/api/camera-marker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(marker),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

const uploadFloorPlan = async (file: File, name: string): Promise<{ success: boolean; floorMapId?: string; error?: string }> => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("floorName", name);
    
    const res = await fetch("/api/floor-map", {
      method: "POST",
      body: formData,
    });
    
    const data = await res.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

const fetchActiveZonesForCamera = async (cameraId: string): Promise<any[]> => {
  try {
    const res = await fetch(`/api/zones/active?cameraId=${cameraId}`);
    const data = await res.json();
    return data.success ? data.zones : [];
  } catch (error) {
    return [];
  }
};

// --- Main Component ---
const FloorPlanUploader: React.FC = () => {
  const [step, setStep] = useState<"setup" | "mark-camera" | "mark-zones" | "review" | "saving" | "done" | "error">("setup");
  
  // Floor Plan Data
  const [floorPlanFile, setFloorPlanFile] = useState<File | null>(null);
  const [floorPlanImageUrl, setFloorPlanImageUrl] = useState<string>("");
  const [floorName, setFloorName] = useState<string>("");

  // Selection Data
  const [availableCameras, setAvailableCameras] = useState<CameraConfig[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [detectedZones, setDetectedZones] = useState<any[]>([]);
  
  // Marking Data
  const [activeMarkingZone, setActiveMarkingZone] = useState<string | null>(null);
  const [tempCameraRect, setTempCameraRect] = useState<TempMarker | null>(null);
  const [tempZoneRects, setTempZoneRects] = useState<ZoneMarker[]>([]);
  
  // Final Collection
  const [completedMarkers, setCompletedMarkers] = useState<CameraMarker[]>([]);

  // UI State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<TempMarker | null>(null);
  
  const floorPlanImageRef = useRef<HTMLImageElement>(null);

  // Load cameras on mount
  useEffect(() => {
    loadCameras();
  }, []);

  const loadCameras = async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const cameras = await fetchAvailableCameras();
      setAvailableCameras(cameras);
    } catch (error: any) {
      setErrorMessage("Failed to load cameras");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCameraId) {
      loadActiveZones();
    } else {
      setDetectedZones([]);
    }
  }, [selectedCameraId]);

  const loadActiveZones = async () => {
    setIsLoading(true);
    const zones = await fetchActiveZonesForCamera(selectedCameraId);
    setDetectedZones(zones);
    setIsLoading(false);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFloorPlanFile(file);
      setFloorPlanImageUrl(URL.createObjectURL(file));
      setErrorMessage("");
    }
  };

  const handleSetupSubmit = () => {
    if (!floorPlanFile || !floorName.trim() || !selectedCameraId) {
      setErrorMessage("Please complete all fields and select a camera.");
      return;
    }
    setStep("mark-camera");
    setErrorMessage("");
  };

  const getRelativeCoordinates = (e: MouseEvent<HTMLDivElement>): { x: number; y: number } => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100
    };
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (isLoading || !["mark-camera", "mark-zones"].includes(step)) return;
    if (step === "mark-zones" && !activeMarkingZone) return;

    const coords = getRelativeCoordinates(e);
    setIsDrawing(true);
    setStartPoint(coords);
    setCurrentRect({ x: coords.x, y: coords.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !startPoint) return;
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

    if (step === "mark-camera") {
      setTempCameraRect(currentRect);
    } else if (step === "mark-zones" && activeMarkingZone) {
      const newZone: ZoneMarker = {
        name: activeMarkingZone,
        ...currentRect
      };
      setTempZoneRects(prev => {
        const filtered = prev.filter(z => z.name !== activeMarkingZone);
        return [...filtered, newZone];
      });
      setActiveMarkingZone(null);
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentRect(null);
  };

  const confirmCameraMarking = () => {
    if (!tempCameraRect) {
      setErrorMessage("Please draw the camera coverage area first.");
      return;
    }
    setStep("mark-zones");
    setErrorMessage("");
  };

  const finishAllMarking = () => {
    if (!tempCameraRect) return;
    
    const newMarker: CameraMarker = {
      cameraId: selectedCameraId,
      x: tempCameraRect.x,
      y: tempCameraRect.y,
      width: tempCameraRect.width,
      height: tempCameraRect.height,
      floorMapId: "",
      zones: tempZoneRects
    };
    setCompletedMarkers(prev => [...prev, newMarker]);
    setStep("review");
  };

  const handleAddAnother = () => {
    setSelectedCameraId("");
    setDetectedZones([]);
    setTempCameraRect(null);
    setTempZoneRects([]);
    setStep("setup");
  };

  const handleFinalSave = async () => {
    if (!floorPlanFile || completedMarkers.length === 0) return;
    setIsLoading(true);
    setStep("saving");

    try {
      const uploadRes = await uploadFloorPlan(floorPlanFile, floorName);
      if (!uploadRes.success || !uploadRes.floorMapId) throw new Error(uploadRes.error);

      for (const marker of completedMarkers) {
        await saveMarker({ ...marker, floorMapId: uploadRes.floorMapId });
      }
      setStep("done");
    } catch (error: any) {
      setErrorMessage(error.message);
      setStep("error");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep("setup");
    setFloorPlanFile(null);
    setFloorPlanImageUrl("");
    setFloorName("");
    setCompletedMarkers([]);
    setSelectedCameraId("");
    setDetectedZones([]);
    setTempCameraRect(null);
    setTempZoneRects([]);
    setErrorMessage("");
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-full lg:w-[450px] bg-white border-r border-slate-200 flex flex-col h-screen overflow-y-auto z-20 shadow-xl">
        <div className="p-8 space-y-10">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Floor Setup
            </h1>
            <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-bold">Spatial Configuration</p>
          </div>

          {errorMessage && (
            <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 p-4 rounded-xl flex items-start space-x-3 transition-all animate-in fade-in">
              <span className="text-sm font-medium">{errorMessage}</span>
            </div>
          )}

          {/* Stepper Visualization */}
          <div className="flex items-center space-x-2">
             {[
               { id: 'setup', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
               { id: 'mark-camera', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 00-2 2z' },
               { id: 'mark-zones', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' }
             ].map((s, idx) => {
               const isActive = step === s.id;
               const isPast = (step === 'mark-camera' && s.id === 'setup') || 
                              (step === 'mark-zones' && ['setup', 'mark-camera'].includes(s.id)) ||
                              (step === 'review' && ['setup', 'mark-camera', 'mark-zones'].includes(s.id));
               return (
                 <React.Fragment key={s.id}>
                    <div className={`p-2.5 rounded-xl transition-all ${isActive ? 'bg-indigo-600 text-white shadow-lg ring-4 ring-indigo-50' : isPast ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={s.icon} /></svg>
                    </div>
                    {idx < 2 && <div className={`h-1 w-6 rounded-full ${isPast ? 'bg-emerald-500' : 'bg-slate-100'}`} />}
                 </React.Fragment>
               );
             })}
          </div>

          {/* Step 1: Combined Setup */}
          {step === "setup" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="space-y-6">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">1. Environment & Device</h3>
                
                {/* Floor Name */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Floor / Building Name</label>
                  <input
                    type="text"
                    value={floorName}
                    onChange={(e) => setFloorName(e.target.value)}
                    placeholder="e.g. 1st Floor Lobby"
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>

                {/* File Upload */}
                <div className="relative group cursor-pointer">
                  <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer" />
                  <div className={`p-8 rounded-[32px] border-4 border-dashed text-center flex flex-col items-center space-y-4 transition-all ${floorPlanFile ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100 bg-slate-50 hover:border-indigo-100 hover:bg-indigo-50/10'}`}>
                     <div className={`p-4 rounded-3xl ${floorPlanFile ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-200' : 'bg-white text-indigo-600 shadow-xl shadow-indigo-50'}`}>
                      {floorPlanFile ? (
                         <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                      ) : (
                         <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      )}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-sm">{floorPlanFile ? floorPlanFile.name : 'Choose Blueprint'}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">JPG, PNG, WEBP (MAX 10MB)</p>
                    </div>
                  </div>
                </div>

                {/* Camera Selection */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Select Target Device</label>
                  {isLoading && availableCameras.length === 0 ? (
                    <div className="p-10 text-center text-slate-300 font-bold uppercase text-[10px] tracking-widest animate-pulse border-2 border-slate-50 rounded-2xl">Detecting Devices...</div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {availableCameras.filter(cam => !completedMarkers.some(m => m.cameraId === (cam.id || cam._id))).map(cam => {
                         const camId = (cam.id || cam._id) as string;
                         return (
                           <button 
                              key={camId} 
                              onClick={() => setSelectedCameraId(camId)}
                              className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${selectedCameraId === camId ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                           >
                              <div className="flex items-center space-x-3 text-left">
                                <div className={`p-2 rounded-lg ${selectedCameraId === camId ? 'bg-indigo-600 text-white' : 'bg-white shadow-sm text-slate-400'}`}>
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 00-2 2z" /></svg>
                                </div>
                                <div>
                                  <p className="font-black text-slate-800 text-xs">{cam.name}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">ID: {camId?.slice(-8)}</p>
                                </div>
                              </div>
                              {selectedCameraId === camId && <div className="bg-indigo-600 rounded-full p-1"><svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg></div>}
                           </button>
                         );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={handleSetupSubmit} 
                disabled={!floorPlanFile || !floorName.trim() || !selectedCameraId} 
                className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg shadow-2xl hover:bg-indigo-600 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
              >
                Start Marking
              </button>
            </div>
          )}

          {/* Step 2: Mark Camera */}
          {step === "mark-camera" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
               <div className="flex items-center space-x-3">
                 <button onClick={() => setStep("setup")} className="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                 </button>
                 <h3 className="text-xl font-black text-slate-800">2. Device Field</h3>
               </div>
               
               <div className="bg-indigo-600 p-8 rounded-[40px] text-center space-y-4 shadow-2xl shadow-indigo-100">
                  <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center mx-auto text-white shadow-inner"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg></div>
                  <p className="text-white font-black uppercase tracking-tight text-lg">Define View Scope</p>
                  <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest leading-relaxed">Draw the rectangle representing the camera's coverage area on the map.</p>
               </div>

               <div className="space-y-4">
                  {tempCameraRect ? (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                      <span className="text-emerald-700 font-bold text-xs uppercase tracking-widest">Scope Captured</span>
                      <button onClick={() => setTempCameraRect(null)} className="text-[10px] font-black text-emerald-600 underline uppercase">Redraw</button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-widest text-center animate-pulse">Waiting for drawing...</div>
                  )}
                  <button 
                    onClick={confirmCameraMarking} 
                    disabled={!tempCameraRect}
                    className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg hover:bg-indigo-600 shadow-2xl transition-all disabled:opacity-50"
                  >
                    Confirm Scope
                  </button>
               </div>
            </div>
          )}

          {/* Step 3: Mark Zones */}
          {step === "mark-zones" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
               <div className="flex items-center space-x-3">
                 <button onClick={() => setStep("mark-camera")} className="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                 </button>
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">3. Zone Assets</h3>
               </div>

               <div className="space-y-6">
                  <div className="p-6 bg-purple-900 rounded-[32px] text-center space-y-2 shadow-xl">
                    <p className="text-white font-black uppercase text-sm tracking-widest">Calibration Phase</p>
                    <p className="text-purple-300 text-[10px] font-bold uppercase tracking-widest">Identify detection areas (AI Zones)</p>
                  </div>
                  
                  <div className="space-y-3">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Detected AI Assets ({detectedZones.length})</h4>
                     <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {detectedZones.length === 0 ? (
                          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-slate-400 font-bold text-[10px] uppercase">No zones configured for this device</p>
                          </div>
                        ) : (
                          detectedZones.map(z => {
                             const isMarked = tempZoneRects.some(tz => tz.name === z.name);
                             const isCurrent = activeMarkingZone === z.name;
                             return (
                               <button 
                                 key={z.name} 
                                 onClick={() => setActiveMarkingZone(z.name)} 
                                 className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${isCurrent ? 'border-purple-600 bg-purple-50 ring-4 ring-purple-50' : isMarked ? 'border-emerald-500 bg-emerald-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                               >
                                  <span className={`font-black text-xs ${isMarked ? 'text-emerald-900' : isCurrent ? 'text-purple-900' : 'text-slate-600'}`}>{z.name}</span>
                                  {isMarked ? (
                                    <div className="bg-emerald-500 rounded-full p-1"><svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg></div>
                                  ) : isCurrent ? (
                                    <span className="text-[8px] font-black bg-purple-600 text-white px-2 py-0.5 rounded-md animate-pulse">DRAWING...</span>
                                  ) : (
                                    <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                                  )}
                               </button>
                             );
                          })
                        )}
                     </div>
                  </div>

                  <button 
                    onClick={finishAllMarking} 
                    className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-lg hover:bg-emerald-600 shadow-2xl transition-all"
                  >
                    Finish Device Setup
                  </button>
               </div>
            </div>
          )}

          {/* Review Step */}
          {step === "review" && (
            <div className="space-y-6 animate-in zoom-in-95 duration-500">
               <div className="p-8 bg-slate-900 rounded-[40px] text-center space-y-4 shadow-2xl">
                  <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30 font-black text-2xl">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight">Setup Ready</h3>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="bg-white/5 p-3 rounded-2xl"><p className="text-[9px] text-slate-500 font-bold uppercase">Devices</p><p className="text-xl font-black text-white">{completedMarkers.length}</p></div>
                    <div className="bg-white/5 p-3 rounded-2xl"><p className="text-[9px] text-slate-500 font-bold uppercase">Zones</p><p className="text-xl font-black text-white">{completedMarkers.reduce((acc, m) => acc + m.zones.length, 0)}</p></div>
                  </div>
               </div>
               <div className="space-y-4">
                  <button onClick={handleAddAnother} className="w-full py-5 border-4 border-slate-100 text-slate-900 rounded-3xl font-black hover:border-indigo-600 hover:text-indigo-600 transition-all">+ Add Another Camera</button>
                  <button onClick={handleFinalSave} className="w-full py-6 bg-indigo-600 text-white rounded-3xl font-black text-xl shadow-2xl hover:bg-black transition-all">Submit Deployment</button>
               </div>
            </div>
          )}

          {/* Status Steps */}
          {step === "saving" && (
            <div className="py-24 text-center space-y-6 animate-pulse">
               <div className="relative w-20 h-20 mx-auto"><div className="absolute inset-0 bg-indigo-600 animate-ping rounded-full opacity-20" /><svg className="animate-spin h-full w-full text-indigo-600 relative" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>
               <p className="text-xl font-black text-slate-800 uppercase tracking-tighter">Digitizing Space...</p>
            </div>
          )}

          {step === "done" && (
             <div className="space-y-10 animate-in zoom-in-95 py-12">
               <div className="text-center space-y-4">
                  <div className="w-24 h-24 bg-emerald-500 text-white rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-100 rotate-6"><svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" d="M5 13l4 4L19 7" /></svg></div>
                  <h3 className="text-3xl font-black text-slate-800 tracking-tighter leading-none">Map Published!</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Deployment is now live and tracking.</p>
               </div>
               <button onClick={resetForm} className="w-full py-6 bg-slate-900 text-white rounded-[40px] font-black text-xl shadow-2xl hover:scale-[1.02] transition-all">Create New Setup</button>
             </div>
          )}
        </div>
      </aside>

      {/* Main Preview / Marking Area */}
      <main className="flex-1 p-4 lg:p-8 flex items-center justify-center relative bg-slate-100 overflow-hidden">
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#94a3b8 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />
        
        {floorPlanImageUrl ? (
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <div 
              className="relative bg-white p-2 rounded-[32px] shadow-[0_64px_128px_-32px_rgba(0,0,0,0.15)] ring-1 ring-black/5 animate-in zoom-in-95 duration-700"
            >
              <div className="relative overflow-hidden rounded-[24px] bg-slate-50">
                <img 
                  ref={floorPlanImageRef} 
                  src={floorPlanImageUrl} 
                  alt="Spatial Workspace" 
                  className="block max-w-full max-h-[80vh] w-auto h-auto select-none pointer-events-none" 
                  draggable={false} 
                />
                
                {/* Drawing & Indicators Overlay */}
                <div 
                  className="absolute inset-0 cursor-crosshair touch-none"
                  onMouseDown={handleMouseDown} 
                  onMouseMove={handleMouseMove} 
                  onMouseUp={handleMouseUp}
                >
                  {/* Indicators Layer */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Completed Markers */}
                    {completedMarkers.map((m, idx) => (
                      <div key={idx}>
                        <div className="absolute border-2 border-emerald-500 bg-emerald-500/10 backdrop-blur-[1px]" style={{ left: `${m.x}%`, top: `${m.y}%`, width: `${m.width}%`, height: `${m.height}%` }}>
                          <div className="bg-emerald-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-sm absolute -top-5 left-0 uppercase shadow-lg">CALIBRATED DEVICE</div>
                        </div>
                        {m.zones.map((z, zi) => (
                          <div key={zi} className="absolute border border-emerald-400/30 bg-emerald-400/5" style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.width}%`, height: `${z.height}%` }} />
                        ))}
                      </div>
                    ))}

                    {/* Temporary Camera Marker */}
                    {tempCameraRect && !isDrawing && (
                      <div className="absolute border-4 border-indigo-600/40 bg-indigo-600/5 rounded-lg transition-all" style={{ left: `${tempCameraRect.x}%`, top: `${tempCameraRect.y}%`, width: `${tempCameraRect.width}%`, height: `${tempCameraRect.height}%` }}>
                        <div className="absolute -top-6 left-0 bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-sm uppercase shadow-xl">CURRENT CAMERA AREA</div>
                      </div>
                    )}

                    {/* Temporary Zones */}
                    {tempZoneRects.map((z, i) => (
                      <div key={i} className="absolute border-2 border-purple-600 bg-purple-600/10 rounded-sm" style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.width}%`, height: `${z.height}%` }}>
                        <div className="absolute -top-5 left-0 bg-purple-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase whitespace-nowrap">{z.name}</div>
                      </div>
                    ))}

                    {/* Active Drawing Marker */}
                    {currentRect && (
                      <div className={`absolute border-4 ${step === 'mark-camera' ? 'border-indigo-600 bg-indigo-600/10 shadow-[0_0_30px_indigo]' : 'border-purple-600 bg-purple-600/10 shadow-[0_0_30px_purple]'}`} style={{ left: `${currentRect.x}%`, top: `${currentRect.y}%`, width: `${currentRect.width}%`, height: `${currentRect.height}%` }}>
                         <div className={`absolute -top-10 left-1/2 -translate-x-1/2 px-4 py-2 font-black text-white text-[10px] rounded-2xl shadow-2xl whitespace-nowrap animate-bounce ${step === 'mark-camera' ? 'bg-indigo-600' : 'bg-purple-600'}`}>
                            {step === 'mark-camera' ? 'DEFINE COVERAGE' : `ZONE: ${activeMarkingZone}`}
                         </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-xl text-center space-y-10 animate-in fade-in zoom-in-95 duration-700 bg-white p-20 rounded-[80px] shadow-2xl shadow-slate-200/50 border-4 border-dashed border-slate-100">
             <div className="w-24 h-24 bg-slate-50 text-slate-200 rounded-[40px] flex items-center justify-center mx-auto shadow-inner">
               <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
             </div>
             <div className="space-y-4">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">Spatial Canvas</h3>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs leading-relaxed">Map your visual environment <br/>to unlock real-time analytics</p>
             </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default FloorPlanUploader;
  