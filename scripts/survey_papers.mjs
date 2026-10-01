// Survey all capture sources: classify QP/MEMO/study, measure text + question patterns.
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const capDir = join(root, "research", "captures", "notebooklm_sources");

const kindOf = (name) => {
  const n = name.toLowerCase();
  if (/memo|memorandum|marking|answer key|answer_key/.test(n)) return "MEMO";
  if (/\bqp\b|question paper|questionnaire|paper|exam|task|test|assessment|worksheet/.test(n)) return "QP?";
  if (/guide|slides|notes|tutorial|text|introduction|study|lesson|transcript|copy/.test(n)) return "STUDY";
  return "OTHER";
};

const rows = [];
for (const f of readdirSync(capDir).filter((x) => x.endsWith(".json") && x !== "manifest.json").sort()) {
  const rec = JSON.parse(readFileSync(join(capDir, f), "utf8"));
  for (const s of rec.sources) {
    const text = s.text || "";
    const qLabels = (text.match(/^\s*QUESTION\s+\d+/gim) || []).length;
    const subQ = (text.match(/^\s*\d{1,2}\.\d{1,2}(\.\d{1,2})?\s+\S/gm) || []).length;
    const marks = (text.match(/\(\s*\d{1,2}\s*\)\s*$/gm) || []).length;
    rows.push({
      file: f.slice(0, 2),
      kind: kindOf(s.name),
      name: s.name,
      chars: text.length,
      summary: s.summary ? s.summary.length : 0,
      pages: (s.pageImages || []).length,
      qLabels,
      subQ,
      marks,
    });
  }
}

rows.sort((a, b) => b.chars - a.chars);
const pad = (v, n) => String(v).padEnd(n);
console.log(pad("cap", 4) + pad("kind", 6) + pad("chars", 8) + pad("sum", 5) + pad("pgs", 4) + pad("Q-lbl", 5) + pad("n.n", 5) + pad("(m)", 4) + "  name");
for (const r of rows) {
  console.log(
    pad(r.file, 4) + pad(r.kind, 6) + pad(r.chars, 8) + pad(r.summary, 5) + pad(r.pages, 4) + pad(r.qLabels, 5) + pad(r.subQ, 5) + pad(r.marks, 4) + "  " + r.name.slice(0, 72)
  );
}
const withText = rows.filter((r) => r.chars > 2000);
console.log(`\nsources: ${rows.length} | with text >2k: ${withText.length} | total text: ${rows.reduce((a, r) => a + r.chars, 0)}`);
console.log(`QP? sources: ${rows.filter((r) => r.kind === "QP?").length} | MEMO sources: ${rows.filter((r) => r.kind === "MEMO").length}`);
