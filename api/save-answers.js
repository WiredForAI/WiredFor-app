import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "./_lib/auth.js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Rate limit: 10 assessment saves per IP per hour
  if (rateLimit(req, res, "save-ans", 10, 3_600_000)) return;

  const { wfId, answers } = req.body;

  if (!wfId || !answers) {
    return res.status(400).json({ error: "Missing wfId or answers" });
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
