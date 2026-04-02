/**
 * UserManagement.jsx — OpsLyft Team & Access Manager
 * Supervisors create/edit/deactivate users.
 * Uses a secondary Firebase app instance so creating a new user
 * does NOT log out the supervisor.
 */

import { useState, useEffect } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { collection, onSnapshot, doc, setDoc, updateDoc } from "firebase/firestore";
import { firebaseConfig, db } from "../../firebase";

// Secondary Firebase instance — creates users without touching supervisor session
const secondaryApp =
  getApps().find(a => a.name === "secondary") ||
  initializeApp(firebaseConfig, "secondary");
const secondaryAuth = getAuth(secondaryApp);

const T = {
  bg:"#07090f", surface:"#0e1422", s2:"#131a2e",
  border:"rgba(255,255,255,0.07)",
  orange:"#ff6b35", green:"#22d38a", blue:"#5b8af7",
  amber:"#f5a623", red:"#f04060", purple:"#a855f7",
  text:"#e8edf8", muted:"#8a97b8", faint:"#3a4460",
};

const ROLES = {
  supervisor: { label:"Supervisor", color:T.orange, desc:"Full access — all tabs" },
  team_lead:  { label:"Team Lead",  color:T.blue,   desc:"Dashboard + My Desk" },
  agent:      { label:"Agent",      color:T.green,  desc:"My Desk only" },
};
const TEAMS = ["Sales","Support","Retention","Billing","Collections","General"];

const Panel = ({ children, style={} }) => (
  <div style={{ background:`linear-gradient(145deg,${T.surface},${T.s2})`, border:`1px solid ${T.border}`, borderRadius:12, padding:16, ...style }}>{children}</div>
);

const Inp = (props) => (
  <input style={{ width:"100%", padding:"10px 12px", borderRadius:8, background:T.bg, border:`1px solid ${T.border}`, color:T.text, fontSize:13, outline:"none", boxSizing:"border-box", transition:"border-color .2s", fontFamily:"DM Sans,sans-serif" }}
    onFocus={e=>e.target.style.borderColor=T.orange} onBlur={e=>e.target.style.borderColor=T.border} {...props}/>
);

const Sel = ({ children, ...p }) => (
  <select style={{ width:"100%", padding:"10px 12px", borderRadius:8, background:T.bg, border:`1px solid ${T.border}`, color:T.text, fontSize:13, outline:"none", cursor:"pointer" }} {...p}>{children}</select>
);

function RoleBadge({ role }) {
  const r = ROLES[role] || ROLES.agent;
  return (
    <span style={{ fontSize:9, fontWeight:700, letterSpacing:.5, padding:"2px 8px", borderRadius:20, background:`${r.color}18`, border:`1px solid ${r.color}35`, color:r.color, textTransform:"uppercase", whiteSpace:"nowrap" }}>{r.label}</span>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", fontSize:10, fontWeight:700, letterSpacing:"1.1px", textTransform:"uppercase", color:T.muted, marginBottom:7 }}>{label}</label>
      {children}
    </div>
  );
}

