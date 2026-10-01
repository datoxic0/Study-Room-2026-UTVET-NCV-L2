import {
  globalSources,
  paperSubjects,
  SEARCH_ENGINES,
  upcomingSubjects,
  VERIFIED_ON,
} from "../data/sources.js";
import { getUpcomingExams } from "./dashboard.js";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function badge(klass, status) {
  if (status === "unreachable") return el("span", "source-badge badge-flagged", "unreachable");
  return el(
    "span",
    `source-badge ${klass === "official" ? "badge-official" : "badge-community"}`,
    klass === "official" ? "official" : "community"
  );
}

function linkRow(link) {
  const row = el("div", "source-link");
  const anchor = el("a", null, link.label);
  anchor.href = link.url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  row.append(anchor, badge(link.klass, link.status));
  const meta = el("span", "source-link-meta", `${link.source} · checked ${VERIFIED_ON}`);
  row.append(meta);
  return row;
}

function searchRow(query) {
  const bar = el("div", "search-bar");
  for (const engine of SEARCH_ENGINES) {
    const a = el("a", "search-chip", engine.label);
    a.href = engine.build(query);
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    bar.append(a);
  }
  return bar;
}

function subjectCard(subject) {
  const card = el("article", "subject-card");
  const head = el("div", "subject-card-head");
  head.append(el("h3", null, subject.subject));
  head.append(el("span", "subject-stream", subject.stream));
  card.append(head);
  card.append(el("p", "subject-papers", subject.papers));
  const links = el("div", "source-links");
  for (const link of subject.links) links.append(linkRow(link));
  card.append(links);
  card.append(el("p", "search-legend", "Search deeper:"));
  card.append(searchRow(subject.searchQuery));
  return card;
}

export function initPapers() {
  document.querySelectorAll("[data-verified-on]").forEach((node) => {
    node.textContent = VERIFIED_ON;
  });

  const subjectList = paperSubjects;
  const examOrder = upcomingSubjects(getUpcomingExams()).map((entry) => entry.id);
  subjectList.sort((a, b) => {
    const ai = examOrder.indexOf(a.id);
    const bi = examOrder.indexOf(b.id);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });

  const grid = document.querySelector("#papers-subjects");
  grid.replaceChildren(...subjectList.map(subjectCard));

  const sources = document.querySelector("#papers-sources");
  sources.replaceChildren(
    ...globalSources.map((source) => {
      const card = el("article", "global-source");
      const head = el("div", "global-source-head");
      const anchor = el("a", null, source.label);
      anchor.href = source.url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      head.append(anchor, badge(source.klass, source.status));
      card.append(head);
      card.append(el("p", "global-source-note", source.note));
      return card;
    })
  );
}
