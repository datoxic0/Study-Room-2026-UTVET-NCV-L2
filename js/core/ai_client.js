// OpenRouter client for optional AI features. Works without a key (features
// stay disabled, clearly labelled). The key lives only in this device's
// localStorage and is sent only to openrouter.ai — never logged, never
// echoed back into the DOM.
import { readJSON, writeJSON } from "./storage.js";
import { hashSeed } from "./assessment.js";

const KEY_STORE = "studyroom.openrouter_key";
const MODEL_STORE = "studyroom.openrouter_model";
const DEFAULT_MODEL = "openai/gpt-4o-mini";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export function getApiKey() {
  const raw = readJSON(KEY_STORE, "");
  return typeof raw === "string" ? raw.trim() : "";
}

export function setApiKey(key) {
  writeJSON(KEY_STORE, String(key || "").trim());
}

export function hasApiKey() {
  return getApiKey().length > 0;
}

export function maskKey(key = getApiKey()) {
  if (!key) return "";
  return key.length <= 10 ? "••••" : `${key.slice(0, 6)}…${key.slice(-4)}`;
}

export function getModel() {
  const raw = readJSON(MODEL_STORE, "");
  return typeof raw === "string" && raw.trim() ? raw.trim() : DEFAULT_MODEL;
}

export async function chat(messages, { system } = {}) {
  const key = getApiKey();
  if (!key) {
    const err = new Error("AI is off — add an OpenRouter API key in the tutor settings first.");
    err.code = "no-key";
    throw err;
  }
  const payloadMessages = system ? [{ role: "system", content: system }, ...messages] : messages;
  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "Studyroom NC(V) L2",
      },
      body: JSON.stringify({ model: getModel(), messages: payloadMessages, max_tokens: 1200 }),
    });
  } catch {
    const err = new Error("Network error reaching OpenRouter. Check your connection and try again.");
    err.code = "network";
    throw err;
  }
  if (!response.ok) {
    let detail = "";
    try {
      detail = (await response.json())?.error?.message || "";
    } catch { /* non-JSON error body */ }
    detail = detail.replace(/\.+$/, "");
    const err = new Error(`AI request failed (${response.status})${detail ? `: ${detail}` : ""}.`);
    err.code = "http";
    throw err;
  }
  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    const err = new Error("The AI returned an empty answer. Try again.");
    err.code = "empty";
    throw err;
  }
  return text.trim();
}

function extractJsonArray(raw) {
  const cleaned = String(raw)
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function validateItem(raw, kind, subject, topic) {
  if (!raw || typeof raw !== "object") return null;
  const text = String(raw.text || raw.question || "").trim();
  if (text.length < 12) return null;
  const explanation = raw.explanation ? String(raw.explanation).trim() : null;
  if (kind === "mcq") {
    const options = Array.isArray(raw.options) ? raw.options.map((o) => String(o).trim()).filter(Boolean) : [];
    const correctIndex = Number.isInteger(raw.correctIndex) ? raw.correctIndex : options.indexOf(String(raw.answer || "").trim());
    if (options.length < 3 || options.length > 5) return null;
    if (correctIndex < 0 || correctIndex >= options.length) return null;
    return {
      id: `ai:${hashSeed(`${subject}|${text}`)}`,
      kind: "ai-authored",
      origin: "ai",
      subject,
      text,
      marks: 1,
      answer: options[correctIndex],
      options,
      correctIndex,
      explanation,
      source: { type: "ai", model: getModel(), at: new Date().toISOString(), topic },
    };
  }
  const answer = String(raw.answer || "").trim();
  if (answer.length < 2 || answer.length > 160) return null;
  const marks = Number.isInteger(raw.marks) && raw.marks >= 1 && raw.marks <= 8 ? raw.marks : 2;
  return {
    id: `ai:${hashSeed(`${subject}|${text}`)}`,
    kind: "ai-authored",
    origin: "ai",
    subject,
    text,
    marks,
    answer,
    explanation,
    source: { type: "ai", model: getModel(), at: new Date().toISOString(), topic },
  };
}

// Generate exam-style items for one subject/topic. Strict JSON only; invalid
// entries are dropped (the count may come back short — reported honestly).
export async function generateItems({ subject, topic, count = 5, kind = "short" }) {
  const want = Math.max(1, Math.min(10, count));
  const schema = kind === "mcq"
    ? '{"text": "question", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "why"}'
    : '{"text": "question", "answer": "short marking answer", "marks": 2, "explanation": "why"}';
  const system = [
    "You write exam-style questions for South African TVET NC(V) Level 2 students.",
    "Reply with ONLY a JSON array — no prose, no markdown fences.",
    `Each element must be exactly: ${schema}.`,
    kind === "mcq"
      ? "options must be 3-4 plausible choices; correctIndex is 0-based; keep texts self-contained."
      : "answer must be a short, exact marking-memo style answer (max 160 chars) so a static app can auto-mark it.",
    "No duplicates, no references to external documents, curriculum-appropriate difficulty, clear grammar.",
  ].join(" ");
  const user = `Subject: ${subject}. Topic: ${topic}. Return exactly ${want} questions (${kind === "mcq" ? "multiple choice" : "short answer"}).`;
  const raw = await chat([{ role: "user", content: user }], { system });
  const parsed = extractJsonArray(raw);
  if (!parsed) {
    const err = new Error("The AI reply was not valid JSON — nothing added. Try again.");
    err.code = "bad-json";
    throw err;
  }
  const items = [];
  for (const entry of parsed) {
    const item = validateItem(entry, kind, subject, topic);
    if (item && !items.some((existing) => existing.id === item.id)) items.push(item);
  }
  if (!items.length) {
    const err = new Error("The AI reply had no usable questions — nothing added. Try again.");
    err.code = "no-items";
    throw err;
  }
  return items;
}
