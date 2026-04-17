"use client";
import React, { useState } from "react";
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
  Info
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function ResellerDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("media"); // Default to Media provisioning as in screenshot

  const sidebarLinks = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "customers", label: "Customer Management", icon: Users, hasSubmenu: true },
    { id: "admins", label: "A/c admin Management", icon: UserCog, hasSubmenu: true },
    { id: "devices", label: "Device management", icon: Settings2, hasSubmenu: true },
    { id: "media", label: "Media provisioning", icon: ImageIcon },
    { id: "profile", label: "Profile", icon: User },
    { id: "support", label: "Support", icon: HeadphonesIcon, hasSubmenu: true },
  ];

  return (
    <div className="flex h-screen bg-[#EBF5F6] font-sans overflow-hidden">
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
          {sidebarLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => setActiveTab(link.id)}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-300 ${
                activeTab === link.id
                  ? "bg-[#FF5722] text-white shadow-lg shadow-[#FF5722]/20"
                  : "hover:bg-white/5 text-white/70 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <link.icon size={20} className={activeTab === link.id ? "text-white" : "text-[#00BCD4]"} />
                <span className="text-sm font-medium">{link.label}</span>
              </div>
              {link.hasSubmenu && (
                <ChevronDown size={16} className={`opacity-60 ${activeTab === link.id ? "text-white" : ""}`} />
              )}
            </button>
          ))}

          <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 hover:bg-white/5 text-white/70 hover:text-white mt-4">
            <LogOut size={20} className="text-[#00BCD4]" />
            <span className="text-sm font-medium">Logout</span>
          </button>
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
        {/* Top Header */}
        <header className="h-[72px] bg-white border-b border-gray-100 flex items-center justify-between px-8 shrink-0 z-10">
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
              <div className="w-10 h-10 rounded-xl bg-[#00BCD4] text-white flex items-center justify-center font-bold shadow-md shadow-[#00BCD4]/20">
                S
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Sarah Mitchell</h3>
                <p className="text-[10px] font-bold text-gray-500 tracking-wider">RESELLER</p>
              </div>
              <ChevronDown size={14} className="text-gray-400 ml-2" />
            </div>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto p-8 content-scrollbar">
          <div className="max-w-[1200px] mx-auto space-y-8 pb-12">
            
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-[#175C56] to-[#124B46] rounded-3xl p-8 text-white shadow-xl">
              <h1 className="text-3xl font-bold mb-2">Welcome back, Sarah Mitchell !</h1>
              <p className="text-white/80 mb-8">Here's what's happening with your accounts today.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/10 rounded-2xl p-6 border border-white/10 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-[#A1F4FD]">Total customers</h3>
                    <Users size={20} className="text-[#A1F4FD]" />
                  </div>
                  <h2 className="text-5xl font-bold text-white">12</h2>
                </div>

                <div className="bg-white/10 rounded-2xl p-6 border border-white/10 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-[#A1F4FD]">Active devices</h3>
                    <Monitor size={20} className="text-[#A1F4FD]" />
                  </div>
                  <h2 className="text-5xl font-bold text-white mb-3">24</h2>
                  <div className="flex items-center gap-4 text-xs text-white/50 font-medium">
                    <span className="text-white">Video devices : 16</span>
                    <span className="w-px h-3 bg-white/20"></span>
                    <span className="text-white">Audio devices : 08</span>
                  </div>
                </div>

                <div className="bg-white/10 rounded-2xl p-6 border border-white/10 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-[#A1F4FD]">Account admins</h3>
                    <UserCog size={20} className="text-[#A1F4FD]" />
                  </div>
                  <h2 className="text-5xl font-bold text-white">15</h2>
                </div>
              </div>
            </div>

            {/* Middle Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
              
              {/* Attention Required Section */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-[#006064] text-white rounded-lg">
                    <AlertTriangle size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Attention Required</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Warning Card 1 */}
                  <div className="bg-white rounded-3xl p-6 border-l-4 border-l-[#FF5722] shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-6">
                      <AlertTriangle size={20} className="text-[#FF5722]" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-800 mb-4 h-10">Accounts with no devices</h3>
                    <div className="text-4xl font-bold text-gray-900 mb-6">5</div>
                    <button className="text-[#FF5722] text-sm flex items-center gap-2 font-bold hover:gap-3 transition-all">
                      View details <ArrowRight size={16} />
                    </button>
                  </div>

                  {/* Warning Card 2 */}
                  <div className="bg-white rounded-3xl p-6 border-l-4 border-l-[#FF5722] shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-6">
                      <AlertTriangle size={20} className="text-[#FF5722]" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-800 mb-4 h-10">Devices with no accounts</h3>
                    <div className="text-4xl font-bold text-gray-900 mb-6">7</div>
                    <button className="text-[#FF5722] text-sm flex items-center gap-2 font-bold hover:gap-3 transition-all">
                      View details <ArrowRight size={16} />
                    </button>
                  </div>

                  {/* Warning Card 3 */}
                  <div className="bg-white rounded-3xl p-6 border-l-4 border-l-[#FF5722] shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center mb-6">
                      <Monitor className="text-[#FF5722]" size={20} />
                    </div>
                    <h3 className="text-sm font-medium text-gray-800 mb-4 h-10">Media provisioning needed</h3>
                    <div className="text-4xl font-bold text-gray-900 mb-6">4</div>
                    <button className="text-[#FF5722] text-sm flex items-center gap-2 font-bold hover:gap-3 transition-all">
                      Check now <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
                
                {/* Lower Cards - Customers & Admins Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  {/* Customers Overview */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-gray-50 p-2 rounded-lg text-[#FF5722]">
                        <Users size={20} />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">Customers</h3>
                    </div>
                    
                    <div className="bg-[#EBF7F8] rounded-2xl p-4 flex items-center justify-between mb-3 border border-[#00BCD4]/20">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Total</p>
                        <p className="text-2xl font-bold text-gray-900">12</p>
                      </div>
                      <TrendingUp size={24} className="text-[#00BCD4]" />
                    </div>
                    
                    <div className="bg-[#F0FDF4] rounded-2xl p-4 flex items-center justify-between mb-6 border border-green-200/50">
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin size={16} className="text-[#FF5722]" />
                        <span className="text-sm">Locations</span>
                      </div>
                      <span className="text-lg font-bold text-gray-900">9</span>
                    </div>
                    
                    <button className="w-full py-4 bg-[#FF5722] text-white rounded-xl font-bold hover:bg-[#F4511E] transition-colors shadow-md shadow-[#FF5722]/20">
                      Onboard new customer
                    </button>
                  </div>

                  {/* Account Admins Overview */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-gray-50 p-2 rounded-lg text-[#FF5722]">
                        <UserCog size={20} />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">Account Admins</h3>
                    </div>
                    
                    <div className="bg-[#EBF7F8] rounded-2xl p-4 flex items-center justify-between mb-3 border border-[#00BCD4]/20">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Total</p>
                        <p className="text-2xl font-bold text-gray-900">15</p>
                      </div>
                      <TrendingUp size={24} className="text-[#00BCD4]" />
                    </div>
                    
                    <div className="bg-[#F0FDF4] rounded-2xl p-4 flex items-center justify-between mb-6 border border-green-200/50">
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin size={16} className="text-[#FF5722]" />
                        <span className="text-sm">Locations</span>
                      </div>
                      <span className="text-lg font-bold text-gray-900">12</span>
                    </div>
                    
                    <button className="w-full py-4 bg-[#FF5722] text-white rounded-xl font-bold hover:bg-[#F4511E] transition-colors shadow-md shadow-[#FF5722]/20">
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
                    <button className="w-full py-4 px-6 bg-[#FF5722] text-white rounded-2xl font-bold hover:bg-[#F4511E] transition-all flex items-center justify-between shadow-lg shadow-[#FF5722]/20 group">
                      Assign device
                      <Plus size={20} className="group-hover:scale-125 transition-transform" />
                    </button>
                    
                    <button className="w-full py-4 px-6 bg-[#00BCD4] text-white rounded-2xl font-bold hover:bg-[#00ACC1] transition-all flex items-center justify-between shadow-lg shadow-[#00BCD4]/20 group">
                      Add customer
                      <Plus size={20} className="group-hover:scale-125 transition-transform" />
                    </button>
                    
                    <button className="w-full py-4 px-6 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl font-bold hover:border-gray-200 hover:bg-gray-50 transition-all flex items-center justify-between group">
                      View all devices
                      <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>

            </div>
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
