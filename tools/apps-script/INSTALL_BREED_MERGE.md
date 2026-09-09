# Install — two breed divisions

**~5 minutes.** Jesse's ruling 2026-09-09: dairy breeds collapse from five divisions to two.

```
A. Holstein
B. Coloured Breeds (Ayrshire, Jersey, Canadienne, Guernsey & Brown Swiss)
```

Applies to **Class 3 Dairy Cattle** and **4-H**. The website form is already updated and live.

## Install

1. Apps Script project bound to the Master Workbook → **+ → Script**, name it `HF_BreedMerge`.
2. Paste all of `HF_BreedMerge.gs`. Save.
3. Run **`HF_mergeBreedsPreview`** first — it reports exactly what would change and **writes
   nothing**. Read it.
4. Run **`HF_mergeBreeds`** to apply.
5. 🔴 Re-run **`1. Build entries from registrations`**, then **`2b. Build JUDGING ENTRY`**.

## What it does

**REGISTRATIONS — 8 cells relabelled.** Seven real 4-H registrants already have a breed
recorded. Their old labels are rewritten in place so the judging sheets group into two rather
than showing old and new side by side:

| Exhibitor | From | To |
|---|---|---|
| HF2026-1009/1010/1011/1012 | `B. Holstein` | `A. Holstein` |
| HF2026-1021, HF2026-1022 | `A. Ayrshire` | `B. Coloured Breeds …` |
| HF2026-1016 | `C. Jersey` | `B. Coloured Breeds …` |

⚠️ Note the letters move: Ayrshire used to be **A**, Holstein is **A** now. Matching is on the
breed *word*, not the letter prefix, so the old prefixes cannot mislead it.

**SECTIONS — Class 3 goes from 50 rows to 20** (2 divisions × 10 sections). All five old
divisions carried the identical tier and prize amounts (`DAIRY_HERITAGE` 120/100/80/60), so
**no prize money changes** — only the grouping.

## Acceptance checks

| # | Check | Expected |
|---|---|---|
| 1 | Preview output | `8 cell(s) would be relabelled`, Class 3 listed with its five divisions |
| 2 | Apply output | `REGISTRATIONS: 8 cell(s) relabelled` · `Class 3 rewritten from 50 rows to 20` |
| 3 | SECTIONS tab, Class 3 | Exactly **two** divisions, 10 sections each, prizes still 120/100/80/60 |
| 4 | After re-running 1 and 2b, the 4-H judging sections | Group under **two** breeds only — **6** Holstein, **3** Coloured Breeds |
| 5 | Run it a second time | `0 cell(s) relabelled`, still 20 rows — safe to re-run |
| 6 | `HF_verify` | `✅ ALL CHECKS PASSED` |

**If anything is not recognised** it is listed under `⚠ NOT RECOGNISED` and left alone —
never guessed. Tell me what appears there.

## Timing

🔴 `1. Build entries` refuses to run once any placing exists, including picks sitting in
JUDGING ENTRY. **Do this before judging starts.**
