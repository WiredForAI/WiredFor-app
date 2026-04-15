import { useState, useEffect } from "react";
import { supabase, authFetch } from "./supabaseClient";
import { useAuthState, NavUserMenu } from "./NavUser.jsx";

const SANS  = "'DM Sans', 'Helvetica Neue', sans-serif";
const SERIF = "'DM Serif Display', serif";
const TEAL  = "#00C4A8";
const PURPLE = "#6B4FFF";
const TEXT  = "#0A0A0A";
const MUTED = "#6B6B6B";
const MUTED2 = "#9B9B9B";
const BG    = "#FFFFFF";
const BG2   = "#F7F7F5";
const BORDER = "rgba(0,0,0,0.08)";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "Software Development", label: "Engineering" },
  { value: "Product", label: "Product" },
  { value: "Design", label: "Design" },
  { value: "Data", label: "Data" },
  { value: "DevOps / Sysadmin", label: "DevOps" },
  { value: "Cybersecurity", label: "Security" },
  { value: "QA", label: "QA" },
];

const WORK_TYPES = [
  { value: "all", label: "All Types" },
  { value: "remote", label: "Remote" },
  { value: "onsite", label: "On-site" },
];

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function MatchBadge({ score }) {
  if (!score) return null;
  const color = score >= 80 ? TEAL : score >= 60 ? "#F59E0B" : MUTED2;
  return (
    <div style={{
      background: `${color}14`, border: `1px solid ${color}30`, borderRadius: 6,
      padding: "3px 8px", fontSize: 12, fontWeight: 700, color, fontFamily: SANS, flexShrink: 0,
    }}>{score}% match</div>
  );
}

function JobCard({ job, hasProfile }) {
  return (
    <a href={job.url} target="_blank" rel="noopener noreferrer" style={{
      textDecoration: "none", display: "block",
      background: BG, border: `1px solid ${BORDER}`, borderRadius: 12,
      padding: "18px 20px", transition: "border-color 0.15s, box-shadow 0.15s",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,196,168,0.3)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        {/* Logo */}
        {job.logo ? (
          <img src={job.logo} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "contain", background: BG2, flexShrink: 0 }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: 8, background: BG2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 16, color: MUTED2 }}>{(job.company || "?")[0]}</span>
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: TEXT, fontFamily: SANS }}>{job.title}</div>
            {job.matchScore != null && <MatchBadge score={job.matchScore} />}
          </div>

          <div style={{ fontSize: 13, color: MUTED, fontFamily: SANS, marginBottom: 8 }}>
            {job.company}{job.location ? ` · ${job.location}` : ""}{job.salary ? ` · ${job.salary}` : ""}
          </div>

          {/* Tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
            {job.category && (
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", color: PURPLE, background: "rgba(107,79,255,0.08)", padding: "2px 7px", borderRadius: 4, fontFamily: SANS }}>{job.category}</span>
            )}
            {(job.tags || []).map(t => (
              <span key={t} style={{ fontSize: 10, color: MUTED2, background: BG2, padding: "2px 7px", borderRadius: 4, fontFamily: SANS }}>{t}</span>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: MUTED2, fontFamily: SANS }}>
            {job.postedAt && <span>{timeAgo(job.postedAt)}</span>}
            {job.source && <span>via {job.source}</span>}
          </div>
        </div>
      </div>

      {/* CTA for users without a profile */}
      {!hasProfile && job.matchScore == null && (
        <div style={{
          marginTop: 12, padding: "8px 12px", background: "rgba(0,196,168,0.04)",
          border: "1px solid rgba(0,196,168,0.15)", borderRadius: 8,
          fontSize: 12, color: TEAL, fontFamily: SANS, textAlign: "center",
        }}>
          <a href="/assessment?retake=true" style={{ color: TEAL, textDecoration: "none", fontWeight: 600 }}>
            Take the assessment to see your match
          </a>
        </div>
      )}
    </a>
  );
}

