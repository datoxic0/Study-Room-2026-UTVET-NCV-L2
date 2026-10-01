import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { paperShelf, papersBySubject, paperById, PAPERS_BUILT_ON } from "../js/data/paper_shelf.js";
import { studyGuides } from "../js/data/study_guides.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const capDir = join(root, "research", "captures", "notebooklm_sources");
const manifest = JSON.parse(readFileSync(join(capDir, "manifest.json"), "utf8"));
const manifestByFile = new Map(manifest.notebooks.map((entry) => [entry.file, entry]));
const captureCache = new Map();

function loadSource(file, sourceName) {
  const key = `${file}::${sourceName}`;
  if (captureCache.has(key)) return captureCache.get(key);
  const record = JSON.parse(readFileSync(join(capDir, file), "utf8"));
  const source = record.sources.find((entry) => entry.name === sourceName);
  assert.ok(source, `source not found: ${sourceName} in ${file}`);
  captureCache.set(key, source);
  return source;
}

const norm = (value) => value.replace(/\s+/g, " ").trim();

const EXPECTED_IDS = [
  "intro-2010-qp", "intro-2018mar-qp", "intro-2018nov-qp", "intro-2021-qp", "intro-2021-memo",
  "math-2015p1", "math-task1-2025", "math-task2-2026", "math-exercize-memo", "math-task6",
  "elec-nc1000-qp-2023", "elec-nc1000-memo-2023", "elec-nc1000-memo-2022", "elec-nc1000-memo-supp2023",
  "elec-2025y", "elec-calc-guide", "elec-activity-solutions",
  "mech-nc2090-qp", "mech-nc2100-qp", "mech-june-test", "mech-q5-master", "mech-pasted-practice",
  "mech-gclamp", "mech-isat",
  "mm-nc1780-qp", "mm-nc1810-qp-2019", "mm-qp-2025", "mm-memo-2025", "mm-qp-supp2024", "mm-memo-supp2024",
];

const KIND_MODE = {
  qa: ["qp", "memo", "practice", "solutions"],
  images: ["qp", "memo"],
  raw: ["solutions", "practice"],
  solved: ["solved"],
  solutions: ["solutions"],
};

test("shelf has the stable curated id set", () => {
  assert.ok(PAPERS_BUILT_ON.match(/^\d{4}-\d{2}-\d{2}$/), "PAPERS_BUILT_ON must be ISO");
  assert.equal(paperShelf.length, EXPECTED_IDS.length);
  assert.deepEqual(paperShelf.map((entry) => entry.id).sort(), [...EXPECTED_IDS].sort());
  assert.equal(new Set(paperShelf.map((entry) => entry.id)).size, EXPECTED_IDS.length);
  for (const entry of paperShelf) {
    assert.ok(entry.title && entry.session, `${entry.id} missing title/session`);
    assert.ok(entry.note && entry.note.length >= 40, `${entry.id} note too short`);
    assert.ok(!/\b(TODO|TBD|FIXME|lorem ipsum)\b/i.test(`${entry.title} ${entry.note}`), `${entry.id} placeholder`);
    assert.ok(["L2", "L3"].includes(entry.level), `${entry.id} bad level`);
    assert.ok(KIND_MODE[entry.mode]?.includes(entry.kind), `${entry.id} bad kind/mode ${entry.kind}/${entry.mode}`);
    assert.ok(entry.pages >= 0 && entry.textChars >= 0 && entry.summaryChars >= 0, `${entry.id} bad counters`);
  }
});

test("provenance: every entry cites a manifest-verified capture file", () => {
  for (const entry of paperShelf) {
    const record = manifestByFile.get(entry.capture.file);
    assert.ok(record, `${entry.id}: capture ${entry.capture.file} not in manifest`);
    assert.equal(entry.capture.sha256.toUpperCase(), record.sha256.toUpperCase(), `${entry.id}: sha mismatch`);
    assert.ok(existsSync(join(capDir, entry.capture.file)), `${entry.id}: capture file missing on disk`);
    assert.ok(entry.capture.sourceName.length > 0, `${entry.id}: source name missing`);
    loadSource(entry.capture.file, entry.capture.sourceName);
  }
});

