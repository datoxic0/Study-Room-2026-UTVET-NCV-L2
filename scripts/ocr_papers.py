#!/usr/bin/env python3
"""Phase 2: transcribe scanned papers with two independent OCR engines.

Outputs (all under research/captures/local_pdfs/):
  ocr/<slug>.winrt.txt         - primary transcription, Windows.Media.Ocr (en-GB)
  ocr/<slug>.rapid.txt         - cross-check transcription, rapidocr-onnxruntime
  ocr/<slug>.rapid.spaced.txt  - content-preserving re-spacing of glued runs
  ocr_manifest.json            - sha256 of source PDF + outputs + agreement

Policy lives in scripts/extract_papers.mjs (it alone decides which transcriptions
are good enough to enter the bank); this script only produces facts:
  f1       - word bag-F1 between the two engines (order-insensitive)
  digitF1  - word bag-F1 over pure-digit tokens (marks/values gate)
  calib    - same metrics for native-text PDFs: WinRT OCR vs the native layer

Resumable: files whose outputs already exist (and hash-match the source PDF) are
not re-OCR'd. --force re-does everything.
"""
import asyncio
import datetime
import hashlib
import importlib.metadata
import json
import os
import platform
import re
import sys
import tempfile
import time
from collections import Counter
from concurrent.futures import ProcessPoolExecutor, as_completed

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract_local_text import DATA, OUT, slug  # noqa: E402
from pypdf import PdfReader  # noqa: E402
import pypdfium2 as pdfium  # noqa: E402

OCR_DIR = os.path.join(OUT, "ocr")
MANIFEST = os.path.join(OUT, "ocr_manifest.json")
LOCAL_MANIFEST = os.path.join(OUT, "manifest.json")
DPI = 200


def manifest_lists():
    """Scan/text split as measured by extract_local_text.py — the manifest is
    the single source of truth (no filename lists to maintain per year)."""
    if not os.path.exists(LOCAL_MANIFEST):
        raise SystemExit("manifest.json missing — run scripts/extract_local_text.py first")
    with open(LOCAL_MANIFEST, encoding="utf8") as handle:
        rows = json.load(handle)["files"]
    scans = [os.path.basename(r["file"]) for r in rows if "textFile" not in r]
    text_files = [os.path.basename(r["file"]) for r in rows if "textFile" in r]
    return scans, text_files


def sha256_file(path):
    with open(path, "rb") as handle:
        return hashlib.sha256(handle.read()).hexdigest()


def words(text):
    return re.findall(r"[a-z0-9]+", text.lower())


def digit_words(text):
    return re.findall(r"\b\d+\b", text)


def cbigrams(text):
    flat = re.sub(r"\s+", "", text.lower())
    return [flat[i : i + 2] for i in range(len(flat) - 1)]


def digit_runs(text):
    return re.findall(r"\d+", text)


def bag_f1(a, b):
    ca, cb = Counter(a), Counter(b)
    inter = sum((ca & cb).values())
    prec = inter / max(1, sum(cb.values()))
    rec = inter / max(1, sum(ca.values()))
    if prec + rec == 0:
        return 0.0
    return 2 * prec * rec / (prec + rec)


def agreement(native, other):
    """Four views of the same question: how much do the two texts share?

    word f1 / digit f1 are token-based (inflated deflations from spacing
    merges — reported for transparency only); cbigram f1 is the
    tokenization-invariant word-content bar; digitRun f1 compares digit
    runs (marks, values, codes) with no spacing sensitivity.
    """
    return {
        "f1": round(bag_f1(words(native), words(other)), 4),
        "digitF1": round(bag_f1(digit_words(native), digit_words(other)), 4),
        "cbigramF1": round(bag_f1(cbigrams(native), cbigrams(other)), 4),
        "digitRunF1": round(bag_f1(digit_runs(native), digit_runs(other)), 4),
    }


