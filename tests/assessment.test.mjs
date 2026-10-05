import test from "node:test";
import assert from "node:assert/strict";
import {
  buildItemBank,
  assembleExam,
  scoreExam,
  normalizeAnswer,
  retestQueue,
  makeRng,
  hashSeed,
  subjectLabels,
  FIGURE_RE,
} from "../js/core/assessment.js";

test("item bank: exact counts from the shipped source data", () => {
  const bank = buildItemBank();
  assert.equal(bank.length, 1022, "955 past-paper subs (text>=8) + 67 authored drills");
  assert.equal(bank.filter((i) => i.kind === "drill").length, 67);
  assert.equal(bank.filter((i) => i.kind === "past-paper").length, 955);
  assert.equal(bank.filter((i) => i.answerable).length, 455, "67 drill answers + 388 memo-backed past-paper subs");
  assert.equal(bank.filter((i) => i.marks).length, 566);
  assert.equal(bank.filter((i) => i.origin === "capture").length, 278, "NotebookLM capture-derived items");
  assert.equal(bank.filter((i) => i.origin === "download").length, 677, "items from locally downloaded originals");
});

test("item bank: every item is structurally sound and honest about provenance", () => {
  const bank = buildItemBank();
  const ids = new Set();
  for (const item of bank) {
    assert.ok(item.id && !ids.has(item.id), `unique id: ${item.id}`);
    ids.add(item.id);
    assert.ok(item.text.length >= 8, item.id);
    assert.ok(item.subject.length > 0, item.id);
    assert.ok(["past-paper", "drill"].includes(item.kind), item.id);
    assert.ok(["capture", "download", "authored"].includes(item.origin), item.id);
    if (item.answerable) assert.ok(item.answer && item.answer.length > 0, item.id);
    if (item.origin === "capture" || item.origin === "download") assert.ok(item.source?.type === "paper", item.id);
    if (item.origin === "authored") assert.ok(item.source?.type === "guide", item.id);
  }
});

test("item bank: all 7 subjects covered, filters work", () => {
  const all = buildItemBank();
  assert.equal(new Set(all.map((i) => i.subject)).size, 7);
  const math = buildItemBank({ subjects: ["mathematics"] });
  assert.ok(math.length > 0);
  assert.ok(math.every((i) => i.subject === "mathematics"));
  const drillsOnly = buildItemBank({ kinds: ["drill"] });
  assert.equal(drillsOnly.length, 67);
  assert.deepEqual(Object.keys(subjectLabels()).length, 7);
});

test("assembly: same seed reproduces the identical paper", () => {
  const bank = buildItemBank();
  const a = assembleExam(bank, { seed: "class-42", count: 12 });
  const b = assembleExam(bank, { seed: "class-42", count: 12 });
  assert.deepEqual(
    a.items.map((i) => i.id),
    b.items.map((i) => i.id)
  );
  const c = assembleExam(bank, { seed: "class-43", count: 12 });
  assert.notDeepEqual(
    a.items.map((i) => i.id),
    c.items.map((i) => i.id)
  );
  assert.equal(typeof hashSeed("class-42"), "number");
  const rng = makeRng(7);
  assert.equal(typeof rng(), "number");
});

test("assembly: subject and kind rules are enforced inside assembleExam", () => {
  const bank = buildItemBank();
  const exam = assembleExam(bank, { seed: 1, subjects: ["mathematics"], kinds: ["drill"], count: 5 });
  assert.ok(exam.items.length > 0);
  assert.ok(exam.items.every((i) => i.subject === "mathematics" && i.kind === "drill"));
  assert.equal(exam.sections.length, 1);
  assert.ok(exam.sections[0].label.includes("recall drill"));
});

test("assembly: sections, marks, minutes and partial flags are sane", () => {
  const bank = buildItemBank();
  const exam = assembleExam(bank, { seed: 99, count: 10 });
  assert.equal(exam.counts.total, exam.items.length);
  assert.equal(exam.items.length, 10);
  assert.ok(exam.totalMarks > 0);
  assert.ok(exam.minutes >= 5);
  assert.ok(exam.sections.every((s) => s.items.length > 0));
  const marksSum = exam.items.reduce((s, i) => s + (i.marks ?? 0), 0);
  assert.equal(exam.totalMarks, marksSum);
  const huge = assembleExam(bank, { seed: 1, count: 100000 });
  assert.equal(huge.partial, true);
  assert.equal(huge.items.length, 1022);
});

