# Install — JUDGING ENTRY (pick winners by section)

**~10 minutes.** Replaces typing `ENTRY #` + `PLACING` into RESULTS with a sheet organised
the way judging actually happens: one section at a time, a row per prize, and a dropdown
listing **only that section's entries**.

The old way still works — RESULTS stays typeable as a fallback. ⚠️ **Do not use both at
once**: the sync writes into RESULTS.

---

## What you are pasting

| File | Action |
|---|---|
| `HF_JudgingEntry.gs` | **NEW file** — + → Script, name it `HF_JudgingEntry`, paste, save |
| `HF_JudgingSystem.gs` | Replace with the repo copy (adds the tab name, extends the rebuild guard, adds 3 menu items) |
| `HF_Protect.gs` | Replace with the repo copy (locks the new tab, leaves WINNER + NOTES editable) |

> ⚠️ Only these three. **Never paste `Code.gs`** — that is the registration backend on
> `admin@havelockfair.ca`, and the copy in the Cowork folder is stale.

Then run **`HF_buildJudgingEntry`** from the function dropdown (or 🏆 → *2b*).

## The new menu

```
1.  Build entries from registrations
2.  Make judging sheets (to print)          ← unchanged, still the paper sheet
2b. Build JUDGING ENTRY (pick winners)      ← new
    ─────
2c. Check JUDGING ENTRY for problems        ← new, reports only, writes nothing
2d. Send picks to RESULTS                   ← new
    ─────
3.  Calculate prizes & cheques              ← unchanged
4.  Verify before writing cheques           ← unchanged
```

3 and 4 keep their numbers, so existing runbooks and muscle memory still hold.

---

## Acceptance checks — each one falsifiable

| # | Do this | Pass condition |
|---|---|---|
| 1 | Read the return of `HF_buildJudgingEntry` | `JUDGING ENTRY built: 28 section(s), 112 prize row(s).` The section count **must match** the one `HF_makeJudgingSheets` reports |
| 2 | Look at rows 3–7 | Row 3 a section heading; rows 4–7 read `1st / 2nd / 3rd / 4th` with dollar values |
| 3 | Click the WINNER cell on a `1st` row in **Class 14 Sec 1** | Dropdown lists **only** `E1001 — Claudia Deschamps` |
| 4 | Click a WINNER cell in a **different** section | A **different** list |
| 5 | Find **Class 17 · Sec 37: Pie any other variety** | Two options, `E1021 — Lise Brown` **and** `E1035 — Lise Brown` — distinguishable |
| 6 | Find any **4-H** section | Heading reads `4-H · B. Holstein · Sec 1: …` — **never** `Class  — 4-H`; the row says `POSITION ONLY / no prize money` |
| 7 | Type `banana` into a WINNER cell | Rejected |
| 8 | Leave a WINNER cell empty | Accepted — blank means not awarded |
| 9 | Pick a winner, then run **2b** again | The pick is **still there** |
| 10 | With a pick present and RESULTS empty, run **1** | **Refuses**, naming *JUDGING ENTRY holds N un-synced pick(s)* |
| 11 | Put the same entry in 1st **and** 2nd of one section, run **2d** | **Refuses. RESULTS unchanged.** |
| 12 | Fix it, run **2d** | RESULTS gains rows with the right `ENTRY #` and `PLACING` |
| 13 | Run **3** then **4** | `✅ ALL CHECKS PASSED`, same cheque total as typing the same awards by hand |

**If any check fails, stop and say which.** Check 10 is the important one — it is the guard
that stops a rebuild wiping a morning of judging.

---

## Things worth knowing

**🔴 Only the owner rebuilds.** The tab is protected with holes for WINNER and NOTES, so the
office can pick winners but cannot damage the structure. A protection never blocks its own
editor, so the owner's menu runs work normally.

**Un-synced picks now block a rebuild.** Before this change, `HF_buildEntries` only counted
placings in RESULTS. Picks could sit in JUDGING ENTRY, unsynced, and a rebuild would renumber
straight through them — destroying a morning's work. The guard now counts both.

**The sync MERGES, it does not replace.** `DONATED?`, `DONATION AMOUNT`, `JUDGE` and `NOTES`
are typed by hand and feed the money chain, so a full rewrite would silently discard donations.
Instead, a pick updates the existing RESULTS row for that entry, or appends a new one.

**It names what it did not touch.** Any RESULTS row with a placing that JUDGING ENTRY does not
cover is listed in the sync report. Those are either hand-typed placings or retracted ones —
and **they will still be paid**. `HF_verify` cannot catch them, because a stale row is
internally consistent. Read that list.

**A late registration after the build** will not appear in any dropdown. Fix: sync what you
have, clear RESULTS **and** the WINNER column, run **1**, then **2b**, then re-pick. Awkward —
so build entries as late as possible before judging starts.

---

## Try it before you install it

```sh
node tools/apps-script/judging-tests/simulate.js
```

then `judge maple`, or `judge` for the full section list. Same code, same data, nothing
touched. `node tools/apps-script/judging-tests/gas-test.js` runs 61 checks.

## When you are done

Copy the three files back into `tools/apps-script/` and commit. The repo copies and the Apps
Script editor have no automation between them.
