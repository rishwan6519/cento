"use client";
import React, { useState, useEffect } from "react";
import { Users, Plus, Edit, Trash2, Shield, Settings2, PlayCircle, PauseCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function SubUsersView({ 
  creatorId, 
  role, 
  isAccountAdminCreatingStoreStaff = false 
}: { 
  creatorId?: string; 
  role: string;
  isAccountAdminCreatingStoreStaff?: boolean;
}) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  const [stores, setStores] = useState<any[]>([]);

  const storePermissions = [
    { id: "mediaManagement", label: "Create Campaigns / Playlists" },
    { id: "viewAllCampaigns", label: "View All Campaigns" },
    { id: "mediaLibrary", label: "Media Library" },
    { id: "timelineSchedules", label: "Timelines & Schedules" },
    { id: "videoTemplate", label: "Video Templates" },
    { id: "auditLogs", label: "Audit Logs" },
    { id: "offerNotification", label: "Offer Notification" },
    { id: "fallDetectionNotification", label: "Fall Detection Notification" }
  ];

  const adminPermissions = [
    { id: "stores", label: "Store Management" },
    { id: "users", label: "User Management" },
    { id: "video_template", label: "Video Template" },
    { id: "audit_logs", label: "Audit Logs" }
  ];

  // If Account Admin is creating store staff, use store permissions
  const availablePermissions = (role === "store" || isAccountAdminCreatingStoreStaff) ? storePermissions : adminPermissions;

  const [formData, setFormData] = useState({
    username: "",
    password: "",
    operatorName: "",
    email: "",
    phone: "",
    employeeId: "",
    photo: "",
    idProofAttach: "",
    selectedStoreId: "",
    selectedStaffRole: "Custom",
    permissions: availablePermissions.map(p => p.id)
  });

  const fetchStores = async () => {
    if (!creatorId || !isAccountAdminCreatingStoreStaff) return;
    try {
      const res = await fetch(`/api/user?controllerId=${creatorId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setStores(data.data.filter((u:any) => u.role === 'store'));
      }
    } catch (err) {
      console.error("Failed to fetch stores", err);
    }
  };

  const fetchSubUsers = async (targetCreatorId: string) => {
    if (!targetCreatorId) {
      setUsers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/users/sub-users?creatorId=${targetCreatorId}`);
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAccountAdminCreatingStoreStaff) {
      fetchStores();
      if (formData.selectedStoreId) {
        fetchSubUsers(formData.selectedStoreId);
      } else {
        setUsers([]);
        setLoading(false);
      }
    } else {
      fetchSubUsers(creatorId || '');
    }
  }, [creatorId, isAccountAdminCreatingStoreStaff, formData.selectedStoreId]);

  useEffect(() => {
    if (formData.selectedStaffRole === "Admin") {
      setFormData(prev => ({ ...prev, permissions: storePermissions.map(p => p.id) }));
    } else if (formData.selectedStaffRole === "Manager") {
      setFormData(prev => ({ ...prev, permissions: ["mediaManagement", "viewAllCampaigns", "mediaLibrary"] }));
    } else if (formData.selectedStaffRole === "Staff") {
      setFormData(prev => ({ ...prev, permissions: ["viewAllCampaigns"] }));
    }
  }, [formData.selectedStaffRole]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'photo' | 'idProofAttach') => {
    if (!e.target.files || e.target.files.length === 0 || !creatorId) return;
    const file = e.target.files[0];
    
    const uploadData = new FormData();
    uploadData.append('userId', creatorId);
    uploadData.append('files[0]', file);
    uploadData.append('fileNames[0]', file.name);
    
    try {
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: uploadData
      });
      const data = await res.json();
      if (data.success && data.files && data.files.length > 0) {
        setFormData(prev => ({ ...prev, [fieldName]: data.files[0].url }));
        toast.success(`Uploaded successfully`);
      } else {
        toast.error(`Failed to upload file`);
      }
    } catch (err) {
      toast.error(`Error uploading file`);
    }
  };

  const handlePermissionChange = (perm: string) => {
    setFormData(prev => {
      const perms = prev.permissions;
      if (perms.includes(perm)) {
        return { ...prev, permissions: perms.filter(p => p !== perm) };
      } else {
        return { ...prev, permissions: [...perms, perm] };
      }
    });
  };

  const handleCreate = async () => {
    if (!formData.username || !formData.password || !formData.operatorName) {
      toast.error("Employee Name, Username and password are required");
      return;
    }
    
    if (isAccountAdminCreatingStoreStaff && !formData.selectedStoreId) {
      toast.error("Please select a store");
      return;
    }

    const actualCreatorId = isAccountAdminCreatingStoreStaff ? formData.selectedStoreId : creatorId;
    const actualRole = isAccountAdminCreatingStoreStaff ? 'store' : role;

    const res = await fetch('/api/users/sub-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creatorId: actualCreatorId,
        username: formData.username,
        password: formData.password,
        operatorName: formData.operatorName,
        email: formData.email,
        phone: formData.phone,
        employeeId: formData.employeeId,
        photo: formData.photo,
        idProofAttach: formData.idProofAttach,
        permissions: formData.permissions,
        role: actualRole
      })
    });
    const data = await res.json();
    if (data.success) {
      toast.success(isAccountAdminCreatingStoreStaff ? "Store Staff created" : "Employee created");
      setIsCreating(false);
      setFormData({ 
        username: "", 
        password: "", 
        operatorName: "", 
        email: "", 
        phone: "", 
        employeeId: "", 
        photo: "", 
        idProofAttach: "", 
        selectedStoreId: formData.selectedStoreId,
        selectedStaffRole: "Custom",
        permissions: availablePermissions.map(p => p.id) 
      });
      fetchSubUsers(actualCreatorId || '');
    } else {
      toast.error(data.error || "Failed to create employee");
    }
  };

  const handleStatusToggle = async (user: any) => {
    const newStatus = user.accountStatus === 'paused' ? 'active' : 'paused';
    const res = await fetch('/api/users/sub-users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user._id,
        updaterId: creatorId,
        accountStatus: newStatus
      })
    });
    const data = await res.json();
    if (data.success) {
      toast.success(`Employee access ${newStatus}`);
      fetchSubUsers(isAccountAdminCreatingStoreStaff ? formData.selectedStoreId : (creatorId || ''));
    } else {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this employee?")) return;
    const res = await fetch(`/api/users/sub-users?userId=${userId}&deleterId=${creatorId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.success) {
      toast.success("Employee deleted");
      fetchSubUsers(isAccountAdminCreatingStoreStaff ? formData.selectedStoreId : (creatorId || ''));
    } else {
      toast.error("Failed to delete employee");
    }
  };

  if (isCreating) {
    return (
      <div className="pb-12 max-w-[800px]">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{isAccountAdminCreatingStoreStaff ? "Create Store Staff" : "Create Employee"}</h1>
        <p className="text-gray-600 mb-8">{isAccountAdminCreatingStoreStaff ? "Create a new staff member for a specific store." : "Create a new employee with identical permissions."}</p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          
          {isAccountAdminCreatingStoreStaff && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 pb-8 border-b border-gray-100">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Store <span className="text-red-500">*</span></label>
                <select 
                  value={formData.selectedStoreId}
                  onChange={e => setFormData({...formData, selectedStoreId: e.target.value})}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]"
                >
                  <option value="">-- Choose a Store --</option>
                  {stores.map(s => (
                    <option key={s._id} value={s._id}>{s.storeName || s.username}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Staff Role <span className="text-red-500">*</span></label>
                <select 
                  value={formData.selectedStaffRole}
                  onChange={e => setFormData({...formData, selectedStaffRole: e.target.value})}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]"
                >
                  <option value="Custom">Custom</option>
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Employee Name <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={formData.operatorName} 
                onChange={e => setFormData({...formData, operatorName: e.target.value})}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input 
                type="email" 
                value={formData.email} 
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
              <input 
                type="text" 
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Username <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={formData.username} 
                onChange={e => setFormData({...formData, username: e.target.value})}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password <span className="text-red-500">*</span></label>
              <input 
                type="password" 
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Employee ID</label>
              <input 
                type="text" 
                value={formData.employeeId} 
                onChange={e => setFormData({...formData, employeeId: e.target.value})}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Photo (Optional)</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={e => handleFileUpload(e, 'photo')}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4] bg-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#eaf6f8] file:text-[#00BCD4] hover:file:bg-[#d6eff4]"
              />
              {formData.photo && <span className="text-xs text-green-600 mt-1 block">Photo uploaded</span>}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">ID Proof (Optional)</label>
              <input 
                type="file" 
                accept="image/*,.pdf"
                onChange={e => handleFileUpload(e, 'idProofAttach')}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4] bg-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#eaf6f8] file:text-[#00BCD4] hover:file:bg-[#d6eff4]"
              />
              {formData.idProofAttach && <span className="text-xs text-green-600 mt-1 block">ID Proof uploaded</span>}
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-4">Permissions</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {availablePermissions.map(perm => (
                <label key={perm.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(perm.id)}
                    onChange={() => handlePermissionChange(perm.id)}
                    className="w-5 h-5 text-[#00BCD4] rounded border-gray-300 focus:ring-[#00BCD4]"
                  />
                  <span className="text-sm font-medium text-gray-700">{perm.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={handleCreate} className="px-6 py-3 bg-[#FF5722] text-white rounded-xl font-bold hover:bg-[#F4511E]">
              {isAccountAdminCreatingStoreStaff ? "Create Store Staff" : "Create Employee"}
            </button>
            <button onClick={() => setIsCreating(false)} className="px-6 py-3 border rounded-xl text-gray-700 font-bold hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{isAccountAdminCreatingStoreStaff ? "Store Staff" : "Employees"}</h1>
          <p className="text-sm text-gray-500">{isAccountAdminCreatingStoreStaff ? "Manage staff for the selected store" : "Manage employees you have created"}</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="px-6 py-3 bg-[#FF5722] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#F4511E]"
        >
          <Plus size={18} /> {isAccountAdminCreatingStoreStaff ? "New Staff" : "New Employee"}
        </button>
      </div>

      {isAccountAdminCreatingStoreStaff && (
        <div className="mb-8 p-4 bg-white rounded-xl border border-gray-200">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Select a store to view its staff:</label>
          <select 
            value={formData.selectedStoreId}
            onChange={e => setFormData({...formData, selectedStoreId: e.target.value})}
            className="w-full md:w-1/2 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]"
          >
            <option value="">-- Choose a Store --</option>
            {stores.map(s => (
              <option key={s._id} value={s._id}>{s.storeName || s.username}</option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading employees...</div>
      ) : users.length === 0 ? (
        <div className="bg-white border rounded-2xl p-12 flex flex-col items-center justify-center">
          <Users size={32} className="text-gray-400 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {isAccountAdminCreatingStoreStaff && !formData.selectedStoreId ? "Please select a store" : (isAccountAdminCreatingStoreStaff ? "No staff found" : "No employees found")}
          </h3>
          <p className="text-gray-500 mb-6">
            {isAccountAdminCreatingStoreStaff && !formData.selectedStoreId ? "Select a store from the dropdown above to view its staff members." : "Create an employee to grant identical platform access."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {users.map(user => (
            <div key={user._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold uppercase">
                    {user.operatorName ? user.operatorName.charAt(0) : user.username.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{user.operatorName || user.username}</h3>
                    <div className="text-xs text-gray-500">{user.username}</div>
                    <span className={`mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${user.accountStatus === 'paused' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                      {user.accountStatus || 'active'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-auto pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button 
                  onClick={() => handleStatusToggle(user)}
                  className={`p-2 rounded-lg transition-colors ${user.accountStatus === 'paused' ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}
                  title={user.accountStatus === 'paused' ? 'Resume Access' : 'Pause Access'}
                >
                  {user.accountStatus === 'paused' ? <PlayCircle size={20} /> : <PauseCircle size={20} />}
                </button>
                <button 
                  onClick={() => handleDelete(user._id)}
                  className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                  title="Delete User"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
