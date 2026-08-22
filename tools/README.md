# tools/

## verify-registration.js

Regression harness for `pages/registration.html`. **Run it before every commit
that touches that file.**

It loads a registration page in jsdom, stubs `fetch`, drives a *real* submit
(one Livestock entry + one Home & Garden entry + the full contact block) and
captures the exact POST the page would send. Point it at the modified page and
a pristine copy; it byte-compares the request bodies.

```sh
git show HEAD:pages/registration.html > /tmp/registration.pristine.html
npm install jsdom          # not vendored — this repo has no package.json
node tools/verify-registration.js pages/registration.html /tmp/registration.pristine.html
```

Exit 0 = the edit is display-only. Non-zero = the payload changed; do not ship.

### Why this exists

The Apps Script backend's unknown-`formType` fallback **silently drops contact
fields** — no error, just missing data. So a payload change can look fine in the
browser and quietly lose exhibitor names in the sheet. Both site categories
(Livestock 1–10, Home & Garden 11–25) share one form and both must keep sending
`formType:'General'`. The harness fails loudly if that ever changes.

Content-type must stay `text/plain;charset=utf-8` — `application/json` triggers a
CORS preflight that Apps Script answers with 405.

## verify-entry-count.js

Functional check of the entry counter (not a payload test).

```sh
NODE_PATH=/path/to/node_modules node tools/verify-entry-count.js pages/registration.html
```

**A judgeable entry is one (breed × section) pair.** Ruling from Jesse,
2026-08-22: ticking 2 breeds and 2 sections in one card is **4 entries**, not 1.
That is how the fair counts entries and how prize money is awarded, so the
badge and the per-card note must show the product, never the number of cards.

The counter previously counted entry *cards*, so a card with three sections
ticked displayed "1 entry". Cases covered: no-breed class, breed cross-product,
singular wording, and a class picked with no sections yet (contributes 0).