// Extraction deletes page furniture (footers, subject codes, totals) from parsed
// rows. Provenance therefore means: every display string is assembled ONLY from
// verbatim capture chunks found in order — nothing may be invented, reordered
// or rewritten. Chunks may not be shorter than MIN_CHUNK except for short
// bridges at deletion seams, and bridges are budget-limited.
const MIN_CHUNK = 10;
const BRIDGE_BUDGET = 12;

function assertBuiltFrom(haystack, value, label) {
  const needle = norm(value);
  if (!needle) return;
  let from = 0;
  let pos = 0;
  let bridged = 0;
  while (pos < needle.length) {
    let found = -1;
    let len = 0;
    const max = Math.min(needle.length - pos, 500);
    for (let l = max; l >= MIN_CHUNK; l--) {
      const idx = haystack.indexOf(needle.slice(pos, pos + l), from);
      if (idx !== -1) {
        found = idx;
        len = l;
        break;
      }
    }
    if (found === -1) {
      const shortMax = Math.min(needle.length - pos, BRIDGE_BUDGET);
      for (let l = shortMax; l >= 1; l--) {
        const idx = haystack.indexOf(needle.slice(pos, pos + l), from);
        if (idx !== -1) {
          found = idx;
          len = l;
          break;
        }
      }
      assert.notEqual(found, -1, `${label}: no verbatim capture chunk at ${needle.slice(pos, pos + 50)}`);
      bridged += len;
    }
    from = found + len;
    pos += len;
  }
  const budget = Math.max(BRIDGE_BUDGET, Math.ceil(needle.length * 0.08));
  assert.ok(bridged <= budget, `${label}: ${bridged} chars fall outside verbatim chunks (budget ${budget}): ${needle.slice(0, 90)}`);
}

test("no fabrication: every parsed string is built only from verbatim capture chunks", () => {
  for (const entry of paperShelf) {
    const source = loadSource(entry.capture.file, entry.capture.sourceName);
    if (entry.mode === "raw") {
      assert.equal(entry.text, source.text, `${entry.id}: raw text must equal capture text exactly`);
      continue;
    }
    if (entry.mode === "images") {
      assert.equal(entry.summary, source.summary, `${entry.id}: summary must equal capture summary exactly`);
      assert.equal(entry.textChars, 0, `${entry.id}: image-only entry must report 0 text chars`);
      assert.ok(entry.summary.length >= 100, `${entry.id}: image-only entry needs a real summary`);
      assert.ok(entry.pages >= 1, `${entry.id}: image-only entry needs page images`);
      continue;
    }
    const ownText = norm(source.text || "");
    const memoSourceText = (() => {
      if (!entry.pairId) return ownText;
      const partner = paperById(entry.pairId);
      if (!partner || partner.kind !== "memo") return ownText;
      const partnerSource = loadSource(partner.capture.file, partner.capture.sourceName);
      return norm(partnerSource.text || "");
    })();
    const assertInside = (value, haystack, label) => {
      if (!value) return;
      assertBuiltFrom(haystack, value, `${entry.id}: ${label}`);
    };
    if (entry.mode === "qa") {
      for (const question of entry.questions) {
        assertInside(question.stem, ownText, `question ${question.n} stem`);
        for (const sub of question.subs) {
          if (sub.empty) {
            assert.equal(sub.text, "", `${entry.id}/${sub.n}: empty rows must carry empty text`);
          } else {
            assertInside(sub.text, ownText, `${question.n}.${sub.n} text`);
          }
          if (sub.marks) assert.match(sub.marks, /^\d{1,3}([x\u00d7]\d{1,3})?$/, `${entry.id}/${sub.n} bad marks`);
          if (sub.memo) assertInside(sub.memo, memoSourceText, `${question.n}.${sub.n} memo`);
        }
      }
    } else if (entry.mode === "solved") {
      for (const set of entry.sets) {
        assertInside(set.label, ownText, `set label ${set.label}`);
        for (const sub of set.subs) {
          assertInside(sub.text, ownText, `set ${set.label} ${sub.n} text`);
          if (sub.memo) assertInside(sub.memo, ownText, `set ${set.label} ${sub.n} memo`);
        }
      }
    } else if (entry.mode === "solutions") {
      for (const block of entry.blocks) {
        assert.ok(block.question && block.answer, `${entry.id}: block ${block.n} needs question and answer`);
        assertInside(block.question, ownText, `block ${block.n} question`);
        assertInside(block.answer, ownText, `block ${block.n} answer`);
        assertInside(block.analysis, ownText, `block ${block.n} analysis`);
      }
    }
  }
});

