import { createClient } from "@supabase/supabase-js";
import { getAuthUser } from "./_lib/auth.js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Require authentication for all employer operations
  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  // ── POST: create/update employer profile ───────────────────────────────────
  if (req.method === "POST") {
    const { userId, companyName, industry, website } = req.body;
    if (!userId || !companyName) return res.status(400).json({ error: "Missing required fields" });

    // Verify caller owns this profile
    if (user.id !== userId && user.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { data, error } = await supabase
      .from("employers")
      .upsert({ user_id: userId, company_name: companyName, industry: industry || null, website: website || null }, { onConflict: "user_id" })
      .select()
      .single();

    if (error) {
      console.error("employer-profile POST error:", error.message);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ employer: data });
  }

  // ── GET: fetch employer profile ────────────────────────────────────────────
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  // Check admin server-side — email never exposed to client
  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  const isAdmin = authUser?.user?.email === process.env.ADMIN_EMAIL;

  const { data, error } = await supabase
    .from("employers")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    return res.status(200).json({ employer: null, isAdmin });
  }

  if (error) {
    console.error("employer-profile error:", error.message);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ employer: data, isAdmin });
}
