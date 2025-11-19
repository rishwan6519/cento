// // "use client";

// // import React, { useState, useEffect } from "react";
// // import { Database, ArrowLeft } from "lucide-react";
// // import toast from "react-hot-toast";

// // interface Device {
// //   _id: string;
// //   name: string;
// //   deviceId: {
// //     _id: string;
// //     serialNumber: string;
// //     imageUrl: string;
// //     name: string;
// //   };
// //   typeId: {
// //     _id: string;
// //     name: string;
// //     handMovements: string[];
// //     bodyMovements: string[];
// //     screenSize: string;
// //   };
// //   imageUrl?: string;
// //   serialNumber?: string;
// //   type?: string;
// // }

// // interface Playlist {
// //   _id?: string;
// //   name: string;
// //   files: any[];
// //   contentType: string;
// // }

// // interface ConnectPlaylistProps {
// //   onCancel: () => void;
// //   onSuccess: () => void;
// // }

// // const ConnectPlaylist: React.FC<ConnectPlaylistProps> = ({
// //   onCancel,
// //   onSuccess,
// // }) => {
// //   const [connectStep, setConnectStep] = useState<number>(1);
// //   const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
// //   const [playlists, setPlaylists] = useState<Playlist[]>([]);
// //   const [
// //     selectedDeviceForPlaylist,
// //     setSelectedDeviceForPlaylist,
// //   ] = useState<Device | null>(null);
// //   const [
// //     selectedPlaylistsForDevice,
// //     setSelectedPlaylistsForDevice,
// //   ] = useState<string[]>([]);
// //   const [
// //     connectedPlaylists,
// //     setConnectedPlaylists,
// //   ] = useState<{ [deviceId: string]: string[] }>({});
// //   const [isLoading, setIsLoading] = useState<boolean>(false);
// //   const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null); // To track which playlist is disconnecting
// //   const [userId, setUserId] = useState<string | null>(null);

// //   useEffect(() => {
// //     const storedUserId = localStorage.getItem("userId");
// //     if (storedUserId) {
// //       setUserId(storedUserId);
// //     }
// //   }, []);

// //   useEffect(() => {
// //     if (userId) {
// //       fetchAvailableDevices();
// //       fetchPlaylists();
// //     }
// //   }, [userId]);

// //   useEffect(() => {
// //     if (selectedDeviceForPlaylist?.deviceId._id) {
// //       fetchConnectedPlaylists(selectedDeviceForPlaylist.deviceId._id);
// //     }
// //   }, [selectedDeviceForPlaylist]);

// //   const fetchAvailableDevices = async () => {
// //     setIsLoading(true);
// //     try {
// //       const response = await fetch(`/api/onboarded-devices?userId=${userId}`);
// //       if (!response.ok) throw new Error("Failed to fetch devices");
// //       const data = await response.json();
// //       setAvailableDevices(data.data || []);
// //     } catch (error) {
// //       console.error("Error fetching devices:", error);
// //       toast.error("Failed to fetch devices");
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   };

// //   const fetchPlaylists = async () => {
// //     setIsLoading(true);
// //     try {
// //       const response = await fetch(`/api/playlists?userId=${userId}`);
// //       if (!response.ok) throw new Error("Failed to fetch playlists");
// //       const data = await response.json();
// //       setPlaylists(data || []);
// //     } catch (error) {
// //       console.error("Error fetching playlists:", error);
// //       toast.error("Failed to fetch playlists");
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   };

// //   const fetchConnectedPlaylists = async (deviceId: string) => {
// //     try {
// //       const response = await fetch(
// //         `/api/connected-playlist?deviceId=${deviceId}`
// //       );
// //       if (!response.ok) throw new Error("Failed to fetch connected playlists");
// //       const data = await response.json();
// //       setConnectedPlaylists((prev) => ({
// //         ...prev,
// //         [deviceId]: data.playlistIds || [],
// //       }));
// //     } catch (error) {
// //       console.error("Error fetching connected playlists:", error);
// //       toast.error("Failed to fetch connected playlists");
// //     }
// //   };

// //   const handleConnectPlaylistToDevice = async () => {
// //     if (!selectedDeviceForPlaylist?._id) {
// //       toast.error("Please select a device");
// //       return;
// //     }

// //     if (selectedPlaylistsForDevice.length === 0) {
// //       toast.error("Please select at least one playlist");
// //       return;
// //     }

// //     const validPlaylistIds = selectedPlaylistsForDevice.filter(
// //       (id) => id && id.trim() !== ""
// //     );

// //     if (validPlaylistIds.length === 0) {
// //       toast.error("No valid playlists selected");
// //       return;
// //     }

// //     setIsLoading(true);
// //     try {
// //       const response = await fetch("/api/device-playlists", {
// //         method: "POST",
// //         headers: {
// //           "Content-Type": "application/json",
// //         },
// //         body: JSON.stringify({
// //           deviceId: selectedDeviceForPlaylist.deviceId._id,
// //           playlistIds: validPlaylistIds,
// //           userId: userId,
// //         }),
// //       });

// //       const data = await response.json();

// //       if (!response.ok) {
// //         throw new Error(data.error || "Failed to connect playlists");
// //       }

// //       toast.success("Playlists connected successfully");
// //       resetForm();
// //       onSuccess();
// //     } catch (error) {
// //       console.error("Error connecting playlists:", error);
// //       toast.error(
// //         error instanceof Error ? error.message : "Failed to connect playlists"
// //       );
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   };

// //   const handleDisconnect = async (playlistId: string) => {
// //     if (!selectedDeviceForPlaylist?.deviceId._id) {
// //       toast.error("No device selected.");
// //       return;
// //     }

