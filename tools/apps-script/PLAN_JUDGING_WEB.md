# Plan — the judging web app (`/judging`)

**Agreed 2026-09-09. Next session starts here.** Strategy **A**: a separate deployment for
results, so the registration backend is never touched.

---

## Why

`JUDGING ENTRY` is 28 sections and 112 prize rows on one workbook tab. A judge covering Class
14 scrolls past 4-H and equestrian to reach it, and a spreadsheet of hundreds of lines is
intimidating to a volunteer. Jesse also wants workbook access kept to a minimum — which matters
doubly while the workbook is still link-shared with exhibitor PII on it.

So: judges (or the office on their behalf) record results on a **web page** that shows only the
class in front of them, and never opens the workbook.

**Presentation is a requirement, not a finish.** This is the piece a dozen volunteers actually
touch. It should feel calm and obvious on a phone in a barn.

---

## Shape — three pieces

| Piece | Where | What |
|---|---|---|
| `pages/judging.html` | site | ONE page. Class picker → that class's sections, prize rows, dropdowns, Submit. |
| `js/judging-data.js` | site | The entries, generated from ENTRIES. Same convention as `map-data.js` / `schedule-data.js`. |
| `HF_JudgingWeb.gs` | **Havelock Forms** Apps Script | **New** web app. `doPost` writes placings into RESULTS. |

One page, not one per class. `?class=14` opens straight to a class, so sharing is still
"send them their link" — without twenty-eight files to build and rebuild.

### 🔴 Why a SEPARATE deployment (strategy A)

The live endpoint is the **registration** backend on `admin@havelockfair.ca`. Its `doPost`
branches on `formType` and its **else-fallback writes a generic row and returns success** — so
an unrecognised `formType: 'results'` would land as junk in REGISTRATIONS *and report success*.
That is the exact silent-failure shape this project has been bitten by twice.

So the results web app is its **own deployment**, in the **Havelock Forms** project (already
bound to the workbook, already holds the judging scripts). Registration is never edited.
Judging can break without registration noticing, and the reverse.

---

## How the data moves

**Down — baked in, not fetched.** `js/judging-data.js` ships with the page. No `doGet`, no
CORS surface, no "what if the fetch fails in a barn". Generate it from the same run that
rebuilds ENTRIES on fair morning. If a registration arrives after that, it is not in the
dropdown — acceptable, because entries close before judging and the rebuild is happening anyway.

**Up — POST to the new deployment.** Reuse the pattern the registration form has used since
July, including the trap it documents:

```js
fetch(ENDPOINT, { method:'POST',
  headers:{ 'Content-Type':'text/plain;charset=utf-8' },   // NOT application/json
  body: JSON.stringify({ ... }) });
```

⚠️ `application/json` triggers a CORS preflight that Apps Script answers **405**. And a
`curl -L` POST reports 405 as a **false alarm** — the write already happened. Both documented
in `SESSION_HANDOFF.md`; do not re-derive them.

---

## Behaviour

- **Picks persist in `localStorage`**, per device, per browser. Switch class, close the tab,
  lock the phone — the picks survive. This is a scratchpad, **not a backup**: private browsing
  or cleared site data loses it. That is exactly why Submit exists.
- **Submit is a checkpoint, not a lock.** Re-submitting a corrected placing must work without
  the office intervening — same merge behaviour `HF_syncJudgingToResults` already uses
  (update the row for that ENTRY #, append if new).
- **Offline-first.** Loads once, works with no signal. If the POST fails the page keeps the
  results, shows **"not sent yet"**, and retries.
- 🔴 **"Not sent yet" must be visible on the PICKER**, not only inside a class. Judges drift
  between classes across the day; nobody should walk away from a class that never reached the
  workbook.
- **Blank = not awarded**, as everywhere else.
- **4-H and Equestrian show `POSITION ONLY`**, no dollar figure.

---

## Presentation

Match the site's Heritage Noir system (`css/heritage.css`, `--hf-*` tokens). Not a spreadsheet
on a screen:

- One section at a time or a calm vertical list — never 112 rows.
- The **act of judging is picking a winner**: the dropdown is the loudest thing on the row,
  prize money quiet beside it.
- Big touch targets. This is used standing up, one-handed, in daylight.
- The class name and section description carry the page; entry numbers are support, not headline
  — but the entry number is what identifies a duplicate exhibitor (see below), so it cannot be
  hidden.
- Submit state must be unmistakable: **not sent / sending / sent**, with the time it landed.

---

## Traps carried from the existing system

- **Dropdown labels are `E1021 — Lise Brown`, entry number FIRST.** Class 17 Sec 37 holds two
  entries for the *same exhibitor*. A name-only label is two identical options the reader
  cannot tell apart. Entry-first also survives truncation.
- **Position-only sections have an EMPTY `CLASS #`** — 13 of 28. Emit the `Class N — ` prefix
  only when there is one, or they render `"Class  — 4-H"`.
- **The same entry must not take two placings in one section.** Warn in the page; the workbook
  side refuses on sync.
- **`HF_buildEntries` refuses to run once placings exist.** Generate `judging-data.js` and do
  any rebuilding BEFORE judging starts.
- **Never scatter picks across per-judge copies.** One winner column that the sync reads is
  what makes the money chain provable.

---

## Verification

- Reuse `tools/verify-*.js` conventions: real Chrome, `puppeteer-core` + `page.setViewport()`
  (⚠️ `--window-size` does NOT set the viewport — it renders wide and crops, producing
  convincing fake "falls off screen" shots).
- **Take screenshots.** Three separate bugs on this repo passed every DOM assertion and were
  caught only by looking — invisible dark-on-dark text, two cascade-order failures, and the
  gold time striking through the act name.
- Prove the money path end to end: picks made in the page → POST → RESULTS → `3` → `4` produce
  the **same figures** as the same awards entered by hand. That equivalence is the test that
  matters.
- `node tools/apps-script/judging-tests/gas-test.js` must stay green (70 checks).

---

## Scope for a first pass

Build against the **classes that actually have entries** — 28 sections across 7 groupings
(Class 14, 17, 18, 24, 25, 26, plus Equestrian and 4-H), not all 27 classes of the prize book.

Suggested order:
1. `HF_JudgingWeb.gs` + its deployment, proven with a hand-made POST.
2. `js/judging-data.js` generator (an Apps Script menu item, or a Node script off the fixture).
3. The page — one class first, for Jesse to look at before the rest.

**Rules text per class is OUT of scope for now** (Jesse, 2026-09-09). `pages/rules.html` carries
the 17 general regulations if a link is wanted.

---

## Open

- **Access is by unlisted URL** — obscurity, not security. Fine for placings; worth being
  deliberate. It does *improve* the PII position: judges get a page, not a workbook link.
- Does the office also use this to key in paper sheets? Jesse's steer: yes, it beats sifting
  the workbook.
- Bilingual? The rest of the site is EN/FR/ES. Judging sheets are currently EN/FR only, and the
  474 class/section names are verbatim from the printed prize book — **do not translate them**.
