import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { EyeInvisibleOutlined, EyeTwoTone, MobileOutlined, UserOutlined, LockOutlined } from "@ant-design/icons";

// ─── Shared brand panel ──────────────────────────────────────────────────────
function BrandPanel() {
  return (
    <div
      style={{
        width: "40%",
        minHeight: "100vh",
        background: "#0F172A",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 40px",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* Decorative grid */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          pointerEvents: "none",
        }}
      />

      {/* Brand */}
      <div style={{ textAlign: "center", position: "relative" }}>
        <div
          style={{
            fontSize: 52,
            fontWeight: 800,
            color: "#fff",
            letterSpacing: "-2px",
            lineHeight: 1,
            marginBottom: 12,
          }}
        >
          beeyo
        </div>
        <div
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.45)",
            letterSpacing: "3px",
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          Admin Dashboard
        </div>

        {/* Decorative pill */}
        <div
          style={{
            marginTop: 40,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 100,
            padding: "8px 20px",
            color: "rgba(255,255,255,0.6)",
            fontSize: 13,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34D399", display: "inline-block" }} />
          Secure admin access
        </div>
      </div>

      {/* Bottom credit */}
      <div
        style={{
          position: "absolute",
          bottom: 28,
          fontSize: 12,
          color: "rgba(255,255,255,0.2)",
        }}
      >
        © 2026 beeyo. All rights reserved.
      </div>
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────
type TabKey = "mobile" | "username";

export default function LoginPage() {
  // Redirect after login is handled by GuestRoute in App.tsx
  const { login } = useAuth();

  const [tab, setTab] = useState<TabKey>("mobile");
  const [mobile, setMobile] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (tab === "mobile") {
      if (!mobile) errs.mobile = "Mobile number is required.";
      else if (!/^\d{10}$/.test(mobile)) errs.mobile = "Must be exactly 10 digits.";
    } else {
      if (!username) errs.username = "Username is required.";
      else if (username.length < 3) errs.username = "At least 3 characters required.";
    }
    if (!password) errs.password = "Password is required.";
    else if (password.length < 6) errs.password = "At least 6 characters required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const credentials =
        tab === "mobile"
          ? { mobile, password }
          : { username, password };

      await login(credentials);
      // Clear form state immediately — never leave password around
      setPassword("");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Styles ──────────────────────────────────────────────────────────────────
  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: "100%",
    height: 48,
    padding: "0 14px 0 42px",
    borderRadius: 10,
    border: `1.5px solid ${hasError ? "#EF4444" : "#E5E7EB"}`,
    fontSize: 15,
    outline: "none",
    background: "#FAFAFA",
    color: "#111827",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  });

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "9px 0",
    border: "none",
    background: active ? "#fff" : "transparent",
    borderRadius: 8,
    fontWeight: active ? 600 : 400,
    fontSize: 14,
    color: active ? "#0F172A" : "#6B7280",
    cursor: "pointer",
    boxShadow: active ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
    transition: "all 0.2s",
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Left brand panel — hidden on small screens via inline media-query workaround */}
      <BrandPanel />

      {/* Right form panel */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
          padding: "40px 24px",
        }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>
          {/* Heading */}
          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: "0 0 6px" }}>
              Beeyo Admin
            </h1>
            <p style={{ fontSize: 15, color: "#6B7280", margin: 0 }}>
              Sign in to your admin account
            </p>
          </div>

          {/* Tab switcher */}
          <div
            style={{
              display: "flex",
              background: "#F3F4F6",
              borderRadius: 10,
              padding: 4,
              marginBottom: 24,
            }}
          >
            <button style={tabStyle(tab === "mobile")} onClick={() => { setTab("mobile"); setErrors({}); setApiError(""); }}>
              <MobileOutlined style={{ marginRight: 6 }} /> Mobile Number
            </button>
            <button style={tabStyle(tab === "username")} onClick={() => { setTab("username"); setErrors({}); setApiError(""); }}>
              <UserOutlined style={{ marginRight: 6 }} /> Username
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Mobile or Username */}
            {tab === "mobile" ? (
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                  Mobile Number
                </label>
                <div style={{ position: "relative" }}>
                  <MobileOutlined style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", fontSize: 16 }} />
                  <input
                    id="login-mobile"
                    type="tel"
                    inputMode="numeric"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit mobile number"
                    style={inputStyle(!!errors.mobile)}
                    autoComplete="tel"
                  />
                </div>
                {errors.mobile && <p style={{ fontSize: 12, color: "#EF4444", margin: "4px 0 0" }}>{errors.mobile}</p>}
              </div>
            ) : (
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                  Username
                </label>
                <div style={{ position: "relative" }}>
                  <UserOutlined style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", fontSize: 16 }} />
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    style={inputStyle(!!errors.username)}
                    autoComplete="username"
                  />
                </div>
                {errors.username && <p style={{ fontSize: 12, color: "#EF4444", margin: "4px 0 0" }}>{errors.username}</p>}
              </div>
            )}

            {/* Password */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <LockOutlined style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", fontSize: 16 }} />
                <input
                  id="login-password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{ ...inputStyle(!!errors.password), paddingRight: 44 }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#9CA3AF",
                    padding: 0,
                    fontSize: 17,
                    lineHeight: 1,
                  }}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeTwoTone /> : <EyeInvisibleOutlined />}
                </button>
              </div>
              {errors.password && <p style={{ fontSize: 12, color: "#EF4444", margin: "4px 0 0" }}>{errors.password}</p>}
            </div>

            {/* API error */}
            {apiError && (
              <div
                style={{
                  background: "#FEF2F2",
                  border: "1px solid #FECACA",
                  borderRadius: 8,
                  padding: "10px 14px",
                  marginBottom: 20,
                  fontSize: 14,
                  color: "#B91C1C",
                }}
              >
                {apiError}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                height: 48,
                borderRadius: 10,
                border: "none",
                background: loading ? "#374151" : "#0F172A",
                color: "#fff",
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "background 0.2s",
              }}
            >
              {loading ? (
                <>
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      display: "inline-block",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { border-color: #0F172A !important; background: #fff !important; }
      `}</style>
    </div>
  );
}
