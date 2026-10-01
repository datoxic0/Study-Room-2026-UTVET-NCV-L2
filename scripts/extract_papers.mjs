#!/usr/bin/env node
// Build js/data/paper_shelf.js — curated papers/memos shelf extracted verbatim
// from the NotebookLM captures. Every entry carries its capture file + sha256.
// Honesty rules: no fabricated answers; image-only sources are summary-level;
// parse failures fall back to raw verbatim text.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CAP_DIR = path.join(ROOT, "research", "captures", "notebooklm_sources");
const OUT = path.join(ROOT, "js", "data", "paper_shelf.js");
const BUILT_ON = "2026-09-30";

const manifest = JSON.parse(fs.readFileSync(path.join(CAP_DIR, "manifest.json"), "utf8"));
const captureByPrefix = new Map();
for (const nb of manifest.notebooks) {
  captureByPrefix.set(nb.file.slice(0, 2), { file: nb.file, sha256: nb.sha256, record: JSON.parse(fs.readFileSync(path.join(CAP_DIR, nb.file), "utf8")) });
}

function findSource(prefix, name) {
  const cap = captureByPrefix.get(prefix);
  if (!cap) throw new Error(`capture ${prefix} not found`);
  const src = cap.record.sources.find((s) => s.name === name);
  if (!src) throw new Error(`source not found in ${prefix}: ${name}`);
  return { cap, src };
}

// ---------- capture hygiene: document footers/headers + formula sheet ----------
//
// PDF two-column extraction bleeds page furniture (department headers, marking-
// guideline footers, page numbers, "TOTAL: 100" strips) into neighbouring rows.
// These patterns delete that furniture from parsed rows only — never from raw
// or image-summary modes, and never from question content.

// The real sheet starts at "FORMULA SHEET <n> $…"; the cover-page sentence
// "…formula sheet." never has maths after it, so it cannot match.
const FORMULA_SHEET_START = /FORMULA SHEET\s*\d*\s*\$/i;
const FORMULA_SHEET_END =
  /higher education & training|Department: Higher Education|This marking guideline|MARKING GUIDELINE|Regional Assessment|\bPage \d+ of \d+\b/i;

const BOILER_PATTERNS = [
  // cover-page sentence "…formula sheet." is never a real sheet (marker needs $)
  /\bThis marking guideline consists of \d+ pages?\./gi,
  /\bMEMORANDUM\s*\/\s*MARKING GUIDELINES?\b/gi,
  /MARKING GUIDELINE(?:\s*-\s*\d+\s*-\s*[A-Z][A-Z0-9 &]{2,40})?/gi,
  /Regi(?:onal|ortal)\s+Assessment\s*:?\s*\d{4}\s*\/\s*\d{2}\s*\/\s*\d{2}/gi,
  /\bRegional Assessment\s*:/gi,
  /\bRegional Assessment\b(?=\s+\d{4})/gi,
  /\bPage \d+ of \d+\b/gi,
  /\b\d{4}\/\d{2}\/\d{2}\b/g,
  // page-total strips: GRAND before SECTION (interleaved by two-column bleed).
  // Parens form ("GRAND TOTAL (30) 5") keeps a stray page digit behind it.
  /\bGRAND TOTAL(?:\s*\(\d+\)|:?\s*\d+)(?:\s+\d{1,3})?/gi,
  /\bTOTAL SECTION [A-Z]:?\s*\d*/gi,
  /\bTOTAL MARKS\b/gi,
  /\[\d{1,3}\]\s*TOTAL:\s*\d+/gi,
  /\bTOTAL:\s*\d+(?:\s+MARKS)?/gi,
  /\bSECTION [A-Z]\s*$/g, // trailing paper-structure heading
  /\bANN?EXURE [A-Z] ANSWER SHEET\b/gi,
  /\bEXAMINATION NUMBER\s*:/gi,
  /\bADDENDUM\s*$/g, // addendum page heading after its form fields
  /\bhigher education & training\b/gi,
  /\bDepartment: Higher Education and Training\b/gi,
  /\bREPUBLIC OF SOUTH AFRICA(?: GOVERNMENT)?(?: KZN REGIONAL OFFICE)?\b/g,
  /\bNATIONAL CERTIFICATE \(VOCATIONAL\)/g,
  /\bFUNDAMENTALS MATHEMATICS NQF LEVEL\s*:?\s*\d/g,
  /\bNQF LEVEL\s*:?\s*\d\b/g,
  /\bTASK\s*:\s*\d{1,2}\b/g,
  /\bDATE\s*:\s*\d{1,2}\s+[A-Za-z]+\s+\d{4}\b/g,
  /\bMARKS\s*:\s*\d{1,3}\b/g,
  /\bXX March \d{4}\b/g,
  // paper codes (NC1520(E)(M1)V) and subject codes ((10040052), (6030092)…)
  /\bNC\d{3,4}\([A-Z]\)\([A-Z]\d{1,2}\)V\b/g,
  /\(\d{7,8}\)/g,
  /(?<=\s)-\d{1,2}-(?=\s|$)/g,
];

