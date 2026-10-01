import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "data", "notebooks");
const allowed = new Set([".md", ".txt", ".markdown"]);

const documents = [];
for (const name of readdirSync(dir).sort()) {
  const full = join(dir, name);
  if (!statSync(full).isFile()) continue;
  if (/^readme\./i.test(name)) continue;
  if (!allowed.has(extname(name).toLowerCase())) continue;
  const buffer = readFileSync(full);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const content = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const heading = content.match(/^#\s+(.+)$/m);
  const title = heading ? heading[1].trim() : basename(name, extname(name));
  const words = content.split(/\s+/).filter(Boolean).length;
  documents.push({
    id: name,
    title,
    file: `data/notebooks/${name}`,
    wordCount: words,
    sha256,
    excerpt: content.replace(/[#>*_`\-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 280),
    content,
  });
}

const payload = {
  generatedAt: new Date().toISOString(),
  count: documents.length,
  documents,
};
writeFileSync(join(dir, "index.json"), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`indexed ${documents.length} notebook file(s) -> data/notebooks/index.json`);
