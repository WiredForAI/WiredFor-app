/**
 * Shared Resend email sender.
 *
 * Wraps the raw Resend REST call used across the API routes so callers get
 * consistent logging, a single place to change the sending address, and a
 * predictable return shape.
 *
 * Requires env: RESEND_API_KEY
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "hello@wiredfor.ai";

/**
 * Send an email through Resend.
 *
 * @param {object}   opts
 * @param {string|string[]} opts.to       Recipient address(es)
 * @param {string}   opts.subject
 * @param {string}   opts.html
 * @param {string}  [opts.from]           Defaults to hello@wiredfor.ai
 * @param {string}  [opts.replyTo]
 * @param {string}  [opts.tag]            Label used in log lines, e.g. "assessment-complete"
 * @returns {Promise<{ok: boolean, id?: string, status?: number, error?: string}>}
 */
export async function sendEmail({ to, subject, html, from = DEFAULT_FROM, replyTo, tag = "email" }) {
  if (!process.env.RESEND_API_KEY) {
    console.error(`[${tag}] RESEND_API_KEY not set — email not sent`);
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }

  const recipients = (Array.isArray(to) ? to : [to]).filter(Boolean);
  if (recipients.length === 0) {
    console.error(`[${tag}] No recipient — email not sent`);
    return { ok: false, error: "No recipient" };
  }

  const body = { from, to: recipients, subject, html };
  if (replyTo) body.reply_to = replyTo;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error(`[${tag}] Resend failed:`, res.status, JSON.stringify(data));
      return { ok: false, status: res.status, error: data?.message || "Resend send failed" };
    }

    console.log(`[${tag}] Sent to ${recipients.join(", ")} (id: ${data?.id})`);
    return { ok: true, id: data?.id, status: res.status };
  } catch (err) {
    console.error(`[${tag}] Resend threw:`, err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Escape a value for safe interpolation into email HTML.
 * Candidate-supplied fields (email, archetype text) go through this.
 */
export function esc(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
