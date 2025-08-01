"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Upload, Mic, Play, Pause, Trash2, Volume2, AudioLines, ArrowLeft, Radio, Send, Database, FileAudio
} from "lucide-react";
import toast from "react-hot-toast";

// --- INTERFACES --- //

interface Device {
  _id: string;
  name: string;
  deviceId: {
    _id: string;
    serialNumber: string;
    imageUrl: string;
    name: string;
  };
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Step 1: Device Selection
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

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
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchAvailableDevices();
    }
  }, [userId]);

  useEffect(() => {
    if (step === 2 && userId) {
      fetchExistingAnnouncements();
    }
  }, [step, userId]);
  
    // Cleanup audio element on unmount or when audio source changes
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [selectedAudio]);


  // --- DATA FETCHING --- //

  const fetchAvailableDevices = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/onboarded-devices?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch devices");
      const data = await response.json();
      setAvailableDevices(data.data || []);
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
      // NOTE: Assuming an API endpoint to get existing audio announcements
      const response = await fetch(`/api/announcement/list?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch announcements");
      const data = await response.json();
      // Adapt fetched data to AnnouncementFile interface
      const formattedAnnouncements = data.map((item: any) => ({
        id: item._id,
        name: item.name,
        url: item.path,
        duration: item.duration, // Assuming duration is available
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
        audioRef.current = new Audio(audioUrl);
        audioRef.current.addEventListener('timeupdate', () => setCurrentTime(audioRef.current!.currentTime));
        audioRef.current.addEventListener('ended', () => setIsPlaying(false));
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
        // If the audio is a new recording, upload it first
        if (selectedAudio.type === 'recorded' && selectedAudio.blob) {
            const formData = new FormData();
            const audioFile = new File([selectedAudio.blob], `${selectedAudio.name}.wav`, { type: 'audio/wav' });
            
            // NOTE: Using a generic upload preset. Replace with your actual Cloudinary values.
            formData.append("file", audioFile);
            formData.append("upload_preset", "announcement_upload_preset"); // Replace with your preset
            formData.append("resource_type", "video");

            const cloudRes = await fetch(
                `https://api.cloudinary.com/v1_1/dzb0gggua/upload`, // Replace with your cloud name
                { method: "POST", body: formData }
            );
            
            const cloudData = await cloudRes.json();
            if (!cloudRes.ok) throw new Error(cloudData.error?.message || "Cloudinary upload failed");
            
            finalAudioUrl = cloudData.secure_url;
        }

        // Send the announcement to the selected device
        // NOTE: This assumes an API endpoint to trigger the announcement
        const response = await fetch("/api/instant-announcement/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId,
                deviceId: selectedDevice.deviceId._id,
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
        <div className="flex justify-center items-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableDevices.map((device) => (
              <button
                key={device._id}
                onClick={() => handleDeviceSelect(device)}
                className="p-4 border rounded-lg text-left transition-all hover:border-blue-500 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <img src={device.deviceId.imageUrl} alt={device.name} className="w-12 h-12 rounded-lg object-cover" />
                  <div>
                    <h3 className="font-medium text-gray-900">{device.deviceId.name}</h3>
                    <p className="text-sm text-gray-500">ID: {device.deviceId.serialNumber}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {availableDevices.length === 0 && <p className="text-center text-gray-500 py-4">No devices available.</p>}
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
            Announcing to: <span className="font-semibold text-blue-800">{selectedDevice?.deviceId.name}</span>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel: Record or Select */}
            <div>
                 <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
                    <button onClick={() => setActiveTab('record')} className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${activeTab === 'record' ? 'bg-white shadow-sm text-red-600' : 'text-gray-600'}`}>
                        <Mic size={18} /> Record Audio
                    </button>
                    <button onClick={() => setActiveTab('select')} className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${activeTab === 'select' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600'}`}>
                        <FileAudio size={18} /> Select from Library
                    </button>
                </div>

                {activeTab === 'record' ? renderRecordTab() : renderSelectTab()}
            </div>

            {/* Right Panel: Selection Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <AudioLines size={18} />
                    Selected Announcement
                </h3>
                {selectedAudio ? (
                    <div className="bg-white rounded-lg shadow-sm p-4">
                        <div className="flex items-center justify-between mb-3">
                            <p className="font-medium text-sm text-gray-900">{selectedAudio.name}</p>
                            <button onClick={() => setSelectedAudio(null)} className="text-red-500 hover:text-red-700 p-1 rounded">
                                <Trash2 size={16} />
                            </button>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => togglePlayback(selectedAudio.url)} className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full">
                                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                            </button>
                            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                               <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: audioRef.current ? `${(currentTime / audioRef.current.duration) * 100}%` : '0%' }} />
                            </div>
                            <span className="text-xs text-gray-500 font-mono">{formatTime(currentTime)}</span>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <Volume2 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                        <p>No audio selected</p>
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
                 <p className="text-lg font-mono font-bold text-gray-700 mb-4 animate-pulse">{formatTime(recordingTime)}</p>
                 <button onClick={stopRecording} className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium">
                    Stop Recording
                 </button>
            </div>
        ) : (
             <div className="space-y-4">
                 <p className="text-lg font-medium text-green-600 mb-2">Recording Complete!</p>
                 <input
                    type="text"
                    placeholder="Enter announcement name"
                    value={selectedAudio?.name || ''}
                    onChange={(e) => setSelectedAudio(prev => prev ? {...prev, name: e.target.value} : null)}
                    className="w-full p-3 border rounded-lg text-sm"
                  />
                 <div className="flex gap-3 justify-center">
                    <button onClick={discardRecording} className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg">Discard</button>
                 </div>
            </div>
        )}
    </div>
  );
  
  const renderSelectTab = () => (
    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
        {isLoading ? <p>Loading announcements...</p> : 
            existingAnnouncements.map(file => (
                <div 
                    key={file.id} 
                    onClick={() => setSelectedAudio(file)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${selectedAudio?.id === file.id ? 'bg-blue-50 border-blue-500' : 'hover:border-gray-400'}`}
                >
                    <p className="font-medium text-sm text-gray-800">{file.name}</p>
                    {file.duration && <p className="text-xs text-gray-500">{formatTime(file.duration)}</p>}
                </div>
        ))}
        {existingAnnouncements.length === 0 && !isLoading && <p className="text-sm text-gray-500 text-center py-4">No existing announcements found.</p>}
    </div>
  );


  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {step === 1 ? renderStep1() : renderStep2()}
      
      {/* --- ACTION BUTTONS --- */}
      <div className="p-6 border-t bg-gray-50 mt-6 -mx-6 -mb-6">
        <div className="flex justify-end gap-4">
          <button onClick={onCancel} disabled={isLoading} className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium">
            Cancel
          </button>
          {step === 2 && (
             <button
                onClick={handleSendAnnouncement}
                disabled={isLoading || !selectedAudio || !selectedDevice}
                className={`px-6 py-2 rounded-lg font-medium text-white flex items-center gap-2 ${
                  isLoading || !selectedAudio || !selectedDevice
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
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