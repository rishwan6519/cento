"use client";

import React, { useState, useEffect } from "react";
// Added AlertCircle icon for the error message
import { Upload, Trash2, X, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { FaFolder, FaFolderPlus, FaSpinner, FaCheck, FaPlus } from "react-icons/fa";

interface SelectedFile {
  id: string;
  name: string;
  type: string;
  file: File;
  previewUrl: string;
  status: "uploading" | "completed" | "failed" | "pending";
  progress: number;
  uploadedMediaId?: string;
  isCorrupted?: boolean; // New field to track if the file is broken
}

interface MediaGroup {
  _id: string;
  name: string;
  description?: string;
  mediaCount: number;
}

interface CreateMediaProps {
  onCancel: () => void;
  onSuccess: () => void;
}

const CreateMedia: React.FC<CreateMediaProps> = ({ onCancel, onSuccess }) => {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [groups, setGroups] = useState<MediaGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [assignToGroup, setAssignToGroup] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  useEffect(() => {
    if (userId) {
      fetchGroups();
    }
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
  }, []);

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const response = await fetch(`/api/media-groups?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error("Error fetching groups:", error);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error("Group name is required");
      return;
    }

    setCreatingGroup(true);
    try {
      const response = await fetch("/api/media-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name: newGroupName.trim(),
          description: newGroupDescription.trim(),
          mediaIds: [],
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create group");
      }

      const data = await response.json();
      toast.success("Group created successfully");

      setGroups((prev) => [data.group, ...prev]);
      setSelectedGroupId(data.group._id);
      setShowCreateGroup(false);
      setNewGroupName("");
      setNewGroupDescription("");
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create group");
    } finally {
      setCreatingGroup(false);
    }
  };

  const generateUniqueId = () => Math.random().toString(36).substring(2, 11);

  const getFileType = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) return "image/jpeg";
    if (["mp4", "webm", "mov"].includes(ext || "")) return "video/mp4";
    if (["mp3", "wav", "ogg"].includes(ext || "")) return "audio/mpeg";
    return "application/octet-stream";
  };

  const processFiles = (incomingFiles: File[]) => {
    const newFiles: SelectedFile[] = incomingFiles.map((file) => ({
      id: generateUniqueId(),
      name: file.name,
      type: file.type || getFileType(file.name),
      file,
      previewUrl: URL.createObjectURL(file),
      status: "pending",
      progress: 0,
      isCorrupted: false, // Default to healthy
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) processFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileDelete = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  // Helper to mark a file as corrupted when the preview fails to load
  const handleMediaError = (id: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, isCorrupted: true } : f))
    );
  };

  // Check if any uploaded file is corrupted
  const hasCorruptedFiles = files.some(f => f.isCorrupted);

  const uploadFileWithProgress = (fileObj: SelectedFile, userId: string): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      formData.append("files[0]", fileObj.file);
      formData.append("fileNames[0]", fileObj.name);
      formData.append("userId", userId);

      xhr.open("POST", "/api/media/upload", true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileObj.id ? { ...f, status: "uploading", progress: percent } : f
            )
          );
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const resp = JSON.parse(xhr.responseText);
            let uploadedMediaId: string | null = null;
            
            if (resp.mediaIds && resp.mediaIds.length > 0) {
              uploadedMediaId = resp.mediaIds[0];
            } else if (resp.media && resp.media.length > 0) {
              uploadedMediaId = resp.media[0]._id || resp.media[0].id;
            } else if (resp.data && resp.data._id) {
              uploadedMediaId = resp.data._id;
            } else if (resp._id) {
              uploadedMediaId = resp._id;
            } else if (resp.id) {
              uploadedMediaId = resp.id;
            }

            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileObj.id
                  ? { ...f, status: "completed", progress: 100, uploadedMediaId: uploadedMediaId || undefined }
                  : f
              )
            );
            resolve(uploadedMediaId);
          } catch (parseError) {
            setFiles((prev) =>
              prev.map((f) => (f.id === fileObj.id ? { ...f, status: "completed", progress: 100 } : f))
            );
            resolve(null);
          }
        } else {
          setFiles((prev) =>
            prev.map((f) => (f.id === fileObj.id ? { ...f, status: "failed" } : f))
          );
          reject(new Error("Upload failed"));
        }
      };

      xhr.onerror = () => {
        setFiles((prev) =>
          prev.map((f) => (f.id === fileObj.id ? { ...f, status: "failed" } : f))
        );
        reject(new Error("Network error"));
      };

      xhr.send(formData);
    });
  };

  const addMediaToGroup = async (mediaIds: string[], groupId: string): Promise<boolean> => {
    try {
      const getResponse = await fetch(`/api/media-groups?userId=${userId}`);
      if (!getResponse.ok) throw new Error("Failed to fetch groups");
      
      const groupsData = await getResponse.json();
      const currentGroup = groupsData.groups?.find((g: MediaGroup) => g._id === groupId);
      const existingMediaIds = currentGroup?.mediaIds?.map((m: any) => 
        typeof m === 'string' ? m : m._id
      ) || [];
      
      const allMediaIds = [...new Set([...existingMediaIds, ...mediaIds])];

      const response = await fetch("/api/media-groups", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, mediaIds: allMediaIds }),
      });

      if (!response.ok) throw new Error("Failed to add media to group");
      return true;
    } catch (error) {
      console.error("Error adding media to group:", error);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one file");
      return;
    }

    if (hasCorruptedFiles) {
        toast.error("Please remove corrupted files before uploading");
        return;
    }

    if (assignToGroup && !selectedGroupId) {
      toast.error("Please select a group or create a new one");
      return;
    }

    if (!userId) {
      toast.error("User not authenticated");
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Uploading media files...");

    try {
      const filesToUpload = files.filter((f) => f.status !== "completed");
      const uploadedMediaIds: string[] = [];

      for (const fileObj of filesToUpload) {
        try {
          const mediaId = await uploadFileWithProgress(fileObj, userId);
          if (mediaId) uploadedMediaIds.push(mediaId);
        } catch (err) {}
      }

      const anyFailed = files.some((f) => f.status === "failed");
      if (anyFailed) {
        toast.error("Some files failed to upload", { id: loadingToast });
        setIsLoading(false);
        return;
      }

      if (assignToGroup && selectedGroupId && uploadedMediaIds.length > 0) {
        await addMediaToGroup(uploadedMediaIds, selectedGroupId);
      }

      toast.success(`${uploadedMediaIds.length} file(s) uploaded successfully!`, { id: loadingToast });
      setFiles([]);
      onSuccess();
      
    } catch (error) {
      toast.error("Unexpected error occurred", { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#DFF4F7] min-h-screen flex justify-center items-center p-6">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-7xl p-6 min-h-[500px]">
        <h2 className="text-lg font-semibold mb-6">Let's create new media</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <div>
            <h3 className="font-semibold mb-3">Upload Media</h3>
            <div
              className={`border-2 border-dashed rounded-lg h-64 flex flex-col items-center justify-center cursor-pointer transition ${
                isDragging ? "border-teal-500 bg-teal-50" : "border-gray-300"
              }`}
              onClick={() => document.getElementById("media-upload")?.click()}
              onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 text-orange-500" />
              <p className="mt-2 text-gray-600 text-sm font-medium">Click to upload or drag & drop it here</p>
              <p className="text-gray-400 text-xs mt-1">Supports video files</p>
              <input id="media-upload" type="file" multiple hidden accept="video/*,audio/*,image/*" onChange={handleFileSelection} />
            </div>

            {/* Group Assignment Section */}
            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-slate-700 flex items-center gap-2">
                  <FaFolder className="text-orange-500" />
                  Assign to Group (Optional)
                </h4>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={assignToGroup} onChange={(e) => { setAssignToGroup(e.target.checked); if (!e.target.checked) setSelectedGroupId(null); }} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>
              {assignToGroup && (
                <div className="space-y-3">
                  {loadingGroups ? (
                    <div className="flex items-center justify-center py-4"><FaSpinner className="animate-spin text-orange-500" /></div>
                  ) : (
                    <>
                      {groups.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {groups.map((group) => (
                            <div key={group._id} onClick={() => setSelectedGroupId(group._id)} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedGroupId === group._id ? "border-orange-500 bg-orange-50" : "border-slate-200 bg-white"}`}>
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${selectedGroupId === group._id ? "bg-orange-500 text-white" : "border-2 border-slate-300"}`}>{selectedGroupId === group._id && <FaCheck size={10} />}</div>
                              <FaFolder className="text-orange-400" />
                              <div className="flex-1">
                                <p className="font-medium text-slate-800 text-sm">{group.name}</p>
                                <p className="text-xs text-slate-500">{group.mediaCount} files</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : <div className="text-center py-4 text-slate-500 text-sm">No groups available.</div>}
                      {!showCreateGroup ? (
                        <button onClick={() => setShowCreateGroup(true)} className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 hover:text-orange-500 transition-colors"><FaFolderPlus />Create New Group</button>
                      ) : (
                        <div className="p-4 bg-white rounded-lg border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="font-medium text-slate-700">New Group</h5>
                            <button onClick={() => { setShowCreateGroup(false); setNewGroupName(""); }} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                          </div>
                          <input type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Group name *" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-orange-400 outline-none" />
                          <button onClick={handleCreateGroup} disabled={creatingGroup || !newGroupName.trim()} className="w-full py-2 bg-orange-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">Create & Select</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Preview Section */}
          <div>
            <h3 className="font-semibold mb-3">Media Preview</h3>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {files.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No files selected yet</div>
              ) : (
                files.map((file) => (
                  <div
                    key={file.id}
                    className={`rounded-lg p-4 shadow flex flex-col transition-colors ${file.isCorrupted ? 'bg-red-50 border border-red-200' : 'bg-[#EAF8FC]'}`}
                  >
                    {/* NEW: Corrupted file warning message at the top of the section */}
                    {file.isCorrupted && (
                      <div className="flex items-center gap-2 text-red-600 text-xs font-bold mb-3 p-2 bg-red-100 rounded">
                        <AlertCircle size={14} />
                        <span>This file is corrupted. Please remove this file and continue.</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${file.isCorrupted ? 'text-red-700' : 'text-gray-800'}`}>{file.name}</p>

                        {file.type.startsWith("audio/") && (
                          <audio controls className="w-full mt-2" src={file.previewUrl} onError={() => handleMediaError(file.id)} />
                        )}
                        {file.type.startsWith("video/") && (
                          <video
                            controls
                            className="w-full mt-2 h-20 rounded object-cover"
                            src={file.previewUrl}
                            onError={() => handleMediaError(file.id)}
                          />
                        )}
                        {file.type.startsWith("image/") && (
                          <img
                            src={file.previewUrl}
                            alt={file.name}
                            className="mt-2 h-20 w-20 object-cover rounded"
                            onError={() => handleMediaError(file.id)}
                          />
                        )}

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-gray-200 rounded mt-2 overflow-hidden">
                          <div
                            className={`h-full rounded transition-all duration-200 ease-out ${
                              file.isCorrupted ? "bg-red-400" : file.status === "failed" ? "bg-red-500" : file.status === "completed" ? "bg-green-500" : "bg-orange-500"
                            }`}
                            style={{ width: file.isCorrupted ? "100%" : `${Math.max(file.progress, 0)}%` }}
                          ></div>
                        </div>

                        <div className="flex justify-between mt-1">
                          <p className="text-xs text-gray-500">
                            {file.isCorrupted ? "✗ Format Error" : file.status === "pending" ? "Ready to upload" : file.status === "uploading" ? `Uploading... ${file.progress}%` : file.status === "completed" ? "✓ Uploaded" : "✗ Failed"}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleFileDelete(file.id)}
                        className="text-red-500 hover:text-red-700 ml-4 p-2"
                        disabled={isLoading}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Summary Section */}
            <div className="mt-4 space-y-2">
              {hasCorruptedFiles && (
                <div className="p-3 bg-red-100 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-600" />
                  <span className="text-sm text-red-700 font-bold">
                    Remove the corrupted files to enable the upload button.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-center gap-4 mt-12">
          <button onClick={onCancel} disabled={isLoading} className="px-6 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50">Cancel</button>
          <button
            onClick={handleSubmit}
            // Logic updated to also disable if any corrupted files exist
            disabled={isLoading || files.length === 0 || hasCorruptedFiles || (assignToGroup && !selectedGroupId)}
            className={`px-6 py-2 rounded-md text-white transition-colors ${
              isLoading || files.length === 0 || hasCorruptedFiles || (assignToGroup && !selectedGroupId)
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-teal-700 hover:bg-teal-800"
            }`}
          >
            {isLoading ? "Processing..." : assignToGroup && selectedGroupId ? "Upload & Add to Group" : "Upload Media"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateMedia;






















































































































































































































































































































































































































































