def render_pages(pdf_path, tmpdir, tag):
    doc = pdfium.PdfDocument(pdf_path)
    paths = []
    for i in range(len(doc)):
        png = os.path.join(tmpdir, f"{tag}_p{i:02d}.png")
        doc[i].render(scale=DPI / 72).to_pil().save(png)
        paths.append(png)
    return paths


def winrt_ocr_sync(pngs):
    from winrt.windows.media.ocr import OcrEngine
    from winrt.windows.globalization import Language
    from winrt.windows.storage import StorageFile
    from winrt.windows.graphics.imaging import BitmapDecoder

    engine = OcrEngine.try_create_from_language(Language("en-GB"))
    if engine is None:
        raise RuntimeError("WinRT OCR engine unavailable for en-GB")

    async def run():
        out = []
        for png in pngs:
            f = await StorageFile.get_file_from_path_async(png)
            stream = await f.open_read_async()
            dec = await BitmapDecoder.create_async(stream)
            bmp = await dec.get_software_bitmap_async()
            res = await engine.recognize_async(bmp)
            out.append(res.text or "")
        return out

    return asyncio.run(run())


_RAPID = None


def _rapid_init():
    global _RAPID
    from rapidocr_onnxruntime import RapidOCR

    _RAPID = RapidOCR()


def _rapid_file(job):
    pdf_path, slug_name, tmpdir = job
    pngs = []
    try:
        pngs = render_pages(pdf_path, tmpdir, slug_name)
        pages = []
        for png in pngs:
            result, _ = _RAPID(png)
            pages.append("\n".join(r[1] for r in (result or [])))
        return slug_name, "\n\n".join(pages), None
    except Exception as exc:  # engine failure must surface, not vanish
        return slug_name, None, f"{type(exc).__name__}: {exc}"
    finally:
        for png in pngs:
            try:
                os.remove(png)
            except OSError:
                pass


def write_text(slug_name, engine, text):
    path = os.path.join(OCR_DIR, f"{slug_name}.{engine}.txt")
    with open(path, "w", encoding="utf8") as handle:
        handle.write(text)
    return path


def load_text(path):
    with open(path, encoding="utf8") as handle:
        return handle.read()


# rapidocr's recognizer occasionally glues whole phrases with no spaces
# ("IdentifythecomponentsshowninFIGURE2"). Repair inserts spaces back inside
# glued runs — segments always re-join to the exact original run (content is
# provably preserved, only whitespace changes). Conservative acceptance: every
# segment must be a real-looking piece (>= 4 chars, or a common short word, or
# pure digits) — ambiguous fragments like "isola"/"tor" reject the whole run,
# which then stays merged exactly as the engine produced it.
MERGE_RUN = re.compile(r"[A-Za-z]{21,}")
SHORT_OK = {
    "a", "an", "the", "to", "of", "in", "on", "or", "is", "it", "at", "as",
    "by", "for", "and", "no", "not", "be", "we", "do", "so", "if", "up",
    "he", "us", "my", "go", "it", "raw", "bar", "one", "two", "six", "ten",
    "all", "any", "but", "can", "end", "few", "got", "new", "old", "out",
    "per", "see", "set", "top", "use", "way", "yet", "let", "run", "add",
    "put", "get", "ask", "own", "has", "had", "was", "are", "am", "its",
    "eat", "law", "oil", "amp", "max", "min", "ohm", "ac", "dc", "rms",
    "key", "row", "aim", "box", "cap", "pin", "leg", "rod", "tap", "cut",
    "you", "pen", "how", "show", "ink", "fit", "gap", "lug", "nut", "sun",
    "air", "via", "off", "sub", "watt", "volt", "coil", "loop", "chip",
    "who", "may", "too", "his", "her", "low", "due", "god", "bus", "saw",
    "far", "big", "men", "let", "say", "she", "him", "now", "get", "not",
}
# single letters that are real exam variables/labels (x, y, v …), never junk
SHORT_VARS = {"x", "y", "z", "u", "v", "w", "p", "q", "r", "k"}


def space_repair(text):
    """Insert spaces into glued-word runs; returns (text, stats)."""
    try:
        import wordninja
    except ImportError:
        return text, {"runs": 0, "repaired": 0, "rejected": 0, "tool": "missing"}
    runs = list(MERGE_RUN.finditer(text))
    if not runs:
        return text, {"runs": 0, "repaired": 0, "rejected": 0, "tool": "wordninja"}
    parts = []
    last = 0
    repaired = 0
    rejected = 0
    for m in runs:
        segs = wordninja.split(m.group(0))
        ok = len(segs) > 1 and all(
            len(s) >= 4
            or s.lower() in SHORT_OK
            or s.isdigit()
            or s.isupper()  # OCR labels/codes: RLC, YOU, P, Q
            or s.lower() in SHORT_VARS
            for s in segs
        )
        parts.append(text[last : m.start()])
        parts.append(" ".join(segs) if ok else m.group(0))
        repaired += 1 if ok else 0
        rejected += 0 if ok else 1
        last = m.end()
    parts.append(text[last:])
    return "".join(parts), {
        "runs": len(runs),
        "repaired": repaired,
        "rejected": rejected,
        "tool": "wordninja",
    }


def ocr_one(name, tmpdir):
    """Returns manifest record for one PDF (reusing outputs when resumable)."""
    pdf_path = os.path.join(DATA, name)
    slug_name = slug(name)
    rel = "research/Data-QuestionPapers-and-Memos-Downloaded/" + name
    pdf_sha = sha256_file(pdf_path)
    winrt_path = os.path.join(OCR_DIR, f"{slug_name}.winrt.txt")
    rapid_path = os.path.join(OCR_DIR, f"{slug_name}.rapid.txt")

    winrt_text = None
    if os.path.exists(winrt_path):
        winrt_text = load_text(winrt_path)
    else:
        pngs = render_pages(pdf_path, tmpdir, slug_name)
        winrt_text = "\n\n".join(winrt_ocr_sync(pngs))
        write_text(slug_name, "winrt", winrt_text)
        print(f"  winrt  {slug_name}: {len(winrt_text)} chars", flush=True)

    rapid_text = load_text(rapid_path) if os.path.exists(rapid_path) else None

    reader = PdfReader(pdf_path)
    return {
        "file": rel,
        "sha256": pdf_sha,
        "pages": len(reader.pages),
        "slug": slug_name,
        "winrtFile": f"ocr/{slug_name}.winrt.txt",
        "winrtSha256": sha256_file(winrt_path),
        "winrtChars": len(winrt_text),
        "_rapidText": rapid_text,
        "_rapidPath": rapid_path,
    }


