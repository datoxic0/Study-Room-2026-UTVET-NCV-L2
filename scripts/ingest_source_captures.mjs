import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "research", "captures", "notebooklm_sources");
const outDir = join(root, "data", "notebooks");

const slugify = (s) =>
  (s || "notebook")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const files = readdirSync(srcDir).filter((f) => f.endsWith(".json") && f !== "manifest.json").sort();
const manifest = JSON.parse(readFileSync(join(srcDir, "manifest.json"), "utf8"));
const shaByFile = new Map(manifest.notebooks.map((n) => [n.file, n.sha256]));

let written = 0;
let totalChars = 0;
for (const f of files) {
  const rec = JSON.parse(readFileSync(join(srcDir, f), "utf8"));
  const sha = shaByFile.get(f) || "";
  const lines = [];
  lines.push(`# ${rec.title || "Notebook"} - source capture`);
  lines.push("");
  lines.push(`Notebook: ${rec.url}`);
  lines.push(
    `Captured: ${rec.updatedAt} | walker: notebooklm-ingestion extension | sources: ${rec.stats.walked}/${rec.stats.totalSources} | text chars: ${rec.stats.textChars} | page images: ${rec.stats.pages} | summaries: ${rec.stats.summaries}`,
  );
  lines.push(`Provenance: research/captures/notebooklm_sources/${f} sha256 ${sha}`);
  lines.push("");
  for (const s of rec.sources) {
    lines.push(`## ${s.index + 1}. ${s.name}`);
    lines.push("");
    lines.push(`Type: ${s.kind} | text chars: ${s.textChars} | page images: ${s.pageImages.length} | summary chars: ${(s.summary || "").length}`);
    lines.push("");
    if (s.summary) {
      lines.push("### Summary");
      lines.push("");
      lines.push(s.summary.trim());
      lines.push("");
    }
    if (s.text && s.text.trim()) {
      lines.push("### Text");
      lines.push("");
      lines.push(s.text.trim());
      lines.push("");
      totalChars += s.textChars;
    } else if (s.pageImages.length) {
      lines.push("### Pages");
      lines.push("");
      lines.push(`PDF rendered as ${s.pageImages.length} page image(s); source text is not exposed in the DOM.`);
      lines.push("");
      for (const u of s.pageImages) lines.push(`- ${u}`);
      lines.push("");
    } else {
      lines.push("_No extractable text or page images captured._");
      lines.push("");
    }
  }
  const outName = `${slugify(rec.title)}.sources.txt`;
  writeFileSync(join(outDir, outName), `${lines.join("\n").replace(/\n{3,}/g, "\n\n")}\n`, "utf8");
  written++;
  console.log(`wrote data/notebooks/${outName}`);
}
console.log(`ingested ${written} source captures (${totalChars} text chars) -> data/notebooks/*.sources.txt`);
