"use client";

import React, { useState, useEffect } from "react";
import { XCircle } from "lucide-react";
import toast from "react-hot-toast";

interface PlaylistConfigFile {
  path: string;
  name: string;
  type: string;
  displayOrder: number;
  delay: number;
  backgroundImageEnabled?: boolean;
  backgroundImage?: string | File | null;
  backgroundImageName?: string | null;
}

interface PlaylistConfiguration {
  id: string;
  name: string;
  type: string;
  contentType: "playlist" | "announcement";
  serialNumber: string;
  startTime: string;
  endTime: string;
  files: PlaylistConfigFile[];
}

interface PlaylistSetupProps {
  activeSection: string;
  mediaFiles: any[];
  onSaveSuccess: () => void;
  onCancel: () => void;
}

const PlaylistSetup: React.FC<PlaylistSetupProps> = ({
  activeSection,
  mediaFiles,
  onSaveSuccess,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [playlistConfig, setPlaylistConfig] = useState<PlaylistConfiguration>({
    id: "",
    name: "",
    type: "mixed",
    contentType: "playlist",
    serialNumber: "",
    startTime: "00:00:00",
    endTime: "00:10:00",
    files: [] as PlaylistConfigFile[],
  });

  // Skip rendering if activeSection is not "playlistSetup"
  if (activeSection !== "playlistSetup") {
    return null;
  }

  const handleSavePlaylistConfig = async () => {
    if (!playlistConfig.name || playlistConfig.files.length === 0) {
      toast.error(
        `Please add a name and at least one file for the ${playlistConfig.contentType}`
      );
      return;
    }
    setIsLoading(true);
    try {
      const configToSend = {
        name: playlistConfig.name,
        type: "mixed",
        contentType: playlistConfig.contentType,
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

      toast.success(
        `${
          playlistConfig.contentType === "announcement"
            ? "Announcement"
            : "Playlist"
        } saved successfully`
      );

      onSaveSuccess();
    } catch (error) {
      console.error("Error saving playlist:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save playlist"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const openBgImageSelector = (audioPath: string) => {
    const input = document.createElement("div");
    input.className = "fixed inset-0 z-50 flex items-center justify-center";
    input.innerHTML = `
      <div class="fixed inset-0 bg-white bg-opacity-30"></div>
      <div class="relative bg-black rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto m-4">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-semibold text-white">Select Background Image</h3>
          <button onclick="closeBgImageSelector()" class="text-red-500 hover:text-gray-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        ${
          mediaFiles.length > 0
            ? `
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4" id="bgImageGrid ">
              ${mediaFiles
                .filter((file) => {
                  // Get the file extension
                  const extension = file.name.split(".").pop().toLowerCase();
                  // Only include image file types
                  const imageExtensions = [
                    "jpg",
                    "jpeg",
                    "png",
                    "gif",
                    "webp",
                    "svg",
                    "bmp",
                  ];
                  return imageExtensions.includes(extension);
                })
                .map(
                  (image) => `
                <div class="aspect-square relative group cursor-pointer hover:opacity-90 bg-white rounded-lg overflow-hidden " 
                  data-image-url="${image.url}"
                  data-image-name="${image.name}"
                  onclick="selectBgImage('${audioPath}', '${image.url}', '${image.name}')">
                  <img src="${image.url}" 
                    alt="${image.name}"
                    loading="lazy"
                    class="w-full h-full object-cover"/>
                  <div class="absolute inset-0 flex items-center justify-cente p-5 bg-opacity-0 group-hover:bg-opacity-20 transition-all">
                    <span class="text-sm font-medium text-white opacity-0 group-hover:opacity-100 bg-black bg-opacity-50 px-3 py-1 rounded-full">
                      Select
                    </span>
                  </div>
                </div>
                `
                )
                .join("")}
            </div>
            `
            : `
            <div class="text-center py-8">
              <p class="text-gray-500">No images available. Please upload some images first.</p>
            </div>
            `
        }
        <div class="flex justify-end mt-6 pt-4 border-t">
          <button 
            onclick="closeBgImageSelector()" 
            class="px-4 py-2 text-sm font-medium text-cyan-50 hover:text-gray-900"
          >
            Cancel
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(input);

    // Add the selection handler to window
    (window as any).selectBgImage = (
      audioPath: string,
      imageUrl: string,
      imageName: string
    ) => {
      const updatedFiles = playlistConfig.files.map((f) => {
        if (f.path === audioPath) {
          return {
            ...f,
            backgroundImageEnabled: true,
            backgroundImage: imageUrl,
            backgroundImageName: imageName,
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

    // Add the close handler to window
    (window as any).closeBgImageSelector = () => {
      document.body.removeChild(input);
    };
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 text-black">
      <div className="mb-4 md:mb-6 border-b pb-4">
        <h2 className="text-xl md:text-2xl font-bold">
          Create{" "}
          {playlistConfig.contentType === "announcement"
            ? "Announcement"
            : "Playlist"}{" "}
          Configuration
        </h2>
      </div>
      <div className="space-y-6">
        {/* Content Type Selection */}
        <div className="flex gap-4 mb-6">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="contentType"
              value="playlist"
              checked={playlistConfig.contentType === "playlist"}
              onChange={(e) =>
                setPlaylistConfig({
                  ...playlistConfig,
                  contentType: e.target.value as "playlist" | "announcement",
                })
              }
              className="h-4 w-4"
            />
            <span className="text-sm font-medium">Playlist</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="contentType"
              value="announcement"
              checked={playlistConfig.contentType === "announcement"}
              onChange={(e) =>
                setPlaylistConfig({
                  ...playlistConfig,
                  contentType: e.target.value as "playlist" | "announcement",
                })
              }
              className="h-4 w-4"
            />
            <span className="text-sm font-medium">Announcement</span>
          </label>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {playlistConfig.contentType === "announcement"
                  ? "Announcement"
                  : "Playlist"}{" "}
                Name
              </label>
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
                placeholder={`Enter ${
                  playlistConfig.contentType === "announcement"
                    ? "announcement"
                    : "playlist"
                } name`}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Start Time
                </label>
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
                <label className="block text-sm font-medium mb-1">
                  End Time
                </label>
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
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Media Files
              </label>
              <div className="max-h-[300px] md:max-h-[400px] overflow-y-auto border rounded p-3">
                {mediaFiles.map((media: any) => {
                  const isAudio = media.type.startsWith("audio/");
                  const isImage = media.type.startsWith("image/");
                  const fileExtension = media.name
                    .split(".")
                    .pop()
                    ?.toLowerCase();
                  const fileName = media.name.split(".").slice(0, -1).join(".");
                  if (isImage) {
                    return null;
                  }
                  return (
                    <div
                      key={media._id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={playlistConfig.files.some(
                          (f) => f.path === media.url
                        )}
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
                            files: playlistConfig.files.some(
                              (f) => f.path === media.url
                            )
                              ? playlistConfig.files.filter(
                                  (f) => f.path !== media.url
                                )
                              : [...playlistConfig.files, file],
                          });
                        }}
                        className="h-4 w-4"
                      />
                      <span className="text-sm truncate">
                        {fileName}
                        <span className="text-gray-500 text-xs ml-1">
                          ({fileExtension})
                        </span>
                      </span>
                      {isAudio &&
                        playlistConfig.files.some(
                          (f) => f.path === media.url
                        ) && (
                          <div className="flex items-center gap-2">
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={
                                  playlistConfig.files.find(
                                    (f) => f.path === media.url
                                  )?.backgroundImageEnabled
                                }
                                onChange={() => {
                                  const updatedFiles = playlistConfig.files.map(
                                    (f) => {
                                      if (f.path === media.url) {
                                        return {
                                          ...f,
                                          backgroundImageEnabled:
                                            !f.backgroundImageEnabled,
                                          backgroundImage:
                                            !f.backgroundImageEnabled
                                              ? null
                                              : f.backgroundImage,
                                        } as PlaylistConfigFile;
                                      }
                                      return f;
                                    }
                                  );
                                  setPlaylistConfig({
                                    ...playlistConfig,
                                    files: updatedFiles,
                                  });
                                }}
                              />
                              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                              <span className="ml-2 text-xs text-gray-600">
                                BG Image
                              </span>
                            </label>
                            {playlistConfig.files.find(
                              (f) => f.path === media.url
                            )?.backgroundImageEnabled && (
                              <button
                                onClick={() => openBgImageSelector(media.url)}
                                className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                              >
                                {playlistConfig.files.find(
                                  (f) => f.path === media.url
                                )?.backgroundImage
                                  ? "Change BG Image"
                                  : "Add BG Image"}
                              </button>
                            )}
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {/* Right Column */}
          <div className="border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-6">
            <h4 className="font-medium mb-4">Selected Media Order</h4>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {playlistConfig.files.map((file, index) => (
                <div
                  key={file.path}
                  className="flex items-center gap-3 p-2 md:p-3 bg-gray-50 rounded"
                >
                  <span className="text-gray-500 text-sm">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{file.name}</p>
                    {file.type === "audio" && file.backgroundImageEnabled && (
                      <div className="mt-2">
                        {file.backgroundImage ? (
                          <div className="relative w-20 h-20">
                            <img
                              src={
                                typeof file.backgroundImage === "string"
                                  ? file.backgroundImage
                                  : URL.createObjectURL(file.backgroundImage)
                              }
                              alt="Background"
                              className="w-full h-full object-cover rounded-lg"
                            />
                            <button
                              onClick={() => {
                                const updatedFiles = playlistConfig.files.map(
                                  (f) => {
                                    if (f.path === file.path) {
                                      return {
                                        ...f,
                                        backgroundImage: null,
                                      };
                                    }
                                    return f;
                                  }
                                );
                                setPlaylistConfig({
                                  ...playlistConfig,
                                  files: updatedFiles,
                                });
                              }}
                              className="absolute -top-2 -right-2 p-1 bg-white rounded-full shadow-md"
                            >
                              <XCircle size={16} className="text-red-500" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">
                            No background image selected
                          </p>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <label className="text-xs text-gray-600">Delay (s)</label>
                      <input
                        type="number"
                        min="0"
                        value={file.delay}
                        onChange={(e) => {
                          const newFiles = [...playlistConfig.files];
                          newFiles[index].delay = parseInt(e.target.value);
                          setPlaylistConfig({
                            ...playlistConfig,
                            files: newFiles,
                          });
                        }}
                        className="w-16 p-1 border rounded text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button
            onClick={onCancel}
            className="px-4 md:px-6 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSavePlaylistConfig}
            disabled={!playlistConfig.name || playlistConfig.files.length === 0}
            className={`px-4 md:px-6 py-2 text-sm rounded ${
              !playlistConfig.name || playlistConfig.files.length === 0
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700"
            } text-white transition-colors`}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Saving...</span>
              </div>
            ) : (
              `Save ${
                playlistConfig.contentType === "announcement"
                  ? "Announcement"
                  : "Playlist"
              }`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaylistSetup;
