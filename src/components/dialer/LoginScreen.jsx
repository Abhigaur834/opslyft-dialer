```javascript
import { useState } from "react";

import { auth, db } from "../../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

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
      // 🔐 Firebase Authentication
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      // 📡 Firestore se role fetch
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        setError("User role not found in Firestore");
        setLoading(false);
        return;
      }

      const role = userSnap.data().role;

      // 🚀 Login success
      onLogin({
        uid: user.uid,
        email: user.email,
        role: role,
        name: user.email.split("@")[0]
      });

    } catch (err) {
      console.error(err);
      setError("Login failed: " + err.message);
    } finally {
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
            <div style={styles.loginLogoText}>
              Ops<span style={{ color: "#ff6b35" }}>lyft</span>
            </div>
            <div style={styles.loginLogoSub}>Contact Centre</div>
          </div>
        </div>

        <h2 style={styles.loginTitle}>
          Sign in to<br />
          <em style={{ color: "#ff6b35", fontStyle: "italic" }}>
            your dialer
          </em>
        </h2>

        <p style={styles.loginSub}>
          Enter your work email and password to access the platform.
        </p>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          
          {/* EMAIL */}
          <div>
            <label style={styles.label}>Work Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@opslyft.com"
              style={styles.input}
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label style={styles.label}>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ ...styles.input, paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={styles.showBtn}
              >
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div style={styles.errorBox}>
              {error}
            </div>
          )}

          {/* BUTTON */}
          <button type="submit" disabled={loading} style={styles.btnPrimary}>
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>

      </div>
    </div>
  );
}

/* ================== STYLES ================== */

const styles = {
  loginWrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#07090f",
  },
  loginCard: {
    width: "100%",
    maxWidth: 420,
    background: "#131a2e",
    borderRadius: 20,
    padding: "40px 36px",
  },
  loginLogo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 28
  },
  loginLogoMark: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: "#ff6b35",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: "bold"
  },
  loginLogoText: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold"
  },
  loginLogoSub: {
    fontSize: 10,
    color: "#aaa"
  },
  loginTitle: {
    fontSize: 28,
    color: "#fff",
    marginBottom: 10
  },
  loginSub: {
    fontSize: 13,
    color: "#aaa",
    marginBottom: 20
  },
  label: {
    fontSize: 12,
    color: "#aaa",
    marginBottom: 5
  },
  input: {
    width: "100%",
    padding: "10px",
    borderRadius: 8,
    border: "1px solid #333",
    background: "#0a0e18",
    color: "#fff"
  },
  showBtn: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    color: "#ff6b35",
    cursor: "pointer"
  },
  btnPrimary: {
    padding: "12px",
    background: "#ff6b35",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer"
  },
  errorBox: {
    color: "red",
    fontSize: 12
  }
};
```
