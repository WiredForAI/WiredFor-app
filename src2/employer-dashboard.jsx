import { useState, useEffect } from "react";

// ── Seed Data ──────────────────────────────────────────────────────────────
const ROLES = [
  {
    id: 1, title: "Senior Backend Engineer", team: "Platform", status: "active",
    culture: ["Deep work", "Autonomy", "Low meetings", "Systems thinking"],
    traits: ["Logic-first", "Depth over breadth", "Delayed-results-comfortable", "Clear path executor"],
    candidates: 8, newToday: 3
  },
  {
    id: 2, title: "Product Manager", team: "Growth", status: "active",
    culture: ["Fast-paced", "Collaborative", "High ambiguity", "Influence-driven"],
    traits: ["Big-picture thinker", "People-reader", "Burst-driven", "Driver"],
    candidates: 12, newToday: 5
  },
  {
    id: 3, title: "UX Researcher", team: "Design", status: "active",
    culture: ["User-obsessed", "Cross-functional", "Curiosity-first", "Detail oriented"],
    traits: ["People-first", "Interpreter", "Helping individuals", "Collaboration energizing"],
    candidates: 6, newToday: 1
  },
];

const CANDIDATES = [
  {
    id: 1, roleId: 1, name: "Jordan M.", initials: "JM",
    archetype: "Deep Systems Thinker", matchScore: 94,
    tags: ["Logic-first", "Autonomy", "Long-game player"],
    operatingStyle: "Jordan operates in deep focus bursts, thrives with minimal oversight, and builds things meant to last. Prefers written async communication over meetings.",
    watchOuts: ["May resist process changes", "Needs ownership or disengages"],
    cultureFit: "Best in orgs that ship real products and value craftsmanship over politics.",
    color: "#00E5CC", avatar: "#00E5CC"
  },
  {
    id: 2, roleId: 1, name: "Sam K.", initials: "SK",
    archetype: "Precise Executor", matchScore: 87,
    tags: ["Structure-lover", "Consistent", "Deep focus"],
    operatingStyle: "Sam is steady and reliable — slow to start but relentlessly consistent. Loves clear specs and delivers with high quality. Won't thrive in undefined chaos.",
    watchOuts: ["Needs clear direction to unlock best work", "May under-communicate blockers"],
    cultureFit: "Ideal for mature engineering teams with good documentation culture.",
    color: "#7B61FF", avatar: "#7B61FF"
  },
  {
    id: 3, roleId: 2, name: "Alex R.", initials: "AR",
    archetype: "Visionary Connector", matchScore: 91,
    tags: ["Big-picture", "Influence-driven", "Driver"],
    operatingStyle: "Alex moves fast, spots patterns across systems, and gets energy from aligning stakeholders. Doesn't need all the answers before starting — figures it out in motion.",
    watchOuts: ["Can lose interest post-launch", "Needs strong eng partner to execute"],
    cultureFit: "Thrives at Series A–C startups where product shapes company direction.",
    color: "#FF6B35", avatar: "#FF6B35"
  },
  {
    id: 4, roleId: 2, name: "Taylor B.", initials: "TB",
    archetype: "Strategic Storyteller", matchScore: 83,
    tags: ["Narrative-first", "Influence", "Cross-functional"],
    operatingStyle: "Taylor leads through framing — makes complex things clear to engineering, design, and leadership alike. Great at rallying people around a vision.",
    watchOuts: ["Can over-communicate strategy vs. details", "Needs buy-in before acting"],
    cultureFit: "Best in orgs where PM is the connective tissue between teams.",
    color: "#FFD600", avatar: "#FFD600"
  },
  {
    id: 5, roleId: 3, name: "Morgan L.", initials: "ML",
    archetype: "Empathic Investigator", matchScore: 96,
    tags: ["People-first", "Curiosity-driven", "Detail obsessed"],
    operatingStyle: "Morgan naturally reads what people don't say. Synthesizes qualitative signals into sharp insights that actually change how teams build.",
    watchOuts: ["May overindex on edge cases", "Needs space to go deep — resists rushed timelines"],
    cultureFit: "Ideal for design-led orgs that treat research as strategy, not decoration.",
    color: "#FF3CAC", avatar: "#FF3CAC"
  },
];

