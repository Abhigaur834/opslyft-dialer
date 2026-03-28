/**
 * DialerApp.jsx — OpsLyft Contact Centre
 * URL: app.opslyft.online/dialer
 *
 * ── Project Structure ─────────────────────────────────────────────
 * src/
 *   components/dialer/
 *     DialerApp.jsx        ← this file (root, import in App.jsx)
 *     LoginScreen.jsx
 *     AgentDesktop.jsx
 *     SupervisorDashboard.jsx
 *     CampaignManager.jsx
 *
 * ── How to add to your Vite + React project ──────────────────────
 * 1. npm install (already have react, no new deps needed)
 * 2. In your router / App.jsx add:
 *      import DialerApp from "./components/dialer/DialerApp";
 *      <Route path="/dialer/*" element={<DialerApp />} />
 * 3. Deploy to Vercel — live at app.opslyft.online/dialer
 *
 * ── Firebase Auth Wire-up ────────────────────────────────────────
 * Search for "WIRE UP" comments across all files.
 * Replace mock login in LoginScreen.jsx with real Firebase Auth.
 * Add firebaseConfig from your Firebase console.
 *
 * ── Exotel Wire-up ──────────────────────────────────────────────
 * Search for "WIRE UP" comments in AgentDesktop.jsx.
 * Import exotelService.js (already built) and replace mock calls.
 * ─────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from "react";
import LoginScreen from "./LoginScreen";
import AgentDesktop from "./AgentDesktop";
import SupervisorDashboard from "./SupervisorDashboard";
import CampaignManager from "./CampaignManager";

// ── Global CSS injected once ─────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800;900&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }

  body {
    background: #07090f;
    color: #e8edf8;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: #07090f; }
  ::-webkit-scrollbar-thumb { background: #1a2540; border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: #243460; }

  ::selection { background: #ff6b35; color: #fff; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.25; }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50%       { transform: scale(1.15); opacity: 0.6; }
  }

  input, select, textarea, button { font-family: 'DM Sans', sans-serif; }
`;

// ── Nav items by role ────────────────────────────────────────────────
const NAV_AGENT = [
  { id: "agent",    icon: "📞", label: "My Desk" },
];
const NAV_SUPERVISOR = [
  { id: "supervisor", icon: "📊", label: "Live Dashboard" },
  { id: "campaigns",  icon: "📋", label: "Campaigns" },
  { id: "agent",      icon: "📞", label: "Agent View" },
];

// ── Sidebar nav ──────────────────────────────────────────────────────
function Sidebar({ user, activeTab, setTab, onLogout }) {
  const navItems = user.role === "supervisor" ? NAV_SUPERVISOR : NAV_AGENT;

  return (
    <div style={{
      width: 64, height: "100%", background: "#0a0e18",
      borderRight: "1px solid rgba(255,255,255,0.07)",
      display: "flex", flexDirection: "column",
      alignItems: "center", paddingTop: 12, paddingBottom: 12,
      gap: 4, flexShrink: 0,
    }}>
      {/* Logo mark */}
      <div style={{
        width: 38, height: 38, borderRadius: 10, marginBottom: 16,
        background: "linear-gradient(135deg, #ff6b35, #ff8f5e)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Playfair Display, serif", fontWeight: 900, fontSize: 17, color: "#fff",
        boxShadow: "0 0 16px rgba(255,107,53,0.3)", flexShrink: 0,
        cursor: "pointer",
      }}
        title="OpsLyft Contact Centre"
        onClick={() => window.location.href = "/"}
      >O</div>

      {/* Nav icons */}
      {navItems.map(item => (
        <button
          key={item.id}
          onClick={() => setTab(item.id)}
          title={item.label}
          style={{
            width: 44, height: 44, borderRadius: 11,
            background: activeTab === item.id ? "rgba(255,107,53,0.15)" : "transparent",
            border: `1px solid ${activeTab === item.id ? "rgba(255,107,53,0.3)" : "transparent"}`,
            color: "#e8edf8", fontSize: 18, cursor: "pointer",
            transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
          }}
          onMouseEnter={e => { if (activeTab !== item.id) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
          onMouseLeave={e => { if (activeTab !== item.id) e.currentTarget.style.background = "transparent"; }}
        >
          {item.icon}
          {activeTab === item.id && (
            <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 20, background: "#ff6b35", borderRadius: "0 3px 3px 0", boxShadow: "0 0 8px rgba(255,107,53,0.5)" }} />
          )}
        </button>
      ))}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Avatar + logout */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "linear-gradient(135deg, rgba(255,107,53,0.2), rgba(255,107,53,0.08))",
          border: "1px solid rgba(255,107,53,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "Playfair Display, serif", fontWeight: 900, fontSize: 13, color: "#ff6b35",
          cursor: "default",
        }} title={user.name}>
          {user.name.charAt(0)}
        </div>
        <button onClick={onLogout} title="Sign out"
          style={{ width: 34, height: 34, borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.07)", color: "#3a4460", fontSize: 14, cursor: "pointer", transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(240,64,96,0.3)"; e.currentTarget.style.color = "#f04060"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "#3a4460"; }}>
          ↩
        </button>
      </div>
    </div>
  );
}

