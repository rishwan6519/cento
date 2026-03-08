"use client";

import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

export default function UserSettings() {
  const [userData, setUserData] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [storeLocation, setStoreLocation] = useState("");
  const [storeName, setStoreName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Fetch current user details
    const fetchUser = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      try {
        // Find user by using the controllerId or user fetching endpoint
        // You might need a specific user fetch endpoint if one doesn't exist
        // Here we just pull from localStorage initially, or a dedicated API.
        const storedName = localStorage.getItem("userName") || localStorage.getItem("username") || "";
        setUsername(storedName);

        // Option: if you have a specific user API: 
        const res = await fetch(`/api/user`);
        const data = await res.json();
        if (data.success && data.data.length > 0) {
           const me = data.data.find((u: any) => u._id === userId);
           if (me) {
             setUsername(me.username || "");
             setStoreLocation(me.storeLocation || "");
             setStoreName(me.storeName || "Centelon Main Store"); // fallback
             setUserData(me);
           }
        }
      } catch (err) {
        console.error("Failed to load user settings", err);
      }
    };
    fetchUser();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword && newPassword !== confirmPassword) {
      toast.error("New passwords do not match!");
      return;
    }

    if (newPassword && !currentPassword) {
      toast.error("Current password is required to set a new password.");
      return;
    }

    setIsLoading(true);

    const userId = localStorage.getItem("userId");
    if (!userId) {
      toast.error("User not verified");
      setIsLoading(false);
      return;
    }

    try {
      const payload: any = { username, storeLocation };
      if (newPassword) {
        payload.password = newPassword;
        payload.currentPassword = currentPassword;
      }

      const res = await fetch(`/api/user?userId=${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Account settings updated successfully!");
        localStorage.setItem("username", username);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        throw new Error(data.message || "Failed to update settings");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving settings");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto w-full font-sans">
      <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h2>
        
        <form onSubmit={handleUpdate} className="space-y-6">
          {/* Read Only Store Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store Name <span className="text-xs text-gray-400 font-normal">(Read Only)</span>
            </label>
            <input
              type="text"
              value={storeName || "Loading..."}
              readOnly
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 cursor-not-allowed outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store Location
            </label>
            <input
              type="text"
              value={storeLocation}
              onChange={(e) => setStoreLocation(e.target.value)}
              placeholder="e.g. Melbourne CBD"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
            />
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className={`px-6 py-2.5 bg-[#07323C] text-white rounded-lg font-medium transition-colors ${
                isLoading ? "opacity-70 cursor-not-allowed" : "hover:bg-[#0a4250]"
              }`}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
