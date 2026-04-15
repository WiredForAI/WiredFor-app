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
  const t = (title || "").toLowerCase();
  const combined = (t + " " + (tags || []).join(" ")).toLowerCase();

  // Security first — "security engineer" should be Security not Engineering
  if (/\b(cyber|security|infosec|penetration|pentest|\bsoc\b|\bsiem\b|threat|vulnerability|firewall|\bcissp\b|\bciso\b|zero.trust|appsec)\b/.test(combined)) return "Cybersecurity";

  // Data — "data engineer" should be Data not Engineering
  if (/\b(data.scientist|data.engineer|data.analyst|machine.learning|\bml\b|deep.learning|\bai\b.engineer|analytics.engineer|\bbi\b.engineer|tableau|\bsql\b.developer)\b/.test(combined)) return "Data";
  if (/\b(data|analyst|analytics|machine learning|\bml\b|scientist|\bbi\b)\b/.test(t)) return "Data";

  // DevOps — "platform engineer" should be DevOps not Engineering
  if (/\b(devops|sre\b|site.reliability|platform.engineer|infrastructure|cloud.engineer|kubernetes|docker|\baws\b.engineer|\bgcp\b|azure.engineer|sysadmin|reliability)\b/.test(combined)) return "DevOps / Sysadmin";

  // Product
  if (/\b(product.manager|product.owner|product.lead|product.director|head.of.product|\bcpo\b)\b/.test(combined)) return "Product";
  if (/\bproduct\b/.test(t) && /\b(manager|owner|lead|director|head)\b/.test(t)) return "Product";

  // Design
  if (/\b(designer|ux\b|ui\b|ux.ui|figma|visual.design|brand.design|creative.director|interaction.design|product.design)\b/.test(combined)) return "Design";

  // QA
  if (/\b(qa\b|quality.assurance|test.engineer|sdet|automation.test|quality.engineer)\b/.test(combined)) return "QA";

  // Engineering — broadest match, checked after more specific categories
  if (/\b(engineer|developer|programmer|frontend|front.end|backend|back.end|fullstack|full.stack|react|node\.js|python|java|golang|rust|rails|php|ios|android|mobile|software|architect|tech.lead|cto\b|svelte|vue|angular|typescript|\.net)\b/.test(combined)) return "Software Development";

  // Non-tech categories
  if (/\b(customer success|customer service|support|helpdesk|\bcx\b)\b/.test(combined)) return "Customer Service";
  if (/\b(sales|account executive|\bae\b|\bbdr\b|\bsdr\b|business development)\b/.test(combined)) return "Sales";
  if (/\b(marketing|seo\b|sem\b|growth|content strateg|demand gen|paid media)\b/.test(combined)) return "Marketing";
  if (/\b(writer|writing|content|copywriter|editor|journalist)\b/.test(combined)) return "Writing";
  if (/\b(recruiter|\bhr\b|human resources|talent|people ops|people operations)\b/.test(combined)) return "HR";
  if (/\b(manager|director|\bvp\b|head of|chief)\b/.test(combined)) return "Management";
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

function normalizeRemoteOK(job) {
  const tags = (job.tags || []).slice(0, 4);
  const category = inferCategory(job.position || "", tags);
  return {
    id: `rok_${job.id}`,
    url: job.url || `https://remoteok.com/remote-jobs/${job.id}`,
    title: job.position || "",
    company_name: job.company || "",
    company_logo: job.company_logo || job.logo || null,
    category,
    tags,
    job_type: "full_time",
    location: job.location || "Remote",
    salary: job.salary_min && job.salary_max ? `$${job.salary_min}–$${job.salary_max}` : null,
    postedAt: job.date ? new Date(job.date).toISOString() : null,
    description: stripHtml(job.description),
    source: "RemoteOK",
  };
}

