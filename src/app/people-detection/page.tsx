"use client";

import { useState, useRef, useEffect } from "react";

// Add this type definition at the top of the file
interface ZoneCounts {
  [key: string]: {
    in_count: number;
    out_count: number;
  };
}

interface HeatmapData {
  timestamp: string;
  zone_id: number;
  count: number; // This represents in_count
  x: number;
  y: number;
}

const LoadingSpinner = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-xl shadow-xl">
      <div className="flex items-center space-x-4">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        <span className="text-lg font-medium">Loading...</span>
      </div>
    </div>
  </div>
);

const ConnectionLostModal = ({ onRetry }: { onRetry: () => void }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full mx-4">
      <div className="text-center">
        <div className="text-6xl mb-4">📡</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Connection Lost</h3>
        <p className="text-gray-600 mb-6">Unable to connect to the server. Please check your connection and try again.</p>
        <button
          onClick={onRetry}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  </div>
);

// Add this component at the top of your file
const WarningAlert = ({ zoneId, cameraId, netCount }: { zoneId: string, cameraId: string, netCount: number }) => (
  <div className="absolute -top-12 left-0 right-0 bg-red-100 border-l-4 border-red-500 text-red-700 p-2 rounded-t-lg animate-pulse">
    <div className="flex items-center">
      <span className="text-xl mr-2">⚠️</span>
      <span className="font-medium">Warning: Zone {zoneId} has exceeded maximum limit ({netCount} people)</span>
    </div>
  </div>
);

