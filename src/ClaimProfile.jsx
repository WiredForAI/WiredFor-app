import { useState, useEffect } from "react";
import { supabase, authFetch } from "./supabaseClient";

const SANS   = "'DM Sans', 'Helvetica Neue', sans-serif";
const SERIF  = "'DM Serif Display', serif";
const TEAL   = "#00C4A8";
const PURPLE = "#6B4FFF";
const TEXT   = "#0A0A0A";
const MUTED  = "#6B6B6B";

export default function ClaimProfile() {
  const [state, setState] = useState("loading"); // loading | teaser | signup | linking | done | error
  const [candidate, setCandidate] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const wfId = params.get("wfId");

  // On mount: fetch the candidate teaser by wfId (public, no auth needed)
  useEffect(() => {
    if (!wfId) { setState("error"); setError("Missing profile ID."); return; }

    (async () => {
      try {
        const res = await fetch(`/api/claim-profile?wfId=${encodeURIComponent(wfId)}`);
        const json = await res.json();
        if (!json.candidate) { setState("error"); setError("Profile not found."); return; }
        setCandidate(json.candidate);

        // If already signed in, try to link immediately
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await linkProfile(session);
        } else {
          setState("teaser");
        }
      } catch {
        setState("error");
        setError("Could not load profile.");
      }
    })();
  }, []);

  // Listen for auth changes (handles post-signup redirect back)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && state === "signup") {
        await linkProfile(session);
      }
    });
    return () => subscription.unsubscribe();
  }, [state]);

  const linkProfile = async (session) => {
    setState("linking");
    try {
      const res = await authFetch("/api/claim-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wfId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Link failed");

      localStorage.setItem("careermatch_wf_id", wfId);
      if (candidate) localStorage.setItem("careermatch_result", JSON.stringify(candidate));
      setState("done");
    } catch (err) {
      setError(err.message);
      setState("error");
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setState("signup");
    const { error: signupErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { wf_id: wfId, user_type: "candidate" } },
    });
    if (signupErr) {
      // If user already exists, try sign-in instead
      if (/already|registered|exists/i.test(signupErr.message || "")) {
        const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
        if (loginErr) { setError(loginErr.message); setState("teaser"); return; }
      } else {
        setError(signupErr.message);
        setState("teaser");
      }
    }
  };

  const container = {
    minHeight: "100dvh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: "#fff", fontFamily: SANS, padding: "40px 24px",
  };

  if (state === "loading" || state === "linking") return (
    <div style={container}>
      <div style={{ width: 48, height: 48, border: "2px solid rgba(0,0,0,0.08)", borderTopColor: TEAL, borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: 16 }} />
      <div style={{ fontSize: 13, color: MUTED }}>{state === "linking" ? "Linking your profile..." : "Loading your profile..."}</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (state === "error") return (
    <div style={container}>
      <div style={{ fontSize: 15, color: "#DC2626", marginBottom: 8 }}>{error}</div>
      <a href="/" style={{ color: TEAL, fontSize: 13, textDecoration: "none" }}>Go to WiredFor.ai</a>
    </div>
  );

  if (state === "done") return (
    <div style={container}>
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: TEAL, fontWeight: 600, marginBottom: 12 }}>Profile Claimed</div>
        <h1 style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 400, color: TEXT, margin: "0 0 8px" }}>
          You are {candidate?.archetype || "matched"}
        </h1>
        <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.7, margin: "0 0 32px" }}>
          Your full personality profile, matched roles, and career roadmap are ready.
        </p>
        <a href="/assessment" style={{
          display: "inline-block", background: TEAL, color: "#fff",
          fontSize: 14, fontWeight: 600, padding: "13px 28px", borderRadius: 10,
          textDecoration: "none", fontFamily: SANS,
        }}>View My Full Profile</a>
      </div>
    </div>
  );

  // Teaser + signup form
  return (
    <div style={container}>
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        <svg viewBox="0 0 48 48" width="48" height="48" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: 20 }}>
          <rect x="0" y="0" width="48" height="48" rx="12" fill="#0A0A0A"/>
          <circle cx="8" cy="13" r="4" fill="#00C4A8"/><circle cx="18" cy="35" r="3" fill="#6B4FFF"/><circle cx="24" cy="22" r="3.5" fill="#00C4A8"/><circle cx="30" cy="35" r="3" fill="#6B4FFF"/><circle cx="40" cy="13" r="4" fill="#00C4A8"/>
          <line x1="8" y1="13" x2="18" y2="35" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/><line x1="18" y1="35" x2="24" y2="22" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/><line x1="24" y1="22" x2="30" y2="35" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/><line x1="30" y1="35" x2="40" y2="13" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>

        <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: TEAL, fontWeight: 600, marginBottom: 12 }}>Your Profile is Ready</div>
        <h1 style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 400, color: TEXT, margin: "0 0 6px" }}>
          You are {candidate?.archetype || "matched"}
        </h1>
        {candidate?.archetype_category && (
          <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: PURPLE, background: "rgba(107,79,255,0.08)", padding: "4px 10px", borderRadius: 10, marginBottom: 16 }}>
            {candidate.archetype_category}
          </span>
        )}
        <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.7, margin: "16px 0 28px" }}>
          Sign up with the email this invite was sent to and your profile will be linked automatically.
        </p>

        <form onSubmit={handleSignup} style={{ textAlign: "left", maxWidth: 340, margin: "0 auto" }}>
          <label style={{ display: "block", fontSize: 12, color: MUTED, marginBottom: 4, fontWeight: 500 }}>Email</label>
          <input
            type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: SANS, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, marginBottom: 14, outline: "none", boxSizing: "border-box" }}
          />
          <label style={{ display: "block", fontSize: 12, color: MUTED, marginBottom: 4, fontWeight: 500 }}>Create a password</label>
          <input
            type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            style={{ width: "100%", padding: "10px 14px", fontSize: 14, fontFamily: SANS, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, marginBottom: 20, outline: "none", boxSizing: "border-box" }}
          />
          <button type="submit" disabled={state === "signup"} style={{
            width: "100%", background: TEAL, color: "#fff", border: "none", cursor: "pointer",
            fontSize: 14, fontWeight: 600, padding: "13px 28px", borderRadius: 10, fontFamily: SANS,
            opacity: state === "signup" ? 0.6 : 1,
          }}>{state === "signup" ? "Creating account..." : "Claim My Profile"}</button>
        </form>

        {error && <div style={{ fontSize: 13, color: "#DC2626", marginTop: 12 }}>{error}</div>}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
