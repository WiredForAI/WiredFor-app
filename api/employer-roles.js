import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { employerId } = req.query;
  if (!employerId) return res.status(400).json({ error: "Missing employerId" });

  const { data, error } = await supabase
    .from("employer_roles")
    .select("*")
    .eq("employer_id", employerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("employer-roles error:", error.message);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ roles: data || [] });
}
