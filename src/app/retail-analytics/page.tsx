"use client";

import { useState, useRef, useEffect } from "react";
import mqtt from "mqtt";
import { motion, AnimatePresence } from "framer-motion";
import FloorMapUploader from "@/components/FloorMapUploader/FloorMapUploader";
import FloorPlanUploader from "@/components/FloorPlanUPloader/FloorPlanUploader";
import HeatmapViewer from "@/components/ShowHeatmap/ShowHeatmap";

// --- CONFIGURATION ---
const MQTT_BROKER_URL = "wss://b04df1c6a94d4dc5a7d1772b53665d8e.s1.eu.hivemq.cloud:8884/mqtt";
const MQTT_USERNAME = "PeopleCounter";
const MQTT_PASSWORD = "Counter123";

// --- TYPES ---
interface Camera {
  id: string | number; 
  name: string;
  rtsp_url: string;
  status: "active" | "inactive" | "pending" | "error";
  type: "dahua" | "hikvision" | "other";
  ip?: string;
  channel?: number;
  zones?: Zone[];
  lines?: Line[];
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
  todayIn: number;
  todayOut: number;
  allIn: number;
  allOut: number;
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
  Home: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
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
  const [activeTab, setActiveTab] = useState<"dashboard" | "setup" | "analytics" | "floorplan-upload" | "floorplan-config" | "heatmap" | "zone-config">("dashboard");

  // MQTT & System State
  const [mqttClient, setMqttClient] = useState<mqtt.MqttClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [systemMessage, setSystemMessage] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<"ok" | "error" | "warning">("ok");
  
  // PI Settings
  const [piId, setPiId] = useState("rtx5070ti");
  const [isEditingPiId, setIsEditingPiId] = useState(false);
  const [tempPiId, setTempPiId] = useState("");
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [zoneCounts, setZoneCounts] = useState<Record<string, Record<string, ZoneCount>>>({});

  // Form State
  // const [newCamId, setNewCamId] = useState(""); // ID is now auto-generated
  const [newCamName, setNewCamName] = useState("");
  const [newCamIp, setNewCamIp] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" as "success" | "error" });
  const [newCamUser, setNewCamUser] = useState("admin");
  const [newCamPass, setNewCamPass] = useState("");
  const [newCamBrand, setNewCamBrand] = useState<"dahua" | "hikvision">("dahua");
  const [newCamChannel, setNewCamChannel] = useState<number>(101);

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

