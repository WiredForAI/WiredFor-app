import { cors, getAuthUser, rateLimit, findDangerousContent } from "./_lib/auth.js";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (cors(req, res)) return;

  // GET — fetch approved reviews (public) or single candidate's review status
  if (req.method === "GET") {
    if (rateLimit(req, res, "reviews-get", 30, 60_000)) return;

    const { wfId } = req.query || {};

    // If wfId provided, return that candidate's review status
    if (wfId) {
      const { data, error } = await supabase
        .from("candidate_reviews")
        .select("id, approved, stars, review_text, job_title")
        .eq("wf_id", wfId)
        .limit(1)
        .maybeSingle();

      if (error) return res.status(500).json({ error: error.message });
      if (!data) return res.status(200).json({ status: "none" });

      // approved: null = pending, true = approved, false = rejected
      const status = data.approved === true ? "approved" : data.approved === false ? "rejected" : "pending";
      return res.status(200).json({ status, review: data });
    }

    // Otherwise return all approved reviews for landing page
    const { data, error } = await supabase
      .from("candidate_reviews")
      .select("wf_id, archetype, category, job_title, stars, review_text, created_at")
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(12);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ reviews: data || [] });
  }

  // POST — submit a review (requires auth)
  if (req.method === "POST") {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (rateLimit(req, res, "reviews-post", 5, 3_600_000)) return;

    const { wfId, archetype, category, jobTitle, stars, reviewText } = req.body || {};

    if (!wfId || !archetype || !stars) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (typeof stars !== "number" || stars < 1 || stars > 5) {
      return res.status(400).json({ error: "Stars must be 1-5" });
    }
    if (reviewText && reviewText.length > 150) {
      return res.status(400).json({ error: "Review text must be 150 characters or less" });
    }
    if (reviewText && findDangerousContent(reviewText)) {
      return res.status(400).json({ error: "Invalid content detected" });
    }

    // Check for existing review from this candidate
    const { data: existing } = await supabase
      .from("candidate_reviews")
      .select("id")
      .eq("wf_id", wfId)
      .limit(1);

    if (existing && existing.length > 0) {
      // Update existing review
      const { error: updateErr } = await supabase
        .from("candidate_reviews")
        .update({
          stars,
          review_text: reviewText || null,
          archetype,
          category: category || null,
          job_title: jobTitle || null,
          approved: null,
          created_at: new Date().toISOString(),
        })
        .eq("wf_id", wfId);

      if (updateErr) return res.status(500).json({ error: updateErr.message });
      return res.status(200).json({ success: true, updated: true });
    }

    const { error: insertErr } = await supabase
      .from("candidate_reviews")
      .insert({
        wf_id: wfId,
        archetype,
        category: category || null,
        job_title: jobTitle || null,
        stars,
        review_text: reviewText || null,
        approved: null,
      });

    if (insertErr) return res.status(500).json({ error: insertErr.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
