// import React, { useState, useRef, useEffect } from "react";
// import { Upload, Mic, MicOff, Play, Pause, Trash2, Download, Volume2, AudioLines } from "lucide-react";

// interface SelectedFile {
//   id: string;
//   name: string;
//   type: 'recorded' | 'uploaded';
//   file?: File;
//   blob?: Blob;
//   url?: string;
//   duration?: number;
// }

// interface CreateAnnouncementProps {
//   onCancel: () => void;
//   onSuccess: () => void;
// }

// // Mock Cloudinary config - replace with your actual values
// const CLOUDINARY_UPLOAD_PRESET = "announcement_upload_preset";
// const CLOUDINARY_CLOUD_NAME = "dzb0gggua";

// const CreateAnnouncement: React.FC<CreateAnnouncementProps> = ({ onCancel, onSuccess }) => {
//   const [files, setFiles] = useState<SelectedFile[]>([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [isDragging, setIsDragging] = useState(false);
//   const [activeTab, setActiveTab] = useState<'upload' | 'record'>('upload');
  
//   // Recording states
//   const [isRecording, setIsRecording] = useState(false);
//   const [recordingTime, setRecordingTime] = useState(0);
//   const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
//   const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
//   const [recordingName, setRecordingName] = useState('');
  
//   // Playback states
//   const [playingId, setPlayingId] = useState<string | null>(null);
//   const [currentTime, setCurrentTime] = useState<{ [key: string]: number }>({});
  
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//   const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
//   const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

//   const generateUniqueId = () => Math.random().toString(36).substring(2, 11);

//   // Recording functionality
//   const startRecording = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       setAudioStream(stream);
      
//       const mediaRecorder = new MediaRecorder(stream);
//       const chunks: BlobPart[] = [];
      
//       mediaRecorder.ondataavailable = (event) => {
//         if (event.data.size > 0) {
//           chunks.push(event.data);
//         }
//       };
      
//       mediaRecorder.onstop = () => {
//         const blob = new Blob(chunks, { type: 'audio/wav' });
//         setRecordedBlob(blob);
//       };
      
//       mediaRecorder.start();
//       mediaRecorderRef.current = mediaRecorder;
//       setIsRecording(true);
//       setRecordingTime(0);
      
//     } catch (error) {
//       console.error('Error accessing microphone:', error);
//       alert('Could not access microphone. Please check permissions.');
//     }
//   };

//   const stopRecording = () => {
//     if (mediaRecorderRef.current && isRecording) {
//       mediaRecorderRef.current.stop();
//       setIsRecording(false);
      
//       if (recordingIntervalRef.current) {
//         clearInterval(recordingIntervalRef.current);
//       }
      
//       if (audioStream) {
//         audioStream.getTracks().forEach(track => track.stop());
//         setAudioStream(null);
//       }
//     }
//   };

//   const saveRecording = () => {
//     if (recordedBlob && recordingName.trim()) {
//       const file: SelectedFile = {
//         id: generateUniqueId(),
//         name: recordingName.trim(),
//         type: 'recorded',
//         blob: recordedBlob,
//         url: URL.createObjectURL(recordedBlob),
//         duration: recordingTime
//       };
      
//       setFiles(prev => [...prev, file]);
      
//       // Reset recording state
//       setRecordedBlob(null);
//       setRecordingName('');
//       setRecordingTime(0);
//       setActiveTab('upload'); // Switch back to upload tab to show saved recording
//     }
//   };

//   const discardRecording = () => {
//     setRecordedBlob(null);
//     setRecordingName('');
//     setRecordingTime(0);
//   };

//   // File upload functionality
//   const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const newFiles = Array.from(e.target.files || [])
//       .filter(file => file.type.startsWith('audio/'))
//       .map((file) => ({
//         id: generateUniqueId(),
//         name: file.name.split('.').slice(0, -1).join('.'),
//         type: 'uploaded' as const,
//         file: file,
//         url: URL.createObjectURL(file)
//       }));
//     setFiles((prev) => [...prev, ...newFiles]);
//   };

//   const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
//     e.preventDefault();
//     setIsDragging(true);
//   };

//   const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
//     e.preventDefault();
//     setIsDragging(false);
//   };

