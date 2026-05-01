import { cors, getAuthUser, rateLimit } from "./_lib/auth.js";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user = await getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (rateLimit(req, res, "employer-intro", 30, 3_600_000)) return;

  const { employerId, roleId, candidateWfId } = req.body || {};

  if (!employerId || !roleId || !candidateWfId) {
    return res.status(400).json({ error: "Missing employerId, roleId, or candidateWfId" });
  }

  // Verify the caller owns this employer profile
  const { data: employer } = await supabase
    .from("employers")
    .select("id, user_id, company_name")
    .eq("id", employerId)
    .single();

  if (!employer || employer.user_id !== user.id) {
    return res.status(403).json({ error: "Not authorized for this employer" });
  }

  // Check for existing intro to prevent duplicates
  const { data: existing } = await supabase
    .from("intros")
    .select("id, status")
    .eq("employer_id", employerId)
    .eq("role_id", roleId)
    .eq("candidate_wf_id", candidateWfId)
    .limit(1);

  if (existing && existing.length > 0) {
    return res.status(200).json({ intro: existing[0], duplicate: true });
  }

  const { data, error } = await supabase
    .from("intros")
    .insert({
      employer_id: employerId,
      role_id: roleId,
      candidate_wf_id: candidateWfId,
      status: "pending",
      requested_by: "employer",
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Send admin email notification for new employer intro request
  try {
    const { data: roleData } = await supabase
      .from("employer_roles")
      .select("title")
      .eq("id", roleId)
      .single();

    const roleName = roleData?.title || "Unknown Role";
    const company = employer.company_name || "Unknown Company";
    const timestamp = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "hello@wiredfor.ai",
        to: process.env.ADMIN_EMAIL,
        subject: `New Intro Request — ${company} for ${roleName}`,
        html: `<div style="font-family:sans-serif;color:#333;line-height:1.6;">
<h2 style="color:#0A0A0A;margin:0 0 16px;">New Intro Request</h2>
<p><strong>Company:</strong> ${company}</p>
<p><strong>Role:</strong> ${roleName}</p>
<p><strong>Candidate:</strong> ${candidateWfId}</p>
<p><strong>Requested at:</strong> ${timestamp}</p>
<br/>
<a href="https://wiredfor.ai/admin" style="display:inline-block;background:#00C4A8;color:#0A0A0A;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">View in Admin Dashboard</a>
</div>`,
      }),
    });
    console.log(`[employer-intro] Admin notified: ${company} → ${roleName} → ${candidateWfId}`);
  } catch (emailErr) {
    console.error("[employer-intro] Admin email failed:", emailErr.message);
  }

  return res.status(200).json({ intro: data });
}
