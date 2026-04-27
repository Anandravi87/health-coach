const express = require("express");
const Anthropic = require("@anthropic-ai/sdk").default;
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());

// Load system prompt once at startup
const systemPrompt = fs.readFileSync(
  path.join(__dirname, "system_prompt.md"),
  "utf-8"
);
console.log("System prompt loaded (" + systemPrompt.length + " chars)");

// Anthropic client (reads ANTHROPIC_API_KEY from env automatically)
const client = new Anthropic();

// --- Simple rate limiter (in-memory, per IP) ---
const limits = new Map();
function checkRate(ip) {
  const now = Date.now();
  const u = limits.get(ip) || { min: [], day: [] };
  u.min = u.min.filter((t) => now - t < 60000);
  u.day = u.day.filter((t) => now - t < 86400000);
  if (u.min.length >= 3) return "Too many requests. Wait a minute.";
  if (u.day.length >= 20) return "Daily limit reached. Come back tomorrow!";
  u.min.push(now);
  u.day.push(now);
  limits.set(ip, u);
  return null;
}

// --- Serve the UI ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// --- Chat endpoint ---
app.post("/api/chat", async (req, res) => {
  try {
    // Rate limit
    const block = checkRate(req.ip);
    if (block) return res.status(429).json({ error: block });

    // Validate
    const messages = req.body.messages;
    if (!messages || !messages.length) {
      return res.status(400).json({ error: "No messages provided." });
    }
    const last = messages[messages.length - 1].content || "";
    if (last.trim().length < 1) {
      return res.status(400).json({ error: "Message is empty." });
    }
    if (last.length > 500) {
      return res.status(400).json({ error: "Keep it under 500 characters." });
    }

    // Call Claude
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: systemPrompt,
      messages: messages,
    });

    const reply = response.content[0].text;
    res.json({ reply });
  } catch (err) {
    console.error("Claude API error:", err.message);
    res.status(500).json({ error: "Something went wrong. Try again." });
  }
});

// --- Start ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Health Coach running at http://localhost:" + PORT);
});
