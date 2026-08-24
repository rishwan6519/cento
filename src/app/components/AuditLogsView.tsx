"use client";
import React, { useState, useEffect } from "react";
import { Activity, Clock, User, FileText, Server, Trash2, ShieldAlert, CheckCircle2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function AuditLogsView({ userId }: { userId?: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/audit-logs?userId=${userId}`);
        const data = await res.json();
        if (data.success) {
          setLogs(data.logs || []);
        } else {
          toast.error("Failed to fetch logs");
        }
      } catch (err) {
        console.error(err);
        toast.error("Network error");
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [userId]);

  const handleClearLogs = async () => {
    if (!confirm("Are you sure you want to clear all audit logs? This cannot be undone.")) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/audit-logs?userId=${userId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Logs cleared successfully");
        setLogs([]);
      } else {
        toast.error(data.error || "Failed to clear logs");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const getActionTheme = (action: string) => {
    if (action.includes('CREATE') || action.includes('LOGIN')) {
      return {
        bg: 'bg-emerald-500',
        badge: 'text-emerald-700 bg-emerald-50 border-emerald-200 shadow-emerald-100',
        icon: <CheckCircle2 size={16} />
      };
    }
    if (action.includes('DELETE')) {
      return {
        bg: 'bg-rose-500',
        badge: 'text-rose-700 bg-rose-50 border-rose-200 shadow-rose-100',
        icon: <AlertCircle size={16} />
      };
    }
    if (action.includes('UPDATE') || action.includes('ASSIGN')) {
      return {
        bg: 'bg-blue-500',
        badge: 'text-blue-700 bg-blue-50 border-blue-200 shadow-blue-100',
        icon: <Activity size={16} />
      };
    }
    return {
      bg: 'bg-slate-500',
      badge: 'text-slate-700 bg-slate-50 border-slate-200 shadow-slate-100',
      icon: <ShieldAlert size={16} />
    };
  };

  const formatDetails = (details: any) => {
    if (!details || typeof details !== 'object') return <span className="text-gray-500">No additional details provided.</span>;
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {Object.entries(details).map(([key, value]) => (
          <div key={key} className="bg-gray-50/80 px-3 py-1.5 rounded-lg border border-gray-200/60 flex items-center gap-2 shadow-[0_2px_8px_rgb(0,0,0,0.02)]">
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
            <span className="text-sm text-gray-900 font-semibold">{String(value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="pb-16 max-w-[1000px] mx-auto">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-[#0B2830] to-[#154654] rounded-3xl p-8 mb-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight flex items-center gap-3">
            <ShieldAlert className="text-[#00BCD4]" size={36} /> Audit Trail
          </h1>
          <p className="text-white/70 font-medium">Monitor recent security events and system changes across your account.</p>
        </div>
        {logs.length > 0 && !loading && (
          <button 
            onClick={handleClearLogs}
            className="relative z-10 px-6 py-3 bg-white/10 border border-white/20 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-500 hover:border-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all duration-300 backdrop-blur-sm group whitespace-nowrap"
          >
            <Trash2 size={18} className="group-hover:scale-110 transition-transform" /> Clear History
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-6 md:p-10">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-[#00BCD4] rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="font-semibold tracking-wide">Decrypting logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-gray-100">
              <Activity className="text-gray-300" size={48} />
            </div>
            <h3 className="text-xl font-extrabold text-gray-900 mb-2">No activity recorded</h3>
            <p className="text-gray-500 max-w-sm">When actions are performed in your account, they will securely appear in this timeline.</p>
          </div>
        ) : (
          <div className="relative border-l-[3px] border-gray-100/80 ml-4 md:ml-8 space-y-10 pb-6">
            {logs.map((log) => {
              const theme = getActionTheme(log.action);
              const initials = log.userId?.username?.substring(0, 2).toUpperCase() || 'SYS';
              
              return (
                <div key={log._id} className="relative pl-8 md:pl-12 group">
                  {/* Timeline Node */}
                  <div className={`absolute -left-[19px] top-4 w-9 h-9 rounded-full border-4 border-white flex items-center justify-center shadow-sm z-10 transition-transform group-hover:scale-110 duration-300 ${theme.bg}`}>
                    <div className="text-white w-4 h-4 flex items-center justify-center">
                      {theme.icon}
                    </div>
                  </div>

                  {/* Log Card */}
                  <div className="bg-gray-50/40 hover:bg-white border border-gray-100 rounded-2xl p-5 md:p-6 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-gray-200">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center text-white font-black shadow-md shrink-0">
                          {initials}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-gray-900 text-[15px]">{log.userId?.username || 'Unknown User'}</h4>
                          <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5 mt-1 bg-gray-100/80 w-fit px-2 py-0.5 rounded-md">
                            <Clock size={12} className="text-gray-400" />
                            {new Date(log.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                        </div>
                      </div>
                      
                      <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border shadow-sm ${theme.badge}`}>
                        {theme.icon}
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </div>
                    
                    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText size={14} className="text-gray-400" />
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Entity: {log.entityType || 'System'}</span>
                      </div>
                      <div className="text-sm text-gray-700">
                        {formatDetails(log.details)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
