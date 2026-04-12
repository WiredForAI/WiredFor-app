import { createClient } from "@supabase/supabase-js";
import { getAuthUser, rateLimit, cors, findDangerousContent, validateOcean, isValidEmail } from "./_lib/auth.js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function upsertCandidate(payload) {
  const { error } = await supabase
    .from("candidates")
    .upsert(payload, { onConflict: "wf_id" });
  return error;
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  // Rate limit: 10 saves per IP per hour
  if (req.method === "POST" && rateLimit(req, res, "save-cand", 10, 3_600_000)) return;

  // GET — fetch a candidate profile by userId
  if (req.method === "GET") {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    // Verify caller is requesting their own data (or is admin)
    const user = await getAuthUser(req);
    if (!user || (user.id !== userId && user.email !== process.env.ADMIN_EMAIL)) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const COLS = "wf_id, archetype, archetype_category, operating_style, ocean, roles, watch_outs, culture_fit, location, work_preference, career_clarity, growth_path, interview_intelligence, environments_to_avoid, resume_data, career_paths, has_completed_onboarding";

    // Try by user_id first
    let { data, error } = await supabase
      .from("candidates")
      .select(COLS)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });

    // Fallback: look up by email (handles candidates who originally skipped auth)
    if (!data) {
      const { data: authData } = await supabase.auth.admin.getUserById(userId);
      const email = authData?.user?.email;
      if (email) {
        const { data: byEmail } = await supabase
          .from("candidates")
          .select(COLS)
          .eq("email", email)
          .maybeSingle();
        if (byEmail) {
          // Backfill user_id so future lookups hit the fast path
          await supabase
            .from("candidates")
            .update({ user_id: userId })
            .eq("wf_id", byEmail.wf_id);
          data = byEmail;
        }
      }
    }

    return res.status(200).json({ candidate: data || null });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const {
    userId, wfId, email, archetype, archetypeCategory, operatingStyle,
    ocean, roles, watchOuts, cultureFit, location, workPreference,
    careerClarity, growthPath, interviewIntelligence, environmentsToAvoid,
    resumeData, careerPaths, hasCompletedOnboarding,
  } = req.body;

  // Input validation
  const dangerous = findDangerousContent(req.body);
  if (dangerous) return res.status(400).json({ error: "Invalid input detected" });
  if (email && !isValidEmail(email)) return res.status(400).json({ error: "Invalid email format" });
  if (ocean && !hasCompletedOnboarding) {
    const oceanErr = validateOcean(ocean);
    if (oceanErr) return res.status(400).json({ error: oceanErr });
  }

  // hasCompletedOnboarding-only update (partial upsert — no archetype/ocean required)
  if (wfId && hasCompletedOnboarding === true && !archetype) {
    const { error } = await supabase
      .from("candidates")
      .update({ has_completed_onboarding: true, updated_at: new Date().toISOString() })
      .eq("wf_id", wfId);
    if (error && error.code !== "42703") {
      console.error("has_completed_onboarding update error:", error.message);
      return res.status(500).json({ error: error.message, code: error.code });
    }
    return res.status(200).json({ success: true });
  }

  if (!wfId || !archetype || !ocean) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const base = {
    user_id: userId || null,
    wf_id: wfId,
    email: email || null,
    archetype,
    operating_style: operatingStyle,
    ocean,
    roles,
    watch_outs: watchOuts,
    culture_fit: cultureFit,
    career_clarity: careerClarity || null,
    growth_path: growthPath || null,
    interview_intelligence: interviewIntelligence || null,
    environments_to_avoid: environmentsToAvoid || null,
    resume_data: resumeData || null,
    career_paths: careerPaths || null,
    updated_at: new Date().toISOString(),
  };

  try {
    // Attempt 1 — full payload including location + work_preference + onboarding flag
    let error = await upsertCandidate({
      ...base,
      archetype_category: archetypeCategory || null,
      location: location || null,
      work_preference: workPreference || null,
      has_completed_onboarding: hasCompletedOnboarding ?? null,
    });

    // If columns don't exist yet (migration not run), fall back to core fields only
    if (error && error.code === "42703") {
      console.warn("location/work_preference columns missing — retrying without them:", error.message);
      error = await upsertCandidate(base);
    }

    if (error) {
      console.error("Supabase upsert error:", { code: error.code, message: error.message, details: error.details });
      return res.status(500).json({ error: error.message, code: error.code });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("save-candidate unexpected error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
