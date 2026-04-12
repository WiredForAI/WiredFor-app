import { rateLimit, cors } from "./_lib/auth.js";

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Rate limit: 100 API calls per IP per day
  if (rateLimit(req, res, "analyze", 100, 86_400_000)) return;

  const { model, max_tokens, messages } = req.body;
  if (!messages) return res.status(400).json({ error: "Missing messages" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model || "claude-haiku-4-5-20251001",
        max_tokens: max_tokens || 1000,
        messages,
      }),
    });

    if (!response.ok) throw new Error(`Claude API ${response.status}`);

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error("analyze error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
