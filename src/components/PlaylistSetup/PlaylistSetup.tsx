import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import PlaylistManager from "../ShowPlaylist/showPlaylist";
import { XCircle } from "lucide-react";

interface PlaylistConfigFile {
  path: string;
  name: string;
  type: string;
  displayOrder: number;
  delay: number;
  backgroundImageEnabled?: boolean;
  backgroundImage?: string | null;
  backgroundImageName?: string | null;
}

interface PlaylistConfiguration {
  id: string;
  name: string;
  type: string;
  serialNumber: string;
  startTime: string;
  endTime: string;
  files: PlaylistConfigFile[];
  startDate?: string;
  endDate?: string;
  daysOfWeek?: string[];
  shuffle?: boolean; // Added shuffle property
}

// Create a ShowPlaylist component
const ShowPlaylist: React.FC<{
  playlistName: string;
  onCreateNew: () => void;
}> = ({ playlistName, onCreateNew }) => {
  const router = useRouter();
  const [showPlaylistManager, setShowPlaylistManager] = useState(false);

  const handleViewList = () => {
    setShowPlaylistManager(true);
  };

  if (showPlaylistManager) {
    return <PlaylistManager />;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 text-black text-center">
      <div className="mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Success!</h2>
        <p className="text-gray-600 mt-2">
          Playlist "{playlistName}" has been saved successfully.
        </p>
      </div>
      <div className="flex justify-center gap-4">
        <button
          onClick={handleViewList}
          className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium"
        >
          View All Playlists
        </button>
        <button
          onClick={onCreateNew}
          className="px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium"
        >
          Create Another Playlist
        </button>
      </div>
    </div>
  );
};

