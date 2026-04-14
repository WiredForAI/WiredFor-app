import { createClient } from "@supabase/supabase-js";
import { rateLimit, cors, findDangerousContent } from "./_lib/auth.js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (cors(req, res)) return;

  // ── GET: retrieve saved progress by wfId ──────────────────────────────────
  if (req.method === "GET") {
    const { wfId } = req.query;
    if (!wfId) return res.status(400).json({ error: "Missing wfId" });

    const { data, error } = await supabase
      .from("assessment_progress")
      .select("answers, updated_at")
      .eq("wf_id", wfId)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ progress: data || null });
  }

  // ── POST: save progress ───────────────────────────────────────────────────
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Rate limit: 60 saves per IP per hour (one per question with headroom)
  if (rateLimit(req, res, "save-ans", 60, 3_600_000)) return;

  const { wfId, answers } = req.body;

  if (!wfId || !answers) {
    return res.status(400).json({ error: "Missing wfId or answers" });
  }

  // Validate answers: text max 500 chars, reject dangerous content
  const dangerous = findDangerousContent(answers);
  if (dangerous) return res.status(400).json({ error: "Invalid input detected" });
  for (const [key, val] of Object.entries(answers)) {
    if (typeof val === "string" && val.length > 500) {
      return res.status(400).json({ error: `Answer for Q${key} exceeds 500 character limit` });
    }
  }

  const { error } = await supabase
    .from("assessment_progress")
    .upsert(
      { wf_id: wfId, answers, updated_at: new Date().toISOString() },
      { onConflict: "wf_id" }
    );

  if (error) {
    console.error("save-answers error:", error.message, error.code);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true });
}
