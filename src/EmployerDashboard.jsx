import { useState, useEffect, useRef } from "react";
import { supabase, authFetch } from "./supabaseClient";
import { ARCHETYPES } from "./archetypes";

function getCandidateArchetypeCategory(candidate) {
  if (candidate.archetypeCategory) return candidate.archetypeCategory;
  const found = ARCHETYPES.find(a => a.name === candidate.archetype);
  return found?.category || null;
}

// ── Design Tokens ──────────────────────────────────────────────────────────
const BG = "#FFFFFF";
const BG2 = "#F7F7F5";
const BORDER = "rgba(0,0,0,0.08)";
const ACCENT = "#00C4A8";
const PURPLE = "#6B4FFF";
const ORANGE = "#F55D2C";
const AMBER = "#F59E0B";
const TEXT = "#0A0A0A";
const MUTED = "#6B6B6B";
const MUTED2 = "#9B9B9B";
const SHADOW = "0 2px 20px rgba(0,0,0,0.06)";
const SANS = "'DM Sans', 'Helvetica Neue', sans-serif";
const SERIF = "'DM Serif Display', Georgia, serif";

// ── Colors ─────────────────────────────────────────────────────────────────
const COLORS = ["#00C4A8", "#6B4FFF", "#F55D2C", "#F59E0B", "#FF6B89", "#00B4D8", "#A78BFA", "#34D399"];

// ── OCEAN helpers ──────────────────────────────────────────────────────────
const OCEAN_LABELS = { O: "Openness", C: "Conscientiousness", E: "Extraversion", A: "Agreeableness", N: "Neuroticism" };
const OCEAN_COLORS = { O: "#00C4A8", C: "#6B4FFF", E: "#F55D2C", A: "#FFBE0B", N: "#FF6B89" };
const OCEAN_TAG_LABELS = { O: "Creative", C: "Disciplined", E: "Collaborative", A: "Empathetic", N: "Reactive" };

// Normalize long-key ocean (from older candidates) to short keys
function normalizeOcean(ocean) {
  if (!ocean) return null;
  if (ocean.O !== undefined) return ocean; // already short keys
  return {
    O: ocean.openness ?? 0,
    C: ocean.conscientiousness ?? 0,
    E: ocean.extraversion ?? 0,
    A: ocean.agreeableness ?? 0,
    N: ocean.neuroticism ?? 0,
  };
}

function computeMatchScore(candidateOcean, idealOcean) {
  if (!candidateOcean || !idealOcean) return 0;
  const c = normalizeOcean(candidateOcean);
  const keys = ["O", "C", "E", "A", "N"];
  const sumSqDiff = keys.reduce((sum, k) => {
    const diff = (c[k] || 0) - (idealOcean[k] || 0);
    return sum + diff * diff;
  }, 0);
  const rms = Math.sqrt(sumSqDiff / keys.length);
  return Math.max(0, Math.round(100 - rms * 1.25));
}

function getTopTags(ocean) {
  if (!ocean) return [];
  const normalized = normalizeOcean(ocean);
  return Object.entries(normalized)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => OCEAN_TAG_LABELS[k] || k);
}

function normalizeRole(row) {
  return {
    id: row.id,
    employerId: row.employer_id,
    title: row.title,
    team: row.team || "",
    description: row.description || "",
    workType: row.work_type || "remote",
    location: row.location || "",
    culture: row.culture_tags || [],
    traits: row.traits || [],
    idealOcean: row.ideal_ocean || null,
    active: row.active,
    status: row.status || "pending",
    rejectionReason: row.rejection_reason || null,
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────
function Avatar({ initials, color, size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: `${color}22`, border: `1.5px solid ${color}55`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.32, fontWeight: 700, color, flexShrink: 0, letterSpacing: 0.5,
    }}>{initials}</div>
  );
}

export function ScoreBadge({ score }) {
  const color = score >= 85 ? ACCENT : score >= 70 ? PURPLE : score >= 55 ? AMBER : MUTED2;
  const label = score >= 85 ? "Strong fit" : score >= 70 ? "Good fit" : score >= 55 ? "Possible fit" : "Weak fit";
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        background: `${color}12`, border: `1px solid ${color}33`,
        borderRadius: 8, padding: "4px 10px",
      }}>
        <div style={{ width: 6, height: 6, borderRadius: 3, background: color }} />
        <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: SANS }}>{score}%</span>
      </div>
      <span style={{ fontSize: 10, color: MUTED2, letterSpacing: 0.5, fontFamily: SANS }}>{label}</span>
    </div>
  );
}

function OceanBars({ ocean }) {
  if (!ocean) return null;
  const entries = Object.entries(OCEAN_LABELS)
    .map(([k, label]) => ({ k, label, score: ocean[k] || 0 }))
    .filter(({ score }) => score > 0);
  if (!entries.length) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {entries.map(({ k, label, score }) => (
        <div key={k}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: MUTED, fontFamily: SANS }}>{label}</span>
            <span style={{ fontSize: 11, color: OCEAN_COLORS[k], fontWeight: 600, fontFamily: SANS }}>{score}</span>
          </div>
          <div style={{ height: 3, background: "rgba(0,0,0,0.06)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${score}%`, background: OCEAN_COLORS[k], borderRadius: 3 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function CandidateDrawer({ candidate, role, onClose, employerId }) {
  const [aiInsight, setAiInsight] = useState("");
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [introRequested, setIntroRequested] = useState(false);
  const [introLoading, setIntroLoading] = useState(false);

  const handleRequestIntro = async () => {
    if (!employerId || !role?.id || !candidate?.wfId) return;
    setIntroLoading(true);
    try {
      await authFetch("/api/employer-intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employerId, roleId: role.id, candidateWfId: candidate.wfId }),
      });
      setIntroRequested(true);
    } catch (err) {
      console.error("intro request error:", err);
    }
    setIntroLoading(false);
  };

  useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);

  const generateInsight = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [{
            role: "user",
            content: `You are a talent advisor. Write a sharp, 3-paragraph hiring brief for this candidate applying for ${role.title}. Be specific, direct, and useful — not generic HR speak.

Candidate ID: ${candidate.wfId}
Archetype: ${candidate.archetype}
Match Score: ${candidate.matchScore}%
Operating Style: ${candidate.operatingStyle}
Top Traits: ${candidate.tags.join(", ")}
Watch Outs: ${candidate.watchOuts.join(". ")}
Culture Fit: ${candidate.cultureFit}${candidate.experience_highlight ? `\nExperience: ${candidate.experience_highlight}` : ""}${candidate.has_direct_experience ? "\nThis candidate has direct industry experience relevant to this role." : ""}
Role: ${role.title}${role.team ? ` — ${role.team}` : ""}${role.culture.length ? ` · ${role.culture.join(", ")}` : ""}

Format:
Para 1 — Why this person stands out for this specific role
Para 2 — How to get the best out of them
Para 3 — One honest risk and how to mitigate it

Keep it under 200 words total.`,
          }],
        }),
      });
      const data = await res.json();
      setAiInsight(data.content?.map(i => i.text || "").join("") || "Unable to generate insight.");
    } catch {
      setAiInsight("Unable to generate insight at this time.");
    }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }} />
      <div style={{
        position: "relative", width: 420, height: "100%", background: BG,
        borderLeft: `1px solid ${BORDER}`, padding: "32px 28px", overflowY: "auto",
        transform: visible ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1)",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.08)",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 20, right: 20, background: BG2,
          border: `1px solid ${BORDER}`, borderRadius: 8, color: MUTED,
          width: 32, height: 32, cursor: "pointer", fontSize: 16,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>×</button>

        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 8 }}>
          <Avatar initials={candidate.initials} color={candidate.color} size={52} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: TEXT, fontFamily: SANS }}>{candidate.wfId}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
              <div style={{ fontSize: 13, color: MUTED, fontFamily: SANS }}>{candidate.archetype}</div>
              {getCandidateArchetypeCategory(candidate) && (
                <span style={{ fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: PURPLE, background: "rgba(107,79,255,0.08)", padding: "2px 7px", borderRadius: 8, fontWeight: 700, fontFamily: SANS }}>
                  {getCandidateArchetypeCategory(candidate)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: MUTED2, marginBottom: 20, fontFamily: SANS }}>{candidate.email}</div>
        <ScoreBadge score={candidate.matchScore} />

        <div style={{ marginTop: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: MUTED2, marginBottom: 10, fontFamily: SANS }}>Archetype Profile</div>
          <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.7, margin: 0, fontFamily: SANS }}>{candidate.operatingStyle}</p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
          {candidate.tags.map(tag => (
            <span key={tag} style={{
              fontSize: 11, letterSpacing: 1, textTransform: "uppercase",
              padding: "4px 10px", borderRadius: 6, fontFamily: SANS,
              background: `${candidate.color}12`, color: candidate.color, border: `1px solid ${candidate.color}25`,
            }}>{tag}</span>
          ))}
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: MUTED2, marginBottom: 14, fontFamily: SANS }}>OCEAN Profile</div>
          <OceanBars ocean={candidate.ocean} />
        </div>

        <div style={{ background: "rgba(245,93,44,0.04)", border: "1px solid rgba(245,93,44,0.12)", borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: ORANGE, marginBottom: 10, fontFamily: SANS }}>Watch Outs</div>
          {candidate.watchOuts.map((w, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: i < candidate.watchOuts.length - 1 ? 8 : 0 }}>
              <span style={{ color: ORANGE, fontSize: 12, marginTop: 2 }}>▸</span>
              <span style={{ color: MUTED, fontSize: 13, lineHeight: 1.5, fontFamily: SANS }}>{w}</span>
            </div>
          ))}
        </div>

        <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 28 }}>
          <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: PURPLE, marginBottom: 10, fontFamily: SANS }}>Culture Fit</div>
          <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.6, margin: 0, fontFamily: SANS }}>{candidate.cultureFit}</p>
        </div>

        {!aiInsight ? (
          <button onClick={generateInsight} disabled={loading} style={{
            width: "100%", padding: "14px", borderRadius: 12, cursor: loading ? "default" : "pointer",
            background: loading ? BG2 : `${candidate.color}12`,
            border: `1px solid ${loading ? BORDER : candidate.color + "44"}`,
            color: loading ? MUTED2 : candidate.color,
            fontSize: 13, fontWeight: 600, fontFamily: SANS,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            {loading
              ? <><Spinner color={candidate.color} /> Generating brief...</>
              : "✦ Generate AI Hiring Brief"}
          </button>
        ) : (
          <div style={{ background: BG2, border: `1px solid ${candidate.color}22`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: candidate.color, marginBottom: 14, fontFamily: SANS }}>✦ AI Hiring Brief</div>
            <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap", fontFamily: SANS }}>{aiInsight}</p>
          </div>
        )}

        {employerId && (
          <div style={{ marginTop: 20, marginBottom: 12 }}>
            {introRequested ? (
              <div style={{ fontSize: 13, color: ACCENT, fontWeight: 600, fontFamily: SANS, textAlign: "center", padding: "12px 0" }}>Intro Requested</div>
            ) : (
              <button onClick={handleRequestIntro} disabled={introLoading} style={{
                width: "100%", padding: "12px", borderRadius: 10, cursor: introLoading ? "default" : "pointer",
                background: ACCENT, border: "none", color: "#fff",
                fontSize: 13, fontWeight: 700, fontFamily: SANS,
              }}>{introLoading ? "Requesting..." : "Request Intro"}</button>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: employerId ? 0 : 20 }}>
          <button style={{
            flex: 1, padding: "12px", borderRadius: 10, cursor: "pointer",
            background: candidate.color, border: "none", color: "#fff",
            fontSize: 13, fontWeight: 700, fontFamily: SANS,
          }}>Advance →</button>
          <button style={{
            padding: "12px 16px", borderRadius: 10, cursor: "pointer",
            background: "none", border: `1px solid ${BORDER}`, color: MUTED,
            fontSize: 13, fontFamily: SANS,
          }}>Pass</button>
        </div>
      </div>
    </div>
  );
}

function Spinner({ color = "#00E5CC", size = 14 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `2px solid ${color}33`, borderTop: `2px solid ${color}`,
      animation: "spin 0.8s linear infinite", flexShrink: 0,
    }} />
  );
}

