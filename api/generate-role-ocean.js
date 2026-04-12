import { getAuthUser, rateLimit } from "./_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  if (rateLimit(req, res, "gen-ocean", 50, 86_400_000)) return;

  const { title, team, description, workType, intake } = req.body;
  if (!title) return res.status(400).json({ error: "Missing title" });

  // Build intake context block if provided
  let intakeBlock = "";
  if (intake) {
    const lines = [
      intake.collaboration && `Work style: ${intake.collaboration}`,
      intake.autonomy && `Management style: ${intake.autonomy}`,
      intake.pace && `Pace: ${intake.pace}`,
      intake.culture && `Decision culture: ${intake.culture}`,
      intake.struggles && `Past fit struggles: ${intake.struggles}`,
      intake.learnings && `What takes 3 months to learn: ${intake.learnings}`,
      intake.conflict && `Conflict handling: ${intake.conflict}`,
      intake.feedback && `Feedback style: ${intake.feedback}`,
      intake.visibility && `Leadership visibility: ${intake.visibility}`,
      intake.deadlines && `Under pressure: ${intake.deadlines}`,
      intake.respected && `Most respected team member: ${intake.respected}`,
      intake.thrives && `Thrives vs burns out: ${intake.thrives}`,
    ].filter(Boolean);
    if (lines.length) intakeBlock = `\nTeam Culture Context:\n${lines.join("\n")}`;
  }

  const prompt = `You are a talent psychology expert. Based on a job role and its team culture context, generate the ideal candidate personality profile using OCEAN (Big Five) scores.

Role: ${title}${team ? ` — ${team} team` : ""}
Work type: ${workType || "remote"}
${description ? `Description:\n${description}` : ""}${intakeBlock}

Return a JSON object with exactly these fields:
{
  "idealOcean": {
    "O": <number 20-90>,
    "C": <number 20-90>,
    "E": <number 20-90>,
    "A": <number 20-90>,
    "N": <number 20-90>
  },
  "cultureTags": [<3-5 short strings, e.g. "fast-paced", "collaborative", "autonomous">],
  "traits": [<4-6 short trait strings, e.g. "analytical thinker", "strong communicator">],
  "reasoning": "<2-3 sentences explaining the OCEAN choices, referencing specific context from the team culture answers>"
}

OCEAN scoring guidance:
- O (Openness): High = creative, curious, abstract thinker. Low = practical, structured, conventional.
- C (Conscientiousness): High = organized, detail-oriented, deadline-driven. Low = flexible, spontaneous.
- E (Extraversion): High = energized by people, vocal, collaborative. Low = prefers deep focus, independent work.
- A (Agreeableness): High = empathetic, team-first, conflict-averse. Low = direct, competitive, challenges others.
- N (Neuroticism): High = emotionally reactive under pressure. Low = calm, resilient, handles ambiguity well.

Make scores meaningfully differentiated — no two traits within 10 points unless truly warranted by the role.
Return only the JSON object, no markdown.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`Claude API ${response.status}`);

    const data = await response.json();
    let raw = data.content?.[0]?.text?.trim() || "";
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(raw);

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("generate-role-ocean error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
