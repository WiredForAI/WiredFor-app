import { useState, useEffect } from "react";
import { supabase, authFetch } from "./supabaseClient";

const SANS  = "'DM Sans', 'Helvetica Neue', sans-serif";
const SERIF = "'DM Serif Display', serif";
const TEAL  = "#00C4A8";
const TEXT  = "#0A0A0A";
const MUTED = "#6B6B6B";

export default function ClaimProfile() {
  const [state, setState] = useState("loading"); // loading | teaser | linking | done | error
  const [candidate, setCandidate] = useState(null);
  const [error, setError] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const wfId = params.get("wfId");

  useEffect(() => {
    if (!wfId) { setState("error"); setError("Missing profile ID."); return; }

    // Wait for Supabase to process the magic link token from the URL hash
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session) return;

      // Fetch the candidate profile
      try {
        const res = await authFetch(`/api/save-candidate?userId=${encodeURIComponent(session.user.id)}`);
        const json = await res.json();

        // If already linked, go straight to results
        if (json.candidate?.archetype) {
          localStorage.setItem("careermatch_wf_id", json.candidate.wf_id || wfId);
          localStorage.setItem("careermatch_result", JSON.stringify(json.candidate));
          setState("done");
          setCandidate(json.candidate);
          return;
        }
      } catch {}

      // Not linked yet — fetch profile by wfId directly and show teaser
      try {
        const res = await fetch(`/api/claim-profile?wfId=${encodeURIComponent(wfId)}`);
        const json = await res.json();
        if (json.candidate) {
          setCandidate(json.candidate);
          setState("teaser");
        } else {
          setState("error");
          setError("Profile not found.");
        }
      } catch {
        setState("error");
        setError("Could not load profile.");
      }
    });
  }, []);

  const linkProfile = async () => {
    setState("linking");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not signed in");

      const res = await authFetch("/api/claim-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wfId, userId: session.user.id }),
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

  const container = {
    minHeight: "100dvh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    background: "#fff", fontFamily: SANS, padding: "40px 24px",
  };

  if (state === "loading") return (
    <div style={container}>
      <div style={{ width: 48, height: 48, border: "2px solid rgba(0,0,0,0.08)", borderTopColor: TEAL, borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: 16 }} />
      <div style={{ fontSize: 13, color: MUTED }}>Loading your profile...</div>
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

  // Teaser state
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
          <span style={{ display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B4FFF", background: "rgba(107,79,255,0.08)", padding: "4px 10px", borderRadius: 10, marginBottom: 16 }}>
            {candidate.archetype_category}
          </span>
        )}
        <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.7, margin: "16px 0 32px" }}>
          Claim your free account to see your full personality profile, matched roles, and career roadmap.
        </p>
        <button onClick={linkProfile} style={{
          background: TEAL, color: "#fff", border: "none", cursor: "pointer",
          fontSize: 14, fontWeight: 600, padding: "13px 28px", borderRadius: 10, fontFamily: SANS,
        }}>Claim My Profile</button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
