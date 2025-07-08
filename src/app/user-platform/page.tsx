"use client";
import React, { useState, useEffect } from "react";
import Button from "@/components/Platform/Button";
import Card from "@/components/Platform/Card";
import DashboardView from "@/components/Platform/views/DashboardView";
import { FaRobot, FaRegFileAudio, FaListAlt, FaPlug, FaCode, FaEye } from "react-icons/fa";
import { RiDashboardLine } from "react-icons/ri";
import { MdOutlinePlaylistPlay } from "react-icons/md";
import { Device, Playlist, MenuKey, DeviceFormData } from "@/components/Platform/types";
import PlaylistSetup from "@/components/PlaylistSetup/PlaylistSetup";
import CreateMedia from "@/components/CreateMedia/createMedia";
import ShowMedia from "@/components/ShowMedia/showMedia";
import ConnectPlaylist from "@/components/ConnectPlaylist/connectPlaylist";
import LoadingState from "@/components/Platform/LoadingState";
import PlaylistManager from "@/components/ShowPlaylist/showPlaylist";
import FloorMapUploader from "@/components/FloorMapUploader/FloorMapUploader";

import toast from "react-hot-toast";

// Add new interfaces for user data
interface UserData {
  _id: string;
  username: string;
  role: string;
  blockCoding?: boolean;
  peopleDetection?: boolean;
}

