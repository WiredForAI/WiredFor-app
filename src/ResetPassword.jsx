import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

const SANS = "'DM Sans', 'Helvetica Neue', sans-serif";
const SERIF = "'DM Serif Display', Georgia, serif";
const ACCENT = "#00C4A8";
const TEXT = "#0A0A0A";
const MUTED = "#6B6B6B";
const BG2 = "#F7F7F5";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    // Supabase client auto-detects the token from the URL hash fragment
    // and establishes a session via onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });

    // Also check if session is already established (e.g. page was refreshed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      }
    });

    // If no session after 5 seconds, show error
    const timeout = setTimeout(() => {
      setSessionReady(prev => {
        if (!prev) setSessionError(true);
        return prev;
      });
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) return;
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      setSuccess(true);

      // Determine user type and redirect
      const { data: { user } } = await supabase.auth.getUser();
      const userType = user?.user_metadata?.user_type;

      setTimeout(() => {
        if (userType === "employer") {
          window.location.href = "/employer";
        } else {
          window.location.href = "/assessment";
        }
      }, 2000);
    } catch (err) {
      setError(err.message);
    }

    setLoading(false);
  };

  const inputStyle = {
    width: "100%", background: BG2, border: "1px solid rgba(0,0,0,0.10)",
    borderRadius: 12, padding: "14px 16px", color: TEXT,
    fontSize: 16, fontFamily: SANS, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{
      minHeight: "100dvh", background: "#FFFFFF", color: TEXT,
      fontFamily: SANS, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />
      <div style={{
        width: "100%", maxWidth: 440, background: "#FFFFFF",
        border: "1px solid rgba(0,0,0,0.08)", borderRadius: 20,
        padding: "40px 36px", boxShadow: "0 2px 20px rgba(0,0,0,0.06)",
      }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: ACCENT, marginBottom: 16, fontFamily: SANS }}>
            Password Reset
          </div>
          <h2 style={{ fontSize: 26, fontWeight: 400, fontFamily: SERIF, color: TEXT, margin: "0 0 10px", lineHeight: 1.2 }}>
            {success ? "Password updated" : "Choose a new password"}
          </h2>
          {!success && (
            <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.65, margin: 0, fontFamily: SANS }}>
              Enter your new password below.
            </p>
          )}
        </div>

        {sessionError && !sessionReady && (
          <div style={{
            background: "rgba(245,93,44,0.05)", border: "1px solid rgba(245,93,44,0.15)", borderRadius: 10,
            padding: "16px", marginBottom: 16, color: "#F55D2C", fontSize: 14, lineHeight: 1.6, fontFamily: SANS,
          }}>
            This reset link has expired or is invalid. Please request a new one.
            <div style={{ marginTop: 12 }}>
              <a href="/assessment" style={{ color: ACCENT, fontSize: 13, fontFamily: SANS }}>Back to sign in</a>
            </div>
          </div>
        )}

        {success && (
          <div style={{
            background: "rgba(0,196,168,0.06)", border: "1px solid rgba(0,196,168,0.20)", borderRadius: 12,
            padding: "18px 16px", color: MUTED, fontSize: 14, lineHeight: 1.7, fontFamily: SANS,
          }}>
            Your password has been updated. Redirecting you now...
          </div>
        )}

        {!success && sessionReady && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              <input
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                autoComplete="new-password"
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                autoComplete="new-password"
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{
                background: "rgba(245,93,44,0.05)", border: "1px solid rgba(245,93,44,0.15)", borderRadius: 10,
                padding: "12px 14px", marginBottom: 16, color: "#F55D2C", fontSize: 13, lineHeight: 1.5, fontFamily: SANS,
              }}>{error}</div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || !newPassword.trim() || !confirmPassword.trim()}
              style={{
                width: "100%", padding: "14px", borderRadius: 12,
                background: (loading || !newPassword.trim() || !confirmPassword.trim()) ? BG2 : ACCENT,
                border: "none",
                color: (loading || !newPassword.trim() || !confirmPassword.trim()) ? "#9B9B9B" : "#fff",
                fontSize: 15, fontWeight: 700, cursor: (loading || !newPassword.trim() || !confirmPassword.trim()) ? "default" : "pointer",
                fontFamily: SANS,
              }}
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </>
        )}

        {!success && !sessionReady && !sessionError && (
          <div style={{ textAlign: "center", color: MUTED, fontSize: 14, fontFamily: SANS, padding: "20px 0" }}>
            Verifying reset link...
          </div>
        )}
      </div>
    </div>
  );
}
