/**
 * SupervisorDashboard.jsx — OpsLyft Contact Centre
 * Real-time monitoring via Firebase Firestore onSnapshot.
 *
 * ── Firestore collections read ───────────────────────────────────────
 *   agents/{uid}    → live agent status, callTime, qa, calls
 *   queue/{id}      → live inbound queue
 *   calls/{id}      → today's call records for hourly chart
 *
 * ── How real-time works ──────────────────────────────────────────────
 *   Every time an agent updates their status in AgentDesktop.jsx,
 *   Firestore triggers onSnapshot here within milliseconds.
 *   No polling. No refresh needed. True live wallboard.
 */

import { useState, useEffect } from "react";
import {
  collection, onSnapshot, query, where,
  orderBy, Timestamp, doc, updateDoc
} from "firebase/firestore";
import { db } from "../../firebase";

// ── Design tokens ─────────────────────────────────────────────────────
const T = {
  bg:      "#07090f",
  surface: "#0e1422",
  s2:      "#131a2e",
  border:  "rgba(255,255,255,0.07)",
  orange:  "#ff6b35",
  green:   "#22d38a",
  blue:    "#5b8af7",
  amber:   "#f5a623",
  red:     "#f04060",
  purple:  "#a855f7",
  text:    "#e8edf8",
  muted:   "#8a97b8",
  faint:   "#3a4460",
};

const STATUS_COLOR = {
  "On Call":   T.green,
  "Available": T.blue,
  "Wrap Up":   T.purple,
  "Break":     T.amber,
  "Offline":   T.faint,
};

