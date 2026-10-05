// Filename → shelf metadata for locally downloaded papers.
//
// The rules below were derived from the 31 entries that were originally
// hand-curated (now frozen in tests/fixtures/local_golden.json — the golden
// test asserts the classifier reproduces every one of them). Irregular
// filenames whose meaning is not in the name (Y-papers, X-papers, task sheets,
// mislabelled files) are overridden from
// research/Data-QuestionPapers-and-Memos-Downloaded/catalog.json.
//
// Pure module: no filesystem access, no side effects — feed it a filename and
// optional overrides, get the shelf metadata back.

const SUBJECT_RULES = [
  { test: /ELECTROTECHNOLOGY/i, key: "electrotechnology", display: "Electrotechnology", pfx: "elec" },
  { test: /ENGLISH.{0,3}FIRST.{0,3}ADDITIONAL|\bENGLISH\b/i, key: "english-fal", display: "English FAL", pfx: "eng" },
  { test: /INTRODUCTION.{0,3}TO.{0,3}COMPUT/i, key: "introduction-to-computer", display: "Introduction to Computers", pfx: "intro" },
  { test: /LIFE.{0,3}SKILLS/i, key: "life-skills-and-computer-literacy", display: "Life Skills and Computer Literacy", pfx: "life" },
  { test: /MANUAL.{0,3}MANUFACTURING/i, key: "manual-manufacturing", display: "Manual Manufacturing", pfx: "mm" },
  { test: /MATHEMATICS/i, key: "mathematics", display: "Mathematics", pfx: "math" },
  { test: /MECHATRONIC/i, key: "mechatronic-systems", display: "Mechatronic Systems", pfx: "mech" },
];

const MONTHS = {
  JAN: "January", FEB: "February", MAR: "March", APR: "April",
  MAY: "May", JUN: "June", JUL: "July", AUG: "August",
  SEP: "September", OCT: "October", NOV: "November", DEC: "December",
  SUPP: "Supplementary",
};

function tokensOf(name) {
  return name.toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
}

export function classifyLocalFile(name, overrides = {}) {
  const tokens = tokensOf(name);

  const derivedRule = SUBJECT_RULES.find((rule) => rule.test.test(name)) || null;
  const subject = overrides.subject ?? (derivedRule ? derivedRule.key : null);
  if (!subject) throw new Error(`cannot derive subject from filename: ${name}`);
  const rule = SUBJECT_RULES.find((r) => r.key === subject);
  if (!rule) throw new Error(`unknown subject key in override: ${subject}`);

  const kind = overrides.kind
    ?? (tokens.includes("MEMO") || tokens.includes("MG") ? "memo" : tokens.includes("QP") ? "qp" : null);
  if (!kind) throw new Error(`cannot derive kind (QP/MEMO/MG) from filename: ${name}`);

  const codeMatch = name.toUpperCase().match(/NC\d{4}/);
  const code = codeMatch ? codeMatch[0].toLowerCase() : null;

  const monthToken = tokens.find((t) => Object.prototype.hasOwnProperty.call(MONTHS, t));
  const year = (tokens.find((t) => /^20\d{2}$/.test(t))) || null;
  const monthLabel = monthToken ? MONTHS[monthToken] : null;

  const paperMatch = tokens.find((t) => /^P[12]$/.test(t));
  const paper = paperMatch ? paperMatch.slice(1) : null;

  const levelMatch = tokens.find((t) => /^L[23]$/.test(t));
  const level = overrides.level ?? (levelMatch ? `L${levelMatch.slice(1)}` : "L2");

  const session = overrides.session
    ?? (monthLabel && year ? (paper ? `${monthLabel} ${year} · Paper ${paper}` : `${monthLabel} ${year}`) : null);
  if (!session) throw new Error(`cannot derive session (month+year) from filename: ${name}`);

  const kindWord = kind === "qp" ? "QP" : "memo";
  const title = overrides.title
    ?? (monthLabel && year
      ? paper
        ? `${rule.display} ${level} Paper ${paper} — ${monthLabel} ${year} ${kindWord}`
        : codeMatch
          ? `${codeMatch[0]} ${rule.display} — ${monthLabel} ${year} ${kindWord}`
          : null
      : null);
  if (!title) throw new Error(`cannot derive title from filename: ${name}`);

  const id = overrides.id
    ?? (code && monthToken && year ? `${rule.pfx}-${code}-${kind}-${monthToken.toLowerCase()}${year}` : null);
  if (!id) throw new Error(`cannot derive id (needs NC code + month + year) from filename: ${name}`);

  return { id, subject, title, session, kind, level, file: name, pairId: null };
}

// QP↔memo pairing is derived from the data itself: within one subject + one
// session there must be exactly one QP and one memo (anything else stays
// unpaired, and a genuine collision throws so the data problem surfaces).
export function resolveLocalPairs(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const key = `${entry.subject}|${entry.session}|${entry.level}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }
  for (const group of groups.values()) {
    const qps = group.filter((e) => e.kind === "qp");
    const memos = group.filter((e) => e.kind === "memo");
    if (qps.length > 1 || memos.length > 1) {
      throw new Error(`ambiguous QP/memo pair for ${group[0].subject} ${group[0].session}: ${qps.length} qp / ${memos.length} memo`);
    }
    if (qps.length === 1 && memos.length === 1) {
      qps[0].pairId = memos[0].id;
      memos[0].pairId = qps[0].id;
    }
  }
  return entries;
}
