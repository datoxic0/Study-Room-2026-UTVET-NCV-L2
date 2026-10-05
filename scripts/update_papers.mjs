#!/usr/bin/env node
// One command to refresh the papers shelf after dropping new QP/memo files
// into research/Data-QuestionPapers-and-Memos-Downloaded/:
//
//   1. scripts/extract_local_text.py  measure the folder, classify text-layer
//                                     vs scan, hash every ingested original
//                                     (exclusions.json skips non-papers)
//   2. scripts/ocr_papers.py          transcribe new scans with both OCR
//                                     engines (resumable — only new/changed
//                                     files are re-OCR'd)
//   3. scripts/extract_papers.mjs     rebuild js/data/paper_shelf.js from
//                                     filenames + catalog.json overrides
//   4. scripts/validate.mjs           lint the app
//   5. node --test                    full test suite
//
// Exit code 0 means the shelf, the app and the honesty invariants are all green.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const stages = [
  { name: "measure folder", cmd: "python", args: ["scripts/extract_local_text.py"] },
  { name: "OCR new scans", cmd: "python", args: ["scripts/ocr_papers.py"] },
  { name: "build shelf", cmd: process.execPath, args: ["scripts/extract_papers.mjs"] },
  { name: "lint app", cmd: process.execPath, args: ["scripts/validate.mjs"] },
  { name: "test suite", cmd: process.execPath, args: ["--test", "--test-reporter=tap", "tests/*.test.mjs"] },
];

for (const stage of stages) {
  console.log(`\n=== ${stage.name}: ${stage.cmd} ${stage.args.join(" ")} ===`);
  const result = spawnSync(stage.cmd, stage.args, { cwd: ROOT, stdio: "inherit" });
  if (result.error) {
    console.error(`[FAIL] ${stage.name}: cannot start ${stage.cmd}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`[FAIL] ${stage.name}: exit ${result.status} — fix this stage before continuing.`);
    process.exit(result.status ?? 1);
  }
  console.log(`[OK] ${stage.name}`);
}
console.log("\nAll stages green — shelf, lint and tests are in sync.");
