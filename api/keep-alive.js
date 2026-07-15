import { createClient } from "@supabase/supabase-js";

// ── Keep-alive cron endpoint ─────────────────────────────────────────────────
// Pings Supabase once a day so the free-tier project doesn't auto-pause after
// ~1 week of inactivity (which takes down auth, magic-link login, and every
// Supabase-backed API at once). Wired to a daily Vercel cron in vercel.json.
//
// IMPORTANT: `CRON_SECRET` must be added to the Vercel project's environment
// variables manually (Project → Settings → Environment Variables). Vercel
// automatically attaches it as `Authorization: Bearer <CRON_SECRET>` on cron
// invocations; this handler rejects any request whose token doesn't match.

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth: require a Bearer token matching CRON_SECRET
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!process.env.CRON_SECRET || token !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Lightweight query to keep the Supabase project active.
  // (No `profiles` table exists in this project — `candidates` is the core table.)
  const { error } = await supabase
    .from("candidates")
    .select("id")
    .limit(1);

  if (error) {
    console.error("keep-alive error:", error.message);
    return res.status(500).json({ ok: false, error: error.message });
  }

  return res.status(200).json({ ok: true, timestamp: new Date().toISOString() });
}