export default function PeopleDetectionPage() {
  const [cameraType, setCameraType] = useState<"dahua" | "hikvision">("dahua");
  const [ip, setIp] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [numCameras, setNumCameras] = useState(1);
  const [generatedUrls, setGeneratedUrls] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [cameraOptions, setCameraOptions] = useState<number[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<number | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [zones, setZones] = useState<{ x1: number, y1: number, x2: number, y2: number, id: number }[]>([]);
  const [submittedZones, setSubmittedZones] = useState<{ x1: number, y1: number, x2: number, y2: number, id: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number, y: number } | null>(null);
  const [currentDrawing, setCurrentDrawing] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const [zoneCounter, setZoneCounter] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number, height: number }>({ width: 0, height: 0 });
  const [activeZoneId, setActiveZoneId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  // Add after other useState declarations
const [zoneCounts, setZoneCounts] = useState<{
  [cameraId: string]: {
    [zoneId: string]: {
      in: number;
      out: number;
    };
  };
}>({});
const [isCountsPolling, setIsCountsPolling] = useState(false);

  // Add these state declarations after other useState declarations
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConnectionLost, setIsConnectionLost] = useState<boolean>(false);

  // Heatmap related states
  const [showHeatmapModal, setShowHeatmapModal] = useState(false);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("23:59");

  const zoneColors = [
    'rgba(255, 99, 132, 0.3)',
    'rgba(54, 162, 235, 0.3)',
    'rgba(255, 206, 86, 0.3)',
    'rgba(75, 192, 192, 0.3)',
    'rgba(153, 102, 255, 0.3)'
  ];

  const zoneBorderColors = [
    'rgb(255, 99, 132)',
    'rgb(54, 162, 235)',
    'rgb(255, 206, 86)',
    'rgb(75, 192, 192)',
    'rgb(153, 102, 255)'
  ];

const [lastUpdateTime, setLastUpdateTime] = useState<string>("");

// 5. Debug the API endpoint - add this temporary function to test
const debugAPI = async () => {
  if (!selectedCamera) return;
  
  try {
    console.log(`Testing API endpoint: http://10.71.172.124:5000/get_counts?camera_id=${selectedCamera}`);
    
    
    const response = await fetch(`http://10.71.172.124:5000/get_counts?camera_id=${selectedCamera}`);
    const data = await response.json();
    
    console.log("API Response Status:", response.status);
    console.log("API Response Headers:", Object.fromEntries(response.headers.entries()));
    console.log("API Response Body:", data);

  } catch (error) {
    console.error("API Debug Error:", error);
  }
};

  // Initialize dates to today
  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setStartDate(todayStr);
    setEndDate(todayStr);
  }, []);

  const generateRTSPUrls = (): string[] => {
    if (!ip || !username || !password) return [];
    const urls: string[] = [];
    for (let i = 1; i <= numCameras; i++) {
      if (cameraType === "dahua") {
        urls.push(`rtsp://${username}:${password}@${ip}:554/cam/realmonitor?channel=${i}&subtype=0`);
      } else {
        urls.push(`rtsp://${username}:${password}@${ip}:554/Streaming/Channels/${i}02`);
      }
    }
    return urls;
  };

  const handleConnect = async () => {
    setIsLoading(true);
    setIsConnectionLost(false);
    
    const urls = generateRTSPUrls();
    if (urls.length === 0) {
      setMessage("Please enter valid IP, username, and password.");
      setIsLoading(false);
      return;
    }

    setGeneratedUrls(urls);
    setMessage("Connecting to camera streams...");

    try {
      const response = await fetch("http://10.71.172.124:5000/start_pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources: urls }),
      });

      if (!response.ok) {
        throw new Error("Pipeline start failed");
      }

      const result = await response.json();
      const cameraRes = await fetch("http://10.71.172.124:5000/get_cameras");
      
      if (!cameraRes.ok) {
        throw new Error("Failed to get camera list");
      }

      const cameraData = await cameraRes.json();
      if (cameraData.cameras) {
        setCameraOptions(cameraData.cameras);
        setMessage("Connected successfully! Select a camera to continue.");
      } else {
        setMessage("Pipeline started, but failed to get camera list.");
      }
    } catch (error) {
      console.error(error);
      setMessage("Connection failed. Please try again.");
      setIsConnectionLost(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSnapshot = async () => {
    if (!selectedCamera) return;
    try {
      setMessage("Capturing snapshot...");
      const res = await fetch(`http://10.71.172.124:5000/get_snapshot?camera_id=${selectedCamera}`);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const blob = await res.blob();
      const imageUrl = URL.createObjectURL(blob);
      console.log("Snapshot URL created:", imageUrl); // Add this line
      setSnapshotUrl(imageUrl);
      setZones([]);
      setShowModal(true);
    } catch (err) {
      console.error("Snapshot error:", err);
      setMessage("Failed to capture snapshot.");
    }
  };

  const handleZoneSubmit = async () => {
    if (!selectedCamera || zones.length === 0) {
      setMessage("Please draw at least one zone before submitting.");
      return;
    }

    if (!imageRef.current) {
      setMessage("Image reference not found.");
      return;
    }

    try {
      const successfulZones = [];
      const naturalWidth = imageRef.current.naturalWidth;
      const naturalHeight = imageRef.current.naturalHeight;
      const displayWidth = imageRef.current.offsetWidth;
      const displayHeight = imageRef.current.offsetHeight;

      // Calculate scaling factors
      const scaleX = naturalWidth / displayWidth;
      const scaleY = naturalHeight / displayHeight;
      
      for (const zone of zones) {
        // Scale coordinates back to original image dimensions
        const scaledPayload = {
          zone: zone.id,
          camera_id:selectedCamera,
          top_left: [
             Math.round(zone.x1 * scaleX),
             Math.round(zone.y1 * scaleY)
          ],
          bottom_right: [
             Math.round(zone.x2 * scaleX),
             Math.round(zone.y2 * scaleY)
          ]
        };

        

        // Validate coordinates
        if (scaledPayload.top_left[0] < 0 || scaledPayload.top_left[1] < 0 ||
            scaledPayload.bottom_right[0] > naturalWidth || 
            scaledPayload.bottom_right[1] > naturalHeight) {
          setMessage(`Zone ${zone.id} coordinates are out of bounds`);
          continue;
        }

        console.log(`Submitting zone ${zone.id} with coordinates:`, scaledPayload);

        const res = await fetch(`http://10.71.172.124:5000/api/camera/${selectedCamera}/zones`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scaledPayload)
        });

        const data = await res.json();
        
        if (res.ok) {
          successfulZones.push(zone);
          setMessage(`Zone ${zone.id} submitted successfully!`);
        } else {
          console.error(`Zone ${zone.id} submission failed:`, data);
          setMessage(`Failed to submit zone ${zone.id}: ${data.error}`);
          break;
        }
      }

      if (successfulZones.length === zones.length) {
        setSubmittedZones([...successfulZones]);
        setZones([]);
        setZoneCounter(1);
        setShowModal(false);
        setMessage(`All ${zones.length} zones submitted successfully!`);
        
        // Fetch counts immediately after successful submission
        await fetchZoneCounts();
      }
    } catch (err) {
      console.error("Zone submission error:", err);
      setMessage("Error while submitting zones. Please try again.");
    }
  };

  const getRelativeCoords = (e: React.MouseEvent) => {
    if (!containerRef.current || !imageRef.current) return { x: 0, y: 0 };
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const imageRect = imageRef.current.getBoundingClientRect();
    
    // Get coordinates relative to the image, not the container
    const x = e.clientX - imageRect.left;
    const y = e.clientY - imageRect.top;
    
    // Ensure coordinates are within image bounds
    const clampedX = Math.max(0, Math.min(x, imageRect.width));
    const clampedY = Math.max(0, Math.min(y, imageRect.height));
    
    return { x: clampedX, y: clampedY };
  };

  const handleImageLoad = () => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.offsetWidth,
        height: imageRef.current.offsetHeight
      });
      setImageLoaded(true);
      setMessage("Image loaded! You can now draw detection zones by clicking and dragging.");
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!imageLoaded) {
      setMessage("Please wait for the image to load completely before drawing zones.");
      return;
    }
    
    if (!activeZoneId) {
      setMessage("Please select a zone number before drawing");
      return;
    }
    
    if (zones.some(zone => zone.id === activeZoneId)) {
      setMessage(`Zone ${activeZoneId} already exists. Delete it first to redraw.`);
      return;
    }
    
    setIsDrawing(true);
    const coords = getRelativeCoords(e);
    setStartPoint(coords);
    setCurrentDrawing({ x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!isDrawing || !startPoint || !imageLoaded) return;
    
    const coords = getRelativeCoords(e);
    setCurrentDrawing({
      x1: Math.min(startPoint.x, coords.x),
      y1: Math.min(startPoint.y, coords.y),
      x2: Math.max(startPoint.x, coords.x),
      y2: Math.max(startPoint.y, coords.y),
    });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!isDrawing || !startPoint || !currentDrawing || !imageLoaded || !activeZoneId) return;
    
    const coords = getRelativeCoords(e);
    const newZone = {
      x1: Math.min(startPoint.x, coords.x),
      y1: Math.min(startPoint.y, coords.y),
      x2: Math.max(startPoint.x, coords.x),
      y2: Math.max(startPoint.y, coords.y),
      id: activeZoneId
    };

    const minSize = 20;
    if (Math.abs(newZone.x2 - newZone.x1) >= minSize && Math.abs(newZone.y2 - newZone.y1) >= minSize) {
      setZones((prev) => [...prev, newZone]);
      setActiveZoneId(null); // Reset active zone after drawing
      setMessage(`Zone ${activeZoneId} created successfully! Select another zone to draw.`);
    } else {
      setMessage("Zone too small! Please draw a larger detection area (minimum 20x20 pixels).");
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentDrawing(null);
  };

  const handleMouseLeave = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentDrawing(null);
      setMessage("Zone drawing cancelled. Click and drag within the image to create a zone.");
    }
  };

  const removeZone = (zoneId: number) => {
    setZones(prev => prev.filter(zone => zone.id !== zoneId));
    setMessage("Zone removed successfully.");
  };

 const fetchZoneCounts = async () => {
  if (!selectedCamera) return;
  
  try {
    const response = await fetch(`http://10.71.172.124:5000/get_counts?camera_id=${selectedCamera}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.counts) {
      // Save to MongoDB with timestamp
      try {
        await fetch('/api/save-count', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            camera_id: selectedCamera,
            timestamp: new Date().toISOString(),
            counts: data.counts
          })
        });
      } catch (saveError) {
        console.error('Error saving to MongoDB:', saveError);
      }

      // Update UI with all camera zones
      setZoneCounts(prevCounts => {
        const newCounts = { ...prevCounts };
        
        // Initialize camera if not exists
        if (!newCounts[selectedCamera]) {
          newCounts[selectedCamera] = {};
        }
        
        // Update counts for current camera
        Object.entries(data.counts).forEach(([zoneId, counts]: [string, any]) => {
          const inCount = counts.in_count !== undefined ? counts.in_count : counts.in;
          const outCount = counts.out_count !== undefined ? counts.out_count : counts.out;
          
          newCounts[selectedCamera][zoneId] = {
            in: parseInt(inCount) || 0,
            out: parseInt(outCount) || 0
          };
        });
        
        return newCounts;
      });
      
      setLastUpdateTime(new Date().toLocaleTimeString());
      setIsConnectionLost(false);
    }
  } catch (error) {
    console.error("Error fetching zone counts:", error);
    setIsConnectionLost(true);
  }
};

// Add this function to fetch historical count data
const fetchHistoricalCounts = async () => {
  if (!selectedCamera || !startDate || !endDate) {
    setMessage("Please select camera and date range for heatmap.");
    return;
  }

  setHeatmapLoading(true);
  try {
    const startDateTime = `${startDate}T${startTime}:00`;
    const endDateTime = `${endDate}T${endTime}:00`;
    
    const response = await fetch(
      `http://10.71.172.124:5000/get_counts?camera_id=${selectedCamera}&start_time=${startDateTime}&end_time=${endDateTime}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Historical count data:", data);
    
    if (data && data.counts) {
      // Convert the counts data to heatmap format
      const processedData: HeatmapData[] = [];
      
      Object.entries(data.counts).forEach(([zoneId, countData]: [string, any]) => {
        const zone = submittedZones.find(z => z.id === parseInt(zoneId));
        if (zone) {
          processedData.push({
            timestamp: data.timestamp || new Date().toISOString(),
            zone_id: parseInt(zoneId),
            count: countData.in_count || countData.in || 0, // Handle both possible formats
            x: (zone.x1 + zone.x2) / 2,
            y: (zone.y1 + zone.y2) / 2
          });
        }
      });
      
      setHeatmapData(processedData);
      setShowHeatmapModal(true);
      setMessage(`Heatmap data loaded: ${processedData.length} data points`);
    } else {
      setMessage("No count data found for the selected time range.");
    }
  } catch (error) {
    console.error("Error fetching historical count data:", error);
    setMessage("Error fetching count data. Please try again.");
  } finally {
    setHeatmapLoading(false);
  }
};


// Replace the existing fetchHeatmapData function with this one
const fetchHeatmapData = fetchHistoricalCounts;

// Update the getHeatmapIntensity function to focus on in-counts
const getHeatmapIntensity = (inCount: number, maxCount: number): number => {
  return maxCount > 0 ? (inCount / maxCount) : 0;
};

// Update the aggregation function to focus on in-counts
const getAggregatedHeatmapData = () => {
  const aggregated: { [key: number]: number } = {};
  
  heatmapData.forEach(item => {
    if (!aggregated[item.zone_id]) {
      aggregated[item.zone_id] = 0;
    }
    aggregated[item.zone_id] += item.count; // count represents in_count
  });
  
  return aggregated;
};

 useEffect(() => {
  let isMounted = true;
  let intervalId: NodeJS.Timeout | null = null;

  const startPolling = () => {
    if (!selectedCamera || submittedZones.length === 0) {
      return;
    }

    console.log(`Starting polling for camera ${selectedCamera} with ${submittedZones.length} zones`);
    
    // Initial fetch
    fetchZoneCounts();
    
    // Set up 5-second interval
    intervalId = setInterval(async () => {
      if (isMounted) {
        await fetchZoneCounts();
      }
    }, 5000); // 5 seconds interval
    
    setIsCountsPolling(true);
  };

  startPolling();

  return () => {
    isMounted = false;
    if (intervalId) {
      clearInterval(intervalId);
      setIsCountsPolling(false);
      console.log(`Stopped polling for camera ${selectedCamera}`);
    }
  };
}, [selectedCamera, submittedZones.length]); // Dependencies

  // Add this state at the beginning of your component
const [activeCamera, setActiveCamera] = useState<string | null>(null);

// Add this function to handle camera switching
const handleCameraSwitch = (cameraId: string) => {
  setActiveCamera(cameraId);
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
     
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto"> 
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              🎯 People Detection Dashboard
            </h1>
            <p className="text-gray-600">Configure cameras and set detection zones</p>
          </div>

          {/* Main Card */}
          <div className="bg-white shadow-2xl rounded-3xl overflow-hidden">
            {/* Camera Configuration Section */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
              <h2 className="text-2xl font-semibold text-white mb-4">📹 Camera Configuration</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <select 
                  className="p-3 border-0 rounded-xl shadow-md focus:ring-4 focus:ring-blue-200 transition-all"
                  value={cameraType} 
                  onChange={(e) => setCameraType(e.target.value as "dahua" | "hikvision")}
                >
                  <option value="dahua">📷 Dahua Camera</option>
                  <option value="hikvision">📹 Hikvision Camera</option>
                </select>
                
                <input 
                  className="p-3 border-0 rounded-xl shadow-md focus:ring-4 focus:ring-blue-200 transition-all"
                  placeholder="🌐 Camera IP Address" 
                  value={ip} 
                  onChange={(e) => setIp(e.target.value)} 
                />
                
                <input 
                  className="p-3 border-0 rounded-xl shadow-md focus:ring-4 focus:ring-blue-200 transition-all"
                  placeholder="👤 Username" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                />
                
                <input 
                  className="p-3 border-0 rounded-xl shadow-md focus:ring-4 focus:ring-blue-200 transition-all"
                  type="password" 
                  placeholder="🔒 Password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                />
                
                <input 
                  className="p-3 border-0 rounded-xl shadow-md focus:ring-4 focus:ring-blue-200 transition-all"
                  type="number" 
                  min={1} 
                  placeholder="📊 Number of cameras" 
                  value={numCameras} 
                  onChange={(e) => setNumCameras(Number(e.target.value))} 
                />
                
                <button 
                  onClick={handleConnect} 
                  className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transform hover:scale-105 transition-all shadow-md"
                >
                  🔗 Connect Cameras
                </button>
              </div>
            </div>

            {/* Status Message */}
            {message && (
              <div className="mx-6 mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">ℹ️</span>
                  <span className="text-blue-800 font-medium">{message}</span>
                </div>
              </div>
            )}

            {/* Camera Selection */}
            {cameraOptions.length > 0 && (
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">📋 Available Cameras</h3>
                <div className="flex flex-wrap gap-3">
                  {cameraOptions.map((cam) => (
                    <button
                      key={cam}
                      onClick={() => {
                        setSelectedCamera(cam);
                        handleCameraSwitch(cam.toString());
                      }}
                      className={`px-6 py-3 rounded-xl font-medium transition-all transform hover:scale-105 ${
                        activeCamera === cam.toString()
                          ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg" 
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                    >
                      📹{cam}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Snapshot Button */}
            {selectedCamera && (
              <div className="px-6 pb-6">
                <div className="flex flex-wrap gap-4 mb-6">
                  <button 
                    onClick={handleSnapshot} 
                    className="bg-gradient-to-r from-green-500 to-teal-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-green-600 hover:to-teal-700 transform hover:scale-105 transition-all shadow-lg"
                  >
                    📸 Take Snapshot & Set Zones
                  </button>

                  {/* Heatmap Button */}
                  {submittedZones.length > 0 && (
                    <button 
                      onClick={() => {
                        // Show heatmap time selection UI
                        document.getElementById('heatmap-controls')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-orange-600 hover:to-red-700 transform hover:scale-105 transition-all shadow-lg"
                    >
                      🔥 View Heatmap
                    </button>
                  )}
                </div>

                {/* Heatmap Controls */}
                {submittedZones.length > 0 && (
                  <div id="heatmap-controls" className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-2xl border border-orange-200 mb-6">
                    <h3 className="text-lg font-semibold text-orange-800 mb-4">🔥 Heatmap Time Range Selection</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                        <input 
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                        <input 
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                        <input 
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                        <input 
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={fetchHeatmapData}
                      disabled={heatmapLoading || !startDate || !endDate}
                      className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {heatmapLoading ? "Loading..." : "🔥 Generate Heatmap"}
                    </button>
                  </div>
                )}
                
                {/* Zone Count Display */}
           {/* Zone Count Display */}
               {submittedZones.length > 0 && (
  <div className="mt-6">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-4">
        <h3 className="text-xl font-semibold text-gray-800">📊 Live Zone Counts</h3>
        {isCountsPolling && (
          <div className="flex items-center text-green-600">
            <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm">Live Updates</span>
          </div>
        )}
      </div>
      {lastUpdateTime && (
        <span className="text-sm text-gray-500">Last updated: {lastUpdateTime}</span>
      )}
    </div>
    
    {/* Camera Selection Tabs */}
    <div className="flex gap-2 mb-4">
      {Object.keys(zoneCounts).map((cameraId) => (
        <button
          key={cameraId}
          onClick={() => handleCameraSwitch(cameraId)}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeCamera === cameraId
              ? "bg-blue-500 text-white shadow-md"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700"
          }`}
        >
           {cameraId}
        </button>
      ))}
    </div>
    
    {/* Zone Grid - Only show zones for active camera */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {activeCamera && zoneCounts[activeCamera] &&
        Object.entries(zoneCounts[activeCamera]).map(([zoneId, counts]) => {
          const colorIndex = (parseInt(zoneId) - 1) % zoneColors.length;
          const netCount = counts.in - counts.out;
          const isOverLimit = netCount > 5;
          
          return (
            <div 
              key={`${activeCamera}-${zoneId}`}
              className="relative bg-white border-2 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all"
              style={{ 
                borderColor: isOverLimit ? 'rgb(239, 68, 68)' : zoneBorderColors[colorIndex],
                borderWidth: isOverLimit ? '3px' : '2px'
              }}
            >
              {isOverLimit && (
                <WarningAlert 
                  zoneId={zoneId} 
                  cameraId={activeCamera} 
                  netCount={netCount}
                />
              )}
              
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-800">
                   {activeCamera} - Zone {zoneId}
                </h4>
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: isOverLimit ? 'rgb(239, 68, 68)' : zoneBorderColors[colorIndex] }}
                ></div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-green-600 font-medium">👆 People In:</span>
                  <span className="text-2xl font-bold text-green-600">{counts.in}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-600 font-medium">👇 People Out:</span>
                  <span className="text-2xl font-bold text-red-600">{counts.out}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <span className={`font-medium ${isOverLimit ? 'text-red-600' : 'text-blue-600'}`}>
                    📈 Net Count:
                  </span>
                  <span className={`text-xl font-bold ${isOverLimit ? 'text-red-600' : 'text-blue-600'}`}>
                    {netCount}
                  </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
    </div>
  </div>
)}
              </div>
            )}
          </div>

          {/* Generated URLs Display (if needed for debugging) */}
          {generatedUrls.length > 0 && (
            <div className="mt-8 bg-white shadow-xl rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">🔗 Generated RTSP URLs</h3>
              <div className="space-y-2">
                {generatedUrls.map((url, idx) => (
                  <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm text-gray-600 font-mono">{url}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Zone Drawing Modal */}
      {showModal && snapshotUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-3xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-semibold text-gray-800">🎯 Draw Detection Zones</h3>
                <button 
                  onClick={() => {
                    setShowModal(false);
                    setZones([]);
                    setCurrentDrawing(null);
                    setIsDrawing(false);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Zone Selection */}
              <div className="mb-4">
                <p className="text-gray-600 mb-3">Select zone number to draw (1-5):</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((zoneNum) => (
                    <button
                      key={zoneNum}
                      onClick={() => setActiveZoneId(zoneNum)}
                      disabled={zones.some(zone => zone.id === zoneNum)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        activeZoneId === zoneNum
                          ? "bg-blue-500 text-white"
                          : zones.some(zone => zone.id === zoneNum)
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                    >
                      Zone {zoneNum}
                    </button>
                  ))}
                </div>
              </div>

              {/* Current Zones Display */}
              {zones.length > 0 && (
                <div className="mb-4">
                  <p className="text-gray-600 mb-2">Current zones:</p>
                  <div className="flex flex-wrap gap-2">
                    {zones.map((zone) => (
                      <div
                        key={zone.id}
                        className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-lg"
                      >
                        <span className="text-blue-800 font-medium">Zone {zone.id}</span>
                        <button
                          onClick={() => removeZone(zone.id)}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-blue-50 p-4 rounded-xl mb-4">
                <p className="text-blue-800 font-medium">
                  📝 Instructions: Select a zone number, then click and drag on the image to draw a detection area. 
                  Each zone should be at least 20x20 pixels.
                </p>
              </div>
            </div>

            <div className="p-6">
              {/* Image Container */}
              <div 
                ref={containerRef}
                className="relative border-2 border-dashed border-gray-300 rounded-2xl overflow-hidden bg-gray-50"
                style={{ cursor: isDrawing ? 'crosshair' : activeZoneId ? 'crosshair' : 'default' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              >
                <img
                  ref={imageRef}
                  src={snapshotUrl}
                  alt="Camera snapshot"
                  className="max-w-full h-auto block"
                  onLoad={handleImageLoad}
                  draggable={false}
                  style={{ userSelect: 'none' }}
                />

                {/* Render existing zones */}
                {zones.map((zone, index) => {
                  const colorIndex = (zone.id - 1) % zoneColors.length;
                  return (
                    <div
                      key={zone.id}
                      className="absolute border-2 pointer-events-none"
                      style={{
                        left: zone.x1,
                        top: zone.y1,
                        width: zone.x2 - zone.x1,
                        height: zone.y2 - zone.y1,
                        backgroundColor: zoneColors[colorIndex],
                        borderColor: zoneBorderColors[colorIndex],
                      }}
                    >
                      <div 
                        className="absolute -top-8 left-0 px-2 py-1 text-white text-sm font-bold rounded"
                        style={{ backgroundColor: zoneBorderColors[colorIndex] }}
                      >
                        Zone {zone.id}
                      </div>
                    </div>
                  );
                })}

                {/* Render current drawing */}
                {isDrawing && currentDrawing && (
                  <div
                    className="absolute border-2 border-dashed border-blue-500 bg-blue-200 bg-opacity-30 pointer-events-none"
                    style={{
                      left: currentDrawing.x1,
                      top: currentDrawing.y1,
                      width: currentDrawing.x2 - currentDrawing.x1,
                      height: currentDrawing.y2 - currentDrawing.y1,
                    }}
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 mt-6">
                <button 
                  onClick={() => {
                    setShowModal(false);
                    setZones([]);
                    setCurrentDrawing(null);
                    setIsDrawing(false);
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleZoneSubmit}
                  disabled={zones.length === 0}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  ✅ Submit Zones ({zones.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Heatmap Modal */}
      {showHeatmapModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-3xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-semibold text-gray-800">🔥 People Count Heatmap</h3>
                <button 
                  onClick={() => setShowHeatmapModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
                >
                  ×
                </button>
              </div>
              <div className="text-sm text-gray-600">
                Showing data from {startDate} {startTime} to {endDate} {endTime}
              </div>
            </div>

            <div className="p-6">
              {heatmapData.length > 0 ? (
                <div className="space-y-6">
                  {/* Heatmap Visualization */}
                  <div className="relative border-2 border-gray-300 rounded-2xl overflow-hidden bg-gray-50">
                    {snapshotUrl && (
                      <img
                        src={snapshotUrl}
                        alt="Camera snapshot for heatmap"
                        className="max-w-full h-auto block opacity-70"
                      />
                    )}
                    
                    {/* Heatmap Overlay */}
                    {(() => {
                      const aggregatedData = getAggregatedHeatmapData();
                      const maxCount = Math.max(...Object.values(aggregatedData));
                      
                      return submittedZones.map((zone) => {
                        const inCount = aggregatedData[zone.id] || 0;
                        const intensity = getHeatmapIntensity(inCount, maxCount);
                        
                        return (
                          <div
                            key={zone.id}
                            className="absolute border-2 pointer-events-none"
                            style={{
                              left: zone.x1,
                              top: zone.y1,
                              width: zone.x2 - zone.x1,
                              height: zone.y2 - zone.y1,
                              backgroundColor: `rgba(255, ${255 - Math.floor(intensity * 255)}, ${255 - Math.floor(intensity * 255)}, 0.6)`,
                              borderColor: intensity > 0.5 ? '#dc2626' : '#f97316',
                            }}
                          >
                            <div 
                              className="absolute -top-8 left-0 px-2 py-1 text-white text-sm font-bold rounded"
                              style={{ 
                                backgroundColor: intensity > 0.5 ? '#dc2626' : '#f97316'
                              }}
                            >
                              Zone {zone.id}: In Count: {inCount}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Statistics Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(() => {
                      const aggregatedData = getAggregatedHeatmapData();
                      return submittedZones.map((zone) => {
                        const inCount = aggregatedData[zone.id] || 0;
                        const zoneData = heatmapData.filter(item => item.zone_id === zone.id);
                        
                        return (
                          <div key={zone.id} className="bg-white border border-gray-200 rounded-xl p-4">
                            <h5 className="font-semibold text-gray-800 mb-2">Zone {zone.id}</h5>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span>Total In Count:</span>
                                <span className="font-medium text-green-600">{inCount}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Data Points:</span>
                                <span className="font-medium">{zoneData.length}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Avg In Count per Point:</span>
                                <span className="font-medium">
                                  {zoneData.length > 0 ? (inCount / zoneData.length).toFixed(1) : '0'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <h4 className="text-xl font-semibold text-gray-800 mb-2">No Heatmap Data</h4>
                  <p className="text-gray-600">No data found for the selected time range.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Connection Lost Modal - for testing */}
      {isConnectionLost && (
        <ConnectionLostModal onRetry={() => setIsConnectionLost(false)} />
      )}

      {/* Add these components just before the closing div of the main container */}
      {isLoading && <LoadingSpinner />}
      {isConnectionLost && <ConnectionLostModal onRetry={handleConnect} />}
    </div>
  );
}