"use client";
import React, { useState, useEffect } from "react";
import { FaUser, FaLock, FaUserPlus, FaCode, FaCamera, FaCogs, FaStore } from "react-icons/fa";
import Card from "@/components/Platform/Card";
import Button from "@/components/Platform/Button";
import toast from "react-hot-toast";

const CreateUser = () => {
  const [formData, setFormData] = useState({
    storeName: "",
    username: "",
    password: "",
    confirmPassword: "",
    storeLocation: "" // new field for store location
  });
  const [useStoreAsUsername, setUseStoreAsUsername] = useState(true); // new state for checkbox
  const [loading, setLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  useEffect(() => {
    setCurrentUserRole(localStorage.getItem("userRole"));
  }, []);

  const getRoleLabel = () => {
    switch(currentUserRole) {
      case 'admin': return "Reseller";
      case 'reseller': return "Account User";
      case 'superUser': return "Store";
      default: return "Store";
    }
  };

  const getRoleIcon = () => {
    switch(currentUserRole) {
      case 'admin': return <FaUserPlus className="text-indigo-500" />;
      case 'reseller': return <FaUser className="text-indigo-500" />;
      default: return <FaStore className="text-indigo-500" />;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (!formData.storeName.trim()) {
      toast.error("Store name is required");
      return;
    }

    if (!formData.username.trim()) {
      toast.error("Username is required");
      return;
    }

    try {
      const id = localStorage.getItem("userId");
      const currentRole = localStorage.getItem("userRole");
      if (currentRole !== "superUser" && currentRole !== "reseller" && currentRole !== "admin") {
        toast.error("You do not have permission to create a user");
        return;
      }

      let targetRole = "";
      if (currentRole === "admin") targetRole = "reseller";
      else if (currentRole === "reseller") targetRole = "superUser";
      else targetRole = "user";

      setLoading(true);
      const response = await fetch("/api/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeName: formData.storeName, // send store name
          username: formData.username.trim(),
          password: formData.password,
          controllerId: id,
          role: targetRole,
          platform: true, // Platform access is always enabled for all users
          storeLocation: formData.storeLocation // send store location
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create user");
      }

      toast.success(`${getRoleLabel()} created successfully!`);
      setFormData({ 
        storeName: "",
        username: "", 
        password: "", 
        confirmPassword: "", 
        storeLocation: "" // reset store location
      });
      setUseStoreAsUsername(true); // reset checkbox
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  // Handle store name change and optionally update username
  const handleStoreNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const storeName = e.target.value;
    setFormData(prev => ({
      ...prev,
      storeName,
      username: useStoreAsUsername ? storeName : prev.username
    }));
  };

  // Handle username change
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, username: e.target.value });
  };

  // Handle checkbox toggle
  const handleCheckboxToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setUseStoreAsUsername(isChecked);
    
    // If checkbox is checked, sync username with store name
    if (isChecked) {
      setFormData(prev => ({
        ...prev,
        username: prev.storeName
      }));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-gray-900">Create New {getRoleLabel()}</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Store Name Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {getRoleLabel()} Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {getRoleIcon()}
              </div>
              <input
                type="text"
                value={formData.storeName}
                onChange={handleStoreNameChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={`Enter ${getRoleLabel().toLowerCase()} name`}
                required
              />
            </div>
          </div>

          {/* Use Store Name as Username Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="useStoreAsUsername"
              checked={useStoreAsUsername}
              onChange={handleCheckboxToggle}
              className="form-checkbox h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
            />
            <label htmlFor="useStoreAsUsername" className="ml-2 text-sm text-gray-700">
              Use {getRoleLabel().toLowerCase()} name as username
            </label>
          </div>

          {/* Username Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaUser className="text-gray-400" />
              </div>
              <input
                type="text"
                value={formData.username}
                onChange={handleUsernameChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter username"
                required
                disabled={useStoreAsUsername} // Disable when using store name as username
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaLock className="text-gray-400" />
              </div>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaLock className="text-gray-400" />
              </div>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
          </div>          {/* Store Location Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {getRoleLabel()} Location
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {getRoleIcon()}
              </div>
              <input
                type="text"
                value={formData.storeLocation}
                onChange={(e) => setFormData({ ...formData, storeLocation: e.target.value })}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={`Enter ${getRoleLabel().toLowerCase()} location`}
              />
            </div>
          </div>


          <div className="mt-6">
            <Button
              type="submit"
              disabled={loading}
              variant="primary"
              className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
              icon={<FaUserPlus className="mr-2" />}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating...
                </span>
              ) : (
                `Create ${getRoleLabel()}`
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreateUser;