/**
 * AgentDesktop.jsx — OpsLyft Contact Centre
 * Writes agent status, call events, and dispositions to Firestore in real-time.
 *
 * ── What gets written to Firestore ──────────────────────────────────
 *   agents/{uid}   → status, callTime, calls count, qa avg, activeSid
 *   calls/{id}     → full call record after disposition saved
 *
 * ── How real-time flows ──────────────────────────────────────────────
 *   Agent logs in  → agents/{uid}.status = "Available"
 *   Agent dials    → agents/{uid}.status = "On Call", callTime ticking
 *   Supervisor sees the change within <500ms via onSnapshot
 *   Call ends      → agent wraps, saves disposition
 *   → agents/{uid}.status = "Available", calls++
 *   → calls/{id} written with full record
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  doc, setDoc, updateDoc, addDoc, collection,
  serverTimestamp, getDoc, increment
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

// ── Mock contact list (replace with Firestore contacts collection) ─────
const MOCK_CONTACTS = [
  { id: 1, name: "Rajesh Sharma",  phone: "+91 98201 34567", city: "Mumbai",    company: "TechCorp",   prevCalls: 2, lastIssue: "Billing query" },
  { id: 2, name: "Priya Nair",     phone: "+91 99871 23456", city: "Bangalore", company: "Infosys",    prevCalls: 0, lastIssue: "New enquiry" },
  { id: 3, name: "Amit Verma",     phone: "+91 93456 78901", city: "Delhi",     company: "Wipro",      prevCalls: 5, lastIssue: "Support escalation" },
  { id: 4, name: "Sunita Rao",     phone: "+91 87654 32109", city: "Hyderabad", company: "Cognizant",  prevCalls: 1, lastIssue: "Product enquiry" },
  { id: 5, name: "Karan Mehta",    phone: "+91 77889 90011", city: "Pune",      company: "HCL",        prevCalls: 3, lastIssue: "Renewal query" },
];

const DISPOSITIONS = [
  { code: "INT",  label: "Interested",     color: T.green },
  { code: "CB",   label: "Callback",       color: T.amber },
  { code: "NI",   label: "Not Interested", color: T.red },
  { code: "DND",  label: "Add to DND",     color: T.purple },
  { code: "NA",   label: "No Answer",      color: T.muted },
  { code: "BUSY", label: "Busy",           color: "#f97316" },
];

const SCRIPT_STEPS = [
  "Greet and confirm identity",
  "Introduce reason for call",
  "Identify customer need",
  "Present solution / offer",
  "Handle objections",
  "Confirm next steps and close",
];

const AI_TIPS = [
  { type: "tip",    text: "Reference the customer's history to build rapport quickly." },
  { type: "warn",   text: "Tone shift detected — slow down and acknowledge." },
  { type: "script", text: "Try: 'I completely understand. Let me pull up your details.'" },
  { type: "tip",    text: "Good pacing! Customer is engaged — introduce the offering." },
  { type: "warn",   text: "4 minutes on call — wrap up naturally. Offer a clear next step." },
  { type: "tip",    text: "Customer mentioned budget — pivot to value before price." },
];

function fmt(s) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

// ── Firestore write helper ─────────────────────────────────────────────
async function writeAgentStatus(uid, data) {
  try {
    await updateDoc(doc(db, "agents", uid), {
      ...data,
      lastUpdated: serverTimestamp(),
    });
  } catch (err) {
    // Document might not exist yet — create it
    if (err.code === "not-found") {
      await setDoc(doc(db, "agents", uid), {
        ...data,
        lastUpdated: serverTimestamp(),
      });
    }
  }
}

// ── DTMF Keypad Modal ─────────────────────────────────────────────────
function DTMFModal({ onClose }) {
  const [dialed, setDialed] = useState("");
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, backdropFilter: "blur(4px)" }}>
      <div style={{ background: `linear-gradient(145deg,${T.surface},${T.s2})`, border: `1px solid ${T.orange}25`, borderRadius: 18, padding: "22px 22px 18px", width: 240, boxShadow: "0 40px 80px rgba(0,0,0,.6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: T.muted, letterSpacing: 1 }}>DTMF KEYPAD</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.faint, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ background: T.bg, borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontFamily: "DM Mono,monospace", fontSize: 20, fontWeight: 700, color: T.orange, letterSpacing: 4, minHeight: 40, textAlign: "right" }}>
          {dialed || <span style={{ opacity: .2 }}>—</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7 }}>
          {["1","2","3","4","5","6","7","8","9","*","0","#"].map(k => (
            <button key={k} onClick={() => setDialed(d => d + k)}
              style={{ padding: "11px 0", borderRadius: 9, background: T.bg, border: `1px solid ${T.border}`, cursor: "pointer", color: T.text, fontFamily: "DM Mono,monospace", fontSize: 17, fontWeight: 700, transition: "all .1s" }}
              onMouseDown={e => { e.currentTarget.style.background = `${T.orange}15`; e.currentTarget.style.borderColor = `${T.orange}40`; }}
              onMouseUp={e => { e.currentTarget.style.background = T.bg; e.currentTarget.style.borderColor = T.border; }}
            >{k}</button>
          ))}
        </div>
        <button onClick={() => setDialed(d => d.slice(0, -1))} style={{ width: "100%", marginTop: 9, padding: "8px", background: `${T.red}08`, border: `1px solid ${T.red}20`, borderRadius: 8, color: T.red, fontSize: 15, cursor: "pointer" }}>⌫</button>
      </div>
    </div>
  );
}

// ── Transfer Modal ─────────────────────────────────────────────────────
function TransferModal({ onClose }) {
  const [tab, setTab] = useState("queue");
  const queues = ["Sales Queue", "Support Queue", "Billing Queue", "Retention Team", "Escalation Desk"];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, backdropFilter: "blur(4px)" }}>
      <div style={{ background: `linear-gradient(145deg,${T.surface},${T.s2})`, border: `1px solid ${T.blue}25`, borderRadius: 18, padding: 22, width: 340, boxShadow: "0 40px 80px rgba(0,0,0,.6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontFamily: "Playfair Display,serif", fontSize: 16, fontWeight: 800, color: T.text }}>Transfer Call</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.faint, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {["queue", "number"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "7px 0", borderRadius: 7, border: `1px solid ${tab === t ? `${T.blue}40` : T.border}`, background: tab === t ? `${T.blue}12` : T.bg, color: tab === t ? T.blue : T.muted, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              {t === "queue" ? "Agent Queue" : "Direct Number"}
            </button>
          ))}
        </div>
        {tab === "queue"
          ? <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {queues.map(q => (
                <button key={q} onClick={onClose} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 13px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", transition: "all .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${T.blue}35`; e.currentTarget.style.background = `${T.blue}05`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.bg; }}>
                  <div><div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{q}</div><div style={{ fontSize: 9, color: T.faint, marginTop: 1 }}>~30s avg wait</div></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.green }} />
                    <span style={{ fontSize: 9, color: T.green, fontWeight: 700 }}>3 ready</span>
                  </div>
                </button>
              ))}
            </div>
          : <div>
              <input placeholder="+91 9XXXXXXXXX" style={{ width: "100%", padding: "10px 13px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "DM Mono,monospace" }} />
              <button onClick={onClose} style={{ width: "100%", marginTop: 10, padding: "11px", background: T.blue, color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Transfer Now →</button>
            </div>
        }
      </div>
    </div>
  );
}

// ── Main AgentDesktop ─────────────────────────────────────────────────
export default function AgentDesktop({ agent }) {
  const [callState,  setCallState]  = useState("idle");
  const [callTimer,  setCallTimer]  = useState(0);
  const [isMuted,    setIsMuted]    = useState(false);
  const [isHold,     setIsHold]     = useState(false);
  const [contact,    setContact]    = useState(null);
  const [contactIdx, setContactIdx] = useState(0);
  const [scriptStep, setScriptStep] = useState(0);
  const [agentStatus,setAgentStatus]= useState("Available");
  const [showDTMF,   setShowDTMF]   = useState(false);
  const [showTransfer,setShowTransfer]= useState(false);
  const [dispSelected,setDispSelected]= useState(null);
  const [notes,      setNotes]      = useState("");
  const [dispSaved,  setDispSaved]  = useState(false);
  const [tips,       setTips]       = useState([]);
  const [tipLoading, setTipLoading] = useState(false);
  const [todayStats, setTodayStats] = useState({ calls: 0, aht: "—", qa: "—" });
  const [recentCalls,setRecentCalls]= useState([]);
  const [activeCallId, setActiveCallId] = useState(null);
  const [callStartTime,setCallStartTime]= useState(null);

  const timerRef   = useRef(null);
  const statusSyncRef = useRef(null);

  const STATUS_COLORS = { "Available": T.green, "On Call": T.amber, "Wrap Up": T.purple, "Break": "#f97316", "Offline": T.faint };

  // ── Write initial status on mount ──────────────────────────────────
  useEffect(() => {
    if (!agent?.uid) return;

    const initAgent = async () => {
      try {
        // Check if agent doc exists; create or update
        const agentRef = doc(db, "agents", agent.uid);
        const snap = await getDoc(agentRef);

        const baseData = {
          name:        agent.name,
          email:       agent.email,
          role:        agent.role,
          team:        agent.team || "General",
          status:      "Available",
          callTime:    0,
          calls:       snap.exists() ? (snap.data().calls || 0) : 0,
          qa:          snap.exists() ? (snap.data().qa || 0)    : 0,
          activeSid:   null,
          loginTime:   serverTimestamp(),
          lastUpdated: serverTimestamp(),
        };

        if (snap.exists()) {
          await updateDoc(agentRef, { status: "Available", activeSid: null, callTime: 0, lastUpdated: serverTimestamp() });
        } else {
          await setDoc(agentRef, baseData);
        }

        setTodayStats({
          calls: baseData.calls,
          aht:   "—",
          qa:    baseData.qa > 0 ? baseData.qa.toFixed(1) : "—",
        });
      } catch (err) {
        console.error("Agent init error:", err);
      }
    };

    initAgent();

    // Mark offline on tab close
    const handleUnload = () => {
      navigator.sendBeacon && writeAgentStatus(agent.uid, { status: "Offline", callTime: 0 });
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      if (agent?.uid) writeAgentStatus(agent.uid, { status: "Offline", callTime: 0, activeSid: null });
    };
  }, [agent?.uid]);

  // ── Call timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (callState === "active") {
      timerRef.current = setInterval(() => {
        setCallTimer(t => {
          const newT = t + 1;
          // Sync call time to Firestore every 5s
          if (newT % 5 === 0 && agent?.uid) {
            writeAgentStatus(agent.uid, { callTime: newT });
          }
          return newT;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      if (callState === "idle") setCallTimer(0);
    }
    return () => clearInterval(timerRef.current);
  }, [callState, agent?.uid]);

  // ── AI tips ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (callState === "active") {
      setTipLoading(true);
      const t = setTimeout(() => { setTips([AI_TIPS[0]]); setTipLoading(false); }, 1800);
      const r = setInterval(() => setTips(prev => [AI_TIPS[Math.floor(Math.random() * AI_TIPS.length)], ...prev].slice(0, 3)), 7000);
      return () => { clearTimeout(t); clearInterval(r); };
    } else {
      setTips([]);
    }
  }, [callState]);

  // ── Status change handler (syncs to Firestore) ──────────────────────
  const handleStatusChange = useCallback(async (newStatus) => {
    setAgentStatus(newStatus);
    if (agent?.uid) {
      await writeAgentStatus(agent.uid, { status: newStatus });
    }
  }, [agent?.uid]);

  // ── Dial ─────────────────────────────────────────────────────────────
  const handleDial = useCallback(async () => {
    const c = MOCK_CONTACTS[contactIdx % MOCK_CONTACTS.length];
    setContact(c);
    setCallState("ringing");
    setCallTimer(0);
    setScriptStep(0);
    setDispSelected(null);
    setNotes("");

    if (agent?.uid) {
      await writeAgentStatus(agent.uid, { status: "On Call", callTime: 0, activeSid: `call_${Date.now()}` });
    }
    setAgentStatus("On Call");

    // WIRE UP: await exotelService.makeOutboundCall(c.phone, agent.phone)
    setTimeout(async () => {
      setCallState("active");
      setCallStartTime(Date.now());
    }, 2500);
  }, [contactIdx, agent?.uid, agent]);

  // ── End call ─────────────────────────────────────────────────────────
  const handleEnd = useCallback(async () => {
    setCallState("wrap");
    setAgentStatus("Wrap Up");
    setIsHold(false);
    setIsMuted(false);
    setContactIdx(i => i + 1);

    if (agent?.uid) {
      await writeAgentStatus(agent.uid, { status: "Wrap Up", activeSid: null });
    }
  }, [agent?.uid]);

  // ── Save disposition & return to ready ──────────────────────────────
  const handleDispose = useCallback(async () => {
    if (!dispSelected || callState !== "wrap") return;

    const duration = callStartTime ? Math.floor((Date.now() - callStartTime) / 1000) : callTimer;

    // Write call record to Firestore
    if (agent?.uid) {
      try {
        await addDoc(collection(db, "calls"), {
          agentId:    agent.uid,
          agentName:  agent.name,
          customerId: contact?.id || null,
          customerName: contact?.name || "Unknown",
          customerPhone: contact?.phone || "—",
          status:     "completed",
          disposition: dispSelected,
          notes:      notes,
          duration:   duration,
          startTime:  serverTimestamp(),
          createdAt:  serverTimestamp(),
        });

        // Update agent: increment calls, update status
        await updateDoc(doc(db, "agents", agent.uid), {
          status:      "Available",
          callTime:    0,
          activeSid:   null,
          calls:       increment(1),
          lastUpdated: serverTimestamp(),
        });

      } catch (err) {
        console.error("Disposition save error:", err);
      }
    }

    setDispSaved(true);
    setTimeout(() => {
      setDispSaved(false);
      setCallState("idle");
      setContact(null);
      setAgentStatus("Available");
      setCallTimer(0);
      setDispSelected(null);
      setNotes("");
      setCallStartTime(null);
      // Update local today stats
      setTodayStats(prev => ({ ...prev, calls: (prev.calls || 0) + 1 }));
    }, 1500);
  }, [dispSelected, callState, agent, contact, notes, callTimer, callStartTime]);

  // ── Disposition reset when new call starts ───────────────────────────
  useEffect(() => {
    if (callState === "idle") {
      setDispSelected(null);
      setNotes("");
      setDispSaved(false);
    }
  }, [callState]);

  const typeColor = { tip: T.blue, warn: T.amber, script: T.green };
  const typeLabel = { tip: "TIP", warn: "ALERT", script: "SCRIPT" };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* Agent top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 18px", borderBottom: `1px solid ${T.border}`, background: "#0a0e18" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg,${T.orange},#ff8f5e)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Playfair Display,serif", fontWeight: 900, fontSize: 13, color: "#fff" }}>
            {(agent.name || "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{agent.name}</div>
            <div style={{ fontSize: 9, color: T.muted }}>Agent · {agent.email}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_COLORS[agentStatus], boxShadow: `0 0 5px ${STATUS_COLORS[agentStatus]}` }} />
          <select value={agentStatus}
            onChange={e => handleStatusChange(e.target.value)}
            style={{ background: "#0e1422", color: T.text, border: `1px solid ${T.border}`, borderRadius: 7, padding: "4px 9px", fontSize: 11, cursor: "pointer", outline: "none" }}>
            {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* 3-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 210px", gap: 12, padding: 12, flex: 1, minHeight: 0, overflow: "auto" }}>

        {/* LEFT — Softphone + Disposition */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, overflow: "auto" }}>

          {/* Softphone */}
          <div style={{ background: `linear-gradient(145deg,${T.surface},${T.s2})`, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
            {/* Status row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: callState === "active" ? T.green : callState === "ringing" ? T.amber : callState === "hold" ? "#f97316" : T.faint,
                  boxShadow: callState === "active" ? `0 0 7px ${T.green}` : "none",
                  animation: callState === "ringing" ? "blink .8s infinite" : "none",
                }} />
                <span style={{ fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: T.muted, fontWeight: 700 }}>
                  {callState === "idle" ? "Ready" : callState === "ringing" ? "Ringing…" : callState === "active" ? "Live Call" : callState === "hold" ? "On Hold" : "Wrap Up"}
                </span>
              </div>
              <span style={{ fontFamily: "DM Mono,monospace", fontSize: 21, fontWeight: 700, color: callState === "active" ? T.green : callState === "hold" ? T.amber : T.faint, letterSpacing: 2 }}>
                {fmt(callTimer)}
              </span>
            </div>

            {/* Contact preview */}
            {contact
              ? <div style={{ background: T.bg, borderRadius: 7, padding: "9px 11px", marginBottom: 12, border: `1px solid ${T.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: "Playfair Display,serif" }}>{contact.name}</div>
                  <div style={{ fontSize: 10, color: T.orange, fontFamily: "DM Mono,monospace", marginTop: 1 }}>{contact.phone}</div>
                </div>
              : <div style={{ background: T.bg, borderRadius: 7, padding: "9px 11px", marginBottom: 12, border: `1px solid ${T.border}`, textAlign: "center", color: T.faint, fontSize: 11 }}>No active contact</div>
            }

            {/* Controls */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {callState === "idle" && (
                <button onClick={handleDial} style={{ width: "100%", background: `linear-gradient(135deg,#059669,${T.green})`, color: "#fff", border: "none", borderRadius: 8, padding: "11px 0", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: `0 0 14px ${T.green}22` }}>
                  📞 DIAL NEXT
                </button>
              )}
              {callState === "ringing" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <button style={{ background: `linear-gradient(135deg,#059669,${T.green})`, color: "#fff", border: "none", borderRadius: 8, padding: "9px 0", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✓ Answer</button>
                  <button onClick={handleEnd} style={{ background: `${T.red}12`, color: T.red, border: `1px solid ${T.red}25`, borderRadius: 8, padding: "9px 0", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>✕ Reject</button>
                </div>
              )}
              {(callState === "active" || callState === "hold") && <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                  <button onClick={() => setIsMuted(!isMuted)} style={{ padding: "8px 0", fontSize: 10, fontWeight: 700, background: isMuted ? `${T.purple}14` : T.bg, color: isMuted ? T.purple : T.muted, border: `1px solid ${isMuted ? T.purple + "40" : T.border}`, borderRadius: 7, cursor: "pointer" }}>
                    {isMuted ? "🔇 Muted" : "🎙 Mute"}
                  </button>
                  <button onClick={async () => {
                    const newHold = !isHold;
                    setIsHold(newHold);
                    setCallState(newHold ? "hold" : "active");
                    if (agent?.uid) await writeAgentStatus(agent.uid, { status: newHold ? "On Hold" : "On Call" });
                  }} style={{ padding: "8px 0", fontSize: 10, fontWeight: 700, background: isHold ? `${T.amber}12` : T.bg, color: isHold ? T.amber : T.muted, border: `1px solid ${isHold ? T.amber + "40" : T.border}`, borderRadius: 7, cursor: "pointer" }}>
                    {isHold ? "▶ Resume" : "⏸ Hold"}
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                  <button onClick={() => setShowDTMF(true)} style={{ padding: "8px 0", fontSize: 10, fontWeight: 700, background: T.bg, color: T.muted, border: `1px solid ${T.border}`, borderRadius: 7, cursor: "pointer" }}>⌨ Keypad</button>
                  <button onClick={() => setShowTransfer(true)} style={{ padding: "8px 0", fontSize: 10, fontWeight: 700, background: `${T.blue}0a`, color: T.blue, border: `1px solid ${T.blue}25`, borderRadius: 7, cursor: "pointer" }}>↗ Transfer</button>
                </div>
                <button onClick={handleEnd} style={{ width: "100%", background: `${T.red}12`, color: T.red, border: `1px solid ${T.red}25`, borderRadius: 8, padding: "10px 0", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                  📵 END CALL
                </button>
              </>}
            </div>

            {/* Today stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
              {[
                [todayStats.calls, "Calls"],
                [todayStats.aht,   "AHT"],
                [todayStats.qa,    "QA Avg"],
              ].map(([v, l]) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "DM Mono,monospace", fontSize: 15, fontWeight: 700, color: T.text }}>{v}</div>
                  <div style={{ fontSize: 8, color: T.faint, letterSpacing: 1, textTransform: "uppercase", marginTop: 1 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Disposition */}
          <div style={{ background: `linear-gradient(145deg,${T.surface},${T.s2})`, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14, opacity: callState === "wrap" ? 1 : .4 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.faint }}>📌 Disposition</span>
              {callState === "wrap" && <span style={{ fontSize: 8, color: T.amber, fontWeight: 700, animation: "blink 1.5s infinite" }}>● WRAP UP</span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5, marginBottom: 8 }}>
              {DISPOSITIONS.map(d => (
                <button key={d.code} disabled={callState !== "wrap"} onClick={() => setDispSelected(d.code)}
                  style={{ padding: "6px 3px", border: `1px solid ${dispSelected === d.code ? d.color : T.border}`, borderRadius: 6, background: dispSelected === d.code ? `${d.color}18` : T.bg, color: dispSelected === d.code ? d.color : T.muted, fontSize: 9, fontWeight: 600, cursor: callState === "wrap" ? "pointer" : "default", transition: "all .15s" }}>
                  {d.label}
                </button>
              ))}
            </div>
            <textarea disabled={callState !== "wrap"} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Add call notes…"
              style={{ width: "100%", background: T.bg, color: T.muted, border: `1px solid ${T.border}`, borderRadius: 6, padding: "7px 9px", fontSize: 11, resize: "none", height: 48, outline: "none", fontFamily: "DM Sans,sans-serif", boxSizing: "border-box" }} />
            <button onClick={handleDispose} disabled={callState !== "wrap" || !dispSelected}
              style={{ width: "100%", marginTop: 7, padding: "10px 0", background: dispSaved ? T.green : (callState === "wrap" && dispSelected) ? T.orange : "#0e1422", color: (callState === "wrap" && dispSelected) ? "#fff" : T.faint, border: "none", borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: (callState === "wrap" && dispSelected) ? "pointer" : "default", transition: "all .25s", fontFamily: "Playfair Display,serif", letterSpacing: .5 }}>
              {dispSaved ? "✅ SAVED" : "SAVE & READY"}
            </button>
          </div>
        </div>

        {/* CENTRE — Customer + AI Coach + Script */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, overflow: "auto" }}>

          {/* Customer info */}
          {contact
            ? <div style={{ background: `linear-gradient(145deg,${T.surface},${T.s2})`, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.faint, marginBottom: 10 }}>Customer Info</div>
                <div style={{ fontFamily: "Playfair Display,serif", fontSize: 18, fontWeight: 800, color: T.text }}>{contact.name}</div>
                <div style={{ fontSize: 11, color: T.orange, fontFamily: "DM Mono,monospace", marginTop: 2 }}>{contact.phone}</div>
                <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{contact.company} · {contact.city}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 10 }}>
                  <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, padding: "8px 10px" }}>
                    <div style={{ fontSize: 8, color: T.faint, textTransform: "uppercase", letterSpacing: 1 }}>Prev Calls</div>
                    <div style={{ fontFamily: "DM Mono,monospace", fontSize: 18, fontWeight: 700, color: T.orange, marginTop: 2 }}>{contact.prevCalls}</div>
                  </div>
                  <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 7, padding: "8px 10px" }}>
                    <div style={{ fontSize: 8, color: T.faint, textTransform: "uppercase", letterSpacing: 1 }}>Last Issue</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{contact.lastIssue}</div>
                  </div>
                </div>
              </div>
            : <div style={{ background: `linear-gradient(145deg,${T.surface},${T.s2})`, border: `1px solid ${T.border}`, borderRadius: 12, padding: "32px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 6, opacity: .3 }}>👤</div>
                <div style={{ color: T.faint, fontSize: 12 }}>No active contact</div>
              </div>
          }

          {/* AI Coach */}
          <div style={{ background: `linear-gradient(145deg,${T.surface},${T.s2})`, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, background: `${T.orange}18`, border: `1px solid ${T.orange}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>🤖</div>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: T.orange, textTransform: "uppercase" }}>AI Coach</span>
              {callState === "active" && <span style={{ marginLeft: "auto", background: `${T.green}12`, color: T.green, fontSize: 8, padding: "2px 7px", borderRadius: 4, border: `1px solid ${T.green}25`, fontWeight: 700, animation: "blink 2s infinite" }}>● LIVE</span>}
            </div>
            {callState !== "active"
              ? <div style={{ color: T.faint, fontSize: 11, textAlign: "center", padding: "12px 0" }}>Activates when call starts</div>
              : tipLoading
              ? <div style={{ color: T.faint, fontSize: 11, textAlign: "center", padding: "12px 0" }}>Analysing call…</div>
              : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {tips.map((tip, i) => (
                    <div key={i} style={{ background: T.bg, borderRadius: 6, padding: "9px 11px", borderLeft: `3px solid ${typeColor[tip.type]}`, opacity: i === 0 ? 1 : .45, transition: "opacity .5s" }}>
                      <div style={{ fontSize: 8, fontWeight: 700, color: typeColor[tip.type], letterSpacing: 1.5, marginBottom: 3, textTransform: "uppercase" }}>{typeLabel[tip.type]}</div>
                      <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.55 }}>{tip.text}</div>
                    </div>
                  ))}
                </div>
            }
          </div>

          {/* Script */}
          <div style={{ background: `linear-gradient(145deg,${T.surface},${T.s2})`, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.faint }}>📋 Call Script</div>
              {callState === "active" && scriptStep < SCRIPT_STEPS.length - 1 && (
                <button onClick={() => setScriptStep(s => s + 1)} style={{ fontSize: 8, fontWeight: 700, background: `${T.orange}12`, color: T.orange, border: `1px solid ${T.orange}25`, borderRadius: 5, padding: "3px 9px", cursor: "pointer" }}>Next →</button>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {SCRIPT_STEPS.map((step, i) => {
                const done   = i < scriptStep;
                const active = i === scriptStep;
                return (
                  <div key={i} onClick={() => callState === "active" && setScriptStep(i)}
                    style={{ display: "flex", alignItems: "center", gap: 8, opacity: done ? .3 : 1, cursor: callState === "active" ? "pointer" : "default" }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                      background: done ? T.green : active ? `${T.orange}18` : "rgba(255,255,255,.04)",
                      border: `1px solid ${done ? T.green : active ? T.orange : "rgba(255,255,255,.08)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 8, color: done ? "#000" : active ? T.orange : T.faint, fontWeight: 700,
                    }}>{done ? "✓" : i + 1}</div>
                    <span style={{ fontSize: 11, color: done ? T.faint : active ? T.text : T.muted, textDecoration: done ? "line-through" : "none", fontWeight: active ? 600 : 400 }}>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT — Recent calls */}
        <div style={{ overflow: "auto" }}>
          <div style={{ background: `linear-gradient(145deg,${T.surface},${T.s2})`, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: T.faint, marginBottom: 10 }}>🕐 Recent Calls</div>
            {recentCalls.length === 0 && (
              <div style={{ color: T.faint, fontSize: 11, textAlign: "center", padding: "16px 0" }}>No calls yet today</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {recentCalls.map((c, i) => {
                const d = DISPOSITIONS.find(x => x.code === c.disp);
                return (
                  <div key={i} style={{ background: T.bg, borderRadius: 7, padding: "9px 10px", border: `1px solid ${T.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div><div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{c.name}</div><div style={{ fontSize: 8, color: T.faint, marginTop: 1 }}>{c.time}</div></div>
                      <div style={{ fontFamily: "DM Mono,monospace", fontSize: 12, fontWeight: 700, color: c.score >= 8 ? T.green : c.score >= 6 ? T.amber : T.red }}>{c.score?.toFixed(1) || "—"}</div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 5 }}>
                      <span style={{ fontFamily: "DM Mono,monospace", fontSize: 9, color: T.faint }}>⏱ {c.duration}</span>
                      {d && <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: `${d.color}18`, color: d.color, border: `1px solid ${d.color}44` }}>{d.label}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, paddingTop: 10, marginTop: 4, borderTop: `1px solid ${T.border}` }}>
              {[[todayStats.calls || 0, "Calls"], ["—", "Conv"], [todayStats.qa || "—", "QA Avg"], [todayStats.aht || "—", "AHT"]].map(([v, l]) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "DM Mono,monospace", fontSize: 14, fontWeight: 700, color: T.muted }}>{v}</div>
                  <div style={{ fontSize: 8, color: T.faint, letterSpacing: 1, textTransform: "uppercase", marginTop: 1 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {showDTMF     && <DTMFModal     onClose={() => setShowDTMF(false)} />}
      {showTransfer && <TransferModal onClose={() => setShowTransfer(false)} />}

      <style>{`
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:.2; } }
        @keyframes spin  { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
}
