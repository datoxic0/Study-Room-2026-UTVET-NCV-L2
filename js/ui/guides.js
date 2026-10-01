import { studyGuides, GUIDE_BUILT_ON } from "../data/study_guides.js";
import { papersBySubject } from "../data/paper_shelf.js";
import { exams } from "../data/exams.js";
import { subjectByName, VERIFIED_ON } from "../data/sources.js";
import { buildIndex, search } from "../core/search.js";
import { parseExamDate, weekdayFormatter } from "../core/dates.js";
import { initWorkroom, openPaper } from "./paper_reader.js";

const shortDate = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });

function formatDate(date) {
  return `${weekdayFormatter.format(date)} ${shortDate.format(date)}`;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function examsFor(subject) {
  return exams
    .filter((exam) => exam.subject === subject)
    .map((exam) => ({ ...exam, parsed: parseExamDate(exam.date) }));
}

function daysUntil(parsed) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Math.round((parsed.getTime() - start.getTime()) / 86400000);
}

function formatStats(coverage) {
  if (coverage.level === "none") return "no captured sources yet";
  const parts = [
    `${coverage.sources} source${coverage.sources === 1 ? "" : "s"}`,
    `${Math.round(coverage.chars / 1000)}k chars`,
  ];
  if (coverage.pages) parts.push(`${coverage.pages} page images`);
  if (coverage.level === "partial") parts.push("transferable only");
  return parts.join(" · ");
}

