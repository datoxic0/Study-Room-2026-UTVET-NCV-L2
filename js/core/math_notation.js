// Deterministic renderer for the LaTeX subset found in captured TVET exam text.
// Pure module: no DOM, no dependencies — unit-tested in node, used by the paper reader.
//
// Input text is split into plain runs and math runs:
//   - "$...$" pairs whose content looks like maths (delimiters dropped)
//   - bare LaTeX such as "\frac{A}{P} = 1" or "T_{18} = 5 + (18 - 1)3"
// Plain text is always HTML-escaped; math is rendered to markup with a fixed
// whitelist of commands. Anything unknown degrades to readable text (never
// raw backslash commands).

const SYMBOLS = {
  times: "\u00d7", cdot: "\u00b7", div: "\u00f7", pm: "\u00b1", mp: "\u2213",
  ne: "\u2260", neq: "\u2260", equiv: "\u2261", leq: "\u2264", geq: "\u2265",
  approx: "\u2248", equivq: "\u2261", in: "\u2208", notin: "\u2209", ni: "\u220b",
  subset: "\u2282", supset: "\u2283", cup: "\u222a", cap: "\u2229",
  pi: "\u03c0", alpha: "\u03b1", beta: "\u03b2", gamma: "\u03b3", delta: "\u03b4",
  epsilon: "\u03b5", zeta: "\u03b6", eta: "\u03b7", theta: "\u03b8", iota: "\u03b9",
  kappa: "\u03ba", lambda: "\u03bb", mu: "\u03bc", nu: "\u03bd", xi: "\u03be",
  rho: "\u03c1", sigma: "\u03c3", tau: "\u03c4", upsilon: "\u03c5", phi: "\u03c6",
  chi: "\u03c7", psi: "\u03c8", omega: "\u03c9",
  Gamma: "\u0393", Delta: "\u0394", Theta: "\u0398", Lambda: "\u039b", Pi: "\u03a0",
  Sigma: "\u03a3", Phi: "\u03a6", Psi: "\u03a8", Omega: "\u03a9",
  circ: "\u2218", angle: "\u2220", perp: "\u22a5", parallel: "\u2225", mid: "\u2223",
  therefore: "\u2234", because: "\u2235", to: "\u2192", rightarrow: "\u2192",
  leftarrow: "\u2190", leftrightarrow: "\u2194", ldots: "\u2026", dots: "\u2026",
  cdots: "\u22ef", prime: "\u2032", nabla: "\u2207", infty: "\u221e",
};

// Commands that carry meaning only for TeX layout — dropped silently.
const DROP = new Set([
  "displaystyle", "textstyle", "scriptstyle", "limits", "nolimits",
  "left", "right", "big", "Big", "bigg", "Bigg", "bigl", "bigr", "Bigl",
  "Bigr", "biggl", "biggr", "Biggl", "Biggr", "phantom", "hphantom",
  "vphantom", "boxed", "not", "relax",
]);

const PLAIN_WRAP = new Set(["text", "mathrm", "mathbf", "mathit", "mbox", "textrm", "textbf"]);

const SUP_MAP = {
  "0": "\u2070", "1": "\u00b9", "2": "\u00b2", "3": "\u00b3", "4": "\u2074",
  "5": "\u2075", "6": "\u2076", "7": "\u2077", "8": "\u2078", "9": "\u2079",
  a: "\u1d43", b: "\u1d47", c: "\u1d9c", d: "\u1d48", e: "\u1d49", f: "\u1da0",
  g: "\u1d4d", h: "\u1095", i: "\u2071", j: "\u2c7c", k: "\u1d4f", l: "\u207c",
  m: "\u1d50", n: "\u207f", o: "\u1d52", p: "\u1d56", q: "\u1d57", r: "\u1d63",
  s: "\u02e2", t: "\u1d57", u: "\u1d58", v: "\u1d5b", w: "\u1d5c", x: "\u02e3",
  y: "\u02b8", z: "\u1dbb", "+": "\u207a", "-": "\u207b", "=": "\u207c",
  "(": "\u207d", ")": "\u207e",
};
const SUB_MAP = {
  "0": "\u2080", "1": "\u2081", "2": "\u2082", "3": "\u2083", "4": "\u2084",
  "5": "\u2085", "6": "\u2086", "7": "\u2087", "8": "\u2088", "9": "\u2089",
  a: "\u2090", e: "\u2091", h: "\u2095", i: "\u1d62", j: "\u2c7c", k: "\u2096",
  l: "\u2097", m: "\u2098", n: "\u2099", o: "\u2092", p: "\u209a", r: "\u1d63",
  s: "\u209b", t: "\u209c", x: "\u2093",
};

