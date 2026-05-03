"use client";
import React, { useState, useEffect } from "react";
import { FaUser, FaShieldAlt, FaBuilding, FaChartBar, FaUpload, FaCalendarAlt, FaMicrophone, FaEye } from "react-icons/fa";
import { ViewKey } from "./page";

interface Props { onNavigate: (view: ViewKey) => void; }

export default function ProfileView({ onNavigate }: Props) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = typeof window !== "undefined" ? localStorage.getItem("userId") ?? "" : "";
    if (!uid) { setLoading(false); return; }
    fetch(`/api/user?userId=${uid}`).then(r => r.json()).then(data => {
      if (data.success && data.data?.length > 0) setUser(data.data[0]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{padding:40,textAlign:'center',color:'#A4B6B9'}}>Loading profile…</div>;

  const name = user?.storeName || user?.username || "User";
  const email = user?.email || "—";
  const phone = user?.phone || user?.mobile || "—";
  const role = user?.role || "store_user";
  const company = user?.companyName || user?.organization || "—";
  const location = user?.storeLocation || user?.location || "—";
  const initials = name.split(" ").map((n:string) => n[0]).join("").toUpperCase().slice(0,2);
  const createdAt = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}) : "—";
  const lastLogin = user?.lastLogin ? new Date(user.lastLogin).toLocaleString('en-US',{hour:'numeric',minute:'2-digit',hour12:true}) : "Today";

  const roleLabel = role === 'store_user' ? 'Store User' : role === 'store' ? 'Store User' : role;
  const roleDesc = "Manage customer accounts • Create account users, map devices to accounts";

  return (
    <div className="su-profile-view">
      <h1 className="su-profile-title">Profile</h1>
      <p className="su-profile-subtitle">Manage your account information and settings</p>

      {/* Profile Banner */}
      <div className="su-profile-banner">
        <div className="su-profile-avatar">{initials}</div>
        <div><p className="su-profile-name">{name}</p><p className="su-profile-email">{email}</p></div>
      </div>

      {/* Info Grid */}
      <div className="su-profile-grid">
        <div className="su-profile-card">
          <div className="su-profile-card-header"><FaUser className="su-profile-card-icon su-profile-card-icon--orange" /> <h3>Personal Information</h3></div>
          <div className="su-profile-field"><span className="su-profile-field-label">Full Name</span><span>{name}</span></div>
          <div className="su-profile-field"><span className="su-profile-field-label">Phone number</span><span>{phone}</span></div>
          <div className="su-profile-field"><span className="su-profile-field-label">Email Address</span><span>{email}</span></div>
        </div>
        <div className="su-profile-card">
          <div className="su-profile-card-header"><FaShieldAlt className="su-profile-card-icon su-profile-card-icon--teal" /> <h3>Access Level</h3></div>
          <div className="su-profile-field"><span className="su-profile-field-label">Role</span><span className="su-profile-role-badge">{roleLabel}</span></div>
          <div className="su-profile-field"><span className="su-profile-field-label">Description</span><span style={{fontSize:'.8rem',color:'#64848D'}}>{roleDesc}</span></div>
        </div>
        <div className="su-profile-card">
          <div className="su-profile-card-header"><FaBuilding className="su-profile-card-icon su-profile-card-icon--orange" /> <h3>Organization</h3></div>
          <div className="su-profile-field"><span className="su-profile-field-label">Company Name</span><span>{company}</span></div>
          <div className="su-profile-field"><span className="su-profile-field-label">Location</span><span>📍 {location}</span></div>
        </div>
        <div className="su-profile-card">
          <div className="su-profile-card-header"><FaChartBar className="su-profile-card-icon su-profile-card-icon--teal" /> <h3>Account Activity</h3></div>
          <div className="su-profile-field"><span className="su-profile-field-label">Last Login</span><span>{lastLogin}</span></div>
          <div className="su-profile-field"><span className="su-profile-field-label">Account Created</span><span>{createdAt}</span></div>
          <div className="su-profile-field"><span className="su-profile-field-label">Total Sessions</span><span>147</span></div>
        </div>
      </div>

      {/* Permissions */}
      <div className="su-profile-card su-profile-perms">
        <h3 style={{fontWeight:700,fontSize:'1rem',color:'#162B30',marginBottom:18}}>Your Permissions</h3>
        <div className="su-profile-perm-grid">
          <div className="su-profile-perm-item"><span className="su-profile-perm-dot su-profile-perm-dot--orange" /> Upload & view media (Image, Video, Audio)</div>
          <div className="su-profile-perm-item"><span className="su-profile-perm-dot su-profile-perm-dot--teal" /> Schedule, Create & View Playlists (Including Quick Playlists)</div>
          <div className="su-profile-perm-item"><span className="su-profile-perm-dot su-profile-perm-dot--orange" /> Schedule, Create, & View Announcements (Including Instant Announcements)</div>
        </div>
      </div>

      {/* Actions */}
      <div className="su-profile-actions">
        <button className="su-profile-edit-btn">Edit Profile</button>
        <button className="su-profile-password-btn">Change Password</button>
      </div>

      <style>{`
        .su-profile-view{display:flex;flex-direction:column;gap:24px}
        .su-profile-title{font-size:1.5rem;font-weight:700;color:#162B30;margin:0}
        .su-profile-subtitle{font-size:.88rem;color:#64848D;margin:0}
        .su-profile-banner{background:linear-gradient(135deg,#11B5BB 0%,#0E9C9F 100%);border-radius:16px;padding:32px;display:flex;align-items:center;gap:20px;color:#fff}
        .su-profile-avatar{width:64px;height:64px;border-radius:14px;background:#F05A28;display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:800;color:#fff;flex-shrink:0}
        .su-profile-name{font-size:1.2rem;font-weight:700;margin-bottom:4px}
        .su-profile-email{font-size:.85rem;opacity:.85}
        .su-profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
        @media(max-width:800px){.su-profile-grid{grid-template-columns:1fr}}
        .su-profile-card{background:#fff;border-radius:14px;padding:24px;border:1px solid #EAEFEF}
        .su-profile-card-header{display:flex;align-items:center;gap:12px;margin-bottom:18px}
        .su-profile-card-header h3{font-size:.95rem;font-weight:700;color:#162B30}
        .su-profile-card-icon{font-size:.9rem}
        .su-profile-card-icon--orange{color:#F05A28}
        .su-profile-card-icon--teal{color:#11B5BB}
        .su-profile-field{display:flex;flex-direction:column;gap:2px;margin-bottom:14px}
        .su-profile-field:last-child{margin-bottom:0}
        .su-profile-field-label{font-size:.72rem;font-weight:600;color:#A4B6B9;text-transform:uppercase;letter-spacing:.03em}
        .su-profile-field span:last-child{font-size:.88rem;font-weight:600;color:#162B30}
        .su-profile-role-badge{display:inline-block;background:#0B2830;color:#fff;padding:4px 12px;border-radius:6px;font-size:.78rem;font-weight:700}
        .su-profile-perms{margin-top:0}
        .su-profile-perm-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        @media(max-width:700px){.su-profile-perm-grid{grid-template-columns:1fr}}
        .su-profile-perm-item{font-size:.82rem;color:#445459;display:flex;align-items:flex-start;gap:8px}
        .su-profile-perm-dot{width:8px;height:8px;border-radius:50%;margin-top:5px;flex-shrink:0}
        .su-profile-perm-dot--orange{background:#F05A28}
        .su-profile-perm-dot--teal{background:#11B5BB}
        .su-profile-actions{display:flex;gap:16px}
        .su-profile-edit-btn{padding:12px 28px;background:#F05A28;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:.9rem;cursor:pointer}
        .su-profile-password-btn{padding:12px 28px;background:#fff;color:#162B30;border:1px solid #D6E6E9;border-radius:10px;font-weight:700;font-size:.9rem;cursor:pointer}
      `}</style>
    </div>
  );
}
