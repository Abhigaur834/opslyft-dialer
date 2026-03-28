import { useState, useEffect, useRef } from "react";

// ── Mock data ────────────────────────────────────────────────────────────
const MOCK_CONTACTS = [
  { id: 1, name: "Rajesh Sharma", phone: "+91 98201 34567", city: "Mumbai", company: "TechCorp Pvt Ltd", prevCalls: 2, lastIssue: "Billing query", status: "Active" },
  { id: 2, name: "Priya Nair", phone: "+91 99871 23456", city: "Bangalore", company: "Infosys Ltd", prevCalls: 0, lastIssue: "New enquiry", status: "Active" },
  { id: 3, name: "Amit Verma", phone: "+91 93456 78901", city: "Delhi", company: "Wipro Ltd", prevCalls: 5, lastIssue: "Support escalation", status: "Active" },
  { id: 4, name: "Sunita Rao", phone: "+91 87654 32109", city: "Hyderabad", company: "Cognizant", prevCalls: 1, lastIssue: "Product enquiry", status: "Active" },
  { id: 5, name: "Karan Mehta", phone: "+91 77889 90011", city: "Pune", company: "HCL Technologies", prevCalls: 3, lastIssue: "Renewal query", status: "Active" },
];

const DISPOSITIONS = [
  { code: "INT", label: "Interested", color: "#22d38a" },
  { code: "CB", label: "Callback", color: "#f5a623" },
  { code: "NI", label: "Not Interested", color: "#f04060" },
  { code: "DND", label: "Add to DND", color: "#a855f7" },
  { code: "NA", label: "No Answer", color: "#8a97b8" },
  { code: "BUSY", label: "Busy", color: "#f97316" },
];

const AI_TIPS = [
  { type: "tip", text: "Customer has 2 previous calls — reference their history to build rapport quickly." },
  { type: "warn", text: "Tone shift detected — customer sounds slightly hesitant. Slow down and acknowledge." },
  { type: "script", text: "Try: 'I completely understand. Let me pull up your account details right now.'" },
  { type: "tip", text: "Good pacing! Customer is engaged — introduce the main offering now." },
  { type: "warn", text: "Call at 4 minutes — wrap up naturally. Offer a clear next step." },
  { type: "tip", text: "Customer mentioned budget — pivot to value before discussing price." },
];

const RECENT_CALLS = [
  { name: "Suresh K.", duration: "4:23", score: 8.2, disp: "INT", time: "10:42 AM" },
  { name: "Meena R.", duration: "2:10", score: 6.5, disp: "CB", time: "10:18 AM" },
  { name: "Deepak P.", duration: "6:45", score: 9.1, disp: "NI", time: "09:55 AM" },
  { name: "Kavya S.", duration: "1:33", score: 7.8, disp: "NA", time: "09:30 AM" },
];

const SCRIPT_STEPS = [
  "Greet and confirm identity",
  "Introduce reason for call",
  "Identify customer need",
  "Present solution / offer",
  "Handle objections",
  "Confirm next steps and close",
];

function fmt(s) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

// ── Sub-components ──────────────────────────────────────────────────────

