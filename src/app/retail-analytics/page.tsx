"use client";

import { useState, useRef, useEffect } from "react";
import mqtt from "mqtt";
import FloorMapUploader from "@/components/FloorMapUploader/FloorMapUploader";
import FloorPlanUploader from "@/components/FloorPlanUPloader/FloorPlanUploader";
import HeatmapViewer from "@/components/ShowHeatmap/ShowHeatmap";

// --- CONFIGURATION ---
const MQTT_BROKER_URL = "wss://b04df1c6a94d4dc5a7d1772b53665d8e.s1.eu.hivemq.cloud:8884/mqtt";
const MQTT_USERNAME = "PeopleCounter";
const MQTT_PASSWORD = "Counter123";
const PI_ID = "rtx5070ti";

// --- TYPES ---
interface Camera {
  id: string | number; 
  name: string;
  rtsp_url: string;
  status: "active" | "inactive" | "pending" | "error";
  type: "dahua" | "hikvision" | "other";
  ip?: string;
  channel?: number;
}

interface Zone {
  name: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Line {
  name: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
}

interface ZoneCount {
  in: number;
  out: number;
}

// --- ICONS ---
const Icons = {
  Analytics: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  Camera: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.818v6.364a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
  Map: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0121 18.382V7.618a1 1 0 01-1.447-.894L15 7m0 13V7" /></svg>,
  Heatmap: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Plus: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>,
  Trash: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Settings: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Check: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>,
  X: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>,
  Refresh: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  Edit: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>,
};


// --- COMPONENTS ---

const LoadingOverlay = ({ message }: { message: string }) => (
  <div className="fixed inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-50 animate-in fade-in duration-300">
    <div className="bg-white border border-gray-200 p-8 rounded-3xl shadow-xl flex flex-col items-center max-w-sm w-full">
      <div className="relative mb-4">
        <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse"></div>
        <div className="relative animate-spin rounded-full h-12 w-12 border-4 border-gray-100 border-t-indigo-600"></div>
      </div>
      <p className="text-indigo-600 font-bold text-lg tracking-wide text-center uppercase">{message}</p>
    </div>
  </div>
);

export default function PeopleDetectionPage() {
  // Navigation
  const [activeTab, setActiveTab] = useState<"setup" | "analytics" | "floorplan" | "heatmap">("setup");

  // MQTT & System State
  const [mqttClient, setMqttClient] = useState<mqtt.MqttClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [systemMessage, setSystemMessage] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<"ok" | "error" | "warning">("ok");
  
  // Camera State
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [zoneCounts, setZoneCounts] = useState<Record<string, Record<string, ZoneCount>>>({});

  // Form State
  // const [newCamId, setNewCamId] = useState(""); // ID is now auto-generated
  const [newCamName, setNewCamName] = useState("");
  const [newCamIp, setNewCamIp] = useState("");
  const [newCamUser, setNewCamUser] = useState("admin");
  const [newCamPass, setNewCamPass] = useState("");
  const [newCamBrand, setNewCamBrand] = useState<"dahua" | "hikvision">("dahua");
  const [newCamChannel, setNewCamChannel] = useState<number>(1);

  // Editor State
  const [editingCameraId, setEditingCameraId] = useState<string | number | null>(null);
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(false);
  const [currentZones, setCurrentZones] = useState<Zone[]>([]);
  const [currentLines, setCurrentLines] = useState<Line[]>([]);
  const [drawingMode, setDrawingMode] = useState<"none" | "zone" | "line">("none");
  const [newItemName, setNewItemName] = useState("");
  
  // Drawing Internal State
  const imgRef = useRef<HTMLImageElement>(null);
  const tempCamerasRef = useRef<Camera[]>([]);
  const [startPos, setStartPos] = useState<{x: number, y: number} | null>(null);
  const [currentPos, setCurrentPos] = useState<{x: number, y: number} | null>(null);

  // --- DERIVED RTSP URL (LIVE PREVIEW OF STRING) ---
  const getGeneratedRtspUrl = () => {
      const channel = newCamChannel || 1;
      if (newCamBrand === "hikvision") {
          // Logic: Channel 1 -> 101, Channel 2 -> 201
          const hikChannel = channel * 100 + 1;
          return `rtsp://${newCamUser || 'user'}:${newCamPass || 'pass'}@${newCamIp || '192.168.1.x'}:554/Streaming/Channels/${hikChannel}`;
      } else {
          // Logic: Channel 1 -> channel=1, Channel 2 -> channel=2
          return `rtsp://${newCamUser || 'user'}:${newCamPass || 'pass'}@${newCamIp || '192.168.1.x'}:554/cam/realmonitor?channel=${channel}&subtype=0`;
      }
  };

  // --- LOAD CAMERAS FROM DB ---
  useEffect(() => {
    fetch('/api/cameras')
      .then(res => res.json())
      .then(data => {
        console.log("Raw DB Response:", data);
        // Handle various API response structures
        let validData = [];
        if (Array.isArray(data)) validData = data;
        else if (data && Array.isArray(data.data)) validData = data.data;
        else if (data && Array.isArray(data.cameras)) validData = data.cameras;
        
        // Map and sanitize
        const sanitized = validData.map((c: any) => ({
            ...c,
            // If it's in the DB, it's effectively "active/connected" for our UI purposes until proven otherwise
            status: c.status || 'active', 
            // Ensure ID is preserved. Note: Interface now supports string | number
            id: c.id 
        }));
        
        setCameras(sanitized);
      })
      .catch(err => console.error("Failed to load cameras", err));
  }, []);

  // --- FETCH ANALYTICS DATA ---
  const fetchCounts = () => {
    if (activeTab !== 'analytics' || cameras.length === 0) return;
    
    cameras.forEach(cam => {
      fetch(`/api/people-count?cameraId=${cam.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.zones)) {
             const mappedZones: Record<string, ZoneCount> = {};
             data.zones.forEach((z: any) => {
                 mappedZones[z.zone_name] = {
                     in: z.total_in_count || 0,
                     out: z.total_out_count || 0
                 };
             });
             
             setZoneCounts(prev => ({
                 ...prev,
                 [cam.id]: mappedZones
             }));
          }
        })
        .catch(err => console.error(`Failed to fetch counts for ${cam.id}`, err));
    });
  };

  useEffect(() => {
    fetchCounts();
    const interval = setInterval(fetchCounts, 5000);
    return () => clearInterval(interval);
  }, [activeTab, cameras]);

  // --- MQTT CONNECTION ---
  useEffect(() => {
    setLoadingMessage("INITIALIZING NEURAL LINK...");
    setIsLoading(true);

    const client = mqtt.connect(MQTT_BROKER_URL, {
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,
      protocol: "wss",
      keepalive: 60,
      reconnectPeriod: 5000,
    });

    client.on("connect", () => {
      setIsConnected(true);
      setIsLoading(false);
      setSystemMessage("SYSTEM ONLINE");
      setSystemStatus("ok");

      // Subscribe to all relevant topics
      client.subscribe(`vision/${PI_ID}/+/camera_add_response`);
      client.subscribe(`vision/${PI_ID}/+/camera_remove_response`);
      client.subscribe(`vision/${PI_ID}/+/snapshot`);
      client.subscribe(`vision/${PI_ID}/+/counts/update`);
      client.subscribe(`vision/${PI_ID}/+/lines/full_data`);
    });

    client.on("message", (topic, payload) => {
      const msgStr = payload.toString();
      const topicParts = topic.split("/");
      // Structure: vision/PI_ID/CAMERA_ID/ACTION
      if (topicParts.length < 4) return;
      const camId = topicParts[2];
      const action = topicParts[3];

      try {
        const response = JSON.parse(msgStr);

        // Add Response
          if (action === "camera_add_response") {
            setIsLoading(false);
            if (response.status === "success") {
              setSystemMessage("CONNECTED SUCCESS");
              setSystemStatus("ok");
              
              // 1. MQTT Success -> Now Save to Database
              // Handle potential type mismatch: camId is string from topic, c.id might be number or string
              const pendingCam = (tempCamerasRef.current.length > 0 ? tempCamerasRef.current : cameras).find(c => c.id == camId);
              if (pendingCam) {
                  fetch('/api/cameras', {
                      method: 'POST',
                      body: JSON.stringify({
                          ...pendingCam,
                          status: 'active'
                      })
                  }).then(res => {
                       if(res.ok) {
                           console.log("Camera persisted to DB");
                           // Mark active in UI
                           setCameras(prev => prev.map(c => c.id == camId ? { ...c, status: "active" } : c));
                           // Reset Form
                           setNewCamName(""); setNewCamIp("");
                       } else {
                           console.error("Failed to persist camera to DB");
                           setSystemMessage("DB SAVE FAILED");
                       }
                  });
              } else {
                  console.warn("Received success response but could not find pending camera with ID:", camId);
              }

            } else {
              setSystemMessage(`ERROR: ${response.message || "Connection Failed"}`);
              setSystemStatus("error");
              
              // Failure -> Remove from UI (It was never in DB)
              setCameras(prev => prev.filter(c => c.id != camId));
            }
          }

        // Snapshot Response
        if (action === "snapshot") {
           if (response.image) {
             setSnapshotUrl(`data:image/jpeg;base64,${response.image}`);
             setIsSnapshotLoading(false);
           }
        }

          // Counts Update
          if (action === "counts" || (topicParts[3] === "counts" && topicParts[4] === "update")) {
             // When a count update arrives, trigger a server-side re-sync to get the latest UNIQUE totals
             fetchCounts();
          }

        // Lines Update
        if (action === "lines") {
           setZoneCounts(prev => ({
             ...prev,
             [camId]: { ...prev[camId], ...response }
           }));
        }

      } catch (e) {
        console.error("MQTT Parse Error", e);
      }
    });

    client.on("error", (err) => {
      console.error("MQTT Error", err);
      setIsConnected(false);
      setSystemMessage("CONNECTION LOST");
      setSystemStatus("error");
    });

    setMqttClient(client);
    return () => { client.end(); };
  }, []);

  // --- ACTIONS ---

  const handleAddCamera = async () => {
    if (!newCamIp || !newCamUser || !newCamPass) {
      setSystemMessage("MISSING FIELDS");
      setSystemStatus("warning");
      return;
    }

    const finalUrl = getGeneratedRtspUrl(); 

    // 1. Calculate Next ID (Check Database First)
let nextIdNumber = Math.floor(10000 + Math.random() * 90000);
    let dbCameras = cameras;
    
    try {
       const res = await fetch('/api/cameras');
       if (res.ok) {
           const data = await res.json();
           if (Array.isArray(data)) dbCameras = data;
       }
    } catch(e) {
       console.error("Error fetching cameras for ID generation", e);
    }

    if (dbCameras.length > 0) {
        // Find max ID
        const maxId = dbCameras.reduce((max: number, c: any) => {
            let num = 0;
            // Helper to extract number from ID
            if (typeof c.id === 'number') {
                num = c.id;
            } else if (!isNaN(Number(c.id))) {
                num = Number(c.id);
            } else {
                const match = c.id.toString().match(/CAM-(\d+)/);
                if (match && match[1]) num = parseInt(match[1]);
            }
            return num > max ? num : max;
        }, 0);
        nextIdNumber = maxId + 1;
    }
    const nextId = nextIdNumber;

    setIsLoading(true);
    setLoadingMessage(`CONNECTING TO ${nextId}...`);

    // 2. Add to UI State as 'Pending' (Temporary)
    // We attach the sensitive data here so we can retrieve it in the MQTT success handler to save to DB
    // In a real app, use a safer way to pass context.
    const tempCam: any = { // Using any to bypass stricter type checks for custom props if needed, or update interface
        id: nextId,
        name: newCamName || "New Camera",
        rtsp_url: finalUrl,
        ip: newCamIp,
        status: "pending",
        type: newCamBrand,
        channel: newCamChannel,
        username: newCamUser, // Store temporarily
        password: newCamPass  // Store temporarily
    };

    setCameras(prev => [...prev, tempCam]);
    // Store in ref to ensure immediate availability in callbacks without closure staleness
    tempCamerasRef.current = [...cameras, tempCam];

    // 3. Send MQTT Request
    const payload = {
      camera_id: nextId,
      rtsp_url: finalUrl,
      name: tempCam.name
    };


    // alert(JSON.stringify(payload));
    mqttClient?.publish(
      `vision/${PI_ID}/${nextId}/camera_add`,
      JSON.stringify(payload),
      { qos: 1 }
    );
    
    // Safety Timeout
    setTimeout(() => {
        setIsLoading(prev => {
            if (prev) {
                setSystemMessage("CONNECTION TIMEOUT");
                setSystemStatus("warning");
                setCameras(curr => curr.filter(c => c.id !== nextId)); // Revert UI
                return false;
            }
            return false;
        });
    }, 10000);
  };

  const handleRemoveCamera = (camId: string | number) => {
    if (!confirm("Are you sure you want to decouple this feed? This will remove it from the database.")) return;
    
    // 1. MQTT Remove
    mqttClient?.publish(
      `vision/${PI_ID}/${camId}/camera_remove`,
      JSON.stringify({ camera_id: `${camId}` }),
      { qos: 1 }
    );
    
    // 2. DB Remove
    fetch(`/api/cameras/id?id=${camId}`, { method: 'DELETE' })
        .catch(e => console.error("DB Remove Failed", e));

    setCameras(prev => prev.filter(c => c.id != camId));
  };
  
  const handleEditName = async (camId: string | number, currentName: string) => {
      const newName = prompt("Enter new name for camera:", currentName);
      if (newName && newName !== currentName) {
          // Optimistic Update
          setCameras(prev => prev.map(c => c.id == camId ? { ...c, name: newName } : c));
          
          await fetch(`/api/cameras/id?id=${camId}`, {
              method: 'PUT',
              body: JSON.stringify({ name: newName })
          });
      }
  };

  const handleConfigure = (camId: string | number) => {
    setEditingCameraId(camId);
    setSnapshotUrl(null);
    setCurrentZones([]);
    setCurrentLines([]);
    
    setIsSnapshotLoading(true);
    mqttClient?.publish(
      `vision/${PI_ID}/${camId}/snapshot_request`,
      JSON.stringify({ camera_id: camId }),
      { qos: 1 }
    );

    setTimeout(() => {
        setIsSnapshotLoading(prev => {
            if (prev) {
                setSystemMessage("SNAPSHOT TIMEOUT");
                setSystemStatus("warning");
                return false;
            }
            return false;
        });
    }, 15000);
  };

  const handleSaveConfig = () => {
     if (!editingCameraId) return;

     // 1. Send Zones
     if (currentZones.length > 0) {
         const zonePayload = {
             camera_id: editingCameraId,
             zones: currentZones.map(z => ({
                 name: z.name,
                 x1: Math.round(z.x1),
                 y1: Math.round(z.y1),
                 x2: Math.round(z.x2),
                 y2: Math.round(z.y2)
             }))
         };
         mqttClient?.publish(
            `vision/${PI_ID}/${editingCameraId}/zone_config`,
            JSON.stringify(zonePayload),
            { qos: 1 }
         );
     }

     // 2. Send Lines
     if (currentLines.length > 0) {
         const linePayload = {
             camera_id: editingCameraId,
             lines: currentLines.map(l => ({
                 name: l.name,
                 x1: Math.round(l.start.x),
                 y1: Math.round(l.start.y),
                 x2: Math.round(l.end.x),
                 y2: Math.round(l.end.y),
                 swap: false
             }))
         };
         mqttClient?.publish(
            `vision/${PI_ID}/${editingCameraId}/line_config`,
            JSON.stringify(linePayload),
            { qos: 1 }
         );
     }

     setSystemMessage("CONFIGURATION SYNCED");
     setSystemStatus("ok");
     setEditingCameraId(null);
  };

  const handleRemoveZone = (camId: string | number, name: string) => {
    if (!name) return;
    
    // 1. MQTT Signal
    mqttClient?.publish(
      `vision/${PI_ID}/${camId}/zone_remove`,
      JSON.stringify({ name }),
      { qos: 1 }
    );

    // 2. Database Cleanup
    fetch(`/api/zones?cameraId=${camId}&zoneName=${encodeURIComponent(name)}`, {
        method: 'DELETE'
    }).then(res => res.json()).then(data => console.log("DB Cleanup:", data));

    alert(`Removing zone ${name} from camera ${camId}`);

    // 3. Optimistic UI cleanup
    setZoneCounts(prev => {
        const newCounts = { ...prev };
        if (newCounts[camId]) {
            delete newCounts[camId][name];
        }
        return newCounts;
    });
  };

  const handleRemoveLine = (camId: string | number, name: string) => {
    if (!name) return;
    
    // 1. MQTT Signal
    mqttClient?.publish(
      `vision/${PI_ID}/${camId}/line_remove`,
      JSON.stringify({ name }),
      { qos: 1 }
    );

    // 2. Database Cleanup (Lines share DB logic with zones for counts)
    fetch(`/api/zones?cameraId=${camId}&zoneName=${encodeURIComponent(name)}`, {
        method: 'DELETE'
    }).then(res => res.json()).then(data => console.log("DB Cleanup:", data));

    // 3. Optimistic UI cleanup
    setZoneCounts(prev => {
        const newCounts = { ...prev };
        if (newCounts[camId]) {
            delete newCounts[camId][name];
        }
        return newCounts;
    });
  };

  // --- DRAWING HELPERS ---
  const getImgCoords = (e: React.MouseEvent) => {
      if (!imgRef.current) return { x: 0, y: 0 };
      const rect = imgRef.current.getBoundingClientRect();
      const scaleX = imgRef.current.naturalWidth / rect.width;
      const scaleY = imgRef.current.naturalHeight / rect.height;
      return {
          x: (e.clientX - rect.left) * scaleX,
          y: (e.clientY - rect.top) * scaleY
      };
  };

  const getStyle = (x: number, y: number, w: number, h: number) => {
      if (!imgRef.current) return {};
      const rect = imgRef.current.getBoundingClientRect();
      const scaleX = rect.width / imgRef.current.naturalWidth;
      const scaleY = rect.height / imgRef.current.naturalHeight;
      return { left: x * scaleX, top: y * scaleY, width: w * scaleX, height: h * scaleY };
  };
  
    const getLineStyle = (start: {x:number, y:number}, end: {x:number, y:number}) => {
        if (!imgRef.current) return {};
        const rect = imgRef.current.getBoundingClientRect();
        const scaleX = rect.width / imgRef.current.naturalWidth;
        const scaleY = rect.height / imgRef.current.naturalHeight;
        return { x1: start.x * scaleX, y1: start.y * scaleY, x2: end.x * scaleX, y2: end.y * scaleY };
    };

  const onMouseDown = (e: React.MouseEvent) => {
      if (drawingMode === "none" || !newItemName) return;
      const coords = getImgCoords(e);
      setStartPos(coords);
      setCurrentPos(coords);
  };
  const onMouseMove = (e: React.MouseEvent) => {
      if (!startPos) return;
      setCurrentPos(getImgCoords(e));
  };
  const onMouseUp = () => {
      if (!startPos || !currentPos) return;
      if (drawingMode === "zone") {
          const newZone: Zone = {
              name: newItemName,
              x1: Math.min(startPos.x, currentPos.x),
              y1: Math.min(startPos.y, currentPos.y),
              x2: Math.max(startPos.x, currentPos.x),
              y2: Math.max(startPos.y, currentPos.y)
          };
          if (Math.abs(newZone.x2 - newZone.x1) > 10) setCurrentZones(p => [...p, newZone]);
      } else if (drawingMode === "line") {
          const newLine: Line = { name: newItemName, start: startPos, end: currentPos };
          if (Math.hypot(newLine.end.x - newLine.start.x, newLine.end.y - newLine.start.y) > 10) setCurrentLines(p => [...p, newLine]);
      }
      setStartPos(null); setCurrentPos(null); setNewItemName(""); setDrawingMode("none");
  };

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-indigo-500/30 selection:text-indigo-900 overflow-hidden flex">
      
      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col z-20">
         <div className="p-8 pb-4">
             <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                     <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                 </div>
                 <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-wide">RETAIL <span className="text-indigo-600">ANALYTICS</span></h1>
                    {/* <div className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">Perception Engine</div> */}
                 </div>
             </div>
         </div>

         <nav className="flex-1 px-4 py-6 space-y-2">
            {[
                { id: "setup", label: "Stream Config", icon: Icons.Camera },
                { id: "analytics", label: "Live Intelligence", icon: Icons.Analytics },
                { id: "floorplan", label: "Floor Plan Upload", icon: Icons.Map },
                { id: "heatmap", label: "HeatMap", icon: Icons.Heatmap },
            ].map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 group relative overflow-hidden
                    ${activeTab === item.id ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}>
                    <div className={`relative z-10 transition-colors ${activeTab === item.id ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-600"}`}>{item.icon()}</div>
                    <span className="relative z-10 text-sm font-medium tracking-wide">{item.label}</span>
                    {activeTab === item.id && <div className="absolute left-0 top-0 w-1 h-full bg-indigo-600" />}
                </button>
            ))}
         </nav>

         <div className="p-6">
             <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 relative overflow-hidden">
                 <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-transparent to-white/40 rounded-bl-full pointer-events-none`} />
                 <div className="flex items-center gap-3 mb-2">
                     <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-rose-500 shadow-sm animate-pulse"}`} />
                     <span className={`text-[10px] font-bold tracking-widest uppercase ${isConnected ? "text-emerald-600" : "text-rose-600"}`}>{isConnected ? "ONLINE" : "OFFLINE"}</span>
                 </div>
                 <div className="text-xs text-gray-500 font-mono">NODE: {PI_ID}</div>
             </div>
         </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50 relative">
          {/* Header */}
          <header className="h-20 px-8 flex items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-sm z-10">
              <div>
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight uppercase">{activeTab.replace("-", " ")}</h2>
                  {systemMessage && <p className={`text-[10px] font-mono mt-1 ${systemStatus === "error" ? "text-rose-600" : systemStatus === "warning" ? "text-amber-600" : "text-indigo-600"}`}>{systemMessage}</p>}
              </div>
              <div className="flex items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  </div>
              </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 relative">
              {isLoading && <LoadingOverlay message={loadingMessage} />}

              {/* SETUP TAB */}
              {activeTab === "setup" && (
                  <div className="grid grid-cols-12 gap-8 max-w-7xl mx-auto">
                      {/* ADD CAMERA CARD */}
                    {/* ADD CAMERA CARD */}
<div className="col-span-12 xl:col-span-4">
  <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm relative group overflow-hidden transition-all hover:shadow-lg">
    <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
      <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Icons.Plus /></span>
      Add New Stream
    </h3>
    <div className="space-y-5">
      {/* Info: Camera ID is auto-generated */}
      <div className="text-[11px] text-gray-400 italic flex items-center gap-1 mb-2 hidden">
        <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16v-4m0-4h.01" /></svg>
        Camera ID is auto-generated and hidden for security.
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Type</label>
          <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 outline-none appearance-none"
            value={newCamBrand} onChange={e => setNewCamBrand(e.target.value as any)}>
            <option value="dahua">DAHUA</option>
            <option value="hikvision">HIKVISION</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Channel</label>
          <input type="number" min={1} max={32} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 font-mono focus:border-indigo-500 outline-none placeholder:text-gray-400"
            value={newCamChannel} onChange={e => setNewCamChannel(parseInt(e.target.value))} />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Camera Name</label>
        <input className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400"
          placeholder="Main Entrance" value={newCamName} onChange={e => setNewCamName(e.target.value)} />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">IP Address</label>
        <input className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 font-mono focus:border-indigo-500 outline-none placeholder:text-gray-400"
          placeholder="192.168.1.xxx" value={newCamIp} onChange={e => setNewCamIp(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Username</label>
          <input className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 outline-none"
            value={newCamUser} onChange={e => setNewCamUser(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Password</label>
          <input type="password" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 outline-none"
            value={newCamPass} onChange={e => setNewCamPass(e.target.value)} />
        </div>
      </div>
      <div className="pt-2">
        <div className="text-[10px] text-gray-400 font-mono mb-2 truncate bg-gray-100 p-2 rounded border border-gray-200">
          {getGeneratedRtspUrl()}
        </div>
        <button
          onClick={handleAddCamera}
          disabled={!isConnected}
          className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale"
        >
          Initialize Uplink
        </button>
      </div>
    </div>
  </div>
</div>

                      {/* CAMERA LIST */}
                      <div className="col-span-12 xl:col-span-8 space-y-4">
                          {cameras.map(cam => (
                              <div key={cam.id} className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 group hover:border-indigo-300 transition-all shadow-sm">
                                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                                      <Icons.Camera />
                                  </div>
                                  <div className="flex-1 text-center md:text-left">
                                      <div className="flex items-center justify-center md:justify-start gap-3">
                                          <div className="flex items-center gap-2">
                                            <h4 className="text-xl font-bold text-gray-900">{cam.name}</h4>
                                            <button onClick={() => handleEditName(cam.id, cam.name)} className="text-gray-400 hover:text-indigo-600 transition-colors p-1">
                                                <Icons.Edit />
                                            </button>
                                          </div>
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${cam.status === "active" ? "bg-emerald-50 text-emerald-600" : cam.status === "pending" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}`}>
                                              {cam.status === 'active' ? 'CONNECTED' : cam.status}
                                          </span>
                                      </div>
                                      <div className="text-xs text-gray-500 font-mono mt-1">{cam.id} | {cam.ip} | Channel {cam.channel || 1}</div>
                                      <div className="text-[10px] text-gray-400 mt-1 font-mono truncate max-w-md">{cam.rtsp_url}</div>
                                  </div>
                                  <div className="flex gap-3">
                                      <button onClick={() => handleConfigure(cam.id)} className="px-6 py-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 font-bold text-xs tracking-wider transition-colors">
                                          CONFIG
                                      </button>
                                      <button onClick={() => handleRemoveCamera(cam.id)} className="p-3 rounded-xl bg-gray-100 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                                          <Icons.Trash />
                                      </button>
                                  </div>
                              </div>
                          ))}
                          {cameras.length === 0 && (
                              <div className="h-64 rounded-3xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400">
                                  <div className="bg-gray-100 p-4 rounded-full mb-4"><Icons.Camera /></div>
                                  <span className="text-sm font-medium">NO ACTIVE FEEDS DETECTED</span>
                              </div>
                          )}
                      </div>
                  </div>
              )}

              {/* ANALYTICS TAB */}
              {activeTab === "analytics" && (
                  <div className="space-y-6">
                      {/* Global Removal Controls */}
                      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-3xl border border-gray-200 shadow-sm">
                          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center px-2">Quick Actions:</div>
                          <button onClick={() => {
                              const name = prompt("Enter Zone Name to remove from all cameras:");
                              if(name) cameras.forEach(c => handleRemoveZone(c.id, name));
                          }} className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors border border-rose-100">
                              <Icons.Trash /> REMOVE ZONE
                          </button>
                          <button onClick={() => {
                              const name = prompt("Enter Line Name to remove from all cameras:");
                              if(name) cameras.forEach(c => handleRemoveLine(c.id, name));
                          }} className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold hover:bg-rose-100 transition-colors border border-rose-100">
                              <Icons.Trash /> REMOVE LINE
                          </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          {Object.values(zoneCounts).every(z => Object.keys(z).length === 0) ? (
                               <div className="col-span-full h-96 flex items-center justify-center flex-col text-gray-400">
                                   <Icons.Analytics />
                                   <span className="mt-4 text-sm font-mono uppercase tracking-widest">Awaiting Telemetry Data...</span>
                                   <span className="mt-2 text-xs text-gray-300">Active Monitors: {cameras.map(c => c.name).join(', ')}</span>
                                   <span className="text-[10px] text-gray-300 font-mono">IDs: {cameras.map(c => c.id).join(', ')}</span>
                               </div>
                          ) : (
                              Object.entries(zoneCounts).map(([camId, zones]) => (
                                   Object.entries(zones).map(([zoneName, count]: [string, any]) => (
                                       <div key={`${camId}-${zoneName}`} className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                                           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-violet-500 opacity-50" />
                                           
                                           {/* Individual Remove Button */}
                                           <button 
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  if(confirm(`Remove "${zoneName}"?`)) {
                                                      handleRemoveZone(camId, zoneName);
                                                      handleRemoveLine(camId, zoneName); // Try both to be safe
                                                  }
                                              }}
                                              className="absolute top-4 right-4 p-2 rounded-xl bg-gray-50 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-rose-600 hover:bg-rose-50 transition-all z-10"
                                           >
                                               <Icons.Trash />
                                           </button>

                                           <div className="flex justify-between items-start mb-6">
                                               <div>
                                                   <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{cameras.find(c => c.id == camId)?.name || camId}</div>
                                                   <div className="text-xl font-bold text-gray-900">{zoneName}</div>
                                               </div>
                                               <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 opacity-80 group-hover:opacity-100 transition-opacity"><Icons.Analytics /></div>
                                           </div>
                                           <div className="grid grid-cols-2 gap-4">
                                               <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-center">
                                                   <div className="text-3xl font-black text-emerald-600 mb-1">{count.in || count.in_count || 0}</div>
                                                   <div className="text-[10px] uppercase font-bold text-emerald-600/60 tracking-wider">Inflow</div>
                                               </div>
                                               <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl text-center">
                                                   <div className="text-3xl font-black text-rose-600 mb-1">{count.out || count.out_count || 0}</div>
                                                   <div className="text-[10px] uppercase font-bold text-rose-600/60 tracking-wider">Outflow</div>
                                               </div>
                                           </div>
                                       </div>
                                   ))
                              ))
                          )}
                      </div>
                  </div>
              )}
              
              {activeTab === "floorplan" && <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden"><FloorPlanUploader /></div>}
              {activeTab === "heatmap" && <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden"><HeatmapViewer /></div>}

          </div>
      </main>

      {/* --- MODAL --- */}
      {editingCameraId && (
        <div className="fixed inset-0 bg-gray-900/50 z-50 flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-7xl h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-gray-200 relative">
                <div className="px-8 py-5 border-b border-gray-200 flex justify-between items-center bg-white z-10">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                             ZONE EDITOR <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100">BETA</span>
                        </h3>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* TOOLS */}
                    <div className="w-80 bg-gray-50 border-r border-gray-200 p-6 flex flex-col overflow-y-auto">
                         <div className="mb-6 space-y-2">
                             <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Zone / Line Name</label>
                             <input value={newItemName} onChange={e => setNewItemName(e.target.value)} autoFocus
                                className="w-full p-3 bg-white border border-gray-200 rounded-xl text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20" placeholder="e.g. Aisle 1" />
                         </div>
                         
                         <div className="grid grid-cols-2 gap-3 mb-8">
                             <button onClick={() => setDrawingMode("zone")} disabled={!newItemName}
                                className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${drawingMode === "zone" ? "border-indigo-500 bg-indigo-50 text-indigo-600" : "border-gray-200 bg-white hover:border-gray-300 text-gray-500"}`}>
                                 <div className="w-8 h-8 border-2 border-dashed border-current rounded" />
                                 <span className="text-[10px] font-bold uppercase">Zone</span>
                             </button>
                             <button onClick={() => setDrawingMode("line")} disabled={!newItemName}
                                className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${drawingMode === "line" ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-gray-200 bg-white hover:border-gray-300 text-gray-500"}`}>
                                 <div className="w-8 h-8 border-b-2 border-current" />
                                 <span className="text-[10px] font-bold uppercase">Line</span>
                             </button>
                         </div>

                         <div className="space-y-2">
                             <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Active Items</div>
                             {currentZones.map((z, i) => (
                                 <div key={i} className="flex justify-between p-3 rounded-lg bg-white border border-gray-200 shadow-sm">
                                     <span className="text-sm font-medium text-gray-700">{z.name}</span>
                                     <button onClick={() => setCurrentZones(p => p.filter((_, idx) => idx !== i))} className="text-rose-500 hover:text-rose-700"><Icons.X /></button>
                                 </div>
                             ))}
                             {currentLines.map((l, i) => (
                                 <div key={i} className="flex justify-between p-3 rounded-lg bg-white border border-gray-200 shadow-sm">
                                     <span className="text-sm font-medium text-gray-700">{l.name}</span>
                                     <button onClick={() => setCurrentLines(p => p.filter((_, idx) => idx !== i))} className="text-rose-500 hover:text-rose-700"><Icons.X /></button>
                                 </div>
                             ))}
                         </div>
                         
                         <div className="mt-auto grid grid-cols-2 gap-3 pt-6 border-t border-gray-200">
                              <button onClick={() => setEditingCameraId(null)} className="py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-bold transition-all">DISCARD</button>
                             <button onClick={handleSaveConfig} className="py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/20">SAVE</button>
                         </div>
                    </div>

                    {/* VIEWPORT */}
                    <div className="flex-1 bg-gray-100 p-8 flex items-center justify-center overflow-auto relative cursor-crosshair">
                         {isSnapshotLoading ? (
                             <div className="flex flex-col items-center text-gray-400 animate-pulse">
                                 <Icons.Refresh />
                                 <p className="mt-4 text-xs font-mono uppercase tracking-widest">Acquiring Visual Feed...</p>
                             </div>
                         ) : snapshotUrl ? (
                             <div 
                                className="relative shadow-2xl shadow-black/10 rounded-lg overflow-hidden select-none border border-gray-200 bg-white"
                                onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
                             >
                                 <img ref={imgRef} src={snapshotUrl} className="max-w-full max-h-[75vh] object-contain block opacity-90" draggable={false} onDragStart={e => e.preventDefault()} />
                                 
                                 {/* Overlays */}
                                 {currentZones.map((z, i) => (
                                     <div key={i} className="absolute border-2 border-indigo-500 bg-indigo-500/20" style={getStyle(z.x1, z.y1, z.x2 - z.x1, z.y2 - z.y1)}>
                                         <span className="absolute -top-6 left-0 bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase">{z.name}</span>
                                     </div>
                                 ))}
                                 {currentLines.map((l, i) => {
                                      const s = getLineStyle(l.start, l.end);
                                      return (
                                          <svg key={i} className="absolute inset-0 w-full h-full pointer-events-none">
                                              <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#10b981" strokeWidth="3" />
                                              <circle cx={s.x1} cy={s.y1} r="3" fill="#10b981"/> <circle cx={s.x2} cy={s.y2} r="3" fill="#10b981"/>
                                          </svg>
                                      );
                                 })}

                                 {/* Helpers */}
                                 {drawingMode === "zone" && startPos && currentPos && (
                                     <div className="absolute border-2 border-dashed border-indigo-500/50 bg-indigo-500/10 pointer-events-none"
                                         style={getStyle(Math.min(startPos.x, currentPos.x), Math.min(startPos.y, currentPos.y), Math.abs(currentPos.x - startPos.x), Math.abs(currentPos.y - startPos.y))}
                                     />
                                 )}
                                 {drawingMode === "line" && startPos && currentPos && (
                                     <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                         {(() => { const s = getLineStyle(startPos, currentPos); return <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" />; })()}
                                     </svg>
                                 )}
                             </div>
                         ) : (
                             <div className="text-slate-600 font-mono text-xs">NO SIGNAL RECEIVED</div>
                         )}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