function buildCards() {
  return studyGuides.map((guide) => {
    const card = el("article", `guide-card coverage-${guide.coverage.level}`);
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Open study guide: ${guide.subject}`);

    const head = el("div", "guide-card-head");
    head.append(el("h3", null, guide.subject));
    head.append(
      el(
        "span",
        `source-badge ${guide.coverage.level === "strong" ? "badge-official" : guide.coverage.level === "partial" ? "badge-community" : "badge-flagged"}`,
        guide.coverage.level === "strong" ? "captured library" : guide.coverage.level === "partial" ? "partial library" : "no captures"
      )
    );
    card.append(head);
    card.append(el("p", "subject-stream", `${guide.stream} · ${guide.papers}`));

    const chips = el("div", "guide-exam-chips");
    for (const exam of examsFor(guide.subject)) {
      const days = daysUntil(exam.parsed);
      const chip = el(
        "span",
        `guide-exam-chip${days <= 21 ? " is-soon" : ""}`,
        `${exam.paper} · ${formatDate(exam.parsed)} · ${days >= 0 ? `${days}d` : "done"}`
      );
      chips.append(chip);
    }
    card.append(chips);

    card.append(el("p", "guide-summary", guide.summary));
    card.append(el("span", "guide-stats", formatStats(guide.coverage)));

    const open = el("span", "guide-open", "Open guide →");
    card.append(open);

    const openGuide = () => openDialog(guide);
    card.addEventListener("click", openGuide);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openGuide();
      }
    });
    return card;
  });
}

function openDialog(guide) {
  const dialog = document.querySelector("#guide-dialog");
  if (!dialog) return;
  const layout = el("div", "guide-dialog-layout");

  const side = el("aside", "guide-dialog-side");
  const sideHead = el("div", "guide-dialog-side-head");
  sideHead.append(el("p", "eyebrow", "STUDY GUIDE"));
  sideHead.append(el("h2", null, guide.subject));
  side.append(sideHead);
  side.append(el("p", "guide-side-meta", `${guide.stream} · ${guide.papers}`));

  const examBlock = el("div", "guide-side-exams");
  examBlock.append(el("p", "guide-side-label", "EXAM DATES"));
  for (const exam of examsFor(guide.subject)) {
    const days = daysUntil(exam.parsed);
    examBlock.append(
      el(
        "p",
        "guide-side-exam",
        `${exam.paper} — ${formatDate(exam.parsed)} ${exam.time} (${exam.duration})${days >= 0 ? ` · ${days} days` : ""}`
      )
    );
  }
  side.append(examBlock);

  const covBlock = el("div", "guide-side-exams");
  covBlock.append(el("p", "guide-side-label", "LIBRARY COVERAGE"));
  covBlock.append(el("p", "guide-side-exam", formatStats(guide.coverage)));
  if (guide.coverage.note) covBlock.append(el("p", "guide-side-note", guide.coverage.note));
  side.append(covBlock);

  const links = subjectByName(guide.subject);
  if (links && links.links.length) {
    const linkBlock = el("div", "guide-side-exams");
    linkBlock.append(el("p", "guide-side-label", "GET MORE PAPERS"));
    for (const link of links.links) {
      const anchor = el("a", "guide-side-link", `${link.label} ↗`);
      anchor.href = link.url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      linkBlock.append(anchor);
    }
    linkBlock.append(el("p", "guide-side-note", `Links verified ${VERIFIED_ON}`));
    side.append(linkBlock);
  }
  layout.append(side);

  const main = el("div", "guide-dialog-main");
  const topBar = el("div", "guide-dialog-topbar");
  const meta = el("span", "guide-dialog-meta", `Built from ${guide.captures.length} hashed capture${guide.captures.length === 1 ? "" : "s"} · library rebuilt ${GUIDE_BUILT_ON}`);
  topBar.append(meta);
  const close = el("button", "guide-close", "Close ×");
  close.type = "button";
  close.addEventListener("click", () => dialog.close());
  topBar.append(close);
  main.append(topBar);

  main.append(el("p", "guide-dialog-summary", guide.summary));

  for (const section of guide.sections) {
    const block = el("section", "guide-section");
    block.append(el("h3", null, section.heading));
    if (section.body) block.append(el("p", null, section.body));
    if (section.points && section.points.length) {
      const list = el("ul", "guide-points");
      for (const point of section.points) list.append(el("li", null, point));
      block.append(list);
    }
    main.append(block);
  }

  if (guide.checkQuestions.length) {
    const quiz = el("section", "guide-section guide-quiz");
    quiz.append(el("h3", null, `Self-check — ${guide.checkQuestions.length} questions`));
    quiz.append(el("p", "guide-quiz-hint", "Answer from memory first, then reveal."));
    for (const item of guide.checkQuestions) {
      const details = el("details", "guide-question");
      details.append(el("summary", null, item.q));
      details.append(el("p", null, item.a));
      quiz.append(details);
    }
    main.append(quiz);
  }

  const shelf = papersBySubject(guide.id);
  const papersBlock = el("section", "guide-section guide-papers");
  papersBlock.append(el("h3", null, `Papers & memos in hand — ${shelf.length} captured`));
  if (shelf.length === 0) {
    papersBlock.append(
      el("p", null, "No papers for this subject exist inside the capture set yet — nothing is invented here. Use the verified links in the sidebar to fetch real papers, or add them to a Notebook and re-run the capture pipeline.")
    );
  } else {
    papersBlock.append(
      el("p", "guide-quiz-hint", "Attempt first, then reveal — every item opens with its hashed capture file attached.")
    );
    for (const paper of shelf) {
      const button = el("button", "guide-paper-link");
      button.type = "button";
      const head = el("span", "guide-paper-head");
      head.append(el("span", `wk-badge wk-kind-${paper.kind}`, paper.kind === "memo" ? "MEMORANDUM" : paper.kind === "solved" ? "SOLVED EXAM + MEMO" : paper.kind === "solutions" ? "WORKED ANSWERS" : paper.kind === "practice" ? "PRACTICE SET" : "QUESTION PAPER"));
      head.append(el("strong", null, paper.title));
      button.append(head);
      button.append(el("span", "guide-paper-meta", paper.session));
      button.addEventListener("click", () => {
        dialog.close();
        openPaper(paper.id);
      });
      papersBlock.append(button);
    }
  }
  main.append(papersBlock);

  const provenance = el("footer", "guide-provenance");
  provenance.append(el("p", "guide-side-label", "PROVENANCE — every guide claim traces to these captures"));
  if (guide.captures.length) {
    for (const capture of guide.captures) {
      provenance.append(
        el("p", "guide-prov-item", `${capture.file} — sha256 ${capture.sha256.slice(0, 16)}…`)
      );
    }
    provenance.append(el("p", "guide-side-note", "Full hashes live in research/captures/notebooklm_sources/manifest.json and are verified by the test suite."));
  } else {
    provenance.append(el("p", "guide-prov-item", "No captures yet — this guide deliberately claims no library content."));
  }
  main.append(provenance);

  layout.append(main);
  dialog.replaceChildren(layout);
  if (!dialog.open) dialog.showModal();
}

function renderCards(container) {
  const cards = buildCards();
  container.replaceChildren(...cards);
  return cards;
}

export function initGuides() {
  const grid = document.querySelector("#guides-grid");
  const input = document.querySelector("#guides-search");
  const status = document.querySelector("#guides-status");

  const allCards = renderCards(grid);
  status.textContent = `${studyGuides.length} subject guides · built from the 76-source capture set · every sha verified by tests`;
  initWorkroom();

  const documents = studyGuides.map((guide) => ({
    id: guide.id,
    title: guide.subject,
    excerpt: guide.summary,
    content: [
      guide.summary,
      ...guide.sections.flatMap((section) => [section.heading, section.body ?? "", ...(section.points ?? [])]),
      ...guide.checkQuestions.flatMap((item) => [item.q, item.a]),
    ].join(" "),
  }));
  const index = buildIndex(documents);

  input.disabled = false;
  input.addEventListener("input", () => {
    const query = input.value.trim();
    if (!query) {
      grid.replaceChildren(...allCards);
      return;
    }
    const hits = search(index, query, studyGuides.length);
    const ids = new Set(hits.map((hit) => hit.id));
    grid.replaceChildren(...allCards.filter((card, i) => ids.has(studyGuides[i].id)));
  });
}
