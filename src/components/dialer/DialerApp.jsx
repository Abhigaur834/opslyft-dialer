import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";

import LoginScreen         from "./LoginScreen";
import AgentDesktop        from "./AgentDesktop";
import SupervisorDashboard from "./SupervisorDashboard";
import CampaignManager     from "./CampaignManager";
import IVRBuilder          from "./IVRBuilder";
import UserManagement      from "./UserManagement";

// ── Global CSS ────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;0,900;1,400;1,700&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }

  body {
    background: #07090f; color: #e8edf8;
    font-family: 'DM Sans', sans-serif; font-size: 14px;
    line-height: 1.6; -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: #07090f; }
  ::-webkit-scrollbar-thumb { background: #1a2540; border-radius: 2px; }
  ::-webkit-scrollbar-thumb:hover { background: #243460; }
  ::selection { background: #ff6b35; color: #fff; }

  @keyframes fadeUp   { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes blink    { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
  @keyframes pulse    { 0%,100% { transform:scale(1); } 50% { transform:scale(1.12); } }
  @keyframes slideIn  { from { opacity:0; transform:translateX(-8px); } to { opacity:1; transform:translateX(0); } }
  @keyframes spin     { to { transform:rotate(360deg); } }

  input, select, textarea, button { font-family:'DM Sans', sans-serif; }
`;

// ── Navigation per role ───────────────────────────────────────────────
//
//  supervisor : full access — dashboard, campaigns, IVR, users, agent view
//  team_lead  : dashboard (their team) + agent view (own desk)
//  agent      : my desk only
//
const NAV = {
  supervisor: [
    { id: "supervisor", icon: "📊", label: "Live Dashboard" },
    { id: "campaigns",  icon: "📋", label: "Campaigns" },
    { id: "ivr",        icon: "🌳", label: "IVR Builder" },
    { id: "users",      icon: "👥", label: "Team & Access" },
    { id: "agent",      icon: "📞", label: "Agent View" },
  ],
  team_lead: [
    { id: "supervisor", icon: "📊", label: "My Team Dashboard" },
    { id: "agent",      icon: "📞", label: "My Desk" },
  ],
  agent: [
    { id: "agent", icon: "📞", label: "My Desk" },
  ],
};

// ── Role colours ──────────────────────────────────────────────────────
const ROLE_COLOR = {
  supervisor: "#ff6b35",
  team_lead:  "#5b8af7",
  agent:      "#22d38a",
};

// ── Sidebar ───────────────────────────────────────────────────────────
function Sidebar({ user, activeTab, setTab, onLogout }) {
  const navItems = NAV[user.role] || NAV.agent;

  return (
    <div style={{
      width:64, height:"100%", background:"#060810",
      borderRight:"1px solid rgba(255,255,255,0.06)",
      display:"flex", flexDirection:"column",
      alignItems:"center", paddingTop:12, paddingBottom:12,
      gap:4, flexShrink:0,
    }}>
      {/* Logo */}
      <div style={{
        width:38, height:38, borderRadius:10, marginBottom:12,
        background:"linear-gradient(135deg,#ff6b35,#ff8f5e)",
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"Playfair Display, serif", fontWeight:900, fontSize:17, color:"#fff",
        boxShadow:"0 0 18px rgba(255,107,53,0.35)", cursor:"pointer", flexShrink:0,
      }} title="OpsLyft" onClick={() => window.location.href = "/"}>O</div>

      <div style={{ width:"100%", paddingInline:10, marginBottom:4 }}>
        <div style={{ height:1, background:"rgba(255,255,255,0.05)" }} />
      </div>

      {navItems.map(item => (
        <button key={item.id} onClick={() => setTab(item.id)} title={item.label}
          style={{
            width:44, height:44, borderRadius:11, position:"relative",
            background:activeTab===item.id ? "rgba(255,107,53,0.14)" : "transparent",
            border:`1px solid ${activeTab===item.id ? "rgba(255,107,53,0.28)" : "transparent"}`,
            color:"#e8edf8", fontSize:18, cursor:"pointer", transition:"all 0.15s",
            display:"flex", alignItems:"center", justifyContent:"center",
          }}
          onMouseEnter={e => { if (activeTab!==item.id) e.currentTarget.style.background="rgba(255,255,255,0.04)"; }}
          onMouseLeave={e => { if (activeTab!==item.id) e.currentTarget.style.background="transparent"; }}>
          {item.icon}
          {activeTab===item.id && (
            <div style={{ position:"absolute", left:0, top:"50%", transform:"translateY(-50%)", width:3, height:20, background:"#ff6b35", borderRadius:"0 3px 3px 0", boxShadow:"0 0 8px rgba(255,107,53,0.6)" }} />
          )}
        </button>
      ))}

      <div style={{ flex:1 }} />

      {/* Role badge */}
      <div style={{ fontSize:8, fontWeight:700, letterSpacing:0.5, color:ROLE_COLOR[user.role]||"#3a4460", textTransform:"uppercase", marginBottom:6, textAlign:"center", lineHeight:1.3 }}>
        {user.role==="team_lead" ? "TEAM\nLEAD" : user.role?.toUpperCase()}
      </div>

      {/* Avatar */}
      <div style={{
        width:34, height:34, borderRadius:"50%",
        background:`linear-gradient(135deg, ${ROLE_COLOR[user.role]||"#ff6b35"}22, ${ROLE_COLOR[user.role]||"#ff6b35"}08)`,
        border:`1px solid ${ROLE_COLOR[user.role]||"#ff6b35"}30`,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontFamily:"Playfair Display, serif", fontWeight:900, fontSize:13, color:ROLE_COLOR[user.role]||"#ff6b35",
        marginBottom:6,
      }} title={user.name}>{user.name.charAt(0).toUpperCase()}</div>

      {/* Logout */}
      <button onClick={onLogout} title="Sign out"
        style={{ width:34, height:34, borderRadius:8, background:"transparent", border:"1px solid rgba(255,255,255,0.07)", color:"#3a4460", fontSize:15, cursor:"pointer", transition:"all 0.15s", display:"flex", alignItems:"center", justifyContent:"center" }}
        onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(240,64,96,0.3)"; e.currentTarget.style.color="#f04060"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor="rgba(255,255,255,0.07)"; e.currentTarget.style.color="#3a4460"; }}>↩</button>
    </div>
  );
}

// ── Topbar ────────────────────────────────────────────────────────────
function Topbar({ user, activeTab }) {
  const labels = {
    agent:      "Agent Desktop",
    supervisor: user.role === "team_lead" ? "My Team Dashboard" : "Live Dashboard",
    campaigns:  "Campaign Manager",
    ivr:        "IVR Builder",
    users:      "Team & Access",
  };
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", second:"2-digit" })
  );
  useEffect(() => {
    const id = setInterval(() =>
      setTime(new Date().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", second:"2-digit" })), 1000
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      height:48, display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"0 20px", borderBottom:"1px solid rgba(255,255,255,0.06)",
      background:"#07090f", flexShrink:0,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:11, color:"#2a3050", fontWeight:600 }}>OpsLyft</span>
        <span style={{ fontSize:11, color:"#2a3050" }}>›</span>
        <span style={{ fontSize:11, color:"#8a97b8", fontWeight:600 }}>Contact Centre</span>
        <span style={{ fontSize:11, color:"#2a3050" }}>›</span>
        <span style={{ fontSize:12, color:"#e8edf8", fontWeight:700, animation:"slideIn 0.25s ease" }}>{labels[activeTab]||"—"}</span>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:16 }}>
        <div style={{ fontFamily:"DM Mono, monospace", fontSize:11, color:"#2a3050" }}>{time}</div>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <span style={{
            fontSize:9, fontWeight:700, letterSpacing:0.5, padding:"2px 9px",
            borderRadius:20, background:(ROLE_COLOR[user.role]||"#8a97b8")+"14",
            border:`1px solid ${(ROLE_COLOR[user.role]||"#8a97b8")}30`,
            color:ROLE_COLOR[user.role]||"#8a97b8", textTransform:"uppercase",
          }}>{user.role==="team_lead" ? "Team Lead" : user.role}</span>
          <span style={{ fontSize:12, color:"#8a97b8" }}>{user.name}</span>
        </div>
      </div>
    </div>
  );
}

// ── Access denied screen ──────────────────────────────────────────────
function AccessDenied() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:8 }}>
      <div style={{ fontSize:32 }}>🔒</div>
      <div style={{ color:"#3a4460", fontSize:13 }}>Access restricted for your role.</div>
      <div style={{ color:"#2a3050", fontSize:11 }}>Contact your supervisor for access.</div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────
export default function DialerApp() {
  const [user,        setUser]        = useState(null);
  const [activeTab,   setActiveTab]   = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Inject global CSS once
  useEffect(() => {
    const id = "dialer-global-css";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id; s.textContent = GLOBAL_CSS;
      document.head.appendChild(s);
    }
    return () => { const el = document.getElementById(id); if (el) el.remove(); };
  }, []);

  // Firebase session persistence — stays logged in on refresh
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async firebaseUser => {
      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          if (snap.exists()) {
            const { role, displayName, active } = snap.data();
            // Block deactivated users
            if (active === false) {
              await signOut(auth);
              setUser(null);
            } else {
              const u = {
                uid:   firebaseUser.uid,
                email: firebaseUser.email,
                role:  role || "agent",
                name:  displayName || firebaseUser.email.split("@")[0],
              };
              setUser(u);
              // Default tab per role
              const defaultTab = {
                supervisor: "supervisor",
                team_lead:  "supervisor",
                agent:      "agent",
              };
              setActiveTab(defaultTab[u.role] || "agent");
            }
          } else {
            setUser(null);
          }
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogin  = (u) => {
    setUser(u);
    const defaultTab = { supervisor:"supervisor", team_lead:"supervisor", agent:"agent" };
    setActiveTab(defaultTab[u.role] || "agent");
  };
  const handleLogout = async () => { await signOut(auth); setUser(null); setActiveTab(null); };

  // ── Auth loading spinner ──
  if (authLoading) return (
    <div style={{ background:"#07090f", height:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:24, height:24, borderRadius:"50%", border:"2px solid rgba(255,107,53,0.2)", borderTopColor:"#ff6b35", animation:"spin 0.7s linear infinite" }} />
    </div>
  );

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  // ── Role-based access guard ──
  const can = {
    supervisor: ["supervisor","team_lead"].includes(user.role),
    campaigns:  user.role === "supervisor",
    ivr:        user.role === "supervisor",
    users:      user.role === "supervisor",
    agent:      true,
  };

  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", background:"#07090f" }}>
      <Sidebar user={user} activeTab={activeTab} setTab={setActiveTab} onLogout={handleLogout} />

      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, overflow:"hidden" }}>
        <Topbar user={user} activeTab={activeTab} />

        <div style={{ flex:1, overflow:"hidden" }}>
          {activeTab === "agent"      && <AgentDesktop agent={user} />}
          {activeTab === "supervisor" && (can.supervisor ? <SupervisorDashboard /> : <AccessDenied />)}
          {activeTab === "campaigns"  && (can.campaigns  ? <CampaignManager />     : <AccessDenied />)}
          {activeTab === "ivr"        && (can.ivr         ? <IVRBuilder />          : <AccessDenied />)}
          {activeTab === "users"      && (can.users        ? <UserManagement currentUser={user} /> : <AccessDenied />)}
        </div>
      </div>
    </div>
  );
}
