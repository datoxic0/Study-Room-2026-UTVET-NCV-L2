import { NOTEBOOKS_AUTH_WALL, notebookLabel, notebooks } from "../data/notebooks.js";
import { buildIndex, search } from "../core/search.js";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function renderRegistry() {
  const list = document.querySelector("#notebooks-list");
  list.replaceChildren(
    ...notebooks.map((entry, index) => {
      const card = el("article", "notebook-card");
      const head = el("div", "notebook-head");
      const anchor = el("a", null, notebookLabel(entry, index));
      anchor.href = entry.url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      head.append(anchor);
      head.append(
        el(
          "span",
          `source-badge ${entry.share === "author-flagged" ? "badge-flagged" : "badge-community"}`,
          entry.share === "author-flagged" ? "author: cant share" : "sign-in"
        )
      );
      card.append(head);
      card.append(el("p", "notebook-url", entry.url));
      if (entry.alternate) {
        const alt = el("a", "notebook-alt", "Alternate Gemini link ↗");
        alt.href = entry.alternate;
        alt.target = "_blank";
        alt.rel = "noopener noreferrer";
        card.append(alt);
      }
      return card;
    })
  );
}

async function loadLibrary() {
  const status = document.querySelector("#library-status");
  const results = document.querySelector("#library-results");
  const input = document.querySelector("#library-search");

  let index = [];
  try {
    const response = await fetch("data/notebooks/index.json", { cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));
    const payload = await response.json();
    const documents = Array.isArray(payload.documents) ? payload.documents : [];
    if (!documents.length) {
      status.textContent =
        "Library empty — export a notebook (Markdown/Text) into data/notebooks/ and run: npm run index-notebooks";
      return;
    }
    index = buildIndex(documents);
    status.textContent = `${documents.length} exported notebook file${documents.length === 1 ? "" : "s"} indexed · sha256 shown per file`;
    renderResults(search(index, "mechatronic"), results, true);
  } catch {
    status.textContent =
      "Library index not found (data/notebooks/index.json). Export your NotebookLM sources there and run the indexer.";
    return;
  }

  input.disabled = false;
  input.addEventListener("input", () => {
    const query = input.value.trim();
    if (!query) {
      results.replaceChildren();
      return;
    }
    renderResults(search(index, query), results, false);
  });
}

function renderResults(hits, container, seed) {
  container.replaceChildren();
  if (!seed && !hits.length) {
    container.append(el("p", "library-empty", "No matches in your exported notebooks."));
    return;
  }
  for (const hit of hits) {
    const row = el("article", "library-hit");
    row.append(el("h4", null, hit.title));
    row.append(el("p", null, hit.snippet));
    row.append(el("span", "library-hash", `sha256 ${String(hit.sha256 ?? "").slice(0, 12)}…`));
    container.append(row);
  }
}

export function initNotebooks() {
  document.querySelector("#notebook-auth-date").textContent = NOTEBOOKS_AUTH_WALL.measuredOn;
  renderRegistry();
  loadLibrary();
}
