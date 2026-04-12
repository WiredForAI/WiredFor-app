import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "./_lib/auth.js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Require authenticated employer
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const {
    employerId, title, team, description,
    workType, location, cultureTags, traits, idealOcean, intakeData,
  } = req.body;

  if (!employerId || !title) {
    return res.status(400).json({ error: "Missing employerId or title" });
  }

  const { data, error } = await supabase
    .from("employer_roles")
    .insert({
      employer_id: employerId,
      title,
      team: team || null,
      description: description || null,
      work_type: workType || "remote",
      location: location || null,
      culture_tags: cultureTags || [],
      traits: traits || [],
      ideal_ocean: idealOcean || null,
      intake_data: intakeData || null,
      status: "pending",
      active: false,
    })
    .select()
    .single();

  if (error) {
    console.error("save-role error:", error.message);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ role: data });
}
