import { createClient } from "@supabase/supabase-js";
import { getAuthUser, rateLimit, cors } from "./_lib/auth.js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function normalizeOcean(ocean) {
  if (!ocean) return null;
  if (ocean.O !== undefined) return ocean;
  return {
    O: ocean.openness ?? 0,
    C: ocean.conscientiousness ?? 0,
    E: ocean.extraversion ?? 0,
    A: ocean.agreeableness ?? 0,
    N: ocean.neuroticism ?? 0,
  };
}

function computeRmsScore(candidateOcean, idealOcean) {
  if (!candidateOcean || !idealOcean) return 0;
  const keys = ["O", "C", "E", "A", "N"];
  const sumSqDiff = keys.reduce((sum, k) => {
    const diff = (candidateOcean[k] || 0) - (idealOcean[k] || 0);
    return sum + diff * diff;
  }, 0);
  const rms = Math.sqrt(sumSqDiff / keys.length);
  return Math.max(0, Math.round(100 - rms * 1.25));
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  if (rateLimit(req, res, "match", 50, 86_400_000)) return;

  const { roleId } = req.body;
  if (!roleId) return res.status(400).json({ error: "Missing roleId" });

  // Fetch the role
  const { data: role, error: roleError } = await supabase
    .from("employer_roles")
    .select("*")
    .eq("id", roleId)
    .single();

  if (roleError || !role) return res.status(404).json({ error: "Role not found" });
  if (!role.ideal_ocean) return res.status(200).json({ candidates: [] });

  // Fetch all candidates
  const { data: candidates, error: candError } = await supabase
    .from("candidates")
    .select("id, wf_id, archetype, archetype_category, operating_style, ocean, roles, watch_outs, culture_fit")
    .order("created_at", { ascending: false });

  if (candError) return res.status(500).json({ error: candError.message });
  if (!candidates || candidates.length === 0) return res.status(200).json({ candidates: [] });

  // Score all candidates deterministically using OCEAN RMS distance
  const scored = candidates
    .map(c => {
      const ocean = normalizeOcean(c.ocean);
      const score = computeRmsScore(ocean, role.ideal_ocean);
      return { candidate: c, ocean, score };
    })
    .filter(({ score }) => score >= 40)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return res.status(200).json({ candidates: [] });

  // Use Claude only to generate a one-line match reason for each candidate
  const summaries = scored.map(({ candidate: c, ocean, score }) => ({
    id: c.wf_id,
    score,
    archetype: c.archetype || "Unknown",
    style: (c.operating_style || "").slice(0, 120),
    ocean,
    fit: (c.culture_fit || "").slice(0, 120),
    suggestedRoles: Array.isArray(c.roles)
      ? c.roles.map(r => (typeof r === "string" ? r : r.title || "")).join(", ")
      : "",
  }));

  const prompt = `For each candidate below, write one specific sentence explaining why they are or aren't a strong fit for this role. Reference their archetype, operating style, or a specific OCEAN trait. Be direct and specific — no generic phrases.

ROLE: ${role.title}${role.team ? ` (${role.team})` : ""}
Culture: ${(role.culture_tags || []).join(", ")}
Ideal traits: ${(role.traits || []).join(", ")}

CANDIDATES:
${JSON.stringify(summaries)}

Return a JSON array with a reason for every candidate:
[{"id":"WF-XXXXX","reason":"One specific sentence."}]

Return only the JSON array, no markdown.`;

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
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    let reasonMap = new Map();
    if (response.ok) {
      const aiData = await response.json();
      let raw = aiData.content?.[0]?.text?.trim() || "[]";
      raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      const match = raw.match(/\[[\s\S]*\]/);
      const reasons = match ? JSON.parse(match[0]) : [];
      reasonMap = new Map(reasons.map(r => [r.id, r.reason]));
    }

    const result = scored.map(({ candidate: c, ocean, score }) => ({
      id: c.id,
      wfId: c.wf_id,
      archetype: c.archetype || "Unknown",
      archetypeCategory: c.archetype_category || null,
      operatingStyle: c.operating_style || "",
      ocean,
      watchOuts: Array.isArray(c.watch_outs) ? c.watch_outs : [],
      cultureFit: c.culture_fit || "",
      matchScore: score,
      matchReason: reasonMap.get(c.wf_id) || "",
    }));

    return res.status(200).json({ candidates: result });
  } catch (err) {
    // If Claude fails, still return candidates with scores but no reasons
    console.error("match-candidates reason error:", err.message);
    const result = scored.map(({ candidate: c, ocean, score }) => ({
      id: c.id,
      wfId: c.wf_id,
      archetype: c.archetype || "Unknown",
      operatingStyle: c.operating_style || "",
      ocean,
      watchOuts: Array.isArray(c.watch_outs) ? c.watch_outs : [],
      cultureFit: c.culture_fit || "",
      matchScore: score,
      matchReason: "",
    }));
    return res.status(200).json({ candidates: result });
  }
}
