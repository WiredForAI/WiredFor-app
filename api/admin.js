import { createClient } from "@supabase/supabase-js";
import { requireAdmin, cors } from "./_lib/auth.js";
import { ARCHETYPES } from "../src/archetypes.js";

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

export default async function handler(req, res) {
  // All admin endpoints require server-side auth token verification
  if (cors(req, res)) return;
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const action = req.query.action || req.body?.action;

  // ── GET queue ──────────────────────────────────────────────────────────────
  if (req.method === "GET" && action === "queue") {
    const { userId } = req.query;
    // Auth verified at handler entry

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
    // Auth verified at handler entry

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
    // Auth verified at handler entry

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
    // Auth verified at handler entry

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
    // Auth verified at handler entry

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
    // Auth verified at handler entry
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
    // Auth verified at handler entry
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
    // Auth verified at handler entry

    const { error, count } = await supabase
      .from("candidates")
      .delete({ count: "exact" })
      .like("wf_id", "TEST-%");

    if (error) { console.error("clear-test-profiles error:", error.message); return res.status(500).json({ error: error.message }); }
    return res.status(200).json({ success: true, deleted: count ?? 0 });
  }

  // ── POST update-candidate-email ───────────────────────────────────────────
  if (req.method === "POST" && action === "update-candidate-email") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { wfId, email } = body;
    if (!wfId || !email) return res.status(400).json({ error: "Missing wfId or email" });

    const { error } = await supabase
      .from("candidates")
      .update({ email, updated_at: new Date().toISOString() })
      .eq("wf_id", wfId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  // ── POST invite-candidate ────────────────────────────────────────────────
  // No Supabase auth calls — just save email + send via Resend with a claim URL.
  // The candidate signs up on the /claim page; that page links their user_id.
  if (req.method === "POST" && action === "invite-candidate") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { wfId, email } = body;
    console.log("[invite-candidate] parsed:", JSON.stringify({ wfId, email }));
    if (!wfId || !email) return res.status(400).json({ error: "Missing wfId or email" });

    // 1. Save email to candidate record
    const { data: candidate, error: updateErr } = await supabase
      .from("candidates")
      .update({ email, updated_at: new Date().toISOString() })
      .eq("wf_id", wfId)
      .select("archetype")
      .single();
    if (updateErr) return res.status(500).json({ error: updateErr.message });

    // 2. Look up tagline from the archetype framework
    const archetype = candidate?.archetype || "";
    const archetypeDef = ARCHETYPES.find(a => a.name === archetype);
    const tagline = archetypeDef?.tagline || "";

    // 3. Send invite email via Resend — no Supabase auth involved
    const claimUrl = `https://wiredfor.ai/claim?wfId=${encodeURIComponent(wfId)}`;
    const category = archetypeDef?.category?.toUpperCase() || "";
    const subject = `Your WiredFor.ai profile is ready${archetype ? `, ${archetype}` : ""}`;
    const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<title>WiredFor.ai</title>
<!--[if mso]><style>table,td{font-family:Arial,sans-serif!important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f2;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<!-- Outer wrapper for background color -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f2;">
<tr><td align="center" style="padding:24px 16px;">

<!-- Main container 560px -->
<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;border-collapse:collapse;">

  <!-- HEADER — white, centered wordmark -->
  <tr>
    <td align="center" style="background-color:#ffffff;padding:28px 24px 24px;border-radius:12px 12px 0 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:400;color:#0A0A0A;letter-spacing:0.02em;">
            Wired<span style="font-weight:700;">For</span><span style="color:#00C4A8;">.</span>ai
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- HERO — dark bg, archetype reveal -->
  <tr>
    <td align="center" style="background-color:#0A0A0A;padding:44px 32px 48px;">
      ${category ? `
      <!-- Category badge -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">
        <tr>
          <td style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#00C4A8;background-color:rgba(0,196,168,0.12);padding:5px 14px;border-radius:20px;border:1px solid rgba(0,196,168,0.25);">
            ${category}
          </td>
        </tr>
      </table>
      ` : ""}
      <!-- Archetype name -->
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:400;color:#ffffff;margin:0 0 10px;line-height:1.2;">
        ${archetype || "Your Archetype"}
      </h1>
      ${tagline ? `
      <!-- Tagline -->
      <p style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;font-style:italic;color:#00C4A8;margin:0;line-height:1.5;">
        ${tagline}
      </p>
      ` : ""}
    </td>
  </tr>

  <!-- BODY — white, description + CTA -->
  <tr>
    <td align="center" style="background-color:#ffffff;padding:36px 32px 16px;">
      <p style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;line-height:1.7;color:#333333;margin:0 0 28px;max-width:440px;">
        Your profile through WiredFor.ai is complete and your results are in.
        Click below to claim your free profile and see your full personality breakdown,
        best-fit tech roles, and career roadmap.
      </p>
      <!-- CTA Button -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 32px;">
        <tr>
          <td align="center" style="background-color:#00C4A8;border-radius:10px;">
            <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${claimUrl}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="21%" fillcolor="#00C4A8" stroke="f"><v:textbox inset="0,0,0,0"><center style="font-size:14px;font-weight:700;color:#0A0A0A;font-family:Arial,sans-serif;">Claim My Profile &rarr;</center></v:textbox></v:roundrect><![endif]-->
            <!--[if !mso]><!-->
            <a href="${claimUrl}" target="_blank" style="display:inline-block;background-color:#00C4A8;color:#0A0A0A;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:0.02em;">
              Claim My Profile &rarr;
            </a>
            <!--<![endif]-->
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- FEATURES LIST — white -->
  <tr>
    <td style="background-color:#ffffff;padding:0 32px 36px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:360px;margin:0 auto;">
        <tr>
          <td style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#333333;padding:8px 0;line-height:1.5;">
            <span style="color:#00C4A8;font-size:15px;margin-right:8px;">&#10003;</span> Your Big Five personality profile
          </td>
        </tr>
        <tr>
          <td style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#333333;padding:8px 0;line-height:1.5;border-top:1px solid #f0f0ee;">
            <span style="color:#00C4A8;font-size:15px;margin-right:8px;">&#10003;</span> Best-fit tech roles matched to your wiring
          </td>
        </tr>
        <tr>
          <td style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#333333;padding:8px 0;line-height:1.5;border-top:1px solid #f0f0ee;">
            <span style="color:#00C4A8;font-size:15px;margin-right:8px;">&#10003;</span> Your complete career roadmap
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- FOOTER — light gray -->
  <tr>
    <td align="center" style="background-color:#f9f9f7;padding:28px 32px 24px;border-radius:0 0 12px 12px;border-top:1px solid #eeeee9;">
      <p style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#999999;line-height:1.7;margin:0 0 14px;max-width:380px;">
        Your profile is completely free. Your identity stays private until you choose to share it.
        <br>&mdash; The WiredFor.ai Team
      </p>
      <a href="https://wiredfor.ai" target="_blank" style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#00C4A8;text-decoration:none;letter-spacing:0.03em;">
        wiredfor.ai
      </a>
    </td>
  </tr>

</table>
<!-- /Main container -->

</td></tr>
</table>
<!-- /Outer wrapper -->
</body>
</html>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "hello@wiredfor.ai",
        to: email,
        subject,
        html,
      }),
    });
    const resendData = await resendRes.json().catch(() => ({}));
    console.log("[invite-candidate] resend result:", resendRes.status, JSON.stringify(resendData));
    if (!resendRes.ok) return res.status(500).json({
      error: resendData?.message || "Resend send failed",
      resendStatus: resendRes.status,
      resend: resendData,
    });

    return res.status(200).json({ success: true, id: resendData?.id });
  }

  // ── GET dash-reviews ──────────────────────────────────────────────────────
  if (req.method === "GET" && action === "dash-reviews") {
    const { data, error } = await supabase
      .from("candidate_reviews")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ reviews: data || [] });
  }

  // ── POST approve-review / reject-review ─────────────────────────────────
  if (req.method === "POST" && (action === "approve-review" || action === "reject-review")) {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { reviewId } = body;
    if (!reviewId) return res.status(400).json({ error: "Missing reviewId" });

    const approved = action === "approve-review";
    const { error: updateErr } = await supabase
      .from("candidate_reviews")
      .update({ approved })
      .eq("id", reviewId);

    if (updateErr) return res.status(500).json({ error: updateErr.message });
    return res.status(200).json({ success: true });
  }

  // ── POST delete-review ──────────────────────────────────────────────────
  if (req.method === "POST" && action === "delete-review") {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { reviewId } = body;
    if (!reviewId) return res.status(400).json({ error: "Missing reviewId" });

    const { error: delErr } = await supabase
      .from("candidate_reviews")
      .delete()
      .eq("id", reviewId);

    if (delErr) return res.status(500).json({ error: delErr.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: "Method or action not allowed" });
}