// ── Create / Edit Modal ───────────────────────────────────────────────
function UserModal({ mode, existing, onClose, onSuccess }) {
  const blank = { name:"", email:"", password:"", role:"agent", team:"Sales" };
  const [form,    setForm]    = useState(existing ? { name:existing.displayName||"", email:existing.email||"", password:"", role:existing.role||"agent", team:existing.team||"Sales" } : blank);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const submit = async () => {
    setError("");
    if (!form.name.trim())  { setError("Name is required."); return; }
    if (mode === "create") {
      if (!form.email.trim())      { setError("Email is required."); return; }
      if (form.password.length < 6){ setError("Password must be at least 6 characters."); return; }
    }
    setLoading(true);
    try {
      if (mode === "create") {
        const cred = await createUserWithEmailAndPassword(secondaryAuth, form.email.trim(), form.password);
        const uid  = cred.user.uid;
        await setDoc(doc(db, "users", uid), {
          uid, displayName:form.name.trim(), email:form.email.trim().toLowerCase(),
          role:form.role, team:form.team, active:true, createdAt:new Date().toISOString(),
        });
        await secondaryAuth.signOut();
        onSuccess(`✓ ${form.name} created — ${form.email} / ${form.password}`);
      } else {
        await updateDoc(doc(db, "users", existing.uid), {
          displayName:form.name.trim(), role:form.role, team:form.team,
        });
        onSuccess(`✓ ${form.name} updated`);
      }
      onClose();
    } catch (err) {
      const MSGS = {
        "auth/email-already-in-use": "This email already has an account.",
        "auth/invalid-email":        "Invalid email format.",
        "auth/weak-password":        "Password too weak.",
      };
      setError(MSGS[err.code] || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.72)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, backdropFilter:"blur(4px)" }}>
      <div style={{ background:`linear-gradient(145deg,${T.surface},${T.s2})`, border:`1px solid ${T.orange}22`, borderRadius:20, padding:"26px 26px 22px", width:"100%", maxWidth:440, boxShadow:"0 40px 80px rgba(0,0,0,.6)", animation:"fadeUp .2s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div>
            <div style={{ fontFamily:"Playfair Display,serif", fontSize:19, fontWeight:900, color:T.text }}>{mode==="create"?"Create New User":"Edit User"}</div>
            <div style={{ fontSize:10, color:T.faint, marginTop:3 }}>{mode==="create"?"User can log in immediately":"Changes take effect on next login"}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:T.faint, cursor:"pointer", fontSize:20 }}>✕</button>
        </div>

        <Field label="Full Name"><Inp value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Rahul Kumar"/></Field>

        {mode==="create" && <>
          <Field label="Work Email"><Inp type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="rahul@company.com"/></Field>
          <Field label="Password">
            <Inp type="text" value={form.password} onChange={e=>set("password",e.target.value)} placeholder="Min 6 characters"/>
            <div style={{ fontSize:10, color:T.faint, marginTop:4 }}>⚠ Share this password with the user securely</div>
          </Field>
        </>}

        <Field label="Role">
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {Object.entries(ROLES).map(([k,r])=>(
              <label key={k} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"9px 12px", borderRadius:8, background:form.role===k?`${r.color}10`:T.bg, border:`1px solid ${form.role===k?r.color+"40":T.border}`, cursor:"pointer", transition:"all .15s" }}>
                <input type="radio" checked={form.role===k} onChange={()=>set("role",k)} style={{ marginTop:2, accentColor:r.color }}/>
                <div><div style={{ fontSize:12, fontWeight:700, color:r.color }}>{r.label}</div><div style={{ fontSize:10, color:T.faint, marginTop:2 }}>{r.desc}</div></div>
              </label>
            ))}
          </div>
        </Field>

        <Field label="Team"><Sel value={form.team} onChange={e=>set("team",e.target.value)}>{TEAMS.map(t=><option key={t}>{t}</option>)}</Sel></Field>

        {error && <div style={{ background:`${T.red}0a`, border:`1px solid ${T.red}30`, borderRadius:8, padding:"9px 12px", color:T.red, fontSize:12, marginBottom:10 }}>⚠ {error}</div>}

        <div style={{ display:"flex", gap:9, marginTop:18 }}>
          <button onClick={onClose} style={{ flex:1, padding:"11px 0", borderRadius:9, background:"transparent", color:T.muted, border:`1px solid ${T.border}`, fontSize:13, fontWeight:600, cursor:"pointer" }}>Cancel</button>
          <button onClick={submit} disabled={loading} style={{ flex:2, padding:"11px 0", borderRadius:9, background:`linear-gradient(135deg,${T.orange},#ff8f5e)`, color:"#fff", border:"none", fontSize:13, fontWeight:700, cursor:"pointer", opacity:loading?.7:1, boxShadow:`0 0 18px ${T.orange}25` }}>
            {loading
              ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}><span style={{ width:13, height:13, borderRadius:"50%", border:"2px solid rgba(255,255,255,.3)", borderTopColor:"#fff", animation:"spin .6s linear infinite", display:"inline-block" }}/>{mode==="create"?"Creating…":"Saving…"}</span>
              : mode==="create" ? "Create User →" : "Save Changes →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────
