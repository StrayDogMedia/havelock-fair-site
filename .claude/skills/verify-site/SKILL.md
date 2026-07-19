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
- Language: inject `<script>localStorage.setItem("hf-lang","fr");</script>` *before* the `i18n.js` tag (same for `es`).
- Spotlight modal open: append before `</body>`: `<script>setTimeout(()=>{document.querySelectorAll(".hf-card")[0].click();},700);</script>`
- Mobile menu open: `document.getElementById("hf-menu-open").click()`.

Minimum shot list for a homepage change: desktop full page (pinned), 500px mobile top, modal open, FR full page. Confirm interior pages untouched with `git diff --stat HEAD -- pages/ css/style.css js/main.js`.

## 3. Post-deploy live checks (after pushing main)

```bash
curl -s "https://havelockfair.ca/?v=$(date +%s)" | grep -q "heritage.css" && echo live
for a in css/heritage.css js/heritage-home.js images/home/hero.jpg; do
  curl -s -o /dev/null -w "%{http_code} $a\n" "https://havelockfair.ca/$a"; done
```

Cache-bust with a query param; Pages typically serves the new version in ~30–60s.

## Repo facts that affect verification

- Heritage system (`css/heritage.css`, `--hf-*`, homepage only) is namespaced apart from the legacy `css/style.css` used by `pages/*` — a homepage change must produce **zero** diff/render change on interior pages.
- Script order on the homepage matters: `i18n.js` → `countdown.js` → `heritage-home.js` (countdown and the modal read the `translations`/`currentLang` globals).
- `pages/registration.html` is self-contained (own inline JS/i18n, posts to Google Apps Script) — never assume shared-file changes reach it.
- Image tooling: no ImageMagick; use `sips` or a scratchpad venv with Pillow (`python3 -m venv "$SP/venv" && "$SP/venv/bin/pip" install Pillow`).
