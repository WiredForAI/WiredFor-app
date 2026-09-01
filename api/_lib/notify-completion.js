import { sendEmail, esc } from "./email.js";

const TAG = "assessment-complete";
const ADMIN_URL = "https://wiredfor.ai/admin";

/**
 * Build the admin notification email for a completed assessment.
 */
function buildHtml({ email, wfId, archetype, archetypeCategory, location, workPreference, timestamp }) {
  const row = (label, value) => value
    ? `<tr>
         <td style="padding:6px 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#888888;width:130px;vertical-align:top;">${esc(label)}</td>
         <td style="padding:6px 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;color:#0A0A0A;font-weight:500;">${esc(value)}</td>
       </tr>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f4f2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f2;padding:32px 16px;">
<tr><td align="center">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:12px;overflow:hidden;">

    <!-- Header -->
    <tr>
      <td style="background-color:#0A0A0A;padding:24px 32px;">
        <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#00C4A8;">
          Assessment Completed
        </p>
        <h1 style="margin:8px 0 0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:22px;line-height:1.3;color:#ffffff;font-weight:600;">
          ${esc(archetype) || "New result"}${archetypeCategory ? ` <span style="color:#888888;font-weight:400;">&middot; ${esc(archetypeCategory)}</span>` : ""}
        </h1>
      </td>
    </tr>

    <!-- Detail table -->
    <tr>
      <td style="padding:24px 32px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${row("Candidate", email || "No email on record")}
          ${row("WF ID", wfId)}
          ${row("Location", location)}
          ${row("Work pref", workPreference)}
          ${row("Completed", timestamp)}
        </table>
      </td>
    </tr>

    <!-- CTA -->
    <tr>
      <td style="padding:16px 32px 32px;">
        <a href="${ADMIN_URL}" target="_blank"
           style="display:inline-block;background:#00C4A8;color:#0A0A0A;padding:12px 24px;border-radius:8px;text-decoration:none;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:600;">
          View in Admin Dashboard
        </a>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color:#f9f9f7;padding:20px 32px;border-top:1px solid #eeeee9;">
        <p style="margin:0;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#999999;line-height:1.6;">
          Automated notification from WiredFor.ai &mdash; sent once per candidate when their assessment result is first saved.
        </p>
      </td>
    </tr>

  </table>

</td></tr>
</table>
</body>
</html>`;
}

/**
 * Notify the admin that a candidate finished their assessment.
 *
 * Fire-and-forget: this never throws and never blocks the caller's response.
 * Deduplication is the caller's job — pass only first-time completions.
 *
 * Requires env: ADMIN_EMAIL, RESEND_API_KEY
 *
 * @param {object} candidate
 * @param {string} candidate.wfId
 * @param {string} [candidate.email]
 * @param {string} [candidate.archetype]
 * @param {string} [candidate.archetypeCategory]
 * @param {string} [candidate.location]
 * @param {string} [candidate.workPreference]
 */
export async function notifyAssessmentCompleted(candidate) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.error(`[${TAG}] ADMIN_EMAIL not set — notification skipped for ${candidate?.wfId}`);
    return;
  }

  const timestamp = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Chicago",
  }) + " CT";

  const subjectName = candidate.archetype || "New result";

  await sendEmail({
    to: adminEmail,
    subject: `Assessment Completed — ${subjectName} (${candidate.wfId})`,
    html: buildHtml({ ...candidate, timestamp }),
    tag: TAG,
  });
}