// ── Sub-components ─────────────────────────────────────────────────────────

function Avatar({ initials, color, size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2,
      background: `${color}22`, border: `1.5px solid ${color}55`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, color, flexShrink: 0
    }}>{initials}</div>
  );
}

function ScoreBadge({ score }) {
  const color = score >= 90 ? "#00E5CC" : score >= 80 ? "#7B61FF" : "#FFD600";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      background: `${color}12`, border: `1px solid ${color}33`,
      borderRadius: 8, padding: "4px 10px"
    }}>
      <div style={{ width: 6, height: 6, borderRadius: 3, background: color }} />
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{score}% match</span>
    </div>
  );
}

function CandidateDrawer({ candidate, onClose }) {
  const [aiInsight, setAiInsight] = useState("");
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => { setTimeout(() => setVisible(true), 50); }, []);

  const generateInsight = async () => {
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are a talent advisor. Write a sharp, 3-paragraph hiring brief for this candidate. Be specific, direct, and useful — not generic HR speak.

Candidate: ${candidate.name}
Archetype: ${candidate.archetype}
Match Score: ${candidate.matchScore}%
Operating Style: ${candidate.operatingStyle}
Tags: ${candidate.tags.join(", ")}
Watch Outs: ${candidate.watchOuts.join(". ")}
Culture Fit: ${candidate.cultureFit}

Format: 
Para 1 — Why this person stands out
Para 2 — How to get the best out of them  
Para 3 — One honest risk and how to mitigate it

Keep it under 200 words total.`
          }]
        })
      });
      const data = await res.json();
      setAiInsight(data.content.map(i => i.text || "").join(""));
    } catch {
      setAiInsight("Unable to generate insight at this time.");
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", justifyContent: "flex-end"
    }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} />
      <div style={{
        position: "relative", width: 420, height: "100%", background: "#0c0c0c",
        borderLeft: "1px solid #1e1e1e", padding: "32px 28px", overflowY: "auto",
        transform: visible ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1)"
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 20, right: 20, background: "#1a1a1a",
          border: "1px solid #2a2a2a", borderRadius: 8, color: "#666",
          width: 32, height: 32, cursor: "pointer", fontSize: 16, display: "flex",
          alignItems: "center", justifyContent: "center"
        }}>×</button>

        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 24 }}>
          <Avatar initials={candidate.initials} color={candidate.color} size={52} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#fff" }}>{candidate.name}</div>
            <div style={{ fontSize: 13, color: "#666", marginTop: 2 }}>{candidate.archetype}</div>
          </div>
        </div>

        <ScoreBadge score={candidate.matchScore} />

        <div style={{ marginTop: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#444", marginBottom: 10 }}>Operating Style</div>
          <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{candidate.operatingStyle}</p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
          {candidate.tags.map(tag => (
            <span key={tag} style={{
              fontSize: 11, letterSpacing: 1, textTransform: "uppercase",
              padding: "4px 10px", borderRadius: 6,
              background: `${candidate.color}12`, color: candidate.color, border: `1px solid ${candidate.color}25`
            }}>{tag}</span>
          ))}
        </div>

        <div style={{ background: "#0f0f0f", border: "1px solid #FF6B3525", borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#FF6B35", marginBottom: 10 }}>Watch Outs</div>
          {candidate.watchOuts.map((w, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: i < candidate.watchOuts.length - 1 ? 8 : 0 }}>
              <span style={{ color: "#FF6B35", fontSize: 12, marginTop: 2 }}>▸</span>
              <span style={{ color: "#888", fontSize: 13, lineHeight: 1.5 }}>{w}</span>
            </div>
          ))}
        </div>

        <div style={{ background: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 12, padding: 16, marginBottom: 28 }}>
          <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#7B61FF", marginBottom: 10 }}>Culture Fit</div>
          <p style={{ color: "#888", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{candidate.cultureFit}</p>
        </div>

        {!aiInsight ? (
          <button onClick={generateInsight} disabled={loading} style={{
            width: "100%", padding: "14px", borderRadius: 12, cursor: loading ? "default" : "pointer",
            background: loading ? "#1a1a1a" : `${candidate.color}18`,
            border: `1px solid ${loading ? "#2a2a2a" : candidate.color + "44"}`,
            color: loading ? "#444" : candidate.color,
            fontSize: 13, fontWeight: 600, fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8
          }}>
            {loading ? (
              <><div style={{ width: 14, height: 14, border: "2px solid #333", borderTop: `2px solid ${candidate.color}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> Generating brief...</>
            ) : "✦ Generate AI Hiring Brief"}
          </button>
        ) : (
          <div style={{ background: "#0f0f0f", border: `1px solid ${candidate.color}22`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: candidate.color, marginBottom: 14 }}>✦ AI Hiring Brief</div>
            <p style={{ color: "#bbb", fontSize: 13, lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>{aiInsight}</p>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button style={{
            flex: 1, padding: "12px", borderRadius: 10, cursor: "pointer",
            background: candidate.color, border: "none", color: "#000",
            fontSize: 13, fontWeight: 700, fontFamily: "inherit"
          }}>Advance →</button>
          <button style={{
            padding: "12px 16px", borderRadius: 10, cursor: "pointer",
            background: "none", border: "1px solid #2a2a2a", color: "#666",
            fontSize: 13, fontFamily: "inherit"
          }}>Pass</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function EmployerDashboard() {
  const [activeRole, setActiveRole] = useState(ROLES[0]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [tab, setTab] = useState("candidates"); // candidates | role

  const roleCandidates = CANDIDATES
    .filter(c => c.roleId === activeRole.id)
    .sort((a, b) => b.matchScore - a.matchScore);

  return (
    <div style={{
      minHeight: "100vh", background: "#070707", color: "#fff",
      fontFamily: "'Syne', 'Helvetica Neue', sans-serif", display: "flex"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; } 
        ::-webkit-scrollbar-track { background: #0c0c0c; }
        ::-webkit-scrollbar-thumb { background: #222; border-radius: 4px; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Sidebar */}
      <div style={{
        width: 240, background: "#0a0a0a", borderRight: "1px solid #151515",
        display: "flex", flexDirection: "column", padding: "28px 0", flexShrink: 0
      }}>
        <div style={{ padding: "0 20px 28px", borderBottom: "1px solid #151515" }}>
          <div style={{ fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: "#333", marginBottom: 6 }}>Platform</div>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, fontStyle: "italic", color: "#fff" }}>Fitscore</div>
        </div>

        <div style={{ padding: "20px 12px 12px" }}>
          <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#333", padding: "0 8px", marginBottom: 12 }}>Open Roles</div>
          {ROLES.map(role => (
            <button key={role.id} onClick={() => { setActiveRole(role); setTab("candidates"); }} style={{
              width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 10,
              background: activeRole.id === role.id ? "#141414" : "none",
              border: activeRole.id === role.id ? "1px solid #222" : "1px solid transparent",
              cursor: "pointer", marginBottom: 4
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: activeRole.id === role.id ? "#fff" : "#666" }}>{role.title}</div>
              <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>{role.team} · {role.candidates} candidates</div>
              {role.newToday > 0 && (
                <div style={{ display: "inline-block", marginTop: 6, fontSize: 10, background: "#00E5CC18", color: "#00E5CC", padding: "2px 7px", borderRadius: 4 }}>
                  +{role.newToday} today
                </div>
              )}
            </button>
          ))}
        </div>

        <div style={{ marginTop: "auto", padding: "20px", borderTop: "1px solid #151515" }}>
          <div style={{ fontSize: 12, color: "#333" }}>Acme Corp</div>
          <div style={{ fontSize: 11, color: "#252525", marginTop: 2 }}>3 active roles · 26 candidates</div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{
          padding: "24px 32px", borderBottom: "1px solid #151515",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between"
        }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#444", marginBottom: 6 }}>{activeRole.team}</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>{activeRole.title}</h1>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {activeRole.culture.map(tag => (
                <span key={tag} style={{
                  fontSize: 11, padding: "3px 10px", borderRadius: 6,
                  background: "#151515", color: "#666", border: "1px solid #1e1e1e"
                }}>{tag}</span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            {["candidates", "role"].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "8px 16px", borderRadius: 8, cursor: "pointer",
                background: tab === t ? "#fff" : "none",
                border: tab === t ? "none" : "1px solid #222",
                color: tab === t ? "#000" : "#555",
                fontSize: 12, fontWeight: tab === t ? 700 : 400, fontFamily: "inherit",
                textTransform: "capitalize"
              }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>

          {tab === "candidates" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 13, color: "#444" }}>{roleCandidates.length} matched candidates · sorted by fit score</div>
              </div>

              {roleCandidates.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#333" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>◌</div>
                  <div style={{ fontSize: 14 }}>No candidates matched yet</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {roleCandidates.map((c, i) => (
                    <div key={c.id} onClick={() => setSelectedCandidate(c)} style={{
                      background: "#0c0c0c", border: "1px solid #1a1a1a", borderRadius: 14,
                      padding: "20px 24px", cursor: "pointer", transition: "all 0.2s",
                      display: "flex", alignItems: "center", gap: 18,
                      position: "relative", overflow: "hidden"
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = `${c.color}44`; e.currentTarget.style.background = "#0f0f0f"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = "#1a1a1a"; e.currentTarget.style.background = "#0c0c0c"; }}
                    >
                      {i === 0 && (
                        <div style={{
                          position: "absolute", top: 12, right: 16,
                          fontSize: 9, letterSpacing: 2, textTransform: "uppercase",
                          color: "#00E5CC", background: "#00E5CC12", padding: "3px 8px", borderRadius: 4
                        }}>Top Match</div>
                      )}
                      <Avatar initials={c.initials} color={c.color} size={44} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>{c.name}</span>
                          <span style={{ fontSize: 12, color: "#555" }}>·</span>
                          <span style={{ fontSize: 12, color: "#666" }}>{c.archetype}</span>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {c.tags.map(tag => (
                            <span key={tag} style={{
                              fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase",
                              padding: "2px 8px", borderRadius: 5,
                              background: `${c.color}0f`, color: c.color
                            }}>{tag}</span>
                          ))}
                        </div>
                      </div>
                      <ScoreBadge score={c.matchScore} />
                      <span style={{ color: "#333", fontSize: 16, marginLeft: 4 }}>›</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "role" && (
            <div style={{ maxWidth: 560 }}>
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#444", marginBottom: 14 }}>Culture Parameters</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {activeRole.culture.map(tag => (
                    <span key={tag} style={{
                      fontSize: 13, padding: "8px 16px", borderRadius: 10,
                      background: "#0f0f0f", color: "#ccc", border: "1px solid #222"
                    }}>{tag}</span>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#444", marginBottom: 14 }}>Ideal Candidate Traits</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {activeRole.traits.map(tag => (
                    <span key={tag} style={{
                      fontSize: 13, padding: "8px 16px", borderRadius: 10,
                      background: "#0f0f0f", color: "#7B61FF", border: "1px solid #7B61FF22"
                    }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedCandidate && <CandidateDrawer candidate={selectedCandidate} onClose={() => setSelectedCandidate(null)} />}
    </div>
  );
}
