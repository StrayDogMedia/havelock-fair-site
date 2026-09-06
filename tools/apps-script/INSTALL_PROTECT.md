# Install — lock the tabs nobody should type into

**File:** `HF_Protect.gs` · **Time:** ~2 minutes · **Risk:** low, and fully reversible.
It never reads or writes a single cell value — it only sets permissions.

## The short answer to "can they populate automatically while users are frozen out?"

**Yes.** A Google Sheets protection does not apply to the sheet's **owner**, and Apps Script
run from the 🏆 menu executes as the person who ran it. So the menu scripts keep rebuilding
ENTRIES, JUDGING SHEETS, PRIZE CALCULATIONS and CHEQUE REGISTER exactly as they do now, while
everyone else gets *"You are trying to edit a protected cell."*

## Install

1. Apps Script project bound to the Master Workbook → **+ → Script**, name it `HF_Protect`.
2. Paste all of `HF_Protect.gs`. Save.
3. Function dropdown → **`HF_protectTabs`** → Run. Approve the prompt.

Safe to re-run — it clears its own protections first, so it never stacks duplicates.

- **`HF_unprotectTabs`** removes everything it added (and *only* what it added — a protection
  set up by hand is left alone).
- **`HF_protectionReport`** lists what is currently protected.

## What gets locked, and what deliberately doesn't

| Tab | Treatment | Why |
|---|---|---|
| ENTRIES | 🔒 locked | Rebuilt wholesale. A hand edit is overwritten next rebuild. |
| JUDGING SHEETS | 🔒 locked | Same. Edit the source, then rebuild. |
| PRIZE CALCULATIONS | 🔒 locked | Same. Change RESULTS and recalculate. |
| SECTIONS | 🔒 locked | 659 sections and every prize amount — this tab *is* what the fair pays out. |
| CLASSES | 🔒 locked | Read by the entry builder and the judges dropdown. |
| VALIDATION LISTS | 🔒 locked | Renaming a column here silently breaks the dropdowns. |
| CHEQUE REGISTER | 🔒 locked, **with holes** | Generated — but the treasurer still fills `CHEQUE ISSUED?`, `DATE ISSUED`, `MEMO`, `NOTES`. Those four columns stay editable. |
| REGISTRATIONS | ⚠️ **warning only** | See the warning below — this one must not be hard-locked. |
| SETTINGS | ⚠️ warning only | Changed about once a year; a prompt is enough. |
| **RESULTS** | ✅ **open** | This is the fair-day typing tab. Locking it would stop the work. |
| JUDGES · DIRECTORS · EXHIBITORS · PRIZE TABLES | ✅ open | The office maintains these by hand. |

## ⚠️ Why REGISTRATIONS is a warning and not a lock

The website's registration backend is a **separate Apps Script project on
`admin@havelockfair.ca`** that opens this workbook by ID. A protection is bypassed only by
its own editors — so a hard lock added from `straydogmedia.ca@gmail.com` could make every
new registration from the website **fail silently**, six days before the fair.

A warning-only protection prompts *"are you sure?"* on a manual edit and never blocks a
programmatic write. It gets the guard-rail with none of the risk.

> If you want REGISTRATIONS hard-locked later, it can be done — but `admin@havelockfair.ca`
> has to be added as an editor of that protection first, and a live test registration must be
> put through afterwards to prove the form still writes.

## After installing

Try typing into ENTRIES as yourself — you're the owner, so you'll still get in. To see what a
volunteer sees, use **File → Share** to open it as someone else, or just trust the report.

Then run the 🏆 menu once end to end (`1. Build entries` → `2. Make judging sheets`) to confirm
the scripts still write. They will — but it takes ten seconds to be sure.
