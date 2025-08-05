"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Mic, Play, Pause, Trash2, Volume2, AudioLines, ArrowLeft, Send, Wifi
} from "lucide-react";
import toast from "react-hot-toast";

// --- INTERFACES --- //

interface Device {
  _id: string;
  name: string;
  serialNumber: string;
  imageUrl: string;
}

interface AnnouncementFile {
  id: string;
  name: string;
  url: string;
  duration?: number;
  // For new recordings
  blob?: Blob;
  type?: 'recorded' | 'uploaded';
}

interface InstantaneousAnnouncementProps {
  onCancel: () => void;
  onSuccess: () => void;
}

// --- COMPONENT --- //

const InstantaneousAnnouncement: React.FC<InstantaneousAnnouncementProps> = ({ onCancel, onSuccess }) => {
  const [step, setStep] = useState<number>(1);
  // FIX 1: Set initial loading state to true to handle initial data fetch.
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Step 1: Device Selection
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<{ [deviceId: string]: 'idle' | 'announcing' }>({});

  // Step 2: Audio Selection
  const [activeTab, setActiveTab] = useState<'record' | 'select'>('record');
  const [existingAnnouncements, setExistingAnnouncements] = useState<AnnouncementFile[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<AnnouncementFile | null>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- EFFECTS --- //

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      toast.error("User not authenticated.");
      // If no user is found, we should stop the loading process.
      setIsLoading(false);
    }
  }, []);

  // FIX 2: Modified this effect to robustly handle the loading state.
  useEffect(() => {
    if (userId) {
      fetchAvailableDevices();
    } else {
      // If the component mounts and there's no userId, ensure loading is turned off.
      // This prevents the loader from spinning indefinitely.
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (availableDevices.length > 0) {
      const fetchAllStatuses = async () => {
        availableDevices.forEach(device => fetchDeviceStatus(device.serialNumber, device._id));
      };

      fetchAllStatuses();
      const intervalId = setInterval(fetchAllStatuses, 5000);

      return () => clearInterval(intervalId);
    }
  }, [availableDevices]);

  useEffect(() => {
    if (step === 2 && userId) {
      fetchExistingAnnouncements();
    }
  }, [step, userId]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [selectedAudio]);


  // --- DATA FETCHING --- //

  const fetchDeviceStatus = async (serialNumber: string, deviceId: string) => {
    try {
      // Note: This API endpoint needs to exist and return the status.
      const response = await fetch(`/api/instant-announcement/get?serialNumber=${serialNumber}`);
      if (response.ok) {
        const data = await response.json();
        const isAnnouncing = data.announcements && data.announcements.length > 0;
        setDeviceStatus(prev => ({ ...prev, [deviceId]: isAnnouncing ? 'announcing' : 'idle' }));
      }
    } catch (error) {
      console.error(`Failed to fetch status for ${serialNumber}:`, error);
      setDeviceStatus(prev => ({ ...prev, [deviceId]: 'idle' }));
    }
  };

  const fetchAvailableDevices = async () => {
    // We already set isLoading to true initially. No need to set it again here
    // unless you want a loader for subsequent fetches.
    setIsLoading(true);
    try {
      const response = await fetch(`/api/onboarded-devices?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch devices");
      const data = await response.json();
      const formattedDevices = (data.data || []).map((item: any) => ({
          _id: item._id,
          name: item.deviceId.name,
          serialNumber: item.deviceId.serialNumber,
          imageUrl: item.deviceId.imageUrl,
      }));
      setAvailableDevices(formattedDevices);
      
    } catch (error) {
      console.error("Error fetching devices:", error);
      toast.error("Failed to fetch available devices.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExistingAnnouncements = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/announcement/list?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch announcements");
      const data = await response.json();
      const formattedAnnouncements = data.map((item: any) => ({
        id: item._id,
        name: item.name,
        url: item.path,
        duration: item.duration,
        type: 'uploaded'
      }));
      setExistingAnnouncements(formattedAnnouncements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      toast.error("Failed to fetch existing announcements.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- RECORDING LOGIC --- //
  

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setSelectedAudio({
          id: `rec-${Date.now()}`,
          name: `Recording-${new Date().toLocaleTimeString()}`,
          url,
          blob,
          type: 'recorded',
        });
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const discardRecording = () => {
    setSelectedAudio(null);
    setRecordingTime(0);
  };

  // --- PLAYBACK LOGIC --- //

  const togglePlayback = (audioUrl: string) => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!audioRef.current || audioRef.current.src !== audioUrl) {
        if(audioRef.current) {
             audioRef.current.pause();
        }
        audioRef.current = new Audio(audioUrl);
        audioRef.current.addEventListener('timeupdate', () => setCurrentTime(audioRef.current!.currentTime));
        audioRef.current.addEventListener('ended', () => {
            setIsPlaying(false);
            setCurrentTime(0);
        });
      }
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // --- SUBMISSION LOGIC --- //

  const handleSendAnnouncement = async () => {
    if (!selectedDevice || !selectedAudio) {
      toast.error("Please select a device and an audio announcement.");
      return;
    }

    setIsLoading(true);
    let finalAudioUrl = selectedAudio.url;

    try {
      if (selectedAudio.type === 'recorded' && selectedAudio.blob) {
        const formData = new FormData();
        const audioFile = new File([selectedAudio.blob], `${selectedAudio.name}.wav`, { type: 'audio/wav' });

        formData.append("file", audioFile);
        // Replace with your actual Cloudinary preset
        formData.append("upload_preset", "your_upload_preset"); 
        formData.append("resource_type", "video");

        const cloudRes = await fetch(
          // Replace with your actual Cloudinary cloud name
          `https://api.cloudinary.com/v1_1/your_cloud_name/upload`,
          { method: "POST", body: formData }
        );

        const cloudData = await cloudRes.json();
        if (!cloudRes.ok) throw new Error(cloudData.error?.message || "Cloudinary upload failed");

        finalAudioUrl = cloudData.secure_url;
      }

      const response = await fetch("/api/instant-announcement/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          deviceId: selectedDevice.serialNumber,
          audioUrl: finalAudioUrl,
          announcementName: selectedAudio.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send announcement");
      }

      toast.success("Instantaneous announcement sent successfully!");
      onSuccess();

    } catch (error) {
      console.error("Sending announcement failed:", error);
      toast.error(error instanceof Error ? error.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- HELPERS --- //

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDeviceSelect = (device: Device) => {
    setSelectedDevice(device);
    setStep(2);
  };

  const resetAndGoBack = () => {
    setStep(1);
    setSelectedDevice(null);
    setSelectedAudio(null);
  };

  // --- RENDER LOGIC --- //
  

  const renderStep1 = () => (
    <div>
      <div className="mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold text-black">Instantaneous Announcement</h2>
        <p className="text-sm text-gray-500 mt-1">Step 1 of 2: Select a Device to announce to</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableDevices.map((device) => {
               const isAnnouncing = deviceStatus[device._id] === 'announcing';
               return (
                <button
                    key={device._id}
                    onClick={() => handleDeviceSelect(device)}
                    disabled={isAnnouncing}
                    className={`p-4 border rounded-lg text-left transition-all relative overflow-hidden ${
                        isAnnouncing
                        ? 'bg-orange-50 border-orange-200 cursor-not-allowed'
                        : 'hover:border-blue-500 hover:shadow-md'
                    }`}
                >
                    <div className="flex items-center gap-3">
                      <img src={device.imageUrl} alt={device.name} className="w-12 h-12 rounded-lg object-cover" />
                      <div>
                          <h3 className="font-medium text-gray-900">{device.name}</h3>
                          <p className="text-sm text-gray-500">ID: {device.serialNumber}</p>
                      </div>
                    </div>
                    {isAnnouncing && (
                        <div className="absolute inset-0 bg-white/70 flex flex-col justify-center items-center">
                           <div className="flex items-center gap-2 text-sm font-semibold text-orange-600">
                             <Wifi className="animate-ping h-4 w-4" />
                             <span>Currently Announcing...</span>
                           </div>
                        </div>
                    )}
                </button>
               );
            })}
          </div>
          {availableDevices.length === 0 && !isLoading && (
             <p className="text-center text-gray-500 py-4">No devices available. Please onboard a device first.</p>
          )}
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div>
      <div className="mb-6 border-b pb-4">
        <button onClick={resetAndGoBack} className="flex items-center gap-2 text-sm text-blue-600 hover:underline mb-3">
          <ArrowLeft size={16} />
          Back to Device Selection
        </button>
        <h2 className="text-2xl font-bold text-black">Instantaneous Announcement</h2>
        <p className="text-sm text-gray-500 mt-1">Step 2 of 2: Choose or Record Audio</p>
      </div>

      <div className="bg-blue-50 p-3 rounded-lg mb-6 text-sm">
        Announcing to: <span className="font-semibold text-blue-800">{selectedDevice?.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
            <button onClick={() => setActiveTab('record')} className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${activeTab === 'record' ? 'bg-white shadow-sm text-red-600' : 'text-gray-600'}`}>
              <Mic size={18} /> Record Audio
            </button>
            <button onClick={() => setActiveTab('select')} className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${activeTab === 'select' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600'}`}>
              <AudioLines size={18} /> Select from Library
            </button>
          </div>
          {activeTab === 'record' ? renderRecordTab() : renderSelectTab()}
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Volume2 size={18} />
            Selected Announcement
          </h3>
          {selectedAudio ? (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-sm text-gray-900 truncate pr-2">{selectedAudio.name}</p>
                <button onClick={() => setSelectedAudio(null)} className="text-red-500 hover:text-red-700 p-1 rounded flex-shrink-0">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => togglePlayback(selectedAudio.url)} className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full">
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                  <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: audioRef.current && audioRef.current.duration ? `${(currentTime / audioRef.current.duration) * 100}%` : '0%' }} />
                </div>
                <span className="text-xs text-gray-500 font-mono">
                    {formatTime(currentTime)}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Volume2 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p>No audio selected</p>
              <p className="text-xs mt-1">Record or select an audio file.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderRecordTab = () => (
    <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-6 text-center">
      {!isRecording && !selectedAudio?.blob ? (
        <button onClick={startRecording} className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto">
          <Mic size={18} /> Start Recording
        </button>
      ) : isRecording ? (
        <div className="space-y-4">
            <div className="flex justify-center items-center gap-2 text-lg font-mono font-bold text-red-600 mb-4 animate-pulse">
                <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                <span>{formatTime(recordingTime)}</span>
            </div>
          <button onClick={stopRecording} className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-medium">
            Stop Recording
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-lg font-medium text-green-700 mb-2">Recording Complete!</p>
          <input
            type="text"
            placeholder="Enter announcement name"
            value={selectedAudio?.name || ''}
            onChange={(e) => setSelectedAudio(prev => prev ? { ...prev, name: e.target.value } : null)}
            className="w-full p-3 border rounded-lg text-sm text-center"
          />
          <div className="flex gap-3 justify-center">
            <button onClick={discardRecording} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100">
                Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderSelectTab = () => (
    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
      {isLoading ? <p className="text-sm text-center text-gray-500 py-4">Loading announcements...</p> :
        existingAnnouncements.map(file => (
          <div
            key={file.id}
            onClick={() => setSelectedAudio(file)}
            className={`p-3 border rounded-lg cursor-pointer transition-all ${selectedAudio?.id === file.id ? 'bg-blue-50 border-blue-500 shadow-sm' : 'hover:border-gray-400'}`}
          >
            <p className="font-medium text-sm text-gray-800">{file.name}</p>
            {file.duration && <p className="text-xs text-gray-500">Duration: {formatTime(file.duration)}</p>}
          </div>
        ))}
      {existingAnnouncements.length === 0 && !isLoading && <p className="text-sm text-gray-500 text-center py-4">No existing announcements found.</p>}
    </div>
  );


  return (
    <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6">
            {step === 1 ? renderStep1() : renderStep2()}
        </div>

      {/* --- ACTION BUTTONS --- */}
      <div className="p-4 border-t bg-gray-50 rounded-b-xl">
        <div className="flex justify-end gap-4">
          <button onClick={onCancel} disabled={isLoading} className="px-6 py-2 text-gray-700 hover:bg-gray-200 font-medium rounded-lg disabled:opacity-50">
            Cancel
          </button>
          {step === 2 && (
            <button
              onClick={handleSendAnnouncement}
              disabled={isLoading || !selectedAudio || !selectedDevice}
              className="px-6 py-2 rounded-lg font-medium text-white flex items-center gap-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Send Announcement</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstantaneousAnnouncement;