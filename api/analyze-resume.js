import { getAuthUser, rateLimit, cors } from "./_lib/auth.js";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Require authenticated user for resume analysis
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  // Rate limit: 10 resume analyses per IP per hour
  if (rateLimit(req, res, "resume", 10, 3_600_000)) return;

  const { fileBase64, fileType, ocean, archetype, operatingStyle } = req.body || {};

  if (!fileBase64) return res.status(400).json({ error: "Missing fileBase64" });
  if (!ocean || !archetype) return res.status(400).json({ error: "Missing candidate profile" });

  // Log payload size for debugging upload issues
  const payloadSizeKB = Math.round(Buffer.byteLength(fileBase64, "utf8") / 1024);
  console.log(`[analyze-resume] fileType=${fileType} base64Size=${payloadSizeKB}KB user=${user.id}`);

  const isPDF = (fileType || "").includes("pdf");

  const systemPrompt = `You are a precise career analyst. Extract structured data from a resume and generate personalized career paths based on BOTH the resume background AND the candidate's OCEAN personality profile.

Return ONLY valid JSON — no markdown, no explanation.`;

  const extractPrompt = `Given this candidate's existing personality profile and their resume, return ONLY this JSON:
{
  "resumeData": {
    "currentTitle": "most recent job title",
    "yearsExperience": <integer>,
    "skills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
    "industry": "primary industry or domain",
    "notableCompanies": ["company1", "company2"],
    "backgroundSummary": "2-3 sentence plain-English summary of their background, written for a recruiter"
  },
  "mismatches": [
    "One specific mismatch between their background and OCEAN profile — e.g. their resume shows X but their personality suggests Y",
    "Second mismatch if present — omit if none"
  ],
  "careerPaths": {
    "bestFitNow": {
      "headline": "Short headline for this path (e.g. 'Senior Product Manager at a Series B startup')",
      "description": "2-3 sentences on why this path fits both their resume background AND their OCEAN scores right now",
      "roles": [
        { "title": "Role Title 1", "whyItFits": "One sentence tying resume experience + personality", "nextStep": "One concrete action to land this role" },
        { "title": "Role Title 2", "whyItFits": "...", "nextStep": "..." }
      ]
    },
    "wiredFor": {
      "headline": "Short headline for the role they're most personality-wired for (may not be their current path)",
      "description": "2-3 sentences on why this is their natural fit based on OCEAN — even if it requires a shift",
      "roles": [
        { "title": "Role Title 1", "whyItFits": "...", "nextStep": "..." },
        { "title": "Role Title 2", "whyItFits": "...", "nextStep": "..." }
      ]
    },
    "yourPivot": {
      "headline": "Short headline for an adjacent pivot that uses their skills in a new direction",
      "description": "2-3 sentences on why this pivot makes sense — what skills transfer + what personality traits align",
      "roles": [
        { "title": "Role Title 1", "whyItFits": "...", "nextStep": "..." },
        { "title": "Role Title 2", "whyItFits": "...", "nextStep": "..." }
      ]
    }
  }
}

CANDIDATE PERSONALITY PROFILE:
Archetype: ${archetype}
Operating style: ${operatingStyle || ""}
OCEAN scores: Openness ${ocean.openness}, Conscientiousness ${ocean.conscientiousness}, Extraversion ${ocean.extraversion}, Agreeableness ${ocean.agreeableness}, Neuroticism ${ocean.neuroticism}

Rules:
- bestFitNow roles must be realistic based on their existing resume experience
- wiredFor roles are chosen purely from personality fit — may require skill-building
- yourPivot must be adjacent (not a total reinvention), leveraging existing skills in a new context
- Each role title must be a specific job title, not a vague category
- mismatches array should be empty [] if none found
- yearsExperience must be an integer`;

  // Build the message content — PDF via document type, plain text fallback
  let messageContent;
  if (isPDF) {
    messageContent = [
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: fileBase64,
        },
      },
      { type: "text", text: extractPrompt },
    ];
  } else {
    // Plain text fallback (for .txt or if PDF parsing not needed)
    const decoded = Buffer.from(fileBase64, "base64").toString("utf-8");
    messageContent = `${extractPrompt}\n\nRESUME TEXT:\n${decoded.slice(0, 8000)}`;
  }

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
  };
  if (isPDF) headers["anthropic-beta"] = "pdfs-2024-09-25";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: messageContent }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("Anthropic error:", response.status, body.slice(0, 300));
    return res.status(502).json({ error: `AI service error: ${response.status}` });
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("No JSON in response:", text.slice(0, 300));
    return res.status(502).json({ error: "Could not parse AI response" });
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    // ── Roles regeneration (non-blocking enhancement) ──────────────────────
    // After resume analysis succeeds, regenerate the roles array to reflect
    // both personality AND actual work experience.
    const rd = parsed.resumeData;
    if (rd) {
      (async () => {
        try {
          // Look up candidate by auth user
          const { data: candidate } = await supabase
            .from("candidates")
            .select("wf_id, roles")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

          if (!candidate?.wf_id) {
            console.log("[analyze-resume] Roles regen skipped — no candidate found for user", user.id);
            return;
          }

          const existingRoles = (candidate.roles || []).map(r => r.title || r);

          const rolesPrompt = `You are a career advisor for a personality-based hiring platform. Generate 4 updated role recommendations that reflect BOTH this candidate's personality profile AND their actual work experience.

Candidate Profile:
- Archetype: ${archetype}
- OCEAN: O:${ocean.openness} C:${ocean.conscientiousness} E:${ocean.extraversion} A:${ocean.agreeableness} N:${ocean.neuroticism}
- Operating Style: ${operatingStyle || ""}
- Current Title: ${rd.currentTitle || "Unknown"}
- Industry: ${rd.industry || "Unknown"}
- Years Experience: ${rd.yearsExperience || "Unknown"}
- Key Skills: ${(rd.skills || []).join(", ") || "None listed"}
- Background: ${rd.backgroundSummary || ""}

Previous personality-only recommendations (for reference, may be outdated): ${existingRoles.join(", ")}

Generate 4 role recommendations that sit at the intersection of their personality AND experience:

Rules:
1. At least 2 roles must be directly related to their actual industry and experience
2. At least 1 role can be a personality-driven stretch or pivot that leverages their OCEAN profile
3. Each role must be realistic given their years of experience
4. Roles should feel like genuine career moves not random suggestions

Return JSON array only, no other text:
[
  {
    "title": "string",
    "icon": "emoji",
    "whyItFits": ["bullet 1 tying experience + personality", "bullet 2", "bullet 3"]
  }
]`;

          const rolesRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": process.env.ANTHROPIC_API_KEY,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-6",
              max_tokens: 1500,
              messages: [{ role: "user", content: rolesPrompt }],
            }),
          });

          if (!rolesRes.ok) {
            console.error("[analyze-resume] Roles regen Claude error:", rolesRes.status);
            return;
          }

          const rolesData = await rolesRes.json();
          const rolesText = rolesData.content?.[0]?.text || "";
          const rolesJsonMatch = rolesText.match(/\[[\s\S]*\]/);
          if (!rolesJsonMatch) {
            console.error("[analyze-resume] Roles regen: no JSON array in response");
            return;
          }

          const newRoles = JSON.parse(rolesJsonMatch[0]);
          const oldTitles = existingRoles.join(", ");
          const newTitles = newRoles.map(r => r.title).join(", ");

          const { error: updateErr } = await supabase
            .from("candidates")
            .update({ roles: newRoles, updated_at: new Date().toISOString() })
            .eq("wf_id", candidate.wf_id);

          if (updateErr) {
            console.error("[analyze-resume] Roles regen save error:", updateErr.message);
          } else {
            console.log(`[analyze-resume] Roles regenerated for ${candidate.wf_id}: ${oldTitles} → ${newTitles}`);
          }
        } catch (err) {
          console.error("[analyze-resume] Roles regen error:", err.message);
        }
      })();
    }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("JSON parse error:", err.message);
    return res.status(502).json({ error: "Invalid JSON from AI" });
  }
}
