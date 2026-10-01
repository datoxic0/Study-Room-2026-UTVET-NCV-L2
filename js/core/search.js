function normalise(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildIndex(documents) {
  return documents.map((doc) => ({
    ...doc,
    _haystack: normalise(`${doc.title ?? ""} ${doc.excerpt ?? ""} ${doc.content ?? ""}`),
  }));
}

function snippet(content, query, radius = 90) {
  const text = String(content ?? "");
  const idx = normalise(text).indexOf(normalise(query));
  if (idx < 0) return text.slice(0, radius * 2).trim();
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + query.length + radius);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
}

export function search(index, query, limit = 20) {
  const terms = normalise(query).split(" ").filter(Boolean);
  if (!terms.length) return [];
  const hits = [];
  for (const doc of index) {
    let score = 0;
    for (const term of terms) {
      const inTitle = normalise(doc.title).includes(term);
      const inBody = doc._haystack.includes(term);
      if (inTitle) score += 3;
      if (inBody) score += 1;
      if (!inTitle && !inBody) {
        score = 0;
        break;
      }
    }
    if (score > 0) hits.push({ doc, score });
  }
  return hits
    .sort((a, b) => b.score - a.score || String(a.doc.title).localeCompare(String(b.doc.title)))
    .slice(0, limit)
    .map(({ doc, score }) => ({
      id: doc.id,
      title: doc.title,
      source: doc.source,
      sha256: doc.sha256,
      score,
      snippet: snippet(doc.content || doc.excerpt || "", query),
    }));
}
