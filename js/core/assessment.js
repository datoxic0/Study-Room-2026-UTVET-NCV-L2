// Assessment engine: builds an item bank from the shipped capture-derived data
// (past-paper subs + authored drills), assembles seeded exams/quizzes, scores
// them. Pure functions — no DOM, no network, works fully without AI.
import { paperShelf } from "../data/paper_shelf.js";
import { studyGuides } from "../data/study_guides.js";
import { FIGURE_MAP } from "../data/figure_map.js";

const MIN_TEXT = 8;
// Items whose text points at an external figure/diagram. Detection is
// deliberately conservative (explicit FIGURE refs). needsFigure on an item
// means "references a figure this bank cannot show" — mapped assets (see
// figure_map.js) clear the flag and carry item.figure instead.
export const FIGURE_RE = /\bfig(?:ure)?\.?\s*\d|shown in (?:the )?(?:figure|diagram)|figure below|diagram below|in the diagram|\bshown below/i;

// Deterministic RNG so a shared seed reproduces the identical paper.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function subjectLabels() {
  const labels = {};
  for (const guide of studyGuides) labels[guide.id] = guide.subject;
  return labels;
}

function parseMarks(raw) {
  if (raw == null) return null;
  const n = Number(String(raw).trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Parent stem for chained subs: "1.2.1" inherits the instruction of "1.2"
// when the parent is a directive (ends with ':' / '.') — keeps standalone
// items readable without inventing content.
function parentText(question, subNumber) {
  const dot = subNumber.lastIndexOf(".");
  if (dot < 1) return null;
  const parentN = subNumber.slice(0, dot);
  const parent = (question.subs || []).find((s) => s.n === parentN);
  if (!parent || !parent.text || parent.text.length > 220) return null;
  return /[:.]\s*$/.test(parent.text) ? parent.text : null;
}

function partnerAnswers(paper, byId) {
  const partner = paper.pairId ? byId.get(paper.pairId) : null;
  if (!partner || !partner.questions) return new Map();
  const map = new Map();
  for (const q of partner.questions) {
    for (const sub of q.subs || []) {
      if (sub.text && sub.text.trim()) map.set(sub.n, sub.text.trim());
    }
  }
  return map;
}

// filter: { subjects?: string[], kinds?: string[] }
// extraItems: user/AI-authored bank (My Bank) merged in, clearly tagged.
export function buildItemBank(filter = {}, extraItems = []) {
  const subjects = filter.subjects?.length ? new Set(filter.subjects) : null;
  const items = [];
  const byId = new Map(paperShelf.map((p) => [p.id, p]));

  for (const paper of paperShelf) {
    if (paper.kind === "memo" || paper.mode !== "qa" || !paper.questions) continue;
    if (subjects && !subjects.has(paper.subject)) continue;
    const aligned = partnerAnswers(paper, byId);
    for (const q of paper.questions) {
      for (const sub of q.subs || []) {
        const text = (sub.text || "").trim();
        if (text.length < MIN_TEXT) continue;
        const answer = (sub.memo && String(sub.memo).trim()) || aligned.get(sub.n) || null;
      const stem = parentText(q, sub.n);
      const full = stem ? `${stem} ${text}` : text;
      const id = `past:${paper.id}:${sub.n}`;
      const figure = FIGURE_MAP[id] || null;
      items.push({
        id,
        kind: "past-paper",
        origin: paper.capture?.local ? "download" : "capture",
        subject: paper.subject,
        text: full,
        needsFigure: !figure && FIGURE_RE.test(full),
        figure,
        textCore: text,
          marks: parseMarks(sub.marks),
          answer: answer || null,
          answerable: Boolean(answer),
          source: { type: "paper", paperId: paper.id, n: sub.n, sha256: paper.capture?.sha256 ?? null },
        });
      }
    }
  }

  for (const guide of studyGuides) {
    if (subjects && !subjects.has(guide.id)) continue;
    (guide.checkQuestions || []).forEach((qa, i) => {
      const text = String(qa.q || "").trim();
      const answer = String(qa.a || "").trim();
      if (text.length < MIN_TEXT || !answer) return;
      items.push({
        id: `drill:${guide.id}:${i}`,
        kind: "drill",
        origin: "authored",
        subject: guide.id,
        text,
        textCore: text,
        marks: 1,
        answer,
        answerable: true,
        source: { type: "guide", guideId: guide.id },
      });
    });
  }

  for (const extra of extraItems) {
    if (subjects && !subjects.has(extra.subject)) continue;
    const extraText = String(extra.text || "").trim();
    items.push({
      id: extra.id,
      kind: extra.kind || "ai-authored",
      origin: extra.origin || "ai",
      subject: extra.subject,
      text: extraText,
      textCore: extraText,
      needsFigure: FIGURE_RE.test(extraText),
      figure: null,
      marks: parseMarks(extra.marks) ?? 1,
      answer: extra.answer ? String(extra.answer).trim() : null,
      answerable: Boolean(extra.answer),
      options: Array.isArray(extra.options) && extra.options.length >= 2 ? extra.options.map(String) : null,
      correctIndex: Number.isInteger(extra.correctIndex) ? extra.correctIndex : null,
      explanation: extra.explanation ? String(extra.explanation) : null,
      source: extra.source || { type: "my-bank" },
    });
  }

  const kinds = filter.kinds?.length ? new Set(filter.kinds) : null;
  return kinds ? items.filter((i) => kinds.has(i.kind)) : items;
}

function shuffle(list, rng) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// rules: {
//   subjects?: string[], kinds?: string[], seed: number|string,
//   count?: number,          // max items (default: as many as match)
//   totalMarks?: number,     // stop adding once reached (best effort)
//   minutes?: number,        // override duration estimate
//   shuffle?: boolean        // default true
// }
export function assembleExam(bank, rules) {
  const seed = typeof rules.seed === "number" ? rules.seed : hashSeed(String(rules.seed ?? "studyroom"));
  const rng = makeRng(seed);
  let pool = bank;
  if (rules.subjects?.length) {
    const set = new Set(rules.subjects);
    pool = pool.filter((i) => set.has(i.subject));
  }
  if (rules.kinds?.length) {
    const set = new Set(rules.kinds);
    pool = pool.filter((i) => set.has(i.kind));
  }
  if (rules.ids?.length) {
    const set = new Set(rules.ids);
    pool = pool.filter((i) => set.has(i.id));
  }
  if (rules.excludeFigures) {
    pool = pool.filter((i) => !i.needsFigure);
  }
  pool = shuffle(pool, rules.shuffle === false ? () => 0.5 : rng);

  const picked = [];
  let marks = 0;
  const limit = rules.count ?? pool.length;
  for (const item of pool) {
    if (picked.length >= limit) break;
    if (rules.totalMarks && marks >= rules.totalMarks) break;
    picked.push(item);
    marks += item.marks ?? 0;
  }
  if (rules.shuffle === false) picked.sort((a, b) => a.id.localeCompare(b.id));

  const past = picked.filter((i) => i.kind === "past-paper");
  const drills = picked.filter((i) => i.kind !== "past-paper");
  const sections = [];
  if (past.length) sections.push({ label: "Section A — past-paper practice", items: past });
  if (drills.length) sections.push({ label: "Section B — recall drill", items: drills });
  const allItems = sections.flatMap((s) => s.items);
  const totalMarks = allItems.reduce((sum, i) => sum + (i.marks ?? 0), 0);
  const minutes = rules.minutes ?? Math.max(5, Math.ceil(totalMarks ? totalMarks * 1.5 : allItems.length * 2));

  return {
    seed,
    rules: { ...rules, seed },
    sections,
    items: allItems,
    counts: { total: allItems.length, past: past.length, drill: drills.length },
    totalMarks,
    minutes,
    partial: Boolean(rules.count && rules.count > bank.length),
    builtAt: new Date().toISOString(),
  };
}

export function normalizeAnswer(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?()"']/g, "")
    .trim();
}

// answers: { [itemId]: { text?: string, choice?: number, selfMark?: 0|half|full } }
// Returns per-item results: auto-scored where an answer key exists, queued for
// self-marking otherwise (honest about what a static app can verify).
export function scoreExam(exam, answers) {
  const results = [];
  for (const item of exam.items) {
    const given = answers?.[item.id] || {};
    const max = item.marks ?? 1;
    if (item.options && item.correctIndex != null) {
      const got = given.choice === item.correctIndex ? max : 0;
      results.push({ id: item.id, mode: "choice", got, max });
      continue;
    }
    if (item.answerable && typeof given.text === "string" && given.text.trim()) {
      const want = normalizeAnswer(item.answer);
      const have = normalizeAnswer(given.text);
      const hit = have === want || (want.length > 40 && (have.includes(want) || want.includes(have)));
      results.push({ id: item.id, mode: "auto", got: hit ? max : 0, max });
      continue;
    }
    if (given.selfMark != null) {
      const got = given.selfMark === "full" ? max : given.selfMark === "half" ? Math.round(max / 2) : 0;
      results.push({ id: item.id, mode: "self", got, max });
      continue;
    }
    if (item.answerable) {
      results.push({ id: item.id, mode: "unanswered", got: 0, max });
      continue;
    }
    results.push({ id: item.id, mode: "pending", got: 0, max, pending: true });
  }
  const score = {
    got: results.reduce((s, r) => s + r.got, 0),
    max: results.reduce((s, r) => s + r.max, 0),
    autoItems: results.filter((r) => r.mode === "auto" || r.mode === "choice").length,
    pendingItems: results.filter((r) => r.mode === "pending").length,
  };
  return { results, score };
}

// Weakest items from history: wrong more often than right → retest queue.
export function retestQueue(history, limit = 10) {
  const tally = new Map();
  for (const attempt of history || []) {
    for (const r of attempt.results || []) {
      const t = tally.get(r.id) || { id: r.id, right: 0, wrong: 0 };
      if (r.mode === "pending") continue;
      if (r.got >= r.max) t.right += 1;
      else if (r.got < r.max) t.wrong += 1;
      tally.set(r.id, t);
    }
  }
  return [...tally.values()]
    .filter((t) => t.wrong > t.right)
    .sort((a, b) => b.wrong - a.wrong || a.right - b.right)
    .slice(0, limit);
}
