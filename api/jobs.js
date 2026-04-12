import { rateLimit, cors } from "./_lib/auth.js";

// In-memory cache — persists across warm serverless invocations
let cache = { jobs: null, timestamp: 0 };
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// OCEAN ideal profiles per job category
const CATEGORY_OCEAN = {
  "Software Development": { openness: 65, conscientiousness: 82, extraversion: 32, agreeableness: 50, neuroticism: 20 },
  "Product":              { openness: 82, conscientiousness: 65, extraversion: 78, agreeableness: 65, neuroticism: 25 },
  "Design":               { openness: 88, conscientiousness: 70, extraversion: 55, agreeableness: 80, neuroticism: 30 },
  "Data":                 { openness: 80, conscientiousness: 85, extraversion: 35, agreeableness: 52, neuroticism: 20 },
  "DevOps / Sysadmin":    { openness: 60, conscientiousness: 90, extraversion: 28, agreeableness: 45, neuroticism: 18 },
  "Cybersecurity":        { openness: 62, conscientiousness: 88, extraversion: 30, agreeableness: 48, neuroticism: 22 },
  "Customer Service":     { openness: 68, conscientiousness: 72, extraversion: 82, agreeableness: 85, neuroticism: 32 },
  "Sales":                { openness: 72, conscientiousness: 68, extraversion: 90, agreeableness: 68, neuroticism: 30 },
  "Marketing":            { openness: 80, conscientiousness: 68, extraversion: 75, agreeableness: 65, neuroticism: 28 },
  "Writing":              { openness: 88, conscientiousness: 72, extraversion: 45, agreeableness: 68, neuroticism: 28 },
  "HR":                   { openness: 70, conscientiousness: 78, extraversion: 72, agreeableness: 85, neuroticism: 30 },
  "Management":           { openness: 75, conscientiousness: 75, extraversion: 82, agreeableness: 70, neuroticism: 22 },
  "QA":                   { openness: 58, conscientiousness: 90, extraversion: 32, agreeableness: 55, neuroticism: 20 },
  "Finance / Legal":      { openness: 58, conscientiousness: 90, extraversion: 42, agreeableness: 55, neuroticism: 22 },
};

// Tech categories passed through to AI scoring — all others dropped before Claude sees them
const TECH_CATEGORIES = new Set([
  "Software Development", "Data", "DevOps / Sysadmin", "Product", "QA", "Design", "Cybersecurity",
]);