  // Analytics Detailed State
  const [analyticsFilter, setAnalyticsFilter] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    startTime: "00:00",
    endTime: "23:59",
    cameraId: "all"
  });
  const [eventHistory, setEventHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(50);
  const [hourlyStats, setHourlyStats] = useState<{hour: number, in: number, out: number, occupancy: number}[]>(Array.from({length: 24}, (_, i) => ({hour: i, in: 0, out: 0, occupancy: 0})));
  const [todayUniqueIn, setTodayUniqueIn] = useState(0);
  const [todayUniqueOut, setTodayUniqueOut] = useState(0);

  // --- DERIVED RTSP URL (LIVE PREVIEW OF STRING) ---
  const getGeneratedRtspUrl = () => {
      const channel = newCamChannel || 101;
      if (newCamBrand === "hikvision") {
          return `rtsp://${newCamUser || 'user'}:${newCamPass || 'pass'}@${newCamIp || '192.168.1.x'}:554/Streaming/Channels/${channel}`;
      } else {
          return `rtsp://${newCamUser || 'user'}:${newCamPass || 'pass'}@${newCamIp || '192.168.1.x'}:554/cam/realmonitor?channel=${channel}&subtype=0`;
      }
  };

  // --- FETCH HOURLY STATS ---
  const fetchHourlyStats = async () => {
    try {
      const res = await fetch("/api/stats/hourly");
      const data = await res.json();
      if (data.success) {
        setHourlyStats(data.data);
        setTodayUniqueIn(data.todayIn || 0);
        setTodayUniqueOut(data.todayOut || 0);
      }
    } catch (err) {
      console.error("Failed to fetch hourly stats:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchHourlyStats();
    }
  }, [activeTab]);

  // --- LOAD SETTINGS ---
  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.data.pi_id) {
        setPiId(data.data.pi_id);
        setTempPiId(data.data.pi_id);
      }
    } catch (err) {
      console.error("Failed to fetch settings", err);
    }
  };

  const savePiId = async () => {
    if (!tempPiId.trim()) return;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify({ key: 'pi_id', value: tempPiId })
      });
      if (res.ok) {
        setPiId(tempPiId);
        setIsEditingPiId(false);
        setToast({ show: true, message: "PI ID updated successfully!", type: "success" });
        setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
      }
    } catch (err) {
      console.error("Failed to save PI ID", err);
    }
  };

  // --- LOAD CAMERAS FROM DB ---
  useEffect(() => {
    fetchSettings();
    fetch('/api/cameras')
      .then(res => res.json())
      .then(data => {
        console.log("Raw DB Response:", data);
        let validData = [];
        if (Array.isArray(data)) validData = data;
        else if (data && Array.isArray(data.data)) validData = data.data;
        else if (data && Array.isArray(data.cameras)) validData = data.cameras;
        
        const sanitized = validData.map((c: any) => ({
            ...c,
            status: c.status || 'active', 
            id: c.id 
        }));
        
        setCameras(sanitized);
        // Also fetch stats on mount
        fetchHourlyStats();
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
          if (data.success && data.today) {
             const mappedZones: Record<string, ZoneCount> = {};
             
             // First map today
             data.today.forEach((z: any) => {
                 mappedZones[z.zone_name] = {
                     todayIn: z.in || 0,
                     todayOut: z.out || 0,
                     allIn: 0,
                     allOut: 0
                 };
             });

             // Then map all time
             if (data.allTime) {
                data.allTime.forEach((z: any) => {
                    if (mappedZones[z.zone_name]) {
                        mappedZones[z.zone_name].allIn = z.in || 0;
                        mappedZones[z.zone_name].allOut = z.out || 0;
                    } else {
                        mappedZones[z.zone_name] = {
                            todayIn: 0,
                            todayOut: 0,
                            allIn: z.in || 0,
                            allOut: z.out || 0
                        };
                    }
                });
             }
             
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

  const fetchHistoricalData = async () => {
    if (activeTab !== "analytics" || cameras.length === 0) return;
    setIsHistoryLoading(true);
    
    try {
        const targetCams = analyticsFilter.cameraId === 'all' ? cameras : cameras.filter(c => c.id == analyticsFilter.cameraId);
        let allEvents: any[] = [];
        
        for (const cam of targetCams) {
            const url = `/api/zones?cameraId=${cam.id}&startDate=${analyticsFilter.startDate}&endDate=${analyticsFilter.endDate}&startTime=${analyticsFilter.startTime}&endTime=${analyticsFilter.endTime}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.events) {
                const annotated = data.events.map((e: any) => ({ ...e, cameraName: cam.name }));
                allEvents = [...allEvents, ...annotated];
            }
        }
        
        allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setEventHistory(allEvents);
        setVisibleHistoryCount(50); // Reset count on new fetch
    } catch (e) {
        console.error("Failed to fetch history", e);
    } finally {
        setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') {
        fetchHistoricalData();
    }
  }, [activeTab, analyticsFilter, cameras]);

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
      client.subscribe(`vision/${piId}/+/camera_add_response`);
      client.subscribe(`vision/${piId}/+/camera_remove_response`);
      client.subscribe(`vision/${piId}/+/snapshot`);
      client.subscribe(`vision/${piId}/+/counts/update`);
      client.subscribe(`vision/${piId}/+/lines/full_data`);
    });

    client.on("message", (topic, payload) => {
      const msgStr = payload.toString();
      const topicParts = topic.split("/");
      // Structure: vision/node_id/CAMERA_ID/ACTION
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
              setToast({ show: true, message: "Camera connected successfully!", type: "success" });
              setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
              
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
  }, [piId]);

  // --- ACTIONS ---

  const handleAddCamera = async () => {
    if (!newCamIp || !newCamUser || !newCamPass) {
      setSystemMessage("MISSING FIELDS");
      setSystemStatus("warning");
      return;
    }

    const finalUrl = getGeneratedRtspUrl(); 


    
    // Generate Random 6-digit ID
    const nextId = Math.floor(100000 + Math.random() * 900000).toString();

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
      `vision/${piId}/${nextId}/camera_add`,
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
      `vision/${piId}/${camId}/camera_remove`,
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
    setSnapshotUrl(null);
    
    // Load existing config
    const cam = cameras.find(c => c.id == camId);
    if (cam) {
        setCurrentZones(cam.zones || []);
        setCurrentLines(cam.lines || []);
    } else {
        setCurrentZones([]);
        setCurrentLines([]);
    }
    
    setIsSnapshotLoading(true);
    mqttClient?.publish(
      `vision/${piId}/${camId}/snapshot_request`,
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
            `vision/${piId}/${editingCameraId}/zone_config`,
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
            `vision/${piId}/${editingCameraId}/line_config`,
            JSON.stringify(linePayload),
            { qos: 1 }
         );
     }

     
     // Save to Database (Persist Config)
     const dbPayload = {
         zones: currentZones.map(z => ({
             name: z.name,
             x1: Math.round(z.x1),
             y1: Math.round(z.y1),
             x2: Math.round(z.x2),
             y2: Math.round(z.y2)
         })),
         lines: currentLines.map(l => ({
             name: l.name,
             start: { x: Math.round(l.start.x), y: Math.round(l.start.y) },
             end: { x: Math.round(l.end.x), y: Math.round(l.end.y) }
         }))
     };

     fetch(`/api/cameras/id?id=${editingCameraId}`, {
         method: 'PUT',
         body: JSON.stringify(dbPayload)
     }).catch(err => console.error("Failed to save config to DB", err));

     // Update local state so re-opening works immediately
     setCameras(prev => prev.map(c => c.id == editingCameraId ? { 
         ...c, 
         zones: dbPayload.zones,
         lines: dbPayload.lines
     } : c));

     setSystemMessage("CONFIGURATION SYNCED");
     setSystemStatus("ok");
     setEditingCameraId(null);
  };

  const handleRemoveZone = (camId: string | number, name: string) => {
    if (!name) return;
    
    // 1. MQTT Signal
    mqttClient?.publish(
      `vision/${piId}/${camId}/zone_remove`,
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
      `vision/${piId}/${camId}/line_remove`,
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
         <div className="p-6 pb-2">
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
                { id: "dashboard", label: "Dashboard", icon: Icons.Home },
                { id: "floorplan-upload", label: "Upload Map", icon: Icons.Plus },
                { id: "floorplan-config", label: "Map Config", icon: Icons.Map },
                { id: "analytics", label: "Analytics", icon: Icons.Analytics },
                { id: "setup", label: "Devices", icon: Icons.Camera },
                { id: "zone-config", label: "Zone Config", icon: Icons.Settings },
                { id: "heatmap", label: "Heatmap", icon: Icons.Heatmap },
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
                 <div className="flex items-center justify-between mb-2">
                     <div className="flex items-center gap-3">
                         <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-rose-500 shadow-sm animate-pulse"}`} />
                         <span className={`text-[10px] font-bold tracking-widest uppercase ${isConnected ? "text-emerald-600" : "text-rose-600"}`}>{isConnected ? "ONLINE" : "OFFLINE"}</span>
                     </div>
                     <button onClick={() => setIsEditingPiId(!isEditingPiId)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                         <Icons.Edit />
                     </button>
                 </div>
                 {isEditingPiId ? (
                     <div className="flex flex-col gap-2">
                         <input 
                             type="text" 
                             value={tempPiId} 
                             onChange={(e) => setTempPiId(e.target.value)}
                             className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-[10px] font-mono focus:ring-1 focus:ring-indigo-500 outline-none"
                             placeholder="Enter PI ID"
                             autoFocus
                         />
                         <div className="flex gap-2">
                             <button onClick={savePiId} className="flex-1 bg-indigo-600 text-white text-[8px] font-bold py-1 rounded-md uppercase tracking-wider">Save</button>
                             <button onClick={() => setIsEditingPiId(false)} className="flex-1 bg-gray-200 text-gray-600 text-[8px] font-bold py-1 rounded-md uppercase tracking-wider">Cancel</button>
                         </div>
                     </div>
                 ) : (
                     <div className="text-xs text-gray-500 font-mono">NODE: {piId}</div>
                 )}
             </div>
         </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50 relative">
          {/* Header */}
          <header className="h-16 px-8 flex items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-sm z-10">
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

          <div className={`flex-1 relative ${activeTab === "dashboard" ? "overflow-y-auto p-4" : "overflow-y-auto p-8"}`}>
              {isLoading && <LoadingOverlay message={loadingMessage} />}

              {/* DASHBOARD TAB */}
              {activeTab === "dashboard" && (
                   <div className="w-full max-w-7xl mx-auto space-y-6">
                      {/* Dashboard Header */}
                      <div className="flex justify-between items-end border-b border-gray-200 pb-4">
                          <div>
                              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">System <span className="text-indigo-600">Overview</span></h1>
                              <p className="text-sm text-gray-500 font-medium">Monitoring Node: {piId}</p>
                          </div>
                          <div className="text-right">
                              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Today's Total Traffic</span>
                              <div className="flex gap-4">
                                  <div className="bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                                      <span className="text-xs font-bold text-indigo-600">IN: {todayUniqueIn}</span>
                                  </div>
                                  <div className="bg-violet-50 px-3 py-1 rounded-lg border border-violet-100">
                                      <span className="text-xs font-bold text-violet-600">OUT: {todayUniqueOut}</span>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Hourly Traffic Graph */}
                      <div className="bg-white border border-gray-200 rounded-[2.5rem] p-8 shadow-sm">
                           {/* Header */}
                           <div className="flex justify-between items-center mb-6">
                               <div className="flex items-center gap-3">
                                   <div className="w-3 h-3 rounded-full bg-indigo-600 animate-pulse" />
                                   <span className="text-sm font-black text-gray-900 uppercase tracking-widest">Hourly Footfall — Today</span>
                               </div>
                               <button onClick={fetchHourlyStats} className="text-gray-400 hover:text-indigo-600 transition-colors p-2 rounded-xl hover:bg-indigo-50" title="Refresh">
                                   <Icons.Refresh />
                               </button>
                           </div>

                           {/* Chart */}
                           {(() => {
                               const maxVal = Math.max(...hourlyStats.map(s => s.in || 0), 1);
                               return (
                                   <div className="flex items-end gap-[3px]" style={{ height: 200 }}>
                                       {hourlyStats.map((s, i) => {
                                           const val = s.in || 0;
                                           const pct = (val / maxVal) * 100;
                                           return (
                                               <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                                                   {/* Tooltip */}
                                                   <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold rounded-lg px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
                                                       {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i-12} PM`}: {val}
                                                       <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                                                   </div>
                                                   {/* Value label */}
                                                   {val > 0 && (
                                                       <span className="text-[9px] font-bold text-indigo-600 mb-1">{val}</span>
                                                   )}
                                                   {/* Bar */}
                                                   <div
                                                       className="w-full rounded-t-md transition-all duration-300 group-hover:opacity-75 cursor-pointer"
                                                       style={{
                                                           height: `${Math.max(pct, val > 0 ? 3 : 0)}%`,
                                                           background: 'linear-gradient(to top, #4338ca, #6366f1)',
                                                       }}
                                                   />
                                               </div>
                                           );
                                       })}
                                   </div>
                               );
                           })()}

                           {/* X-axis labels */}
                           <div className="flex gap-[3px] mt-2 border-t border-gray-100 pt-2">
                               {hourlyStats.map((_, i) => (
                                   <div key={i} className="flex-1 text-center text-[9px] font-semibold text-gray-400">
                                       {i % 3 === 0 ? (i === 0 ? '12a' : i < 12 ? `${i}a` : i === 12 ? '12p' : `${i-12}p`) : ''}
                                   </div>
                               ))}
                           </div>

                           {/* Summary footer */}
                           <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                               <div className="flex gap-4">
                                   <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                                       <span className="text-[10px] text-indigo-400 font-bold uppercase block">Total IN</span>
                                       <span className="text-lg font-black text-indigo-600">{todayUniqueIn}</span>
                                   </div>
                                   <div className="bg-violet-50 px-4 py-2 rounded-xl border border-violet-100">
                                       <span className="text-[10px] text-violet-400 font-bold uppercase block">Total OUT</span>
                                       <span className="text-lg font-black text-violet-600">{todayUniqueOut}</span>
                                   </div>
                               </div>
                               <span className="text-[10px] text-gray-400 font-medium">
                                   Peak: {(() => { const p = hourlyStats.reduce((m, s) => (s.in || 0) > (m.in || 0) ? s : m, hourlyStats[0]); return `${p.hour === 0 ? '12' : p.hour > 12 ? p.hour - 12 : p.hour}${p.hour < 12 ? 'AM' : 'PM'} (${p.in || 0})`; })()}
                               </span>
                           </div>
                      </div>

                       {/* Module Grid */}
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                           {[
                               { id: "floorplan-upload", icon: <Icons.Plus />, label: "Upload Floor Plan", desc: "Import new store layouts.", color: "emerald" },
                               { id: "floorplan-config", icon: <Icons.Map />, label: "Config Floor Plan", desc: "Map devices to layout.", color: "teal" },
                               { id: "analytics", icon: <Icons.Analytics />, label: "Footfall Analytics", desc: "Monitor real-time traffic.", color: "indigo" },
                               { id: "setup", icon: <Icons.Camera />, label: "Device Setup", desc: "Manage camera hardware.", color: "violet" },
                               { id: "zone-config", icon: <Icons.Settings />, label: "Zone Config", desc: "Calibrate detection areas.", color: "sky" },
                               { id: "heatmap", icon: <Icons.Heatmap />, label: "Heatmap View", desc: "Analyze dwell patterns.", color: "amber" },
                           ].map((mod) => (
                               <div key={mod.id} onClick={() => setActiveTab(mod.id as any)} 
                                   className="group bg-white border-2 border-gray-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl hover:border-indigo-500/20 transition-all cursor-pointer relative overflow-hidden flex flex-col items-center text-center">
                                   <div className={`w-16 h-16 bg-${mod.color}-100 text-${mod.color}-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                       {mod.icon}
                                   </div>
                                   <h3 className="text-xl font-bold text-gray-900 mb-2">{mod.label}</h3>
                                   <p className="text-gray-500 text-xs px-4">{mod.desc}</p>
                                   <div className="mt-6 flex items-center gap-2 text-indigo-600 font-bold text-[10px] tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                                       Launch Module &rarr;
                                   </div>
                               </div>
                           ))}
                       </div>
                  </div>
              )}

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
                      {/* Detailed Filters */}
                      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-200 shadow-sm space-y-6">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                  <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                                  </span>
                                  Advanced Filters
                              </h3>
                              <div className="flex items-center gap-2">
                                  <button onClick={() => {
                                      const today = new Date().toISOString().split('T')[0];
                                      setAnalyticsFilter(p => ({ ...p, startDate: today, endDate: today, startTime: "00:00", endTime: "23:59" }));
                                  }} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors uppercase tracking-widest">Today</button>
                                  <button onClick={fetchHistoricalData} className="px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-indigo-600 transition-colors uppercase tracking-widest flex items-center gap-2">
                                      <Icons.Refresh /> Refresh
                                  </button>
                              </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                              <div className="space-y-1">
                                  <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest ml-1">Camera Node</label>
                                  <select className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:border-indigo-500 outline-none"
                                      value={analyticsFilter.cameraId} onChange={e => setAnalyticsFilter(p => ({ ...p, cameraId: e.target.value }))}>
                                      <option value="all">ALL CAMERAS</option>
                                      {cameras.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                  </select>
                              </div>
                              <div className="space-y-1">
                                  <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest ml-1">Start Date</label>
                                  <input type="date" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:border-indigo-500 outline-none"
                                      value={analyticsFilter.startDate} onChange={e => setAnalyticsFilter(p => ({ ...p, startDate: e.target.value }))} />
                              </div>
                              <div className="space-y-1">
                                  <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest ml-1">End Date</label>
                                  <input type="date" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:border-indigo-500 outline-none"
                                      value={analyticsFilter.endDate} onChange={e => setAnalyticsFilter(p => ({ ...p, endDate: e.target.value }))} />
                              </div>
                              <div className="space-y-1">
                                  <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest ml-1">Start Time</label>
                                  <input type="time" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:border-indigo-500 outline-none"
                                      value={analyticsFilter.startTime} onChange={e => setAnalyticsFilter(p => ({ ...p, startTime: e.target.value }))} />
                              </div>
                              <div className="space-y-1">
                                  <label className="text-[10px] uppercase font-black text-gray-400 tracking-widest ml-1">End Time</label>
                                  <input type="time" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold focus:border-indigo-500 outline-none"
                                      value={analyticsFilter.endTime} onChange={e => setAnalyticsFilter(p => ({ ...p, endTime: e.target.value }))} />
                              </div>
                          </div>
                      </div>

                      {/* Summary Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                          {Object.values(zoneCounts).every(z => Object.keys(z).length === 0) ? (
                               <div className="col-span-full h-48 flex items-center justify-center flex-col text-gray-400 bg-white border border-gray-200 rounded-[2.5rem]">
                                   <Icons.Analytics />
                                   <span className="mt-4 text-[10px] font-black uppercase tracking-[0.2em]">Awaiting Live Stream...</span>
                               </div>
                          ) : (
                              Object.entries(zoneCounts).map(([camId, zones]) => (
                                   Object.entries(zones).map(([zoneName, count]: [string, any]) => (
                                       <div key={`${camId}-${zoneName}`} className="bg-white border border-gray-200 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-500">
                                           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
                                           <div className="flex justify-between items-start mb-8">
                                               <div>
                                                   <div className="text-[9px] text-gray-400 font-black uppercase tracking-[0.3em] mb-1">{cameras.find(c => c.id == camId)?.name || camId}</div>
                                                   <div className="text-xl font-black text-gray-900 tracking-tight">{zoneName}</div>
                                               </div>
                                               <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Icons.Analytics /></div>
                                           </div>
                                           <div className="flex flex-col gap-4">
                                               {/* Today Section */}
                                               <div className="bg-slate-50 border border-slate-100 p-4 rounded-3xl">
                                                   <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Live Stats (Today)</div>
                                                   <div className="flex gap-3">
                                                       <div className="flex-1 text-center">
                                                           <div className="text-2xl font-black text-emerald-600">{count.todayIn}</div>
                                                           <div className="text-[7px] uppercase font-black text-emerald-600/40">In</div>
                                                       </div>
                                                       <div className="w-px h-8 bg-slate-200 self-center" />
                                                       <div className="flex-1 text-center">
                                                           <div className="text-2xl font-black text-rose-600">{count.todayOut}</div>
                                                           <div className="text-[7px] uppercase font-black text-rose-600/40">Out</div>
                                                       </div>
                                                   </div>
                                               </div>

                                               {/* All Time Section */}
                                               <div className="bg-indigo-600 p-4 rounded-3xl text-white shadow-lg shadow-indigo-500/20">
                                                   <div className="text-[8px] font-black text-indigo-200 uppercase tracking-widest mb-3 text-center">Life-Time Yield</div>
                                                   <div className="flex gap-3">
                                                       <div className="flex-1 text-center">
                                                           <div className="text-2xl font-black">{count.allIn}</div>
                                                           <div className="text-[7px] uppercase font-black text-indigo-300">Total In</div>
                                                       </div>
                                                       <div className="w-px h-8 bg-indigo-500/50 self-center" />
                                                       <div className="flex-1 text-center">
                                                           <div className="text-2xl font-black">{count.allOut}</div>
                                                           <div className="text-[7px] uppercase font-black text-indigo-300">Total Out</div>
                                                       </div>
                                                   </div>
                                               </div>
                                           </div>
                                       </div>
                                   ))
                              ))
                          )}
                      </div>

                      {/* Event History Table */}
                      <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden">
                          <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                              <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
                                  <span className="p-2 rounded-lg bg-indigo-600 text-white"><Icons.Map /></span>
                                  Detailed Event Log
                              </h3>
                              <span className="px-4 py-1.5 rounded-full bg-white text-[10px] font-black text-gray-500 border border-gray-200 shadow-sm uppercase tracking-widest">
                                  {eventHistory.length} Records Found
                              </span>
                          </div>
                          <div className="overflow-x-auto min-h-[400px]">
                              {isHistoryLoading ? (
                                  <div className="h-64 flex flex-col items-center justify-center space-y-4">
                                      <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Decoding Event Stream...</p>
                                  </div>
                              ) : eventHistory.length === 0 ? (
                                  <div className="h-64 flex flex-col items-center justify-center text-gray-400 grayscale opacity-40">
                                      <Icons.Analytics />
                                      <p className="mt-4 text-sm font-bold uppercase tracking-widest">No movement clusters detected</p>
                                  </div>
                              ) : (
                                  <table className="w-full text-left">
                                      <thead>
                                          <tr className="bg-gray-50/50 border-b border-gray-100">
                                              <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Timestamp</th>
                                              <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Camera Node</th>
                                              <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Person ID</th>
                                              <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                                              <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Asset Name</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-50">
                                          {eventHistory.slice(0, visibleHistoryCount).map((ev, i) => (
                                              <tr key={i} className="hover:bg-indigo-50/30 transition-colors group">
                                                  <td className="px-8 py-4">
                                                      <div className="text-sm font-bold text-gray-900">{new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                                                      <div className="text-[10px] text-gray-400 font-medium">{new Date(ev.timestamp).toLocaleDateString()}</div>
                                                  </td>
                                                  <td className="px-8 py-4">
                                                      <span className="px-3 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-black uppercase tracking-widest">{ev.cameraName}</span>
                                                  </td>
                                                  <td className="px-8 py-4">
                                                      <div className="flex items-center gap-2">
                                                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black">#</div>
                                                          <span className="text-sm font-mono font-black text-indigo-600">{ev.person_id}</span>
                                                      </div>
                                                  </td>
                                                  <td className="px-8 py-4">
                                                      <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${ev.action === 'Entered' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                          {ev.action}
                                                      </span>
                                                  </td>
                                                  <td className="px-8 py-4">
                                                      <span className="text-sm font-bold text-gray-700">{ev.zone_name}</span>
                                                  </td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              )}
                              {eventHistory.length > visibleHistoryCount && (
                                  <div className="p-8 border-t border-gray-100 bg-gray-50/30 flex justify-center">
                                      <button 
                                          onClick={() => setVisibleHistoryCount(prev => prev + 50)}
                                          className="px-8 py-3 bg-white border border-gray-200 text-indigo-600 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-sm hover:border-indigo-600 hover:shadow-indigo-500/10 transition-all flex items-center gap-3 group"
                                      >
                                          Next Batch 
                                          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                      </button>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              )}

               {activeTab === "zone-config" && (
                   <div className="max-w-5xl mx-auto py-8">
                       <div className="grid grid-cols-1 gap-6">
                           <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 rounded-[2.5rem] text-white flex justify-between items-center mb-6">
                               <div>
                                   <h3 className="text-2xl font-black mb-2 uppercase tracking-tight">Zone Calibration</h3>
                                   <p className="text-gray-400 text-sm max-w-md italic">Define your detection boundaries. Draw polygonal zones for occupancy and trip-wires for inflow tracking.</p>
                               </div>
                               <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                   <Icons.Settings />
                               </div>
                           </div>
                           
                           {cameras.map(cam => (
                               <div key={cam.id} className="bg-white border border-gray-200 rounded-3xl p-6 flex items-center justify-between group hover:border-sky-300 transition-all shadow-sm">
                                   <div className="flex items-center gap-6">
                                       <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
                                           <Icons.Camera />
                                       </div>
                                       <div>
                                           <h4 className="text-lg font-black text-gray-900">{cam.name}</h4>
                                           <div className="flex items-center gap-3 mt-1">
                                               <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">{cam.ip}</span>
                                               <span className="w-1 h-1 rounded-full bg-gray-300" />
                                               <span className="text-[10px] font-black text-sky-600 uppercase tracking-widest">Channel {cam.channel}</span>
                                           </div>
                                       </div>
                                   </div>
                                   <button onClick={() => handleConfigure(cam.id)} className="px-8 py-3 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-600 transition-all shadow-lg shadow-gray-900/10 hover:shadow-sky-500/20 active:scale-95">
                                       Configure Zones
                                   </button>
                               </div>
                           ))}
                           
                           {cameras.length === 0 && (
                               <div className="h-64 rounded-[2.5rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center bg-gray-50/50">
                                   <div className="p-4 rounded-full bg-white shadow-sm mb-4 text-gray-300"><Icons.Camera /></div>
                                   <p className="text-gray-400 font-bold text-xs uppercase tracking-widest text-center">No hardware nodes found.<br/>Link a camera in 'Devices' to begin.</p>
                               </div>
                           )}
                       </div>
                   </div>
               )}
               
               {activeTab === "floorplan-upload" && <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden"><FloorPlanUploader initialStep="upload" /></div>}
               {activeTab === "floorplan-config" && <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden"><FloorPlanUploader initialStep="list" /></div>}
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
      {/* Toast Notification Overlay */}
      {toast.show && (
          <div className="fixed bottom-10 right-10 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
              <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border-2 ${toast.type === "success" ? "bg-emerald-500 border-emerald-400 text-white" : "bg-rose-500 border-rose-400 text-white"}`}>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      {toast.type === "success" ? <Icons.Check /> : <Icons.X />}
                  </div>
                  <span className="font-bold tracking-wide uppercase text-xs">{toast.message}</span>
              </div>
          </div>
      )}
    </div>
  );
}
