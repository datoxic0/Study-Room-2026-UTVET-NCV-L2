# 01 — Past-Paper Source Verification Dossier

**All measurements taken 2026-09-30.** Capture method: `Invoke-WebRequest` (PowerShell 5.1) or webfetch, saved to `captures/`, SHA256 via `Get-FileHash`.

## J9 Search log (queries actually run)

| # | Engine | Query | Result count | Ran |
|---|--------|-------|--------------|-----|
| 1 | exa-websearch | Umgungundlovu TVET College past exam papers memoranda | 8 | yes |
| 2 | exa-websearch | education.gov.za NSC past exam papers and memoranda download | 8 | yes |
| 3 | exa-websearch | TVET NATED N1-N6 past question papers and memoranda download official | 8 | yes |
| 4 | exa-websearch | "Mechatronic Systems" "Manual Manufacturing" TVET exam paper past | 6 | yes |
| 5 | exa-websearch | "Life Skills and Computer Literacy" TVET level 2 exam paper | 0 | **no — provider rate limit; query never executed** |
| 6 | exa-websearch | DHET NOLS examination papers repository official TVET | 6 | yes |
| 7 | exa-websearch | Umgungundlovu TVET College official website campuses | 6 | yes |
| 8 | exa-websearch | NotebookLM requires Google account sign in help guide university library | 6 | yes |

## URL verification table (app link registry)

| # | URL | Status | Method / evidence |
|---|-----|--------|-------------------|
| V1 | `https://mytvet.co.za/mechatronic-systems` | **200** | fetch + capture `mytvet_mechatronic.html` (sha `C566B339…`); lists L2 QP+Memo 2015–2025 |
| V2 | `https://mytvet.co.za/electrotechnology` | **200** | fetch; L2 QP+Memo 2015–2026 |
| V3 | `https://mytvet.co.za/manual-manufacturing` | **200** | fetch; L2 QP+Memo 2015–2026 |
| V4 | `https://mytvet.co.za/introduction-to-computers` | **200** | fetch; L2 QP+Memo 2015–2026 |
| V5 | `https://mytvet.co.za/life-skills-and-computer-literacy` | **200** | fetch; L2 **P1 and P2** QP+Memo (matches timetable papers) |
| V6 | `https://mytvet.co.za/english-first-additional-language` | **200** | fetch; NCV L2 P1/P2 QP+Memo 2015–2026 |
| V7 | `https://mytvet.co.za/mathematics-l2` | **200** | fetch (title `Mathematics L2 | Past Papers | Mytvet`); NCV L2 |
| V8 | `https://mytvet.co.za/mathematics` | **200** | fetch; **NATED N1–N6** (different stream — labelled in app) |
| V9 | `https://www.edupstairs.org/tvet-colleges/past-exam-papers/` | **200** | capture `edupstairs_nols_index.html` (`8E37182B…`); 192 sittings indexed from DHET/NOLS; NC(V) L2 filter |
| V10 | `https://tvetpapers.co.za/` | **200** | fetch; NATED+NCV papers portal |
| V11 | `https://www.education.gov.za/Curriculum/NationalSeniorCertificate(NSC)Examinations/NSCPastExaminationpapers.aspx` | **200** | capture `dbe_nsc_papers.html` (`884A526C…`); year index 2008–2026 |
| V12 | `http://www.thutong.doe.gov.za/Default.aspx?alias=www.thutong.doe.gov.za%2Fmechatronics` | **200** | capture `thutong_mechatronics.html` (`949226BF…`); official NC(V) Mechatronics subject/assessment guidelines |
| V13 | `https://www.dhet.gov.za/SitePages/NOLS.aspx` | **200** | capture `dhet_nols.html` (`2BF26764…`) |
| V14 | `https://sharepoint.dhet.gov.za/dhetnols/` | **200** | capture `dhet_sharepoint_nols.html` (`EA066B8F…`) |
| V15 | `https://www.edupstairs.org/school-past-exam-papers/` | **200** | capture `edupstairs_school_papers.html` (`21FA0D06…`) |
| V16 | `https://witness.co.za/tvet-college/` | **200** | capture `witness_tvet.html` (`3A5E1462…`); independent report: "Msinga Campus: Megatronics: Level 2" |

### Failed / unreachable (measured, not assumed)

| URL | Measurement | App treatment |
|---|---|---|
| `https://nols.gov.za/` (root + filtered page) | **transport error, 2 attempts** on 2026-09-30 | Shown as "official repository — unreachable from build network"; reachable indirectly via V9 links that point into `nols.gov.za/.../QPs/*.pdf` |
| `https://www.utvet.co.za/` | **TLS trust failure** (PowerShell) **and** transport error (webfetch) | Shown with amber "site unreachable from build network" badge |
| `https://wcedeportal.westerncape.gov.za/nsc-past-exam-papers-and-memos` | **403 Forbidden** (2 UA variants) | Excluded from registry |
| `https://notebook.google.com/notebook/…` | redirect → `accounts.google.com` sign-in (auth wall) | See dossier 02 |

## Subject → source mapping (app data contract)

Curriculum FACT (claim C2, CORROBORATED): exam list = **NC(V) Level 2 Mechatronics** (+ NC(V) business-studies satellites: Life Skills & Computer Literacy, English FAL).

| Exam subject (timetable) | Primary link | Verified |
|---|---|---|
| Life Skills and Computer Literacy (P1, P2) | V5 | 200 |
| Mathematics (L2) | V7 (NCV); V8 labelled NATED extra | 200/200 |
| English First Additional Language (P1, P2) | V6 | 200 |
| Electrotechnology | V2 | 200 |
| Introduction to Computer | V4 | 200 |
| Manual Manufacturing | V3 | 200 |
| Mechatronic Systems | V1 | 200 |

## Adversarial review (Self-Refine: Auditor pass)

- **Attacked claim:** "mytvet links give the papers." *What must be true for it to be wrong:* mytvet could be a content farm hosting fake papers. Evidence: subject/year coverage matches official NCV sessions (Feb sittings), filenames carry official subject codes, and the same holdings are independently indexed via DHET/NOLS (V9, V13, V14). Verdict: mytvet = **third-party host of real papers**; DHET/NOLS entries remain the official anchor — app labels each source with its class (official vs third-party).
- **Attacked claim:** "these are the student's subjects." *Falsifier:* if the timetable subjects were NATED. Rebuttal: Thutong NC(V) Mechatronics L2 table (V12) matches 4 of the engineering subjects exactly; Life Skills & Computer Literacy and English FAL are NC(V) subjects per mytvet's stream tags; The Witness independently reports Mechatronics L2 at this college. Residual: "Life Skills and Computer Literacy" Paper structure (P1/P2) confirmed only via mytvet.
- **Syndication check:** edupstairs indexes NOLS (disclosed on-page); mytvet and tvetpapers are separate operators — counted as independent hosts, never double-counted.
- **Angel terminology check:** no prohibited terms introduced in app code.

## Null results (measurements, not negations)

- Query 5 (J9 log) was **never run** — provider rate limit. No inference drawn from it.
- No official central `education.gov.za` portal for **NC(V) TVET** papers was found **in the 8 queries run**; the official channel measured is DHET/NOLS (V13/V14). Stated as "not found in the searches run", not "does not exist".

## Unknowns

1. Whether `nols.gov.za` is globally down or blocked only from this network — **not determined** (2 transport failures only).
2. Whether `utvet.co.za` serves valid TLS to normal browsers — **not determined** (TLS failure from this network only).
3. Availability of memoranda for every NCV subject/year — varies per sitting (measured: edupstairs reports 45 of 192 sittings carry QP+memo).