function stripBoilerplate(normalized) {
  let out = normalized;
  const sheet = FORMULA_SHEET_START.exec(out);
  if (sheet) {
    const from = sheet.index + sheet[0].length - 1; // keep the opening "$"
    const end = FORMULA_SHEET_END.exec(out.slice(from));
    const cut = end ? from + end.index : out.length;
    out = out.slice(0, sheet.index) + " " + out.slice(cut);
  }
  for (const pattern of BOILER_PATTERNS) out = out.replace(pattern, " ");
  return out.replace(/\s+/g, " ").trim();
}

// Pull the captured FORMULA SHEET formulas out verbatim so stripping the
// furniture from question rows never loses the maths itself.
function extractFormulaSheet(text) {
  const start = FORMULA_SHEET_START.exec(text);
  if (!start) return null;
  const from = start.index + start[0].length - 1;
  const end = FORMULA_SHEET_END.exec(text.slice(from));
  const region = text.slice(from, end ? from + end.index : text.length);
  const formulas = region.match(/\$[^$\n]+\$/g) || [];
  return formulas.length > 0 ? formulas : null;
}

// ---------- parsers ----------

const SUB_ANCHOR = /(?:^|[\s|])(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)(?=[\s:])/g;
const MARKS_TAIL = /\((\d{1,3}(?:\s*[x\u00d7X]\s*\d{1,3})?)\)\s*$/;

function anchorOk(n) {
  const [a, b] = n.split(".").map(Number);
  if (!(a >= 1 && a <= 30 && b >= 1 && b <= 19)) return false;
  if (n.split(".").length === 3) {
    const c = Number(n.split(".")[2]);
    if (!(c >= 1 && c <= 19)) return false;
  }
  return true;
}

const GROUP_TAIL = /\((\d+)\s*[x\u00d7]\s*(\d+)\)\s*\((\d+)\)\s*$/;

// Papers print "(2 × 2) (4)" once after the LAST sub of a group when no
// individual marks are shown — that is the group total, not this sub's marks.
// Detect: product matches and the multiplier equals the group's sub count.
function isGroupTotalTail(n, anchors, text) {
  const m = text.match(GROUP_TAIL);
  if (!m) return false;
  if (Number(m[1]) * Number(m[2]) !== Number(m[3])) return false;
  const dot = n.lastIndexOf(".");
  if (dot < 0) return false;
  const prefix = n.slice(0, dot + 1);
  const siblings = anchors.filter((x) => x.n.startsWith(prefix) && x.n.length > prefix.length).length;
  return siblings === Number(m[1]);
}