// //     setIsDisconnecting(playlistId);
// //     try {
// //       const response = await fetch(
// //         `/api/device-playlists?deviceId=${selectedDeviceForPlaylist.deviceId._id}&playlistId=${playlistId}`,
// //         {
// //           method: "DELETE",
// //         }
// //       );

// //       if (!response.ok) {
// //         const data = await response.json();
// //         throw new Error(data.error || "Failed to disconnect playlist.");
// //       }

// //       toast.success("Playlist disconnected successfully.");

// //       // Update the UI
// //       setConnectedPlaylists((prev) => ({
// //         ...prev,
// //         [selectedDeviceForPlaylist.deviceId._id]: prev[
// //           selectedDeviceForPlaylist.deviceId._id
// //         ]?.filter((id) => id !== playlistId),
// //       }));
// //     } catch (error) {
// //       console.error("Error disconnecting playlist:", error);
// //       toast.error(
// //         error instanceof Error
// //           ? error.message
// //           : "An unknown error occurred."
// //       );
// //     } finally {
// //       setIsDisconnecting(null);
// //     }
// //   };

// //   const resetForm = () => {
// //     setConnectStep(1);
// //     setSelectedDeviceForPlaylist(null);
// //     setSelectedPlaylistsForDevice([]);
// //   };

// //   return (
// //     <div className="bg-white rounded-xl shadow-sm p-6">
// //       <div className="mb-6 border-b pb-4">
// //         <h2 className="text-2xl font-bold text-black">
// //           Connect Playlist to Device
// //         </h2>
// //         <p className="text-sm text-gray-500 mt-1">
// //           Step {connectStep} of 2:{" "}
// //           {connectStep === 1 ? "Select Device" : "Choose Playlists"}
// //         </p>
// //       </div>

// //       {isLoading && connectStep === 1 ? (
// //         <div className="flex justify-center items-center py-8">
// //           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
// //         </div>
// //       ) : connectStep === 1 ? (
// //         <div className="space-y-4">
// //           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
// //             {availableDevices.map((device) => (
// //               <button
// //                 key={device._id}
// //                 onClick={() => {
// //                   if (device._id) {
// //                     setSelectedDeviceForPlaylist(device);
// //                     setConnectStep(2);
// //                   } else {
// //                     toast.error("Invalid device selected");
// //                   }
// //                 }}
// //                 className={`p-4 border rounded-lg text-left transition-all ${
// //                   selectedDeviceForPlaylist?._id === device._id
// //                     ? "border-blue-500 ring-2 ring-blue-500 ring-opacity-50"
// //                     : "hover:border-blue-500"
// //                 }`}
// //               >
// //                 <div className="flex items-center gap-3">
// //                   {device.deviceId.imageUrl ? (
// //                     <img
// //                       src={device.deviceId.imageUrl}
// //                       alt={device.name}
// //                       className="w-12 h-12 rounded-lg object-cover"
// //                     />
// //                   ) : (
// //                     <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
// //                       <Database size={24} className="text-gray-400" />
// //                     </div>
// //                   )}
// //                   <div>
// //                     <h3 className="font-medium text-gray-900">
// //                       {device.deviceId.name || "N/A"}
// //                     </h3>
// //                     <p className="text-sm text-gray-500">
// //                       ID: {device.deviceId.serialNumber || "N/A"}
// //                     </p>
// //                   </div>
// //                 </div>
// //               </button>
// //             ))}
// //           </div>

// //           {availableDevices.length === 0 && !isLoading && (
// //             <p className="text-center text-gray-500 py-4">
// //               No devices available. Please add devices first.
// //             </p>
// //           )}

// //           <div className="flex justify-end gap-3 pt-6 border-t">
// //             <button
// //               onClick={onCancel}
// //               className="px-4 py-2 text-gray-600 hover:text-gray-900"
// //             >
// //               Cancel
// //             </button>
// //           </div>
// //         </div>
// //       ) : (
// //         <div className="space-y-6">
// //           <div className="flex items-center gap-2 mb-6">
// //             <button
// //               onClick={() => {
// //                 setConnectStep(1);
// //                 setSelectedPlaylistsForDevice([]);
// //               }}
// //               className="text-blue-500 hover:text-blue-600 flex items-center gap-1"
// //             >
// //               <ArrowLeft size={20} />
// //               <span>Back to Devices</span>
// //             </button>
// //           </div>

// //           <div className="bg-blue-50 p-4 rounded-lg mb-6">
// //             <h3 className="font-medium text-blue-900">Selected Device</h3>
// //             <p className="text-sm text-blue-700 mt-1">
// //               {selectedDeviceForPlaylist?.name} (
// //               {`${selectedDeviceForPlaylist?.deviceId.name} serial Number :-${selectedDeviceForPlaylist?.deviceId.serialNumber}`}
// //               )
// //             </p>
// //           </div>

// //           {isLoading ? (
// //             <div className="flex justify-center items-center py-8">
// //               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
// //             </div>
// //           ) : (
// //             <div className="space-y-4">
// //               <h3 className="font-medium text-gray-900">
// //                 Available Playlists
// //               </h3>
// //               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
// //                 {playlists.map((playlist) => {
// //                   const isConnected = connectedPlaylists[
// //                     selectedDeviceForPlaylist?.deviceId._id || ""
// //                   ]?.includes(playlist._id || "");

// //                   const isCurrentlyDisconnecting = isDisconnecting === playlist._id;

