import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { paperShelf, papersBySubject, paperById, PAPERS_BUILT_ON } from "../js/data/paper_shelf.js";
import { studyGuides } from "../js/data/study_guides.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const capDir = join(root, "research", "captures", "notebooklm_sources");
const manifest = JSON.parse(readFileSync(join(capDir, "manifest.json"), "utf8"));
const manifestByFile = new Map(manifest.notebooks.map((entry) => [entry.file, entry]));
const localDir = join(root, "research", "captures", "local_pdfs");
const localManifest = JSON.parse(readFileSync(join(localDir, "manifest.json"), "utf8"));
const localByPath = new Map(localManifest.files.map((entry) => [entry.file, entry]));
// Phase 2: scanned originals are transcribed by scripts/ocr_papers.py (rapidocr
// parses, Windows OCR cross-checks) and hashed in ocr_manifest.json.
const ocrManifest = JSON.parse(readFileSync(join(localDir, "ocr_manifest.json"), "utf8"));
const ocrByFile = new Map(ocrManifest.files.map((entry) => [entry.file, entry]));
const captureCache = new Map();

const sha256Of = (absPath) => createHash("sha256").update(readFileSync(absPath)).digest("hex");

function loadSource(file, sourceName) {
  const key = `${file}::${sourceName}`;
  if (captureCache.has(key)) return captureCache.get(key);
  const record = JSON.parse(readFileSync(join(capDir, file), "utf8"));
  const source = record.sources.find((entry) => entry.name === sourceName);
  assert.ok(source, `source not found: ${sourceName} in ${file}`);
  captureCache.set(key, source);
  return source;
}

function loadLocalText(entry) {
  const record = localByPath.get(entry.capture.file);
  assert.ok(record, `${entry.id}: local manifest entry missing for ${entry.capture.file}`);
  if (entry.ocr) {
    // scanned original: the verbatim haystack is both OCR transcripts (the
    // parse source plus the cross-check engine fillFromCross may pull from)
    const ocr = ocrByFile.get(entry.capture.file);
    assert.ok(ocr, `${entry.id}: ocr manifest entry missing for ${entry.capture.file}`);
    const primary = readFileSync(join(localDir, ocr.spacedFile || ocr.rapidFile), "utf8");
    const cross = ocr.winrtFile ? readFileSync(join(localDir, ocr.winrtFile), "utf8") : "";
    return `${primary}\n${cross}`;
  }
  assert.ok(record.textFile, `${entry.id}: qa entry has no extracted text file`);
  return readFileSync(join(localDir, record.textFile), "utf8");
}

const norm = (value) => value.replace(/\s+/g, " ").trim();

const EXPECTED_CAPTURE_IDS = [
  "intro-2010-qp", "intro-2018mar-qp", "intro-2018nov-qp", "intro-2021-qp", "intro-2021-memo",
  "math-2015p1", "math-task1-2025", "math-task2-2026", "math-exercize-memo", "math-task6",
  "elec-nc1000-qp-2023", "elec-nc1000-memo-2023", "elec-nc1000-memo-2022", "elec-nc1000-memo-supp2023",
  "elec-2025y", "elec-calc-guide", "elec-activity-solutions",
  "mech-nc2090-qp", "mech-nc2100-qp", "mech-june-test", "mech-q5-master", "mech-pasted-practice",
  "mech-gclamp", "mech-isat",
  "mm-nc1780-qp", "mm-nc1810-qp-2019", "mm-qp-2025", "mm-memo-2025", "mm-qp-supp2024", "mm-memo-supp2024",
];
// NOTE: locally downloaded entries are NOT frozen here — their ids/titles/
// sessions are derived by scripts/paper_naming.mjs (golden-tested against the
// historical set) and their folder coverage is enforced by the test below.

const KIND_MODE = {
  qa: ["qp", "memo", "practice", "solutions"],
  images: ["qp", "memo"],
  pdf: ["qp", "memo"],
  raw: ["solutions", "practice"],
  solved: ["solved"],
  solutions: ["solutions"],
};

test("shelf: frozen capture archive + structurally sound entries", () => {
  assert.ok(PAPERS_BUILT_ON.match(/^\d{4}-\d{2}-\d{2}$/), "PAPERS_BUILT_ON must be ISO");
  const captures = paperShelf.filter((entry) => !entry.capture.local).map((entry) => entry.id).sort();
  assert.deepEqual(captures, [...EXPECTED_CAPTURE_IDS].sort(), "NotebookLM capture archive must not drift");
  const local = paperShelf.filter((entry) => entry.capture.local);
  assert.ok(local.length >= 31, `expected at least the 31 shipped downloads, got ${local.length}`);
  assert.equal(new Set(paperShelf.map((entry) => entry.id)).size, paperShelf.length, "unique ids");
  for (const entry of paperShelf) {
    assert.ok(entry.title && entry.session, `${entry.id} missing title/session`);
    assert.ok(entry.note && entry.note.length >= 40, `${entry.id} note too short`);
    assert.ok(!/\b(TODO|TBD|FIXME|lorem ipsum)\b/i.test(`${entry.title} ${entry.note}`), `${entry.id} placeholder`);
    assert.ok(["L2", "L3"].includes(entry.level), `${entry.id} bad level`);
    assert.ok(KIND_MODE[entry.mode]?.includes(entry.kind), `${entry.id} bad kind/mode ${entry.kind}/${entry.mode}`);
    assert.ok(entry.pages >= 0 && entry.textChars >= 0 && entry.summaryChars >= 0, `${entry.id} bad counters`);
  }
});