function esc(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function readGroup(source, at) {
  let i = at;
  while (i < source.length && /\s/.test(source[i])) i++;
  if (source[i] !== "{") {
    const single = source[i] ?? "";
    return { body: single, next: i + 1 };
  }
  let depth = 0;
  const start = i;
  for (; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return { body: source.slice(start + 1, i), next: i + 1 };
    }
  }
  return { body: source.slice(start + 1), next: source.length };
}

function superscriptText(value) {
  const mapped = [...value].map((ch) => SUP_MAP[ch]).join("");
  return mapped.length === value.length ? mapped : `^(${value})`;
}

function subscriptText(value) {
  const mapped = [...value].map((ch) => SUB_MAP[ch]).join("");
  return mapped.length === value.length ? mapped : `_${value}`;
}

function plainArg(value) {
  return value;
}

function fracHtml(numerator, denominator) {
  return `<span class="mth-frac"><span class="mth-frac-n">${numerator}</span><span class="mth-frac-d">${denominator}</span></span>`;
}

function radHtml(index, body) {
  const idx = index ? `<span class="mth-rad-idx">${index}</span>` : "";
  return `<span class="mth-rad">${idx}<span class="mth-rad-sign">\u221a</span><span class="mth-rad-body">${body}</span></span>`;
}

