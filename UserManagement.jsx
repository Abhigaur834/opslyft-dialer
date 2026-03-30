/**
 * UserManagement.jsx — OpsLyft Team & Access Manager
 * Only supervisors can see this panel.
 *
 * Features:
 * ─ View all users (agents, team leads, supervisors)
 * ─ Create new user with email + password (without logging out supervisor)
 * ─ Change any user's role
 * ─ Deactivate / reactivate users
 * ─ Show each user's status, team, last login
 *
 * HOW NEW USER CREATION WORKS (no backend needed):
 * We spin up a "secondary" Firebase app instance in the background.
 * createUserWithEmailAndPassword runs on that secondary instance,
 * so the supervisor's main session is never touched.
 */

import { useState, useEffect } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import {
  collection, onSnapshot, doc, setDoc, updateDoc, getDocs
} from "firebase/firestore";
import { firebaseConfig, db } from "../../firebase";

// ── Secondary Firebase app (for creating users without affecting supervisor session) ──
const secondaryApp =
  getApps().find(a => a.name === "secondary") ||
  initializeApp(firebaseConfig, "secondary");
const secondaryAuth = getAuth(secondaryApp);

// ── Role config ──────────────────────────────────────────────────────
const ROLES = {
  supervisor: { label: "Supervisor", color: "#ff6b35", bg: "rgba(255,107,53,0.12)", border: "rgba(255,107,53,0.3)", desc: "Full access — dashboard, campaigns, IVR, team management" },
  team_lead:  { label: "Team Lead",  color: "#5b8af7", bg: "rgba(91,138,247,0.12)",  border: "rgba(91,138,247,0.3)",  desc: "Dashboard + agent view — cannot manage campaigns or IVR" },
  agent:      { label: "Agent",      color: "#22d38a", bg: "rgba(34,211,138,0.12)",  border: "rgba(34,211,138,0.3)",  desc: "My Desk only — dialer, dispositions, AI coach, script" },
};

const TEAMS = ["Sales", "Support", "Retention", "Billing", "Collections", "General"];

function RoleBadge({ role }) {
  const r = ROLES[role] || ROLES.agent;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 0.5, padding: "3px 10px",
      borderRadius: 20, background: r.bg, border: `1px solid ${r.border}`, color: r.color,
      textTransform: "uppercase", whiteSpace: "nowrap",
    }}>{r.label}</span>
  );
}

