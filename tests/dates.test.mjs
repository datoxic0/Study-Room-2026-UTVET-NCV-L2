import test from "node:test";
import assert from "node:assert/strict";
import {
  daysUntil,
  groupByMonth,
  localDateKey,
  parseExamDate,
  selectExamBlock,
  startOfDay,
  upcomingFrom,
} from "../js/core/dates.js";

test("parseExamDate normalises to local midnight", () => {
  const d = parseExamDate("2026-10-19");
  assert.equal(d.getHours(), 0);
  assert.equal(d.getDate(), 19);
  assert.equal(d.getMonth(), 9);
});

test("upcomingFrom filters past exams and keeps today", () => {
  const exams = [
    { date: "2026-01-01" },
    { date: "2026-10-19" },
    { date: "2026-11-16" },
  ];
  const from = new Date(2026, 9, 19);
  const upcoming = upcomingFrom(exams, from);
  assert.equal(upcoming.length, 2);
  assert.equal(upcoming[0].date, "2026-10-19");
});

test("daysUntil counts calendar days and clamps at zero", () => {
  const from = new Date(2026, 9, 1);
  assert.equal(daysUntil("2026-10-19", from), 18);
  assert.equal(daysUntil("2026-09-20", from), 0);
});

test("localDateKey is zero padded", () => {
  assert.equal(localDateKey(new Date(2026, 0, 5)), "2026-01-05");
  assert.equal(localDateKey(startOfDay(new Date(2026, 11, 31))), "2026-12-31");
});

test("groupByMonth keeps chronological groups", () => {
  const groups = groupByMonth([
    { date: "2026-10-19" },
    { date: "2026-10-27" },
    { date: "2026-11-05" },
    { date: "2026-11-16" },
  ]);
  assert.equal(groups.length, 2);
  assert.match(groups[0].key, /^OCTOBER 2026$/);
  assert.match(groups[1].key, /^NOVEMBER 2026$/);
  assert.equal(groups[0].exams.length, 2);
  assert.equal(groups[1].exams.length, 2);
});

test("selectExamBlock picks the sitting with exams ahead, across years", () => {
  const blocks = [
    { year: 2026, exams: [{ date: "2026-10-19" }, { date: "2026-11-16" }] },
    { year: 2027, exams: [{ date: "2027-10-18" }, { date: "2027-11-15" }] },
    { year: 2028, exams: [{ date: "2028-10-17" }] },
  ];
  // before every sitting: show the earliest upcoming block
  assert.equal(selectExamBlock(blocks, new Date(2026, 0, 5)).year, 2026);
  // mid-sitting: stay on the block whose exams are still ahead
  assert.equal(selectExamBlock(blocks, new Date(2026, 9, 20)).year, 2026);
  // between sittings: roll forward automatically (no code edit needed)
  assert.equal(selectExamBlock(blocks, new Date(2027, 1, 1)).year, 2027);
  // every block historical: show the latest block (dashboard reads "complete")
  assert.equal(selectExamBlock(blocks, new Date(2029, 0, 1)).year, 2028);
  // robust to out-of-order input
  assert.equal(selectExamBlock([...blocks].reverse(), new Date(2027, 1, 1)).year, 2027);
  // degenerate inputs
  assert.equal(selectExamBlock([], new Date()), null);
  assert.equal(selectExamBlock(null, new Date()), null);
});
