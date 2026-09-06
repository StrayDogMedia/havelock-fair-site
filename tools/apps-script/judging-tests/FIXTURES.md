# judging-tests fixtures

`mock-book.json` carries the REAL SECTIONS table (all 659 rows) and a snapshot of
the REAL REGISTRATIONS rows. It was refreshed **2026-09-06 (second pass)** against the live workbook after the fix went
in: the ZZTEST rows (HF2026-1004/1005/1006) were removed, the four 4-H rows
(HF2026-1009…1012) added, and Lise Brown's real duplicate reproduced. **21 registration rows,
matching live exactly.**

The fixture yields **35 entries** where live yields **33**. That gap is deliberate and is the
two synthetic coverage rows in the **HF2026-9xxx** range — a 4-H entrant and a show-only
equestrian rider that keep those code paths tested. They used to squat on HF2026-1007/1008,
which now belong to real exhibitors (Rommy Hernandez, Jane Logan); they were renumbered so a
fixture row can never be confused with a real one. **Keep synthetic rows in 9xxx.**

## Refreshing it

Registrations keep arriving. When you pull a newer snapshot, **do not** re-add
hardcoded totals to `gas-test.js` — the assertions are deliberately derived from
the fixture so a refresh cannot produce a fake failure. The load-bearing one is:

    every registration row produced at least one entry or a flag

That is the check that catches a silent drop. Nothing may vanish: a row either
becomes entries or lands in the ⚠ NEEDS ATTENTION block.

## Cases this fixture deliberately covers

| Row | Why it is here |
|---|---|
| HF2026-1018 | **Gymkhana-only rider.** Entered nothing in `Show Sections`; all three events are in `Gymkhana Sections`. Before 2026-09-06 the script read only the first column and gave her ONE entry reading "(no section recorded)" — she would have been on no judging sheet. |
| HF2026-1019 | **Abandoned submission** carrying nothing but "Not confirmed". Must be FLAGGED, never turned into a phantom entry. |
| HF2026-1020 | **One exhibitor, three entries across two classes** on separate sheet rows. Must consolidate to a single exhibitor ID. |
| HF2026-1013/1014 | Two youth siblings sharing a guardian phone/email. |
| HF2026-1015 | Four sections in one class (Class 25 Arts). |
| HF2026-1020 | **A real duplicate.** "37. Pie, any other variety" was submitted twice — once inside the shortbread row's pipe-separated list, once as its own row — so it correctly produces two entry numbers in one section. Exhibitor error, not a bug; the fixture keeps it so nobody "fixes" the dedupe behaviour later. |
| HF2026-9001/9002 | Synthetic. 4-H and a show-only (non-gymkhana) equestrian rider, to keep both branches covered. |
