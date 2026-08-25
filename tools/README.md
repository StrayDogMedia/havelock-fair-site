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

## verify-results-entry.js

Covers `pages/results-entry.html`, the fair-day tool directors use to record
placings. Needs `entries.tsv` in the working directory (an ENTRIES-tab export).

```sh
NODE_PATH=/path/to/node_modules node tools/verify-results-entry.js
```

19 checks: parsing an ENTRIES paste, section grouping, recording and clearing a
placing, localStorage persistence across a reload, the "still to judge" filter,
position-only (4-H / Equestrian) badging, HM/DQ carrying no money, the
two-firsts-in-one-section warning, and the two-column export format.

**The duplicate-placing warning is the one that matters most.** Two 1st places in
one section is a real and expensive mistake, and it is invisible on a printed
sheet until the cheques are wrong.

## verify-chrome.js

Covers the shared chrome — menu prominence, the language toggle, and the
localized wordmark — across all nine pages and all three languages.

```sh
cd ~/havelock-fair-site && python3 -m http.server 8765   # in another shell
NODE_PATH=/path/to/node_modules node tools/verify-chrome.js
```

⚠️ **Serve the site. Never point this at `file://`.** An opaque origin makes
`localStorage` throw, the page renders untranslated, and it looks exactly like a
bug in the code under test.

285 checks. The ones that matter most:

- **`.hf-lang` is a direct child of `<header>`, not a child of `.hf-nav-side`.**
  This is the bug the whole change exists to fix: `.hf-nav-side` is
  `display:none` in the collapsed layout, so the language toggle disappeared on
  every phone and tablet and was only reachable at the bottom of the drawer.
- **The header goes `.is-stuck` after scrolling.** The bar used to be
  `position:absolute` and scrolled away permanently — past the hero there was no
  navigation at all until the footer.
- **Arriving at `registration.html` with `hf-lang='es'`** lights the ES button
  and shows `#es-form-notice`. That page has its own inline `setLang()`, which
  used to ignore `'es'` entirely and silently serve English with the EN button
  lit.

Two i18n layers exist and must not be crossed: the homepage and the seven
interior pages use `setLanguage()` from `js/i18n.js`; `pages/registration.html`
has its own inline `setLang()`. The harness drives whichever one a page ships.

**Scripted checks cannot catch contrast** — see the `.hf-sec` trap noted in the
project handoff. Screenshot before and after as well.

### Layout measurement

The header must not clip in any language. Spanish is the widest
("Feria de Havelock", "DIRECCIONES"), and it is what the phone and collapse
breakpoints are sized against. When changing nav items or labels, re-measure
across widths in all three languages, and check **both** edges: flex squeezes
the brand off the *left* without ever growing `scrollWidth`, so a
document-overflow check alone reports a clean bar that is visibly broken.

## verify-reg-switcher.js

Covers the registration page's category switching: the sticky context bar, the
cross-category add buttons, and the two-tier card chooser. Drives real Chrome
(not jsdom) because every assertion here is positional.

```sh
cd ~/havelock-fair-site && python3 -m http.server 8765   # in another shell
NODE_PATH=/path/to/node_modules node tools/verify-reg-switcher.js
```

42 checks. Why it exists: **Livestock and Home & Garden are two views of ONE
submission** (`#form-general`, one exhibitor number, one Submit), while **Youth,
4-H and Equestrian are each a SEPARATE form with its own Submit**. Before this
change a visitor could fill the General form, click Youth, submit Youth, and
their General entries were silently never sent — `#entries-summary`, the only
warning, lives *inside* the General panel and is hidden exactly when it matters.
The context bar carries that warning across panels; these tests pin it down.

### Two traps this harness now guards, both found by screenshot, not assertion

**1. `hidden` is only a UA-stylesheet `display:none`.** Any author `display`
rule beats it. `.reg-context-switch { display:flex }` kept the Livestock /
Home & Garden chips on screen next to "Youth — a separate registration", while
the test asserted `el.hidden` — which was `true` the whole time. **Assert
`getComputedStyle(el).display`, not `el.hidden`.** The page now carries
`.reg-context [hidden] { display:none !important }`.

**2. Source order beats intent.** Twice, overrides were written *above* the base
rule they meant to override and silently lost:
- the phone `@media` block sat above `.cat-card-sub { display:block }`, so the
  blurbs never hid and the chooser measured 981px instead of ~490px;
