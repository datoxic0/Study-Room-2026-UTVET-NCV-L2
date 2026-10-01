// Build a per-subject authoring digest from source captures + overview exports.
// Output: research/STUDY_GUIDE_DIGEST.md (grouped, capped for reading)
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const capDir = join(root, "research", "captures", "notebooklm_sources");
const nbDir = join(root, "data", "notebooks");
const manifest = JSON.parse(readFileSync(join(capDir, "manifest.json"), "utf8"));

const SUBJECT_RULES = [
  { id: "mathematics", label: "Mathematics", pat: /mathemat|algebra|factoris|equation|graph|number pattern|financial maths|geometry|trigonometry|statistics|profit|interest|ratio/i },
  { id: "electrotechnology", label: "Electrotechnology", pat: /electrotech|logic gate|truth table|circuit|ohm|resistor|capacitor|induct|voltage|current|power|diode|transistor|mosfet|series|parallel|norton|thevenin|ac circuit|impedance/i },
  { id: "mechatronic-systems", label: "Mechatronic Systems", pat: /mechatronic|pneumatic|hydraulic|sensor|actuator|proximity|plc|programmable logic|motor|solenoid|valve|cylinder|relay|control system|automation|robot|inductive|transducer|open.?loop|closed.?loop/i },
  { id: "introduction-computers", label: "Introduction to Computer", pat: /computer|hardware|software|operating system|network|router|switch|ip address|cpu|memory|storage|peripheral|windows|keyboard|file system|internet|browser/i },
  { id: "manual-manufacturing", label: "Manual Manufacturing", pat: /manual manufactur|weld|machining|lathe|milling|drilling|fitting|sheet metal|blueprint|tolerance|material.*steel|hardening|annealing|grinding|safety.*workshop|filing|sawing/i },
  { id: "life-skills", label: "Life Skills and Computer Literacy", pat: /life skill|computer literacy|health|safety|hygiene|first aid|career|cv |communication skill|citizenship|environment.*awareness/i },
  { id: "english-fal", label: "English First Additional Language", pat: /english|grammar|comprehension|essay|punctuation|vocabulary|language structure/i },
];

function classify(name, texts) {
  const hay = texts.join(" ");
  const scores = SUBJECT_RULES.map((r) => ({ ...r, n: (hay.match(new RegExp(r.pat, "gi")) || []).length }));
  scores.sort((a, b) => b.n - a.n);
  return scores;
}

function headingsFrom(text, cap = 60) {
  const out = [];
  const seen = new Set();
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.length < 4 || line.length > 110) continue;
    const isHeading =
      /^(topic|chapter|section|unit|question|task|part|phase|outcome|aim|objective|content|module)\b/i.test(line) ||
      /^(\d+(\.\d+){0,2})[\s.)-]+[A-Z]/.test(line) ||
      (/^[A-Z][A-Za-z0-9 ,'&()/+-]{3,80}$/.test(line) && !/[.;]$/.test(line) && line.split(" ").length <= 12);
    if (isHeading && !seen.has(line)) {
      seen.add(line);
      out.push(line);
      if (out.length >= cap) break;
    }
  }
  return out;
}

const docs = [];
for (const f of readdirSync(capDir).filter((x) => x.endsWith(".json") && x !== "manifest.json").sort()) {
  const rec = JSON.parse(readFileSync(join(capDir, f), "utf8"));
  const entry = manifest.notebooks.find((n) => n.file === f) || {};
  const summaries = rec.sources.filter((s) => s.summary).map((s) => ({ name: s.name, summary: s.summary }));
  const texts = rec.sources.filter((s) => s.text && s.text.length > 200);
  const headingBag = [];
  for (const s of texts) headingBag.push(...headingsFrom(s.text, 40));
  const scores = classify(rec.title + " " + summaries.map((s) => s.name).join(" "), [
    rec.title,
    ...rec.sources.map((s) => s.name),
    ...summaries.map((s) => s.summary),
    ...texts.map((s) => s.text.slice(0, 4000)),
  ]);
  // overview export (Gemini overview paragraph)
  let overview = "";
  const base = rec.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  try { overview = readFileSync(join(nbDir, `${base}.txt`), "utf8"); } catch {}
  docs.push({ file: f, sha: entry.sha256 || "", rec, summaries, headingBag, scores, overview, textChars: rec.stats.textChars, pages: rec.stats.pages });
}

// aggregate per subject: each doc appears ONLY under its top-scoring subject(s) with n>0 and n>=top/2
const bySubject = {};
for (const rule of SUBJECT_RULES) bySubject[rule.id] = { label: rule.label, docs: [] };
for (const d of docs) {
  const positive = d.scores.filter((s) => s.n > 0);
  if (!positive.length) continue;
  const topN = positive[0].n;
  for (const t of positive) {
    if (t.n < topN / 2) continue; // secondary subjects only if close
    bySubject[t.id].docs.push({ file: d.file, title: d.rec.title, n: t.n, stats: d.rec.stats, summaries: d.summaries, headingBag: [...new Set(d.headingBag)].slice(0, 30), overview: d.overview.slice(0, 700), textHead: d.rec.sources.filter((s) => s.text && !s.summary).map((s) => ({ name: s.name, head: s.text.slice(0, 300) })).slice(0, 2) });
    break; // one subject per doc (first/closest), avoids duplication
  }
}

const lines = [];
lines.push("# Study guide authoring digest — generated from captures (do not hand-edit)");
lines.push("");
lines.push(`Captures: ${docs.length} · total text ${docs.reduce((a, d) => a + d.textChars, 0)} chars · pages ${docs.reduce((a, d) => a + d.pages, 0)} · summaries ${docs.reduce((a, d) => a + d.summaries.length, 0)}`);
lines.push("");
for (const rule of SUBJECT_RULES) {
  const agg = bySubject[rule.id];
  lines.push(`\n# # ${rule.label} (${agg.docs.length} docs)`);
  for (const d of agg.docs.sort((a, b) => b.n - a.n)) {
    lines.push(`\n## DOC: ${d.title}`);
    lines.push(`- file: ${d.file} | score ${d.n} | walked ${d.stats.walked}/${d.stats.totalSources} | chars ${d.stats.textChars} | pages ${d.stats.pages} | summaries ${d.stats.summaries}`);
    if (d.overview) {
      lines.push(`- overview: ${d.overview.replace(/\s+/g, " ")}`);
    }
    for (const s of d.summaries.slice(0, 10)) {
      lines.push(`- SUMMARY [${s.name}]: ${s.summary.replace(/\s+/g, " ")}`);
    }
    if (d.headingBag.length) lines.push(`- HEADINGS: ${d.headingBag.slice(0, 30).join(" | ")}`);
    for (const t of d.textHead) {
      lines.push(`- TEXT[${t.name.slice(0, 50)}]: ${t.head.replace(/\s+/g, " ")}`);
    }
  }
}
const out = join(root, "research", "STUDY_GUIDE_DIGEST.md");
writeFileSync(out, lines.join("\n"));
console.log(`digest written: ${out} (${lines.join("\n").length} chars)`);
