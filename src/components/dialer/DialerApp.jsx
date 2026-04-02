import { useState, useEffect, useRef } from "react";

// ── Design tokens ─────────────────────────────────────────────────────
const T = {
  bg: "#07090f", surface: "#0e1422", surface2: "#131a2e",
  border: "rgba(255,255,255,0.07)", borderHover: "rgba(255,255,255,0.13)",
  orange: "#ff6b35", green: "#22d38a", blue: "#5b8af7",
  amber: "#f5a623", red: "#f04060", purple: "#a855f7",
  text: "#e8edf8", muted: "#8a97b8", faint: "#3a4460",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:${T.bg};color:${T.text};font-family:'DM Sans',sans-serif;font-size:14px;overflow:hidden}
  ::-webkit-scrollbar{width:4px;height:4px}
  ::-webkit-scrollbar-track{background:${T.bg}}
  ::-webkit-scrollbar-thumb{background:#1a2540;border-radius:2px}
  ::selection{background:${T.orange};color:#fff}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
  input,select,textarea,button{font-family:'DM Sans',sans-serif}
`;

function fmt(s){return`${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`}

// ── Mock data ──────────────────────────────────────────────────────────
const MOCK_AGENTS=[
  {id:1,name:"Rahul Kumar",  email:"rahul@opslyft.com",  status:"On Call",  callTime:247,calls:18,qa:9.1,role:"agent",team:"Sales",   active:true},
  {id:2,name:"Priya Sharma", email:"priya@opslyft.com",  status:"Wrap Up",  callTime:0,  calls:14,qa:8.4,role:"agent",team:"Support", active:true},
  {id:3,name:"Amit Mehta",   email:"amit@opslyft.com",   status:"On Call",  callTime:82, calls:11,qa:6.8,role:"agent",team:"Sales",   active:true},
  {id:4,name:"Kavya Rao",    email:"kavya@opslyft.com",  status:"Available",callTime:0,  calls:16,qa:8.9,role:"agent",team:"Billing", active:true},
  {id:5,name:"Deepak Singh", email:"deepak@opslyft.com", status:"Break",    callTime:0,  calls:9, qa:7.2,role:"team_lead",team:"Support",active:true},
  {id:6,name:"Sunita Nair",  email:"sunita@opslyft.com", status:"On Call",  callTime:394,calls:20,qa:9.3,role:"agent",team:"Sales",   active:true},
  {id:7,name:"Karan Mehta",  email:"karan@opslyft.com",  status:"Offline",  callTime:0,  calls:0, qa:0,  role:"agent",team:"General",active:false},
  {id:8,name:"Neha Gupta",   email:"neha@opslyft.com",   status:"On Call",  callTime:115,calls:13,qa:7.6,role:"agent",team:"Retention",active:true},
];
const QUEUE=[{wait:52,from:"+91 99xx1234",camp:"Q3 Outbound"},{wait:23,from:"+91 88xx5678",camp:"Q3 Outbound"},{wait:8,from:"+91 77xx9012",camp:"Inbound Support"}];
const HOURLY=[9,11,14,13,16,18,15,12].map((v,i)=>({h:`${9+i}`,v}));
const CAMPAIGNS=[
  {id:1,name:"Q3 Outbound — Mumbai",status:"Running",  mode:"Progressive",total:500,called:312,conv:68,agents:6},
  {id:2,name:"Renewal Follow-Up",   status:"Paused",   mode:"Preview",    total:180,called:90, conv:22,agents:3},
  {id:3,name:"Cold Delhi Outbound", status:"Draft",    mode:"Predictive", total:800,called:0,  conv:0, agents:0},
  {id:4,name:"Inbound Support Q2",  status:"Completed",mode:"Preview",    total:240,called:240,conv:54,agents:4},
];
const STATUS_COLOR={"On Call":T.green,"Available":T.blue,"Wrap Up":T.purple,"Break":T.amber,"Offline":T.faint};
const ROLE_COLOR={supervisor:T.orange,team_lead:T.blue,agent:T.green};
const ROLES={supervisor:{label:"Supervisor",desc:"Full access"},team_lead:{label:"Team Lead",desc:"Dashboard + desk"},agent:{label:"Agent",desc:"My desk only"}};
const TEAMS=["Sales","Support","Retention","Billing","Collections","General"];
const DISP=[{code:"INT",label:"Interested",c:T.green},{code:"CB",label:"Callback",c:T.amber},{code:"NI",label:"Not Interested",c:T.red},{code:"DND",label:"DND",c:T.purple},{code:"NA",label:"No Answer",c:T.muted},{code:"BUSY",label:"Busy",c:"#f97316"}];
const IVR_TYPES={start:{label:"Start",icon:"▶",c:T.green},greeting:{label:"Greeting",icon:"◉",c:T.blue},menu:{label:"Key Menu",icon:"⌨",c:T.orange},transfer:{label:"Transfer",icon:"→",c:T.amber},hangup:{label:"Hang Up",icon:"✕",c:T.red}};
const INIT_NODES=[
  {id:"n1",type:"start",   x:60, y:180,props:{}},
  {id:"n2",type:"greeting",x:260,y:180,props:{message:"Thank you for calling OpsLyft. Please listen carefully."}},
  {id:"n3",type:"menu",    x:480,y:180,props:{prompt:"For sales press 1. For support press 2.",options:{"1":"Sales","2":"Support"}}},
  {id:"n4",type:"transfer",x:700,y:90, props:{queue:"Sales Queue"}},
  {id:"n5",type:"hangup",  x:700,y:280,props:{message:"Thank you. Goodbye!"}},
];
const INIT_EDGES=[
  {id:"e1",from:"n1",to:"n2",label:""},
  {id:"e2",from:"n2",to:"n3",label:""},
  {id:"e3",from:"n3",to:"n4",label:"Press 1"},
  {id:"e4",from:"n3",to:"n5",label:"No input"},
];
const NW=148,NH=56;

// ── Reusable UI pieces ────────────────────────────────────────────────
const Panel=({children,style={}})=>(
  <div style={{background:`linear-gradient(145deg,${T.surface},${T.surface2})`,border:`1px solid ${T.border}`,borderRadius:12,padding:16,...style}}>{children}</div>
);
const Badge=({role})=>{const r=ROLES[role]||ROLES.agent;const c=ROLE_COLOR[role]||T.green;return<span style={{fontSize:9,fontWeight:700,letterSpacing:.5,padding:"2px 8px",borderRadius:20,background:c+"18",border:`1px solid ${c}35`,color:c,textTransform:"uppercase",whiteSpace:"nowrap"}}>{r.label}</span>};
const StatusDot=({status,pulse=false})=>{const c=STATUS_COLOR[status]||T.faint;return<div style={{width:7,height:7,borderRadius:"50%",background:c,boxShadow:pulse?`0 0 6px ${c}`:"none",flexShrink:0,animation:pulse&&status==="On Call"?"pulse 2s infinite":"none"}}/>};
const Btn=({children,onClick,variant="ghost",style={},...p})=>{
  const base={padding:"8px 14px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",transition:"all .15s",border:"1px solid",fontFamily:"DM Sans,sans-serif"};
  const variants={
    primary:{background:T.orange,color:"#fff",borderColor:T.orange,boxShadow:`0 0 14px ${T.orange}35`},
    ghost:{background:"transparent",color:T.muted,borderColor:T.border},
    danger:{background:`${T.red}12`,color:T.red,borderColor:`${T.red}30`},
    success:{background:`${T.green}12`,color:T.green,borderColor:`${T.green}30`},
  };
  return<button onClick={onClick} style={{...base,...variants[variant],...style}} {...p}>{children}</button>
};
const Field=({label,children})=><div style={{marginBottom:14}}><label style={{display:"block",fontSize:10,fontWeight:700,letterSpacing:"1.1px",textTransform:"uppercase",color:T.muted,marginBottom:6}}>{label}</label>{children}</div>;
const Input=({...p})=><input style={{width:"100%",padding:"10px 12px",borderRadius:8,background:T.bg,border:`1px solid ${T.border}`,color:T.text,fontSize:13,outline:"none",boxSizing:"border-box",transition:"border-color .2s"}} onFocus={e=>e.target.style.borderColor=T.orange} onBlur={e=>e.target.style.borderColor=T.border} {...p}/>;
const Select=({children,...p})=><select style={{width:"100%",padding:"10px 12px",borderRadius:8,background:T.bg,border:`1px solid ${T.border}`,color:T.text,fontSize:13,outline:"none",cursor:"pointer"}} {...p}>{children}</select>;
const Toast=({msg})=>msg?<div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:T.surface,border:`1px solid ${T.orange}50`,borderRadius:10,padding:"11px 20px",fontSize:13,fontWeight:700,color:T.orange,boxShadow:"0 8px 24px rgba(0,0,0,.5)",zIndex:999,animation:"fadeUp .3s ease",whiteSpace:"nowrap"}}>{msg}</div>:null;

// ══════════════════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════════════════
function LoginScreen({onLogin}){
  const [email,setEmail]=useState("");const [pw,setPw]=useState("");const [err,setErr]=useState("");const [show,setShow]=useState(false);const [loading,setLoading]=useState(false);
  const users=[
    {email:"supervisor@opslyft.com",password:"super123",role:"supervisor",name:"Abhishek Gaur"},
    {email:"teamlead@opslyft.com",  password:"lead123", role:"team_lead", name:"Pinki Kumari"},
    {email:"agent@opslyft.com",     password:"agent123",role:"agent",     name:"Rahul Kumar"},
  ];
  const handleLogin=e=>{
    e.preventDefault();setLoading(true);setErr("");
    setTimeout(()=>{
      const u=users.find(u=>u.email===email.trim().toLowerCase()&&u.password===pw);
      if(u){onLogin(u)}else{setErr("Invalid email or password.");setLoading(false);}
    },800);
  };
  return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:T.bg,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",inset:0,backgroundImage:`linear-gradient(${T.orange}05 1px,transparent 1px),linear-gradient(90deg,${T.orange}05 1px,transparent 1px)`,backgroundSize:"36px 36px"}}/>
      <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:400,background:`linear-gradient(145deg,${T.surface},${T.surface2})`,border:`1px solid ${T.orange}20`,borderRadius:20,padding:"38px 34px",boxShadow:"0 40px 80px rgba(0,0,0,.5)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:28}}>
          <div style={{width:40,height:40,borderRadius:11,background:`linear-gradient(135deg,${T.orange},#ff8f5e)`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Playfair Display,serif",fontWeight:900,fontSize:19,color:"#fff",boxShadow:`0 0 18px ${T.orange}40`}}>O</div>
          <div><div style={{fontSize:19,fontWeight:800,color:T.text}}>Ops<span style={{color:T.orange}}>Lyft</span></div><div style={{fontSize:10,color:T.faint}}>Contact Centre Platform</div></div>
        </div>
        <h2 style={{fontSize:24,fontWeight:700,color:T.text,marginBottom:8,fontFamily:"Playfair Display,serif",lineHeight:1.3}}>Sign in to your<br/><em style={{color:T.orange,fontStyle:"italic"}}>dialer workspace</em></h2>
        <p style={{fontSize:12,color:T.faint,marginBottom:22}}>Use the demo credentials below to explore.</p>
        <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:20,padding:"12px",background:"rgba(255,107,53,.05)",border:`1px solid ${T.orange}20`,borderRadius:9}}>
          {[["Supervisor","supervisor@opslyft.com","super123"],["Team Lead","teamlead@opslyft.com","lead123"],["Agent","agent@opslyft.com","agent123"]].map(([r,e,p])=>(
            <div key={r} onClick={()=>{setEmail(e);setPw(p)}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",padding:"5px 8px",borderRadius:6,transition:"background .15s"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,107,53,.08)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <span style={{fontSize:11,fontWeight:700,color:ROLE_COLOR[r.toLowerCase().replace(" ","_")]||T.orange}}>{r}</span>
              <span style={{fontSize:10,color:T.faint,fontFamily:"DM Mono,monospace"}}>{e}</span>
            </div>
          ))}
        </div>
        <form onSubmit={handleLogin} style={{display:"flex",flexDirection:"column",gap:13}}>
          <Field label="Work Email"><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@opslyft.com"/></Field>
          <Field label="Password">
            <div style={{position:"relative"}}>
              <Input type={show?"text":"password"} value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" style={{paddingRight:52}}/>
              <button type="button" onClick={()=>setShow(!show)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:T.orange,cursor:"pointer",fontSize:11,fontWeight:700}}>{show?"Hide":"Show"}</button>
            </div>
          </Field>
          {err&&<div style={{background:`${T.red}0a`,border:`1px solid ${T.red}30`,borderRadius:8,padding:"9px 12px",color:T.red,fontSize:12}}>⚠ {err}</div>}
          <Btn variant="primary" style={{width:"100%",padding:13,fontSize:14}} onClick={handleLogin}>
            {loading?<span style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><span style={{width:13,height:13,borderRadius:"50%",border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",animation:"spin .6s linear infinite",display:"inline-block"}}/> Signing in…</span>:"Sign In →"}
          </Btn>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// SUPERVISOR DASHBOARD
// ══════════════════════════════════════════════════════════════════════
function AgentCard({a,onAction}){
  const isLive=a.status==="On Call";
  const c=STATUS_COLOR[a.status]||T.faint;
  const [t,setT]=useState(a.callTime);
  const [expanded,setExpanded]=useState(false);
  useEffect(()=>{if(!isLive)return;const id=setInterval(()=>setT(x=>x+1),1000);return()=>clearInterval(id);},[isLive]);
  return(
    <div style={{background:`linear-gradient(145deg,${T.surface},${T.surface2})`,border:`1px solid ${isLive?T.green+"30":T.border}`,borderRadius:12,padding:14,position:"relative",transition:"all .2s",cursor:"pointer"}}
      onClick={()=>setExpanded(!expanded)}
      onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
      {isLive&&<div style={{position:"absolute",top:0,left:0,right:0,height:2,background:T.green,borderRadius:"12px 12px 0 0"}}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:32,height:32,borderRadius:"50%",background:`linear-gradient(135deg,${c}22,${c}0a)`,border:`1px solid ${c}40`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Playfair Display,serif",fontWeight:900,fontSize:13,color:c}}>{a.name.charAt(0)}</div>
          <div><div style={{fontSize:13,fontWeight:700,color:T.text}}>{a.name}</div><div style={{fontSize:9,color:T.faint}}>{a.email.split("@")[0]}</div></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5}}><StatusDot status={a.status} pulse={isLive}/><span style={{fontSize:9,fontWeight:700,color:c}}>{a.status}</span></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5,marginBottom:isLive?9:0}}>
        {[[isLive?fmt(t):"—","Live",isLive?T.green:T.faint],[a.calls,"Calls",T.orange],[a.qa>0?a.qa.toFixed(1):"—","QA",a.qa>=8?T.green:a.qa>=6.5?T.amber:T.red]].map(([v,l,co])=>(
          <div key={l} style={{textAlign:"center",background:T.bg,borderRadius:6,padding:"6px 3px",border:`1px solid ${T.border}`}}>
            <div style={{fontFamily:"DM Mono,monospace",fontSize:14,fontWeight:700,color:co}}>{v}</div>
            <div style={{fontSize:7,color:T.faint,letterSpacing:1,textTransform:"uppercase",marginTop:1}}>{l}</div>
          </div>
        ))}
      </div>
      {isLive&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}} onClick={e=>e.stopPropagation()}>
        {[["👂","Monitor",T.blue],["📢","Barge",T.red],["💬","Whisper",T.green]].map(([ic,lb,co])=>(
          <button key={lb} onClick={()=>onAction(a,lb)} style={{padding:"5px 0",fontSize:9,fontWeight:700,background:co+"12",color:co,border:`1px solid ${co}30`,borderRadius:5,cursor:"pointer",transition:"all .15s"}}
            onMouseEnter={e=>e.currentTarget.style.background=co+"25"} onMouseLeave={e=>e.currentTarget.style.background=co+"12"}>{ic} {lb}</button>
        ))}
      </div>}
      {a.qa>0&&a.qa<7&&<div style={{marginTop:7,fontSize:9,color:T.amber,background:`${T.amber}0a`,border:`1px solid ${T.amber}25`,borderRadius:5,padding:"3px 7px"}}>⚡ QA dip — below 7.0</div>}
      {expanded&&(
        <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${T.border}`,animation:"fadeUp .2s ease"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[["Team","Sales"],["Shift","9AM–6PM"],["Avg Handle","3:42"],["Conv Rate","21%"]].map(([l,v])=>(
              <div key={l} style={{background:T.bg,borderRadius:6,padding:"7px 10px",border:`1px solid ${T.border}`}}>
                <div style={{fontSize:9,color:T.faint,textTransform:"uppercase",letterSpacing:1}}>{l}</div>
                <div style={{fontSize:12,fontWeight:700,color:T.muted,marginTop:2}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SupervisorDashboard(){
  const [agents,setAgents]=useState(MOCK_AGENTS);
  const [filter,setFilter]=useState("All");
  const [toast,setToast]=useState("");
  const [wt,setWt]=useState(0);
  useEffect(()=>{const t=setInterval(()=>setWt(x=>x+1),1000);const r=setInterval(()=>setWt(0),30000);return()=>{clearInterval(t);clearInterval(r);}},[]);
  const onAction=(a,action)=>{setToast(`${action} started — ${a.name}`);setTimeout(()=>setToast(""),3000)};
  const live=agents.filter(a=>a.status==="On Call").length;
  const avail=agents.filter(a=>a.status==="Available").length;
  const qaA=agents.filter(a=>a.qa>0);
  const avgQa=qaA.length?parseFloat((qaA.reduce((s,a)=>s+a.qa,0)/qaA.length).toFixed(1)):0;
  const total=agents.reduce((s,a)=>s+a.calls,0);
  const dip=agents.filter(a=>a.qa>0&&a.qa<7).length;
  const filtered=filter==="All"?agents:agents.filter(a=>a.status===filter);
  const maxH=Math.max(...HOURLY.map(d=>d.v));
  return(
    <div style={{height:"100%",overflow:"auto"}}>
      <div style={{padding:"10px 18px",borderBottom:`1px solid ${T.border}`,background:"#0a0e18",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{fontFamily:"Playfair Display,serif",fontSize:13,fontWeight:700,color:T.text}}>Supervisor Console</div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {dip>0&&<div style={{fontSize:9,color:T.amber,background:`${T.amber}0a`,border:`1px solid ${T.amber}25`,padding:"3px 9px",borderRadius:20,animation:"blink 2s infinite"}}>⚡ {dip} QA dip{dip>1?"s":""}</div>}
          <div style={{fontFamily:"DM Mono,monospace",fontSize:10,color:T.faint}}>Live · {wt}s ago</div>
        </div>
      </div>
      <div style={{padding:14,display:"flex",flexDirection:"column",gap:14}}>
        {/* Wallboard */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
          {[["Live Calls",live,T.green,"on call"],["Queue",QUEUE.length,T.amber,"waiting"],["Available",avail,T.blue,"ready"],["Total Calls",total,T.orange,"today"],["QA Avg",avgQa.toFixed(1),avgQa>=8?T.green:T.amber,"team score"]].map(([l,v,c,s])=>(
            <Panel key={l} style={{padding:"12px 14px"}}>
              <div style={{fontSize:8,color:T.faint,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>{l}</div>
              <div style={{fontFamily:"Playfair Display,serif",fontSize:28,fontWeight:900,color:c,lineHeight:1}}>{v}</div>
              <div style={{fontSize:9,color:T.faint,marginTop:3}}>{s}</div>
            </Panel>
          ))}
        </div>
        {/* Charts */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 260px",gap:12}}>
          <Panel>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:700,color:T.muted,letterSpacing:1,textTransform:"uppercase"}}>Calls by Hour</div>
              <div style={{fontFamily:"DM Mono,monospace",fontSize:10,color:T.orange}}>{total} total</div>
            </div>
            <div style={{display:"flex",alignItems:"flex-end",gap:5,height:56}}>
              {HOURLY.map((d,i)=>(
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                  <div style={{width:"100%",borderRadius:3,background:`rgba(255,107,53,${.15+(d.v/maxH)*.75})`,height:`${(d.v/maxH)*48}px`,minHeight:4,transition:"height .5s"}}/>
                  <div style={{fontSize:8,color:T.faint}}>{d.h}</div>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <div style={{fontSize:10,fontWeight:700,color:T.muted,letterSpacing:1,textTransform:"uppercase",marginBottom:10}}>Live Queue ({QUEUE.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {QUEUE.map((q,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:7}}>
                  <div><div style={{fontSize:10,color:T.text,fontFamily:"DM Mono,monospace"}}>{q.from}</div><div style={{fontSize:8,color:T.faint,marginTop:1}}>{q.camp}</div></div>
                  <div style={{fontFamily:"DM Mono,monospace",fontSize:13,fontWeight:700,color:q.wait>30?T.red:T.amber}}>{q.wait}s</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
        {/* Agent grid */}
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:700,color:T.muted,letterSpacing:1,textTransform:"uppercase"}}>Agent Grid ({filtered.length})</div>
            <div style={{display:"flex",gap:5}}>
              {["All","On Call","Available","Break","Offline"].map(f=>(
                <button key={f} onClick={()=>setFilter(f)} style={{padding:"4px 10px",borderRadius:20,fontSize:10,fontWeight:600,cursor:"pointer",background:filter===f?T.orange:"#0e1422",color:filter===f?"#fff":T.muted,border:`1px solid ${filter===f?T.orange:T.border}`,transition:"all .15s"}}>{f}</button>
              ))}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
            {filtered.map(a=><AgentCard key={a.id} a={a} onAction={onAction}/>)}
          </div>
        </div>
      </div>
      <Toast msg={toast}/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ══════════════════════════════════════════════════════════════════════
function UserManagement(){
  const [users,setUsers]=useState(MOCK_AGENTS.map(a=>({...a,uid:`uid_${a.id}`})));
  const [showCreate,setShowCreate]=useState(false);
  const [editUser,setEditUser]=useState(null);
  const [toast,setToast]=useState("");
  const [filter,setFilter]=useState("all");
  const [search,setSearch]=useState("");
  const showToast=m=>{setToast(m);setTimeout(()=>setToast(""),3000)};
  const filtered=users.filter(u=>{
    const mf=filter==="all"||(filter==="inactive"?u.active===false:u.role===filter);
    const ms=!search||(u.name||"").toLowerCase().includes(search.toLowerCase())||(u.email||"").toLowerCase().includes(search.toLowerCase());
    return mf&&ms;
  });
  const toggleActive=u=>{setUsers(us=>us.map(x=>x.uid===u.uid?{...x,active:!x.active}:x));showToast(`${u.active?"Deactivated":"Reactivated"} — ${u.name}`)};
  const changeRole=(uid,role)=>{setUsers(us=>us.map(x=>x.uid===uid?{...x,role}:x))};
  const stats={total:users.length,supervisors:users.filter(u=>u.role==="supervisor").length,leads:users.filter(u=>u.role==="team_lead").length,agents:users.filter(u=>u.role==="agent").length,inactive:users.filter(u=>u.active===false).length};
  return(
    <div style={{height:"100%",overflow:"auto"}}>
      <div style={{padding:"10px 18px",borderBottom:`1px solid ${T.border}`,background:"#0a0e18",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{fontFamily:"Playfair Display,serif",fontSize:13,fontWeight:700,color:T.text}}>Team & Access</div>
        <Btn variant="primary" onClick={()=>setShowCreate(true)} style={{padding:"7px 14px"}}>+ Add User</Btn>
      </div>
      <div style={{padding:14,display:"flex",flexDirection:"column",gap:14}}>
        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
          {[["Total",stats.total,T.text],["Supervisors",stats.supervisors,T.orange],["Team Leads",stats.leads,T.blue],["Agents",stats.agents,T.green],["Inactive",stats.inactive,T.faint]].map(([l,v,c])=>(
            <Panel key={l} style={{padding:"12px 14px"}}>
              <div style={{fontSize:8,color:T.faint,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>{l}</div>
              <div style={{fontFamily:"Playfair Display,serif",fontSize:26,fontWeight:900,color:c,lineHeight:1}}>{v}</div>
            </Panel>
          ))}
        </div>
        {/* Search + filter */}
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or email…"
            style={{flex:1,padding:"8px 12px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,color:T.text,fontSize:13,outline:"none"}}
            onFocus={e=>e.target.style.borderColor=T.orange} onBlur={e=>e.target.style.borderColor=T.border}/>
          <div style={{display:"flex",gap:5}}>
            {[["all","All"],["supervisor","Supervisors"],["team_lead","Leads"],["agent","Agents"],["inactive","Inactive"]].map(([k,l])=>(
              <button key={k} onClick={()=>setFilter(k)} style={{padding:"5px 10px",borderRadius:20,fontSize:10,fontWeight:600,cursor:"pointer",background:filter===k?T.orange:T.surface,color:filter===k?"#fff":T.muted,border:`1px solid ${filter===k?T.orange:T.border}`,transition:"all .15s"}}>{l}</button>
            ))}
          </div>
        </div>
        {/* Table */}
        <Panel style={{padding:0,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr 120px",padding:"9px 14px",borderBottom:`1px solid ${T.border}`,background:"rgba(0,0,0,.15)"}}>
            {["Name","Email","Role","Team","Status","Actions"].map(h=><div key={h} style={{fontSize:8,fontWeight:700,letterSpacing:1.5,color:T.faint,textTransform:"uppercase"}}>{h}</div>)}
          </div>
          {filtered.length===0?<div style={{padding:"32px",textAlign:"center",color:T.faint,fontSize:13}}>No users found — <button onClick={()=>setShowCreate(true)} style={{color:T.orange,background:"none",border:"none",cursor:"pointer",fontWeight:700}}>create one →</button></div>:
            filtered.map((u,i)=>(
              <div key={u.uid} style={{display:"grid",gridTemplateColumns:"2fr 2fr 1fr 1fr 1fr 120px",padding:"11px 14px",borderBottom:i<filtered.length-1?`1px solid ${T.border}`:"none",opacity:u.active===false?.5:1,transition:"all .15s",background:"transparent"}}
                onMouseEnter={e=>u.active!==false&&(e.currentTarget.style.background="rgba(255,255,255,.015)")} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,${ROLE_COLOR[u.role]||T.green}22,${ROLE_COLOR[u.role]||T.green}0a)`,border:`1px solid ${ROLE_COLOR[u.role]||T.green}40`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Playfair Display,serif",fontWeight:900,fontSize:11,color:ROLE_COLOR[u.role]||T.green,flexShrink:0}}>{u.name.charAt(0)}</div>
                  <span style={{fontSize:12,fontWeight:700,color:T.text}}>{u.name}</span>
                </div>
                <div style={{fontSize:11,color:T.muted,display:"flex",alignItems:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.email}</div>
                <div style={{display:"flex",alignItems:"center"}}><Badge role={u.role}/></div>
                <div style={{fontSize:11,color:T.muted,display:"flex",alignItems:"center"}}>{u.team||"—"}</div>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <StatusDot status={u.active===false?"Offline":"Available"}/>
                  <span style={{fontSize:10,color:u.active===false?T.faint:T.green,fontWeight:600}}>{u.active===false?"Inactive":"Active"}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <button onClick={()=>setEditUser(u)} style={{padding:"4px 8px",background:`${T.orange}12`,color:T.orange,border:`1px solid ${T.orange}30`,borderRadius:5,fontSize:9,fontWeight:700,cursor:"pointer"}}>Edit</button>
                  <button onClick={()=>toggleActive(u)} style={{padding:"4px 8px",background:u.active===false?`${T.green}12`:`${T.red}0a`,color:u.active===false?T.green:T.red,border:`1px solid ${u.active===false?T.green:T.red}30`,borderRadius:5,fontSize:9,fontWeight:700,cursor:"pointer"}}>{u.active===false?"On":"Off"}</button>
                </div>
              </div>
            ))
          }
        </Panel>
        {/* Permissions legend */}
        <Panel>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:T.faint,marginBottom:12}}>Role Permissions</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            {Object.entries(ROLES).map(([k,r])=>{const c=ROLE_COLOR[k]||T.green;return(
              <div key={k} style={{background:T.bg,borderRadius:9,padding:"12px 13px",border:`1px solid ${c}30`}}>
                <div style={{fontSize:11,fontWeight:700,color:c,marginBottom:8}}>{r.label}</div>
                {[["📞 My Desk",true],["📊 Dashboard",k!=="agent"],["📋 Campaigns",k==="supervisor"],["🌳 IVR Builder",k==="supervisor"],["👥 Team & Access",k==="supervisor"]].map(([p,a])=>(
                  <div key={p} style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:a?T.muted:T.faint,marginBottom:3}}>
                    <span style={{color:a?T.green:T.faint,fontSize:9}}>{a?"✓":"✗"}</span>{p}
                  </div>
                ))}
              </div>
            )})}
          </div>
        </Panel>
      </div>
      {(showCreate||editUser)&&<UserModal mode={showCreate?"create":"edit"} existing={editUser} onClose={()=>{setShowCreate(false);setEditUser(null)}} onSave={(data)=>{
        if(showCreate){
          const newU={...data,uid:`uid_${Date.now()}`,id:Date.now(),calls:0,qa:0,status:"Offline",callTime:0,active:true};
          setUsers(u=>[newU,...u]);showToast(`✓ ${data.name} created — ${data.email} / ${data.password}`);
        }else{
          setUsers(u=>u.map(x=>x.uid===editUser.uid?{...x,...data}:x));showToast(`✓ ${data.name} updated`);
        }
        setShowCreate(false);setEditUser(null);
      }}/>}
      <Toast msg={toast}/>
    </div>
  );
}