// Non-US country indicators — if location matches any of these, exclude the job
const NON_US_PATTERN = /\b(germany|deutschland|berlin|munich|frankfurt|hamburg|dach|europe|european|uk\b|united kingdom|london|manchester|france|paris|spain|madrid|barcelona|italy|netherlands|amsterdam|sweden|stockholm|norway|denmark|copenhagen|finland|helsinki|switzerland|zurich|austria|vienna|poland|warsaw|portugal|lisbon|ireland|dublin|belgium|czech|romania|hungary|greece|croatia|serbia|bulgaria|india|bangalore|mumbai|hyderabad|delhi|chennai|pune|china|beijing|shanghai|japan|tokyo|korea|seoul|singapore|hong kong|taiwan|philippines|manila|vietnam|indonesia|jakarta|malaysia|kuala lumpur|thailand|bangkok|brazil|s[aã]o paulo|mexico|colombia|bogot[aá]|argentina|buenos aires|chile|santiago|nigeria|lagos|kenya|nairobi|south africa|cape town|egypt|cairo|australia|sydney|melbourne|new zealand|auckland)\b/i;

const US_POSITIVE = /\b(usa|united states|us\b|u\.s\.|north america|new york|san francisco|los angeles|seattle|austin|boston|chicago|denver|atlanta|miami|dallas|houston|portland|remote.us|remote,.us)\b/i;

/**
 * Returns true if the job appears US-based or truly worldwide remote.
 */
function isUSOrWorldwide(job) {
  const loc = (job.location || "").toLowerCase();
  // Explicitly US
  if (US_POSITIVE.test(loc)) return true;
  // Generic remote with no country restriction
  if (/^remote$/i.test(loc.trim())) return true;
  if (/worldwide|anywhere|global/i.test(loc)) return true;
  // Check for non-US countries
  if (NON_US_PATTERN.test(loc)) return false;
  // Check tags for location hints
  const tagStr = (job.tags || []).join(" ").toLowerCase();
  if (US_POSITIVE.test(tagStr)) return true;
  if (NON_US_PATTERN.test(tagStr)) return false;
  // No location info — assume OK
  return true;
}

