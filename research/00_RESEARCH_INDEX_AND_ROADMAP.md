# 00 — Research Index and Roadmap

**Project:** Studyroom (`exam_guide_by_whisperinggalaxyd`) — conversion of a static study-desk page into an enterprise-grade exam-prep app.
**Research window:** 2026-09-30. **Protocol:** `deep-research` (6-phase) + `investigative-journalism` (J1–J9) + `strict-truth-and-code-quality` + `job-os-governor`.
**Publication gate:** `corroborate.py --strict --require-hash` → **PASS, exit 0** (7/7 claims CORROBORATED, 17/17 evidence items hash-provenanced).

## Charter

1. Find **real** past question papers + memoranda for the student's exact subjects — only live-verified URLs ship.
2. Integrate the NotebookLM links in `notebooks.txt` honestly (auth-wall measured, ingestion slot designed).
3. No claim ships without capture + sha256 + two independent sources where the claim is load-bearing.

## Document map

| Dossier | Scope |
|---|---|
| `01_PAST_PAPERS_SOURCE_VERIFICATION.md` | Search log (J9), full URL verification table, subject→source mapping, null results, unknowns |
| `02_NOTEBOOKLM_ACCESS_AUDIT.md` | Auth-wall empirical test, 17-notebook registry, authenticated CDP fetch, ingestion architecture |
| `evidence.json` | Structured claims/evidence/queries consumed by `corroborate.py` |
| `captures/` | Raw page captures with sha256 (J2 provenance) |
| `implementation_plan.md` | `[MODIFY]/[NEW]` file plan + verification commands |

## Reconciliation note (skill conflict handling)

`deep-research` Phase 6 default is "wait for user review before code changes". The user's operating instruction for this session is an explicit build mandate ("turn this into a real, enterprise-grade app"). Per `job-os-governor`, this is a 1-skill default vs. explicit user directive, not a ≥2-skill conflict, so the directive governs: research was completed and gated **first**, then implementation proceeds in the same session. The gate output above is the evidence that Phase 6 was honoured.

## Roadmap status

- [x] Phase 1 — Boundary & auth audit (NotebookLM auth wall measured; nols.gov.za/utvet.co.za failures measured)
- [x] Phase 2 — DART: **Complicated** → Specialist protocol
- [x] Phase 3 — Source dissection (7 subject pages, DBE, Thutong, DHET, third-party indexes)
- [x] Phase 4 — Dossier scaffolding (this directory)
- [x] Phase 5 — Tri-agent adversarial review (see `01_…` Auditor section)
- [x] Phase 6 — Implementation plan → build under guardrails
- [x] Phase 7 — NotebookLM authenticated ingestion (user signed in via debug-port Edge; `scripts/pull_notebooks.mjs` fetched 17/17, hashed manifest, exports indexed, claim C6 corroborated)
- [x] Phase 8 — NotebookLM deep source extraction (MV3 extension walker `Global-Skills\notebooklm_ingestion\extension\`; 17/17 notebooks, 76/76 sources, 1,363,766 text chars, 449 PDF page images, 65 summaries; 17 hashed captures ingested, index 17→34 docs, claim C7 corroborated; PDF verbatim text = v0.3 roadmap)
- [x] Phase 9 — Study guides for all 7 exam subjects (`js/data/study_guides.js` + Guides view + reader modal; authored from `research/STUDY_GUIDE_DIGEST.md` generated off the 17 captures; 6 new tests enforce sha provenance vs manifest + coverage arithmetic + honesty rules — English FAL ships zero-capture gap plan rather than invented syllabus; `npm run check` 22/22, CDP render sweep 7/7 modals, 0 page exceptions)
- [x] Phase 10 — Papers & memoranda workroom (attempt-first reader inside the Guides view: `scripts/extract_papers.mjs` curated 30-entry inventory -> generated `js/data/paper_shelf.js`; 354 verbatim question rows, 4 QP/memo pairs, 38 verbatim memo rows (23 cross-capture joined onto `intro-2021-qp` + 15 embedded in `math-task1-2025`), 23 solved-set memo rows, 6 worked solution blocks, 11 honestly summary-only image captures; 8 new tests enforce sha provenance + verbatim substring proof (no fabrication) + pair integrity + coverage honesty; `npm run check` 30/30, CDP render sweep full pass 0 page exceptions, screenshots verified)
- [x] Phase 11 — Maths & notation rendering (user fix: students can read the captures now — `js/core/math_notation.js` dependency-free renderer turns raw LaTeX into stacked fractions, indexed surds, super/sub scripts, symbols, degrees and marking ticks with screen-reader plain text; wired through all reader surfaces + verbatim FORMULA SHEET panels (8+11 formulas, `FORMULA SHEET` badge); extraction strips formula-sheet blocks and header/footer boilerplate under chunked verbatim provenance (`assertBuiltFrom`, deletions only) and stops misattributing group-total marks; `npm run check` 39/39 (9 new tests: golden renders, shelf-wide no-raw-LaTeX sweep, aria English-word ban, escape safety, currency/bold, formula verbatim), math CDP sweep 0 raw commands / 0 `$digit` leftovers / 0 page exceptions, screenshots verified)
- [x] Phase 12 — Mobile UX & perfect modal scrolling (pre/post probes proved ~90% of both readers unreachable at 390px: 3700px+ content clipped inside `overflow: hidden` dialogs with no scroll path — fixed by moving the topbar into the layout (pinned grid row on desktop, sticky header of the single mobile scroll area, Close always reachable), ≤850px dialogs as `92dvh` flex shells with ONE overscroll-contained scroller + `body:has(dialog[open])` background lock + `dvh` caps, ≥44px tap targets at ≤850, phone reading sizes + 16px inputs at ≤600; verified 390×844 + 768×1024: `clipped: false`, bottom reachable, `tapTargets: []`, 0 page exceptions, desktop sweeps unchanged, `npm run check` 39/39; PUA tofu chars in 2 memos documented as a strict-truth data limitation awaiting v0.3 re-extraction; real-device follow-up: phone still scrolled the page behind the modal → root cause was stale SW-cached assets (Phase 12 changed files under un-bumped cache v5) → fixed with `studyroom-shell-v6` + stale-while-revalidate fetch, JS body-lock `js/core/dialog_lock.js` (both dialogs, synced on open/close; covers no-`:has()` engines), `scrollbar-gutter: stable`; now proven with real CDP touch drags (modal `scrollTop 0→285`, `window.scrollY 0`, backdrop drag locked) + SW lifecycle probe (v6 activates, 23/23 shell files, controlled reload serves new CSS))
- [x] Phase 13 — Quiz / test / exam builder + optional AI (new **Practice** tab: deterministic seeded paper assembly from a measured 341-item bank (274 past-paper subs + 67 drills) with subject/kind/count/minutes filters and per-item provenance; timed take with draft resume + auto-submit; scoring split auto-vs-self honestly (96 auto-scored, unanswered ≠ pending); attempt history + wrong>right retest queue; printable paper + separate MEMORANDUM page under `@media print`; optional OpenRouter layer — Study buddy rewired off the dead websim API onto `js/core/ai_client.js` (key in `localStorage` only, masked in DOM, strict JSON validation for AI-authored My-bank items, everything works keyless; fake-key probe proved a real 401 round-trip); `npm run check` 50/50 (11 new engine tests), CDP E2E desktop+phone+print-media 0 page exceptions; repaired historical UTF-8→ANSI double-encoding in index.html/README/roadmap/package.json)

