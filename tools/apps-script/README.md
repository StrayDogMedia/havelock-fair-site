# Apps Script — Master Workbook

The scripts that run inside the **Havelock Fair 2026 Master Workbook**
(`1TBxMBM4RSyqDDTxuTiAyxWhOiRvyNfxMzK4LgXqFID0`), kept here so they are versioned.

They are **not** part of the website build. Nothing here is served; GitHub Pages ignores it.

| File | What |
|---|---|
| `HF_JudgingSystem.gs` | The judging chain: REGISTRATIONS → ENTRIES → JUDGING SHEETS → RESULTS → PRIZE CALCULATIONS → CHEQUE REGISTER, plus `HF_verify` |
| `HF_Dropdowns.gs` | Data validation on every field that comes from a known list |
| `HF_Protect.gs` | Locks the generated tabs while leaving the menu scripts able to rebuild them |
| `INSTALL_*.md` | Runbooks for each, written for whoever is pasting them in |
| `judging-tests/` | Node harness that runs `HF_JudgingSystem.gs` against a mock SpreadsheetApp |

## Running the tests

```sh
node tools/apps-script/judging-tests/gas-test.js
```

35 checks, no dependencies. It loads `HF_JudgingSystem.gs` from this directory, so it tests
the file that is actually committed here.

## ⚠️ These are copies, and copies drift

The live source of truth is the **Apps Script editor**, and Claude has no write access to it —
every change is pasted in by hand. So:

- **After editing a script in the Apps Script editor, copy it back here and commit.**
- **Before pasting a script into the editor, check this copy is current.**

There is no automation closing that loop. `clasp` is installed on the Mac (v3.4.0) and would
close it, but it needs an interactive Google sign-in that has never been done.

## ⚠️ Never paste `Code.gs`

The registration backend (`Code.gs`) lives in a **separate** Apps Script project on
`admin@havelockfair.ca` and is deliberately **not** kept here. There is a stale pre-migration
copy of it in the Cowork folder that would break the live registration form if pasted into the
editor. If you need to touch the registration backend, work in that project directly.

## Fair-day order

`HF_buildEntries` → `HF_makeJudgingSheets` → *(judging happens, placings typed into RESULTS)* →
`HF_calculatePrizes` → `HF_verify` → write cheques.

`HF_buildEntries` refuses to renumber once placings exist. Rebuild **before** judging starts.
