import { cors } from "./_lib/auth.js";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (cors(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const { email } = body;

  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email is required" });
  }

  const trimmed = email.trim().toLowerCase();

  try {
    // Generate a password reset link via Supabase admin API
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: trimmed,
      options: {
        redirectTo: "https://wiredfor.ai/reset-password",
      },
    });

    if (error) {
      console.error("[reset-password] generateLink error:", error.message);
      // Don't reveal whether the email exists — always return success
      return res.status(200).json({ success: true });
    }

    // Extract the action link and rewrite localhost if Supabase Site URL is misconfigured
    const rawLink = data?.properties?.action_link;
    if (!rawLink) {
      console.error("[reset-password] No action_link in response");
      return res.status(200).json({ success: true });
    }
    const resetUrl = rawLink.replace(/https?:\/\/localhost(:\d+)?/g, "https://wiredfor.ai");

    // Look up user_type for the email subject line
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(data.user.id);
    const userType = userData?.user?.user_metadata?.user_type || "candidate";

    const subject = "Reset your WiredFor.ai password";
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WiredFor.ai</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f2;-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f2;">
<tr><td align="center" style="padding:24px 16px;">

<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;border-collapse:collapse;">

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

  <tr>
    <td align="center" style="background-color:#ffffff;padding:12px 32px 36px;">
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:400;color:#0A0A0A;margin:0 0 16px;line-height:1.3;">
        Reset your password
      </h1>
      <p style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;line-height:1.7;color:#333333;margin:0 0 28px;max-width:440px;">
        We received a request to reset your password. Click the button below to choose a new one. If you didn't request this, you can safely ignore this email.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 32px;">
        <tr>
          <td align="center" style="background-color:#00C4A8;border-radius:10px;">
            <a href="${resetUrl}" target="_blank" style="display:inline-block;background-color:#00C4A8;color:#0A0A0A;font-family:'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px;letter-spacing:0.02em;">
              Reset Password &rarr;
            </a>
          </td>
        </tr>
      </table>
      <p style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:13px;color:#999999;line-height:1.6;margin:0;max-width:440px;">
        This link will expire in 24 hours.
      </p>
    </td>
  </tr>

  <tr>
    <td align="center" style="background-color:#f9f9f7;padding:28px 32px 24px;border-radius:0 0 12px 12px;border-top:1px solid #eeeee9;">
      <p style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#999999;line-height:1.7;margin:0 0 14px;">
        &mdash; The WiredFor.ai Team
      </p>
      <a href="https://wiredfor.ai" target="_blank" style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#00C4A8;text-decoration:none;letter-spacing:0.03em;">
        wiredfor.ai
      </a>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;

    // Send via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "hello@wiredfor.ai",
        to: trimmed,
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json().catch(() => ({}));
    console.log("[reset-password] resend result:", resendRes.status, JSON.stringify(resendData));

    if (!resendRes.ok) {
      console.error("[reset-password] Resend failed:", resendData);
    }

    // Always return success to prevent email enumeration
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[reset-password] unexpected error:", err);
    return res.status(200).json({ success: true });
  }
}