function Softphone({ state, timer, contact, onDial, onHold, onMute, onEnd, isMuted, isHold, todayStats }) {
  return (
    <div style={S.panel}>
      {/* Status + timer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: state === "active" ? "#22d38a" : state === "ringing" ? "#f5a623" : state === "hold" ? "#f97316" : "#3a4460",
            boxShadow: state === "active" ? "0 0 8px #22d38a" : state === "ringing" ? "0 0 8px #f5a623" : "none",
            animation: state === "ringing" ? "blink 0.8s infinite" : "none",
          }} />
          <span style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#8a97b8", fontWeight: 700 }}>
            {state === "idle" ? "Ready" : state === "ringing" ? "Ringing..." : state === "active" ? "Live Call" : state === "hold" ? "On Hold" : "Wrap Up"}
          </span>
        </div>
        <span style={{
          fontFamily: "DM Mono, monospace", fontSize: 22, fontWeight: 700,
          color: state === "active" ? "#22d38a" : state === "hold" ? "#f5a623" : "#3a4460",
          letterSpacing: 2,
        }}>
          {fmt(timer)}
        </span>
      </div>

      {/* Contact preview */}
      {contact ? (
        <div style={{ background: "#07090f", borderRadius: 8, padding: "10px 12px", marginBottom: 14, border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#e8edf8", fontFamily: "Playfair Display, serif" }}>{contact.name}</div>
          <div style={{ fontSize: 11, color: "#ff6b35", fontFamily: "DM Mono, monospace", marginTop: 1 }}>{contact.phone}</div>
        </div>
      ) : (
        <div style={{ background: "#07090f", borderRadius: 8, padding: "10px 12px", marginBottom: 14, border: "1px solid rgba(255,255,255,0.06)", textAlign: "center", color: "#3a4460", fontSize: 12 }}>
          No active contact
        </div>
      )}

      {/* Controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
        {state === "idle" && (
          <button onClick={onDial} style={{ ...S.btnGreen, width: "100%" }}>📞 DIAL NEXT</button>
        )}
        {state === "ringing" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            <button style={{ ...S.btnGreen }}>✅ Answer</button>
            <button onClick={onEnd} style={{ ...S.btnRed }}>❌ Reject</button>
          </div>
        )}
        {(state === "active" || state === "hold") && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              <button onClick={onMute} style={{ ...S.btnControl, ...(isMuted ? S.btnActive : {}) }}>
                {isMuted ? "🔇 Muted" : "🎙️ Mute"}
              </button>
              <button onClick={onHold} style={{ ...S.btnControl, ...(isHold ? S.btnAmber : {}) }}>
                {isHold ? "▶️ Resume" : "⏸️ Hold"}
              </button>
            </div>
            <button style={{ ...S.btnControl }}>🔀 Transfer</button>
            <button onClick={onEnd} style={{ ...S.btnRed, width: "100%" }}>📵 END CALL</button>
          </>
        )}
      </div>

      {/* Today stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {[["Calls", todayStats.calls], ["AHT", todayStats.aht], ["QA Avg", todayStats.qa]].map(([l, v]) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 16, fontWeight: 700, color: "#e8edf8" }}>{v}</div>
            <div style={{ fontSize: 9, color: "#3a4460", letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomerPanel({ contact }) {
  if (!contact) return (
    <div style={{ ...S.panel, textAlign: "center", padding: "40px 20px" }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
      <div style={{ color: "#3a4460", fontSize: 13 }}>No active contact</div>
    </div>
  );
  return (
    <div style={S.panel}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#3a4460", marginBottom: 10 }}>Customer Info</div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: "Playfair Display, serif", fontSize: 18, fontWeight: 800, color: "#e8edf8" }}>{contact.name}</div>
        <div style={{ fontSize: 12, color: "#ff6b35", fontFamily: "DM Mono, monospace", marginTop: 2 }}>{contact.phone}</div>
        <div style={{ fontSize: 11, color: "#8a97b8", marginTop: 2 }}>{contact.company} · {contact.city}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <div style={S.infoBox}>
          <div style={{ fontSize: 9, color: "#3a4460", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>Prev Calls</div>
          <div style={{ fontFamily: "DM Mono, monospace", fontSize: 18, fontWeight: 700, color: "#ff6b35" }}>{contact.prevCalls}</div>
        </div>
        <div style={S.infoBox}>
          <div style={{ fontSize: 9, color: "#3a4460", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>Status</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#22d38a" }}>{contact.status}</div>
        </div>
      </div>
      {contact.lastIssue && (
        <div style={{ background: "#07090f", borderRadius: 7, padding: "9px 11px", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 9, color: "#3a4460", letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>Last Interaction</div>
          <div style={{ fontSize: 12, color: "#8a97b8" }}>{contact.lastIssue}</div>
        </div>
      )}
    </div>
  );
}

function AICoach({ callState }) {
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (callState === "active") {
      setLoading(true);
      const t = setTimeout(() => {
        setTips([AI_TIPS[0]]);
        setLoading(false);
      }, 1800);
      const r = setInterval(() => {
        setTips(prev => [AI_TIPS[Math.floor(Math.random() * AI_TIPS.length)], ...prev].slice(0, 3));
      }, 7000);
      return () => { clearTimeout(t); clearInterval(r); };
    } else {
      setTips([]);
    }
  }, [callState]);

  const typeColor = { tip: "#5b8af7", warn: "#f5a623", script: "#22d38a" };
  const typeLabel = { tip: "TIP", warn: "ALERT", script: "SCRIPT" };

  return (
    <div style={S.panel}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ width: 20, height: 20, borderRadius: 5, background: "rgba(255,107,53,0.15)", border: "1px solid rgba(255,107,53,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>🤖</div>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "#ff6b35", textTransform: "uppercase" }}>AI Coach</span>
        {callState === "active" && (
          <span style={{ marginLeft: "auto", background: "rgba(34,211,138,0.1)", color: "#22d38a", fontSize: 9, padding: "2px 8px", borderRadius: 4, letterSpacing: 1, border: "1px solid rgba(34,211,138,0.2)", fontWeight: 700 }}>● LIVE</span>
        )}
      </div>

      {callState !== "active" ? (
        <div style={{ color: "#3a4460", fontSize: 12, textAlign: "center", padding: "16px 0" }}>Activates when call starts</div>
      ) : loading ? (
        <div style={{ color: "#3a4460", fontSize: 12, textAlign: "center", padding: "16px 0" }}>Analysing call…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {tips.map((tip, i) => (
            <div key={i} style={{ background: "#07090f", borderRadius: 7, padding: "10px 12px", borderLeft: `3px solid ${typeColor[tip.type]}`, opacity: i === 0 ? 1 : 0.45, transition: "opacity 0.5s" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: typeColor[tip.type], letterSpacing: 1.5, marginBottom: 4, textTransform: "uppercase" }}>{typeLabel[tip.type]}</div>
              <div style={{ fontSize: 12, color: "#8a97b8", lineHeight: 1.55 }}>{tip.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ScriptPanel({ callState, currentStep, setCurrentStep }) {
  return (
    <div style={S.panel}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#3a4460", marginBottom: 12 }}>📋 Call Script</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {SCRIPT_STEPS.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <div key={i} onClick={() => callState === "active" && setCurrentStep(i)}
              style={{ display: "flex", alignItems: "center", gap: 9, opacity: done ? 0.35 : 1, cursor: callState === "active" ? "pointer" : "default" }}>
              <div style={{
                width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                background: done ? "#22d38a" : active ? "rgba(255,107,53,0.15)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${done ? "#22d38a" : active ? "#ff6b35" : "rgba(255,255,255,0.08)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, color: done ? "#000" : active ? "#ff6b35" : "#3a4460", fontWeight: 700,
              }}>
                {done ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 12, color: done ? "#3a4460" : active ? "#e8edf8" : "#8a97b8", textDecoration: done ? "line-through" : "none", fontWeight: active ? 600 : 400 }}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DispositionPanel({ onSave, callState }) {
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const isWrap = callState === "wrap";

  const handleSave = () => {
    if (!selected || !isWrap) return;
    onSave({ disposition: selected, notes });
    setSaved(true);
    setTimeout(() => { setSaved(false); setSelected(null); setNotes(""); }, 1800);
  };

  return (
    <div style={{ ...S.panel, opacity: isWrap ? 1 : 0.45 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#3a4460" }}>📌 Disposition</span>
        {isWrap && <span style={{ marginLeft: "auto", fontSize: 9, color: "#f5a623", fontWeight: 700, letterSpacing: 1 }}>● WRAP UP</span>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
        {DISPOSITIONS.map(d => (
          <button key={d.code} disabled={!isWrap} onClick={() => setSelected(d.code)} style={{
            padding: "7px 4px", border: `1px solid ${selected === d.code ? d.color : "rgba(255,255,255,0.07)"}`,
            borderRadius: 7, background: selected === d.code ? d.color + "18" : "#07090f",
            color: selected === d.code ? d.color : "#8a97b8",
            fontSize: 11, fontWeight: 600, cursor: isWrap ? "pointer" : "default",
            transition: "all 0.15s", fontFamily: "DM Sans, sans-serif",
          }}>{d.label}</button>
        ))}
      </div>
      <textarea disabled={!isWrap} value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Add call notes…"
        style={{ width: "100%", background: "#07090f", color: "#8a97b8", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 7, padding: "9px 11px", fontSize: 12, resize: "none", height: 56, outline: "none", fontFamily: "DM Sans, sans-serif", boxSizing: "border-box" }}
      />
      <button onClick={handleSave} disabled={!isWrap || !selected} style={{
        width: "100%", marginTop: 8, padding: "11px 0",
        background: saved ? "#22d38a" : (isWrap && selected) ? "#ff6b35" : "#0e1422",
        color: (isWrap && selected) ? "#fff" : "#3a4460",
        border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700,
        cursor: (isWrap && selected) ? "pointer" : "default",
        fontFamily: "Playfair Display, serif", letterSpacing: 0.5, transition: "all 0.25s",
        boxShadow: (isWrap && selected) ? "0 0 20px rgba(255,107,53,0.2)" : "none",
      }}>
        {saved ? "✅ SAVED" : "SAVE & READY"}
      </button>
    </div>
  );
}

function RecentCalls() {
  return (
    <div style={S.panel}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "#3a4460", marginBottom: 12 }}>🕐 Recent Calls</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {RECENT_CALLS.map((c, i) => {
          const disp = DISPOSITIONS.find(d => d.code === c.disp);
          return (
            <div key={i} style={{ background: "#07090f", borderRadius: 8, padding: "10px 11px", border: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", transition: "border-color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)"}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#e8edf8" }}>{c.name}</div>
                  <div style={{ fontSize: 9, color: "#3a4460", marginTop: 1 }}>{c.time}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "DM Mono, monospace", fontSize: 13, fontWeight: 700, color: c.score >= 8 ? "#22d38a" : c.score >= 6 ? "#f5a623" : "#f04060" }}>{c.score.toFixed(1)}</div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                <span style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#3a4460" }}>⏱ {c.duration}</span>
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: disp?.color + "18", color: disp?.color, border: `1px solid ${disp?.color}44` }}>{disp?.label}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, paddingTop: 12, marginTop: 4, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {[["Calls", "14"], ["Converted", "6"], ["QA Avg", "7.8"], ["AHT", "3:42"]].map(([l, v]) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 15, fontWeight: 700, color: "#8a97b8" }}>{v}</div>
            <div style={{ fontSize: 9, color: "#3a4460", letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Agent Desktop ───────────────────────────────────────────────────
export default function AgentDesktop({ agent }) {
  const [callState, setCallState] = useState("idle");
  const [callTimer, setCallTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isHold, setIsHold] = useState(false);
  const [contact, setContact] = useState(null);
  const [contactIdx, setContactIdx] = useState(0);
  const [scriptStep, setScriptStep] = useState(0);
  const [agentStatus, setAgentStatus] = useState("Available");
  const timerRef = useRef(null);

  const todayStats = { calls: "14", aht: "3:42", qa: "7.8" };

  useEffect(() => {
    if (callState === "active") {
      timerRef.current = setInterval(() => setCallTimer(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      if (callState === "idle") setCallTimer(0);
    }
    return () => clearInterval(timerRef.current);
  }, [callState]);

  const handleDial = () => {
    const c = MOCK_CONTACTS[contactIdx % MOCK_CONTACTS.length];
    setContact(c);
    setCallState("ringing");
    setAgentStatus("On Call");
    setCallTimer(0);
    setScriptStep(0);
    // WIRE UP: Call exotelService.makeOutboundCall(c.phone, agent.phone)
    setTimeout(() => setCallState("active"), 3000);
  };

  const handleEnd = () => {
    setCallState("wrap");
    setAgentStatus("Wrap Up");
    setIsHold(false);
    setIsMuted(false);
    setContactIdx(i => i + 1);
  };

  const handleDispose = () => {
    setCallState("idle");
    setContact(null);
    setAgentStatus("Available");
    setCallTimer(0);
  };

  const STATUS_COLORS = { "Available": "#22d38a", "On Call": "#f5a623", "Wrap Up": "#a855f7", "Break": "#f97316", "Offline": "#3a4460" };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Agent top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#0a0e18" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #ff6b35, #ff8f5e)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Playfair Display, serif", fontWeight: 900, fontSize: 13, color: "#fff" }}>
            {agent.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e8edf8" }}>{agent.name}</div>
            <div style={{ fontSize: 10, color: "#8a97b8" }}>Agent · {agent.email}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_COLORS[agentStatus], boxShadow: `0 0 6px ${STATUS_COLORS[agentStatus]}` }} />
          <select value={agentStatus} onChange={e => setAgentStatus(e.target.value)} style={{ background: "#0e1422", color: "#e8edf8", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 7, padding: "5px 10px", fontSize: 12, cursor: "pointer", outline: "none", fontFamily: "DM Sans, sans-serif" }}>
            {Object.keys(STATUS_COLORS).map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Main 3-col layout */}
      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 220px", gap: 14, padding: 14, flex: 1, minHeight: 0, overflow: "auto" }}>
        {/* LEFT */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
          <Softphone state={callState} timer={callTimer} contact={contact}
            onDial={handleDial} onHold={() => { setIsHold(!isHold); setCallState(isHold ? "active" : "hold"); }}
            onMute={() => setIsMuted(!isMuted)} onEnd={handleEnd}
            isMuted={isMuted} isHold={isHold} todayStats={todayStats} />
          <DispositionPanel onSave={handleDispose} callState={callState} />
        </div>

        {/* CENTER */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
          <CustomerPanel contact={contact} />
          <AICoach callState={callState} />
          <ScriptPanel callState={callState} currentStep={scriptStep} setCurrentStep={setScriptStep} />
        </div>

        {/* RIGHT */}
        <div style={{ overflow: "auto" }}>
          <RecentCalls />
        </div>
      </div>
    </div>
  );
}

const S = {
  panel: { background: "linear-gradient(145deg, #0e1422, #131a2e)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: 16 },
  infoBox: { background: "#07090f", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 12px" },
  btnGreen: { background: "linear-gradient(135deg, #059669, #22d38a)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans, sans-serif", boxShadow: "0 0 16px rgba(34,211,138,0.25)" },
  btnRed: { background: "rgba(240,64,96,0.12)", color: "#f04060", border: "1px solid rgba(240,64,96,0.25)", borderRadius: 8, padding: "10px 0", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans, sans-serif" },
  btnControl: { background: "#07090f", color: "#8a97b8", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "9px 0", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans, sans-serif", transition: "all 0.15s" },
  btnActive: { background: "rgba(168,85,247,0.12)", color: "#a855f7", borderColor: "rgba(168,85,247,0.3)" },
  btnAmber: { background: "rgba(245,166,35,0.1)", color: "#f5a623", borderColor: "rgba(245,166,35,0.3)" },
};