- `.add-entry-row .add-entry-btn { flex:… }` sat above
  `.add-entry-btn { width:100% }`, so the two add buttons stacked full-width.

Every media query and override in that page's `<style>` now lives **after** the
base rules, with a comment saying why.

### Measure both edges, in all three languages

The header and this bar can be squeezed off the **left** without ever growing
`scrollWidth`, so a document-overflow check reports a clean page that is visibly
broken. Spanish is the widest language. Baselines to beat, measured:

| | before | after |
|---|---|---|
| chooser, 1440px | 299px | 393px (buys the two-tier explanation) |
| chooser, 390px | **772px** | **490px** |
| context bar | — | 56px desktop / 54px phone |

## verify-schedule.js

Covers `pages/schedule.html`: chronological order, the all-day band, the
"Don't miss" strip, category colour, and the live on-now view. Drives real
Chrome — order, layout and colour are all positional or computed.

```sh
cd ~/havelock-fair-site && python3 -m http.server 8765   # in another shell
NODE_PATH=/path/to/node_modules node tools/verify-schedule.js
```

51 checks. **The first one is why this file exists.** `buildTimeline()` grouped
events into a plain object keyed by `"9:00"`-style strings. Those aren't
array-index-like, so the keys kept **insertion order** and the timeline rendered
in whatever order `schedule-data.js` happened to list — Saturday ran
`12:30 → 3:00 PM → 11:00 AM`, Sunday jumped `3:00 PM → 9:00 AM`. Live, on both
days, for months, because nothing ever asserted the order. The check reads each
`.time-group`'s `data-time`, converts to minutes, and asserts the sequence never
steps backwards, on both days in all three languages.

Also asserted:

- **Nothing vanishes** when all-day events are split out of the timeline —
  rendered card count still equals `scheduleData`, band + slots account for all.
- **Every highlight photo loads and matches its event.** The first pass put an
  exhibit-hall photo of preserve jars on "Children's races" and cattle on the
  "Heavy Horse Show", picked from filenames without opening them. Check the
  picture, not the name.
- **BB King stays out of the strip** — the billing is still unconfirmed.
- **The live view**, driven by `?now=2026-09-12T13:20`. Without that override the
  feature would be unverifiable until the fair itself; keep it.
- **Category colour measured on rendered pixels**, resolving the real backdrop by
  walking up to the first painted ancestor.

### Category colour: hue alone was not enough

Kids / Livestock / Food are three earth tones and sit ~13° apart in hue — they
cannot be separated by hue inside a warm palette. They are a deliberate
**light / mid / dark ladder** instead, which is also what survives a
colour-vision difference or a greyscale print. Every pair in the set is
separable by hue ≥ 25° **or** lightness ≥ 1.6×, and every colour clears 4.5:1 on
the espresso ground. Colour is never the only signal — each row also carries its
category as `.sr-only` text. Re-measure if you retint.

| | before | after |
|---|---|---|
| Saturday chronological | ❌ | ✅ |
| Sunday chronological | ❌ | ✅ |
| timeline block, Saturday desktop | ~1,850px of slots | 866px of slots + strip + band |
| page height, Saturday desktop | 3,579px | 3,047px |

## verify-map.js

Covers the fairgrounds plan on `pages/directions.html` — the inline SVG, its
hotspots, the legend, the detail panel, and the link back from the schedule.

```sh
cd ~/havelock-fair-site && python3 -m http.server 8765   # in another shell
NODE_PATH=/path/to/node_modules node tools/verify-map.js
```

51 checks. **The point of the file is check 1: every location resolves both
ways.** Place names live once, in `js/map-data.js`; the schedule references pin
numbers (`venue: 10`) instead of repeating a name. That only stays true if
something asserts it — otherwise a renamed building or a deleted pin drifts
silently and the schedule sends someone to a barn that isn't there.