function stripHtml(html) {
  return (html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
}

function inferCategory(title, tags) {
  const combined = (title + " " + tags.join(" ")).toLowerCase();
  if (/\b(cyber|security|infosec|penetration|pentest|\bsoc\b|\bsiem\b|threat|vulnerability|firewall|\bcissp\b|\bciso\b|zero.trust)\b/.test(combined)) return "Cybersecurity";
  if (/\b(engineer|developer|programmer|frontend|backend|fullstack|full.stack|react|node|python|java|rails|php|ios|android|mobile|software)\b/.test(combined)) return "Software Development";
  if (/\b(product manager|product owner|\bpm\b|roadmap|product lead)\b/.test(combined)) return "Product";
  if (/\b(design|ux\b|ui\b|figma|visual|brand|creative|illustrat)\b/.test(combined)) return "Design";
  if (/\b(data|analyst|analytics|machine learning|\bml\b|\bai\b|scientist|\bbi\b|tableau|\bsql\b|data engineer)\b/.test(combined)) return "Data";
  if (/\b(devops|sre\b|platform|infrastructure|cloud|kubernetes|docker|\baws\b|\bgcp\b|azure|sysadmin|reliability)\b/.test(combined)) return "DevOps / Sysadmin";
  if (/\b(customer success|customer service|support|helpdesk|\bcx\b)\b/.test(combined)) return "Customer Service";
  if (/\b(sales|account executive|\bae\b|\bbdr\b|\bsdr\b|business development)\b/.test(combined)) return "Sales";
  if (/\b(marketing|seo\b|sem\b|growth|content strateg|demand gen|paid media)\b/.test(combined)) return "Marketing";
  if (/\b(writer|writing|content|copywriter|editor|journalist)\b/.test(combined)) return "Writing";
  if (/\b(recruiter|\bhr\b|human resources|talent|people ops|people operations)\b/.test(combined)) return "HR";
  if (/\b(manager|director|\bvp\b|head of|chief|\bcto\b|\bcpo\b|\bcoo\b)\b/.test(combined)) return "Management";
  if (/\b(qa\b|quality assurance|tester|testing|automation test)\b/.test(combined)) return "QA";
  if (/\b(finance|legal|accounting|compliance|counsel|attorney|controller)\b/.test(combined)) return "Finance / Legal";
  return null;
}

// ── Normalizers ───────────────────────────────────────────────────────────────

function normalizeRemotive(job) {
  return {
    id: `rm_${job.id}`,
    url: job.url,
    title: job.title,
    company_name: job.company_name,
    company_logo: job.company_logo || null,
    category: job.category || null,
    tags: (job.tags || []).slice(0, 4),
    job_type: job.job_type || null,
    location: job.candidate_required_location || "Remote",
    salary: job.salary || null,
    postedAt: job.publication_date || null,
    description: stripHtml(job.description),
    source: "Remotive",
  };
}

function normalizeArbeitnow(job) {
  const category = inferCategory(job.title, job.tags || []);
  return {
    id: `an_${job.slug}`,
    url: job.url,
    title: job.title,
    company_name: job.company_name,
    company_logo: null,
    category,
    tags: (job.tags || []).slice(0, 4),
    job_type: (job.job_types || [])[0] || null,
    location: job.remote ? "Remote" : (job.location || "Remote"),
    salary: null,
    postedAt: job.created_at ? new Date(job.created_at * 1000).toISOString() : null,
    description: stripHtml(job.description),
    source: "Arbeitnow",
  };
}

function normalizeMuse(job) {
  const tags = (job.categories || []).map(c => c.name);
  const category = inferCategory(job.name || "", tags);
  const locationNames = (job.locations || []).map(l => l.name).filter(Boolean);
  const isRemote = locationNames.some(l => /remote|flexible/i.test(l));
  const location = isRemote ? "Remote" : (locationNames[0] || "Remote");
  return {
    id: `mu_${job.id}`,
    url: job.refs?.landing_page || null,
    title: job.name || "",
    company_name: job.company?.name || "",
    company_logo: null,
    category,
    tags: tags.slice(0, 4),
    job_type: job.type || null,
    location,
    salary: null,
    postedAt: job.publication_date || null,
    description: stripHtml(job.contents),
    source: "The Muse",
  };
}

function normalizeFindwork(job) {
  const tags = (job.keywords || []).slice(0, 4);
  const category = inferCategory(job.role || "", tags);
  return {
    id: `fw_${job.id}`,
    url: job.url,
    title: job.role || "",
    company_name: job.company_name || "",
    company_logo: job.logo || null,
    category,
    tags,
    job_type: job.employment_type || null,
    location: job.remote ? "Remote" : (job.location || "Remote"),
    salary: null,
    postedAt: job.date_posted || null,
    description: stripHtml(job.text),
    source: "Findwork",
  };
}

function dedupKey(job) {
  return `${job.title}|${job.company_name}`.toLowerCase().replace(/\s+/g, " ").trim();
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

const ALLOWED_JOB_DOMAINS = ["remotive.com", "www.arbeitnow.com", "www.themuse.com", "findwork.dev", "api.anthropic.com"];

async function fetchWithTimeout(url, ms = 7000) {
  // SSRF protection: only allow whitelisted domains
  const hostname = new URL(url).hostname;
  if (!ALLOWED_JOB_DOMAINS.includes(hostname)) {
    console.error(`Blocked fetch to non-whitelisted domain: ${hostname}`);
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const r = await fetch(url, { signal: controller.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAllJobs() {
  const findworkKey = process.env.FINDWORK_API_KEY;

  const fetches = [
    fetchWithTimeout("https://remotive.com/api/remote-jobs?category=software-dev&limit=50"),
    fetchWithTimeout("https://remotive.com/api/remote-jobs?category=product&limit=30"),
    fetchWithTimeout("https://www.arbeitnow.com/api/job-board-api"),
    fetchWithTimeout("https://www.themuse.com/api/public/jobs?page=0&limit=30&category=Software%20Engineer"),
    fetchWithTimeout("https://www.themuse.com/api/public/jobs?page=0&limit=20&category=Data%20Science"),
    fetchWithTimeout("https://www.themuse.com/api/public/jobs?page=0&limit=20&category=IT"),
    findworkKey
      ? (async () => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 7000);
          try {
            const r = await fetch("https://findwork.dev/api/jobs/?format=json&remote=true&limit=50", {
              headers: { "Authorization": `Token ${findworkKey}` },
              signal: controller.signal,
            });
            return r.ok ? await r.json() : null;
          } catch { return null; } finally { clearTimeout(timer); }
        })()
      : Promise.resolve(null),
  ];

  const [remSwDev, remProduct, arbeitnow, museEng, museData, museIT, findwork] =
    await Promise.allSettled(fetches);

  const normalized = [];

  // Remotive
  for (const r of [remSwDev, remProduct]) {
    if (r.status === "fulfilled" && r.value?.jobs) {
      for (const job of r.value.jobs) normalized.push(normalizeRemotive(job));
    }
  }

  // Arbeitnow
  if (arbeitnow.status === "fulfilled" && arbeitnow.value?.data) {
    for (const job of arbeitnow.value.data) normalized.push(normalizeArbeitnow(job));
  }

  // The Muse
  for (const r of [museEng, museData, museIT]) {
    if (r.status === "fulfilled" && r.value?.results) {
      for (const job of r.value.results) normalized.push(normalizeMuse(job));
    }
  }

  // Findwork.dev
  if (findwork.status === "fulfilled" && findwork.value?.results) {
    for (const job of findwork.value.results) normalized.push(normalizeFindwork(job));
  }

  const counts = {
    remotive: normalized.filter(j => j.source === "Remotive").length,
    arbeitnow: normalized.filter(j => j.source === "Arbeitnow").length,
    muse: normalized.filter(j => j.source === "The Muse").length,
    findwork: normalized.filter(j => j.source === "Findwork").length,
  };
  console.log("Job board counts:", counts);

  // Deduplicate by title+company — first source seen wins (Remotive has priority)
  const seen = new Set();
  return normalized.filter(job => {
    const key = dedupKey(job);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Location/preference filtering ────────────────────────────────────────────

function isRemoteJob(location) {
  if (!location) return true;
  return /remote|anywhere|worldwide|global|no office|distributed/i.test(location);
}

function locationOverlaps(candidateLocation, jobLocation) {
  if (!candidateLocation || !jobLocation) return true;
  const cLoc = candidateLocation.toLowerCase();
  const jLoc = jobLocation.toLowerCase();
  const country = cLoc.split(/,\s*/).pop().trim();
  return jLoc.includes(country) || cLoc.includes(jLoc) || jLoc.includes("worldwide") || jLoc.includes("anywhere");
}

function prefilterByPreference(jobs, workPreference, candidateLocation) {
  if (!workPreference || workPreference === "open") return jobs;
  if (workPreference === "remote")  return jobs.filter(j => isRemoteJob(j.location));
  if (workPreference === "onsite")  return jobs.filter(j => !isRemoteJob(j.location) && locationOverlaps(candidateLocation, j.location));
  if (workPreference === "hybrid")  return jobs.filter(j => isRemoteJob(j.location) || locationOverlaps(candidateLocation, j.location));
  return jobs;
}

// ── AI scoring ────────────────────────────────────────────────────────────────

async function scoreWithAI(candidate, jobs) {
  const { ocean, archetype, operatingStyle, location, workPreference, resumeData } = candidate;

  // Drop non-tech roles
  const techJobs = jobs.filter(j => !j.category || TECH_CATEGORIES.has(j.category));

  // Apply work preference + location filter
  const filteredJobs = prefilterByPreference(techJobs, workPreference, location);
  if (filteredJobs.length === 0) return [];

  // Cap at 80 jobs to keep Claude prompt manageable
  const jobsToScore = filteredJobs.slice(0, 80);

  const jobList = jobsToScore
    .map(j => `ID:${j.id} | ${j.title} at ${j.company_name} [${j.location || "Remote"}] | ${j.description || j.title}`)
    .join("\n");

  const locationLine = location ? `Location: ${location}` : "";
  const prefLine = workPreference ? `Work preference: ${workPreference}` : "";
  const resumeLine = resumeData
    ? `Background: ${resumeData.currentTitle || ""}, ${resumeData.yearsExperience ?? "?"} yrs exp, ${resumeData.industry || ""}, skills: ${(resumeData.skills || []).slice(0, 5).join(", ")}`
    : "";

  const prompt = `You are scoring job listings for a specific candidate. Return ONLY a JSON array, no explanation, no markdown.

CANDIDATE PROFILE:
Archetype: ${archetype}
Operating style: ${operatingStyle}
OCEAN scores (0-100): Openness ${ocean.openness}, Conscientiousness ${ocean.conscientiousness}, Extraversion ${ocean.extraversion}, Agreeableness ${ocean.agreeableness}, Neuroticism ${ocean.neuroticism}
${locationLine}
${prefLine}
${resumeLine}

INSTRUCTIONS:
- Score each job 0–100 for personality and role fit against this specific candidate
- Use the job title and description semantically: consider day-to-day work, autonomy, pace, collaboration level, and structure implied
- Include ONLY jobs scoring 70 or above
- Exclude any non-tech role (pure sales, marketing, HR, finance, legal, customer support — unless clearly tech-adjacent)
- If a work preference is specified, down-score jobs that conflict with it

JOBS TO SCORE:
${jobList}

Respond with ONLY this JSON (no extra text):
[{"id":"rm_123","score":85},{"id":"an_abc","score":72}]`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`Claude API ${response.status}`);

  const data = await response.json();
  const text = data.content?.[0]?.text || "[]";
  const match = text.match(/\[[\s\S]*\]/);
  const scores = match ? JSON.parse(match[0]) : [];

  const scoreMap = new Map(scores.map(s => [s.id, s.score]));

  return jobsToScore
    .filter(j => scoreMap.has(j.id))
    .map(j => ({
      id: j.id,
      url: j.url,
      title: j.title,
      company: j.company_name,
      logo: j.company_logo,
      category: j.category,
      tags: j.tags,
      jobType: j.job_type,
      location: j.location,
      salary: j.salary,
      postedAt: j.postedAt,
      source: j.source || null,
      matchScore: scoreMap.get(j.id),
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 6);
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Rate limit: 100 job searches per IP per day
  if (rateLimit(req, res, "jobs", 100, 86_400_000)) return;

  const { ocean, archetype, operatingStyle, location, workPreference, resumeData } = req.body || {};

  if (!ocean || !archetype) {
    return res.status(400).json({ error: "Missing candidate profile" });
  }

  try {
    if (!cache.jobs || Date.now() - cache.timestamp > CACHE_TTL) {
      console.log("Fetching fresh jobs from Remotive, Arbeitnow, The Muse, Findwork...");
      cache.jobs = await fetchAllJobs();
      cache.timestamp = Date.now();
      console.log(`Cached ${cache.jobs.length} jobs`);
    }

    const results = await scoreWithAI({ ocean, archetype, operatingStyle, location, workPreference, resumeData: resumeData || null }, cache.jobs);

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(results);
  } catch (err) {
    console.error("jobs error:", err);
    return res.status(500).json({ error: err.message });
  }
}
