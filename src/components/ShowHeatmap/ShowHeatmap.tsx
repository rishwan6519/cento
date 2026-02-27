







//new code 


"use client";

import React, { useState, useEffect, useRef } from "react";

// Define types
interface FloorMap {
  _id: string;
  name: string;
  imageUrl: string;
  userId: string;
  uploadedAt: string;
}

interface IZone {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CameraMarker {
  _id: string;
  cameraId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  floorMapId: string;
  zones?: IZone[];
  createdAt: string;
}

interface ZoneData {
  zone_id: number;
  zone_name: string;
  total_in_count: number;
  total_out_count: number;
}

interface CameraHeatmapData {
  cameraId: string;
  zones: ZoneData[];
  marker: CameraMarker;
}

// API Functions
const fetchFloorMaps = async (): Promise<FloorMap[]> => {
  try {
    const res = await fetch(`/api/floor-map?userId=686cc66d9c011d7c23ae8b64`);
    const data = await res.json();
    if (data.success && Array.isArray(data.floorMaps)) {
      return data.floorMaps;
    }
    return [];
  } catch (error) {
    console.error("Error fetching floor maps:", error);
    return [];
  }
};

const fetchCameraMarkers = async (floorMapId: string): Promise<CameraMarker[]> => {
  try {
    const res = await fetch(`/api/camera-marker?floorMapId=${floorMapId}`);
    const data = await res.json();
    if (data.success) {
      return data.data || [];
    }
    return [];
  } catch (error) {
    console.error("Error fetching camera markers:", error);
    return [];
  }
};

const fetchZoneHeatmapData = async (
  cameraId: string,
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string
): Promise<ZoneData[]> => {
  try {
    const params = new URLSearchParams({
      cameraId,
      startDate,
      startTime,
      endDate,
      endTime,
    });
    console.log(params.toString(), "this is params of zones");
    const res = await fetch(`/api/zones?${params.toString()}`);
    const data = await res.json();
    
    if (data.error) {
      console.error("API Error:", data.error);
      return [];
    }
    
    return data.zones || [];
  } catch (error) {
    console.error("Error fetching zone data:", error);
    return [];
  }
};

const getHeatmapColor = (count: number, maxCount: number): string => {
  if (maxCount === 0) return "rgba(0, 255, 0, 0.6)";
  
  const intensity = count / maxCount;
  
  if (intensity < 0.2) return "rgba(0, 255, 0, 0.7)";
  if (intensity < 0.4) return "rgba(173, 255, 47, 0.75)";
  if (intensity < 0.6) return "rgba(255, 255, 0, 0.8)";
  if (intensity < 0.8) return "rgba(255, 140, 0, 0.85)";
  return "rgba(255, 0, 0, 0.9)";
};

const HeatmapViewer: React.FC = () => {
  const [floorMaps, setFloorMaps] = useState<FloorMap[]>([]);
  const [selectedFloorMap, setSelectedFloorMap] = useState<FloorMap | null>(null);
  const [cameraMarkers, setCameraMarkers] = useState<CameraMarker[]>([]);
  const [heatmapData, setHeatmapData] = useState<CameraHeatmapData[]>([]);
  
  const [startDate, setStartDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("00:00");
  const [endDate, setEndDate] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("23:59");
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [viewState, setViewState] = useState<"config" | "heatmap">("config");
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 0, h: 0 });
  const [showControls, setShowControls] = useState<boolean>(true);
  
