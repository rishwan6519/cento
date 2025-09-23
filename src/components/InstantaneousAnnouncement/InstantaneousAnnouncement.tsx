"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Mic, Play, Pause, Trash2, Volume2, AudioLines, ArrowLeft, Send, Wifi, Bot, Languages, ChevronDown
} from "lucide-react";
import toast from "react-hot-toast";

// --- CONSTANTS --- //

const geminiVoices = [
  'Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda', 'Orus', 'Aoede',
  'Callirrhoe', 'Autonoe', 'Enceladus', 'Iapetus', 'Umbriel', 'Algieba',
  'Despina', 'Erinome', 'Algenib', 'Rasalgethi', 'Laomedeia', 'Achernar',
  'Alnilam', 'Schedar', 'Gacrux', 'Pulcherrima', 'Achird', 'Zubenelgenubi',
  'Vindemiatrix', 'Sadachbia', 'Sadaltager', 'Sulafat'
];

const supportedLanguages = [
    { code: 'en-US', name: 'English (US)' }, { code: 'en-GB', name: 'English (UK)' },
    { code: 'en-AU', name: 'English (Australia)' },  { code: 'en-IN', name: 'English (India)' }, 
    { code: 'es-US', name: 'Spanish (US)' },{ code: 'fr-FR', name: 'French (France)' }, 
    { code: 'de-DE', name: 'German (Germany)' }, 
     
];


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
  blob?: Blob;
  type?: 'recorded' | 'uploaded' | 'tts';
}

interface InstantaneousAnnouncementProps {
  onCancel: () => void;
  onSuccess: () => void;
}

// --- COMPONENT --- //