// //                   return (
// //                     <div
// //                       key={playlist._id}
// //                       className={`p-4 border rounded-lg ${
// //                         isConnected
// //                           ? "border-gray-300 bg-gray-50"
// //                           : selectedPlaylistsForDevice.includes(
// //                               playlist._id || ""
// //                             )
// //                           ? "border-blue-500 bg-blue-50"
// //                           : "hover:border-blue-500"
// //                       }`}
// //                     >
// //                       <div className="flex items-center justify-between">
// //                         <div>
// //                           <h4 className="font-medium text-gray-900 mt-3">
// //                             {playlist.name}
// //                           </h4>
// //                           <p className="text-sm text-gray-500">
// //                             {playlist.files?.length || 0} files
// //                           </p>
// //                         </div>
// //                         <div className="flex items-center gap-2">
// //                           {isConnected ? (
// //                             <button
// //                               onClick={() => handleDisconnect(playlist._id!)}
// //                               disabled={isCurrentlyDisconnecting}
// //                               className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 disabled:opacity-50 disabled:cursor-wait"
// //                             >
// //                               {isCurrentlyDisconnecting ? 'Disconnecting...' : 'Disconnect'}
// //                             </button>
// //                           ) : (
// //                             <input
// //                               type="checkbox"
// //                               checked={selectedPlaylistsForDevice.includes(
// //                                 playlist._id || ""
// //                               )}
// //                               onChange={() => {
// //                                 const playlistId = playlist._id || "";
// //                                 setSelectedPlaylistsForDevice((prev) =>
// //                                   prev.includes(playlistId)
// //                                     ? prev.filter((id) => id !== playlistId)
// //                                     : [...prev, playlistId]
// //                                 );
// //                               }}
// //                               className="h-5 w-5 text-blue-600 rounded"
// //                             />
// //                           )}
// //                         </div>
// //                       </div>
// //                     </div>
// //                   );
// //                 })}
// //               </div>

// //               {playlists.length === 0 && !isLoading && (
// //                 <p className="text-center text-gray-500 py-4">
// //                   No playlists available. Please create playlists first.
// //                 </p>
// //               )}
// //             </div>
// //           )}

// //           <div className="flex justify-end gap-3 pt-6 border-t">
// //             <button
// //               onClick={() => {
// //                 setConnectStep(1);
// //                 setSelectedPlaylistsForDevice([]);
// //               }}
// //               className="px-4 py-2 text-gray-600 hover:text-gray-900"
// //             >
// //               Cancel
// //             </button>
// //             <button
// //               onClick={handleConnectPlaylistToDevice}
// //               disabled={selectedPlaylistsForDevice.length === 0 || isLoading}
// //               className={`px-6 py-2 rounded-lg ${
// //                 selectedPlaylistsForDevice.length === 0 || isLoading
// //                   ? "bg-gray-300 cursor-not-allowed"
// //                   : "bg-blue-500 hover:bg-blue-600"
// //               } text-white`}
// //             >
// //               {isLoading ? (
// //                 <div className="flex items-center gap-2">
// //                   <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
// //                   <span>Connecting...</span>
// //                 </div>
// //               ) : (
// //                 "Connect Playlists"
// //               )}
// //             </button>
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // export default ConnectPlaylist;






// "use client";

// import React, { useState, useEffect } from "react";
// import { Database, ArrowLeft } from "lucide-react";
// import toast from "react-hot-toast";
// import { FaPlay, FaPauseCircle, FaSyncAlt } from "react-icons/fa";

// interface Device {
//   connectedPlaylists: any;
//   status: string;
//   _id: string;
//   name: string;
//   deviceId: {
//     _id: string;
//     serialNumber: string;
//     imageUrl: string;
//     name: string;
//     status: string;
//   };
//   typeId: {
//     _id: string;
//     name: string;
//   };
// }

// interface Playlist {
//   daysOfWeek: string;
//   _id?: string;
//   name: string;
//   files: any[];
//   contentType: string;
// }

// interface ConnectPlaylistProps {
//   onCancel: () => void;
//   onSuccess: () => void;
// }

// const ConnectPlaylist: React.FC<ConnectPlaylistProps> = ({
//   onCancel,
//   onSuccess,
// }) => {
//   const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
//   const [playlists, setPlaylists] = useState<Playlist[]>([]);
//   // const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
//   const [
//     selectedDeviceForPlaylist,
//     setSelectedDeviceForPlaylist,
//   ] = useState<Device | null>(null);
//   // const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
//   const [
//     selectedPlaylistsForDevice,
//     setSelectedPlaylistsForDevice,
//   ] = useState<string[]>([]);
//   const [isLoading, setIsLoading] = useState<boolean>(false);
//    const [
//     connectedPlaylists,
//     setConnectedPlaylists,
//   ] = useState<{ [deviceId: string]: string[] }>({});
//   const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null); // To track which playlist is disconnecting

// console.log("selectedDevice",selectedDeviceForPlaylist)
// console.log("playlists",playlists)
// console.log("availableDevices",availableDevices);

//   // Fetch userId from localStorage or other auth context
//   const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

//   useEffect(() => {
//     if (!userId) {
//       toast.error("User  not logged in");
//       return;
//     }

