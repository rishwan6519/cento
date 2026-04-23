import os

code = """\
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Upload, Mic, MicOff, Volume2, Play, Pause, Trash2, ShieldAlert, Bot, Languages, ChevronDown, Store, AlertTriangle, CheckCircle2, Music } from "lucide-react";
import toast from "react-hot-toast";

interface DeviceItem {
  _id: string;
  name: string;
  serialNumber?: string;
  status?: string;
}

interface MediaItem {
  _id: string;
  name: string;
  type: string;
  url?: string;
  duration?: string;
}

interface SelectedFile {
  id: string;
  name: string;
  type: 'recorded' | 'uploaded' | 'tts' | 'library';
  blob?: Blob;
  url?: string;
}

interface CreateAnnouncementViewProps {
  onNavigate?: (view: any) => void;
}

const geminiVoices = ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda', 'Orus'];
const supportedLanguages = [{ code: 'en-US', name: 'English (US)' }, { code: 'en-GB', name: 'English (UK)' }];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CreateAnnouncementView: React.FC<CreateAnnouncementViewProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'record' | 'tts' | 'library'>('upload');
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Audio Building States
  const [selectedAudio, setSelectedAudio] = useState<SelectedFile | null>(null);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // TTS
  const [ttsText, setTtsText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [selectedVoice, setSelectedVoice] = useState('Puck');
  const [isGeneratingTts, setIsGeneratingTts] = useState(false);

  // Library
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(true);

  // Playlist Config
  const [playlistName, setPlaylistName] = useState('');
  const [playlistType, setPlaylistType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);
  const [globalMinVolume, setGlobalMinVolume] = useState(30);
  const [globalMaxVolume, setGlobalMaxVolume] = useState(80);

  // Devices
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);

  useEffect(() => {
    const id = localStorage.getItem("userId");
    if (id) {
      setUserId(id);
      fetchDevices(id);
      fetchMedia(id);
    }
  }, []);

  const fetchDevices = (id: string) => {
    fetch(`/api/assign-device?userId=${id}`)
      .then(r => r.json())
      .then(d => {
        const assignments = d.data || [];
        setDevices(assignments.map((a: any) => ({
          _id: a.deviceId?._id || a._id,
          name: a.deviceId?.name || "Unknown Device",
          serialNumber: a.deviceId?.serialNumber || "N/A",
          status: a.deviceId?.status || "inactive"
        })));
      });
  };

  const fetchMedia = (id: string) => {
    setLoadingMedia(true);
    fetch(`/api/media?userId=${id}`)
      .then(r => r.json())
      .then(d => setMediaItems(d.media || d.mediaFiles || d.data || []))
      .finally(() => setLoadingMedia(false));
  };

  const timeFormat = (sec: number) => `${Math.floor(sec/60)}:${Math.floor(sec%60).toString().padStart(2,'0')}`;

  const toggleDay = (d: string) => {
    setDaysOfWeek(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedAudio({
        id: Math.random().toString(),
        name: file.name,
        type: 'uploaded',
        blob: file,
        url: URL.createObjectURL(file)
      });
      toast.success("File ready to upload!");
    }
  };

  // Record Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setSelectedAudio({
          id: Math.random().toString(),
          name: `Recording-${new Date().toLocaleTimeString()}.wav`,
          type: 'recorded',
          blob,
          url: URL.createObjectURL(blob)
        });
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (err) { toast.error("Microphone access denied"); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    setIsRecording(false);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
  };

  // TTS Logic
  const handleGenerateTts = async () => {
    if (!ttsText) { toast.error("Enter text"); return; }
    setIsGeneratingTts(true);
    try {
      const res = await fetch('/api/tts/generate-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, text: ttsText, voice: selectedVoice })
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      setSelectedAudio({
        id: Math.random().toString(),
        name: `TTS-${ttsText.substring(0,10)}...`,
        type: 'tts',
        blob,
        url: URL.createObjectURL(blob)
      });
      toast.success("TTS Ready!");
    } catch (err) {
      toast.error("Generation failed");
    } finally {
      setIsGeneratingTts(false);
    }
  };

  const uploadMediaFirst = async (): Promise<string | undefined> => {
      if (!selectedAudio) return undefined;
      if (selectedAudio.type === 'library' && selectedAudio.url) {
         // It's already in the DB, just return its ID (store it in name/url temporarily or map it)
         // For now, if we selected from library, our selectedAudio.id IS the MongoDB _id !
         return selectedAudio.id; 
      }

      if (!selectedAudio.blob) return undefined;
      const formData = new FormData();
      formData.append("file", selectedAudio.blob, selectedAudio.name);
      formData.append("userId", userId!);

      const res = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload to media library failed");
      const data = await res.json();
      return data.mediaIds?.[0];
  };

  const handleSubmit = async () => {
    if (!selectedAudio) { toast.error("Prepare audio first"); return; }
    if (!playlistName) { toast.error("Playlist name required"); return; }
    if (selectedDevices.length === 0) { toast.error("Select a device"); return; }
    setIsLoading(true);

    try {
      // 1. Upload audio / get library ID
      const mediaId = await uploadMediaFirst();
      if (!mediaId) throw new Error("Media ID couldn't be resolved");

      // 2. Build Schedule and send to /api/playlists
      for (const tId of selectedDevices) {
          const device = devices.find(d => d._id === tId);
          if(!device) continue;
          
          const payload = {
              name: playlistName,
              userId,
              type: "Standard",
               schedule: {
                  startDate, endDate, startTime, endTime, daysOfWeek
              },
              globalMinVolume,
              globalMaxVolume,
              mediaIds: [mediaId],
              linkedDeviceIds: [tId]
          };

          const pRes = await fetch("/api/pl