// Render one LaTeX fragment. mode = "html" | "plain".
function render(tex, mode) {
  let out = "";
  let i = 0;
  const emit = (html, plain) => {
    out += mode === "html" ? html : plain;
  };

  while (i < tex.length) {
    const ch = tex[i];

    if (ch === "\\") {
      const named = /^\\([a-zA-Z]+)/.exec(tex.slice(i));
      if (named) {
        const cmd = named[1];
        i += named[0].length;
        if (cmd === "frac" || cmd === "dfrac" || cmd === "tfrac" || cmd === "cfrac") {
          const num = readGroup(tex, i);
          const den = readGroup(tex, num.next);
          i = den.next;
          if (mode === "html") {
            emit(fracHtml(render(num.body, "html"), render(den.body, "html")), `${plainArg(render(num.body, "plain"))}/${plainArg(render(den.body, "plain"))}`);
          } else {
            out += `${plainArg(render(num.body, "plain"))}/${plainArg(render(den.body, "plain"))}`;
          }
          continue;
        }
        if (cmd === "sqrt") {
          let index = "";
          while (i < tex.length && /\s/.test(tex[i])) i++;
          if (tex[i] === "[") {
            const close = tex.indexOf("]", i);
            if (close !== -1) {
              index = tex.slice(i + 1, close);
              i = close + 1;
            }
          }
          const group = readGroup(tex, i);
          i = group.next;
          if (group.body.trim() === "") {
            emit(`<span class="mth-tick" title="marking tick in the capture">\u2713</span>`, "\u2713");
            continue;
          }
          const bodyHtml = render(group.body, "html");
          const bodyPlain = render(group.body, "plain");
          const indexHtml = index ? render(index, "html") : "";
          emit(
            radHtml(indexHtml, bodyHtml),
            `${index ? `${render(index, "plain")}\u221a` : "\u221a"}(${bodyPlain})`
          );
          continue;
        }
        if (PLAIN_WRAP.has(cmd)) {
          const group = readGroup(tex, i);
          i = group.next;
          if (mode === "html") emit(`<span class="mth-plain">${esc(group.body)}</span>`, group.body);
          else out += group.body;
          continue;
        }
        if (cmd === "dot" || cmd === "ddot") {
          const group = readGroup(tex, i);
          i = group.next;
          const mark = cmd === "dot" ? "\u0307" : "\u0308";
          const body = group.body;
          emit(`${esc(body)}${mark}`, `${body}${mark}`);
          continue;
        }
        if (cmd === "bar" || cmd === "overline" || cmd === "underline") {
          const group = readGroup(tex, i);
          i = group.next;
          const cls = cmd === "underline" ? "mth-under" : "mth-over";
          emit(`<span class="${cls}">${esc(group.body)}</span>`, group.body);
          continue;
        }
        if (DROP.has(cmd)) continue;
        if (SYMBOLS[cmd]) {
          const symbol = SYMBOLS[cmd];
          emit(`<span class="mth-sym">${symbol}</span>`, symbol);
          continue;
        }
        // Unknown command: show its name (readable, never a raw backslash).
        emit(esc(cmd), cmd);
        continue;
      }

      // Escape sequences: \{ \} \, \; \: \! \% \& \$ \# \\ \|
      const special = tex[i + 1];
      i += 2;
      if (special === "{") emit("{", "{");
      else if (special === "}") emit("}", "}");
      else if (special === "," || special === ";" || special === ":" || special === "!") emit(" ", " ");
      else if (special === "%" || special === "&" || special === "$" || special === "#") {
        emit(esc(special), special);
      } else if (special === "\\") emit(" ", " ");
      else if (special === "|") emit("\u2223", "|");
      else if (special !== undefined) emit(esc(special), special);
      continue;
    }

    if (ch === "{" || ch === "}") {
      // Structural braces are consumed by readGroup; stray ones are dropped.
      i++;
      continue;
    }

    if (ch === "^" || ch === "_") {
      const isSup = ch === "^";
      i++;
      let arg;
      if (tex[i] === "{") {
        const group = readGroup(tex, i);
        arg = group.body;
        i = group.next;
      } else {
        arg = tex[i] ?? "";
        i++;
      }
      if (isSup && arg.replace(/\s/g, "") === "\\circ") {
        emit(`<span class="mth-degree">\u00b0</span>`, "\u00b0");
        continue;
      }
      if (mode === "html") {
        const inner = render(arg, "html");
        emit(`<${isSup ? "sup" : "sub"}>${inner}</${isSup ? "sup" : "sub"}>`, "");
      } else {
        const inner = render(arg, "plain");
        out += isSup ? superscriptText(inner) : subscriptText(inner);
      }
      continue;
    }

    if (ch === "~") {
      emit("&nbsp;", " ");
      i++;
      continue;
    }

    const word = /^[A-Za-z]+/.exec(tex.slice(i));
    if (word) {
      const letters = word[0];
      if (mode === "html") emit(letters.length <= 2 ? `<i>${esc(letters)}</i>` : esc(letters), letters);
      else out += letters;
      i += letters.length;
      continue;
    }

    emit(esc(ch), ch);
    i++;
  }
  return out;
}

// ---------- classification of raw capture text ----------

export function looksLikeMath(segment) {
  if (!segment || segment.length > 320) return false;
  if (/\\[a-zA-Z]/.test(segment)) return true;
  if (/[\^_]/.test(segment)) return true;
  // Any 3+ letter word means this is prose with a stray "$", not maths.
  // (This corpus never uses dollars for currency.)
  const letters = segment.match(/[A-Za-z]+/g) || [];
  return !letters.some((run) => run.length >= 3);
}

