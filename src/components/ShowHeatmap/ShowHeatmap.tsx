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

interface CameraMarker {
  _id: string;
  cameraId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  floorMapId: string;
  createdAt: string;
}

interface ZoneData {
  zone_id: number;
  total_in_count: number;
  total_out_count: number;
}

interface CameraHeatmapData {
  cameraId: string;
  zones: ZoneData[];
  marker: CameraMarker;
}

// Generate well-distributed positions for zones based on zone_id
const getRandomZonePosition = (zoneId: number, cameraWidth: number, cameraHeight: number, totalZones: number) => {
  // Use zone_id as seed for consistent random positions
  const seed = zoneId * 12345;
  const random = (n: number) => Math.abs((Math.sin(seed + n) * 10000) % 1);
  
  // Smaller zones with more spacing - between 20% to 35% of camera area
  const sizeMultiplier = 0.2 + random(1) * 0.15;
  const zoneSize = Math.min(cameraWidth, cameraHeight) * sizeMultiplier;
  
  // Create a grid-like distribution with randomization
  // Divide camera into sectors based on zone count
  const sectorsPerRow = Math.ceil(Math.sqrt(totalZones));
  const sectorWidth = cameraWidth / sectorsPerRow;
  const sectorHeight = cameraHeight / sectorsPerRow;
  
  // Determine which sector this zone belongs to
  const sectorIndex = (zoneId - 1) % (sectorsPerRow * sectorsPerRow);
  const sectorRow = Math.floor(sectorIndex / sectorsPerRow);
  const sectorCol = sectorIndex % sectorsPerRow;
  
  // Add randomization within the sector to avoid perfect grid
  const randomOffsetX = random(2) * 0.6 + 0.2; // 20% to 80% within sector
  const randomOffsetY = random(3) * 0.6 + 0.2;
  
  // Calculate position with padding to avoid edges
  const padding = zoneSize * 0.1;
  const x = sectorCol * sectorWidth + (sectorWidth - zoneSize) * randomOffsetX + padding;
  const y = sectorRow * sectorHeight + (sectorHeight - zoneSize) * randomOffsetY + padding;
  
  // Ensure zone stays within bounds
  const clampedX = Math.max(padding, Math.min(x, cameraWidth - zoneSize - padding));
  const clampedY = Math.max(padding, Math.min(y, cameraHeight - zoneSize - padding));
  
  return {
    x: clampedX,
    y: clampedY,
    size: zoneSize
  };
};

// --- API Functions ---
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
    const res = await fetch(`/api/zones?${params}`);
    const data = await res.json();
    return data.zones || [];
  } catch (error) {
    console.error("Error fetching zone data:", error);
    return [];
  }
};

