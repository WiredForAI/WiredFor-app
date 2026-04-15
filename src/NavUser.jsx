import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

const SANS = "'DM Sans', 'Helvetica Neue', sans-serif";
const TEAL = "#00C4A8";
const TEXT = "#0A0A0A";
const MUTED = "#6B6B6B";
const MUTED2 = "#9B9B9B";
const BORDER = "rgba(0,0,0,0.08)";

/**
 * Checks auth state and localStorage to determine logged-in user info.
 * Returns { user, wfId, userType } or null.
 */
export function useAuthState() {
  const [auth, setAuth] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const wfId = localStorage.getItem("careermatch_wf_id") || null;
        const userType = session.user.user_metadata?.user_type || "candidate";
        setAuth({ user: session.user, wfId, userType });
      }
      setChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const wfId = localStorage.getItem("careermatch_wf_id") || null;
        const userType = session.user.user_metadata?.user_type || "candidate";
        setAuth({ user: session.user, wfId, userType });
      } else {
        setAuth(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return { auth, checked };
}

/**
 * Avatar badge showing last 4 chars of WF-ID with dropdown menu.
 */
export function NavUserMenu({ auth }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const idSuffix = auth.wfId ? auth.wfId.replace("WF-", "").slice(-4) : "USER";
  const isEmployer = auth.userType === "employer";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("careermatch_result");
    localStorage.removeItem("careermatch_wf_id");
    localStorage.removeItem("careermatch_test_mode");
    window.location.href = "/";
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: 34, height: 34, borderRadius: "50%",
        background: TEXT, border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "opacity 0.15s",
      }}
        onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
        onMouseLeave={e => e.currentTarget.style.opacity = "1"}
      >
        <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: TEAL, letterSpacing: "0.03em" }}>{idSuffix}</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: 42, right: 0, zIndex: 200,
          background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10,
          boxShadow: "0 4px 24px rgba(0,0,0,0.10)", minWidth: 180, padding: "6px 0",
        }}>
          {/* WF-ID label */}
          <div style={{ padding: "8px 14px 6px", fontSize: 10, color: MUTED2, fontFamily: "monospace", letterSpacing: 1, textTransform: "uppercase", borderBottom: `1px solid ${BORDER}`, marginBottom: 2 }}>
            {auth.wfId || auth.user.email}
          </div>

          <a href={isEmployer ? "/employer" : "/assessment"} style={{
            display: "block", padding: "10px 14px", fontSize: 13, fontFamily: SANS,
            color: TEXT, textDecoration: "none", transition: "background 0.1s",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.03)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            {isEmployer ? "My Dashboard" : "My Profile"}
          </a>

          <button onClick={handleSignOut} style={{
            display: "block", width: "100%", padding: "10px 14px", fontSize: 13,
            fontFamily: SANS, color: MUTED, textAlign: "left",
            background: "none", border: "none", cursor: "pointer",
            transition: "background 0.1s",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.03)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
