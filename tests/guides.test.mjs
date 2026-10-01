import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { studyGuides, GUIDE_BUILT_ON, guideBySubject } from "../js/data/study_guides.js";
import { exams } from "../js/data/exams.js";
import { subjectByName } from "../js/data/sources.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  readFileSync(join(root, "research", "captures", "notebooklm_sources", "manifest.json"), "utf8")
);
const manifestByFile = new Map(manifest.notebooks.map((entry) => [entry.file, entry]));

test("seven guides cover exactly the seven exam subjects", () => {
  assert.equal(studyGuides.length, 7);
  const examSubjects = [...new Set(exams.map((exam) => exam.subject))].sort();
  const guideSubjects = studyGuides.map((guide) => guide.subject).sort();
  assert.deepEqual(guideSubjects, examSubjects);
  assert.equal(new Set(studyGuides.map((guide) => guide.id)).size, 7);
  for (const guide of studyGuides) {
    assert.ok(subjectByName(guide.subject), `no paper registry for ${guide.subject}`);
    assert.ok(guide.stream && guide.papers, `${guide.id} missing stream/papers`);
    assert.ok(guide.summary.length >= 80, `${guide.id} summary too short`);
    assert.ok(exams.some((exam) => exam.subject === guide.subject), `${guide.id} has no exams`);
  }
});

test("guide structure: sections, gaps section, self-check questions", () => {
  for (const guide of studyGuides) {
    assert.ok(guide.sections.length >= 5, `${guide.id} needs >=5 sections`);
    for (const section of guide.sections) {
      assert.ok(section.heading && section.heading.length > 5, `${guide.id} section heading`);
      const hasBody = section.body && section.body.length >= 150;
      const hasPoints = Array.isArray(section.points) && section.points.length >= 3 &&
        section.points.every((point) => point.length >= 20);
      assert.ok(hasBody || hasPoints, `${guide.id}/${section.heading} needs a body or >=3 points`);
      const text = `${section.body ?? ""} ${(section.points ?? []).join(" ")}`;
      assert.ok(!/\b(TODO|TBD|FIXME|lorem ipsum)\b/i.test(text), `${guide.id}/${section.heading} placeholder text`);
    }
    const gaps = guide.sections.filter((section) => /gap/i.test(section.heading));
    assert.equal(gaps.length, 1, `${guide.id} must have exactly one gaps section`);
    assert.ok(gaps[0].body && gaps[0].body.length >= 150, `${guide.id} gaps section too thin`);
    assert.ok(guide.checkQuestions.length >= 4, `${guide.id} needs >=4 check questions`);
    for (const item of guide.checkQuestions) {
      assert.ok(item.q.length >= 15, `${guide.id} question too short`);
      assert.ok(item.a.length >= 20, `${guide.id} answer too short`);
    }
    const ids = new Set(guide.checkQuestions.map((item) => item.q));
    assert.equal(ids.size, guide.checkQuestions.length, `${guide.id} duplicate questions`);
  }
});

test("capture provenance: every sha256 matches the manifest", () => {
  const used = new Set();
  for (const guide of studyGuides) {
    for (const capture of guide.captures) {
      const entry = manifestByFile.get(capture.file);
      assert.ok(entry, `${guide.id}: capture ${capture.file} not in manifest`);
      assert.equal(
        capture.sha256.toUpperCase(),
        entry.sha256.toUpperCase(),
        `${guide.id}: sha mismatch for ${capture.file}`
      );
      used.add(capture.file);
    }
  }
  const unused = manifest.notebooks.map((entry) => entry.file).filter((file) => !used.has(file));
  assert.deepEqual(unused, [], `captures not referenced by any guide: ${unused.join(", ")}`);
});

test("coverage arithmetic equals manifest stats for referenced captures", () => {
  for (const guide of studyGuides) {
    const stats = guide.captures.map((capture) => manifestByFile.get(capture.file).stats);
    const sum = (key) => stats.reduce((total, entry) => total + entry[key], 0);
    assert.equal(guide.coverage.docs, guide.captures.length, `${guide.id} docs`);
    assert.equal(guide.coverage.sources, sum("totalSources"), `${guide.id} sources`);
    assert.equal(guide.coverage.chars, sum("textChars"), `${guide.id} chars`);
    assert.equal(guide.coverage.pages, sum("pages"), `${guide.id} pages`);
    assert.equal(guide.coverage.summaries, sum("summaries"), `${guide.id} summaries`);
  }
});

test("coverage level honesty rules", () => {
  for (const guide of studyGuides) {
    const level = guide.coverage.level;
    assert.ok(["strong", "partial", "none"].includes(level), `${guide.id} bad level`);
    if (level === "none") {
      assert.equal(guide.captures.length, 0, `${guide.id} claims no captures but lists some`);
      assert.equal(guide.coverage.sources, 0, `${guide.id} none-level must report zero sources`);
    } else {
      assert.ok(guide.captures.length >= 1, `${guide.id} level ${level} needs captures`);
    }
    if (level !== "strong") {
      assert.ok(guide.coverage.note && guide.coverage.note.length >= 40, `${guide.id} needs coverage note`);
    }
    const gapSection = guide.sections.find((section) => /gap/i.test(section.heading));
    assert.ok(gapSection, `${guide.id} gaps section missing`);
  }
  const noneLevel = studyGuides.filter((guide) => guide.coverage.level === "none");
  assert.equal(noneLevel.length, 1, "exactly one subject should have no captures (English FAL)");
  assert.equal(noneLevel[0].id, "english-fal");
});

test("guideBySubject resolves every exam subject", () => {
  for (const subject of new Set(exams.map((exam) => exam.subject))) {
    assert.ok(guideBySubject(subject), `guideBySubject failed for ${subject}`);
  }
  assert.equal(guideBySubject("No Such Subject"), null);
  assert.ok(GUIDE_BUILT_ON.match(/^\d{4}-\d{2}-\d{2}$/), "GUIDE_BUILT_ON must be an ISO date");
});
