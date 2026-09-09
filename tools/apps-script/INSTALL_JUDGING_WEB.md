# Install — the judging web app (`/pages/judging.html`)

**Built 2026-09-09. About 10 minutes in the browser, then one push.** Judges (or the office
keying in paper sheets) record placings on a web page that shows one class at a time and never
opens the workbook. Submit writes to RESULTS through a **separate** Apps Script deployment.

Three pieces:

| Piece | Where | Status |
|---|---|---|
| `HF_JudgingWeb.gs` | **Havelock Forms** Apps Script project (bound to the Master Workbook) | paste + deploy — **step 1–2** |
| `js/judging-data.js` | site repo | regenerate from the workbook on fair morning — **step 4** |
| `pages/judging.html` (+ `css/judging.css`, `pages/judging-sw.js`) | site repo | already committed; needs the URL — **step 3** |

🔴 **Do NOT touch the "Havelock Fair Registration" project or `Code.gs`.** The registration
backend's `doPost` writes a generic row *and returns success* for anything it doesn't recognise.
This app is its own deployment so that can never happen to a judging payload.

---

## 1. Paste the script (2 min)

1. Open the Master Workbook → **Extensions → Apps Script**. This is the *Havelock Forms* project —
   `HF_JudgingSystem.gs`, `HF_JudgingEntry.gs`, `HF_Dropdowns.gs`… are already listed on the left.
2. **`+` → Script**, name it `HF_JudgingWeb`, paste the whole of `tools/apps-script/HF_JudgingWeb.gs`. Save.
3. `HF_JudgingSystem.gs` also changed (one menu line). Replace its `onOpen` with the repo's, or just
   add before `.addToUi()`:
   ```js
   .addSeparator()
   .addItem('5. Export judging data (for the website)', 'HF_exportJudgingData')
   ```
4. Reload the workbook. **Acceptance:** the 🏆 Havelock Fair menu shows item **5. Export judging data**.

## 2. Deploy it as a web app (3 min)

1. **Deploy → New deployment → ⚙ type: Web app.**
2. Description `Judging results`. **Execute as: Me.** **Who has access: Anyone.**
   (Anyone = the judges' phones are not signed in. The page is unlisted; the script refuses
   anything that is not a judging payload and only ever touches RESULTS + JUDGING LOG.)
3. Authorise when asked. Copy the **Web app URL** (`https://script.google.com/macros/s/…/exec`).
4. **Acceptance:** open that URL in a browser tab. It must show
   `{"ok":true,"app":"HF_JudgingWeb","version":1,…}`. If it shows the registration confirmation
   JSON or anything else, you deployed the wrong project — stop.

⚠️ **Every later edit to `HF_JudgingWeb.gs` needs Deploy → Manage deployments → ✎ → New version.**
A saved script is not a deployed script; the URL keeps serving the old code until you do this.

## 3. Put the URL in the page (1 min + push) — ✅ DONE 2026-09-09

Deployment URL (answers the health check, pasted into the page and pushed the same evening):
`https://script.google.com/macros/s/AKfycbxzDl5BItys09XGvtgTOUhjOXyt3KTvR_0wgW5bc2n_FU3nA7oNi-6zYUyACA3R5wws/exec`

If the deployment is ever re-created (a NEW deployment, not a new version), repeat this step with the new URL.

In `pages/judging.html`, near the top of the script:
```js
var ENDPOINT = window.HF_JUDGING_ENDPOINT_OVERRIDE || 'PASTE_THE_JUDGING_WEB_APP_URL_HERE';
```
Replace the placeholder with the Web app URL. Commit, push.
**Acceptance:** https://havelockfair.ca/pages/judging.html no longer shows the red
**"Sending not set up"** pill at the top right. (Until then the page works as a local scratchpad
and says so — nothing is silently lost, but nothing is sent either.)

## 4. Fair morning — regenerate the entries (3 min, AFTER the last rebuild)

Order of operations, all in the 🏆 menu, after registrations close:

1. `1. Build entries from registrations` (must not be refused — clear leftover placings first)
2. `2b. Build JUDGING ENTRY`
3. **`5. Export judging data`** → dialog → **Copy to clipboard**
4. Paste over **all of `js/judging-data.js`**, commit, push. GitHub Pages takes ~1 minute.