function parseAnchorSubs(block) {
  const anchors = [];
  SUB_ANCHOR.lastIndex = 0;
  let m;
  while ((m = SUB_ANCHOR.exec(block)) !== null) {
    const n = m[1];
    if (!anchorOk(n)) continue;
    const start = m.index + m[0].length - n.length;
    if (anchors.length && start <= anchors[anchors.length - 1].start) continue;
    anchors.push({ n, start });
  }
  const subs = [];
  for (let i = 0; i < anchors.length; i++) {
    const a = anchors[i];
    const end = i + 1 < anchors.length ? anchors[i + 1].start : block.length;
    let text = block.slice(a.start, end);
    // drop the row's own number label when it prefixes the text
    if (text.startsWith(a.n) && (text.length === a.n.length || !/[0-9]/.test(text[a.n.length]))) {
      text = text.slice(a.n.length).replace(/^[\s:]+/, "");
    }
    text = stripBoilerplate(text.replace(/\s+/g, " ").trim());
    let marks = null;
    if (!isGroupTotalTail(a.n, anchors, text)) {
      const mm = text.match(MARKS_TAIL);
      if (mm) {
        marks = mm[1].replace(/\s+/g, "");
        text = text.slice(0, text.length - mm[0].length);
      }
    }
    text = text.replace(/\s+/g, " ").trim();
    if (text.length > 0 && text.length < 3) continue;
    subs.push({ n: a.n, text, marks, ...(text.length === 0 ? { empty: true } : {}) });
  }
  subs.sort((x, y) => {
    const p = (s) => s.n.split(".").map(Number);
    const a = p(x), b = p(y);
    for (let i = 0; i < 3; i++) if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) - (b[i] || 0);
    return 0;
  });
  return { subs, firstStart: anchors.length ? anchors[0].start : -1 };
}

function parseQA(text, opts = {}) {
  const starts = [...text.matchAll(/\bQUESTION\s+(\d+)\b/gi)];
  if (starts.length === 0) return { questions: [], subs: 0, dupes: 0, embeddedMemo: 0 };
  const blocks = [];
  for (let i = 0; i < starts.length; i++) {
    const from = starts[i].index + starts[i][0].length;
    const to = i + 1 < starts.length ? starts[i + 1].index : text.length;
    blocks.push({ n: starts[i][1], block: text.slice(from, to) });
  }
  // group by question number; repeated markers are either column repeats or an
  // embedded memo (only trusted when opts.embeddedMemo is set on the source).
  const byN = new Map();
  for (const b of blocks) {
    if (!byN.has(b.n)) byN.set(b.n, []);
    byN.get(b.n).push(b.block);
  }
  const seen = new Set();
  let dupes = 0;
  let embeddedMemo = 0;
  const questions = [];
  for (const [n, blockList] of byN) {
    const { subs, firstStart } = parseAnchorSubs(blockList[0]);
    const kept = [];
    for (const s of subs) {
      if (seen.has(s.n)) { dupes++; continue; }
      seen.add(s.n);
      kept.push(s);
    }
    let stem = "";
    if (kept.length > 0 && firstStart > 0) {
      stem = stripBoilerplate(blockList[0].slice(0, firstStart).replace(/\s+/g, " ").trim());
      if (/^\W*\d/.test(stem)) stem = "";
    } else if (kept.length === 0) {
      stem = stripBoilerplate(blockList[0].replace(/\s+/g, " ").trim());
    }
    if (kept.length === 0 && stem.length < 30) continue;
    if (opts.embeddedMemo && blockList.length > 1) {
      const memoMap = new Map(parseAnchorSubs(blockList[1]).subs.filter((s) => !s.empty).map((s) => [s.n, s.text]));
      for (const s of kept) {
        if (memoMap.has(s.n)) { s.memo = memoMap.get(s.n); embeddedMemo++; }
        else s.memo = null;
      }
    }
    questions.push({ n, stem, subs: kept });
  }
  const subs = questions.reduce((t, q) => t + q.subs.length, 0);
  return { questions, subs, dupes, embeddedMemo };
}

