"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import mqtt from "mqtt";
import FloorMapUploader from "@/components/FloorMapUploader/FloorMapUploader";
import FloorPlanUploader from "@/components/FloorPlanUPloader/FloorPlanUploader";
import HeatmapViewer from "@/components/ShowHeatmap/ShowHeatmap";

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
const MQTT_BROKER_URL =
  "wss://b04df1c6a94d4dc5a7d1772b53665d8e.s1.eu.hivemq.cloud:8884/mqtt";
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
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-xl shadow-xl">
      <div className="flex items-center space-x-4">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
        <span className="text-lg font-medium">Loading...</span>

      </div>
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
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full mx-4">
      <div className="text-center">
        <div className="text-6xl mb-4">📡</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Connection Issue
        </h3>
        <p className="text-gray-600 mb-6">{message}</p>
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

export default function PeopleDetectionPage() {
  // Camera Configuration States
  const [cameraType, setCameraType] = useState<"dahua" | "hikvision">("dahua");
  const [ip, setIp] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [numCameras, setNumCameras] = useState(1);
  const [connectionMode, setConnectionMode] = useState<"normal" | "urbanRain">(
    "normal"
  );

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
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [currentDrawing, setCurrentDrawing] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);
  const [activeZoneId, setActiveZoneId] = useState<number | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [activeMenu, setActiveMenu] = useState<"floorplan" | "heatmap" | null>(null);


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

