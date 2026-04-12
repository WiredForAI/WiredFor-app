import { createClient } from "@supabase/supabase-js";

// Service-role client for admin operations
export const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "https://wiredfor.ai",
  "https://www.wiredfor.ai",
];

/**
 * Check CORS origin and set headers. Returns true if the request should be
 * blocked (response already sent), false if OK to proceed.
 * Allows same-origin requests (no Origin header) for Vercel serverless.
 */
export function cors(req, res) {
  const origin = req.headers.origin;

  // Preflight
  if (req.method === "OPTIONS") {
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
      res.setHeader("Access-Control-Max-Age", "86400");
    }
    res.status(204).end();
    return true;
  }

  // Same-origin requests from Vercel don't send Origin header — allow them
  if (!origin) return false;

  if (!ALLOWED_ORIGINS.includes(origin)) {
    res.status(403).json({ error: "Origin not allowed" });
    return true;
  }

  res.setHeader("Access-Control-Allow-Origin", origin);
  return false;
}

// ── Input validation helpers ─────────────────────────────────────────────────

const DANGEROUS_PATTERN = /<script[\s>]|<\/script>|javascript:|on\w+\s*=|'\s*or\s+'|'\s*;\s*drop\s+|union\s+select|--\s*$/i;

/**
 * Check a string for script tags, event handlers, and SQL injection patterns.
 * Returns true if dangerous content is detected.
 */
export function hasDangerousContent(value) {
  if (typeof value !== "string") return false;
  return DANGEROUS_PATTERN.test(value);
}

/**
 * Recursively check all string values in an object for dangerous content.
 * Returns the first dangerous value found, or null if clean.
 */
export function findDangerousContent(obj) {
  if (typeof obj === "string") return hasDangerousContent(obj) ? obj : null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findDangerousContent(item);
      if (found) return found;
    }
  }
  if (obj && typeof obj === "object") {
    for (const val of Object.values(obj)) {
      const found = findDangerousContent(val);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Validate OCEAN scores object — all values must be numbers 0–100.
 * Returns an error string or null if valid.
 */
export function validateOcean(ocean) {
  if (!ocean || typeof ocean !== "object") return "Missing OCEAN scores";
  const traits = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"];
  for (const t of traits) {
    const v = ocean[t];
    if (typeof v !== "number" || v < 0 || v > 100 || !Number.isFinite(v)) {
      return `Invalid OCEAN score for ${t}: must be a number 0–100`;
    }
  }
  return null;
}

/**
 * Validate an email address format.
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Verify the caller's Supabase auth token from the Authorization header.
 * Returns the authenticated user or null.
 */
export async function getAuthUser(req) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

/**
 * Verify the caller is the admin user.
 */
export async function requireAdmin(req, res) {
  const user = await getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  if (user.email !== process.env.ADMIN_EMAIL) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }
  return user;
}

// ── Simple in-memory rate limiter ────────────────────────────────────────────
const buckets = new Map();
const CLEANUP_INTERVAL = 60_000;

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now - entry.windowStart > entry.windowMs) buckets.delete(key);
  }
}, CLEANUP_INTERVAL);

/**
 * Rate limit by IP.
 * @param {object} req
 * @param {object} res
 * @param {string} prefix - namespace for this limiter (e.g. "assess", "api")
 * @param {number} maxRequests
 * @param {number} windowMs - window in milliseconds
 * @returns {boolean} true if rate limited (response already sent), false if OK
 */
export function rateLimit(req, res, prefix, maxRequests, windowMs) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    || req.headers["x-real-ip"]
    || req.socket?.remoteAddress
    || "unknown";
  const key = `${prefix}:${ip}`;
  const now = Date.now();

  let entry = buckets.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    entry = { count: 0, windowStart: now, windowMs };
    buckets.set(key, entry);
  }

  entry.count++;
  if (entry.count > maxRequests) {
    res.status(429).json({ error: "Too many requests. Please try again later." });
    return true;
  }
  return false;
}