function parseSolutions(text) {
  const heads = [...text.matchAll(/QUESTION\s+(\d+\.\d+)\s*:/g)];
  if (heads.length < 3) return null;
  const blocks = [];
  for (let i = 0; i < heads.length; i++) {
    const from = heads[i].index + heads[i][0].length;
    const to = i + 1 < heads.length ? heads[i + 1].index : text.length;
    const seg = text.slice(from, to);
    const ansIdx = seg.search(/\bAnswer\s*:/i);
    const anaIdx = seg.search(/\bAnalysis\s*:/i);
    let question = seg;
    let answer = "";
    let analysis = "";
    if (ansIdx >= 0) {
      question = seg.slice(0, ansIdx);
      const ansEnd = anaIdx > ansIdx ? anaIdx : seg.length;
      answer = seg.slice(ansIdx + seg.slice(ansIdx).search(/:/) + 1, ansEnd);
      if (anaIdx > ansIdx) analysis = seg.slice(anaIdx + seg.slice(anaIdx).search(/:/) + 1);
    }
    const clean = (s) =>
      stripBoilerplate(
        s.replace(/\s+/g, " ").replace(/^[\s\u2022\u00b7\-–—]+/, "").replace(/[\s\u2022\u00b7]+$/, "").trim()
      );
    const entry = { n: heads[i][1], question: clean(question), answer: clean(answer), analysis: clean(analysis) };
    if (entry.question && entry.answer) blocks.push(entry);
  }
  return blocks.length >= 3 ? blocks : null;
}

function parseSolvedSets(text) {
  const qpIdx = [...text.matchAll(/Question Paper\s*:/gi)].map((m) => m.index);
  const memoIdx = [...text.matchAll(/Marking Memorandum/gi)].map((m) => m.index);
  if (qpIdx.length === 0 || memoIdx.length === 0) return null;
  const sets = [];
  for (let i = 0; i < qpIdx.length; i++) {
    const qpStart = qpIdx[i];
    const qpEnd = i + 1 < qpIdx.length ? qpIdx[i + 1] : text.length;
    const memoStart = memoIdx.find((x) => x >= qpStart && x < qpEnd);
    if (memoStart === undefined) continue;
    const label = text.slice(qpStart, Math.min(qpStart + 80, memoStart)).split("\n")[0].trim();
    const qpSubs = parseAnchorSubs(text.slice(qpStart, memoStart)).subs;
    const memoSubs = parseAnchorSubs(text.slice(memoStart, qpEnd)).subs;
    const memoMap = new Map(memoSubs.filter((s) => !s.empty).map((s) => [s.n, s]));
    const subs = qpSubs.map((s) => ({ ...s, memo: memoMap.has(s.n) ? memoMap.get(s.n).text : null }));
    if (subs.length > 0) sets.push({ label, subs });
  }
  return sets.length > 0 ? sets : null;
}

// ---------- curated inventory ----------

