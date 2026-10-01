import test from "node:test";
import assert from "node:assert/strict";
import { renderRich, texToUnicode, splitMathSegments, looksLikeMath, hasMath } from "../js/core/math_notation.js";
import { paperShelf } from "../js/data/paper_shelf.js";

// Words that may legally appear inside a maths aria-label (functions/variables).
const ARIA_WORD_ALLOWLIST = new Set([
  "sin", "cos", "tan", "sec", "csc", "cot", "log", "ln", "exp", "max",
  "min", "mod", "gcd", "det", "in", "or",
]);

function collectStrings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) collectStrings(item, out);
  else if (value && typeof value === "object") for (const key of Object.keys(value)) collectStrings(value[key], out);
  return out;
}

function decodeEntities(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

test("golden renders: fractions, roots, scripts, symbols", () => {
  const frac = renderRich("$\\frac{3}{4}$");
  assert.match(frac, /<span class="mth"/);
  assert.match(frac, /class="mth-frac"/);
  assert.match(frac, /class="mth-frac-n">3</);
  assert.match(frac, /class="mth-frac-d">4</);
  assert.ok(!frac.includes("\\frac"), "no raw LaTeX in output");

  const root = renderRich("$\\sqrt{5}$");
  assert.match(root, /class="mth-rad-sign">\u221a</);
  assert.match(root, /class="mth-rad-body">5</);

  const indexed = renderRich("$\\sqrt[3]{8}$");
  assert.match(indexed, /class="mth-rad-idx">3</);
  assert.match(indexed, /class="mth-rad-body">8</);

  const nested = renderRich("$\\frac{\\sqrt{2}-1}{1+\\sqrt{2}}$");
  assert.ok((nested.match(/class="mth-frac"/g) || []).length >= 1);
  assert.ok((nested.match(/class="mth-rad"/g) || []).length >= 2, "nested roots render");
  assert.ok(!nested.includes("\\"), "no backslashes survive");

  assert.match(renderRich("$x^{3}$"), /<sup>3<\/sup>/);
  assert.match(renderRich("$x^3$"), /<sup>3<\/sup>/);
  assert.match(renderRich("$a_{2}$"), /<sub>2<\/sub>/);
});

test("symbols, degrees, marking ticks and dots", () => {
  assert.match(renderRich("$a \\cdot b$"), /class="mth-sym">\u00b7</);
  assert.match(renderRich("$x \\ne 0$"), /class="mth-sym">\u2260</);
  assert.match(renderRich("$37^{\\circ}$"), /class="mth-degree">\u00b0</);
  assert.match(renderRich("$\\sqrt{}$"), /class="mth-tick" title="marking tick in the capture">\u2713/);
  assert.match(renderRich("$\\dot{4}$"), /4\u0307/);
  assert.match(renderRich("$\\underline{x}$"), /class="mth-under">x</);
  assert.ok(!renderRich("$2 \\times 3$").includes("\\times"));
});

test("aria-labels expose readable plain maths, never English prose or LaTeX", () => {
  const labels = [];
  for (const entry of paperShelf) {
    for (const value of collectStrings(entry)) {
      const html = renderRich(value);
      for (const match of html.matchAll(/aria-label="([^"]*)"/g)) labels.push([entry.id, decodeEntities(match[1])]);
    }
  }
  assert.ok(labels.length >= 150, `expected many maths labels, got ${labels.length}`);
  for (const [id, label] of labels) {
    assert.ok(!/\\[a-zA-Z]/.test(label), `${id}: raw command in aria-label: ${label.slice(0, 60)}`);
    const words = label.match(/[A-Za-z]{3,}/g) || [];
    for (const word of words) {
      assert.ok(
        ARIA_WORD_ALLOWLIST.has(word.toLowerCase()),
        `${id}: English word "${word}" leaked into maths label: ${label.slice(0, 70)}`
      );
    }
  }
});

test("escape safety: capture text can never inject markup", () => {
  const nasty = '<img src=x onerror="alert(1)"> & <script>alert(2)</script>';
  const html = renderRich(nasty);
  assert.ok(!html.includes("<img"), "img tag must be escaped");
  assert.ok(!html.includes("<script"), "script tag must be escaped");
  assert.ok(html.includes("&lt;img"), "escaped form expected");

  const mathThenHtml = renderRich("$\\frac{1}{2}$ <b>bold?</b>");
  assert.ok(!mathThenHtml.includes("<b>"), "plain tags outside maths are escaped");
  assert.ok(mathThenHtml.includes("&lt;b&gt;"));
});

test("prose handling: bold markers, dollars and prose rejection", () => {
  assert.match(renderRich("**Exam tip** read this"), /<strong>Exam tip<\/strong>/);
  // No closing dollar in sight: currency stays literal (corpus never uses $ for money otherwise).
  assert.ok(renderRich("Only $69.99 for the year").includes("$69.99"));
  assert.ok(!hasMath("Only $69.99 for the year"));
  // Prose with a stray $ pair is kept verbatim, not rendered as maths.
  const dollars = renderRich("Pay $5 now and $10 later");
  assert.ok(dollars.includes("$5"), "prose dollars untouched");
  assert.ok(!looksLikeMath("for the students of this college"));
  assert.ok(looksLikeMath("\\frac{a}{b}"));
  assert.ok(looksLikeMath("x^{2}+1"));
});

test("plain-text conversion for aria-labels", () => {
  assert.equal(texToUnicode("\\frac{3}{4}"), "3/4");
  assert.equal(texToUnicode("\\sqrt{9}"), "\u221a(9)");
  assert.equal(texToUnicode("\\cdot"), "\u00b7");
  assert.equal(texToUnicode("\\times"), "\u00d7");
  assert.equal(texToUnicode("\\sqrt{}"), "\u2713");
});

test("segment splitting: maths runs vs prose runs", () => {
  const segments = splitMathSegments("$\\frac{1}{2}$ of the class");
  assert.equal(segments[0].type, "math");
  assert.equal(segments[0].value, "\\frac{1}{2}");
  assert.equal(segments[1].type, "text");
  assert.equal(segments[1].value, " of the class");

  const bare = splitMathSegments("T_{18} = 5 + (18 - 1)3");
  assert.ok(bare.some((segment) => segment.type === "math"), "bare subscript maths detected");
  assert.ok(hasMath("a $x^{2}$ b"));
  assert.ok(!hasMath("no maths at all here"));
});

test("whole shelf renders with no raw LaTeX or dollar leftovers", () => {
  let stringsChecked = 0;
  let mathStrings = 0;
  for (const entry of paperShelf) {
    for (const value of collectStrings(entry)) {
      stringsChecked++;
      const html = renderRich(value);
      assert.ok(!/\\[a-zA-Z]{2,}/.test(html), `${entry.id}: raw command left in output: ${value.slice(0, 90)}`);
      assert.ok(!/\$\d/.test(html), `${entry.id}: unrendered $-math left in output: ${value.slice(0, 90)}`);
      if (hasMath(value)) mathStrings++;
    }
  }
  assert.ok(stringsChecked >= 500, `expected the full shelf walked, got ${stringsChecked}`);
  assert.ok(mathStrings >= 50, `expected plenty of maths strings, got ${mathStrings}`);
});
