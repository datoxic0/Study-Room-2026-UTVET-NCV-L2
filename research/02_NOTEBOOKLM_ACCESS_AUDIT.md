# 02 — NotebookLM Access Audit

## Empirical auth-wall test (J2)

- **Request:** `GET https://notebook.google.com/notebook/0b9ba18c-4ccc-43b5-b2f3-f009a665d25d` (first URL in `notebooks.txt`), redirects followed.
- **Final URL:** `https://accounts.google.com/v3/signin/identifier?continue=…WebLiteSignIn…` (Google sign-in page).
- **Capture:** `captures/notebooklm_authwall.html` — 944,304 bytes, **sha256 `0FF8F58D4D53588A99ABFA91AE0FF9A449DACAEC414F2CCBD15DB875D0A048A4`**, captured 2026-09-30.
- **Second fetch (webfetch):** returned the sign-in page content — same conclusion from two toolchains.
- **Independent corroboration:** University of Missouri System IT knowledge base (`tdx.umsystem.edu`, sha `0700B8D0…`): "You will be prompted to sign in with a Google account."
- **Claim C4 verdict:** CORROBORATED (2 independent keys, 1 primary/direct).

**Conclusion (FACT):** notebook contents cannot be fetched by this agent or by any unauthenticated client. The 16 notebook links ship as a **link registry with flags**, plus an **ingestion slot** for exports.

## Authenticated access — CORRECTION (2026-09-30, supersedes limitation above)

The auth wall applies **only to unauthenticated clients**. With a signed-in Google session the same URLs return full content.

- **Method:** Edge (`Edg/154.0.4258.37`) launched with `--remote-debugging-port=9222` on a fresh `--user-data-dir`; user signed in interactively; agent drove the session via Chrome DevTools Protocol (WebSocket, `scripts/pull_notebooks.mjs`, zero dependencies).
- **Result:** **17/17 notebooks fetched OK** (all URLs in `notebooks.txt`, including the 3 author-flagged `cant share` — flag means "not link-sharable", not "inaccessible to owner's account").
- **Captures:** `captures/notebooklm/<id>.txt` + `<id>.html`, **108 sources catalogued**, per-file sha256 in `captures/notebooklm/manifest.json`; spot-verified 17/17 hashes match `Get-FileHash` (UTF-8 bytes).
- **Interpretation correction:** "Anyone with the link" view still forces sign-in (302 → `notebook.google.com/login` → `accounts.google.com/v3/signin/identifier`, re-verified with browser UA, capture `notebook_retest.headers.txt`); the share toggle controls *which signed-in users* may view. Prior claim C4 remains true as stated (unauthenticated access blocked) but must not be read as "content unreachable in this project".

## Notebook registry (from `notebooks.txt`, 16 URLs)

- 13 unannotated links (assumed shareable — unverified: access requires the owner's Google session).
- 3 links annotated `cant share` by the author (preserved verbatim as `share: "author-flagged"`).
- 2 of those carry companion Gemini links (`gemini.google.com/app/…`, `share.gemini.google/…`) — preserved as alternates.

No notebook *contents* are claimed anywhere in the app.

## Ingestion architecture (how notebook data actually enters the app)

NotebookLM can export a notebook's sources/notes as Markdown/Text. The app ingests those exports:

1. User exports from NotebookLM → drops `*.md` / `*.txt` into `data/notebooks/`.
2. `node scripts/index_notebooks.mjs` scans the folder, computes **sha256 per file**, word counts, title (first `#` heading or filename) and writes `data/notebooks/index.json`.
3. The app fetches `index.json` at runtime, renders the notebook library, and offers **full-text search across all ingested exports** (client-side index in `js/core/search.js`).
4. Integrity: the app displays each file's sha256 prefix so users can verify the export wasn't altered.

Graceful degradation: if `index.json` is absent (fresh clone / `file://`), the Notebooks view shows the link registry + ingestion instructions instead of failing.

## Security / privacy notes

- Exports stay **local** (static hosting, no backend, no upload).
- The tutor's AI context includes only exam schedule + topic names the user types — never notebook file contents unless the user pastes them.

## Deep source extraction - Route B extension walker (2026-09-30)

Overview pulls alone do not give searchable document text. A purpose-built MV3
extension (`Global-Skills\notebooklm_ingestion\extension\`) was loaded into the
authenticated session (`--load-extension`, Edge 154) and used to walk every
source of every notebook.

- **Method:** MAIN-world fetch/XHR interceptor mirrors every
  `batchexecute` response; the ISOLATED content script walks
  `.single-source-container` rows (synthetic click on `.source-title`),
  waits for the `source-viewer`, then captures `.scroll-container` text
  (docx/text), rendered page-image URLs (PDFs - raster only, no DOM text)
  and the per-source Gemini summary (`tr032e` payload). Back-navigation uses
  the `.panel-header mat-icon` toggle (viewer -> list). Records persist in
  `chrome.storage.local`, batch-driven by `scripts/walk_sources.mjs` +
  `extract_records.mjs`.
- **Visibility hardening (measured):** an occluded/minimized window flips
  `document.visibilityState` to `hidden`, Chromium pauses rAF, and viewer
  transitions stall indefinitely. Fixed with launch flag
  `--disable-features=CalculateNativeWinOcclusion` (plus
  `--disable-background-timer-throttling`,
  `--disable-backgrounding-occluded-windows`, `--disable-renderer-backgrounding`).
- **Result (FACT, claim C7):** 17/17 notebooks, **76/76 sources** walked:
  **1,363,766 characters** of source text, **449 PDF page images**,
  **65/76 Gemini summaries**. Captures:
  `captures/notebooklm_sources/<nn>_<title>_<id8>.json` +
  `manifest.json` (sha256 `FCD05AA9C52F525E40CDF0E8D21A4AD4210D70E03F94E1ABDF49B21E9E9798C2`);
  re-hash via `Get-FileHash`: **17/17 match, 0 mismatches**.
- **Ingestion:** `scripts/ingest_source_captures.mjs` -> 17
  `data/notebooks/*.sources.txt` (each carrying its capture sha256 in a
  Provenance line); re-indexed `index.json` = 34 documents, sha256
  `A5A041DD1ABD99FFD6BBD7EC6B2E41287AC2F8B92E90F3E19F23853262764851`.
  `npm run check`: lint clean, 16/16 tests pass.
- **Evidence:** claim C7 CORROBORATED (E16 primary notebook capture manifest,
  E17 independent ingest pipeline), gate PASS exit 0, 17/17 items
  sha256-provenanced.
- **Remaining limitation (v0.3):** PDF sources yield page images + summaries,
  not verbatim text - NotebookLM exposes no PDF text layer, no download
  affordance and no original-file URL in captured payloads. Candidates:
  origin-based re-download (filenames leak `tvetpapers.co.za`), local OCR of
  page images (WinRT `Windows.Media.Ocr`), or clearly-labelled Gemini
  transcription.
