"use client";
import React, { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  LayoutDashboard,
  Store,
  Users,
  Settings2,
  User,
  HeadphonesIcon,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  Monitor,
  AlertTriangle,
  ArrowRight,
  Plus,
  TrendingUp,
  MapPin,
  MonitorSmartphone,
  Save,
  Edit,
  Trash2,
  Clock,
  Building2,
  ShieldCheck,
  Megaphone,
  Mic,
  Volume2,
  FolderOpen,
  Check,
  Hash,
  Music,
  List as ListIcon
} from "lucide-react";
import CreateAnnouncementWizard from "../components/CreateAnnouncementWizard";
import { useRouter } from "next/navigation";

// --- Sub-components for different views ---

const DashboardView = ({ setActiveView, userData }: { setActiveView: (view: string) => void, userData?: any }) => {
  const [stats, setStats] = useState({ stores: 0, devices: 0, video: 0, audio: 0, marketingUsers: 0, storesNoDevices: 0, devicesNoStores: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?._id || !userData?.customerId) return;
    const fetchStats = async () => {
      try {
        const [devicesRes, usersRes] = await Promise.all([
          fetch(`/api/devices?customerId=${userData.customerId}`),
          fetch(`/api/user?controllerId=${userData._id}`)
        ]);
        const dData = await devicesRes.json();
        const uData = await usersRes.json();
        
        let devicesArr = Array.isArray(dData) ? dData : [];
        let allUsers = uData.success && Array.isArray(uData.data) ? uData.data : [];
        let storesArr = allUsers.filter((u:any) => u.role === 'store');
        
        let video = 0; let audio = 0;
        devicesArr.forEach(d => {
          if (d.typeId?.name?.toLowerCase().includes('video')) video++;
          else if (d.typeId?.name?.toLowerCase().includes('audio')) audio++;
        });

        setStats({
          stores: storesArr.length,
          devices: devicesArr.length,
          video,
          audio,
          marketingUsers: allUsers.filter((u:any) => u.role === 'account_marketing').length,
          storesNoDevices: 0,
          devicesNoStores: 0
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [userData]);

  const userName = userData?.operatorName || userData?.username || "John Miller";

  return (
  <div className="space-y-8 pb-12">
    {/* Welcome Banner */}
    <div className="bg-[#1A454D] rounded-3xl p-8 text-white shadow-xl">
      <h1 className="text-3xl font-bold mb-2">Welcome back, {userName} !</h1>
      <p className="text-white/80 mb-8">Here's what's happening with your accounts today.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/10 rounded-2xl p-6 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-[#A1F4FD]">Total Stores</h3>
            <Store size={20} className="text-[#A1F4FD]" />
          </div>
          <h2 className="text-5xl font-bold text-white">{loading ? "-" : stats.stores}</h2>
        </div>

        <div className="bg-white/10 rounded-2xl p-6 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-[#A1F4FD]">Total devices</h3>
            <Monitor size={20} className="text-[#A1F4FD]" />
          </div>
          <h2 className="text-5xl font-bold text-white mb-3">{loading ? "-" : stats.devices}</h2>
          <div className="flex items-center gap-4 text-xs text-white/50 font-medium">
            <span className="text-white">Video devices : {loading ? "-" : stats.video}</span>
            <span className="w-px h-3 bg-white/20"></span>
            <span className="text-white">Audio devices : {loading ? "-" : stats.audio}</span>
          </div>
        </div>

        <div className="bg-white/10 rounded-2xl p-6 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-[#A1F4FD]">Account marketing users</h3>
            <User size={20} className="text-[#A1F4FD]" />
          </div>
          <h2 className="text-5xl font-bold text-white">{loading ? "-" : stats.marketingUsers}</h2>
        </div>
      </div>
    </div>

    {/* Middle Layout Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
      <div>
        {/* Attention Required Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-[#1A454D] text-white rounded-lg">
              <AlertTriangle size={20} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Attention Required</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl p-6 border-l-4 border-l-[#FF5722] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-6">
                <Monitor className="text-[#FF5722]" size={20} />
              </div>
              <h3 className="text-sm font-medium text-gray-800 mb-4 h-10">Stores with no devices assigned</h3>
              <div className="text-4xl font-bold text-gray-900 mb-6">{stats.storesNoDevices}</div>
              <button onClick={() => setActiveView("all_stores")} className="text-[#FF5722] text-sm flex items-center gap-2 font-bold hover:gap-3 transition-all">
                Check now <ArrowRight size={16} />
              </button>
            </div>

            <div className="bg-white rounded-3xl p-6 border-l-4 border-l-[#FF5722] shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-6">
                <Monitor className="text-[#FF5722]" size={20} />
              </div>
              <h3 className="text-sm font-medium text-gray-800 mb-4 h-10">Devices with no stores assigned</h3>
              <div className="text-4xl font-bold text-gray-900 mb-6">{stats.devicesNoStores}</div>
              <button onClick={() => setActiveView("connect_devices")} className="text-[#FF5722] text-sm flex items-center gap-2 font-bold hover:gap-3 transition-all">
                Check now <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Quick Actions */}
      <div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 sticky top-0">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Quick Actions</h3>
          <div className="space-y-4">
            <button 
              onClick={() => setActiveView("onboard_store")}
              className="w-full py-4 px-6 bg-[#FF5722] text-white rounded-2xl font-bold hover:bg-[#F4511E] transition-all flex items-center justify-between shadow-lg shadow-[#FF5722]/20 group"
            >
              Onboard new store
              <Plus size={20} className="group-hover:scale-125 transition-transform" />
            </button>
            <button 
              onClick={() => setActiveView("connect_devices")}
              className="w-full py-4 px-6 bg-[#00BCD4] text-white rounded-2xl font-bold hover:bg-[#00ACC1] transition-all flex items-center justify-between shadow-lg shadow-[#00BCD4]/20 group"
            >
              Assign new device
              <Plus size={20} className="group-hover:scale-125 transition-transform" />
            </button>
            <button 
              onClick={() => setActiveView("onboard_user")}
              className="w-full py-4 px-6 bg-white border-2 border-gray-100 text-gray-900 rounded-2xl font-bold hover:border-gray-200 hover:bg-gray-50 transition-all flex items-center justify-between group"
            >
              <span className="text-left w-full mr-2">Assign new account marketing user</span>
              <Plus size={20} className="group-hover:scale-125 transition-transform shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

const OnboardStoreView = ({ accountAdminId, customerId, onComplete }: { accountAdminId?: string, customerId?: string, onComplete?: () => void }) => {
  const [formData, setFormData] = useState({
    storeName: '',
    location: '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.storeName || !formData.location || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use store name directly as username
      const username = formData.storeName.trim();

      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          password: formData.password,
          role: 'store',
          storeName: formData.storeName,
          storeLocation: formData.location,
          controllerId: accountAdminId,
          customerId: customerId,
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Store "${username}" created successfully!`);
        setFormData({ storeName: '', location: '', password: '', confirmPassword: '' });
        if (onComplete) onComplete();
      } else {
        toast.error(data.message || 'Failed to create store');
      }
    } catch (err) {
      toast.error('An error occurred while creating store');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
  <div className="pb-12 max-w-[1000px]">
    <h1 className="text-3xl font-bold text-gray-900 mb-2">Onboard New Store</h1>
    <p className="text-gray-600 mb-8">Onboard your new store here</p>

    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-[#FF5722]">
          <Store size={20} />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Store Information</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Store name <span className="text-red-500">*</span></label>
          <input type="text" value={formData.storeName} onChange={e => setFormData({...formData, storeName: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Location <span className="text-red-500">*</span></label>
          <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Password <span className="text-red-500">*</span></label>
          <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password <span className="text-red-500">*</span></label>
          <input type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="flex items-center gap-2 px-6 py-3 bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-xl font-bold transition-all shadow-md shadow-[#FF5722]/20 disabled:bg-gray-300 disabled:shadow-none"
        >
          <Store size={18} />
          {isSubmitting ? "Onboarding..." : "Onboard Store"}
        </button>
        <button onClick={() => { if(onComplete) onComplete() }} className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-600 rounded-xl font-bold border border-gray-200 transition-all">
          Cancel
        </button>
      </div>
    </div>
  </div>
  );
};

const AllStoresView = ({ setActiveView, setSelectedStore, accountAdminId, onEdit }: { setActiveView: (v: string) => void, setSelectedStore: (s: any) => void, accountAdminId?: string, onEdit?: (s: any) => void }) => {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStores = async () => {
    if (!accountAdminId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/user?controllerId=${accountAdminId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setStores(data.data.filter((u: any) => u.role === "store"));
      }
    } catch (err) {
      console.error("Failed to fetch stores", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStores();
  }, [accountAdminId]);

  const handleDelete = async (storeId: string) => {
    if (!confirm("Are you sure you want to delete this store? All associated data will be lost.")) return;
    try {
      const res = await fetch(`/api/user?userId=${storeId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Store deleted successfully");
        fetchStores();
      } else {
        toast.error(data.message || "Failed to delete store");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  return (
  <div className="pb-12">
    <h1 className="text-3xl font-bold text-gray-900 mb-1">View all Stores</h1>
    <p className="text-sm text-gray-500 mb-8">Onboard your new store here</p>
    
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex gap-4">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Search stores by name, location, or contact..." 
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50"
        />
      </div>
      <select className="w-32 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 bg-white text-gray-600">
        <option>All Status</option>
      </select>
      <select className="w-40 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 bg-white text-gray-600">
        <option>Sort by : Name</option>
      </select>
    </div>

    {loading ? (
      <div className="flex justify-center p-8 text-gray-500">Loading stores...</div>
    ) : stores.length === 0 ? (
      <div className="bg-white border rounded-2xl p-12 flex flex-col items-center justify-center shadow-sm border-orange-200/50">
        <div className="w-16 h-16 bg-[#EBF5F6] rounded-2xl flex items-center justify-center text-[#FF5722] mb-4">
          <Store size={32} />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-8">No stores available. Onboard one to begin!</h3>
        <button onClick={() => setActiveView("onboard_store")} className="px-6 py-3 bg-[#FF5722] text-white rounded-xl font-bold hover:bg-[#F4511E] transition-all flex items-center gap-2 shadow-md shadow-[#FF5722]/20">
          <Settings2 size={18} /> Onboard a store
        </button>
      </div>
    ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {stores.map((store) => (
        <div key={store._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col cursor-pointer transition-shadow hover:shadow-md" onClick={() => { setSelectedStore(store); setActiveView("store_detail"); }}>
          <div className="bg-[#1A454D] p-6 text-white relative">
            <div className="absolute top-4 right-4 bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{store.status || 'Active'}</div>
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#FF5722] mb-4">
              <Store size={24} />
            </div>
            <h3 className="text-xl font-bold">{store.storeName || store.username || "Unnamed Store"}</h3>
            <p className="text-white/60 text-sm">{store._id.substring(0,8).toUpperCase()}</p>
          </div>
          <div className="p-6">
            <div className="space-y-3 mb-6 text-sm text-gray-600">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-[#FF5722] shrink-0 mt-0.5" />
                <span>{store.storeLocation || store.location || "No Location provided"}</span>
              </div>
              <div className="flex items-center gap-3">
                <User size={18} className="text-gray-400 shrink-0" />
                <span>{store.primaryContactName || "Admin"}</span>
              </div>
              <div className="flex items-center gap-3">
                <HeadphonesIcon size={18} className="text-gray-400 shrink-0" />
                <span>{store.primaryPhone || "N/A"}</span>
              </div>
              <div className="flex items-center gap-3">
                <MonitorSmartphone size={18} className="text-gray-400 shrink-0" />
                <span>{store.email}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
                <Clock size={14} />
                <span>{new Date(store.createdAt).toLocaleDateString()}</span>
              </div>
                  <div className="flex items-center gap-4 text-[#00BCD4]">
                    <button
                      title="View"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStore(store);
                        setActiveView("store_detail");
                      }}
                    >
                      <ListIcon size={18} className="text-[#00BCD4]" />
                    </button>
                    <button
                      title="Edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.(store);
                      }}
                    >
                      <Edit size={18} className="text-orange-400" />
                    </button>
                    <button
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(store._id);
                      }}
                    >
                      <Trash2 size={18} className="text-red-400" />
                    </button>
                  </div>
            </div>
          </div>
        </div>
      ))}
    </div>
    )}
  </div>
  );
};

const StoreDetailView = ({ store, setActiveView }: { store: any, setActiveView: (v:string)=>void }) => {
  const [devices, setDevices] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchDevices = async () => {
    if (!store?._id) return;
    try {
      const res = await fetch(`/api/assign-device?userId=${store._id}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAssignments(data.data);
        setDevices(data.data.map((a: any) => ({ ...a.deviceId, assignmentId: a._id })));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDevices(); }, [store]);

  const handleRemove = async (deviceId: string) => {
    if (!confirm("Remove this device from the store?")) return;
    setRemovingId(deviceId);
    try {
      const res = await fetch('/api/assign-device', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, userId: store._id })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Device removed");
        setDevices(prev => prev.filter(d => d._id !== deviceId));
      } else {
        toast.error(data.message || "Failed to remove");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading store details...</div>;

  const storeName = store?.storeName || store?.username || "Store";
  const storeAddr = store?.storeLocation || store?.location || "No address";

  return (
    <div className="pb-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{storeName}</h1>
      <div className="flex items-center gap-2 text-gray-600 mb-8">
        <MapPin size={18} className="text-[#FF5722]" />
        <span>{storeAddr}</span>
      </div>

      {devices.length === 0 ? (
        <div className="bg-white border rounded-2xl p-12 flex flex-col items-center justify-center shadow-sm border-orange-200/50 max-w-[800px]">
          <div className="w-16 h-16 bg-[#EBF5F6] rounded-2xl flex items-center justify-center text-[#FF5722] mb-4">
            <Monitor size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-8">No devices connected</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {devices.map((device: any) => {
            const isOnline = device.status === 'active' || device.status === 'online';
            const isVideo = (device.typeId?.name || '').toLowerCase().includes('video');
            return (
              <div key={device._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                <div className="p-6 pb-4">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-[#1A454D] rounded-xl flex items-center justify-center text-[#00BCD4] shadow-sm">
                      {isVideo ? <Monitor size={24} /> : <MonitorSmartphone size={24} />}
                    </div>
                    <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                      isOnline ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'
                    }`}>
                      {isOnline ? '📶 online' : '📵 offline'}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-4 text-lg line-clamp-1">{device.name}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Type:</span>
                      <span className="font-medium text-gray-900">{device.typeId?.name || "Unknown"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">S/N:</span>
                      <span className="font-bold text-gray-900">{device.serialNumber || "—"}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-auto">
                  <button
                    onClick={() => handleRemove(device._id)}
                    disabled={removingId === device._id}
                    className="w-full py-3 bg-[#1A454D] text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
                  >
                    {removingId === device._id ? "Removing…" : "Remove device"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setActiveView("connect_devices")}
        className="px-6 py-3 bg-[#FF5722] text-white rounded-xl font-bold hover:bg-[#F4511E] transition-all flex items-center gap-2 shadow-md shadow-[#FF5722]/20"
      >
        <Settings2 size={18} /> Connect devices
      </button>
    </div>
  );
};


const AssignDeviceView = ({ customerId, accountAdminId }: { customerId?: string, accountAdminId?: string }) => {
  const [stores, setStores] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    if (!customerId || !accountAdminId) return;
    Promise.all([
      fetch(`/api/user?controllerId=${accountAdminId}`).then(r => r.json()),
      fetch(`/api/devices?customerId=${customerId}`).then(r => r.json())
    ]).then(([uData, dData]) => {
      if (uData.success && Array.isArray(uData.data)) {
        setStores(uData.data.filter((u:any) => u.role === 'store'));
      }
      if (Array.isArray(dData)) {
        setDevices(dData);
      }
    });
  }, [customerId, accountAdminId]);

  const toggleDevice = (id: string) => {
    setSelectedDevices(prev => 
      prev.includes(id) ? [] : [id]
    );
  };

  const handleAssign = async () => {
    if (!selectedStore || selectedDevices.length === 0 || !accountAdminId) {
      toast.error("Please select a store and at least one device");
      return;
    }
    setIsAssigning(true);
    const loadingToast = toast.loading("Assigning devices...");
    try {
      for (const deviceId of selectedDevices) {
        const res = await fetch('/api/assign-device', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: selectedStore,
            deviceId,
            assignedBy: accountAdminId
          })
        });
        const data = await res.json();
        if (!data.success) {
           toast.error(`Failed to assign device: ${data.message}`);
        }
      }
      toast.success("Assignment complete", { id: loadingToast });
      setSelectedStore('');
      setSelectedDevices([]);
    } catch (err) {
      toast.error("An error occurred during assignment", { id: loadingToast });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="pb-12 max-w-[800px]">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Connect new devices</h1>
      <p className="text-gray-600 mb-8">connect your stores to begin</p>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-[#FF5722]">
            <Monitor size={20} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Select store and devices</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select store <span className="text-red-500">*</span></label>
            <select 
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 bg-white"
            >
              <option value="">-- Choose a store --</option>
              {stores.map((s:any) => (
                <option key={s._id} value={s._id}>{s.storeName || s.username || 'Store'}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-4 flex justify-between">
              <span>Select devices <span className="text-red-500">*</span></span>
              <ChevronDown size={16} className="text-gray-400" />
            </label>
            <div className="space-y-3">
              {devices.length === 0 ? (
                <p className="text-gray-500 text-sm">No devices available.</p>
              ) : (
                devices.map((device:any) => {
                  const isSelected = selectedDevices.includes(device._id);
                  return (
                    <div 
                      key={device._id} 
                      onClick={() => toggleDevice(device._id)}
                      className={`border-2 rounded-xl p-4 flex items-center justify-between cursor-pointer transition-colors ${isSelected ? 'border-[#FF5722] bg-orange-50/10' : 'border-gray-200 hover:border-gray-300'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-orange-50 text-[#FF5722]' : 'bg-[#EBF5F6] text-[#00BCD4]'}`}>
                          <Monitor size={20} />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{device.name}</h4>
                          <p className="text-xs text-gray-500">{device.serialNumber}</p>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-full bg-white ${isSelected ? 'border-[6px] border-[#FF5722]' : 'border-2 border-gray-200'}`}></div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-8 pt-6 border-t border-gray-100">
          <button 
            disabled={isAssigning || !selectedStore || selectedDevices.length === 0}
            onClick={handleAssign}
            className="flex items-center gap-2 px-6 py-3 bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-xl font-bold transition-all shadow-md shadow-[#FF5722]/20 disabled:bg-gray-300 disabled:shadow-none"
          >
            <Settings2 size={18} />
            {isAssigning ? "Connecting..." : "Connect device to store"}
          </button>
          <button 
            onClick={() => { setSelectedStore(''); setSelectedDevices([]); }}
            className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-600 rounded-xl font-bold border border-gray-200 transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const AllDevicesView = ({ customerId, setActiveView }: { customerId?: string, setActiveView?: (v: string) => void }) => {
  const [devices, setDevices] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const fetchDevices = async () => {
    if (!customerId) return;
    setIsLoading(true);
    try {
      // Fetch all devices for customer
      const [devRes, assignRes] = await Promise.all([
        fetch(`/api/devices?customerId=${customerId}`).then(r => r.json()),
        fetch(`/api/assign-device?customerId=${customerId}`).then(r => r.json()).catch(() => ({ data: [] }))
      ]);
      const allDevices = Array.isArray(devRes) ? devRes : [];
      const allAssignments = assignRes.data || assignRes.assignments || [];
      setDevices(allDevices);
      setAssignments(allAssignments);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDevices(); }, [customerId]);

  const getAssignment = (deviceId: string) =>
    assignments.find((a: any) => a.deviceId?._id === deviceId || a.deviceId === deviceId);

  const handleDisconnect = async (deviceId: string) => {
    const assignment = getAssignment(deviceId);
    if (!assignment) { toast.error("No assignment found"); return; }
    if (!confirm("Disconnect this device from its store?")) return;
    setDisconnecting(deviceId);
    try {
      const res = await fetch('/api/assign-device', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, userId: assignment.userId || assignment.storeId })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Device disconnected");
        await fetchDevices();
      } else {
        toast.error(data.message || "Failed");
      }
    } catch { toast.error("Network error"); }
    finally { setDisconnecting(null); }
  };

  const filtered = devices.filter(d => {
    const assignment = getAssignment(d._id);
    const isConnected = !!assignment;
    const matchStatus = !statusFilter
      ? true
      : statusFilter === "online" ? (d.status === "active" || d.status === "online")
      : statusFilter === "offline" ? (d.status !== "active" && d.status !== "online")
      : statusFilter === "unmapped" ? !isConnected
      : true;
    const matchType = !typeFilter ? true : (d.typeId?.name || "").toLowerCase().includes(typeFilter.toLowerCase());
    return matchStatus && matchType;
  });

  return (
    <div className="pb-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">All devices</h1>
      <p className="text-sm text-gray-500 mb-8">Here you can manage all devices</p>

      {/* Stats + Filters Row */}
      <div className="flex gap-6 mb-8 items-stretch">
        {/* Total card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-5 min-w-[220px]">
          <div className="w-12 h-12 bg-[#EBF5F6] rounded-xl flex items-center justify-center text-[#FF5722]">
            <Monitor size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Total devices</p>
            <p className="text-4xl font-bold text-[#0E3B43]">{isLoading ? "–" : devices.length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 flex-1">
          <span className="text-sm font-semibold text-gray-500 whitespace-nowrap">Filter by</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="flex-1 p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 bg-white text-sm"
          >
            <option value="">Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="unmapped">Unmapped</option>
          </select>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="flex-1 p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 bg-white text-sm"
          >
            <option value="">Device type</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-gray-400">Loading devices…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Monitor size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Devices Found</h3>
          <p className="text-gray-500 mb-6">Try adjusting your filters or connect new devices.</p>
          {setActiveView && (
            <button onClick={() => setActiveView("connect_devices")} className="px-6 py-3 bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-xl font-bold transition-all shadow-md shadow-[#FF5722]/20">
              Connect new device
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((device: any) => {
            const assignment = getAssignment(device._id);
            const isConnected = !!assignment;
            const isOnline = device.status === 'active' || device.status === 'online';
            const isVideo = (device.typeId?.name || '').toLowerCase().includes('video');
            const store = assignment?.userId; // populated with storeName, username
            return (
              <div key={device._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="p-6 pb-4">
                  <div className="flex justify-between items-start mb-5">
                    <div className="w-12 h-12 bg-[#1A454D] rounded-xl flex items-center justify-center text-[#00BCD4] shadow-sm">
                      {isVideo ? <Monitor size={24} /> : <MonitorSmartphone size={24} />}
                    </div>
                    {!isConnected ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full text-orange-500 bg-orange-50">
                        📍 Unmapped
                      </span>
                    ) : (
                      <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${
                        isOnline ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'
                      }`}>
                        {isOnline ? '📶 online' : '📵 offline'}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-900 mb-4 text-base line-clamp-1">{device.name}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Type:</span>
                      <span className="font-medium text-gray-900">{device.typeId?.name || "Unknown"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">S/N:</span>
                      <span className="font-bold text-gray-900 text-xs">{device.serialNumber || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Customer:</span>
                      <span className="font-medium text-gray-900">{store?.storeName || store?.username || (isConnected ? "Assigned" : "None")}</span>
                    </div>
                  </div>
                </div>
                {/* Action buttons */}
                <div className="mt-auto border-t border-gray-100">
                  <div className="flex divide-x divide-gray-100">
                    <button className="flex-1 py-3 text-sm font-semibold text-[#00BCD4] hover:bg-[#EBF5F6] transition-colors">
                      Edit
                    </button>
                    {!isConnected ? (
                      <button
                        onClick={() => setActiveView && setActiveView("connect_devices")}
                        className="flex-1 py-3 text-sm font-semibold text-[#FF5722] hover:bg-orange-50 transition-colors"
                      >
                        Connect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDisconnect(device._id)}
                        disabled={disconnecting === device._id}
                        className="flex-1 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {disconnecting === device._id ? "…" : "Disconnect"}
                      </button>
                    )}

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


const OnboardUserView = ({ accountAdminId, customerId, onComplete }: { accountAdminId?: string, customerId?: string, onComplete?: () => void }) => {
  const [stores, setStores] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    hasAllStoreAccess: false,
    assignedStoreId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (!accountAdminId) return;
    const fetchStores = async () => {
      try {
        const res = await fetch(`/api/user?controllerId=${accountAdminId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setStores(data.data.filter((u:any) => u.role === 'store'));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStores();
  }, [accountAdminId]);

  const handleSubmit = async () => {
    if (!formData.username || !formData.email || !formData.password) {
      toast.error('Please fill in required fields');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!formData.hasAllStoreAccess && !formData.assignedStoreId) {
      toast.error('Please select a store or give all store access');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: 'account_marketing',
          controllerId: accountAdminId,
          customerId: customerId,
          hasAllStoreAccess: formData.hasAllStoreAccess,
          assignedStoreId: formData.hasAllStoreAccess ? undefined : formData.assignedStoreId
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Account Marketing User created!');
        if (onComplete) onComplete();
      } else {
        toast.error(data.message || 'Error creating user');
      }
    } catch (err) {
      toast.error('Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-12 max-w-[1000px]">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Onboard Account Marketing User</h1>
      <p className="text-gray-600 mb-8">Onboard your new account marketing user here</p>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#EBF5F6] flex items-center justify-center text-[#FF5722]">
            <User size={20} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">User Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Username <span className="text-red-500">*</span></label>
            <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email ID <span className="text-red-500">*</span></label>
            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password <span className="text-red-500">*</span></label>
            <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password <span className="text-red-500">*</span></label>
            <input type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Give access to all stores <span className="text-red-500">*</span></label>
            <div className="flex items-center gap-6">
              <label onClick={() => setFormData({...formData, hasAllStoreAccess: true, assignedStoreId: ''})} className="flex items-center gap-2 cursor-pointer">
                <div className={`w-4 h-4 rounded-full ${formData.hasAllStoreAccess ? 'border-[5px] border-[#FF5722]' : 'border-2 border-gray-300'}`}></div>
                <span className="text-sm font-medium">Yes</span>
              </label>
              <label onClick={() => setFormData({...formData, hasAllStoreAccess: false})} className="flex items-center gap-2 cursor-pointer">
                <div className={`w-4 h-4 rounded-full ${!formData.hasAllStoreAccess ? 'border-[5px] border-[#FF5722]' : 'border-2 border-gray-300'}`}></div>
                <span className="text-sm font-medium">No</span>
              </label>
            </div>
          </div>
          {!formData.hasAllStoreAccess && (
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select store <span className="text-red-500">*</span></label>
              <select value={formData.assignedStoreId} onChange={e => setFormData({...formData, assignedStoreId: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 bg-white">
                <option value="">-- Choose a store --</option>
                {stores.map((s:any) => (
                  <option key={s._id} value={s._id}>{s.storeName || s.username || 'Store'}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-gray-100 pt-6">
          <button disabled={isSubmitting} onClick={handleSubmit} className="flex items-center gap-2 px-6 py-3 bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-xl font-bold transition-all shadow-md shadow-[#FF5722]/20 disabled:bg-gray-300 disabled:shadow-none">
            <User size={18} />
            {isSubmitting ? "Onboarding..." : "Onboard user"}
          </button>
          <button onClick={() => { if(onComplete) onComplete() }} className="px-6 py-3 bg-[#F4F7F8] hover:bg-gray-100 text-gray-700 rounded-xl font-bold transition-all">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const EditUserView = ({ user, accountAdminId, customerId, onComplete }: { user: any, accountAdminId?: string, customerId?: string, onComplete?: () => void }) => {
  const [stores, setStores] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    password: '',
    confirmPassword: '',
    hasAllStoreAccess: user?.hasAllStoreAccess || false,
    assignedStoreId: user?.assignedStoreId || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (!accountAdminId) return;
    const fetchStores = async () => {
      try {
        const res = await fetch(`/api/user?controllerId=${accountAdminId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setStores(data.data.filter((u:any) => u.role === 'store'));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStores();
  }, [accountAdminId]);

  const handleSubmit = async () => {
    if (!formData.username || !formData.email) {
      toast.error('Username and Email are required');
      return;
    }
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const body: any = {
        username: formData.username,
        email: formData.email,
        hasAllStoreAccess: formData.hasAllStoreAccess,
        assignedStoreId: formData.hasAllStoreAccess ? null : formData.assignedStoreId
      };
      
      if (formData.password) {
        body.password = formData.password;
      }

      const res = await fetch(`/api/user?userId=${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('User updated successfully!');
        if (onComplete) onComplete();
      } else {
        toast.error(data.message || 'Error updating user');
      }
    } catch (err) {
      toast.error('Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-12 max-w-[1000px]">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => onComplete && onComplete()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowRight className="rotate-180" size={20} />
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Edit Account Marketing User</h1>
      </div>
      <p className="text-gray-600 mb-8 ml-12">Update detail for {user.username}</p>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#EBF5F6] flex items-center justify-center text-[#FF5722]">
            <User size={20} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">User Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Username <span className="text-red-500">*</span></label>
            <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email ID <span className="text-red-500">*</span></label>
            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
          </div>
          
          <div className="md:col-span-2">
            <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100 mb-4">
              <p className="text-sm text-orange-800 font-medium flex items-center gap-2">
                <AlertTriangle size={16} /> Leave password fields blank to keep current password.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
            <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
            <input type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Give access to all stores <span className="text-red-500">*</span></label>
            <div className="flex items-center gap-6">
              <label onClick={() => setFormData({...formData, hasAllStoreAccess: true, assignedStoreId: ''})} className="flex items-center gap-2 cursor-pointer">
                <div className={`w-4 h-4 rounded-full ${formData.hasAllStoreAccess ? 'border-[5px] border-[#FF5722]' : 'border-2 border-gray-300'}`}></div>
                <span className="text-sm font-medium">Yes</span>
              </label>
              <label onClick={() => setFormData({...formData, hasAllStoreAccess: false})} className="flex items-center gap-2 cursor-pointer">
                <div className={`w-4 h-4 rounded-full ${!formData.hasAllStoreAccess ? 'border-[5px] border-[#FF5722]' : 'border-2 border-gray-300'}`}></div>
                <span className="text-sm font-medium">No</span>
              </label>
            </div>
          </div>
          {!formData.hasAllStoreAccess && (
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select store <span className="text-red-500">*</span></label>
              <select value={formData.assignedStoreId} onChange={e => setFormData({...formData, assignedStoreId: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 bg-white">
                <option value="">-- Choose a store --</option>
                {stores.map((s:any) => (
                  <option key={s._id} value={s._id}>{s.storeName || s.username || 'Store'}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-gray-100 pt-6">
          <button disabled={isSubmitting} onClick={handleSubmit} className="flex items-center gap-2 px-6 py-3 bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-xl font-bold transition-all shadow-md shadow-[#FF5722]/20 disabled:bg-gray-300 disabled:shadow-none">
            <Save size={18} />
            {isSubmitting ? "Updating..." : "Save Changes"}
          </button>
          <button onClick={() => { if(onComplete) onComplete() }} className="px-6 py-3 bg-[#F4F7F8] hover:bg-gray-100 text-gray-700 rounded-xl font-bold transition-all">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const EditStoreView = ({ store, accountAdminId, customerId, onComplete }: { store: any, accountAdminId?: string, customerId?: string, onComplete?: () => void }) => {
  const [formData, setFormData] = useState({
    storeName: store?.storeName || '',
    location: store?.storeLocation || store?.location || '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.storeName || !formData.location) {
      toast.error('Store name and location are required');
      return;
    }
    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const body: any = {
        storeName: formData.storeName,
        storeLocation: formData.location,
        username: formData.storeName // Keep username synced with store name
      };
      if (formData.password) body.password = formData.password;

      const res = await fetch(`/api/user?userId=${store._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Store "${formData.storeName}" updated successfully!`);
        if (onComplete) onComplete();
      } else {
        toast.error(data.message || 'Failed to update store');
      }
    } catch (err) {
      toast.error('An error occurred while updating store');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pb-12 max-w-[1000px]">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => onComplete && onComplete()} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowRight className="rotate-180" size={20} />
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Edit Store</h1>
      </div>
      <p className="text-gray-600 mb-8 ml-12">Update detail for {store.storeName || store.username}</p>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-[#FF5722]">
            <Store size={20} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Store Information</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Store name <span className="text-red-500">*</span></label>
            <input type="text" value={formData.storeName} onChange={e => setFormData({...formData, storeName: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Location <span className="text-red-500">*</span></label>
            <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
          </div>
          
          <div className="md:col-span-2">
            <div className="p-4 bg-orange-50/50 rounded-xl border border-orange-100 mb-4">
              <p className="text-sm text-orange-800 font-medium flex items-center gap-2">
                <AlertTriangle size={16} /> Leave password fields blank to keep current password.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
            <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
            <input type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-3 bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-xl font-bold transition-all shadow-md shadow-[#FF5722]/20 disabled:bg-gray-300 disabled:shadow-none"
          >
            <Save size={18} />
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
          <button onClick={() => { if(onComplete) onComplete() }} className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-600 rounded-xl font-bold border border-gray-200 transition-all">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const ViewUsersView = ({ accountAdminId, onEdit }: { accountAdminId?: string, onEdit?: (u: any) => void }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    if (!accountAdminId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/user?controllerId=${accountAdminId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setUsers(data.data.filter((u: any) => u.role === "account_marketing"));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [accountAdminId]);

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`/api/user?userId=${userId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("User deleted successfully");
        fetchUsers();
      } else {
        toast.error(data.message || "Failed to delete user");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  return (
    <div className="pb-12 max-w-[1200px]">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Account Marketing User</h1>
      <p className="text-sm text-gray-500 mb-8">List of all your account marketing user</p>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#EBF5F6] flex items-center justify-center text-[#FF5722]">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Total account marketing users</p>
            <p className="text-3xl font-bold text-[#0E3B43]">{loading ? "-" : users.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by username, name, or location..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50"
          />
        </div>
        <select className="w-48 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 bg-white">
          <option>No of stores</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-[#0E3B43] px-6 py-4">
          <h3 className="text-white font-bold">User List</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-bold text-gray-900 uppercase">
                <th className="px-6 py-4">ACCOUNT MARKETING USER</th>
                <th className="px-6 py-4">NO OF STORES</th>
                <th className="px-6 py-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium">
              {users.map((u) => (
                <tr key={u._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-6 py-6 text-gray-800">{u.username}</td>
                  <td className="px-6 py-6 text-gray-800">
                    {u.hasAllStoreAccess ? "All Stores" : u.assignedStoreId ? "1" : "0"}
                  </td>
                  <td className="px-6 py-6 flex items-center justify-end gap-4">
                    <button
                      onClick={() => onEdit?.(u)}
                      className="text-[#00BCD4] hover:text-[#00ACC1]"
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(u._id)}
                      className="text-red-500 hover:text-red-600"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    No account marketing users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {users.length} of {users.length} account marketing user
          </span>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">
              Previous
            </button>
            <button className="px-4 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileView = ({ userData }: { userData: any }) => {
  const [customer, setCustomer] = useState<any>(null);
  
  useEffect(() => {
    if (!userData?.customerId) return;
    const fetchCustomer = async () => {
      try {
        const res = await fetch(`/api/customers?customerId=${userData.customerId}`);
        const data = await res.json();
        if (data.success && data.customers && data.customers.length > 0) {
          setCustomer(data.customers[0]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCustomer();
  }, [userData]);

  const userName = userData?.operatorName || userData?.username || "Admin";
  const userInitials = userName.charAt(0).toUpperCase();

  return (
  <div className="pb-12 max-w-[1000px]">
    <h1 className="text-3xl font-bold text-gray-900 mb-1">Profile</h1>
    <p className="text-sm text-gray-500 mb-8">Manage your account information and settings</p>
    
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div className="h-32 bg-[#1A454D]"></div>
      <div className="px-8 pb-8 flex items-end gap-6 -mt-12">
        <div className="w-28 h-28 rounded-2xl bg-[#FF5722] text-white flex items-center justify-center text-5xl font-bold border-4 border-white shadow-sm shrink-0 uppercase">
          {userInitials}
        </div>
        <div className="mb-2">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{userName}</h2>
          <p className="text-gray-500">{userData?.email || "No email provided"}</p>
        </div>
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
         <div className="flex items-center gap-3 mb-6 text-blue-500">
           <div className="p-2 bg-blue-50 rounded-lg"><User size={20} /></div>
           <h3 className="font-bold text-gray-900">Personal Information</h3>
         </div>
         <div className="space-y-4">
            <div>
             <p className="text-xs text-gray-400 mb-1">Full Name</p>
             <p className="font-semibold text-gray-900">{userName}</p>
           </div>
           <div>
             <p className="text-xs text-gray-400 mb-1">Phone number</p>
             <p className="font-semibold text-gray-900">{userData?.phone || "N/A"}</p>
           </div>
           <div>
             <p className="text-xs text-gray-400 mb-1">Email Address</p>
             <p className="font-semibold text-gray-900">{userData?.email || "N/A"}</p>
           </div>
         </div>
       </div>

       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
         <div className="flex items-center gap-3 mb-6 text-emerald-500">
           <div className="p-2 bg-emerald-50 rounded-lg"><ShieldCheck size={20} /></div>
           <h3 className="font-bold text-gray-900">Access Level</h3>
         </div>
         <div className="space-y-4">
           <div>
             <p className="text-xs text-gray-400 mb-2">Role</p>
             <span className="px-3 py-1 bg-[#EBF7F8] text-[#00BCD4] font-bold text-xs rounded-full tracking-wider">Account Admin</span>
           </div>
           <div>
             <p className="text-xs text-gray-400 mb-1">Description</p>
             <p className="text-gray-900 text-sm leading-relaxed">Manage customer accounts - Create account users, map devices to accounts</p>
           </div>
         </div>
       </div>

       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
         <div className="flex items-center gap-3 mb-6 text-fuchsia-500">
           <div className="p-2 bg-fuchsia-50 rounded-lg"><Building2 size={20} /></div>
           <h3 className="font-bold text-gray-900">Organization</h3>
         </div>
         <div className="space-y-4">
           <div>
             <p className="text-xs text-gray-400 mb-1">Company Name</p>
             <p className="font-semibold text-gray-900">{customer?.organizationName || userData?.companyName || userData?.storeName || "TechResell Australia"}</p>
           </div>
           <div>
             <p className="text-xs text-gray-400 mb-1">Location</p>
             <p className="font-semibold text-gray-900 flex items-center gap-1.5"><MapPin size={16} className="text-gray-400" /> {customer?.city || userData?.location || userData?.storeLocation || "Victoria, Australia"}</p>
           </div>
         </div>
       </div>

       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
         <div className="flex items-center gap-3 mb-6 text-orange-500">
           <div className="p-2 bg-orange-50 rounded-lg"><Clock size={20} /></div>
           <h3 className="font-bold text-gray-900">Account Activity</h3>
         </div>
         <div className="space-y-4">
           <div>
             <p className="text-xs text-gray-400 mb-1">Last Login</p>
             <p className="font-semibold text-gray-900">Today</p>
           </div>
           <div>
             <p className="text-xs text-gray-400 mb-1">Account Created</p>
             <p className="font-semibold text-gray-900">{userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : "January 15, 2024"}</p>
           </div>
           <div>
             <p className="text-xs text-gray-400 mb-1">Role Type</p>
             <p className="font-semibold text-gray-900">{userData?.role || 'Admin'}</p>
           </div>
         </div>
       </div>
    </div>
    
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
      <h3 className="font-bold text-gray-900 mb-6 text-lg">Your Permissions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
        <div className="flex items-center gap-3 text-gray-700">
          <div className="w-2 h-2 rounded-full bg-[#00BCD4]"></div>
          <span className="font-medium text-sm">Create and manage store users</span>
        </div>
        <div className="flex items-center gap-3 text-gray-700">
          <div className="w-2 h-2 rounded-full bg-[#00BCD4]"></div>
          <span className="font-medium text-sm">Map devices to stores</span>
        </div>
        <div className="flex items-center gap-3 text-gray-700">
          <div className="w-2 h-2 rounded-full bg-[#00BCD4]"></div>
          <span className="font-medium text-sm">Manage content and playlists</span>
        </div>
        <div className="flex items-center gap-3 text-gray-700">
          <div className="w-2 h-2 rounded-full bg-[#00BCD4]"></div>
          <span className="font-medium text-sm">View all store operations</span>
        </div>
      </div>
    </div>
    
    <div className="flex gap-4">
      <button className="px-8 py-3 bg-[#FF5722] text-white rounded-xl font-bold hover:bg-[#E64A19] transition-colors shadow-md shadow-[#FF5722]/20">
        Edit Profile
      </button>
      <button className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-colors">
        Change Password
      </button>
    </div>
  </div>
  );
};

// --- Main Layout ---

export default function AccountAdminDashboard() {
  const router = useRouter();
  const [expandedMenu, setExpandedMenu] = useState<string>("stores");
  const [activeView, setActiveView] = useState("dashboard"); // Default
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "account_admin") {
      router.push("/login");
      return;
    }

    const fetchUser = async () => {
      const id = localStorage.getItem("userId");
      if (!id) return;
      try {
        const res = await fetch(`/api/user?userId=${id}`);
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
          setUserData(data.data[0]);
        }
      } catch (err) {
        console.error("Failed to fetch profile", err);
      }
    };
    fetchUser();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    toast.success("Logged out successfully!");
    router.push("/login");
  };

  const sidebarLinks = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  
    { 
      id: "stores", 
      label: "Store Management", 
      icon: Store,
      subItems: [
        { id: "onboard_store", label: "Onboard new store", icon: Plus },
        { id: "all_stores", label: "View all stores", icon: ListIcon },
        { id: "connect_devices", label: "Connect new devices", icon: Settings2 },
        { id: "all_devices", label: "View all devices", icon: ListIcon }
      ]
    },
    { 
      id: "users", 
      label: "User Management", 
      icon: Users,
      subItems: [
        { id: "onboard_user", label: "Onboard a/c marketing user", icon: Plus },
        { id: "all_users", label: "View a/c marketing user", icon: ListIcon }
      ]
    },
    { id: "profile", label: "Profile", icon: User },
    { id: "support", label: "Support", icon: HeadphonesIcon },
  ];

  const handleMenuClick = (linkId: string, hasSubItems: boolean) => {
    if (linkId === "support") {
      window.location.href = "mailto:support@centelon.com";
      return;
    }
    if (hasSubItems) {
      setExpandedMenu(expandedMenu === linkId ? "" : linkId);
    } else {
      setActiveView(linkId);
      setExpandedMenu("");
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case "dashboard": return <DashboardView setActiveView={setActiveView} userData={userData} />;
      case "onboard_store": return <OnboardStoreView accountAdminId={userData?._id} customerId={userData?.customerId} onComplete={() => setActiveView("all_stores")} />;
      case "all_stores": return <AllStoresView setActiveView={setActiveView} setSelectedStore={setSelectedStore} accountAdminId={userData?._id} onEdit={(s) => { setSelectedStore(s); setActiveView("edit_store"); }} />;
      case "edit_store": return <EditStoreView store={selectedStore} accountAdminId={userData?._id} customerId={userData?.customerId} onComplete={() => setActiveView("all_stores")} />;
      case "store_detail": return <StoreDetailView store={selectedStore} setActiveView={setActiveView} />;
      case "connect_devices": return <AssignDeviceView customerId={userData?.customerId} accountAdminId={userData?._id} />;
      case "all_devices": return <AllDevicesView customerId={userData?.customerId} setActiveView={setActiveView} />;
      case "onboard_user": return <OnboardUserView accountAdminId={userData?._id} customerId={userData?.customerId} onComplete={() => setActiveView("all_users")} />;
      case "all_users": return <ViewUsersView accountAdminId={userData?._id} onEdit={(u) => { setSelectedUser(u); setActiveView("edit_user"); }} />;
      case "edit_user": return <EditUserView user={selectedUser} accountAdminId={userData?._id} customerId={userData?.customerId} onComplete={() => setActiveView("all_users")} />;
      case "create_announcement": return (
        <div className="pb-12">
          <h1 className="text-3xl font-bold text-[#10353C] mb-1">Create announcement</h1>
          <p className="text-sm text-[#64748B] mb-8">Deploy audio announcements across your customer's stores.</p>
          <CreateAnnouncementWizard 
            userId={userData?._id} 
            customerId={userData?.customerId} 
            userRole="account_admin" 
            onNavigate={(view) => setActiveView(view === "dashboard" ? "dashboard" : view)} 
          />
        </div>
      );
      case "profile": return <ProfileView userData={userData} />;
      default: return <div className="text-gray-500 font-medium">This module is under development.</div>;
    }
  };

  return (
    <div className="flex h-screen bg-[#EBF5F6] font-sans overflow-hidden">
      <Toaster position="top-right" />
      {/* Sidebar */}
      <aside className="w-[260px] bg-[#122A30] flex flex-col h-full text-white/80 shrink-0 shadow-xl z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00BCD4] flex items-center justify-center shrink-0 text-white shadow-md">
            <MonitorSmartphone size={24} />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">DeviceHub</h1>
            <p className="text-[#00BCD4] text-[10px]">Account Admin Portal</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {sidebarLinks.map((link) => {
             const isExpanded = expandedMenu === link.id;
             const isDirectlyActive = activeView === link.id;
             const isParentOfActive = link.subItems?.some(sub => sub.id === activeView);
             
             return (
               <div key={link.id} className="mb-1">
                 <button
                   onClick={() => handleMenuClick(link.id, !!link.subItems)}
                   className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 ${
                     isDirectlyActive
                       ? "bg-[#FF5722] text-white shadow-lg shadow-[#FF5722]/20"
                       : "hover:bg-white/5 text-white/70 hover:text-white"
                   }`}
                 >
                   <div className="flex items-center gap-3">
                     <link.icon size={20} className={(isDirectlyActive || isParentOfActive) && !isDirectlyActive ? "text-[#00BCD4]" : (isDirectlyActive ? "text-white" : "text-[#00BCD4]")} />
                     <span className="text-sm font-medium pr-2">{link.label}</span>
                   </div>
                   {link.subItems && (
                     <ChevronDown size={16} className={`opacity-60 transition-transform ${isExpanded ? "rotate-180" : ""} ${isDirectlyActive ? "text-white" : ""}`} />
                   )}
                 </button>

                 {/* Expanded Sub-items */}
                 {link.subItems && isExpanded && (
                   <div className="mt-2 space-y-1 ml-4 pl-4 border-l border-white/10">
                     {link.subItems.map(subItem => (
                       <button
                         key={subItem.id}
                         onClick={() => setActiveView(subItem.id)}
                         className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                           activeView === subItem.id
                             ? "bg-[#FF5722] text-white shadow-sm"
                             : "text-white/60 hover:text-white hover:bg-white/5"
                         }`}
                       >
                         {activeView === subItem.id ? <subItem.icon size={16} className="text-white opacity-100 shrink-0" /> : <ListIcon size={16} className="opacity-60 shrink-0"/>}
                         <span className="text-left whitespace-normal leading-tight">{subItem.label}</span>
                       </button>
                     ))}
                   </div>
                 )}
               </div>
             );
          })}

          <div className="mt-4 pt-4 border-t border-white/10">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 hover:bg-white/5 text-white/70 hover:text-white">
              <LogOut size={20} className="text-[#00BCD4]" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </nav>

        <div className="p-6 mt-auto border-t border-white/5">
          <div className="bg-[#18363D] rounded-xl p-4">
            <p className="text-white/40 text-[10px] mb-1">Platform Version</p>
            <p className="text-white font-bold text-sm">v2.4.1</p>
            <div className="h-px bg-white/10 my-3 w-full"></div>
            <p className="text-white/40 text-[10px]">Last updated: Mar 23, 2026</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-[72px] bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0 z-10 shadow-sm relative z-30">
          <div className="w-[500px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search devices, stores, media..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 transition-all font-medium"
            />
          </div>
          
          <div className="flex items-center gap-6">
            <button className="relative p-2 text-gray-500 hover:text-gray-900 transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            
            <div className="flex items-center gap-3 border-l border-gray-100 pl-6 cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-[#00BCD4] text-white flex items-center justify-center font-bold shadow-md shadow-[#00BCD4]/20 uppercase">
                {userData?.operatorName ? userData.operatorName.charAt(0) : (userData?.username ? userData.username.charAt(0) : "A")}
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">{userData?.operatorName || userData?.username || "Account Admin"}</h3>
                <p className="text-[10px] font-bold text-gray-500 tracking-wider">Account Admin</p>
              </div>
              <ChevronDown size={14} className="text-gray-400 ml-2" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 content-scrollbar bg-[#EBF5F6]">
          <div className="max-w-[1200px] mx-auto">
             {renderContent()}
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .content-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .content-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .content-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