function SignInModal({ onClose, onSignedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (err) throw err;
      onSignedIn(data.user);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const inputStyle = {
    width: "100%", padding: "11px 14px", fontSize: 14, fontFamily: SANS,
    border: `1px solid ${BORDER}`, borderRadius: 8, outline: "none",
    background: BG, color: TEXT, marginBottom: 12,
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: BG, borderRadius: 16, padding: "32px 28px", width: 380, maxWidth: "92vw", boxShadow: "0 8px 48px rgba(0,0,0,0.14)" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: TEAL, fontWeight: 600, marginBottom: 6, fontFamily: SANS }}>Welcome Back</div>
        <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 400, color: TEXT, margin: "0 0 4px" }}>Sign in to see your match</h2>
        <p style={{ fontSize: 13, color: MUTED, margin: "0 0 20px", fontFamily: SANS, lineHeight: 1.5 }}>Log in with your candidate account to see personality match scores on every job listing.</p>
        <form onSubmit={handleSubmit}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required style={inputStyle} />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required style={inputStyle} />
          {error && <div style={{ fontSize: 12, color: "#DC2626", marginBottom: 10, fontFamily: SANS }}>{error}</div>}
          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "11px", fontSize: 14, fontWeight: 600,
            fontFamily: SANS, background: TEAL, color: "#fff", border: "none",
            borderRadius: 8, cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}>{loading ? "Signing in..." : "Sign In"}</button>
        </form>
        <div style={{ marginTop: 14, textAlign: "center", fontSize: 12, color: MUTED2, fontFamily: SANS }}>
          Don't have an account? <a href="/assessment?retake=true" style={{ color: TEAL, textDecoration: "none", fontWeight: 600 }}>Take the assessment</a>
        </div>
      </div>
    </div>
  );
}