// ── Intake form helpers ────────────────────────────────────────────────────
const MANDATORY_WEIGHT = 60 / 7; // job desc + 6 questions = 60%
const OPTIONAL_WEIGHT = 40 / 6;  // 6 optional questions = 40%

function PillChoice({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(value === opt ? "" : opt)}
          style={{
            padding: "8px 14px", borderRadius: 10, cursor: "pointer",
            border: value === opt ? `1px solid ${ACCENT}` : `1px solid rgba(0,0,0,0.10)`,
            background: value === opt ? "rgba(0,196,168,0.10)" : BG2,
            color: value === opt ? ACCENT : MUTED,
            fontSize: 12, fontWeight: value === opt ? 600 : 400,
            fontFamily: SANS, transition: "all 0.15s",
          }}
        >{opt}</button>
      ))}
    </div>
  );
}

function IntakeTextarea({ value, onChange, placeholder, maxLen = 500 }) {
  return (
    <div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value.slice(0, maxLen))}
        placeholder={placeholder}
        rows={3}
        style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6, marginBottom: 4 }}
      />
      <div style={{ textAlign: "right", fontSize: 10, color: value.length > maxLen * 0.85 ? AMBER : MUTED2, fontFamily: SANS }}>
        {value.length}/{maxLen}
      </div>
    </div>
  );
}

