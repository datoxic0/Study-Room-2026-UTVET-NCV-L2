import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyLocalFile, resolveLocalPairs } from "../scripts/paper_naming.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));

const golden = readJson("tests/fixtures/local_golden.json");
const catalog = readJson("research/Data-QuestionPapers-and-Memos-Downloaded/catalog.json");
const manifest = readJson("research/captures/local_pdfs/manifest.json");
const overridesByFile = new Map(catalog.overrides.map((o) => [o.file, o.overrides]));
const manifestByFile = new Map(manifest.files.map((e) => [path.basename(e.file), e]));

test("classifier reproduces every hand-curated local entry (golden set)", () => {
  assert.equal(golden.length, 31, "frozen golden rows");
  const derived = resolveLocalPairs(
    golden.map((row) => classifyLocalFile(row.file, overridesByFile.get(row.file) || {})),
  );
  const gotById = new Map(
    derived.map((e) => [e.id, { ...e, mode: manifestByFile.get(e.file).textFile ? "qa" : "pdf" }]),
  );
  assert.equal(gotById.size, golden.length, "derived ids must be unique");
  for (const row of golden) {
    const got = gotById.get(row.id);
    assert.ok(got, `derived id missing: expected ${row.id} for ${row.file}`);
    // extract_papers normalises pairId with `|| null` — compare on that shape
    assert.deepEqual(got, { ...row, pairId: row.pairId ?? null }, `mismatch for ${row.file}`);
  }
});

test("every manifest file is covered by the golden set (no orphan downloads)", () => {
  const goldenFiles = new Set(golden.map((row) => row.file));
  for (const entry of manifest.files) {
    const name = path.basename(entry.file);
    assert.ok(goldenFiles.has(name), `manifest file not in golden set: ${name}`);
  }
});

test("a future tvetpapers QP classifies with no hand-editing", () => {
  const e = classifyLocalFile("NC1040_-_ELECTROTECHNOLOGY_L2_QP_NOV_2027_-_tvetpapers.co.za.pdf");
  assert.deepEqual(
    { id: e.id, subject: e.subject, title: e.title, session: e.session, kind: e.kind, level: e.level, pairId: e.pairId },
    { id: "elec-nc1040-qp-nov2027", subject: "electrotechnology", title: "NC1040 Electrotechnology — November 2027 QP", session: "November 2027", kind: "qp", level: "L2", pairId: null },
  );
});

test("pairing is data-driven: QP+memo pair, lone papers stay unpaired, collisions throw", () => {
  const qp = classifyLocalFile("NC1040_-_ELECTROTECHNOLOGY_L2_QP_NOV_2027_-_tvetpapers.co.za.pdf");
  const memo = classifyLocalFile("NC1040_-_ELECTROTECHNOLOGY_L2_MEMO_NOV_2027_-_tvetpapers.co.za.pdf");
  const lone = classifyLocalFile("NC1540_-_INTRODUCTION_TO_COMPUTERS_L2_SUPP_QP_2027_-_tvetpapers.co.za.pdf");
  resolveLocalPairs([qp, memo, lone]);
  assert.equal(qp.pairId, memo.id);
  assert.equal(memo.pairId, qp.id);
  assert.equal(lone.pairId, null);

  const a = classifyLocalFile("NC1040_-_ELECTROTECHNOLOGY_L2_QP_NOV_2027_-_tvetpapers.co.za.pdf");
  const b = classifyLocalFile("NC1040_-_ELECTROTECHNOLOGY_L2_QP_NOV_2027.pdf");
  assert.throws(() => resolveLocalPairs([a, b]), /ambiguous QP\/memo pair/);
});

test("unclassifiable filenames fail loudly instead of guessing", () => {
  assert.throws(() => classifyLocalFile("mystery-scan.pdf"), /cannot derive subject/);
  assert.throws(() => classifyLocalFile("Some_Electrotechnology_Notes_2025.pdf"), /cannot derive kind/);
  assert.throws(() => classifyLocalFile("NC1040_ELECTROTECHNOLOGY_L2_QP.pdf"), /cannot derive session/);
});
