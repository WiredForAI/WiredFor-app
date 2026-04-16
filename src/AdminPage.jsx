import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, authFetch } from "./supabaseClient";
import { ARCHETYPES } from "./archetypes";
import { GuidedReveal } from "./CareerMatch.jsx";
import { OceanRadarChart, OceanTraitBars } from "./OceanComponents.jsx";

// Derive category from archetype name for candidates lacking archetype_category
function getArchetypeCategory(c) {
  if (c.archetype_category) return c.archetype_category;
  const found = ARCHETYPES.find(a => a.name === c.archetype);
  return found?.category || null;
}
function getArchetypeTagline(c) {
  const found = ARCHETYPES.find(a => a.name === c.archetype);
  return found?.tagline || null;
}

const ADMIN_EMAIL = "wiredforai@proton.me";
const TEST_PREFIX  = "TEST-";

// ── Simulation helpers ────────────────────────────────────────────────────────

function generateTestWFId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = TEST_PREFIX;
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function isTestProfile(c) {
  return String(c.wf_id || "").startsWith(TEST_PREFIX);
}

const ROLE_ICONS = {
  "Staff Engineer": "🏗️", "Platform Engineer": "⚙️", "Solutions Architect": "🔧",
  "QA Engineer": "🔍", "DevOps Engineer": "🚀", "Security Analyst": "🔒",
  "Backend Engineer": "💻", "Site Reliability Engineer": "📡", "Infrastructure Lead": "🏛️",
  "Full Stack Developer": "🛠️", "Developer Advocate": "📢", "Product Engineer": "⚡",
  "Product Manager": "📊", "Head of Product": "🗺️", "Chief of Staff": "🤝",
  "Engineering Manager": "👥", "VP Engineering": "🎯", "Technical Program Manager": "📋",
  "Scrum Master": "🔄", "Technical Operations Lead": "⚙️",
  "Customer Success Manager": "🌟", "Developer Relations": "🔗", "Community Lead": "🌍",
  "UX Researcher": "🔬", "Product Strategist": "♟️", "Design Researcher": "🎨",
  "Solutions Engineer": "🛠️", "Engineering Lead": "👥", "Technical Support Lead": "🤝",
  "Technical Writer": "✍️", "Data Engineer": "📈", "Business Intelligence Analyst": "📊",
  "ML Engineer": "🤖", "Security Engineer": "🔐", "ML Researcher": "🧬",
  "Database Architect": "🗄️", "Security Researcher": "🕵️", "Principal Engineer": "⭐",
  "Technical Advisor": "💡", "Technical Architect": "🏛️", "Staff Product Designer": "🎨",
};

const EXPERIENCE_LEVELS = [
  "Just starting out (0–2 years)",
  "Finding my footing (3–5 years)",
  "Mid-career (6–10 years)",
  "Senior level (11–15 years)",
  "Veteran (15+ years)",
];

const SENIORITY_PREFIX = {
  "Just starting out (0–2 years)": "",
  "Finding my footing (3–5 years)": "",
  "Mid-career (6–10 years)": "Senior ",
  "Senior level (11–15 years)": "Lead ",
  "Veteran (15+ years)": "Staff ",
};

function buildSimProfile(archetype, experienceLevel, location) {
  const vary = v => Math.max(18, Math.min(92, Math.round(v + (Math.random() * 14 - 7))));
  const bp   = archetype.oceanProfile;
  const ocean = {
    openness:          vary(bp.openness),
    conscientiousness: vary(bp.conscientiousness),
    extraversion:      vary(bp.extraversion),
    agreeableness:     vary(bp.agreeableness),
    neuroticism:       vary(bp.neuroticism),
  };

  const pre = SENIORITY_PREFIX[experienceLevel] || "";

  const roles = archetype.techFit.slice(0, 3).map(roleName => ({
    title: `${pre}${roleName}`,
    icon: ROLE_ICONS[roleName] || "💼",
    whyItFits: [
      `Your ${archetype.category.toLowerCase()} profile makes this a natural fit — ${archetype.tagline.toLowerCase()}`,
      `${ocean.conscientiousness >= 65 ? `High conscientiousness (${ocean.conscientiousness}) drives the execution discipline this role demands` : `Your flexible, adaptive approach (conscientiousness ${ocean.conscientiousness}) works well in the exploratory phases of this work`}`,
      `${ocean.extraversion >= 65 ? `Extraversion at ${ocean.extraversion} means you draw energy from collaboration — this role has plenty of it` : `Introversion at ${ocean.extraversion} suits the deep, focused work this role requires`}`,
    ],
  }));

  const watchOuts = [
    archetype.shadowSide,
    ocean.neuroticism >= 58
      ? "High-pressure sprints with shifting requirements and no clear success metrics"
      : "Repetitive maintenance roles with no growth trajectory or creative input",
    ocean.agreeableness >= 68
      ? "Team cultures where conflict avoidance means important problems never get surfaced"
      : "Environments that punish directness or require extensive political navigation before any decision",
  ];

  const cultureFit = `${archetype.category} environments are where you thrive. You operate best in teams that value ${ocean.conscientiousness >= 65 ? "structure, follow-through, and measurable outcomes" : "autonomy, experimentation, and learning from failure"} — and give you ${ocean.extraversion >= 65 ? "visibility and collaborative momentum" : "focused time and async-first communication"}. [SIMULATED TEST PROFILE — ${archetype.name}]`;

  const careerClarity = `Your ${archetype.name} profile — with openness at ${ocean.openness} and conscientiousness at ${ocean.conscientiousness} — creates a distinct operating pattern. ${ocean.openness >= 65 ? `The high openness score (${ocean.openness}) means you process complexity non-linearly, often arriving at solutions before you can articulate why they're right` : `Your grounded, methodical approach (openness ${ocean.openness}) means you build things that last — but need room to perfect before shipping`}. Extraversion at ${ocean.extraversion} means you ${ocean.extraversion >= 65 ? "draw energy from the room — meetings fuel you, not drain you" : "do your best thinking alone — collaboration is a tool, not a default"}. Agreeableness at ${ocean.agreeableness} signals ${ocean.agreeableness >= 65 ? "high team-orientation: you prioritise relationships and are trusted across functions" : "high directness: you cut through noise and make uncomfortable calls without hesitation"}. [SIMULATED TEST PROFILE]`;

  const growthPath = [
    `Build depth in ${archetype.techFit[0]} — identify the three specific skills that separate practitioners in the top 10% of this discipline and work backward from there`,
    `Address your shadow side head-on: "${archetype.shadowSide.toLowerCase()}" — this is the constraint most likely to limit your ceiling if left unmanaged`,
    `${ocean.extraversion < 50 ? "Develop your ability to communicate your work upward — your output is only as valuable as your stakeholders' understanding of it" : "Build systems that scale your impact beyond your personal involvement — create processes that work without you"}`,
  ];

  const interviewIntelligence = [
    `Lead with your ${archetype.category.toLowerCase()} framing — when asked "tell me about yourself," say: "I operate as ${archetype.name.toLowerCase()} — ${archetype.tagline.toLowerCase()}. That shows up practically in how I approach [concrete example from your work]."`,
    `On your process: say "${ocean.conscientiousness >= 65 ? "I start with structure — I'll map the problem space before touching a solution, because rework costs more than planning" : "I start by building — I've found that a working prototype reveals more about the real problem than a week of planning"}"`,
    `Pre-empt your shadow side: say "I'm aware that I can ${archetype.shadowSide.toLowerCase()} — here's how I actively manage that: [your specific mechanism]"`,
    `On collaboration: say "I work best when ${ocean.extraversion >= 65 ? "I'm embedded with the team — I get energy from the back-and-forth and I surface issues faster when I'm in the room" : "I have clear ownership and async-first communication — I produce my best work in focused blocks, then bring it to the team for pressure-testing"}"`,
  ];

  const environmentsToAvoid = [
    `${ocean.neuroticism >= 58 ? "High-ambiguity environments where strategy shifts weekly and no one is held accountable for outcomes" : "Overly bureaucratic structures where every decision requires three layers of approval before anything ships"}`,
    `${ocean.agreeableness >= 68 ? "Hyper-competitive, zero-sum team cultures where internal ranking systems pit teammates against each other" : "Cultures that reward political alignment over technical excellence or punish candid disagreement"}`,
    `${ocean.openness <= 45 ? "Roles that require constant reinvention with no stable core — perpetual pivots with no execution phase" : "Pure maintenance roles with no creative latitude — keeping the lights on without building anything new"}`,
  ];

  return {
    archetype:           archetype.name,
    operatingStyle:      archetype.description,
    archetypeTagline:    archetype.tagline,
    archetypeCategory:   archetype.category,
    archetypeShadowSide: archetype.shadowSide,
    archetypeTechFit:    archetype.techFit,
    ocean,
    roles,
    watchOuts,
    cultureFit,
    careerClarity,
    growthPath,
    interviewIntelligence,
    environmentsToAvoid,
    location:       location || null,
    workPreference: "Remote",
    resumeData:     null,
    careerPaths:    null,
    isTestProfile:  true,
  };
}

const BG = "#FFFFFF";
const CARD = "#FFFFFF";
const BG2 = "#F7F7F5";
const BORDER = "rgba(0,0,0,0.08)";
const BORDER_MD = "rgba(0,0,0,0.13)";
const ACCENT = "#00C4A8";
const PURPLE = "#6B4FFF";
const ORANGE = "#F55D2C";
const TEXT = "#0A0A0A";
const MUTED = "#6B6B6B";
const MUTED2 = "#9B9B9B";
const SHADOW = "0 2px 20px rgba(0,0,0,0.06)";
const SANS = "'DM Sans', 'Helvetica Neue', sans-serif";
const SERIF = "'DM Serif Display', Georgia, serif";

// ── Helpers ─────────────────────────────────────────────────────────────────
function fmt(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function OceanMini({ ocean }) {
  if (!ocean) return <span style={{ color: MUTED, fontSize: 12 }}>—</span>;
  const keys = ["O", "C", "E", "A", "N"];
  const colors = { O: "#00C4A8", C: "#6B4FFF", E: "#F55D2C", A: "#FFBE0B", N: "#FF6B89" };
  // normalize long keys
  const o = ocean.O !== undefined ? ocean : {
    O: ocean.openness ?? 0, C: ocean.conscientiousness ?? 0,
    E: ocean.extraversion ?? 0, A: ocean.agreeableness ?? 0, N: ocean.neuroticism ?? 0,
  };
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 24 }}>
      {keys.map(k => (
        <div key={k} title={`${k}: ${o[k]}`} style={{
          width: 8, borderRadius: 2,
          height: Math.max(3, Math.round((o[k] || 0) / 100 * 24)),
          background: colors[k], opacity: 0.85,
        }} />
      ))}
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    requested: { bg: "rgba(245,158,11,0.10)", color: "#F59E0B", label: "Requested" },
    connected: { bg: "rgba(107,79,255,0.10)", color: PURPLE, label: "Connected" },
    placed: { bg: "rgba(0,196,168,0.10)", color: ACCENT, label: "Placed" },
  };
  const s = map[status] || { bg: "rgba(0,0,0,0.04)", color: MUTED, label: status };
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.color}44`,
      borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
    }}>{s.label}</span>
  );
}

function StatCard({ label, value, color = ACCENT }) {
  return (
    <div style={{
      flex: 1, background: BG2, border: `1px solid ${BORDER}`,
      borderRadius: 12, padding: "20px 24px", boxShadow: SHADOW,
    }}>
      <div style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 400, color, marginBottom: 4 }}>{value ?? "—"}</div>
      <div style={{ fontSize: 12, color: MUTED, textTransform: "uppercase", letterSpacing: 1, fontFamily: SANS }}>{label}</div>
    </div>
  );
}

// ── Connect Modal ─────────────────────────────────────────────────────────
function ConnectModal({ userId, employers, onClose, onSaved }) {
  const [empId, setEmpId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [roles, setRoles] = useState([]);
  const [wfId, setWfId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!empId) { setRoles([]); setRoleId(""); return; }
    authFetch(`/api/employer-roles?employerId=${empId}`)
      .then(r => r.json())
      .then(d => setRoles(d.roles || []));
  }, [empId]);

  const handleSave = async () => {
    if (!empId || !wfId.trim()) { setErr("Employer and Candidate WF-ID are required."); return; }
    setSaving(true); setErr("");
    const res = await authFetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "connect", userId, employerId: empId, roleId: roleId || null, candidateWfId: wfId.trim(), notes }),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "Save failed"); setSaving(false); return; }
    window.gtag?.("event", "intro_requested");
    onSaved();
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: BG, border: `1px solid ${BORDER}`, borderRadius: 16, boxShadow: "0 8px 48px rgba(0,0,0,0.14)",
        padding: 32, width: 440, maxWidth: "90vw",
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: "0 0 24px", fontSize: 18, color: TEXT, fontFamily: SERIF, fontWeight: 400 }}>New Intro</h2>

        <label style={labelStyle}>Employer</label>
        <select value={empId} onChange={e => setEmpId(e.target.value)} style={inputStyle}>
          <option value="">Select employer…</option>
          {employers.map(e => <option key={e.id} value={e.id}>{e.companyName}</option>)}
        </select>

        <label style={labelStyle}>Role (optional)</label>
        <select value={roleId} onChange={e => setRoleId(e.target.value)} style={inputStyle} disabled={!empId}>
          <option value="">No specific role</option>
          {roles.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
        </select>

        <label style={labelStyle}>Candidate WF-ID</label>
        <input
          value={wfId} onChange={e => setWfId(e.target.value)}
          placeholder="WF-XXXXXX" style={inputStyle}
        />

        <label style={labelStyle}>Notes (optional)</label>
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Internal notes…" rows={3}
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
        />

        {err && <div style={{ color: ORANGE, fontSize: 13, marginBottom: 12, fontFamily: SANS }}>{err}</div>}

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={ghostBtn}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={primaryBtn}>
            {saving ? "Saving…" : "Create Intro"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Simulate Modal ────────────────────────────────────────────────────────
function SimulateModal({ onClose, onSaved, onGenerated }) {
  const [archetypeId, setArchetypeId] = useState(ARCHETYPES[0].id);
  const [experience, setExperience]   = useState(EXPERIENCE_LEVELS[2]);
  const [location, setLocation]       = useState("");
  const [saving, setSaving]           = useState(false);
  const [err, setErr]                 = useState("");
  const [testWfId]                    = useState(() => generateTestWFId());

  const selectedArchetype = ARCHETYPES.find(a => a.id === archetypeId) || ARCHETYPES[0];

  const handlePreview = async () => {
    setSaving(true);
    setErr("");
    try {
      const profile = buildSimProfile(selectedArchetype, experience, location.trim() || null);

      // Save to Supabase so it shows up in admin candidates list
      const saveRes = await authFetch("/api/save-candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wfId:                testWfId,
          archetype:           profile.archetype,
          archetypeCategory:   profile.archetypeCategory,
          operatingStyle:      profile.operatingStyle,
          ocean:               profile.ocean,
          roles:               profile.roles,
          watchOuts:           profile.watchOuts,
          cultureFit:          profile.cultureFit,
          location:            profile.location,
          workPreference:      profile.workPreference,
          careerClarity:       profile.careerClarity,
          growthPath:          profile.growthPath,
          interviewIntelligence: profile.interviewIntelligence,
          environmentsToAvoid: profile.environmentsToAvoid,
        }),
      });
      if (!saveRes.ok) {
        const d = await saveRes.json();
        setErr(d.error || "Failed to save test profile");
        setSaving(false);
        return;
      }

      // Build a candidate object shaped like the drawer expects (DB column names)
      const candidate = {
        wf_id:                   testWfId,
        archetype:               profile.archetype,
        archetype_category:      profile.archetypeCategory,
        operating_style:         profile.operatingStyle,
        ocean:                   profile.ocean,
        roles:                   profile.roles,
        watch_outs:              profile.watchOuts,
        culture_fit:             profile.cultureFit,
        location:                profile.location,
        work_preference:         profile.workPreference,
        career_clarity:          profile.careerClarity,
        growth_path:             profile.growthPath,
        interview_intelligence:  profile.interviewIntelligence,
        environments_to_avoid:   profile.environmentsToAvoid,
        created_at:              new Date().toISOString(),
      };

      onSaved();
      onGenerated(candidate);
    } catch (e) {
      setErr(e.message || "Unexpected error");
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: BG, border: `1px solid ${BORDER}`, borderRadius: 16,
        boxShadow: "0 8px 48px rgba(0,0,0,0.14)", padding: 32, width: 480, maxWidth: "92vw",
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: TEXT, fontFamily: SERIF, fontWeight: 400 }}>Simulate Assessment</h2>
          <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase",
            color: "#F59E0B", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)",
            padding: "2px 8px", borderRadius: 4,
          }}>TEST MODE</span>
        </div>
        <p style={{ color: MUTED, fontSize: 13, margin: "0 0 24px", fontFamily: SANS, lineHeight: 1.6 }}>
          Generate a test candidate profile and preview the complete candidate experience — reveal flow, dashboard, all 4 tabs.
        </p>

        {/* Archetype picker */}
        <label style={labelStyle}>Archetype</label>
        <select
          value={archetypeId}
          onChange={e => setArchetypeId(e.target.value)}
          style={inputStyle}
        >
          {ARCHETYPES.map(a => (
            <option key={a.id} value={a.id}>{a.name} — {a.category}</option>
          ))}
        </select>

        {/* Archetype preview pill */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px",
          background: "rgba(107,79,255,0.04)", border: "1px solid rgba(107,79,255,0.15)",
          borderRadius: 10, marginBottom: 16,
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: PURPLE, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>{selectedArchetype.category}</div>
            <div style={{ fontSize: 13, fontStyle: "italic", color: MUTED, fontFamily: SANS }}>{selectedArchetype.tagline}</div>
            <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
              {selectedArchetype.techFit.map(t => (
                <span key={t} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: "rgba(107,79,255,0.08)", color: PURPLE, fontWeight: 500 }}>{t}</span>
              ))}
            </div>
          </div>
        </div>

        <label style={labelStyle}>Experience Level</label>
        <select value={experience} onChange={e => setExperience(e.target.value)} style={inputStyle}>
          {EXPERIENCE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>

        <label style={labelStyle}>Location (optional)</label>
        <input
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="e.g. New York, NY"
          style={inputStyle}
        />

        {/* WF-ID preview */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, padding: "10px 14px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 8 }}>
          <span style={{ fontSize: 11, color: MUTED2, textTransform: "uppercase", letterSpacing: 1, fontFamily: SANS }}>WF-ID</span>
          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: "#F59E0B", letterSpacing: 1 }}>{testWfId}</span>
          <span style={{ fontSize: 11, color: MUTED2, marginLeft: "auto", fontFamily: SANS }}>TEST- prefix marks this as simulated</span>
        </div>

        {err && <div style={{ color: ORANGE, fontSize: 13, marginBottom: 12, fontFamily: SANS }}>{err}</div>}

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={ghostBtn}>Cancel</button>
          <button
            onClick={handlePreview}
            disabled={saving}
            style={{ ...primaryBtn, background: "#6B4FFF", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Launching…" : "Preview Profile →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Claim Profile Panel ───────────────────────────────────────────────────
function ClaimProfilePanel({ candidate: c, userId, onUpdated }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("idle"); // idle | editing | saving | sending | sent | error
  const [error, setError] = useState("");
  const emailRef = useRef("");

  // Keep ref in sync so async functions always read the latest value
  emailRef.current = email;

  const hasEmail = !!(c.email || state === "sent");
  const isEditing = state === "editing";

  const saveEmailOnly = async () => {
    setState("saving"); setError("");
    try {
      const res = await authFetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-candidate-email", userId, wfId: c.wf_id, email: emailRef.current.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setState("idle");
      if (onUpdated) onUpdated();
    } catch (err) {
      setState("error"); setError(err.message);
    }
  };

  const sendInvite = async (emailOverride) => {
    const emailToSend = (emailOverride || emailRef.current).trim();
    console.log("SUBMIT CLICKED - email state:", email, "| emailRef:", emailRef.current, "| emailOverride:", emailOverride, "| emailToSend:", emailToSend, "| wfId:", c.wf_id);
    setState("sending"); setError("");
    try {
      const res = await authFetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invite-candidate", userId, wfId: c.wf_id, email: emailToSend }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setState("sent");
      if (onUpdated) onUpdated();
    } catch (err) {
      setState("error"); setError(err.message);
    }
  };

  return (
    <div style={{ marginBottom: 24, padding: "14px 16px", background: "rgba(107,79,255,0.04)", border: "1px solid rgba(107,79,255,0.15)", borderRadius: 10 }}>
      <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: PURPLE, fontWeight: 600, marginBottom: 8, fontFamily: SANS }}>Claim Profile</div>

      {state === "sent" && !isEditing ? (
        <div style={{ fontSize: 13, color: ACCENT, fontFamily: SANS }}>Invite sent to {email || c.email}!</div>
      ) : hasEmail && !isEditing ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: TEXT, fontFamily: SANS }}>{c.email}</span>
          <button onClick={() => { setEmail(c.email); setState("editing"); setError(""); }} style={{
            background: "none", border: `1px solid ${BORDER}`, borderRadius: 5,
            fontSize: 11, color: MUTED, cursor: "pointer", padding: "3px 8px", fontFamily: SANS,
          }}>Edit</button>
          <button
            disabled={state === "sending"}
            onClick={() => sendInvite(c.email)}
            style={{
              background: PURPLE, color: "#fff", border: "none", borderRadius: 5,
              fontSize: 11, fontWeight: 600, cursor: "pointer", padding: "3px 10px", fontFamily: SANS,
              opacity: state === "sending" ? 0.6 : 1,
            }}
          >{state === "sending" ? "Sending..." : "Resend Invite"}</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Enter candidate's email..."
            style={{ flex: 1, minWidth: 180, padding: "8px 12px", fontSize: 13, fontFamily: SANS, border: `1px solid ${BORDER}`, borderRadius: 6, outline: "none", background: BG }}
          />
          {isEditing ? (
            <>
              <button disabled={state === "saving" || !email.trim()} onClick={saveEmailOnly} style={{
                padding: "8px 14px", fontSize: 12, fontWeight: 600, fontFamily: SANS,
                background: ACCENT, color: "#fff", border: "none", borderRadius: 6,
                cursor: state === "saving" ? "wait" : "pointer",
                opacity: state === "saving" || !email.trim() ? 0.6 : 1, whiteSpace: "nowrap",
              }}>{state === "saving" ? "Saving..." : "Save Email"}</button>
              <button disabled={state === "sending" || !email.trim()} onClick={() => sendInvite()} style={{
                padding: "8px 14px", fontSize: 12, fontWeight: 600, fontFamily: SANS,
                background: PURPLE, color: "#fff", border: "none", borderRadius: 6,
                cursor: state === "sending" ? "wait" : "pointer",
                opacity: state === "sending" || !email.trim() ? 0.6 : 1, whiteSpace: "nowrap",
              }}>{state === "sending" ? "Sending..." : "Save & Resend"}</button>
              <button onClick={() => setState("idle")} style={{
                padding: "8px 12px", fontSize: 12, fontFamily: SANS,
                background: "none", border: `1px solid ${BORDER}`, borderRadius: 6,
                color: MUTED, cursor: "pointer", whiteSpace: "nowrap",
              }}>Cancel</button>
            </>
          ) : (
            <button disabled={state === "sending" || !email.trim()} onClick={() => sendInvite()} style={{
              padding: "8px 16px", fontSize: 12, fontWeight: 600, fontFamily: SANS,
              background: PURPLE, color: "#fff", border: "none", borderRadius: 6,
              cursor: state === "sending" ? "wait" : "pointer",
              opacity: state === "sending" || !email.trim() ? 0.6 : 1, whiteSpace: "nowrap",
            }}>{state === "sending" ? "Sending..." : "Add Email & Invite"}</button>
          )}
        </div>
      )}
      {error && <div style={{ fontSize: 12, color: "#DC2626", marginTop: 6, fontFamily: SANS }}>{error}</div>}
    </div>
  );
}

// ── Candidate Drawer ──────────────────────────────────────────────────────
function CandidateDrawer({ candidate: c, onClose, onUpdated, userId }) {
  const [tab, setTab] = useState(0);
  const [showCandidateView, setShowCandidateView] = useState(false);
  if (!c) return null;

  // Normalize OCEAN to long keys (matches CareerMatch display)
  const rawOcean = typeof c.ocean === "string" ? JSON.parse(c.ocean) : (c.ocean || {});
  const ocean = rawOcean.openness !== undefined ? rawOcean : {
    openness:          rawOcean.O ?? 0,
    conscientiousness: rawOcean.C ?? 0,
    extraversion:      rawOcean.E ?? 0,
    agreeableness:     rawOcean.A ?? 0,
    neuroticism:       rawOcean.N ?? 0,
  };
  const roles = Array.isArray(c.roles) ? c.roles : [];
  const watchOuts = Array.isArray(c.watch_outs) ? c.watch_outs : (c.watch_outs ? [c.watch_outs] : []);
  const TABS = ["Profile", "Roles", "My Path", "Interview Prep"];

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", zIndex: 200 }} />

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 540, maxWidth: "95vw",
        background: BG, borderLeft: `1px solid ${BORDER}`, zIndex: 201,
        overflowY: "auto", boxShadow: "-8px 0 40px rgba(0,0,0,0.08)",
      }}>
        {/* Sticky header */}
        <div style={{
          padding: "20px 24px 18px", borderBottom: `1px solid ${BORDER}`,
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          position: "sticky", top: 0, background: BG, zIndex: 1,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontFamily: "monospace", fontSize: 12, color: isTestProfile(c) ? "#F59E0B" : ACCENT, fontWeight: 700, letterSpacing: 1 }}>
                {c.wf_id}
              </span>
              {isTestProfile(c) && (
                <span style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase",
                  color: "#F59E0B", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)",
                  padding: "2px 8px", borderRadius: 4,
                }}>TEST MODE</span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: ACCENT }}>Archetype</div>
              {getArchetypeCategory(c) && (
                <span style={{ fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: PURPLE, background: "rgba(107,79,255,0.08)", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>
                  {getArchetypeCategory(c)}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 400, fontFamily: SERIF, color: TEXT, margin: "0 0 4px", lineHeight: 1.2 }}>
              {c.archetype || "Unknown Archetype"}
            </h2>
            {getArchetypeTagline(c) && (
              <div style={{ fontSize: 13, color: ACCENT, fontStyle: "italic", marginBottom: 8, fontFamily: SANS }}>
                {getArchetypeTagline(c)}
              </div>
            )}
            {c.operating_style && (
              <p style={{ color: MUTED, fontSize: 14, margin: 0, lineHeight: 1.75, maxWidth: 420, fontFamily: SANS }}>
                {c.operating_style}
              </p>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button onClick={() => setShowCandidateView(true)} style={{
              background: "linear-gradient(135deg, #00C4A8, #6B4FFF)", border: "none",
              color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700,
              padding: "7px 14px", borderRadius: 8, letterSpacing: 0.3,
              fontFamily: SANS, whiteSpace: "nowrap",
            }}>View as Candidate</button>
            <button onClick={onClose} style={{
              background: "none", border: "none", color: MUTED, cursor: "pointer",
              fontSize: 24, lineHeight: 1, padding: 0, flexShrink: 0,
            }}>×</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}`, padding: "0 24px" }}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} style={{
              flex: 1, padding: "12px 4px", fontSize: 11, fontWeight: 600,
              border: "none", borderBottom: `2px solid ${tab === i ? ACCENT : "transparent"}`,
              background: "none", cursor: "pointer", color: tab === i ? TEXT : MUTED2,
              transition: "color 0.15s, border-color 0.15s", fontFamily: SANS,
              letterSpacing: "-0.01em", whiteSpace: "nowrap",
            }}>{t}</button>
          ))}
        </div>

        <div style={{ padding: "24px" }}>

          {/* Info chips — shown on all tabs */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
            {[
              { label: "Email",     value: c.email },
              { label: "Location",  value: c.location },
              { label: "Work Pref", value: c.work_preference },
              { label: "Joined",    value: fmt(c.created_at || c.updated_at) },
            ].filter(x => x.value).map(({ label, value }) => (
              <div key={label} style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "7px 13px" }}>
                <div style={{ fontSize: 10, color: MUTED2, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3, fontFamily: SANS }}>{label}</div>
                <div style={{ fontSize: 13, color: TEXT, fontFamily: SANS }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Invite / Claim Profile — shown for profiles without a linked user_id */}
          {c.archetype && !c.user_id && <ClaimProfilePanel
            candidate={c} userId={userId} onUpdated={onUpdated}
          />}

          {/* ── Tab 0: Profile ─────────────────────────────────────────────── */}
          {tab === 0 && (
            <div>
              {c.ocean && (
                <div style={{ marginBottom: 32 }}>
                  <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: MUTED2, marginBottom: 16, fontFamily: SANS }}>Big Five Profile</div>
                  <OceanRadarChart ocean={ocean} size={200} />
                  <OceanTraitBars ocean={ocean} />
                </div>
              )}
              {c.culture_fit && (
                <div style={{ background: "linear-gradient(135deg, rgba(0,196,168,0.05), rgba(107,79,255,0.05))", border: `1px solid ${BORDER}`, borderRadius: 14, padding: "20px 18px" }}>
                  <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: MUTED2, marginBottom: 10, fontFamily: SANS }}>Culture Match</div>
                  <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.75, margin: 0, fontFamily: SANS }}>{c.culture_fit}</p>
                </div>
              )}

              {/* Resume Data */}
              {c.resume_data && (
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: MUTED2, marginBottom: 12, fontFamily: SANS }}>Background (Resume)</div>
                  <div style={{ background: "rgba(0,196,168,0.04)", border: `1px solid rgba(0,196,168,0.18)`, borderRadius: 12, padding: "16px 18px" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: TEXT, fontFamily: SANS }}>{c.resume_data.currentTitle || "—"}</span>
                      {c.resume_data.yearsExperience != null && (
                        <span style={{ fontSize: 12, color: MUTED2, fontFamily: SANS }}>{c.resume_data.yearsExperience} yrs</span>
                      )}
                      {c.resume_data.industry && (
                        <span style={{ fontSize: 12, color: MUTED2, fontFamily: SANS }}>· {c.resume_data.industry}</span>
                      )}
                    </div>
                    {c.resume_data.backgroundSummary && (
                      <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.72, margin: "0 0 12px", fontFamily: SANS }}>{c.resume_data.backgroundSummary}</p>
                    )}
                    {(c.resume_data.skills || []).length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {c.resume_data.skills.map(s => (
                          <span key={s} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 6, background: "rgba(0,196,168,0.10)", color: "#00A08A", fontWeight: 500, fontFamily: SANS }}>{s}</span>
                        ))}
                      </div>
                    )}
                    {(c.resume_data.notableCompanies || []).length > 0 && (
                      <div style={{ marginTop: 8, fontSize: 12, color: MUTED2, fontFamily: SANS }}>
                        Past: {c.resume_data.notableCompanies.join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab 1: Roles ───────────────────────────────────────────────── */}
          {tab === 1 && (
            <div>
              {roles.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {roles.map((role, i) => {
                    if (typeof role === "string") {
                      return (
                        <div key={i} style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px 16px" }}>
                          <span style={{ fontWeight: 600, color: TEXT, fontSize: 14, fontFamily: SANS }}>{role}</span>
                        </div>
                      );
                    }
                    return (
                      <div key={i} style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "18px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                          {role.icon && <span style={{ fontSize: 22 }}>{role.icon}</span>}
                          <span style={{ fontWeight: 600, color: TEXT, fontSize: 15, lineHeight: 1.3, fontFamily: SANS }}>{role.title}</span>
                        </div>
                        {(role.whyItFits || []).length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {role.whyItFits.map((bullet, j) => (
                              <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                <span style={{ color: PURPLE, fontSize: 12, flexShrink: 0, marginTop: 3 }}>▸</span>
                                <span style={{ color: MUTED, fontSize: 13, lineHeight: 1.65, fontFamily: SANS }}>{bullet}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: MUTED2, fontSize: 13, fontFamily: SANS }}>No roles on record.</div>
              )}
            </div>
          )}

          {/* ── Tab 2: My Path ─────────────────────────────────────────────── */}
          {tab === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {c.career_clarity && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 3, height: 16, borderRadius: 2, background: ACCENT, flexShrink: 0 }} />
                    <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: ACCENT, fontFamily: SANS }}>Career Clarity</div>
                  </div>
                  <div style={{ background: "rgba(0,196,168,0.04)", border: "1px solid rgba(0,196,168,0.16)", borderRadius: 12, padding: "16px" }}>
                    <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.8, margin: 0, fontFamily: SANS }}>{c.career_clarity}</p>
                  </div>
                </div>
              )}
              {Array.isArray(c.growth_path) && c.growth_path.length > 0 && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 3, height: 16, borderRadius: 2, background: PURPLE, flexShrink: 0 }} />
                    <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: PURPLE, fontFamily: SANS }}>Growth Path</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {c.growth_path.map((step, i) => (
                      <div key={i} style={{ background: "rgba(107,79,255,0.04)", border: "1px solid rgba(107,79,255,0.14)", borderRadius: 12, padding: "14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ width: 20, height: 20, borderRadius: 5, background: "rgba(107,79,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: PURPLE, flexShrink: 0, fontFamily: SANS }}>{i + 1}</div>
                        <span style={{ color: MUTED, fontSize: 13, lineHeight: 1.65, fontFamily: SANS }}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {Array.isArray(c.environments_to_avoid) && c.environments_to_avoid.length > 0 && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 3, height: 16, borderRadius: 2, background: "#DC2626", flexShrink: 0 }} />
                    <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "#DC2626", fontFamily: SANS }}>Environments to Avoid</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {c.environments_to_avoid.map((env, i) => (
                      <div key={i} style={{ background: "rgba(220,38,38,0.04)", border: "1px solid rgba(220,38,38,0.15)", borderRadius: 12, padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <span style={{ color: "#DC2626", fontSize: 13, flexShrink: 0, marginTop: 2 }}>✕</span>
                        <span style={{ color: MUTED, fontSize: 13, lineHeight: 1.65, fontFamily: SANS }}>{env}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {watchOuts.length > 0 && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 3, height: 16, borderRadius: 2, background: ORANGE, flexShrink: 0 }} />
                    <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: ORANGE, fontFamily: SANS }}>Watch Out For</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {watchOuts.map((w, i) => (
                      <div key={i} style={{ background: "rgba(245,93,44,0.04)", border: "1px solid rgba(245,93,44,0.12)", borderRadius: 12, padding: "14px 16px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <span style={{ color: ORANGE, fontSize: 16, flexShrink: 0, marginTop: 1 }}>⚠</span>
                        <span style={{ color: MUTED, fontSize: 14, lineHeight: 1.65, fontFamily: SANS }}>{w}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!c.career_clarity && !c.growth_path && (
                <div style={{ color: MUTED2, fontSize: 13, fontFamily: SANS }}>No path data — candidate predates new fields.</div>
              )}
            </div>
          )}

          {/* ── Tab 3: Interview Prep ──────────────────────────────────────── */}
          {tab === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {Array.isArray(c.interview_intelligence) && c.interview_intelligence.length > 0 ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 3, height: 16, borderRadius: 2, background: ORANGE, flexShrink: 0 }} />
                    <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: ORANGE, fontFamily: SANS }}>Interview Intelligence</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {c.interview_intelligence.map((bullet, i) => (
                      <div key={i} style={{ background: "rgba(245,93,44,0.04)", border: "1px solid rgba(245,93,44,0.14)", borderRadius: 12, padding: "14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <span style={{ color: ORANGE, fontSize: 12, flexShrink: 0, marginTop: 2 }}>▸</span>
                        <span style={{ color: MUTED, fontSize: 13, lineHeight: 1.7, fontFamily: SANS }}>{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ color: MUTED2, fontSize: 13, fontFamily: SANS }}>No interview data — candidate predates new fields.</div>
              )}
            </div>
          )}

        </div>
      </div>

      {showCandidateView && (
        <ProfilePreviewOverlay
          profile={{
            archetype:             c.archetype,
            archetypeCategory:     c.archetype_category || getArchetypeCategory(c),
            archetypeTagline:      getArchetypeTagline(c),
            operatingStyle:        c.operating_style,
            ocean:                 c.ocean,
            roles:                 c.roles,
            watchOuts:             Array.isArray(c.watch_outs) ? c.watch_outs : (c.watch_outs ? [c.watch_outs] : []),
            cultureFit:            c.culture_fit,
            location:              c.location,
            workPreference:        c.work_preference,
            careerClarity:         c.career_clarity,
            growthPath:            c.growth_path,
            interviewIntelligence: c.interview_intelligence,
            environmentsToAvoid:   c.environments_to_avoid,
            resumeData:            c.resume_data,
            careerPaths:           c.career_paths,
          }}
          wfId={c.wf_id || "preview"}
          onClose={() => setShowCandidateView(false)}
        />
      )}
    </>
  );
}

// ── Tab: Candidates ───────────────────────────────────────────────────────
function CandidatesTab({ candidates, onSelect }) {
  const [search, setSearch] = useState("");
  const filtered = candidates.filter(c =>
    !search || c.wf_id?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.archetype?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ color: MUTED, fontSize: 13 }}>{filtered.length} candidate{filtered.length !== 1 ? "s" : ""}</span>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search WF-ID, email, archetype…"
          style={{ ...inputStyle, width: 260, marginBottom: 0 }}
        />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["WF-ID", "Archetype", "OCEAN", "Email", "Location", "Joined"].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr
                key={c.wf_id}
                onClick={() => onSelect(c)}
                style={{
                  background: "transparent",
                  cursor: "pointer", transition: "background 0.12s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(0,196,168,0.06)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <td style={tdStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ color: isTestProfile(c) ? "#F59E0B" : ACCENT, fontWeight: 700, fontFamily: "monospace" }}>{c.wf_id}</span>
                    {isTestProfile(c) && (
                      <span style={{
                        fontSize: 8, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase",
                        color: "#F59E0B", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)",
                        padding: "1px 6px", borderRadius: 3, whiteSpace: "nowrap",
                      }}>TEST</span>
                    )}
                  </div>
                </td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ color: TEXT, fontWeight: 500 }}>{c.archetype || "—"}</span>
                    {getArchetypeCategory(c) && (
                      <span style={{ fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: PURPLE, background: "rgba(107,79,255,0.08)", padding: "2px 7px", borderRadius: 10, fontWeight: 600 }}>
                        {getArchetypeCategory(c)}
                      </span>
                    )}
                  </div>
                  {getArchetypeTagline(c) && (
                    <div style={{ color: MUTED, fontSize: 11, fontStyle: "italic" }}>{getArchetypeTagline(c)}</div>
                  )}
                </td>
                <td style={tdStyle}><OceanMini ocean={c.ocean} /></td>
                <td style={tdStyle}><span style={{ color: MUTED }}>{c.email || "—"}</span></td>
                <td style={tdStyle}><span style={{ color: MUTED }}>{c.location || "—"}</span></td>
                <td style={tdStyle}><span style={{ color: MUTED }}>{fmt(c.created_at || c.updated_at)}</span></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: MUTED, padding: 40 }}>No candidates found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab: Employers ────────────────────────────────────────────────────────
function EmployersTab({ employers }) {
  const [search, setSearch] = useState("");
  const filtered = employers.filter(e =>
    !search || e.companyName?.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ color: MUTED, fontSize: 13 }}>{filtered.length} employer{filtered.length !== 1 ? "s" : ""}</span>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search company or email…"
          style={{ ...inputStyle, width: 260, marginBottom: 0 }}
        />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["Company", "Industry", "Email", "Active Roles", "Total Roles", "Joined"].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => (
              <tr key={e.id} style={{ background: "transparent" }}>
                <td style={tdStyle}>
                  <span style={{ color: TEXT, fontWeight: 600 }}>{e.companyName}</span>
                  {e.website && (
                    <div style={{ fontSize: 11, color: MUTED }}>{e.website.replace(/^https?:\/\//, "")}</div>
                  )}
                </td>
                <td style={tdStyle}><span style={{ color: MUTED }}>{e.industry || "—"}</span></td>
                <td style={tdStyle}><span style={{ color: MUTED }}>{e.email || "—"}</span></td>
                <td style={tdStyle}>
                  <span style={{ color: ACCENT, fontWeight: 700 }}>{e.activeRoles}</span>
                </td>
                <td style={tdStyle}><span style={{ color: MUTED }}>{e.totalRoles}</span></td>
                <td style={tdStyle}><span style={{ color: MUTED }}>{fmt(e.createdAt)}</span></td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: MUTED, padding: 40 }}>No employers found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab: Intros ───────────────────────────────────────────────────────────
function IntrosTab({ intros, userId, onRefresh, onNewIntro }) {
  const [updating, setUpdating] = useState(null);

  const updateStatus = async (introId, status) => {
    setUpdating(introId);
    await authFetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-intro", userId, introId, status }),
    });
    setUpdating(null);
    onRefresh();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ color: MUTED, fontSize: 13 }}>{intros.length} intro{intros.length !== 1 ? "s" : ""}</span>
        <button onClick={onNewIntro} style={primaryBtn}>+ New Intro</button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["Date", "Employer", "Role", "Candidate WF-ID", "Status", "Actions"].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {intros.map((intro, i) => (
              <tr key={intro.id} style={{ background: "transparent" }}>
                <td style={tdStyle}><span style={{ color: MUTED }}>{fmt(intro.createdAt)}</span></td>
                <td style={tdStyle}><span style={{ color: TEXT, fontWeight: 600 }}>{intro.companyName}</span></td>
                <td style={tdStyle}><span style={{ color: MUTED }}>{intro.roleTitle}</span></td>
                <td style={tdStyle}>
                  <span style={{ color: ACCENT, fontWeight: 700, fontFamily: "monospace" }}>{intro.candidateWfId}</span>
                </td>
                <td style={tdStyle}><StatusPill status={intro.status} /></td>
                <td style={tdStyle}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {intro.status === "requested" && (
                      <button
                        onClick={() => updateStatus(intro.id, "connected")}
                        disabled={updating === intro.id}
                        style={{ ...ghostBtn, fontSize: 11, padding: "3px 10px" }}
                      >Mark Connected</button>
                    )}
                    {intro.status !== "placed" && (
                      <button
                        onClick={() => updateStatus(intro.id, "placed")}
                        disabled={updating === intro.id}
                        style={{ ...accentBtn, fontSize: 11, padding: "3px 10px" }}
                      >Mark Placed</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {intros.length === 0 && (
              <tr><td colSpan={6} style={{ ...tdStyle, textAlign: "center", color: MUTED, padding: 40 }}>No intros yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Login Screen ─────────────────────────────────────────────────────────
function AdminLogin() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  const sendLink = async () => {
    setSending(true);
    setErr("");
    const { error } = await supabase.auth.signInWithOtp({
      email: ADMIN_EMAIL,
      options: { emailRedirectTo: "https://www.wiredfor.ai/admin" },
    });
    if (error) { setErr(error.message); setSending(false); return; }
    setSent(true);
    setSending(false);
  };

  return (
    <div style={{
      background: BG, minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 16,
      fontFamily: SANS,
    }}>
      <div style={{ fontSize: 40, marginBottom: 4 }}>🔒</div>
      <div style={{ color: TEXT, fontSize: 20, fontWeight: 700 }}>Admin access only</div>

      {sent ? (
        <>
          <div style={{ color: ACCENT, fontSize: 15, fontWeight: 600 }}>Magic link sent!</div>
          <div style={{ color: MUTED, fontSize: 13, textAlign: "center", maxWidth: 320 }}>
            Check your Proton Mail inbox for {ADMIN_EMAIL} and click the link to sign in.
          </div>
          <button onClick={sendLink} style={{ ...ghostBtn, fontSize: 12, marginTop: 8 }}>
            Resend link
          </button>
        </>
      ) : (
        <>
          <div style={{ color: MUTED, fontSize: 14 }}>
            We'll send a magic link to <strong style={{ color: TEXT }}>{ADMIN_EMAIL}</strong>
          </div>
          {err && <div style={{ color: ORANGE, fontSize: 13, fontFamily: SANS }}>{err}</div>}
          <button onClick={sendLink} disabled={sending} style={{ ...primaryBtn, marginTop: 8, opacity: sending ? 0.6 : 1 }}>
            {sending ? "Sending…" : "Send magic link"}
          </button>
        </>
      )}
    </div>
  );
}

// ── Profile Preview Overlay ───────────────────────────────────────────────
function ProfilePreviewOverlay({ profile, wfId, onClose }) {
  const [step, setStep] = useState(0);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "#0A0A0A", overflowY: "auto",
    }}>
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "fixed", top: 16, right: 16, zIndex: 2001,
          width: 36, height: 36, borderRadius: "50%",
          background: "rgba(255,255,255,0.12)", border: "none",
          color: "#fff", fontSize: 18, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          lineHeight: 1,
        }}
        aria-label="Close preview"
      >
        ✕
      </button>

      <GuidedReveal
        result={profile}
        step={step}
        wfId={wfId}
        onNext={() => setStep(s => s + 1)}
        onComplete={onClose}
        jobs={[]}
        jobsLoading={false}
        jobsError={null}
        resumeData={profile.resumeData ?? null}
        resumeUploading={false}
        resumeError={null}
        resumeFileName={null}
        onResumeUpload={() => {}}
      />
    </div>
  );
}

// ── Main Admin Page ───────────────────────────────────────────────────────
export default function AdminPage() {
  const [userId, setUserId] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [tab, setTab] = useState("candidates");
  const [stats, setStats] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [intros, setIntros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConnect, setShowConnect]       = useState(false);
  const [showSimulate, setShowSimulate]     = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [clearingTests, setClearingTests]   = useState(false);
  const [clearMsg, setClearMsg]             = useState("");

  // Auth check — use onAuthStateChange to catch magic link token exchange
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email === ADMIN_EMAIL) {
        setUserId(session.user.id);
      } else {
        setUserId(null);
      }
      setAuthChecked(true);
    });

    // Also check existing session immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email === ADMIN_EMAIL) {
        setUserId(session.user.id);
      }
      setAuthChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const load = useCallback(async (uid) => {
    if (!uid) return;
    setLoading(true);
    const [statsRes, candRes, empRes, introRes] = await Promise.all([
      authFetch(`/api/admin?action=dash-stats&userId=${uid}`).then(r => r.json()),
      authFetch(`/api/admin?action=dash-candidates&userId=${uid}`).then(r => r.json()),
      authFetch(`/api/admin?action=dash-employers&userId=${uid}`).then(r => r.json()),
      authFetch(`/api/admin?action=dash-intros&userId=${uid}`).then(r => r.json()),
    ]);
    setStats(statsRes);
    setCandidates(candRes.candidates || []);
    setEmployers(empRes.employers || []);
    setIntros(introRes.intros || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (userId) load(userId);
  }, [userId, load]);

  const handleClearTests = async () => {
    if (!window.confirm("Delete all TEST- prefixed candidates from Supabase? This cannot be undone.")) return;
    setClearingTests(true);
    setClearMsg("");
    try {
      const res  = await authFetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear-test-profiles", userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      // Clear any test profile data cached in localStorage
      localStorage.removeItem("careermatch_test_mode");
      localStorage.removeItem("careermatch_result");
      localStorage.removeItem("careermatch_wf_id");
      localStorage.removeItem("has_completed_onboarding");

      setClearMsg(`Deleted ${data.deleted ?? 0} test profile${data.deleted !== 1 ? "s" : ""}`);
      load(userId);
    } catch (e) {
      setClearMsg(`Error: ${e.message}`);
    } finally {
      setClearingTests(false);
      setTimeout(() => setClearMsg(""), 4000);
    }
  };

  const refreshIntros = async () => {
    const [introRes, statsRes] = await Promise.all([
      authFetch(`/api/admin?action=dash-intros&userId=${userId}`).then(r => r.json()),
      authFetch(`/api/admin?action=dash-stats&userId=${userId}`).then(r => r.json()),
    ]);
    setIntros(introRes.intros || []);
    setStats(statsRes);
  };

  if (!authChecked) {
    return <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: MUTED }}>Checking auth…</div>;
  }

  if (!userId) {
    return <AdminLogin />;
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: SANS, color: TEXT }}>
      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${BORDER}`, padding: "16px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg viewBox="0 0 48 48" width="26" height="26" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="0" width="48" height="48" rx="12" fill="#0A0A0A"/>
            <circle cx="8" cy="13" r="4" fill="#00C4A8"/><circle cx="18" cy="35" r="3" fill="#6B4FFF"/><circle cx="24" cy="22" r="3.5" fill="#00C4A8"/><circle cx="30" cy="35" r="3" fill="#6B4FFF"/><circle cx="40" cy="13" r="4" fill="#00C4A8"/>
            <line x1="8" y1="13" x2="18" y2="35" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/><line x1="18" y1="35" x2="24" y2="22" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/><line x1="24" y1="22" x2="30" y2="35" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/><line x1="30" y1="35" x2="40" y2="13" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>
            WiredFor<span style={{ color: ACCENT }}>.ai</span> <span style={{ color: ACCENT, fontWeight: 600 }}>Admin</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: MUTED }}>{ADMIN_EMAIL}</span>
          <button
            onClick={() => { supabase.auth.signOut(); window.location.href = "/"; }}
            style={{ ...ghostBtn, fontSize: 12 }}
          >Sign out</button>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {/* Stats */}
        <div style={{ display: "flex", gap: 16, marginBottom: 40, flexWrap: "wrap" }}>
          <StatCard label="Total Candidates" value={stats?.candidates} color={ACCENT} />
          <StatCard label="Total Employers" value={stats?.employers} color={PURPLE} />
          <StatCard label="Intros Requested" value={stats?.intros} color="#F59E0B" />
          <StatCard label="Placements" value={stats?.placements} color={ORANGE} />
        </div>

        {/* Simulation toolbar */}
        <div className="wf-sim-toolbar" style={{
          marginBottom: 28,
          padding: "14px 18px",
          background: "rgba(107,79,255,0.03)",
          border: `1px solid rgba(107,79,255,0.12)`,
          borderRadius: 12,
        }}>
          <style>{`
            .wf-sim-toolbar .wf-sim-row {
              display: flex; align-items: center; gap: 12;
            }
            .wf-sim-toolbar .wf-sim-buttons {
              display: flex; align-items: center; gap: 10; margin-left: auto;
            }
            .wf-sim-toolbar .wf-sim-subtitle {
              font-size: 12px; color: #9B9B9B; margin-top: 8px;
            }
            @media (max-width: 768px) {
              .wf-sim-toolbar .wf-sim-row {
                flex-direction: column; align-items: stretch; gap: 12px;
              }
              .wf-sim-toolbar .wf-sim-buttons {
                flex-direction: column; margin-left: 0;
              }
              .wf-sim-toolbar .wf-sim-buttons button {
                width: 100% !important;
              }
            }
          `}</style>
          <div className="wf-sim-row">
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase",
              color: "#F59E0B", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)",
              padding: "3px 8px", borderRadius: 4, flexShrink: 0, alignSelf: "flex-start",
            }}>Test Mode</span>
            <div className="wf-sim-buttons">
              {clearMsg && (
                <span style={{ fontSize: 12, color: clearMsg.startsWith("Error") ? ORANGE : ACCENT, fontFamily: SANS }}>{clearMsg}</span>
              )}
              <button
                onClick={handleClearTests}
                disabled={clearingTests}
                style={{
                  ...ghostBtn,
                  fontSize: 12,
                  color: clearingTests ? MUTED2 : "#DC2626",
                  borderColor: clearingTests ? BORDER : "rgba(220,38,38,0.25)",
                  opacity: clearingTests ? 0.6 : 1,
                }}
              >
                {clearingTests ? "Clearing…" : "Clear Test Profiles"}
              </button>
              <button
                onClick={() => setShowSimulate(true)}
                style={{ ...primaryBtn, background: PURPLE, fontSize: 13 }}
              >
                + Simulate Assessment
              </button>
            </div>
          </div>
          <div className="wf-sim-subtitle" style={{ fontSize: 12, color: MUTED, fontFamily: SANS, marginTop: 8 }}>
            Simulate a candidate profile to preview the full experience flow
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: `1px solid ${BORDER}`, paddingBottom: 0 }}>
          {[
            { id: "candidates", label: `Candidates${candidates.length ? ` (${candidates.length})` : ""}` },
            { id: "employers", label: `Employers${employers.length ? ` (${employers.length})` : ""}` },
            { id: "intros", label: `Intros${intros.length ? ` (${intros.length})` : ""}` },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "10px 20px", fontSize: 14, fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? ACCENT : MUTED,
              borderBottom: `2px solid ${tab === t.id ? ACCENT : "transparent"}`,
              marginBottom: -1, transition: "all 0.15s",
            }}>{t.label}</button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24 }}>
          {loading ? (
            <div style={{ textAlign: "center", color: MUTED, padding: 60 }}>Loading…</div>
          ) : (
            <>
              {tab === "candidates" && <CandidatesTab candidates={candidates} onSelect={setSelectedCandidate} />}
              {tab === "employers" && <EmployersTab employers={employers} />}
              {tab === "intros" && (
                <IntrosTab
                  intros={intros} userId={userId}
                  onRefresh={refreshIntros}
                  onNewIntro={() => setShowConnect(true)}
                />
              )}
            </>
          )}
        </div>
      </div>

      {showConnect && (
        <ConnectModal
          userId={userId}
          employers={employers}
          onClose={() => setShowConnect(false)}
          onSaved={refreshIntros}
        />
      )}

      {showSimulate && (
        <SimulateModal
          onClose={() => setShowSimulate(false)}
          onSaved={() => load(userId)}
          onGenerated={(candidate) => {
            setShowSimulate(false);
            setSelectedCandidate(candidate);
          }}
        />
      )}

      {selectedCandidate && (
        <CandidateDrawer
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          onUpdated={() => load(userId)}
          userId={userId}
        />
      )}
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%", background: "#F7F7F5", border: "1px solid rgba(0,0,0,0.10)",
  borderRadius: 8, padding: "9px 12px", color: TEXT, fontSize: 14,
  marginBottom: 16, boxSizing: "border-box", outline: "none",
  fontFamily: SANS,
};

const labelStyle = {
  display: "block", fontSize: 11, color: MUTED2,
  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6,
  fontFamily: SANS,
};

const thStyle = {
  textAlign: "left", padding: "10px 12px", fontSize: 11,
  color: MUTED2, textTransform: "uppercase", letterSpacing: "0.08em",
  borderBottom: `1px solid ${BORDER}`, fontWeight: 600,
  fontFamily: SANS,
};

const tdStyle = {
  padding: "12px 12px", borderBottom: "1px solid rgba(0,0,0,0.05)", verticalAlign: "middle",
};

const primaryBtn = {
  background: ACCENT, color: "#fff", border: "none", borderRadius: 8,
  padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer",
  letterSpacing: "-0.01em", fontFamily: SANS,
};

const ghostBtn = {
  background: "none", color: MUTED, border: `1px solid ${BORDER}`,
  borderRadius: 8, padding: "9px 18px", fontSize: 13, cursor: "pointer",
  fontFamily: SANS,
};

const sectionLabel = {
  fontSize: 11, color: MUTED2, textTransform: "uppercase",
  letterSpacing: "0.08em", fontWeight: 600, marginBottom: 12,
  fontFamily: SANS,
};

const accentBtn = {
  background: "rgba(0,196,168,0.08)", color: ACCENT, border: "1px solid rgba(0,196,168,0.25)",
  borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
  fontFamily: SANS,
};
