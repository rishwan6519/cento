import React, { useState, useRef, useEffect } from "react";
import { Upload, Mic, MicOff, Play, Pause, Trash2, Download, Volume2, AudioLines } from "lucide-react";

interface SelectedFile {
  id: string;
  name: string;
  type: 'recorded' | 'uploaded';
  file?: File;
  blob?: Blob;
  url?: string;
  duration?: number;
}

interface CreateAnnouncementProps {
  onCancel: () => void;
  onSuccess: () => void;
}

// Mock Cloudinary config - replace with your actual values
const CLOUDINARY_UPLOAD_PRESET = "announcement_upload_preset";
const CLOUDINARY_CLOUD_NAME = "dzb0gggua";

const CreateAnnouncement: React.FC<CreateAnnouncementProps> = ({ onCancel, onSuccess }) => {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'record'>('upload');
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingName, setRecordingName] = useState('');
  
  // Playback states
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<{ [key: string]: number }>({});
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  const generateUniqueId = () => Math.random().toString(36).substring(2, 11);

  // Recording functionality
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setRecordedBlob(blob);
      };
      
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      }
    }
  };

  const saveRecording = () => {
    if (recordedBlob && recordingName.trim()) {
      const file: SelectedFile = {
        id: generateUniqueId(),
        name: recordingName.trim(),
        type: 'recorded',
        blob: recordedBlob,
        url: URL.createObjectURL(recordedBlob),
        duration: recordingTime
      };
      
      setFiles(prev => [...prev, file]);
      
      // Reset recording state
      setRecordedBlob(null);
      setRecordingName('');
      setRecordingTime(0);
      setActiveTab('upload'); // Switch back to upload tab to show saved recording
    }
  };

  const discardRecording = () => {
    setRecordedBlob(null);
    setRecordingName('');
    setRecordingTime(0);
  };

  // File upload functionality
  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || [])
      .filter(file => file.type.startsWith('audio/'))
      .map((file) => ({
        id: generateUniqueId(),
        name: file.name.split('.').slice(0, -1).join('.'),
        type: 'uploaded' as const,
        file: file,
        url: URL.createObjectURL(file)
      }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files)
      .filter(file => file.type.startsWith('audio/'))
      .map((file) => ({
        id: generateUniqueId(),
        name: file.name.split('.').slice(0, -1).join('.'),
        type: 'uploaded' as const,
        file: file,
        url: URL.createObjectURL(file)
      }));
    setFiles((prev) => [...prev, ...droppedFiles]);
  };

  // Audio playback functionality
  const togglePlayback = (fileId: string, audioUrl: string) => {
    const audio = audioRefs.current[fileId];
    
    if (playingId === fileId && audio && !audio.paused) {
      audio.pause();
      setPlayingId(null);
    } else {
      // Stop any currently playing audio
      Object.values(audioRefs.current).forEach(a => a.pause());
      
      if (!audio) {
        const newAudio = new Audio(audioUrl);
        audioRefs.current[fileId] = newAudio;
        
        newAudio.addEventListener('timeupdate', () => {
          setCurrentTime(prev => ({
            ...prev,
            [fileId]: newAudio.currentTime
          }));
        });
        
        newAudio.addEventListener('ended', () => {
          setPlayingId(null);
        });
      }
      
      audioRefs.current[fileId].play();
      setPlayingId(fileId);
    }
  };

  const handleFileDelete = (id: string) => {
    // Stop audio if playing
    if (playingId === id) {
      audioRefs.current[id]?.pause();
      setPlayingId(null);
    }
    
    // Clean up audio reference
    if (audioRefs.current[id]) {
      delete audioRefs.current[id];
    }
    
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      alert("Please add at least one announcement");
      return;
    }

    const userId = localStorage.getItem("userId");
    if (!userId) {
      alert("User not authenticated");
      return;
    }

    setIsLoading(true);

    try {
      const uploadedItems = [];

      for (const fileObj of files) {
        let audioFile: File;
        
        if (fileObj.type === 'recorded' && fileObj.blob) {
          // Convert blob to file for recorded audio
          audioFile = new File([fileObj.blob], `${fileObj.name}.wav`, { type: 'audio/wav' });
        } else if (fileObj.file) {
          audioFile = fileObj.file;
        } else {
          continue;
        }

        // Upload to Cloudinary
        const formData = new FormData();
        formData.append("file", audioFile);
        formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        formData.append("resource_type", "video"); // Cloudinary uses 'video' for audio files

        const cloudRes = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`,
          {
            method: "POST",
            body: formData,
          }
        );

        const cloudData = await cloudRes.json();
        if (!cloudRes.ok) {
          throw new Error(cloudData.error?.message || "Upload failed");
        }

        // Save to database
        const metadataRes = await fetch("/api/announcement/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            name: fileObj.name,
            path: cloudData.secure_url,
            type: fileObj.type,
            voice: fileObj.type === 'recorded' ? 'user' : null
          }),
        });

        if (!metadataRes.ok) {
          const errorMeta = await metadataRes.json();
          throw new Error(errorMeta.message || "Failed to save announcement");
        }

        const saved = await metadataRes.json();
        uploadedItems.push(saved);
      }

      alert("Announcements created successfully!");
      setFiles([]);
      onSuccess();
    } catch (error) {
      console.error("Upload error:", error);
      alert(error instanceof Error ? error.message : "Failed to create announcements");
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, [audioStream]);

  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
    // Cleanup when unmounting or when isRecording changes
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    };
  }, [isRecording]);

  return (
    <div className="bg-white rounded-xl shadow-sm text-black">
      <div className="p-6 border-b">
        <h2 className="text-2xl font-bold">Create New Announcement</h2>
        <p className="text-gray-600 text-sm mt-1">Upload or record audio announcements</p>
      </div>

      <div className="p-6">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${
              activeTab === 'upload'
                ? 'bg-white shadow-sm text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Upload size={18} />
            Upload Audio
          </button>
          <button
            onClick={() => setActiveTab('record')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${
              activeTab === 'record'
                ? 'bg-white shadow-sm text-red-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Mic size={18} />
            Record Audio
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Upload or Record */}
          <div className="space-y-6">
            {activeTab === 'upload' ? (
              <>
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Volume2 size={20} />
                  Upload Audio Files
                </h3>
                <div
                  className={`border-2 border-dashed ${
                    isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
                  } rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer`}
                  onClick={() => document.getElementById("audio-upload")?.click()}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                >
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="h-8 w-8 text-blue-600" />
                  </div>
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    Drop audio files here or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports MP3, WAV, M4A, and other audio formats
                  </p>
                  <input
                    id="audio-upload"
                    type="file"
                    multiple
                    hidden
                    accept="audio/*"
                    onChange={handleFileSelection}
                  />
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Mic size={20} />
                  Record Audio Announcement
                </h3>
                
                <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-6 text-center">
                  {!isRecording && !recordedBlob ? (
                    <div className="space-y-4">
                      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                        <Mic className="h-10 w-10 text-red-600" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-gray-700 mb-2">
                          Ready to Record
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                          Click the button below to start recording your announcement
                        </p>
                        <button
                          onClick={startRecording}
                          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                        >
                          <Mic size={18} />
                          Start Recording
                        </button>
                      </div>
                    </div>
                  ) : isRecording ? (
                    <div className="space-y-4">
                      <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                        <MicOff className="h-10 w-10 text-white" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-red-600 mb-2">
                          Recording in Progress
                        </p>
                        <p className="text-2xl font-mono font-bold text-gray-700 mb-4">
                          {formatTime(recordingTime)}
                        </p>
                        <button
                          onClick={stopRecording}
                          className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                        >
                          <MicOff size={18} />
                          Stop Recording
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <Play className="h-10 w-10 text-green-600" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-green-600 mb-2">
                          Recording Complete!
                        </p>
                        <p className="text-sm text-gray-600 mb-4">
                          Duration: {formatTime(recordingTime)}
                        </p>
                        
                        {recordedBlob && (
                          <div className="mb-4">
                            <audio
                              src={URL.createObjectURL(recordedBlob)}
                              controls
                              className="w-full mb-4"
                            />
                          </div>
                        )}
                        
                        <div className="space-y-3">
                          <input
                            type="text"
                            placeholder="Enter announcement name"
                            value={recordingName}
                            onChange={(e) => setRecordingName(e.target.value)}
                            className="w-full p-3 border rounded-lg text-sm"
                          />
                          
                          <div className="flex gap-3 justify-center">
                            <button
                              onClick={discardRecording}
                              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                            >
                              Discard
                            </button>
                            <button
                              onClick={saveRecording}
                              disabled={!recordingName.trim()}
                              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium"
                            >
                              Save Recording
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right Panel - File Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <AudioLines size={18} />
              Announcement Preview ({files.length})
            </h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {files.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Volume2 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p>No announcements added yet</p>
                </div>
              ) : (
                files.map((file) => (
                  <div
                    key={file.id}
                    className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          file.type === 'recorded' ? 'bg-red-100' : 'bg-blue-100'
                        }`}>
                          {file.type === 'recorded' ? (
                            <Mic className={`h-4 w-4 ${file.type === 'recorded' ? 'text-red-600' : 'text-blue-600'}`} />
                          ) : (
                            <Upload className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500 capitalize">
                            {file.type} • {file.duration ? formatTime(file.duration) : 'Unknown duration'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleFileDelete(file.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => togglePlayback(file.id, file.url!)}
                        className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full transition-colors"
                      >
                        {playingId === file.id ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ 
                            width: audioRefs.current[file.id] 
                              ? `${(currentTime[file.id] || 0) / audioRefs.current[file.id].duration * 100}%`
                              : '0%'
                          }}
                        />
                      </div>
                      
                      <span className="text-xs text-gray-500 font-mono">
                        {formatTime(currentTime[file.id] || 0)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-6 border-t bg-gray-50">
        <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || files.length === 0}
            className={`px-6 py-2 rounded-lg font-medium ${
              isLoading || files.length === 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            } text-white`}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Creating Announcements...</span>
              </div>
            ) : (
              `Create ${files.length} Announcement${files.length !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateAnnouncement;