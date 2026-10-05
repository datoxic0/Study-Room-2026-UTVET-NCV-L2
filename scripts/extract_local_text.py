#!/usr/bin/env python3
"""Extract text + hashes for locally downloaded papers.

Feeds scripts/extract_papers.mjs:
  research/captures/local_pdfs/manifest.json   - sha256 of every ingested original
  research/captures/local_pdfs/<slug>.txt      - extracted text (text-layer files only)

Annual update flow (drop new QP/memo PDFs into the folder, then run this):
  * The folder is scanned automatically — no filename lists to edit.
  * Files listed in research/Data-QuestionPapers-and-Memos-Downloaded/
    exclusions.json are skipped (measured reason required, test-enforced).
  * Every other .pdf/.docx is classified by measurement, not by declaration:
      text layer >= 200 chars  -> text-file (parsed into shelf Q&A later)
      <= 40 chars              -> scan (ocr_papers.py transcribes it)
      41..199 chars            -> hard error: ambiguous, human must look
  * pypdf page text (encrypted files decrypted with the empty password).
  * DOCX: only visible text runs (<w:t> / <m:t>) in document order — drawing
    anchors, VML paths, field codes and base64 image data must never leak in.
"""
import datetime
import hashlib
import html
import json
import os
import re
import sys
from pypdf import PdfReader

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "research", "Data-QuestionPapers-and-Memos-Downloaded")
OUT = os.path.join(ROOT, "research", "captures", "local_pdfs")
EXCLUSIONS = os.path.join(DATA, "exclusions.json")

# Measured boundary between "this PDF has a real text layer" and "this PDF is a
# scan" (page furniture only). Current data: text layers >= 500 chars, scans <=
# 40 chars — the band between them is deliberately empty and fails loudly.
TEXT_LAYER_MIN = 200
SCAN_MAX = 40
DOC_EXTENSIONS = (".pdf", ".docx")


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:70].strip("-")


def pdf_text(path: str):
    reader = PdfReader(path)
    if reader.is_encrypted:
        reader.decrypt("")
    text = "\n".join((page.extract_text() or "") for page in reader.pages)
    return text, len(reader.pages)


def docx_text(path: str) -> str:
    import zipfile

    with zipfile.ZipFile(path) as bundle:
        xml = bundle.read("word/document.xml").decode("utf8", "ignore")
    lines = []
    for paragraph in xml.split("</w:p>"):
        runs = re.findall(r"<(?:w|m):t(?:\s[^>]*)?>(.*?)</(?:w|m):t>", paragraph, re.S)
        if runs:
            lines.append(html.unescape("".join(runs)))
    return "\n".join(lines)


def load_exclusions() -> dict:
    if not os.path.exists(EXCLUSIONS):
        return {}
    with open(EXCLUSIONS, encoding="utf8") as handle:
        payload = json.load(handle)
    excluded = {}
    for row in payload.get("excluded", []):
        reason = (row.get("reason") or "").strip()
        if len(reason) < 15:
            print(f"exclusions.json: reason too short for {row.get('file')}", file=sys.stderr)
            return None
        excluded[row["file"]] = reason
    return excluded


def folder_files() -> list:
    return sorted(f for f in os.listdir(DATA) if f.lower().endswith(DOC_EXTENSIONS))


def main() -> int:
    os.makedirs(OUT, exist_ok=True)
    excluded = load_exclusions()
    if excluded is None:
        return 1

    names = folder_files()
    missing = [f for f in excluded if f not in names]
    if missing:
        for f in missing:
            print(f"exclusions.json lists a file that is not in the folder: {f}", file=sys.stderr)
        return 1

    entries = []
    for name in names:
        if name in excluded:
            print(f"skip (excluded): {name}")
            continue
        path = os.path.join(DATA, name)
        with open(path, "rb") as handle:
            sha = hashlib.sha256(handle.read()).hexdigest()
        if name.lower().endswith(".docx"):
            text, pages = docx_text(path), 0
        else:
            text, pages = pdf_text(path)
        text_chars = len(text.strip())
        entry = {
            "file": "research/Data-QuestionPapers-and-Memos-Downloaded/" + name,
            "sha256": sha,
            "pages": pages,
            "textChars": len(text),
        }
        if text_chars >= TEXT_LAYER_MIN:
            text_name = slug(name) + ".txt"
            with open(os.path.join(OUT, text_name), "w", encoding="utf8") as handle:
                handle.write(text)
            entry["textFile"] = text_name
            if pages == 0:
                entry["docx"] = True
        elif text_chars <= SCAN_MAX:
            pass  # scan: no text file; ocr_papers.py transcribes it
        else:
            print(
                f"AMBIGUOUS text layer ({text_chars} chars, band {SCAN_MAX + 1}..{TEXT_LAYER_MIN - 1}) in {name} — "
                "inspect the file and adjust TEXT_LAYER_MIN/SCAN_MAX deliberately.",
                file=sys.stderr,
            )
            return 1
        entries.append(entry)
        print(f"{pages:3d}p {len(text):6d}ch {'TEXT' if 'textFile' in entry else 'SCAN'} {name[:72]}")

    if len({e["file"] for e in entries}) != len(entries):
        print("duplicate files in registry", file=sys.stderr)
        return 1
    manifest = {"builtOn": datetime.date.today().isoformat(), "files": entries}
    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf8") as handle:
        json.dump(manifest, handle, indent=2)
    print(f"manifest: {len(entries)} files -> research/captures/local_pdfs/manifest.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
