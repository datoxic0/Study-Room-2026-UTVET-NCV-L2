import test from "node:test";
import assert from "node:assert/strict";
import { exams, plan } from "../js/data/exams.js";
import { globalSources, paperSubjects, subjectByName, upcomingSubjects } from "../js/data/sources.js";
import { notebooks } from "../js/data/notebooks.js";
import { parseExamDate, upcomingFrom } from "../js/core/dates.js";

test("exam schedule is sorted, dated and Level 2", () => {
  let previous = 0;
  for (const exam of exams) {
    const time = parseExamDate(exam.date).getTime();
    assert.ok(Number.isNaN(time) === false, `bad date ${exam.date}`);
    assert.ok(time >= previous, `exam ${exam.date} out of order`);
    previous = time;
    assert.equal(exam.level, "L2");
  }
  assert.equal(exams.length, 10);
});

test("every exam subject has a verified paper registry entry", () => {
  for (const exam of exams) {
    const record = subjectByName(exam.subject);
    assert.ok(record, `no registry for ${exam.subject}`);
    assert.ok(record.links.length >= 1);
    for (const link of record.links) {
      assert.ok(link.url.startsWith("https://") || link.url.startsWith("http://"));
      assert.ok(link.status === "verified" || link.status === "unreachable");
    }
  }
});

test("seven unique subjects surface for the upcoming exam set", () => {
  const upcoming = upcomingFrom(exams, new Date(2026, 9, 1));
  assert.equal(upcomingSubjects(upcoming).length, 7);
});

test("global source registry entries are complete", () => {
  assert.ok(globalSources.length >= 6);
  for (const source of globalSources) {
    assert.ok(["official", "community"].includes(source.klass), source.id);
    assert.ok(["verified", "unreachable"].includes(source.status), source.id);
    assert.ok(source.note.length > 20, `${source.id} needs an explanatory note`);
  }
});

test("notebook registry: 17 unique entries, author flags preserved", () => {
  assert.equal(notebooks.length, 17);
  assert.equal(new Set(notebooks.map((n) => n.id)).size, 17);
  assert.equal(new Set(notebooks.map((n) => n.url)).size, 17);
  const flagged = notebooks.filter((n) => n.share === "author-flagged");
  assert.equal(flagged.length, 3);
  assert.equal(flagged.filter((n) => n.alternate).length, 2);
  for (const notebook of notebooks) {
    assert.ok(notebook.url.startsWith("https://"));
    assert.ok(notebook.title && notebook.title.length > 3, notebook.id);
  }
});

test("plan contains three retrievable-practice steps", () => {
  assert.equal(plan.length, 3);
  assert.ok(plan.every((task) => task.title && task.description && task.duration));
});