function NewRolePanel({ employerId, onSaved, onClose }) {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [team, setTeam] = useState("");
  const [description, setDescription] = useState("");
  const [workType, setWorkType] = useState("remote");
  const [location, setLocation] = useState("");

  // Intake — mandatory
  const [mandatory, setMandatory] = useState({
    collaboration: "", autonomy: "", pace: "", culture: "",
    struggles: "", learnings: "",
  });

  // Intake — optional
  const [optional, setOptional] = useState({
    conflict: "", feedback: "", visibility: "", deadlines: "",
    respected: "", thrives: "",
  });

  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [genError, setGenError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);

  // ── Completeness ──
  const descFilled = description.trim().length > 0;
  const mandatoryFilledCount = Object.values(mandatory).filter(v => v.trim().length > 0).length;
  const optionalFilledCount = Object.values(optional).filter(v => v.trim().length > 0).length;
  const completeness = Math.min(100, Math.round(
    (descFilled ? MANDATORY_WEIGHT : 0) +
    mandatoryFilledCount * MANDATORY_WEIGHT +
    optionalFilledCount * OPTIONAL_WEIGHT
  ));
  const allMandatoryDone = descFilled && mandatoryFilledCount === 6;
  const isComplete = completeness >= 99;

  const setM = (key) => (val) => setMandatory(prev => ({ ...prev, [key]: val }));
  const setO = (key) => (val) => setOptional(prev => ({ ...prev, [key]: val }));

  const handleGenerate = async () => {
    if (!title.trim() || !allMandatoryDone) return;
    setGenerating(true);
    setGenError("");
    setGenerated(null);
    try {
      const res = await authFetch("/api/generate-role-ocean", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), team: team.trim(),
          description: description.trim(), workType,
          intake: { ...mandatory, ...optional },
        }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error("Server error — check Vercel logs"); }
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setGenerated(data);
    } catch (err) {
      setGenError(err.message);
    }
    setGenerating(false);
  };

  const handleSave = async () => {
    if (!title.trim() || !generated || !allMandatoryDone) return;
    setSaving(true);
    setSaveError("");
    try {
      const res = await authFetch("/api/save-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employerId,
          title: title.trim(),
          team: team.trim() || null,
          description: description.trim() || null,
          workType,
          location: location.trim() || null,
          cultureTags: generated.cultureTags,
          traits: generated.traits,
          idealOcean: generated.idealOcean,
          intakeData: { ...mandatory, ...optional },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved(normalizeRole(data.role));
    } catch (err) {
      setSaveError(err.message);
    }
    setSaving(false);
  };

  const workTypes = [
    { value: "remote", label: "Remote" },
    { value: "hybrid", label: "Hybrid" },
    { value: "onsite", label: "On-site" },
  ];

  const qLabel = (text, required) => (
    <label style={{
      fontSize: 12, color: required ? TEXT : MUTED,
      display: "block", marginBottom: 10, lineHeight: 1.5, fontFamily: SANS,
    }}>
      {text}{required && <span style={{ color: ORANGE, marginLeft: 4 }}>*</span>}
    </label>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }} />
      <div style={{
        position: "relative", width: 520, height: "100%", background: BG,
        borderLeft: `1px solid ${BORDER}`, padding: "32px 28px 40px", overflowY: "auto",
        transform: visible ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1)",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.08)",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 20, right: 20, background: BG2,
          border: `1px solid ${BORDER}`, borderRadius: 8, color: MUTED,
          width: 32, height: 32, cursor: "pointer", fontSize: 16,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>×</button>

        <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: ACCENT, marginBottom: 8, fontFamily: SANS }}>New Role</div>
        <h2 style={{ fontSize: 22, fontWeight: 400, fontFamily: SERIF, color: TEXT, margin: "0 0 28px", letterSpacing: -0.3 }}>Create a Role</h2>

        {/* ── Basic info ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: MUTED, display: "block", marginBottom: 8, fontFamily: SANS }}>Role Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Senior Product Designer" style={inputStyle} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: MUTED, display: "block", marginBottom: 8, fontFamily: SANS }}>Team</label>
              <input value={team} onChange={e => setTeam(e.target.value)} placeholder="e.g. Growth" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: MUTED, display: "block", marginBottom: 8, fontFamily: SANS }}>Location</label>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. New York" style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: MUTED, display: "block", marginBottom: 8, fontFamily: SANS }}>Work Type</label>
            <div style={{ display: "flex", gap: 8 }}>
              {workTypes.map(wt => (
                <button key={wt.value} onClick={() => setWorkType(wt.value)} style={{
                  flex: 1, padding: "9px 6px", borderRadius: 10,
                  border: workType === wt.value ? `1px solid ${ACCENT}` : `1px solid rgba(0,0,0,0.10)`,
                  background: workType === wt.value ? "rgba(0,196,168,0.10)" : BG2,
                  color: workType === wt.value ? ACCENT : MUTED,
                  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: SANS,
                }}>{wt.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: MUTED, display: "block", marginBottom: 8, fontFamily: SANS }}>Job Description *</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Paste the job description or write a brief summary."
              rows={4}
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
            />
          </div>
        </div>

        {/* ── Completeness indicator ── */}
        <div style={{
          background: BG2, border: `1px solid ${isComplete ? "rgba(0,196,168,0.25)" : BORDER}`,
          borderRadius: 14, padding: "16px 20px", marginBottom: 28,
          transition: "border-color 0.3s",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: isComplete ? ACCENT : MUTED2, fontFamily: SANS }}>
              Profile completeness
            </span>
            <span style={{ fontSize: 20, fontWeight: 700, color: isComplete ? ACCENT : TEXT, letterSpacing: -0.5, fontFamily: SANS }}>
              {completeness}%
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ height: 4, background: "rgba(0,0,0,0.06)", borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
            <div style={{
              height: "100%", borderRadius: 4, transition: "width 0.3s ease, background 0.3s",
              width: `${completeness}%`,
              background: isComplete ? ACCENT : completeness >= 60 ? PURPLE : "rgba(0,0,0,0.15)",
            }} />
          </div>
          <div style={{ fontSize: 11, color: isComplete ? ACCENT : MUTED2, fontFamily: SANS }}>
            {isComplete ? "Profile Complete" : "Complete your team profile to improve match accuracy"}
          </div>
        </div>

        {/* ── Mandatory intake questions ── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: MUTED2, marginBottom: 20, fontFamily: SANS }}>
            Team Culture Profile
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              {qLabel("Is the work mostly collaborative or independent?", true)}
              <PillChoice
                options={["Highly collaborative", "Balanced", "Mostly independent"]}
                value={mandatory.collaboration}
                onChange={setM("collaboration")}
              />
            </div>

            <div>
              {qLabel("Autonomous or closely managed?", true)}
              <PillChoice
                options={["High autonomy", "Moderate", "Closely managed"]}
                value={mandatory.autonomy}
                onChange={setM("autonomy")}
              />
            </div>

            <div>
              {qLabel("Fast-moving and ambiguous vs. structured and process-driven?", true)}
              <PillChoice
                options={["Fast and ambiguous", "Balanced", "Structured and process-driven"]}
                value={mandatory.pace}
                onChange={setM("pace")}
              />
            </div>

            <div>
              {qLabel("Permission or forgiveness culture?", true)}
              <PillChoice
                options={["Ask first", "Balanced", "Act and adapt"]}
                value={mandatory.culture}
                onChange={setM("culture")}
              />
            </div>

            <div>
              {qLabel("What have past hires struggled with in this role — fit-wise, not skills?", true)}
              <IntakeTextarea
                value={mandatory.struggles}
                onChange={setM("struggles")}
                placeholder="e.g. They struggled with the lack of clear direction and needed more structure than we provide..."
              />
            </div>

            <div>
              {qLabel("What would a new hire only learn after being here 3 months?", true)}
              <IntakeTextarea
                value={mandatory.learnings}
                onChange={setM("learnings")}
                placeholder="e.g. That decisions move fast and you need to be comfortable voicing opinions early..."
              />
            </div>
          </div>
        </div>

        {/* ── Optional intake questions ── */}
        <div style={{
          background: BG2, border: `1px solid ${BORDER}`,
          borderRadius: 16, padding: "24px 20px", marginBottom: 28,
        }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: PURPLE, marginBottom: 6, fontFamily: SANS }}>
              Improve Your Match Accuracy
            </div>
            <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.6, fontFamily: SANS }}>
              Optional — each answer adds ~6.7% to your profile score and sharpens candidate matching.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              {qLabel("How does the team handle conflict or disagreement?", false)}
              <PillChoice
                options={["Avoids conflict", "Addresses directly", "Escalates up"]}
                value={optional.conflict}
                onChange={setO("conflict")}
              />
            </div>

            <div>
              {qLabel("How does your manager prefer to give feedback?", false)}
              <PillChoice
                options={["Direct and frequent", "Periodic and structured", "As needed"]}
                value={optional.feedback}
                onChange={setO("feedback")}
              />
            </div>

            <div>
              {qLabel("How much visibility does leadership have into day-to-day work?", false)}
              <PillChoice
                options={["High visibility", "Moderate", "Low visibility"]}
                value={optional.visibility}
                onChange={setO("visibility")}
              />
            </div>

            <div>
              {qLabel("How does the team respond when deadlines are tight or priorities shift?", false)}
              <PillChoice
                options={["Stays calm and adapts", "Varies person to person", "It gets intense"]}
                value={optional.deadlines}
                onChange={setO("deadlines")}
              />
            </div>

            <div>
              {qLabel("How would you describe the person on your team everyone respects most?", false)}
              <IntakeTextarea
                value={optional.respected}
                onChange={setO("respected")}
                placeholder="e.g. They're the person who never overclaims, always follows through, and makes everyone around them better..."
              />
            </div>

            <div>
              {qLabel("What kind of person thrives long-term here vs. burns out?", false)}
              <IntakeTextarea
                value={optional.thrives}
                onChange={setO("thrives")}
                placeholder="e.g. People who thrive are self-directed and comfortable with ambiguity. Those who burn out need constant validation..."
              />
            </div>
          </div>
        </div>

        {/* ── Generate button ── */}
        {(() => {
          const canGenerate = title.trim() && allMandatoryDone && !generating;
          const notReady = !title.trim() || !allMandatoryDone;
          return (
            <>
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                style={{
                  width: "100%", padding: "13px", borderRadius: 12,
                  background: !canGenerate ? BG2 : "rgba(0,196,168,0.10)",
                  border: `1px solid ${!canGenerate ? BORDER : "rgba(0,196,168,0.25)"}`,
                  color: !canGenerate ? MUTED2 : ACCENT,
                  fontSize: 13, fontWeight: 600, cursor: canGenerate ? "pointer" : "default",
                  fontFamily: SANS, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  marginBottom: notReady ? 8 : 20,
                }}
              >
                {generating ? <><Spinner color={ACCENT} /> Generating match profile...</> : "✦ Generate AI Match Profile"}
              </button>
              {notReady && (
                <div style={{ fontSize: 11, color: MUTED2, textAlign: "center", marginBottom: 20, fontFamily: SANS }}>
                  {!title.trim() ? "Add a role title to continue" : "Complete all mandatory questions to generate"}
                </div>
              )}
            </>
          );
        })()}

        {genError && (
          <div style={{ color: ORANGE, fontSize: 13, background: "rgba(245,93,44,0.05)", border: "1px solid rgba(245,93,44,0.15)", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontFamily: SANS }}>
            {genError}
          </div>
        )}

        {/* ── Generated results ── */}
        {generated && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ background: BG2, border: `1px solid rgba(0,196,168,0.15)`, borderRadius: 14, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: ACCENT, marginBottom: 14, fontFamily: SANS }}>Ideal OCEAN Profile</div>
              <OceanBars ocean={generated.idealOcean} />
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: PURPLE, marginBottom: 10, fontFamily: SANS }}>Ideal Traits</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {generated.traits?.map(t => (
                    <span key={t} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 6, background: "rgba(107,79,255,0.10)", color: PURPLE, border: "1px solid rgba(107,79,255,0.15)", fontFamily: SANS }}>{t}</span>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: ORANGE, marginBottom: 10, fontFamily: SANS }}>Culture Tags</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {generated.cultureTags?.map(t => (
                    <span key={t} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 6, background: "rgba(245,93,44,0.08)", color: ORANGE, border: "1px solid rgba(245,93,44,0.15)", fontFamily: SANS }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
            {generated.reasoning && (
              <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, marginBottom: 4 }}>
                <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: MUTED2, marginBottom: 8, fontFamily: SANS }}>AI Reasoning</div>
                <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.65, margin: 0, fontFamily: SANS }}>{generated.reasoning}</p>
              </div>
            )}
          </div>
        )}

        {saveError && (
          <div style={{ color: ORANGE, fontSize: 13, background: "rgba(245,93,44,0.05)", border: "1px solid rgba(245,93,44,0.15)", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontFamily: SANS }}>
            {saveError}
          </div>
        )}

        {generated && (
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: "100%", padding: "14px", borderRadius: 12,
              background: saving ? BG2 : ACCENT,
              border: "none", color: saving ? MUTED2 : "#fff",
              fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer",
              fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {saving ? <><Spinner color={MUTED} /> Saving...</> : "Save Role →"}
          </button>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", background: BG2, border: "1px solid rgba(0,0,0,0.10)",
  borderRadius: 9, padding: "11px 14px", color: TEXT,
  fontSize: 14, fontFamily: SANS, outline: "none", boxSizing: "border-box",
  letterSpacing: "-0.01em",
};

// ── Admin helpers ──────────────────────────────────────────────────────────
const STATUS_COLORS = { pending: AMBER, approved: ACCENT, rejected: ORANGE };
const STATUS_LABELS = { pending: "Pending", approved: "Approved", rejected: "Rejected" };

const MANDATORY_Q_LABELS = {
  collaboration: "Collaborative or independent?",
  autonomy: "Autonomous or closely managed?",
  pace: "Fast-moving or structured?",
  culture: "Permission or forgiveness culture?",
  struggles: "What have past hires struggled with fit-wise?",
  learnings: "What would a new hire learn after 3 months?",
};
const OPTIONAL_Q_LABELS = {
  conflict: "How does the team handle conflict?",
  feedback: "How does the manager give feedback?",
  visibility: "How much visibility does leadership have?",
  deadlines: "How does the team respond under pressure?",
  respected: "Who does everyone on the team respect most?",
  thrives: "Who thrives vs. burns out here?",
};

const ADMIN_MANDATORY_KEYS = ["collaboration", "autonomy", "pace", "culture", "struggles", "learnings"];
const ADMIN_OPTIONAL_KEYS = ["conflict", "feedback", "visibility", "deadlines", "respected", "thrives"];
const ADM_WEIGHT = 60 / 7;
const ADM_OPT_WEIGHT = 40 / 6;

function adminComputeCompleteness(role) {
  const intake = role.intakeData || {};
  const descFilled = (role.description || "").trim().length > 0;
  const mandatoryCount = ADMIN_MANDATORY_KEYS.filter(k => (intake[k] || "").trim().length > 0).length;
  const optionalCount = ADMIN_OPTIONAL_KEYS.filter(k => (intake[k] || "").trim().length > 0).length;
  return Math.min(100, Math.round(
    (descFilled ? ADM_WEIGHT : 0) + mandatoryCount * ADM_WEIGHT + optionalCount * ADM_OPT_WEIGHT
  ));
}

function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || MUTED;
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 6,
      background: `${color}15`, border: `1px solid ${color}33`,
    }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
      <span style={{ fontSize: 11, fontWeight: 600, color, letterSpacing: 0.5 }}>
        {STATUS_LABELS[status] || status}
      </span>
    </div>
  );
}