test("scoring: auto-grades typed answers against the memo, queues the rest", () => {
  const bank = buildItemBank();
  const answerable = bank.find((i) => i.answerable && i.answer.length > 10);
  const open = bank.find((i) => !i.answerable);
  const exam = { items: [answerable, open] };
  const right = scoreExam(exam, { [answerable.id]: { text: answerable.answer } });
  assert.equal(right.results[0].mode, "auto");
  assert.equal(right.results[0].got, right.results[0].max);
  const wrong = scoreExam(exam, { [answerable.id]: { text: "total nonsense answer" } });
  assert.equal(wrong.results[0].got, 0);
  const partial = scoreExam(exam, { [answerable.id]: { text: answerable.answer }, [open.id]: { selfMark: "half" } });
  assert.equal(partial.results[1].mode, "self");
  assert.equal(partial.score.pendingItems, 0);
  const pending = scoreExam(exam, {});
  assert.equal(pending.score.pendingItems, 1, "only the no-key item awaits self-marking");
  assert.equal(pending.results[0].mode, "unanswered", "blank answerable item is unanswered, not self-mark");
});

test("scoring: choice items grade on correctIndex", () => {
  const exam = {
    items: [
      { id: "x", marks: 2, options: ["a", "b", "c"], correctIndex: 1 },
      { id: "y", marks: 3, options: ["a", "b"], correctIndex: 0 },
    ],
  };
  const res = scoreExam(exam, { x: { choice: 1 }, y: { choice: 1 } });
  assert.deepEqual(res.results.map((r) => r.got), [2, 0]);
  assert.equal(res.score.got, 2);
});

test("normalizeAnswer: forgiving but not sloppy", () => {
  assert.equal(normalizeAnswer("  Binary   Logic. "), normalizeAnswer("binary logic"));
  assert.notEqual(normalizeAnswer("NAND"), normalizeAnswer("NOR"));
  assert.equal(normalizeAnswer(undefined), "");
});

test("retestQueue: wrong-more-than-right rises to the top, pending ignored", () => {
  const history = [
    { results: [{ id: "a", got: 0, max: 1, mode: "auto" }, { id: "b", got: 1, max: 1, mode: "auto" }, { id: "p", got: 0, max: 1, mode: "pending" }] },
    { results: [{ id: "a", got: 0, max: 1, mode: "auto" }, { id: "b", got: 1, max: 1, mode: "auto" }] },
    { results: [{ id: "c", got: 0, max: 2, mode: "self" }] },
  ];
  const queue = retestQueue(history, 5);
  const ids = queue.map((q) => q.id);
  assert.deepEqual(ids, ["a", "c"]);
  assert.equal(queue[0].wrong, 2);
});

test("extraItems: My Bank items merge with provenance tags intact", () => {
  const bank = buildItemBank({}, [
    {
      id: "ai:math:1",
      subject: "mathematics",
      text: "What is 2+2?",
      answer: "4",
      marks: 1,
      kind: "ai-authored",
      origin: "ai",
      source: { type: "my-bank", model: "test" },
    },
  ]);
  const mine = bank.find((i) => i.id === "ai:math:1");
  assert.ok(mine);
  assert.equal(mine.origin, "ai");
  assert.equal(mine.answerable, true);
  assert.equal(mine.needsFigure, false);
  assert.equal(bank.length, 1023);
});

test("figure gate: flagged items stay out unless explicitly included", () => {
  const bank = buildItemBank();
  const flagged = bank.filter((i) => i.needsFigure);
  const figureRefs = bank.filter((i) => FIGURE_RE.test(i.text));
  // Derived invariant, not a frozen count: the gated set is exactly the
  // figure-referencing items with no verified image asset.
  assert.ok(figureRefs.length >= 83, `figure-referencing items: ${figureRefs.length}`);
  assert.ok(flagged.length >= 1, "current bank must gate something");
  assert.deepEqual(
    [...flagged.map((i) => i.id)].sort(),
    [...figureRefs.filter((i) => !i.figure).map((i) => i.id)].sort(),
    "gated == figure refs with no asset (mapped assets clear the flag)",
  );

  const closed = assembleExam(bank, { seed: "fig-gate", count: 2000, excludeFigures: true });
  assert.equal(closed.items.length, bank.length - flagged.length);
  assert.equal(closed.items.some((i) => i.needsFigure), false);
  assert.equal(
    closed.items.some((i) => i.figure),
    true,
    "items with verified figure images ride along — the gate only hides what the bank cannot show"
  );

  const open = assembleExam(bank, { seed: "fig-gate", count: 500 });
  assert.equal(open.items.some((i) => i.needsFigure), true, "same pool without the gate");

  const figMine = buildItemBank({}, [
    { id: "ai:fig:1", subject: "mathematics", text: "Study the circuit shown in FIGURE 4 and name each resistor.", answer: "R1 and R2", marks: 1 },
  ]).find((i) => i.id === "ai:fig:1");
  assert.equal(figMine.needsFigure, true, "My Bank items get the same gate");
});
