---
name: workbook-chain
description: Work on the Havelock Fair Master Workbook's Apps Script — the judging/prize chain (HF_JudgingSystem.gs), dropdowns (HF_Dropdowns.gs) and tab protection (HF_Protect.gs). Use when touching ENTRIES, JUDGING SHEETS, RESULTS, PRIZE CALCULATIONS or CHEQUE REGISTER, when a registration seems missing from a judging sheet, before any cheque run, or when installing anything into the Apps Script editor.
---

# The Master Workbook chain

Workbook `1TBxMBM4RSyqDDTxuTiAyxWhOiRvyNfxMzK4LgXqFID0`. Scripts live in
`tools/apps-script/` in this repo. Harness:

```bash
node tools/apps-script/judging-tests/gas-test.js   # 70 checks, no deps
```

The chain: REGISTRATIONS → **ENTRIES** → **JUDGING SHEETS** → RESULTS →
**PRIZE CALCULATIONS** → **CHEQUE REGISTER**, with `HF_verify()` reconciling before cheques.
Everything downstream keys off the **entry number** (`E1001`), so a placing can never attach
to the wrong prize.

## You cannot deploy. Someone else pastes.

Claude has **read-only** Drive access and no `clasp` session. Every script change is pasted
into the Apps Script editor by Jesse or Cowork. So:

- Write the change, prove it with the harness, then write an `INSTALL_*.md` runbook with
  **falsifiable acceptance checks** — not "run it and see".
- The files in `tools/apps-script/` are **copies**. After anyone edits in the editor, they must
  be copied back and committed, or the repo becomes fiction.
- ⚠️ **Never paste `Code.gs`.** The registration backend is a *separate* project on
  `admin@havelockfair.ca`. The copy in the Cowork folder is stale and pre-migration; pasting it
  would break the live form.

## The failure mode this system has, twice

**A form field the judging script doesn't know about is invisible, not loud.** Both real bugs
had this shape, and both reported *"No problems"* while dropping entries:

1. The backend writes Form Type `"4-H"`; the script compared `'4H'`. Four registrants silently
   went to NEEDS ATTENTION.
2. The Equestrian form posts **two** section fields (`showSections` *and* `gymkhana`) into two
   columns; the script read only `Show Sections`. A gymkhana-only rider got one entry reading
   `"(no section recorded)"` and would have been on no judging sheet.

**So: whenever the registration form changes, diff the keys it posts against the columns the
judging script reads.** The lesson generalises — a fallback that substitutes a placeholder
(`'(no section recorded)'`) hides the very thing you need to see. Flag it instead; nothing may
vanish silently.

The load-bearing assertion in the harness is
**"every registration row produced at least one entry or a flag"**. Keep it.

## Writing into a column that has a dropdown

🔴 **Clear the validation before writing new vocabulary.** `HF_Dropdowns.gs` puts a **strict**
rule (`setAllowInvalid(false)`) on several columns. Writing a value that is not in the list
makes Sheets **reject the whole `setValues()`** — and Apps Script surfaces the rule's help text
as the *entire* error message, with no stack. On 2026-09-09 a merge failed with the single word
`Division.`, and because `clearContent()` had already run, 50 SECTIONS rows were wiped.

So: `range.clearDataValidations()` → write → **re-run `HF_installDropdowns`** to rebuild the
rule with the new vocabulary.

⚠️ **Never "fix" this with `setAllowInvalid(true)`.** The strict rule is the point.
⚠️ **An Apps Script error that is a bare help-text string with no stack is a rejected write.**

⚠️ **Never rebuild a block from the rows you are about to overwrite.** That merge read its
section descriptions from the very rows it cleared, so a re-run would have written blanks over
the real data. Guard with a health check that refuses on a damaged block (`hfbmClass3_`), and
keep a repair path that carries the original data verbatim (`HF_restoreClass3Sections`).

## Reading the sheet without being lied to

- **`Sections` cells contain literal `|` characters.** Any markdown/CSV export splits them, so
  every column after `Sections` *appears* shifted and rows look mis-mapped. The sheet is fine.
  **Read REGISTRATIONS in the sheet itself, not from an export** — this produced a wrong
  conclusion about a duplicate entry on 2026-09-06.
- The Drive connector **truncates SECTIONS** at ~248 of 659 rows. Use the local `.xlsx` for
  section-level analysis.
- `get_file_metadata`'s `contentSnippet` returns clean CSV for the first few tabs and is often
  more useful than the full `read_file_content`, which returns markdown tables and may be
  truncated.

## Fixtures: derive, never freeze

`judging-tests/mock-book.json` mirrors live registrations and **grows every time it is
refreshed**. Assertions are deliberately derived from the fixture — hardcoded totals turn each
refresh into a fake failure (this happened; five assertions broke on nothing).

**Synthetic fixture rows live in the `HF2026-9xxx` range.** They used to squat on 1007/1008,
which now belong to real exhibitors — a fixture row impersonating a real person is a trap.

## Order of operations, and the one hard rule

`HF_buildEntries` → `HF_makeJudgingSheets` → *(judging; placings typed into RESULTS)* →
`HF_calculatePrizes` → `HF_verify` → cheques.

🔴 **`HF_buildEntries` renumbers, and refuses to run once placings exist.** That guard is
deliberate. Rebuild **before** judging starts — including after any late registration or any
deleted entry row.

## Money rules

- **$15 membership** off anyone **13+** who wins. Resolution order: the under-13 checkbox →
  Youth class (26 = 12 & under, 27 = 13–17) → Youth DOB vs fair day → else 13+.
- **4-H and Equestrian are position-only**: they get entry numbers and appear on judging
  sheets, priced `$0`, and never reach the cheque register.
- Donations come off only when `DONATED?` says Yes in RESULTS.

## Protection

`HF_Protect.gs` locks the generated tabs. **A protection never blocks its own editor**, and
menu scripts run as whoever ran them — so the owner keeps rebuilding while others are frozen out.

⚠️ **REGISTRATIONS is warning-only on purpose.** The website's backend is a separate Apps
Script project on `admin@havelockfair.ca` opening this workbook by ID; a hard lock it isn't an
editor of would make live registrations **fail silently**. Don't upgrade it without adding
that account and putting a real test registration through.

RESULTS stays open — it is the fair-day typing tab.

## Dropdowns

`HF_Dropdowns.gs` reads its lists **from the workbook** (CLASSES tab + VALIDATION LISTS), never
hardcoded — which is why VALIDATION LISTS warns against renaming columns. 🔴 **Multi-select is NOT available on this account** — confirmed by install 2026-09-06; every
field returned `(single)` because `setMultiSelect` throws. So `CLASS(ES) ASSIGNED` on JUDGES
**allows free text**: a judge covers several classes, and a strict list would make that
impossible to record. DIRECTORS has no such column.
