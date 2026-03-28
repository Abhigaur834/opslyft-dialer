import { useState } from "react";

// ── Firebase Auth placeholder ──────────────────────────────────────────
// WIRE UP: Replace these imports with real Firebase when ready
// import { initializeApp } from "firebase/app";
// import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
// const firebaseConfig = { apiKey: "...", authDomain: "...", projectId: "..." };
// const app = initializeApp(firebaseConfig);
// const auth = getAuth(app);
// ──────────────────────────────────────────────────────────────────────

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");

    try {
      // WIRE UP: Replace with real Firebase Auth
      // const cred = await signInWithEmailAndPassword(auth, email, password);
      // const role = cred.user.email.includes("supervisor") ? "supervisor" : "agent";
      // onLogin({ uid: cred.user.uid, email: cred.user.email, role, name: email.split("@")[0] });

      // Mock login for now
      await new Promise(r => setTimeout(r, 900));
      const role = email.toLowerCase().includes("supervisor") ? "supervisor" : "agent";
      const name = email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      onLogin({ uid: "mock_" + Date.now(), email, role, name });
    } catch (err) {
      setError("Invalid email or password. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div style={styles.loginWrap}>
      <div style={styles.loginCard}>
        {/* Logo */}
        <div style={styles.loginLogo}>
          <div style={styles.loginLogoMark}>O</div>
          <div>
            <div style={styles.loginLogoText}>Ops<span style={{ color: "#ff6b35" }}>lyft</span></div>
            <div style={styles.loginLogoSub}>Contact Centre</div>
          </div>
        </div>

        <h2 style={styles.loginTitle}>Sign in to<br /><em style={{ color: "#ff6b35", fontStyle: "italic" }}>your dialer</em></h2>
        <p style={styles.loginSub}>Enter your work email and password to access the platform.</p>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={styles.label}>Work Email</label>
            <input
              type="email" required value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@opslyft.com"
              style={styles.input}
              onFocus={e => e.target.style.borderColor = "#ff6b35"}
              onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.09)"}
            />
          </div>
          <div>
            <label style={styles.label}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"} required value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••"
                style={{ ...styles.input, paddingRight: 44 }}
                onFocus={e => e.target.style.borderColor = "#ff6b35"}
                onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.09)"}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#3a4460", cursor: "pointer", fontSize: 12, fontFamily: "DM Sans, sans-serif" }}>
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: "#f04060", background: "rgba(240,64,96,0.08)", border: "1px solid rgba(240,64,96,0.2)", borderRadius: 7, padding: "8px 12px" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ ...styles.btnPrimary, opacity: loading ? 0.7 : 1, marginTop: 4 }}>
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>

        <div style={{ marginTop: 20, padding: "12px 14px", background: "rgba(255,107,53,0.05)", border: "1px solid rgba(255,107,53,0.12)", borderRadius: 8, fontSize: 11, color: "#8a97b8", lineHeight: 1.6 }}>
          <strong style={{ color: "#ff6b35" }}>Agent?</strong> Use your work email · &nbsp;
          <strong style={{ color: "#ff6b35" }}>Supervisor?</strong> Include "supervisor" in your email for full dashboard access
        </div>
      </div>
    </div>
  );
}

const styles = {
  loginWrap: {
    minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "#07090f", padding: 20,
    backgroundImage: "radial-gradient(ellipse 60% 50% at 30% 20%, rgba(255,107,53,0.07) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(37,99,235,0.05) 0%, transparent 60%)",
  },
  loginCard: {
    width: "100%", maxWidth: 420,
    background: "linear-gradient(145deg, #0e1422, #131a2e)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 20, padding: "40px 36px",
    boxShadow: "0 40px 80px rgba(0,0,0,0.5)",
  },
  loginLogo: { display: "flex", alignItems: "center", gap: 10, marginBottom: 28 },
  loginLogoMark: {
    width: 38, height: 38, borderRadius: 10,
    background: "linear-gradient(135deg, #ff6b35, #ff8f5e)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "Playfair Display, serif", fontWeight: 900, fontSize: 18, color: "#fff",
    boxShadow: "0 0 20px rgba(255,107,53,0.35)",
  },
  loginLogoText: { fontFamily: "Playfair Display, serif", fontWeight: 900, fontSize: 20, color: "#e8edf8", lineHeight: 1 },
  loginLogoSub: { fontSize: 9, letterSpacing: "2.5px", textTransform: "uppercase", color: "#3a4460", fontWeight: 600, marginTop: 2 },
  loginTitle: { fontFamily: "Playfair Display, serif", fontSize: 32, fontWeight: 900, lineHeight: 1.1, color: "#e8edf8", marginBottom: 10, letterSpacing: "-0.5px" },
  loginSub: { fontSize: 13, color: "#8a97b8", lineHeight: 1.65, marginBottom: 28 },
  label: { display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", color: "#8a97b8", marginBottom: 7 },
  input: {
    width: "100%", padding: "11px 14px", borderRadius: 8,
    background: "#0a0e18", border: "1px solid rgba(255,255,255,0.09)",
    color: "#e8edf8", fontSize: 14, fontFamily: "DM Sans, sans-serif",
    outline: "none", transition: "border-color 0.2s", boxSizing: "border-box",
  },
  btnPrimary: {
    width: "100%", padding: "13px", borderRadius: 9,
    background: "#ff6b35", color: "#fff", border: "none",
    fontFamily: "Playfair Display, serif", fontSize: 15, fontWeight: 700,
    cursor: "pointer", transition: "all 0.2s",
    boxShadow: "0 0 24px rgba(255,107,53,0.3)",
  },
};