export default function UserManagement({ currentUser }) {
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);
  const [editUser,  setEditUser]  = useState(null);
  const [toast,     setToast]     = useState("");
  const [filter,    setFilter]    = useState("all");
  const [search,    setSearch]    = useState("");
  const [roleEdit,  setRoleEdit]  = useState(null);

  const showToast = m => { setToast(m); setTimeout(()=>setToast(""),3500); };

  useEffect(()=>{
    setLoading(true);
    const unsub = onSnapshot(collection(db,"users"), snap=>{
      setUsers(snap.docs.map(d=>({ uid:d.id, ...d.data() })));
      setLoading(false);
    }, ()=>setLoading(false));
    return ()=>unsub();
  },[]);

  const toggleActive = async u => {
    await updateDoc(doc(db,"users",u.uid),{ active:!u.active });
    showToast(`${u.active?"⊘ Deactivated":"✓ Reactivated"} — ${u.displayName||u.email}`);
  };

  const changeRole = async (uid, role) => {
    await updateDoc(doc(db,"users",uid),{ role });
    setRoleEdit(null);
    showToast(`✓ Role updated`);
  };

  const visible = users.filter(u=>{
    const mf = filter==="all"||(filter==="inactive"?u.active===false:u.role===filter);
    const ms = !search||(u.displayName||"").toLowerCase().includes(search.toLowerCase())||(u.email||"").toLowerCase().includes(search.toLowerCase());
    return mf&&ms;
  });

  const stats = {
    total:      users.length,
    supervisors:users.filter(u=>u.role==="supervisor").length,
    leads:      users.filter(u=>u.role==="team_lead").length,
    agents:     users.filter(u=>u.role==="agent").length,
    inactive:   users.filter(u=>u.active===false).length,
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"auto" }}>
      {/* Header */}
      <div style={{ padding:"10px 18px", borderBottom:`1px solid ${T.border}`, background:"#0a0e18", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div style={{ fontFamily:"Playfair Display,serif", fontSize:13, fontWeight:700, color:T.text }}>Team & Access</div>
        <button onClick={()=>setModal("create")} style={{ display:"flex", alignItems:"center", gap:7, padding:"7px 15px", borderRadius:8, background:T.orange, color:"#fff", border:"none", fontSize:12, fontWeight:700, cursor:"pointer", boxShadow:`0 0 14px ${T.orange}25` }}>
          + Add User
        </button>
      </div>

      <div style={{ padding:14, display:"flex", flexDirection:"column", gap:14 }}>

        {/* Stats */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
          {[["Total",stats.total,T.text],["Supervisors",stats.supervisors,T.orange],["Team Leads",stats.leads,T.blue],["Agents",stats.agents,T.green],["Inactive",stats.inactive,T.faint]].map(([l,v,c])=>(
            <Panel key={l} style={{ padding:"12px 14px" }}>
              <div style={{ fontSize:8, color:T.faint, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginBottom:5 }}>{l}</div>
              <div style={{ fontFamily:"Playfair Display,serif", fontSize:26, fontWeight:900, color:c, lineHeight:1 }}>{v}</div>
            </Panel>
          ))}
        </div>

        {/* Search + filters */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or email…"
            style={{ flex:1, padding:"8px 12px", background:T.surface, border:`1px solid ${T.border}`, borderRadius:8, color:T.text, fontSize:13, outline:"none" }}
            onFocus={e=>e.target.style.borderColor=T.orange} onBlur={e=>e.target.style.borderColor=T.border}/>
          <div style={{ display:"flex", gap:5 }}>
            {[["all","All"],["supervisor","Supervisors"],["team_lead","Leads"],["agent","Agents"],["inactive","Inactive"]].map(([k,l])=>(
              <button key={k} onClick={()=>setFilter(k)} style={{ padding:"5px 10px", borderRadius:20, fontSize:10, fontWeight:600, cursor:"pointer", background:filter===k?T.orange:T.surface, color:filter===k?"#fff":T.muted, border:`1px solid ${filter===k?T.orange:T.border}`, transition:"all .15s" }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <Panel style={{ padding:0, overflow:"hidden" }}>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr 130px", padding:"9px 14px", borderBottom:`1px solid ${T.border}`, background:"rgba(0,0,0,.15)" }}>
            {["Name","Email","Role","Team","Status","Actions"].map(h=><div key={h} style={{ fontSize:8, fontWeight:700, letterSpacing:1.5, color:T.faint, textTransform:"uppercase" }}>{h}</div>)}
          </div>

          {loading ? (
            <div style={{ padding:"32px", textAlign:"center", color:T.faint }}>
              <div style={{ width:18, height:18, borderRadius:"50%", border:`2px solid ${T.orange}20`, borderTopColor:T.orange, animation:"spin .7s linear infinite", margin:"0 auto 10px" }}/>
              Loading team data…
            </div>
          ) : visible.length === 0 ? (
            <div style={{ padding:"32px", textAlign:"center", color:T.faint, fontSize:13 }}>
              {users.length === 0
                ? <>No users yet — <button onClick={()=>setModal("create")} style={{ color:T.orange, background:"none", border:"none", cursor:"pointer", fontWeight:700 }}>create the first one →</button></>
                : `No results for "${search || filter}"`
              }
            </div>
          ) : visible.map((u,i)=>{
            const inactive = u.active === false;
            const isMe     = u.uid === currentUser?.uid;
            const rc       = ROLES[u.role]?.color || T.green;
            return (
              <div key={u.uid} style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr 130px", padding:"11px 14px", borderBottom:i<visible.length-1?`1px solid ${T.border}`:"none", opacity:inactive?.5:1, background:"transparent", transition:"all .15s" }}
                onMouseEnter={e=>!inactive&&(e.currentTarget.style.background="rgba(255,255,255,.015)")} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>

                {/* Name */}
                <div style={{ display:"flex", alignItems:"center", gap:8, paddingRight:6 }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:`${rc}18`, border:`1px solid ${rc}40`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Playfair Display,serif", fontWeight:900, fontSize:11, color:rc, flexShrink:0 }}>
                    {(u.displayName||u.email||"?").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ fontSize:12, fontWeight:700, color:T.text }}>{u.displayName||"—"}{isMe&&<span style={{ fontSize:8, color:T.faint, marginLeft:5, background:"rgba(255,255,255,.05)", padding:"1px 5px", borderRadius:3 }}>YOU</span>}</div>
                </div>

                {/* Email */}
                <div style={{ fontSize:11, color:T.muted, display:"flex", alignItems:"center", overflow:"hidden" }}>
                  <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.email||"—"}</span>
                </div>

                {/* Role */}
                <div style={{ display:"flex", alignItems:"center" }}>
                  {roleEdit===u.uid && !isMe
                    ? <select value={u.role} onChange={e=>changeRole(u.uid,e.target.value)} autoFocus
                        style={{ background:T.bg, color:ROLES[u.role]?.color||T.green, border:`1px solid ${T.border}`, borderRadius:6, padding:"4px 7px", fontSize:10, fontWeight:700, outline:"none", cursor:"pointer" }}>
                        {Object.entries(ROLES).map(([k,r])=><option key={k} value={k}>{r.label}</option>)}
                      </select>
                    : <RoleBadge role={u.role}/>
                  }
                </div>

                {/* Team */}
                <div style={{ fontSize:11, color:T.muted, display:"flex", alignItems:"center" }}>{u.team||"—"}</div>

                {/* Status */}
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <div style={{ width:5, height:5, borderRadius:"50%", background:inactive?T.faint:T.green, boxShadow:inactive?"none":`0 0 4px ${T.green}` }}/>
                  <span style={{ fontSize:10, color:inactive?T.faint:T.green, fontWeight:600 }}>{inactive?"Inactive":"Active"}</span>
                </div>

                {/* Actions */}
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  {!isMe && <>
                    <button onClick={()=>setRoleEdit(roleEdit===u.uid?null:u.uid)}
                      style={{ padding:"4px 7px", background:`${T.blue}0f`, color:T.blue, border:`1px solid ${T.blue}25`, borderRadius:5, fontSize:9, fontWeight:700, cursor:"pointer" }}>Role</button>
                    <button onClick={()=>{setEditUser(u);setModal("edit")}}
                      style={{ padding:"4px 7px", background:`${T.orange}0f`, color:T.orange, border:`1px solid ${T.orange}25`, borderRadius:5, fontSize:9, fontWeight:700, cursor:"pointer" }}>Edit</button>
                    <button onClick={()=>toggleActive(u)}
                      style={{ padding:"4px 7px", background:inactive?`${T.green}0f`:`${T.red}08`, color:inactive?T.green:T.red, border:`1px solid ${inactive?T.green:T.red}25`, borderRadius:5, fontSize:9, fontWeight:700, cursor:"pointer" }}>
                      {inactive?"On":"Off"}
                    </button>
                  </>}
                </div>
              </div>
            );
          })}
        </Panel>

        {/* Role permissions legend */}
        <Panel>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", color:T.faint, marginBottom:12 }}>Role Permissions</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
            {Object.entries(ROLES).map(([k,r])=>(
              <div key={k} style={{ background:T.bg, borderRadius:9, padding:"12px 13px", border:`1px solid ${r.color}30` }}>
                <div style={{ fontSize:11, fontWeight:700, color:r.color, marginBottom:8 }}>{r.label}</div>
                {[["📞 My Desk",true],["📊 Live Dashboard",k!=="agent"],["📋 Campaigns",k==="supervisor"],["🌳 IVR Builder",k==="supervisor"],["👥 Team & Access",k==="supervisor"]].map(([p,a])=>(
                  <div key={p} style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:a?T.muted:T.faint, marginBottom:3 }}>
                    <span style={{ color:a?T.green:T.faint, fontSize:9 }}>{a?"✓":"✗"}</span>{p}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {modal==="create" && <UserModal mode="create" onClose={()=>setModal(null)} onSuccess={showToast}/>}
      {modal==="edit"   && <UserModal mode="edit" existing={editUser} onClose={()=>{setModal(null);setEditUser(null)}} onSuccess={showToast}/>}

      {toast && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:T.surface, border:`1px solid ${T.orange}40`, borderRadius:10, padding:"11px 20px", fontSize:13, fontWeight:700, color:T.orange, boxShadow:"0 8px 24px rgba(0,0,0,.5)", zIndex:999, animation:"fadeUp .3s ease", whiteSpace:"nowrap" }}>
          {toast}
        </div>
      )}

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin   { to { transform:rotate(360deg); } }
      `}</style>
    </div>
  );
}
