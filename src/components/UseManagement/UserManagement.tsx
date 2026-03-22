import React, { useState, useEffect } from 'react';
import { Trash2, Edit, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  _id: string;
  username: string;
  role: string;
  controllerId?: string;
}

interface UserFormData {
  username: string;
  password: string;
  role: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    password: '',
    role: 'reseller'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const controllerId = localStorage.getItem('userId');
      
      const url = controllerId 
        ? `/api/user?controllerId=${controllerId}`
        : `/api/user`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      if (data.success) {
        // Only show resellers in the list
        const filteredUsers = data.data.filter((u: User) => u.role === 'reseller');
        setUsers(filteredUsers);
      }
    } catch (error) {
      toast.error('Failed to fetch users');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const controllerId = localStorage.getItem('userId');
      
      const payload: any = { ...formData };
      if (controllerId) {
        payload.controllerId = controllerId;
      }

      const response = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('User created successfully');
        fetchUsers();
        setIsAddingUser(false);
        setFormData({ username: '', password: '', role: 'reseller' });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create user');
    }
  };

  const handleUpdate = async (userId: string) => {
    try {
      const response = await fetch(`/api/user?userId=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('User updated successfully');
        fetchUsers();
        setEditingUser(null);
        setFormData({ username: '', password: '', role: 'reseller' });
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update user');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const response = await fetch(`/api/user?userId=${userId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        toast.success('User deleted successfully');
        fetchUsers();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    }
  };

  // Add the component to your page
  return (
    <div className="bg-white/50 backdrop-blur-md rounded-[2rem] p-8 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Identity Access</h2>
          <p className="text-slate-500 font-medium">Control operational permissions and system roles.</p>
        </div>
        <button
          onClick={() => setIsAddingUser(true)}
          className="flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-slate-900/20"
        >
          <UserPlus size={20} />
          Onboard User
        </button>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-50">
            <thead className="bg-[#07323C] text-white">
              <tr>
                <th className="px-8 py-5 text-left text-[10px] font-bold uppercase tracking-[0.2em]">Username</th>
                <th className="px-8 py-5 text-left text-[10px] font-bold uppercase tracking-[0.2em]">Access Role</th>
                <th className="px-8 py-5 text-right text-[10px] font-bold uppercase tracking-[0.2em]">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6 whitespace-nowrap">
                    {editingUser === user._id ? (
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-900 focus:border-blue-500 outline-none"
                      />
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-sm font-bold text-slate-900">{user.username}</div>
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      user.role === 'reseller' 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingUser === user._id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdate(user._id)}
                            className="px-4 py-2 bg-green-500 text-white rounded-xl font-bold text-xs"
                          >
                            Commit
                          </button>
                          <button
                            onClick={() => {
                              setEditingUser(null);
                              setFormData({ username: '', password: '', role: 'reseller' });
                            }}
                            className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl font-bold text-xs"
                          >
                            Abort
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingUser(user._id);
                              setFormData({ username: user.username, password: '', role: user.role });
                            }}
                            className="p-2.5 bg-white text-slate-400 hover:text-blue-500 hover:shadow-sm rounded-xl border border-slate-100 transition-all"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(user._id)}
                            className="p-2.5 bg-white text-slate-400 hover:text-red-500 hover:shadow-sm rounded-xl border border-slate-100 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAddingUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="mb-8 text-center">
               <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <UserPlus size={40} />
               </div>
               <h3 className="text-2xl font-black text-slate-900">Provision Account</h3>
               <p className="text-slate-500 font-medium">Create a new organizational identity.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Username Identity</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none transition-all"
                  placeholder="e.g. system_operator"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Security Key</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Operational Rank</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl px-6 py-4 font-bold text-slate-900 outline-none transition-all appearance-none"
                >
                   <option value="reseller">Reseller</option>
                </select>
              </div>
              <div className="flex flex-col gap-4 pt-4">
                <button
                  type="submit"
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-extrabold shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95"
                >
                  Confirm Provisioning
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingUser(false);
                    setFormData({ username: '', password: '', role: 'reseller' });
                  }}
                  className="w-full py-2 text-slate-400 font-bold hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}