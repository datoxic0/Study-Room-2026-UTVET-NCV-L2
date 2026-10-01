# Notebook ingestion slot

All **17 NotebookLM notebooks** from `notebooks.txt` are exported here (fetched 2026-09-30 via an authenticated CDP session — see `research/02_NOTEBOOKLM_ACCESS_AUDIT.md`).

Two artifact families live side by side (34 indexed documents):

| Files | What it is | How it got here |
|---|---|---|
| `<title>.txt` | Notebook overview export (title, source count, Gemini overview, questions) | `scripts/pull_notebooks.mjs` (authenticated CDP pull) |
| `<title>.sources.txt` | **Full source capture** per notebook: per-source summaries, full text for docx/text sources, PDF page-image links, capture sha256 in the Provenance line | `scripts/ingest_source_captures.mjs` from `research/captures/notebooklm_sources/*.json` (MV3 extension walker — 76/76 sources, 1,363,766 text chars, 449 page images, 65 summaries) |

To add or refresh an export:

1. Open a notebook in NotebookLM -> **Share / Export -> Markdown or Text**
   (or re-run `node scripts/pull_notebooks.mjs` while a debug-port Edge session is signed in).
2. Save the export in this folder as `something.md` (or `.txt`).
3. Run:

   ```
   npm run index-notebooks
   ```

4. Open the app -> **Notebooks** tab -> search across everything you exported.

The indexer records `title`, `wordCount` and a **sha256** per file so you can verify exports are unmodified. Nothing leaves your machine.

PDF sources inside NotebookLM expose only rendered page images (no text layer); their `.sources.txt` entries therefore carry the Gemini summary + page-image URLs rather than verbatim text (v0.3 roadmap: origin re-download or local OCR).
