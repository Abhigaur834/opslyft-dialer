import { useState, useEffect } from "react";

// ── Mock live data ────────────────────────────────────────────────────
const genAgents = () => [
  { id: 1, name: "Rahul Kumar",  email: "rahul@opslyft.com",  status: "On Call",   callTime: 187, calls: 18, qa: 9.1, disp: "INT", activeSid: "CA001" },
  { id: 2, name: "Priya Sharma", email: "priya@opslyft.com",  status: "Wrap Up",   callTime: 0,   calls: 14, qa: 8.4, disp: "CB",  activeSid: null },
  { id: 3, name: "Amit Mehta",   email: "amit@opslyft.com",   status: "On Call",   callTime: 62,  calls: 11, qa: 6.8, disp: null,  activeSid: "CA002" },
  { id: 4, name: "Kavya Rao",    email: "kavya@opslyft.com",  status: "Available", callTime: 0,   calls: 16, qa: 8.9, disp: null,  activeSid: null },
  { id: 5, name: "Deepak Singh", email: "deepak@opslyft.com", status: "Break",     callTime: 0,   calls: 9,  qa: 7.2, disp: null,  activeSid: null },
  { id: 6, name: "Sunita Nair",  email: "sunita@opslyft.com", status: "On Call",   callTime: 334, calls: 20, qa: 9.3, disp: null,  activeSid: "CA003" },
  { id: 7, name: "Karan Mehta",  email: "karan@opslyft.com",  status: "Offline",   callTime: 0,   calls: 0,  qa: 0,   disp: null,  activeSid: null },
  { id: 8, name: "Neha Gupta",   email: "neha@opslyft.com",   status: "On Call",   callTime: 95,  calls: 13, qa: 7.6, disp: null,  activeSid: "CA004" },
];

const QUEUE = [
  { waitTime: 42, from: "+91 99xx1234", campaign: "Q3 Outbound" },
  { waitTime: 18, from: "+91 88xx5678", campaign: "Q3 Outbound" },
  { waitTime: 7,  from: "+91 77xx9012", campaign: "Inbound Support" },
];

const HOURLY = [9,11,14,13,16,18,15,12].map((v, i) => ({ hour: `${9+i}:00`, calls: v }));

