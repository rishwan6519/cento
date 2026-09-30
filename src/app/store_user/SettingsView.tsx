"use client";
import React, { useState, useEffect } from "react";
import { FaCog, FaSave } from "react-icons/fa";

export default function SettingsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [frequency, setFrequency] = useState(1);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const uid = typeof window !== "undefined" ? localStorage.getItem("userId") ?? "" : "";
    setUserId(uid);
    if (!uid) { setLoading(false); return; }
    
    fetch(`/api/user?userId=${uid}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data?.length > 0) {
          const user = data.data[0];
          setFrequency(user.defaultAnnouncementFrequency || 1);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/user?userId=${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultAnnouncementFrequency: frequency }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("Settings saved successfully!");
      } else {
        setMessage("Failed to save settings.");
      }
    } catch (err) {
      setMessage("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#A4B6B9'}}>Loading settings…</div>;

  return (
    <div className="su-settings-view">
      <h1 className="su-settings-title">Store Settings</h1>
      <p className="su-settings-subtitle">Manage preferences and defaults for your store devices</p>

      <div className="su-settings-card">
        <div className="su-settings-card-header">
          <div className="su-settings-icon-box">
            <FaCog size={18} />
          </div>
          <h3>Announcement Preferences</h3>
        </div>
        
        <div className="su-settings-form-group">
          <label>Default Announcement Frequency (Minutes)</label>
          <p className="su-settings-help">This is the default frequency used when scheduling announcements for devices in this store. The platform default is 1 minute.</p>
          <input 
            type="number" 
            min="1" 
            max="1440"
            value={frequency} 
            onChange={(e) => setFrequency(parseInt(e.target.value) || 1)} 
            className="su-settings-input"
          />
        </div>

        {message && (
          <div className={`su-settings-msg ${message.includes("success") ? "success" : "error"}`}>
            {message}
          </div>
        )}

        <button className="su-settings-save-btn" onClick={handleSave} disabled={saving}>
          <FaSave /> {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      <style>{`
        .su-settings-view { display: flex; flex-direction: column; gap: 24px; padding-bottom: 40px; max-width: 800px; }
        .su-settings-title { font-size: 1.5rem; font-weight: 700; color: #0E3B43; margin: 0; }
        .su-settings-subtitle { font-size: 0.88rem; color: #64848D; margin: 0; }

        .su-settings-card { background: #fff; border-radius: 16px; padding: 32px; border: 1px solid #EAEFEF; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
        .su-settings-card-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
        .su-settings-card-header h3 { font-size: 1.1rem; font-weight: 700; color: #0E3B43; margin: 0; }
        
        .su-settings-icon-box { 
          width: 40px; height: 40px; border-radius: 10px; display: flex; 
          align-items: center; justify-content: center; 
          background: #EBF9FB; color: #11B5BB;
        }

        .su-settings-form-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
        .su-settings-form-group label { font-size: 0.95rem; font-weight: 600; color: #162B30; }
        .su-settings-help { font-size: 0.8rem; color: #64848D; margin: 0 0 4px 0; }
        
        .su-settings-input {
          width: 100%; max-width: 300px; padding: 12px 16px;
          border: 1px solid #EAEFEF; border-radius: 10px;
          font-size: 1rem; outline: none; transition: border-color 0.2s;
          background: #F8FAFB;
        }
        .su-settings-input:focus { border-color: #11B5BB; background: #fff; }

        .su-settings-msg { padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 0.85rem; font-weight: 500; }
        .su-settings-msg.success { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }
        .su-settings-msg.error { background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA; }

        .su-settings-save-btn { 
          display: flex; align-items: center; gap: 8px; width: fit-content;
          padding: 12px 32px; background: #F05A28; color: #fff; border: none; 
          border-radius: 10px; font-weight: 700; font-size: 0.9rem; cursor: pointer;
          transition: all 0.2s ease;
        }
        .su-settings-save-btn:hover:not(:disabled) { background: #DC4B1D; transform: translateY(-1px); }
        .su-settings-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
