"use client";
import { useState, useEffect } from 'react';
import { XCircle, Music, Video, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface PlaylistConfigFile {
  path: string;
  name: string;
  type: string;
  displayOrder: number;
  delay: number;
  backgroundImageEnabled?: boolean;
  backgroundImage?: string | File | null;
}

interface PlaylistConfiguration {
  id: string;
  name: string;
  type: string;
  serialNumber: string;
  startTime: string;
  endTime: string;
  files: PlaylistConfigFile[];
  backgroundAudio: {
    enabled: boolean;
    file: string | null;
    volume: number;
  };
}

const PlaylistSetup = ({ onClose }: { onClose: () => void }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  const [playlistConfig, setPlaylistConfig] = useState<PlaylistConfiguration>({
    id: "",
    name: "",
    type: "mixed",
    serialNumber: "",
    startTime: "00:00:00",
    endTime: "00:10:00",
    files: [] as PlaylistConfigFile[],
    backgroundAudio: {
      enabled: false,
      file: null,
      volume: 50,
    },
  });

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    setIsLoadingMedia(true);
    try {
      const response = await fetch("/api/media");
      if (!response.ok) throw new Error("Failed to fetch media");

      const data = await response.json();
      if (data.media) {
        setMediaFiles(data.media);
      }
    } catch (error) {
      console.error("Error fetching media:", error);
      toast.error("Failed to fetch media");
      setMediaFiles([]);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  const handleSavePlaylistConfig = async () => {
    if (!playlistConfig.name || playlistConfig.files.length === 0) {
      toast.error("Please add a name and at least one file");
      return;
    }

    setIsLoading(true);

    try {
      const configToSend = {
        name: playlistConfig.name,
        type: "mixed",
        startTime: playlistConfig.startTime || "00:00:00",
        endTime: playlistConfig.endTime || "00:10:00",
        files: playlistConfig.files.map((file, index) => ({
          name: file.name,
          path: file.path,
          type: file.type,
          displayOrder: index + 1,
          delay: file.delay || 0,
          backgroundImageEnabled: file.backgroundImageEnabled || false,
          backgroundImage: file.backgroundImage || null,
        })),
        backgroundAudio: {
          enabled: playlistConfig.backgroundAudio?.enabled || false,
          file: playlistConfig.backgroundAudio?.file || null,
          volume: playlistConfig.backgroundAudio?.volume || 50,
        },
      };

      const formData = new FormData();
      formData.append("config", JSON.stringify(configToSend));

      const response = await fetch("/api/playlist-config", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save playlist");
      }

      toast.success("Playlist saved successfully");
      onClose();
    } catch (error) {
      console.error("Error saving playlist:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save playlist");
    } finally {
      setIsLoading(false);
    }
  };

  const openBgImageSelector = (audioPath: string) => {
    const imageFiles = mediaFiles.filter(
      (media) =>
        media.type?.toLowerCase().includes("image") ||
        media.type?.startsWith("image/")
    );

    const input = document.createElement("div");
    input.className = "fixed inset-0 z-50 flex items-center justify-center";
    input.innerHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-50"></div>
      <div class="relative bg-white rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium">Select Background Image</h3>
          <button onclick="closeImageSelector()" class="p-2 hover:bg-gray-100 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          ${imageFiles
            .map(
              (image) => `
              <div class="aspect-square relative group cursor-pointer hover:opacity-90" 
                   data-image-url="${image.url}"
                   onclick="selectBgImage('${audioPath}', '${image.url}')">
                <img src="${image.url}" 
                     alt="${image.name}"
                     class="w-full h-full object-cover rounded-lg border hover:border-blue-500"/>
                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg"></div>
              </div>
            `
            )
            .join("")}
        </div>
      </div>
    `;

    document.body.appendChild(input);

    (window as any).closeImageSelector = () => {
      document.body.removeChild(input);
    };

    (window as any).selectBgImage = (audioPath: string, imageUrl: string) => {
      const updatedFiles = playlistConfig.files.map((f) => {
        if (f.path === audioPath) {
          return {
            ...f,
            backgroundImageEnabled: true,
            backgroundImage: imageUrl,
          } as PlaylistConfigFile;
        }
        return f;
      });
      setPlaylistConfig({
        ...playlistConfig,
        files: updatedFiles,
      });
      document.body.removeChild(input);
    };
  };

  return (
    
    <div className="bg-white rounded-xl shadow-sm p-6 text-black">
      <div className="mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold">Create Playlist Configuration</h2>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Playlist Name</label>
              <input
                type="text"
                value={playlistConfig.name}
                onChange={(e) =>
                  setPlaylistConfig({
                    ...playlistConfig,
                    name: e.target.value,
                  })
                }
                className="w-full p-2 border rounded text-sm"
                placeholder="Enter playlist name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Time</label>
                <input
                  type="time"
                  value={playlistConfig.startTime}
                  onChange={(e) =>
                    setPlaylistConfig({
                      ...playlistConfig,
                      startTime: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">End Time</label>
                <input
                  type="time"
                  value={playlistConfig.endTime}
                  onChange={(e) =>
                    setPlaylistConfig({
                      ...playlistConfig,
                      endTime: e.target.value,
                    })
                  }
                  className="w-full p-2 border rounded text-sm"
                />
              </div>
            </div>

            {/* Media Files Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Select Media Files</label>
              <div className="max-h-[300px] md:max-h-[400px] overflow-y-auto border rounded p-3">
                {mediaFiles.map((media: any) => {
                  const isAudio = media.type.startsWith("audio/");
                  const isImage = media.type.startsWith("image/");
                  const fileExtension = media.name.split(".").pop()?.toLowerCase();
                  const fileName = media.name.split(".").slice(0, -1).join(".");

                  if (isImage) return null;

                  return (
                    <div key={media.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={playlistConfig.files.some((f) => f.path === media.url)}
                        onChange={() => {
                          const file = {
                            name: fileName,
                            path: media.url,
                            type: media.type.split("/")[0],
                            displayOrder: playlistConfig.files.length + 1,
                            delay: 2,
                            backgroundImageEnabled: false,
                            backgroundImage: null,
                          } as PlaylistConfigFile;
                          setPlaylistConfig({
                            ...playlistConfig,
                            files: playlistConfig.files.some((f) => f.path === media.url)
                              ? playlistConfig.files.filter((f) => f.path !== media.url)
                              : [...playlistConfig.files, file],
                          });
                        }}
                        className="h-4 w-4"
                      />
                      <span className="text-sm truncate">
                        {fileName}
                        <span className="text-gray-500 text-xs ml-1">({fileExtension})</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Selected Files */}
          <div className="border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-6">
            <h4 className="font-medium mb-4">Selected Media Order</h4>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {playlistConfig.files.map((file, index) => (
                <div key={file.path} className="flex items-center gap-3 p-2 md:p-3 bg-gray-50 rounded">
                  <span className="text-gray-500 text-sm">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">{file.name}</p>
                      <div className="flex items-center gap-2">
                        {/* Background Image Toggle for Audio Files */}
                        {file.type === "audio" && (
                          <div className="flex items-center gap-2">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={file.backgroundImageEnabled}
                                onChange={() => {
                                  const updatedFiles = playlistConfig.files.map((f) => {
                                    if (f.path === file.path) {
                                      return {
                                        ...f,
                                        backgroundImageEnabled: !f.backgroundImageEnabled,
                                        backgroundImage: !f.backgroundImageEnabled ? null : f.backgroundImage,
                                      };
                                    }
                                    return f;
                                  });
                                  setPlaylistConfig({
                                    ...playlistConfig,
                                    files: updatedFiles,
                                  });
                                }}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                            {/* Background Image Selector Button - Only show if enabled */}
                            {file.backgroundImageEnabled && (
                              <button
                                onClick={() => openBgImageSelector(file.path)}
                                className="p-1 text-blue-500 hover:text-blue-600"
                                title="Select Background Image"
                              >
                                <ImageIcon size={16} />
                              </button>
                            )}
                          </div>
                        )}
                        {/* Delete Button */}
                        <button
                          onClick={() => {
                            const updatedFiles = playlistConfig.files.filter(f => f.path !== file.path);
                            setPlaylistConfig({
                              ...playlistConfig,
                              files: updatedFiles
                            });
                          }}
                          className="p-1 text-red-500 hover:text-red-600"
                          title="Remove File"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Background Image Preview - Only show if enabled and image selected */}
                    {file.type === "audio" && file.backgroundImageEnabled && file.backgroundImage && (
                      <div className="mt-2">
                        <div className="relative w-20 h-20">
                          <img
                            src={typeof file.backgroundImage === "string" ? file.backgroundImage : URL.createObjectURL(file.backgroundImage)}
                            alt="Background"
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <button
                            onClick={() => {
                              const updatedFiles = playlistConfig.files.map((f) => {
                                if (f.path === file.path) {
                                  return {
                                    ...f,
                                    backgroundImage: null,
                                  };
                                }
                                return f;
                              });
                              setPlaylistConfig({
                                ...playlistConfig,
                                files: updatedFiles,
                              });
                            }}
                            className="absolute -top-2 -right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
                          >
                            <XCircle size={16} className="text-red-500" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Background Audio Section */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-3 mb-4">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={playlistConfig.backgroundAudio.enabled}
                onChange={() => {
                  setPlaylistConfig({
                    ...playlistConfig,
                    backgroundAudio: {
                      ...playlistConfig.backgroundAudio,
                      enabled: !playlistConfig.backgroundAudio.enabled,
                      file: null,
                    },
                  });
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-700">Enable Background Audio</span>
            </label>
          </div>

          {playlistConfig.backgroundAudio.enabled && (
            <div className="space-y-4 pl-4">
              <div className="max-h-[200px] overflow-y-auto border rounded p-3">
                {mediaFiles
                  .filter((media) => media.type.startsWith("audio/"))
                  .map((audio: any) => (
                    <div key={audio.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                      <input
                        type="radio"
                        name="backgroundAudio"
                        checked={playlistConfig.backgroundAudio.file === audio.url}
                        onChange={() => {
                          setPlaylistConfig({
                            ...playlistConfig,
                            backgroundAudio: {
                              ...playlistConfig.backgroundAudio,
                              file: audio.url,
                            },
                          });
                        }}
                        className="h-4 w-4"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{audio.name}</p>
                        <audio src={audio.url} controls className="w-full mt-1" controlsList="nodownload" />
                      </div>
                    </div>
                  ))}
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">Background Volume:</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={playlistConfig.backgroundAudio.volume}
                  onChange={(e) => {
                    setPlaylistConfig({
                      ...playlistConfig,
                      backgroundAudio: {
                        ...playlistConfig.backgroundAudio,
                        volume: parseInt(e.target.value),
                      },
                    });
                  }}
                  className="flex-1"
                />
                <span className="text-sm text-gray-600">{playlistConfig.backgroundAudio.volume}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-900">
            Cancel
          </button>
          <button
            onClick={handleSavePlaylistConfig}
            disabled={!playlistConfig.name || playlistConfig.files.length === 0}
            className={`px-6 py-2 rounded-lg ${
              !playlistConfig.name || playlistConfig.files.length === 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            } text-white`}
          >
            {isLoading ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaylistSetup;