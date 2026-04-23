"use client";
import React, { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  LayoutDashboard,
  Users,
  UserCog,
  Settings2,
  Image as ImageIcon,
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
  Info,
  List as ListIcon,
  Save,
  Edit,
  Trash2,
  ChevronRight,
  Volume2,
  Clock,
  Building2,
  ShieldCheck,
  Upload,
  Music,
  Zap,
  Video,
  ArrowLeft,
  List,
  Trash
} from "lucide-react";
import { useRouter } from "next/navigation";

// --- Sub-components for different views ---

const DashboardView = ({ setActiveView }: { setActiveView: (view: string) => void }) => {
  const [stats, setStats] = useState({ customers: 0, devices: 0, video: 0, audio: 0, admins: 0, accountsNoDevices: 0, devicesNoAccounts: 0, mediaProvisioning: 0, customerLocations: 0, adminLocations: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resellerId = localStorage.getItem("userId");
    if (!resellerId) return;

    const fetchStats = async () => {
      try {
        const [cRes, dRes, uRes] = await Promise.all([
          fetch(`/api/customers?resellerId=${resellerId}`),
          fetch(`/api/devices?resellerId=${resellerId}`),
          fetch(`/api/user?controllerId=${resellerId}`)
        ]);
        
        const cData = await cRes.json();
        const dData = await dRes.json();
        const uData = await uRes.json();

        let devicesArr = Array.isArray(dData) ? dData : [];
        let customersArr = (cData.success && Array.isArray(cData.customers)) ? cData.customers : [];
        let customersCount = customersArr.length;
        let customerLocations = new Set();
        customersArr.forEach((c: any) => {
          if (c.city) customerLocations.add(c.city.toLowerCase().trim());
        });
        
        let accountsNoDevices = customersArr.filter((c: any) => !devicesArr.some(d => d.customerId === c._id)).length;
        let devicesNoAccounts = devicesArr.filter(d => !d.customerId).length;
        // Approximation for media provisioning needed (not active or not mapped)
        let mediaProvisioning = devicesArr.filter(d => d.status === 'inactive' || !d.customerId).length;
        let adminsCount = 0;
        let adminLocations = new Set();
        if (uData.success && Array.isArray(uData.data)) {
           uData.data.forEach((u: any) => {
             if (u.role === 'admin' || u.role === 'user' || u.customerId) {
               adminsCount++;
               if (u.location) adminLocations.add(u.location.toLowerCase().trim());
             }
           });
        }

        let video = 0;
        let audio = 0;
        devicesArr.forEach(d => {
           if (d.typeId?.name?.toLowerCase().includes("video")) video++;
           else if (d.typeId?.name?.toLowerCase().includes("audio")) audio++;
        });

        setStats({
          customers: customersCount,
          devices: devicesArr.length,
          video,
          audio,
          admins: adminsCount,
          accountsNoDevices,
          devicesNoAccounts,
          mediaProvisioning,
          customerLocations: customerLocations.size,
          adminLocations: adminLocations.size
        });
      } catch (err) {
        console.error("Failed to fetch dashboard stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
  <div className="space-y-8 pb-12">
    {/* Welcome Banner */}
    <div className="bg-gradient-to-r from-[#175C56] to-[#124B46] rounded-3xl p-8 text-white shadow-xl">
      <h1 className="text-3xl font-bold mb-2">Welcome to your dashboard</h1>
      <p className="text-white/80 mb-8">Here's what's happening with your accounts today.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/10 rounded-2xl p-6 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-[#A1F4FD]">Total customers</h3>
            <Users size={20} className="text-[#A1F4FD]" />
          </div>
          <h2 className="text-5xl font-bold text-white">{loading ? "-" : stats.customers}</h2>
        </div>

        <div className="bg-white/10 rounded-2xl p-6 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-[#A1F4FD]">Active devices</h3>
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
            <h3 className="font-medium text-[#A1F4FD]">Account admins</h3>
            <UserCog size={20} className="text-[#A1F4FD]" />
          </div>
          <h2 className="text-5xl font-bold text-white">{loading ? "-" : stats.admins}</h2>
        </div>
      </div>
    </div>

    {/* Middle Layout Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
      <div>
        {/* Attention Required Section */}
        {(!loading && (stats.accountsNoDevices > 0 || stats.devicesNoAccounts > 0 || stats.mediaProvisioning > 0)) && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-[#006064] text-white rounded-lg">
                <AlertTriangle size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Attention Required</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.accountsNoDevices > 0 && (
                <div className="bg-white rounded-3xl p-6 border-l-4 border-l-[#FF5722] shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-6">
                    <AlertTriangle size={20} className="text-[#FF5722]" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-800 mb-4 h-10">Accounts with no devices</h3>
                  <div className="text-4xl font-bold text-gray-900 mb-6">{stats.accountsNoDevices}</div>
                  <button onClick={() => setActiveView("all_customers")} className="text-[#FF5722] text-sm flex items-center gap-2 font-bold hover:gap-3 transition-all">
                    View details <ArrowRight size={16} />
                  </button>
                </div>
              )}

              {stats.devicesNoAccounts > 0 && (
                <div className="bg-white rounded-3xl p-6 border-l-4 border-l-[#FF5722] shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-6">
                    <AlertTriangle size={20} className="text-[#FF5722]" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-800 mb-4 h-10">Devices with no accounts</h3>
                  <div className="text-4xl font-bold text-gray-900 mb-6">{stats.devicesNoAccounts}</div>
                  <button onClick={() => setActiveView("assign_device")} className="text-[#FF5722] text-sm flex items-center gap-2 font-bold hover:gap-3 transition-all">
                    View details <ArrowRight size={16} />
                  </button>
                </div>
              )}

              {stats.mediaProvisioning > 0 && (
                <div className="bg-white rounded-3xl p-6 border-l-4 border-l-[#FF5722] shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-6">
                    <Monitor className="text-[#FF5722]" size={20} />
                  </div>
                  <h3 className="text-sm font-medium text-gray-800 mb-4 h-10">Media provisioning needed</h3>
                  <div className="text-4xl font-bold text-gray-900 mb-6">{stats.mediaProvisioning}</div>
                  <button onClick={() => setActiveView("view_devices")} className="text-[#FF5722] text-sm flex items-center gap-2 font-bold hover:gap-3 transition-all">
                    Check now <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Lower Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gray-50 p-2 rounded-lg text-[#FF5722]">
                <Users size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Customers</h3>
            </div>
            
            <div className="bg-[#EBF7F8] rounded-2xl p-4 flex items-center justify-between mb-4 border border-[#00BCD4]/20">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? "-" : stats.customers}</p>
              </div>
              <TrendingUp size={24} className="text-[#00BCD4]" />
            </div>
            
            <div className="bg-green-50 rounded-2xl p-4 flex items-center justify-between mb-6 border border-green-100">
               <div className="flex items-center gap-2">
                 <MapPin size={18} className="text-[#FF5722]" />
                 <p className="text-sm text-gray-800 font-medium">Locations</p>
               </div>
               <p className="text-xl font-bold text-gray-900">{loading ? "-" : stats.customerLocations}</p>
            </div>
            
            <button 
              onClick={() => setActiveView("onboard_customer")}
              className="w-full py-4 bg-[#FF5722] text-white rounded-xl font-bold hover:bg-[#F4511E] transition-colors shadow-md shadow-[#FF5722]/20"
            >
              Onboard new customer
            </button>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gray-50 p-2 rounded-lg text-[#FF5722]">
                <UserCog size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Account Admins</h3>
            </div>
            
            <div className="bg-[#EBF7F8] rounded-2xl p-4 flex items-center justify-between mb-4 border border-[#00BCD4]/20">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total</p>
                <p className="text-2xl font-bold text-gray-900">{loading ? "-" : stats.admins}</p>
              </div>
              <TrendingUp size={24} className="text-[#00BCD4]" />
            </div>
            
            <div className="bg-green-50 rounded-2xl p-4 flex items-center justify-between mb-6 border border-green-100">
               <div className="flex items-center gap-2">
                 <MapPin size={18} className="text-[#FF5722]" />
                 <p className="text-sm text-gray-800 font-medium">Locations</p>
               </div>
               <p className="text-xl font-bold text-gray-900">{loading ? "-" : stats.adminLocations}</p>
            </div>
            
            <button 
              onClick={() => setActiveView("onboard_admin")}
              className="w-full py-4 bg-[#FF5722] text-white rounded-xl font-bold hover:bg-[#F4511E] transition-colors shadow-md shadow-[#FF5722]/20"
            >
              Onboard new admin
            </button>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Quick Actions */}
      <div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 sticky top-0">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Quick Actions</h3>
          <div className="space-y-4">
            <button 
              onClick={() => setActiveView("assign_device")}
              className="w-full py-4 px-6 bg-[#FF5722] text-white rounded-2xl font-bold hover:bg-[#F4511E] transition-all flex items-center justify-between shadow-lg shadow-[#FF5722]/20 group"
            >
              Assign device
              <Plus size={20} className="group-hover:scale-125 transition-transform" />
            </button>
            <button 
              onClick={() => setActiveView("onboard_customer")}
              className="w-full py-4 px-6 bg-[#00BCD4] text-white rounded-2xl font-bold hover:bg-[#00ACC1] transition-all flex items-center justify-between shadow-lg shadow-[#00BCD4]/20 group"
            >
              Add customer
              <Plus size={20} className="group-hover:scale-125 transition-transform" />
            </button>
            <button 
              onClick={() => setActiveView("view_devices")}
              className="w-full py-4 px-6 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl font-bold hover:border-gray-200 hover:bg-gray-50 transition-all flex items-center justify-between group"
            >
              View all devices
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

const OnboardCustomerView = () => {
  const [formData, setFormData] = useState({
    organizationName: '',
    contactName: '',
    phone: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    pinCode: '',
    city: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.organizationName || !formData.email) {
      toast.error("Organization Name and Email are required");
      return;
    }
    setIsLoading(true);
    const loadingToast = toast.loading("Creating customer entity...");
    try {
      const resellerId = localStorage.getItem("userId");

      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, resellerId })
      });
      const data = await res.json();
      if(data.success) {
        toast.success('Customer entity created successfully!', { id: loadingToast });
        setFormData({ organizationName: '', contactName: '', phone: '', email: '', addressLine1: '', addressLine2: '', pinCode: '', city: ''});
      } else {
        toast.error(data.error || 'Failed to save customer', { id: loadingToast });
      }
    } catch (e) {
      toast.error('Internal Server Error while saving customer', { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  return (
  <div className="pb-12 max-w-[1000px]">
    <h1 className="text-3xl font-bold text-gray-900 mb-2">Onboard New Customer</h1>
    <p className="text-gray-600 mb-8">Here's what's happening with your accounts today.</p>

    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500">
          <User size={20} />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Customer Information</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Organization's legal name <span className="text-red-500">*</span></label>
          <input type="text" value={formData.organizationName} onChange={e => setFormData({...formData, organizationName: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Contact person's name <span className="text-red-500">*</span></label>
          <input type="text" value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Phone number <span className="text-red-500">*</span></label>
          <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Email ID <span className="text-red-500">*</span></label>
          <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Business address line 1 <span className="text-red-500">*</span></label>
          <input type="text" value={formData.addressLine1} onChange={e => setFormData({...formData, addressLine1: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Business address line 2</label>
          <input type="text" value={formData.addressLine2} onChange={e => setFormData({...formData, addressLine2: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Pin Code <span className="text-red-500">*</span></label>
          <input type="text" value={formData.pinCode} onChange={e => setFormData({...formData, pinCode: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">City <span className="text-red-500">*</span></label>
          <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={handleSubmit} disabled={isLoading} className="flex items-center gap-2 px-6 py-3 bg-[#FF5722] hover:bg-[#F4511E] disabled:bg-gray-400 text-white rounded-xl font-bold transition-all shadow-md shadow-[#FF5722]/20 disabled:shadow-none">
          <Save size={18} />
          {isLoading ? "Saving..." : "Create customer entity"}
        </button>
        <button onClick={() => setFormData({ organizationName: '', contactName: '', phone: '', email: '', addressLine1: '', addressLine2: '', pinCode: '', city: ''})} className="px-6 py-3 bg-[#F8FAFC] hover:bg-gray-100 text-gray-600 rounded-xl font-bold border border-gray-200 transition-all">
          Cancel
        </button>
      </div>
    </div>
  </div>
  );
};

const AllCustomersView = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);

  useEffect(() => {
    const resellerId = localStorage.getItem("userId");
    const query = resellerId ? `?resellerId=${resellerId}` : '';
    
    fetch(`/api/customers${query}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.customers)) {
          setCustomers(data.customers);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  return (
  <>
  <div className="pb-12">
    <h1 className="text-3xl font-bold text-gray-900 mb-1">All Customers</h1>
    <p className="text-sm text-gray-500 mb-8">Manage all account users in the system</p>
    
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#EBF5F6] flex items-center justify-center text-[#FF5722]">
          <Users size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Total Customers</p>
          <p className="text-3xl font-bold text-[#0E3B43]">{customers.length}</p>
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
        <option>Status</option>
      </select>
    </div>

    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-[#0E3B43] px-6 py-4">
        <h3 className="text-white font-bold">Customer List</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-bold text-gray-900 uppercase">
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Created at</th>
              <th className="px-6 py-4">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {isLoading ? (
               <tr>
                 <td colSpan={4} className="px-6 py-8 text-center text-gray-400">Loading customers...</td>
               </tr>
            ) : customers.length === 0 ? (
               <tr>
                 <td colSpan={4} className="px-6 py-12 text-center">
                    <Users size={32} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No customers found.</p>
                 </td>
               </tr>
            ) : (
               customers.map((c) => (
                 <tr key={c._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                   <td className="px-6 py-4 font-medium">{c.organizationName || c.contactName}</td>
                   <td className="px-6 py-4 text-gray-500">{c.city || 'N/A'}, {c.pinCode || ''}</td>
                   <td className="px-6 py-4 text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                   <td className="px-6 py-4 flex items-center gap-3">
                     <button className="px-4 py-1.5 bg-[#FF5722] text-white rounded-lg text-xs font-bold">View account</button>
                     <button onClick={() => setEditingCustomer(c)} className="text-[#00BCD4] hover:text-[#00ACC1]"><Edit size={16} /></button>
                     <button className="text-red-500 hover:text-red-600"><Trash2 size={16} /></button>
                   </td>
                 </tr>
               ))
            )}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
        <span>Showing {customers.length} customers</span>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">Previous</button>
          <button className="px-4 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">Next</button>
        </div>
      </div>
    </div>

    {/* Edit Customer Modal */}
    {editingCustomer && (
      <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm">
        <div className="bg-white rounded-3xl p-8 w-[700px] shadow-2xl relative animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
           <button onClick={() => setEditingCustomer(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-all z-10">✖</button>
           <div className="flex items-center gap-3 mb-6 shrink-0">
             <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-[#FF5722]">
               <Edit size={20} />
             </div>
             <h2 className="text-2xl font-bold text-gray-900">Edit Customer</h2>
           </div>
           
           <div className="grid grid-cols-2 gap-4 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-4">
             <div className="col-span-2 md:col-span-1">
               <label className="block text-sm font-semibold text-gray-700 mb-1">Organization Name</label>
               <input type="text" value={editingCustomer.organizationName || ''} onChange={e => setEditingCustomer({...editingCustomer, organizationName: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#00BCD4]/50 focus:outline-none" />
             </div>
             <div className="col-span-2 md:col-span-1">
               <label className="block text-sm font-semibold text-gray-700 mb-1">Contact Name</label>
               <input type="text" value={editingCustomer.contactName || ''} onChange={e => setEditingCustomer({...editingCustomer, contactName: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#00BCD4]/50 focus:outline-none" />
             </div>
             <div className="col-span-2 md:col-span-1">
               <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
               <input type="text" value={editingCustomer.phone || ''} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#00BCD4]/50 focus:outline-none" />
             </div>
             <div className="col-span-2 md:col-span-1">
               <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
               <input type="email" value={editingCustomer.email || ''} onChange={e => setEditingCustomer({...editingCustomer, email: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#00BCD4]/50 focus:outline-none" />
             </div>
             <div className="col-span-2">
               <label className="block text-sm font-semibold text-gray-700 mb-1">Address Line 1</label>
               <input type="text" value={editingCustomer.addressLine1 || ''} onChange={e => setEditingCustomer({...editingCustomer, addressLine1: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#00BCD4]/50 focus:outline-none" />
             </div>
             <div className="col-span-2">
               <label className="block text-sm font-semibold text-gray-700 mb-1">Address Line 2</label>
               <input type="text" value={editingCustomer.addressLine2 || ''} onChange={e => setEditingCustomer({...editingCustomer, addressLine2: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#00BCD4]/50 focus:outline-none" />
             </div>
             <div className="col-span-2 md:col-span-1">
               <label className="block text-sm font-semibold text-gray-700 mb-1">City</label>
               <input type="text" value={editingCustomer.city || ''} onChange={e => setEditingCustomer({...editingCustomer, city: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#00BCD4]/50 focus:outline-none" />
             </div>
             <div className="col-span-2 md:col-span-1">
               <label className="block text-sm font-semibold text-gray-700 mb-1">PIN Code</label>
               <input type="text" value={editingCustomer.pinCode || ''} onChange={e => setEditingCustomer({...editingCustomer, pinCode: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#00BCD4]/50 focus:outline-none" />
             </div>
           </div>
           
           <div className="pt-4 shrink-0 border-t border-gray-100">
             <button onClick={() => {
                toast.success("Customer settings updated via Quick Edit!"); 
                setCustomers(customers.map(c => c._id === editingCustomer._id ? editingCustomer : c));
                setEditingCustomer(null);
             }} className="w-full py-3 bg-[#0E3B43] text-white rounded-xl font-bold hover:bg-[#155662] shadow-md shadow-[#0E3B43]/20 transition-all flex items-center justify-center gap-2">
               Save Changes
             </button>
           </div>
        </div>
      </div>
    )}

  </div>
  </>
  );
};

const OnboardAdminView = () => {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerId: '',
    username: '',
    email: '',
    location: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const resellerId = localStorage.getItem("userId");
    const query = resellerId ? `?resellerId=${resellerId}` : '';
    
    fetch(`/api/customers${query}`).then(res => res.json()).then(data => {
      if (data.success) {
        setCustomers(data.customers);
      }
    }).catch(console.error);
  }, []);

  const handleSubmit = async () => {
    if(!formData.password || formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match or are empty!");
      return;
    }
    if(!formData.customerId) {
      toast.error("Please select a customer first!");
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Creating account admin...");
    try {
      const resellerId = localStorage.getItem("userId");
      const res = await fetch('/api/auth/register-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, controllerId: resellerId })
      });
      const data = await res.json();
      if(data.success) {
        toast.success("Account admin created successfully!", { id: loadingToast });
        setFormData({ customerId: '', username: '', email: '', location: '', password: '', confirmPassword: ''});
      } else {
        toast.error(data.error || "Failed to create account admin", { id: loadingToast });
      }
    } catch(e) {
      toast.error("Network or Server error", { id: loadingToast });
    } finally {
      setIsLoading(false);
    }
  };

  return (
  <div className="pb-12 max-w-[1000px]">
    <h1 className="text-3xl font-bold text-gray-900 mb-2">Onboard New Account Admin</h1>
    <p className="text-gray-600 mb-8">Please fill in the below required information.</p>

    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-500">
          <User size={20} />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Information</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Customer <span className="text-red-500">*</span></label>
          <select value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 bg-white">
            <option value="">Select a Customer</option>
            {customers.map((c: any) => (
               <option key={c._id} value={c._id}>{c.organizationName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Account admin username <span className="text-red-500">*</span></label>
          <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Email ID <span className="text-red-500">*</span></label>
          <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" />
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
        <button onClick={handleSubmit} disabled={isLoading} className="flex items-center gap-2 px-6 py-3 bg-[#FF5722] hover:bg-[#F4511E] disabled:bg-gray-400 text-white rounded-xl font-bold transition-all shadow-md shadow-[#FF5722]/20 disabled:shadow-none">
          <Save size={18} />
          {isLoading ? "Enrolling..." : "Create account admin"}
        </button>
        <button onClick={() => setFormData({customerId: '', username: '', email: '', location: '', password: '', confirmPassword: ''})} className="px-6 py-3 bg-[#F8FAFC] hover:bg-gray-100 text-gray-600 rounded-xl font-bold border border-gray-200 transition-all">
          Cancel
        </button>
      </div>
    </div>
  </div>
  );
};

const AllAdminsView = () => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingAdmin, setEditingAdmin] = useState<any>(null);

  useEffect(() => {
    const resellerId = localStorage.getItem("userId");
    const query = resellerId ? `?controllerId=${resellerId}` : '';
    
    fetch(`/api/user${query}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          // Filter to show only account admins
          const fetchedAdmins = data.data.filter((u: any) => u.role === 'admin' || u.role === 'account_admin' || u.role === 'user' || u.customerId);
          setAdmins(fetchedAdmins);
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  return (
  <>
  <div className="pb-12">
    <h1 className="text-3xl font-bold text-gray-900 mb-1">All Account Admin</h1>
    <p className="text-sm text-gray-500 mb-8">Manage all account admins in the system</p>
    
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#EBF5F6] flex items-center justify-center text-[#FF5722]">
          <Users size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Total account admins</p>
          <p className="text-3xl font-bold text-[#0E3B43]">{admins.length}</p>
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
        <option>No of devices</option>
      </select>
    </div>

    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-[#0E3B43] px-6 py-4">
        <h3 className="text-white font-bold">Admin List</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-xs font-bold text-gray-900 uppercase">
              <th className="px-6 py-4">Account Admin</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4">Customer ID</th>
              <th className="px-6 py-4">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {isLoading ? (
               <tr>
                 <td colSpan={5} className="px-6 py-8 text-center text-gray-400">Loading account admins...</td>
               </tr>
            ) : admins.length === 0 ? (
               <tr>
                 <td colSpan={5} className="px-6 py-12 text-center">
                    <UserCog size={32} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No account admins found.</p>
                 </td>
               </tr>
            ) : (
               admins.map((admin) => (
                 <tr key={admin._id} className="border-b border-gray-50 hover:bg-gray-50/50">
                   <td className="px-6 py-4 font-medium">{admin.operatorName || admin.username}</td>
                   <td className="px-6 py-4 text-gray-600">{admin.email || 'N/A'}</td>
                   <td className="px-6 py-4 text-gray-600">{admin.location || 'N/A'}</td>
                   <td className="px-6 py-4 text-[#00BCD4] font-medium">{admin.customerId ? "Mapped" : "None"}</td>
                   <td className="px-6 py-4 flex items-center gap-3">
                     <button className="px-4 py-1.5 bg-[#FF5722] text-white rounded-lg text-xs font-bold w-24">Assign now</button>
                     <button onClick={() => setEditingAdmin(admin)} className="text-[#00BCD4]"><Edit size={16} /></button>
                     <button className="text-red-500"><Trash2 size={16} /></button>
                   </td>
                 </tr>
               ))
            )}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
        <span>Showing {admins.length} account admin</span>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">Previous</button>
          <button className="px-4 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">Next</button>
        </div>
      </div>
      </div>
    </div>

    {/* Edit Admin Modal */}
    {editingAdmin && (
      <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm">
        <div className="bg-white rounded-3xl p-8 w-[500px] shadow-2xl relative animate-in fade-in zoom-in duration-200">
           <button onClick={() => setEditingAdmin(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-all">✖</button>
           <div className="flex items-center gap-3 mb-6">
             <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-[#FF5722]">
               <Edit size={20} />
             </div>
             <h2 className="text-2xl font-bold text-gray-900">Edit Admin</h2>
           </div>
           
           <div className="space-y-4">
             <div>
               <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
               <input type="text" value={editingAdmin.operatorName || editingAdmin.username || ''} onChange={e => setEditingAdmin({...editingAdmin, operatorName: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#00BCD4]/50 focus:outline-none" />
             </div>
             <div>
               <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
               <input type="email" value={editingAdmin.email || ''} onChange={e => setEditingAdmin({...editingAdmin, email: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#00BCD4]/50 focus:outline-none" />
             </div>
             <div>
               <label className="block text-sm font-semibold text-gray-700 mb-1">Location</label>
               <input type="text" value={editingAdmin.location || ''} onChange={e => setEditingAdmin({...editingAdmin, location: e.target.value})} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#00BCD4]/50 focus:outline-none" />
             </div>
             <div className="pt-4">
               <button onClick={() => {
                  toast.success("Admin settings updated via Quick Edit!"); 
                  setAdmins(admins.map(a => a._id === editingAdmin._id ? editingAdmin : a));
                  setEditingAdmin(null);
               }} className="w-full py-3 bg-[#0E3B43] text-white rounded-xl font-bold hover:bg-[#155662] shadow-md shadow-[#0E3B43]/20 transition-all flex items-center justify-center gap-2">
                 Save Changes
               </button>
             </div>
           </div>
        </div>
      </div>
    )}
  </>
  );
};

const AssignDeviceView = ({ setActiveView }: { setActiveView: (v: string) => void }) => {
  const [serialNumber, setSerialNumber] = useState("");
  const [deviceData, setDeviceData] = useState<any>(null);
  const [customerId, setCustomerId] = useState("");
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const resellerId = localStorage.getItem("userId");
    if (resellerId) {
      fetch(`/api/customers?resellerId=${resellerId}`)
        .then(res => res.json())
        .then(data => {
           if (data.success && Array.isArray(data.customers)) {
              setCustomers(data.customers);
           }
        }).catch(console.error);
    }
  }, []);

  const handleVerifyDevice = async () => {
    if (!serialNumber.trim()) return;
    setIsLoading(true);
    setErrorMsg("");
    setDeviceData(null);
    try {
      const res = await fetch(`/api/get-device?serialNumber=${encodeURIComponent(serialNumber.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Device not found");
      } else {
        setDeviceData(data.deviceData);
      }
    } catch (err) {
      setErrorMsg("Failed to verify device");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignDevice = async () => {
    if (!deviceData || !customerId) {
        setErrorMsg("Please verify a device and select a customer first.");
        return;
    }
    const resellerId = localStorage.getItem("userId");
    if (!resellerId) return;

    setIsAssigning(true);
    setErrorMsg("");
    const loadingToast = toast.loading("Assigning device...");

    try {
       const res = await fetch('/api/reseller-device-assignment', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           deviceId: deviceData.id || deviceData._id,
           customerId,
           resellerId
         })
       });
       const data = await res.json();
       if (data.success) {
          toast.success(data.message || 'Device successfully assigned!', { id: loadingToast });
          setDeviceData(null);
          setSerialNumber('');
          setCustomerId('');
          setTimeout(() => setActiveView('view_devices'), 800);
       } else {
          // 409 Conflict = already assigned to another customer
          const msg = data.message || "Failed to assign device";
          toast.error(msg, { id: loadingToast });
          setErrorMsg(msg);
       }
    } catch (e) {
       const msg = "Network or Server error";
       toast.error(msg, { id: loadingToast });
       setErrorMsg(msg);
    } finally {
       setIsAssigning(false);
    }
  };

  return (
    <div className="pb-12 max-w-[800px]">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Assign new device</h1>
      <p className="text-gray-600 mb-8">Follow the steps below to assign a device to a customer.</p>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-[#FF5722]">
            <Monitor size={20} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Device Assignment</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Enter serial number <span className="text-red-500">*</span></label>
            <div className="flex gap-4 max-w-2xl">
              <input 
                type="text" 
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyDevice()}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50" 
                placeholder="Ex. SN12345"
              />
              <button 
                onClick={handleVerifyDevice}
                disabled={isLoading}
                className="px-6 py-3 bg-[#0E3B43] text-white rounded-xl font-bold hover:bg-[#1A5C55] transition-colors whitespace-nowrap disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? "Verifying..." : "Verify"}
              </button>
            </div>
            {errorMsg ? (
              <p className="text-sm text-red-500 mt-2 font-medium">{errorMsg}</p>
            ) : (
              <p className="text-xs text-gray-500 mt-2">Try: SN12345 or SN67890</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm device <span className="text-red-500">*</span></label>
            {deviceData ? (
              <div className="border border-[#00BCD4] bg-cyan-50/30 rounded-xl p-4 flex gap-6 max-w-2xl shadow-sm">
                <div className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden shrink-0">
                  {deviceData.imageUrl ? (
                    <img src={deviceData.imageUrl} alt={deviceData.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                      <Monitor size={40} className="text-slate-400" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-center flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#00BCD4] font-bold uppercase tracking-wider">{deviceData.type?.name || "Unknown Type"}</span>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${deviceData.status === 'active' || deviceData.status === 'online' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                      {deviceData.status || "unmapped"}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{deviceData.name}</h3>
                  <p className="text-sm text-gray-600">Serial: <span className="font-semibold text-gray-900 bg-white/50 px-1 py-0.5 rounded text-xs">{deviceData.serialNumber}</span></p>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center max-w-2xl text-center bg-gray-50">
                <Monitor size={32} className="text-gray-300 mb-3" />
                <p className="text-sm text-gray-500 font-medium">Verify a serial number to confirm device details</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select customer <span className="text-red-500">*</span></label>
            <select 
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 max-w-2xl bg-white"
            >
              <option value="">Select a customer to assign</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>{c.organizationName || c.contactName}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-8 pt-6 border-t border-gray-100">
          <button 
            disabled={!deviceData || isAssigning}
            onClick={handleAssignDevice}
            className="flex items-center gap-2 px-6 py-3 bg-[#FF5722] hover:bg-[#F4511E] disabled:bg-gray-300 disabled:text-gray-500 text-white rounded-xl font-bold transition-all shadow-md shadow-[#FF5722]/20 disabled:shadow-none"
          >
            <Save size={18} />
            {isAssigning ? "Assigning..." : "Assign now"}
          </button>
          <button onClick={() => { setDeviceData(null); setSerialNumber(''); setCustomerId(''); }} className="px-6 py-3 bg-white hover:bg-gray-50 text-gray-600 rounded-xl font-bold border border-gray-200 transition-all">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const AllDevicesView = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [assigningDevice, setAssigningDevice] = useState<any>(null); // device being quick-assigned
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    const resellerId = localStorage.getItem("userId");
    if (!resellerId) { setIsLoading(false); return; }
    const query = `?resellerId=${resellerId}`;

    Promise.all([
      fetch(`/api/devices${query}`).then(r => r.json()),
      fetch(`/api/customers${query}`).then(r => r.json())
    ]).then(([dData, cData]) => {
      setDevices(Array.isArray(dData) ? dData : []);
      if (cData.success && Array.isArray(cData.customers)) setCustomers(cData.customers);
      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      setIsLoading(false);
    });
  }, []);

  const handleDisconnect = async (deviceId: string) => {
    const proceed = window.confirm("Are you sure you want to completely disconnect this device from its assigned customer?");
    if (!proceed) return;

    const resellerId = localStorage.getItem("userId");
    if (!resellerId) return;

    const loadingToast = toast.loading("Disconnecting device...");
    try {
      const res = await fetch('/api/reseller-device-assignment', {
         method: 'DELETE',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ deviceId, resellerId })
      });
      const data = await res.json();
      if (data.success) {
         toast.success("Device disconnected successfully!", { id: loadingToast });
         setDevices(devices.map(d => d._id.toString() === deviceId ? { ...d, customerId: null } : d));
      } else {
         toast.error(data.message || "Failed to disconnect device", { id: loadingToast });
      }
    } catch (err) {
      toast.error("An error occurred during disconnection", { id: loadingToast });
    }
  };

  const handleQuickAssign = async () => {
    if (!selectedCustomerId || !assigningDevice) return;
    const resellerId = localStorage.getItem("userId");
    if (!resellerId) return;

    setIsAssigning(true);
    const loadingToast = toast.loading("Assigning device...");
    try {
      const res = await fetch('/api/reseller-device-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: assigningDevice._id,
          customerId: selectedCustomerId,
          resellerId
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Device assigned successfully!", { id: loadingToast });
        // Update local state to reflect the assignment
        setDevices(devices.map(d =>
          d._id.toString() === assigningDevice._id.toString()
            ? { ...d, customerId: selectedCustomerId }
            : d
        ));
        setAssigningDevice(null);
        setSelectedCustomerId('');
      } else {
        toast.error(data.message || "Failed to assign device", { id: loadingToast });
      }
    } catch (err) {
      toast.error("Network error during assignment", { id: loadingToast });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
  <>
  <div className="pb-12 max-w-[1200px]">
    <h1 className="text-3xl font-bold text-gray-900 mb-1">All devices</h1>
    <p className="text-sm text-gray-500 mb-8">Here is the list of all your devices</p>
    
    <div className="flex flex-col md:flex-row gap-6 mb-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-1 items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-orange-50 flex items-center justify-center text-[#FF5722]">
          <Monitor size={32} />
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Total devices</p>
          <p className="text-3xl font-bold text-[#0E3B43]">{devices.length}</p>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-[2] items-center gap-6">
        <span className="text-gray-500 font-medium whitespace-nowrap">Filter by</span>
        <select className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 bg-white text-gray-700">
          <option>Status</option>
        </select>
        <select className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 bg-white text-gray-700">
          <option>Device type</option>
        </select>
      </div>
    </div>

    {isLoading ? (
      <div className="flex justify-center p-8 text-gray-400">Loading devices...</div>
    ) : devices.length === 0 ? (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <Monitor size={48} className="text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Devices Available</h3>
        <p className="text-gray-500 mb-6">You haven't assigned any devices to your customers yet.</p>
        <button className="px-6 py-3 bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-xl font-bold transition-all shadow-md shadow-[#FF5722]/20">
          Assign new device
        </button>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {devices.map((device: any) => {
          const assignedCustomer = device.customerId
            ? customers.find(c => c._id === device.customerId?.toString() || c._id?.toString() === device.customerId?.toString())
            : null;

          return (
          <div key={device._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-[#0E3B43] rounded-xl flex items-center justify-center text-white shadow-md overflow-hidden">
                   {device.imageUrl ? (
                      <img src={device.imageUrl} alt={device.name} className="w-full h-full object-cover" />
                   ) : (
                      <Monitor size={24} />
                   )}
                </div>
                <span className={`px-2.5 py-1 ${device.status === 'active' || device.status === 'online' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'} rounded-full text-xs font-bold flex items-center gap-1.5`}><MonitorSmartphone size={12} /> {device.status || 'unknown'}</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-4 text-lg line-clamp-1">{device.name}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Type:</span>
                  <span className="font-semibold text-gray-900">{device.typeId?.name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">S/N:</span>
                  <span className="font-semibold text-gray-900">{device.serialNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Customer:</span>
                  <span className="font-semibold text-gray-900 text-right line-clamp-1 max-w-[120px]">
                    {assignedCustomer?.organizationName || assignedCustomer?.contactName || (device.customerId ? "Assigned" : "Unassigned")}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-[#0E3B43] flex items-center">
              <button className="flex-1 py-3 text-white text-sm font-semibold hover:bg-white/10 transition-colors">Edit</button>
              <div className="w-px h-4 bg-white/20"></div>
              {device.customerId ? (
                 <button onClick={() => handleDisconnect(device._id)} className="flex-1 py-3 text-red-400 text-sm font-semibold hover:bg-white/10 transition-colors">Disconnect</button>
              ) : (
                 <button
                   onClick={() => { setAssigningDevice(device); setSelectedCustomerId(''); }}
                   className="flex-1 py-3 text-[#00BCD4] text-sm font-semibold hover:bg-white/10 transition-colors"
                 >Assign</button>
              )}
            </div>
          </div>
          );
        })}
      </div>
    )}
  </div>

  {/* Quick Assign Modal */}
  {assigningDevice && (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 w-[480px] shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={() => setAssigningDevice(null)}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-all"
        >✖</button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#EBF7F8] flex items-center justify-center text-[#0E3B43]">
            <Monitor size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Assign Device</h2>
            <p className="text-sm text-gray-500">{assigningDevice.name} · {assigningDevice.serialNumber}</p>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Select account to assign <span className="text-red-500">*</span>
          </label>
          {customers.length === 0 ? (
            <div className="p-4 bg-orange-50 rounded-xl text-sm text-orange-700 border border-orange-100">
              No customer accounts found. Please onboard a customer first.
            </div>
          ) : (
            <select
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="w-full p-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 bg-white text-gray-800"
            >
              <option value="">— Choose a customer account —</option>
              {customers.map((c: any) => (
                <option key={c._id} value={c._id}>
                  {c.organizationName || c.contactName}{c.city ? ` · ${c.city}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleQuickAssign}
            disabled={!selectedCustomerId || isAssigning}
            className="flex-1 py-3 bg-[#0E3B43] text-white rounded-xl font-bold hover:bg-[#155662] disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-md shadow-[#0E3B43]/20 disabled:shadow-none"
          >
            {isAssigning ? 'Assigning...' : 'Confirm Assignment'}
          </button>
          <button
            onClick={() => setAssigningDevice(null)}
            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )}
  </>
  );
};

const MediaProvisioningView = ({ onCreateCampaign }: { onCreateCampaign: (user: any) => void }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const resellerId = localStorage.getItem("userId");
      if (!resellerId) return;
      try {
        // Step 1: Get all customers under this reseller
        const cRes = await fetch(`/api/customers?resellerId=${resellerId}`);
        const cData = await cRes.json();
        const customers: any[] = cData.success && Array.isArray(cData.customers) ? cData.customers : [];

        if (customers.length === 0) {
          setRows([]);
          setLoading(false);
          return;
        }

        // Step 2: For each customer, fetch their account_marketing users by customerId
        const userFetches = customers.map((c: any) =>
          fetch(`/api/user?customerId=${c._id}`).then(r => r.json())
        );
        const userResults = await Promise.all(userFetches);

        // Step 3: Build one row per account_marketing user
        const built: any[] = [];
        userResults.forEach((uData, idx) => {
          const customer = customers[idx];
          const users: any[] = uData.success && Array.isArray(uData.data) ? uData.data : [];
          users
            .filter((u: any) => u.role === "account_marketing")
            .forEach((u: any) => {
              built.push({
                customerId: customer._id,
                customerName: customer.organizationName || customer.contactName || "Unknown Customer",
                location: customer.city || u.location || "-",
                marketingUser: u.operatorName || u.username || "-",
                provisioned: !!u.mediaProvisioning,
                uploadedFiles: u.provisionedFiles || [],
                userId: u._id
              });
            });
        });

        setRows(built);
      } catch (err) {
        console.error("Failed to load media provisioning data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleProvisioning = async (userId: string, currentStatus: boolean) => {
    setToggling(userId);
    try {
      const res = await fetch(`/api/user?userId=${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaProvisioning: !currentStatus })
      });
      const data = await res.json();
      if (data.success) {
        setRows(prev => prev.map(r => r.userId === userId ? { ...r, provisioned: !currentStatus } : r));
        toast.success(!currentStatus ? "Access granted!" : "Access revoked!");
      } else {
        toast.error("Failed to update provisioning status");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setToggling(null);
    }
  };

  const filtered = rows.filter(r =>
    r.customerName.toLowerCase().includes(search.toLowerCase()) ||
    r.marketingUser.toLowerCase().includes(search.toLowerCase()) ||
    r.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="pb-12 max-w-[1200px]">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">Media provisioning</h1>
      <p className="text-sm text-gray-500 mb-8">Access control for account marketing users to upload media.</p>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by username, name, or location..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50"
          />
        </div>
        <select className="w-56 px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 bg-white text-gray-700">
          <option>Media provisioning</option>
          <option>Access provided</option>
          <option>Access locked</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-[#0E3B43] px-6 py-4">
          <h3 className="text-white font-bold">All media</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-bold text-gray-900 uppercase bg-white">
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Account Marketing User</th>
                <th className="px-6 py-4 whitespace-nowrap">Location</th>
                <th className="px-6 py-4 whitespace-nowrap">Media Provisioning</th>
                <th className="px-6 py-4">Document Upload By Account User</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400">Loading provisioning data...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <ImageIcon size={32} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No account marketing users found.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-gray-900">{row.customerName}</td>
                    <td className="px-6 py-4 text-gray-600">{row.marketingUser}</td>
                    <td className="px-6 py-4 text-gray-500">{row.location}</td>
                    <td className="px-6 py-4">
                      {row.provisioned ? (
                        <span className="inline-flex items-center gap-1.5 text-green-600 font-bold">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          Access<br/>provided
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-red-500 font-bold">
                          <span className="w-2 h-2 rounded-full bg-red-400"></span>
                          Access<br/>locked
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {row.provisioned ? (
                        row.uploadedFiles.length > 0 ? (
                          <div className="space-y-1">
                            {row.uploadedFiles.map((f: any, fi: number) => (
                              <a key={fi} href={f.url || f} target="_blank" rel="noreferrer" className="block text-[#00BCD4] hover:underline text-xs truncate max-w-[200px]">
                                {f.name || f.url || f}
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-xs">Awaiting files from Account User</span>
                        )
                      ) : (
                        <div className="flex items-center gap-2 text-gray-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                          <span className="text-xs">Access not granted</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {row.provisioned ? (
                          <>
                            <button 
                              onClick={() => onCreateCampaign(row)}
                              className="px-4 py-2 bg-[#FF5722] text-white rounded-xl text-xs font-bold shadow-sm hover:bg-[#F4511E] transition-colors text-center"
                            >
                              Create<br/>campaign
                            </button>
                            <button
                              onClick={() => toggleProvisioning(row.userId, row.provisioned)}
                              disabled={toggling === row.userId}
                              className="px-4 py-2 bg-red-50 text-red-500 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                            >
                              {toggling === row.userId ? "..." : "Revoke"}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => toggleProvisioning(row.userId, row.provisioned)}
                            disabled={toggling === row.userId}
                            className="px-5 py-2 bg-[#00BCD4] text-white rounded-xl text-xs font-bold shadow-sm hover:bg-[#00ACC1] transition-colors disabled:opacity-50"
                          >
                            {toggling === row.userId ? "..." : "Grant access"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>Showing {filtered.length} of {rows.length} users</span>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">Previous</button>
            <button className="px-4 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ResellerCreateCampaignFormView = ({ actingUser, onBack }: { actingUser: any, onBack: () => void }) => {
  const [sourceMode, setSourceMode] = useState<"none" | "upload" | "existing">("none");
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [stores, setStores] = useState<any[]>([]);
  const [cfg, setCfg] = useState({ name: "", type: "", startDate: "", endDate: "", startTime: "", endTime: "" });
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [globalVol, setGlobalVol] = useState({ min: 30, max: 80 });

  useEffect(() => {
    if (!actingUser) return;
    const fetchStores = async () => {
      try {
        const res = await fetch(`/api/user?customerId=${actingUser.customerId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setStores(data.data.filter((u: any) => u.role === 'store'));
        }
      } catch (err) {
        console.error("Failed to fetch stores", err);
      }
    };
    fetchStores();
  }, [actingUser]);

  const fetchMedia = async () => {
    if (!actingUser) return;
    setLoadingMedia(true);
    try {
      const res = await fetch(`/api/media?userId=${actingUser.userId}`);
      const data = await res.json();
      setMediaItems(data.media || data.mediaFiles || data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMedia(false);
    }
  };

  useEffect(() => {
    if (sourceMode === "existing") fetchMedia();
  }, [sourceMode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(files);
  };

  const handleUploadConfirm = async () => {
    if (uploadedFiles.length === 0) return toast.error("No files selected");
    setUploading(true);
    const formData = new FormData();
    formData.append("userId", actingUser.userId);
    formData.append("userRole", "account_marketing");
    uploadedFiles.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
      formData.append(`fileNames[${index}]`, file.name);
    });

    try {
      const res = await fetch("/api/media/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        toast.success("Files uploaded successfully!");
        setUploadedFiles([]);
        setSourceMode("existing");
      } else {
        toast.error(data.message || "Upload failed");
      }
    } catch (err) {
      toast.error("Upload error");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitPlaylist = async () => {
    if (!cfg.name || selectedStoreIds.length === 0) return toast.error("Playlist name and store selection are required");
    if (selectedMediaIds.length === 0) return toast.error("Please select media files");

    setSubmitting(true);
    const body = {
      userId: actingUser.userId,
      name: cfg.name,
      type: cfg.type || "media",
      startDate: cfg.startDate,
      endDate: cfg.endDate,
      startTime: cfg.startTime,
      endTime: cfg.endTime,
      daysOfWeek: selectedDays,
      globalMinVolume: globalVol.min,
      globalMaxVolume: globalVol.max,
      deviceIds: selectedStoreIds,
      mediaIds: selectedMediaIds
    };

    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Campaign created successfully!");
        onBack();
      } else {
        toast.error(data.message || "Failed to create campaign");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-12 max-w-[1000px]">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors font-medium">
        <ArrowLeft size={18} /> Back to Media Provisioning
      </button>

      <div className="flex gap-8">
        <div className="w-2 bg-[#FF5722] rounded-full shrink-0"></div>
        <div className="flex-1 space-y-8">
          {/* Step 1 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-[#0E3B43] px-8 py-6 flex items-center gap-6">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#0E3B43] font-bold text-xl shadow-sm">1</div>
              <div>
                <h2 className="text-white text-xl font-bold">Select media</h2>
                <p className="text-white/70 text-sm font-medium uppercase tracking-wider">Audio, video, image. Size upto 5kb</p>
              </div>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                <div 
                  onClick={() => { setSourceMode("upload"); fileInputRef.current?.click(); }}
                  className={`border-2 border-dashed ${sourceMode === "upload" ? "border-[#FF5722] bg-orange-50/50" : "border-gray-200 hover:bg-gray-50"} rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all`}
                >
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-[#FF5722] mb-4">
                    <Upload size={28} />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">Upload new</h3>
                  <p className="text-xs text-gray-500 font-medium">Add media from your device</p>
                </div>
                <div 
                  onClick={() => setSourceMode("existing")}
                  className={`border-2 border-dashed ${sourceMode === "existing" ? "border-[#FF5722] bg-orange-50/50" : "border-gray-200 hover:bg-gray-50"} rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all`}
                >
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-[#FF5722] mb-4">
                    <ListIcon size={28} />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">Select from existing list</h3>
                  <p className="text-xs text-gray-500 font-medium">Choose from previously uploaded media</p>
                </div>
              </div>

              {sourceMode === "upload" && (
                <div className="mt-8 pt-8 border-t border-gray-100">
                  <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Upload files</label>
                  <div onClick={() => fileInputRef.current?.click()} className="w-full p-4 border-2 border-gray-100 rounded-xl bg-gray-50 cursor-pointer text-gray-700 text-sm font-bold flex items-center justify-between">
                    <span>{uploadedFiles.length > 0 ? uploadedFiles.map(f => f.name).join(", ") : "Click to select files…"}</span>
                    <Upload size={18} className="text-gray-400" />
                  </div>
                  <input ref={fileInputRef} type="file" multiple hidden accept="audio/*,video/*,image/*" onChange={handleFileChange} />
                  
                  {uploadedFiles.length > 0 && (
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between bg-orange-50/50 rounded-2xl p-5 border border-orange-100">
                       <span className="text-sm text-[#FF5722] font-bold mb-4 sm:mb-0">{uploadedFiles.length} file(s) selected</span>
                       <div className="flex gap-4 w-full sm:w-auto">
                         <button className="flex-1 sm:flex-none px-6 py-2.5 bg-white border border-gray-200 text-[#FF5722] rounded-xl text-xs font-bold shadow-sm hover:bg-gray-50 transition-all uppercase tracking-wide">Preview media</button>
                         <button onClick={handleUploadConfirm} disabled={uploading} className="flex-1 sm:flex-none px-6 py-2.5 bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-xl text-xs font-bold shadow-md shadow-[#FF5722]/20 transition-all uppercase tracking-wide disabled:opacity-50">
                           {uploading ? "Uploading..." : "Confirm selection"}
                         </button>
                       </div>
                    </div>
                  )}
                </div>
              )}
              
              {sourceMode === "existing" && (
                <div className="mt-8 pt-8 border-t border-gray-100">
                  {loadingMedia ? (
                    <div className="py-12 text-center"><div className="w-8 h-8 border-4 border-[#FF5722] border-t-transparent rounded-full animate-spin mx-auto"></div></div>
                  ) : mediaItems.length === 0 ? (
                    <p className="text-center text-gray-500 py-8 font-medium">No media found for this user.</p>
                  ) : (
                    <div className="overflow-hidden border border-gray-100 rounded-xl">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="p-4 w-12 text-center">Select</th>
                            <th className="p-4">Media Name</th>
                            <th className="p-4">Type</th>
                          </tr>
                        </thead>
                        <tbody className="font-medium text-gray-700">
                          {mediaItems.map(m => (
                            <tr key={m._id} className="border-t border-gray-50 hover:bg-gray-50/50">
                              <td className="p-4 text-center">
                                <input type="checkbox" checked={selectedMediaIds.includes(m._id)} onChange={() => setSelectedMediaIds(prev => prev.includes(m._id) ? prev.filter(id => id !== m._id) : [...prev, m._id])} className="w-4 h-4 rounded text-[#FF5722] focus:ring-[#FF5722]" />
                              </td>
                              <td className="p-4 font-bold">{m.name}</td>
                              <td className="p-4"><span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] uppercase font-bold">{m.type}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-[#0E3B43] px-8 py-6 flex items-center gap-6">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#0E3B43] font-bold text-xl shadow-sm">2</div>
              <div>
                <h2 className="text-white text-xl font-bold">Let's setup your playlist</h2>
                <p className="text-white/70 text-sm font-medium uppercase tracking-wider">Setup your playlist here</p>
              </div>
            </div>
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Playlist name</label>
                  <input type="text" placeholder="Enter playlist name" value={cfg.name} onChange={e => setCfg({...cfg, name: e.target.value})} className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Type</label>
                  <select value={cfg.type} onChange={e => setCfg({...cfg, type: e.target.value})} className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 font-medium text-gray-700">
                    <option value="">Select type</option>
                    <option value="audio">Audio</option>
                    <option value="video">Video</option>
                    <option value="image">Image</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Start date</label>
                  <input type="date" value={cfg.startDate} onChange={e => setCfg({...cfg, startDate: e.target.value})} className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 font-medium uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">End date</label>
                  <input type="date" value={cfg.endDate} onChange={e => setCfg({...cfg, endDate: e.target.value})} className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 font-medium uppercase" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Start time</label>
                  <input type="time" value={cfg.startTime} onChange={e => setCfg({...cfg, startTime: e.target.value})} className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 font-medium whitespace-pre" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">End time</label>
                  <input type="time" value={cfg.endTime} onChange={e => setCfg({...cfg, endTime: e.target.value})} className="w-full p-3.5 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 font-medium whitespace-pre" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-4 uppercase tracking-wide">Days of the week</label>
                <div className="flex flex-wrap gap-3">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                    const isActive = selectedDays.includes(day);
                    return (
                      <button 
                        key={day} 
                        onClick={() => setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])}
                        className={`w-14 h-12 flex items-center justify-center rounded-xl font-bold text-xs transition-all border ${isActive ? 'bg-[#FF5722] text-white border-[#FF5722] shadow-md shadow-[#FF5722]/20' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="font-bold text-gray-900 tracking-tight uppercase text-xs">Global volume settings</h3>
                  <div className="flex gap-4 text-[10px] font-bold">
                    <span className="text-[#00BCD4] uppercase">Min: {globalVol.min}%</span>
                    <span className="text-[#FF5722] uppercase">Max: {globalVol.max}%</span>
                  </div>
                </div>
                <div className="flex gap-6 mb-8">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 font-bold mb-2 block uppercase tracking-wide">Min Volume</label>
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={globalVol.min} 
                      onChange={(e) => setGlobalVol({...globalVol, min: parseInt(e.target.value)})} 
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#00BCD4]"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 font-bold mb-2 block uppercase tracking-wide">Max Volume</label>
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={globalVol.max} 
                      onChange={(e) => setGlobalVol({...globalVol, max: parseInt(e.target.value)})} 
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF5722]"
                    />
                  </div>
                </div>
                <button type="button" onClick={() => {toast.success("Volume applied for all files");}} className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all uppercase tracking-wide">Apply volume for all files</button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Apply to stores</label>
                   <span className="text-xs font-bold text-[#FF5722]">{selectedStoreIds.length} stores selected</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar p-1">
                  {stores.map(store => {
                    const isSelected = selectedStoreIds.includes(store._id);
                    return (
                      <div 
                        key={store._id}
                        onClick={() => setSelectedStoreIds(prev => prev.includes(store._id) ? prev.filter(id => id !== store._id) : [...prev, store._id])}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'bg-orange-50/50 border-[#FF5722]' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 ${isSelected ? 'bg-[#FF5722] border-[#FF5722]' : 'border-gray-200'}`}>
                           {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">{store.storeName || store.organizationName || store.username}</p>
                          <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">{store.storeLocation || store.city || store.location || "Location not set"}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center gap-4 pt-8 mt-4 border-t border-gray-100">
                <button 
                  onClick={() => {
                    setCfg({ name: "", type: "", startDate: "", endDate: "", startTime: "", endTime: "" });
                    setSelectedStoreIds([]);
                    setSelectedMediaIds([]);
                    setSelectedDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
                  }}
                  className="px-8 py-3.5 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all"
                >
                  Reset
                </button>
                <button 
                  onClick={handleSubmitPlaylist}
                  disabled={submitting}
                  className="flex-1 max-w-sm flex items-center justify-center gap-3 px-8 py-3.5 bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-2xl font-bold text-sm transition-all shadow-lg shadow-[#FF5722]/20 disabled:opacity-50"
                >
                  <Zap size={18} fill="white" />
                  {submitting ? "Connecting..." : "Connect playlist to stores"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileView = () => {
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
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
  }, []);

  return (
  <div className="pb-12 max-w-[1000px]">
    <h1 className="text-3xl font-bold text-gray-900 mb-1">Profile</h1>
    <p className="text-sm text-gray-500 mb-8">Manage your account information and settings</p>
    
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
      <div className="h-32 bg-[#0E3B43]"></div>
      <div className="px-8 pb-8 flex items-end gap-6 -mt-12">
        <div className="w-28 h-28 rounded-2xl bg-[#FF5722] text-white flex items-center justify-center text-5xl font-bold border-4 border-white shadow-sm shrink-0 uppercase">
          {userData?.operatorName ? userData.operatorName.charAt(0) : (userData?.username ? userData.username.charAt(0) : "S")}
        </div>
        <div className="mb-2">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{userData?.operatorName || userData?.username || "Sarah Mitchell"}</h2>
          <p className="text-gray-500">{userData?.email || "sarah@reseller.com.au"}</p>
        </div>
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
         <div className="flex items-center gap-3 mb-6 text-purple-600">
           <div className="p-2 bg-purple-50 rounded-lg"><User size={20} /></div>
           <h3 className="font-bold text-gray-900">Personal Information</h3>
         </div>
         <div className="space-y-4">
            <div>
             <p className="text-xs text-gray-400 mb-1">Full Name</p>
             <p className="font-semibold text-gray-900">{userData?.operatorName || "Sarah Mitchell"}</p>
           </div>
           <div>
             <p className="text-xs text-gray-400 mb-1">System Username</p>
             <p className="font-semibold text-gray-900">@{userData?.username || "sarah_m"}</p>
           </div>
           <div>
             <p className="text-xs text-gray-400 mb-1">Phone number</p>
             <p className="font-semibold text-gray-900">{userData?.phone || "+6476 8767"}</p>
           </div>
           <div>
             <p className="text-xs text-gray-400 mb-1">Email Address</p>
             <p className="font-semibold text-gray-900">{userData?.email || "sarah@reseller.com.au"}</p>
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
             <span className="px-3 py-1 bg-emerald-50 text-emerald-600 font-bold text-xs rounded-full uppercase tracking-wider">{userData?.role || "RESELLER"}</span>
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
             <p className="font-semibold text-gray-900">{userData?.companyName || "TechResell Australia"}</p>
           </div>
           <div>
             <p className="text-xs text-gray-400 mb-1">Location</p>
             <p className="font-semibold text-gray-900 flex items-center gap-1.5"><MapPin size={16} className="text-gray-400" /> {userData?.location || "Victoria, Australia"}</p>
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
             <p className="text-xs text-gray-400 mb-1">Total Sessions</p>
             <p className="font-semibold text-gray-900">147</p>
           </div>
         </div>
       </div>
    </div>
    
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-8">
      <h3 className="font-bold text-gray-900 mb-6 text-lg">Your Permissions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
        <div className="flex items-center gap-3 text-gray-700">
          <div className="w-2 h-2 rounded-full bg-[#00BCD4]"></div>
          <span>Create and manage store users</span>
        </div>
        <div className="flex items-center gap-3 text-gray-700">
          <div className="w-2 h-2 rounded-full bg-[#00BCD4]"></div>
          <span>Map devices to stores</span>
        </div>
        <div className="flex items-center gap-3 text-gray-700">
          <div className="w-2 h-2 rounded-full bg-[#00BCD4]"></div>
          <span>Manage content and playlists</span>
        </div>
        <div className="flex items-center gap-3 text-gray-700">
          <div className="w-2 h-2 rounded-full bg-[#00BCD4]"></div>
          <span>View all store operations</span>
        </div>
      </div>
    </div>
    
    <div className="flex gap-4">
      <label className="cursor-pointer px-8 py-3 bg-[#FF5722] text-white rounded-xl font-bold hover:bg-[#E64A19] transition-colors shadow-md shadow-[#FF5722]/20 text-center inline-block">
        Upload Photo
        <input type="file" className="hidden" accept="image/*" />
      </label>
      <button className="px-8 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition-colors">Change Password</button>
    </div>
  </div>
  );
};

// --- Main Layout ---

export default function ResellerDashboard() {
  const router = useRouter();
  const [expandedMenu, setExpandedMenu] = useState<string>("dashboard");
  const [activeView, setActiveView] = useState("dashboard"); // Default
  const [userData, setUserData] = useState<any>(null);
  const [activeUserForCampaign, setActiveUserForCampaign] = useState<any>(null);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userRole");
    toast.success("Logged out successfully!");
    router.push("/login");
  };

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    if (role !== "reseller") {
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

  const sidebarLinks = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { 
      id: "customers", 
      label: "Customer Management", 
      icon: Users,
      subItems: [
        { id: "onboard_customer", label: "Onboard new customer", icon: Plus },
        { id: "all_customers", label: "View all customers", icon: ListIcon }
      ]
    },
    { 
      id: "admins", 
      label: "A/c admin Management", 
      icon: UserCog,
      subItems: [
        { id: "onboard_admin", label: "Onboard new a/c admin", icon: Plus },
        { id: "all_admins", label: "View all a/c admins", icon: ListIcon }
      ]
    },
    { 
      id: "devices", 
      label: "Device management", 
      icon: Settings2,
      subItems: [
        { id: "assign_device", label: "Assign new device", icon: Plus },
        { id: "view_devices", label: "View all devices", icon: ListIcon }
      ]
    },
    { id: "media", label: "Media provisioning", icon: ImageIcon },
    { id: "profile", label: "Profile", icon: User },
    { id: "support", label: "Support", icon: HeadphonesIcon },
  ];

  const handleMenuClick = (linkId: string, hasSubItems: boolean) => {
    if (linkId === "support") {
      window.location.href = "mailto:support@centelon.com?subject=Reseller%20Portal%20Support";
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
      case "dashboard": return <DashboardView setActiveView={setActiveView} />;
      case "onboard_customer": return <OnboardCustomerView />;
      case "all_customers": return <AllCustomersView />;
      case "onboard_admin": return <OnboardAdminView />;
      case "all_admins": return <AllAdminsView />;
      case "assign_device": return <AssignDeviceView setActiveView={setActiveView} />;
      case "view_devices": return <AllDevicesView />;
      case "media": return <MediaProvisioningView onCreateCampaign={(u) => { setActiveUserForCampaign(u); setActiveView("create_campaign"); }} />;
      case "create_campaign": return <ResellerCreateCampaignFormView actingUser={activeUserForCampaign} onBack={() => { setActiveView("media"); setActiveUserForCampaign(null); }} />;
      case "profile": return <ProfileView />;
      default: return <div className="text-gray-500 font-medium">This module is under development.</div>;
    }
  };

  return (
    <div className="flex h-screen bg-[#EBF5F6] font-sans overflow-hidden">
      <Toaster position="top-right" />
      {/* Sidebar */}
      <aside className="w-[260px] bg-[#0E3B43] flex flex-col h-full text-white/80 shrink-0 shadow-xl z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00BCD4]/10 flex items-center justify-center shrink-0">
            <MonitorSmartphone className="text-[#00BCD4]" size={24} />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">DeviceHub</h1>
            <p className="text-[#00BCD4] text-xs">Reseller Portal</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {sidebarLinks.map((link) => {
             const isExpanded = expandedMenu === link.id;
             const isDirectlyActive = activeView === link.id;
             
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
                     <link.icon size={20} className={isDirectlyActive ? "text-white" : "text-[#00BCD4]"} />
                     <span className="text-sm font-medium">{link.label}</span>
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
                         <subItem.icon size={16} className={activeView === subItem.id ? "text-white opacity-100" : "opacity-60"} />
                         <span>{subItem.label}</span>
                       </button>
                     ))}
                   </div>
                 )}
               </div>
             );
          })}

          <div className="mt-4 pt-4 border-t border-white/10">
            <button
               onClick={() => handleMenuClick("profile", false)} 
               className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 ${
                 activeView === "profile" 
                   ? "bg-[#FF5722] text-white shadow-lg shadow-[#FF5722]/20" 
                   : "hover:bg-white/5 text-white/70 hover:text-white"
               }`}
            >
              <User size={20} className={activeView === "profile" ? "text-white" : "text-[#00BCD4]"} />
              <span className="text-sm font-medium">Profile</span>
            </button>
            <button onClick={handleLogout} className="w-full mt-1 flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 hover:bg-white/5 text-white/70 hover:text-white">
              <LogOut size={20} className="text-[#00BCD4]" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </nav>

        <div className="p-6 mt-auto">
          <div className="bg-[#1A454D] rounded-xl p-4 border border-white/5">
            <p className="text-white/40 text-xs mb-1">Platform Version</p>
            <p className="text-white font-bold text-sm">v2.4.1</p>
            <p className="text-white/40 text-[10px] mt-2">Last updated: Mar 23, 2026</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-[72px] bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0 z-10 shadow-sm">
          <div className="w-[400px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search devices, stores, media..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00BCD4]/50 transition-all font-medium"
            />
          </div>
          
          <div className="flex items-center gap-6">
            <button className="relative p-2 text-gray-500 hover:text-gray-900 transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            
            <div className="flex items-center gap-3 border-l border-gray-100 pl-6 cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-[#00BCD4] text-white flex items-center justify-center font-bold shadow-md shadow-[#00BCD4]/20 uppercase">
                {userData?.operatorName ? userData.operatorName.charAt(0) : (userData?.username ? userData.username.charAt(0) : "S")}
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">{userData?.operatorName || userData?.username || "Sarah Mitchell"}</h3>
                <p className="text-[10px] font-bold text-gray-500 tracking-wider">RESELLER</p>
              </div>
              <ChevronDown size={14} className="text-gray-400 ml-2" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 content-scrollbar">
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