const CURATED = [
  // Introduction to Computer
  { id: "intro-2010-qp", prefix: "11", name: "NC1200 - INTRODUCTION TO COMPUTERS NOV QP 2010.pdf", subject: "introduction-to-computer", title: "NC1200 Introduction to Computers — November 2010", session: "November 2010", kind: "qp", level: "L2", mode: "qa" },
  { id: "intro-2018mar-qp", prefix: "11", name: "2018 MAR NC1520 - INTRODUCTION TO COMPUTERS L2 QP SUPP 2018.pdf", subject: "introduction-to-computer", title: "NC1520 Introduction to Computers — Supplementary 2018", session: "March 2018 (Supplementary)", kind: "qp", level: "L2", mode: "qa" },
  { id: "intro-2018nov-qp", prefix: "11", name: "2018 NOV NC1540 - INTRODUCTION TO COMPUTERS L2 QP NOV 2018 (amended).pdf", subject: "introduction-to-computer", title: "NC1540 Introduction to Computers — November 2018 (amended)", session: "November 2018", kind: "qp", level: "L2", mode: "qa" },
  { id: "intro-2021-qp", prefix: "11", name: "2021 MAR NC1540 - INTRODUCTION TO COMPUTERS L2 QP FEB 2021 REPLACEMENT SIGN OFF.pdf", subject: "introduction-to-computer", title: "NC1540 Introduction to Computers — February 2021 replacement", session: "February 2021 (Replacement)", kind: "qp", level: "L2", mode: "qa", pairId: "intro-2021-memo" },
  { id: "intro-2021-memo", prefix: "11", name: "2021 MAR NC1540 - INTRODUCTION TO COMPUTERS L2 MEMO FEB 2021 REPLACEMENT SIGN OFF.pdf", subject: "introduction-to-computer", title: "NC1540 Introduction to Computers — Feb 2021 memo", session: "February 2021 (Replacement)", kind: "memo", level: "L2", mode: "qa", pairId: "intro-2021-qp" },
  // Mathematics
  { id: "math-2015p1", prefix: "12", name: "MATHEMATICS_L2_NOVEMBER_2015_1ST_PAPER_PAPER_tvetpapers.co.za.pdf", subject: "mathematics", title: "Mathematics L2 — November 2015, Paper 1", session: "November 2015 · Paper 1", kind: "qp", level: "L2", mode: "images" },
  { id: "math-task1-2025", prefix: "12", name: "Maths-March-Paper.pdf", subject: "mathematics", title: "Mathematics L2 — KZN Regional Task 1", session: "KZN Regional Task 1 · 20 February 2025", kind: "qp", level: "L2", mode: "qa", embeddedMemo: true },
  { id: "math-task2-2026", prefix: "12", name: "Maths-NQF-L2-Task2V2.pdf", subject: "mathematics", title: "Mathematics L2 — Task 2(V1)", session: "Task 2(V1) · 18 March 2026", kind: "qp", level: "L2", mode: "qa" },
  { id: "math-exercize-memo", prefix: "12", name: "Math Exercize.pdf", subject: "mathematics", title: "Mathematics L2 — worked exercise memo", session: "worked assignment memo", kind: "solutions", level: "L2", mode: "solutions" },
  { id: "math-task6", prefix: "17", name: "MathsTask6(V1).pdf", subject: "mathematics", title: "Mathematics L2 — Task 6(V1)", session: "Task 6(V1) · 50 marks", kind: "qp", level: "L2", mode: "images" },
  // Electrotechnology
  { id: "elec-nc1000-qp-2023", prefix: "01", name: "NC1000_-_ELECTROTECHNOLOGY-L2-QP-NOV-2023_from_tvetpapers.co.za (1).pdf", subject: "electrotechnology", title: "NC1000 Electrotechnology — November 2023 QP", session: "November 2023", kind: "qp", level: "L2", mode: "images", pairId: "elec-nc1000-memo-2023" },
  { id: "elec-nc1000-memo-2023", prefix: "01", name: "NC1000_-_ELECTROTECHNOLOGY-L2-MEMO-NOV-2023_from_tvetpapers.co.za.pdf", subject: "electrotechnology", title: "NC1000 Electrotechnology — November 2023 memo", session: "November 2023", kind: "memo", level: "L2", mode: "images", pairId: "elec-nc1000-qp-2023" },
  { id: "elec-nc1000-memo-2022", prefix: "01", name: "NC1000 - ELECTROTECHNOLOGY L2 MEMO NOV 2022 EDITED.pdf", subject: "electrotechnology", title: "NC1000 Electrotechnology — November 2022 memo", session: "November 2022", kind: "memo", level: "L2", mode: "images" },
  { id: "elec-nc1000-memo-supp2023", prefix: "01", name: "NC1000 - ELECTROTECHNOLOGY L2 MEMO SUPP 2023 (1).pdf", subject: "electrotechnology", title: "NC1000 Electrotechnology — Supplementary 2023 memo", session: "Supplementary 2023", kind: "memo", level: "L2", mode: "images" },
  { id: "elec-2025y", prefix: "07", name: "Electrotechnology NQF Level 2 - November 2025 - Y-Paper.pdf", subject: "electrotechnology", title: "Electrotechnology L2 — November 2025 Y-paper", session: "21 November 2025 (Y-paper)", kind: "qp", level: "L2", mode: "images" },
  { id: "elec-calc-guide", prefix: "04", name: "Electrotechnology Test Calculation Study Guide", subject: "electrotechnology", title: "Electrotechnology — test calculation study guide (worked)", session: "worked calculation guide", kind: "solutions", level: "L2", mode: "raw" },
  { id: "elec-activity-solutions", prefix: "08", name: "Electrotech Activity Solutions and Questionnaire", subject: "electrotechnology", title: "Electrotechnology — activity solutions and questionnaire", session: "activity solutions", kind: "solutions", level: "L2", mode: "raw" },
  // Mechatronic Systems
  { id: "mech-nc2090-qp", prefix: "06", name: "NC2090 - MECHATRONIC SYSTEMS L2 QP SUPP 2019.pdf", subject: "mechatronic-systems", title: "NC2090 Mechatronic Systems — Supplementary 2019", session: "Supplementary 2019", kind: "qp", level: "L2", mode: "qa" },
  { id: "mech-nc2100-qp", prefix: "06", name: "NC2100 - MECHATRONIC SYSTEMS L3 QP SUPP 2019.pdf", subject: "mechatronic-systems", title: "NC2100 Mechatronic Systems — Supplementary 2019", session: "Supplementary 2019", kind: "qp", level: "L3", mode: "qa" },
  { id: "mech-june-test", prefix: "03", name: "Mechatronics June Practice Test Paper.pdf", subject: "mechatronic-systems", title: "Mechatronics — June practice test", session: "June practice test (year not stated)", kind: "practice", level: "L2", mode: "raw" },
  { id: "mech-q5-master", prefix: "03", name: "Advanced Mechatronics Study Guide: The Comprehensive Question 5 Master Series (Exam & Memorandum)", subject: "mechatronic-systems", title: "Mechatronics — Question 5 Master Series (exam & memorandum)", session: "practice exam + memorandum", kind: "solved", level: "L2", mode: "solved" },
  { id: "mech-pasted-practice", prefix: "06", name: "Pasted text", subject: "mechatronic-systems", title: "Mechatronics — March assessment practice set", session: "practice question set", kind: "practice", level: "L2", mode: "qa" },
  { id: "mech-gclamp", prefix: "05", name: "G Clamp Manufacturing Activity Questions", subject: "mechatronic-systems", title: "G-clamp manufacturing — activity with worked explanations", session: "class activity", kind: "solutions", level: "L2", mode: "qa" },
  { id: "mech-isat", prefix: "05", name: "ElectroAndIntro-ISAT.pdf", subject: "mechatronic-systems", title: "ISAT — electrotechnology & intro questionnaire", session: "ISAT questionnaire", kind: "practice", level: "L2", mode: "raw" },
  // Manual Manufacturing
  { id: "mm-nc1780-qp", prefix: "15", name: "NC1780 - MANUAL MANUFACTURING L2 QP NOV 2013 NEW.pdf", subject: "manual-manufacturing", title: "NC1780 Manual Manufacturing — November 2013", session: "November 2013", kind: "qp", level: "L2", mode: "qa" },
  { id: "mm-nc1810-qp-2019", prefix: "15", name: "NC1810 - MANUAL MANUFACTURING L2 QP SUPP 2019.pdf", subject: "manual-manufacturing", title: "NC1810 Manual Manufacturing — Supplementary 2019", session: "Supplementary 2019", kind: "qp", level: "L2", mode: "qa" },
  { id: "mm-qp-2025", prefix: "15", name: "NC1810_-_MANUAL_MANUFACTURING_L2_QP_FEB_2025_-_tvetpapers.co.za.pdf", subject: "manual-manufacturing", title: "NC1810 Manual Manufacturing — February 2025 QP", session: "February 2025", kind: "qp", level: "L2", mode: "images", pairId: "mm-memo-2025" },
  { id: "mm-memo-2025", prefix: "15", name: "NC1810_-_MANUAL_MANUFACTURING_L2_MEMO_FEB_2025_-_tvetpapers.co.za.pdf", subject: "manual-manufacturing", title: "NC1810 Manual Manufacturing — February 2025 memo", session: "February 2025", kind: "memo", level: "L2", mode: "images", pairId: "mm-qp-2025" },
  { id: "mm-qp-supp2024", prefix: "15", name: "NC1810_-_MANUAL_MANUFACTURING_L2_QP_SUPP_2024_from_tvetpapers.co.za.pdf", subject: "manual-manufacturing", title: "NC1810 Manual Manufacturing — Supplementary 2024 QP", session: "Supplementary 2024", kind: "qp", level: "L2", mode: "images", pairId: "mm-memo-supp2024" },
  { id: "mm-memo-supp2024", prefix: "15", name: "NC1810_-_MANUAL_MANUFACTURING_L2_MEMO_SUPP_2024_from_tvetpapers.co.za.pdf", subject: "manual-manufacturing", title: "NC1810 Manual Manufacturing — Supplementary 2024 memo", session: "Supplementary 2024", kind: "memo", level: "L2", mode: "images", pairId: "mm-qp-supp2024" },
];