const InstantaneousAnnouncement: React.FC<InstantaneousAnnouncementProps> = ({ onCancel, onSuccess }) => {
  const [step, setStep] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Step 1: Device Selection
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<{ [deviceId: string]: 'idle' | 'announcing' }>({});

  // Step 2: Audio Selection
  const [activeTab, setActiveTab] = useState<'record' | 'select' | 'tts'>('record');
  const [existingAnnouncements, setExistingAnnouncements] = useState<AnnouncementFile[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<AnnouncementFile | null>(null);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // TTS State
  const [ttsText, setTtsText] = useState("Hello! This is an important announcement. The store will be closing in 15 minutes.");
  const [selectedVoice, setSelectedVoice] = useState('Puck');
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [isGenerating, setIsGenerating] = useState(false);

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
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchAvailableDevices();
    } else {
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
    // Cleanup audio element on component unmount or when audio selection changes
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src); // Revoke URL to prevent memory leaks
        audioRef.current = null;
      }
    };
  }, [selectedAudio]);


  // --- DATA FETCHING --- //

  const fetchDeviceStatus = async (serialNumber: string, deviceId: string) => {
    try {
      const response = await fetch(`/api/instant-announcement/get?serialNumber=${serialNumber}`);
      if (response.ok) {
        const data = await response.json();
        const isAnnouncing = data.announcements && data.announcements.length > 0;
        setDeviceStatus(prev => ({ ...prev, [deviceId]: isAnnouncing ? 'announcing' : 'idle' }));
      }
    } catch (error) {
      console.error(`Failed to fetch status for ${serialNumber}:`, error);
    }
  };

  const fetchAvailableDevices = async () => {
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
      const formattedAnnouncements = (data.announcements || data).map((item: any) => ({
        id: item._id,
        name: item.name,
        url: item.path,
        duration: item.duration,
        type: 'uploaded'
      }));
      setExistingAnnouncements(formattedAnnouncements);
    } catch (error) {
      toast.error("Failed to fetch existing announcements.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- AUDIO & TTS LOGIC --- //

  const createWavBlob = (pcmData: ArrayBuffer): Blob => {
        const sampleRate = 24000;
        const numChannels = 1;
        const bitsPerSample = 16;
        const bytesPerSample = bitsPerSample / 8;
        const blockAlign = numChannels * bytesPerSample;
        const byteRate = sampleRate * blockAlign;
        const dataSize = pcmData.byteLength;
        const fileSize = 44 + dataSize;
        const buffer = new ArrayBuffer(fileSize);
        const view = new DataView(buffer);
        const writeString = (offset: number, str: string) => {
            for (let i = 0; i < str.length; i++) {
                view.setUint8(offset + i, str.charCodeAt(i));
            }
        };
        writeString(0, 'RIFF');
        view.setUint32(4, fileSize - 8, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);
        writeString(36, 'data');
        view.setUint32(40, dataSize, true);
        const pcmView = new Uint8Array(pcmData);
        const wavView = new Uint8Array(buffer);
        wavView.set(pcmView, 44);
        return new Blob([buffer], { type: 'audio/wav' });
    };

    const handleGenerateTts = async () => {
        if (!ttsText.trim()) {
            toast.error("Please enter some text to generate audio.");
            return;
        }
        setIsGenerating(true);
        discardRecording(); // Clear any other selections

        try {
            const response = await fetch('/api/tts/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                      userId,
                    text: `(speak in ${selectedLanguage}) ${ttsText}`,
                    voice: selectedVoice,
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to generate TTS audio.');
            }

            const rawBlob = await response.blob();
            const arrayBuffer = await rawBlob.arrayBuffer();
            const wavBlob = createWavBlob(arrayBuffer);
            const url = URL.createObjectURL(wavBlob);

            setSelectedAudio({
                id: `tts-${Date.now()}`,
                name: `AI: ${ttsText.substring(0, 25)}...`,
                url,
                blob: wavBlob,
                type: 'tts',
            });
            toast.success("AI voice generated!");

        } catch (error) {
            console.error("TTS generation failed:", error);
            toast.error(error instanceof Error ? error.message : "An unknown error occurred.");
        } finally {
            setIsGenerating(false);
        }
    };


  const startRecording = async () => {
    try {
      discardRecording();
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
    if (selectedAudio?.url) {
        URL.revokeObjectURL(selectedAudio.url);
    }
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
        if(audioRef.current) audioRef.current.pause();
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

  const uploadAudioToLocal = async (audioBlob: Blob, fileName: string, userId: string, type: string) => {
    const formData = new FormData();
    formData.append("file", audioBlob, fileName);
    formData.append("userId", userId);
    formData.append("name", fileName);
    formData.append("type", type); // 'recorded' or 'tts'
  
    const res = await fetch("/api/instant-announcement/send", {
      method: "POST",
      body: formData,
    });
  
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || "Local upload failed");
    }
  
    const data = await res.json();
    return data.fileUrl; // The relative URL to the uploaded file
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
      // If audio is a new recording or TTS, upload it to local folder first
      if ((selectedAudio.type === 'recorded' || selectedAudio.type === 'tts') && selectedAudio.blob && userId) {
        const fileName = `${selectedAudio.name.replace(/ /g, '_')}.wav`;
        finalAudioUrl = await uploadAudioToLocal(selectedAudio.blob, fileName, userId, selectedAudio.type || 'recorded');
      }
  
      // Send the announcement via your backend
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
    discardRecording();
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
        <p className="text-sm text-gray-500 mt-1">Step 2 of 2: Choose or Create Audio</p>
      </div>

      <div className="bg-blue-50 p-3 rounded-lg mb-6 text-sm">
        Announcing to: <span className="font-semibold text-blue-800">{selectedDevice?.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
            <button onClick={() => setActiveTab('record')} className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${activeTab === 'record' ? 'bg-white shadow-sm text-red-600' : 'text-gray-600'}`}>
              <Mic size={18} /> Record
            </button>
             <button onClick={() => setActiveTab('tts')} className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${activeTab === 'tts' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-600'}`}>
              <Bot size={18} /> TextToSpeech
            </button>
            <button onClick={() => setActiveTab('select')} className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${activeTab === 'select' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600'}`}>
              <AudioLines size={18} /> Library
            </button>
          </div>
          {activeTab === 'record' && renderRecordTab()}
          {activeTab === 'tts' && renderTtsTab()}
          {activeTab === 'select' && renderSelectTab()}
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
                <button onClick={discardRecording} className="text-red-500 hover:text-red-700 p-1 rounded flex-shrink-0">
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
              <p className="text-xs mt-1">Record, generate, or select an audio file.</p>
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

  const renderTtsTab = () => (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-6 space-y-4">
        <div>
            <label htmlFor="tts-text" className="block text-sm font-medium mb-1 text-gray-700">Announcement Text</label>
            <textarea
                id="tts-text"
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                rows={4}
                placeholder="Enter text to convert to speech..."
                disabled={isGenerating}
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                 <label className="block text-sm font-medium mb-1 flex items-center gap-1 text-gray-700"><Languages size={14}/> Language</label>
                 <div className="relative">
                    <select
                        value={selectedLanguage}
                        onChange={e => setSelectedLanguage(e.target.value)}
                        disabled={isGenerating}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-purple-500"
                    >
                        {supportedLanguages.map(lang => (
                            <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                    </select>
                    <ChevronDown size={18} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                 </div>
            </div>
            <div>
                 <label className="block text-sm font-medium mb-1 flex items-center gap-1 text-gray-700"><Volume2 size={14}/> Voice</label>
                 <div className="relative">
                    <select
                        value={selectedVoice}
                        onChange={e => setSelectedVoice(e.target.value)}
                        disabled={isGenerating}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-purple-500"
                    >
                        {geminiVoices.map(voice => (
                            <option key={voice} value={voice}>{voice}</option>
                        ))}
                    </select>
                    <ChevronDown size={18} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
            </div>
        </div>
        <div className="text-center pt-2">
            <button
                onClick={handleGenerateTts}
                disabled={isGenerating || !ttsText.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto disabled:bg-gray-400"
            >
                {isGenerating ? (
                    <>
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                        Generating...
                    </>
                ) : (
                    <>
                        <Bot size={18} /> Generate Voice
                    </>
                )}
            </button>
        </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6">
        {step === 1 ? renderStep1() : renderStep2()}
      </div>

      <div className="p-4 border-t bg-gray-50 rounded-b-xl">
        <div className="flex justify-end gap-4">
          <button onClick={onCancel} disabled={isLoading || isGenerating} className="px-6 py-2 text-gray-700 hover:bg-gray-200 font-medium rounded-lg disabled:opacity-50">
            Cancel
          </button>
          {step === 2 && (
            <button
              onClick={handleSendAnnouncement}
              disabled={isLoading || isGenerating || !selectedAudio || !selectedDevice}
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