//     const fetchDevices = async () => {
//       setIsLoading(true);
//       try {
//         const res = await fetch(`/api/onboarded-devices?userId=${userId}`);
//         if (!res.ok) throw new Error("Failed to fetch devices");
//         const data = await res.json();
//         setAvailableDevices(data.data || []);
//       } catch (error) {
//         console.error(error);
//         toast.error("Failed to load devices");
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     const fetchPlaylists = async () => {
//       setIsLoading(true);
//       try {
//         const res = await fetch(`/api/playlists?userId=${userId}`);
//         if (!res.ok) throw new Error("Failed to fetch playlists");
//         const data = await res.json();
//         setPlaylists(data || []);
//       } catch (error) {
//         console.error(error);
//         toast.error("Failed to load playlists");
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     fetchDevices();
//     fetchPlaylists();
//   }, [userId]);

//   const handleConnect = async () => {
//     if (!selectedDeviceForPlaylist) {
//       toast.error("Select a device first");
//       return;
//     }
//     if (selectedPlaylistsForDevice.length === 0) {
//       toast.error("Select at least one playlist");
//       return;
//     }

//     setIsLoading(true);
//     try {
//       const response = await fetch("/api/device-playlists", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           deviceId: selectedDeviceForPlaylist.deviceId._id,
//           playlistIds: selectedPlaylistsForDevice,
//           userId,
//         }),
//       });

//       if (!response.ok) {
//         const data = await response.json();
//         throw new Error(data.error || "Failed to connect playlists");
//       }

//       toast.success("Playlist connected successfully");
//       onSuccess();
//     } catch (error) {
//       toast.error(error instanceof Error ? error.message : "Failed to connect playlists");
//     } finally {
//       setIsLoading(false);
//     }
//   };
//    const fetchConnectedPlaylists = async (deviceId: string) => {
//     try {
//       const response = await fetch(
//         `/api/connected-playlist?deviceId=${deviceId}`
//       );
//       if (!response.ok) throw new Error("Failed to fetch connected playlists");
//       const data = await response.json();
//       setConnectedPlaylists((prev) => ({
//         ...prev,
//         [deviceId]: data.playlistIds || [],
//       }));
//     } catch (error) {
//       console.error("Error fetching connected playlists:", error);
//       toast.error("Failed to fetch connected playlists");
//     }
//   };
//    const handleDisconnect = async (playlistId: string) => {
//     if (!selectedDeviceForPlaylist?.deviceId._id) {
//       toast.error("No device selected.");
//       return;
//     }

//     setIsDisconnecting(playlistId);
//     try {
//       const response = await fetch(
//         `/api/device-playlists?deviceId=${selectedDeviceForPlaylist.deviceId._id}&playlistId=${playlistId}`,
//         {
//           method: "DELETE",
//         }
//       );

//       if (!response.ok) {
//         const data = await response.json();
//         throw new Error(data.error || "Failed to disconnect playlist.");
//       }

//       toast.success("Playlist disconnected successfully.");

//       // Update the UI
//       setConnectedPlaylists((prev) => ({
//         ...prev,
//         [selectedDeviceForPlaylist.deviceId._id]: prev[
//           selectedDeviceForPlaylist.deviceId._id
//         ]?.filter((id) => id !== playlistId),
//       }));
//     } catch (error) {
//       console.error("Error disconnecting playlist:", error);
//       toast.error(
//         error instanceof Error
//           ? error.message
//           : "An unknown error occurred."
//       );
//     } finally {
//       setIsDisconnecting(null);
//     }
//   };
// useEffect(() => {
//     if (selectedDeviceForPlaylist?.deviceId._id) {
//       fetchConnectedPlaylists(selectedDeviceForPlaylist.deviceId._id);
//     }
//   }, [selectedDeviceForPlaylist]);
//   return (
//     <div className="bg-[#f0f9fb] min-h-screen p-6">
//       <h2 className="text-xl font-bold mb-6">Connect playlist to device</h2>

//       {/* Devices section */}
//       <h3 className="text-lg font-semibold mb-3">Available Devices</h3>
//       {isLoading && availableDevices.length === 0 ? (
//         <p>Loading devices...</p>
//       ) : availableDevices.length === 0 ? (
//         <p>No devices available.</p>
//       ) : (
//         // <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
//         //   {availableDevices.map((device) => (
//         //     <div
//         //       key={device._id}
//         //       className={`bg-[#0d2d39] text-white rounded-xl p-4 flex flex-col shadow-md cursor-pointer ${
//         //         selectedDevice?._id === device._id ? "ring-2 ring-blue-400" : ""
//         //       }`}
//         //       onClick={() => setSelectedDevice(device)}
//         //     >
//         //       <div className="flex-1">
//         //         <div className="text-center mb-4">
//         //           <img
//         //             src={device.deviceId.imageUrl}
//         //             alt={device.deviceId.name}
//         //             className="mx-auto w-12 h-12"
//         //           />
//         //         </div>
//         //         <h4 className="font-bold text-lg">{device.name}</h4>
//         //         <p className="text-xs opacity-80">
//         //           {/* Type: {device.typeId.name} | Zone: Entrance */}
//         //         </p>
//         //         <div className="mt-3 space-y-1 text-sm">
//         //           <p className="flex items-center gap-2">
//         //             <span className="w-2 h-2 bg-green-500 rounded-full"></span>{" "}
//         //             Online
//         //           </p>
//         //           <p className="flex items-center gap-2">
//         //             <FaSyncAlt className="w-3 h-3" /> Last sync - 5 min ago
//         //           </p>
//         //           <p className="flex items-center gap-2 text-red-400">
//         //             <FaPauseCircle className="w-4 h-4" /> Playlist is not connected
//         //           </p>
//         //         </div>
//         //       </div>
//         //       <div className="flex justify-between mt-4 border-t border-gray-700 pt-2 text-sm">
//         //         <button
//         //           className="hover:underline"
//         //           onClick={() => setSelectedDevice(device)}
//         //         >
//         //           Select
//         //         </button>
//         //         <button className="hover:underline">Restart</button>
//         //         <button className="hover:underline">Reassign</button>
//         //       </div>
//         //     </div>
//         //   ))}
//         // </div>
//         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-10">
//   {availableDevices.map((device) => {
//     const imageUrl = device.deviceId?.imageUrl || "/placeholder.jpg";
//     const deviceName = device.deviceId?.name || device.name;

//     return (
//       <div
//         key={device._id}
//         className={`bg-[#0f3b50] text-white rounded-2xl shadow-lg overflow-hidden cursor-pointer transform hover:scale-105 transition-transform ${
//           selectedDeviceForPlaylist?._id === device._id ? "ring-2 ring-blue-400" : ""
//         }`}
//         onClick={() => setSelectedDeviceForPlaylist(device)}
//       >
//         {/* Device Image */}
//         <div className="relative h-40 w-full bg-gray-800">
//           <img
//             src={imageUrl}
//             alt={deviceName}
//             className="h-full w-full object-cover"
//           />
//           {device.status === "active" && (
//             <span className="absolute top-3 right-3 w-3 h-3 bg-green-500 rounded-full border border-white"></span>
//           )}
//         </div>

//         {/* Device Info */}
//         <div className="p-4 flex flex-col gap-2">
//           <h4 className="font-bold text-lg truncate">{device.deviceId?.name}</h4>
           
//           <p className="text-xs text-gray-300 truncate">
//             Serial: {device.deviceId?.serialNumber || "N/A"}
//           </p>
//           <div className="flex flex-col gap-1 text-sm">
//             {/* <p className="flex items-center gap-2 text-green-400">
//               <FaSyncAlt className="w-3 h-3" /> Last sync - 5 min ago
//             </p>
//             <p className="flex items-center gap-2 text-red-400">
//               <FaPauseCircle className="w-4 h-4" /> Playlist not connected
//             </p> */}
//           </div>
//         </div>

//         {/* Action Buttons */}
//         <div className="flex justify-around bg-[#0b2735] py-3 text-sm font-medium border-t border-gray-700">
//           <button
//             className="hover:text-blue-400 transition-colors"
//             onClick={(e) => {
//               e.stopPropagation();
//               setSelectedDeviceForPlaylist(device);
//             }}
//           >
//             Select
//           </button>
//           <button className="text-gray-500 cursor-not-allowed"
//      disabled>Restart</button>
//           <button className="text-gray-500 cursor-not-allowed"
//     disabled>Reassign</button>
//         </div>
//       </div>
//     );
//   })}
// </div>

//       )}

//       {/* Selected device & Playlists section */}
//       {selectedDeviceForPlaylist && (
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white rounded-xl p-6 shadow">
//           {/* Selected Device */}
//           {/* <div className="border border-dashed border-gray-300 rounded-lg p-4">
//             <h4 className="font-semibold mb-3">Your selected device</h4>
//             <div className="flex items-center gap-3">
//               <img
//                 src={selectedDevice.deviceId.imageUrl}
//                 alt={selectedDevice.deviceId.name}
//                 className="w-12 h-12"
//               />
//               <div>
//                 <p className="font-medium">{selectedDevice.name}</p>
                
//                 <p className="text-xs text-green-600">● Online</p>
//                 <p className="text-xs text-red-600">
//                   ⚠ Playlist is not connected
//                 </p>
//               </div>
//             </div>
//             <button
//               onClick={() => setSelectedDevice(null)}
//               className="mt-4 px-3 py-1 border rounded-lg text-sm text-gray-600 hover:bg-gray-100"
//             >
//               Switch device
//             </button>
//           </div> */}
//           <div className="flex flex-col ">
//   {/* Title outside the border */}
//   {/* <h3 className="font-bold text-[#00353E] mb-2 text-sm self-start"> */}
//      <h3 className="font-semibold mb-3">Your selected device</h3>
//     {/* Your selected device
//   </h3> */}

//   {/* Device card box */}
//   <div className="border-2 border-dashed border-[#FFB6A3] mt-6 rounded-xl p-6 text-center w-[300px] bg-white">
//     {/* Device Icon */}
//     <div className="flex justify-center mb-3">
//       <img
//         src={selectedDeviceForPlaylist.deviceId.imageUrl}
//         alt={selectedDeviceForPlaylist.deviceId.name}
//         className="w-14 h-14"
//       />
//     </div>

//     {/* Device Name */}
//     <p className="text-base font-semibold text-[#00353E] mb-1">
//       {selectedDeviceForPlaylist.deviceId.name}
//     </p>

//     {/* Device Type & Zone */}
//     <p className="text-xs text-gray-500 mb-3">
//       {/* Type: {selectedDevice.typeId.name} | Zone: Entrance */}
//     </p>

//     {/* Status Info */}
//     <div className="flex justify-center items-center gap-3 text-xs mb-4">
//       <span className="flex items-center gap-1 text-green-600">
//         <span className="w-2 h-2 bg-green-600 rounded-full"></span>  {selectedDeviceForPlaylist.deviceId.status}
//       </span>
//       <span className="flex items-center gap-1 text-orange-500">
//         {/* ⟳ */}
//          {selectedDeviceForPlaylist.deviceId.serialNumber}
//       </span>
//       {/* <span className="flex items-center gap-1 text-red-500">
//         ⚠ Nothing is connected
//       </span> */}
//     </div>

//     {/* Switch Button */}
//     <button
//       onClick={() => setSelectedDeviceForPlaylist(null)}
//       className="px-4 py-1 border border-[#00353E] rounded-lg text-xs text-[#00353E] hover:bg-[#00353E] hover:text-white transition-all"
//     >
//       Switch device
//     </button>
//   </div>
// </div>


//           {/* Playlists */}
//           <div>
//             <h3 className="font-semibold mb-3">Available Announcement</h3>
//             {isLoading && playlists.length === 0 ? (
//               <p>Loading playlists...</p>
//             ) : playlists.length === 0 ? (
//               <p>No playlists available.</p>
//             ) : (
//               <div className="space-y-3">
//                 {/* {playlists.map((pl) => ( */}
//                {playlists.map((playlist) => {
//                   const isConnected = connectedPlaylists[
//                     selectedDeviceForPlaylist?.deviceId._id || ""
//                   ]?.includes(playlist._id || "");

//                   const isCurrentlyDisconnecting = isDisconnecting === playlist._id;

//                   return (    
//                   <div
//                     key={playlist._id}
//                     className="flex justify-between items-center bg-[#e8f8fc] p-3 rounded-lg"
//                   >
//                     <div>
//                       <p className="font-medium">{playlist.name}</p>
//                       <p className="text-xs text-gray-500">
//                          {playlist.files.length} Tracks
//                       </p>
//                       {/* <p className="text-xs text-gray-500">
//                          Schedule : {pl.daysOfWeek} 
//                       </p> */}
//                       <p className="text-xs text-gray-500">
//   Schedule: {Array.isArray(playlist.daysOfWeek) ? playlist.daysOfWeek.join(" | ") : playlist.daysOfWeek}
// </p>

//                     </div>
//                     {/* <input
//                       type="checkbox"
//                       checked={selectedPlaylistsForDevice.includes(pl._id!)}
//                       onChange={() => {
//                         setSelectedPlaylistsForDevice((prev) =>
//                           prev.includes(pl._id!)
//                             ? prev.filter((id) => id !== pl._id)
//                             : [...prev, pl._id!]
//                         );
//                       }}
//                       // className="h-4 w-4"
//                        className="accent-[#FF4500] w-5 h-5"
//                     /> */}
//                     {isConnected ? (
//                             <button
//                               onClick={() => handleDisconnect(playlist._id!)}
//                               disabled={isCurrentlyDisconnecting}
//                               className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 disabled:opacity-50 disabled:cursor-wait"
//                             >
//                               {isCurrentlyDisconnecting ? 'Disconnecting...' : 'Disconnect'}
//                             </button>
//                           ) : (
//                             <input
//                               type="checkbox"
//                               checked={selectedPlaylistsForDevice.includes(
//                                 playlist._id || ""
//                               )}
//                               onChange={() => {
//                                 const playlistId = playlist._id || "";
//                                 setSelectedPlaylistsForDevice((prev) =>
//                                   prev.includes(playlistId)
//                                     ? prev.filter((id) => id !== playlistId)
//                                     : [...prev, playlistId]
//                                 );
//                               }}
//                               // className="h-5 w-5 text-blue-600 rounded"
//                                className="accent-[#FF4500] w-5 h-5 rounded"
//                             />
//                           )}
                    

//                   </div>
//                   );
//                 })}
//                 {/* ))} */}
//               </div>
//             )}
//           </div>
//         </div>
//       )}

//       {/* Actions */}
//       {selectedDeviceForPlaylist && (
//         <div className="flex justify-center gap-3 mt-6">
//           <button
//             onClick={onCancel}
//             className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-100"
//           >
//             Cancel
//           </button>
//           <button
//             onClick={handleConnect}
//             disabled={isLoading}
//             className="px-6 py-2 rounded-lg bg-[#07323C] text-white hover:bg-[#006377]"
//           >
//             {isLoading ? "Connecting..." : "Connect playlist"}
//           </button>
//         </div>
//       )}
//     </div>
//   );
// };

// export default ConnectPlaylist;





"use client";

import React, { useState, useEffect } from "react";
import { Database, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { FaPlay, FaPauseCircle, FaSyncAlt } from "react-icons/fa";

interface Device {
  connectedPlaylists: any;
  status: string;
  _id: string;
  name: string;
  deviceId: {
    _id: string;
    serialNumber: string;
    imageUrl: string;
    name: string;
    status: string;
  };
  typeId: {
    _id: string;
    name: string;
  };
}

interface Playlist {
  daysOfWeek: string;
  _id?: string;
  name: string;
  files: any[];
  contentType: string;
}

interface ConnectPlaylistProps {
  onCancel: () => void;
  onSuccess: () => void;
}

const ConnectPlaylist: React.FC<ConnectPlaylistProps> = ({
  onCancel,
  onSuccess,
}) => {
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  // const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [
    selectedDeviceForPlaylist,
    setSelectedDeviceForPlaylist,
  ] = useState<Device | null>(null);
  // const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);
  const [
    selectedPlaylistsForDevice,
    setSelectedPlaylistsForDevice,
  ] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
   const [
    connectedPlaylists,
    setConnectedPlaylists,
  ] = useState<{ [deviceId: string]: string[] }>({});
  const [isDisconnecting, setIsDisconnecting] = useState<string | null>(null); // To track which playlist is disconnecting

console.log("selectedDevice",selectedDeviceForPlaylist)
console.log("playlists",playlists)
console.log("availableDevices",availableDevices);

  // Fetch userId from localStorage or other auth context
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  useEffect(() => {
    if (!userId) {
      toast.error("User  not logged in");
      return;
    }

    const fetchDevices = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/onboarded-devices?userId=${userId}`);
        if (!res.ok) throw new Error("Failed to fetch devices");
        const data = await res.json();
        setAvailableDevices(data.data || []);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load devices");
      } finally {
        setIsLoading(false);
      }
    };

    const fetchPlaylists = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/playlists?userId=${userId}`);
        if (!res.ok) throw new Error("Failed to fetch playlists");
        const data = await res.json();
        setPlaylists(data || []);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load playlists");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDevices();
    fetchPlaylists();
  }, [userId]);

  const handleConnect = async () => {
    if (!selectedDeviceForPlaylist) {
      toast.error("Select a device first");
      return;
    }
    if (selectedPlaylistsForDevice.length === 0) {
      toast.error("Select at least one playlist");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/device-playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: selectedDeviceForPlaylist.deviceId._id,
          playlistIds: selectedPlaylistsForDevice,
          userId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to connect playlists");
      }

      toast.success("Playlist connected successfully");
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to connect playlists");
    } finally {
      setIsLoading(false);
    }
  };
   const fetchConnectedPlaylists = async (deviceId: string) => {
    try {
      const response = await fetch(
        `/api/connected-playlist?deviceId=${deviceId}`
      );
      if (!response.ok) throw new Error("Failed to fetch connected playlists");
      const data = await response.json();
      setConnectedPlaylists((prev) => ({
        ...prev,
        [deviceId]: data.playlistIds || [],
      }));
    } catch (error) {
      console.error("Error fetching connected playlists:", error);
      toast.error("Failed to fetch connected playlists");
    }
  };
   const handleDisconnect = async (playlistId: string) => {
    if (!selectedDeviceForPlaylist?.deviceId._id) {
      toast.error("No device selected.");
      return;
    }

    setIsDisconnecting(playlistId);
    try {
      const response = await fetch(
        `/api/device-playlists?deviceId=${selectedDeviceForPlaylist.deviceId._id}&playlistId=${playlistId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to disconnect playlist.");
      }

      toast.success("Playlist disconnected successfully.");

      // Update the UI
      setConnectedPlaylists((prev) => ({
        ...prev,
        [selectedDeviceForPlaylist.deviceId._id]: prev[
          selectedDeviceForPlaylist.deviceId._id
        ]?.filter((id) => id !== playlistId),
      }));
    } catch (error) {
      console.error("Error disconnecting playlist:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "An unknown error occurred."
      );
    } finally {
      setIsDisconnecting(null);
    }
  };
useEffect(() => {
    if (selectedDeviceForPlaylist?.deviceId._id) {
      fetchConnectedPlaylists(selectedDeviceForPlaylist.deviceId._id);
    }
  }, [selectedDeviceForPlaylist]);
  return (
    <div className="bg-[#f0f9fb] min-h-screen p-6">
      <h2 className="text-xl font-bold mb-6">Connect playlist to device</h2>

      {/* Devices section */}
      <h3 className="text-lg font-semibold mb-3">Available Devices</h3>
      {isLoading && availableDevices.length === 0 ? (
        <p>Loading devices...</p>
      ) : availableDevices.length === 0 ? (
        <p>No devices available.</p>
      ) : (
        // <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        //   {availableDevices.map((device) => (
        //     <div
        //       key={device._id}
        //       className={`bg-[#0d2d39] text-white rounded-xl p-4 flex flex-col shadow-md cursor-pointer ${
        //         selectedDevice?._id === device._id ? "ring-2 ring-blue-400" : ""
        //       }`}
        //       onClick={() => setSelectedDevice(device)}
        //     >
        //       <div className="flex-1">
        //         <div className="text-center mb-4">
        //           <img
        //             src={device.deviceId.imageUrl}
        //             alt={device.deviceId.name}
        //             className="mx-auto w-12 h-12"
        //           />
        //         </div>
        //         <h4 className="font-bold text-lg">{device.name}</h4>
        //         <p className="text-xs opacity-80">
        //           {/* Type: {device.typeId.name} | Zone: Entrance */}
        //         </p>
        //         <div className="mt-3 space-y-1 text-sm">
        //           <p className="flex items-center gap-2">
        //             <span className="w-2 h-2 bg-green-500 rounded-full"></span>{" "}
        //             Online
        //           </p>
        //           <p className="flex items-center gap-2">
        //             <FaSyncAlt className="w-3 h-3" /> Last sync - 5 min ago
        //           </p>
        //           <p className="flex items-center gap-2 text-red-400">
        //             <FaPauseCircle className="w-4 h-4" /> Playlist is not connected
        //           </p>
        //         </div>
        //       </div>
        //       <div className="flex justify-between mt-4 border-t border-gray-700 pt-2 text-sm">
        //         <button
        //           className="hover:underline"
        //           onClick={() => setSelectedDevice(device)}
        //         >
        //           Select
        //         </button>
        //         <button className="hover:underline">Restart</button>
        //         <button className="hover:underline">Reassign</button>
        //       </div>
        //     </div>
        //   ))}
        // </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-10">
  {availableDevices.map((device) => {
    const imageUrl = device.deviceId?.imageUrl || "/placeholder.jpg";
    const deviceName = device.deviceId?.name || device.name;

    return (
      <div
        key={device._id}
        className={`bg-[#0f3b50] text-white rounded-2xl shadow-lg overflow-hidden cursor-pointer transform hover:scale-105 transition-transform ${
          selectedDeviceForPlaylist?._id === device._id ? "ring-2 ring-blue-400" : ""
        }`}
        onClick={() => setSelectedDeviceForPlaylist(device)}
      >
        {/* Device Image */}
        <div className="relative w-full overflow-hidden rounded-t-xl">
  <img
    src={device.deviceId.imageUrl ?? "/default-device-image.png"}
    alt={device.deviceId.name}
    loading="lazy"
    className="w-full h-auto object-cover"
  />
          {device.status === "active" && (
            <span className="absolute top-3 right-3 w-3 h-3 bg-green-500 rounded-full border border-white"></span>
          )}
        </div>

        {/* Device Info */}
        <div className="p-4 flex flex-col gap-2">
          <h4 className="font-bold text-lg truncate">{device.deviceId?.name}</h4>
           
          <p className="text-xs text-gray-300 truncate">
            Serial: {device.deviceId?.serialNumber || "N/A"}
          </p>
          <div className="flex flex-col gap-1 text-sm">
            {/* <p className="flex items-center gap-2 text-green-400">
              <FaSyncAlt className="w-3 h-3" /> Last sync - 5 min ago
            </p>
            <p className="flex items-center gap-2 text-red-400">
              <FaPauseCircle className="w-4 h-4" /> Playlist not connected
            </p> */}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-around bg-[#0b2735] py-3 text-sm font-medium border-t border-gray-700">
          <button
            className="hover:text-blue-400 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDeviceForPlaylist(device);
            }}
          >
            Select
          </button>
          <button className="text-gray-500 cursor-not-allowed"
     disabled>Restart</button>
          <button className="text-gray-500 cursor-not-allowed"
    disabled>Reassign</button>
        </div>
      </div>
    );
  })}
</div>

      )}

      {/* Selected device & Playlists section */}
      {selectedDeviceForPlaylist && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white rounded-xl p-6 shadow">
          {/* Selected Device */}
          {/* <div className="border border-dashed border-gray-300 rounded-lg p-4">
            <h4 className="font-semibold mb-3">Your selected device</h4>
            <div className="flex items-center gap-3">
              <img
                src={selectedDevice.deviceId.imageUrl}
                alt={selectedDevice.deviceId.name}
                className="w-12 h-12"
              />
              <div>
                <p className="font-medium">{selectedDevice.name}</p>
                
                <p className="text-xs text-green-600">● Online</p>
                <p className="text-xs text-red-600">
                  ⚠ Playlist is not connected
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedDevice(null)}
              className="mt-4 px-3 py-1 border rounded-lg text-sm text-gray-600 hover:bg-gray-100"
            >
              Switch device
            </button>
          </div> */}
          <div className="flex flex-col ">
  {/* Title outside the border */}
  {/* <h3 className="font-bold text-[#00353E] mb-2 text-sm self-start"> */}
     <h3 className="font-semibold mb-3">Your selected device</h3>
    {/* Your selected device
  </h3> */}

  {/* Device card box */}
  <div className="border-2 border-dashed border-[#FFB6A3] mt-6 rounded-xl p-6 text-center w-[300px] bg-white">
    {/* Device Icon */}
    <div className="flex justify-center mb-3">
      <img
        src={selectedDeviceForPlaylist.deviceId.imageUrl}
        alt={selectedDeviceForPlaylist.deviceId.name}
        className="w-14 h-14"
      />
    </div>

    {/* Device Name */}
    <p className="text-base font-semibold text-[#00353E] mb-1">
      {selectedDeviceForPlaylist.deviceId.name}
    </p>

    {/* Device Type & Zone */}
    <p className="text-xs text-gray-500 mb-3">
      {/* Type: {selectedDevice.typeId.name} | Zone: Entrance */}
    </p>

    {/* Status Info */}
    <div className="flex justify-center items-center gap-3 text-xs mb-4">
      <span className="flex items-center gap-1 text-green-600">
        <span className="w-2 h-2 bg-green-600 rounded-full"></span>  {selectedDeviceForPlaylist.deviceId.status}
      </span>
      <span className="flex items-center gap-1 text-orange-500">
        {/* ⟳ */}
         {selectedDeviceForPlaylist.deviceId.serialNumber}
      </span>
      {/* <span className="flex items-center gap-1 text-red-500">
        ⚠ Nothing is connected
      </span> */}
    </div>

    {/* Switch Button */}
    <button
      onClick={() => setSelectedDeviceForPlaylist(null)}
      className="px-4 py-1 border border-[#00353E] rounded-lg text-xs text-[#00353E] hover:bg-[#00353E] hover:text-white transition-all"
    >
      Switch device
    </button>
  </div>
</div>


          {/* Playlists */}
          <div>
            <h3 className="font-semibold mb-3">Available Announcement</h3>
            {isLoading && playlists.length === 0 ? (
              <p>Loading playlists...</p>
            ) : playlists.length === 0 ? (
              <p>No playlists available.</p>
            ) : (
              <div className="space-y-3">
                {/* {playlists.map((pl) => ( */}
               {playlists.map((playlist) => {
                  const isConnected = connectedPlaylists[
                    selectedDeviceForPlaylist?.deviceId._id || ""
                  ]?.includes(playlist._id || "");

                  const isCurrentlyDisconnecting = isDisconnecting === playlist._id;

                  return (    
                  <div
                    key={playlist._id}
                    className="flex justify-between items-center bg-[#e8f8fc] p-3 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{playlist.name}</p>
                      <p className="text-xs text-gray-500">
                         {playlist.files.length} Tracks
                      </p>
                      {/* <p className="text-xs text-gray-500">
                         Schedule : {pl.daysOfWeek} 
                      </p> */}
                      <p className="text-xs text-gray-500">
  Schedule: {Array.isArray(playlist.daysOfWeek) ? playlist.daysOfWeek.join(" | ") : playlist.daysOfWeek}
</p>

                    </div>
                    {/* <input
                      type="checkbox"
                      checked={selectedPlaylistsForDevice.includes(pl._id!)}
                      onChange={() => {
                        setSelectedPlaylistsForDevice((prev) =>
                          prev.includes(pl._id!)
                            ? prev.filter((id) => id !== pl._id)
                            : [...prev, pl._id!]
                        );
                      }}
                      // className="h-4 w-4"
                       className="accent-[#FF4500] w-5 h-5"
                    /> */}
                    {isConnected ? (
                            <button
                              onClick={() => handleDisconnect(playlist._id!)}
                              disabled={isCurrentlyDisconnecting}
                              className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 disabled:opacity-50 disabled:cursor-wait"
                            >
                              {isCurrentlyDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                            </button>
                          ) : (
                            <input
                              type="checkbox"
                              checked={selectedPlaylistsForDevice.includes(
                                playlist._id || ""
                              )}
                              onChange={() => {
                                const playlistId = playlist._id || "";
                                setSelectedPlaylistsForDevice((prev) =>
                                  prev.includes(playlistId)
                                    ? prev.filter((id) => id !== playlistId)
                                    : [...prev, playlistId]
                                );
                              }}
                              // className="h-5 w-5 text-blue-600 rounded"
                               className="accent-[#FF4500] w-5 h-5 rounded"
                            />
                          )}
                    

                  </div>
                  );
                })}
                {/* ))} */}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {selectedDeviceForPlaylist && (
        <div className="flex justify-center gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="px-6 py-2 rounded-lg bg-[#07323C] text-white hover:bg-[#006377]"
          >
            {isLoading ? "Connecting..." : "Connect playlist"}
          </button>
        </div>
      )}
    </div>
  );
};

export default ConnectPlaylist;