function fmt(s) {
  if (!s) return "—";
  return `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;
}

const STATUS_COLOR = {
  "On Call": "#22d38a", "Available": "#5b8af7",
  "Wrap Up": "#a855f7", "Break": "#f5a623", "Offline": "#3a4460",
};

// ── Agent card ────────────────────────────────────────────────────────
function AgentCard({ agent, onAction }) {
  const color = STATUS_COLOR[agent.status] || "#3a4460";
  const isLive = agent.status === "On Call";
  const [timer, setTimer] = useState(agent.callTime);

  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [isLive]);

  return (
    <div style={{
      background: "linear-gradient(145deg, #0e1422, #131a2e)",
      border: `1px solid ${isLive ? "rgba(34,211,138,0.18)" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 12, padding: 16, position: "relative",
      transition: "all 0.2s",
    }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
    >
      {isLive && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "#22d38a", borderRadius: "12px 12px 0 0" }} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: `linear-gradient(135deg, ${color}22, ${color}11)`,
            border: `1px solid ${color}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "Playfair Display, serif", fontWeight: 900, fontSize: 13, color,
          }}>{agent.name.charAt(0)}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e8edf8" }}>{agent.name}</div>
            <div style={{ fontSize: 10, color: "#3a4460" }}>{agent.email.split("@")[0]}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, boxShadow: isLive ? `0 0 6px ${color}` : "none" }} />
          <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: 0.5 }}>{agent.status}</span>
        </div>
      </div>

      {/* Metrics row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
        <div style={{ textAlign: "center", background: "#07090f", borderRadius: 6, padding: "7px 4px", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 15, fontWeight: 700, color: isLive ? "#22d38a" : "#8a97b8" }}>{isLive ? fmt(timer) : "—"}</div>
          <div style={{ fontSize: 8, color: "#3a4460", letterSpacing: 1, textTransform: "uppercase", marginTop: 1 }}>Live</div>
        </div>
        <div style={{ textAlign: "center", background: "#07090f", borderRadius: 6, padding: "7px 4px", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 15, fontWeight: 700, color: "#ff6b35" }}>{agent.calls}</div>
          <div style={{ fontSize: 8, color: "#3a4460", letterSpacing: 1, textTransform: "uppercase", marginTop: 1 }}>Calls</div>
        </div>
        <div style={{ textAlign: "center", background: "#07090f", borderRadius: 6, padding: "7px 4px", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 15, fontWeight: 700, color: agent.qa >= 8 ? "#22d38a" : agent.qa >= 6.5 ? "#f5a623" : "#f04060" }}>
            {agent.qa > 0 ? agent.qa.toFixed(1) : "—"}
          </div>
          <div style={{ fontSize: 8, color: "#3a4460", letterSpacing: 1, textTransform: "uppercase", marginTop: 1 }}>QA</div>
        </div>
      </div>

      {/* Action buttons — only for live calls */}
      {isLive && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5 }}>
          {[["👂", "Monitor", "#5b8af7"], ["📢", "Barge", "#f04060"], ["💬", "Whisper", "#22d38a"]].map(([icon, label, col]) => (
            <button key={label} onClick={() => onAction(agent, label.toLowerCase())}
              style={{ padding: "6px 0", fontSize: 10, fontWeight: 700, background: col + "12", color: col, border: `1px solid ${col}30`, borderRadius: 6, cursor: "pointer", fontFamily: "DM Sans, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 3, transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = col + "22"; e.currentTarget.style.borderColor = col + "60"; }}
              onMouseLeave={e => { e.currentTarget.style.background = col + "12"; e.currentTarget.style.borderColor = col + "30"; }}>
              {icon} {label}
            </button>
          ))}
        </div>
      )}

      {/* Dip alert badge */}
      {agent.qa > 0 && agent.qa < 7 && (
        <div style={{ marginTop: 8, fontSize: 10, color: "#f5a623", background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.2)", borderRadius: 6, padding: "4px 8px", display: "flex", alignItems: "center", gap: 5 }}>
          ⚡ Dip alert — QA below 7.0
        </div>
      )}
    </div>
  );
}

// ── Mini bar chart ────────────────────────────────────────────────────
function HourlyChart({ data }) {
  const max = Math.max(...data.map(d => d.calls));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 60 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <div style={{ width: "100%", borderRadius: 3, background: `rgba(255,107,53,${0.2 + (d.calls/max)*0.7})`, height: `${(d.calls/max)*52}px`, minHeight: 4, transition: "height 0.5s" }} />
          <div style={{ fontSize: 8, color: "#3a4460", whiteSpace: "nowrap" }}>{d.hour.replace(":00","")}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main Supervisor Dashboard ─────────────────────────────────────────
export default function SupervisorDashboard() {
  const [agents, setAgents] = useState(genAgents());
  const [actionToast, setActionToast] = useState(null);
  const [wallTimer, setWallTimer] = useState(0);
  const [filter, setFilter] = useState("All");

  // Tick every second for wallboard freshness
  useEffect(() => {
    const id = setInterval(() => setWallTimer(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const liveCalls = agents.filter(a => a.status === "On Call").length;
  const available = agents.filter(a => a.status === "Available").length;
  const onBreak = agents.filter(a => a.status === "Break" || a.status === "Wrap Up").length;
  const avgQA = (agents.filter(a => a.qa > 0).reduce((s, a) => s + a.qa, 0) / agents.filter(a => a.qa > 0).length).toFixed(1);
  const totalCalls = agents.reduce((s, a) => s + a.calls, 0);

  const handleAction = (agent, action) => {
    setActionToast(`${action.charAt(0).toUpperCase() + action.slice(1)} — ${agent.name}`);
    setTimeout(() => setActionToast(null), 2500);
    // WIRE UP: Exotel conference/barge API call
  };

  const filters = ["All", "On Call", "Available", "Break", "Offline"];
  const filtered = filter === "All" ? agents : agents.filter(a => a.status === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>
      {/* Top strip */}
      <div style={{ padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#0a0e18", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#e8edf8", fontFamily: "Playfair Display, serif" }}>Supervisor Console</div>
        <div style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#3a4460" }}>
          Live · Updated {wallTimer}s ago
        </div>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Wallboard metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {[
            { label: "Live Calls", val: liveCalls, color: "#22d38a", sub: "agents on call" },
            { label: "Queue", val: QUEUE.length, color: "#f5a623", sub: "waiting" },
            { label: "Available", val: available, color: "#5b8af7", sub: "ready to dial" },
            { label: "Today's Calls", val: totalCalls, color: "#ff6b35", sub: "across all agents" },
            { label: "QA Average", val: avgQA, color: avgQA >= 8 ? "#22d38a" : "#f5a623", sub: "team score" },
          ].map(m => (
            <div key={m.label} style={{ background: "linear-gradient(145deg, #0e1422, #131a2e)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 9, color: "#3a4460", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontFamily: "Playfair Display, serif", fontSize: 32, fontWeight: 900, color: m.color, letterSpacing: -1, lineHeight: 1 }}>{m.val}</div>
              <div style={{ fontSize: 10, color: "#3a4460", marginTop: 4 }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 12 }}>
          {/* Hourly calls chart */}
          <div style={{ background: "linear-gradient(145deg, #0e1422, #131a2e)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#8a97b8", letterSpacing: 1, textTransform: "uppercase" }}>Calls by Hour</div>
              <div style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#ff6b35" }}>{totalCalls} total today</div>
            </div>
            <HourlyChart data={HOURLY} />
          </div>

          {/* Call queue */}
          <div style={{ background: "linear-gradient(145deg, #0e1422, #131a2e)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#8a97b8", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
              Live Queue <span style={{ color: QUEUE.length > 0 ? "#f5a623" : "#3a4460" }}>({QUEUE.length})</span>
            </div>
            {QUEUE.length === 0 ? (
              <div style={{ color: "#3a4460", fontSize: 12, textAlign: "center", paddingTop: 16 }}>Queue empty</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {QUEUE.map((q, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 11px", background: "#07090f", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 7 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "#e8edf8", fontFamily: "DM Mono, monospace" }}>{q.from}</div>
                      <div style={{ fontSize: 9, color: "#3a4460", marginTop: 1 }}>{q.campaign}</div>
                    </div>
                    <div style={{ fontFamily: "DM Mono, monospace", fontSize: 13, fontWeight: 700, color: q.waitTime > 30 ? "#f04060" : "#f5a623" }}>
                      {q.waitTime}s
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Agent grid */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#8a97b8", letterSpacing: 1, textTransform: "uppercase" }}>
              Agent Grid <span style={{ color: "#3a4460" }}>({filtered.length})</span>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {filters.map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
                  background: filter === f ? "#ff6b35" : "#0e1422",
                  color: filter === f ? "#fff" : "#8a97b8",
                  border: `1px solid ${filter === f ? "#ff6b35" : "rgba(255,255,255,0.07)"}`,
                  fontFamily: "DM Sans, sans-serif", transition: "all 0.15s",
                }}>{f}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {filtered.map(a => <AgentCard key={a.id} agent={a} onAction={handleAction} />)}
          </div>
        </div>

      </div>

      {/* Toast */}
      {actionToast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#0e1422", border: "1px solid rgba(255,107,53,0.35)", borderRadius: 10, padding: "12px 20px", fontSize: 13, fontWeight: 700, color: "#ff6b35", boxShadow: "0 8px 28px rgba(0,0,0,0.5)", zIndex: 999, animation: "fadeUp 0.3s ease" }}>
          ⚡ {actionToast}
        </div>
      )}
    </div>
  );
}
