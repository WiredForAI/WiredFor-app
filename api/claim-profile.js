import { createClient } from "@supabase/supabase-js";
import { getAuthUser, cors } from "./_lib/auth.js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (cors(req, res)) return;

  // GET: fetch candidate profile by wfId (public — for teaser display)
  if (req.method === "GET") {
    const { wfId } = req.query;
    if (!wfId) return res.status(400).json({ error: "Missing wfId" });

    const { data, error } = await supabase
      .from("candidates")
      .select("wf_id, archetype, archetype_category, operating_style, email")
      .eq("wf_id", wfId)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ candidate: data || null });
  }

  // POST: link candidate profile to authenticated user
  if (req.method === "POST") {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { wfId } = req.body;
    if (!wfId) return res.status(400).json({ error: "Missing wfId" });

    // Verify the candidate exists and isn't already linked to another user
    const { data: candidate } = await supabase
      .from("candidates")
      .select("wf_id, user_id, email")
      .eq("wf_id", wfId)
      .maybeSingle();

    if (!candidate) return res.status(404).json({ error: "Profile not found" });
    if (candidate.user_id && candidate.user_id !== user.id) {
      return res.status(403).json({ error: "Profile already linked to another account" });
    }

    // Link the profile
    const { error } = await supabase
      .from("candidates")
      .update({
        user_id: user.id,
        email: user.email || candidate.email,
        updated_at: new Date().toISOString(),
      })
      .eq("wf_id", wfId);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
