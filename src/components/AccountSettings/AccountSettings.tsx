"use client";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { FaUser, FaLock, FaSave } from "react-icons/fa";

const AccountSettings = () => {
  const [username, setUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // We could fetch current username here if needed, 
    // but the PUT endpoint only patches what is sent.
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    if ((newPassword || username) && !currentPassword) {
      toast.error("Current password is required to save changes.");
      return;
    }

    const userId = localStorage.getItem("userId");
    if (!userId) {
      toast.error("User session not found. Please log in again.");
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        currentPassword
      };

      if (username) payload.username = username;
      if (newPassword) payload.password = newPassword;

      const res = await fetch(`/api/user?userId=${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        toast.success("Account settings updated successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        
        // Update local storage if username changed
        if (username) {
          localStorage.setItem("username", username);
          toast.success("Username updated! Please note your new username for next login.", { duration: 5000 });
        }
      } else {
        toast.error(data.message || "Failed to update settings.");
      }
    } catch (err) {
      toast.error("An error occurred while communicating with the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Account Settings</h2>
        <p className="text-slate-500 mt-2">Update your administrator credentials here. Always use a strong password.</p>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 border-b pb-2">Change Profile Credentials</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600 block">New Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaUser className="text-slate-400" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Leaving blank keeps current username"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <label className="text-sm font-semibold text-slate-600 block">New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaLock className="text-slate-400" />
                </div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (optional)"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600 block">Confirm New Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaLock className="text-slate-400" />
                </div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm font-medium"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 bg-orange-50 p-6 rounded-2xl border border-orange-100 space-y-4">
             <h4 className="text-sm font-bold text-orange-800 uppercase tracking-widest">Authentication Required</h4>
             <p className="text-xs text-orange-600">Please provide your current password to authorize any of these changes.</p>
             <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FaLock className="text-orange-400" />
                </div>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current Password"
                  className="w-full pl-11 pr-4 py-3 bg-white border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-sm font-medium"
                />
              </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading || !currentPassword}
              className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 text-sm"
            >
              {loading ? "Saving..." : <><FaSave /> Save Changes</>}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AccountSettings;