export default function JobsPage() {
  const { auth, checked: authChecked } = useAuthState();
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Software Development");
  const [workType, setWorkType] = useState("all");
  const [ocean, setOcean] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  // Check for existing candidate profile
  useEffect(() => {
    const stored = localStorage.getItem("careermatch_result");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.ocean) {
          setOcean(parsed.ocean);
          setHasProfile(true);
        }
      } catch {}
    }
  }, []);

  const handleSignedIn = async (user) => {
    setShowSignIn(false);
    try {
      const res = await authFetch(`/api/save-candidate?userId=${encodeURIComponent(user.id)}`);
      const json = await res.json();
      if (json.candidate?.ocean) {
        setOcean(json.candidate.ocean);
        setHasProfile(true);
      }
    } catch {}
  };

  // Fetch jobs
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (category !== "all") params.set("category", category);
    if (workType !== "all") params.set("workType", workType);
    if (ocean) params.set("ocean", JSON.stringify(ocean));

    fetch(`/api/jobs?${params}`)
      .then(r => r.json())
      .then(data => {
        setJobs(data.jobs || []);
        setTotal(data.total || 0);
      })
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [search, category, workType, ocean]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Update document title for SEO
  useEffect(() => {
    document.title = "Tech Jobs Matched to Your Personality — WiredFor.ai";
  }, []);

  const mobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div style={{ minHeight: "100dvh", background: BG, fontFamily: SANS }}>
      {/* Nav */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${BORDER}`, height: 64,
      }}>
        <div style={{
          maxWidth: 1080, margin: "0 auto", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 24px",
        }}>
          <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
            <svg viewBox="0 0 48 48" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="48" height="48" rx="12" fill="#0A0A0A"/>
              <circle cx="8" cy="13" r="4" fill="#00C4A8"/><circle cx="18" cy="35" r="3" fill="#6B4FFF"/><circle cx="24" cy="22" r="3.5" fill="#00C4A8"/><circle cx="30" cy="35" r="3" fill="#6B4FFF"/><circle cx="40" cy="13" r="4" fill="#00C4A8"/>
              <line x1="8" y1="13" x2="18" y2="35" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/><line x1="18" y1="35" x2="24" y2="22" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/><line x1="24" y1="22" x2="30" y2="35" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/><line x1="30" y1="35" x2="40" y2="13" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: SERIF, fontSize: 20, color: TEXT }}>WiredFor<span style={{ color: TEAL }}>.ai</span></span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {authChecked && auth ? (
              <NavUserMenu auth={auth} />
            ) : authChecked && !hasProfile ? (
              <button onClick={() => setShowSignIn(true)} style={{
                background: TEAL, color: "#fff", border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 8, fontFamily: SANS,
              }}>Sign In</button>
            ) : null}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div style={{ padding: mobile ? "48px 20px 32px" : "64px 24px 40px", maxWidth: 1080, margin: "0 auto" }}>
        <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: TEAL, fontWeight: 600, marginBottom: 8, fontFamily: SANS }}>
          {hasProfile ? "Personality-Matched Jobs" : "Tech Jobs"}
        </div>
        <h1 style={{ fontFamily: SERIF, fontSize: mobile ? 28 : 36, fontWeight: 400, color: TEXT, margin: "0 0 8px", letterSpacing: "-0.5px" }}>
          {hasProfile ? "Find roles you're actually wired for" : "Tech roles matched to personality"}
        </h1>
        <p style={{ fontSize: 15, color: MUTED, margin: "0 0 32px", maxWidth: 520, lineHeight: 1.7 }}>
          {hasProfile
            ? "Jobs ranked by how well they fit your personality profile. Higher match = better fit for how you actually work."
            : "Real tech jobs from top remote boards. Take the assessment to see your personality match on every role."}
        </p>

        {/* Filters */}
        <div style={{
          display: "flex", flexDirection: mobile ? "column" : "row",
          gap: 10, marginBottom: 24,
        }}>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search by role, company, or keyword..."
            style={{
              flex: 1, padding: "10px 14px", fontSize: 14, fontFamily: SANS,
              border: `1px solid ${BORDER}`, borderRadius: 8, outline: "none",
              background: BG, color: TEXT,
            }}
          />
          <select value={category} onChange={e => setCategory(e.target.value)} style={{
            padding: "10px 14px", fontSize: 13, fontFamily: SANS,
            border: `1px solid ${BORDER}`, borderRadius: 8, background: BG, color: TEXT, cursor: "pointer",
          }}>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={workType} onChange={e => setWorkType(e.target.value)} style={{
            padding: "10px 14px", fontSize: 13, fontFamily: SANS,
            border: `1px solid ${BORDER}`, borderRadius: 8, background: BG, color: TEXT, cursor: "pointer",
          }}>
            {WORK_TYPES.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
          </select>
        </div>

        {/* Results count */}
        <div style={{ fontSize: 13, color: MUTED2, marginBottom: 16, fontFamily: SANS }}>
          {loading ? "Loading jobs..." : `${jobs.length} of ${total} roles${hasProfile ? " · sorted by personality match" : ""}`}
        </div>
      </div>

      {/* Job list */}
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px 80px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: MUTED }}>
            <div style={{ width: 28, height: 28, border: "3px solid rgba(0,196,168,0.2)", borderTopColor: TEAL, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
            Fetching jobs from 4 boards...
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: MUTED }}>
            No jobs match your filters. Try broadening your search.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {jobs.map(job => (
              <JobCard key={job.id} job={job} hasProfile={hasProfile} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${BORDER}`, padding: "24px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: MUTED2, fontFamily: SANS }}>
          Jobs aggregated from Remotive, RemoteOK, and Findwork.dev · Updated every 6 hours
        </div>
      </footer>

      {showSignIn && (
        <SignInModal onClose={() => setShowSignIn(false)} onSignedIn={handleSignedIn} />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