test("download folder coverage: every file ingested or excluded with a reason", () => {
  const dataDir = join(root, "research", "Data-QuestionPapers-and-Memos-Downloaded");
  const exclusions = JSON.parse(readFileSync(join(dataDir, "exclusions.json"), "utf8"));
  const folderFiles = readdirSync(dataDir).filter((f) => /\.(pdf|docx)$/i.test(f));
  const excluded = new Map(exclusions.excluded.map((e) => [e.file, e.reason]));
  const manifestFiles = new Set(localManifest.files.map((e) => basename(e.file)));
  const shelfLocal = new Set(paperShelf.filter((e) => e.capture.local).map((e) => e.capture.sourceName));

  assert.equal(exclusions.excluded.length, excluded.size, "duplicate exclusion rows");
  for (const file of excluded.keys()) assert.ok(folderFiles.includes(file), `exclusion names missing file: ${file}`);
  for (const file of folderFiles) {
    const inManifest = manifestFiles.has(file);
    const inExcluded = excluded.has(file);
    assert.ok(inManifest || inExcluded, `${file}: neither ingested (in manifest) nor excluded (exclusions.json)`);
    assert.ok(!(inManifest && inExcluded), `${file}: listed as both ingested and excluded`);
    if (inExcluded) assert.ok(excluded.get(file).length >= 15, `${file}: exclusion reason too short`);
  }
  // manifest <-> shelf bijection: every measured download ships as exactly one card
  for (const file of manifestFiles) assert.ok(shelfLocal.has(file), `manifest file not on shelf: ${file}`);
  for (const file of shelfLocal) assert.ok(manifestFiles.has(file), `shelf entry not in manifest: ${file}`);
  assert.equal(shelfLocal.size, manifestFiles.size, "manifest <-> shelf must be 1:1");
  assert.ok(shelfLocal.size >= 31, `expected at least the 31 shipped downloads, got ${shelfLocal.size}`);
});

