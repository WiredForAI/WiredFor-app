import { createClient } from "@supabase/supabase-js";

// Service-role client for admin operations
export const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