function UserModal({mode,existing,onClose,onSave}){
  const [form,setForm]=useState(existing?{name:existing.name||"",email:existing.email||"",password:"",role:existing.role||"agent",team:existing.team||"Sales"}:{name:"",email:"",password:"",role:"agent",team:"Sales"});
  const [err,setErr]=useState("");
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const submit=()=>{
    if(!form.name.trim()){setErr("Name is required.");return}
    if(mode==="create"&&!form.email.trim()){setErr("Email is required.");return}
    if(mode==="create"&&form.password.length<6){setErr("Password must be at least 6 characters.");return}
    onSave(form);
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,backdropFilter:"blur(4px)"}}>
      <div style={{background:`linear-gradient(145deg,${T.surface},${T.surface2})`,border:`1px solid ${T.orange}25`,borderRadius:20,padding:"26px 26px 22px",width:"100%",maxWidth:440,boxShadow:"0 40px 80px rgba(0,0,0,.6)",animation:"fadeUp .2s ease"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontFamily:"Playfair Display,serif",fontSize:19,fontWeight:900,color:T.text}}>{mode==="create"?"Create New User":"Edit User"}</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:T.faint,cursor:"pointer",fontSize:20}}>✕</button>
        </div>
        <Field label="Full Name"><Input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Rahul Kumar"/></Field>
        {mode==="create"&&<>
          <Field label="Work Email"><Input type="email" value={form.email} onChange={e=>set("email",e.target.value)} placeholder="rahul@opslyft.com"/></Field>
          <Field label="Password"><Input type="text" value={form.password} onChange={e=>set("password",e.target.value)} placeholder="Min 6 characters — share with the user"/></Field>
        </>}
        <Field label="Role">
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {Object.entries(ROLES).map(([k,r])=>{const c=ROLE_COLOR[k]||T.green;return(
              <label key={k} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"9px 12px",borderRadius:8,background:form.role===k?c+"10":T.bg,border:`1px solid ${form.role===k?c+"40":T.border}`,cursor:"pointer",transition:"all .15s"}}>
                <input type="radio" checked={form.role===k} onChange={()=>set("role",k)} style={{marginTop:2,accentColor:c}}/>
                <div><div style={{fontSize:12,fontWeight:700,color:c}}>{r.label}</div><div style={{fontSize:10,color:T.faint,marginTop:1}}>{r.desc}</div></div>
              </label>
            )})}
          </div>
        </Field>
        <Field label="Team"><Select value={form.team} onChange={e=>set("team",e.target.value)}>{TEAMS.map(t=><option key={t}>{t}</option>)}</Select></Field>
        {err&&<div style={{background:`${T.red}0a`,border:`1px solid ${T.red}30`,borderRadius:7,padding:"9px 12px",color:T.red,fontSize:12,marginBottom:10}}>⚠ {err}</div>}
        <div style={{display:"flex",gap:9,marginTop:18}}>
          <Btn variant="ghost" onClick={onClose} style={{flex:1}}>Cancel</Btn>
          <Btn variant="primary" onClick={submit} style={{flex:2}}>{mode==="create"?"Create User →":"Save Changes →"}</Btn>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// IVR BUILDER
