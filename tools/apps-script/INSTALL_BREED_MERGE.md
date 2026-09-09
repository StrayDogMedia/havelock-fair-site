# Install — two breed divisions

> **Status 2026-09-09: APPLIED AND VERIFIED on the live Master Workbook.** This document is
> now the record of what was done and how to repair it, not a to-do. The website form was
> already live and correct.

Jesse's ruling 2026-09-09: five dairy breed divisions collapse to two.

```
A. Holstein
B. Coloured Breeds (Ayrshire, Jersey, Canadienne, Guernsey & Brown Swiss)
```

Applies to **Class 3 Dairy Cattle** and **4-H**.

---

## 🔴 What went wrong the first time — read this before running anything similar

`HF_Dropdowns.gs` puts a **strict** data-validation rule on `SECTIONS · DIVISION`:

```js
hfddApply_('SECTIONS', 'DIVISION', division, false, 'Division.');
//  requireValueInList(...) + setAllowInvalid(false) + setHelpText('Division.')
```

`A. Holstein` was **not in that list**, so Sheets **rejected `setValues()`**. Apps Script
surfaced the rule's help text as the *entire* error message — the run failed with the single
word **`Division.`**, no stack trace. And `clearContent()` had already run one line earlier,
so Class 3's 50 SECTIONS rows were **wiped and never rewritten**.

It could not repair itself either: the builder reads its ten section descriptions **from the
rows it is about to overwrite**, so a re-run would have written ten *blank* sections over the
real ones.

**The general lesson, worth keeping:** a script that writes a new vocabulary into a column
carrying a strict dropdown must **clear the validation first**. And an Apps Script error that
is just a help-text string with no stack is very likely a rejected `setValues()`.

⚠️ **Do not "fix" this by setting `setAllowInvalid(true)`.** The strict rule is wanted — it is
what stops a judge picking a value from the wrong list. Scripts clear validations before
writing; the rule stays strict.

---

## Run order

| Step | Function | Notes |
|---|---|---|
| 1 | `HF_mergeBreedsPreview` | Reports everything, **writes nothing**. Read it first. |
| 2 | `HF_mergeBreeds` | Relabels REGISTRATIONS + rewrites Class 3. Idempotent. |
| 3 | **`HF_installDropdowns`** | 🔴 **Required.** Step 2 clears the DIVISION validation; this rebuilds it with the new two-breed vocabulary. |
| 4 | `1. Build entries from registrations` | |
| 5 | `2b. Build JUDGING ENTRY` | |
| 6 | `4. Verify` | `✅ ALL CHECKS PASSED` |

## What it did on the live workbook

**REGISTRATIONS — 14 cells relabelled** (11 → Holstein, 3 → Coloured Breeds). More 4-H
registrants arrived between 09-06 and 09-09, which is why this is not the 8 the first version
of this document predicted. Matching is on the breed **word**, never the letter prefix —
Ayrshire used to be `A`, Holstein is `A` now.

> The `HF2026-9001` row named in the earlier draft is **fixture-only**; there is no such row in
> live REGISTRATIONS.

**SECTIONS — Class 3 went from 50 rows to 20** (2 divisions × 10 sections). All five old
divisions carried the identical tier and amounts (`DAIRY_HERITAGE`, 120/100/80/60), so **no
prize money changed** — only the grouping.

## `HF_restoreClass3Sections()` — the repair path

Reach for this **only** if a run of `HF_mergeBreeds` cleared Class 3 without rewriting it —
i.e. the block is blank or partially blank. It carries the original 50 rows verbatim from
`Havelock_Fair_2026_Master_Workbook_TEMPLATE.xlsx` (verified byte-for-byte against the
template) and puts them back, after which you can merge again.

It is deliberately hard to misuse:

- **Refuses when the block is already healthy** — reports "looks intact" and writes nothing.
- **Refuses to write above the header row.**
- **Refuses unless every row it would overwrite is blank or Class 3**, naming the offenders.

## Acceptance checks

| # | Check | Expected |
|---|---|---|
| 1 | Preview | lists the cells it would relabel and Class 3's current divisions |
| 2 | Apply | `Class 3 rewritten from 50 rows to 20` |
| 3 | SECTIONS, Class 3 | exactly **two** divisions, 10 sections each, prizes still 120/100/80/60 |
| 4 | After steps 3–5, the 4-H judging sections | group under **two** breeds only |
| 5 | Run `HF_mergeBreeds` twice | `0 cell(s) relabelled` the second time |
| 6 | `4. Verify` | `✅ ALL CHECKS PASSED` |

**Check 4 is the proof.** If Ayrshire or Jersey still appear as separate judging sections, the
relabelling did not reach the sheets.

## Timing

🔴 `1. Build entries` refuses to run once any placing exists, including picks sitting in the
WINNER column of JUDGING ENTRY. Do this **before** judging starts.