// ---------- build ----------

const shelf = [];
const stats = [];

for (const c of CURATED) {
  const { cap, src } = findSource(c.prefix, c.name);
  const text = src.text || "";
  const summary = src.summary || "";
  const pages = Array.isArray(src.pageImages) ? src.pageImages.length : typeof src.pageImages === "number" ? src.pageImages : 0;
  const base = {
    id: c.id,
    subject: c.subject,
    title: c.title,
    session: c.session,
    kind: c.kind,
    level: c.level,
    pairId: c.pairId || null,
    capture: { file: cap.file, sha256: cap.sha256, sourceName: c.name },
    pages,
    textChars: text.length,
    summaryChars: summary.length,
  };
  let entry;
  if (c.mode === "images") {
    if (text.length > 0) throw new Error(`${c.id}: expected image-only source but text exists`);
    if (!summary) throw new Error(`${c.id}: image-only source has no captured summary`);
    entry = { ...base, mode: "images", summary, note: "Source PDF is page images — NotebookLM's captured summary is shown, not verbatim exam text." };
  } else if (c.mode === "raw") {
    if (text.length === 0) throw new Error(`${c.id}: raw mode requires extracted text`);
    entry = { ...base, mode: "raw", text, note: "Full captured text as extracted — presented verbatim (not parsed into questions)." };
  } else if (c.mode === "solutions") {
    const blocks = parseSolutions(text);
    if (blocks) {
      entry = { ...base, mode: "solutions", blocks, note: `${blocks.length} worked questions with answers parsed from captured text.` };
    } else {
      entry = { ...base, mode: "raw", text, note: "Answer markers not machine-parseable — full captured text shown verbatim." };
    }
  } else if (c.mode === "solved") {
    const sets = parseSolvedSets(text);
    if (sets) {
      entry = { ...base, mode: "solved", sets, note: `Exam + memorandum captured in one source — ${sets.length} set(s) parsed.` };
    } else {
      entry = { ...base, mode: "raw", text, note: "Exam + memorandum source could not be split structurally — full captured text shown verbatim." };
    }
  } else {
    // qa
    const parsed = parseQA(text, { embeddedMemo: !!c.embeddedMemo });
    if (parsed.questions.length > 0 && parsed.subs > 0) {
      for (const q of parsed.questions) for (const s of q.subs) if (s.memo === undefined) s.memo = null;
      entry = { ...base, mode: "qa", questions: parsed.questions, note: `${parsed.questions.length} question block(s), ${parsed.subs} numbered sub-questions parsed from extracted text.` };
      if (parsed.embeddedMemo > 0) {
        entry.embeddedMemo = parsed.embeddedMemo;
        entry.note += ` Captured source also contains its memorandum — ${parsed.embeddedMemo} memo answers joined.`;
      }
      if (parsed.dupes > 0) entry.note += ` ${parsed.dupes} repeated numbering occurrence(s) from PDF column extraction collapsed.`;
    } else if (parsed.questions.length > 0) {
      entry = { ...base, mode: "qa", questions: parsed.questions, note: `${parsed.questions.length} question block(s) parsed (no sub-numbering found).` };
    } else {
      entry = { ...base, mode: "raw", text, note: "Numbered question parse unavailable — full captured text shown verbatim." };
    }
  }
  // Keep the captured formula sheet verbatim: its rows are stripped out of the
  // question text above (page furniture), so the maths is preserved here.
  if (entry.mode !== "raw" && entry.mode !== "images") {
    const sheet = extractFormulaSheet(text);
    if (sheet) {
      entry.formulaSheet = sheet;
      entry.note += ` Captured FORMULA SHEET kept verbatim (${sheet.length} formulas) as its own block.`;
    }
  }
  shelf.push(entry);
  const stat = { id: c.id, mode: entry.mode };
  if (entry.mode === "qa") {
    stat.questions = entry.questions.length;
    stat.subs = entry.questions.reduce((t, q) => t + q.subs.length, 0);
    stat.memoed = entry.questions.reduce((t, q) => t + q.subs.filter((s) => typeof s.memo === "string" && s.memo.length > 0).length, 0);
    stat.subsList = entry.questions.flatMap((q) => q.subs.map((s) => q.n + "/" + s.n));
  } else if (entry.mode === "solutions") stat.blocks = entry.blocks.length;
  else if (entry.mode === "solved") { stat.sets = entry.sets.length; stat.subs = entry.sets.reduce((t, s) => t + s.subs.length, 0); }
  else if (entry.mode === "raw") stat.rawChars = entry.text.length;
  else stat.summaryChars = entry.summary.length;
  stats.push(stat);
}

