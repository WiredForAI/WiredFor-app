import { useState } from "react";
import { supabase, authFetch } from "./supabaseClient";

const authStyles = `
  .auth-container {
    min-height: 100dvh;
    background: #FFFFFF;
    color: #0A0A0A;
    font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0;
  }
  .auth-card {
    width: 100%;
    background: #FFFFFF;
    padding: 32px 20px 40px;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .auth-input {
    width: 100%;
    background: #F7F7F5;
    border: 1px solid rgba(0,0,0,0.10);
    border-radius: 12px;
    padding: 14px 16px;
    color: #0A0A0A;
    font-size: 16px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s;
    -webkit-appearance: none;
    box-sizing: border-box;
  }
  .auth-input:focus { border-color: rgba(0,0,0,0.25); }
  .auth-input::placeholder { color: #9B9B9B; }
  .auth-btn {
    width: 100%;
    min-height: 56px;
    padding: 16px;
    border: none;
    border-radius: 14px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    background: #00C4A8;
    color: #fff;
    -webkit-tap-highlight-color: transparent;
    -webkit-appearance: none;
  }
  .auth-btn:disabled {
    background: #F7F7F5;
    color: #9B9B9B;
    cursor: default;
  }
  .auth-toggle-btn {
    background: none;
    border: none;
    color: #00C4A8;
    font-size: 14px;
    cursor: pointer;
    font-family: inherit;
    padding: 4px 0;
    text-decoration: underline;
    -webkit-tap-highlight-color: transparent;
  }
  .wp-pill {
    flex: 1;
    min-width: 0;
    padding: 10px 6px;
    border-radius: 10px;
    border: 1px solid rgba(0,0,0,0.10);
    background: #F7F7F5;
    color: #6B6B6B;
    font-size: 12px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    text-align: center;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
    -webkit-tap-highlight-color: transparent;
    white-space: nowrap;
  }
  .wp-pill.selected {
    border-color: #00C4A8;
    color: #00C4A8;
    background: rgba(0,196,168,0.10);
  }
  @media (min-width: 560px) {
    .auth-container { padding: 24px 16px; justify-content: center; }
    .auth-card {
      max-width: 480px;
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 20px;
      padding: 40px 36px;
      flex: none;
      box-shadow: 0 2px 20px rgba(0,0,0,0.06);
    }
  }
`;

const WORK_PREFS = [
  { value: "remote",   label: "Remote" },
  { value: "hybrid",   label: "Hybrid" },
  { value: "onsite",   label: "On-site" },
  { value: "open",     label: "Open to all" },
];