function dedupKey(job) {
  return `${job.title}|${job.company_name}`.toLowerCase().replace(/\s+/g, " ").trim();
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

const ALLOWED_JOB_DOMAINS = ["remotive.com", "findwork.dev", "remoteok.com", "api.anthropic.com"];

async function fetchWithTimeout(url, opts = {}, ms = 7000) {
  const hostname = new URL(url).hostname;
  if (!ALLOWED_JOB_DOMAINS.includes(hostname)) {
    console.error(`Blocked fetch to non-whitelisted domain: ${hostname}`);
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const r = await fetch(url, { ...opts, signal: controller.signal });
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
    fetchWithTimeout("https://remoteok.com/api", { headers: { "User-Agent": "WiredFor.ai/1.0" } }),
    findworkKey
      ? fetchWithTimeout("https://findwork.dev/api/jobs/?format=json&remote=true&limit=50", { headers: { "Authorization": `Token ${findworkKey}` } })
      : Promise.resolve(null),
  ];

  const [remSwDev, remProduct, remoteok, findwork] =
    await Promise.allSettled(fetches);

  const normalized = [];

  // Remotive
  for (const r of [remSwDev, remProduct]) {
    if (r.status === "fulfilled" && r.value?.jobs) {
      for (const job of r.value.jobs) normalized.push(normalizeRemotive(job));
    }
  }

  // RemoteOK — response is an array, first element is metadata
  if (remoteok.status === "fulfilled" && Array.isArray(remoteok.value)) {
    for (const job of remoteok.value) {
      if (job.id && job.position) normalized.push(normalizeRemoteOK(job));
    }
  }

  // Findwork.dev
  if (findwork.status === "fulfilled" && findwork.value?.results) {
    for (const job of findwork.value.results) normalized.push(normalizeFindwork(job));
  }

  const counts = {
    remotive: normalized.filter(j => j.source === "Remotive").length,
    remoteok: normalized.filter(j => j.source === "RemoteOK").length,
    findwork: normalized.filter(j => j.source === "Findwork").length,
  };
  console.log("Job board counts:", counts);

  // Deduplicate by title+company
  const seen = new Set();
  const deduped = normalized.filter(job => {
    const key = dedupKey(job);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Filter to US-based or worldwide remote only
  const usFiltered = deduped.filter(isUSOrWorldwide);
  console.log(`US/worldwide filter: ${deduped.length} → ${usFiltered.length}`);
  return usFiltered;
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

// ── Quick category-based match scoring (no AI) ──────────────────────────────

function quickMatchScore(ocean, job) {
  const ideal = CATEGORY_OCEAN[job.category];
  if (!ideal || !ocean) return null;
  const traits = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"];
  let totalDiff = 0;
  for (const t of traits) {
    totalDiff += Math.abs((ocean[t] || 50) - (ideal[t] || 50));
  }
  // Max possible diff = 500 (5 traits * 100). Convert to 0-100 score.
  return Math.round(Math.max(0, 100 - (totalDiff / 5) * 1.2));
}

// ── AI scoring ────────────────────────────────────────────────────────────────

async function scoreWithAI(candidate, jobs) {
  const { ocean, archetype, operatingStyle, location, workPreference, resumeData } = candidate;

  const techJobs = jobs.filter(j => !j.category || TECH_CATEGORIES.has(j.category));
  const filteredJobs = prefilterByPreference(techJobs, workPreference, location);
  if (filteredJobs.length === 0) return [];

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

  // Rate limit: 100 job searches per IP per day
  if (rateLimit(req, res, "jobs", 100, 86_400_000)) return;

  // Ensure cache is fresh
  if (!cache.jobs || Date.now() - cache.timestamp > CACHE_TTL) {
    console.log("Fetching fresh jobs from Remotive, RemoteOK, Findwork...");
    cache.jobs = await fetchAllJobs();
    cache.timestamp = Date.now();
    console.log(`Cached ${cache.jobs.length} jobs`);
  }

  // ── GET: public jobs listing (no auth required) ───────────────────────────
  if (req.method === "GET") {
    const { q, category, workType } = req.query;

    let jobs = cache.jobs.filter(j => !j.category || TECH_CATEGORIES.has(j.category));

    // Search filter
    if (q) {
      const query = q.toLowerCase();
      jobs = jobs.filter(j =>
        j.title.toLowerCase().includes(query) ||
        j.company_name.toLowerCase().includes(query) ||
        (j.tags || []).some(t => t.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (category && category !== "all") {
      jobs = jobs.filter(j => j.category === category);
    }

    // Work type filter
    if (workType === "remote") {
      jobs = jobs.filter(j => isRemoteJob(j.location));
    } else if (workType === "onsite") {
      jobs = jobs.filter(j => !isRemoteJob(j.location));
    }

    // Add quick match scores if ocean is provided via query
    const oceanParam = req.query.ocean;
    let ocean = null;
    if (oceanParam) {
      try { ocean = JSON.parse(oceanParam); } catch {}
    }

    const results = jobs.slice(0, 100).map(j => ({
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
      source: j.source,
      description: j.description,
      matchScore: ocean ? quickMatchScore(ocean, j) : null,
    }));

    // Sort by match score if available, otherwise by date
    if (ocean) {
      results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    } else {
      results.sort((a, b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0));
    }

    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=300");
    return res.status(200).json({ jobs: results, total: jobs.length });
  }

  // ── POST: AI-scored personalized matches (existing behavior) ──────────────
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { ocean, archetype, operatingStyle, location, workPreference, resumeData } = req.body || {};

  if (!ocean || !archetype) {
    return res.status(400).json({ error: "Missing candidate profile" });
  }

  try {
    const results = await scoreWithAI({ ocean, archetype, operatingStyle, location, workPreference, resumeData: resumeData || null }, cache.jobs);

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(results);
  } catch (err) {
    console.error("jobs error:", err);
    return res.status(500).json({ error: err.message });
  }
}