function RejectModal({ role, userId, onRejected, onClose }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleReject = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch("/api/admin-reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: role.id, userId, reason: reason.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reject failed");
      onRejected(role.id, reason.trim());
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }} />
      <div style={{
        position: "relative", width: 440, background: BG,
        border: `1px solid ${BORDER}`, borderRadius: 16, padding: "28px 28px 24px",
        boxShadow: "0 8px 48px rgba(0,0,0,0.12)",
      }}>
        <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: ORANGE, marginBottom: 8, fontFamily: SANS }}>Reject Role</div>
        <h3 style={{ fontSize: 18, fontWeight: 400, fontFamily: SERIF, color: TEXT, margin: "0 0 6px" }}>{role.title}</h3>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 20, fontFamily: SANS }}>{role.companyName}</div>

        <label style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: MUTED, display: "block", marginBottom: 8, fontFamily: SANS }}>
          Reason <span style={{ color: MUTED2, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
        </label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value.slice(0, 500))}
          placeholder="e.g. The job description is too vague for accurate matching. Please add more detail about day-to-day responsibilities."
          rows={4}
          style={{ ...inputStyle, resize: "none", lineHeight: 1.6, marginBottom: 4 }}
        />
        <div style={{ fontSize: 10, color: MUTED2, textAlign: "right", marginBottom: 20, fontFamily: SANS }}>{reason.length}/500</div>

        {error && (
          <div style={{ color: ORANGE, fontSize: 13, marginBottom: 16, fontFamily: SANS }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={handleReject}
            disabled={loading}
            style={{
              flex: 1, padding: "12px", borderRadius: 10, cursor: loading ? "default" : "pointer",
              background: loading ? BG2 : "rgba(245,93,44,0.08)", border: `1px solid ${loading ? BORDER : "rgba(245,93,44,0.25)"}`,
              color: loading ? MUTED2 : ORANGE, fontSize: 13, fontWeight: 600, fontFamily: SANS,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {loading ? <><Spinner color={ORANGE} /> Rejecting...</> : "Confirm Rejection"}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "12px 20px", borderRadius: 10, cursor: "pointer",
              background: "none", border: `1px solid ${BORDER}`, color: MUTED,
              fontSize: 13, fontFamily: SANS,
            }}
          >Cancel</button>
        </div>
      </div>
    </div>
  );
}

function RoleDetailsDrawer({ role, userId, onApproved, onRejected, onClose }) {
  const [visible, setVisible] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState("");
  const completeness = adminComputeCompleteness(role);

  useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);

  const handleApprove = async () => {
    setApproving(true);
    setError("");
    try {
      const res = await authFetch("/api/admin-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: role.id, userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approve failed");
      onApproved(role.id);
    } catch (err) {
      setError(err.message);
    }
    setApproving(false);
  };

  const intake = role.intakeData || {};

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
        <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }} />
        <div style={{
          position: "relative", width: 480, height: "100%", background: BG,
          borderLeft: `1px solid ${BORDER}`, padding: "32px 28px 40px", overflowY: "auto",
          transform: visible ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1)",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.08)",
        }}>
          <button onClick={onClose} style={{
            position: "absolute", top: 20, right: 20, background: BG2,
            border: `1px solid ${BORDER}`, borderRadius: 8, color: MUTED,
            width: 32, height: 32, cursor: "pointer", fontSize: 16,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>

          <div style={{ marginBottom: 6 }}><StatusBadge status={role.status} /></div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 4, fontFamily: SANS }}>{role.companyName}{role.industry ? ` · ${role.industry}` : ""}</div>
          <h2 style={{ fontSize: 22, fontWeight: 400, fontFamily: SERIF, color: TEXT, margin: "0 0 4px" }}>{role.title}</h2>
          {role.team && <div style={{ fontSize: 13, color: MUTED, marginBottom: 16, fontFamily: SANS }}>{role.team} team</div>}

          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {role.workType && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: BG2, color: MUTED, border: `1px solid ${BORDER}`, fontFamily: SANS }}>{role.workType}</span>}
            {role.location && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: BG2, color: MUTED, border: `1px solid ${BORDER}`, fontFamily: SANS }}>{role.location}</span>}
            <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: BG2, color: MUTED, border: `1px solid ${BORDER}`, fontFamily: SANS }}>
              {new Date(role.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>

          {/* Completeness */}
          <div style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px", marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: MUTED2, fontFamily: SANS }}>Profile Completeness</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: completeness >= 99 ? ACCENT : TEXT, fontFamily: SANS }}>{completeness}%</span>
            </div>
            <div style={{ height: 3, background: "rgba(0,0,0,0.06)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3,
                width: `${completeness}%`,
                background: completeness >= 99 ? ACCENT : completeness >= 60 ? PURPLE : AMBER,
              }} />
            </div>
          </div>

          {/* Description */}
          {role.description && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: MUTED2, marginBottom: 10, fontFamily: SANS }}>Job Description</div>
              <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.7, margin: 0, fontFamily: SANS }}>{role.description}</p>
            </div>
          )}

          {/* Mandatory intake */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: MUTED2, marginBottom: 14, fontFamily: SANS }}>Team Culture Responses</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {ADMIN_MANDATORY_KEYS.map(key => intake[key] ? (
                <div key={key} style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 10, color: MUTED2, marginBottom: 6, fontFamily: SANS }}>{MANDATORY_Q_LABELS[key]}</div>
                  <div style={{ fontSize: 13, color: TEXT, lineHeight: 1.5, fontFamily: SANS }}>{intake[key]}</div>
                </div>
              ) : null)}
            </div>
          </div>

          {/* Optional intake */}
          {ADMIN_OPTIONAL_KEYS.some(k => intake[k]) && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: PURPLE, marginBottom: 14, fontFamily: SANS }}>Optional Responses</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {ADMIN_OPTIONAL_KEYS.map(key => intake[key] ? (
                  <div key={key} style={{ background: BG2, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, color: MUTED2, marginBottom: 6, fontFamily: SANS }}>{OPTIONAL_Q_LABELS[key]}</div>
                    <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, fontFamily: SANS }}>{intake[key]}</div>
                  </div>
                ) : null)}
              </div>
            </div>
          )}

          {error && <div style={{ color: ORANGE, fontSize: 13, marginBottom: 16, fontFamily: SANS }}>{error}</div>}

          {role.status === "pending" && (
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleApprove}
                disabled={approving}
                style={{
                  flex: 1, padding: "13px", borderRadius: 10, cursor: approving ? "default" : "pointer",
                  background: approving ? BG2 : ACCENT, border: "none",
                  color: approving ? MUTED2 : "#fff",
                  fontSize: 13, fontWeight: 700, fontFamily: SANS,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {approving ? <><Spinner color={MUTED} /> Approving...</> : "Approve →"}
              </button>
              <button
                onClick={() => setShowReject(true)}
                style={{
                  padding: "13px 18px", borderRadius: 10, cursor: "pointer",
                  background: "rgba(245,93,44,0.08)", border: "1px solid rgba(245,93,44,0.25)",
                  color: ORANGE, fontSize: 13, fontWeight: 600, fontFamily: SANS,
                }}
              >Reject</button>
            </div>
          )}

          {role.status === "rejected" && role.rejectionReason && (
            <div style={{ background: "rgba(245,93,44,0.04)", border: "1px solid rgba(245,93,44,0.12)", borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: ORANGE, marginBottom: 8, fontFamily: SANS }}>Rejection Reason</div>
              <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.6, margin: 0, fontFamily: SANS }}>{role.rejectionReason}</p>
            </div>
          )}
        </div>
      </div>

      {showReject && (
        <RejectModal
          role={role}
          userId={userId}
          onRejected={(id, reason) => { onRejected(id, reason); setShowReject(false); onClose(); }}
          onClose={() => setShowReject(false)}
        />
      )}
    </>
  );
}

