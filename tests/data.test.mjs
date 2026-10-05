import test from "node:test";
import assert from "node:assert/strict";
import { exams, plan, timetable, activeExamBlock, activeExamYear } from "../js/data/exams.js";
import { globalSources, paperSubjects, subjectByName, upcomingSubjects } from "../js/data/sources.js";
import { notebooks } from "../js/data/notebooks.js";
import { parseExamDate, selectExamBlock, startOfDay, upcomingFrom } from "../js/core/dates.js";

test("every timetable block is well-formed, ordered and inside its year", () => {
  assert.ok(timetable.length >= 1, "at least one timetable block");
  assert.equal(new Set(timetable.map((b) => b.year)).size, timetable.length, "unique block years");
  for (const block of timetable) {
    let previous = 0;
    assert.ok(Array.isArray(block.exams) && block.exams.length > 0, `${block.year}: empty block`);
    for (const exam of block.exams) {
      assert.match(exam.date, /^\d{4}-\d{2}-\d{2}$/, `${block.year}: bad date ${exam.date}`);
      assert.equal(exam.date.slice(0, 4), String(block.year), `${block.year}: date outside block year: ${exam.date}`);
      assert.match(exam.time, /^\d{2}:\d{2}$/, `${block.year}: bad time ${exam.time}`);
      assert.ok([1, 2, 3, 4].includes(exam.term), `${block.year}/${exam.date}: term must be 1..4, got ${exam.term}`);
      assert.equal(exam.level, "L2", `${block.year}/${exam.date}: level`);
      assert.ok(exam.subject && exam.subject.length > 1, `${block.year}/${exam.date}: subject`);
      assert.ok(exam.paper && exam.paper.length > 1, `${block.year}/${exam.date}: paper`);
      assert.ok(/\d+\s*(hr|min)/.test(exam.duration), `${block.year}/${exam.date}: duration`);
      const time = parseExamDate(exam.date).getTime();
      assert.ok(Number.isNaN(time) === false, `bad date ${exam.date}`);
      assert.ok(time >= previous, `exam ${exam.date} out of order`);
      previous = time;
    }
  }
});

test("the app exams list is the selected block — one selection rule", () => {
  assert.equal(activeExamBlock, selectExamBlock(timetable, startOfDay()), "active block must come from selectExamBlock");
  assert.equal(exams, activeExamBlock.exams, "exams must expose the active block's rows");
  assert.equal(activeExamYear, activeExamBlock.year);
  // history is append-only: the shipped 2026 sitting stays exactly as published
  const shipped = timetable.find((block) => block.year === 2026);
  assert.ok(shipped, "2026 block ships");
  assert.equal(shipped.exams.length, 10);
});

test("every exam subject has a verified paper registry entry", () => {
  for (const block of timetable) {
    for (const exam of block.exams) {
      const record = subjectByName(exam.subject);
      assert.ok(record, `no registry for ${exam.subject} (block ${block.year})`);
      assert.ok(record.links.length >= 1);
      for (const link of record.links) {
        assert.ok(link.url.startsWith("https://") || link.url.startsWith("http://"));
        assert.ok(link.status === "verified" || link.status === "unreachable");
      }
    }
  }
});

test("every timetable block surfaces at least one linked subject", () => {
  for (const block of timetable) {
    const floor = parseExamDate(block.exams[0].date);
    floor.setDate(floor.getDate() - 18);
    const upcoming = upcomingFrom(block.exams, floor);
    const surfaced = upcomingSubjects(upcoming);
    assert.ok(surfaced.length >= 1, `${block.year}: no linked subjects surfaced`);
    assert.ok(surfaced.length <= upcoming.length, `${block.year}: more subjects than exams`);
  }
  // the shipped 2026 sitting covers all seven study-guide subjects
  const shipped2026 = timetable.find((block) => block.year === 2026);
  const floor = parseExamDate(shipped2026.exams[0].date);
  floor.setDate(floor.getDate() - 18);
  assert.equal(upcomingSubjects(upcomingFrom(shipped2026.exams, floor)).length, 7);
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
