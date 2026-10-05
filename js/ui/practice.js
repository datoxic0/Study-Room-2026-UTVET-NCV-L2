// Practice view: builder → timed take → results → history/weak spots, plus a
// printable exam+memo sheet. Deterministic (seeded) and fully offline; AI
// authoring plugs in via the My Bank items already merged into the bank.
import {
  buildItemBank,
  assembleExam,
  scoreExam,
  retestQueue,
  subjectLabels,
} from "../core/assessment.js";
import { renderRich } from "../core/math_notation.js";
import { readJSON, writeJSON } from "../core/storage.js";
import { generateItems, hasApiKey } from "../core/ai_client.js";

const ATTEMPTS_KEY = "studyroom.attempts";
const MYBANK_KEY = "studyroom.mybank";
const DRAFT_KEY = "studyroom.practice_draft";

let bank = [];
let initial = false;
let state = { exam: null, answers: {}, deadline: null, tick: null, refs: null, savedResults: null };
let draftSaveTimer = null;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function stage() {
  return document.querySelector("#practice-stage");
}

function subjectName(slug) {
  return subjectLabels()[slug] || slug;
}

function bankStats() {
  const answerable = bank.filter((i) => i.answerable).length;
  return `${bank.length} items · ${answerable} auto-scored · 0 AI required`;
}

function myBankItems() {
  return readJSON(MYBANK_KEY, []).filter((i) => i && i.id && i.text);
}

function readRules() {
  const kinds = [];
  if (document.querySelector("#practice-kind-past").checked) kinds.push("past-paper");
  if (document.querySelector("#practice-kind-drill").checked) kinds.push("drill");
  if (document.querySelector("#practice-kind-mine").checked) {
    for (const i of myBankItems()) if (!kinds.includes(i.kind || "ai-authored")) kinds.push(i.kind || "ai-authored");
  }
  const subject = document.querySelector("#practice-subject").value;
  const minutes = Number(document.querySelector("#practice-minutes").value) || 0;
  const seedRaw = document.querySelector("#practice-seed").value.trim();
  return {
    subjects: subject ? [subject] : [],
    kinds,
    excludeFigures: !document.querySelector("#practice-figs").checked,
    count: Number(document.querySelector("#practice-count").value) || 10,
    minutes: minutes > 0 ? minutes : undefined,
    seed: seedRaw || `paper-${Date.now().toString(36)}`,
  };
}

function saveDraft() {
  if (!state.exam) return;
  clearTimeout(draftSaveTimer);
  draftSaveTimer = setTimeout(() => {
    writeJSON(DRAFT_KEY, { exam: state.exam, answers: state.answers, deadline: state.deadline });
  }, 350);
}

function clearDraft() {
  clearTimeout(draftSaveTimer);
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    writeJSON(DRAFT_KEY, null);
  }
}

function answeredCount() {
  return Object.values(state.answers).filter((a) => (a.text && a.text.trim()) || a.choice != null || a.selfMark).length;
}

function stopTick() {
  if (state.tick) clearInterval(state.tick);
  state.tick = null;
}

function renderClock() {
  const clock = state.refs?.clock;
  if (!clock) return;
  const left = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000));
  const m = Math.floor(left / 60);
  const s = left % 60;
  clock.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  clock.classList.toggle("is-urgent", left <= 60);
  if (state.refs.progress) state.refs.progress.textContent = `${answeredCount()} / ${state.exam.items.length} answered`;
}

function startTick() {
  stopTick();
  renderClock();
  state.tick = setInterval(() => {
    if (Date.now() >= state.deadline) {
      stopTick();
      showResults(true);
      return;
    }
    renderClock();
  }, 1000);
}