// ══════════════════════════════════════════════════════════════════════
function IVRBuilder(){
  const [nodes,setNodes]=useState(INIT_NODES);
  const [edges]=useState(INIT_EDGES);
  const [sel,setSel]=useState(null);
  const [drag,setDrag]=useState(null);
  const [saved,setSaved]=useState(false);
  const [toast,setToast]=useState("");
  const svgRef=useRef(null);
  const selNode=nodes.find(n=>n.id===sel);
  const dragStart=(e,id)=>{e.stopPropagation();const r=svgRef.current.getBoundingClientRect();const n=nodes.find(x=>x.id===id);setDrag({id,ox:e.clientX-r.left-n.x,oy:e.clientY-r.top-n.y});setSel(id)};
  const onMove=e=>{if(!drag)return;const r=svgRef.current.getBoundingClientRect();setNodes(ns=>ns.map(n=>n.id===drag.id?{...n,x:Math.max(0,e.clientX-r.left-drag.ox),y:Math.max(0,e.clientY-r.top-drag.oy)}:n))};
  const onUp=()=>setDrag(null);
  const addNode=type=>{const id="n"+Date.now();setNodes(ns=>[...ns,{id,type,x:200+ns.length*20,y:120+ns.length*15,props:{}}]);setSel(id)};
  const delNode=()=>{if(!sel||sel==="n1")return;setNodes(ns=>ns.filter(n=>n.id!==sel));setSel(null)};
  const updateProp=(k,v)=>setNodes(ns=>ns.map(n=>n.id===sel?{...n,props:{...n.props,[k]:v}}:n));
  const save=()=>{setSaved(true);setToast("✓ Flow saved");setTimeout(()=>{setSaved(false);setToast("")},2500)};
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      <div style={{padding:"10px 16px",borderBottom:`1px solid ${T.border}`,background:"#0a0e18",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{fontFamily:"Playfair Display,serif",fontSize:13,fontWeight:700,color:T.text}}>IVR Flow Builder</div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {[["Nodes",nodes.length,T.orange],["Connections",edges.length,T.blue]].map(([l,v,c])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 9px",background:c+"0f",border:`1px solid ${c}25`,borderRadius:20}}>
              <span style={{fontFamily:"DM Mono,monospace",fontSize:11,fontWeight:700,color:c}}>{v}</span>
              <span style={{fontSize:9,color:T.faint}}>{l}</span>
            </div>
          ))}
          <Btn variant="primary" onClick={save} style={{padding:"6px 14px",background:saved?T.green:T.orange,boxShadow:"none"}}>{saved?"✓ Saved":"Save Flow"}</Btn>
        </div>
      </div>
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>
        {/* Palette */}
        <div style={{width:170,background:"#0a0e18",borderRight:`1px solid ${T.border}`,padding:10,display:"flex",flexDirection:"column",gap:5,overflow:"auto",flexShrink:0}}>
          <div style={{fontSize:8,fontWeight:700,letterSpacing:1.5,color:T.faint,textTransform:"uppercase",marginBottom:4}}>Add Node</div>
          {Object.entries(IVR_TYPES).filter(([k])=>k!=="start").map(([type,meta])=>(
            <button key={type} onClick={()=>addNode(type)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,cursor:"pointer",textAlign:"left",transition:"all .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=meta.c+"60";e.currentTarget.style.background=meta.c+"0a"}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.background=T.surface}}>
              <div style={{width:24,height:24,borderRadius:6,background:meta.c+"18",border:`1px solid ${meta.c}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:meta.c,flexShrink:0}}>{meta.icon}</div>
              <div style={{fontSize:10,fontWeight:700,color:T.text}}>{meta.label}</div>
            </button>
          ))}
          <div style={{marginTop:6,padding:"9px 10px",background:`${T.orange}06`,border:`1px solid ${T.orange}15`,borderRadius:7,fontSize:9,color:T.faint,lineHeight:1.6}}>
            <span style={{color:T.orange,fontWeight:700}}>Tip:</span> Drag nodes to reposition. Click to edit properties.
          </div>
        </div>
        {/* Canvas */}
        <div style={{flex:1,position:"relative",background:T.bg,overflow:"hidden"}}>
          <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}>
            <defs><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="rgba(255,255,255,.04)"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#dots)"/>
          </svg>
          <svg ref={svgRef} style={{width:"100%",height:"100%",cursor:drag?"grabbing":"default"}} onMouseMove={onMove} onMouseUp={onUp} onMouseDown={()=>setSel(null)}>
            {edges.map(e=>{
              const fn=nodes.find(n=>n.id===e.from),tn=nodes.find(n=>n.id===e.to);
              if(!fn||!tn)return null;
              const fx=fn.x+NW,fy=fn.y+NH/2,tx=tn.x,ty=tn.y+NH/2,mx=(fx+tx)/2;
              const path=`M ${fx} ${fy} C ${mx} ${fy}, ${mx} ${ty}, ${tx} ${ty}`;
              return(
                <g key={e.id}>
                  <path d={path} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={6}/>
                  <path d={path} fill="none" stroke={T.orange} strokeWidth={1.5} strokeDasharray="5,4" opacity={.5}/>
                  <circle cx={tn.x} cy={tn.y+NH/2} r={3.5} fill={T.orange} opacity={.7}/>
                  {e.label&&<text x={(fx+tx)/2} y={(fy+ty)/2-7} textAnchor="middle" fontSize={9} fill={T.orange} fontFamily="DM Sans,sans-serif" fontWeight={700} opacity={.8}>{e.label}</text>}
                </g>
              );
            })}
            {nodes.map(node=>{
              const meta=IVR_TYPES[node.type];const isSel=sel===node.id;
              return(
                <g key={node.id} transform={`translate(${node.x},${node.y})`} onMouseDown={e=>dragStart(e,node.id)} style={{cursor:"grab"}}>
                  <rect x={2} y={4} width={NW} height={NH} rx={9} fill={meta.c+"12"}/>
                  <rect x={0} y={0} width={NW} height={NH} rx={9} fill={T.surface} stroke={isSel?meta.c:T.border} strokeWidth={isSel?2:1}/>
                  <rect x={0} y={0} width={4} height={NH} rx={2} fill={meta.c}/>
                  <circle cx={28} cy={NH/2} r={12} fill={meta.c+"18"} stroke={meta.c+"40"} strokeWidth={1}/>
                  <text x={28} y={NH/2+5} textAnchor="middle" fontSize={12} fontFamily="DM Sans,sans-serif" fill={meta.c}>{meta.icon}</text>
                  <text x={46} y={NH/2-5} fontSize={10} fontWeight={700} fill={T.text} fontFamily="DM Sans,sans-serif">{meta.label}</text>
                  <text x={46} y={NH/2+9} fontSize={8} fill={T.faint} fontFamily="DM Sans,sans-serif">
                    {node.type==="menu"?`${Object.keys(node.props?.options||{}).length} opts`:
                     node.type==="transfer"?(node.props?.queue||"Queue"):
                     node.type==="start"?"Entry":""}
                  </text>
                  <circle cx={NW} cy={NH/2} r={4} fill={meta.c} stroke={T.surface} strokeWidth={1.5}/>
                  {node.type!=="start"&&<circle cx={0} cy={NH/2} r={4} fill={T.surface} stroke={meta.c+"60"} strokeWidth={1.5}/>}
                </g>
              );
            })}
          </svg>
          <div style={{position:"absolute",bottom:10,right:10,fontSize:8,color:T.faint,background:"#0a0e18",border:`1px solid ${T.border}`,borderRadius:5,padding:"3px 8px"}}>Drag nodes to reposition · Click to edit</div>
        </div>
        {/* Props panel */}
        <div style={{width:240,background:"#0a0e18",borderLeft:`1px solid ${T.border}`,flexShrink:0,overflow:"auto"}}>
          {!selNode?(
            <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:16,gap:6}}>
              <div style={{fontSize:28,opacity:.2}}>🌳</div>
              <div style={{color:T.faint,fontSize:11,textAlign:"center"}}>Select a node to edit its settings</div>
            </div>
          ):(
            <div>
              <div style={{padding:"12px 14px 10px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:26,height:26,borderRadius:6,background:IVR_TYPES[selNode.type].c+"18",border:`1px solid ${IVR_TYPES[selNode.type].c}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>{IVR_TYPES[selNode.type].icon}</div>
                  <div style={{fontSize:12,fontWeight:700,color:T.text}}>{IVR_TYPES[selNode.type].label}</div>
                </div>
                {selNode.type!=="start"&&<button onClick={delNode} style={{width:24,height:24,background:`${T.red}08`,border:`1px solid ${T.red}25`,borderRadius:6,color:T.red,cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>}
              </div>
              <div style={{padding:12,display:"flex",flexDirection:"column",gap:10}}>
                {selNode.type==="greeting"&&<>
                  <Field label="TTS Message"><textarea value={selNode.props.message||""} onChange={e=>updateProp("message",e.target.value)} style={{width:"100%",padding:"8px 10px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:7,color:T.text,fontSize:11,resize:"vertical",height:70,outline:"none",fontFamily:"DM Sans,sans-serif",boxSizing:"border-box"}}/></Field>
                  <Field label="Language"><Select value={selNode.props.language||"en-IN"} onChange={e=>updateProp("language",e.target.value)} style={{padding:"7px 10px",fontSize:11}}><option value="en-IN">English (India)</option><option value="hi-IN">Hindi</option><option value="ta-IN">Tamil</option></Select></Field>
                </>}
                {selNode.type==="menu"&&<>
                  <Field label="Prompt"><textarea value={selNode.props.prompt||""} onChange={e=>updateProp("prompt",e.target.value)} style={{width:"100%",padding:"8px 10px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:7,color:T.text,fontSize:11,resize:"vertical",height:60,outline:"none",fontFamily:"DM Sans,sans-serif",boxSizing:"border-box"}}/></Field>
                  <Field label="Key Options">
                    {Object.entries(selNode.props.options||{}).map(([k,v])=>(
                      <div key={k} style={{display:"flex",gap:5,alignItems:"center",marginBottom:5}}>
                        <div style={{width:24,height:24,borderRadius:5,background:`${T.orange}18`,border:`1px solid ${T.orange}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:T.orange,flexShrink:0}}>{k}</div>
                        <input value={v} onChange={e=>updateProp("options",{...selNode.props.options,[k]:e.target.value})} style={{flex:1,padding:"4px 7px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:6,color:T.text,fontSize:11,outline:"none"}}/>
                      </div>
                    ))}
                  </Field>
                </>}
                {selNode.type==="transfer"&&<Field label="Queue Name"><input value={selNode.props.queue||""} onChange={e=>updateProp("queue",e.target.value)} style={{width:"100%",padding:"8px 10px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:7,color:T.text,fontSize:12,outline:"none",boxSizing:"border-box"}}/></Field>}
                {selNode.type==="hangup"&&<Field label="Goodbye Message"><textarea value={selNode.props.message||""} onChange={e=>updateProp("message",e.target.value)} style={{width:"100%",padding:"8px 10px",background:T.bg,border:`1px solid ${T.border}`,borderRadius:7,color:T.text,fontSize:11,resize:"vertical",height:60,outline:"none",fontFamily:"DM Sans,sans-serif",boxSizing:"border-box"}}/></Field>}
                {selNode.type==="start"&&<div style={{color:T.faint,fontSize:11,lineHeight:1.7}}>Entry point of your IVR. Connect it to a Greeting or Menu node to begin the flow.<br/><br/><span style={{color:T.blue}}>Phone numbers</span> are assigned in the Exotel dashboard and mapped here.</div>}
              </div>
            </div>
          )}
        </div>
      </div>
      <Toast msg={toast}/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// CAMPAIGN MANAGER
// ══════════════════════════════════════════════════════════════════════
function CampaignManager(){
  const [camps,setCamps]=useState(CAMPAIGNS);
  const [toast,setToast]=useState("");
  const [filter,setFilter]=useState("All");
  const showToast=m=>{setToast(m);setTimeout(()=>setToast(""),2500)};
  const toggle=c=>{setCamps(cs=>cs.map(x=>x.id===c.id?{...x,status:c.status==="Running"?"Paused":c.status==="Paused"?"Running":"Running"}:x));showToast(`${c.status==="Running"?"Paused":"Resumed"} — ${c.name}`)};
  const filtered=filter==="All"?camps:camps.filter(c=>c.status===filter);
  const STATUS_META={Running:{c:T.green,bg:`${T.green}12`,b:`${T.green}30`},Paused:{c:T.amber,bg:`${T.amber}12`,b:`${T.amber}30`},Draft:{c:T.muted,bg:"rgba(138,151,184,.08)",b:"rgba(138,151,184,.2)"},Completed:{c:T.blue,bg:`${T.blue}12`,b:`${T.blue}30`}};
  return(
    <div style={{height:"100%",overflow:"auto"}}>
      <div style={{padding:"10px 18px",borderBottom:`1px solid ${T.border}`,background:"#0a0e18",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{fontFamily:"Playfair Display,serif",fontSize:13,fontWeight:700,color:T.text}}>Campaign Manager</div>
        <Btn variant="primary" style={{padding:"7px 14px"}}>+ New Campaign</Btn>
      </div>
      <div style={{padding:14,display:"flex",flexDirection:"column",gap:12}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {[["Active",camps.filter(c=>c.status==="Running").length,T.green],["Total Contacts",camps.reduce((s,c)=>s+c.total,0).toLocaleString(),T.orange],["Calls Made",camps.reduce((s,c)=>s+c.called,0).toLocaleString(),T.blue],["Converted",camps.reduce((s,c)=>s+c.conv,0),T.amber]].map(([l,v,c])=>(
            <Panel key={l} style={{padding:"12px 14px"}}>
              <div style={{fontSize:8,color:T.faint,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:5}}>{l}</div>
              <div style={{fontFamily:"Playfair Display,serif",fontSize:26,fontWeight:900,color:c,lineHeight:1}}>{v}</div>
            </Panel>
          ))}
        </div>
        <div style={{display:"flex",gap:5,alignItems:"center"}}>
          {["All","Running","Paused","Draft","Completed"].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{padding:"5px 11px",borderRadius:20,fontSize:10,fontWeight:600,cursor:"pointer",background:filter===f?T.orange:T.surface,color:filter===f?"#fff":T.muted,border:`1px solid ${filter===f?T.orange:T.border}`,transition:"all .15s"}}>{f}</button>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtered.map(c=>{
            const m=STATUS_META[c.status]||STATUS_META.Draft;const pct=c.total>0?Math.round(c.called/c.total*100):0;
            return(
              <Panel key={c.id} style={{transition:"all .2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=`${T.orange}25`} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                  <div>
                    <div style={{fontFamily:"Playfair Display,serif",fontSize:15,fontWeight:800,color:T.text,marginBottom:5}}>{c.name}</div>
                    <div style={{display:"flex",gap:7,alignItems:"center"}}>
                      <span style={{fontSize:9,fontWeight:700,letterSpacing:.5,padding:"2px 8px",borderRadius:20,background:m.bg,border:`1px solid ${m.b}`,color:m.c}}>{c.status}</span>
                      <span style={{fontSize:9,color:T.faint,fontWeight:600}}>· {c.mode} Dialer</span>
                    </div>
                  </div>
                  {c.status!=="Completed"&&<Btn variant={c.status==="Running"?"danger":"success"} onClick={()=>toggle(c)} style={{padding:"6px 13px"}}>{c.status==="Running"?"⏸ Pause":"▶ Resume"}</Btn>}
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:10,color:T.muted}}>Progress</span><span style={{fontFamily:"DM Mono,monospace",fontSize:10,color:T.orange}}>{c.called}/{c.total}</span></div>
                  <div style={{height:4,background:"rgba(255,255,255,.05)",borderRadius:4,overflow:"hidden"}}><div style={{width:`${pct}%`,height:"100%",background:T.orange,borderRadius:4,transition:"width .6s"}}/></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:7}}>
                  {[["Total",c.total,T.muted],["Called",c.called,T.orange],["Converted",c.conv,T.green],["Conv %",c.called>0?(c.conv/c.called*100).toFixed(1)+"%":"—",T.blue],["Agents",c.agents,T.amber]].map(([l,v,co])=>(
                    <div key={l} style={{textAlign:"center",background:T.bg,borderRadius:6,padding:"8px 4px",border:`1px solid ${T.border}`}}>
                      <div style={{fontFamily:"DM Mono,monospace",fontSize:13,fontWeight:700,color:co}}>{v}</div>
                      <div style={{fontSize:7,color:T.faint,letterSpacing:.8,textTransform:"uppercase",marginTop:2}}>{l}</div>
                    </div>
                  ))}
                </div>
              </Panel>
            );
          })}
        </div>
      </div>
      <Toast msg={toast}/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// AGENT DESKTOP
// ══════════════════════════════════════════════════════════════════════
function AgentDesktop({agent}){
  const [state,setState]=useState("idle");
  const [timer,setTimer]=useState(0);
  const [contact,setContact]=useState(null);
  const [muted,setMuted]=useState(false);
  const [hold,setHold]=useState(false);
  const [disp,setDisp]=useState(null);
  const [notes,setNotes]=useState("");
  const [step,setStep]=useState(0);
  const [agStat,setAgStat]=useState("Available");
  const [showDTMF,setShowDTMF]=useState(false);
  const [dtmf,setDtmf]=useState("");
  const tRef=useRef(null);
  const CONTACTS=[{name:"Rajesh Sharma",phone:"+91 98201 34567",company:"TechCorp",city:"Mumbai",prevCalls:2,lastIssue:"Billing query"},{name:"Priya Nair",phone:"+91 99871 23456",company:"Infosys",city:"Bangalore",prevCalls:0,lastIssue:"New enquiry"}];
  const [cidx,setCidx]=useState(0);
  useEffect(()=>{if(state==="active"){tRef.current=setInterval(()=>setTimer(t=>t+1),1000)}else{clearInterval(tRef.current);if(state==="idle")setTimer(0)}return()=>clearInterval(tRef.current)},[state]);
  const dial=()=>{const c=CONTACTS[cidx%CONTACTS.length];setContact(c);setState("ringing");setAgStat("On Call");setTimer(0);setStep(0);setTimeout(()=>setState("active"),2500)};
  const end=()=>{setState("wrap");setAgStat("Wrap Up");setHold(false);setMuted(false);setCidx(i=>i+1)};
  const done=()=>{setState("idle");setContact(null);setAgStat("Available");setTimer(0);setDisp(null);setNotes("")};
  const SCRIPTS=["Greet and confirm identity","Introduce reason for call","Identify customer need","Present solution / offer","Handle objections","Confirm next steps and close"];
  const S_COLOR={"Available":T.green,"On Call":T.amber,"Wrap Up":T.purple,"Break":"#f97316","Offline":T.faint};
  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 18px",borderBottom:`1px solid ${T.border}`,background:"#0a0e18"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg,${T.orange},#ff8f5e)`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Playfair Display,serif",fontWeight:900,fontSize:12,color:"#fff"}}>{agent.name.charAt(0)}</div>
          <div><div style={{fontSize:12,fontWeight:700,color:T.text}}>{agent.name}</div><div style={{fontSize:9,color:T.muted}}>Agent · {agent.email}</div></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:S_COLOR[agStat],boxShadow:`0 0 5px ${S_COLOR[agStat]}`}}/>
          <select value={agStat} onChange={e=>setAgStat(e.target.value)} style={{background:"#0e1422",color:T.text,border:`1px solid ${T.border}`,borderRadius:7,padding:"4px 9px",fontSize:11,cursor:"pointer",outline:"none"}}>
            {Object.keys(S_COLOR).map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"220px 1fr 200px",gap:12,padding:12,flex:1,minHeight:0,overflow:"auto"}}>
        {/* Left — softphone + disposition */}
        <div style={{display:"flex",flexDirection:"column",gap:10,overflow:"auto"}}>
          <Panel>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:state==="active"?T.green:state==="ringing"?T.amber:state==="hold"?"#f97316":T.faint,animation:state==="ringing"?"blink .8s infinite":"none"}}/>
                <span style={{fontSize:9,letterSpacing:1.5,textTransform:"uppercase",color:T.muted,fontWeight:700}}>{state==="idle"?"Ready":state==="ringing"?"Ringing…":state==="active"?"Live Call":state==="hold"?"On Hold":"Wrap Up"}</span>
              </div>
              <span style={{fontFamily:"DM Mono,monospace",fontSize:20,fontWeight:700,color:state==="active"?T.green:state==="hold"?T.amber:T.faint,letterSpacing:2}}>{fmt(timer)}</span>
            </div>
            {contact?<div style={{background:T.bg,borderRadius:7,padding:"9px 11px",marginBottom:12,border:`1px solid ${T.border}`}}>
              <div style={{fontSize:13,fontWeight:700,color:T.text,fontFamily:"Playfair Display,serif"}}>{contact.name}</div>
              <div style={{fontSize:10,color:T.orange,fontFamily:"DM Mono,monospace",marginTop:1}}>{contact.phone}</div>
            </div>:<div style={{background:T.bg,borderRadius:7,padding:"9px 11px",marginBottom:12,border:`1px solid ${T.border}`,textAlign:"center",color:T.faint,fontSize:11}}>No active contact</div>}
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
              {state==="idle"&&<button onClick={dial} style={{background:`linear-gradient(135deg,#059669,${T.green})`,color:"#fff",border:"none",borderRadius:8,padding:"10px 0",fontSize:12,fontWeight:700,cursor:"pointer",width:"100%",boxShadow:`0 0 14px ${T.green}25`}}>📞 DIAL NEXT</button>}
              {state==="ringing"&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                <button style={{background:`linear-gradient(135deg,#059669,${T.green})`,color:"#fff",border:"none",borderRadius:8,padding:"9px 0",fontSize:11,fontWeight:700,cursor:"pointer"}}>✓ Answer</button>
                <button onClick={end} style={{background:`${T.red}12`,color:T.red,border:`1px solid ${T.red}25`,borderRadius:8,padding:"9px 0",fontSize:11,fontWeight:700,cursor:"pointer"}}>✕ Reject</button>
              </div>}
              {(state==="active"||state==="hold")&&<>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                  <button onClick={()=>setMuted(!muted)} style={{padding:"8px 0",fontSize:10,fontWeight:700,background:muted?`${T.purple}15`:T.bg,color:muted?T.purple:T.muted,border:`1px solid ${muted?T.purple+"40":T.border}`,borderRadius:7,cursor:"pointer"}}>{muted?"🔇 Muted":"🎙 Mute"}</button>
                  <button onClick={()=>{setHold(!hold);setState(hold?"active":"hold")}} style={{padding:"8px 0",fontSize:10,fontWeight:700,background:hold?`${T.amber}12`:T.bg,color:hold?T.amber:T.muted,border:`1px solid ${hold?T.amber+"40":T.border}`,borderRadius:7,cursor:"pointer"}}>{hold?"▶ Resume":"⏸ Hold"}</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                  <button onClick={()=>setShowDTMF(!showDTMF)} style={{padding:"8px 0",fontSize:10,fontWeight:700,background:T.bg,color:T.muted,border:`1px solid ${T.border}`,borderRadius:7,cursor:"pointer"}}>⌨ Keypad</button>
                  <button style={{padding:"8px 0",fontSize:10,fontWeight:700,background:T.bg,color:T.blue,border:`1px solid ${T.blue}25`,borderRadius:7,cursor:"pointer"}}>↗ Transfer</button>
                </div>
                {showDTMF&&<div style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:9,padding:10}}>
                  <div style={{fontFamily:"DM Mono,monospace",fontSize:16,fontWeight:700,color:T.orange,textAlign:"right",marginBottom:8,minHeight:26,padding:"3px 8px",background:T.surface,borderRadius:5}}>{dtmf||"—"}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
                    {["1","2","3","4","5","6","7","8","9","*","0","#"].map(k=>(
                      <button key={k} onClick={()=>setDtmf(d=>d+k)} style={{padding:"8px 0",background:T.surface,border:`1px solid ${T.border}`,borderRadius:7,color:T.text,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"DM Mono,monospace"}}>{k}</button>
                    ))}
                  </div>
                  <button onClick={()=>setDtmf("")} style={{width:"100%",marginTop:6,padding:"5px",background:"transparent",border:`1px solid ${T.border}`,borderRadius:6,color:T.faint,fontSize:10,cursor:"pointer"}}>Clear</button>
                </div>}
                <button onClick={end} style={{background:`${T.red}12`,color:T.red,border:`1px solid ${T.red}25`,borderRadius:8,padding:"10px 0",fontSize:11,fontWeight:700,cursor:"pointer",width:"100%"}}>📵 END CALL</button>
              </>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5,paddingTop:10,borderTop:`1px solid ${T.border}`}}>
              {[["14","Calls"],["3:42","AHT"],["7.8","QA"]].map(([v,l])=>(
                <div key={l} style={{textAlign:"center"}}>
                  <div style={{fontFamily:"DM Mono,monospace",fontSize:15,fontWeight:700,color:T.text}}>{v}</div>
                  <div style={{fontSize:8,color:T.faint,letterSpacing:1,textTransform:"uppercase",marginTop:1}}>{l}</div>
                </div>
              ))}
            </div>
          </Panel>
          {/* Disposition */}
          <Panel style={{opacity:state==="wrap"?1:.45}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:9,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:T.faint}}>📌 Disposition</span>
              {state==="wrap"&&<span style={{fontSize:8,color:T.amber,fontWeight:700,animation:"blink 1.5s infinite"}}>● WRAP UP</span>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5,marginBottom:8}}>
              {DISP.map(d=>(
                <button key={d.code} disabled={state!=="wrap"} onClick={()=>setDisp(d.code)} style={{padding:"6px 3px",border:`1px solid ${disp===d.code?d.c:T.border}`,borderRadius:6,background:disp===d.code?d.c+"18":T.bg,color:disp===d.code?d.c:T.muted,fontSize:9,fontWeight:600,cursor:state==="wrap"?"pointer":"default",transition:"all .15s"}}>{d.label}</button>
              ))}
            </div>
            <textarea disabled={state!=="wrap"} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Add call notes…" style={{width:"100%",background:T.bg,color:T.muted,border:`1px solid ${T.border}`,borderRadius:6,padding:"7px 9px",fontSize:11,resize:"none",height:48,outline:"none",fontFamily:"DM Sans,sans-serif",boxSizing:"border-box"}}/>
            <button onClick={done} disabled={state!=="wrap"||!disp} style={{width:"100%",marginTop:7,padding:"10px 0",background:state==="wrap"&&disp?T.orange:"#0e1422",color:state==="wrap"&&disp?"#fff":T.faint,border:"none",borderRadius:7,fontSize:11,fontWeight:700,cursor:state==="wrap"&&disp?"pointer":"default",transition:"all .25s",fontFamily:"Playfair Display,serif",letterSpacing:.5}}>SAVE & READY</button>
          </Panel>
        </div>
        {/* Centre — customer + AI coach + script */}
        <div style={{display:"flex",flexDirection:"column",gap:10,overflow:"auto"}}>
          {contact?<Panel>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:T.faint,marginBottom:10}}>Customer Info</div>
            <div style={{fontFamily:"Playfair Display,serif",fontSize:17,fontWeight:800,color:T.text}}>{contact.name}</div>
            <div style={{fontSize:11,color:T.orange,fontFamily:"DM Mono,monospace",marginTop:2}}>{contact.phone}</div>
            <div style={{fontSize:10,color:T.muted,marginTop:2}}>{contact.company} · {contact.city}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginTop:10}}>
              <div style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:7,padding:"8px 10px"}}>
                <div style={{fontSize:8,color:T.faint,textTransform:"uppercase",letterSpacing:1}}>Prev Calls</div>
                <div style={{fontFamily:"DM Mono,monospace",fontSize:18,fontWeight:700,color:T.orange,marginTop:2}}>{contact.prevCalls}</div>
              </div>
              <div style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:7,padding:"8px 10px"}}>
                <div style={{fontSize:8,color:T.faint,textTransform:"uppercase",letterSpacing:1}}>Last Issue</div>
                <div style={{fontSize:11,color:T.muted,marginTop:3}}>{contact.lastIssue}</div>
              </div>
            </div>
          </Panel>:<Panel style={{textAlign:"center",padding:"32px 16px"}}><div style={{fontSize:28,marginBottom:6,opacity:.3}}>👤</div><div style={{color:T.faint,fontSize:12}}>No active contact</div></Panel>}
          {/* AI Coach */}
          <Panel>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}>
              <div style={{width:18,height:18,borderRadius:4,background:`${T.orange}18`,border:`1px solid ${T.orange}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9}}>🤖</div>
              <span style={{fontSize:9,fontWeight:700,letterSpacing:2,color:T.orange,textTransform:"uppercase"}}>AI Coach</span>
              {state==="active"&&<span style={{marginLeft:"auto",background:`${T.green}12`,color:T.green,fontSize:8,padding:"2px 7px",borderRadius:4,letterSpacing:1,border:`1px solid ${T.green}25`,fontWeight:700,animation:"blink 2s infinite"}}>● LIVE</span>}
            </div>
            {state!=="active"?<div style={{color:T.faint,fontSize:11,textAlign:"center",padding:"12px 0"}}>Activates when call starts</div>:
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {[{t:"tip",c:T.blue,l:"TIP",text:"Good pacing — customer is engaged. Introduce the main offering now."},{t:"warn",c:T.amber,l:"ALERT",text:"Call at 3 mins — wrap up naturally. Offer a clear next step."}].map((tip,i)=>(
                <div key={i} style={{background:T.bg,borderRadius:6,padding:"9px 11px",borderLeft:`3px solid ${tip.c}`,opacity:i===0?1:.5}}>
                  <div style={{fontSize:8,fontWeight:700,color:tip.c,letterSpacing:1.5,marginBottom:3,textTransform:"uppercase"}}>{tip.l}</div>
                  <div style={{fontSize:11,color:T.muted,lineHeight:1.55}}>{tip.text}</div>
                </div>
              ))}
            </div>}
          </Panel>
          {/* Script */}
          <Panel>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{fontSize:9,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:T.faint}}>📋 Call Script</div>
              {state==="active"&&step<SCRIPTS.length-1&&<button onClick={()=>setStep(s=>s+1)} style={{fontSize:8,fontWeight:700,background:`${T.orange}12`,color:T.orange,border:`1px solid ${T.orange}25`,borderRadius:5,padding:"3px 9px",cursor:"pointer"}}>Next →</button>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {SCRIPTS.map((s,i)=>{const done=i<step;const active=i===step;return(
                <div key={i} onClick={()=>state==="active"&&setStep(i)} style={{display:"flex",alignItems:"center",gap:8,opacity:done?.3:1,cursor:state==="active"?"pointer":"default"}}>
                  <div style={{width:16,height:16,borderRadius:"50%",flexShrink:0,background:done?T.green:active?`${T.orange}18`:"rgba(255,255,255,.04)",border:`1px solid ${done?T.green:active?T.orange:"rgba(255,255,255,.08)"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:done?"#000":active?T.orange:T.faint,fontWeight:700}}>
                    {done?"✓":i+1}
                  </div>
                  <span style={{fontSize:11,color:done?T.faint:active?T.text:T.muted,textDecoration:done?"line-through":"none",fontWeight:active?600:400}}>{s}</span>
                </div>
              )})}
            </div>
          </Panel>
        </div>
        {/* Right — recent calls */}
        <div style={{overflow:"auto"}}>
          <Panel>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",color:T.faint,marginBottom:10}}>🕐 Recent Calls</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {[{n:"Suresh K.",dur:"4:23",score:8.2,d:"INT",t:"10:42 AM"},{n:"Meena R.",dur:"2:10",score:6.5,d:"CB",t:"10:18 AM"},{n:"Deepak P.",dur:"6:45",score:9.1,d:"NI",t:"09:55 AM"},{n:"Kavya S.",dur:"1:33",score:7.8,d:"NA",t:"09:30 AM"}].map((c,i)=>{
                const d=DISP.find(x=>x.code===c.d);
                return(
                  <div key={i} style={{background:T.bg,borderRadius:7,padding:"9px 10px",border:`1px solid ${T.border}`,cursor:"pointer",transition:"border-color .2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=T.borderHover} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div><div style={{fontSize:12,fontWeight:700,color:T.text}}>{c.n}</div><div style={{fontSize:8,color:T.faint,marginTop:1}}>{c.t}</div></div>
                      <div style={{fontFamily:"DM Mono,monospace",fontSize:12,fontWeight:700,color:c.score>=8?T.green:c.score>=6?T.amber:T.red}}>{c.score.toFixed(1)}</div>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:5}}>
                      <span style={{fontFamily:"DM Mono,monospace",fontSize:9,color:T.faint}}>⏱ {c.dur}</span>
                      <span style={{fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:4,background:d?.c+"18",color:d?.c,border:`1px solid ${d?.c}44`}}>{d?.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,paddingTop:10,marginTop:4,borderTop:`1px solid ${T.border}`}}>
              {[["14","Calls"],["6","Converted"],["7.8","QA Avg"],["3:42","AHT"]].map(([v,l])=>(
                <div key={l} style={{textAlign:"center"}}>
                  <div style={{fontFamily:"DM Mono,monospace",fontSize:14,fontWeight:700,color:T.muted}}>{v}</div>
                  <div style={{fontSize:8,color:T.faint,letterSpacing:1,textTransform:"uppercase",marginTop:1}}>{l}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════
const NAV={
  supervisor:[{id:"supervisor",icon:"📊",label:"Live Dashboard"},{id:"campaigns",icon:"📋",label:"Campaigns"},{id:"ivr",icon:"🌳",label:"IVR Builder"},{id:"users",icon:"👥",label:"Team & Access"},{id:"agent",icon:"📞",label:"Agent View"}],
  team_lead: [{id:"supervisor",icon:"📊",label:"My Team"},{id:"agent",icon:"📞",label:"My Desk"}],
  agent:     [{id:"agent",icon:"📞",label:"My Desk"}],
};

export default function App(){
  const [user,setUser]=useState(null);
  const [tab,setTab]=useState(null);

  useEffect(()=>{
    const s=document.createElement("style");s.textContent=css;document.head.appendChild(s);
    return()=>s.remove();
  },[]);

  const login=u=>{setUser(u);setTab(u.role==="agent"?"agent":"supervisor")};
  const logout=()=>{setUser(null);setTab(null)};

  if(!user)return<LoginScreen onLogin={login}/>;

  const navItems=NAV[user.role]||NAV.agent;
  const ROLE_C=ROLE_COLOR[user.role]||T.green;
  const TAB_LABELS={supervisor:"Live Dashboard",campaigns:"Campaign Manager",ivr:"IVR Builder",users:"Team & Access",agent:"Agent Desktop"};

  return(
    <div style={{display:"flex",height:"100vh",overflow:"hidden",background:T.bg}}>
      {/* Sidebar */}
      <div style={{width:62,height:"100%",background:"#060810",borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",alignItems:"center",paddingTop:12,paddingBottom:12,gap:3,flexShrink:0}}>
        <div style={{width:36,height:36,borderRadius:9,marginBottom:12,background:`linear-gradient(135deg,${T.orange},#ff8f5e)`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Playfair Display,serif",fontWeight:900,fontSize:16,color:"#fff",boxShadow:`0 0 16px ${T.orange}40`,cursor:"pointer",flexShrink:0}} title="OpsLyft">O</div>
        <div style={{width:"80%",height:1,background:T.border,marginBottom:6}}/>
        {navItems.map(item=>(
          <button key={item.id} onClick={()=>setTab(item.id)} title={item.label} style={{width:42,height:42,borderRadius:10,position:"relative",background:tab===item.id?`${T.orange}14`:"transparent",border:`1px solid ${tab===item.id?T.orange+"30":"transparent"}`,color:T.text,fontSize:17,cursor:"pointer",transition:"all .15s",display:"flex",alignItems:"center",justifyContent:"center"}}
            onMouseEnter={e=>{if(tab!==item.id)e.currentTarget.style.background="rgba(255,255,255,.04)"}} onMouseLeave={e=>{if(tab!==item.id)e.currentTarget.style.background="transparent"}}>
            {item.icon}
            {tab===item.id&&<div style={{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:3,height:18,background:T.orange,borderRadius:"0 3px 3px 0",boxShadow:`0 0 7px ${T.orange}70`}}/>}
          </button>
        ))}
        <div style={{flex:1}}/>
        <div style={{fontSize:7,fontWeight:700,letterSpacing:.5,color:ROLE_C,textTransform:"uppercase",marginBottom:5,textAlign:"center",lineHeight:1.4}}>{user.role==="team_lead"?"TEAM\nLEAD":user.role?.toUpperCase()}</div>
        <div style={{width:32,height:32,borderRadius:"50%",background:`${ROLE_C}18`,border:`1px solid ${ROLE_C}35`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Playfair Display,serif",fontWeight:900,fontSize:12,color:ROLE_C,marginBottom:6}} title={user.name}>{user.name.charAt(0)}</div>
        <button onClick={logout} title="Sign out" style={{width:32,height:32,borderRadius:7,background:"transparent",border:`1px solid ${T.border}`,color:T.faint,fontSize:14,cursor:"pointer",transition:"all .15s",display:"flex",alignItems:"center",justifyContent:"center"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=`${T.red}40`;e.currentTarget.style.color=T.red}} onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;e.currentTarget.style.color=T.faint}}>↩</button>
      </div>
      {/* Main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,overflow:"hidden"}}>
        {/* Topbar */}
        <div style={{height:46,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 18px",borderBottom:`1px solid ${T.border}`,background:T.bg,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <span style={{fontSize:10,color:"#2a3050",fontWeight:600}}>OpsLyft</span>
            <span style={{fontSize:10,color:"#2a3050"}}>›</span>
            <span style={{fontSize:10,color:T.muted,fontWeight:600}}>Contact Centre</span>
            <span style={{fontSize:10,color:"#2a3050"}}>›</span>
            <span style={{fontSize:12,color:T.text,fontWeight:700}}>{TAB_LABELS[tab]||"—"}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:8,fontWeight:700,letterSpacing:.5,padding:"2px 8px",borderRadius:20,background:ROLE_C+"14",border:`1px solid ${ROLE_C}30`,color:ROLE_C,textTransform:"uppercase"}}>{user.role==="team_lead"?"Team Lead":user.role}</span>
            <span style={{fontSize:11,color:T.muted}}>{user.name}</span>
          </div>
        </div>
        {/* Content */}
        <div style={{flex:1,overflow:"hidden"}}>
          {tab==="supervisor"&&<SupervisorDashboard/>}
          {tab==="campaigns"&&(user.role==="supervisor"?<CampaignManager/>:<AccessDenied/>)}
          {tab==="ivr"&&(user.role==="supervisor"?<IVRBuilder/>:<AccessDenied/>)}
          {tab==="users"&&(user.role==="supervisor"?<UserManagement/>:<AccessDenied/>)}
          {tab==="agent"&&<AgentDesktop agent={user}/>}
        </div>
      </div>
    </div>
  );
}

function AccessDenied(){return(
  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",gap:8}}>
    <div style={{fontSize:28,opacity:.3}}>🔒</div>
    <div style={{color:T.faint,fontSize:13}}>Access restricted for your role.</div>
  </div>
);}