// join text-pair memos into their qp entries (verbatim, from the partner capture)
for (const entry of shelf) {
  if (entry.kind !== "qp" || entry.mode !== "qa" || !entry.pairId) continue;
  const partner = shelf.find((p) => p.id === entry.pairId);
  if (!partner || partner.kind !== "memo") continue;
  if (partner.mode === "qa") {
    const memoMap = new Map();
    for (const q of partner.questions) for (const s of q.subs) if (!s.empty) memoMap.set(s.n, s.text);
    let joined = 0;
    for (const q of entry.questions) for (const s of q.subs) {
      if (memoMap.has(s.n)) { s.memo = memoMap.get(s.n); joined++; }
      else s.memo = null;
    }
    entry.joinedMemoSubs = joined;
    entry.note += ` Memo answers joined from ${partner.capture.sourceName} (${joined}/${entry.questions.reduce((t, q) => t + q.subs.length, 0)} sub-answers found).`;
  } else if (partner.mode === "images") {
    entry.note += ` A summary-level memo exists: “${partner.title}” (open the pair from this card).`;
  }
}
// memo entries of text pairs: mark reverse linkage already via pairId; strip parse noise from memo notes is fine.

// solved sets: join memo subs already inline. Ensure subs without memo are null (not undefined)
for (const entry of shelf) {
  if (entry.mode === "solved") for (const set of entry.sets) for (const s of set.subs) if (s.memo === undefined) s.memo = null;
}