Also asserted: keyboard (Enter selects, Escape clears and returns focus — the
draft's tap affordance is mouse-only), the deep link `directions.html#loc-10`,
"here today" matching `scheduleData` under the `?now=` override, and that pin
**16 is the only unnamed location** and announces itself as unnamed rather than
rendering blank.

### Two grounds, two measured colour sets

The plan is dark; the panel and legend beside it are on `.hf-sec--ivory`. The
espresso category colours measure **1.34–2.65:1 on ivory** — unreadable — and
the first build shipped exactly that: every location name cream on cream, while
**all 43 assertions passed**, because assertions check text and not colour. Only
the screenshot caught it. `js/map-data.js` now carries `color` (espresso) and
`ink` (ivory) per category, same hue families, and the harness measures the
rendered pixels on the real backdrop.

`--hf-bronze` is also only 4.06:1 on ivory — fine as a rule, not as small
uppercase text. `--hf-bronze-ink` (#705732, 5.57:1) is the ivory-safe variant.

### Pin numerals have to be readable, not just present

At 390px the plan first rendered 304px wide, which put the pin numbers at about
**4px tall**. Every DOM check passed. The stage now scrolls horizontally below
760px with a `min-width`, and the harness measures the *rendered* height of a
pin numeral rather than the authored `font-size`, which the viewBox rescales.

### The artwork is a picture; everything meaningful is HTML over it

The map is `images/map/fairgrounds.jpg`, a commissioned isometric illustration
carrying **no text at all**. Pins, legend and panel are HTML on top, which is
what keeps names in `js/map-data.js` (shared with the schedule), keeps the
legend translatable, and makes every location a real `<button>`.

Hotspot `x`/`y` in `map-data.js` are **percentages**, so they survive a
re-export at another resolution. They are still positions on a picture: if the
art is REDRAWN they all need checking. `?calibrate=1` prints the percentage
under the cursor and copies it on click, which makes that a few minutes.

⚠️ **Which building is which is partly a guess.** The illustration is a
hand-drawn interpretation, not a survey. Confident: 1, 2, 3, 7, 10, 15, 16.
The rest are read from relative position and want a look from someone who knows
the grounds.

### The map always fits its frame — never a sideways scroll

The first fix for crowded pins was a 620px `min-width`, which meant a phone had
to scroll the whole map sideways. That was worse than the problem it solved.
The map now fits its container at every width, and **zoom** separates crowded
pins: `+` / `−` / reset, drag to pan, pinch on touch. Pins counter-scale by
`--pin-inv` (1/zoom) so they keep their real size — and their touch target —
however far in you go.

Three things the harness pins down that are easy to break by hand:

- no pin may sit outside the artwork (2–98%);
- the map frame must never be wider than its container at default zoom;
- **no two pins may overlap by more than 8% of a pin's area.** The threshold
  started at 35% and waved through a 27% collision between 13 and 15 that was
  obvious in a screenshot. Pins 1, 13 and 15 are nudged slightly off their exact
  buildings because of it — they are markers, not survey points.

When zoomed, `overflow: hidden` means the frame *cannot* be scrolled, so
`scrollWidth > clientWidth` is not a scroll bug; the check looks at
`overflow-x` instead.

⚠️ `.hf-pin` transitions its transform over 0.18s. Reading a computed style
straight after clicking a zoom control catches it mid-flight and reports the
pre-scale size — the harness waits.

A `<button>` also turns Enter into a click, so the keyboard path silently lost
its focus move to the panel. `e.detail === 0` distinguishes keyboard activation
from a pointer.

### An earlier version was drawn on parchment, and that was still the right call

The section it lives in is `.hf-sec--ivory`. The first version was a dark
wireframe fighting that ground — grey blobs and circles for trees. It is now a
printed-paper plan: mown grass bands, pitched roofs with gable ends and a cast
shadow, barn red on the barn, a sand-hatched ring with a horse in it, tree
lines, a compass rose.

The illustration fills are deliberately LOW contrast (grass 1.19:1, roofs
1.96–2.75:1). They are surfaces, not information. Everything that carries
meaning is the numbered pin, at 10:1 ink on parchment, and the harness measures
those. Do not "fix" the grass contrast.

### Names come from the fair's own plan

All 17 locations, EN and FR, are transcribed from the bilingual site plan the
fair supplied. Two things in it look like mistakes and are not:

- **Pin 1 is "Gate #2 (pedestrian)" and pin 2 is "Gate #1 (vehicles)."** Pin
  number and gate name are inverted. That is what their signage says. The
  harness asserts the inversion is preserved so nobody helpfully corrects it.
- **Pin 15 is "4H BUILDING" in English and "ARÉNA 4H" in French.** Reproduced
  as written rather than harmonised.

Spanish is ours — their plan is EN/FR only.

### Why SVG and not the aerial render

Hotspots on a raster are pinned to pixel positions, and a regenerated image
moves the buildings — every pin would need re-measuring after every art
revision. In SVG the pins **are** the map. It also carries no logo and no
founding year: the draft had "EST. 1846" baked in while the site says 1871 in
60 places, which is the failure mode a picture makes invisible.
