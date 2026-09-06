# Install — dropdowns everywhere

**File:** `HF_Dropdowns.gs` · **Time:** ~2 minutes · **Risk:** very low — it only sets
validation rules, it never writes, clears or moves a cell's contents.

## Install

1. In the Apps Script project bound to the Master Workbook, **+ → Script**, name it
   `HF_Dropdowns`.
2. Paste the whole of `HF_Dropdowns.gs`. Save.
3. Function dropdown → **`HF_installDropdowns`** → Run. Approve the authorisation prompt.

It reports each field it touched, e.g.
`JUDGES · CLASS(ES) ASSIGNED — 27 options (multi)`.

Safe to re-run whenever you like. To undo: run **`HF_removeDropdowns`** — that strips the
dropdowns and leaves every value in place.

## What you get

**`CLASS(ES) ASSIGNED` on JUDGES is multi-select** — a judge covers several classes, so you
tick as many as apply in the one cell rather than typing them out. Same on DIRECTORS for
portfolios. Options read `Class 14 — Maple & Honey`, straight from the CLASSES tab.

| Tab | Field | List |
|---|---|---|
| JUDGES | CLASS(ES) ASSIGNED | all 27 classes · **multi-pick** |
| JUDGES | CONFIRMATION STATUS | Confirmed / Tentative / Declined |
| RESULTS | PLACING | 1st–4th, Champion, Reserve, Disqualified, No Entry, WD |
| RESULTS | DONATED? | Yes / No |
| REGISTRATIONS | Province · Under 13? | provinces · Yes/No |
| EXHIBITORS | PROVINCE · STATUS · MEMBER TYPE · PAYMENT METHOD | from VALIDATION LISTS |
| CHEQUE REGISTER | CHEQUE ISSUED? | Yes / No |
| SECTIONS | DIVISION | Senior / Junior / Open / Ladies / Gents / Team / Champion |
| CLASSES | TYPE | Animal / Indoor |
| DIRECTORS | CLASS(ES) ASSIGNED | all 27 classes · **multi-pick** |

## How it stays correct

Nothing is retyped into the script. The class list is read from the **CLASSES** tab and
everything else from **VALIDATION LISTS**. Change a list there, re-run, and the dropdowns
follow. That is why `VALIDATION LISTS` says *"do not delete or rename columns"* — those
column headers are what the script looks the lists up by.

Applied 500 rows deep on each field, so it covers a full fair without re-running.

## If a field reports SKIPPED

That means the tab or the column header wasn't found — most likely the header was renamed.
It is not an error and nothing else is affected; the other fields still install. Tell me
which field and I'll match it to the new name.

`MEMBER TYPE` and `PAYMENT METHOD` on EXHIBITORS are the two most likely to skip — I could
confirm every other header against the live workbook but not those two.

## Note on multi-select

Multi-select validation needs the current Apps Script runtime. If the account is on an older
one the two class fields **fall back to single-pick automatically** and the run still
completes — the report will say `(single)` instead of `(multi)`. Tell me if you see that and
I'll switch those fields to a different approach.