// ---------- stage: taking ----------
function renderTake() {
  const panel = stage();
  panel.hidden = false;
  panel.replaceChildren();

  const head = el("div", "practice-head");
  const title = el("div", null);
  const subjectBit = state.exam.rules.subjects?.length ? subjectName(state.exam.rules.subjects[0]) : "Mixed subjects";
  title.append(el("h3", null, `${subjectBit} — ${state.exam.counts.total} questions`));
  title.append(
    el(
      "p",
      "practice-meta",
      `${state.exam.totalMarks} marks · ${state.exam.minutes} min · seed “${String(state.exam.rules.seed)}”`
    )
  );
  const tools = el("div", "practice-tools");
  const clock = el("span", "practice-clock", "00:00");
  const progress = el("span", "practice-progress", "0 / 0 answered");
  const submit = el("button", "prompt-chip practice-primary", "Submit test");
  submit.type = "button";
  submit.addEventListener("click", () => showResults(false));
  const exit = el("button", "quiet-button", "Save & exit");
  exit.type = "button";
  exit.addEventListener("click", () => {
    saveDraft();
    stopTick();
    panel.hidden = true;
    document.querySelector("#practice-resume").hidden = false;
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  tools.append(clock, progress, submit, exit);
  head.append(title, tools);
  panel.append(head);

  const form = el("form", "practice-form");
  form.addEventListener("submit", (e) => e.preventDefault());
  form.addEventListener("input", (e) => {
    const t = e.target;
    const id = t.dataset?.item;
    if (!id) return;
    if (t.type === "radio") state.answers[id] = { ...(state.answers[id] || {}), choice: Number(t.value) };
    else state.answers[id] = { ...(state.answers[id] || {}), text: t.value };
    renderClock();
    saveDraft();
  });

  let n = 0;
  for (const section of state.exam.sections) {
    const sec = el("fieldset", "practice-section");
    sec.append(el("legend", "practice-legend", section.label));
    for (const item of section.items) {
      n += 1;
      const box = el("fieldset", "practice-item");
      box.dataset.id = item.id;
      const legend = el("legend", null, `Q${n}`);
      if (item.marks) legend.append(el("span", "practice-marks", `${item.marks} mark${item.marks === 1 ? "" : "s"}`));
      box.append(legend);
      const text = el("p", "practice-item-text");
      text.innerHTML = renderRich(item.text);
      box.append(text);
      if (item.figure) {
        const fig = el("figure", "practice-figbox");
        const img = el("img", "practice-figure");
        img.src = item.figure;
        img.alt = `Figure referred to in the question (source: ${item.source?.paperId || "past paper"})`;
        img.loading = "lazy";
        img.addEventListener("error", () => {
          fig.replaceChildren(el("p", "practice-figwarn", "Figure image unavailable right now — it loads from the saved copy once you've been online once. Answer from the text if it's clear, otherwise skip it; it self-marks."));
        });
        fig.append(img);
        box.append(fig);
      } else if (item.needsFigure) {
        const ref = (item.text.match(/fig(?:ure)?\.?\s*\d+/i) || ["figure"])[0].toUpperCase();
        box.append(el("p", "practice-figwarn", `Needs ${ref} — the image isn't in this offline bank. Answer from the text if it's clear, otherwise skip it; it self-marks.`));
      }

      const prior = state.answers[item.id] || {};
      if (item.options?.length) {
        item.options.forEach((opt, idx) => {
          const label = el("label", "practice-option");
          const radio = el("input");
          radio.type = "radio";
          radio.name = `opt-${n}`;
          radio.value = String(idx);
          radio.dataset.item = item.id;
          if (prior.choice === idx) radio.checked = true;
          label.append(radio, el("span", null, opt));
          box.append(label);
        });
      } else {
        const answer = el("textarea", "practice-answer");
        answer.rows = item.answerable && (item.marks ?? 1) <= 2 ? 2 : 3;
        answer.dataset.item = item.id;
        answer.placeholder = item.answerable ? "Your answer — graded against the memo" : "Your attempt — you self-mark this one";
        if (prior.text) answer.value = prior.text;
        box.append(answer);
      }
      const src = el("p", "practice-src");
      src.textContent =
        item.origin === "capture"
          ? `capture: ${item.source.paperId}${item.source.sha256 ? ` · sha ${item.source.sha256.slice(0, 8)}` : ""}`
          : item.origin === "download"
            ? `downloaded paper: ${item.source.paperId}${item.source.sha256 ? ` · sha ${item.source.sha256.slice(0, 8)}` : ""}`
            : item.origin === "authored"
              ? "authored drill · study guide"
              : `my bank${item.source?.model ? ` · ${item.source.model}` : ""}`;
      box.append(src);
      sec.append(box);
    }
    form.append(sec);
  }
  panel.append(form);
  panel.scrollIntoView({ behavior: "smooth", block: "start" });

  state.refs = { clock, progress, submit };
  renderClock();
  startTick();
}

// ---------- stage: results ----------
function showResults(autoSubmitted) {
  stopTick();
  const { results, score } = scoreExam(state.exam, state.answers);
  state.savedResults = { results, score };
  renderResults(autoSubmitted);
}

function currentScore() {
  return scoreExam(state.exam, state.answers);
}

function renderResults(autoSubmitted) {
  const panel = stage();
  panel.hidden = false;
  panel.replaceChildren();

  const { results, score } = currentScore();
  const head = el("div", "practice-head");
  const title = el("div", null);
  title.append(el("h3", null, autoSubmitted ? "Time! Here's your paper" : "Results"));
  title.append(
    el(
      "p",
      "practice-meta",
      `score ${score.got} / ${score.max}` +
        (score.pendingItems ? ` · ${score.pendingItems} awaiting self-mark` : "") +
        (score.autoItems ? ` · ${score.autoItems} auto-graded` : "")
    )
  );
  const tools = el("div", "practice-tools");
  const again = el("button", "quiet-button", "Build another");
  again.type = "button";
  again.addEventListener("click", () => {
    stopTick();
    clearDraft();
    state.exam = null;
    state.answers = {};
    state.savedResults = null;
    panel.hidden = true;
    document.querySelector("#practice-resume").hidden = true;
    document.querySelector("#practice-build-title").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  const printBtn = el("button", "prompt-chip practice-primary", "Print with memo");
  printBtn.type = "button";
  printBtn.addEventListener("click", () => printExam(state.exam));
  tools.append(printBtn, again);
  head.append(title, tools);
  panel.append(head);

  // Self-mark queue: items with no answer key anywhere in the bank.
  const pendingItems = state.exam.items.filter((i) => !i.answerable && !i.options);
  if (pendingItems.length) {
    const queue = el("section", "practice-selfmark");
    queue.append(el("h4", "practice-subhead", "Self-mark — no answer key exists for these"));
    for (const item of pendingItems) {
      const given = state.answers[item.id]?.text || "";
      const card = el("div", "practice-self-card");
      const txt = el("p", "practice-item-text");
      txt.innerHTML = renderRich(item.text);
      card.append(txt);
      if (given) {
        const mine = el("p", "practice-mine");
        mine.append(el("strong", null, "Your attempt: "));
        const span = el("span");
        span.innerHTML = renderRich(given);
        mine.append(span);
        card.append(mine);
      } else {
        card.append(el("p", "practice-mine practice-hint", "Not attempted."));
      }
      const marks = el("div", "practice-mark-row");
      for (const [label, value] of [["0", 0], ["½", "half"], ["✓", "full"]]) {
        const b = el("button", "practice-mark", label);
        b.type = "button";
        const active = state.answers[item.id]?.selfMark === value;
        b.classList.toggle("is-on", active);
        b.setAttribute("aria-pressed", String(active));
        b.addEventListener("click", () => {
          state.answers[item.id] = { ...(state.answers[item.id] || {}), selfMark: value };
          saveDraft();
          renderResults(false);
        });
        marks.append(b);
      }
      card.append(marks);
      queue.append(card);
    }
    panel.append(queue);
  }

  // Review list
  const review = el("section", "practice-review");
  review.append(el("h4", "practice-subhead", "Paper review"));
  const byId = new Map(results.map((r) => [r.id, r]));
  const itemById = new Map(state.exam.items.map((i) => [i.id, i]));
  let n = 0;
  for (const item of state.exam.items) {
    n += 1;
    const r = byId.get(item.id);
    const row = el("div", `practice-review-row is-${r.mode}${r.got >= r.max && r.max > 0 ? " is-right" : ""}`);
    const badge = el("span", "practice-review-badge", r.mode === "pending" ? "?" : r.got >= r.max && r.max > 0 ? "✓" : r.mode === "unanswered" ? "—" : "✗");
    const body = el("div", "practice-review-body");
    const headLine = el("p", "practice-review-q");
    headLine.append(el("strong", null, `Q${n} · ${r.got}/${r.max} · `));
    const qspan = el("span");
    qspan.innerHTML = renderRich(item.text);
    headLine.append(qspan);
    body.append(headLine);
    const given = state.answers[item.id];
    if (given?.text) {
      const a = el("p", "practice-review-a");
      a.append(el("strong", null, "You: "));
      const span = el("span");
      span.innerHTML = renderRich(given.text);
      a.append(span);
      body.append(a);
    } else if (given?.choice != null && item.options) {
      body.append(el("p", "practice-review-a", `You: ${item.options[given.choice] ?? "—"}`));
    }
    if (item.answer) {
      const memo = el("p", "practice-review-memo");
      memo.append(el("strong", null, "Memo: "));
      const span = el("span");
      span.innerHTML = renderRich(item.answer);
      memo.append(span);
      body.append(memo);
    }
    if (item.explanation) body.append(el("p", "practice-review-why", item.explanation));
    row.append(badge, body);
    review.append(row);
    if (!itemById.has(item.id)) continue;
  }
  panel.append(review);

  const finish = el("button", "prompt-chip practice-primary", "Save attempt to history");
  finish.type = "button";
  finish.addEventListener("click", () => saveAttempt(autoSubmitted));
  panel.append(finish);
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function saveAttempt(autoSubmitted) {
  const { results, score } = currentScore();
  const attempts = readJSON(ATTEMPTS_KEY, []);
  attempts.unshift({
    at: new Date().toISOString(),
    seed: String(state.exam.rules.seed),
    subjects: state.exam.rules.subjects || [],
    counts: state.exam.counts,
    autoSubmitted: Boolean(autoSubmitted),
    results,
    score,
  });
  writeJSON(ATTEMPTS_KEY, attempts.slice(0, 60));
  clearDraft();
  renderAttempts();
  renderWeak();
  const btn = stage().querySelector(".practice-primary");
  if (btn) {
    btn.textContent = "Saved ✓";
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = "Save attempt to history";
      btn.disabled = false;
    }, 2500);
  }
}

// ---------- print ----------
function printExam(exam) {
  const sheet = document.querySelector("#print-sheet");
  sheet.replaceChildren();

  const head = el("div", "print-head");
  head.append(el("p", "print-eyebrow", "UMGUNGUNDLOVU TVET COLLEGE · NC(V) LEVEL 2 · PRACTICE PAPER"));
  const subjectBit = exam.rules.subjects?.length ? subjectName(exam.rules.subjects[0]) : "Mixed subjects";
  head.append(el("h1", null, subjectBit));
  head.append(
    el(
      "p",
      "print-meta",
      `${exam.counts.total} questions · ${exam.totalMarks} marks · ${exam.minutes} minutes · seed “${String(exam.rules.seed)}” · built ${new Date().toLocaleDateString()}`
    )
  );
  head.append(el("p", "print-instructions", "Answer ALL questions. Show all working — CA marks protect method. Decimal comma applies. This paper was assembled from captured, hash-verified material."));
  sheet.append(head);

  let n = 0;
  for (const section of exam.sections) {
    const sec = el("section", "print-section");
    sec.append(el("h2", null, section.label));
    for (const item of section.items) {
      n += 1;
      const q = el("div", "print-q");
      const line = el("p", null, `Q${n}  ${item.text}${item.marks ? `  (${item.marks})` : ""}`);
      q.append(line);
      if (item.figure) {
        const img = el("img", "print-figure");
        img.src = item.figure;
        img.alt = "Figure referred to in the question";
        q.append(img);
      } else if (item.needsFigure) {
        q.append(el("p", "print-fig-note", "[figure not included in this sheet — refer to the original paper]"));
      }
      const ruleCount = Math.min(4, Math.max(1, Math.ceil((item.marks ?? 1) / 2)));
      if (!item.answerable || (item.marks ?? 1) > 1) {
        q.append(el("div", "print-lines", " ".repeat(1)));
        for (let r = 0; r < ruleCount; r += 1) q.append(el("p", "print-rule", ""));
      }
      sec.append(q);
    }
    sheet.append(sec);
  }

  const memo = el("section", "print-memo");
  memo.append(el("h1", null, "MEMORANDUM"));
  let m = 0;
  for (const item of exam.items) {
    m += 1;
    const row = el("p", "print-memo-row");
    row.append(el("strong", null, `Q${m}  `));
    const span = el("span");
    span.innerHTML = renderRich(item.answer || (item.answerable ? "—" : "[no key — mark against the study guide / notes]"));
    row.append(span);
    memo.append(row);
  }
  sheet.append(memo);
  window.print();
}

// ---------- progress panels ----------
function renderAttempts() {
  const list = document.querySelector("#practice-attempts");
  const attempts = readJSON(ATTEMPTS_KEY, []);
  if (!attempts.length) {
    list.replaceChildren(el("li", null, "Nothing yet — build your first paper above."));
    return;
  }
  list.replaceChildren(
    ...attempts.slice(0, 8).map((a) => {
      const li = el("li");
      const pct = a.score.max ? Math.round((a.score.got / a.score.max) * 100) : 0;
      const when = new Date(a.at).toLocaleDateString(undefined, { day: "numeric", month: "short" });
      const sub = a.subjects?.length ? subjectName(a.subjects[0]) : "Mixed";
      li.append(el("span", "practice-attempt-when", `${when} · ${sub}`));
      li.append(el("span", "practice-attempt-score", `${a.score.got}/${a.score.max} (${pct}%)`));
      li.append(el("span", "practice-attempt-seed", `seed ${a.seed}`));
      return li;
    })
  );
}

function renderWeak() {
  const list = document.querySelector("#practice-weak");
  const attempts = readJSON(ATTEMPTS_KEY, []);
  const queue = retestQueue(attempts, 8);
  if (!queue.length) {
    list.replaceChildren(el("li", null, "Miss a question and it queues here for retesting."));
    return;
  }
  const lookup = new Map(bank.map((i) => [i.id, i]));
  list.replaceChildren(
    ...queue.map((q) => {
      const li = el("li");
      const item = lookup.get(q.id);
      const text = item ? (item.text.length > 96 ? `${item.text.slice(0, 96)}…` : item.text) : q.id;
      li.append(el("span", "practice-weak-text", text));
      const btn = el("button", "quiet-button", "Retest");
      btn.type = "button";
      btn.addEventListener("click", () => {
        startTest({ ids: [q.id], count: 1, seed: `retest-${Date.now().toString(36)}` });
      });
      li.append(btn);
      return li;
    })
  );
}

// ---------- lifecycle ----------
function startTest(overrides = {}) {
  const rules = { ...readRules(), ...overrides };
  if (!rules.kinds.length) {
    document.querySelector("#practice-status").textContent = "pick at least one source";
    return;
  }
  const exam = assembleExam(bank, rules);
  if (!exam.items.length) {
    document.querySelector("#practice-status").textContent = "no items match — widen the filters";
    return;
  }
  state.exam = exam;
  state.answers = {};
  state.deadline = Date.now() + exam.minutes * 60000;
  state.savedResults = null;
  writeJSON(DRAFT_KEY, { exam, answers: {}, deadline: state.deadline });
  document.querySelector("#practice-resume").hidden = true;
  renderTake();
}

function restoreDraft() {
  const draft = readJSON(DRAFT_KEY, null);
  if (!draft?.exam?.items?.length || !draft.deadline) return false;
  if (draft.deadline < Date.now()) {
    clearDraft();
    return false;
  }
  state.exam = draft.exam;
  state.answers = draft.answers || {};
  state.deadline = draft.deadline;
  renderTake();
  return true;
}

function initAiBar() {
  const note = document.querySelector("#practice-ai-note");
  const addBtn = document.querySelector("#practice-ai-add");
  const form = document.querySelector("#practice-ai-form");
  const topicInput = document.querySelector("#practice-ai-topic");
  const kindSel = document.querySelector("#practice-ai-kind");
  const countSel = document.querySelector("#practice-ai-count");
  const status = document.querySelector("#practice-ai-status");
  const goBtn = document.querySelector("#practice-ai-go");

  const renderNote = () => {
    note.textContent = hasApiKey()
      ? "AI on — generated items land in My bank, labelled."
      : "AI off — add an OpenRouter key in the Study buddy settings to unlock.";
  };
  renderNote();

  addBtn.addEventListener("click", () => {
    if (!hasApiKey()) {
      form.hidden = false;
      status.textContent = "Add your OpenRouter key in the Study buddy settings first.";
      topicInput.focus();
      return;
    }
    form.hidden = !form.hidden;
    if (!form.hidden) topicInput.focus();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const topic = topicInput.value.trim();
    if (!topic) return;
    const slug = document.querySelector("#practice-subject").value;
    const subject = slug ? subjectName(slug) : "NC(V) Level 2 (general)";
    goBtn.disabled = true;
    status.textContent = "Generating…";
    try {
      const items = await generateItems({
        subject,
        topic,
        count: Number(countSel.value) || 5,
        kind: kindSel.value === "mcq" ? "mcq" : "short",
      });
      const existing = myBankItems();
      const known = new Set(existing.map((i) => i.id));
      const fresh = items.filter((i) => !known.has(i.id));
      if (fresh.length) {
        writeJSON(MYBANK_KEY, [...existing, ...fresh]);
        bank = buildItemBank({}, myBankItems());
        document.querySelector("#practice-bank-count").textContent = `${myBankItems().length} in my bank`;
        document.querySelector("#practice-status").textContent = bankStats();
      }
      const dupes = items.length - fresh.length;
      status.textContent = `Added ${fresh.length} to My bank${dupes ? ` (${dupes} duplicate${dupes > 1 ? "s" : ""} skipped)` : ""} — tick "My bank" to use them.`;
      if (fresh.length) {
        topicInput.value = "";
        form.hidden = true;
      }
    } catch (error) {
      status.textContent = error?.message || "AI drafting failed — try again.";
    } finally {
      goBtn.disabled = false;
    }
  });
}

export function initPractice() {
  if (initial) return;
  initial = true;

  bank = buildItemBank({}, myBankItems());

  const select = document.querySelector("#practice-subject");
  for (const [slug, name] of Object.entries(subjectLabels())) {
    const opt = document.createElement("option");
    opt.value = slug;
    opt.textContent = name;
    select.append(opt);
  }

  document.querySelector("#practice-status").textContent = bankStats();
  document.querySelector("#practice-bank-count").textContent = `${myBankItems().length} in my bank`;
  const figCount = bank.filter((i) => i.needsFigure).length;
  document.querySelector("#practice-fig-count").textContent = figCount ? `${figCount} in bank` : "none";

  const range = document.querySelector("#practice-count");
  const out = document.querySelector("#practice-count-out");
  range.addEventListener("input", () => {
    out.textContent = range.value;
  });

  document.querySelector("#practice-start").addEventListener("click", () => startTest());
  document.querySelector("#practice-print").addEventListener("click", () => {
    const exam = assembleExam(bank, readRules());
    if (!exam.items.length) {
      document.querySelector("#practice-status").textContent = "no items match — widen the filters";
      return;
    }
    printExam(exam);
  });

  const resumeBar = document.querySelector("#practice-resume");
  document.querySelector("#practice-resume-go").addEventListener("click", () => {
    if (!restoreDraft()) resumeBar.hidden = true;
  });
  document.querySelector("#practice-resume-drop").addEventListener("click", () => {
    clearDraft();
    resumeBar.hidden = true;
  });
  if (readJSON(DRAFT_KEY, null)) resumeBar.hidden = false;

  initAiBar();

  renderAttempts();
  renderWeak();
}
