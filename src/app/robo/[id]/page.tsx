"use client";
import React, { useState } from "react";
import { Sidebar, Menu, MenuItem } from "react-pro-sidebar";
import { FiHome, FiSettings, FiUser, FiMusic, FiDatabase, FiPlusCircle, FiMic } from "react-icons/fi";
import { Card } from "@/components/ui/card";
import { CardContent } from "@/components/ui/cardContent";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import CreateMedia from "@/components/ui/createMedia";
import GenerateVoice from "@/components/ui/GenerateVoice";

export default function AdminDashboard() {
  const [selectedComponent, setSelectedComponent] = useState("dashboard");

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar className="w-64 bg-white shadow-lg flex flex-col">
        <div className="p-4 flex items-center justify-center">
          <Image src="/assets/logo.png" alt="Cento Logo" width={100} height={100} />
        </div>
        <Menu className="w-full">
          <MenuItem
            icon={<FiHome />}
            onClick={() => setSelectedComponent("dashboard")}
            className={selectedComponent === "dashboard" ? "bg-blue-500 text-white rounded-lg" : ""}
          >
            Dashboards
          </MenuItem>
          <MenuItem
            icon={<FiPlusCircle />}
            onClick={() => setSelectedComponent("onboarding")}
            className={selectedComponent === "onboarding" ? "bg-blue-500 text-white rounded-lg" : ""}
          >
            Device Onboarding
          </MenuItem>
          <MenuItem
            icon={<FiMic />}
            onClick={() => setSelectedComponent("generateVoice")}
            className={selectedComponent === "generateVoice" ? "bg-blue-500 text-white rounded-lg" : ""}
          >
            Generate Voice
          </MenuItem>
          <MenuItem
            icon={<FiMusic />}
            onClick={() => setSelectedComponent("createMedia")}
            className={selectedComponent === "createMedia" ? "bg-blue-500 text-white rounded-lg" : ""}
          >
            Create Playlist
          </MenuItem>
          <MenuItem
            icon={<FiDatabase />}
            onClick={() => setSelectedComponent("viewPlaylists")}
            className={selectedComponent === "viewPlaylists" ? "bg-blue-500 text-white rounded-lg" : ""}
          >
            View Playlists
          </MenuItem>
          <MenuItem
            icon={<FiUser />}
            onClick={() => setSelectedComponent("profile")}
            className={selectedComponent === "profile" ? "bg-blue-500 text-white rounded-lg" : ""}
          >
            Profile
          </MenuItem>
          <MenuItem
            icon={<FiSettings />}
            onClick={() => setSelectedComponent("settings")}
            className={selectedComponent === "settings" ? "bg-blue-500 text-white rounded-lg" : ""}
          >
            Settings
          </MenuItem>
        </Menu>
      </Sidebar>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {selectedComponent === "dashboard" && (
          <div>
            <header className="flex justify-between items-center bg-white p-4 rounded shadow">
              <h1 className="text-2xl font-semibold">Dashboard</h1>
              <Button variant="outline">+ Add Channel</Button>
            </header>
            <div className="grid grid-cols-4 gap-4 mt-4">
              <Card>
                <CardContent>
                  <p className="text-sm text-gray-500">Total Channels</p>
                  <h2 className="text-xl font-bold">1252</h2>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-sm text-gray-500">Total Devices</p>
                  <h2 className="text-xl font-bold">1039</h2>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-sm text-gray-500">Total Images</p>
                  <h2 className="text-xl font-bold">4813</h2>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-sm text-gray-500">Total Playlists</p>
                  <h2 className="text-xl font-bold">120</h2>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {selectedComponent === "createMedia" && <CreateMedia />}
        {selectedComponent === "generateVoice" && <GenerateVoice />}
      </div>
    </div>
  );
}
