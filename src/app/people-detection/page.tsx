"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "react-toastify";
import mqtt from "mqtt"; // Make sure to install mqtt: npm install mqtt

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

// --- MQTT Configuration ---
// --- THIS IS THE CORRECT FORMAT ---


const MQTT_BROKER_URL = "wss://b04df1c6a94d4dc5a7d1772b53665d8e.s1.eu.hivemq.cloud:8884/mqtt";
const MQTT_USERNAME = "PeopleCounter";
const MQTT_PASSWORD = "Counter123";

const MQTT_COMMAND_TOPIC = "pivision/commands";
const MQTT_DATA_TOPIC = "pivision/data";
const MQTT_SNAPSHOT_TOPIC = "pivision/snapshot";


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

const ConnectionLostModal = ({ onRetry, message }: { onRetry: () => void, message: string }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full mx-4">
      <div className="text-center">
        <div className="text-6xl mb-4">📡</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Connection Issue
        </h3>
        <p className="text-gray-600 mb-6">
          {message}
        </p>
        <button
          onClick={onRetry}
          className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  </div>
);

// Add this component at the top of your file

const WarningAlert = ({
  zoneId,
  cameraId,
  netCount,
}: {
  zoneId: string;
  cameraId: string;
  netCount: number;
}) => (
  <div className="absolute -top-12 left-0 right-0 bg-red-100 border-l-4 border-red-500 text-red-700 p-2 rounded-t-lg animate-pulse">
    <div className="flex items-center">
      <span className="text-xl mr-2">⚠️</span>
      <span className="font-medium">
        Warning: Zone {zoneId} has exceeded maximum limit ({netCount} people)
      </span>
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
  const [message, setMessage] = useState("Please configure and connect to your cameras to begin.");
  const [cameraOptions, setCameraOptions] = useState<string[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [zones, setZones] = useState<
    { x1: number; y1: number; x2: number; y2: number; id: number }[]
  >([]);
  const [submittedZones, setSubmittedZones] = useState<
    { x1: number; y1: number; x2: number; y2: number; id: number }[]
  >([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [currentDrawing, setCurrentDrawing] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const [zoneCounter, setZoneCounter] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });
  const [activeZoneId, setActiveZoneId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [floorPlans, setFloorPlans] = useState<
    Array<{ id: string; name: string; imageUrl: string }>
  >([]);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<{
    id: string;
    name: string;
    imageUrl: string;
  } | null>(null);
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

  // MQTT Client State
  const [mqttClient, setMqttClient] = useState<mqtt.MqttClient | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isConnectionLost, setIsConnectionLost] = useState<boolean>(false);
  const [connectionLostMessage, setConnectionLostMessage] = useState("");

  // Heatmap related states
  const [showHeatmapModal, setShowHeatmapModal] = useState(false);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("23:59");

  // Add these new state variables at the top of your component
  const [availableCameras, setAvailableCameras] = useState<string[]>([]);
  const [selectedHeatmapCamera, setSelectedHeatmapCamera] =
    useState<string>("");
  const [availableZones, setAvailableZones] = useState<number[]>([]);
  const [drawnZones, setDrawnZones] = useState<{
  [cameraId: string]: Array<{
    id: number;
    coordinates: { x1: number; y1: number; x2: number; y2: number };
    count: number | null;
  }>;
}>({});
  const [selectedZoneForDrawing, setSelectedZoneForDrawing] = useState<
    number | null
  >(null);

  // Add these new state variables at the top of your component
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Add this function to handle full-screen toggle
  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const fetchAvailableCameras = async () => {
    // This function relies on a custom API endpoint not present in the provided backend.
    // It is left here for completeness of the UI but will need a supporting backend API.
    try {
      const response = await fetch(
        `api/cameras?startDate=${startDate}&startTime=${startTime}&endDate=${endDate}&endTime=${endTime}`
      );
      if (!response.ok) throw new Error("Failed to fetch cameras");
      const data = await response.json();
      console.log("Available cameras data:", data); // Debugging line
      if (data.cameras) {
        setAvailableCameras(data.cameras.map(String));
      }
    } catch (error) {
      console.error("Error fetching cameras:", error);
      setAvailableCameras([]);
    }
  };

  const fetchAvailableZones = async (cameraId: string) => {
    // This function relies on a custom API endpoint not present in the provided backend.
    try {
      console.log(
        `Fetching zones for camera ${cameraId} with date range ${startDate} ${startTime} to ${endDate} ${endTime}`
      );
      const response = await fetch(
        `/api/zones?cameraId=${cameraId}&startDate=${startDate}&startTime=${startTime}&endDate=${endDate}&endTime=${endTime}`
      );
      if (!response.ok) throw new Error("Failed to fetch zones");
      const data = await response.json();
      console.log("Available zones data:", data); // Debugging line
      setAvailableZones(data.zones || []);
      console.log(`Available zones for camera ${availableZones}`);
    } catch (error) {
      console.error("Error fetching zones:", error);
      setAvailableZones([]);
    }
  };
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [selectedStartTime, setSelectedStartTime] = useState("");
  const [selectedEndDate, setSelectedEndDate] = useState("");
  const [selectedEndTime, setSelectedEndTime] = useState("");
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const zoneColors = [
    "rgba(255, 99, 132, 0.3)",
    "rgba(54, 162, 235, 0.3)",
    "rgba(255, 206, 86, 0.3)",
    "rgba(75, 192, 192, 0.3)",
    "rgba(153, 102, 255, 0.3)",
  ];

  const zoneBorderColors = [
    "rgb(255, 99, 132)",
    "rgb(54, 162, 235)",
    "rgb(255, 206, 86)",
    "rgb(75, 192, 192)",
    "rgb(153, 102, 255)",
  ];

  const [lastUpdateTime, setLastUpdateTime] = useState<string>("");

    // --- NEW: More Robust MQTT Connection useEffect ---
  useEffect(() => {
      // Prevent connection attempt with placeholder values
    if (!MQTT_BROKER_URL || MQTT_BROKER_URL.includes("your-actual-broker-address")) {
        setConnectionLostMessage("MQTT Broker is not configured. Please update the connection details in the code.");
        setIsConnectionLost(true);
        return;
    }

    setIsLoading(true);
    setMessage("Connecting to MQTT broker...");

    const client = mqtt.connect(MQTT_BROKER_URL, {
      
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,
       clientId: 'client_' + Math.random().toString(16).substr(2, 8),
      protocol: 'wss',
      reconnectPeriod: 5000,
    });

    client.on("connect", () => {
      setIsLoading(false);
      setIsConnectionLost(false);
      setMessage("Successfully connected to MQTT broker. Ready to start pipeline.");

      // Subscribe to topics
      client.subscribe(MQTT_DATA_TOPIC, { qos: 1 });
      client.subscribe(`${MQTT_SNAPSHOT_TOPIC}/+`, { qos: 1 }); // Wildcard for all camera snapshots

      setMqttClient(client);
    });

    client.on("message", (topic, payload) => {
      // Handle incoming messages
      if (topic === MQTT_DATA_TOPIC) {
        try {
          const data = JSON.parse(payload.toString()).data;

          const cameraIds = Object.keys(data);
          if (cameraIds.length > 0) {
            setCameraOptions(cameraIds);
            if (cameraIds.length !== cameraOptions.length) {
                setMessage(`Pipeline running. ${cameraIds.length} camera(s) active.`);
            }
          }

          // Update zone counts
          const newZoneCounts: typeof zoneCounts = {};
          for (const camId in data) {
              newZoneCounts[camId] = {};
              if (data[camId].zones) {
                  for (const zoneId in data[camId].zones) {
                      const counts = data[camId].zones[zoneId];
                      newZoneCounts[camId][zoneId] = {
                          in: counts.in_count || 0,
                          out: counts.out_count || 0,
                      };
                  }
              }
          }

          setZoneCounts(newZoneCounts);
          setLastUpdateTime(new Date().toLocaleTimeString());

        } catch (e) {
          console.error("Error parsing data message:", e);
        }
      } else if (topic.startsWith(MQTT_SNAPSHOT_TOPIC)) {
          // The payload is raw image bytes
          const blob = new Blob([payload], { type: 'image/jpeg' });
          const imageUrl = URL.createObjectURL(blob);
          setSnapshotUrl(imageUrl);
          setShowModal(true);
          setMessage("Snapshot received. You can now draw zones.");
          setIsLoading(false);
      }
    });

    client.on("error", (err) => {
      console.error("MQTT Connection Error:", err);
      setConnectionLostMessage("Connection error. Please check broker URL, credentials, and network.");
      setIsConnectionLost(true);
      client.end();
    });

    client.on("reconnect", () => {
        setMessage("Reconnecting to MQTT broker...");
        setIsLoading(true);
    });

    return () => {
      if (client) {
        client.end();
      }
    };
  }, []); // Run only once on component mount

  // Initialize dates to today
  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    setStartDate(todayStr);
    setEndDate(todayStr);
  }, []);

  const generateRTSPUrls = (): string[] => {
    if (!ip || !username || !password) return [];
    const urls: string[] = [];
    for (let i = 1; i <= numCameras; i++) {
      if (cameraType === "dahua") {
        urls.push(
          `rtsp://${username}:${password}@${ip}:554/cam/realmonitor?channel=${i}&subtype=0`
        );
      } else {
        urls.push(
          `rtsp://${username}:${password}@${ip}:554/Streaming/Channels/${i}02`
        );
      }
    }
    return urls;
  };

  const handleConnect = async () => {
    if (!mqttClient || !mqttClient.connected) {
        setMessage("MQTT client not connected. Please wait or check connection.");
        return;
    }

    const urls = generateRTSPUrls();
    if (urls.length === 0) {
      setMessage("Please enter valid IP, username, and password.");
      return;
    }

    setGeneratedUrls(urls);
    setMessage("Sending command to start camera streams...");
    setIsLoading(true);

    const command = {
        command: "start_pipeline",
        payload: { sources: urls }
    };

    mqttClient.publish(MQTT_COMMAND_TOPIC, JSON.stringify(command), { qos: 1 }, (err) => {
        setIsLoading(false);
        if (err) {
            setMessage("Failed to send start command. Please try again.");
            console.error("Publish error:", err);
        } else {
            setMessage("Start command sent. Waiting for data from backend...");
        }
    });
  };

  const handleSnapshot = async () => {
    if (!selectedCamera || !mqttClient || !mqttClient.connected) {
      setMessage("Please select a camera and ensure MQTT is connected.");
      return;
    }

    setIsLoading(true);
    setMessage("Requesting snapshot from backend...");

    const command = {
        command: "get_snapshot",
        payload: { camera_id: selectedCamera } // Backend determines active camera, but good to send
    };

    mqttClient.publish(MQTT_COMMAND_TOPIC, JSON.stringify(command), { qos: 1 }, (err) => {
        if (err) {
            setIsLoading(false);
            setMessage("Failed to request snapshot.");
            console.error("Snapshot request error:", err);
        }
        // No else needed, success is handled when the snapshot message is received
    });
  };

  const handleZoneSubmit = async () => {
    if (!selectedCamera || zones.length === 0 || !mqttClient || !mqttClient.connected) {
      setMessage("Please select a camera, draw at least one zone, and ensure MQTT is connected.");
      return;
    }

    if (!imageRef.current) {
      setMessage("Image reference not found.");
      return;
    }

    setIsLoading(true);

    try {
      const naturalWidth = imageRef.current.naturalWidth;
      const naturalHeight = imageRef.current.naturalHeight;
      const displayWidth = imageRef.current.offsetWidth;
      const displayHeight = imageRef.current.offsetHeight;
      const scaleX = naturalWidth / displayWidth;
      const scaleY = naturalHeight / displayHeight;

      let successfulSubmissions = 0;

      zones.forEach((zone, index) => {
        const payload = {
          camera_id: selectedCamera,
          zone: zone.id,
          top_left: [Math.round(zone.x1 * scaleX), Math.round(zone.y1 * scaleY)],
          bottom_right: [Math.round(zone.x2 * scaleX), Math.round(zone.y2 * scaleY)],
        };

        const command = { command: "set_zone", payload };

        mqttClient.publish(MQTT_COMMAND_TOPIC, JSON.stringify(command), { qos: 1 }, (err) => {
            if (err) {
                setMessage(`Failed to submit zone ${zone.id}.`);
                console.error(`Error submitting zone ${zone.id}:`, err);
            } else {
                successfulSubmissions++;
                if (successfulSubmissions === zones.length) {
                    setIsLoading(false);
                    setSubmittedZones(prev => [...prev, ...zones]);
                    setZones([]);
                    setZoneCounter(1);
                    setShowModal(false);
                    setMessage(`All ${zones.length} zones submitted successfully! Monitoring will begin.`);
                }
            }
        });
      });
    } catch (err) {
      setIsLoading(false);
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
        height: imageRef.current.offsetHeight,
      });
      setImageLoaded(true);
      setMessage(
        "Image loaded! You can now draw detection zones by clicking and dragging."
      );
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();

    if (!imageLoaded) {
      setMessage(
        "Please wait for the image to load completely before drawing zones."
      );
      return;
    }

    if (!activeZoneId) {
      setMessage("Please select a zone number before drawing");
      return;
    }

    if (zones.some((zone) => zone.id === activeZoneId)) {
      setMessage(
        `Zone ${activeZoneId} already exists. Delete it first to redraw.`
      );
      return;
    }

    setIsDrawing(true);
    const coords = getRelativeCoords(e);
    setStartPoint(coords);
    setCurrentDrawing({
      x1: coords.x,
      y1: coords.y,
      x2: coords.x,
      y2: coords.y,
    });
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

    if (
      !isDrawing ||
      !startPoint ||
      !currentDrawing ||
      !imageLoaded ||
      !activeZoneId
    )
      return;

    const coords = getRelativeCoords(e);
    const newZone = {
      x1: Math.min(startPoint.x, coords.x),
      y1: Math.min(startPoint.y, coords.y),
      x2: Math.max(startPoint.x, coords.x),
      y2: Math.max(startPoint.y, coords.y),
      id: activeZoneId,
    };

    const minSize = 20;
    if (
      Math.abs(newZone.x2 - newZone.x1) >= minSize &&
      Math.abs(newZone.y2 - newZone.y1) >= minSize
    ) {
      setZones((prev) => [...prev, newZone]);
      setActiveZoneId(null); // Reset active zone after drawing
      setMessage(
        `Zone ${activeZoneId} created successfully! Select another zone to draw.`
      );
    } else {
      setMessage(
        "Zone too small! Please draw a larger detection area (minimum 20x20 pixels)."
      );
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
      setMessage(
        "Zone drawing cancelled. Click and drag within the image to create a zone."
      );
    }
  };

  const removeZone = (zoneId: number) => {
    setZones((prev) => prev.filter((zone) => zone.id !== zoneId));
    setMessage("Zone removed successfully.");
  };

  // NOTE: This function and related heatmap features depend on a separate backend API
  // that is not included in the provided `local_pi_backend` code.
  // This logic is kept for UI completeness.
  const fetchHistoricalCounts = async () => {
    if (!selectedCamera || !startDate || !endDate) {
      setMessage("Please select camera and date range for heatmap.");
      return;
    }

    toast.info("Fetching historical data. This feature requires a separate analytics backend.");
    setHeatmapLoading(true);
    // This is a placeholder for the API call.
    // Replace with your actual API endpoint for historical data.
    setTimeout(() => {
        setHeatmapLoading(false);
        setMessage("No historical data service is configured.");
        setHeatmapData([]);
    }, 2000);
  };

  // Replace the existing fetchHeatmapData function with this one
  const fetchHeatmapData = fetchHistoricalCounts;

  const getHeatmapIntensity = (inCount: number, maxCount: number): number => {
    return maxCount > 0 ? inCount / maxCount : 0;
  };

  const getAggregatedHeatmapData = () => {
    const aggregated: { [key: number]: number } = {};

    heatmapData.forEach((item) => {
      if (!aggregated[item.zone_id]) {
        aggregated[item.zone_id] = 0;
      }
      aggregated[item.zone_id] += item.count; // count represents in_count
    });

    return aggregated;
  };

  const [activeCamera, setActiveCamera] = useState<string | null>(null);

  const handleCameraSwitch = (cameraId: string) => {
    setSelectedCamera(cameraId);
    setSelectedHeatmapCamera(cameraId);
    setActiveCamera(cameraId);
    setDrawnZones({});
  };

  useEffect(() => {
    const userId = localStorage.getItem("userId") || null;
    if (showHeatmapModal && userId) {
      fetch(`/api/floor-map?userId=${userId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setFloorPlans(data.floorMaps);
          else setFloorPlans([]);
        });
      fetchAvailableCameras();
    }
  }, [showHeatmapModal]);

  const [uploadedHeatmapUrl, setUploadedHeatmapUrl] = useState<string | null>(
    null
  );
  const [heatmapImageLoaded, setHeatmapImageLoaded] = useState(false);
  const [heatmapAnnotationZones, setHeatmapAnnotationZones] = useState<
    Array<{ id: number; x1: number; y1: number; x2: number; y2: number }>
  >([]);
  const [activeHeatmapAnnotationZoneId, setActiveHeatmapAnnotationZoneId] =
    useState<number | null>(null);

  const handleHeatmapUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setUploadedHeatmapUrl(imageUrl);
      setHeatmapImageLoaded(false);
      await fetchAvailableCameras();
    }
  };

  const handleHeatmapImageLoad = () => {
    setHeatmapImageLoaded(true);
  };

  const handleHeatmapMouseDown = (e: React.MouseEvent) => {
    if (!selectedZoneForDrawing || !heatmapImageLoaded) return;

    setIsDrawing(true);
    const coords = getRelativeCoords(e);
    setStartPoint(coords);
    setCurrentDrawing({
      x1: coords.x,
      y1: coords.y,
      x2: coords.x,
      y2: coords.y,
    });
  };

  const handleHeatmapMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !startPoint || !heatmapImageLoaded) return;

    const coords = getRelativeCoords(e);
    setCurrentDrawing({
      x1: Math.min(startPoint.x, coords.x),
      y1: Math.min(startPoint.y, coords.y),
      x2: Math.max(startPoint.x, coords.x),
      y2: Math.max(startPoint.y, coords.y),
    });
  };

  const handleHeatmapMouseUp = async (e: React.MouseEvent) => {
    if (
      !isDrawing ||
      !startPoint ||
      !currentDrawing ||
      !heatmapImageLoaded ||
      !selectedZoneForDrawing
    )
      return;

    const coords = getRelativeCoords(e);
    const newZoneCoordinates = {
      x1: Math.min(startPoint.x, coords.x),
      y1: Math.min(startPoint.y, coords.y),
      x2: Math.max(startPoint.x, coords.x),
      y2: Math.max(startPoint.y, coords.y),
    };

    const minSize = 20;
    if (
      Math.abs(newZoneCoordinates.x2 - newZoneCoordinates.x1) < minSize ||
      Math.abs(newZoneCoordinates.y2 - newZoneCoordinates.y1) < minSize
    ) {
      setMessage(
        "Zone too small! Please draw a larger area (minimum 20x20 pixels)."
      );
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentDrawing(null);
      return;
    }

    try {
      // NOTE: This relies on an API that is not in the provided backend.
      const response = await fetch(
        `/api/counts?cameraId=${selectedHeatmapCamera}&zoneId=${selectedZoneForDrawing}&startDate=${startDate}&startTime=${startTime}&endDate=${endDate}&endTime=${endTime}`
      );

      if (!response.ok) throw new Error("Failed to fetch count");

      const data = await response.json();

      setDrawnZones((prev) => ({
        ...prev,
        [selectedHeatmapCamera]: [
          ...(prev[selectedHeatmapCamera] || []),
          {
            id: selectedZoneForDrawing,
            coordinates: newZoneCoordinates,
            count: data.total_entered_count,
          },
        ],
      }));

      setSelectedZoneForDrawing(null);
      setMessage(
        `Zone ${selectedZoneForDrawing} count fetched: ${data.total_entered_count}`
      );
    } catch (error) {
      console.error("Error fetching zone count:", error);
      setMessage("Failed to fetch zone count (requires analytics backend).");
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentDrawing(null);
  };

  const ZoneWithCount = ({
    zone,
    isFullScreen,
  }: {
    zone: {
      id: number;
      coordinates: { x1: number; y1: number; x2: number; y2: number };
      count: number | null;
    };
    isFullScreen: boolean;
  }) => {
    const getHeatColor = (count: number) => {
      if (count > 150) return "rgba(255, 0, 0, 0.7)";
      if (count > 100) return "rgba(255, 165, 0, 0.7)";
      if (count > 50) return "rgba(255, 255, 0, 0.7)";
      return "rgba(0, 255, 255, 0.7)";
    };

    return (
      <>
        {/* Heat Zone */}
        <div
          className={`absolute rounded-full blur-xl pointer-events-none transition-all duration-300 ${
            isFullScreen ? "scale-100" : "scale-90"
          }`}
          style={{
            left: zone.coordinates.x1,
            top: zone.coordinates.y1,
            width: zone.coordinates.x2 - zone.coordinates.x1,
            height: zone.coordinates.y2 - zone.coordinates.y1,
            backgroundColor: zone.count
              ? getHeatColor(zone.count)
              : "rgba(0, 255, 255, 0.3)",
          }}
        />

        {/* Count Label */}
        <div
          className={`absolute px-3 py-1 rounded-lg shadow-md font-bold z-10 transition-all duration-300 ${
            isFullScreen ? "text-base" : "text-sm"
          }`}
          style={{
            left: (zone.coordinates.x1 + zone.coordinates.x2) / 2,
            top: (zone.coordinates.y1 + zone.coordinates.y2) / 2,
            transform: "translate(-50%, -50%)",
            backgroundColor: "white",
            border:
              "2px solid " +
              (zone.count
                ? getHeatColor(zone.count)
                : "rgba(0, 255, 255, 0.9)"),
          }}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-gray-600">
              In-count: {zone.count || 0}
            </span>
          </div>
        </div>
      </>
    );
  };

    // Main component render
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              🎯 People Detection Dashboard
            </h1>
            <p className="text-gray-600">
              Configure cameras and set detection zones via MQTT
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white shadow-2xl rounded-3xl overflow-hidden">
            {/* Camera Configuration Section */}
           <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-8">
              <h2 className="text-2xl font-semibold text-white mb-6 tracking-tight">
                Camera Configuration
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <select
                  className="p-3 border-0 rounded-xl shadow-md focus:ring-4 focus:ring-blue-200 transition-all"
                  value={cameraType}
                  onChange={(e) =>
                    setCameraType(e.target.value as "dahua" | "hikvision")
                  }
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
                  disabled={!mqttClient || !mqttClient.connected || isLoading}
                  className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transform hover:scale-105 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="p-8 font-inter">
                <h3 className="text-2xl font-semibold text-slate-800 mb-6 tracking-tight">
                  Available Camera Systems
                </h3>
                <div className="flex flex-wrap gap-4">
                  {cameraOptions.map((camId) => (
                    <button
                      key={camId}
                      onClick={() => handleCameraSwitch(camId)}
                      className={`px-8 py-4 rounded-lg font-medium text-sm tracking-wide transition-all duration-200 border ${
                        activeCamera === camId
                          ? "bg-slate-800 text-white border-slate-800 shadow-md"
                          : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-400"
                      }`}
                    >
                      {camId}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Snapshot Button */}
            {selectedCamera && (
              <div className="px-8 pb-8">
                <div className="flex flex-wrap gap-4 mb-8">
                  <button
                    onClick={handleSnapshot}
                    disabled={!mqttClient || !mqttClient.connected || isLoading}
                    className="bg-slate-800 text-white px-10 py-4 rounded-lg font-medium text-sm tracking-wide hover:bg-slate-700 transition-all duration-200 shadow-sm hover:shadow-md border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Capture Frame & Configure Zones
                  </button>
                </div>

                {/* Heatmap Controls */}
                {Object.keys(zoneCounts).length > 0 && (
                  <div
                    id="heatmap-controls"
                    className="bg-slate-50 p-8 rounded-lg border border-slate-200 mb-8 shadow-sm"
                  >
                    <h3 className="text-xl font-semibold text-slate-800 mb-6 tracking-tight">
                      Heatmap Analysis (Requires Analytics Backend)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3 tracking-wide">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-slate-700 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3 tracking-wide">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-slate-700 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3 tracking-wide">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-slate-700 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3 tracking-wide">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-slate-700 bg-white"
                        />
                      </div>
                    </div>
                    <button
                      onClick={fetchHeatmapData}
                      disabled={heatmapLoading || !startDate || !endDate}
                      className="bg-slate-800 text-white px-8 py-4 rounded-lg font-medium text-sm tracking-wide hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm border border-slate-800"
                    >
                      {heatmapLoading ? "Processing..." : "Generate Heatmap Analysis"}
                    </button>
                  </div>
                )}

                {/* Zone Count Display */}
                {Object.keys(zoneCounts).length > 0 && (
                  <div className="mt-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-6">
                        <h3 className="text-2xl font-semibold text-slate-800 tracking-tight">
                          Real-Time Zone Monitoring
                        </h3>
                        {mqttClient?.connected && (
                          <div className="flex items-center text-emerald-600">
                            <div className="animate-pulse w-2 h-2 bg-emerald-500 rounded-full mr-3"></div>
                            <span className="text-sm font-medium tracking-wide">Live Monitoring Active</span>
                          </div>
                        )}
                      </div>
                      {lastUpdateTime && (
                        <span className="text-sm text-slate-500 font-medium tracking-wide">
                          Last Update: {lastUpdateTime}
                        </span>
                      )}
                    </div>

                    {/* Camera Selection Tabs */}
                    <div className="flex gap-2 mb-6">
                      {Object.keys(zoneCounts).map((cameraId) => (
                        <button
                          key={cameraId}
                          onClick={() => handleCameraSwitch(cameraId)}
                          className={`px-6 py-3 rounded-lg font-medium text-sm tracking-wide transition-all duration-200 border ${
                            activeCamera === cameraId
                              ? "bg-slate-800 text-white border-slate-800 shadow-md"
                              : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-400"
                          }`}
                        >
                           {cameraId}
                        </button>
                      ))}
                    </div>

                    {/* Zone Grid - Only show zones for active camera */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {activeCamera &&
                        zoneCounts[activeCamera] &&
                        Object.entries(zoneCounts[activeCamera]).map(
                          ([zoneId, counts]) => {
                            const netCount = counts.in - counts.out;
                            const isOverLimit = netCount > 5;

                            return (
                              <div
                                key={`${activeCamera}-${zoneId}`}
                                className="relative bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200 border-2"
                                style={{
                                  borderColor: isOverLimit
                                    ? "rgb(220, 38, 38)"
                                    : "rgb(148, 163, 184)",
                                  borderWidth: isOverLimit ? "2px" : "1px",
                                }}
                              >
                                {isOverLimit && (
                                  <WarningAlert
                                    zoneId={zoneId}
                                    cameraId={activeCamera}
                                    netCount={netCount}
                                  />
                                )}

                                <div className="flex items-center justify-between mb-6">
                                  <h4 className="text-lg font-semibold text-slate-800 tracking-tight">
                                    {activeCamera} - Zone {zoneId}
                                  </h4>
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{
                                      backgroundColor: isOverLimit
                                        ? "rgb(220, 38, 38)"
                                        : "rgb(148, 163, 184)",
                                    }}
                                  ></div>
                                </div>

                                <div className="space-y-4">
                                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                    <span className="text-emerald-700 font-medium text-sm tracking-wide">
                                      Entries:
                                    </span>
                                    <span className="text-2xl font-bold text-emerald-700 font-mono">
                                      {counts.in}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                    <span className="text-red-700 font-medium text-sm tracking-wide">
                                      Exits:
                                    </span>
                                    <span className="text-2xl font-bold text-red-700 font-mono">
                                      {counts.out}
                                    </span>
                                  </div>
                                  <div className="pt-2">
                                    <div className="flex justify-between items-center py-2">
                                      <span
                                        className={`font-semibold text-sm tracking-wide ${
                                          isOverLimit
                                            ? "text-red-700"
                                            : "text-slate-800"
                                        }`}
                                      >
                                        Current Occupancy:
                                      </span>
                                      <span
                                        className={`text-2xl font-bold font-mono ${
                                          isOverLimit
                                            ? "text-red-700"
                                            : "text-slate-800"
                                        }`}
                                      >
                                        {netCount}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>


      {/* Zone Drawing Modal */}
      {showModal && snapshotUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-3xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-semibold text-gray-800">
                  🎯 Draw Detection Zones
                </h3>
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
                <p className="text-gray-600 mb-3">
                  Select zone number to draw (1-5):
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((zoneNum) => (
                    <button
                      key={zoneNum}
                      onClick={() => setActiveZoneId(zoneNum)}
                      disabled={zones.some((zone) => zone.id === zoneNum)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        activeZoneId === zoneNum
                          ? "bg-blue-500 text-white"
                          : zones.some((zone) => zone.id === zoneNum)
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
                        <span className="text-blue-800 font-medium">
                          Zone {zone.id}
                        </span>
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
                  📝 Instructions: Select a zone number, then click and drag on
                  the image to draw a detection area. Each zone should be at
                  least 20x20 pixels.
                </p>
              </div>
            </div>

            <div className="p-6">
              {/* Image Container */}
              <div
                ref={containerRef}
                className="relative border-2 border-dashed border-gray-300 rounded-2xl overflow-hidden bg-gray-50"
                style={{
                  cursor: isDrawing
                    ? "crosshair"
                    : activeZoneId
                    ? "crosshair"
                    : "default",
                }}
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
                  style={{ userSelect: "none" }}
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
                        style={{
                          backgroundColor: zoneBorderColors[colorIndex],
                        }}
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
                  disabled={zones.length === 0 || isLoading}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  ✅ Submit Zones ({zones.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Heatmap Modal and other modals remain unchanged */}
      {/* ... (Your existing Heatmap Modal and other UI elements) ... */}

      {isLoading && <LoadingSpinner />}
      {isConnectionLost && <ConnectionLostModal onRetry={() => window.location.reload()} message={connectionLostMessage} />}
    </div>
  );
}