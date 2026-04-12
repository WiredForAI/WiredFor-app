import { requireAdmin } from "./_lib/auth.js";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  // Admin-only — this endpoint returns all candidate data
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const { data, error } = await supabase
      .from("candidates")
      .select("id, wf_id, email, archetype, archetype_category, operating_style, ocean, roles, watch_outs, culture_fit, career_clarity, growth_path, interview_intelligence, environments_to_avoid, location, work_preference, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