def main():
    force = "--force" in sys.argv
    os.makedirs(OCR_DIR, exist_ok=True)
    if force:
        for name in os.listdir(OCR_DIR):
            os.remove(os.path.join(OCR_DIR, name))

    PDF_SCANS, TEXT_FILES = manifest_lists()
    t0 = time.time()
    print(f"OCR start: {len(PDF_SCANS)} scanned files, {DPI} dpi", flush=True)

    # 1) WinRT primary (sequential; ~1.5 s/page)
    records = []
    with tempfile.TemporaryDirectory(prefix="ocr_pages_") as tmpdir:
        for name in PDF_SCANS:
            records.append(ocr_one(name, tmpdir))

    # 2) rapidocr cross-check (4 processes; ~20 s/page each)
    jobs = [
        (os.path.join(DATA, name), slug(name), tempfile.gettempdir())
        for name in PDF_SCANS
        if not os.path.exists(os.path.join(OCR_DIR, f"{slug(name)}.rapid.txt"))
    ]
    if jobs:
        print(f"rapidocr: {len(jobs)} files on 4 workers", flush=True)
        with ProcessPoolExecutor(max_workers=4, initializer=_rapid_init) as pool:
            futures = [pool.submit(_rapid_file, job) for job in jobs]
            for fut in as_completed(futures):
                slug_name, text, err = fut.result()
                if err:
                    print(f"  RAPID FAIL {slug_name}: {err}", flush=True)
                else:
                    write_text(slug_name, "rapid", text)
                    print(f"  rapid {slug_name}: {len(text)} chars", flush=True)

    # 2b) spacing repair (content-preserving) over every rapid transcription
    repair_total = {"runs": 0, "repaired": 0, "rejected": 0}
    for rec in records:
        rapid_path = os.path.join(OCR_DIR, f"{rec['slug']}.rapid.txt")
        if not os.path.exists(rapid_path):
            continue
        spaced, stats = space_repair(load_text(rapid_path))
        for k in repair_total:
            repair_total[k] += stats[k]
        if stats["runs"] > 0:
            p = write_text(rec["slug"], "rapid.spaced", spaced)
            rec["spacedFile"] = f"ocr/{rec['slug']}.rapid.spaced.txt"
            rec["spacedSha256"] = sha256_file(p)
            rec["spacedRuns"] = stats
    if repair_total["runs"]:
        print(
            f"spacing repair: {repair_total['repaired']}/{repair_total['runs']} glued runs re-spaced, "
            f"{repair_total['rejected']} rejected (left merged)",
            flush=True,
        )

    # 3) metrics + manifest
    files = []
    for rec in records:
        rapid_path = rec.pop("_rapidPath")
        rapid_text = rec.pop("_rapidText")
        if rapid_text is None and os.path.exists(rapid_path):
            rapid_text = load_text(rapid_path)
        if rapid_text is None:
            rec["error"] = "rapidocr output missing"
            files.append(rec)
            continue
        rec["rapidFile"] = f"ocr/{rec['slug']}.rapid.txt"
        rec["rapidSha256"] = sha256_file(rapid_path)
        rec["rapidChars"] = len(rapid_text)
        winrt_text = load_text(os.path.join(OCR_DIR, f"{rec['slug']}.winrt.txt"))
        rec.update(agreement(winrt_text, rapid_text))
        files.append(rec)

    # 4) calibration: WinRT vs native text layer on text-layer PDFs (docx is
    # already native text — nothing to rasterise). Outputs are persisted so
    # the accuracy anchor is itself hash-verifiable.
    calibration = []
    with tempfile.TemporaryDirectory(prefix="ocr_cal_") as tmpdir:
        for name in TEXT_FILES:
            if not name.lower().endswith(".pdf"):
                continue
            pdf_path = os.path.join(DATA, name)
            native = "\n".join((p.extract_text() or "") for p in PdfReader(pdf_path).pages)
            cal_path = os.path.join(OCR_DIR, f"{slug(name)}-calibration.winrt.txt")
            if os.path.exists(cal_path):
                ocr_text = load_text(cal_path)
            else:
                pngs = render_pages(pdf_path, tmpdir, slug(name))
                ocr_text = "\n\n".join(winrt_ocr_sync(pngs))
                cal_path = write_text(slug(name) + "-calibration", "winrt", ocr_text)
            entry = {
                "file": "research/Data-QuestionPapers-and-Memos-Downloaded/" + name,
                "pages": len(PdfReader(pdf_path).pages),
                "winrtFile": f"ocr/{slug(name)}-calibration.winrt.txt",
                "winrtSha256": sha256_file(cal_path),
            }
            entry.update(agreement(native, ocr_text))
            import difflib

            entry["seqSim"] = round(
                difflib.SequenceMatcher(None, words(native), words(ocr_text)).ratio(), 4
            )
            calibration.append(entry)

    # 4b) same calibration for the cross engine (rapidocr on the same pages)
    cal_jobs = []
    for entry in calibration:
        slug_name = slug(os.path.basename(entry["file"]))
        cal_rapid_path = os.path.join(OCR_DIR, f"{slug_name}-calibration.rapid.txt")
        if os.path.exists(cal_rapid_path):
            text = load_text(cal_rapid_path)
        else:
            cal_jobs.append((os.path.join(DATA, os.path.basename(entry["file"])), slug_name, tempfile.gettempdir()))
            continue
        native = "\n".join(
            (p.extract_text() or "")
            for p in PdfReader(os.path.join(DATA, os.path.basename(entry["file"]))).pages
        )
        entry["rapidFile"] = f"ocr/{slug_name}-calibration.rapid.txt"
        entry["rapidSha256"] = sha256_file(cal_rapid_path)
        entry.update({f"rapid_{k}": v for k, v in agreement(native, text).items()})
    if cal_jobs:
        by_slug = {slug(os.path.basename(e["file"])): e for e in calibration}
        with ProcessPoolExecutor(max_workers=4, initializer=_rapid_init) as pool:
            triples = list(pool.map(_rapid_file, cal_jobs))
        results = {t[0]: t for t in triples}
        for job in cal_jobs:
            slug_name = job[1]
            entry = by_slug[slug_name]
            _, text, err = results.get(slug_name, (slug_name, None, "missing result"))
            if err:
                entry["rapidError"] = err
                continue
            cal_rapid_path = write_text(slug_name + "-calibration", "rapid", text)
            native = "\n".join(
                (p.extract_text() or "")
                for p in PdfReader(os.path.join(DATA, os.path.basename(entry["file"]))).pages
            )
            entry["rapidFile"] = f"ocr/{slug_name}-calibration.rapid.txt"
            entry["rapidSha256"] = sha256_file(cal_rapid_path)
            entry.update({f"rapid_{k}": v for k, v in agreement(native, text).items()})

    manifest = {
        "builtOn": datetime.date.today().isoformat(),
        "dpi": DPI,
        "engines": {
            "primary": "windows-media-ocr (en-GB, system)",
            "cross": f"rapidocr-onnxruntime {importlib.metadata.version('rapidocr-onnxruntime')} / onnxruntime {importlib.metadata.version('onnxruntime')}",
            "platform": platform.platform(),
        },
        "repair": {
            "tool": f"wordninja {importlib.metadata.version('wordninja')}",
            "rule": "insert spaces inside glued runs >=21 letters (case preserved by wordninja); segments re-join to the original run (content preserved); a segment <4 chars that is neither a common short word nor pure digits rejects the run (left merged)",
            "totals": repair_total,
        },
        "files": sorted(files, key=lambda r: r["file"]),
        "calibration": calibration,
    }
    with open(MANIFEST, "w", encoding="utf8") as handle:
        json.dump(manifest, handle, indent=2)

    f1s = [r["cbigramF1"] for r in files if "cbigramF1" in r]
    d1s = [r["digitRunF1"] for r in files if "digitRunF1" in r]
    errs = [r for r in files if "error" in r]
    print(f"manifest: {len(files)} files, {len(errs)} errors", flush=True)
    if f1s:
        print(f"cbigram f1: min={min(f1s):.3f} mean={sum(f1s)/len(f1s):.3f} max={max(f1s):.3f}", flush=True)
        print(f"digitRun f1: min={min(d1s):.3f} mean={sum(d1s)/len(d1s):.3f} max={max(d1s):.3f}", flush=True)
        for r in sorted((r for r in files if "cbigramF1" in r), key=lambda r: r["cbigramF1"]):
            print(f"  cb={r['cbigramF1']:.3f} dr={r['digitRunF1']:.3f}  {r['slug']}", flush=True)
    print(f"calibration vs native layer:", flush=True)
    for c in calibration:
        print(
            f"  winrt cb={c['cbigramF1']:.3f} dr={c['digitRunF1']:.3f} seq={c['seqSim']:.3f}"
            + (
                f" | rapid cb={c.get('rapid_cbigramF1', float('nan')):.3f} dr={c.get('rapid_digitRunF1', float('nan')):.3f}"
                if "rapid_cbigramF1" in c
                else ""
            )
            + f"  {c['file'].split('/')[-1][:50]}",
            flush=True,
        )
    print(f"done in {time.time() - t0:.0f}s", flush=True)


if __name__ == "__main__":
    main()