const BARE_TRIGGER = /^\\(?:frac|dfrac|tfrac|sqrt|cdot|times|div|pm|mp|leq|geq|ne|neq|equiv|approx|in|notin|pi|alpha|beta|gamma|delta|theta|lambda|sigma|omega|tau|phi|rho|circ|angle|perp|parallel|dot|ddot|bar|overline|underline|text|mathrm|left|right)/;
const SCRIPT_TRIGGER = /^[A-Za-z0-9][\^_]/;
const STOP_WORDS = new Set([
  "if", "of", "to", "or", "an", "at", "by", "be", "is", "it", "on", "no",
  "so", "do", "we", "he", "as", "the", "and", "for", "are", "was", "this",
  "that", "with", "from", "into", "when", "then", "each", "all", "not",
]);
const MATH_CHARSET = /[A-Za-z0-9\s\\^_{}()[\]|<>+\-*/=.,;:!?'%&~#$]/;

// Words that may legally stand alone in a maths run (functions/variables).
const RUN_WORDS_OK = new Set([
  "sin", "cos", "tan", "sec", "csc", "cot", "log", "ln", "exp", "max",
  "min", "mod", "gcd", "det", "in", "or",
]);

// True when [start, end) contains no unbracketed English-looking word.
function validRun(text, start, end) {
  let depth = 0;
  for (let i = start; i < end; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth = Math.max(0, depth - 1);
    else if (depth === 0 && /[A-Za-z]/.test(ch)) {
      let j = i;
      while (j > start && /[A-Za-z]/.test(text[j - 1])) j--;
      let k = i;
      while (k + 1 < end && /[A-Za-z]/.test(text[k + 1])) k++;
      if (j > start && text[j - 1] === "\\") {
        i = k;
        continue;
      }
      const word = text.slice(j, k + 1);
      if (word.length >= 3 && !RUN_WORDS_OK.has(word.toLowerCase())) return false;
      i = k;
    }
  }
  return true;
}

// Consume a bare (non-$-delimited) maths run starting at `start`.
// Returns the exclusive end index, or -1 when the run is not usable.
function consumeBareMath(text, start) {
  let i = start;
  let depth = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\n" || !MATH_CHARSET.test(ch)) break;
    if (ch === "{") depth++;
    else if (ch === "}") depth = Math.max(0, depth - 1);
    else if (ch === " ") {
      const token = /^[^\s]*/.exec(text.slice(i + 1))?.[0] ?? "";
      if (token === "") break;
      if (token.startsWith("\\")) {
        i++;
        continue;
      }
      if (/^\d{1,2}\.$/.test(token)) {
        const after = text.slice(i + 1 + token.length).replace(/^\s+/, "");
        if (after.length > 0 && /^[A-Za-z]/.test(after)) break;
      }
      const letters = /^[A-Za-z]+/.exec(token)?.[0] ?? "";
      if (letters.length >= 3) break;
      if (letters.length >= 1 && STOP_WORDS.has(letters.toLowerCase())) break;
      if (letters.length >= 1 && token.length > letters.length && /[\^_{}\\]/.test(token)) {
        i++;
        continue;
      }
    }
    i++;
  }
  // Reject/trim trailing prose that never hit a space boundary (e.g. "cite_start]You").
  if (!validRun(text, start, i)) {
    let cut = -1;
    for (let e = i; e > start + 3; e--) {
      if (/\s/.test(text[e] ?? " ") && validRun(text, start, e)) {
        cut = e;
        break;
      }
    }
    if (cut === -1) return -1;
    i = cut;
  }
  let end = i;
  while (end > start && /\s/.test(text[end - 1])) end--;
  // Drop dangling structure left by the word-boundary stop.
  for (;;) {
    if (end <= start) break;
    const last = text[end - 1];
    if (last === "(" || last === "[") {
      end--;
      continue;
    }
    if (/[+\-*/=;:]/.test(last) && !/[\d)\]]/.test(text[end - 2] ?? "")) {
      end--;
      continue;
    }
    break;
  }
  // Re-check brace balance on the final slice.
  let balance = 0;
  for (const c of text.slice(start, end)) {
    if (c === "{") balance++;
    else if (c === "}") balance--;
  }
  while (balance > 0 && end > start) {
    const c = text[end - 1];
    end--;
    if (c === "}") balance++;
    else if (c === "{") balance--;
  }
  if (end - start < 4) return -1;
  if (balance !== 0) return -1;
  return end;
}

