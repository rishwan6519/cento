"use client";
import React, { useState, useEffect } from "react";
import { FaUser, FaShieldAlt, FaBuilding, FaChartBar, FaUpload, FaCalendarAlt, FaMicrophone, FaEye, FaEyeSlash, FaLock, FaTimes } from "react-icons/fa";
import { ViewKey } from "./page";

interface Props { onNavigate: (view: ViewKey) => void; }

export default function ProfileView({ onNavigate }: Props) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

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

      {/* Profile Banner & Card */}
      <div className="su-profile-header-container">
        <div className="su-profile-banner-top"></div>
        <div className="su-profile-user-card">
          <div className="su-profile-avatar-large">{initials}</div>
          <div className="su-profile-user-info">
            <h2 className="su-profile-user-name">{name}</h2>
            <p className="su-profile-user-email">{email}</p>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="su-profile-grid">
        <div className="su-profile-card">
          <div className="su-profile-card-header">
            <div className="su-profile-icon-box su-profile-icon-box--blue">
              <FaUser size={18} />
            </div>
            <h3>Personal Information</h3>
          </div>
          <div className="su-profile-field"><span className="su-profile-field-label">Full Name</span><span>{name}</span></div>
          <div className="su-profile-field"><span className="su-profile-field-label">Phone number</span><span>{phone}</span></div>
          <div className="su-profile-field"><span className="su-profile-field-label">Email Address</span><span>{email}</span></div>
        </div>

        <div className="su-profile-card">
          <div className="su-profile-card-header">
            <div className="su-profile-icon-box su-profile-icon-box--teal">
              <FaShieldAlt size={18} />
            </div>
            <h3>Access Level</h3>
          </div>
          <div className="su-profile-field"><span className="su-profile-field-label">Role</span><span className="su-profile-role-badge">{roleLabel}</span></div>
          <div className="su-profile-field">
            <span className="su-profile-field-label">Description</span>
            <span className="su-profile-desc-text">Manage customer accounts - Create account users, map devices to accounts</span>
          </div>
        </div>

        <div className="su-profile-card">
          <div className="su-profile-card-header">
            <div className="su-profile-icon-box su-profile-icon-box--purple">
              <FaBuilding size={18} />
            </div>
            <h3>Organization</h3>
          </div>
          <div className="su-profile-field"><span className="su-profile-field-label">Company Name</span><span>{company}</span></div>
          <div className="su-profile-field"><span className="su-profile-field-label">Location</span><span>📍 {location}</span></div>
        </div>

        <div className="su-profile-card">
          <div className="su-profile-card-header">
            <div className="su-profile-icon-box su-profile-icon-box--orange">
              <FaChartBar size={18} />
            </div>
            <h3>Account Activity</h3>
          </div>
          <div className="su-profile-field"><span className="su-profile-field-label">Last Login</span><span>{lastLogin}</span></div>
          <div className="su-profile-field"><span className="su-profile-field-label">Account Created</span><span>{createdAt}</span></div>
          <div className="su-profile-field"><span className="su-profile-field-label">Total Sessions</span><span>{user?.sessionsCount || "1"}</span></div>
        </div>
      </div>

      {/* Permissions */}
      <div className="su-profile-card su-profile-perms-section">
        <h3 className="su-profile-section-title">Your Permissions</h3>
        <div className="su-profile-perm-grid">
          <div className="su-profile-perm-item"><span className="su-profile-perm-dot" /> Upload & view media (Image, Video, Audio)</div>
          <div className="su-profile-perm-item"><span className="su-profile-perm-dot" /> Schedule, Create & View Playlists (Including Quick Playlists)</div>
          <div className="su-profile-perm-item"><span className="su-profile-perm-dot" /> Schedule, Create, & View Announcements (Including Instant Announcements)</div>
        </div>
      </div>

      {/* Actions */}
      <div className="su-profile-actions">
        <button className="su-profile-edit-btn">Edit Profile</button>
        <button className="su-profile-password-btn" onClick={() => setIsPasswordModalOpen(true)}>Change Password</button>
      </div>

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <ChangePasswordModal 
          userId={user?._id || user?.id} 
          onClose={() => setIsPasswordModalOpen(false)} 
        />
      )}

      <style>{`
        .su-profile-view { display: flex; flex-direction: column; gap: 24px; padding-bottom: 40px; }
        .su-profile-title { font-size: 1.5rem; font-weight: 700; color: #0E3B43; margin: 0; }
        .su-profile-subtitle { font-size: 0.88rem; color: #64848D; margin: 0; }

        .su-profile-header-container { position: relative; margin-bottom: 24px; }
        .su-profile-banner-top { height: 120px; background: #0B2830; border-radius: 16px 16px 0 0; }
        .su-profile-user-card { 
          background: #fff; border: 1px solid #EAEFEF; border-radius: 0 0 16px 16px; 
          padding: 24px 32px; display: flex; align-items: center; gap: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        .su-profile-avatar-large { 
          width: 80px; height: 80px; border-radius: 12px; background: #F05A28; 
          display: flex; align-items: center; justify-content: center; 
          font-size: 2rem; font-weight: 700; color: #fff; margin-top: -60px;
          border: 4px solid #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        .su-profile-user-name { font-size: 1.4rem; font-weight: 700; color: #162B30; margin: 0; }
        .su-profile-user-email { font-size: 0.88rem; color: #64848D; margin-top: 4px; }

        .su-profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media(max-width: 800px) { .su-profile-grid { grid-template-columns: 1fr; } }
        
        .su-profile-card { background: #fff; border-radius: 16px; padding: 24px; border: 1px solid #EAEFEF; }
        .su-profile-card-header { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
        .su-profile-card-header h3 { font-size: 1rem; font-weight: 700; color: #0E3B43; margin: 0; }
        
        .su-profile-icon-box { 
          width: 36px; height: 36px; border-radius: 10px; display: flex; 
          align-items: center; justify-content: center; 
        }
        .su-profile-icon-box--blue { background: #EBF2FF; color: #3B82F6; }
        .su-profile-icon-box--teal { background: #E6FFFA; color: #11B5BB; }
        .su-profile-icon-box--purple { background: #F5F3FF; color: #8B5CF6; }
        .su-profile-icon-box--orange { background: #FFF7ED; color: #F05A28; }

        .su-profile-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
        .su-profile-field:last-child { margin-bottom: 0; }
        .su-profile-field-label { font-size: 0.72rem; font-weight: 500; color: #94A3B8; }
        .su-profile-field span:last-child { font-size: 0.88rem; font-weight: 700; color: #162B30; }
        
        .su-profile-role-badge { 
          display: inline-block !important; width: fit-content;
          background: #E0F2F1; color: #00897B; padding: 4px 14px; 
          border-radius: 20px; font-size: 0.78rem; font-weight: 700;
        }
        .su-profile-desc-text { font-size: 0.82rem !important; font-weight: 500 !important; color: #64748B !important; line-height: 1.5; }

        .su-profile-perms-section { margin-top: 0; }
        .su-profile-section-title { font-size: 1rem; font-weight: 700; color: #0E3B43; margin-bottom: 20px; }
        .su-profile-perm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .su-profile-perm-item { font-size: 0.82rem; color: #445459; display: flex; align-items: center; gap: 10px; font-weight: 500; }
        .su-profile-perm-dot { width: 8px; height: 8px; border-radius: 50%; background: #11B5BB; flex-shrink: 0; }

        .su-profile-actions { display: flex; gap: 16px; margin-top: 8px; }
        .su-profile-edit-btn { 
          padding: 12px 32px; background: #F05A28; color: #fff; border: none; 
          border-radius: 10px; font-weight: 700; font-size: 0.9rem; cursor: pointer;
          transition: all 0.2s ease;
        }
        .su-profile-edit-btn:hover { background: #DC4B1D; transform: translateY(-1px); }
        .su-profile-password-btn { 
          padding: 12px 32px; background: #EBF9FB; color: #162B30; border: 1px solid #CFE9EC; 
          border-radius: 10px; font-weight: 700; font-size: 0.9rem; cursor: pointer;
          transition: all 0.2s ease;
        }
        .su-profile-password-btn:hover { background: #DEF5F8; }

        /* Modal Styles */
        .su-modal-overlay {
          position: fixed; inset: 0; background: rgba(11, 40, 48, 0.7);
          backdrop-filter: blur(4px); z-index: 1000;
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .su-modal-content {
          background: #fff; border-radius: 20px; width: 100%; max-width: 440px;
          padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.2);
          position: relative; animation: suModalSlide 0.3s ease-out;
        }
        @keyframes suModalSlide {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .su-modal-close {
          position: absolute; top: 20px; right: 20px;
          background: none; border: none; color: #A4B6B9; cursor: pointer;
          font-size: 1.2rem; transition: color 0.2s;
        }
        .su-modal-close:hover { color: #F05A28; }
        .su-modal-header { margin-bottom: 24px; }
        .su-modal-header h2 { font-size: 1.25rem; font-weight: 700; color: #0E3B43; display: flex; align-items: center; gap: 10px; }
        .su-modal-form { display: flex; flex-direction: column; gap: 20px; }
        .su-form-group { display: flex; flex-direction: column; gap: 8px; }
        .su-form-label { font-size: 0.85rem; font-weight: 600; color: #64848D; }
        .su-input-wrap { position: relative; }
        .su-input {
          width: 100%; padding: 12px 16px; padding-right: 44px;
          border: 1px solid #EAEFEF; border-radius: 10px;
          font-size: 0.9rem; outline: none; transition: border-color 0.2s;
          background: #F8FAFB;
        }
        .su-input:focus { border-color: #F05A28; background: #fff; }
        .su-eye-btn {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: #A4B6B9; cursor: pointer;
        }
        .su-modal-submit {
          margin-top: 10px; padding: 14px; background: #F05A28; color: #fff;
          border: none; border-radius: 10px; font-weight: 700; cursor: pointer;
          transition: all 0.2s;
        }
        .su-modal-submit:hover:not(:disabled) { background: #DC4B1D; transform: translateY(-1px); }
        .su-modal-submit:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

interface PasswordModalProps {
  userId: string;
  onClose: () => void;
}

const ChangePasswordModal: React.FC<PasswordModalProps> = ({ userId, onClose }) => {
  const [formData, setFormData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (formData.newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/user?userId=${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          password: formData.newPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Password updated successfully!");
        onClose();
      } else {
        setError(data.message || "Failed to update password.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const toggleShow = (key: keyof typeof showPass) => setShowPass(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="su-modal-overlay" onClick={onClose}>
      <div className="su-modal-content" onClick={e => e.stopPropagation()}>
        <button className="su-modal-close" onClick={onClose}><FaTimes /></button>
        <div className="su-modal-header">
          <h2><FaLock size={20} color="#F05A28" /> Change Password</h2>
        </div>
        
        <form className="su-modal-form" onSubmit={handleSubmit}>
          {error && <div style={{color:'#DC2626',fontSize:'.8rem',background:'#FEF2F2',padding:'10px',borderRadius:'8px',border:'1px solid #FEE2E2'}}>{error}</div>}
          
          <div className="su-form-group">
            <label className="su-form-label">Current Password</label>
            <div className="su-input-wrap">
              <input 
                type={showPass.current ? "text" : "password"} 
                className="su-input" 
                required 
                value={formData.currentPassword}
                onChange={e => setFormData({ ...formData, currentPassword: e.target.value })}
              />
              <button type="button" className="su-eye-btn" onClick={() => toggleShow('current')}>
                {showPass.current ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="su-form-group">
            <label className="su-form-label">New Password</label>
            <div className="su-input-wrap">
              <input 
                type={showPass.new ? "text" : "password"} 
                className="su-input" 
                required 
                value={formData.newPassword}
                onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
              />
              <button type="button" className="su-eye-btn" onClick={() => toggleShow('new')}>
                {showPass.new ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="su-form-group">
            <label className="su-form-label">Confirm New Password</label>
            <div className="su-input-wrap">
              <input 
                type={showPass.confirm ? "text" : "password"} 
                className="su-input" 
                required 
                value={formData.confirmPassword}
                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
              <button type="button" className="su-eye-btn" onClick={() => toggleShow('confirm')}>
                {showPass.confirm ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button type="submit" className="su-modal-submit" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
};