const PlaylistSetup: React.FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [savedPlaylistName, setSavedPlaylistName] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [playlistConfig, setPlaylistConfig] = useState<PlaylistConfiguration>({
    id: "",
    name: "",
    type: "mixed",
    serialNumber: "",
    startTime: "00:00:00",
    endTime: "00:10:00",
    files: [] as PlaylistConfigFile[],
    startDate: "",
    endDate: "",
    daysOfWeek: [],
    shuffle: false, // Default shuffle to false
  });
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("userId");
    setUserId(id);
  }, []);

  // Fetch media files on component mount
  useEffect(() => {
    const fetchMediaFiles = async () => {
      try {
        if (!userId) return; // Don't fetch if userId is not available

        const response = await fetch(`/api/media?userId=${userId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch media files");
        }
        const data = await response.json();
        setMediaFiles(data.media || []);
      } catch (error) {
        console.error("Error fetching media files:", error);
        toast.error("Failed to load media files");
        setMediaFiles([]);
      }
    };

    if (userId) {
      fetchMediaFiles();
    }
  }, [userId]); // Add userId as dependency

  // Skip rendering if component is not visible
  if (!isVisible) {
    return null;
  }

  // Show the playlist manager if showPlaylist is true
  if (showPlaylist) {
    return <PlaylistManager />;
  }

  if (isSaved) {
    return (
      <ShowPlaylist
        playlistName={savedPlaylistName}
        onCreateNew={() => {
          setIsSaved(false);
          setSavedPlaylistName("");
          // Reset the playlist configuration
          setPlaylistConfig({
            id: "",
            name: "",
            type: "mixed",
            serialNumber: "",
            startTime: "00:00:00",
            endTime: "00:10:00",
            files: [],
            shuffle: false,
          });
        }}
      />
    );
  }

  const daysList = [
    { label: "Sun", value: "sunday" },
    { label: "Mon", value: "monday" },
    { label: "Tue", value: "tuesday" },
    { label: "Wed", value: "wednesday" },
    { label: "Thu", value: "thursday" },
    { label: "Fri", value: "friday" },
    { label: "Sat", value: "saturday" },
  ];

  const handleDayToggle = (day: string) => {
    setPlaylistConfig((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek?.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...(prev.daysOfWeek || []), day],
    }));
  };

  const handleSavePlaylistConfig = async () => {
    if (
      !playlistConfig.name ||
      playlistConfig.files.length === 0 ||
      !playlistConfig.startDate ||
      !playlistConfig.endDate ||
      !playlistConfig.daysOfWeek ||
      playlistConfig.daysOfWeek.length === 0
    ) {
      toast.error(
        `Please add a name, at least one file, date range, and select at least one day for the playlist`
      );
      return;
    }
    setIsLoading(true);
    try {
      const configToSend = {
        name: playlistConfig.name,
        type: "mixed",
        startTime: playlistConfig.startTime || "00:00:00",
        endTime: playlistConfig.endTime || "00:10:00",
        startDate: playlistConfig.startDate,
        endDate: playlistConfig.endDate,
        daysOfWeek: playlistConfig.daysOfWeek,
        shuffle: playlistConfig.shuffle, // Include shuffle in the payload
        files: playlistConfig.files.map((file, index) => ({
          name: file.name,
          path: file.path,
          type: file.type,
          displayOrder: index + 1,
          delay: file.delay || 0,
          backgroundImageEnabled: file.backgroundImageEnabled || false,
          backgroundImage: file.backgroundImage || null,
          backgroundImageName: file.backgroundImageName || null,
        })),
      };
      const formData = new FormData();
      formData.append("config", JSON.stringify(configToSend));

      const response = await fetch(`/api/playlist-config?userId=${userId}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save playlist");
      }

      toast.success("Playlist saved successfully");

      // Store the saved playlist info for the success screen
      setSavedPlaylistName(playlistConfig.name);

      // Show the success component
      setIsSaved(true);
    } catch (error) {
      console.error("Error saving playlist:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save playlist"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form
    setPlaylistConfig({
      id: "",
      name: "",
      type: "mixed",
      serialNumber: "",
      startTime: "00:00:00",
      endTime: "00:10:00",
      files: [],
      shuffle: false,
    });

    // Hide the component
    setIsVisible(false);

    // Optionally navigate back or to another page
    // router.push('/some-path');
  };

  const openBgImageSelector = (audioPath: string) => {
    const modalContainer = document.createElement("div");
    modalContainer.className =
      "fixed inset-0 z-50 flex items-center justify-center";
    modalContainer.innerHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-50"></div>
      <div class="relative bg-white rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto m-4">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-semibold">Select Background Image</h3>
          <button id="closeBgImageSelector" class="text-red-500 hover:text-gray-700">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        ${
          mediaFiles.length > 0
            ? `
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4" id="bgImageGrid">
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
                <div class="aspect-square relative group cursor-pointer hover:opacity-90 bg-white rounded-lg overflow-hidden"
                  data-image-url="${image.url}"
                  data-image-name="${image.name}"
                  data-audio-path="${audioPath}">
                  <img src="${image.url}"
                    alt="${image.name}"
                    loading="lazy"
                    class="w-full h-full object-cover"/>
                  <div class="absolute inset-0 flex items-center justify-center p-5bg-opacity-0 group-hover:bg-opacity-20 transition-all">
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
            id="cancelBgImageSelector"
            class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modalContainer);

    // Set up event listeners
    document.querySelectorAll("[data-audio-path]").forEach((element) => {
      element.addEventListener("click", function (e) {
        const target = e.currentTarget as HTMLElement;
        const audioPath = target.getAttribute("data-audio-path");
        const imageUrl = target.getAttribute("data-image-url");
        const imageName = target.getAttribute("data-image-name");

        if (audioPath && imageUrl && imageName) {
          // Update playlist config with selected image
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

          // Remove the modal
          document.body.removeChild(modalContainer);
        }
      });
    });

    // Close button handler
    const closeButton = modalContainer.querySelector("#closeBgImageSelector");
    if (closeButton) {
      closeButton.addEventListener("click", () => {
        document.body.removeChild(modalContainer);
      });
    }

    // Cancel button handler
    const cancelButton = modalContainer.querySelector(
      "#cancelBgImageSelector"
    );
    if (cancelButton) {
      cancelButton.addEventListener("click", () => {
        document.body.removeChild(modalContainer);
      });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 md:p-6 text-black">
      <div className="mb-4 md:mb-6 border-b pb-4">
        <h2 className="text-xl md:text-2xl font-bold">
          Create Playlist Configuration
        </h2>
      </div>
      <div className="space-y-6">
        {/* Date Range and Days of Week */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date Range */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Date and Day Selection</h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label
                  htmlFor="startDate"
                  className="block text-sm font-medium text-gray-700"
                >
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={playlistConfig.startDate}
                  onChange={(e) =>
                    setPlaylistConfig({
                      ...playlistConfig,
                      startDate: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div className="flex-1">
                <label
                  htmlFor="endDate"
                  className="block text-sm font-medium text-gray-700"
                >
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={playlistConfig.endDate}
                  onChange={(e) =>
                    setPlaylistConfig({
                      ...playlistConfig,
                      endDate: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Days of the Week
              </label>
              <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {daysList.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleDayToggle(day.value)}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      playlistConfig.daysOfWeek?.includes(day.value)
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Playlist Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Playlist Settings</h3>
            <div>
              <label
                htmlFor="playlistName"
                className="block text-sm font-medium text-gray-700"
              >
                Playlist Name
              </label>
              <input
                type="text"
                id="playlistName"
                value={playlistConfig.name}
                onChange={(e) =>
                  setPlaylistConfig({
                    ...playlistConfig,
                    name: e.target.value,
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Enter playlist name"
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label
                  htmlFor="startTime"
                  className="block text-sm font-medium text-gray-700"
                >
                  Start Time
                </label>
                <input
                  type="time"
                  id="startTime"
                  value={playlistConfig.startTime}
                  onChange={(e) =>
                    setPlaylistConfig({
                      ...playlistConfig,
                      startTime: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div className="flex-1">
                <label
                  htmlFor="endTime"
                  className="block text-sm font-medium text-gray-700"
                >
                  End Time
                </label>
                <input
                  type="time"
                  id="endTime"
                  value={playlistConfig.endTime}
                  onChange={(e) =>
                    setPlaylistConfig({
                      ...playlistConfig,
                      endTime: e.target.value,
                    })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Shuffle Playlist
              </span>
              <label
                htmlFor="shuffle"
                className="relative inline-flex items-center cursor-pointer"
              >
                <input
                  type="checkbox"
                  id="shuffle"
                  className="sr-only peer"
                  checked={playlistConfig.shuffle}
                  onChange={(e) =>
                    setPlaylistConfig({
                      ...playlistConfig,
                      shuffle: e.target.checked,
                    })
                  }
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Media Files
              </label>
              <div className="max-h-[300px] md:max-h-[400px] overflow-y-auto border rounded p-3">
                {mediaFiles.length === 0 ? (
                  <p className="text-center py-4 text-gray-500">
                    No media files available
                  </p>
                ) : (
                  mediaFiles.map((media: any) => {
                    const isAudio = media.type.startsWith("audio/");
                    const isImage = media.type.startsWith("image/");
                    const fileExtension = media.name
                      .split(".")
                      .pop()
                      ?.toLowerCase();
                    const fileName = media.name
                      .split(".")
                      .slice(0, -1)
                      .join(".");
                    if (isImage) {
                      return null;
                    }
                    return (
                      <div
                        key={media._id || media.url}
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
                                    const updatedFiles =
                                      playlistConfig.files.map((f) => {
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
                                      });
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
                  })
                )}
              </div>
            </div>
          </div>
          {/* Right Column */}
          <div className="border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-6">
            <h4 className="font-medium mb-4">Selected Media Order</h4>
            <div className="mb-2 text-xs text-gray-600">
              <span>
                Date Range:{" "}
                {playlistConfig.startDate && playlistConfig.endDate
                  ? `${playlistConfig.startDate} to ${playlistConfig.endDate}`
                  : "Not set"}
              </span>
              <br />
              <span>
                Days:{" "}
                {playlistConfig.daysOfWeek &&
                playlistConfig.daysOfWeek.length > 0
                  ? playlistConfig.daysOfWeek.join(", ")
                  : "None selected"}
              </span>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {playlistConfig.files.length === 0 ? (
                <p className="text-center py-4 text-gray-500">
                  No media files selected
                </p>
              ) : (
                playlistConfig.files.map((file, index) => (
                  <div
                    key={file.path}
                    className="flex items-center gap-3 p-2 md:p-3 bg-gray-50 rounded"
                  >
                    <span className="text-gray-500 text-sm">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {file.name}
                      </p>
                      {file.type === "audio" && file.backgroundImageEnabled && (
                        <div className="mt-2">
                          {file.backgroundImage ? (
                            <div className="relative w-20 h-20">
                              <img
                                src={
                                  typeof file.backgroundImage === "string"
                                    ? file.backgroundImage
                                    : "#"
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
                                          backgroundImageName: null,
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
                        <label className="text-xs text-gray-600">
                          Delay (s)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={file.delay}
                          onChange={(e) => {
                            const newFiles = [...playlistConfig.files];
                            newFiles[index].delay =
                              parseInt(e.target.value) || 0;
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
                ))
              )}
            </div>
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button
            onClick={handleCancel}
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
              `Save Playlist`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaylistSetup;