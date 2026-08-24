"use client";
import React, { useState, useEffect } from "react";
import { Users, Plus, Edit, Trash2, Shield, Settings2, PlayCircle, PauseCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function SubUsersView({ creatorId, role }: { creatorId?: string, role: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const fetchSubUsers = async () => {
    if (!creatorId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users/sub-users?creatorId=${creatorId}`);
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
    fetchSubUsers();
  }, [creatorId]);

  const handleCreate = async () => {
    if (!formData.username || !formData.password) {
      toast.error("Username and password required");
      return;
    }
    const res = await fetch('/api/users/sub-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creatorId,
        username: formData.username,
        password: formData.password,
        role: role // inherits role from the parent
      })
    });
    const data = await res.json();
    if (data.success) {
      toast.success("User created");
      setIsCreating(false);
      setFormData({ username: "", password: "" });
      fetchSubUsers();
    } else {
      toast.error(data.error || "Failed to create user");
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
      toast.success(`User access ${newStatus}`);
      fetchSubUsers();
    } else {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    const res = await fetch(`/api/users/sub-users?userId=${userId}&deleterId=${creatorId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.success) {
      toast.success("User deleted");
      fetchSubUsers();
    } else {
      toast.error("Failed to delete user");
    }
  };

  if (isCreating) {
    return (
      <div className="pb-12 max-w-[800px]">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Sub-User</h1>
        <p className="text-gray-600 mb-8">Create a new user with identical permissions.</p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
              <input 
                type="text" 
                value={formData.username} 
                onChange={e => setFormData({...formData, username: e.target.value})}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <input 
                type="password" 
                value={formData.password} 
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={handleCreate} className="px-6 py-3 bg-[#FF5722] text-white rounded-xl font-bold hover:bg-[#F4511E]">
              Create User
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Sub-Users</h1>
          <p className="text-sm text-gray-500">Manage users you have created</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="px-6 py-3 bg-[#FF5722] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#F4511E]"
        >
          <Plus size={18} /> New User
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="bg-white border rounded-2xl p-12 flex flex-col items-center justify-center">
          <Users size={32} className="text-gray-400 mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">No sub-users found</h3>
          <p className="text-gray-500 mb-6">Create a sub-user to grant identical platform access.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {users.map(user => (
            <div key={user._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-bold uppercase">
                    {user.username.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{user.username}</h3>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide ${user.accountStatus === 'paused' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
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
