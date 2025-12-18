"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import mqtt from "mqtt";
import FloorMapUploader from "@/components/FloorMapUploader/FloorMapUploader";
import FloorPlanUploader from "@/components/FloorPlanUPloader/FloorPlanUploader";
import HeatmapViewer from "@/components/ShowHeatmap/ShowHeatmap";

// --- ICONS ---
const Icons = {
  Analytics: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
  ),
  Camera: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.818v6.364a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
  ),
  Map: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0121 18.382V7.618a1 1 0 01-1.447-.894L15 7m0 13V7" /></svg>
  ),
  Heatmap: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  ),
};

// Types
interface ZoneCounts {
  [key: string]: {
    in_count: number;
    out_count: number;
  };
}

interface HeatmapData {
  timestamp: string;
  zone_id: number;
  count: number;
  x: number;
  y: number;
}

interface Zone {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  id: number;
}

interface Line {
  start: { x: number; y: number };
  end: { x: number; y: number };
  name: string;
}

// MQTT Configuration
const MQTT_BROKER_URL = "wss://b04df1c6a94d4dc5a7d1772b53665d8e.s1.eu.hivemq.cloud:8884/mqtt";
const MQTT_USERNAME = "PeopleCounter";
const MQTT_PASSWORD = "Counter123";
const PI_ID = "pi-001";

const MQTT_COMMAND_REQUEST_TOPIC = `vision/${PI_ID}/command/request`;
const MQTT_COMMAND_RESPONSE_TOPIC = `vision/${PI_ID}/command/response`;
const MQTT_LIVE_COUNT_TOPIC = `vision/${PI_ID}/+/counts/update`;
const MQTT_ZONE_FULL_DATA_TOPIC = `vision/${PI_ID}/+/zones/full_data`;
const MQTT_LINE_FULL_DATA_TOPIC = `vision/${PI_ID}/+/lines/full_data`;
const MQTT_ACTIVE_CAMERAS_TOPIC = `vision/${PI_ID}/cameras/active_list`;
const MQTT_SNAPSHOT_RESPONSE_TOPIC_PREFIX = `vision/${PI_ID}/`;

// Components
const LoadingSpinner = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
    <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
      <span className="text-lg font-semibold text-gray-700">Processing...</span>
    </div>
  </div>
);

const ConnectionLostModal = ({
  onRetry,
  message,
}: {
  onRetry: () => void;
  message: string;
}) => (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
    <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-red-100">
      <div className="text-center">
        <div className="text-6xl mb-4">📡</div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Connection Issue
        </h3>
        <p className="text-gray-600 mb-8 leading-relaxed">{message}</p>
        <button
          onClick={onRetry}
          className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors font-semibold shadow-lg shadow-blue-200"
        >
          Retry Connection
        </button>
      </div>
    </div>
  </div>
);