// ── Topbar breadcrumb ────────────────────────────────────────────────
function Topbar({ user, activeTab }) {
  const labels = { agent: "Agent Desktop", supervisor: "Live Dashboard", campaigns: "Campaign Manager" };
  const now = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const [time, setTime] = useState(now);

  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const ROLE_COLOR = { agent: "#5b8af7", supervisor: "#ff6b35" };

  return (
    <div style={{
      height: 48, display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#07090f",
      flexShrink: 0,
    }}>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, color: "#3a4460", fontWeight: 600 }}>OpsLyft</span>
        <span style={{ fontSize: 11, color: "#3a4460" }}>›</span>
        <span style={{ fontSize: 11, color: "#8a97b8", fontWeight: 600 }}>Contact Centre</span>
        <span style={{ fontSize: 11, color: "#3a4460" }}>›</span>
        <span style={{ fontSize: 12, color: "#e8edf8", fontWeight: 700 }}>{labels[activeTab] || "—"}</span>
      </div>

      {/* Right: user + clock */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#3a4460" }}>{time}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 0.5, padding: "2px 9px",
            borderRadius: 20, background: ROLE_COLOR[user.role] + "14",
            border: `1px solid ${ROLE_COLOR[user.role]}30`, color: ROLE_COLOR[user.role],
            textTransform: "uppercase",
          }}>{user.role}</span>
          <span style={{ fontSize: 12, color: "#8a97b8" }}>{user.name}</span>
        </div>
      </div>
    </div>
  );
}

// ── Root App ─────────────────────────────────────────────────────────
export default function DialerApp() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(null);

  // Inject global CSS
  useEffect(() => {
    const id = "dialer-global-css";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.textContent = GLOBAL_CSS;
      document.head.appendChild(style);
    }
    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, []);

  const handleLogin = (u) => {
    setUser(u);
    setActiveTab(u.role === "supervisor" ? "supervisor" : "agent");
  };

  const handleLogout = () => {
    // WIRE UP: await signOut(auth);
    setUser(null);
    setActiveTab(null);
  };

  // Not logged in
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#07090f" }}>
      {/* Sidebar */}
      <Sidebar user={user} activeTab={activeTab} setTab={setActiveTab} onLogout={handleLogout} />

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <Topbar user={user} activeTab={activeTab} />

        {/* Screen area */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {activeTab === "agent" && <AgentDesktop agent={user} />}
          {activeTab === "supervisor" && user.role === "supervisor" && <SupervisorDashboard />}
          {activeTab === "campaigns" && user.role === "supervisor" && <CampaignManager />}
          {/* Fallback: agent trying to access supervisor screens */}
          {activeTab !== "agent" && user.role === "agent" && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#3a4460", fontSize: 14 }}>
              Access restricted. Contact your supervisor.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
