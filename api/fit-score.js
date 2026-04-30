import { createClient } from "@supabase/supabase-js";
import { getAuthUser, rateLimit, cors } from "./_lib/auth.js";
import { normalizeOcean, computeRmsScore } from "./match-candidates.js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (rateLimit(req, res, "fit-score", 30, 86_400_000)) return;

  const { roleId } = req.body || {};
  if (!roleId) return res.status(400).json({ error: "Missing roleId" });

  // Fetch role with full details
  const { data: role, error: roleErr } = await supabase
    .from("employer_roles")
    .select("*, employers(id, company_name)")
    .eq("id", roleId)
    .single();

  if (roleErr || !role) return res.status(404).json({ error: "Role not found" });

  const idealOcean = normalizeOcean(role.ideal_ocean);
  if (!idealOcean) return res.status(400).json({ error: "Role has no ideal OCEAN profile" });

  // Fetch all candidates
  const { data: candidates, error: candErr } = await supabase
    .from("candidates")
    .select("wf_id, archetype, archetype_category, ocean, roles, culture_fit, operating_style, work_preference, resume_data");

  if (candErr) return res.status(500).json({ error: candErr.message });

  // Fetch existing intros for this role
  const { data: existingIntros } = await supabase
    .from("intros")
    .select("candidate_wf_id, status, requested_by")
    .eq("role_id", roleId);

  const introMap = {};
  (existingIntros || []).forEach(i => { introMap[i.candidate_wf_id] = i; });

  // ── Step 1: RMS pre-filter ──
  const scored = (candidates || [])
    .map(c => {
      const cOcean = normalizeOcean(c.ocean);
      const rmsScore = computeRmsScore(cOcean, idealOcean);
      return { ...c, rmsScore, normalizedOcean: cOcean };
    })
    .filter(c => c.rmsScore >= 40)
    .sort((a, b) => b.rmsScore - a.rmsScore)
    .slice(0, 20);

  if (scored.length === 0) {
    return res.status(200).json({
      role: {
        id: role.id,
        title: role.title,
        companyName: role.employers?.company_name || "Unknown",
        employerId: role.employers?.id || role.employer_id,
      },
      candidates: [],
      fallback: false,
      introMap,
    });
  }

  // ── Step 2: Claude AI scoring ──
  const candidateSummaries = scored.map(c => ({
    wf_id: c.wf_id,
    archetype: c.archetype,
    ocean: c.ocean,
    roles: (c.roles || []).map(r => r.title || r),
    culture_fit: c.culture_fit,
    operating_style: c.operating_style,
    work_preference: c.work_preference,
    resume_data: c.resume_data || null,
    rms_score: c.rmsScore,
  }));

  const roleContext = {
    title: role.title,
    description: role.description,
    traits: role.traits || [],
    culture_tags: role.culture_tags || [],
    ideal_ocean: role.ideal_ocean,
    work_type: role.work_type,
    location: role.location,
  };

  try {
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        system: `You are an expert talent matcher for a personality-based hiring platform.

CRITICAL INSTRUCTION: Each candidate includes resume_data containing their actual work history. This is the most important signal. A candidate whose resume_data shows direct experience in the role's field must score significantly higher than one without — regardless of OCEAN gaps.

Specifically:
- If resume_data.industry or resume_data.currentTitle directly matches the role: experience_score >= 85
- If resume_data.skills contain role-relevant technical skills: experience_score += 15
- If candidate has direct experience: fit_score minimum floor of 65 regardless of other factors
- If candidate has no relevant experience: experience_score = 0, rely on OCEAN and trajectory

Score each candidate against the role using four factors:

1. Experience match (30%) — does resume_data show direct relevant experience for this role? Industry match, title match, relevant skills
2. OCEAN alignment (40%) — how well does the candidate's personality profile match the role's ideal OCEAN profile
3. Role trajectory match (15%) — how well do the candidate's recommended career roles align with this specific position
4. Culture and environment fit (15%) — how well does the candidate's culture fit and work preferences match the role's culture tags and requirements

Return a JSON array only, no other text:
[
  {
    "wf_id": "string",
    "fit_score": 0-100,
    "experience_score": 0-100,
    "ocean_score": 0-100,
    "trajectory_score": 0-100,
    "culture_score": 0-100,
    "match_reason": "2-3 sentences explaining why this candidate fits or doesn't fit",
    "top_strengths": ["strength1", "strength2", "strength3"],
    "watch_outs": ["watchout1", "watchout2"]
  }
]

Only include candidates with fit_score >= 40. Sort by fit_score descending.`,
        messages: [{
          role: "user",
          content: `ROLE:\n${JSON.stringify(roleContext, null, 2)}\n\nCANDIDATES:\n${JSON.stringify(candidateSummaries, null, 2)}`,
        }],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => "");
      console.error("[fit-score] Claude error:", aiRes.status, errText.slice(0, 300));
      throw new Error("Claude API failed");
    }

    const aiData = await aiRes.json();
    const text = aiData.content?.[0]?.text || "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);

    if (!jsonMatch) {
      console.error("[fit-score] No JSON array in Claude response:", text.slice(0, 300));
      throw new Error("No valid response");
    }

    const aiResults = JSON.parse(jsonMatch[0]);

    // DEBUG: log full Claude scoring for each candidate
    console.log("[fit-score] DEBUG roleId:", roleId, "roleTitle:", role.title);
    console.log("[fit-score] DEBUG candidates scored:", aiResults.length);
    aiResults.forEach(c => {
      // Find the original candidate to get resume_data
      const orig = scored.find(s => s.wf_id === c.wf_id);
      const rd = orig?.resume_data;
      console.log(`[fit-score] DEBUG ${c.wf_id}: fit=${c.fit_score} exp=${c.experience_score} ocean=${c.ocean_score} traj=${c.trajectory_score} culture=${c.culture_score} resume_industry=${rd?.industry || "none"} resume_title=${rd?.currentTitle || "none"} reason="${c.match_reason}"`);
    });
    // Also log candidates that were in the RMS pool but not in Claude results
    const aiWfIds = new Set(aiResults.map(c => c.wf_id));
    scored.filter(c => !aiWfIds.has(c.wf_id)).forEach(c => {
      const rd = c.resume_data;
      console.log(`[fit-score] DEBUG ${c.wf_id}: EXCLUDED by Claude (rmsScore=${c.rmsScore} resume_industry=${rd?.industry || "none"} resume_title=${rd?.currentTitle || "none"})`);
    });

    return res.status(200).json({
      role: {
        id: role.id,
        title: role.title,
        companyName: role.employers?.company_name || "Unknown",
        employerId: role.employers?.id || role.employer_id,
      },
      candidates: aiResults,
      fallback: false,
      introMap,
    });
  } catch (err) {
    console.error("[fit-score] Falling back to RMS:", err.message);

    // Fallback: return RMS-only results
    const fallbackResults = scored
      .filter(c => c.rmsScore >= 40)
      .map(c => ({
        wf_id: c.wf_id,
        fit_score: c.rmsScore,
        ocean_score: c.rmsScore,
        trajectory_score: null,
        culture_score: null,
        match_reason: `OCEAN compatibility score of ${c.rmsScore} based on personality profile alignment.`,
        top_strengths: [],
        watch_outs: [],
        archetype: c.archetype,
      }));

    return res.status(200).json({
      role: {
        id: role.id,
        title: role.title,
        companyName: role.employers?.company_name || "Unknown",
        employerId: role.employers?.id || role.employer_id,
      },
      candidates: fallbackResults,
      fallback: true,
      introMap,
    });
  }
}
