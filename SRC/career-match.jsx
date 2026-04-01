import { useState, useEffect } from "react";

const questions = [
  // 1 — Openness
  { id: 1, part: "Energy & Environment", partNum: 1, big5: "Openness", text: "When you think about your best days, what were you doing hour-to-hour? (Not the title — the actual actions.)", type: "text" },
  // 2 — Extraversion
  { id: 2, part: "Energy & Environment", partNum: 1, big5: "Extraversion", text: "Which drains you faster?", type: "choice", options: ["Repetitive structured work with clear rules", "Ambiguous, people-heavy situations with no clear answer"] },
  // 3 — Agreeableness (NEW)
  { id: 3, part: "Energy & Environment", partNum: 1, big5: "Agreeableness", text: "When someone on your team is struggling, what's your instinct?", type: "choice", options: ["Check in and offer help directly", "Give them space to figure it out", "Flag it to a manager or lead"] },
  // 4 — Extraversion
  { id: 4, part: "Energy & Environment", partNum: 1, big5: "Extraversion", text: "Do you prefer:", type: "choice", options: ["Being the driver (making decisions, leading direction)", "Being the interpreter (reading people, adapting, influencing quietly)"] },
  // 5 — Neuroticism (NEW)
  { id: 5, part: "Energy & Environment", partNum: 1, big5: "Neuroticism", text: "After a tough week at work, you typically:", type: "choice", options: ["Bounce back quickly — I don't carry it", "Need a day or two to decompress", "Replay what went wrong for a while"] },
  // 6 — Extraversion
  { id: 6, part: "Energy & Environment", partNum: 1, big5: "Extraversion", text: "How do you feel about collaboration?", type: "choice", options: ["Energizing", "Tolerable in small doses", "Draining unless it's with the right people"] },
  // 7 — Openness
  { id: 7, part: "Thinking Style", partNum: 2, big5: "Openness", text: "When solving a problem, what do you default to first?", type: "choice", options: ["Logic / systems / structure", "People / emotions / dynamics", "Big-picture ideas / possibilities"] },
  // 8 — Openness
  { id: 8, part: "Thinking Style", partNum: 2, big5: "Openness", text: "Do you enjoy going deep into one thing or wide across many things?", type: "choice", options: ["Deep — one thing fully", "Wide — many things broadly", "Depends on the context"] },
  // 9 — Conscientiousness (NEW)
  { id: 9, part: "Thinking Style", partNum: 2, big5: "Conscientiousness", text: "How does your workspace or desktop usually look?", type: "choice", options: ["Organized — a place for everything", "Organized chaos — I know where things are", "Messy — I work better that way"] },
  // 10 — Openness
  { id: 10, part: "Thinking Style", partNum: 2, big5: "Openness", text: "Which feels more like you?", type: "choice", options: ["Give me the rules, I'll execute well", "I'll figure out a better way than the rules"] },
  // 11 — Neuroticism (NEW)
  { id: 11, part: "Thinking Style", partNum: 2, big5: "Neuroticism", text: "When you're blocked on something important, your default reaction is:", type: "choice", options: ["Stay calm and work around it", "Feel frustrated but push through", "Spiral a bit before regrouping"] },
  // 12 — Conscientiousness
  { id: 12, part: "Thinking Style", partNum: 2, big5: "Conscientiousness", text: "How comfortable are you with delayed results (months or years before payoff)?", type: "choice", options: ["Very comfortable — I play long games", "Somewhat — I need some wins along the way", "Uncomfortable — I need regular feedback"] },
  // 13 — Openness
  { id: 13, part: "Motivation & Meaning", partNum: 3, big5: "Openness", text: "What kind of impact feels real to you?", type: "choice", options: ["Helping individuals directly", "Building something scalable (business/product)", "Influencing how people think (ideas, storytelling)"] },
  // 14 — Agreeableness (NEW)
  { id: 14, part: "Motivation & Meaning", partNum: 3, big5: "Agreeableness", text: "In a disagreement with a colleague, you're more likely to:", type: "choice", options: ["Hold your position if you believe you're right", "Look for the middle ground quickly", "Defer to keep the peace, then revisit later"] },
  // 15 — Conscientiousness
  { id: 15, part: "Motivation & Meaning", partNum: 3, big5: "Conscientiousness", text: "Which would bother you more long-term?", type: "choice", options: ["Feeling underpaid", "Feeling unfulfilled", "Feeling constrained"] },
  // 16 — Extraversion (NEW)
  { id: 16, part: "Motivation & Meaning", partNum: 3, big5: "Extraversion", text: "After a full day of back-to-back meetings, you feel:", type: "choice", options: ["Energized — I thrive in that", "Drained but fine", "Completely wiped out"] },
  // 17 — Openness
  { id: 17, part: "Motivation & Meaning", partNum: 3, big5: "Openness", text: "Do you care more about?", type: "choice", options: ["Freedom (time, location, autonomy)", "Stability (predictability, income consistency)", "Status (recognition, respect, influence)"] },
  // 18 — Conscientiousness
  { id: 18, part: "Risk & Execution", partNum: 4, big5: "Conscientiousness", text: "Which pattern sounds like you?", type: "choice", options: ["Start strong, lose interest midway", "Slow start, but consistent", "Burst-driven (intense sprints, then rest)"] },
  // 19 — Neuroticism
  { id: 19, part: "Risk & Execution", partNum: 4, big5: "Neuroticism", text: "How do you respond to pressure?", type: "choice", options: ["Step up and focus", "Overthink and hesitate", "Avoid and delay"] },
  // 20 — Agreeableness (NEW)
  { id: 20, part: "Risk & Execution", partNum: 4, big5: "Agreeableness", text: "If your manager made a decision you strongly disagreed with, you'd most likely:", type: "choice", options: ["Voice it directly and advocate for a change", "Mention it once then commit", "Go along with it — they have more context"] },
  // 21 — Openness
  { id: 21, part: "Risk & Execution", partNum: 4, big5: "Openness", text: "Do you prefer?", type: "choice", options: ["Clear path → execute", "Undefined path → create your own"] },
  // 22 — Neuroticism (NEW)
  { id: 22, part: "Risk & Execution", partNum: 4, big5: "Neuroticism", text: "How often do you second-guess decisions after you've made them?", type: "choice", options: ["Rarely — I commit and move on", "Sometimes — mostly on big calls", "Often — I replay things a lot"] },
  // 23 — Lifestyle
  { id: 23, part: "Lifestyle Vision", partNum: 5, big5: "Openness", text: "Paint your ideal Tuesday 3 years from now. Where are you, what are you doing, who are you interacting with?", type: "text" },
  // 24 — Conscientiousness (NEW)
  { id: 24, part: "Lifestyle Vision", partNum: 5, big5: "Conscientiousness", text: "When starting a new project, you typically:", type: "choice", options: ["Plan it out before touching anything", "Outline loosely then figure it out as I go", "Dive in and build the plan from what I learn"] },
  // 25 — Lifestyle
  { id: 25, part: "Lifestyle Vision", partNum: 5, big5: "Extraversion", text: "Do you see yourself?", type: "choice", options: ["Rooted in one place", "Moving internationally", "Flexible / hybrid"] },
  // 26 — Agreeableness (NEW)
  { id: 26, part: "Lifestyle Vision", partNum: 5, big5: "Agreeableness", text: "How do people who know you well describe you?", type: "choice", options: ["Reliable and warm — they can always count on me", "Sharp and direct — I tell it like it is", "Independent — I do my own thing"] },
  // 27 — Lifestyle
  { id: 27, part: "Lifestyle Vision", partNum: 5, big5: "Openness", text: "How important is travel to your identity?", type: "choice", options: ["Core to who I am", "Nice to have", "Not important"] },
  // 28 — Final Layer
  { id: 28, part: "Final Layer", partNum: 6, big5: "Agreeableness", text: "What do people naturally come to you for help with?", type: "text" },
  // 29 — Final Layer
  { id: 29, part: "Final Layer", partNum: 6, big5: "Openness", text: "What do you find yourself analyzing without trying?", type: "text" },
  // 30 — Final Layer
  { id: 30, part: "Final Layer", partNum: 6, big5: "Openness", text: "If money was handled for 2 years, what would you spend your time building or exploring?", type: "text" },
];