// ── Create / Edit User Modal ─────────────────────────────────────────
function UserModal({ mode, existing, onClose, onSuccess }) {
  const [form, setForm] = useState(
    existing
      ? { name: existing.displayName || "", email: existing.email || "", role: existing.role || "agent", team: existing.team || "Sales", password: "" }
      : { name: "", email: "", password: "", role: "agent", team: "Sales" }
  );
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    setError("");
    if (!form.name.trim()) { setError("Name is required."); return; }

    if (mode === "create") {
      if (!form.email.trim()) { setError("Email is required."); return; }
      if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }

      setLoading(true);
      try {
        // Create Auth account on secondary instance — supervisor stays logged in
        const cred = await createUserWithEmailAndPassword(
          secondaryAuth, form.email.trim(), form.password
        );
        const uid = cred.user.uid;

        // Create Firestore user document
        await setDoc(doc(db, "users", uid), {
          uid,
          displayName: form.name.trim(),
          email:       form.email.trim().toLowerCase(),
          role:        form.role,
          team:        form.team,
          active:      true,
          createdAt:   new Date().toISOString(),
        });

        // Sign out of the secondary instance (cleanup)
        await secondaryAuth.signOut();

        onSuccess(`✓ ${form.name} created — email: ${form.email}  password: ${form.password}`);
        onClose();
      } catch (err) {
        const MSGS = {
          "auth/email-already-in-use": "This email already has an account.",
          "auth/invalid-email":        "Invalid email format.",
          "auth/weak-password":        "Password too weak — use at least 6 characters.",
        };
        setError(MSGS[err.code] || err.message);
      } finally {
        setLoading(false);
      }

    } else {
      // Edit mode — update Firestore only
      setLoading(true);
      try {
        await updateDoc(doc(db, "users", existing.uid), {
          displayName: form.name.trim(),
          role:        form.role,
          team:        form.team,
        });
        onSuccess(`✓ ${form.name} updated`);
        onClose();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, backdropFilter:"blur(4px)" }}>
      <div style={{ background:"linear-gradient(145deg,#0e1422,#131a2e)", border:"1px solid rgba(255,107,53,0.2)", borderRadius:20, padding:"28px 28px 24px", width:"100%", maxWidth:460, boxShadow:"0 40px 80px rgba(0,0,0,0.6)" }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
          <div>
            <div style={{ fontFamily:"Playfair Display, serif", fontSize:20, fontWeight:900, color:"#e8edf8" }}>
              {mode === "create" ? "Create New User" : "Edit User"}
            </div>
            <div style={{ fontSize:11, color:"#3a4460", marginTop:3 }}>
              {mode === "create" ? "User can log in immediately after creation" : "Role and team changes take effect on next login"}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#3a4460", cursor:"pointer", fontSize:20, lineHeight:1 }}>✕</button>
        </div>

        {/* Fields */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

          <Field label="Full Name">
            <input value={form.name} onChange={e => set("name", e.target.value)}
              placeholder="e.g. Rahul Kumar" style={FS.input}
              onFocus={e => e.target.style.borderColor="#ff6b35"}
              onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.09)"} />
          </Field>

          {mode === "create" && <>
            <Field label="Work Email">
              <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                placeholder="rahul@opslyft.com" style={FS.input}
                onFocus={e => e.target.style.borderColor="#ff6b35"}
                onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.09)"} />
            </Field>
            <Field label="Password">
              <input type="text" value={form.password} onChange={e => set("password", e.target.value)}
                placeholder="Min 6 characters — share with the new user" style={FS.input}
                onFocus={e => e.target.style.borderColor="#ff6b35"}
                onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.09)"} />
              <div style={{ fontSize:10, color:"#3a4460", marginTop:4 }}>
                ⚠ Share this password securely with the user — they can change it later
              </div>
            </Field>
          </>}

          <Field label="Role">
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              {Object.entries(ROLES).map(([key, meta]) => (
                <label key={key} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 13px", borderRadius:9, background: form.role===key ? meta.bg : "#07090f", border:`1px solid ${form.role===key ? meta.border : "rgba(255,255,255,0.07)"}`, cursor:"pointer", transition:"all 0.15s" }}>
                  <input type="radio" name="role" value={key} checked={form.role===key} onChange={() => set("role", key)}
                    style={{ marginTop:2, accentColor:meta.color }} />
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:meta.color }}>{meta.label}</div>
                    <div style={{ fontSize:11, color:"#3a4460", marginTop:2 }}>{meta.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </Field>

          <Field label="Team">
            <select value={form.team} onChange={e => set("team", e.target.value)} style={FS.select}>
              {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>

          {error && (
            <div style={{ background:"rgba(240,64,96,0.08)", border:"1px solid rgba(240,64,96,0.25)", borderRadius:8, padding:"10px 13px", color:"#f04060", fontSize:12, display:"flex", alignItems:"center", gap:7 }}>
              ⚠ {error}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display:"flex", gap:10, marginTop:22 }}>
          <button onClick={onClose} style={FS.btnSecondary}>Cancel</button>
          <button onClick={handleSubmit} disabled={loading} style={{ ...FS.btnPrimary, opacity:loading?0.7:1, flex:2 }}>
            {loading
              ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                  <span style={{ width:13, height:13, borderRadius:"50%", border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", animation:"spin 0.6s linear infinite", display:"inline-block" }} />
                  {mode==="create" ? "Creating…" : "Saving…"}
                </span>
              : mode==="create" ? "Create User →" : "Save Changes →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display:"block", fontSize:10, fontWeight:700, letterSpacing:"1.2px", textTransform:"uppercase", color:"#8a97b8", marginBottom:7 }}>{label}</label>
      {children}
    </div>
  );
}

// ── Change Role inline dropdown ──────────────────────────────────────
function RoleDropdown({ uid, currentRole, onDone }) {
  const [val, setVal] = useState(currentRole);
  const [saving, setSaving] = useState(false);

  const handleChange = async (newRole) => {
    setVal(newRole);
    setSaving(true);
    await updateDoc(doc(db, "users", uid), { role: newRole });
    setSaving(false);
    onDone(newRole);
  };

  return (
    <select value={val} onChange={e => handleChange(e.target.value)} disabled={saving}
      style={{ background:"#07090f", color:ROLES[val]?.color||"#8a97b8", border:"1px solid rgba(255,255,255,0.09)", borderRadius:7, padding:"4px 9px", fontSize:11, fontWeight:700, cursor:"pointer", outline:"none" }}>
      {Object.entries(ROLES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
    </select>
  );
}

// ── Main Component ───────────────────────────────────────────────────
export default function UserManagement({ currentUser }) {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null); // null | "create" | { mode:"edit", user }
  const [toast,   setToast]   = useState("");
  const [filter,  setFilter]  = useState("all");
  const [search,  setSearch]  = useState("");
  const [inlineEdit, setInlineEdit] = useState(null); // uid being role-edited

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3500); };

  // Live-listen to users collection
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, "users"), snap => {
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const toggleActive = async (user) => {
    await updateDoc(doc(db, "users", user.uid), { active: !user.active });
    showToast(user.active ? `⊘ ${user.displayName} deactivated` : `✓ ${user.displayName} reactivated`);
  };

  // Filter + search
  const visible = users.filter(u => {
    const matchFilter = filter === "all" || u.role === filter || (filter === "active" && u.active !== false) || (filter === "inactive" && u.active === false);
    const matchSearch = !search || (u.displayName||"").toLowerCase().includes(search.toLowerCase()) || (u.email||"").toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  // Stats
  const stats = {
    total:      users.length,
    supervisors: users.filter(u => u.role === "supervisor").length,
    leads:      users.filter(u => u.role === "team_lead").length,
    agents:     users.filter(u => u.role === "agent").length,
    inactive:   users.filter(u => u.active === false).length,
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"auto" }}>

      {/* Header bar */}
      <div style={{ padding:"10px 20px", borderBottom:"1px solid rgba(255,255,255,0.06)", background:"#0a0e18", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div style={{ fontFamily:"Playfair Display, serif", fontSize:13, fontWeight:700, color:"#e8edf8" }}>Team & Access</div>
        <button onClick={() => setModal("create")}
          style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 16px", borderRadius:8, background:"#ff6b35", color:"#fff", border:"none", fontSize:12, fontWeight:700, cursor:"pointer", boxShadow:"0 0 16px rgba(255,107,53,0.25)" }}>
          + Add User
        </button>
      </div>

      <div style={{ padding:16, display:"flex", flexDirection:"column", gap:14 }}>

        {/* Stats row */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
          {[
            ["Total Users",   stats.total,      "#e8edf8"],
            ["Supervisors",   stats.supervisors, "#ff6b35"],
            ["Team Leads",    stats.leads,       "#5b8af7"],
            ["Agents",        stats.agents,      "#22d38a"],
            ["Inactive",      stats.inactive,    "#3a4460"],
          ].map(([label, val, color]) => (
            <div key={label} style={{ background:"linear-gradient(145deg,#0e1422,#131a2e)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"14px 16px" }}>
              <div style={{ fontSize:9, color:"#3a4460", fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginBottom:5 }}>{label}</div>
              <div style={{ fontFamily:"Playfair Display, serif", fontSize:28, fontWeight:900, color, lineHeight:1 }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Search + filters */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            style={{ flex:1, padding:"9px 13px", background:"#0e1422", border:"1px solid rgba(255,255,255,0.09)", borderRadius:9, color:"#e8edf8", fontSize:13, outline:"none" }}
            onFocus={e => e.target.style.borderColor="#ff6b35"}
            onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.09)"} />
          <div style={{ display:"flex", gap:5 }}>
            {[["all","All"],["supervisor","Supervisors"],["team_lead","Team Leads"],["agent","Agents"],["inactive","Inactive"]].map(([k,l]) => (
              <button key={k} onClick={() => setFilter(k)} style={{
                padding:"6px 12px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer",
                background:filter===k?"#ff6b35":"#0e1422",
                color:filter===k?"#fff":"#8a97b8",
                border:`1px solid ${filter===k?"#ff6b35":"rgba(255,255,255,0.07)"}`,
                transition:"all 0.15s",
              }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Users table */}
        <div style={{ background:"linear-gradient(145deg,#0e1422,#131a2e)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, overflow:"hidden" }}>

          {/* Table header */}
          <div style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr 130px", gap:0, padding:"10px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)", background:"rgba(0,0,0,0.2)" }}>
            {["Name","Email","Role","Team","Status","Actions"].map(h => (
              <div key={h} style={{ fontSize:9, fontWeight:700, letterSpacing:1.5, color:"#3a4460", textTransform:"uppercase" }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {loading ? (
            <div style={{ padding:"40px", textAlign:"center", color:"#3a4460" }}>Loading users…</div>
          ) : visible.length === 0 ? (
            <div style={{ padding:"40px", textAlign:"center", color:"#3a4460", fontSize:13 }}>
              No users found · <button onClick={() => setModal("create")} style={{ color:"#ff6b35", background:"none", border:"none", cursor:"pointer", fontWeight:700, fontSize:13 }}>Create one →</button>
            </div>
          ) : (
            visible.map((u, i) => {
              const isInactive = u.active === false;
              const isMe = u.uid === currentUser?.uid;
              return (
                <div key={u.uid} style={{
                  display:"grid", gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr 130px",
                  gap:0, padding:"12px 16px",
                  borderBottom: i < visible.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                  background: isInactive ? "rgba(0,0,0,0.2)" : "transparent",
                  opacity: isInactive ? 0.5 : 1,
                  transition:"all 0.15s",
                }}
                  onMouseEnter={e => !isInactive && (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                  onMouseLeave={e => e.currentTarget.style.background = isInactive ? "rgba(0,0,0,0.2)" : "transparent"}>

                  {/* Name */}
                  <div style={{ display:"flex", alignItems:"center", gap:9, paddingRight:8 }}>
                    <div style={{
                      width:30, height:30, borderRadius:"50%", flexShrink:0,
                      background:`linear-gradient(135deg, ${ROLES[u.role]?.color||"#8a97b8"}22, ${ROLES[u.role]?.color||"#8a97b8"}0a)`,
                      border:`1px solid ${ROLES[u.role]?.color||"#8a97b8"}40`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontFamily:"Playfair Display, serif", fontWeight:900, fontSize:12, color:ROLES[u.role]?.color||"#8a97b8",
                    }}>{(u.displayName||u.email||"?").charAt(0).toUpperCase()}</div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:"#e8edf8", display:"flex", alignItems:"center", gap:5 }}>
                        {u.displayName || "—"}
                        {isMe && <span style={{ fontSize:9, color:"#3a4460", background:"rgba(255,255,255,0.05)", padding:"1px 6px", borderRadius:4 }}>YOU</span>}
                      </div>
                    </div>
                  </div>

                  {/* Email */}
                  <div style={{ fontSize:12, color:"#8a97b8", display:"flex", alignItems:"center", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", paddingRight:8 }}>
                    {u.email || "—"}
                  </div>

                  {/* Role */}
                  <div style={{ display:"flex", alignItems:"center" }}>
                    {inlineEdit === u.uid && !isMe ? (
                      <RoleDropdown uid={u.uid} currentRole={u.role}
                        onDone={newRole => {
                          setInlineEdit(null);
                          showToast(`✓ ${u.displayName} → ${ROLES[newRole].label}`);
                        }} />
                    ) : (
                      <RoleBadge role={u.role} />
                    )}
                  </div>

                  {/* Team */}
                  <div style={{ fontSize:12, color:"#8a97b8", display:"flex", alignItems:"center" }}>{u.team || "—"}</div>

                  {/* Status */}
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:isInactive?"#3a4460":"#22d38a", boxShadow:isInactive?"none":"0 0 6px #22d38a" }} />
                    <span style={{ fontSize:11, color:isInactive?"#3a4460":"#22d38a", fontWeight:600 }}>{isInactive?"Inactive":"Active"}</span>
                  </div>

                  {/* Actions */}
                  <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                    {!isMe && <>
                      <button onClick={() => setInlineEdit(inlineEdit===u.uid ? null : u.uid)}
                        title="Change role"
                        style={{ padding:"5px 9px", background:"rgba(91,138,247,0.1)", color:"#5b8af7", border:"1px solid rgba(91,138,247,0.25)", borderRadius:6, fontSize:10, fontWeight:700, cursor:"pointer", transition:"all 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background="rgba(91,138,247,0.2)"}
                        onMouseLeave={e => e.currentTarget.style.background="rgba(91,138,247,0.1)"}>
                        Role
                      </button>
                      <button onClick={() => setModal({ mode:"edit", user:u })}
                        title="Edit user"
                        style={{ padding:"5px 9px", background:"rgba(255,107,53,0.1)", color:"#ff6b35", border:"1px solid rgba(255,107,53,0.25)", borderRadius:6, fontSize:10, fontWeight:700, cursor:"pointer", transition:"all 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.background="rgba(255,107,53,0.2)"}
                        onMouseLeave={e => e.currentTarget.style.background="rgba(255,107,53,0.1)"}>
                        Edit
                      </button>
                      <button onClick={() => toggleActive(u)}
                        title={isInactive ? "Reactivate" : "Deactivate"}
                        style={{ padding:"5px 9px", background: isInactive?"rgba(34,211,138,0.1)":"rgba(240,64,96,0.08)", color:isInactive?"#22d38a":"#f04060", border:`1px solid ${isInactive?"rgba(34,211,138,0.25)":"rgba(240,64,96,0.2)"}`, borderRadius:6, fontSize:10, fontWeight:700, cursor:"pointer", transition:"all 0.15s" }}>
                        {isInactive ? "On" : "Off"}
                      </button>
                    </>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Role permissions legend */}
        <div style={{ background:"linear-gradient(145deg,#0e1422,#131a2e)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:16 }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:"#3a4460", marginBottom:12 }}>Role Permissions</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            {Object.entries(ROLES).map(([key, meta]) => (
              <div key={key} style={{ background:"#07090f", borderRadius:9, padding:"12px 14px", border:`1px solid ${meta.border}` }}>
                <div style={{ fontSize:11, fontWeight:700, color:meta.color, marginBottom:8 }}>{meta.label}</div>
                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                  {[
                    ["📞 My Desk", true],
                    ["📊 Live Dashboard", key !== "agent"],
                    ["📋 Campaigns", key === "supervisor"],
                    ["🌳 IVR Builder", key === "supervisor"],
                    ["👥 Team & Access", key === "supervisor"],
                  ].map(([perm, allowed]) => (
                    <div key={perm} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:allowed?"#8a97b8":"#2a3050" }}>
                      <span style={{ color:allowed?"#22d38a":"#2a3050", fontSize:10 }}>{allowed?"✓":"✗"}</span>
                      {perm}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Modals */}
      {modal === "create" && (
        <UserModal mode="create" onClose={() => setModal(null)} onSuccess={showToast} />
      )}
      {modal?.mode === "edit" && (
        <UserModal mode="edit" existing={modal.user} onClose={() => setModal(null)} onSuccess={showToast} />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:"#0e1422", border:"1px solid rgba(255,107,53,0.35)", borderRadius:10, padding:"12px 22px", fontSize:13, fontWeight:700, color:"#ff6b35", boxShadow:"0 8px 28px rgba(0,0,0,0.5)", zIndex:999, animation:"fadeUp 0.3s ease", whiteSpace:"nowrap" }}>
          {toast}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Field styles ─────────────────────────────────────────────────────
const FS = {
  input: { width:"100%", padding:"10px 13px", borderRadius:8, background:"#07090f", border:"1px solid rgba(255,255,255,0.09)", color:"#e8edf8", fontSize:13, outline:"none", boxSizing:"border-box", transition:"border-color 0.2s", fontFamily:"DM Sans, sans-serif" },
  select: { width:"100%", padding:"10px 13px", borderRadius:8, background:"#07090f", border:"1px solid rgba(255,255,255,0.09)", color:"#e8edf8", fontSize:13, outline:"none", cursor:"pointer", fontFamily:"DM Sans, sans-serif" },
  btnPrimary: { flex:2, padding:"12px 0", borderRadius:9, background:"linear-gradient(135deg,#ff6b35,#ff8f5e)", color:"#fff", border:"none", fontSize:13, fontWeight:700, cursor:"pointer", boxShadow:"0 0 20px rgba(255,107,53,0.25)" },
  btnSecondary: { flex:1, padding:"12px 0", borderRadius:9, background:"transparent", color:"#8a97b8", border:"1px solid rgba(255,255,255,0.09)", fontSize:13, fontWeight:600, cursor:"pointer" },
};
