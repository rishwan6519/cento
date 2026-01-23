"use client";

import React, { useState, useRef, ChangeEvent, MouseEvent, useEffect } from "react";

// --- Types ---
interface CameraConfig {
  id?: string;
  _id?: string;
  name: string;
  zones: any[];
}

interface FloorMap {
  _id: string;
  name: string;
  imageUrl: string;
  uploadedAt: string;
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

const fetchFloorMaps = async (): Promise<FloorMap[]> => {
  try {
    const userId = "686cc66d9c011d7c23ae8b64"; // Same as API
    const res = await fetch(`/api/floor-map?userId=${userId}`);
    const data = await res.json();
    return data.success ? data.floorMaps : [];
  } catch (error) {
    return [];
  }
};

const fetchExistingMarkers = async (floorMapId: string): Promise<CameraMarker[]> => {
  try {
    const res = await fetch(`/api/camera-marker?floorMapId=${floorMapId}`);
    const data = await res.json();
    return data.success ? data.data : [];
  } catch (error) {
    return [];
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

const uploadFloorPlanFile = async (file: File, name: string): Promise<{ success: boolean; floorMapId?: string; error?: string }> => {
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
interface FloorPlanUploaderProps {
  initialStep?: "list" | "upload" | "config" | "mark-camera" | "mark-zones" | "saving" | "done" | "error";
}

const FloorPlanUploader: React.FC<FloorPlanUploaderProps> = ({ initialStep }) => {
  const [step, setStep] = useState<"list" | "upload" | "config" | "mark-camera" | "mark-zones" | "saving" | "done" | "error">(initialStep || "list");
  
  // Floor Map Selection
  const [floorMaps, setFloorMaps] = useState<FloorMap[]>([]);
  const [selectedFloorMap, setSelectedFloorMap] = useState<FloorMap | null>(null);
  
  // New Upload State
  const [newFloorName, setNewFloorName] = useState<string>("");
  const [newFloorFile, setNewFloorFile] = useState<File | null>(null);

  // Config State
  const [availableCameras, setAvailableCameras] = useState<CameraConfig[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [detectedZones, setDetectedZones] = useState<any[]>([]);
  const [existingMarkers, setExistingMarkers] = useState<CameraMarker[]>([]);
  
  // Marking Data
  const [activeMarkingZone, setActiveMarkingZone] = useState<string | null>(null);
  const [tempCameraRect, setTempCameraRect] = useState<TempMarker | null>(null);
  const [tempZoneRects, setTempZoneRects] = useState<ZoneMarker[]>([]);
  
  // UI State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentRect, setCurrentRect] = useState<TempMarker | null>(null);
  
  const floorPlanImageRef = useRef<HTMLImageElement>(null);

  // Load floor maps on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    const maps = await fetchFloorMaps();
    setFloorMaps(maps);
    setIsLoading(false);
  };

  const loadCameras = async () => {
    setIsLoading(true);
    try {
      const cameras = await fetchAvailableCameras();
      setAvailableCameras(cameras);
    } catch (error: any) {
      setErrorMessage("Failed to load cameras");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFloorSelect = async (map: FloorMap) => {
    setSelectedFloorMap(map);
    setIsLoading(true);
    const markers = await fetchExistingMarkers(map._id);
    setExistingMarkers(markers);
    await loadCameras();
    setStep("config");
    setIsLoading(false);
  };

  const handleUploadClick = () => {
    setStep("upload");
    setNewFloorName("");
    setNewFloorFile(null);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewFloorFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async () => {
    if (!newFloorFile || !newFloorName.trim()) {
      setErrorMessage("Please provide a name and file.");
      return;
    }
    setIsLoading(true);
    const res = await uploadFloorPlanFile(newFloorFile, newFloorName);
    if (res.success) {
      await loadInitialData();
      setStep("list");
    } else {
      setErrorMessage(res.error || "Upload failed");
    }
    setIsLoading(false);
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

  const startMarkingCamera = () => {
    if (!selectedCameraId) {
      setErrorMessage("Please select a camera first.");
      return;
    }
    setStep("mark-camera");
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
    if (!isDrawing || !currentRect || currentRect.width < 1 || currentRect.height < 1) {
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

  const handleFinalSave = async () => {
    if (!selectedFloorMap || !selectedCameraId || !tempCameraRect) return;
    setIsLoading(true);
    setStep("saving");

    const newMarker: CameraMarker = {
      cameraId: selectedCameraId,
      x: tempCameraRect.x,
      y: tempCameraRect.y,
      width: tempCameraRect.width,
      height: tempCameraRect.height,
      floorMapId: selectedFloorMap._id,
      zones: tempZoneRects
    };

    try {
      await saveMarker(newMarker);
      const markers = await fetchExistingMarkers(selectedFloorMap._id);
      setExistingMarkers(markers);
      setStep("done");
    } catch (error: any) {
      setErrorMessage(error.message);
      setStep("error");
    } finally {
      setIsLoading(false);
    }
  };

  const resetToConfig = () => {
    setStep("config");
    setSelectedCameraId("");
    setTempCameraRect(null);
    setTempZoneRects([]);
    setDetectedZones([]);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-full lg:w-[450px] bg-white border-r border-slate-200 flex flex-col h-screen overflow-y-auto z-20 shadow-xl">
        <div className="p-8 space-y-10">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Spatial Manager
            </h1>
            <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-bold">Floor & Device Sync</p>
          </div>

          {errorMessage && (
            <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 p-4 rounded-xl flex items-start space-x-3 transition-all animate-in fade-in">
              <span className="text-sm font-medium">{errorMessage}</span>
            </div>
          )}

          {/* List View */}
          {step === "list" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Active Floors</h3>
                <button onClick={handleUploadClick} className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg hover:bg-black transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                </button>
              </div>

              <div className="space-y-3">
                {floorMaps.length === 0 ? (
                  <div className="p-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold text-xs uppercase">No floors active</p>
                  </div>
                ) : (
                  floorMaps.map(map => (
                    <button 
                      key={map._id}
                      onClick={() => handleFloorSelect(map)}
                      className="w-full group relative bg-white border-2 border-slate-100 rounded-3xl p-5 text-left hover:border-indigo-600 transition-all hover:shadow-xl overflow-hidden"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0">
                          <img src={map.imageUrl} alt={map.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div>
                          <p className="text-lg font-black text-slate-800 tracking-tight">{map.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(map.uploadedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Upload View */}
          {step === "upload" && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <button onClick={() => setStep("list")} className="flex items-center space-x-2 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-indigo-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                <span>Back to List</span>
              </button>
              <h3 className="text-xl font-black text-slate-800">New Floor Layout</h3>
              <div className="space-y-6">
                <input
                  type="text"
                  value={newFloorName}
                  onChange={(e) => setNewFloorName(e.target.value)}
                  placeholder="Floor Name (ex: GF Lobby)"
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-bold focus:ring-4 focus:ring-indigo-500/10"
                />
                <div className="relative group p-12 border-4 border-dashed border-slate-100 bg-slate-50 rounded-[40px] text-center space-y-4 hover:border-indigo-100 transition-all">
                  <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <div className="w-16 h-16 bg-white text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg></div>
                  <p className="font-black text-slate-800 text-sm">{newFloorFile ? newFloorFile.name : 'Drop blueprint here'}</p>
                </div>
                <button onClick={handleUploadSubmit} className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-xl shadow-2xl hover:bg-black transition-all">Publish Layout</button>
              </div>
            </div>
          )}

          {/* Config View (Link Cameras and Zones) */}
          {step === "config" && selectedFloorMap && (
            <div className="space-y-8 animate-in slide-in-from-right-4">
              <button onClick={() => setStep("list")} className="flex items-center space-x-2 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-indigo-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                <span>Change Floor</span>
              </button>
              
              <div className="p-6 bg-slate-900 rounded-[32px] text-white space-y-1 shadow-2xl">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Selected Space</p>
                <h4 className="text-2xl font-black tracking-tight">{selectedFloorMap.name}</h4>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Connect Hardware</label>
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {availableCameras.map(cam => {
                     const camId = (cam.id || cam._id) as string;
                     const isAssigned = existingMarkers.some(m => m.cameraId === camId);
                     return (
                       <button 
                         key={camId}
                         onClick={() => !isAssigned && setSelectedCameraId(camId)}
                         className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${selectedCameraId === camId ? 'border-indigo-600 bg-indigo-50' : 'bg-slate-50 border-slate-100'} ${isAssigned ? 'opacity-40 grayscale cursor-not-allowed' : 'hover:border-slate-200'}`}
                       >
                         <div className="flex items-center space-x-3 text-left">
                           <div className={`p-2 rounded-lg ${selectedCameraId === camId ? 'bg-indigo-600 text-white' : 'bg-white shadow-sm text-slate-400'}`}>
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14" /></svg>
                           </div>
                           <div>
                             <p className="font-black text-slate-800 text-xs">{cam.name}</p>
                             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{isAssigned ? 'Already Positioned' : `Channel ${cam.zones.length} Zones`}</p>
                           </div>
                         </div>
                       </button>
                     );
                  })}
                </div>
                <button 
                  onClick={startMarkingCamera}
                  disabled={!selectedCameraId}
                  className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-xl shadow-2xl disabled:opacity-20"
                >
                  Configure Markers
                </button>
              </div>
            </div>
          )}

          {/* Mark Camera Step */}
          {step === "mark-camera" && (
            <div className="space-y-8">
              <h3 className="text-xl font-black text-slate-800">Draw Scope</h3>
              <p className="text-slate-500 text-sm leading-relaxed font-medium">Draw a rectangle on the floor map to define the precise view coverage of the selected camera.</p>
              <div className="p-6 bg-indigo-600 rounded-[32px] text-white text-center animate-pulse">
                <p className="font-black uppercase text-xs">Ready to Paint Scope</p>
              </div>
              <div className="space-y-4">
                <button onClick={() => setStep("mark-zones")} disabled={!tempCameraRect} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-xl hover:bg-indigo-600 transition-all disabled:opacity-20">Confirm Scope</button>
                <button onClick={resetToConfig} className="w-full py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest">Discard & Reset</button>
              </div>
            </div>
          )}

          {/* Mark Zones Step */}
          {step === "mark-zones" && (
            <div className="space-y-8">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">AI Zone Mapping</h3>
              <div className="space-y-3">
                 {detectedZones.length === 0 ? (
                   <p className="text-slate-400 font-bold text-xs p-10 bg-slate-50 border-2 border-dashed rounded-3xl text-center uppercase tracking-widest">No AI zones found on device</p>
                 ) : (
                   detectedZones.map(z => (
                     <button 
                       key={z.name}
                       onClick={() => setActiveMarkingZone(z.name)}
                       className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${activeMarkingZone === z.name ? 'border-purple-600 bg-purple-50 ring-4 ring-purple-50' : tempZoneRects.some(tz => tz.name === z.name) ? 'border-emerald-500 bg-emerald-50' : 'bg-slate-50 border-slate-100'}`}
                     >
                       <span className="font-black text-xs text-slate-700">{z.name}</span>
                       <div className={`p-1 rounded-md ${tempZoneRects.some(tz => tz.name === z.name) ? 'bg-emerald-500' : 'bg-slate-200'} text-white`}>
                         <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                       </div>
                     </button>
                   ))
                 )}
              </div>
              <button onClick={handleFinalSave} className="w-full py-5 bg-emerald-600 text-white rounded-3xl font-black text-xl shadow-2xl">Publish All Markers</button>
            </div>
          )}

          {/* Result View */}
          {step === "done" && (
            <div className="py-20 text-center space-y-10 animate-in zoom-in-95">
              <div className="w-24 h-24 bg-emerald-500 text-white rounded-[40px] flex items-center justify-center mx-auto shadow-2xl rotate-12"><svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" d="M5 13l4 4L19 7" /></svg></div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-slate-800">Layout Updated!</h3>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Camera linkage successfully synchronized</p>
              </div>
              <button onClick={() => setStep("list")} className="w-full py-6 bg-slate-900 text-white rounded-[40px] font-black text-xl shadow-2xl">Return to Floor View</button>
            </div>
          )}
        </div>
      </aside>

      {/* Preview Area */}
      <main className="flex-1 p-4 lg:p-12 flex items-center justify-center relative bg-slate-100 overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#94a3b8 0.5px, transparent 0.5px)', backgroundSize: '32px 32px' }} />
        
        {selectedFloorMap ? (
          <div className="relative w-full h-full flex items-center justify-center p-4">
             <div className="relative bg-white p-3 rounded-[3.5rem] shadow-2xl ring-1 ring-black/5 overflow-hidden animate-in zoom-in-95 duration-1000">
                <div className="relative rounded-[2.8rem] overflow-hidden bg-slate-50">
                  <img ref={floorPlanImageRef} src={selectedFloorMap.imageUrl} className="block max-w-full max-h-[85vh] w-auto h-auto select-none pointer-events-none" />
                  
                  <div className="absolute inset-0 cursor-crosshair touch-none" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Existing Historical Markers */}
                      {existingMarkers.map((m, idx) => (
                        <div key={idx}>
                          <div className="absolute border-2 border-slate-400 bg-slate-500/10" style={{ left: `${m.x}%`, top: `${m.y}%`, width: `${m.width}%`, height: `${m.height}%` }} />
                          {m.zones.map((z, zi) => (
                             <div key={zi} className="absolute border border-slate-300 bg-slate-400/5" style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.width}%`, height: `${z.height}%` }} />
                          ))}
                        </div>
                      ))}

                      {/* Fresh/Active Working Markers */}
                      {tempCameraRect && (
                        <div className="absolute border-4 border-indigo-600 bg-indigo-600/10 shadow-[0_0_40px_rgba(79,70,229,0.3)] rounded-xl" style={{ left: `${tempCameraRect.x}%`, top: `${tempCameraRect.y}%`, width: `${tempCameraRect.width}%`, height: `${tempCameraRect.height}%` }}>
                          <span className="absolute -top-6 left-0 bg-indigo-600 text-white text-[8px] font-black px-2 py-0.5 rounded-sm uppercase">NEW COVERAGE</span>
                        </div>
                      )}

                      {tempZoneRects.map((z, i) => (
                        <div key={i} className="absolute border-2 border-purple-600 bg-purple-600/15 rounded-lg" style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.width}%`, height: `${z.height}%` }}>
                          <span className="absolute -top-5 left-0 bg-purple-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase whitespace-nowrap">{z.name}</span>
                        </div>
                      ))}

                      {currentRect && (
                        <div className={`absolute border-4 ${step === 'mark-camera' ? 'border-indigo-600 bg-indigo-600/20' : 'border-purple-600 bg-purple-600/20'} animate-pulse`} style={{ left: `${currentRect.x}%`, top: `${currentRect.y}%`, width: `${currentRect.width}%`, height: `${currentRect.height}%` }}>
                          <div className={`absolute -top-10 left-1/2 -translate-x-1/2 px-4 py-2 font-black text-white text-[10px] rounded-2xl ${step === 'mark-camera' ? 'bg-indigo-600 shadow-[0_0_30px_indigo]' : 'bg-purple-600 shadow-[0_0_30px_purple]'}`}>
                            {step === 'mark-camera' ? 'DEFINING COVERAGE' : `MAPPING: ${activeMarkingZone}`}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
             </div>
          </div>
        ) : (
          <div className="max-w-xl text-center space-y-12 bg-white p-24 rounded-[100px] shadow-2xl border-4 border-dashed border-slate-100 animate-in fade-in zoom-in-95 duration-1000">
             <div className="w-32 h-32 bg-slate-50 text-slate-200 rounded-[50px] flex items-center justify-center mx-auto shadow-inner"><svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg></div>
             <div className="space-y-4">
                <h3 className="text-4xl font-black text-slate-800 tracking-tighter uppercase leading-none">Perspective Hub</h3>
                <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Select a layout to begin synchronization</p>
             </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default FloorPlanUploader;