import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MANDATORY_KEYS = ["collaboration", "autonomy", "pace", "culture", "struggles", "learnings"];
const OPTIONAL_KEYS = ["conflict", "feedback", "visibility", "deadlines", "respected", "thrives"];
const MANDATORY_WEIGHT = 60 / 7;
const OPTIONAL_WEIGHT = 40 / 6;

function computeCompleteness(role) {
  const intake = role.intake_data || {};
  const descFilled = (role.description || "").trim().length > 0;
  const mandatoryCount = MANDATORY_KEYS.filter(k => (intake[k] || "").trim().length > 0).length;
  const optionalCount = OPTIONAL_KEYS.filter(k => (intake[k] || "").trim().length > 0).length;
  return Math.min(100, Math.round(
    (descFilled ? MANDATORY_WEIGHT : 0) +
    mandatoryCount * MANDATORY_WEIGHT +
    optionalCount * OPTIONAL_WEIGHT
  ));
}

async function verifyAdmin(userId) {
  const { data } = await supabase.auth.admin.getUserById(userId);
  return data?.user?.email === process.env.ADMIN_EMAIL;
}

export default async function handler(req, res) {
  const action = req.query.action || req.body?.action;

  // ── GET queue ──────────────────────────────────────────────────────────────
  if (req.method === "GET" && action === "queue") {
    const { userId } = req.query;
    if (!userId || !(await verifyAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

    const { data: roles, error } = await supabase
      .from("employer_roles")
      .select("*, employers(company_name, industry)")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const result = (roles || []).map(r => ({
      id: r.id,
      title: r.title,
      team: r.team,
      description: r.description,
      status: r.status || "pending",
      rejectionReason: r.rejection_reason,
      createdAt: r.created_at,
      reviewedAt: r.reviewed_at,
      workType: r.work_type,
      location: r.location,
      cultureTags: r.culture_tags || [],
      traits: r.traits || [],
      idealOcean: r.ideal_ocean,
      intakeData: r.intake_data || {},
      companyName: r.employers?.company_name || "Unknown Company",
      industry: r.employers?.industry || "",
      completeness: computeCompleteness(r),
    }));

    return res.status(200).json({ roles: result });
  }

  // ── POST approve ───────────────────────────────────────────────────────────
  if (req.method === "POST" && action === "approve") {
    const { roleId, userId } = req.body;
    if (!roleId || !userId || !(await verifyAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

    const { error } = await supabase
      .from("employer_roles")
      .update({ status: "approved", active: true, reviewed_at: new Date().toISOString() })
      .eq("id", roleId);

    if (error) { console.error("admin approve error:", error.message); return res.status(500).json({ error: error.message }); }
    return res.status(200).json({ success: true });
  }

  // ── POST reject ────────────────────────────────────────────────────────────
  if (req.method === "POST" && action === "reject") {
    const { roleId, userId, reason } = req.body;
    if (!roleId || !userId || !(await verifyAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

    const { error } = await supabase
      .from("employer_roles")
      .update({
        status: "rejected", active: false,
        rejection_reason: reason || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", roleId);

    if (error) { console.error("admin reject error:", error.message); return res.status(500).json({ error: error.message }); }
    return res.status(200).json({ success: true });
  }

  // ── GET dash-stats ─────────────────────────────────────────────────────────
  if (req.method === "GET" && action === "dash-stats") {
    const { userId } = req.query;
    if (!userId || !(await verifyAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

    const [
      { count: candidates },
      { count: employers },
      { count: intros },
      { count: placements },
    ] = await Promise.all([
      supabase.from("candidates").select("*", { count: "exact", head: true }),
      supabase.from("employers").select("*", { count: "exact", head: true }),
      supabase.from("intros").select("*", { count: "exact", head: true }),
      supabase.from("intros").select("*", { count: "exact", head: true }).eq("status", "placed"),
    ]);

    return res.status(200).json({ candidates, employers, intros, placements });
  }

  // ── GET dash-candidates ────────────────────────────────────────────────────
  if (req.method === "GET" && action === "dash-candidates") {
    const { userId } = req.query;
    if (!userId || !(await verifyAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

    const { data, error } = await supabase
      .from("candidates")
      .select("wf_id, email, archetype, archetype_category, operating_style, ocean, roles, watch_outs, culture_fit, career_clarity, growth_path, interview_intelligence, environments_to_avoid, resume_data, career_paths, location, work_preference, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ candidates: data || [] });
  }

  // ── GET dash-employers ─────────────────────────────────────────────────────
  if (req.method === "GET" && action === "dash-employers") {
    const { userId } = req.query;
    if (!userId || !(await verifyAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

    const { data: employers, error } = await supabase
      .from("employers")
      .select("id, user_id, company_name, industry, website, created_at")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    // Get role counts per employer
    const { data: roles } = await supabase
      .from("employer_roles")
      .select("employer_id, active");

    // Get user emails from auth
    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const emailMap = {};
    (authData?.users || []).forEach(u => { emailMap[u.id] = u.email; });

    const result = (employers || []).map(e => {
      const empRoles = (roles || []).filter(r => r.employer_id === e.id);
      return {
        id: e.id,
        userId: e.user_id,
        companyName: e.company_name,
        industry: e.industry,
        website: e.website,
        email: emailMap[e.user_id] || null,
        totalRoles: empRoles.length,
        activeRoles: empRoles.filter(r => r.active).length,
        createdAt: e.created_at,
      };
    });

    return res.status(200).json({ employers: result });
  }

  // ── GET dash-intros ────────────────────────────────────────────────────────
  if (req.method === "GET" && action === "dash-intros") {
    const { userId } = req.query;
    if (!userId || !(await verifyAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

    const { data, error } = await supabase
      .from("intros")
      .select("*, employers(company_name), employer_roles(title)")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const result = (data || []).map(i => ({
      id: i.id,
      companyName: i.employers?.company_name || "Unknown",
      roleTitle: i.employer_roles?.title || "—",
      candidateWfId: i.candidate_wf_id,
      status: i.status,
      notes: i.notes,
      createdAt: i.created_at,
      updatedAt: i.updated_at,
    }));

    return res.status(200).json({ intros: result });
  }

  // ── POST connect ───────────────────────────────────────────────────────────
  if (req.method === "POST" && action === "connect") {
    const { userId, employerId, roleId, candidateWfId, notes } = req.body;
    if (!userId || !(await verifyAdmin(userId))) return res.status(403).json({ error: "Forbidden" });
    if (!employerId || !candidateWfId) return res.status(400).json({ error: "Missing required fields" });

    const { data, error } = await supabase
      .from("intros")
      .insert({
        employer_id: employerId,
        role_id: roleId || null,
        candidate_wf_id: candidateWfId,
        status: "requested",
        notes: notes || null,
      })
      .select()
      .single();

    if (error) { console.error("admin connect error:", error.message); return res.status(500).json({ error: error.message }); }
    return res.status(200).json({ intro: data });
  }

  // ── POST update-intro ──────────────────────────────────────────────────────
  if (req.method === "POST" && action === "update-intro") {
    const { userId, introId, status } = req.body;
    if (!userId || !(await verifyAdmin(userId))) return res.status(403).json({ error: "Forbidden" });
    if (!introId || !status) return res.status(400).json({ error: "Missing required fields" });

    const { error } = await supabase
      .from("intros")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", introId);

    if (error) { console.error("admin update-intro error:", error.message); return res.status(500).json({ error: error.message }); }
    return res.status(200).json({ success: true });
  }

  // ── POST clear-test-profiles ──────────────────────────────────────────────
  if (req.method === "POST" && action === "clear-test-profiles") {
    const { userId } = req.body;
    if (!userId || !(await verifyAdmin(userId))) return res.status(403).json({ error: "Forbidden" });

    const { error, count } = await supabase
      .from("candidates")
      .delete({ count: "exact" })
      .like("wf_id", "TEST-%");

    if (error) { console.error("clear-test-profiles error:", error.message); return res.status(500).json({ error: error.message }); }
    return res.status(200).json({ success: true, deleted: count ?? 0 });
  }

  return res.status(405).json({ error: "Method or action not allowed" });
}
