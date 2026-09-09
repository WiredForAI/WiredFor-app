// Static legal pages: /privacy and /terms.
// Content reflects WiredFor.ai's actual data flow (Supabase storage + auth,
// Anthropic Claude for assessment analysis, Google OAuth, Resend email,
// Vercel hosting/analytics, and employer introductions). Plain SPA routes —
// no auth, no data fetching.

const LAST_UPDATED = "September 9, 2026";
const CONTACT_EMAIL = "hello@wiredfor.ai";

const legalStyles = `
  .legal-page {
    min-height: 100dvh;
    background: #FFFFFF;
    color: #1A1A1A;
    font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
    line-height: 1.7;
  }
  .legal-header {
    border-bottom: 1px solid rgba(0,0,0,0.08);
    padding: 20px 24px;
  }
  .legal-header a {
    color: #0A0A0A;
    text-decoration: none;
    font-weight: 700;
    font-size: 18px;
    letter-spacing: -0.02em;
  }
  .legal-header a span { color: #00C4A8; }
  .legal-wrap { max-width: 760px; margin: 0 auto; padding: 48px 24px 80px; }
  .legal-eyebrow {
    font-size: 11px; letter-spacing: 3px; text-transform: uppercase;
    color: #00C4A8; margin-bottom: 12px;
  }
  .legal-wrap h1 {
    font-family: 'DM Serif Display', Georgia, serif;
    font-weight: 400; font-size: 40px; line-height: 1.15;
    margin: 0 0 8px; color: #0A0A0A;
  }
  .legal-updated { color: #8A8A8A; font-size: 14px; margin: 0 0 40px; }
  .legal-wrap h2 {
    font-size: 20px; font-weight: 700; color: #0A0A0A;
    margin: 40px 0 12px;
  }
  .legal-wrap p, .legal-wrap li { font-size: 15px; color: #333; }
  .legal-wrap ul { padding-left: 22px; margin: 12px 0; }
  .legal-wrap li { margin-bottom: 8px; }
  .legal-wrap a { color: #00A98F; }
  .legal-intro {
    background: #F7F7F5; border: 1px solid rgba(0,0,0,0.06);
    border-radius: 12px; padding: 18px 20px; margin-bottom: 8px;
  }
  .legal-footer {
    border-top: 1px solid rgba(0,0,0,0.08); margin-top: 56px;
    padding-top: 24px; font-size: 13px; color: #8A8A8A;
  }
  .legal-footer a { color: #00A98F; text-decoration: none; }
  @media (prefers-color-scheme: dark) {
    .legal-page { background: #0A0A0A; color: #E8E8E8; }
    .legal-header { border-color: rgba(255,255,255,0.10); }
    .legal-header a { color: #FFFFFF; }
    .legal-wrap h1, .legal-wrap h2 { color: #FFFFFF; }
    .legal-wrap p, .legal-wrap li { color: #C8C8C8; }
    .legal-intro { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); }
    .legal-footer { border-color: rgba(255,255,255,0.10); }
  }
`;

function Privacy() {
  return (
    <>
      <div className="legal-eyebrow">Legal</div>
      <h1>Privacy Policy</h1>
      <p className="legal-updated">Last updated: {LAST_UPDATED}</p>

      <p className="legal-intro">
        WiredFor.ai (&ldquo;WiredFor.ai&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) helps people understand how they&rsquo;re
        wired for work and matches them to roles. This policy explains what we collect, how we use it,
        and the choices you have.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li><strong>Assessment responses.</strong> Your answers to the assessment questions, and the results we derive from them &mdash; your Big Five (OCEAN) scores, archetype, suggested roles, and related insights.</li>
        <li><strong>Account information.</strong> Your email address, and if you sign in with Google, your name and profile picture. If you create a password account, we store your credentials securely through our authentication provider.</li>
        <li><strong>Profile details you provide.</strong> Optional information such as your location, work preference, and any resume you choose to upload for analysis.</li>
        <li><strong>Usage data.</strong> Basic analytics about how you use the site (pages viewed, events like starting or completing the assessment), collected to improve the product.</li>
      </ul>

      <h2>How we use your information</h2>
      <ul>
        <li>To generate and display your personality profile and career matches.</li>
        <li>To save your results and tie them to your WiredFor ID so you can return to them.</li>
        <li>To connect you with employers when you are matched to a role and an introduction is made (see below).</li>
        <li>To send you transactional emails, such as sign-in links and account notifications.</li>
        <li>To operate, secure, and improve the service.</li>
      </ul>

      <h2>Service providers</h2>
      <p>We share data with a small number of providers strictly to run the service:</p>
      <ul>
        <li><strong>Supabase</strong> &mdash; database and authentication (stores your account and profile data).</li>
        <li><strong>Anthropic (Claude)</strong> &mdash; analyzes your assessment responses to produce your results. Your answers are sent to Anthropic&rsquo;s API for this purpose.</li>
        <li><strong>Google</strong> &mdash; optional &ldquo;Sign in with Google&rdquo; authentication.</li>
        <li><strong>Resend</strong> &mdash; delivery of transactional email.</li>
        <li><strong>Vercel</strong> &mdash; hosting and web analytics; <strong>Google Analytics</strong> &mdash; usage analytics.</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>Sharing with employers</h2>
      <p>
        WiredFor.ai is a matching service. When you are matched to a role and an introduction is
        requested, we may share your profile &mdash; including your archetype, OCEAN results, and the
        details you&rsquo;ve provided &mdash; with the relevant employer so they can evaluate fit and contact
        you. You control whether to complete the steps that lead to an introduction.
      </p>

      <h2>Data retention</h2>
      <p>
        We keep your profile for as long as your account is active. You can ask us to access, correct,
        or delete your data at any time by emailing <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        We will delete your data within a reasonable period of a verified request, except where we must
        retain it to meet legal obligations.
      </p>

      <h2>Security</h2>
      <p>
        We use reputable providers and standard safeguards to protect your data in transit and at rest.
        No method of transmission or storage is completely secure, so we cannot guarantee absolute security.
      </p>

      <h2>Children</h2>
      <p>WiredFor.ai is not directed to children under 16, and we do not knowingly collect their data.</p>

      <h2>Changes</h2>
      <p>We may update this policy from time to time. Material changes will be reflected by the &ldquo;Last updated&rdquo; date above.</p>

      <h2>Contact</h2>
      <p>Questions about this policy or your data? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </>
  );
}

