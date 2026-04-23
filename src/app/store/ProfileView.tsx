"use client";
import React, { useEffect, useState } from "react";
import { FiUser, FiShield, FiBriefcase, FiClock, FiEdit2, FiSave, FiX } from "react-icons/fi";
import toast from "react-hot-toast";

interface UserData {
  _id: string;
  username: string;
  storeName?: string;
  storeLocation?: string;
  phone?: string;
  email?: string;
  companyName?: string;
  location?: string;
  role?: string;
  createdAt?: string;
}

interface ProfileViewProps {
  userId: string;
}

const ProfileView: React.FC<ProfileViewProps> = ({ userId }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [form, setForm] = useState({
    storeName: "",
    storeLocation: "",
    phone: "",
    email: "",
    companyName: "",
    location: "",
  });

  // Password change state
  const [showPwChange, setShowPwChange] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetch(`/api/user?userId=${userId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data?.length > 0) {
          const u = d.data[0] as UserData;
          setUser(u);
          setForm({
            storeName: u.storeName || "",
            storeLocation: u.storeLocation || "",
            phone: u.phone || "",
            email: u.email || "",
            companyName: u.companyName || "",
            location: u.location || "",
          });
        }
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [userId]);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/user?userId=${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Profile updated!");
        setUser(prev => prev ? { ...prev, ...form } : prev);
        setEditing(false);
      } else {
        toast.error(data.message || "Failed to update profile");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!pwForm.newPassword || pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (!pwForm.currentPassword) {
      toast.error("Current password is required");
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch(`/api/user?userId=${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, password: pwForm.newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Password changed successfully!");
        setShowPwChange(false);
        setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        toast.error(data.message || "Failed to change password");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSavingPw(false);
    }
  };

  const displayName = user?.storeName || user?.username || "Store User";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    color: "#334155",
    fontSize: "0.85rem",
    outline: "none",
    fontFamily: "Inter, sans-serif",
    boxSizing: "border-box",
  };

  if (loading) {
    return (
      <div style={{ fontFamily: "Inter, sans-serif", padding: "60px", textAlign: "center", color: "#94a3b8" }}>
        Loading profile…
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ fontFamily: "Inter, sans-serif", padding: "60px", textAlign: "center", color: "#94a3b8" }}>
        Unable to load profile. Please try again.
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Inter, sans-serif" }}>
      <div>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#10353C", margin: "0 0 6px" }}>Profile</h2>
        <p style={{ fontSize: "0.85rem", color: "#64748B", margin: "0 0 24px" }}>Manage your account information and settings</p>
      </div>

      <div style={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "32px", display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* Header Block */}
        <div style={{ position: "relative", marginBottom: "20px" }}>
          <div style={{ height: "100px", backgroundColor: "#10353C", borderRadius: "8px 8px 0 0" }}></div>
          <div style={{ position: "absolute", bottom: "-30px", left: "24px", display: "flex", alignItems: "flex-end", gap: "20px" }}>
            <div style={{
              width: "80px", height: "80px", backgroundColor: "#FF5C16",
              borderRadius: "12px", display: "flex", alignItems: "center",
              justifyContent: "center", color: "#fff", fontSize: "2rem", fontWeight: 700,
              border: "4px solid #fff", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}>
              {initials}
            </div>
            <div style={{ paddingBottom: "4px" }}>
              <h3 style={{ margin: "0 0 4px", fontSize: "1.2rem", fontWeight: 700, color: "#10353C" }}>{displayName}</h3>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748B" }}>{user.email || user.username}</p>
            </div>
          </div>
        </div>

        {/* Info Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "30px" }}>

          {/* Personal Information */}
          <div style={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <div style={{ color: "#3B82F6", backgroundColor: "#DBEAFE", padding: "8px", borderRadius: "8px" }}><FiUser size={18} /></div>
              <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#10353C" }}>Personal Information</h4>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "0.75rem", color: "#64748B" }}>Username</p>
                {editing ? (
                  <input style={inputStyle} value={form.storeName} onChange={e => setForm(p => ({ ...p, storeName: e.target.value }))} placeholder="Store name" />
                ) : (
                  <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "#1a2c35" }}>{user.storeName || user.username}</p>
                )}
              </div>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "0.75rem", color: "#64748B" }}>Phone number</p>
                {editing ? (
                  <input style={inputStyle} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone number" />
                ) : (
                  <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "#1a2c35" }}>{user.phone || "—"}</p>
                )}
              </div>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "0.75rem", color: "#64748B" }}>Email Address</p>
                {editing ? (
                  <input style={inputStyle} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email address" type="email" />
                ) : (
                  <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "#1a2c35" }}>{user.email || "—"}</p>
                )}
              </div>
            </div>
          </div>

          {/* Access Level */}
          <div style={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <div style={{ color: "#10B981", backgroundColor: "#D1FAE5", padding: "8px", borderRadius: "8px" }}><FiShield size={18} /></div>
              <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#10353C" }}>Access Level</h4>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <p style={{ margin: "0 0 8px", fontSize: "0.75rem", color: "#64748B" }}>Role</p>
                <span style={{ backgroundColor: "#ccfbf1", color: "#115e59", padding: "6px 12px", borderRadius: "16px", fontSize: "0.75rem", fontWeight: 600 }}>
                  {user.role?.replace("_", " ") || "store user"}
                </span>
              </div>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "0.75rem", color: "#64748B" }}>Description</p>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#475569", lineHeight: "1.4" }}>
                  Manage media playlists, announcements and broadcast schedules for your store.
                </p>
              </div>
            </div>
          </div>

          {/* Organization */}
          <div style={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <div style={{ color: "#8B5CF6", backgroundColor: "#EDE9FE", padding: "8px", borderRadius: "8px" }}><FiBriefcase size={18} /></div>
              <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#10353C" }}>Organization</h4>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "0.75rem", color: "#64748B" }}>Store Name</p>
                {editing ? (
                  <input style={inputStyle} value={form.companyName} onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))} placeholder="Company / store name" />
                ) : (
                  <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "#1a2c35" }}>{user.companyName || user.storeName || "—"}</p>
                )}
              </div>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "0.75rem", color: "#64748B" }}>Location</p>
                {editing ? (
                  <input style={inputStyle} value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Location" />
                ) : (
                  <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "#1a2c35", display: "flex", alignItems: "center", gap: "6px" }}>
                    {(user.location || user.storeLocation) ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        {user.location || user.storeLocation}
                      </>
                    ) : "—"}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Account Activity */}
          <div style={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <div style={{ color: "#F59E0B", backgroundColor: "#FEF3C7", padding: "8px", borderRadius: "8px" }}><FiClock size={18} /></div>
              <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#10353C" }}>Account Activity</h4>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "0.75rem", color: "#64748B" }}>Account Created</p>
                <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "#1a2c35" }}>
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" })
                    : "—"}
                </p>
              </div>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "0.75rem", color: "#64748B" }}>Account ID</p>
                <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 600, color: "#64748b", fontFamily: "monospace" }}>
                  {user._id ? `${user._id.slice(0, 8)}…` : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Your Permissions */}
        <div style={{ backgroundColor: "#EAF8FB", borderRadius: "12px", padding: "24px", marginTop: "8px" }}>
          <h4 style={{ margin: "0 0 16px", fontSize: "0.95rem", fontWeight: 700, color: "#10353C" }}>Your Permissions</h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {[
              "Upload & view media (Image, Video, Audio)",
              "Schedule, Create, & View Playlists (including Quick Playlists)",
              "Schedule, Create, & View Announcements (including Instant Announcements)",
            ].map(perm => (
              <div key={perm} style={{ display: "flex", alignItems: "center", gap: "8px", gridColumn: perm.includes("Announcement") ? "span 2" : undefined }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#10B981", flexShrink: 0 }}></div>
                <span style={{ fontSize: "0.85rem", color: "#475569" }}>{perm}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Password Change Panel */}
        {showPwChange && (
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#10353C" }}>Change Password</h4>
              <button onClick={() => setShowPwChange(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                <FiX size={18} />
              </button>
            </div>
            {(["currentPassword", "newPassword", "confirmPassword"] as const).map((field) => (
              <div key={field}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  {field === "currentPassword" ? "Current Password" : field === "newPassword" ? "New Password" : "Confirm New Password"}
                </label>
                <input
                  type="password"
                  style={inputStyle}
                  value={pwForm[field]}
                  onChange={e => setPwForm(p => ({ ...p, [field]: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={handlePasswordChange}
                disabled={savingPw}
                style={{ padding: "10px 24px", backgroundColor: savingPw ? "#94a3b8" : "#FF5C16", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, cursor: savingPw ? "not-allowed" : "pointer" }}
              >
                {savingPw ? "Saving…" : "Update Password"}
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ padding: "10px 24px", backgroundColor: saving ? "#94a3b8" : "#FF5C16", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px" }}
              >
                <FiSave size={14} /> {saving ? "Saving…" : "Save Changes"}
              </button>
              <button
                onClick={() => setEditing(false)}
                style={{ padding: "10px 24px", backgroundColor: "#F1F5F9", color: "#475569", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                style={{ padding: "10px 24px", backgroundColor: "#FF5C16", color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
              >
                <FiEdit2 size={14} /> Edit Profile
              </button>
              <button
                onClick={() => setShowPwChange(v => !v)}
                style={{ padding: "10px 24px", backgroundColor: "#F1F5F9", color: "#475569", border: "1px solid #E2E8F0", borderRadius: "8px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
              >
                Change Password
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default ProfileView;