//   const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
//     e.preventDefault();
//     setIsDragging(false);
//     const droppedFiles = Array.from(e.dataTransfer.files)
//       .filter(file => file.type.startsWith('audio/'))
//       .map((file) => ({
//         id: generateUniqueId(),
//         name: file.name.split('.').slice(0, -1).join('.'),
//         type: 'uploaded' as const,
//         file: file,
//         url: URL.createObjectURL(file)
//       }));
//     setFiles((prev) => [...prev, ...droppedFiles]);
//   };

//   // Audio playback functionality
//   const togglePlayback = (fileId: string, audioUrl: string) => {
//     const audio = audioRefs.current[fileId];
    
//     if (playingId === fileId && audio && !audio.paused) {
//       audio.pause();
//       setPlayingId(null);
//     } else {
//       // Stop any currently playing audio
//       Object.values(audioRefs.current).forEach(a => a.pause());
      
//       if (!audio) {
//         const newAudio = new Audio(audioUrl);
//         audioRefs.current[fileId] = newAudio;
        
//         newAudio.addEventListener('timeupdate', () => {
//           setCurrentTime(prev => ({
//             ...prev,
//             [fileId]: newAudio.currentTime
//           }));
//         });
        
//         newAudio.addEventListener('ended', () => {
//           setPlayingId(null);
//         });
//       }
      
//       audioRefs.current[fileId].play();
//       setPlayingId(fileId);
//     }
//   };

//   const handleFileDelete = (id: string) => {
//     // Stop audio if playing
//     if (playingId === id) {
//       audioRefs.current[id]?.pause();
//       setPlayingId(null);
//     }
    
//     // Clean up audio reference
//     if (audioRefs.current[id]) {
//       delete audioRefs.current[id];
//     }
    
//     setFiles((prev) => prev.filter((file) => file.id !== id));
//   };