// --- Helper Functions ---
const getHeatmapColor = (count: number, maxCount: number): string => {
  if (maxCount === 0) return "rgba(0, 255, 0, 0.6)";
  
  const intensity = count / maxCount;
  
  // Much more vibrant and noticeable colors
  if (intensity < 0.2) return "rgba(0, 255, 0, 0.7)"; // Bright green
  if (intensity < 0.4) return "rgba(173, 255, 47, 0.75)"; // Yellow-green
  if (intensity < 0.6) return "rgba(255, 255, 0, 0.8)"; // Bright yellow
  if (intensity < 0.8) return "rgba(255, 140, 0, 0.85)"; // Bright orange
  return "rgba(255, 0, 0, 0.9)"; // Bright red
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
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  
  const floorPlanImageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    loadFloorMaps();
    
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  }, []);

  useEffect(() => {
    if (selectedFloorMap) {
      loadCameraMarkers(selectedFloorMap._id);
      setShowHeatmap(false);
      setHeatmapData([]);
      setErrorMessage("");
    } else {
      setCameraMarkers([]);
      setShowHeatmap(false);
      setHeatmapData([]);
      setErrorMessage("");
    }
  }, [selectedFloorMap]);

  const loadFloorMaps = async () => {
    setIsLoading(true);
    const maps = await fetchFloorMaps();
    setFloorMaps(maps);
    setIsLoading(false);
  };

  const loadCameraMarkers = async (floorMapId: string) => {
    setIsLoading(true);
    const markers = await fetchCameraMarkers(floorMapId);
    setCameraMarkers(markers);
    setIsLoading(false);
  };

  const handleGenerateHeatmap = async () => {
    if (!selectedFloorMap) {
      setErrorMessage("Please select a floor map.");
      return;
    }
    if (cameraMarkers.length === 0) {
      setErrorMessage("The selected floor map has no cameras configured.");
      return;
    }

    if (!startDate || !endDate) {
      setErrorMessage("Please select valid start and end dates.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setShowHeatmap(false);

    try {
      const heatmapResults: CameraHeatmapData[] = [];

      for (const marker of cameraMarkers) {
        const zones = await fetchZoneHeatmapData(
          marker.cameraId,
          startDate,
          startTime,
          endDate,
          endTime
        );

        if (zones.length > 0) {
          heatmapResults.push({
            cameraId: marker.cameraId,
            zones,
            marker,
          });
        }
      }

      if (heatmapResults.length === 0) {
        setErrorMessage("No heatmap data found for any camera in the selected date/time range.");
        setHeatmapData([]);
      } else {
        setHeatmapData(heatmapResults);
        setShowHeatmap(true);
      }
    } catch (error: any) {
      console.error("Error generating heatmap:", error);
      setErrorMessage(error.message || "Failed to generate heatmap. Please try again.");
      setHeatmapData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getMaxCount = (): number => {
    let max = 0;
    heatmapData.forEach((camera) => {
      camera.zones.forEach((zone) => {
        const total = zone.total_in_count + zone.total_out_count;
        if (total > max) max = total;
      });
    });
    return max;
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50 text-gray-800">
      <aside className="w-full md:w-96 p-6 bg-white shadow-lg flex flex-col">
        <h1 className="text-3xl font-bold text-purple-700 mb-6">Heatmap Viewer</h1>

        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{errorMessage}</span>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <h2 className="text-xl font-semibold text-gray-700">Select Floor Map</h2>
          <select
            value={selectedFloorMap?._id || ""}
            onChange={(e) => {
              const map = floorMaps.find((m) => m._id === e.target.value);
              setSelectedFloorMap(map || null);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            disabled={isLoading}
          >
            <option value="">-- Select a Floor Map --</option>
            {floorMaps.map((map) => (
              <option key={map._id} value={map._id}>
                {map.name}
              </option>
            ))}
          </select>
          
          {selectedFloorMap && (
            <div className="bg-gray-100 p-3 rounded">
              <p className="text-sm text-gray-600">
                <strong>Cameras Available:</strong> {cameraMarkers.length}
              </p>
            </div>
          )}
        </div>

        {selectedFloorMap && cameraMarkers.length > 0 && (
          <div className="space-y-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-700">Select Date & Time Range</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  disabled={isLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              onClick={handleGenerateHeatmap}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !startDate || !endDate}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Generating...</span>
                </div>
              ) : (
                "Generate Heatmap"
              )}
            </button>
          </div>
        )}

        {showHeatmap && heatmapData.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-lg font-semibold text-gray-700">Heatmap Legend</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full" style={{ background: "radial-gradient(circle, rgba(0, 255, 0, 0.7) 0%, rgba(0, 255, 0, 0.3) 50%, transparent 100%)", filter: "blur(2px)" }}></div>
                <span className="text-sm">Low Traffic (0-20%)</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full" style={{ background: "radial-gradient(circle, rgba(173, 255, 47, 0.75) 0%, rgba(173, 255, 47, 0.4) 50%, transparent 100%)", filter: "blur(2px)" }}></div>
                <span className="text-sm">Medium-Low (20-40%)</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full" style={{ background: "radial-gradient(circle, rgba(255, 255, 0, 0.8) 0%, rgba(255, 255, 0, 0.4) 50%, transparent 100%)", filter: "blur(2px)" }}></div>
                <span className="text-sm">Medium (40-60%)</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full" style={{ background: "radial-gradient(circle, rgba(255, 140, 0, 0.85) 0%, rgba(255, 140, 0, 0.4) 50%, transparent 100%)", filter: "blur(2px)" }}></div>
                <span className="text-sm">Medium-High (60-80%)</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full" style={{ background: "radial-gradient(circle, rgba(255, 0, 0, 0.9) 0%, rgba(255, 0, 0, 0.4) 50%, transparent 100%)", filter: "blur(2px)" }}></div>
                <span className="text-sm">High Traffic (80-100%)</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 p-6 flex flex-col items-center justify-center bg-gray-100">
        {selectedFloorMap ? (
          <div className="relative border-2 border-gray-300 bg-white p-4 rounded-lg shadow-md max-w-full max-h-full overflow-auto">
       <img
  ref={floorPlanImageRef}
  src={`https://iot.centelon.com${selectedFloorMap.imageUrl}`}
  alt={selectedFloorMap.name}
  className="block max-w-full h-auto select-none"
  draggable={false}
/>


            {!showHeatmap && cameraMarkers.map((marker) => (
              <div
                key={marker._id}
                className="absolute border-3 border-blue-500 bg-blue-500 bg-opacity-20"
                style={{
                  left: marker.x,
                  top: marker.y,
                  width: marker.width,
                  height: marker.height,
                  pointerEvents: "none",
                }}
              >
                <div className="absolute -top-7 left-0 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                  {marker.cameraId}
                </div>
              </div>
            ))}

            {showHeatmap && heatmapData.length > 0 && heatmapData.map((cameraData) => {
              const maxCount = getMaxCount();

              return (
                <div
                  key={cameraData.cameraId}
                  className="absolute border-2 border-gray-700"
                  style={{
                    left: cameraData.marker.x,
                    top: cameraData.marker.y,
                    width: cameraData.marker.width,
                    height: cameraData.marker.height,
                    pointerEvents: "none",
                  }}
                >
                  <div className="absolute -top-8 left-0 bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                    {cameraData.cameraId}
                  </div>
                  
                  {cameraData.zones.map((zone) => {
                    const zonePosition = getRandomZonePosition(
                      zone.zone_id,
                      cameraData.marker.width,
                      cameraData.marker.height,
                      cameraData.zones.length
                    );
                    const totalCount = zone.total_in_count + zone.total_out_count;
                    const color = getHeatmapColor(totalCount, maxCount);

                    return (
                      <div
                        key={zone.zone_id}
                        className="absolute"
                        style={{
                          left: zonePosition.x,
                          top: zonePosition.y,
                          width: zonePosition.size,
                          height: zonePosition.size,
                          borderRadius: '50%',
                          background: `radial-gradient(circle at center, ${color} 0%, ${color.replace(/[\d.]+\)$/g, '0.4)')} 50%, transparent 100%)`,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          pointerEvents: "none",
                          filter: 'blur(12px)',
                          boxShadow: `0 0 40px ${color}`,
                        }}
                      >
                      </div>
                    );
                  })}
                  
                  {/* Zone labels - separate layer so they're not blurred */}
                  {cameraData.zones.map((zone) => {
                    const zonePosition = getRandomZonePosition(
                      zone.zone_id,
                      cameraData.marker.width,
                      cameraData.marker.height,
                      cameraData.zones.length
                    );
                    const totalCount = zone.total_in_count + zone.total_out_count;

                    return (
                      <div
                        key={`label-${zone.zone_id}`}
                        className="absolute"
                        style={{
                          left: zonePosition.x + zonePosition.size / 2,
                          top: zonePosition.y + zonePosition.size / 2,
                          transform: 'translate(-50%, -50%)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          pointerEvents: "none",
                        }}
                      >
                        <div className="bg-white bg-opacity-95 px-2 py-1 rounded-full shadow-md text-xs font-bold text-gray-800 border border-gray-300">
                          Z{zone.zone_id}
                        </div>
                        <div className="bg-gray-800 bg-opacity-90 px-2 py-0.5 rounded text-xs text-white mt-1 font-semibold">
                          {totalCount}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-gray-500 p-8 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="mt-1 text-sm">Select a floor map to view and generate heatmap data.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default HeatmapViewer;