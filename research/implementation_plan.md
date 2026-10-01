# Implementation Plan — Studyroom Enterprise Build

Research gate: **PASS** (`corroborate.py --strict --require-hash` exit 0). This plan is the Phase 6 artifact.

## File operations

### [MODIFY]
- `index.html` — add top nav (Dashboard / Past papers / Notebooks), papers + notebooks view containers, PWA manifest link; keep all existing dashboard ids intact.
- `styles.css` — extend design system: nav, source cards, badges (official/third-party/unreachable), notebooks library, search UI.
- `app.js` — become thin boot module (router + view init).

### [NEW]
- `js/data/exams.js` — exam schedule + daily plan data.
- `js/data/sources.js` — verified link registry (status, class, verified_on, subject mapping).
- `js/data/notebooks.js` — 16-notebook registry parsed from `notebooks.txt`.
- `js/core/dates.js` — pure date utilities (unit-tested).
- `js/core/storage.js` — fail-safe localStorage wrapper.
- `js/core/search.js` — pure full-text index/search (unit-tested).
- `js/ui/dashboard.js`, `js/ui/papers.js`, `js/ui/notebooks.js`, `js/ui/tutor.js`, `js/ui/timer.js`.
- `scripts/validate.mjs` — bespoke lint (ids, URL integrity, data sanity, forbidden tokens).
- `scripts/index_notebooks.mjs` — notebook export indexer (sha256 + titles + index.json).
- `tests/dates.test.mjs`, `tests/search.test.mjs`, `tests/data.test.mjs` (node:test).
- `package.json` — `type: module`, scripts `lint` / `test` / `check`.
- `manifest.webmanifest`, `sw.js` — PWA install + offline shell (Angel: offline cache worker).
- `data/notebooks/README.md` + `data/notebooks/index.json` — ingestion slot.
- `README.md` — operations manual.
- `research/*` — completed dossiers (this directory).

### [DELETE]
- none.

## Verification commands (run in loop until 0 errors)

```
node scripts/validate.mjs              # bespoke lint
node --test "tests/*.test.mjs"         # unit tests (16 tests)
node --check for every module via validate.mjs (ESM parse)
python -m http.server smoke test (fetch index.html + assets, expect 200)
```