//   const formatTime = (seconds: number) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = Math.floor(seconds % 60);
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   const handleSubmit = async () => {
//     if (files.length === 0) {
//       alert("Please add at least one announcement");
//       return;
//     }

//     const userId = localStorage.getItem("userId");
//     if (!userId) {
//       alert("User not authenticated");
//       return;
//     }

//     setIsLoading(true);

//     try {
//       const uploadedItems = [];

//       for (const fileObj of files) {
//         let audioFile: File;

//         if (fileObj.type === 'recorded' && fileObj.blob) {
//           audioFile = new File([fileObj.blob], `${fileObj.name}.wav`, { type: 'audio/wav' });
//         } else if (fileObj.file) {
//           audioFile = fileObj.file;
//         } else {
//           continue;
//         }

//         // Upload to local server
//         const formData = new FormData();
//         formData.append("file", audioFile);
//         formData.append("userId", userId);
//         formData.append("name", fileObj.name);
//         formData.append("type", fileObj.type);

//         const uploadRes = await fetch("/api/announcement/upload", {
//           method: "POST",
//           body: formData,
//         });

//         const uploadData = await uploadRes.json();
//         if (!uploadRes.ok) {
//           throw new Error(uploadData.message || "Local upload failed");
//         }

//         uploadedItems.push(uploadData);
//       }

//       alert("Announcements created successfully!");
//       setFiles([]);
//       onSuccess();
//     } catch (error) {
//       console.error("Upload error:", error);
//       alert(error instanceof Error ? error.message : "Failed to create announcements");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Cleanup on unmount
//   useEffect(() => {
//     return () => {
//       if (recordingIntervalRef.current) {
//         clearInterval(recordingIntervalRef.current);
//       }
//       if (audioStream) {
//         audioStream.getTracks().forEach(track => track.stop());
//       }
//       Object.values(audioRefs.current).forEach(audio => {
//         audio.pause();
//         audio.src = '';
//       });
//     };
//   }, [audioStream]);

//   useEffect(() => {
//     if (isRecording) {
//       recordingIntervalRef.current = setInterval(() => {
//         setRecordingTime(prev => prev + 1);
//       }, 1000);
//     } else {
//       if (recordingIntervalRef.current) {
//         clearInterval(recordingIntervalRef.current);
//         recordingIntervalRef.current = null;
//       }
//     }
//     // Cleanup when unmounting or when isRecording changes
//     return () => {
//       if (recordingIntervalRef.current) {
//         clearInterval(recordingIntervalRef.current);
//         recordingIntervalRef.current = null;
//       }
//     };
//   }, [isRecording]);

//   return (
//     <div className="bg-white rounded-xl shadow-sm text-black">
//       <div className="p-6 border-b">
//         <h2 className="text-2xl font-bold">Create New Announcement</h2>
//         <p className="text-gray-600 text-sm mt-1">Upload or record audio announcements</p>
//       </div>

//       <div className="p-6">
//         {/* Tab Navigation */}
//         <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
//           <button
//             onClick={() => setActiveTab('upload')}
//             className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${
//               activeTab === 'upload'
//                 ? 'bg-white shadow-sm text-blue-600'
//                 : 'text-gray-600 hover:text-gray-900'
//             }`}
//           >
//             <Upload size={18} />
//             Upload Audio
//           </button>
//           <button
//             onClick={() => setActiveTab('record')}
//             className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${
//               activeTab === 'record'
//                 ? 'bg-white shadow-sm text-red-600'
//                 : 'text-gray-600 hover:text-gray-900'
//             }`}
//           >
//             <Mic size={18} />
//             Record Audio
//           </button>
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//           {/* Left Panel - Upload or Record */}
//           <div className="space-y-6">
//             {activeTab === 'upload' ? (
//               <>
//                 <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
//                   <Volume2 size={20} />
//                   Upload Audio Files
//                 </h3>
//                 <div
//                   className={`border-2 border-dashed ${
//                     isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
//                   } rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer`}
//                   onClick={() => document.getElementById("audio-upload")?.click()}
//                   onDragEnter={handleDragEnter}
//                   onDragLeave={handleDragLeave}
//                   onDragOver={(e) => e.preventDefault()}
//                   onDrop={handleDrop}
//                 >
//                   <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
//                     <Upload className="h-8 w-8 text-blue-600" />
//                   </div>
//                   <p className="text-lg font-medium text-gray-700 mb-2">
//                     Drop audio files here or click to browse
//                   </p>
//                   <p className="text-sm text-gray-500">
//                     Supports MP3, WAV, M4A, and other audio formats
//                   </p>
//                   <input
//                     id="audio-upload"
//                     type="file"
//                     multiple
//                     hidden
//                     accept="audio/*"
//                     onChange={handleFileSelection}
//                   />
//                 </div>
//               </>
//             ) : (
//               <>
//                 <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
//                   <Mic size={20} />
//                   Record Audio Announcement
//                 </h3>
                
//                 <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-6 text-center">
//                   {!isRecording && !recordedBlob ? (
//                     <div className="space-y-4">
//                       <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
//                         <Mic className="h-10 w-10 text-red-600" />
//                       </div>
//                       <div>
//                         <p className="text-lg font-medium text-gray-700 mb-2">
//                           Ready to Record
//                         </p>
//                         <p className="text-sm text-gray-500 mb-4">
//                           Click the button below to start recording your announcement
//                         </p>
//                         <button
//                           onClick={startRecording}
//                           className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
//                         >
//                           <Mic size={18} />
//                           Start Recording
//                         </button>
//                       </div>
//                     </div>
//                   ) : isRecording ? (
//                     <div className="space-y-4">
//                       <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
//                         <MicOff className="h-10 w-10 text-white" />
//                       </div>
//                       <div>
//                         <p className="text-lg font-medium text-red-600 mb-2">
//                           Recording in Progress
//                         </p>
//                         <p className="text-2xl font-mono font-bold text-gray-700 mb-4">
//                           {formatTime(recordingTime)}
//                         </p>
//                         <button
//                           onClick={stopRecording}
//                           className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
//                         >
//                           <MicOff size={18} />
//                           Stop Recording
//                         </button>
//                       </div>
//                     </div>
//                   ) : (
//                     <div className="space-y-4">
//                       <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
//                         <Play className="h-10 w-10 text-green-600" />
//                       </div>
//                       <div>
//                         <p className="text-lg font-medium text-green-600 mb-2">
//                           Recording Complete!
//                         </p>
//                         <p className="text-sm text-gray-600 mb-4">
//                           Duration: {formatTime(recordingTime)}
//                         </p>
                        
//                         {recordedBlob && (
//                           <div className="mb-4">
//                             <audio
//                               src={URL.createObjectURL(recordedBlob)}
//                               controls
//                               className="w-full mb-4"
//                             />
//                           </div>
//                         )}
                        
//                         <div className="space-y-3">
//                           <input
//                             type="text"
//                             placeholder="Enter announcement name"
//                             value={recordingName}
//                             onChange={(e) => setRecordingName(e.target.value)}
//                             className="w-full p-3 border rounded-lg text-sm"
//                           />
                          
//                           <div className="flex gap-3 justify-center">
//                             <button
//                               onClick={discardRecording}
//                               className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
//                             >
//                               Discard
//                             </button>
//                             <button
//                               onClick={saveRecording}
//                               disabled={!recordingName.trim()}
//                               className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium"
//                             >
//                               Save Recording
//                             </button>
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               </>
//             )}
//           </div>

//           {/* Right Panel - File Preview */}
//           <div className="bg-gray-50 rounded-lg p-4">
//             <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
//               <AudioLines size={18} />
//               Announcement Preview ({files.length})
//             </h3>
//             <div className="space-y-3 max-h-[500px] overflow-y-auto">
//               {files.length === 0 ? (
//                 <div className="text-center py-8 text-gray-500">
//                   <Volume2 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
//                   <p>No announcements added yet</p>
//                 </div>
//               ) : (
//                 files.map((file) => (
//                   <div
//                     key={file.id}
//                     className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
//                   >
//                     <div className="flex items-center justify-between mb-3">
//                       <div className="flex items-center gap-3">
//                         <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
//                           file.type === 'recorded' ? 'bg-red-100' : 'bg-blue-100'
//                         }`}>
//                           {file.type === 'recorded' ? (
//                             <Mic className={`h-4 w-4 ${file.type === 'recorded' ? 'text-red-600' : 'text-blue-600'}`} />
//                           ) : (
//                             <Upload className="h-4 w-4 text-blue-600" />
//                           )}
//                         </div>
//                         <div>
//                           <p className="font-medium text-sm text-gray-900">{file.name}</p>
//                           <p className="text-xs text-gray-500 capitalize">
//                             {file.type} • {file.duration ? formatTime(file.duration) : 'Unknown duration'}
//                           </p>
//                         </div>
//                       </div>
//                       <button
//                         onClick={() => handleFileDelete(file.id)}
//                         className="text-red-500 hover:text-red-700 p-1 rounded"
//                       >
//                         <Trash2 size={16} />
//                       </button>
//                     </div>
                    
//                     <div className="flex items-center gap-3">
//                       <button
//                         onClick={() => togglePlayback(file.id, file.url!)}
//                         className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full transition-colors"
//                       >
//                         {playingId === file.id ? <Pause size={16} /> : <Play size={16} />}
//                       </button>
                      
//                       <div className="flex-1 bg-gray-200 rounded-full h-2">
//                         <div 
//                           className="bg-blue-500 h-2 rounded-full transition-all"
//                           style={{ 
//                             width: audioRefs.current[file.id] 
//                               ? `${(currentTime[file.id] || 0) / audioRefs.current[file.id].duration * 100}%`
//                               : '0%'
//                           }}
//                         />
//                       </div>
                      
//                       <span className="text-xs text-gray-500 font-mono">
//                         {formatTime(currentTime[file.id] || 0)}
//                       </span>
//                     </div>
//                   </div>
//                 ))
//               )}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Action Buttons */}
//       <div className="p-6 border-t bg-gray-50">
//         <div className="flex justify-end gap-4">
//           <button
//             onClick={onCancel}
//             disabled={isLoading}
//             className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={handleSubmit}
//             disabled={isLoading || files.length === 0}
//             className={`px-6 py-2 rounded-lg font-medium ${
//               isLoading || files.length === 0
//                 ? "bg-gray-400 cursor-not-allowed"
//                 : "bg-blue-600 hover:bg-blue-700"
//             } text-white`}
//           >
//             {isLoading ? (
//               <div className="flex items-center gap-2">
//                 <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
//                 <span>Creating Announcements...</span>
//               </div>
//             ) : (
//               `Create ${files.length} Announcement${files.length !== 1 ? 's' : ''}`
//             )}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CreateAnnouncement;




"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, Mic, Play, Pause, Trash2, Volume2, Bot, Languages, ChevronDown } from "lucide-react";
import toast from "react-hot-toast"; // Assuming you have react-hot-toast installed for notifications

interface SelectedFile {
  id: string;
  name: string;
  type: 'recorded' | 'uploaded' | 'tts';
  file?: File;
  blob?: Blob;
  url?: string;
  duration?: number;
  status: "uploading" | "completed" | "failed";
}

interface CreateAnnouncementProps {
  onCancel: () => void;
  onSuccess: () => void;
}

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

const CreateAnnouncement: React.FC<CreateAnnouncementProps> = ({ onCancel, onSuccess }) => {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'record' | 'tts'>('upload');
  const [userId, setUserId] = useState<string | null>(null);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  
  // TTS states
  const [ttsText, setTtsText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [selectedVoice, setSelectedVoice] = useState('Puck');
  const [isGeneratingTts, setIsGeneratingTts] = useState(false);
  
  // Playback states
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<{ [key: string]: number }>({});
  const [audioDurations, setAudioDurations] = useState<{ [key: string]: number }>({}); // To store actual durations

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  const generateUniqueId = () => Math.random().toString(36).substring(2, 11);

  // --- Effects --- //

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      toast.error("User not authenticated. Please log in.");
      onCancel(); // Or redirect to login
    }

    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause();
        audio.src = ''; // Clear source
      });
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      recordingIntervalRef.current = interval;
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording]);

  // --- Recording functionality --- //

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
        const url = URL.createObjectURL(blob);
        
        const file: SelectedFile = {
          id: generateUniqueId(),
          name: `Recording ${new Date().toLocaleTimeString()}`,
          type: 'recorded',
          blob: blob,
          url: url,
          duration: recordingTime, // Set duration from recording time
          status: "completed" // Start as completed after recording
        };
        setFiles(prev => [...prev, file]);
        toast.success("Recording added!");
      };
      
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);
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
      
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
      }
    }
  };

  // --- File upload functionality --- //

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || [])
      .filter(file => file.type.startsWith('audio/'))
      .map((file) => ({
        id: generateUniqueId(),
        name: file.name.split('.').slice(0, -1).join('.'),
        type: 'uploaded' as const,
        file: file,
        url: URL.createObjectURL(file),
        status: "completed" as const // Assuming local files are "completed" on selection
      }));
    
    // Load durations for uploaded files
    newFiles.forEach(file => {
        const audio = new Audio(file.url);
        audio.onloadedmetadata = () => {
            setFiles(prev => prev.map(f => f.id === file.id ? { ...f, duration: audio.duration } : f));
            setAudioDurations(prev => ({...prev, [file.id]: audio.duration}));
        };
    });

    setFiles((prev) => [...prev, ...newFiles]);
    toast.success(`${newFiles.length} audio file(s) added!`);
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
        url: URL.createObjectURL(file),
        status: "completed" as const
      }));
    
    droppedFiles.forEach(file => {
        const audio = new Audio(file.url);
        audio.onloadedmetadata = () => {
            setFiles(prev => prev.map(f => f.id === file.id ? { ...f, duration: audio.duration } : f));
            setAudioDurations(prev => ({...prev, [file.id]: audio.duration}));
        };
    });

    setFiles((prev) => [...prev, ...droppedFiles]);
    toast.success(`${droppedFiles.length} audio file(s) added!`);
  };

  // --- TTS functionality --- //

  // Helper function to create a WAV blob from a raw PCM ArrayBuffer (mock for actual TTS API output)
  const createWavBlob = (pcmData: ArrayBuffer): Blob => {
    const sampleRate = 24000; // Common sample rate for TTS
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
    view.setUint16(20, 1, true); // PCM format
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

  const handleTTSGenerate = async () => {
    if (!ttsText.trim()) {
      toast.error('Please enter text to convert to speech.');
      return;
    }
    if (!userId) {
        toast.error("User not authenticated.");
        return;
    }

    setIsGeneratingTts(true);
    const fileId = generateUniqueId();
    const fileName = `AI: ${ttsText.substring(0, 25)}${ttsText.length > 25 ? '...' : ''}`;

    // Add a placeholder file immediately
    setFiles(prev => [...prev, {
      id: fileId,
      name: fileName,
      type: 'tts',
      status: "uploading", // Indicate it's being generated
    }]);
    
    try {
      // Simulate TTS API call - Replace with actual TTS API integration
      const response = await fetch('/api/tts/generate-tts', { // Your actual TTS API endpoint
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              userId, // Pass userId for context/billing if needed by your API
              text: `(speak in ${selectedLanguage}) ${ttsText}`, // Include language hint for API
              voice: selectedVoice,
          }),
      });

      if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Failed to generate TTS audio.');
      }

      const rawBlob = await response.blob(); // Assuming API returns raw audio or a simple blob
      const arrayBuffer = await rawBlob.arrayBuffer();
      const wavBlob = createWavBlob(arrayBuffer); // Convert to WAV if API doesn't
      const audioUrl = URL.createObjectURL(wavBlob);
      
      const audio = new Audio(audioUrl);
      audio.onloadedmetadata = () => {
        const duration = audio.duration;
        setFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, status: "completed" as const, blob: wavBlob, url: audioUrl, duration: duration } 
            : f
        ));
        setAudioDurations(prev => ({...prev, [fileId]: duration}));
        toast.success("AI voice generated and added!");
        setTtsText(''); // Clear TTS text after successful generation
      };
      
    } catch (error) {
      console.error('TTS generation failed:', error);
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: "failed" as const } : f
      ));
      toast.error(error instanceof Error ? error.message : 'Failed to generate speech. Please try again.');
    } finally {
      setIsGeneratingTts(false);
    }
  };

  // --- Playback functionality --- //

  const togglePlayback = (fileId: string, audioUrl?: string) => {
    if (!audioUrl) return;
    
    // Pause any currently playing audio
    Object.values(audioRefs.current).forEach(a => {
      if (a.id !== fileId && !a.paused) {
        a.pause();
      }
    });
    
    const audio = audioRefs.current[fileId];
    
    if (playingId === fileId && audio && !audio.paused) {
      audio.pause();
      setPlayingId(null);
    } else {
      if (!audio) {
        const newAudio = new Audio(audioUrl);
        newAudio.id = fileId; // Assign ID to the audio element for lookup
        audioRefs.current[fileId] = newAudio;
        
        newAudio.addEventListener('timeupdate', () => {
          setCurrentTime(prev => ({
            ...prev,
            [fileId]: newAudio.currentTime
          }));
        });
        
        newAudio.addEventListener('ended', () => {
          setPlayingId(null);
          setCurrentTime(prev => ({ ...prev, [fileId]: 0 })); // Reset current time
        });

        // Get duration once loaded
        newAudio.onloadedmetadata = () => {
            setAudioDurations(prev => ({ ...prev, [fileId]: newAudio.duration }));
        };
      }
      
      audioRefs.current[fileId].play();
      setPlayingId(fileId);
    }
  };

  // --- File management --- //

  const handleFileDelete = (id: string) => {
    if (playingId === id) {
      audioRefs.current[id]?.pause();
      setPlayingId(null);
    }
    
    if (audioRefs.current[id]) {
      URL.revokeObjectURL(audioRefs.current[id].src); // Release memory for URL.createObjectURL
      delete audioRefs.current[id];
    }
    
    setFiles((prev) => prev.filter((file) => file.id !== id));
    setAudioDurations(prev => {
        const newDurations = { ...prev };
        delete newDurations[id];
        return newDurations;
    });
    setCurrentTime(prev => {
        const newTimes = { ...prev };
        delete newTimes[id];
        return newTimes;
    });
    toast.success("Announcement removed!");
  };

  // --- Submission logic --- //

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error("Please add at least one announcement.");
      return;
    }
    if (!userId) {
      toast.error("User not authenticated.");
      return;
    }

    setIsLoading(true);

    try {
      for (const fileObj of files) {
        // Only process files that are completed and not yet uploaded (or if you want to re-upload)
        // For this component, we'll mark them as 'uploading' to the backend
        setFiles((prev) => prev.map((f) => (f.id === fileObj.id ? { ...f, status: "uploading" } : f)));

        let audioFileToUpload: File | undefined;
        if (fileObj.type === 'recorded' && fileObj.blob) {
          audioFileToUpload = new File([fileObj.blob], `${fileObj.name}.wav`, { type: 'audio/wav' });
        } else if (fileObj.type === 'tts' && fileObj.blob) {
            audioFileToUpload = new File([fileObj.blob], `${fileObj.name}.wav`, { type: 'audio/wav' });
        }
        else if (fileObj.type === 'uploaded' && fileObj.file) {
          audioFileToUpload = fileObj.file;
        }

        if (audioFileToUpload) {
          const formData = new FormData();
          formData.append("file", audioFileToUpload);
          formData.append("userId", userId);
          formData.append("name", fileObj.name);
          formData.append("type", fileObj.type || 'unknown'); // Ensure type is sent
          formData.append("duration", fileObj.duration ? fileObj.duration.toString() : '0');


          const uploadRes = await fetch("/api/announcement/upload", { // Your backend upload endpoint
            method: "POST",
            body: formData,
          });

          if (uploadRes.ok) {
            setFiles((prev) => prev.map((f) => (f.id === fileObj.id ? { ...f, status: "completed" } : f)));
          } else {
            const errorData = await uploadRes.json();
            throw new Error(errorData.message || `Failed to upload ${fileObj.name}`);
          }
        } else {
            // Handle cases where a file might be incomplete or not ready for upload
            console.warn(`File ${fileObj.name} (id: ${fileObj.id}) is not ready for upload.`);
            setFiles((prev) => prev.map((f) => (f.id === fileObj.id ? { ...f, status: "failed" } : f)));
        }
      }

      toast.success("Announcements created successfully!");
      setFiles([]);
      onSuccess();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create announcements.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Helpers --- //

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const charCount = ttsText.length;
  const recommendedMax = 200; // Example word count, often char count is more direct for TTS

  return (
    <div className="bg-[#E8F6F8] min-h-screen flex justify-center items-center p-6">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-6xl p-8">
        <h2 className="text-xl font-semibold mb-6">Let's create new announcement</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Upload Media */}
          <div>
            <h3 className="text-base font-semibold mb-4">Upload Media</h3>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'upload'
                    ? 'bg-white text-gray-800 border border-gray-300'
                    : 'bg-transparent text-gray-600 hover:bg-gray-50'
                }`}
              >
                Upload audio
              </button>
              <button
                onClick={() => setActiveTab('record')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'record'
                    ? 'bg-[#0A4A5C] text-white'
                    : 'bg-transparent text-gray-600 hover:bg-gray-50'
                }`}
              >
                Record audio
              </button>
              <button
                onClick={() => setActiveTab('tts')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'tts'
                    ? 'bg-[#0A4A5C] text-white'
                    : 'bg-transparent text-gray-600 hover:bg-gray-50'
                }`}
              >
                Text to speech
              </button>
            </div>

            {/* Content Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 min-h-[320px] flex flex-col items-center justify-center">
              {activeTab === 'upload' && (
                <div
                  className="w-full h-full flex flex-col items-center justify-center cursor-pointer"
                  onClick={() => document.getElementById("audio-upload")?.click()}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                >
                  <Upload className="h-12 w-12 text-orange-500 mb-4" />
                  <p className="text-gray-600 text-sm font-medium">
                    Click to upload or drag & drop it here
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Supports mp3, wav, mp4, and other audio formats
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
              )}

              {activeTab === 'record' && (
                <div className="w-full text-center">
                  {!isRecording ? (
                    <>
                      <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mic className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-gray-800 font-medium mb-2">Ready to record</p>
                      <p className="text-gray-500 text-sm mb-6">
                        Click the button below to start recording your announcement
                      </p>
                      <button
                        onClick={startRecording}
                        className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                      >
                        Start recording
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <div className="w-4 h-4 bg-white rounded-full"></div>
                      </div>
                      <p className="text-gray-800 font-medium mb-2">Recording...</p>
                      <p className="text-3xl font-mono font-bold text-gray-800 mb-6">
                        {formatTime(recordingTime)}
                      </p>
                      <button
                        onClick={stopRecording}
                        className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                      >
                        Stop recording
                      </button>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'tts' && (
                <div className="w-full space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Announcement text
                    </label>
                    <textarea
                      placeholder="Welcome to our store! Today we have amazing deals on all products."
                      value={ttsText}
                      onChange={(e) => setTtsText(e.target.value)}
                      className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                      disabled={isGeneratingTts}
                    />
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-500">{charCount} characters</span>
                      {/* You might want to adjust this based on actual TTS service limits/recommendations */}
                      <span className="text-xs text-gray-400">Recommended 50-200 words</span> 
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1 text-gray-700">
                        <Languages size={14}/> Language & Accent
                      </label>
                      <div className="relative">
                        <select
                          value={selectedLanguage}
                          onChange={(e) => setSelectedLanguage(e.target.value)}
                          className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm appearance-none bg-white"
                          disabled={isGeneratingTts}
                        >
                            {supportedLanguages.map(lang => (
                                <option key={lang.code} value={lang.code}>{lang.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 flex items-center gap-1 text-gray-700">
                        <Bot size={14}/> Voice character
                      </label>
                      <div className="relative">
                        <select
                          value={selectedVoice}
                          onChange={(e) => setSelectedVoice(e.target.value)}
                          className="w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm appearance-none bg-white"
                          disabled={isGeneratingTts}
                        >
                            {geminiVoices.map(voice => (
                                <option key={voice} value={voice}>{voice}</option>
                            ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleTTSGenerate}
                    disabled={isGeneratingTts || !ttsText.trim()}
                    className="w-full py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isGeneratingTts ? (
                        <>
                            <div className="animate-spin h-4 w-4 border-2 border-gray-700 border-t-transparent rounded-full" />
                            <span>Generating...</span>
                        </>
                    ) : (
                        <span>Generate & preview</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Media Preview */}
          <div>
            <h3 className="text-base font-semibold mb-4">Your announcements</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2"> {/* Added pr-2 for scrollbar spacing */}
              {files.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Volume2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No files selected yet</p>
                </div>
              ) : (
                files.map((file) => (
                  <div key={file.id} className="bg-[#E8F8FB] rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <p className="text-sm font-medium text-gray-800 truncate pr-2">{file.name}</p>
                      <button
                        onClick={() => handleFileDelete(file.id)}
                        className="text-orange-500 hover:text-orange-600 flex-shrink-0"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 mb-2">
                      <button
                        onClick={() => togglePlayback(file.id, file.url)}
                        disabled={!file.url || file.status === "uploading"} // Disable play while generating/uploading
                        className="p-2 bg-white rounded-full hover:bg-gray-100 disabled:opacity-50"
                      >
                        {playingId === file.id ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      
                      <span className="text-xs text-gray-600 font-mono flex-shrink-0">
                        {formatTime(currentTime[file.id] || 0)}/{audioDurations[file.id] ? formatTime(audioDurations[file.id]) : '0:00'}
                      </span>
                      
                      <div className="flex-1 bg-gray-300 rounded-full h-1.5">
                        <div 
                          className="bg-orange-500 h-1.5 rounded-full transition-all"
                          style={{ 
                            width: file.url && audioDurations[file.id]
                              ? `${((currentTime[file.id] || 0) / audioDurations[file.id]) * 100}%`
                              : '0%'
                          }}
                        />
                      </div>

                      <button className="p-1.5 hover:bg-gray-200 rounded flex-shrink-0" title="Volume">
                        <Volume2 size={16} className="text-gray-600" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      {file.status === "uploading" && (
                        <>
                          <div className="animate-spin h-3 w-3 border-2 border-orange-500 border-t-transparent rounded-full"></div>
                          <span className="text-xs text-orange-600">
                            {file.type === 'tts' && isGeneratingTts ? 'Generating AI voice' : 'Uploading'}
                          </span>
                        </>
                      )}
                      {file.status === "completed" && (
                        <>
                          <svg className="h-3 w-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="text-xs text-green-600">Upload completed</span>
                        </>
                      )}
                                             {file.status === "failed" && (
                        <>
                          <svg
                            className="h-3 w-3 text-red-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-11.25a.75.75 0 011.5 0v5a.75.75 0 01-1.5 0v-5zm.75 8a1 1 0 100-2 1 1 0 000 2z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-xs text-red-600">
                            Failed to upload
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={onCancel}
            disabled={isLoading || isGeneratingTts}
            className="px-8 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || files.length === 0 || isGeneratingTts}
            className={`px-8 py-2.5 rounded-lg font-medium text-white ${
              isLoading || files.length === 0 || isGeneratingTts
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#0A4A5C] hover:bg-[#083945]"
            }`}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                <span>Creating...</span>
              </div>
            ) : (
              "Create Announcement"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateAnnouncement;