function Terms() {
  return (
    <>
      <div className="legal-eyebrow">Legal</div>
      <h1>Terms of Service</h1>
      <p className="legal-updated">Last updated: {LAST_UPDATED}</p>

      <p className="legal-intro">
        These terms govern your use of WiredFor.ai. By using the site, you agree to them. If you don&rsquo;t
        agree, please don&rsquo;t use the service.
      </p>

      <h2>The service</h2>
      <p>
        WiredFor.ai provides a personality-based assessment and career-matching service. We may change,
        suspend, or discontinue features at any time.
      </p>

      <h2>Eligibility</h2>
      <p>You must be at least 16 years old (or the age of majority in your location) to use WiredFor.ai.</p>

      <h2>Your account</h2>
      <p>
        You&rsquo;re responsible for the accuracy of the information you provide and for activity under your
        account. Keep your sign-in method secure.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Don&rsquo;t misuse the service, attempt to disrupt it, or access it in unauthorized ways.</li>
        <li>Don&rsquo;t submit content that is unlawful, harmful, or that infringes others&rsquo; rights.</li>
        <li>Provide honest responses &mdash; the value of your results depends on it.</li>
      </ul>

      <h2>About your results</h2>
      <p>
        Your assessment results are provided for informational and self-reflection purposes. They are not
        professional psychological, medical, legal, or career advice, and they are not guarantees of any
        outcome, job, or hire. Use your own judgment when making decisions.
      </p>

      <h2>Intellectual property</h2>
      <p>
        The WiredFor.ai site, brand, and the assessment framework are our property. Your individual
        results are yours to use. Don&rsquo;t copy or resell the service or its content.
      </p>

      <h2>Third-party services</h2>
      <p>
        The service relies on third parties (such as authentication and analysis providers). Your use of
        those features may also be subject to their terms.
      </p>

      <h2>Disclaimers &amp; limitation of liability</h2>
      <p>
        The service is provided &ldquo;as is&rdquo; without warranties of any kind. To the fullest extent permitted
        by law, WiredFor.ai is not liable for indirect, incidental, or consequential damages arising from
        your use of the service.
      </p>

      <h2>Termination</h2>
      <p>We may suspend or terminate access if these terms are violated. You can stop using the service at any time.</p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of the State of Texas, United States, without regard to conflict-of-law rules.</p>

      <h2>Changes</h2>
      <p>We may update these terms; the &ldquo;Last updated&rdquo; date above reflects the latest version.</p>

      <h2>Contact</h2>
      <p>Questions? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </>
  );
}

export default function LegalPage() {
  const isTerms = window.location.pathname.startsWith("/terms");
  return (
    <div className="legal-page">
      <style>{legalStyles}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet" />
      <header className="legal-header">
        <a href="/">Wired<span>For.ai</span></a>
      </header>
      <main className="legal-wrap">
        {isTerms ? <Terms /> : <Privacy />}
        <div className="legal-footer">
          &copy; WiredFor.ai &nbsp;&middot;&nbsp;
          <a href="/privacy">Privacy</a> &nbsp;&middot;&nbsp;
          <a href="/terms">Terms</a> &nbsp;&middot;&nbsp;
          <a href="/">Home</a>
        </div>
      </main>
    </div>
  );
}