function findDollarClose(text, from) {
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\n") return -1;
    if (ch === "$") return i;
  }
  return -1;
}

function findDoubleDollarClose(text, from) {
  for (let i = from; i < text.length; i++) {
    if (text[i] === "$" && text[i + 1] === "$") return i;
  }
  return -1;
}

// Split raw text into {type: "text" | "math", value} segments.
export function splitMathSegments(text) {
  const segments = [];
  let buffer = "";
  let i = 0;
  const flush = () => {
    if (buffer) {
      segments.push({ type: "text", value: buffer });
      buffer = "";
    }
  };
  while (i < text.length) {
    const ch = text[i];
    if (ch === "$") {
      if (text[i + 1] === "$") {
        const close = findDoubleDollarClose(text, i + 2);
        if (close > i + 2 && looksLikeMath(text.slice(i + 2, close))) {
          flush();
          segments.push({ type: "math", value: text.slice(i + 2, close) });
          i = close + 2;
          continue;
        }
        if (close > i + 2) {
          buffer += `$$${text.slice(i + 2, close)}$$`;
          i = close + 2;
          continue;
        }
        buffer += "$";
        i++;
        continue;
      }
      const close = findDollarClose(text, i + 1);
      if (close > i + 1 && looksLikeMath(text.slice(i + 1, close))) {
        flush();
        segments.push({ type: "math", value: text.slice(i + 1, close) });
        i = close + 1;
        continue;
      }
      if (close > i + 1) {
        buffer += `$${text.slice(i + 1, close)}$`;
        i = close + 1;
        continue;
      }
      buffer += ch;
      i++;
      continue;
    }
    const slice = text.slice(i);
    const scriptHit = SCRIPT_TRIGGER.test(slice);
    const commandHit = BARE_TRIGGER.test(slice);
    if (scriptHit || commandHit) {
      let start = i;
      if (scriptHit) {
        while (start > 0 && /[A-Za-z0-9]/.test(text[start - 1])) start--;
      }
      const end = consumeBareMath(text, start);
      if (end > start) {
        // Chars between `start` and `i` were already appended to the buffer
        // (backtracked trigger) — give them back before flushing.
        if (start < i) buffer = buffer.slice(0, Math.max(0, buffer.length - (i - start)));
        flush();
        segments.push({ type: "math", value: text.slice(start, end) });
        i = end;
        continue;
      }
    }
    buffer += ch;
    i++;
  }
  flush();
  return segments;
}

export function hasMath(text) {
  return typeof text === "string" && splitMathSegments(text).some((segment) => segment.type === "math");
}

export function texToUnicode(tex) {
  return render(String(tex ?? ""), "plain");
}

// Render capture text to safe HTML: escaped prose, styled maths, **bold** spans.
export function renderRich(text) {
  if (typeof text !== "string" || text === "") return "";
  const out = [];
  for (const segment of splitMathSegments(text)) {
    if (segment.type === "math") {
      const plain = texToUnicode(segment.value);
      out.push(`<span class="mth" aria-label="${esc(plain).replace(/"/g, "&quot;")}">${render(segment.value, "html")}</span>`);
    } else {
      const escaped = esc(segment.value).replace(/\*\*([^*]{1,160})\*\*/g, "<strong>$1</strong>");
      out.push(escaped);
    }
  }
  return out.join("");
}
