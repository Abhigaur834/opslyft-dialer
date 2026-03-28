import { useState } from "react";

const MOCK_CAMPAIGNS = [
  { id: 1, name: "Q3 Outbound — Mumbai", status: "Running", mode: "Progressive", total: 500, called: 312, converted: 68, dndBlocked: 14, agents: 6, startedAt: "9:00 AM", createdAt: "2026-03-26" },
  { id: 2, name: "Renewal Follow-Up", status: "Paused",  mode: "Preview",     total: 180, called: 90,  converted: 22, dndBlocked: 5,  agents: 3, startedAt: "10:30 AM", createdAt: "2026-03-25" },
  { id: 3, name: "Inbound Support Q2",  status: "Completed", mode: "Preview",  total: 240, called: 240, converted: 54, dndBlocked: 9,  agents: 4, startedAt: "9:00 AM", createdAt: "2026-03-24" },
  { id: 4, name: "Cold Outbound — Delhi", status: "Draft", mode: "Predictive", total: 800, called: 0,   converted: 0,  dndBlocked: 0,  agents: 0, startedAt: "—", createdAt: "2026-03-26" },
];

const STATUS_META = {
  Running:   { color: "#22d38a", bg: "rgba(34,211,138,0.1)",   border: "rgba(34,211,138,0.2)" },
  Paused:    { color: "#f5a623", bg: "rgba(245,166,35,0.1)",   border: "rgba(245,166,35,0.2)" },
  Completed: { color: "#5b8af7", bg: "rgba(91,138,247,0.1)",   border: "rgba(91,138,247,0.2)" },
  Draft:     { color: "#8a97b8", bg: "rgba(138,151,184,0.08)", border: "rgba(138,151,184,0.15)" },
};

function ProgressBar({ val, max, color = "#ff6b35" }) {
  const pct = max > 0 ? Math.round((val / max) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.6s" }} />
      </div>
      <span style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#8a97b8", minWidth: 32, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

function CampaignCard({ c, onAction }) {
  const meta = STATUS_META[c.status];
  const convRate = c.called > 0 ? ((c.converted / c.called) * 100).toFixed(1) : "—";

  return (
    <div style={{ background: "linear-gradient(145deg, #0e1422, #131a2e)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "20px 22px", transition: "all 0.2s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,107,53,0.18)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "translateY(0)"; }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "Playfair Display, serif", fontSize: 16, fontWeight: 800, color: "#e8edf8", marginBottom: 4 }}>{c.name}</div>
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, padding: "2px 9px", borderRadius: 20, background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color }}>
              {c.status}
            </span>
            <span style={{ fontSize: 10, color: "#3a4460", fontWeight: 600 }}>· {c.mode} Dialer</span>
          </div>
        </div>
        {/* Action button */}
        <button onClick={() => onAction(c)} style={{
          padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
          fontFamily: "DM Sans, sans-serif", border: "1px solid", transition: "all 0.15s",
          ...(c.status === "Running"
            ? { background: "rgba(245,166,35,0.1)", color: "#f5a623", borderColor: "rgba(245,166,35,0.25)" }
            : c.status === "Paused"
            ? { background: "rgba(34,211,138,0.1)", color: "#22d38a", borderColor: "rgba(34,211,138,0.25)" }
            : c.status === "Draft"
            ? { background: "rgba(255,107,53,0.1)", color: "#ff6b35", borderColor: "rgba(255,107,53,0.25)" }
            : { background: "rgba(255,255,255,0.04)", color: "#8a97b8", borderColor: "rgba(255,255,255,0.09)" }),
        }}>
          {c.status === "Running" ? "⏸ Pause" : c.status === "Paused" ? "▶ Resume" : c.status === "Draft" ? "▶ Start" : "📊 Report"}
        </button>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: "#8a97b8" }}>Progress</span>
          <span style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#ff6b35" }}>{c.called} / {c.total}</span>
        </div>
        <ProgressBar val={c.called} max={c.total} />
      </div>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
        {[
          { l: "Total", v: c.total, c: "#8a97b8" },
          { l: "Called", v: c.called, c: "#ff6b35" },
          { l: "Converted", v: c.converted, c: "#22d38a" },
          { l: "Conv %", v: convRate + (convRate !== "—" ? "%" : ""), c: "#5b8af7" },
          { l: "DND Block", v: c.dndBlocked, c: "#f5a623" },
        ].map(m => (
          <div key={m.l} style={{ textAlign: "center", background: "#07090f", borderRadius: 7, padding: "9px 6px", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontFamily: "DM Mono, monospace", fontSize: 14, fontWeight: 700, color: m.c }}>{m.v}</div>
            <div style={{ fontSize: 8, color: "#3a4460", letterSpacing: 0.8, textTransform: "uppercase", marginTop: 2 }}>{m.l}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 10, color: "#3a4460" }}>
        <span>Started {c.startedAt}</span>
        <span>{c.agents > 0 ? `${c.agents} agents assigned` : "Not started"}</span>
        <span>Created {c.createdAt}</span>
      </div>
    </div>
  );
}

function NewCampaignModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ name: "", mode: "Preview", file: null, dnd: true, maxAttempts: 3, dialRatio: 1 });

  const handleCreate = (e) => {
    e.preventDefault();
    onCreate(form);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(4px)" }}>
      <div style={{ background: "linear-gradient(145deg, #0e1422, #131a2e)", border: "1px solid rgba(255,107,53,0.2)", borderRadius: 18, padding: "32px 30px", width: "100%", maxWidth: 520, boxShadow: "0 40px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ fontFamily: "Playfair Display, serif", fontSize: 22, fontWeight: 900, color: "#e8edf8" }}>New Campaign</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#3a4460", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={LS.label}>Campaign Name *</label>
            <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              placeholder="Q3 Outbound — Mumbai" style={LS.input}
              onFocus={e => e.target.style.borderColor = "#ff6b35"} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.09)"} />
          </div>

          <div>
            <label style={LS.label}>Dialer Mode</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {["Preview", "Progressive", "Predictive"].map(m => (
                <button key={m} type="button" onClick={() => setForm({...form, mode: m})} style={{
                  padding: "9px 0", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif", transition: "all 0.15s",
                  background: form.mode === m ? "rgba(255,107,53,0.12)" : "#07090f",
                  color: form.mode === m ? "#ff6b35" : "#8a97b8",
                  border: `1px solid ${form.mode === m ? "rgba(255,107,53,0.35)" : "rgba(255,255,255,0.07)"}`,
                }}>{m}</button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "#3a4460", marginTop: 6, lineHeight: 1.5 }}>
              {form.mode === "Preview" && "Agent sees contact before calling. Manual dial per contact."}
              {form.mode === "Progressive" && "Auto-dials when agent is free. One call per available agent."}
              {form.mode === "Predictive" && "Dials multiple numbers, connects answered call to first free agent."}
            </div>
          </div>

          <div>
            <label style={LS.label}>Upload Contact List (CSV) *</label>
            <div style={{ border: "2px dashed rgba(255,107,53,0.2)", borderRadius: 9, padding: "20px", textAlign: "center", cursor: "pointer", background: "rgba(255,107,53,0.03)" }}
              onClick={() => document.getElementById("csvUpload").click()}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>📋</div>
              <div style={{ fontSize: 13, color: form.file ? "#22d38a" : "#8a97b8" }}>
                {form.file ? `✓ ${form.file.name}` : "Click to upload CSV"}
              </div>
              <div style={{ fontSize: 11, color: "#3a4460", marginTop: 3 }}>Required columns: name, phone, city (optional)</div>
              <input id="csvUpload" type="file" accept=".csv" style={{ display: "none" }}
                onChange={e => setForm({...form, file: e.target.files[0]})} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={LS.label}>Max Attempts / Contact</label>
              <select value={form.maxAttempts} onChange={e => setForm({...form, maxAttempts: +e.target.value})} style={LS.input}>
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} attempt{n>1?"s":""}</option>)}
              </select>
            </div>
            {form.mode === "Predictive" && (
              <div>
                <label style={LS.label}>Dial Ratio (TRAI max: 3:1)</label>
                <select value={form.dialRatio} onChange={e => setForm({...form, dialRatio: +e.target.value})} style={LS.input}>
                  {[1,2,3].map(n => <option key={n} value={n}>{n}:1</option>)}
                </select>
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: form.dnd ? "rgba(34,211,138,0.05)" : "rgba(240,64,96,0.05)", border: `1px solid ${form.dnd ? "rgba(34,211,138,0.15)" : "rgba(240,64,96,0.15)"}`, borderRadius: 9 }}>
            <input type="checkbox" id="dndCheck" checked={form.dnd} onChange={e => setForm({...form, dnd: e.target.checked})} style={{ width: 16, height: 16, accentColor: "#ff6b35", cursor: "pointer" }} />
            <label htmlFor="dndCheck" style={{ fontSize: 13, color: form.dnd ? "#22d38a" : "#f04060", fontWeight: 600, cursor: "pointer" }}>
              {form.dnd ? "✓ TRAI DND Scrubbing Enabled" : "⚠ DND Scrubbing Disabled (not recommended)"}
            </label>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: "12px 0", borderRadius: 9, background: "transparent", color: "#8a97b8", border: "1px solid rgba(255,255,255,0.09)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "DM Sans, sans-serif" }}>
              Cancel
            </button>
            <button type="submit" style={{ flex: 2, padding: "12px 0", borderRadius: 9, background: "#ff6b35", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "Playfair Display, serif", boxShadow: "0 0 20px rgba(255,107,53,0.25)" }}>
              Create Campaign →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CampaignManager() {
  const [campaigns, setCampaigns] = useState(MOCK_CAMPAIGNS);
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState("All");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const handleAction = (c) => {
    if (c.status === "Running") {
      setCampaigns(cs => cs.map(x => x.id === c.id ? { ...x, status: "Paused" } : x));
      showToast(`Paused — ${c.name}`);
    } else if (c.status === "Paused") {
      setCampaigns(cs => cs.map(x => x.id === c.id ? { ...x, status: "Running" } : x));
      showToast(`Resumed — ${c.name}`);
    } else if (c.status === "Draft") {
      setCampaigns(cs => cs.map(x => x.id === c.id ? { ...x, status: "Running", startedAt: new Date().toLocaleTimeString("en-IN", {hour:"2-digit",minute:"2-digit"}) } : x));
      showToast(`Started — ${c.name}`);
    } else {
      showToast(`Report — coming soon`);
    }
  };

  const handleCreate = (form) => {
    const newC = {
      id: Date.now(), name: form.name, status: "Draft", mode: form.mode,
      total: 0, called: 0, converted: 0, dndBlocked: 0,
      agents: 0, startedAt: "—", createdAt: new Date().toISOString().split("T")[0],
    };
    setCampaigns(cs => [newC, ...cs]);
    showToast(`Created — ${form.name}`);
  };

  const filters = ["All", "Running", "Paused", "Draft", "Completed"];
  const filtered = filter === "All" ? campaigns : campaigns.filter(c => c.status === filter);

  const running = campaigns.filter(c => c.status === "Running").length;
  const totalCalled = campaigns.reduce((s, c) => s + c.called, 0);
  const totalConverted = campaigns.reduce((s, c) => s + c.converted, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "auto" }}>
      {/* Header */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#0a0e18", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: "Playfair Display, serif", fontSize: 13, fontWeight: 700, color: "#e8edf8" }}>Campaign Manager</div>
        <button onClick={() => setShowNew(true)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 8, background: "#ff6b35", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "DM Sans, sans-serif", boxShadow: "0 0 16px rgba(255,107,53,0.25)" }}>
          + New Campaign
        </button>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Summary metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { l: "Active Campaigns", v: running, c: "#22d38a" },
            { l: "Total Contacts", v: campaigns.reduce((s,c) => s + c.total, 0).toLocaleString(), c: "#ff6b35" },
            { l: "Calls Made", v: totalCalled.toLocaleString(), c: "#5b8af7" },
            { l: "Converted", v: totalConverted + (totalCalled > 0 ? ` (${((totalConverted/totalCalled)*100).toFixed(1)}%)` : ""), c: "#f5a623" },
          ].map(m => (
            <div key={m.l} style={{ background: "linear-gradient(145deg, #0e1422, #131a2e)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 9, color: "#3a4460", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>{m.l}</div>
              <div style={{ fontFamily: "Playfair Display, serif", fontSize: 26, fontWeight: 900, color: m.c, letterSpacing: -0.5, lineHeight: 1 }}>{m.v}</div>
            </div>
          ))}
        </div>

        {/* Filters + list */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#8a97b8", letterSpacing: 1, textTransform: "uppercase" }}>
              All Campaigns <span style={{ color: "#3a4460" }}>({filtered.length})</span>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map(c => <CampaignCard key={c.id} c={c} onAction={handleAction} />)}
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px", color: "#3a4460", fontSize: 13 }}>
                No campaigns found · <button onClick={() => setShowNew(true)} style={{ color: "#ff6b35", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Create one →</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showNew && <NewCampaignModal onClose={() => setShowNew(false)} onCreate={handleCreate} />}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#0e1422", border: "1px solid rgba(255,107,53,0.35)", borderRadius: 10, padding: "12px 20px", fontSize: 13, fontWeight: 700, color: "#ff6b35", boxShadow: "0 8px 28px rgba(0,0,0,0.5)", zIndex: 999 }}>
          ✓ {toast}
        </div>
      )}
    </div>
  );
}

const LS = {
  label: { display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: "#8a97b8", marginBottom: 7 },
  input: { width: "100%", padding: "10px 13px", borderRadius: 8, background: "#07090f", border: "1px solid rgba(255,255,255,0.09)", color: "#e8edf8", fontSize: 13, fontFamily: "DM Sans, sans-serif", outline: "none", boxSizing: "border-box" },
};
