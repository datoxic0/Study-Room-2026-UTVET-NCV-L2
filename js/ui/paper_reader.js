import { paperShelf, paperById, PAPERS_BUILT_ON } from "../data/paper_shelf.js";
import { studyGuides } from "../data/study_guides.js";
import { renderRich } from "../core/math_notation.js";
import { syncBodyScrollLock } from "../core/dialog_lock.js";

const KIND_LABEL = {
  qp: "QUESTION PAPER",
  memo: "MEMORANDUM",
  practice: "PRACTICE SET",
  solutions: "WORKED ANSWERS",
  solved: "SOLVED EXAM + MEMO",
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// Capture text with LaTeX/notation rendered to readable markup.
// renderRich HTML-escapes all prose first, so this stays injection-safe.
function rich(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.innerHTML = renderRich(text ?? "");
  return node;
}

function countSubs(paper) {
  if (paper.mode === "qa") return paper.questions.reduce((total, q) => total + q.subs.length, 0);
  if (paper.mode === "solved") return paper.sets.reduce((total, set) => total + set.subs.length, 0);
  return 0;
}

function countMemoed(paper) {
  if (paper.mode === "qa") {
    return paper.questions.reduce((total, q) => total + q.subs.filter((s) => typeof s.memo === "string" && s.memo.length > 0).length, 0);
  }
  if (paper.mode === "solved") return paper.sets.reduce((total, set) => total + set.subs.filter((s) => typeof s.memo === "string" && s.memo.length > 0).length, 0);
  return 0;
}

function paperStats(paper) {
  if (paper.mode === "qa") {
    const questions = paper.questions.length;
    const parts = countSubs(paper);
    const memoed = countMemoed(paper);
    const lead = `${questions} question${questions === 1 ? "" : "s"} · ${parts} numbered part${parts === 1 ? "" : "s"}`;
    if (paper.kind === "memo") return `${lead} of memo text`;
    if (memoed) return `${lead} · ${memoed} memo answers ready to reveal`;
    if (paper.pairId) return `${lead} · partner capture exists`;
    return lead;
  }
  if (paper.mode === "solved") {
    const memoed = countMemoed(paper);
    return `${paper.sets.length} question set${paper.sets.length === 1 ? "" : "s"} · ${countSubs(paper)} parts · ${memoed} memo answers ready to reveal`;
  }
  if (paper.mode === "solutions") return `${paper.blocks.length} worked questions with answers`;
  if (paper.mode === "images") return `${paper.pages} page images · ${paper.summaryChars} chars of captured summary`;
  if (paper.mode === "raw") return `${paper.textChars} chars shown verbatim`;
  return "";
}

function hasAnswers(paper) {
  return (paper.mode === "qa" && (countMemoed(paper) > 0 || paper.kind === "memo")) ||
    (paper.mode === "solved" && countMemoed(paper) > 0) ||
    paper.mode === "solutions" ||
    paper.mode === "images";
}

function kindBadge(paper) {
  return el("span", `wk-badge wk-kind-${paper.kind}`, KIND_LABEL[paper.kind] || paper.kind.toUpperCase());
}

function cardBadges(paper) {
  const wrap = el("div", "wk-badges");
  wrap.append(kindBadge(paper));
  if (paper.level === "L3") wrap.append(el("span", "wk-badge wk-level", "LEVEL 3"));
  if (paper.pairId) {
    const partner = paperById(paper.pairId);
    wrap.append(el("span", "wk-badge wk-pair", partner && partner.kind === "memo" ? "PAIR: QP + MEMO" : "PAIR: MEMO + QP"));
  }
  if (paper.embeddedMemo) wrap.append(el("span", "wk-badge wk-pair", "MEMO INSIDE CAPTURE"));
  if (paper.formulaSheet) wrap.append(el("span", "wk-badge wk-sheet", "FORMULA SHEET"));
  if (paper.mode === "images") wrap.append(el("span", "wk-badge wk-images", "SUMMARY-ONLY"));
  if (paper.mode === "raw") wrap.append(el("span", "wk-badge wk-images", "VERBATIM TEXT"));
  return wrap;
}

function buildWorkroomCards() {
  return paperShelf.map((paper) => {
    const card = el("article", "workroom-card");
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Open in workroom: ${paper.title}`);
    card.dataset.subject = paper.subject;
    card.append(cardBadges(paper));
    card.append(el("h3", null, paper.title));
    card.append(el("p", "workroom-session", paper.session));
    card.append(el("p", "workroom-stats", paperStats(paper)));
    card.append(el("span", "guide-open", hasAnswers(paper) ? "Open & reveal answers →" : "Open in workroom →"));
    const open = () => openPaper(paper.id);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
    return card;
  });
}

function revealButton(label, dialog, open) {
  const button = el("button", "paper-btn", label);
  button.type = "button";
  button.addEventListener("click", () => {
    for (const node of dialog.querySelectorAll("details.paper-reveal")) node.open = open;
  });
  return button;
}

function renderSubRow(sub, paper) {
  const row = el("div", "paper-row");
  const head = el("div", "paper-row-q");
  head.append(el("span", "paper-n", sub.n));
  if (sub.marks) head.append(el("span", "paper-marks", `(${sub.marks})`));
  if (sub.empty && sub.text.length === 0) {
    head.append(
      el(
        "p",
        "paper-q-text is-empty",
        paper.kind === "memo"
          ? "numbering captured — see the following entries for the answer text"
          : "no extractable text in the capture (image-based part)"
      )
    );
  } else {
    head.append(rich("p", "paper-q-text", sub.text));
  }
  row.append(head);

  const standaloneMemo = paper.kind === "memo";
  if (standaloneMemo) return row;
  if (typeof sub.memo === "string" && sub.memo.length > 0) {
    const reveal = el("details", "paper-reveal");
    reveal.append(el("summary", null, "Show memo answer"));
    reveal.append(rich("p", "paper-memo-text", sub.memo));
    row.append(reveal);
  } else {
    row.append(el("span", "paper-nomemo", sub.empty ? "—" : "no memo answer captured for this part"));
  }
  return row;
}

function renderQaBody(paper) {
  const body = el("div", "paper-body");
  for (const question of paper.questions) {
    const block = el("section", "paper-question");
    block.append(el("h4", null, `Question ${question.n}`));
    if (question.stem) block.append(rich("p", "paper-stem", question.stem));
    for (const sub of question.subs) block.append(renderSubRow(sub, paper));
    body.append(block);
  }
  return body;
}

function renderSolvedBody(paper) {
  const body = el("div", "paper-body");
  for (const set of paper.sets) {
    const block = el("section", "paper-question");
    block.append(el("h4", null, set.label));
    for (const sub of set.subs) block.append(renderSubRow(sub, paper));
    body.append(block);
  }
  return body;
}

function renderSolutionsBody(paper) {
  const body = el("div", "paper-body");
  for (const block of paper.blocks) {
    const item = el("section", "paper-question");
    item.append(el("h4", null, `Question ${block.n}`));
    item.append(rich("p", "paper-q-text", block.question));
    const reveal = el("details", "paper-reveal");
    reveal.append(el("summary", null, "Show worked answer"));
    reveal.append(rich("p", "paper-memo-text", block.answer));
    if (block.analysis) reveal.append(rich("p", "paper-memo-analysis", `Analysis: ${block.analysis}`));
    item.append(reveal);
    body.append(item);
  }
  return body;
}

function renderImagesBody(paper) {
  const body = el("div", "paper-body");
  const panel = el("section", "paper-question");
  panel.append(el("h4", null, "Captured summary — not verbatim exam text"));
  panel.append(rich("p", "paper-summary", paper.summary));
  body.append(panel);
  return body;
}

function renderRawBody(paper) {
  const body = el("div", "paper-body");
  const panel = el("section", "paper-question");
  panel.append(el("h4", null, "Full captured text (verbatim)"));
  panel.append(rich("div", "paper-verbatim", paper.text));
  body.append(panel);
  return body;
}

function renderFormulaSheet(paper) {
  if (!Array.isArray(paper.formulaSheet) || paper.formulaSheet.length === 0) return null;
  const panel = el("section", "paper-question paper-formula-sheet");
  panel.append(el("h4", null, `Formula sheet captured with this paper — ${paper.formulaSheet.length} formulas`));
  panel.append(
    el(
      "p",
      "paper-formula-note",
      "Kept verbatim from this capture\u2019s FORMULA SHEET block (stripped out of the question rows above, never invented). Cover each row and recall it."
    )
  );
  const list = el("div", "paper-formula-list");
  paper.formulaSheet.forEach((formula, index) => {
    const item = el("div", "paper-formula-item");
    item.append(el("span", "paper-formula-n", String(index + 1)));
    item.append(rich("span", "paper-formula-math", formula));
    list.append(item);
  });
  panel.append(list);
  return panel;
}

function provenanceFooter(paper) {
  const footer = el("footer", "paper-prov");
  footer.append(el("p", "guide-side-label", "PROVENANCE — verbatim from this hashed capture"));
  footer.append(
    el("p", "guide-prov-item", `${paper.capture.file} — sha256 ${paper.capture.sha256.slice(0, 16)}…`)
  );
  footer.append(el("p", "guide-prov-item", `source: ${paper.capture.sourceName}`));
  footer.append(el("p", "guide-side-note", `Parsed by scripts/extract_papers.mjs · workroom rebuilt ${PAPERS_BUILT_ON} · hashes verified against manifest.json by the test suite.`));
  return footer;
}

export function openPaper(id) {
  const paper = paperById(id);
  const dialog = document.querySelector("#paper-dialog");
  if (!paper || !dialog) return;

  const layout = el("div", "paper-dialog-layout");

  // Topbar is a direct child of the layout: pinned grid row on desktop,
  // sticky header of the single scroll area on mobile (close always reachable).
  const topBar = el("div", "guide-dialog-topbar");
  const meta = el("span", "guide-dialog-meta", `${KIND_LABEL[paper.kind] || paper.kind} · ${paper.level} · ${paperStats(paper)}`);
  topBar.append(meta);
  const close = el("button", "guide-close", "Close ×");
  close.type = "button";
  close.addEventListener("click", () => dialog.close());
  topBar.append(close);
  layout.append(topBar);

  const side = el("aside", "paper-dialog-side");
  const sideHead = el("div", "guide-dialog-side-head");
  sideHead.append(el("p", "eyebrow", "PAPERS & MEMOS WORKROOM"));
  sideHead.append(el("h2", null, paper.title));
  side.append(sideHead);
  side.append(el("p", "guide-side-meta", paper.session));
  side.append(cardBadges(paper));
  side.append(el("p", "guide-side-exam", paperStats(paper)));

  if (paper.pairId) {
    const partner = paperById(paper.pairId);
    if (partner) {
      const pairBlock = el("div", "guide-side-exams");
      pairBlock.append(el("p", "guide-side-label", "PAIRED CAPTURE"));
      const pairButton = el("button", "paper-btn", `Open: ${partner.title} →`);
      pairButton.type = "button";
      pairButton.addEventListener("click", () => openPaper(partner.id));
      pairBlock.append(pairButton);
      side.append(pairBlock);
    }
  }

  const provBlock = el("div", "guide-side-exams");
  provBlock.append(el("p", "guide-side-label", "CAPTURE FILE"));
  provBlock.append(el("p", "guide-prov-item", paper.capture.file));
  provBlock.append(el("p", "guide-prov-item", `sha256 ${paper.capture.sha256.slice(0, 24)}…`));
  side.append(provBlock);
  layout.append(side);

  const main = el("div", "paper-dialog-main");

  main.append(el("p", "paper-note", paper.note));

  if (hasAnswers(paper) && paper.kind !== "memo" && paper.mode !== "images") {
    const toolbar = el("div", "paper-toolbar");
    toolbar.append(el("span", "paper-toolbar-label", "ATTEMPT FIRST: answer from memory, then reveal."));
    toolbar.append(revealButton("Reveal all answers", dialog, true));
    toolbar.append(revealButton("Hide all answers", dialog, false));
    main.append(toolbar);
  }

  const sheetPanel = renderFormulaSheet(paper);
  if (sheetPanel) main.append(sheetPanel);

  if (paper.mode === "qa") main.append(renderQaBody(paper));
  else if (paper.mode === "solved") main.append(renderSolvedBody(paper));
  else if (paper.mode === "solutions") main.append(renderSolutionsBody(paper));
  else if (paper.mode === "images") main.append(renderImagesBody(paper));
  else main.append(renderRawBody(paper));

  main.append(provenanceFooter(paper));
  layout.append(main);
  dialog.replaceChildren(layout);
  if (!dialog.open) dialog.showModal();
  syncBodyScrollLock();
}

function renderFilters(container, cards) {
  const counts = new Map(studyGuides.map((guide) => [guide.id, paperShelf.filter((p) => p.subject === guide.id).length]));
  const chips = [];
  const all = el("button", "workroom-chip is-active", `All papers (${paperShelf.length})`);
  all.type = "button";
  chips.push(all);
  for (const guide of studyGuides) {
    const count = counts.get(guide.id) || 0;
    if (count === 0) continue;
    const chip = el("button", "workroom-chip", `${guide.subject} (${count})`);
    chip.type = "button";
    chip.dataset.subject = guide.id;
    chips.push(chip);
  }
  container.replaceChildren(...chips);
  const setActive = (active) => {
    for (const chip of chips) chip.classList.toggle("is-active", chip === active);
    const subject = active.dataset.subject || null;
    let shown = 0;
    for (const card of cards) {
      const show = !subject || card.dataset.subject === subject;
      card.hidden = !show;
      if (show) shown++;
    }
    return shown;
  };
  for (const chip of chips) chip.addEventListener("click", () => setActive(chip));
  return chips;
}

export function initWorkroom() {
  const grid = document.querySelector("#workroom-grid");
  const filters = document.querySelector("#workroom-filters");
  const status = document.querySelector("#workroom-status");
  const count = document.querySelector("#workroom-count");
  if (!grid || !filters || !status || !count) return;

  const cards = buildWorkroomCards();
  grid.replaceChildren(...cards);
  renderFilters(filters, cards);

  const revealable = paperShelf.filter((paper) => hasAnswers(paper)).length;
  const imageOnly = paperShelf.filter((paper) => paper.mode === "images").length;
  status.textContent =
    `${paperShelf.length} captured papers & memos · ${revealable} with answers to reveal · ` +
    `${imageOnly} image-only (summary-level, labelled honestly) · every item cites its hashed capture file`;
  count.textContent = `${paperShelf.length} ITEMS`;
}