test("formula sheets are extracted verbatim, never dropped", () => {
  const marker = /FORMULA SHEET\s*\d*\s*\$/i;
  const sheetEntries = paperShelf.filter((entry) => {
    if (entry.mode === "raw" || entry.mode === "images") return false;
    const source = loadSource(entry.capture.file, entry.capture.sourceName);
    return marker.test(norm(source.text || ""));
  });
  assert.ok(sheetEntries.length >= 2, `expected the two maths papers to carry a sheet, got ${sheetEntries.length}`);
  for (const entry of sheetEntries) {
    assert.ok(Array.isArray(entry.formulaSheet) && entry.formulaSheet.length >= 5, `${entry.id}: formulaSheet missing/too small`);
    const ownText = norm(loadSource(entry.capture.file, entry.capture.sourceName).text || "");
    for (const formula of entry.formulaSheet) {
      assert.match(formula, /^\$[^$]+\$$/, `${entry.id}: sheet entry must be one $...$ formula: ${formula.slice(0, 60)}`);
      assert.ok(ownText.includes(formula), `${entry.id}: sheet formula not verbatim in capture: ${formula.slice(0, 60)}`);
    }
    // the sheet block was stripped out of the question rows — so it must live here
    if (entry.mode === "qa") {
      for (const question of entry.questions) {
        assert.ok(!/FORMULA SHEET/i.test(question.stem), `${entry.id}/${question.n}: sheet header still in stem`);
        for (const sub of question.subs) {
          assert.ok(!/FORMULA SHEET/i.test(sub.text || ""), `${entry.id}/${sub.n}: sheet header still in text`);
          assert.ok(!/FORMULA SHEET/i.test(sub.memo || ""), `${entry.id}/${sub.n}: sheet header still in memo`);
        }
      }
    }
  }
});

test("numbering structure: unique, well-formed, consistently typed", () => {
  const numberPattern = /^\d{1,2}(\.\d{1,2}){1,2}$/;
  for (const entry of paperShelf) {
    if (entry.mode === "qa") {
      assert.ok(entry.questions.length >= 1, `${entry.id}: no questions`);
      const seen = new Set();
      for (const question of entry.questions) {
        assert.match(question.n, /^\d{1,2}$/, `${entry.id}: bad question number ${question.n}`);
        for (const sub of question.subs) {
          assert.match(sub.n, numberPattern, `${entry.id}: bad sub number ${sub.n}`);
          assert.ok(!seen.has(sub.n), `${entry.id}: duplicate sub number ${sub.n}`);
          seen.add(sub.n);
          assert.equal(typeof sub.memo === "string" || sub.memo === null, true, `${entry.id}/${sub.n} memo type`);
          assert.ok(!/^[.:;,-]/.test(sub.text), `${entry.id}/${sub.n} leading punctuation`);
          if (sub.memo) assert.ok(!/^[.:;,-]/.test(sub.memo), `${entry.id}/${sub.n} memo leading punctuation`);
        }
      }
      const subs = entry.questions.reduce((total, question) => total + question.subs.length, 0);
      assert.ok(subs >= 1 || entry.questions.some((question) => question.stem.length >= 30), `${entry.id}: no content`);
    } else if (entry.mode === "solved") {
      assert.ok(entry.sets.length >= 1, `${entry.id}: no sets`);
      for (const set of entry.sets) {
        assert.ok(set.label.length > 0, `${entry.id}: empty set label`);
        for (const sub of set.subs) {
          assert.match(sub.n, numberPattern, `${entry.id}: bad sub number ${sub.n}`);
          assert.ok(sub.text.length > 0, `${entry.id}/${sub.n} empty text`);
          assert.equal(typeof sub.memo === "string" || sub.memo === null, true, `${entry.id}/${sub.n} memo type`);
        }
      }
    } else if (entry.mode === "solutions") {
      assert.ok(entry.blocks.length >= 3, `${entry.id}: fewer than 3 worked blocks`);
      const seen = new Set();
      for (const block of entry.blocks) {
        assert.ok(!seen.has(block.n), `${entry.id}: duplicate block ${block.n}`);
        seen.add(block.n);
      }
    }
  }
});