// console.log("Rendering PeopleDetectionPage component");

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

            // Only auto-select if there is NO selectedCamera at all
            // (prevents resetting user's selection on every update)
            if (!selectedCameraRef.current && cameras.length > 0) {
              setSelectedCamera(cameras[0]);
              setActiveCamera(cameras[0]);
              // Do NOT close modal or clear snapshot here!
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
            // Otherwise, do nothing: keep the user's selection
            // Otherwise, do nothing: keep the user's selection
          }
        } catch (e) {
          console.error("Error parsing active cameras list:", e);
        }
        return;
      }

      // Handle snapshot response
      // ...inside client.on("message", ...)...
      // ...inside client.on("message", ...)...
      if (
        topic.startsWith(`${MQTT_SNAPSHOT_RESPONSE_TOPIC_PREFIX}`) &&
        topic.includes("/snapshot/response")
      ) {
        // Prevent handling multiple snapshot responses for a single request
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
            console.log("Received binary image snapshot.", imageUrl);
            setShowModal(true); // Only open modal after image is ready
            setMessage("Snapshot received. You can now draw zones.");
            setIsLoading(false);
            return;
          }

          if (response.status === "success" && response.payload?.snapshot_url) {
            setSnapshotUrl(response.payload.snapshot_url);
            setShowModal(true); // Only open modal after image is ready
            setMessage("Snapshot received. You can now draw zones.");
          } else {
            setMessage(`Snapshot failed: ${response.error || "Unknown error"}`);
          }
          setIsLoading(false);
        } catch (e) {
          setIsLoading(false);
          setMessage("Error handling snapshot response.");
        }
        // Reset the flag only when the user requests a new snapshot
        // (do NOT reset it automatically after a timeout)
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

          setCameraOptions((prev) => {
            if (!prev.includes(camera_id)) {
              return [...prev, camera_id];
            }
            return prev;
          });

          setZoneCounts((prev) => ({
            ...prev,
            [camera_id]: {
              ...prev[camera_id],
              ...data,
            },
          }));

          setLastUpdateTime(new Date().toLocaleTimeString());

          // Fetch DB counts when live counts update
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

  const generateRTSPUrls = (): string[] => {
    if (!ip || !username || !password) return [];
    const urls: string[] = [];
    const staticChannel = 1;
if (connectionMode === "urbanRain") {


  // Urban Rain Mode: Increment IP for each camera, channel stays the same
  
  const ipParts = ip.split(".");
  if (ipParts.length !== 4) {
    setMessage("Invalid IP address format for Urban Rain connection.");
    return [];
  }

  const baseIp = ipParts.slice(0, 3).join(".");
  let lastOctet = parseInt(ipParts[3]);

  if (isNaN(lastOctet)) {
    setMessage("Invalid IP address format for Urban Rain connection.");
    return [];

  }

  for (let i = 0; i < numCameras; i++) {
    const cameraIp = `${baseIp}.${lastOctet + i}`;
    if (cameraType === "dahua") {
      urls.push(
        `rtsp://${username}:${password}@${cameraIp}:554/cam/realmonitor?channel=1&subtype=0`
      );
    } else {
      urls.push(
        `rtsp://${username}:${password}@${cameraIp}:554/Streaming/Channels/101`
      );
     
    }
  }
    } else {
      // Normal Mode (non-UrbanRain)
      for (let i = 1; i <= numCameras; i++) {
        if (cameraType === "dahua") {
          urls.push(
            `rtsp://${username}:${password}@${ip}:554/cam/realmonitor?channel=${i}&subtype=0`
          );
        } else {
          // Generate 101, 201, 301 for multiple cameras
          const channelNumber = i * 100 + 1;
          urls.push(
            `rtsp://${username}:${password}@${ip}:554/Streaming/Channels/${channelNumber}`
          );
        }
      }
    }
    console.log("Generated RTSP URLs:", urls);
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

    setMessage("Sending command to start camera streams...");
    setIsLoading(true);

    const command = {
      command: "start_pipeline",
      payload: { sources: urls },
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

    // Reset the snapshot handled flag so we can accept a new image
    snapshotHandledRef.current = false;

    setIsLoading(true);
    setSnapshotUrl(null);
    setImageLoaded(false);
    setShowModal(false); // Only open after image loads
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

  //delete zone
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
          console.error(`Error deleting zone ${zoneId}:`, err);
        } else {
          setMessage(`${zoneId} deleted.`);
          // Optionally remove from UI immediately:
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

  //reset zone counts
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
          console.error(`Error resetting zone counts for ${zoneId}:`, err);
        } else {
          setMessage(`Counts for ${zoneId} reset.`);
        }
      }
    );
  };

  const handleCameraSwitch = (cameraId: string) => {
    setSelectedCamera(cameraId);
    setActiveCamera(cameraId);
    setShowModal(false); // Close modal if open
    setSnapshotUrl(null); // Clear snapshot
    setImageLoaded(false); // Reset image loaded state
    setZones([]); // Clear zones
    setLines([]); // Clear lines
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
              console.error(`Error submitting zone ${zone.id}:`, err);
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
            console.error(`Error submitting line ${line.name}:`, err);
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
          console.error(`Error resetting line counts for ${lineName}:`, err);
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
          console.error(`Error deleting line ${lineName}:`, err);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              🎯 People Detection Dashboard
            </h1>
            <p className="text-gray-600">
              Configure cameras and set detection zones via MQTT
            </p>
            {/* Menu Bar */}
            <div className="flex justify-center gap-4 mb-6">
              <button
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  activeMenu === "floorplan"
                    ? "bg-blue-500 text-white shadow-md"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
                onClick={() => setActiveMenu("floorplan")}
              >
                Floor Plan
              </button>
              <button
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  activeMenu === "heatmap"
                    ? "bg-green-500 text-white shadow-md"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
                onClick={() => setActiveMenu("heatmap")}
              >
                Heatmap
              </button>
            </div>
            {/* Show selected component */}
            {activeMenu === "floorplan" && <FloorPlanUploader />}
            {activeMenu === "heatmap" && <HeatmapViewer />}
          </div>

          <div className="bg-white shadow-2xl rounded-3xl overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-8">
              <h2 className="text-2xl font-semibold text-white mb-6 tracking-tight">
                Camera Configuration
              </h2>

              <div className="mb-6 flex gap-4">
                <button
                  onClick={() => setConnectionMode("normal")}
                  className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                    connectionMode === "normal"
                      ? "bg-blue-500 text-white shadow-md"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Standard Connection
                </button>
                <button
                  onClick={() => setConnectionMode("urbanRain")}
                  className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                    connectionMode === "urbanRain"
                      ? "bg-green-500 text-white shadow-md"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  Urban Rain (Multi-IP)
                </button>
              </div>

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
                  placeholder={
                    connectionMode === "urbanRain"
                      ? "🌐 Base IP Address (e.g., 192.168.20.11)"
                      : "🌐 Camera IP Address"
                  }
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

            {message && (
              <div className="mx-6 mt-6 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">ℹ️</span>
                  <span className="text-blue-800 font-medium">{message}</span>
                </div>
              </div>
            )}

            {cameraOptions.length > 0 && (
              <div className="p-8 font-inter">
                <h3 className="text-2xl font-semibold text-slate-800 mb-6 tracking-tight">
                  Available Camera Systems
                </h3>
                <div className="flex flex-wrap gap-4">
                  {cameraOptions.map((camId) => (
                    <button
                      key={camId}
                      onClick={(e) => {
                        e.preventDefault();
                        handleCameraSwitch(camId);
                      }}
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

            {selectedCamera && (
              <div className="px-8 pb-8">
                <div className="flex flex-wrap gap-4 mb-8">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleSnapshot();
                    }}
                    disabled={!mqttClient || !mqttClient.connected || isLoading}
                    className="bg-slate-800 text-white px-10 py-4 rounded-lg font-medium text-sm tracking-wide hover:bg-slate-700 transition-all duration-200 shadow-sm hover:shadow-md border border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Capture Frame & Configure Zones
                  </button>
                </div>

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
                            <span className="text-sm font-medium tracking-wide">
                              Live Monitoring Active
                            </span>
                          </div>
                        )}
                      </div>
                      {lastUpdateTime && (
                        <span className="text-sm text-slate-500 font-medium tracking-wide">
                          Last Update: {lastUpdateTime}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2 mb-6">
                      {Object.keys(zoneCounts).map((cameraId) => (
                        <button
                          key={cameraId}
                          onClick={(e) => {
                            e.preventDefault();
                            handleCameraSwitch(cameraId);
                          }}
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

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {activeCamera &&
                        zoneCounts[activeCamera] &&
                        Object.entries(zoneCounts[activeCamera]).map(
                          ([zoneOrLineId, counts]) => {
                            const isLine = zoneOrLineId
                              .toLowerCase()
                              .includes("line");
                            const netCount = counts.in - counts.out;

                            // Get database counts
                            const dbCounts =
                              dbZoneCounts[activeCamera]?.[zoneOrLineId];
                            const totalIn =
                              (dbCounts?.totalIn || 0) + counts.in;
                            const totalOut =
                              (dbCounts?.totalOut || 0) + counts.out;

                            return (
                              <div
                                key={`${activeCamera}-${zoneOrLineId}`}
                                className="relative bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-all duration-200 border-2"
                                style={{
                                  borderColor:
                                    !isLine && netCount > 5
                                      ? "rgb(220, 38, 38)"
                                      : "rgb(148, 163, 184)",
                                  borderWidth:
                                    !isLine && netCount > 5 ? "2px" : "1px",
                                }}
                              >
                                <div className="flex items-center justify-between mb-6">
                                  <h4 className="text-lg font-semibold text-slate-800 tracking-tight">
                                    {isLine ? "Line" : "Zone"}: {zoneOrLineId}
                                  </h4>
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{
                                      backgroundColor:
                                        !isLine && netCount > 5
                                          ? "rgb(220, 38, 38)"
                                          : "rgb(148, 163, 184)",
                                    }}
                                  ></div>
                                </div>
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                    <span className="text-emerald-700 font-medium text-sm tracking-wide">
                                      Live Entries:
                                    </span>
                                    <span className="text-2xl font-bold text-emerald-700 font-mono">
                                      {counts.in}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                    <span className="text-red-700 font-medium text-sm tracking-wide">
                                      Live Exits:
                                    </span>
                                    <span className="text-2xl font-bold text-red-700 font-mono">
                                      {counts.out}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                    <span className="text-blue-700 font-medium text-sm tracking-wide">
                                      Total Entries:
                                    </span>
                                    <span className="text-xl font-bold text-blue-700 font-mono">
                                      {totalIn}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                    <span className="text-orange-700 font-medium text-sm tracking-wide">
                                      Total Exits:
                                    </span>
                                    <span className="text-xl font-bold text-orange-700 font-mono">
                                      {totalOut}
                                    </span>
                                  </div>
                                  {!isLine && (
                                    <div className="pt-2">
                                      <div className="flex justify-between items-center py-2">
                                        <span className="font-semibold text-sm tracking-wide text-slate-800">
                                          Current Occupancy:
                                        </span>
                                        <span className="text-2xl font-bold font-mono text-slate-800">
                                          {netCount}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  {!isLine && (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleDeleteZone(zoneOrLineId);
                                      }}
                                      className="mt-4 w-full px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-all"
                                    >
                                      Delete Zone
                                    </button>
                                  )}
                                  {!isLine && (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleResetZoneCounts(zoneOrLineId);
                                      }}
                                      className="mt-2 w-full px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all"
                                    >
                                      Reset Counts
                                    </button>
                                  )}
                                  {isLine && (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        handleResetLineCounts(zoneOrLineId);
                                      }}
                                      className="mt-2 w-full px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-all"
                                    >
                                      Reset Counts
                                    </button>
                                  )}
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

      {showModal && snapshotUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-3xl z-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-semibold text-gray-800">
                  🎯 Draw Detection Zones
                </h3>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setShowModal(false);
                    setZones([]);
                    setLines([]);
                    setCurrentDrawing(null);
                    setCurrentLine(null);
                    setIsDrawing(false);
                    setIsDrawingLine(false);
                    setActiveZoneId(null);
                    setActiveLineName(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="mb-4">
                <p className="text-gray-600 mb-3">
                  Select zone number to draw (1-5):
                </p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((zoneNum) => (
                    <button
                      key={zoneNum}
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveZoneId(zoneNum);
                        setActiveLineName(null);
                      }}
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
                          onClick={(e) => {
                            e.preventDefault();
                            removeZone(zone.id);
                          }}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-xl mb-4">
                <p className="text-blue-800 font-medium">
                  📝 Instructions: Select a zone number, then click and drag on
                  the image to draw a detection area.
                </p>
              </div>

              <div className="mb-4">
                <p className="text-gray-600 mb-3">
                  Draw Line (Horizontal/Vertical):
                </p>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Line name (e.g. line1)"
                    value={activeLineName || ""}
                    onChange={(e) => setActiveLineName(e.target.value)}
                    onFocus={() => setActiveZoneId(null)}
                    className="px-3 py-2 rounded-lg border border-gray-300"
                    disabled={isDrawingLine}
                  />
                </div>
                {lines.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {lines.map((line) => (
                      <div
                        key={line.name}
                        className="flex items-center gap-2 bg-green-100 px-3 py-1 rounded-lg"
                      >
                        <span className="text-green-800 font-medium">
                          {line.name}
                        </span>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleDeleteLine(line.name);
                          }}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6">
              <div
                ref={containerRef}
                className="relative border-2 border-dashed border-gray-300 rounded-2xl overflow-hidden bg-gray-50"
                style={{
                  cursor:
                    isDrawingLine || activeLineName || isDrawing || activeZoneId
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

                {zones.map((zone) => {
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

                {lines.map((line) => (
                  <svg
                    key={line.name}
                    className="absolute pointer-events-none"
                    style={{
                      left: 0,
                      top: 0,
                      width: "100%",
                      height: "100%",
                      zIndex: 10,
                    }}
                  >
                    <line
                      x1={line.start.x}
                      y1={line.start.y}
                      x2={line.end.x}
                      y2={line.end.y}
                      stroke="green"
                      strokeWidth="4"
                    />
                    <text
                      x={(line.start.x + line.end.x) / 2}
                      y={(line.start.y + line.end.y) / 2 - 10}
                      fill="green"
                      fontSize="16"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {line.name}
                    </text>
                  </svg>
                ))}

                {isDrawingLine && currentLine && (
                  <svg
                    className="absolute pointer-events-none"
                    style={{
                      left: 0,
                      top: 0,
                      width: "100%",
                      height: "100%",
                      zIndex: 10,
                    }}
                  >
                    <line
                      x1={currentLine.start.x}
                      y1={currentLine.start.y}
                      x2={currentLine.end.x}
                      y2={currentLine.end.y}
                      stroke="blue"
                      strokeWidth="4"
                      strokeDasharray="8"
                    />
                  </svg>
                )}
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setShowModal(false);
                    setZones([]);
                    setLines([]);
                    setCurrentDrawing(null);
                    setCurrentLine(null);
                    setIsDrawing(false);
                    setIsDrawingLine(false);
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-800 rounded-xl font-semibold hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleZoneSubmit();
                  }}
                  disabled={zones.length === 0 || isLoading}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  ✅ Submit Zones ({zones.length})
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleLineSubmit();
                  }}
                  disabled={lines.length === 0 || isLoading}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  ➖ Submit Lines ({lines.length})
                </button>
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
