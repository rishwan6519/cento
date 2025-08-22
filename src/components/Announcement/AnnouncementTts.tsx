import React, { useState, useEffect } from 'react';
import { Play, Loader, Mic, ChevronDown, Languages, Save, Check, X, Volume2, Upload } from 'lucide-react';

// Voice and language constants
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

interface AnnouncementFile {
  _id: string;
  name: string;
  path: string;
  type: 'recorded' | 'generated' | 'tts';
  voice?: string;
}

const IntegratedTTSAnnouncement = () => {
  // TTS State
  const [text, setText] = useState("Welcome to our store! Today we have amazing deals on all products.");
  const [selectedVoice, setSelectedVoice] = useState('Puck');
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedAudio, setGeneratedAudio] = useState<Blob | null>(null);

  // Save State
  const [fileName, setFileName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Files List State
  const [announcementFiles, setAnnouncementFiles] = useState<AnnouncementFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("userId");
    setUserId(id);
    if (id) {
      fetchAnnouncementFiles(id);
    }
  }, []);

  const fetchAnnouncementFiles = async (currentUserId: string) => {
    if (!currentUserId) return;
    setIsLoadingFiles(true);
    try {
      const response = await fetch(`/api/announcement/list?userId=${currentUserId}`);
      if (response.ok) {
        const data = await response.json();
        const files = data.announcements || data.files || data || [];
        setAnnouncementFiles(Array.isArray(files) ? files : []);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
      setError("Failed to load announcement files.");
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Helper function to create WAV blob from PCM data
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

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
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

  const handleSpeak = async () => {
    if (!text.trim()) return;
    setIsSpeaking(true);
    setError(null);
    setGeneratedAudio(null); // Clear previous audio

    const prompt = `(speak in ${selectedLanguage}) ${text}`;

    try {
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: prompt,
          voice: selectedVoice,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate audio.');
      }

      const rawBlob = await response.blob();
      const arrayBuffer = await rawBlob.arrayBuffer();
      const audioBlob = createWavBlob(arrayBuffer);

      // Store for saving later
      setGeneratedAudio(audioBlob);

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.addEventListener('canplaythrough', () => {
        audio.play().catch(e => {
          console.error("Audio play promise rejected:", e);
          setError("Playback was interrupted or failed.");
          setIsSpeaking(false);
        });
      });

      audio.addEventListener('ended', () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      });

      audio.addEventListener('error', (e) => {
        console.error("HTMLAudioElement Error:", e);
        setError("Could not play the generated audio.");
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      });

      audio.load();

    } catch (err: any) {
      console.error("Error:", err);
      setError(err.message);
      setIsSpeaking(false);
    }
  };

  const handleSaveAnnouncement = async () => {
    if (!generatedAudio || !fileName.trim() || !userId) {
      setError("Please generate audio and provide a filename first.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // 1. Upload to Cloudinary
   const CLOUDINARY_UPLOAD_PRESET = "announcement_upload_preset";
      const CLOUDINARY_CLOUD_NAME = "dzb0gggua";

      if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        throw new Error("Cloudinary configuration is missing.");
      }

      const cloudFormData = new FormData();
      cloudFormData.append("file", generatedAudio, `${fileName}.wav`);
      cloudFormData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      cloudFormData.append("resource_type", "video"); // Cloudinary often uses 'video' for audio files

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`,
        {
          method: "POST",
          body: cloudFormData,
        }
      );

      if (!cloudRes.ok) {
        const cloudErr = await cloudRes.json();
        throw new Error(cloudErr.error?.message || "Cloudinary upload failed");
      }

      const cloudData = await cloudRes.json();

      // 2. Save metadata to your backend
      const metadataRes = await fetch("/api/announcement/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name: fileName,
          path: cloudData.secure_url, // Use the URL from Cloudinary
          type: "tts",
          voice: selectedVoice,
          language: selectedLanguage,
        }),
      });

      if (!metadataRes.ok) {
        const appErr = await metadataRes.json();
        throw new Error(appErr.error?.message || "Failed to save announcement metadata");
      }

      setSaveSuccess(true);
      setFileName('');
      setGeneratedAudio(null);

      // Refresh the files list
      await fetchAnnouncementFiles(userId);

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);

    } catch (err: any) {
      console.error("Save error:", err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const clearGenerated = () => {
    setGeneratedAudio(null);
    setFileName('');
    setSaveSuccess(false);
    setError(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Volume2 size={32} />
          <div>
            <h1 className="text-3xl font-bold">AI Voice Studio</h1>
            <p className="text-blue-100">Create and manage your announcement voices with Gemini AI</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Voice Creation Panel */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <Mic className="text-blue-600" size={24} />
            <h2 className="text-xl font-bold text-gray-800">Create Voice Announcement</h2>
          </div>

          <div className="space-y-6">
            {/* Text Input */}
            <div>
              <label htmlFor="tts-text" className="block text-sm font-medium mb-2 text-gray-700">
                Announcement Text
              </label>
              <textarea
                id="tts-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full p-4 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow resize-none"
                placeholder="Enter your announcement text here..."
                rows={4}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{text.length} characters</span>
                <span>Recommended: 50-200 words</span>
              </div>
            </div>

            {/* Voice Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2 text-gray-700">
                  <Languages size={16} /> Language & Accent
                </label>
                <div className="relative">
                  <select
                    value={selectedLanguage}
                    onChange={e => setSelectedLanguage(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {supportedLanguages.map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 flex items-center gap-2 text-gray-700">
                  <Volume2 size={16} /> Voice Character
                </label>
                <div className="relative">
                  <select
                    value={selectedVoice}
                    onChange={e => setSelectedVoice(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {geminiVoices.map(voice => (
                      <option key={voice} value={voice}>{voice}</option>
                    ))}
                  </select>
                  <ChevronDown size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex justify-center">
              <button
                onClick={handleSpeak}
                disabled={isSpeaking || !text.trim()}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-medium flex items-center gap-3 transition-all transform hover:scale-105 shadow-lg"
              >
                {isSpeaking ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    <span>Generating Voice...</span>
                  </>
                ) : (
                  <>
                    <Play size={20} />
                    <span>Generate & Preview</span>
                  </>
                )}
              </button>
            </div>

            {/* Save Section */}
            {generatedAudio && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="text-green-600" size={20} />
                  <span className="font-medium text-green-800">Voice Generated Successfully!</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Save as Announcement
                    </label>
                    <input
                      type="text"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                      placeholder="Enter filename (e.g., 'Store Welcome Message')"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveAnnouncement}
                      disabled={isSaving || !fileName.trim()}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          <span>Save Announcement</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={clearGenerated}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {saveSuccess && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-800">
                  <Check size={20} />
                  <span className="font-medium">Announcement saved successfully!</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <X size={20} />
                  <span className="font-medium">Error:</span>
                  <span>{error}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Saved Announcements Panel */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Your Announcements</h3>
            <button
              onClick={() => userId && fetchAnnouncementFiles(userId)}
              disabled={isLoadingFiles}
              className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              {isLoadingFiles ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {isLoadingFiles ? (
              <div className="text-center py-8">
                <Loader className="animate-spin h-6 w-6 text-blue-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading announcements...</p>
              </div>
            ) : announcementFiles.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Mic className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No announcements yet</p>
                <p className="text-xs mt-1">Create your first voice announcement above</p>
              </div>
            ) : (
              announcementFiles.map((file) => (
                <div
                  key={file._id}
                  className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-center w-6">
                    {file.type === 'generated' || file.type === 'tts' ? (
                      <Volume2 className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Mic className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{file.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        file.type === 'generated' || file.type === 'tts'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {file.type}
                      </span>
                      {file.voice && (
                        <span className="text-xs text-gray-500">
                          {file.voice}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegratedTTSAnnouncement;