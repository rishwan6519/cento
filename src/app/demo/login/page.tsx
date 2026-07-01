"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DemoLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Save auth data
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.user.id);
      localStorage.setItem("userRole", data.user.role);
      localStorage.setItem("demoDeviceSerial", data.device?.serialNumber || "");

      router.push("/demo/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        .demo-auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0B2830 0%, #0D4954 40%, #155E68 100%);
          font-family: 'Inter', sans-serif;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }
        .demo-auth-page::before {
          content: '';
          position: absolute;
          top: -200px; right: -200px;
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(240,90,40,0.12) 0%, transparent 70%);
          border-radius: 50%;
        }
        .demo-auth-page::after {
          content: '';
          position: absolute;
          bottom: -150px; left: -150px;
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(17,181,187,0.1) 0%, transparent 70%);
          border-radius: 50%;
        }

        .demo-auth-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 440px;
          background: rgba(255,255,255,0.03);
          backdrop-filter: blur(40px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          padding: 48px;
          box-shadow: 0 32px 64px rgba(0,0,0,0.3);
        }

        .demo-auth-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 32px;
        }
        .demo-auth-logo-icon {
          width: 44px; height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, #F05A28, #E94622);
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          font-size: 1.2rem;
          font-weight: 800;
          box-shadow: 0 4px 16px rgba(240,90,40,0.3);
        }
        .demo-auth-logo-text {
          font-size: 1.3rem;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.02em;
        }
        .demo-auth-logo-badge {
          background: rgba(17,181,187,0.15);
          border: 1px solid rgba(17,181,187,0.3);
          color: #11B5BB;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .demo-auth-title {
          font-size: 1.7rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 8px;
          letter-spacing: -0.02em;
        }
        .demo-auth-subtitle {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.5);
          margin-bottom: 32px;
          line-height: 1.5;
        }

        .demo-auth-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .demo-auth-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .demo-auth-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: rgba(255,255,255,0.6);
          letter-spacing: 0.02em;
        }
        .demo-auth-input-wrap {
          position: relative;
        }
        .demo-auth-input {
          width: 100%;
          padding: 13px 16px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          color: #fff;
          font-size: 0.9rem;
          font-family: inherit;
          outline: none;
          transition: all 0.2s ease;
        }
        .demo-auth-input::placeholder {
          color: rgba(255,255,255,0.25);
        }
        .demo-auth-input:focus {
          border-color: #F05A28;
          background: rgba(255,255,255,0.08);
          box-shadow: 0 0 0 3px rgba(240,90,40,0.15);
        }

        .demo-auth-password-toggle {
          position: absolute;
          right: 12px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          font-size: 0.85rem;
          padding: 4px;
          transition: color 0.15s;
        }
        .demo-auth-password-toggle:hover {
          color: rgba(255,255,255,0.7);
        }

        .demo-auth-error {
          background: rgba(220,38,38,0.12);
          border: 1px solid rgba(220,38,38,0.25);
          color: #FCA5A5;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 500;
        }

        .demo-auth-submit {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #F05A28, #E94622);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-size: 0.95rem;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 16px rgba(240,90,40,0.3);
          margin-top: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .demo-auth-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(240,90,40,0.4);
        }
        .demo-auth-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .demo-auth-spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: demo-spin 0.6s linear infinite;
        }
        @keyframes demo-spin {
          to { transform: rotate(360deg); }
        }

        .demo-auth-footer {
          margin-top: 28px;
          text-align: center;
          font-size: 0.85rem;
          color: rgba(255,255,255,0.45);
        }
        .demo-auth-footer a {
          color: #11B5BB;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.15s;
        }
        .demo-auth-footer a:hover {
          color: #3DD4DB;
        }

        .demo-login-device-info {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(17,181,187,0.08);
          border: 1px solid rgba(17,181,187,0.15);
          border-radius: 10px;
          padding: 12px 16px;
        }
        .demo-login-device-info-icon {
          width: 32px; height: 32px;
          border-radius: 8px;
          background: rgba(17,181,187,0.15);
          display: flex; align-items: center; justify-content: center;
          color: #11B5BB;
          font-size: 0.9rem;
          flex-shrink: 0;
        }
        .demo-login-device-info p {
          font-size: 0.78rem;
          color: rgba(255,255,255,0.5);
          line-height: 1.45;
        }
        .demo-login-device-info strong {
          color: #11B5BB;
        }
      `}</style>

      <div className="demo-auth-page">
        <div className="demo-auth-card">
          <div className="demo-auth-logo">
            <div className="demo-auth-logo-icon">DH</div>
            <span className="demo-auth-logo-text">DeviceHub</span>
            <span className="demo-auth-logo-badge">Demo</span>
          </div>

          <h1 className="demo-auth-title">Welcome back</h1>
          <p className="demo-auth-subtitle">
            Sign in to your demo store account to manage playlists and announcements.
          </p>

          {error && <div className="demo-auth-error">{error}</div>}

          <form className="demo-auth-form" onSubmit={handleSubmit}>
            <div className="demo-auth-field">
              <label className="demo-auth-label">Username</label>
              <input
                className="demo-auth-input"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="demo-auth-field">
              <label className="demo-auth-label">Password</label>
              <div className="demo-auth-input-wrap">
                <input
                  className="demo-auth-input"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="demo-auth-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="demo-login-device-info">
              <div className="demo-login-device-info-icon">🔊</div>
              <p>
                Your <strong>demo audio device</strong> will be available on login with its unique <strong>SN-XXXXX</strong> serial.
              </p>
            </div>

            <button
              type="submit"
              className="demo-auth-submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="demo-auth-spinner" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="demo-auth-footer">
            Don't have an account?{" "}
            <a href="/demo/signup">Create one</a>
          </div>
        </div>
      </div>
    </>
  );
}
