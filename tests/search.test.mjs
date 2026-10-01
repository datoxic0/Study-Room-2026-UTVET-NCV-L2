import test from "node:test";
import assert from "node:assert/strict";
import { buildIndex, search } from "../js/core/search.js";

const docs = [
  {
    id: "a",
    title: "Mechatronic Systems L2 past paper",
    content: "Question paper for Mechatronic Systems level 2, February sitting.",
    source: "mytvet",
    sha256: "abc123",
  },
  {
    id: "b",
    title: "Electrotechnology guidelines",
    content: "Official subject and assessment guidelines for Electrotechnology.",
    source: "thutong",
    sha256: "def456",
  },
];

test("search matches multi-term queries across title and body", () => {
  const index = buildIndex(docs);
  const hits = search(index, "mechatronic paper");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].id, "a");
});

test("title matches outrank body matches", () => {
  const index = buildIndex([
    { id: "title-hit", title: "Mechatronic revision", content: "plain body", source: "s", sha256: "1" },
    { id: "body-hit", title: "other subject", content: "mentions mechatronic once", source: "s", sha256: "2" },
  ]);
  const hits = search(index, "mechatronic");
  assert.equal(hits[0].id, "title-hit");
});

test("terms missing from a document exclude it entirely", () => {
  const index = buildIndex(docs);
  const hits = search(index, "mechatronic plumbing");
  assert.equal(hits.length, 0);
});

test("empty or whitespace query returns no hits", () => {
  const index = buildIndex(docs);
  assert.equal(search(index, "   ").length, 0);
  assert.equal(search(index, "").length, 0);
});

test("snippet centres on the matched term", () => {
  const index = buildIndex([
    { id: "x", title: "t", content: `${"filler ".repeat(40)} needle ${"filler ".repeat(40)}`, source: "s", sha256: "3" },
  ]);
  const hits = search(index, "needle");
  assert.ok(hits[0].snippet.includes("needle"));
  assert.ok(hits[0].snippet.length < 400);
});
