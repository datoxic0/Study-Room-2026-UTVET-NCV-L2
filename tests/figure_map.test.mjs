import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildItemBank, FIGURE_RE } from "../js/core/assessment.js";
import { FIGURE_MAP } from "../js/data/figure_map.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// No frozen id list here: figure honesty is checked structurally. Every bank
// item whose text references a figure must be either (a) mapped to a verified
// image asset (figure set, gate cleared) or (b) honestly gated (figure null,
// needsFigure true). Groups of currently-gated items: capture-era sources with
// no usable page images; locally downloaded papers (no figure assets harvested
// for them — the original PDF always stays openable); OCR'd scans whose figures
// live only in the original PDF.

test("every figure-referencing bank item is mapped or honestly gated", () => {
  const bank = buildItemBank();
  const hits = bank.filter((i) => FIGURE_RE.test(i.text));
  assert.ok(hits.length >= 83, `expected >=83 figure items, got ${hits.length}`);
  let gated = 0;
  let mapped = 0;
  for (const item of hits) {
    if (Object.hasOwn(FIGURE_MAP, item.id)) {
      mapped++;
      assert.ok(item.figure, `${item.id}: mapped but shows no figure asset`);
      assert.equal(item.needsFigure, false, `${item.id}: mapped item must clear the gate`);
    } else {
      gated++;
      assert.equal(item.figure, null, `${item.id}: unmapped item must show no figure`);
      assert.equal(item.needsFigure, true, `${item.id}: figure ref with no asset must be gated`);
    }
  }
  assert.ok(mapped >= 1, "at least one verified figure asset ships");
  assert.ok(gated >= 1, "at least one honest gate ships");
});

test("gated items are exactly figure references with no asset", () => {
  const bank = buildItemBank();
  const gated = bank.filter((i) => i.needsFigure);
  assert.ok(gated.length >= 1, "expected gated items in the current bank");
  for (const item of gated) {
    assert.ok(FIGURE_RE.test(item.text), `${item.id}: gated without a figure reference`);
    assert.equal(item.figure, null, `${item.id}: gated item must not show a figure`);
  }
});

test("mapped items clear the gate and expose their figure", () => {
  const bank = buildItemBank();
  for (const [id, path] of Object.entries(FIGURE_MAP)) {
    const item = bank.find((i) => i.id === id);
    assert.ok(item, `figure_map key not in bank: ${id}`);
    assert.equal(item.figure, path, `${id} figure path`);
    assert.equal(item.needsFigure, false, `${id} must not be gated`);
    assert.ok(FIGURE_RE.test(item.text), `${id} text must reference a figure`);
  }
});

test("every mapped figure file exists on disk", () => {
  for (const [id, path] of Object.entries(FIGURE_MAP)) {
    assert.ok(existsSync(join(ROOT, path)), `missing file for ${id}: ${path}`);
    assert.match(path, /^figures\/_raw\/[\w.-]+\/img-\d+_\d+x\d+\.jpg$/, `odd path for ${id}: ${path}`);
  }
});
