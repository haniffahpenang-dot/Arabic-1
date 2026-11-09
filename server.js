// Quranic Arabic Tutor: a small Express server that serves the web app and
// talks to Claude on the learner's behalf (the API key never reaches the browser).
import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { surahs, getPassage } from "./src/quran.js";
import { curriculum } from "./src/curriculum.js";
import { BASE_SYSTEM_PROMPT, RESPONSE_SCHEMA, buildLessonPrompt } from "./src/prompt.js";
import { mockReply } from "./src/mock.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const MODEL = process.env.TUTOR_MODEL || "claude-opus-5-5";
// Low effort keeps spoken replies quick; raise to "medium" for more careful corrections.
const EFFORT = process.env.TUTOR_EFFORT || "low";
const MOCK = process.env.MOCK === "1" || process.argv.includes("--mock");
const APP_PASSWORD = process.env.APP_PASSWORD || "";
const MAX_HISTORY_MESSAGES = 40;
const MAX_MESSAGE_CHARS = 2000;
const MODES = ["conversation", "passage", "roots", "haraka", "grammar"];
// Server-side refusal fallback is not available for Haiku models.
const USE_FALLBACKS = !MODEL.startsWith("claude-haiku");

const client = MOCK ? null : new Anthropic();
const app = express();
app.use(express.json({ limit: "200kb" }));

// Optional password protection, for when the app is hosted on the internet.
if (APP_PASSWORD) {
  app.use((req, res, next) => {
    const [scheme, encoded] = (req.headers.authorization || "").split(" ");
    const password = scheme === "Basic" && encoded ? Buffer.from(encoded, "base64").toString().split(":").slice(1).join(":") : "";
    if (password === APP_PASSWORD) return next();
    res.set("WWW-Authenticate", 'Basic realm="Quranic Arabic Tutor"').status(401).send("Password required");
  });
}

app.use(express.static(path.join(here, "public")));

app.get("/api/meta", (_req, res) => {
  res.json({ surahs, curriculum, model: MOCK ? "mock" : MODEL, mock: MOCK });
});

app.get("/api/passage", (req, res) => {
  try {
    res.json(getPassage(Number(req.query.surah), Number(req.query.from), Number(req.query.to)));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/** Validates and normalises the conversation sent by the browser. */
function cleanMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) throw new Error("No messages.");
  let list = messages
    .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));
  list = list.slice(-MAX_HISTORY_MESSAGES);
  while (list.length && list[0].role !== "user") list.shift();
  if (!list.length || list.at(-1).role !== "user") throw new Error("The last message must come from the learner.");
  return list;
}

app.post("/api/chat", async (req, res) => {
  let messages, lessonPrompt;
  try {
    const { lesson = {} } = req.body;
    const mode = MODES.includes(lesson.mode) ? lesson.mode : "conversation";
    const passage = lesson.surah ? getPassage(Number(lesson.surah), Number(lesson.from), Number(lesson.to)) : null;
    lessonPrompt = buildLessonPrompt({
      mode,
      topic: typeof lesson.topic === "string" ? lesson.topic.slice(0, 200) : "",
      explanationLanguage: lesson.explanationLanguage === "arabic" ? "arabic" : "english",
      passage,
    });
    messages = cleanMessages(req.body.messages);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  if (MOCK) return res.json(mockReply(messages));

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      ...(USE_FALLBACKS ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" } : {}),
      cache_control: { type: "ephemeral" },
      system: [
        { type: "text", text: BASE_SYSTEM_PROMPT },
        { type: "text", text: lessonPrompt },
      ],
      messages,
      output_config: {
        effort: EFFORT,
        format: { type: "json_schema", schema: RESPONSE_SCHEMA },
      },
    });

    if (response.stop_reason === "refusal") {
      return res.status(422).json({ error: "The teacher couldn't answer that message. Please rephrase it." });
    }
    if (response.stop_reason === "max_tokens") {
      return res.status(502).json({ error: "The reply was cut off. Please try again." });
    }
    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
    const reply = JSON.parse(text);
    res.json({ reply, raw: text, usage: response.usage });
  } catch (err) {
    console.error(err);
    if (err instanceof Anthropic.AuthenticationError) {
      return res.status(500).json({ error: "The server's ANTHROPIC_API_KEY is missing or invalid." });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return res.status(429).json({ error: "Too many requests right now. Wait a moment and try again." });
    }
    if (err instanceof Anthropic.APIError) {
      return res.status(502).json({ error: `Claude API error (${err.status ?? "network"}): ${err.message}` });
    }
    if (err instanceof SyntaxError) {
      return res.status(502).json({ error: "The teacher's reply could not be read. Please try again." });
    }
    res.status(500).json({ error: "Unexpected server error." });
  }
});

app.listen(PORT, () => {
  console.log(`Quranic Arabic Tutor running at http://localhost:${PORT}`);
  if (MOCK) console.log("MOCK mode: replies are canned examples, no API calls are made.");
  else if (!process.env.ANTHROPIC_API_KEY) console.warn("Warning: ANTHROPIC_API_KEY is not set.");
});