test("joined memo answers are real and counted honestly", () => {
  const withJoin = paperShelf.filter((entry) => entry.joinedMemoSubs !== undefined);
  assert.equal(withJoin.length, 1, "exactly one cross-capture memo join expected");
  const entry = withJoin[0];
  assert.equal(entry.id, "intro-2021-qp");
  const actual = entry.questions.reduce(
    (total, question) => total + question.subs.filter((sub) => typeof sub.memo === "string" && sub.memo.length > 0).length,
    0
  );
  assert.equal(entry.joinedMemoSubs, actual, `${entry.id}: joinedMemoSubs must equal actual memo strings`);
  assert.ok(entry.joinedMemoSubs >= 20, `${entry.id}: expected most sub-answers joined`);

  const embedded = paperShelf.filter((entry) => entry.embeddedMemo !== undefined);
  assert.equal(embedded.length, 1, "exactly one embedded-memo capture expected");
  assert.equal(embedded[0].id, "math-task1-2025");
  assert.ok(embedded[0].embeddedMemo >= 10, "embedded memo should cover most parts");
});

test("pair integrity: reciprocal, same subject, qp<->memo", () => {
  const paired = paperShelf.filter((entry) => entry.pairId);
  assert.equal(paired.length, 8, "four reciprocal pairs expected");
  for (const entry of paired) {
    const partner = paperById(entry.pairId);
    assert.ok(partner, `${entry.id}: partner missing`);
    assert.equal(partner.pairId, entry.id, `${entry.id}: pair not reciprocal`);
    assert.equal(partner.subject, entry.subject, `${entry.id}: pair crosses subjects`);
    assert.equal(entry.pairId, paperById(entry.pairId).id, `${entry.id}: pair id resolution`);
    const kinds = [entry.kind, partner.kind].sort().join("+");
    assert.equal(kinds, "memo+qp", `${entry.id}: pair must be qp+memo, got ${kinds}`);
  }
});

test("subject coverage honesty: shelf only claims captured subjects", () => {
  const guideIds = new Set(studyGuides.map((guide) => guide.id));
  for (const entry of paperShelf) {
    assert.ok(guideIds.has(entry.subject), `${entry.id}: subject ${entry.subject} has no study guide`);
    assert.ok(papersBySubject(entry.subject).some((candidate) => candidate.id === entry.id), `${entry.id}: papersBySubject fails`);
  }
  assert.equal(papersBySubject("english-fal").length, 0, "English FAL must have no captured papers");
  assert.equal(papersBySubject("life-skills-and-computer-literacy").length, 0, "Life Skills must have no captured papers");
  assert.equal(paperById("no-such-paper"), null);
});

test("workroom has real answers to reveal where claimed", () => {
  const revealModes = ["qa", "solved", "solutions", "images"];
  let withAnswers = 0;
  for (const entry of paperShelf) {
    if (!revealModes.includes(entry.mode)) continue;
    withAnswers++;
  }
  assert.ok(withAnswers >= 20, `expected >=20 revealable entries, got ${withAnswers}`);
  const memoed = paperShelf.reduce((total, entry) => {
    if (entry.mode === "qa") {
      return total + entry.questions.reduce((t, q) => t + q.subs.filter((s) => typeof s.memo === "string" && s.memo).length, 0);
    }
    if (entry.mode === "solved") return total + entry.sets.reduce((t, set) => t + set.subs.filter((s) => typeof s.memo === "string" && s.memo).length, 0);
    return total;
  }, 0);
  assert.ok(memoed >= 50, `expected >=50 verbatim memo answers across the shelf, got ${memoed}`);
  const solved = paperById("mech-q5-master");
  const solvedMemoed = solved.sets.reduce((total, set) => total + set.subs.filter((s) => typeof s.memo === "string" && s.memo).length, 0);
  assert.equal(solvedMemoed, solved.sets.reduce((total, set) => total + set.subs.length, 0), "every solved-set part must reveal a memo answer");
});