export default function PeopleDetectionPage() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<"analytics" | "setup" | "floorplan" | "heatmap">("setup");

  // Camera Configuration States
  const [cameraType, setCameraType] = useState<"dahua" | "hikvision">("dahua");
  const [ip, setIp] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [numCameras, setNumCameras] = useState(1);
  const [connectionMode, setConnectionMode] = useState<"normal" | "urbanRain">("normal");
  
  // NEW: State for Dynamic Camera Names
  const [cameraNames, setCameraNames] = useState<string[]>(["Camera 1"]);

  // Camera States
  const [cameraOptions, setCameraOptions] = useState<string[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const selectedCameraRef = useRef<string>("");
  useEffect(() => {
    selectedCameraRef.current = selectedCamera;
  }, [selectedCamera]);
  const [activeCamera, setActiveCamera] = useState<string>("");

  // Snapshot & Zone States
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [currentDrawing, setCurrentDrawing] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const [activeZoneId, setActiveZoneId] = useState<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);


  // Line Drawing States
  const [lines, setLines] = useState<Line[]>([]);
  const [activeLineName, setActiveLineName] = useState<string | null>(null);
  const [isDrawingLine, setIsDrawingLine] = useState(false);
  const [lineStartPoint, setLineStartPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [currentLine, setCurrentLine] = useState<{
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null>(null);

  // Count States
  const [zoneCounts, setZoneCounts] = useState<{
    [cameraId: string]: {
      [zoneId: string]: { in: number; out: number };
    };
  }>({});
  const [dbZoneCounts, setDbZoneCounts] = useState<{
    [cameraId: string]: {
      [zoneId: string]: { totalIn: number; totalOut: number };
    };
  }>({});

  // UI States
  const [message, setMessage] = useState(
    "Please configure and connect to your cameras to begin."
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isConnectionLost, setIsConnectionLost] = useState(false);
  const [connectionLostMessage, setConnectionLostMessage] = useState("");
  const [lastUpdateTime, setLastUpdateTime] = useState<string>("");

  // MQTT State
  const [mqttClient, setMqttClient] = useState<mqtt.MqttClient | null>(null);

  // Refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const snapshotHandledRef = useRef(false);

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

  // --- NEW: Sync Camera Names with Count ---
  useEffect(() => {
    setCameraNames((prev) => {
      const newNames = [...prev];
      if (numCameras > prev.length) {
        for (let i = prev.length; i < numCameras; i++) {
          newNames.push(`Camera ${i + 1}`);
        }
      } else {
        newNames.length = numCameras;
      }
      return newNames;
    });
  }, [numCameras]);

  // --- NEW: Handle Name Change ---
  const handleCameraNameChange = (index: number, value: string) => {
    const updated = [...cameraNames];
    updated[index] = value;
    setCameraNames(updated);
  };

  // Fetch zone counts from database
  const fetchDbZoneCounts = useCallback(async (cameraId: string) => {
    try {
      const response = await fetch(`/api/people-count?cameraId=${cameraId}`);
      if (!response.ok) throw new Error("Failed to fetch zone counts");

      const data = await response.json();

      if (data.success && data.zones) {
        const counts: {
          [zoneId: string]: { totalIn: number; totalOut: number };
        } = {};

        data.zones.forEach((zone: any) => {
          counts[`zone${zone.id}`] = {
            totalIn: zone.total_in_count || 0,
            totalOut: zone.total_out_count || 0,
          };
        });

        setDbZoneCounts((prev) => ({
          ...prev,
          [cameraId]: counts,
        }));
      }
    } catch (error) {
      console.error("Error fetching DB zone counts:", error);
    }
  }, []);

  // MQTT Connection
  useEffect(() => {
    if (
      !MQTT_BROKER_URL ||
      MQTT_BROKER_URL.includes("your-actual-broker-address")
    ) {
      setConnectionLostMessage(
        "MQTT Broker is not configured. Please update the connection details."
      );
      setIsConnectionLost(true);
      return;
    }

    setIsLoading(true);
    setMessage("Connecting to MQTT broker...");

    const client = mqtt.connect(MQTT_BROKER_URL, {
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,
      clientId: "client_" + Math.random().toString(16).substr(2, 8),
      protocol: "wss",
      reconnectPeriod: 5000,
    });

    client.on("connect", () => {
      setIsLoading(false);
      setIsConnectionLost(false);
      setMessage(
        "Successfully connected to MQTT broker. Ready to start pipeline."
      );

      // Subscribe to topics
      client.subscribe(MQTT_LIVE_COUNT_TOPIC, { qos: 1 });
      client.subscribe(MQTT_COMMAND_RESPONSE_TOPIC, { qos: 1 });
      client.subscribe(MQTT_ACTIVE_CAMERAS_TOPIC, { qos: 1 });
      client.subscribe(MQTT_LINE_FULL_DATA_TOPIC, { qos: 1 });
      client.subscribe(MQTT_ZONE_FULL_DATA_TOPIC, { qos: 1 });

      // Subscribe to snapshot responses
      for (let i = 1; i <= 10; i++) {
        client.subscribe(
          `${MQTT_SNAPSHOT_RESPONSE_TOPIC_PREFIX}camera${i}/snapshot/response`,
          { qos: 1 }
        );
      }

      setMqttClient(client);
    });

    client.on("message", (topic, payload) => {
      // Handle active cameras list
      if (topic === MQTT_ACTIVE_CAMERAS_TOPIC) {
        try {
          const data = JSON.parse(payload.toString());
          if (Array.isArray(data.active_cameras)) {
            const cameras = data.active_cameras.map(String);
            setCameraOptions(cameras);
            setMessage(`Active cameras: ${cameras.join(", ")}`);

            if (!selectedCameraRef.current && cameras.length > 0) {
              setSelectedCamera(cameras[0]);
              setActiveCamera(cameras[0]);
            } else if (
              selectedCameraRef.current &&
              !cameras.includes(selectedCameraRef.current)
            ) {
              setSelectedCamera("");
              setActiveCamera("");
              setShowModal(false);
              setSnapshotUrl(null);
              setImageLoaded(false);
            }
          }
        } catch (e) {
          console.error("Error parsing active cameras list:", e);
        }
        return;
      }

      // Handle snapshot response
      if (
        topic.startsWith(`${MQTT_SNAPSHOT_RESPONSE_TOPIC_PREFIX}`) &&
        topic.includes("/snapshot/response")
      ) {
        if (snapshotHandledRef.current) return;
        snapshotHandledRef.current = true;

        try {
          let response;
          try {
            response = JSON.parse(payload.toString());
          } catch (jsonErr) {
            // Binary image fallback
            const blob = new Blob([new Uint8Array(payload as Buffer)], { type: "image/jpeg" });
            const imageUrl = URL.createObjectURL(blob);
            setSnapshotUrl(imageUrl);
            setShowModal(true); 
            setMessage("Snapshot received. You can now draw zones.");
            setIsLoading(false);
            return;
          }

          if (response.status === "success" && response.payload?.snapshot_url) {
            setSnapshotUrl(response.payload.snapshot_url);
            setShowModal(true);
            setMessage("Snapshot received. You can now draw zones.");
          } else {
            setMessage(`Snapshot failed: ${response.error || "Unknown error"}`);
          }
          setIsLoading(false);
        } catch (e) {
          setIsLoading(false);
          setMessage("Error handling snapshot response.");
        }
        return;
      }

      // Handle live count updates
      if (
        topic.startsWith(`vision/${PI_ID}/`) &&
        topic.endsWith(`/counts/update`)
      ) {
        try {
          const data = JSON.parse(payload.toString());
          const camera_id = topic.split("/")[2];

      

          setZoneCounts((prev) => ({
            ...prev,
            [camera_id]: {
              ...prev[camera_id],
              ...data,
            },
          }));

          setLastUpdateTime(new Date().toLocaleTimeString());
          fetchDbZoneCounts(camera_id);
        } catch (e) {
          console.error("Error parsing live count message:", e);
        }
      } else if (topic === MQTT_COMMAND_RESPONSE_TOPIC) {
        try {
          const response = JSON.parse(payload.toString());
          if (response.status === "success") {
            setMessage(`Command "${response.command}" successful.`);
          } else {
            setMessage(
              `Command "${response.command}" failed: ${response.error}`
            );
          }
          setIsLoading(false);
        } catch (e) {
          console.error("Error parsing command response:", e);
        }
      }

      // Handle line counts
      if (
        topic.startsWith(`vision/${PI_ID}/`) &&
        topic.includes("/lines/full_data")
      ) {
        try {
          const data = JSON.parse(payload.toString());
          const camera_id = topic.split("/")[2];

          setZoneCounts((prev) => ({
            ...prev,
            [camera_id]: {
              ...prev[camera_id],
              ...data,
            },
          }));
          setLastUpdateTime(new Date().toLocaleTimeString());
        } catch (e) {
          console.error("Error parsing line counts message:", e);
        }
      }
    });

    client.on("error", (err) => {
      console.error("MQTT Connection Error:", err);
      setConnectionLostMessage(
        "Connection error. Please check broker URL, credentials, and network."
      );
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
  }, []);

  // Fetch DB counts when active camera changes
  useEffect(() => {
    if (activeCamera) {
      fetchDbZoneCounts(activeCamera);
    }
  }, [activeCamera, fetchDbZoneCounts]);

  // --- REFACTORED: Generate RTSP Sources as a Dictionary ---
  const generateSourceConfig = (): Record<string, string> => {
    if (!ip || !username || !password) return {};
    const sources: Record<string, string> = {};

    cameraNames.forEach((name, index) => {
      // Default to "Camera X" if name is empty
      const cleanName = name.trim() || `Camera ${index + 1}`;
      let url = "";

      if (connectionMode === "urbanRain") {
        // Multi-IP Mode Logic
        const ipParts = ip.split(".");
        if (ipParts.length === 4) {
          const baseIp = ipParts.slice(0, 3).join(".");
          const lastOctet = parseInt(ipParts[3]);
          if (!isNaN(lastOctet)) {
            const cameraIp = `${baseIp}.${lastOctet + index}`;
            if (cameraType === "dahua") {
              url = `rtsp://${username}:${password}@${cameraIp}:554/cam/realmonitor?channel=1&subtype=0`;
            } else {
              url = `rtsp://${username}:${password}@${cameraIp}:554/Streaming/Channels/101`;
            }
          }
        }
      } else {
        // Normal Mode Logic (Single IP, Multiple Channels)
        // Note: index is 0-based, channels are 1-based
        const channelNum = index + 1;
        if (cameraType === "dahua") {
          url = `rtsp://${username}:${password}@${ip}:554/cam/realmonitor?channel=${channelNum}&subtype=0`;
        } else {
          const hikChannel = channelNum * 100 + 1;
          url = `rtsp://${username}:${password}@${ip}:554/Streaming/Channels/${hikChannel}`;
        }
      }

      if (url) {
        sources[cleanName] = url;
      }
    });

    return sources;
  };

  const handleConnect = async () => {
    if (!mqttClient || !mqttClient.connected) {
      setMessage("MQTT client not connected. Please wait or check connection.");
      return;
    }

    // Use the new generator to get the dictionary
    const sourceConfig = generateSourceConfig();
    
    if (Object.keys(sourceConfig).length === 0) {
      setMessage("Please enter valid IP, username, and password.");
      return;
    }

    setMessage("Sending command to start camera streams...");
    setIsLoading(true);

    const command = {
      command: "start_pipeline",
      payload: { sources: sourceConfig }, // UPDATED: Payload structure
    };

    mqttClient.publish(
      MQTT_COMMAND_REQUEST_TOPIC,
      JSON.stringify(command),
      { qos: 1 },
      (err) => {
        if (err) {
          setIsLoading(false);
          setMessage("Failed to send start command. Please try again.");
          console.error("Publish error:", err);
        } else {
          setMessage("Start command sent. Waiting for data from backend...");
          // Switch to analytics after a short delay
          setTimeout(() => setActiveTab("analytics"), 2000);
        }
      }
    );
  };

  const handleSnapshot = async () => {
    if (isLoading) {
      setMessage("Snapshot request already in progress.");
      return;
    }
    if (!selectedCamera || !mqttClient || !mqttClient.connected) {
      setMessage("Please select a camera and ensure MQTT is connected.");
      return;
    }

    snapshotHandledRef.current = false;

    setIsLoading(true);
    setSnapshotUrl(null);
    setImageLoaded(false);
    setShowModal(false); 
    setMessage("Requesting snapshot from backend...");

    const snapshotTopic = `${MQTT_SNAPSHOT_RESPONSE_TOPIC_PREFIX}${selectedCamera}/snapshot/response`;

    mqttClient.unsubscribe(snapshotTopic, () => {
      mqttClient.subscribe(snapshotTopic, { qos: 1 }, (err) => {
        if (err) {
          setIsLoading(false);
          setMessage("Failed to subscribe to snapshot response.");
          return;
        }
        const command = {
          command: "request_snapshot",
          payload: { camera_id: selectedCamera },
        };
        mqttClient.publish(
          MQTT_COMMAND_REQUEST_TOPIC,
          JSON.stringify(command),
          { qos: 1 },
          (err) => {
            if (err) {
              setIsLoading(false);
              setMessage("Failed to request snapshot.");
            }
          }
        );
      });
    });

    setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setMessage("Snapshot request timed out. Please try again.");
        mqttClient.unsubscribe(snapshotTopic);
      }
    }, 15000);
  };

  const handleDeleteZone = async (zoneId: string) => {
    if (!selectedCamera || !mqttClient || !mqttClient.connected) {
      setMessage("Please select a camera and ensure MQTT is connected.");
      return;
    }

    setIsLoading(true);

    const payload = {
      camera_id: selectedCamera,
      zone: zoneId,
    };

    const command = { command: "delete_zone", payload };

    mqttClient.publish(
      MQTT_COMMAND_REQUEST_TOPIC,
      JSON.stringify(command),
      { qos: 1 },
      (err) => {
        setIsLoading(false);
        if (err) {
          setMessage(`Failed to delete ${zoneId}.`);
        } else {
          setMessage(`${zoneId} deleted.`);
          setZoneCounts((prev) => {
            const updated = { ...prev };
            if (updated[selectedCamera]) {
              delete updated[selectedCamera][zoneId];
            }
            return updated;
          });
        }
      }
    );
  };

  const handleResetZoneCounts = async (zoneId: string) => {
    if (!selectedCamera || !mqttClient || !mqttClient.connected) {
      setMessage("Please select a camera and ensure MQTT is connected.");
      return;
    }

    setIsLoading(true);

    const payload = {
      camera_id: selectedCamera,
      zone: zoneId,
    };

    const command = { command: "reset_zone_counts", payload };

    mqttClient.publish(
      MQTT_COMMAND_REQUEST_TOPIC,
      JSON.stringify(command),
      { qos: 1 },
      (err) => {
        setIsLoading(false);
        if (err) {
          setMessage(`Failed to reset counts for ${zoneId}.`);
        } else {
          setMessage(`Counts for ${zoneId} reset.`);
        }
      }
    );
  };

  const handleCameraSwitch = (cameraId: string) => {
    setSelectedCamera(cameraId);
    setActiveCamera(cameraId);
    setShowModal(false); 
    setSnapshotUrl(null); 
    setImageLoaded(false); 
    setZones([]); 
    setLines([]); 
    setCurrentDrawing(null);
    setCurrentLine(null);
    setIsDrawing(false);
    setIsDrawingLine(false);
    setActiveZoneId(null);
    setActiveLineName(null);
  };

  const handleZoneSubmit = async () => {
    if (
      !selectedCamera ||
      zones.length === 0 ||
      !mqttClient ||
      !mqttClient.connected
    ) {
      setMessage(
        "Please select a camera, draw at least one zone, and ensure MQTT is connected."
      );
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

      zones.forEach((zone) => {
        const payload = {
          camera_id: selectedCamera,
          zone: `zone${zone.id}`,
          top_left: [
            Math.round(zone.x1 * scaleX),
            Math.round(zone.y1 * scaleY),
          ],
          bottom_right: [
            Math.round(zone.x2 * scaleX),
            Math.round(zone.y2 * scaleY),
          ],
        };

        const command = { command: "set_zone", payload };

        mqttClient.publish(
          MQTT_COMMAND_REQUEST_TOPIC,
          JSON.stringify(command),
          { qos: 1 },
          (err) => {
            if (err) {
              setMessage(`Failed to submit zone ${zone.id}.`);
            } else {
              successfulSubmissions++;
              if (successfulSubmissions === zones.length) {
                setIsLoading(false);
                setZones([]);
                setShowModal(false);
                setMessage(`All ${zones.length} zones submitted successfully!`);

                fetch("/api/zones", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    camera_id: selectedCamera,
                    zones: zones.map((zone) => ({
                      id: zone.id,
                      x1: zone.x1,
                      y1: zone.y1,
                      x2: zone.x2,
                      y2: zone.y2,
                    })),
                  }),
                })
                  .then((res) => res.json())
                  .then((data) => {
                    if (data.success) {
                      setMessage("Zones saved to database!");
                    }
                  });
              }
            }
          }
        );
      });
    } catch (err) {
      setIsLoading(false);
      console.error("Zone submission error:", err);
      setMessage("Error while submitting zones. Please try again.");
    }
  };

  const handleLineSubmit = async () => {
    if (
      !selectedCamera ||
      lines.length === 0 ||
      !mqttClient ||
      !mqttClient.connected ||
      !imageRef.current
    ) {
      setMessage(
        "Please select a camera, draw at least one line, and ensure MQTT is connected."
      );
      return;
    }

    setIsLoading(true);
    const naturalWidth = imageRef.current.naturalWidth;
    const naturalHeight = imageRef.current.naturalHeight;
    const displayWidth = imageRef.current.offsetWidth;
    const displayHeight = imageRef.current.offsetHeight;
    const scaleX = naturalWidth / displayWidth;
    const scaleY = naturalHeight / displayHeight;

    let successfulSubmissions = 0;

    lines.forEach((line) => {
      const payload = {
        camera_id: selectedCamera,
        line_name: line.name,
        start: [
          Math.round(line.start.x * scaleX),
          Math.round(line.start.y * scaleY),
        ],
        end: [Math.round(line.end.x * scaleX), Math.round(line.end.y * scaleY)],
      };

      const command = { command: "set_line", payload };

      mqttClient.publish(
        MQTT_COMMAND_REQUEST_TOPIC,
        JSON.stringify(command),
        { qos: 1 },
        (err) => {
          if (err) {
            setMessage(`Failed to submit line ${line.name}.`);
          } else {
            successfulSubmissions++;
            if (successfulSubmissions === lines.length) {
              setIsLoading(false);
              setMessage(`All ${lines.length} lines submitted successfully!`);
              setLines([]);

              fetch("/api/lines", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  camera_id: selectedCamera,
                  lines: lines.map((line) => ({
                    name: line.name,
                    start: line.start,
                    end: line.end,
                  })),
                }),
              })
                .then((res) => res.json())
                .then((data) => {
                  if (data.success) {
                    setMessage("Lines saved to database!");
                  }
                });
            }
          }
        }
      );
    });
  };

  const handleResetLineCounts = async (lineName: string) => {
    if (!selectedCamera || !mqttClient || !mqttClient.connected) {
      setMessage("Please select a camera and ensure MQTT is connected.");
      return;
    }

    setIsLoading(true);
    const payload = {
      camera_id: selectedCamera,
      line_name: lineName,
    };

    const command = { command: "reset_line_counts", payload };

    mqttClient.publish(
      MQTT_COMMAND_REQUEST_TOPIC,
      JSON.stringify(command),
      { qos: 1 },
      (err) => {
        setIsLoading(false);
        if (err) {
          setMessage(`Failed to reset counts for line ${lineName}.`);
        } else {
          setMessage(`Counts for line ${lineName} reset.`);
        }
      }
    );
  };

  const handleDeleteLine = async (lineName: string) => {
    if (!selectedCamera || !mqttClient || !mqttClient.connected) {
      setMessage("Please select a camera and ensure MQTT is connected.");
      return;
    }

    setIsLoading(true);
    const payload = {
      camera_id: selectedCamera,
      line_name: lineName,
    };

    const command = { command: "delete_line", payload };

    mqttClient.publish(
      MQTT_COMMAND_REQUEST_TOPIC,
      JSON.stringify(command),
      { qos: 1 },
      (err) => {
        setIsLoading(false);
        if (err) {
          setMessage(`Failed to delete line ${lineName}.`);
        } else {
          setLines((prev) => prev.filter((line) => line.name !== lineName));
          setMessage(`Line ${lineName} deleted.`);
        }
      }
    );
  };

  const getRelativeCoords = (e: React.MouseEvent) => {
    if (!containerRef.current || !imageRef.current) return { x: 0, y: 0 };

    const imageRect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - imageRect.left;
    const y = e.clientY - imageRect.top;
    const clampedX = Math.max(0, Math.min(x, imageRect.width));
    const clampedY = Math.max(0, Math.min(y, imageRect.height));

    return { x: clampedX, y: clampedY };
  };

  const handleImageLoad = () => {
    if (imageRef.current) {
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

    if (activeLineName) {
      handleLineMouseDown(e);
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

    if (isDrawingLine && lineStartPoint) {
      handleLineMouseMove(e);
      return;
    }

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

    if (isDrawingLine) {
      handleLineMouseUp(e);
      return;
    }

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
      setActiveZoneId(null);
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
    if (isDrawingLine) {
      setIsDrawingLine(false);
      setLineStartPoint(null);
      setCurrentLine(null);
      setMessage("Line drawing cancelled.");
    }
  };

  const removeZone = (zoneId: number) => {
    setZones((prev) => prev.filter((zone) => zone.id !== zoneId));
    setMessage("Zone removed successfully.");
  };

  const handleLineMouseDown = (e: React.MouseEvent) => {
    if (!imageLoaded) {
      setMessage("Please wait for the image to load before drawing lines.");
      return;
    }
    if (!activeLineName) {
      setMessage("Please enter a line name before drawing.");
      return;
    }
    if (lines.some((line) => line.name === activeLineName)) {
      setMessage(
        `Line ${activeLineName} already exists. Delete it first to redraw.`
      );
      return;
    }

    setIsDrawingLine(true);
    const coords = getRelativeCoords(e);
    setLineStartPoint(coords);
    setCurrentLine({ start: coords, end: coords });
  };

  const handleLineMouseMove = (e: React.MouseEvent) => {
    if (!isDrawingLine || !lineStartPoint || !imageLoaded) return;
    const coords = getRelativeCoords(e);
    setCurrentLine({ start: lineStartPoint, end: coords });
  };

  const handleLineMouseUp = (e: React.MouseEvent) => {
    if (
      !isDrawingLine ||
      !lineStartPoint ||
      !currentLine ||
      !imageLoaded ||
      !activeLineName
    )
      return;

    const coords = getRelativeCoords(e);
    const newLine = {
      start: lineStartPoint,
      end: coords,
      name: activeLineName,
    };

    if (
      Math.abs(newLine.end.x - newLine.start.x) < 10 &&
      Math.abs(newLine.end.y - newLine.start.y) < 10
    ) {
      setMessage("Line too short! Please draw a longer line (minimum 10px).");
      setIsDrawingLine(false);
      setLineStartPoint(null);
      setCurrentLine(null);
      return;
    }

    setLines((prev) => [...prev, newLine]);
    setActiveLineName(null);
    setMessage(`Line ${newLine.name} created!`);
    setIsDrawingLine(false);
    setLineStartPoint(null);
    setCurrentLine(null);
  };

  // --- RENDER HELPERS ---
  const renderSidebar = () => (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col fixed h-full shadow-2xl z-20">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white tracking-wider flex items-center gap-2">
          🎯 PeopleSense
        </h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        <button
          onClick={() => setActiveTab("setup")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
            activeTab === "setup" 
              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" 
              : "hover:bg-slate-800 hover:text-white"
          }`}
        >
          <Icons.Camera /> Camera Setup
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
            activeTab === "analytics" 
              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" 
              : "hover:bg-slate-800 hover:text-white"
          }`}
        >
          <Icons.Analytics /> Retail Analytics
        </button>

        <button
          onClick={() => setActiveTab("floorplan")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
            activeTab === "floorplan" 
              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" 
              : "hover:bg-slate-800 hover:text-white"
          }`}
        >
          <Icons.Map /> Floor Plan
        </button>

        <button
          onClick={() => setActiveTab("heatmap")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
            activeTab === "heatmap" 
              ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" 
              : "hover:bg-slate-800 hover:text-white"
          }`}
        >
          <Icons.Heatmap /> Heatmap
        </button>
      </nav>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
        Status: {mqttClient?.connected ? <span className="text-emerald-400">Connected</span> : <span className="text-red-400">Disconnected</span>}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {renderSidebar()}

      {/* Main Content Area */}
      <div className="flex-1 ml-64 flex flex-col">
        
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-10 flex justify-between items-center shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 capitalize">
              {activeTab === "setup" ? "Camera Configuration" : 
               activeTab === "analytics" ? "Retail Analytics Dashboard" : 
               activeTab === "floorplan" ? "Store Floor Plan" : "Traffic Heatmap"}
            </h2>
            <p className="text-sm text-gray-500 mt-1">Manage your detection system and view insights</p>
          </div>
          
          <div className="flex items-center gap-4">
            {message && (
               <div className="hidden lg:flex items-center bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm border border-blue-100 max-w-md truncate">
                  ℹ️ {message}
               </div>
            )}
            <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-2 ${mqttClient?.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
               <span className={`w-2 h-2 rounded-full ${mqttClient?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
               {mqttClient?.connected ? "System Online" : "System Offline"}
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-8 overflow-y-auto">
          
          {/* VIEW: CAMERA SETUP */}
          {activeTab === "setup" && (
            <div className="space-y-6 max-w-5xl mx-auto">
              {/* Connection Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                     <Icons.Settings /> Connection Details
                   </h3>
                   <div className="flex bg-gray-100 p-1 rounded-lg">
                      <button
                        onClick={() => setConnectionMode("normal")}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${connectionMode === "normal" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}
                      >
                        Standard
                      </button>
                      <button
                        onClick={() => setConnectionMode("urbanRain")}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${connectionMode === "urbanRain" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}
                      >
                        Multi-IP Mode
                      </button>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-black">
                    <div className="space-y-2 ">
                      <label className="text-xs font-semibold text-gray-500 uppercase">Camera Brand</label>
                      <select
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                        value={cameraType}
                        onChange={(e) => setCameraType(e.target.value as "dahua" | "hikvision")}
                      >
                        <option value="dahua">Dahua Camera</option>
                        <option value="hikvision">Hikvision Camera</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase">IP Address</label>
                      <input
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                        placeholder={connectionMode === "urbanRain" ? "Base IP (e.g. 192.168.1.10)" : "Camera IP"}
                        value={ip}
                        onChange={(e) => setIp(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase">Username</label>
                      <input
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="admin"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-500 uppercase">Password</label>
                      <input
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••"
                      />
                    </div>
                </div>

                {/* --- UPDATED CAMERA CONFIG SECTION --- */}
                <div className="mt-8 border-t border-gray-100 pt-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="space-y-2 w-32">
                          <label className="text-xs font-semibold text-gray-500 uppercase">Camera Count</label>
                          <input
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                            type="number"
                            min={1}
                            max={16}
                            value={numCameras}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (val > 0) setNumCameras(val);
                            }}
                          />
                      </div>
                      <div className="text-sm text-gray-500 italic mt-6">
                        Define names for your {numCameras} camera(s) below.
                      </div>
                    </div>

                    {/* DYNAMIC NAME INPUTS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      {cameraNames.map((name, idx) => (
                        <div key={idx} className="space-y-1">
                          <label className="text-xs font-semibold text-gray-400 uppercase">Camera {idx + 1} Name</label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => handleCameraNameChange(idx, e.target.value)}
                            placeholder={`e.g. Entrance Cam ${idx+1}`}
                            className="w-full p-3 bg-blue-50/50 border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                          />
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleConnect}
                      disabled={!mqttClient || !mqttClient.connected || isLoading}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-xl font-bold hover:shadow-lg hover:scale-[1.01] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? "Connecting..." : `Connect & Initialize ${numCameras} Stream(s)`}
                    </button>
                </div>
              </div>

              {/* Zone Configuration Section - Only show if cameras are active */}
              {cameraOptions.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                     ✏️ Zone Configuration
                  </h3>
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                     <div className="flex flex-col">
                        <span className="text-sm text-gray-600 mb-2">Select Camera to Configure:</span>
                        <div className="flex flex-wrap gap-2">
                          {cameraOptions.map((camId) => (
                            <button
                              key={camId}
                              onClick={() => setSelectedCamera(camId)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                selectedCamera === camId
                                  ? "bg-slate-800 text-white shadow-md"
                                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                              }`}
                            >
                              {camId}
                            </button>
                          ))}
                        </div>
                     </div>
                     <button
                        onClick={handleSnapshot}
                        disabled={!selectedCamera || !mqttClient || isLoading}
                        className="px-6 py-3 bg-white border border-blue-200 text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-all shadow-sm disabled:opacity-50 whitespace-nowrap"
                      >
                        📸 Take Snapshot & Draw Zones
                     </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: ANALYTICS */}
          {activeTab === "analytics" && (
            <div className="space-y-8">
              {/* Camera Selector for Viewing */}
              {cameraOptions.length > 0 ? (
                <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-gray-200">
                  <span className="text-sm font-medium text-gray-500">Viewing Camera:</span>
                  {cameraOptions.map((camId) => (
                    <button
                      key={camId}
                      onClick={() => setActiveCamera(camId)}
                      className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                        activeCamera === camId
                          ? "bg-blue-600 text-white shadow-md"
                          : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {camId}
                    </button>
                  ))}
                  {lastUpdateTime && (
                    <span className="ml-auto text-xs text-gray-400">Updated: {lastUpdateTime}</span>
                  )}
                </div>
              ) : (
                <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                  <div className="text-gray-300 text-6xl mb-4">📷</div>
                  <h3 className="text-xl font-medium text-gray-600">No Active Cameras</h3>
                  <p className="text-gray-400 mt-2">Go to "Camera Setup" to connect your streams.</p>
                  <button onClick={() => setActiveTab("setup")} className="mt-4 text-blue-600 font-medium hover:underline">Go to Setup &rarr;</button>
                </div>
              )}

              {/* Data Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {activeCamera &&
                  zoneCounts[activeCamera] &&
                  Object.entries(zoneCounts[activeCamera]).map(
                    ([zoneOrLineId, counts]) => {
                      const isLine = zoneOrLineId.toLowerCase().includes("line");
                      const dbCounts = dbZoneCounts[activeCamera]?.[zoneOrLineId];
                      const totalIn = (dbCounts?.totalIn || 0) + counts.in;
                      const totalOut = (dbCounts?.totalOut || 0) + counts.out;
                      const netCount = counts.in - counts.out;
                      
                      return (
                        <div
                          key={`${activeCamera}-${zoneOrLineId}`}
                          className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border border-gray-100 relative overflow-hidden group"
                        >
                          <div className={`absolute top-0 left-0 w-1 h-full ${!isLine && netCount > 5 ? "bg-red-500" : "bg-blue-500"}`}></div>
                          
                          <div className="flex justify-between items-start mb-4 pl-2">
                             <div>
                               <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">{isLine ? "Tripwire Line" : "Detection Zone"}</h4>
                               <h3 className="text-xl font-bold text-gray-800 mt-1">{zoneOrLineId}</h3>
                             </div>
                             {!isLine && netCount > 5 && (
                               <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-bold animate-pulse">High Traffic</span>
                             )}
                          </div>

                          <div className="grid grid-cols-2 gap-4 mb-4 pl-2">
                              <div className="bg-blue-50 p-3 rounded-xl">
                                <span className="text-xs text-blue-600 font-bold block mb-1">ENTERED</span>
                                <span className="text-2xl font-mono font-bold text-blue-800">{totalIn}</span>
                              </div>
                              <div className="bg-orange-50 p-3 rounded-xl">
                                <span className="text-xs text-orange-600 font-bold block mb-1">EXITED</span>
                                <span className="text-2xl font-mono font-bold text-orange-800">{totalOut}</span>
                              </div>
                          </div>

                          <div className="pl-2 pt-2 border-t border-gray-100 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button
                               onClick={(e) => { e.preventDefault(); isLine ? handleResetLineCounts(zoneOrLineId) : handleResetZoneCounts(zoneOrLineId); }}
                               className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg font-medium"
                             >
                               Reset
                             </button>
                             <button
                               onClick={(e) => { e.preventDefault(); isLine ? handleDeleteLine(zoneOrLineId) : handleDeleteZone(zoneOrLineId); }}
                               className="flex-1 text-xs bg-red-50 hover:bg-red-100 text-red-600 py-2 rounded-lg font-medium"
                             >
                               Delete
                             </button>
                          </div>
                        </div>
                      );
                    }
                  )}
              </div>
            </div>
          )}

          {/* VIEW: FLOOR PLAN */}
          {activeTab === "floorplan" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 h-full">
               <FloorPlanUploader />
            </div>
          )}

          {/* VIEW: HEATMAP */}
          {activeTab === "heatmap" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 h-full">
               <HeatmapViewer />
            </div>
          )}

        </main>
      </div>

      {/* MODAL FOR DRAWING */}
      {showModal && snapshotUrl && (
        <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="bg-white border-b border-gray-200 p-5 flex justify-between items-center z-10">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Zone Configuration Editor</h3>
                <p className="text-sm text-gray-500">Draw boxes for zones or lines for tripwires</p>
              </div>
              <div className="flex gap-3">
                 <button
                  onClick={() => {
                    setShowModal(false);
                    // Reset drawing states
                    setZones([]); setLines([]); setCurrentDrawing(null); setCurrentLine(null);
                    setIsDrawing(false); setIsDrawingLine(false);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleZoneSubmit}
                  disabled={zones.length === 0 || isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  Save Zones ({zones.length})
                </button>
                <button
                  onClick={handleLineSubmit}
                  disabled={lines.length === 0 || isLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  Save Lines ({lines.length})
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
               {/* Toolbox Sidebar inside Modal */}
               <div className="w-64 bg-gray-50 border-r border-gray-200 p-5 overflow-y-auto">
                  <div className="mb-6">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Detection Zones</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {[1, 2, 3, 4, 5].map((zoneNum) => (
                        <button
                          key={zoneNum}
                          onClick={() => { setActiveZoneId(zoneNum); setActiveLineName(null); }}
                          disabled={zones.some((z) => z.id === zoneNum)}
                          className={`py-2 px-1 rounded-md text-sm font-semibold transition-all ${
                            activeZoneId === zoneNum ? "bg-blue-500 text-white ring-2 ring-blue-300" :
                            zones.some((z) => z.id === zoneNum) ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-white text-gray-700 border hover:border-blue-400"
                          }`}
                        >
                          Zone {zoneNum}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-6">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Tripwire Lines</h4>
                    <input
                      type="text"
                      placeholder="Line Name (e.g. Entry)"
                      value={activeLineName || ""}
                      onChange={(e) => setActiveLineName(e.target.value)}
                      onFocus={() => setActiveZoneId(null)}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm mb-2"
                    />
                    <p className="text-xs text-gray-500">Type a name, then draw a line on the image.</p>
                  </div>

                  <div className="mt-auto pt-6 border-t border-gray-200">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Active Items</h4>
                    <div className="flex flex-col gap-2">
                       {zones.map(z => (
                         <div key={z.id} className="flex justify-between items-center bg-blue-50 px-3 py-2 rounded text-sm text-blue-800">
                           <span>Zone {z.id}</span>
                           <button onClick={() => removeZone(z.id)} className="text-red-500 hover:text-red-700">×</button>
                         </div>
                       ))}
                       {lines.map(l => (
                         <div key={l.name} className="flex justify-between items-center bg-green-50 px-3 py-2 rounded text-sm text-green-800">
                           <span>{l.name}</span>
                           <button onClick={() => handleDeleteLine(l.name)} className="text-red-500 hover:text-red-700">×</button>
                         </div>
                       ))}
                       {zones.length === 0 && lines.length === 0 && <span className="text-gray-400 text-sm italic">No zones drawn yet</span>}
                    </div>
                  </div>
               </div>

               {/* Image Canvas */}
               <div className="flex-1 bg-gray-100 overflow-auto p-4 flex items-center justify-center relative">
                  <div
                    ref={containerRef}
                    className="relative shadow-xl rounded-lg overflow-hidden cursor-crosshair inline-block"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseLeave}
                  >
                    <img
                      ref={imageRef}
                      src={snapshotUrl}
                      alt="Snapshot"
                      onLoad={handleImageLoad}
                      draggable={false}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg"
                    />
                    
                    {/* Render Zones Overlays */}
                    {zones.map((zone) => {
                      const colorIndex = (zone.id - 1) % zoneColors.length;
                      return (
                        <div
                          key={zone.id}
                          className="absolute border-2 pointer-events-none"
                          style={{
                            left: zone.x1, top: zone.y1,
                            width: zone.x2 - zone.x1, height: zone.y2 - zone.y1,
                            backgroundColor: zoneColors[colorIndex],
                            borderColor: zoneBorderColors[colorIndex],
                          }}
                        >
                          <span className="absolute -top-6 left-0 px-2 py-0.5 text-xs text-white font-bold rounded"
                            style={{ backgroundColor: zoneBorderColors[colorIndex] }}>
                            Z{zone.id}
                          </span>
                        </div>
                      );
                    })}

                    {/* Drawing Box Preview */}
                    {isDrawing && currentDrawing && (
                      <div className="absolute border-2 border-dashed border-blue-500 bg-blue-200/30 pointer-events-none"
                        style={{
                          left: currentDrawing.x1, top: currentDrawing.y1,
                          width: currentDrawing.x2 - currentDrawing.x1, height: currentDrawing.y2 - currentDrawing.y1,
                        }}
                      />
                    )}

                    {/* Render Lines */}
                    {lines.map((line) => (
                      <svg key={line.name} className="absolute inset-0 pointer-events-none w-full h-full">
                        <line x1={line.start.x} y1={line.start.y} x2={line.end.x} y2={line.end.y} stroke="#10b981" strokeWidth="4" />
                        <text x={(line.start.x + line.end.x) / 2} y={(line.start.y + line.end.y) / 2 - 10} fill="#10b981" fontSize="14" fontWeight="bold" textAnchor="middle">{line.name}</text>
                      </svg>
                    ))}

                     {/* Drawing Line Preview */}
                     {isDrawingLine && currentLine && (
                      <svg className="absolute inset-0 pointer-events-none w-full h-full">
                        <line x1={currentLine.start.x} y1={currentLine.start.y} x2={currentLine.end.x} y2={currentLine.end.y} stroke="#3b82f6" strokeWidth="4" strokeDasharray="5,5" />
                      </svg>
                    )}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {isLoading && <LoadingSpinner />}
      {isConnectionLost && (
        <ConnectionLostModal
          onRetry={() => window.location.reload()}
          message={connectionLostMessage}
        />
      )}
    </div>
  );
}