export default function AuthScreen({ wfId, onComplete }) {
  // authMethod: "magic" (passwordless, primary) | "password" (secondary).
  // mode only applies to the password path: "signup" | "login".
  const [authMethod, setAuthMethod] = useState("magic");
  const [mode, setMode] = useState("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [location, setLocation] = useState("");
  const [workPreference, setWorkPreference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Passwordless sign-in. The user leaves the page and returns via the emailed
  // link with a session established; CareerMatch's mount effect then rehydrates
  // their pending result. This handler therefore does NOT call onComplete —
  // there is no session (and no userId) yet on this page load.
  const handleMagicLink = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          // Return to the assessment route so the SPA boots into CareerMatch.
          emailRedirectTo: `${window.location.origin}/assessment`,
          shouldCreateUser: true,
          data: { user_type: "candidate" },
        },
      });
      if (otpError) throw otpError;
      setMagicSent(true);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError("");

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { user_type: "candidate" } },
        });
        if (signUpError) throw signUpError;
        onComplete({
          userId: data.user.id,
          email: email.trim(),
          isNew: true,
          location: location.trim(),
          workPreference,
        });
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        onComplete({ userId: data.user.id, email: email.trim(), isNew: false });
      }
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      if (!res.ok) throw new Error("Something went wrong. Please try again.");
      setResetSent(true);
    } catch (err) {
      setError(err.message);
    }
    setResetLoading(false);
  };

  const isPassword = authMethod === "password";

  return (
    <div className="auth-container">
      <style>{authStyles}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <div className="auth-card">

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "#00C4A8", marginBottom: 16 }}>
            {isPassword && mode === "login" ? "Welcome Back" : "Save Your Results"}
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 400, fontFamily: "'DM Serif Display', Georgia, serif", color: "#0A0A0A", margin: "0 0 10px", lineHeight: 1.2 }}>
            {magicSent
              ? "Check your email"
              : isPassword
                ? (mode === "signup" ? "Create your account" : "Log in to your account")
                : "See your full results"}
          </h2>
          <p style={{ color: "#6B6B6B", fontSize: 14, lineHeight: 1.65, margin: 0 }}>
            {magicSent
              ? "We just sent you a one-tap sign-in link."
              : isPassword
                ? (mode === "signup"
                    ? "Your results will be saved and tied to your permanent WiredFor ID."
                    : "Log in to access your saved profile and results.")
                : "Enter your email and we'll send a one-tap sign-in link — no password to create."}
          </p>
        </div>

        {/* WF ID badge — hidden on the returning-user login and the sent state */}
        {!magicSent && !(isPassword && mode === "login") && (
          <div style={{
            background: "#F7F7F5", border: "1px solid rgba(0,196,168,0.15)", borderRadius: 12,
            padding: "14px 16px", marginBottom: 28, display: "flex", alignItems: "center", gap: 14
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: "rgba(0,196,168,0.10)",
              border: "1px solid rgba(0,196,168,0.25)", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 16, flexShrink: 0
            }}>🪪</div>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#9B9B9B", marginBottom: 4 }}>Your WiredFor ID</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#00C4A8", letterSpacing: 1 }}>{wfId}</div>
            </div>
          </div>
        )}

        {/* Magic-link sent confirmation */}
        {magicSent && (
          <div style={{
            background: "#F7F7F5", border: "1px solid rgba(0,196,168,0.20)", borderRadius: 12,
            padding: "22px 20px", marginBottom: 20,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📬</div>
            <p style={{ color: "#4A4A4A", fontSize: 14, lineHeight: 1.65, margin: "0 0 14px" }}>
              We sent a sign-in link to <strong style={{ color: "#0A0A0A" }}>{email}</strong>. Open it on this device to see your full results — your assessment is saved and waiting.
            </p>
            <button
              onClick={() => { setMagicSent(false); setError(""); }}
              style={{ background: "none", border: "none", color: "#00C4A8", fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: 0 }}
            >
              Use a different email
            </button>
          </div>
        )}

        {/* Form */}
        {!magicSent && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <input
            className="auth-input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && (isPassword ? handleSubmit() : handleMagicLink())}
            autoComplete="email"
          />
          {isPassword && (
          <input
            className="auth-input"
            type="password"
            placeholder={mode === "signup" ? "Create a password" : "Password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
          )}
          {isPassword && mode === "login" && !forgotMode && (
            <button
              onClick={() => { setForgotMode(true); setResetEmail(email); setError(""); }}
              style={{ background: "none", border: "none", color: "#00C4A8", fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: 0, textAlign: "right", marginTop: -4 }}
            >
              Forgot Password?
            </button>
          )}

          {/* Location + work preference — password signup only */}
          {isPassword && mode === "signup" && (
            <>
              <input
                className="auth-input"
                type="text"
                placeholder="City, Country (e.g. Austin, USA)"
                value={location}
                onChange={e => setLocation(e.target.value)}
                autoComplete="off"
              />

              <div>
                <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#9B9B9B", marginBottom: 10 }}>
                  Work preference
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {WORK_PREFS.map(p => (
                    <button
                      key={p.value}
                      className={`wp-pill${workPreference === p.value ? " selected" : ""}`}
                      onClick={() => setWorkPreference(p.value)}
                      type="button"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        )}

        {forgotMode && (
          <div style={{
            background: "#F7F7F5", border: "1px solid rgba(0,196,168,0.20)", borderRadius: 12,
            padding: "20px 18px", marginBottom: 20,
          }}>
            {resetSent ? (
              <div>
                <p style={{ color: "#4A4A4A", fontSize: 14, lineHeight: 1.65, margin: "0 0 12px" }}>
                  Check your email — we sent you a password reset link.
                </p>
                <button
                  onClick={() => { setForgotMode(false); setResetSent(false); setResetEmail(""); }}
                  style={{ background: "none", border: "none", color: "#00C4A8", fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: 0 }}
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0A0A0A", marginBottom: 10 }}>Reset your password</div>
                <input
                  className="auth-input"
                  type="email"
                  placeholder="Email address"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleForgotPassword()}
                  autoComplete="email"
                  style={{ marginBottom: 12 }}
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={handleForgotPassword}
                    disabled={resetLoading || !resetEmail.trim()}
                    style={{
                      padding: "10px 20px", borderRadius: 10,
                      background: (resetLoading || !resetEmail.trim()) ? "#E8E8E8" : "#00C4A8",
                      border: "none", color: (resetLoading || !resetEmail.trim()) ? "#9B9B9B" : "#fff",
                      fontSize: 13, fontWeight: 600, cursor: (resetLoading || !resetEmail.trim()) ? "default" : "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {resetLoading ? "Sending..." : "Send Reset Link"}
                  </button>
                  <button
                    onClick={() => { setForgotMode(false); setError(""); }}
                    style={{ background: "none", border: "none", color: "#6B6B6B", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{
            background: "rgba(245,93,44,0.05)", border: "1px solid rgba(245,93,44,0.15)", borderRadius: 10,
            padding: "12px 14px", marginBottom: 16, color: "#F55D2C", fontSize: 13, lineHeight: 1.5
          }}>{error}</div>
        )}

        {/* Primary action */}
        {!magicSent && (
          isPassword ? (
            <button className="auth-btn" onClick={handleSubmit} disabled={loading || !email.trim() || !password.trim()}>
              {loading ? "Please wait..." : mode === "signup" ? "Create Account & See Results →" : "Log In & See Results →"}
            </button>
          ) : (
            <button className="auth-btn" onClick={handleMagicLink} disabled={loading || !email.trim()}>
              {loading ? "Sending..." : "Email me a sign-in link →"}
            </button>
          )
        )}

        {/* Method switch */}
        {!magicSent && (
          <div style={{ marginTop: 16, textAlign: "center" }}>
            {isPassword ? (
              <button
                className="auth-toggle-btn"
                onClick={() => { setAuthMethod("magic"); setForgotMode(false); setError(""); }}
              >
                Email me a sign-in link instead
              </button>
            ) : (
              <button
                className="auth-toggle-btn"
                onClick={() => { setAuthMethod("password"); setError(""); }}
              >
                Prefer to use a password?
              </button>
            )}
          </div>
        )}

        {/* Signup / login toggle — password path only */}
        {!magicSent && isPassword && !forgotMode && (
          <div style={{ marginTop: 12, textAlign: "center", fontSize: 14, color: "#6B6B6B" }}>
            {mode === "signup" ? "Already have an account? " : "Don't have an account? "}
            <button className="auth-toggle-btn" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); }}>
              {mode === "signup" ? "Log in" : "Sign up"}
            </button>
          </div>
        )}

        {/* Skip */}
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button
            onClick={() => onComplete({ userId: null, email: null, isNew: false })}
            style={{ background: "none", border: "none", color: "#9B9B9B", fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: "8px 0" }}
          >
            Skip for now
          </button>
        </div>

      </div>
    </div>
  );
}
