import { createClient } from "@supabase/supabase-js";
import { getAuthUser, cors } from "./_lib/auth.js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  // Require authenticated user
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

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
