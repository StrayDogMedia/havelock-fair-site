---
name: verify-site
description: Verify havelockfair.ca changes locally — headless-Chrome screenshots (with this repo's gotchas), i18n key coverage across EN/FR/ES, asset resolution, and post-deploy live checks. Use before committing any HTML/CSS/JS change and after pushing to main.
---

# Verify the Havelock Fair site

Static site, no build step, no test suite — verification is rendering + scripted checks. `main` push = live deploy to havelockfair.ca via GitHub Pages (~30–60s).

## 1. Static checks (always, fast)

```bash
node --check js/heritage-home.js && node --check js/i18n.js
```

**i18n coverage** — every `data-i18n` key in the page AND every key built dynamically in JS must exist in all three dictionaries (`en`/`fr`/`es` in `js/i18n.js`). Evaluate i18n.js with browser globals stubbed:

```js
const src = require('fs').readFileSync('js/i18n.js','utf8');
const sandbox = `var localStorage={getItem:()=>null,setItem:()=>{}};
  var document={querySelectorAll:()=>[],addEventListener:()=>{},documentElement:{}};
  ${src}; module.exports = translations;`;
const translations = eval(`(function(){var module={exports:{}};${sandbox};return module.exports;})()`);
// then: for each used key, assert key in translations[lang] for all langs
```

Dynamic keys to include for the homepage: `sp_{ls,mu,tr,fd,kd,cr}_{lead,f1,f2,f3,cta,c1,c2,c3}`, `sp_kicker/prev/next/prev_photo/next_photo`, `highlights_*`, `countdown_*`.

**Assets** — extract `src="images/..."` and `url('images/...')` refs from HTML+JS, `fs.existsSync` each; also assert zero hotlinked `https://...jpg|png` images.

## 2. Headless Chrome rendering — the gotchas that cost hours

Chrome binary: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.

- **Always use an isolated `--user-data-dir`** (scratchpad path). Without it, the command attaches to the user's running Chrome ("Opening in existing browser session") and no screenshot is written.
- **Chrome often hangs after writing the file.** Never wait on the process: launch backgrounded, poll for the output file, then `pkill -9 -f "<profile-dir-name>"`.
- **Minimum window width ≈ 500px.** `--window-size=390,...` renders a 500px-wide layout *cropped* to 390 — elements near the right edge vanish from the shot but are fine in reality. Verify narrow layouts by measuring (`getBoundingClientRect` via injected script + `--dump-dom`, read `<title>`), not by eyeballing a "390px" screenshot. Real minimum-width capture: 500.
- **Full-page shots vs `100vh` sections:** a tall `--window-size` makes `100vh` sections balloon. Inject a pin style into a temp variant: `.hf-hero{height:880px!important;min-height:0!important}.hf-break{height:620px!important}.hf-finale{height:640px!important}`, then shoot at `--window-size=1440,7400`.
- Use `--virtual-time-budget=4000` (ms) so reveals/scripts settle; `--force-device-scale-factor=1 --hide-scrollbars`.

Template:

```bash
( "$CHROME" --headless=new --disable-gpu --hide-scrollbars --no-first-run \
  --no-default-browser-check --user-data-dir="$PROF" --force-device-scale-factor=1 \
  --window-size=1440,900 --virtual-time-budget=4000 \
  --screenshot="$OUT.png" "file://$PWD/PAGE.html" 2>/dev/null & )
# poll for $OUT.png, then: pkill -9 -f "$PROF"
```

**State variants** (write temp `__tmp_*.html` copies, delete before committing):
- Language: the switch function is **`setLanguage(lang)`**, NOT `setLang` — `setLang` exists only inside
  `pages/registration.html`, which has its own private i18n. Calling the wrong name throws silently
  inside an injected script and you get an English screenshot that looks like a translation bug.
  **Injecting `localStorage.setItem("hf-lang","fr")` does not work over `file://`** — that is an opaque
  origin, `localStorage` throws, and `i18n.js` falls back to `en`. Serve the site and call
  `setLanguage("fr")` after load instead (see "Serve it, don't file:// it" below).
- Spotlight modal open: append before `</body>`: `<script>setTimeout(()=>{document.querySelectorAll(".hf-card")[0].click();},700);</script>`
- Mobile menu open: `document.getElementById("hf-menu-open").click()`.

Minimum shot list for a homepage change: desktop full page (pinned), 500px mobile top, modal open, FR full page. Confirm interior pages untouched with `git diff --stat HEAD -- pages/ css/style.css js/main.js`.

## 3. Post-deploy live checks (after pushing main)

```bash
curl -s "https://havelockfair.ca/?v=$(date +%s)" | grep -q "heritage.css" && echo live
for a in css/heritage.css js/heritage-home.js images/home/hero/hero-1.jpg; do
  curl -s -o /dev/null -w "%{http_code} $a\n" "https://havelockfair.ca/$a"; done
```

Cache-bust with a query param; Pages typically serves the new version in ~30–60s.

## Repo facts that affect verification

- Heritage system (`css/heritage.css`, `--hf-*`, homepage only) is namespaced apart from the legacy `css/style.css` used by `pages/*` — a homepage change must produce **zero** diff/render change on interior pages.
- Script order on the homepage matters: `i18n.js` → `countdown.js` → `heritage-home.js` (countdown and the modal read the `translations`/`currentLang` globals).
- `pages/registration.html` is self-contained (own inline JS/i18n, posts to Google Apps Script) — never assume shared-file changes reach it.
- Image tooling: no ImageMagick; use `sips` or a scratchpad venv with Pillow (`python3 -m venv "$SP/venv" && "$SP/venv/bin/pip" install Pillow`).

## Serve it, don't `file://` it  (learned 2026-08-23)

Verifying anything that touches i18n, chrome injection or relative assets is far more reliable over a
real origin than off disk:

```bash
python3 -m http.server 8765   # from the repo root; background it
# ...verify against http://localhost:8765/pages/whatever.html
pkill -f "http.server 8765"
```

Why it matters: `file://` is an **opaque origin**, so `localStorage` throws. `js/i18n.js` line ~1110 does
`let currentLang = localStorage.getItem("hf-lang") || "en";` **unguarded**, so the throw kills the whole
i18n layer and every later reference dies with `Cannot access 'currentLang' before initialization`.
(That unguarded read is also a real, if minor, production risk for visitors who block site data — worth a
`try/catch` some day.)

## Screenshot polling: delete the old file first

The launch-and-poll pattern below is right, but `until [ -f "$OUT.png" ]` **exits instantly if a previous
run left the file there**, so you silently screenshot nothing and compare two identical stale images.
Always `rm -f "$OUT.png"` before launching. Same for `--dump-dom` — it hangs like `--screenshot` does, so
background it and poll for a **non-empty** file (`until [ -s "$OUT" ]`).

## jsdom notes for this repo

- `require('jsdom')` here exports only `JSDOM, VirtualConsole, CookieJar, requestInterceptor, toughCookie`
  — there is **no `ResourceLoader`** to subclass. To prove a page makes no third-party request, assert
  statically over the loaded DOM instead: collect every `src`/`href`/`poster`/`data-src` and check none
  point at the host in question.
- Stub `IntersectionObserver` in `beforeParse` — `heritage-chrome.js` uses it for `[data-reveal]` and
  throws without it.
- Interior pages load `heritage-chrome.js` + `i18n.js` only. **`heritage-home.js` is homepage-only**, so
  any behaviour defined there (e.g. the click-to-load film facade) must be re-inited on an interior page.

## The trap DOM tests cannot catch: contrast

`.hf-sec` is **`--hf-espresso`-backgrounded** (dark). `.hf-sec--ivory` flips it light. Headings inside a
dark section must use `--hf-ivory-bright` with a `.hf-sec--ivory` override — copy the `.hf-sec-h2`
convention rather than guessing a colour.

On 2026-08-23 a new page styled act names with `--hf-espresso` and rendered them **invisible, dark on
dark**. All 27 DOM assertions passed, because they check `textContent`, not colour. **Only the screenshot
caught it.** If you add a page and only run scripted checks, you have not verified it — take the shot.

## Verifying against the live page, not just the repo

After a push, download the served HTML and run the same harnesses against *that* file. It catches deploy
lag and any Pages-side surprise, and costs one `curl`:

```bash
curl -s "https://havelockfair.ca/pages/PAGE.html?v=$(date +%s)" -o live.html
NODE_PATH=/path/to/node_modules node tools/verify-PAGE.js live.html
```

## Harnesses that live in `tools/`

`verify-registration.js` (payload byte-compare — run before **every** commit touching
`pages/registration.html`), `verify-entry-count.js`, `verify-class-divisions.js`,
`verify-address-fields.js`, `verify-music-page.js`, `verify-music-embed.js`, `verify-results-entry.js`.
They need `jsdom`, which is not vendored: `npm install jsdom` somewhere and pass `NODE_PATH`.

**Proper nouns must not "translate".** Band names, act names and song titles are pinned byte-identical
across `en`/`fr`/`es`. A blanket "every string changed under FR" assertion will fail on them — and on
`nav_directions`, `nav_contact`, `nav_menu`, which are genuinely the same word in French. Exclude, do not
"fix".