  const floorPlanImageRef = useRef<HTMLImageElement>(null);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImgNaturalSize({
      w: e.currentTarget.naturalWidth,
      h: e.currentTarget.naturalHeight
    });
  };

  useEffect(() => {
    loadFloorMaps();
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  }, []);

  useEffect(() => {
    if (selectedFloorMap) {
      loadCameraMarkers(selectedFloorMap._id);
    }
  }, [selectedFloorMap]);

  const loadFloorMaps = async () => {
    setIsLoading(true);
    const maps = await fetchFloorMaps();
    setFloorMaps(maps);
    setIsLoading(false);
  };

  const loadCameraMarkers = async (floorMapId: string) => {
    const markers = await fetchCameraMarkers(floorMapId);
    setCameraMarkers(markers);
  };

  const handleDeleteFloorMap = async (e: React.MouseEvent, mapId: string) => {
    e.stopPropagation(); // Prevent selecting the map when clicking delete
    
    if (!window.confirm("Are you sure you want to delete this floor plan? This will also remove all camera markers and physical files.")) {
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/floor-map?id=${mapId}`, { method: "DELETE" });
      const data = await res.json();
      
      if (data.success) {
        // Remove from local state
        setFloorMaps(prev => prev.filter(m => m._id !== mapId));
        if (selectedFloorMap?._id === mapId) {
          setSelectedFloorMap(null);
          setCameraMarkers([]);
        }
      } else {
        setErrorMessage(data.message || "Failed to delete floor map");
      }
    } catch (err) {
      setErrorMessage("Error connecting to server for deletion");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateHeatmap = async () => {
    if (!selectedFloorMap) {
      setErrorMessage("Please select a floor map.");
      return;
    }
    if (!startDate || !endDate) {
      setErrorMessage("Please select valid dates.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const heatmapResults: CameraHeatmapData[] = [];
      for (const marker of cameraMarkers) {
        const stats = await fetchZoneHeatmapData(
          marker.cameraId,
          startDate,
          startTime,
          endDate,
          endTime
        );
        if (stats.length > 0) {
          heatmapResults.push({
            cameraId: marker.cameraId,
            zones: stats,
            marker,
          });
        }
      }

      if (heatmapResults.length === 0) {
        setErrorMessage("No heatmap data found for this range.");
      } else {
        setHeatmapData(heatmapResults);
        setViewState("heatmap");
      }
    } catch (error: any) {
      setErrorMessage("Failed to generate heatmap.");
    } finally {
      setIsLoading(false);
    }
  };

  const getMaxCount = (): number => {
    let max = 0;
    heatmapData.forEach((camera) => {
      camera.zones.forEach((zone) => {
        const total = zone.total_in_count;
        if (total > max) max = total;
      });
    });
    return max;
  };

  if (viewState === "config") {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center p-6 md:p-12 font-sans">
        <div className="max-w-6xl w-full space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-5xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Heatmap Analytics
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Configure Your Generation Parameters</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Step 1: Floor Selection */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-xl font-black text-slate-800 flex items-center space-x-3">
                <span className="bg-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                <span>Select Floor Environment</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {floorMaps.map((map) => (
                  <button
                    key={map._id}
                    onClick={() => setSelectedFloorMap(map)}
                    className={`group relative h-48 rounded-3xl overflow-hidden border-4 transition-all duration-500 ${
                      selectedFloorMap?._id === map._id
                        ? "border-indigo-600 shadow-2xl scale-[1.02]"
                        : "border-white border-opacity-50 hover:border-indigo-200 shadow-xl"
                    }`}
                  >
                    <img src={map.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-700" alt="" />
                    <div className={`absolute inset-0 flex flex-col justify-end p-6 ${selectedFloorMap?._id === map._id ? 'bg-gradient-to-t from-indigo-900/40' : 'bg-gradient-to-t from-black/20'}`}>
                      <span className="text-xl font-black text-white">{map.name}</span>
                    </div>
                    
                    {/* Select Indicator */}
                    {selectedFloorMap?._id === map._id && (
                      <div className="absolute top-4 left-4 bg-indigo-600 text-white p-2 rounded-full shadow-lg">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                      </div>
                    )}

                    {/* Delete Button */}
                    <div 
                      onClick={(e) => handleDeleteFloorMap(e, map._id)}
                      className="absolute top-4 right-4 bg-white/20 hover:bg-rose-600 backdrop-blur-md text-white p-2.5 rounded-2xl shadow-lg transition-all duration-300 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Time Settings */}
            <div className="space-y-6">
               <h2 className="text-xl font-black text-slate-800 flex items-center space-x-3">
                <span className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                <span>Set Window</span>
              </h2>
              <div className="bg-white p-8 rounded-[40px] shadow-2xl shadow-indigo-100 border border-indigo-50 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Date Range</label>
                    <div className="flex flex-col space-y-2 mt-2">
                       <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700transition-all" />
                       <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 transition-all" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Daily Hours</label>
                    <div className="flex items-center space-x-2 mt-2">
                      <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 transition-all" />
                      <span className="text-slate-300">—</span>
                      <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="flex-1 px-4 py-3 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 transition-all" />
                    </div>
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold border border-rose-100 animate-pulse text-center">
                    {errorMessage}
                  </div>
                )}

                <button
                  onClick={handleGenerateHeatmap}
                  disabled={isLoading || !selectedFloorMap}
                  className="w-full py-5 rounded-3xl bg-slate-900 text-white font-black text-lg shadow-2xl hover:bg-indigo-600 active:scale-95 transition-all duration-300 disabled:opacity-50 flex items-center justify-center space-x-3"
                >
                  {isLoading ? (
                    <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      <span>Analyze Density</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // HEATMAP FULL SCREEN VIEW
  return (
    <div className="relative w-screen h-screen bg-slate-100 overflow-hidden flex flex-col">
      {/* Immersive Header Toolbar */}
      <div className={`absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-4 transition-all duration-500 ${showControls ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0'}`}>
        <button 
          onClick={() => setViewState("config")}
          className="bg-white shadow-2xl p-4 rounded-3xl hover:bg-slate-50 transition-colors group"
        >
          <svg className="w-5 h-5 text-slate-800 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        
        <div className="bg-white/90 backdrop-blur-2xl px-8 py-4 rounded-[40px] shadow-2xl flex items-center space-x-8 border border-white">
          <div className="flex items-center space-x-3 border-r border-slate-200 pr-8">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest leading-none">{selectedFloorMap?.name}</h2>
          </div>
          <div className="flex items-center space-x-10">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Peak</span>
              <span className="text-lg font-black text-indigo-600 leading-none">{getMaxCount()}</span>
            </div>
             <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Activity</span>
              <span className="text-lg font-black text-emerald-600 leading-none">High</span>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setShowControls(!showControls)}
          className={`bg-white shadow-2xl p-4 rounded-3xl transition-all ${!showControls ? 'rotate-180' : ''}`}
        >
           <svg className="w-5 h-5 text-slate-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
        </button>
      </div>

      {/* Floating Legend Overlay */}
      <div className={`absolute bottom-8 right-8 z-50 bg-white/80 backdrop-blur-xl p-6 rounded-[32px] shadow-2xl border border-white transition-all duration-700 ${showControls ? 'translate-y-0 opacity-100' : 'translate-y-32 opacity-0'}`}>
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Density Threshold</h3>
        <div className="space-y-2">
            {[
              { label: "Critical Flow", color: "bg-rose-500" },
              { label: "High Volume", color: "bg-orange-500" },
              { label: "Optimal Traffic", color: "bg-yellow-400" },
              { label: "Light Activity", color: "bg-lime-400" },
              { label: "Minimal Flow", color: "bg-emerald-500" },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${item.color} shadow-sm`} />
                <span className="text-[10px] font-extrabold text-slate-600">{item.label}</span>
              </div>
            ))}
          </div>
      </div>

      {/* Full Screen Viewport Area */}
      <div className="flex-1 w-full h-full flex items-center justify-center p-4">
        <div className="relative group max-w-full max-h-full">
          {/* Floor Plan Container */}
          <div className="relative bg-white p-2 rounded-[40px] shadow-[0_64px_128px_-32px_rgba(0,0,0,0.15)] ring-1 ring-black/5">
            <div className="relative overflow-hidden rounded-[32px] bg-slate-50">
              <img
                ref={floorPlanImageRef}
                src={selectedFloorMap?.imageUrl}
                alt={selectedFloorMap?.name}
                onLoad={handleImageLoad}
                className="block max-w-full max-h-[85vh] w-auto h-auto object-contain select-none"
                draggable={false}
              />

              {heatmapData.length > 0 && heatmapData.map((cameraData) => {
                const maxCount = getMaxCount();

                return (
                  <React.Fragment key={cameraData.cameraId}>
                    {/* Camera Coverage Area - Light Dotted Preview */}
                    <div 
                      className="absolute border-2 border-dashed border-indigo-500/20 bg-indigo-500/5 rounded-xl transition-opacity duration-1000"
                      style={{
                        left: `${cameraData.marker.x}%`,
                        top: `${cameraData.marker.y}%`,
                        width: `${cameraData.marker.width}%`,
                        height: `${cameraData.marker.height}%`,
                        pointerEvents: "none",
                        zIndex: 2
                      }}
                    />

                    {/* Camera Zone Visualization Overlay */}
                    {cameraData.zones.map((zoneStat) => {
                      const definedZone = cameraData.marker.zones?.find(
                        z => z.name === zoneStat.zone_name
                      );

                      if (!definedZone) return null;

                      const totalCount = zoneStat.total_in_count;
                      const color = getHeatmapColor(totalCount, maxCount);

                      return (
                        <React.Fragment key={zoneStat.zone_name}>
                          {/* Pulsing Advanced Heatmap Blob */}
                          <div
                            className="absolute animate-pulse"
                            style={{
                              left: `${definedZone.x}%`,
                              top: `${definedZone.y}%`,
                              width: `${definedZone.width}%`,
                              height: `${definedZone.height}%`,
                              borderRadius: '40%',
                              background: `radial-gradient(circle at center, ${color} 0%, ${color.replace(/[\d.]+\)$/g, '0.1)')} 75%, transparent 100%)`,
                              pointerEvents: "none",
                              filter: 'blur(15px)',
                              mixBlendMode: 'multiply',
                              zIndex: 5,
                              animationDuration: '3s'
                            }}
                          />
                          
                          {/* Floating Data pill */}
                          <div
                            className="absolute"
                            style={{
                              left: `${definedZone.x + definedZone.width / 2}%`,
                              top: `${definedZone.y + definedZone.height / 2}%`,
                              transform: 'translate(-50%, -50%)',
                              pointerEvents: "none",
                              zIndex: 30,
                            }}
                          >
                             <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-2xl border border-white flex flex-col items-center min-w-[60px] transform hover:scale-125 transition-transform">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{definedZone.name}</span>
                                <span className="text-lg font-black text-slate-900">{totalCount}</span>
                             </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Visibility Toggle Button (Only visible when controls hidden) */}
      {!showControls && (
        <button 
          onClick={() => setShowControls(true)}
          className="absolute top-8 left-8 bg-indigo-600 text-white p-4 rounded-full shadow-2xl animate-bounce z-50"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
        </button>
      )}
    </div>
  );
};

export default HeatmapViewer;