function fmt(s) {
  if (!s && s !== 0) return "—";
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

const Panel = ({ children, style = {} }) => (
  <div style={{
    background: `linear-gradient(145deg, ${T.surface}, ${T.s2})`,
    border: `1px solid ${T.border}`,
    borderRadius: 12, padding: 16, ...style
  }}>{children}</div>
);

// ── Agent Detail Modal ────────────────────────────────────────────────
function AgentModal({ agent, onClose, onAction }) {
  const c = STATUS_COLOR[agent.status] || T.faint;
  const isLive = agent.status === "On Call";
  const [timer, setTimer] = useState(agent.callTime || 0);

  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [isLive]);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 300, backdropFilter: "blur(4px)"
    }}>
      <div style={{
        background: `linear-gradient(145deg,${T.surface},${T.s2})`,
        border: `1px solid ${c}25`, borderRadius: 20, padding: 28, width: 400,
        boxShadow: "0 40px 80px rgba(0,0,0,.6)", animation: "fadeUp .2s ease"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: `linear-gradient(135deg,${c}22,${c}08)`,
              border: `2px solid ${c}40`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "Playfair Display,serif", fontWeight: 900, fontSize: 20, color: c
            }}>{(agent.name || "?").charAt(0)}</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{agent.name}</div>
              <div style={{ fontSize: 11, color: T.faint }}>{agent.email}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: c, boxShadow: isLive ? `0 0 6px ${c}` : "none" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{agent.status}</span>
                {agent.team && <span style={{ fontSize: 10, color: T.faint }}>· {agent.team}</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.faint, cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            ["Live Time",   isLive ? fmt(timer) : "—",              isLive ? T.green : T.faint],
            ["Calls Today", agent.calls || 0,                        T.orange],
            ["QA Score",    agent.qa > 0 ? agent.qa.toFixed(1) : "—", agent.qa >= 8 ? T.green : agent.qa >= 6.5 ? T.amber : T.red],
          ].map(([label, val, col]) => (
            <div key={label} style={{ textAlign: "center", background: T.bg, borderRadius: 9, padding: "12px 8px", border: `1px solid ${T.border}` }}>
              <div style={{ fontFamily: "DM Mono,monospace", fontSize: 22, fontWeight: 700, color: col }}>{val}</div>
              <div style={{ fontSize: 9, color: T.faint, letterSpacing: 1, textTransform: "uppercase", marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>

        {agent.qa > 0 && agent.qa < 7 && (
          <div style={{ marginBottom: 14, padding: "10px 14px", background: `${T.amber}06`, border: `1px solid ${T.amber}25`, borderRadius: 9, fontSize: 12, color: T.amber }}>
            ⚡ QA below threshold (7.0) — consider coaching this agent.
          </div>
        )}

        {isLive && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: T.faint, textTransform: "uppercase", marginBottom: 8 }}>Live Call Actions</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[["👂 Monitor", "monitor", T.blue], ["📢 Barge In", "barge", T.red], ["💬 Whisper", "whisper", T.green]].map(([label, action, col]) => (
                <button key={action}
                  onClick={() => { onAction(agent, action); onClose(); }}
                  style={{ padding: "10px 0", fontSize: 11, fontWeight: 700, background: `${col}12`, color: col, border: `1px solid ${col}30`, borderRadius: 8, cursor: "pointer", transition: "all .15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = `${col}22`}
                  onMouseLeave={e => e.currentTarget.style.background = `${col}12`}
                >{label}</button>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button onClick={onClose} style={{ padding: "11px 0", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 9, color: T.muted, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Close</button>
          <button style={{ padding: "11px 0", background: `${T.orange}10`, border: `1px solid ${T.orange}25`, borderRadius: 9, color: T.orange, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>View History →</button>
        </div>
      </div>
    </div>
  );
}

// ── Agent Card ────────────────────────────────────────────────────────
function AgentCard({ agent, onAction, onExpand }) {
  const c      = STATUS_COLOR[agent.status] || T.faint;
  const isLive = agent.status === "On Call";
  const [timer, setTimer] = useState(agent.callTime || 0);

  // Sync timer from Firestore callTime
  useEffect(() => {
    setTimer(agent.callTime || 0);
  }, [agent.callTime]);

  // Tick locally for smooth display
  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [isLive, agent.callTime]);

  return (
    <div
      style={{
        background: `linear-gradient(145deg,${T.surface},${T.s2})`,
        border: `1px solid ${isLive ? `${T.green}25` : T.border}`,
        borderRadius: 12, padding: 14, position: "relative",
        transition: "all .2s", cursor: "pointer",
      }}
      onClick={onExpand}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-2px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
    >
      {isLive && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: T.green, borderRadius: "12px 12px 0 0" }} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: `linear-gradient(135deg,${c}22,${c}0a)`,
            border: `1px solid ${c}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "Playfair Display,serif", fontWeight: 900, fontSize: 13, color: c,
          }}>{(agent.name || "?").charAt(0)}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{agent.name || "—"}</div>
            <div style={{ fontSize: 9, color: T.faint }}>{(agent.email || "").split("@")[0]}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: c, boxShadow: isLive ? `0 0 6px ${c}` : "none", animation: isLive ? "pulse 2s infinite" : "none" }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: c, letterSpacing: .5 }}>{agent.status || "—"}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5, marginBottom: isLive ? 9 : 0 }}>
        {[
          [isLive ? fmt(timer) : "—",              "Live",  isLive ? T.green : T.faint],
          [agent.calls || 0,                        "Calls", T.orange],
          [agent.qa > 0 ? agent.qa.toFixed(1) : "—", "QA", agent.qa >= 8 ? T.green : agent.qa >= 6.5 ? T.amber : T.red],
        ].map(([v, l, col]) => (
          <div key={l} style={{ textAlign: "center", background: T.bg, borderRadius: 6, padding: "6px 3px", border: `1px solid ${T.border}` }}>
            <div style={{ fontFamily: "DM Mono,monospace", fontSize: 14, fontWeight: 700, color: col }}>{v}</div>
            <div style={{ fontSize: 7, color: T.faint, letterSpacing: 1, textTransform: "uppercase", marginTop: 1 }}>{l}</div>
          </div>
        ))}
      </div>

      {isLive && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }} onClick={e => e.stopPropagation()}>
          {[["👂", "Monitor", T.blue], ["📢", "Barge", T.red], ["💬", "Whisper", T.green]].map(([icon, label, col]) => (
            <button key={label}
              onClick={() => onAction(agent, label.toLowerCase())}
              style={{ padding: "6px 0", fontSize: 9, fontWeight: 700, background: `${col}12`, color: col, border: `1px solid ${col}30`, borderRadius: 5, cursor: "pointer", transition: "all .15s" }}
              onMouseEnter={e => e.currentTarget.style.background = `${col}25`}
              onMouseLeave={e => e.currentTarget.style.background = `${col}12`}
            >{icon} {label}</button>
          ))}
        </div>
      )}

      {agent.qa > 0 && agent.qa < 7 && (
        <div style={{ marginTop: 8, fontSize: 9, color: T.amber, background: `${T.amber}08`, border: `1px solid ${T.amber}20`, borderRadius: 5, padding: "3px 7px", display: "flex", alignItems: "center", gap: 5 }}>
          ⚡ QA dip — below 7.0
        </div>
      )}
    </div>
  );
}

// ── Mini bar chart ────────────────────────────────────────────────────
function HourlyChart({ data }) {
  const max = Math.max(...data.map(d => d.v), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 56 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <div style={{
            width: "100%", borderRadius: 3, minHeight: 4,
            height: `${(d.v / max) * 48}px`,
            background: `rgba(255,107,53,${.15 + (d.v / max) * .75})`,
            transition: "height .5s",
          }} />
          <div style={{ fontSize: 7, color: T.faint, whiteSpace: "nowrap" }}>{d.h}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────
export default function SupervisorDashboard() {
  const [agents,       setAgents]       = useState([]);
  const [queue,        setQueue]        = useState([]);
  const [hourly,       setHourly]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState("All");
  const [actionToast,  setActionToast]  = useState(null);
  const [expandedAgent,setExpandedAgent]= useState(null);
  const [wallTimer,    setWallTimer]    = useState(0);
  const [lastUpdate,   setLastUpdate]   = useState(Date.now());

  // ── Live agent listener ──────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "agents"), snap => {
      const list = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
      setAgents(list);
      setLoading(false);
      setLastUpdate(Date.now());
      setWallTimer(0);
    }, err => {
      console.error("agents listener:", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Live queue listener ──────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "queue"), snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(q => q.status === "waiting")
        .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      setQueue(list);
    }, () => {});
    return () => unsub();
  }, []);

  // ── Today's calls for hourly chart ───────────────────────────────────
  useEffect(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const q = query(
      collection(db, "calls"),
      where("startTime", ">=", Timestamp.fromDate(startOfDay)),
      orderBy("startTime", "asc")
    );
    const unsub = onSnapshot(q, snap => {
      const byHour = {};
      snap.docs.forEach(d => {
        const ts = d.data().startTime?.toDate?.();
        if (ts) {
          const h = ts.getHours();
          byHour[h] = (byHour[h] || 0) + 1;
        }
      });
      const now = new Date();
      const data = Array.from({ length: Math.max(now.getHours() + 1, 8) }, (_, i) => ({
        h: `${i}`, v: byHour[i] || 0
      }));
      setHourly(data);
    }, () => {
      // Fallback: show placeholder chart if collection doesn't exist yet
      const now = new Date();
      setHourly(Array.from({ length: now.getHours() + 1 }, (_, i) => ({ h: `${i}`, v: 0 })));
    });
    return () => unsub();
  }, []);

  // Wall clock ticks between Firestore updates
  useEffect(() => {
    const id = setInterval(() => setWallTimer(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Computed metrics ─────────────────────────────────────────────────
  const live      = agents.filter(a => a.status === "On Call").length;
  const available = agents.filter(a => a.status === "Available").length;
  const qaList    = agents.filter(a => a.qa > 0);
  const avgQa     = qaList.length ? parseFloat((qaList.reduce((s, a) => s + a.qa, 0) / qaList.length).toFixed(1)) : 0;
  const totalCalls= agents.reduce((s, a) => s + (a.calls || 0), 0);
  const dipAgents = agents.filter(a => a.qa > 0 && a.qa < 7).length;
  const totalHourly = hourly.reduce((s, d) => s + d.v, 0);

  const handleAction = (agent, action) => {
    setActionToast(`${action.charAt(0).toUpperCase() + action.slice(1)} — ${agent.name}`);
    setTimeout(() => setActionToast(null), 2500);
    // WIRE UP EXOTEL: conference/barge API call here
    // e.g. exotelService.supervisorAction(agent.activeSid, action, supervisorPhone)
  };

  const filters  = ["All", "On Call", "Available", "Wrap Up", "Break", "Offline"];
  const filtered = filter === "All" ? agents : agents.filter(a => a.status === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>

      {/* Top strip */}
      <div style={{ padding: "10px 18px", borderBottom: `1px solid ${T.border}`, background: "#0a0e18", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ fontFamily: "Playfair Display,serif", fontSize: 13, fontWeight: 700, color: T.text }}>Supervisor Console</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: T.faint }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", border: `1.5px solid ${T.orange}30`, borderTopColor: T.orange, animation: "spin .7s linear infinite", display: "inline-block" }} />
              Connecting…
            </div>
          )}
          {!loading && agents.length === 0 && (
            <div style={{ fontSize: 10, color: T.amber }}>
              ⚠ No agents online — waiting for connections
            </div>
          )}
          {dipAgents > 0 && (
            <div style={{ fontSize: 9, color: T.amber, background: `${T.amber}08`, border: `1px solid ${T.amber}20`, padding: "3px 9px", borderRadius: 20, animation: "blink 2s infinite" }}>
              ⚡ {dipAgents} agent{dipAgents > 1 ? "s" : ""} with QA dip
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, boxShadow: `0 0 5px ${T.green}`, animation: "pulse 2s infinite" }} />
            <div style={{ fontFamily: "DM Mono,monospace", fontSize: 10, color: T.faint }}>Live · Updated {wallTimer}s ago</div>
          </div>
        </div>
      </div>

      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Wallboard */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10 }}>
          {[
            { label: "Live Calls",    val: live,              color: T.green,  sub: "agents on call" },
            { label: "Queue",         val: queue.length,      color: T.amber,  sub: "waiting" },
            { label: "Available",     val: available,         color: T.blue,   sub: "ready to dial" },
            { label: "Today's Calls", val: totalCalls || totalHourly, color: T.orange, sub: "across all agents" },
            { label: "QA Average",    val: avgQa > 0 ? avgQa.toFixed(1) : "—", color: avgQa >= 8 ? T.green : T.amber, sub: "team score" },
          ].map(m => (
            <Panel key={m.label} style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: 8, color: T.faint, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5 }}>{m.label}</div>
              <div style={{ fontFamily: "Playfair Display,serif", fontSize: 30, fontWeight: 900, color: m.color, letterSpacing: -1, lineHeight: 1 }}>{m.val}</div>
              <div style={{ fontSize: 9, color: T.faint, marginTop: 4 }}>{m.sub}</div>
            </Panel>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 270px", gap: 12 }}>
          <Panel>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: 1, textTransform: "uppercase" }}>Calls by Hour</div>
              <div style={{ fontFamily: "DM Mono,monospace", fontSize: 10, color: T.orange }}>{totalHourly || totalCalls} today</div>
            </div>
            {hourly.length > 0
              ? <HourlyChart data={hourly} />
              : <div style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "center", color: T.faint, fontSize: 11 }}>Waiting for call data…</div>
            }
          </Panel>

          <Panel>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
              Live Queue <span style={{ color: queue.length > 0 ? T.amber : T.faint }}>({queue.length})</span>
            </div>
            {queue.length === 0
              ? <div style={{ color: T.faint, fontSize: 11, textAlign: "center", paddingTop: 14 }}>Queue empty ✓</div>
              : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {queue.slice(0, 5).map((q, i) => (
                    <div key={q.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7 }}>
                      <div>
                        <div style={{ fontSize: 10, color: T.text, fontFamily: "DM Mono,monospace" }}>{q.from || "+91 ××××××××××"}</div>
                        <div style={{ fontSize: 8, color: T.faint, marginTop: 1 }}>{q.campaign || "—"}</div>
                      </div>
                      <div style={{ fontFamily: "DM Mono,monospace", fontSize: 13, fontWeight: 700, color: (q.wait || q.waitTime || 0) > 30 ? T.red : T.amber }}>
                        {q.wait || q.waitTime || 0}s
                      </div>
                    </div>
                  ))}
                </div>
            }
          </Panel>
        </div>

        {/* Status summary bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
          {[["On Call", T.green], ["Available", T.blue], ["Wrap Up", T.purple], ["Break", T.amber], ["Offline", T.faint]].map(([status, color]) => {
            const count = agents.filter(a => a.status === status).length;
            const pct = agents.length ? Math.round(count / agents.length * 100) : 0;
            return (
              <div key={status} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 9, padding: "10px 12px", cursor: "pointer", transition: "all .15s" }}
                onClick={() => setFilter(filter === status ? "All" : status)}
                onMouseEnter={e => e.currentTarget.style.borderColor = `${color}40`}
                onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: .5 }}>{status}</span>
                  <span style={{ fontFamily: "DM Mono,monospace", fontSize: 16, fontWeight: 700, color }}>{count}</span>
                </div>
                <div style={{ height: 3, background: "rgba(255,255,255,.05)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width .6s" }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Agent grid */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.muted, letterSpacing: 1, textTransform: "uppercase" }}>
              Agent Grid <span style={{ color: T.faint }}>({filtered.length})</span>
            </div>
            <div style={{ display: "flex", gap: 5 }}>
              {filters.map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: "4px 10px", borderRadius: 20, fontSize: 10, fontWeight: 600, cursor: "pointer",
                  background: filter === f ? T.orange : T.surface,
                  color: filter === f ? "#fff" : T.muted,
                  border: `1px solid ${filter === f ? T.orange : T.border}`,
                  transition: "all .15s",
                }}>{f}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", color: T.faint, fontSize: 13 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${T.orange}20`, borderTopColor: T.orange, animation: "spin .7s linear infinite", margin: "0 auto 12px" }} />
              Loading agent data from Firestore…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: T.faint, fontSize: 13 }}>
              {agents.length === 0
                ? "No agents have logged in yet. Agents appear here automatically when they sign in."
                : `No agents with status "${filter}".`}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
              {filtered.map(a => (
                <AgentCard
                  key={a.uid}
                  agent={a}
                  onAction={handleAction}
                  onExpand={() => setExpandedAgent(a)}
                />
              ))}
            </div>
          )}
        </div>

      </div>

      {expandedAgent && (
        <AgentModal
          agent={expandedAgent}
          onClose={() => setExpandedAgent(null)}
          onAction={handleAction}
        />
      )}

      {actionToast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: T.surface, border: `1px solid ${T.orange}40`, borderRadius: 10, padding: "12px 20px", fontSize: 13, fontWeight: 700, color: T.orange, boxShadow: "0 8px 28px rgba(0,0,0,.5)", zIndex: 999, animation: "fadeUp .3s ease" }}>
          ⚡ {actionToast}
        </div>
      )}

      <style>{`
        @keyframes fadeUp  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes blink   { 0%,100% { opacity:1; } 50% { opacity:.2; } }
        @keyframes spin    { to { transform:rotate(360deg); } }
        @keyframes pulse   { 0%,100% { transform:scale(1); } 50% { transform:scale(1.1); } }
      `}</style>
    </div>
  );
}
