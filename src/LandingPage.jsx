import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

const BOOKING_URL = "https://calendly.com/wiredforai";

// ── Design tokens — Light theme ───────────────────────────────────────────
const T = {
  bg:       "#FFFFFF",
  bg2:      "#F7F7F5",
  teal:     "#00C4A8",
  purple:   "#6B4FFF",
  orange:   "#F55D2C",
  t1:       "#0A0A0A",
  t2:       "#6B6B6B",
  t3:       "#9B9B9B",
  border:   "rgba(0,0,0,0.08)",
  borderMd: "rgba(0,0,0,0.14)",
  shadow:   "0 2px 20px rgba(0,0,0,0.06)",
  shadowMd: "0 4px 32px rgba(0,0,0,0.10)",
  serif:    "'DM Serif Display', Georgia, serif",
  sans:     "'DM Sans', 'Helvetica Neue', sans-serif",
};

const CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; background: #FFFFFF; }
  @keyframes lp-up {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes lp-card {
    from { opacity: 0; transform: translateY(28px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes bar-grow {
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
  }
  .lp-label { animation: lp-up 0.6s ease 0.06s both; }
  .lp-h1    { animation: lp-up 0.6s ease 0.16s both; }
  .lp-sub   { animation: lp-up 0.6s ease 0.28s both; }
  .lp-stats { animation: lp-up 0.6s ease 0.38s both; }
  .lp-cta   { animation: lp-up 0.6s ease 0.50s both; }
  .lp-card  { animation: lp-card 0.75s ease 0.55s both; }
  .bar-o { animation: bar-grow 1s cubic-bezier(0.16,1,0.3,1) 0.90s both; transform-origin: left center; }
  .bar-c { animation: bar-grow 1s cubic-bezier(0.16,1,0.3,1) 1.02s both; transform-origin: left center; }
  .bar-e { animation: bar-grow 1s cubic-bezier(0.16,1,0.3,1) 1.14s both; transform-origin: left center; }
  .bar-a { animation: bar-grow 1s cubic-bezier(0.16,1,0.3,1) 1.26s both; transform-origin: left center; }
  .bar-n { animation: bar-grow 1s cubic-bezier(0.16,1,0.3,1) 1.38s both; transform-origin: left center; }
  .lp-r1 { animation: lp-up 0.45s ease 1.45s both; }
  .lp-r2 { animation: lp-up 0.45s ease 1.55s both; }
  .lp-r3 { animation: lp-up 0.45s ease 1.65s both; }
  .carousel-track {
    position: relative;
    height: 480px;
  }
  .carousel-card {
    position: absolute;
    inset: 0;
    transition: opacity 0.4s ease, transform 0.4s ease;
    will-change: opacity, transform;
  }
  .carousel-card.active   { opacity: 1; transform: translateY(0);   pointer-events: auto; }
  .carousel-card.inactive { opacity: 0; transform: translateY(10px); pointer-events: none; }
`;

// ── Hooks ─────────────────────────────────────────────────────────────────
function useW() {
  const [w, setW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1200));
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return w;
}

// ── Primitives ────────────────────────────────────────────────────────────
function Label({ children, color = T.teal, className, light = false }) {
  return (
    <div className={className} style={{ display: "inline-flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{
        fontFamily: T.sans, fontSize: 11, fontWeight: 600,
        letterSpacing: "0.10em", textTransform: "uppercase",
        color: light ? "rgba(255,255,255,0.65)" : T.t3,
      }}>{children}</span>
    </div>
  );
}

function Arrow({ color = "#fff", size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M3 8h10M9 4l4 4-4 4" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SectionHeading({ children, light = false, mobile }) {
  return (
    <h2 style={{
      fontFamily: T.serif,
      fontSize: mobile ? "clamp(32px, 8vw, 42px)" : "clamp(38px, 3.5vw, 52px)",
      fontWeight: 400, lineHeight: 1.1, letterSpacing: "-1.5px",
      color: light ? "#fff" : T.t1, margin: "0 0 16px",
    }}>{children}</h2>
  );
}

// ── Step card ─────────────────────────────────────────────────────────────
function Step({ n, title, body, accent, light = false }) {
  return (
    <div style={{
      flex: "1 1 220px",
      background: light ? "rgba(255,255,255,0.10)" : T.bg,
      border: `1px solid ${light ? "rgba(255,255,255,0.15)" : T.border}`,
      borderRadius: 14, padding: "24px 22px 26px",
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: `${accent}18`, border: `1.5px solid ${accent}35`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, color: accent,
        fontFamily: T.sans, marginBottom: 16, letterSpacing: "0.02em",
      }}>{n}</div>
      <div style={{
        fontSize: 14, fontWeight: 600,
        color: light ? "#fff" : T.t1,
        fontFamily: T.sans, marginBottom: 8, letterSpacing: "-0.01em",
      }}>{title}</div>
      <div style={{
        fontSize: 13, lineHeight: 1.72, fontFamily: T.sans,
        color: light ? "rgba(255,255,255,0.65)" : T.t2,
      }}>{body}</div>
    </div>
  );
}

// ── Problem card ──────────────────────────────────────────────────────────
function ProblemCard({ title, body }) {
  return (
    <div style={{
      flex: "1 1 280px",
      background: T.bg, border: `1px solid ${T.border}`,
      borderRadius: 16, padding: "28px 26px 30px",
      boxShadow: T.shadow,
    }}>
      <div style={{
        fontSize: 15, fontWeight: 600, color: T.t1,
        fontFamily: T.sans, marginBottom: 10, letterSpacing: "-0.02em",
      }}>{title}</div>
      <div style={{ fontSize: 14, color: T.t2, lineHeight: 1.75, fontFamily: T.sans }}>
        {body}
      </div>
    </div>
  );
}

// ── Trust pillar ──────────────────────────────────────────────────────────
function TrustPillar({ icon, title, body }) {
  return (
    <div style={{ flex: "1 1 260px", padding: "4px 0" }}>
      <div style={{ fontSize: 28, marginBottom: 14 }}>{icon}</div>
      <div style={{
        fontSize: 15, fontWeight: 600, color: T.t1,
        fontFamily: T.sans, marginBottom: 8, letterSpacing: "-0.02em",
      }}>{title}</div>
      <div style={{ fontSize: 14, color: T.t2, lineHeight: 1.75, fontFamily: T.sans }}>
        {body}
      </div>
    </div>
  );
}

// ── Hero profile card (animated) ──────────────────────────────────────────
const PROFILES = [
  {
    wfId: "WF-4X2K9M",
    archetype: "The Architect",
    category: "Builder",
    tagline: "Designs complex systems that outlast the moment",
    tags: "Systems thinker · Deep focus · High ownership",
    glow: "rgba(0,196,168,0.10)",
    ocean: [
      { label: "Openness",          val: 86, color: "#00C4A8" },
      { label: "Conscientiousness", val: 83, color: "#6B4FFF" },
      { label: "Extraversion",      val: 23, color: "#F55D2C" },
      { label: "Agreeableness",     val: 50, color: "#FFB800" },
      { label: "Neuroticism",       val: 28, color: "#FF3CAC" },
    ],
    roles: ["Staff Engineer", "Platform Engineer", "Solutions Architect"],
  },
  {
    wfId: "WF-7R9LPQ",
    archetype: "The Visionary",
    category: "Leader",
    tagline: "Sees the future before anyone else",
    tags: "Big-picture · People energized · Low neuroticism",
    glow: "rgba(107,79,255,0.08)",
    ocean: [
      { label: "Openness",          val: 91, color: "#00C4A8" },
      { label: "Conscientiousness", val: 58, color: "#6B4FFF" },
      { label: "Extraversion",      val: 79, color: "#F55D2C" },
      { label: "Agreeableness",     val: 64, color: "#FFB800" },
      { label: "Neuroticism",       val: 31, color: "#FF3CAC" },
    ],
    roles: ["Product Manager", "Head of Product", "Chief of Staff"],
  },
  {
    wfId: "WF-M3XTBK",
    archetype: "The Maven",
    category: "Specialist",
    tagline: "Knows more about their domain than almost anyone",
    tags: "Deep expertise · Mastery-driven · Independent",
    glow: "rgba(245,93,44,0.07)",
    ocean: [
      { label: "Openness",          val: 78, color: "#00C4A8" },
      { label: "Conscientiousness", val: 88, color: "#6B4FFF" },
      { label: "Extraversion",      val: 31, color: "#F55D2C" },
      { label: "Agreeableness",     val: 42, color: "#FFB800" },
      { label: "Neuroticism",       val: 26, color: "#FF3CAC" },
    ],
    roles: ["Security Engineer", "ML Researcher", "Database Architect"],
  },
];

const BAR_CLASSES = ["bar-o", "bar-c", "bar-e", "bar-a", "bar-n"];

function ProfileCardCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setActive(i => (i + 1) % PROFILES.length), 4000);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <div className="lp-card" style={{ width: "100%" }}>
      {/* Fixed-height track — all 3 cards absolutely stacked, no layout shift */}
      <div
        className="carousel-track"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {PROFILES.map((p, i) => (
          <div
            key={p.wfId}
            className={`carousel-card ${i === active ? "active" : "inactive"}`}
            style={{
              background: T.bg, border: `1px solid ${T.border}`,
              borderRadius: 20, padding: "24px",
              boxShadow: T.shadowMd, overflow: "hidden",
            }}
          >
            {/* Glow */}
            <div style={{
              position: "absolute", top: -50, right: -50,
              width: 180, height: 180, borderRadius: "50%", pointerEvents: "none",
              background: `radial-gradient(ellipse, ${p.glow} 0%, transparent 70%)`,
            }} />

            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18, position: "relative" }}>
              <div>
                <div style={{ fontSize: 10, color: T.t3, letterSpacing: "0.09em", fontFamily: T.sans, textTransform: "uppercase", marginBottom: 3 }}>WF-ID</div>
                <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: T.t1, letterSpacing: "0.04em" }}>{p.wfId.replace("WF-", "")}</div>
              </div>
              <div style={{
                background: "rgba(0,196,168,0.10)", border: "1px solid rgba(0,196,168,0.25)",
                borderRadius: 6, padding: "4px 10px",
                fontSize: 11, fontWeight: 600, color: T.teal,
                fontFamily: T.sans, letterSpacing: "0.02em",
              }}>Matched</div>
            </div>

            {/* Archetype */}
            <div style={{ marginBottom: 20, position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                <div style={{ fontFamily: T.serif, fontSize: 21, fontWeight: 400, color: T.t1, letterSpacing: "-0.5px" }}>
                  {p.archetype}
                </div>
                {p.category && (
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B4FFF", background: "rgba(107,79,255,0.08)", padding: "3px 8px", borderRadius: 10 }}>
                    {p.category}
                  </span>
                )}
              </div>
              {p.tagline && (
                <div style={{ fontSize: 13, color: T.teal, fontStyle: "italic", marginBottom: 5, fontFamily: T.sans }}>{p.tagline}</div>
              )}
              <div style={{ fontSize: 12, color: T.t2, fontFamily: T.sans, lineHeight: 1.55 }}>{p.tags}</div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: T.border, marginBottom: 18 }} />

            {/* OCEAN bars */}
            <div style={{ marginBottom: 20, position: "relative" }}>
              <div style={{ fontSize: 10, color: T.t3, letterSpacing: "0.09em", textTransform: "uppercase", fontFamily: T.sans, fontWeight: 600, marginBottom: 12 }}>
                Personality Profile
              </div>
              {p.ocean.map(({ label, val, color }, idx) => (
                <div key={label} style={{ marginBottom: 9 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: T.t2, fontFamily: T.sans }}>{label}</span>
                    <span style={{ fontSize: 11, color, fontFamily: T.sans, fontWeight: 600 }}>{val}%</span>
                  </div>
                  <div style={{ height: 3, background: "rgba(0,0,0,0.07)", borderRadius: 2, overflow: "hidden" }}>
                    <div
                      className={i === 0 ? BAR_CLASSES[idx] : undefined}
                      style={{ height: "100%", borderRadius: 2, background: color, width: `${val}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: T.border, marginBottom: 16 }} />

            {/* Matched roles */}
            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 10, color: T.t3, letterSpacing: "0.09em", textTransform: "uppercase", fontFamily: T.sans, fontWeight: 600, marginBottom: 10 }}>
                Top Matched Roles
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {p.roles.map((label, ri) => (
                  <span
                    key={label}
                    className={i === 0 ? ["lp-r1","lp-r2","lp-r3"][ri] : undefined}
                    style={{
                      fontSize: 11, color: T.t1, fontFamily: T.sans, fontWeight: 500,
                      background: "rgba(0,0,0,0.04)", border: `1px solid ${T.border}`,
                      borderRadius: 6, padding: "5px 10px", display: "inline-block",
                    }}
                  >{label}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 16 }}>
        {PROFILES.map((_, i) => (
          <button
            key={i}
            onClick={() => { setActive(i); setPaused(true); setTimeout(() => setPaused(false), 6000); }}
            style={{
              width: i === active ? 20 : 6, height: 6, borderRadius: 3, padding: 0, border: "none",
              background: i === active ? T.teal : "rgba(0,0,0,0.15)",
              cursor: "pointer", transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Product section mock UI ───────────────────────────────────────────────
function MockCandidateResult() {
  const ocean = [
    { label: "Openness",          val: 87, color: "#00C4A8" },
    { label: "Conscientiousness", val: 72, color: "#6B4FFF" },
    { label: "Extraversion",      val: 31, color: "#F55D2C" },
    { label: "Agreeableness",     val: 64, color: "#FFBE0B" },
    { label: "Neuroticism",       val: 28, color: "#FF6B89" },
  ];
  return (
    <div style={{
      background: T.bg, border: `1px solid ${T.border}`,
      borderRadius: 16, padding: "22px", boxShadow: T.shadow,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{
          background: "rgba(0,196,168,0.10)", border: "1px solid rgba(0,196,168,0.25)",
          borderRadius: 6, padding: "3px 9px",
          fontSize: 10, fontWeight: 600, color: T.teal, fontFamily: T.sans,
        }}>Your Profile</div>
        <div style={{ fontFamily: "monospace", fontSize: 11, color: T.t3 }}>WF-4X2K9M</div>
      </div>
      <div style={{ fontFamily: T.serif, fontSize: 20, color: T.t1, marginBottom: 4, letterSpacing: "-0.5px" }}>
        Deep Systems Thinker
      </div>
      <div style={{ fontSize: 12, color: T.t2, fontFamily: T.sans, marginBottom: 16, lineHeight: 1.5 }}>
        You thrive in ownership-heavy, low-ambiguity environments
      </div>
      <div style={{ height: 1, background: T.border, marginBottom: 14 }} />
      <div style={{ fontSize: 10, color: T.t3, letterSpacing: "0.09em", textTransform: "uppercase", fontFamily: T.sans, fontWeight: 600, marginBottom: 10 }}>OCEAN Profile</div>
      {ocean.map(({ label, val, color }) => (
        <div key={label} style={{ marginBottom: 7 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: T.t2, fontFamily: T.sans }}>{label}</span>
            <span style={{ fontSize: 11, color, fontFamily: T.sans, fontWeight: 600 }}>{val}%</span>
          </div>
          <div style={{ height: 3, background: "rgba(0,0,0,0.07)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 2, background: color, width: `${val}%` }} />
          </div>
        </div>
      ))}
      <div style={{ height: 1, background: T.border, margin: "14px 0 12px" }} />
      <div style={{ fontSize: 10, color: T.t3, letterSpacing: "0.09em", textTransform: "uppercase", fontFamily: T.sans, fontWeight: 600, marginBottom: 8 }}>Matched Roles</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {["Product Manager", "Technical PM", "Eng Lead"].map(r => (
          <span key={r} style={{
            fontSize: 11, color: T.t1, fontFamily: T.sans, fontWeight: 500,
            background: "rgba(0,0,0,0.04)", border: `1px solid ${T.border}`,
            borderRadius: 5, padding: "4px 9px",
          }}>{r}</span>
        ))}
      </div>
    </div>
  );
}

function MockEmployerDash() {
  const candidates = [
    { id: "4X2K9M", arch: "Deep Systems Thinker", fit: 94, tags: ["High openness", "Low extraversion"],   fitColor: "#00C4A8" },
    { id: "2P9RVN", arch: "The Builder",           fit: 87, tags: ["High conscientiousness", "Direct"],    fitColor: "#6B4FFF" },
    { id: "8L3WZX", arch: "The Analyst",           fit: 76, tags: ["Systematic", "Detail-oriented"],       fitColor: "#F55D2C" },
  ];
  return (
    <div style={{
      background: T.bg, border: `1px solid ${T.border}`,
      borderRadius: 16, padding: "22px", boxShadow: T.shadow,
    }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: T.t3, letterSpacing: "0.09em", textTransform: "uppercase", fontFamily: T.sans, fontWeight: 600, marginBottom: 3 }}>Senior Engineer Role</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.t1, fontFamily: T.sans }}>8 anonymous matches found</div>
      </div>
      {candidates.map((c, i) => (
        <div key={c.id} style={{
          padding: "12px 0",
          borderTop: `1px solid ${T.border}`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: `${c.fitColor}14`, border: `1px solid ${c.fitColor}30`,
            flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 10, color: c.fitColor, fontFamily: "monospace", fontWeight: 700 }}>{c.id.slice(0, 2)}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.t1, fontFamily: T.sans }}>{c.arch}</span>
              <span style={{ fontSize: 10, color: T.t3, fontFamily: "monospace" }}>WF-{c.id}</span>
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {c.tags.map(tag => (
                <span key={tag} style={{
                  fontSize: 10, color: T.t2, fontFamily: T.sans,
                  background: "rgba(0,0,0,0.04)", border: `1px solid ${T.border}`,
                  borderRadius: 4, padding: "2px 7px",
                }}>{tag}</span>
              ))}
            </div>
          </div>
          <div style={{
            background: `${c.fitColor}14`, border: `1px solid ${c.fitColor}30`,
            borderRadius: 6, padding: "4px 9px",
            fontSize: 12, fontWeight: 700, color: c.fitColor,
            fontFamily: T.sans, flexShrink: 0,
          }}>{c.fit}%</div>
        </div>
      ))}
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.border}` }}>
        <div style={{
          width: "100%", padding: "10px 14px",
          background: T.teal, color: "#fff",
          borderRadius: 8, fontSize: 13, fontWeight: 600,
          fontFamily: T.sans, letterSpacing: "-0.01em", textAlign: "center",
        }}>Request Intro →</div>
      </div>
    </div>
  );
}

// ── User Type Modal ───────────────────────────────────────────────────────
function UserTypeModal({ mode, onClose }) {
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTypeSelect = (type) => {
    if (mode === "get-started") {
      window.location.href = type === "candidate" ? "/assessment" : "/employer";
      return;
    }
    setUserType(type);
    setStep(2);
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(), password,
      });
      if (err) throw err;
      const storedType = data.user?.user_metadata?.user_type;
      window.location.href = (storedType || userType) === "employer" ? "/employer" : "/assessment";
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const tileStyle = (active) => ({
    width: "100%", padding: "18px 20px", borderRadius: 14, cursor: "pointer",
    background: active ? "rgba(0,196,168,0.06)" : T.bg2,
    border: `1.5px solid ${active ? T.teal : T.border}`,
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 16, textAlign: "left", fontFamily: T.sans, transition: "all 0.15s",
  });

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div style={{
        position: "relative", background: T.bg, border: `1px solid ${T.border}`,
        borderRadius: 20, padding: "36px 32px", width: "100%", maxWidth: 420,
        boxShadow: "0 12px 56px rgba(0,0,0,0.14)",
      }} onClick={e => e.stopPropagation()}>

        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 16, background: "none",
          border: "none", fontSize: 22, color: T.t3, cursor: "pointer", lineHeight: 1,
          padding: 4,
        }}>×</button>

        {step === 1 ? (
          <>
            <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: T.teal, marginBottom: 10, fontFamily: T.sans }}>
              {mode === "signin" ? "Welcome back" : "Get started"}
            </div>
            <h2 style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 400, color: T.t1, margin: "0 0 6px" }}>
              {mode === "signin" ? "Who are you signing in as?" : "Who are you?"}
            </h2>
            <p style={{ fontSize: 14, color: T.t2, margin: "0 0 28px", fontFamily: T.sans }}>
              {mode === "signin" ? "We'll take you to the right place." : "We'll point you in the right direction."}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <button style={tileStyle(false)} onClick={() => handleTypeSelect("candidate")}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.teal; e.currentTarget.style.background = "rgba(0,196,168,0.06)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.bg2; }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.t1, marginBottom: 3 }}>I'm a Candidate</div>
                  <div style={{ fontSize: 13, color: T.t2 }}>Discover roles you're wired for</div>
                </div>
                <Arrow color={T.teal} size={16} />
              </button>
              <button style={tileStyle(false)} onClick={() => handleTypeSelect("employer")}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.purple; e.currentTarget.style.background = "rgba(107,79,255,0.05)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.bg2; }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.t1, marginBottom: 3 }}>I'm an Employer</div>
                  <div style={{ fontSize: 13, color: T.t2 }}>Find candidates who fit your team</div>
                </div>
                <Arrow color={T.purple} size={16} />
              </button>
            </div>
          </>
        ) : (
          <>
            <button onClick={() => { setStep(1); setError(""); }} style={{
              background: "none", border: "none", color: T.t3, fontSize: 13,
              cursor: "pointer", fontFamily: T.sans, padding: "0 0 16px", display: "flex", alignItems: "center", gap: 6,
            }}>← Back</button>

            <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: userType === "employer" ? T.purple : T.teal, marginBottom: 10, fontFamily: T.sans }}>
              {userType === "employer" ? "Employer" : "Candidate"} sign-in
            </div>
            <h2 style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 400, color: T.t1, margin: "0 0 24px" }}>
              Welcome back
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              <input
                type="email" placeholder="Email address" value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSignIn()}
                autoComplete="email"
                style={{
                  width: "100%", background: T.bg2, border: `1px solid rgba(0,0,0,0.10)`,
                  borderRadius: 10, padding: "12px 14px", color: T.t1, fontSize: 15,
                  fontFamily: T.sans, outline: "none", boxSizing: "border-box",
                }}
              />
              <input
                type="password" placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSignIn()}
                autoComplete="current-password"
                style={{
                  width: "100%", background: T.bg2, border: `1px solid rgba(0,0,0,0.10)`,
                  borderRadius: 10, padding: "12px 14px", color: T.t1, fontSize: 15,
                  fontFamily: T.sans, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {error && (
              <div style={{
                background: "rgba(245,93,44,0.05)", border: "1px solid rgba(245,93,44,0.15)",
                borderRadius: 8, padding: "10px 14px", marginBottom: 16,
                color: T.orange, fontSize: 13, fontFamily: T.sans,
              }}>{error}</div>
            )}

            <button
              onClick={handleSignIn}
              disabled={loading || !email.trim() || !password.trim()}
              style={{
                width: "100%", padding: "13px", borderRadius: 10, border: "none",
                background: loading || !email.trim() || !password.trim() ? T.bg2 : (userType === "employer" ? T.purple : T.teal),
                color: loading || !email.trim() || !password.trim() ? T.t3 : "#fff",
                fontSize: 15, fontWeight: 600, cursor: loading || !email.trim() || !password.trim() ? "default" : "pointer",
                fontFamily: T.sans,
              }}
            >
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const w = useW();
  const mobile = w < 768;
  const px = mobile ? "20px" : w < 1100 ? "48px" : "80px";
  const maxW = 1080;
  const [modal, setModal] = useState(null); // null | "signin" | "get-started"

  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: T.sans, color: T.t1, overflowX: "hidden" }}>
      <style>{CSS}</style>
      {modal && <UserTypeModal mode={modal} onClose={() => setModal(null)} />}

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        borderBottom: `1px solid ${T.border}`,
        height: 64,
      }}>
        <div style={{
          maxWidth: maxW, margin: "0 auto",
          height: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: `0 ${px}`,
        }}>
          <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
            <svg viewBox="0 0 48 48" width="28" height="28" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="48" height="48" rx="12" fill="#0A0A0A"/>
              <circle cx="8" cy="13" r="4" fill="#00C4A8"/>
              <circle cx="18" cy="35" r="3" fill="#6B4FFF"/>
              <circle cx="24" cy="22" r="3.5" fill="#00C4A8"/>
              <circle cx="30" cy="35" r="3" fill="#6B4FFF"/>
              <circle cx="40" cy="13" r="4" fill="#00C4A8"/>
              <line x1="8" y1="13" x2="18" y2="35" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="18" y1="35" x2="24" y2="22" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="24" y1="22" x2="30" y2="35" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="30" y1="35" x2="40" y2="13" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: T.serif, fontSize: 20, color: "#0A0A0A", letterSpacing: "-0.3px" }}>
              WiredFor<span style={{ color: "#00C4A8" }}>.ai</span>
            </span>
          </a>

          {!mobile && (
            <nav style={{ display: "flex", alignItems: "center", gap: 2 }}>
              {[["How It Works", "#how-it-works"], ["For Employers", "#for-employers"], ["For Candidates", "#for-candidates"]].map(([label, href]) => (
                <a key={label} href={href} style={{
                  textDecoration: "none", color: T.t2, fontSize: 14,
                  padding: "7px 13px", borderRadius: 7, transition: "color 0.15s", fontFamily: T.sans,
                }}
                  onMouseEnter={e => e.currentTarget.style.color = T.t1}
                  onMouseLeave={e => e.currentTarget.style.color = T.t2}
                >{label}</a>
              ))}
            </nav>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setModal("signin")} style={{
              background: "none", border: "none", color: T.t2, fontSize: 14, fontFamily: T.sans,
              padding: "7px 13px", borderRadius: 7, transition: "color 0.15s", cursor: "pointer",
            }}
              onMouseEnter={e => e.currentTarget.style.color = T.t1}
              onMouseLeave={e => e.currentTarget.style.color = T.t2}
            >Sign In</button>
            <button onClick={() => setModal("get-started")} style={{
              background: T.teal, color: "#fff", border: "none",
              fontSize: 13, fontWeight: 600, padding: "9px 18px", borderRadius: 8,
              transition: "opacity 0.15s", letterSpacing: "-0.01em", fontFamily: T.sans,
              display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >Get Started <Arrow color="#fff" size={12} /></button>
          </div>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section style={{
        background: T.bg,
        padding: mobile ? "72px 20px 64px" : `88px ${px} 88px`,
        position: "relative", overflow: "hidden",
      }}>
        {/* Subtle background shape */}
        <div style={{
          position: "absolute", top: -120, right: -120,
          width: 600, height: 600, borderRadius: "50%", pointerEvents: "none",
          background: "radial-gradient(ellipse, rgba(0,196,168,0.06) 0%, transparent 60%)",
        }} />
        <div style={{
          position: "absolute", bottom: -100, left: "30%",
          width: 400, height: 400, borderRadius: "50%", pointerEvents: "none",
          background: "radial-gradient(ellipse, rgba(107,79,255,0.05) 0%, transparent 60%)",
        }} />

        <div style={{
          maxWidth: maxW, margin: "0 auto", position: "relative",
          display: "flex",
          flexDirection: mobile ? "column" : "row",
          alignItems: mobile ? "stretch" : "center",
          gap: mobile ? 52 : 60,
        }}>
          {/* Left */}
          <div style={{ flex: 1, textAlign: mobile ? "center" : "left" }}>
            <Label color={T.teal} className="lp-label">Personality-First Tech Hiring</Label>

            <h1 className="lp-h1" style={{
              fontFamily: T.serif,
              fontSize: mobile ? "clamp(42px, 11vw, 58px)" : "clamp(52px, 5.5vw, 74px)",
              fontWeight: 400, color: T.t1, lineHeight: 1.08,
              letterSpacing: "-2px", margin: "0 0 24px",
            }}>
              You hired the<br />
              perfect resume.<br />
              <em style={{ color: T.teal }}>Then watched them<br />quit in 6 months.</em>
            </h1>

            <p className="lp-sub" style={{
              fontSize: mobile ? 15 : 17, color: T.t2, lineHeight: 1.72,
              maxWidth: mobile ? "none" : 480, margin: mobile ? "0 auto 28px" : "0 0 28px",
              fontWeight: 400, letterSpacing: "-0.01em",
            }}>
              Most tech hiring fails not because of skill gaps — but because of personality
              and culture mismatch. WiredFor.ai fixes the part of hiring everyone ignores.
            </p>

            {/* Stats strip */}
            <div className="lp-stats" style={{
              display: "flex", flexDirection: mobile ? "column" : "row",
              border: `1px solid ${T.border}`, borderRadius: 14,
              overflow: "hidden", marginBottom: 30,
              background: T.bg2,
            }}>
              {[
                { num: "89%",     label: "of bad hires are culture misfits",                 accent: T.orange },
                { num: "$15,000+", label: "average cost of a single bad hire",               accent: T.purple },
                { num: "40%",     label: "improvement in retention with personality matching", accent: T.teal  },
              ].map(({ num, label, accent }, i, arr) => (
                <div key={num} style={{
                  flex: 1,
                  padding: "16px 18px",
                  borderRight: !mobile && i < arr.length - 1 ? `1px solid ${T.border}` : "none",
                  borderBottom: mobile && i < arr.length - 1 ? `1px solid ${T.border}` : "none",
                }}>
                  <div style={{
                    fontFamily: T.serif, fontSize: mobile ? 26 : 28,
                    color: accent, lineHeight: 1, marginBottom: 6, letterSpacing: "-0.8px",
                  }}>{num}</div>
                  <div style={{ fontSize: 12, color: T.t2, lineHeight: 1.5, fontFamily: T.sans }}>{label}</div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="lp-cta" style={{
              display: "flex", flexDirection: mobile ? "column" : "row",
              alignItems: "center",
              justifyContent: mobile ? "center" : "flex-start",
              gap: 10, marginBottom: 16,
            }}>
              <a href="/assessment" style={{
                textDecoration: "none", background: T.teal, color: "#fff",
                fontSize: 15, fontWeight: 600, fontFamily: T.sans,
                padding: "14px 26px", borderRadius: 10,
                display: "inline-flex", alignItems: "center", gap: 8,
                transition: "opacity 0.15s", whiteSpace: "nowrap",
                width: mobile ? "100%" : "auto", justifyContent: "center",
                maxWidth: mobile ? 360 : "none",
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              >Find What You're Wired For <Arrow color="#fff" /></a>
              <a href="/employer" style={{
                textDecoration: "none",
                border: `1.5px solid ${T.borderMd}`, color: T.t1,
                fontSize: 15, fontWeight: 500, fontFamily: T.sans,
                padding: "14px 26px", borderRadius: 10,
                display: "inline-flex", alignItems: "center", gap: 8,
                transition: "border-color 0.18s, background 0.18s",
                whiteSpace: "nowrap",
                width: mobile ? "100%" : "auto", justifyContent: "center",
                maxWidth: mobile ? 360 : "none",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.3)"; e.currentTarget.style.background = T.bg2; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderMd; e.currentTarget.style.background = "transparent"; }}
              >I'm Hiring</a>
            </div>

            <p className="lp-cta" style={{
              fontSize: 12, color: T.t3, fontFamily: T.sans, margin: 0,
              textAlign: mobile ? "center" : "left",
            }}>
              Free for candidates · Anonymous until you're ready · 15 minutes
            </p>
          </div>

          {/* Right — animated card */}
          <div style={{
            width: mobile ? "100%" : 300, flexShrink: 0,
            maxWidth: mobile ? 380 : 300,
            margin: mobile ? "0 auto" : "0",
          }}>
            <ProfileCardCarousel />
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF BAR ─────────────────────────────────────────────── */}
      <div style={{
        background: T.bg2, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`,
        padding: "18px 20px", textAlign: "center",
      }}>
        <p style={{ margin: 0, fontSize: 13, color: T.t2, fontFamily: T.sans, letterSpacing: "-0.01em" }}>
          Join{" "}
          <span style={{ fontWeight: 600, color: T.t1 }}>500+ tech professionals</span>
          {" "}who've discovered their wiring
        </p>
      </div>

      {/* ── PROBLEM SECTION ──────────────────────────────────────────────── */}
      <section style={{ background: T.bg, padding: mobile ? "80px 20px" : `96px ${px}` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto" }}>
          <Label color={T.orange}>Why Traditional Hiring Fails</Label>
          <SectionHeading mobile={mobile}>
            Skills get people hired.<br />
            <em style={{ color: T.orange }}>Personality keeps them.</em>
          </SectionHeading>
          <p style={{
            fontSize: 15, color: T.t2, maxWidth: 480, lineHeight: 1.7,
            margin: "0 0 52px", fontFamily: T.sans,
          }}>
            The hiring industry has optimized for speed and volume. Nobody is asking
            whether the hire will still be there in 18 months.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
            <ProblemCard
              title="The Resume Lie"
              body="Resumes tell you what someone has done. They tell you nothing about how they think, collaborate, or handle pressure — the things that actually determine if they'll thrive."
            />
            <ProblemCard
              title="The Interview Illusion"
              body="Interviews are 45 minutes of people performing their best selves. Research shows they predict job success less accurately than a coin flip."
            />
            <ProblemCard
              title="The Culture Mismatch"
              body="89% of hiring failures happen within the first 18 months — not because someone couldn't do the job, but because they weren't wired for the environment."
            />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS — CANDIDATES ────────────────────────────────────── */}
      <section id="for-candidates" style={{ background: T.bg2, padding: mobile ? "80px 20px" : `96px ${px}` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto" }}>
          <Label color={T.teal}>For Candidates</Label>
          <SectionHeading mobile={mobile}>
            Built for how you<br />
            <em style={{ color: T.teal }}>actually work</em>
          </SectionHeading>
          <p style={{
            fontSize: 15, color: T.t2, maxWidth: 460, lineHeight: 1.7,
            margin: "0 0 48px", fontFamily: T.sans,
          }}>
            No resume. No exposure. Just an honest look at how you're wired — and the roles that fit.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }} id="how-it-works">
            <Step n="1" accent={T.teal} title="Get Wired"
              body="Answer 35 questions built on the Big Five personality framework. Honest questions about how you think, operate, and thrive — not how you wish you did. Your personality leads. Your resume stays private until you choose to share it." />
            <Step n="2" accent={T.teal} title="See Your Profile"
              body="Get your archetype, full OCEAN personality breakdown, and 3–5 tech roles matched to how your brain actually works. Backed by 60 years of peer-reviewed psychology." />
            <Step n="3" accent={T.teal} title="Stay Anonymous"
              body="You get a unique WF-ID. Employers see your personality profile — never your name, resume, or contact info. You decide if and when to reveal yourself." />
            <Step n="4" accent={T.teal} title="Get Placed"
              body="When there's a genuine fit, we make the intro. No cold applications. No spam. No recruiters who don't know your name." />
          </div>

          <div style={{ marginTop: 36, display: "flex", flexDirection: mobile ? "column" : "row", alignItems: mobile ? "flex-start" : "center", gap: 16 }}>
            <a href="/assessment" style={{
              textDecoration: "none", background: T.teal, color: "#fff",
              fontSize: 14, fontWeight: 600, fontFamily: T.sans,
              padding: "13px 22px", borderRadius: 9,
              display: "inline-flex", alignItems: "center", gap: 8,
              transition: "opacity 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >Take the Free Assessment <Arrow color="#fff" /></a>
            <span style={{ fontSize: 12, color: T.t3, fontFamily: T.sans }}>
              15 minutes · Free · No account required to start
            </span>
          </div>
        </div>
      </section>

      {/* ── PRODUCT VISUAL SECTION ───────────────────────────────────────── */}
      <section style={{ background: T.bg, padding: mobile ? "80px 20px" : `96px ${px}` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto" }}>
          <Label color={T.purple}>The Platform</Label>
          <SectionHeading mobile={mobile}>
            What employers see.<br />
            <em style={{ color: T.purple }}>What candidates control.</em>
          </SectionHeading>
          <p style={{
            fontSize: 15, color: T.t2, maxWidth: 500, lineHeight: 1.7,
            margin: "0 0 52px", fontFamily: T.sans,
          }}>
            Employers browse personality profiles — never identities. Candidates stay
            anonymous until they choose to move forward.
          </p>

          <div style={{
            display: "flex", flexDirection: mobile ? "column" : "row",
            gap: 20, alignItems: "flex-start",
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: T.t3, letterSpacing: "0.09em", textTransform: "uppercase", fontFamily: T.sans, fontWeight: 600, marginBottom: 12 }}>
                Candidate View
              </div>
              <MockCandidateResult />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: T.t3, letterSpacing: "0.09em", textTransform: "uppercase", fontFamily: T.sans, fontWeight: 600, marginBottom: 12 }}>
                Employer View
              </div>
              <MockEmployerDash />
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS — EMPLOYERS ─────────────────────────────────────── */}
      <section id="for-employers" style={{ background: T.bg2, padding: mobile ? "80px 20px" : `96px ${px}` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto" }}>
          <Label color={T.purple}>For Employers</Label>
          <SectionHeading mobile={mobile}>
            Stop hiring for skills.<br />
            <em style={{ color: T.purple }}>Start hiring for fit.</em>
          </SectionHeading>
          <p style={{
            fontSize: 15, color: T.t2, maxWidth: 460, lineHeight: 1.7,
            margin: "0 0 48px", fontFamily: T.sans,
          }}>
            Access a pool of pre-assessed candidates ranked by personality fit — not keyword matches.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Step n="1" accent={T.purple} title="Define Your Culture"
              body="Tell us how your team operates — the environment, pace, and personality traits that make someone thrive on your team. Not just the job description." />
            <Step n="2" accent={T.purple} title="Browse Anonymous Profiles"
              body="See candidates ranked by fit score. Every profile includes an OCEAN breakdown, archetype, operating style, and an AI-generated hiring brief." />
            <Step n="3" accent={T.purple} title="Request an Intro"
              body="Found someone who fits? We reach out on your behalf. The candidate's identity is only revealed when they agree to move forward — no awkward cold outreach." />
            <Step n="4" accent={T.purple} title="Hire with Confidence"
              body="Every placement comes with a 90-day guarantee. If it's not the right fit, we find you another candidate. No questions, no extra cost." />
          </div>

          <div style={{ marginTop: 36, display: "flex", flexDirection: mobile ? "column" : "row", alignItems: mobile ? "flex-start" : "center", gap: 16 }}>
            <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" style={{
              textDecoration: "none", background: T.purple, color: "#fff",
              fontSize: 14, fontWeight: 600, fontFamily: T.sans,
              padding: "13px 22px", borderRadius: 9,
              display: "inline-flex", alignItems: "center", gap: 8,
              transition: "opacity 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >Book a Call <Arrow color="#fff" /></a>
            <span style={{ fontSize: 12, color: T.t3, fontFamily: T.sans }}>
              We're onboarding our first employer partners now
            </span>
          </div>
        </div>
      </section>

      {/* ── TRUST SECTION ────────────────────────────────────────────────── */}
      <section style={{ background: T.bg, padding: mobile ? "80px 20px" : `96px ${px}` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto" }}>
          <Label color={T.teal}>Privacy by Design</Label>
          <SectionHeading mobile={mobile}>
            Your identity is yours.<br />
            <em style={{ color: T.teal }}>Always.</em>
          </SectionHeading>

          <div style={{
            display: "flex", flexWrap: "wrap", gap: mobile ? 40 : 60, marginTop: 52,
          }}>
            <TrustPillar
              icon="🔒"
              title="Anonymous by Default"
              body="Every candidate gets a unique WF-ID. Your name, resume, and contact information are never shared without your explicit consent. Your resume is analyzed and immediately discarded — only a summary of your experience is saved. Your actual resume file is never stored on our servers."
            />
            <TrustPillar
              icon="🧠"
              title="Science, Not Guesswork"
              body="Built on the Big Five — the most rigorously tested personality framework in the world. Not a Myers-Briggs quiz. Peer-reviewed psychology."
            />
            <TrustPillar
              icon="✓"
              title="You're in Control"
              body="Employers can request an intro. You decide whether to accept. If you say no, they never know who you are. Period."
            />
          </div>
        </div>
      </section>

      {/* ── WHY WIREDFOR.AI — TEAL CONTRAST SECTION ──────────────────────── */}
      <section style={{
        background: T.teal,
        padding: mobile ? "80px 20px" : `96px ${px}`,
      }}>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: mobile ? "center" : "left" }}>
          <Label color="rgba(255,255,255,0.5)" light>Why WiredFor.ai</Label>
          <SectionHeading mobile={mobile} light>
            The hiring industry is broken.<br />
            We're fixing the part<br />
            <em style={{ fontStyle: "italic" }}>nobody else is willing to touch.</em>
          </SectionHeading>

          <div style={{ fontSize: mobile ? 15 : 17, color: "rgba(255,255,255,0.80)", lineHeight: 1.8, fontFamily: T.sans, marginTop: 32 }}>
            <p style={{ margin: "0 0 20px" }}>
              Every major hiring platform optimizes for speed and volume. More resumes.
              More interviews. More hires.
            </p>
            <p style={{ margin: "0 0 20px" }}>
              Nobody is asking whether those hires will still be there in 18 months.
            </p>
            <p style={{ margin: "0 0 20px" }}>
              WiredFor.ai is built on a simple belief: the right hire isn't the most
              qualified candidate on paper. It's the person who's genuinely wired for
              the role, the team, and the culture.
            </p>
            <p style={{ margin: 0, fontWeight: 600, color: "#fff" }}>
              That's not a feature. That's the whole point.
            </p>
          </div>
        </div>
      </section>

      {/* ── DUAL CTA SECTION ─────────────────────────────────────────────── */}
      <section style={{ background: T.bg, padding: mobile ? "80px 20px" : `96px ${px}` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto", display: "flex", gap: 16, flexWrap: "wrap" }}>

          {/* Candidates */}
          <div style={{
            flex: "1 1 400px", background: T.bg2,
            border: `1px solid ${T.border}`, borderRadius: 20,
            padding: mobile ? "40px 28px" : "52px 48px",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: -80, right: -80,
              width: 280, height: 280, borderRadius: "50%", pointerEvents: "none",
              background: "radial-gradient(ellipse, rgba(0,196,168,0.10) 0%, transparent 70%)",
            }} />
            <Label color={T.teal}>For Candidates</Label>
            <h3 style={{
              fontFamily: T.serif, fontSize: mobile ? 28 : 34,
              fontWeight: 400, color: T.t1, margin: "0 0 12px",
              letterSpacing: "-1px", lineHeight: 1.15,
            }}>
              Find what you're<br />wired for
            </h3>
            <p style={{
              fontSize: 14, color: T.t2, lineHeight: 1.75,
              margin: "0 0 32px", fontFamily: T.sans,
            }}>
              Free. Anonymous. 15 minutes. No resume required to start. Anonymous until you're ready.
            </p>
            <a href="/assessment" style={{
              textDecoration: "none", background: T.teal, color: "#fff",
              fontSize: 14, fontWeight: 600, fontFamily: T.sans,
              padding: "13px 22px", borderRadius: 9,
              display: "inline-flex", alignItems: "center", gap: 8,
              transition: "opacity 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >Start My Assessment <Arrow color="#fff" /></a>
          </div>

          {/* Employers */}
          <div style={{
            flex: "1 1 400px", background: T.bg2,
            border: `1px solid ${T.border}`, borderRadius: 20,
            padding: mobile ? "40px 28px" : "52px 48px",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: -80, right: -80,
              width: 280, height: 280, borderRadius: "50%", pointerEvents: "none",
              background: "radial-gradient(ellipse, rgba(107,79,255,0.08) 0%, transparent 70%)",
            }} />
            <Label color={T.purple}>For Employers</Label>
            <h3 style={{
              fontFamily: T.serif, fontSize: mobile ? 28 : 34,
              fontWeight: 400, color: T.t1, margin: "0 0 12px",
              letterSpacing: "-1px", lineHeight: 1.15,
            }}>
              Ready to hire<br />for fit?
            </h3>
            <p style={{
              fontSize: 14, color: T.t2, lineHeight: 1.75,
              margin: "0 0 32px", fontFamily: T.sans,
            }}>
              We're onboarding our first 10 employer partners. Book a call and we'll
              walk you through the platform.
            </p>
            <a href={BOOKING_URL} target="_blank" rel="noopener noreferrer" style={{
              textDecoration: "none", background: T.purple, color: "#fff",
              fontSize: 14, fontWeight: 600, fontFamily: T.sans,
              padding: "13px 22px", borderRadius: 9,
              display: "inline-flex", alignItems: "center", gap: 8,
              transition: "opacity 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >Book a Call <Arrow color="#fff" /></a>
          </div>

        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{
        background: T.bg2, borderTop: `1px solid ${T.border}`,
        padding: mobile ? "40px 20px" : `40px ${px}`,
      }}>
        <div style={{ maxWidth: maxW, margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 24, marginBottom: 28 }}>
            <div>
              <div style={{ fontFamily: T.serif, fontSize: 18, color: T.t1, marginBottom: 5 }}>
                Wired<span style={{ color: T.teal }}>For</span>.ai
              </div>
              <div style={{ fontSize: 13, color: T.t3, fontFamily: T.sans }}>Personality-first tech hiring</div>
            </div>
            <nav style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              {[
                ["Candidates", "/assessment"],
                ["Employers", "/employer"],
                ["How It Works", "#how-it-works"],
                ["Privacy", "#"],
              ].map(([label, href]) => (
                <a key={label} href={href} style={{
                  textDecoration: "none", fontSize: 13, color: T.t3,
                  fontFamily: T.sans, padding: "5px 12px", borderRadius: 6,
                  transition: "color 0.15s",
                }}
                  onMouseEnter={e => e.currentTarget.style.color = T.t1}
                  onMouseLeave={e => e.currentTarget.style.color = T.t3}
                >{label}</a>
              ))}
            </nav>
          </div>

          <div style={{ height: 1, background: T.border, marginBottom: 20 }} />

          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: T.t3, fontFamily: T.sans }}>
              © {new Date().getFullYear()} WiredFor.ai · All rights reserved
            </span>
            <span style={{ fontSize: 12, color: T.t3, fontFamily: T.sans }}>
              Built with personality science. Powered by AI.
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
