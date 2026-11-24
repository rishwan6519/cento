"use client";
import React, { useState, useEffect } from "react";
import { 
  FaCog, 
  FaSave, 
  FaMapMarkerAlt, 
  FaCrosshairs, 
  FaWhatsapp, 
  FaClock, 
  FaExternalLinkAlt,
  FaCheckCircle,
  FaShieldAlt
} from "react-icons/fa";

export default function SettingsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [userId, setUserId] = useState("");
  const [token, setToken] = useState("");

  // Announcement preferences
  const [frequency, setFrequency] = useState(1);

  // Store Geofence & Config
  const [storeId, setStoreId] = useState("");
  const [storeName, setStoreName] = useState("");
  const [latitude, setLatitude] = useState<number | string>("");
  const [longitude, setLongitude] = useState<number | string>("");
  const [geofenceRadius, setGeofenceRadius] = useState<number>(150);
  const [whatsappLink, setWhatsappLink] = useState("");
  const [timeZone, setTimeZone] = useState("Asia/Kolkata");

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const uid = typeof window !== "undefined" ? localStorage.getItem("userId") ?? "" : "";
    const tok = typeof window !== "undefined" ? localStorage.getItem("token") ?? "" : "";
    setUserId(uid);
    setToken(tok);

    if (!uid) {
      setLoading(false);
      return;
    }

    // 1. Fetch user announcement frequency
    const p1 = fetch(`/api/user?userId=${uid}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data?.length > 0) {
          const user = data.data[0];
          setFrequency(user.defaultAnnouncementFrequency || 1);
        }
      })
      .catch((err) => console.error("Error loading user settings:", err));

    // 2. Fetch Store Geofence & Configuration
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-user-id": uid,
      "x-user-role": "Store Manager",
    };
    if (tok) {
      headers["Authorization"] = `Bearer ${tok}`;
    }

    const p2 = fetch(`/api/v1/store/config?userId=${uid}`, { headers })
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setStoreId(data.store_id || "");
          setStoreName(data.store_name || "");
          setLatitude(data.latitude !== undefined ? data.latitude : "");
          setLongitude(data.longitude !== undefined ? data.longitude : "");
          setGeofenceRadius(data.geofence_radius || 150);
          setWhatsappLink(data.whatsapp_group_link || "");
          if (data.time_zone) setTimeZone(data.time_zone);
        }
      })
      .catch((err) => console.error("Error loading store config:", err));

    Promise.all([p1, p2]).finally(() => setLoading(false));
  }, []);

  // Detect live GPS location via Browser Geolocation API
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setMessage({ text: "Geolocation is not supported by your browser.", type: "error" });
      return;
    }

    setLocating(true);
    setMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setLocating(false);
        setMessage({
          text: `Current GPS coordinates captured (${lat}, ${lng}) with accuracy ~${Math.round(position.coords.accuracy)}m`,
          type: "success",
        });
      },
      (error) => {
        setLocating(false);
        setMessage({
          text: `Failed to detect location: ${error.message}. You can manually paste coordinates from Google Maps.`,
          type: "error",
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    setMessage(null);

    try {
      // 1. Save announcement frequency
      const saveUserReq = fetch(`/api/user?userId=${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultAnnouncementFrequency: frequency }),
      });

      // 2. Save store geofence & operational configuration
      const storeHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        "x-user-id": userId,
        "x-user-role": "Store Manager",
      };
      if (token) {
        storeHeaders["Authorization"] = `Bearer ${token}`;
      }
      if (storeId) {
        storeHeaders["x-store-id"] = storeId;
      }

      const saveStoreReq = fetch(`/api/v1/store/config?userId=${userId}`, {
        method: "PUT",
        headers: storeHeaders,
        body: JSON.stringify({
          latitude: typeof latitude === "string" ? parseFloat(latitude) : latitude,
          longitude: typeof longitude === "string" ? parseFloat(longitude) : longitude,
          geofence_radius: Number(geofenceRadius),
          whatsapp_group_link: whatsappLink,
          time_zone: timeZone,
        }),
      });

      const [userRes, storeRes] = await Promise.all([saveUserReq, saveStoreReq]);
      const userData = await userRes.json();
      const storeData = await storeRes.json();

      if (userRes.ok && storeRes.ok && !storeData.error) {
        setMessage({ text: "All store settings and GPS geofence updated successfully!", type: "success" });
      } else {
        setMessage({
          text: storeData.error?.message || userData.message || "Failed to save settings.",
          type: "error",
        });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "An error occurred while saving.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const googleMapsUrl =
    latitude && longitude
      ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
      : null;

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#A4B6B9" }}>Loading settings…</div>;
  }

  return (
    <div className="su-settings-view">
      <div className="su-settings-header-section">
        <h1 className="su-settings-title">Store Operations & Settings</h1>
        <p className="su-settings-subtitle">
          Configure physical GPS geofencing for staff attendance, communication channels, and device preferences.
        </p>
      </div>

      {message && (
        <div className={`su-settings-alert ${message.type === "success" ? "su-alert-success" : "su-alert-error"}`}>
          {message.type === "success" ? <FaCheckCircle /> : <FaShieldAlt />}
          <span>{message.text}</span>
        </div>
      )}

      {/* ── CARD 1: STORE PHYSICAL LOCATION & GEOFENCE ── */}
      <div className="su-settings-card">
        <div className="su-settings-card-header">
          <div className="su-settings-icon-box" style={{ background: "#FEF3C7", color: "#D97706" }}>
            <FaMapMarkerAlt size={20} />
          </div>
          <div>
            <h3>Store Physical Location & Geofence</h3>
            <p className="su-settings-card-sub">
              Staff mobile app checks these GPS coordinates to ensure employees are physically inside the store before allowing Check-In.
            </p>
          </div>
        </div>

        <div className="su-settings-row">
          <div className="su-settings-form-group">
            <label>Store Latitude</label>
            <input
              type="number"
              step="0.000001"
              placeholder="e.g. 10.015860"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              className="su-settings-input"
            />
            <span className="su-settings-help">Degrees North/South (up to 6 decimal places)</span>
          </div>

          <div className="su-settings-form-group">
            <label>Store Longitude</label>
            <input
              type="number"
              step="0.000001"
              placeholder="e.g. 76.341860"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              className="su-settings-input"
            />
            <span className="su-settings-help">Degrees East/West (up to 6 decimal places)</span>
          </div>
        </div>

        {/* Quick GPS Action buttons */}
        <div className="su-settings-actions-bar">
          <button
            type="button"
            className="su-action-btn su-action-btn--primary"
            onClick={handleDetectLocation}
            disabled={locating}
          >
            <FaCrosshairs /> {locating ? "Detecting GPS..." : "Detect Current Device Location"}
          </button>

          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="su-action-btn su-action-btn--outline"
            >
              <FaExternalLinkAlt /> Verify on Google Maps
            </a>
          )}
        </div>

        <div className="su-settings-form-group" style={{ marginTop: 20 }}>
          <label>Geofence Radius ({geofenceRadius} metres)</label>
          <p className="su-settings-help">
            Allowed radius around the store building where staff check-ins are valid. Default is 150m to cover large supermarkets and parking.
          </p>
          <div className="su-radius-controls">
            <input
              type="range"
              min="30"
              max="500"
              step="10"
              value={geofenceRadius}
              onChange={(e) => setGeofenceRadius(parseInt(e.target.value) || 150)}
              className="su-settings-range"
            />
            <div className="su-preset-pills">
              {[50, 100, 150, 200, 300, 500].map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`su-pill ${geofenceRadius === r ? "su-pill--active" : ""}`}
                  onClick={() => setGeofenceRadius(r)}
                >
                  {r}m
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 2: STAFF COMMUNICATION & TIMEZONE ── */}
      <div className="su-settings-card">
        <div className="su-settings-card-header">
          <div className="su-settings-icon-box" style={{ background: "#DCFCE7", color: "#16A34A" }}>
            <FaWhatsapp size={20} />
          </div>
          <div>
            <h3>Store Communication & Timezone</h3>
            <p className="su-settings-card-sub">
              Information surfaced in the Store Sparc Ops mobile app for staff shift coordination.
            </p>
          </div>
        </div>

        <div className="su-settings-form-group">
          <label>Staff WhatsApp Group Link</label>
          <input
            type="url"
            placeholder="https://chat.whatsapp.com/..."
            value={whatsappLink}
            onChange={(e) => setWhatsappLink(e.target.value)}
            className="su-settings-input su-settings-input--full"
          />
          <span className="su-settings-help">
            Staff can tap this from their app profile to join the store operations WhatsApp group.
          </span>
        </div>

        <div className="su-settings-form-group">
          <label>Store Operational Timezone</label>
          <select
            value={timeZone}
            onChange={(e) => setTimeZone(e.target.value)}
            className="su-settings-input"
            style={{ maxWidth: 320 }}
          >
            <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30)</option>
            <option value="Asia/Dubai">Asia/Dubai (GST - UTC+04:00)</option>
            <option value="Europe/London">Europe/London (GMT/BST)</option>
            <option value="America/New_York">America/New_York (EST/EDT)</option>
            <option value="Australia/Sydney">Australia/Sydney (AEST - UTC+10:00)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>
      </div>

      {/* ── CARD 3: DIGITAL SIGNAGE & ANNOUNCEMENT PREFERENCES ── */}
      <div className="su-settings-card">
        <div className="su-settings-card-header">
          <div className="su-settings-icon-box">
            <FaCog size={18} />
          </div>
          <div>
            <h3>Signage Announcement Preferences</h3>
            <p className="su-settings-card-sub">
              Default broadcast timing for store screen announcements.
            </p>
          </div>
        </div>

        <div className="su-settings-form-group">
          <label>Default Announcement Frequency (Minutes)</label>
          <p className="su-settings-help">
            This frequency is used when scheduling audio/visual announcements for screens in this store.
          </p>
          <input
            type="number"
            min="1"
            max="1440"
            value={frequency}
            onChange={(e) => setFrequency(parseInt(e.target.value) || 1)}
            className="su-settings-input"
            style={{ maxWidth: 200 }}
          />
        </div>
      </div>

      {/* ── BOTTOM SAVE BAR ── */}
      <div className="su-settings-footer">
        <button className="su-settings-save-btn" onClick={handleSave} disabled={saving}>
          <FaSave /> {saving ? "Saving Changes..." : "Save All Settings"}
        </button>
      </div>

      <style>{`
        .su-settings-view { display: flex; flex-direction: column; gap: 24px; padding-bottom: 60px; max-width: 880px; }
        .su-settings-header-section { margin-bottom: 4px; }
        .su-settings-title { font-size: 1.6rem; font-weight: 700; color: #0E3B43; margin: 0 0 6px 0; }
        .su-settings-subtitle { font-size: 0.92rem; color: #64848D; margin: 0; line-height: 1.4; }

        .su-settings-alert {
          display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-radius: 12px;
          font-size: 0.92rem; font-weight: 500;
        }
        .su-alert-success { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }
        .su-alert-error { background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA; }

        .su-settings-card { 
          background: #fff; border-radius: 16px; padding: 28px; 
          border: 1px solid #EAEFEF; box-shadow: 0 4px 16px rgba(0,0,0,0.03); 
        }
        .su-settings-card-header { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 22px; }
        .su-settings-card-header h3 { font-size: 1.15rem; font-weight: 700; color: #0E3B43; margin: 0 0 4px 0; }
        .su-settings-card-sub { font-size: 0.84rem; color: #64848D; margin: 0; }
        
        .su-settings-icon-box { 
          width: 44px; height: 44px; border-radius: 12px; display: flex; 
          align-items: center; justify-content: center; flex-shrink: 0;
          background: #EBF9FB; color: #11B5BB;
        }

        .su-settings-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 640px) { .su-settings-row { grid-template-columns: 1fr; } }

        .su-settings-form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        .su-settings-form-group label { font-size: 0.92rem; font-weight: 600; color: #162B30; }
        .su-settings-help { font-size: 0.8rem; color: #7B939B; margin: 0; }
        
        .su-settings-input {
          width: 100%; padding: 11px 16px;
          border: 1px solid #D6E2E4; border-radius: 10px;
          font-size: 0.95rem; outline: none; transition: all 0.2s;
          background: #F8FAFB; color: #0E3B43;
        }
        .su-settings-input:focus { border-color: #11B5BB; background: #fff; box-shadow: 0 0 0 3px rgba(17, 181, 187, 0.12); }
        .su-settings-input--full { max-width: 100%; }

        .su-settings-actions-bar { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px; margin-bottom: 10px; }
        .su-action-btn {
          display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px;
          border-radius: 8px; font-size: 0.86rem; font-weight: 600; cursor: pointer;
          transition: all 0.2s; text-decoration: none;
        }
        .su-action-btn--primary {
          background: #EBF9FB; color: #0E858B; border: 1px solid #B8EBF0;
        }
        .su-action-btn--primary:hover:not(:disabled) { background: #D6F4F7; color: #0A6368; }
        .su-action-btn--outline {
          background: #F8FAFB; color: #4B6B75; border: 1px solid #D6E2E4;
        }
        .su-action-btn--outline:hover { background: #EEF4F6; color: #162B30; }

        .su-radius-controls { display: flex; flex-direction: column; gap: 12px; margin-top: 6px; }
        .su-settings-range { width: 100%; max-width: 420px; accent-color: #F05A28; cursor: pointer; }
        .su-preset-pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .su-pill {
          padding: 6px 14px; border-radius: 20px; border: 1px solid #D6E2E4;
          background: #F8FAFB; color: #4B6B75; font-size: 0.82rem; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .su-pill:hover { border-color: #11B5BB; color: #11B5BB; }
        .su-pill--active {
          background: #0E3B43; color: #fff; border-color: #0E3B43;
        }

        .su-settings-footer { display: flex; justify-content: flex-end; }
        .su-settings-save-btn { 
          display: inline-flex; align-items: center; gap: 10px;
          padding: 13px 36px; background: #F05A28; color: #fff; border: none; 
          border-radius: 12px; font-weight: 700; font-size: 0.95rem; cursor: pointer;
          transition: all 0.2s ease; box-shadow: 0 4px 12px rgba(240, 90, 40, 0.25);
        }
        .su-settings-save-btn:hover:not(:disabled) { background: #DC4B1D; transform: translateY(-1px); }
        .su-settings-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