const ids = shelf.map((p) => p.id);
if (new Set(ids).size !== ids.length) throw new Error("duplicate paper ids");

const payload = shelf.map((p) => {
  const out = { ...p };
  if (out.mode !== "raw") delete out.text;
  return out;
});

const lines = [];
lines.push("// AUTO-GENERATED by scripts/extract_papers.mjs — DO NOT EDIT BY HAND.");
lines.push("// Papers & memos shelf: verbatim text parsed from NotebookLM captures.");
lines.push("// Provenance: every entry cites its capture file + manifest sha256.");
lines.push(`export const PAPERS_BUILT_ON = ${JSON.stringify(BUILT_ON)};`);
lines.push("");
lines.push("export const paperShelf = " + JSON.stringify(payload, null, 2) + ";");
lines.push("");
lines.push("export function papersBySubject(subject) {");
lines.push("  return paperShelf.filter((p) => p.subject === subject);");
lines.push("}");
lines.push("");
lines.push("export function paperById(id) {");
lines.push("  return paperShelf.find((p) => p.id === id) || null;");
lines.push("}");
lines.push("");
fs.writeFileSync(OUT, lines.join("\n"), "utf8");

console.log(`wrote ${path.relative(ROOT, OUT)} — ${shelf.length} entries, ${fs.statSync(OUT).size} bytes`);
for (const s of stats) {
  const extra = s.mode === "qa" ? `Q=${s.questions} subs=${s.subs} memoed=${s.memoed} [${(s.subsList || []).join(", ")}]` : s.mode === "solutions" ? `blocks=${s.blocks}` : s.mode === "solved" ? `sets=${s.sets} subs=${s.subs}` : s.mode === "raw" ? `raw=${s.rawChars}` : `summary=${s.summaryChars}`;
  console.log(`  ${s.id.padEnd(24)} ${s.mode.padEnd(9)} ${extra}`);
}
for (const p of shelf.filter((x) => x.joinedMemoSubs !== undefined)) console.log(`  JOIN ${p.id}: ${p.joinedMemoSubs} memo answers`);
