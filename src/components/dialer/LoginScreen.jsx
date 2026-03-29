import { useState } from "react";
import { auth, db } from "../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function LoginScreen({ onLogin }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");

    try {
      const cred     = await signInWithEmailAndPassword(auth, email, password);
      const userSnap = await getDoc(doc(db, "users", cred.user.uid));

      if (!userSnap.exists()) {
        setError("Access denied: your account has not been set up. Contact your administrator.");
        setLoading(false);
        return;
      }

      const { role, displayName } = userSnap.data();

      onLogin({
        uid:   cred.user.uid,
        email: cred.user.email,
        role,
        name:  displayName || cred.user.email.split("@")[0],
      });

    } catch (err) {
      const MSG = {
        "auth/user-not-found":        "No account found with this email.",
        "auth/wrong-password":        "Incorrect password. Please try again.",
        "auth/invalid-credential":    "Invalid credentials. Check email and password.",
        "auth/too-many-requests":     "Too many failed attempts. Try again in a few minutes.",
        "auth/network-request-failed":"Network error. Check your connection.",
      };
      setError(MSG[err.code] || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.wrap}>
      {/* Background grid pattern */}
      <div style={S.grid} />

      <div style={S.card}>
        {/* Logo */}
        <div style={S.logoRow}>
          <div style={S.logoMark}>O</div>
          <div>
            <div style={S.logoText}>Ops<span style={{ color: "#ff6b35" }}>Lyft</span></div>
            <div style={S.logoSub}>Contact Centre Platform</div>
          </div>
        </div>

        <h2 style={S.title}>Sign in to your<br /><em style={{ color: "#ff6b35", fontStyle: "italic" }}>dialer workspace</em></h2>
        <p style={S.sub}>Enter your work credentials to continue.</p>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <div>
            <label style={S.label}>Work Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="agent@company.com" style={S.input}
              onFocus={e => e.target.style.borderColor = "#ff6b35"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.09)"} />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
              <label style={{ ...S.label, marginBottom: 0 }}>Password</label>
            </div>
            <div style={{ position: "relative" }}>
              <input type={showPass ? "text" : "password"} required value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                style={{ ...S.input, paddingRight: 52 }}
                onFocus={e => e.target.style.borderColor = "#ff6b35"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.09)"} />
              <button type="button" onClick={() => setShowPass(!showPass)} style={S.showBtn}>
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <div style={S.errorBox}>
              <span style={{ fontSize: 13 }}>⚠</span> {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ ...S.btnPrimary, opacity: loading ? 0.7 : 1 }}>
            {loading
              ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.6s linear infinite", display: "inline-block" }} />
                  Signing in…
                </span>
              : "Sign In →"}
          </button>
        </form>

        <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "center", gap: 20 }}>
          {[["Agent", "#5b8af7"], ["Supervisor", "#ff6b35"]].map(([label, color]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#3a4460" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
              {label} access
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const S = {
  wrap: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "#07090f", position: "relative", overflow: "hidden",
  },
  grid: {
    position: "absolute", inset: 0,
    backgroundImage: "linear-gradient(rgba(255,107,53,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,107,53,0.03) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
    maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, black 40%, transparent 100%)",
  },
  card: {
    position: "relative", zIndex: 1, width: "100%", maxWidth: 420,
    background: "linear-gradient(145deg, #0e1422, #131a2e)",
    border: "1px solid rgba(255,107,53,0.15)", borderRadius: 20,
    padding: "40px 36px", boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
  },
  logoRow:  { display: "flex", alignItems: "center", gap: 12, marginBottom: 28 },
  logoMark: {
    width: 42, height: 42, borderRadius: 12,
    background: "linear-gradient(135deg, #ff6b35, #ff8f5e)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "Playfair Display, serif", fontWeight: 900, fontSize: 20, color: "#fff",
    boxShadow: "0 0 20px rgba(255,107,53,0.35)",
  },
  logoText: { fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: -0.5 },
  logoSub:  { fontSize: 10, color: "#3a4460", letterSpacing: 0.5, marginTop: 1 },
  title:    { fontSize: 26, fontWeight: 700, color: "#e8edf8", lineHeight: 1.3, marginBottom: 10, fontFamily: "Playfair Display, serif" },
  sub:      { fontSize: 13, color: "#3a4460", marginBottom: 24 },
  label:    { display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: "#8a97b8", marginBottom: 7 },
  input: {
    width: "100%", padding: "11px 14px", borderRadius: 9,
    border: "1px solid rgba(255,255,255,0.09)", background: "#07090f",
    color: "#e8edf8", fontSize: 14, outline: "none", boxSizing: "border-box",
    transition: "border-color 0.2s", fontFamily: "DM Sans, sans-serif",
  },
  showBtn: {
    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", color: "#ff6b35", cursor: "pointer",
    fontSize: 11, fontWeight: 700, letterSpacing: 0.5, fontFamily: "DM Sans, sans-serif",
  },
  btnPrimary: {
    width: "100%", padding: "13px", background: "linear-gradient(135deg, #ff6b35, #ff8f5e)",
    color: "#fff", border: "none", borderRadius: 9, fontSize: 14, fontWeight: 700,
    cursor: "pointer", fontFamily: "DM Sans, sans-serif", letterSpacing: 0.3,
    boxShadow: "0 0 24px rgba(255,107,53,0.3)", transition: "opacity 0.2s",
  },
  errorBox: {
    display: "flex", alignItems: "center", gap: 8,
    background: "rgba(240,64,96,0.08)", border: "1px solid rgba(240,64,96,0.25)",
    borderRadius: 8, padding: "10px 13px", color: "#f04060", fontSize: 12, lineHeight: 1.5,
  },
};