test("provenance: every entry cites a manifest-verified source file", () => {
  for (const entry of paperShelf) {
    if (entry.capture.local) {
      const record = localByPath.get(entry.capture.file);
      assert.ok(record, `${entry.id}: local source ${entry.capture.file} not in local manifest`);
      assert.equal(entry.capture.sha256.toUpperCase(), record.sha256.toUpperCase(), `${entry.id}: local sha mismatch vs manifest`);
      const abs = join(root, entry.capture.file);
      assert.ok(existsSync(abs), `${entry.id}: local source file missing on disk`);
      const actual = createHash("sha256").update(readFileSync(abs)).digest("hex");
      assert.equal(actual.toUpperCase(), record.sha256.toUpperCase(), `${entry.id}: file bytes drifted from manifest hash`);
      assert.ok(entry.capture.sourceName.length > 0, `${entry.id}: source name missing`);
      if (entry.mode === "qa") {
        if (entry.ocr) {
          const ocr = ocrByFile.get(entry.capture.file);
          assert.ok(ocr, `${entry.id}: ocr manifest entry missing`);
          assert.equal(ocr.sha256.toUpperCase(), record.sha256.toUpperCase(), `${entry.id}: ocr manifest pdf sha vs local manifest`);
          const primaryAbs = join(localDir, ocr.spacedFile || ocr.rapidFile);
          assert.ok(existsSync(primaryAbs), `${entry.id}: ocr parse-source transcript missing on disk`);
          const primarySha = ocr.spacedFile ? ocr.spacedSha256 : ocr.rapidSha256;
          assert.equal(sha256Of(primaryAbs).toUpperCase(), primarySha.toUpperCase(), `${entry.id}: parse-source transcript drifted from manifest hash`);
          assert.equal(entry.textChars, readFileSync(primaryAbs, "utf8").length, `${entry.id}: textChars must match the parsed OCR transcript`);
          const crossAbs = join(localDir, ocr.winrtFile);
          assert.ok(existsSync(crossAbs), `${entry.id}: ocr cross-check transcript missing on disk`);
          assert.equal(sha256Of(crossAbs).toUpperCase(), ocr.winrtSha256.toUpperCase(), `${entry.id}: cross-check transcript drifted from manifest hash`);
          assert.equal(entry.ocr.parsedFrom, ocrManifest.engines.cross, `${entry.id}: parsedFrom must name the parse engine`);
          assert.equal(entry.ocr.crossCheck, ocrManifest.engines.primary, `${entry.id}: crossCheck must name the cross-check engine`);
          assert.equal(entry.ocr.cbigramF1, ocr.cbigramF1, `${entry.id}: cbigramF1 must match ocr manifest`);
          assert.equal(entry.ocr.digitRunF1, ocr.digitRunF1, `${entry.id}: digitRunF1 must match ocr manifest`);
          assert.equal(entry.ocr.pages, ocr.pages, `${entry.id}: pages must match ocr manifest`);
          assert.ok(entry.ocr.cbigramF1 >= 0.85 && entry.ocr.digitRunF1 >= 0.8, `${entry.id}: parsed entry must clear the OCR honesty gate`);
        } else {
          assert.ok(record.textFile && existsSync(join(localDir, record.textFile)), `${entry.id}: extracted text file missing`);
          assert.equal(entry.textChars, record.textChars, `${entry.id}: textChars must match manifest extraction`);
        }
      } else {
        assert.equal(entry.mode, "pdf", `${entry.id}: local non-qa entry must be pdf mode`);
        assert.ok(record.pages >= 1, `${entry.id}: scanned entry needs a page count`);
        assert.equal(entry.textChars, record.textChars, `${entry.id}: textChars must match manifest extraction`);
      }
      continue;
    }
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

test("no fabrication: every parsed string is built only from verbatim source chunks", () => {
  for (const entry of paperShelf) {
    if (entry.mode === "pdf") {
      // scanned original: no parsed strings exist; file + hash provenance is
      // asserted by the provenance test above
      continue;
    }
    const source = entry.capture.local
      ? { text: loadLocalText(entry) }
      : loadSource(entry.capture.file, entry.capture.sourceName);
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
      if (!partner || partner.kind !== "memo" || partner.mode !== "qa") return ownText;
      const partnerText = partner.capture.local
        ? loadLocalText(partner)
        : loadSource(partner.capture.file, partner.capture.sourceName).text;
      return norm(partnerText || "");
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
    if (entry.mode === "raw" || entry.mode === "images" || entry.mode === "pdf" || entry.capture.local) return false;
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

// A leading hyphen directly before a digit or "(" is a real minus sign in
// maths ("-2x²+x=-3x…"), not a slicing artifact — only junk prefixes flag.
const leadingJunk = (text) => /^[.:;,]/.test(text) || /^-(?![\d(])/.test(text);

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
          assert.ok(!leadingJunk(sub.text), `${entry.id}/${sub.n} leading punctuation`);
          if (sub.memo) assert.ok(!leadingJunk(sub.memo), `${entry.id}/${sub.n} memo leading punctuation`);
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
  // Structural invariant: a qp card joined its memo iff BOTH sides parsed to
  // qa entries (otherwise the card only links to the memo, no inline answers).
  let joins = 0;
  for (const entry of paperShelf) {
    const partner = entry.pairId ? paperById(entry.pairId) : null;
    const shouldJoin = Boolean(entry.kind === "qp" && entry.mode === "qa" && partner && partner.kind === "memo" && partner.mode === "qa");
    assert.equal(entry.joinedMemoSubs !== undefined, shouldJoin, `${entry.id}: join state must match partner modes`);
    if (!shouldJoin) continue;
    joins++;
    const actual = entry.questions.reduce(
      (total, question) => total + question.subs.filter((sub) => typeof sub.memo === "string" && sub.memo.length > 0).length,
      0
    );
    assert.equal(entry.joinedMemoSubs, actual, `${entry.id}: joinedMemoSubs must equal actual memo strings`);
    const subsTotal = entry.questions.reduce((total, question) => total + question.subs.length, 0);
    assert.ok(entry.joinedMemoSubs >= Math.ceil(subsTotal * 0.5), `${entry.id}: join covers ${entry.joinedMemoSubs}/${subsTotal} — most sub-answers expected`);
  }
  assert.ok(joins >= 10, `expected today's twelve text-pair memo joins (floor 10), got ${joins}`);

  const embedded = paperShelf.filter((entry) => entry.embeddedMemo !== undefined);
  assert.equal(embedded.length, 1, "exactly one embedded-memo capture expected");
  assert.equal(embedded[0].id, "math-task1-2025");
  assert.ok(embedded[0].embeddedMemo >= 10, "embedded memo should cover most parts");
});

test("pair integrity: reciprocal, same subject, qp<->memo", () => {
  const paired = paperShelf.filter((entry) => entry.pairId);
  assert.ok(paired.length >= 38, `expected >=38 paired cards (four capture pairs + fifteen local pairs and growing), got ${paired.length}`);
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

test("subject coverage honesty: shelf only claims subjects with study guides", () => {
  const guideIds = new Set(studyGuides.map((guide) => guide.id));
  for (const entry of paperShelf) {
    assert.ok(guideIds.has(entry.subject), `${entry.id}: subject ${entry.subject} has no study guide`);
    assert.ok(papersBySubject(entry.subject).some((candidate) => candidate.id === entry.id), `${entry.id}: papersBySubject fails`);
  }
  assert.ok(papersBySubject("english-fal").length >= 2, "local English FAL papers ship");
  assert.ok(papersBySubject("life-skills-and-computer-literacy").length >= 4, "local Life Skills papers ship");
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