**Acceptance:** `node tools/apps-script/judging-tests/gas-test.js` — not needed here, but on the
site: open https://havelockfair.ca/pages/judging.html, the footer line reads *"Entries as of
<today's date/time>"*, and the class cards match the JUDGING ENTRY tab (same groupings, same
section counts). If a class is missing, ENTRIES was not rebuilt before the export.

⚠️ If a registration arrives after the export, it is not in any dropdown until you repeat step 4.
⚠️ `1. Build entries` **renumbers** and refuses once placings exist — never re-run it after
judging has started; that would re-point every entry number.

## 5. Prove the money path once with a real POST (5 min, optional but recommended)

From a terminal, with the deployment URL:
```sh
URL='https://script.google.com/macros/s/…/exec'
curl -s -c /tmp/j -b /tmp/j -o /tmp/r1 -w '%{http_code} %{redirect_url}\n' -X POST \
  -H 'Content-Type: text/plain;charset=utf-8' \
  --data '{"kind":"judging-results","version":1,"device":"curl-test","judge":"TEST","sections":[{"key":"14||Standard||1","picks":{"1st":"E1001"}}]}' "$URL"
# expect: 302 https://script.googleusercontent.com/macros/echo?…  then fetch it:
curl -s -c /tmp/j -b /tmp/j "<that redirect_url>"
```
⚠️ **A `curl -L` POST reports 405 and it is a FALSE alarm** — the write already happened. Never
retry on 405 (that made duplicate rows once). Use the two-step above, or just look at RESULTS.

**Acceptance:** RESULTS has a row `E1001 · 1st · JUDGE=TEST`; **JUDGING LOG** (a new tab the
script creates) has one line `OK — 1 added…`. Then retract it the same way with `"picks":{}` →
the PLACING cell empties and JUDGING LOG gains a `1 cleared` line. Delete the test row before
the fair, or simply leave it blank — a blank-placing row prices to $0 and `4. Verify` still passes.

Replace `14||Standard||1` / `E1001` with a real key/entry from the current `js/judging-data.js`
(`key` and `entries[].id` in the file) — the workbook refuses an entry that is not in that section.

---

## How the office uses it on the day

- Send each judge (or ring steward) their link: `https://havelockfair.ca/pages/judging.html?class=14`
  — groupings are `14 17 18 24 25 26`, `4h`, `eq` (position only).
- Picks save on the phone as they go. **Send now** (or leaving the class) posts them. The top pill
  reads **"N not sent"** in amber until the workbook has acknowledged — on the picker too, so a
  judge who drifts between classes can see what never landed.
- A failed send keeps the picks and retries on its own (when signal returns, when the tab is
  reopened, every 45 s). A **Refused** section shows the script's reason — usually the entry list
  on the phone is older than ENTRIES; re-export (step 4) and reload.
- Corrections: change the dropdown and Send again. The workbook updates that entry's row; nothing
  is duplicated. Clearing a prize and sending **retracts** it (placing emptied, row kept).
- Then as before: `2c`/`2d` are NOT needed for web picks (they already sit in RESULTS) →
  `3. Calculate prizes` → `4. Verify` → cheques. **JUDGING LOG** is the audit trail: who sent what,
  when, and whether it was accepted.

⚠️ **Two paths into RESULTS now exist** — the JUDGING ENTRY tab (`2d`) and this page. Both merge
by ENTRY #, so the *last write wins* per entry. Pick one per class for the day and say so on the
run sheet; if both are used on the same section, `2d`'s report names the RESULTS rows it did not
cover.

## What it never does

- Never reads or writes REGISTRATIONS, ENTRIES, PRIZE CALCULATIONS or CHEQUE REGISTER.
- Never touches DONATED?, DONATION AMOUNT or NOTES on a RESULTS row; JUDGE only when blank.
- Never accepts a payload without `kind:"judging-results"`, an entry not in ENTRIES, an entry
  outside its section, or one entry in two placings — each refused *by name*, and the good
  sections in the same POST still land.
- Ships no email, phone, address or DOB in `judging-data.js` — names, animal names and reg/ATQ only.

## Verifying after any change

```sh
node tools/apps-script/judging-tests/gas-test.js          # 103 checks; section 10 = this app
python3 -m http.server 8765 &                              # from the repo root
NODE_PATH=$PWD/node_modules node tools/verify-judging.js   # 80 checks in real Chrome, fake endpoint
node tools/apps-script/judging-tests/build-judging-data.js # dev copy of judging-data.js from the fixture
```