function AdminQueueView({ userId, onViewMatches }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("pending");
  const [selectedRole, setSelectedRole] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

  useEffect(() => {
    authFetch(`/api/admin-queue?userId=${userId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setRoles(data.roles || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleApproved = (id) => {
    setRoles(prev => prev.map(r => r.id === id ? { ...r, status: "approved", active: true } : r));
    setSelectedRole(null);
  };

  const handleRejected = (id, reason) => {
    setRoles(prev => prev.map(r => r.id === id ? { ...r, status: "rejected", active: false, rejectionReason: reason } : r));
    setSelectedRole(null);
    setRejectTarget(null);
  };

  const filtered = filter === "all" ? roles : roles.filter(r => r.status === filter);
  const pendingCount = roles.filter(r => r.status === "pending").length;

  const FILTERS = [
    { key: "pending", label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "all", label: "All" },
  ];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "24px 32px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: AMBER, marginBottom: 6, fontFamily: SANS }}>Admin</div>
          <h1 style={{ fontSize: 26, fontWeight: 400, fontFamily: SERIF, color: TEXT, margin: 0 }}>Role Approval Queue</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              padding: "7px 14px", borderRadius: 8, cursor: "pointer",
              background: filter === f.key ? TEXT : "none",
              border: filter === f.key ? "none" : `1px solid rgba(0,0,0,0.10)`,
              color: filter === f.key ? "#fff" : MUTED,
              fontSize: 12, fontWeight: filter === f.key ? 700 : 400, fontFamily: SANS,
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        {loading && (
          <div style={{ display: "flex", gap: 12, alignItems: "center", color: MUTED2, fontSize: 13, fontFamily: SANS }}>
            <Spinner color={ACCENT} size={16} /> Loading queue...
          </div>
        )}
        {error && (
          <div style={{ color: ORANGE, fontSize: 13, padding: 16, background: "rgba(245,93,44,0.05)", borderRadius: 10, border: "1px solid rgba(245,93,44,0.15)", fontFamily: SANS }}>
            {error}
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: MUTED2, fontFamily: SANS }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>◌</div>
            <div style={{ fontSize: 14 }}>No {filter === "all" ? "" : filter} roles</div>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map(role => {
              const completeness = adminComputeCompleteness(role);
              const statusColor = STATUS_COLORS[role.status] || MUTED2;
              const descPreview = (role.description || "").slice(0, 100) + ((role.description || "").length > 100 ? "…" : "");
              return (
                <div key={role.id} style={{
                  background: BG, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "20px 24px", boxShadow: SHADOW,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, fontSize: 16, color: TEXT, fontFamily: SANS }}>{role.title}</span>
                        {role.team && <span style={{ fontSize: 12, color: MUTED, fontFamily: SANS }}>{role.team}</span>}
                        <StatusBadge status={role.status} />
                      </div>
                      <div style={{ fontSize: 13, color: MUTED, marginBottom: 8, fontFamily: SANS }}>
                        {role.companyName}{role.industry ? ` · ${role.industry}` : ""} · {new Date(role.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                      {descPreview && (
                        <p style={{ fontSize: 13, color: MUTED, margin: "0 0 12px", lineHeight: 1.5, fontFamily: SANS }}>{descPreview}</p>
                      )}
                    </div>
                    {/* Completeness */}
                    <div style={{ flexShrink: 0, marginLeft: 20, textAlign: "right" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: completeness >= 99 ? ACCENT : TEXT, fontFamily: SANS }}>{completeness}%</div>
                      <div style={{ fontSize: 10, color: MUTED2, marginTop: 2, fontFamily: SANS }}>complete</div>
                      <div style={{ width: 60, height: 3, background: "rgba(0,0,0,0.06)", borderRadius: 3, overflow: "hidden", marginTop: 6, marginLeft: "auto" }}>
                        <div style={{
                          height: "100%", borderRadius: 3, width: `${completeness}%`,
                          background: completeness >= 99 ? ACCENT : completeness >= 60 ? PURPLE : AMBER,
                        }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    {role.status === "pending" && (
                      <>
                        <button
                          onClick={async () => {
                            const res = await authFetch("/api/admin-approve", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ roleId: role.id, userId }),
                            });
                            if (res.ok) handleApproved(role.id);
                          }}
                          style={{
                            padding: "8px 18px", borderRadius: 8, cursor: "pointer",
                            background: "rgba(0,196,168,0.10)", border: "1px solid rgba(0,196,168,0.25)",
                            color: ACCENT, fontSize: 12, fontWeight: 600, fontFamily: SANS,
                          }}
                        >Approve</button>
                        <button
                          onClick={() => setRejectTarget(role)}
                          style={{
                            padding: "8px 18px", borderRadius: 8, cursor: "pointer",
                            background: "rgba(245,93,44,0.08)", border: "1px solid rgba(245,93,44,0.25)",
                            color: ORANGE, fontSize: 12, fontWeight: 600, fontFamily: SANS,
                          }}
                        >Reject</button>
                      </>
                    )}
                    {role.status === "approved" && onViewMatches && (
                      <button
                        onClick={() => onViewMatches(role.id)}
                        style={{
                          padding: "8px 18px", borderRadius: 8, cursor: "pointer",
                          background: "rgba(107,79,255,0.08)", border: "1px solid rgba(107,79,255,0.25)",
                          color: PURPLE, fontSize: 12, fontWeight: 600, fontFamily: SANS,
                        }}
                      >See Matches</button>
                    )}
                    <button
                      onClick={() => setSelectedRole(role)}
                      style={{
                        padding: "8px 18px", borderRadius: 8, cursor: "pointer",
                        background: "none", border: `1px solid rgba(0,0,0,0.10)`,
                        color: MUTED, fontSize: 12, fontFamily: SANS,
                      }}
                    >View Full Details</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedRole && (
        <RoleDetailsDrawer
          role={selectedRole}
          userId={userId}
          onApproved={handleApproved}
          onRejected={handleRejected}
          onClose={() => setSelectedRole(null)}
        />
      )}

      {rejectTarget && (
        <RejectModal
          role={rejectTarget}
          userId={userId}
          onRejected={handleRejected}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </div>
  );
}

// ── Auth Screen ────────────────────────────────────────────────────────────
function EmployerAuth({ onComplete }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { user_type: "employer" } } });
        if (err) throw err;
        window.gtag?.("event", "employer_signup");
        onComplete({ userId: data.user.id, email: email.trim(), isNew: true });
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) throw err;
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

  return (
    <div style={{
      minHeight: "100dvh", background: BG, color: TEXT,
      fontFamily: SANS,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 440,
        background: BG, border: `1px solid ${BORDER}`,
        borderRadius: 20, padding: "40px 36px", boxShadow: SHADOW,
      }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <svg viewBox="0 0 48 48" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="48" height="48" rx="12" fill="#0A0A0A"/>
              <circle cx="8" cy="13" r="4" fill="#00C4A8"/><circle cx="18" cy="35" r="3" fill="#6B4FFF"/><circle cx="24" cy="22" r="3.5" fill="#00C4A8"/><circle cx="30" cy="35" r="3" fill="#6B4FFF"/><circle cx="40" cy="13" r="4" fill="#00C4A8"/>
              <line x1="8" y1="13" x2="18" y2="35" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/><line x1="18" y1="35" x2="24" y2="22" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/><line x1="24" y1="22" x2="30" y2="35" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/><line x1="30" y1="35" x2="40" y2="13" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: SERIF, fontSize: 26, color: TEXT }}>WiredFor<span style={{ color: ACCENT }}>.ai</span></span>
          </div>
          <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: ACCENT, marginBottom: 16, fontFamily: SANS }}>Employer Access</div>
          <h2 style={{ fontSize: 22, fontWeight: 400, fontFamily: SERIF, color: TEXT, margin: "0 0 8px" }}>
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p style={{ color: MUTED, fontSize: 14, margin: 0, fontFamily: SANS }}>
            {mode === "login" ? "Log in to manage your roles and pipeline." : "Set up your employer profile to start matching."}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <input
            type="email"
            placeholder="Work email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            autoComplete="email"
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            style={inputStyle}
          />
          {mode === "login" && !forgotMode && (
            <button
              onClick={() => { setForgotMode(true); setResetEmail(email); setError(""); }}
              style={{ background: "none", border: "none", color: ACCENT, fontSize: 13, cursor: "pointer", fontFamily: SANS, padding: 0, textAlign: "right", marginTop: -4 }}
            >
              Forgot Password?
            </button>
          )}
        </div>

        {forgotMode && (
          <div style={{
            background: BG2, border: `1px solid rgba(0,196,168,0.20)`, borderRadius: 12,
            padding: "20px 18px", marginBottom: 20,
          }}>
            {resetSent ? (
              <div>
                <p style={{ color: "#4A4A4A", fontSize: 14, lineHeight: 1.65, margin: "0 0 12px", fontFamily: SANS }}>
                  Check your email — we sent you a password reset link.
                </p>
                <button
                  onClick={() => { setForgotMode(false); setResetSent(false); setResetEmail(""); }}
                  style={{ background: "none", border: "none", color: ACCENT, fontSize: 13, cursor: "pointer", fontFamily: SANS, padding: 0 }}
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 10, fontFamily: SANS }}>Reset your password</div>
                <input
                  type="email"
                  placeholder="Work email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleForgotPassword()}
                  autoComplete="email"
                  style={{ ...inputStyle, marginBottom: 12 }}
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={handleForgotPassword}
                    disabled={resetLoading || !resetEmail.trim()}
                    style={{
                      padding: "10px 20px", borderRadius: 10,
                      background: (resetLoading || !resetEmail.trim()) ? BG2 : ACCENT,
                      border: "none", color: (resetLoading || !resetEmail.trim()) ? MUTED2 : "#fff",
                      fontSize: 13, fontWeight: 600, cursor: (resetLoading || !resetEmail.trim()) ? "default" : "pointer",
                      fontFamily: SANS,
                    }}
                  >
                    {resetLoading ? "Sending..." : "Send Reset Link"}
                  </button>
                  <button
                    onClick={() => { setForgotMode(false); setError(""); }}
                    style={{ background: "none", border: "none", color: MUTED, fontSize: 13, cursor: "pointer", fontFamily: SANS }}
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
            padding: "12px 14px", marginBottom: 16, color: ORANGE, fontSize: 13, fontFamily: SANS,
          }}>{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading || !email.trim() || !password.trim()}
          style={{
            width: "100%", padding: "14px", borderRadius: 12,
            background: (loading || !email.trim() || !password.trim()) ? BG2 : ACCENT,
            border: "none",
            color: (loading || !email.trim() || !password.trim()) ? MUTED2 : "#fff",
            fontSize: 15, fontWeight: 700, cursor: (loading || !email.trim() || !password.trim()) ? "default" : "pointer",
            fontFamily: SANS,
          }}
        >
          {loading ? "Please wait..." : mode === "login" ? "Log In →" : "Create Account →"}
        </button>

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 14, color: MUTED, fontFamily: SANS }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
            style={{ background: "none", border: "none", color: ACCENT, fontSize: 14, cursor: "pointer", fontFamily: SANS, textDecoration: "underline" }}
          >
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Onboarding Screen ──────────────────────────────────────────────────────
function EmployerOnboarding({ userId, email, onComplete }) {
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const INDUSTRIES = ["Technology", "Finance", "Healthcare", "Media", "E-commerce", "Education", "Consulting", "Other"];

  const handleSave = async () => {
    if (!companyName.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await authFetch("/api/employer-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, companyName: companyName.trim(), industry: industry || null, website: website.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onComplete(data.employer);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100dvh", background: BG, color: TEXT,
      fontFamily: SANS,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        width: "100%", maxWidth: 480,
        background: BG, border: `1px solid ${BORDER}`,
        borderRadius: 20, padding: "40px 36px", boxShadow: SHADOW,
      }}>
        <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: ACCENT, marginBottom: 12, fontFamily: SANS }}>Setup</div>
        <h2 style={{ fontSize: 24, fontWeight: 400, fontFamily: SERIF, color: TEXT, margin: "0 0 8px" }}>Tell us about your company</h2>
        <p style={{ color: MUTED, fontSize: 14, margin: "0 0 32px", lineHeight: 1.6, fontFamily: SANS }}>
          This takes 30 seconds. We use this to show candidates who you are when they're matched.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
          <div>
            <label style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: MUTED, display: "block", marginBottom: 8, fontFamily: SANS }}>Company Name *</label>
            <input
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="Acme Corp"
              style={inputStyle}
              autoFocus
            />
          </div>

          <div>
            <label style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: MUTED, display: "block", marginBottom: 8, fontFamily: SANS }}>Industry</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {INDUSTRIES.map(ind => (
                <button key={ind} onClick={() => setIndustry(ind === industry ? "" : ind)} style={{
                  padding: "8px 14px", borderRadius: 10, cursor: "pointer",
                  border: industry === ind ? `1px solid ${ACCENT}` : `1px solid rgba(0,0,0,0.10)`,
                  background: industry === ind ? "rgba(0,196,168,0.10)" : BG2,
                  color: industry === ind ? ACCENT : MUTED,
                  fontSize: 13, fontFamily: SANS,
                }}>{ind}</button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: MUTED, display: "block", marginBottom: 8, fontFamily: SANS }}>Website</label>
            <input
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://yourcompany.com"
              style={inputStyle}
              type="text"
            />
          </div>
        </div>

        {error && (
          <div style={{
            background: "rgba(245,93,44,0.05)", border: "1px solid rgba(245,93,44,0.15)", borderRadius: 10,
            padding: "12px 14px", marginBottom: 16, color: ORANGE, fontSize: 13, fontFamily: SANS,
          }}>{error}</div>
        )}

        <button
          onClick={handleSave}
          disabled={!companyName.trim() || loading}
          style={{
            width: "100%", padding: "14px", borderRadius: 12,
            background: (!companyName.trim() || loading) ? BG2 : ACCENT,
            border: "none",
            color: (!companyName.trim() || loading) ? MUTED2 : "#fff",
            fontSize: 15, fontWeight: 700, cursor: (!companyName.trim() || loading) ? "default" : "pointer",
            fontFamily: SANS, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          {loading ? <><Spinner color={MUTED} /> Saving...</> : "Enter Dashboard →"}
        </button>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function EmployerDashboard() {
  const [screen, setScreen] = useState("loading"); // loading | auth | onboarding | dashboard
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [employer, setEmployer] = useState(null);
  const [roles, setRoles] = useState([]);
  const [activeRole, setActiveRole] = useState(null);
  const [showQueue, setShowQueue] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [tab, setTab] = useState("candidates");
  const [matchedCandidates, setMatchedCandidates] = useState([]);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState(null);
  const matchCache = useRef({});
  const [showNewRole, setShowNewRole] = useState(false);

  // ── Init: check session ──
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setScreen("auth");
        return;
      }
      setUser({ id: session.user.id, email: session.user.email });
      await loadEmployerProfile(session.user.id);
    })();
  }, []);

  // ── AI match candidates whenever active role changes ──
  const [matchFallback, setMatchFallback] = useState(false);
  useEffect(() => {
    if (!activeRole) return;
    if (matchCache.current[activeRole.id]) {
      setMatchedCandidates(matchCache.current[activeRole.id].candidates);
      setMatchFallback(matchCache.current[activeRole.id].fallback);
      return;
    }
    setMatchLoading(true);
    setMatchError(null);
    setMatchFallback(false);
    setMatchedCandidates([]);
    authFetch("/api/fit-score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleId: activeRole.id }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        const candidates = (data.candidates || []).map((c, i) => ({
          ...c,
          wfId: c.wf_id,
          matchScore: c.fit_score,
          color: COLORS[i % COLORS.length],
          initials: c.wf_id ? c.wf_id.replace("WF-", "").slice(0, 2) : "??",
          tags: getTopTags(c.ocean),
        }));
        const fallback = !!data.fallback;
        matchCache.current[activeRole.id] = { candidates, fallback };
        setMatchedCandidates(candidates);
        setMatchFallback(fallback);
      })
      .catch(err => {
        // Fallback to old match-candidates if fit-score fails entirely
        setMatchFallback(true);
        return authFetch("/api/match-candidates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roleId: activeRole.id }),
        })
          .then(r => r.json())
          .then(data => {
            if (data.error) throw new Error(data.error);
            const candidates = (data.candidates || []).map((c, i) => ({
              ...c,
              matchScore: c.matchScore,
              color: COLORS[i % COLORS.length],
              initials: c.wfId ? c.wfId.replace("WF-", "").slice(0, 2) : "??",
              tags: getTopTags(c.ocean),
            }));
            matchCache.current[activeRole.id] = { candidates, fallback: true };
            setMatchedCandidates(candidates);
          })
          .catch(err2 => setMatchError(err2.message));
      })
      .finally(() => setMatchLoading(false));
  }, [activeRole?.id]);

  const loadEmployerProfile = async (userId) => {
    try {
      const res = await authFetch(`/api/employer-profile?userId=${userId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.isAdmin) {
        setIsAdmin(true);
        // Load pending count for badge
        authFetch(`/api/admin-queue?userId=${userId}`)
          .then(r => r.json())
          .then(d => setPendingCount((d.roles || []).filter(r => r.status === "pending").length))
          .catch(() => {});
      }
      if (!data.employer) {
        if (data.isAdmin) { setScreen("dashboard"); return; }
        setScreen("onboarding");
        return;
      }
      setEmployer(data.employer);
      await loadRoles(data.employer.id);
    } catch {
      setScreen("onboarding");
    }
  };

  const loadRoles = async (employerId) => {
    try {
      const res = await authFetch(`/api/employer-roles?employerId=${employerId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const normalized = (data.roles || []).map(normalizeRole);
      setRoles(normalized);
      if (normalized.length > 0) setActiveRole(normalized[0]);
      setScreen("dashboard");
    } catch {
      setRoles([]);
      setScreen("dashboard");
    }
  };

  const handleAuthComplete = async ({ userId, email, isNew }) => {
    setUser({ id: userId, email });
    if (isNew) {
      setScreen("onboarding");
    } else {
      await loadEmployerProfile(userId);
    }
  };

  const handleOnboardingComplete = async (employerData) => {
    setEmployer(employerData);
    await loadRoles(employerData.id);
  };

  const handleRoleSaved = (newRole) => {
    setRoles(prev => [newRole, ...prev]);
    setActiveRole(newRole);
    setShowNewRole(false);
    setTab("candidates");
  };


  // ── Render ──
  if (screen === "loading") {
    return (
      <div style={{
        minHeight: "100dvh", background: BG, display: "flex",
        alignItems: "center", justifyContent: "center", gap: 12,
        fontFamily: SANS, color: MUTED2, fontSize: 14,
      }}>
        <Spinner color={MUTED2} size={18} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (screen === "auth") {
    return (
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap'); @keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; }`}</style>
        <EmployerAuth onComplete={handleAuthComplete} />
      </>
    );
  }

  if (screen === "onboarding") {
    return (
      <>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap'); @keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; }`}</style>
        <EmployerOnboarding userId={user?.id} email={user?.email} onComplete={handleOnboardingComplete} />
      </>
    );
  }

  // dashboard
  return (
    <div style={{
      minHeight: "100vh", background: BG, color: TEXT,
      fontFamily: SANS, display: "flex",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #F7F7F5; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 4px; }
        * { box-sizing: border-box; }
        textarea { font-family: inherit; }
      `}</style>

      {/* Sidebar */}
      <div style={{
        width: 248, background: BG2, borderRight: `1px solid ${BORDER}`,
        display: "flex", flexDirection: "column", padding: "28px 0", flexShrink: 0,
      }}>
        <div style={{ padding: "0 20px 24px", borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: MUTED2, marginBottom: 4, fontFamily: SANS }}>Platform</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <svg viewBox="0 0 48 48" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="48" height="48" rx="12" fill="#0A0A0A"/>
              <circle cx="8" cy="13" r="4" fill="#00C4A8"/><circle cx="18" cy="35" r="3" fill="#6B4FFF"/><circle cx="24" cy="22" r="3.5" fill="#00C4A8"/><circle cx="30" cy="35" r="3" fill="#6B4FFF"/><circle cx="40" cy="13" r="4" fill="#00C4A8"/>
              <line x1="8" y1="13" x2="18" y2="35" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/><line x1="18" y1="35" x2="24" y2="22" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/><line x1="24" y1="22" x2="30" y2="35" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/><line x1="30" y1="35" x2="40" y2="13" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: SERIF, fontSize: 22, color: TEXT }}>WiredFor<span style={{ color: ACCENT }}>.ai</span></span>
          </div>
          {employer && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, fontFamily: SANS }}>{employer.company_name}</div>
              {employer.industry && <div style={{ fontSize: 11, color: MUTED2, marginTop: 2, fontFamily: SANS }}>{employer.industry}</div>}
            </div>
          )}
        </div>

        <div style={{ padding: "20px 12px 12px", flex: 1, overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px", marginBottom: 12 }}>
            <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: MUTED2, fontFamily: SANS }}>Open Roles</div>
            <button
              onClick={() => setShowNewRole(true)}
              style={{
                background: "none", border: `1px solid rgba(0,0,0,0.10)`, borderRadius: 6,
                color: MUTED, cursor: "pointer", fontSize: 16, lineHeight: 1,
                width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: SANS,
              }}
              title="Add role"
            >+</button>
          </div>

          {roles.length === 0 && (
            <div style={{ padding: "12px 8px" }}>
              <p style={{ color: MUTED2, fontSize: 12, lineHeight: 1.6, margin: 0, fontFamily: SANS }}>No roles yet.</p>
              <button
                onClick={() => setShowNewRole(true)}
                style={{
                  marginTop: 10, padding: "8px 14px", borderRadius: 8, cursor: "pointer",
                  background: "rgba(0,196,168,0.10)", border: "1px solid rgba(0,196,168,0.25)",
                  color: ACCENT, fontSize: 12, fontFamily: SANS,
                }}
              >Create your first role →</button>
            </div>
          )}

          {roles.map(role => {
            const isActive = !showQueue && activeRole?.id === role.id;
            const count = isActive ? matchedCandidates.length : null;
            const statusColor = STATUS_COLORS[role.status] || MUTED2;
            return (
              <button
                key={role.id}
                onClick={() => { setShowQueue(false); setActiveRole(role); setTab("candidates"); setSelectedCandidate(null); }}
                style={{
                  width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 10,
                  background: isActive ? BG : "none",
                  border: isActive ? `1px solid ${BORDER}` : "1px solid transparent",
                  cursor: "pointer", marginBottom: 4, boxShadow: isActive ? SHADOW : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: statusColor, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? TEXT : MUTED, fontFamily: SANS }}>{role.title}</span>
                </div>
                <div style={{ fontSize: 11, color: MUTED2, paddingLeft: 11, fontFamily: SANS }}>
                  {role.team ? `${role.team} · ` : ""}
                  {role.status === "pending" ? "Pending review" : role.status === "rejected" ? "Rejected" :
                    isActive && matchLoading ? "Matching..." : isActive && count !== null ? `${count} matched` : ""}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{ padding: "16px 12px", borderTop: `1px solid ${BORDER}` }}>
          {isAdmin && (
            <button
              onClick={() => { setShowQueue(true); setSelectedCandidate(null); }}
              style={{
                width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 10,
                background: showQueue ? BG : "none",
                border: showQueue ? `1px solid rgba(245,158,11,0.20)` : "1px solid transparent",
                cursor: "pointer", marginBottom: 8,
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: showQueue ? AMBER : MUTED, fontFamily: SANS }}>Approval Queue</span>
              </div>
              {pendingCount > 0 && (
                <div style={{
                  minWidth: 18, height: 18, borderRadius: 9, background: AMBER,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, color: "#fff", padding: "0 5px", fontFamily: SANS,
                }}>
                  {pendingCount}
                </div>
              )}
            </button>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 12px" }}>
            <svg viewBox="0 0 48 48" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="48" height="48" rx="12" fill="#0A0A0A"/>
              <circle cx="8" cy="13" r="4" fill="#00C4A8"/><circle cx="18" cy="35" r="3" fill="#6B4FFF"/><circle cx="24" cy="22" r="3.5" fill="#00C4A8"/><circle cx="30" cy="35" r="3" fill="#6B4FFF"/><circle cx="40" cy="13" r="4" fill="#00C4A8"/>
              <line x1="8" y1="13" x2="18" y2="35" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/><line x1="18" y1="35" x2="24" y2="22" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/><line x1="24" y1="22" x2="30" y2="35" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/><line x1="30" y1="35" x2="40" y2="13" stroke="#00C4A8" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize: 11, color: MUTED2, fontFamily: SANS }}>WiredFor<span style={{ color: ACCENT }}>.ai</span></span>
          </div>
          <button
            onClick={() => { supabase.auth.signOut(); window.location.href = "/"; }}
            style={{
              background: "none", border: "none", color: MUTED2, fontSize: 12,
              cursor: "pointer", fontFamily: SANS, padding: "10px 12px", width: "100%",
              textAlign: "left", marginTop: 8,
            }}
          >Sign Out</button>
        </div>
      </div>

      {/* Main — queue or normal content */}
      {showQueue ? <AdminQueueView userId={user?.id} onViewMatches={(roleId) => {
        const r = roles.find(x => x.id === roleId);
        if (r) { setShowQueue(false); setActiveRole(r); setTab("candidates"); }
      }} /> : <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{
          padding: "24px 32px", borderBottom: `1px solid ${BORDER}`,
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        }}>
          {activeRole ? (
            <div>
              {activeRole.team && (
                <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: MUTED2, marginBottom: 6, fontFamily: SANS }}>{activeRole.team}</div>
              )}
              <h1 style={{ fontSize: 26, fontWeight: 400, fontFamily: SERIF, color: TEXT, margin: 0 }}>{activeRole.title}</h1>
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                {activeRole.culture.map(tag => (
                  <span key={tag} style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 6,
                    background: BG2, color: MUTED, border: `1px solid ${BORDER}`, fontFamily: SANS,
                  }}>{tag}</span>
                ))}
                {activeRole.workType && (
                  <span style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 6,
                    background: "rgba(0,196,168,0.08)", color: ACCENT, border: "1px solid rgba(0,196,168,0.20)", fontFamily: SANS,
                  }}>{activeRole.workType}</span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 400, fontFamily: SERIF, color: MUTED2, margin: 0 }}>No roles yet</h1>
              <p style={{ color: MUTED2, fontSize: 14, margin: "8px 0 0", fontFamily: SANS }}>Create a role to start matching candidates.</p>
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            {activeRole && ["candidates", "role"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "8px 16px", borderRadius: 8, cursor: "pointer",
                background: tab === t ? TEXT : "none",
                border: tab === t ? "none" : `1px solid rgba(0,0,0,0.10)`,
                color: tab === t ? "#fff" : MUTED,
                fontSize: 12, fontWeight: tab === t ? 700 : 400, fontFamily: SANS,
                textTransform: "capitalize",
              }}>{t}</button>
            ))}
            <button onClick={() => setShowNewRole(true)} style={{
              padding: "8px 16px", borderRadius: 8, cursor: "pointer",
              background: ACCENT, border: "none", color: "#fff",
              fontSize: 12, fontWeight: 700, fontFamily: SANS,
            }}>+ Add Role</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>

          {tab === "candidates" && (
            <div>
              {!activeRole ? (
                <div style={{ textAlign: "center", padding: "80px 0", color: MUTED2, fontFamily: SANS }}>
                  <div style={{ fontSize: 36, marginBottom: 16 }}>◌</div>
                  <div style={{ fontSize: 15 }}>Create a role to see matched candidates</div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: MUTED2, marginBottom: 20, fontFamily: SANS }}>
                    {matchLoading
                      ? "Analyzing candidates for this role..."
                      : `${matchedCandidates.length} matched · sorted by fit score`}
                  </div>

                  {matchFallback && !matchLoading && (
                    <div style={{ background: "rgba(255,190,11,0.08)", border: "1px solid rgba(255,190,11,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#B8860B", fontFamily: SANS }}>
                      Showing compatibility scores — AI scoring unavailable
                    </div>
                  )}

                  {matchError && (
                    <div style={{ color: ORANGE, fontSize: 13, padding: 16, background: "rgba(245,93,44,0.05)", borderRadius: 10, border: "1px solid rgba(245,93,44,0.15)", fontFamily: SANS }}>
                      {matchError}
                    </div>
                  )}

                  {matchLoading && (
                    <div style={{ display: "flex", gap: 12, alignItems: "center", color: MUTED2, fontSize: 13, fontFamily: SANS }}>
                      <Spinner color={ACCENT} size={16} /> Scoring personality, experience, and culture fit...
                    </div>
                  )}

                  {!matchLoading && !matchError && matchedCandidates.length === 0 && (
                    <div style={{ textAlign: "center", padding: "60px 0", color: MUTED2, fontFamily: SANS }}>
                      <div style={{ fontSize: 32, marginBottom: 12 }}>◌</div>
                      <div style={{ fontSize: 14 }}>No strong matches yet</div>
                      <div style={{ fontSize: 12, color: MUTED2, marginTop: 8 }}>Candidates scoring 50+ for this role will appear here</div>
                    </div>
                  )}

                  {!matchLoading && matchedCandidates.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {matchedCandidates.map((c, i) => (
                        <div
                          key={c.wfId || c.wf_id || i}
                          onClick={() => setSelectedCandidate(c)}
                          style={{
                            background: BG, border: `1px solid ${BORDER}`, borderRadius: 14,
                            padding: "20px 24px", cursor: "pointer", transition: "all 0.2s",
                            position: "relative", overflow: "hidden", boxShadow: SHADOW,
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = `${c.color}44`; e.currentTarget.style.background = BG2; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = BORDER; e.currentTarget.style.background = BG; }}
                        >
                          {i === 0 && (
                            <div style={{
                              position: "absolute", top: 12, right: 16,
                              fontSize: 9, letterSpacing: 2, textTransform: "uppercase",
                              color: ACCENT, background: "rgba(0,196,168,0.10)", padding: "3px 8px", borderRadius: 4, fontFamily: SANS,
                            }}>Top Match</div>
                          )}
                          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: c.match_reason ? 12 : 0 }}>
                            <Avatar initials={c.initials} color={c.color} size={44} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                                <span style={{ fontWeight: 700, fontSize: 15, color: TEXT, fontFamily: SANS }}>{c.wfId}</span>
                                <span style={{ fontSize: 12, color: MUTED, fontFamily: SANS }}>{c.archetype}</span>
                                {getCandidateArchetypeCategory(c) && (
                                  <span style={{ fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: PURPLE, background: "rgba(107,79,255,0.08)", padding: "2px 7px", borderRadius: 8, fontWeight: 600, fontFamily: SANS }}>
                                    {getCandidateArchetypeCategory(c)}
                                  </span>
                                )}
                              </div>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {(c.tags || []).map(tag => (
                                  <span key={tag} style={{
                                    fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase",
                                    padding: "2px 8px", borderRadius: 5, fontFamily: SANS,
                                    background: `${c.color}0f`, color: c.color,
                                  }}>{tag}</span>
                                ))}
                              </div>
                            </div>
                            <ScoreBadge score={c.matchScore} />
                            <span style={{ color: MUTED2, fontSize: 16, marginLeft: 4 }}>›</span>
                          </div>
                          {c.match_reason && (
                            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, margin: "0 0 10px", fontFamily: SANS }}>{c.match_reason}</p>
                          )}
                          {((c.top_strengths && c.top_strengths.length > 0) || (c.watch_outs && c.watch_outs.length > 0)) && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                              {(c.top_strengths || []).map(s => (
                                <span key={s} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: "rgba(0,196,168,0.08)", color: ACCENT, fontFamily: SANS }}>{s}</span>
                              ))}
                              {(c.watch_outs || []).map(w => (
                                <span key={w} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 5, background: "rgba(255,190,11,0.10)", color: "#B8860B", fontFamily: SANS }}>{w}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === "role" && activeRole && (
            <div style={{ maxWidth: 560 }}>
              {activeRole.description && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: MUTED2, marginBottom: 12, fontFamily: SANS }}>Description</div>
                  <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.7, margin: 0, fontFamily: SANS }}>{activeRole.description}</p>
                </div>
              )}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: MUTED2, marginBottom: 14, fontFamily: SANS }}>Culture Parameters</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {activeRole.culture.map(tag => (
                    <span key={tag} style={{
                      fontSize: 13, padding: "8px 16px", borderRadius: 10,
                      background: BG2, color: TEXT, border: `1px solid ${BORDER}`, fontFamily: SANS,
                    }}>{tag}</span>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: MUTED2, marginBottom: 14, fontFamily: SANS }}>Ideal Candidate Traits</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {activeRole.traits.map(tag => (
                    <span key={tag} style={{
                      fontSize: 13, padding: "8px 16px", borderRadius: 10,
                      background: "rgba(107,79,255,0.08)", color: PURPLE, border: "1px solid rgba(107,79,255,0.15)", fontFamily: SANS,
                    }}>{tag}</span>
                  ))}
                </div>
              </div>
              {activeRole.idealOcean && (
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: MUTED2, marginBottom: 14, fontFamily: SANS }}>Ideal OCEAN Profile</div>
                  <OceanBars ocean={activeRole.idealOcean} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>}

      {selectedCandidate && (
        <CandidateDrawer
          candidate={selectedCandidate}
          role={activeRole}
          onClose={() => setSelectedCandidate(null)}
          employerId={employer?.id}
        />
      )}

      {showNewRole && employer && (
        <NewRolePanel
          employerId={employer.id}
          onSaved={handleRoleSaved}
          onClose={() => setShowNewRole(false)}
        />
      )}
    </div>
  );
}