const partColors = { 1: "#00E5CC", 2: "#7B61FF", 3: "#FF6B35", 4: "#FFD600", 5: "#00B4D8", 6: "#FF3CAC" };
const partIcons = { 1: "🧭", 2: "🧠", 3: "🔥", 4: "🧪", 5: "🌍", 6: "🎯" };

function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div style={{ width: "100%", marginBottom: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#666" }}>Progress</span>
        <span style={{ fontSize: 11, letterSpacing: 2, color: "#00E5CC" }}>{pct}%</span>
      </div>
      <div style={{ height: 2, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #00E5CC, #7B61FF)", transition: "width 0.5s ease", borderRadius: 2 }} />
      </div>
    </div>
  );
}

function ResultCard({ result }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  return (
    <div style={{
      opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)",
      transition: "all 0.6s ease", fontFamily: "'DM Sans', sans-serif"
    }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#00E5CC", marginBottom: 12 }}>Your Operating Profile</div>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1.2 }}>{result.archetype}</h2>
        <p style={{ color: "#999", fontSize: 15, marginTop: 12, lineHeight: 1.7 }}>{result.operatingStyle}</p>
      </div>

      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#FFD600", marginBottom: 16 }}>Big Five Profile</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {result.ocean && Object.entries(result.ocean).map(([trait, score]) => {
            const colors = { openness: "#7B61FF", conscientiousness: "#00E5CC", extraversion: "#FF6B35", agreeableness: "#FF3CAC", neuroticism: "#FFD600" };
            const color = colors[trait] || "#666";
            return (
              <div key={trait}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 12, textTransform: "capitalize", color: "#888" }}>{trait}</span>
                  <span style={{ fontSize: 12, color, fontWeight: 600 }}>{score}</span>
                </div>
                <div style={{ height: 4, background: "#1a1a1a", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 4, transition: "width 1s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#7B61FF", marginBottom: 16 }}>Best-Fit Roles</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {result.roles.map((role, i) => (
            <div key={i} style={{
              background: "#0f0f0f", border: "1px solid #222", borderRadius: 12, padding: "16px 20px",
              display: "flex", alignItems: "flex-start", gap: 16
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: "#1a1a1a",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, flexShrink: 0, border: `1px solid ${role.color}22`
              }}>{role.icon}</div>
              <div>
                <div style={{ fontWeight: 600, color: "#fff", fontSize: 15 }}>{role.title}</div>
                <div style={{ color: "#666", fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>{role.reason}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  {role.tags.map(tag => (
                    <span key={tag} style={{
                      fontSize: 10, letterSpacing: 1, textTransform: "uppercase",
                      padding: "3px 8px", borderRadius: 4, background: `${role.color}15`, color: role.color
                    }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#FF6B35", marginBottom: 16 }}>Watch Out For</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {result.watchOuts.map((w, i) => (
            <div key={i} style={{
              background: "#0f0f0f", border: "1px solid #FF6B3522", borderRadius: 10,
              padding: "14px 18px", display: "flex", gap: 12, alignItems: "flex-start"
            }}>
              <span style={{ color: "#FF6B35", fontSize: 16, flexShrink: 0 }}>⚠</span>
              <span style={{ color: "#999", fontSize: 14, lineHeight: 1.6 }}>{w}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        background: "linear-gradient(135deg, #00E5CC08, #7B61FF08)",
        border: "1px solid #333", borderRadius: 14, padding: 24
      }}>
        <div style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#FFD600", marginBottom: 12 }}>Culture Match</div>
        <p style={{ color: "#aaa", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{result.cultureFit}</p>
      </div>
    </div>
  );
}

export default function CareerMatch() {
  const [screen, setScreen] = useState("intro"); // intro | quiz | loading | result
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [textInput, setTextInput] = useState("");
  const [animating, setAnimating] = useState(false);

  const q = questions[currentQ];
  const isLastQ = currentQ === questions.length - 1;

  const handleAnswer = (value) => {
    if (q.type === "choice") {
      setSelectedOption(value);
      setTimeout(() => advance(value), 300);
    }
  };

  const advance = (value) => {
    const newAnswers = { ...answers, [q.id]: value };
    setAnswers(newAnswers);
    setAnimating(true);
    setTimeout(() => {
      setSelectedOption(null);
      setTextInput("");
      if (isLastQ) {
        setScreen("loading");
        runAnalysis(newAnswers);
      } else {
        setCurrentQ(c => c + 1);
        setAnimating(false);
      }
    }, 300);
  };

  const handleTextNext = () => {
    if (!textInput.trim()) return;
    advance(textInput);
  };

  const runAnalysis = async (allAnswers) => {
    const answerSummary = Object.entries(allAnswers).map(([id, ans]) => {
      const q = questions.find(q => q.id === parseInt(id));
      return `Q${id} [${q.big5}] ${q.text}\n→ ${ans}`;
    }).join("\n\n");

    const prompt = `You are a precise career analyst and psychometrician. Your job is to analyze someone's actual answers and produce a UNIQUE profile that reflects THEIR specific responses — not a generic template.

CRITICAL: Every person gets different results. If someone is an RN or works in healthcare or people-focused work, their roles should reflect that background. If someone is technical and introverted, reflect that. Never default to generic tech roles if the answers suggest otherwise.

Here are their answers:
${answerSummary}

Analyze OCEAN traits strictly from their answers:
- Openness: curiosity, creativity, preference for novelty vs routine
- Conscientiousness: organization, follow-through, planning vs spontaneity  
- Extraversion: social energy, leadership drive, collaboration preference
- Agreeableness: empathy, conflict style, people orientation
- Neuroticism: stress response, emotional stability, pressure handling

Return ONLY valid JSON, no markdown, no explanation, no preamble:
{
  "archetype": "unique 2-4 word label specific to this person",
  "operatingStyle": "3 sentences describing exactly how THIS person operates based on their specific answers",
  "ocean": {
    "openness": <integer 0-100>,
    "conscientiousness": <integer 0-100>,
    "extraversion": <integer 0-100>,
    "agreeableness": <integer 0-100>,
    "neuroticism": <integer 0-100>
  },
  "roles": [
    {
      "title": "Specific Role Title",
      "reason": "Exactly why this fits based on their specific answers (not generic)",
      "tags": ["tag1", "tag2", "tag3"],
      "icon": "emoji",
      "color": "#hexcolor"
    }
  ],
  "watchOuts": ["specific risk 1 based on their answers", "specific risk 2", "specific risk 3"],
  "cultureFit": "Specific culture description derived from their actual answers"
}

Rules:
- OCEAN scores must vary meaningfully — no two traits within 10 points of each other unless truly warranted
- Roles must match their background and answers — a nurse gets healthcare-adjacent roles, a developer gets technical roles
- 3-5 roles total
- watchOuts must reference something specific from their answers, not generic advice`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }]
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      const text = data.content.map(i => i.type === "text" ? i.text : "").join("").trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      const parsed = JSON.parse(jsonMatch[0]);
      setResult(parsed);
      setScreen("result");
    } catch (err) {
      console.error("Analysis error:", err);
      setResult({
        archetype: "Error — Retake Assessment",
        operatingStyle: `Something went wrong: ${err.message}. Please try retaking the assessment.`,
        ocean: { openness: 0, conscientiousness: 0, extraversion: 0, agreeableness: 0, neuroticism: 0 },
        roles: [],
        watchOuts: ["Could not generate results — please retake"],
        cultureFit: "Please retake the assessment to get your results."
      });
      setScreen("result");
    }
  };

  const styles = {
    container: {
      minHeight: "100vh", background: "#080808", color: "#fff",
      fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px 16px"
    },
    card: {
      width: "100%", maxWidth: 560,
      background: "#0c0c0c", border: "1px solid #1e1e1e",
      borderRadius: 20, padding: "40px 36px"
    }
  };

  if (screen === "intro") return (
    <div style={styles.container}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />
      <div style={styles.card}>
        <div style={{ marginBottom: 32 }}>
          <div style={{
            display: "inline-block", fontSize: 10, letterSpacing: 4, textTransform: "uppercase",
            color: "#00E5CC", border: "1px solid #00E5CC33", padding: "6px 14px", borderRadius: 6, marginBottom: 24
          }}>Career Intelligence</div>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 42, fontWeight: 400, lineHeight: 1.1, margin: "0 0 16px", letterSpacing: -1 }}>
            Find your<br /><em style={{ color: "#00E5CC" }}>true fit</em>
          </h1>
          <p style={{ color: "#666", fontSize: 15, lineHeight: 1.7, margin: 0 }}>
            20 questions that map how you actually operate — not just what you say you like. We'll match you to tech roles built for your wiring.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
          {[["🧭", "Operating style analysis"], ["💼", "3–5 matched tech roles"], ["⚠️", "Blind spots to watch"]].map(([icon, label]) => (
            <div key={label} style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <span style={{ color: "#888", fontSize: 14 }}>{label}</span>
            </div>
          ))}
        </div>
        <button onClick={() => setScreen("quiz")} style={{
          width: "100%", padding: "16px", background: "#00E5CC", color: "#000",
          border: "none", borderRadius: 12, fontSize: 15, fontWeight: 700,
          cursor: "pointer", letterSpacing: 0.5, fontFamily: "inherit"
        }}>Start Assessment →</button>
      </div>
    </div>
  );

  if (screen === "loading") return (
    <div style={styles.container}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 56, height: 56, border: "2px solid #1e1e1e", borderTop: "2px solid #00E5CC",
          borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 24px"
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: 11, letterSpacing: 4, textTransform: "uppercase", color: "#666" }}>Analyzing your profile</div>
      </div>
    </div>
  );

  if (screen === "result") return (
    <div style={styles.container}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />
      <div style={{ ...styles.card, maxWidth: 600 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: "#444" }}>Assessment Complete</div>
          <button onClick={() => { setScreen("intro"); setCurrentQ(0); setAnswers({}); setResult(null); }} style={{
            background: "none", border: "1px solid #222", borderRadius: 8, color: "#666",
            fontSize: 12, padding: "6px 14px", cursor: "pointer", fontFamily: "inherit"
          }}>Retake</button>
        </div>
        {result && <ResultCard result={result} />}
      </div>
    </div>
  );

  // Quiz screen
  const partColor = partColors[q.partNum];
  return (
    <div style={styles.container}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />
      <div style={styles.card}>
        <ProgressBar current={currentQ} total={questions.length} />
        <div style={{
          opacity: animating ? 0 : 1, transform: animating ? "translateX(-12px)" : "translateX(0)",
          transition: "all 0.3s ease"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <span style={{ fontSize: 16 }}>{partIcons[q.partNum]}</span>
            <span style={{ fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: partColor }}>{q.part}</span>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "#444" }}>{currentQ + 1} / {questions.length}</span>
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 500, lineHeight: 1.4, color: "#fff", margin: "0 0 28px" }}>{q.text}</h2>

          {q.type === "choice" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {q.options.map((opt, i) => {
                const isSelected = selectedOption === opt;
                return (
                  <button key={i} onClick={() => handleAnswer(opt)} style={{
                    background: isSelected ? `${partColor}18` : "#0f0f0f",
                    border: `1px solid ${isSelected ? partColor : "#222"}`,
                    borderRadius: 12, padding: "14px 18px", color: isSelected ? "#fff" : "#aaa",
                    fontSize: 14, textAlign: "left", cursor: "pointer", transition: "all 0.2s",
                    fontFamily: "inherit", lineHeight: 1.5
                  }}>{opt}</button>
                );
              })}
            </div>
          ) : (
            <div>
              <textarea
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder="Type your answer here..."
                style={{
                  width: "100%", minHeight: 120, background: "#0f0f0f",
                  border: "1px solid #222", borderRadius: 12, padding: "14px 18px",
                  color: "#fff", fontSize: 14, fontFamily: "inherit", resize: "vertical",
                  outline: "none", lineHeight: 1.6, boxSizing: "border-box",
                  transition: "border-color 0.2s"
                }}
                onFocus={e => e.target.style.borderColor = partColor}
                onBlur={e => e.target.style.borderColor = "#222"}
              />
              <button onClick={handleTextNext} disabled={!textInput.trim()} style={{
                marginTop: 12, width: "100%", padding: "14px",
                background: textInput.trim() ? partColor : "#1a1a1a",
                color: textInput.trim() ? "#000" : "#444",
                border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700,
                cursor: textInput.trim() ? "pointer" : "default",
                fontFamily: "inherit", transition: "all 0.2s"
              }}>{isLastQ ? "Get My Results →" : "Next →"}</button>
            </div>
          )}
        </div>

        {currentQ > 0 && (
          <button onClick={() => { setCurrentQ(c => c - 1); setSelectedOption(null); setTextInput(""); }} style={{
            marginTop: 20, background: "none", border: "none", color: "#444",
            fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: 0
          }}>← Back</button>
        )}
      </div>
    </div>
  );
}