export default function UserPlatform(): React.ReactElement {
  const [selectedMenu, setSelectedMenu] = useState<MenuKey>("dashboard");
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const userRole = localStorage.getItem("userRole");
    if (userRole === "user") {
      toast.success("Welcome User!");
    } else {
      toast.error("You are not authorized to access this page.");
      window.location.href = "/login"; // Redirect to login page
    }
    
    // Fetch user data to check for blockCoding and peopleDetection
    const fetchUserData = async () => {
      try {
        const userId = localStorage.getItem("userId");
        if (!userId) return;

        const response = await fetch(`/api/user/users?userId=${userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
           setUserData(data);

          console.log("User data fetched successfully:", data);
          
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    };

    const fetchAssignedDevices = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const userId = localStorage.getItem("userId");
       
        if (!userId) {
          setError("Please log in to view devices");
          return;
        }

        const response = await fetch(`/api/assign-device?userId=${userId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch assigned devices');
        }

        const data = await response.json();
        console.log(data.data, "data");
        
        // Check if data exists and has the correct structure
        if (data?.success && Array.isArray(data.data) && data.data.length > 0) {
          // Create mapped devices array with proper null checks
          const mappedDevices = data.data.map((assignment: any) => {
            // Log each device for debugging
            console.log('Mapping device:', assignment.deviceId);
            
            // Safety check - make sure deviceId exists
            if (!assignment || !assignment.deviceId) {
              console.error('Invalid device assignment:', assignment);
              return null; // Return null for invalid entries
            }

            return {
                _id: assignment._id || 'unknown-id',
                deviceId: {
                  _id: assignment.deviceId._id || 'unknown-device-id',
                  name: assignment.deviceId.name || 'Unknown Device',
                  serialNumber: assignment.deviceId.serialNumber || 'N/A',
                  status: assignment.deviceId.status || 'inactive',
                  // Provide a default image URL to prevent undefined errors
                  imageUrl: assignment.deviceId.imageUrl || '/default-device-image.png'
                },
                typeId: {
                  _id: assignment.deviceId.typeId?._id || 'unknown-type',
                  name: assignment.deviceId.typeId?.name || 'Standard Device'
                  
                },
                userId: {
                  _id: userId
                },
                connectedPlaylists: [],  // Initialize with empty array
                createdAt: assignment.assignedAt || new Date().toISOString(),
                updatedAt: assignment.updatedAt || new Date().toISOString(),
                __v: 0,
                status: assignment.deviceId.status === "active" ? "Connected" : "Disconnected",
                lastActive: assignment.updatedAt 
                  ? new Date(assignment.updatedAt).toLocaleString()
                  : new Date().toLocaleString()
              };
            }).filter(Boolean); // Filter out any null values

          // Log mapped devices before setting state
          console.log('Mapped devices array:', mappedDevices);
          
          // Set devices state
          setDevices(mappedDevices);
          
          // Verify devices were set
          console.log('Devices state updated');
        } else {
          console.log('No devices found or invalid data structure:', data);
          setDevices([]); // Set empty array if no devices found
        }
      } catch (err) {
        console.error("Error fetching devices:", err);
        setError(err instanceof Error ? err.message : "Failed to load devices");
        setDevices([]); // Set empty array on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
    fetchAssignedDevices();
  }, []);

  // Add a separate useEffect to monitor devices state changes
  useEffect(() => {
    console.log('Devices state changed:', devices);
  }, [devices]);

  const handleEditDevice = async (device: Device): Promise<void> => {
    try {
      const newStatus = device.status === "Connected" ? "Disconnected" : "Connected";
      const apiStatus = newStatus === "Connected" ? "active" : "inactive";

      const response = await fetch(`/api/assigned-devices/${device._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: apiStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update device");
      }

      const data = await response.json();
      if (data.success) {
        setDevices(
          devices.map((d) =>
            d._id === device._id
              ? {
                  ...d,
                  status: newStatus,
                  lastActive: new Date().toLocaleString(),
                }
              : d
          )
        );
      }
    } catch (err) {
      console.error("Error updating device:", err);
      setError(err instanceof Error ? err.message : "Failed to update device");
    }
  };

  // Base menu items
  const baseMenuItems = [
    { key: "dashboard" as MenuKey, label: "Dashboard", icon: <RiDashboardLine /> },
    { key: "createMedia" as MenuKey, label: "Create Media", icon: <FaRegFileAudio /> },
    { key: "showMedia" as MenuKey, label: "Show Media", icon: <FaRegFileAudio /> },
    { key: "setupPlaylist" as MenuKey, label: "Setup Playlist", icon: <FaListAlt /> },
    { key: "showPlaylist" as MenuKey, label: "Show Playlist", icon: <MdOutlinePlaylistPlay /> },
    { key: "connectPlaylist" as MenuKey, label: "Connect Playlist", icon: <FaPlug /> },
  ];
   const handleBlockCodingClick = () => {
    // Navigate to Block Coding page
    window.location.href = "/block-code";
  };

  // Function to handle People Detection navigation
  const handlePeopleDetectionClick = () => {
    // Navigate to People Detection page
    window.location.href = "/people-detection";
  };

  // Conditional menu items based on user permissions
  const conditionalMenuItems = [];
  
  if (userData?.blockCoding) {
    conditionalMenuItems.push({
      key: "blockCoding" as MenuKey,
      label: "Block Coding",
      icon: <FaCode />
    });
  }

if (userData?.peopleDetection) {
  conditionalMenuItems.push(
    {
      key: "peopleDetection" as MenuKey,
      label: "People Detection",
      icon: <FaEye />,
    },
    {
      key: "uploadFloorMap" as MenuKey,
      label: "Upload Floor Map",
      icon: <FaPlug />,
    }
  );
}


  // Combine all menu items
  const menuItems = [...baseMenuItems, ...conditionalMenuItems];

  const renderContent = (): React.ReactElement => {
    if (isLoading) {
      return <LoadingState />;
    }

    if (error) {
      return (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Devices</h3>
          <p className="text-gray-500 max-w-md mb-6">{error}</p>
          <Button variant="primary" onClick={() => window.location.reload()}>Try Again</Button>
        </Card>
      );
    }

    switch (selectedMenu) {
      case "dashboard":
        return (
          <DashboardView
            devices={devices}
            setDevices={setDevices}
            onAddNew={() => {}} // Empty function since users can't add devices
            onEditDevice={handleEditDevice}
            onManagePlaylists={() => {}} // Empty function since users can't manage playlists directly
            userRole="user"
          />
        );
      case "createMedia":
        return <CreateMedia onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("showMedia")} />;
      case "showMedia":
        return <ShowMedia onCancel={() => setSelectedMenu("dashboard")} />;
      case "setupPlaylist":
        return <PlaylistSetup />;
      case "showPlaylist":
        return <PlaylistManager />;
      case "connectPlaylist":
        return <ConnectPlaylist onCancel={() => setSelectedMenu("dashboard")} onSuccess={() => setSelectedMenu("showPlaylist")} />;
      case "uploadFloorMap":
        return <FloorMapUploader />;
      case "blockCoding":
        return (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <FaCode className="text-blue-500" />
              Block Coding
            </h2>
            <p className="text-gray-600 mb-4">
              Visual programming interface for creating custom logic and automation.
            </p>
            <div className="bg-blue-50 p-6 rounded-lg text-center mb-4">
              <p className="text-blue-700 mb-4">Click below to access the Block Coding interface</p>
              <Button 
                variant="primary" 
                onClick={handleBlockCodingClick}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <FaCode className="mr-2" />
                Go to Block Coding
              </Button>
            </div>
          </Card>
        );
           case "peopleDetection":
        return (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <FaEye className="text-green-500" />
              People Detection
            </h2>
            <p className="text-gray-600 mb-4">
              Monitor and analyze people movement and detection data.
            </p>
            <div className="bg-green-50 p-6 rounded-lg text-center mb-4">
              <p className="text-green-700 mb-4">Click below to access the People Detection interface</p>
              <Button 
                variant="primary" 
                onClick={handlePeopleDetectionClick}
                className="bg-green-600 hover:bg-green-700"
              >
                <FaEye className="mr-2" />
                Go to People Detection
              </Button>
            </div>
          </Card>
        );

      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Select a menu item from the sidebar</p>
          </div>
        );
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50 text-black">
      {/* Mobile Menu Button */}
      <div className="lg:hidden p-4 bg-white border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-bold text-primary-600 flex items-center gap-2 ">
          <FaRobot className="text-primary-500" />
          User Dashboard
        </h2>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          {isMobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`w-full lg:w-64 bg-white shadow-md border-r border-gray-200 lg:block transition-all duration-300 z-20 ${
        isMobileMenuOpen ? "fixed inset-0 overflow-auto" : "hidden"
      } lg:relative`}>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-primary-600 flex items-center gap-2">
            <FaRobot className="text-primary-500" />
            User Dashboard
          </h2>
          {userData && (
            <p className="text-sm text-gray-500 mt-1">
              Welcome, {userData.username}
            </p>
          )}
        </div>
        
        <nav className="mt-6 px-4">
          {menuItems.map((item) => (
            <div
              key={item.key}
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer rounded-lg transition-all mb-2 ${
                selectedMenu === item.key
                  ? "bg-blue-50 text-blue-600 font-semibold"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
              onClick={() => {
                setSelectedMenu(item.key);
                setIsMobileMenuOpen(false);
              }}
            >
              <span className={`text-lg ${selectedMenu === item.key ? "text-blue-500" : "text-gray-500"}`}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* Show conditional features info */}
        {(userData?.blockCoding || userData?.peopleDetection) && (
          <div className="mt-6 px-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm font-medium text-green-800 mb-1">Special Features</p>
              <div className="text-xs text-green-600">
                {userData?.blockCoding && <div>• Block Coding Enabled</div>}
                {userData?.peopleDetection && <div>• People Detection Enabled</div>}
              </div>
            </div>
          </div>
        )}

        {/* Logout button for mobile */}
        <div className="mt-auto px-4 pb-4 lg:hidden">
          <Button 
            variant="primary" 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12H8m8 4l-4 4m0-8l4-4" />
            </svg>
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        {renderContent()}
      </main>

      {/* Logout Button */}
      <div className="mt-8 px-4">
        <button
          onClick={handleLogout}
          className="w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
}