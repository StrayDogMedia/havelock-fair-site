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
