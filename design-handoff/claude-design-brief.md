# Heritage Noir — Design System Brief
**Havelock Fair · havelockfair.ca**

A self-contained specification of the design system as it is actually built and shipping. Every value below was read out of `css/heritage.css` and `css/heritage-pages.css` — this is the built truth, not an aspiration.

**What it is:** an editorial, cinematic system for a 155-year-old Quebec agricultural fair. It should read like a premium coffee-table book or a heritage museum — immersive photography, oversized serif typography, asymmetric layouts, dramatic whitespace, restrained motion. Not an event brochure.

**Delivery:** hand-written static HTML + CSS. No framework, no build step, no component runtime. Class-based, namespaced `hf-*`, with CSS custom properties as the token layer. `heritage.css` carries tokens, primitives and the homepage; `heritage-pages.css` extends it with interior-page components.

---

## 1. Foundations

### Color

| Token | Value | Role |
|---|---|---|
| `--hf-espresso` | `#1B1611` | Page background; default dark section |
| `--hf-charcoal` | `#221C15` | Second dark surface — cards, pull-quote band, film section |
| `--hf-footer-black` | `#16130E` | Footer only |
| `--hf-bronze` | `#8A6B3E` | Large numerals, drop cap, hairline accents |
| `--hf-gold` | `#C6A15B` | Primary accent, button fill, eyebrows, borders |
| `--hf-gold-bright` | `#D8BB78` | Eyebrows over photos, italic emphasis, links |
| `--hf-gold-warm` | `#E8D3A0` | Wordmark, nav CTA text |
| `--hf-ivory` | `#F1E8D6` | Light section background |
| `--hf-ivory-bright` | `#F5ECD8` | Headings on dark |
| `--hf-body-on-dark` | `rgba(241,232,214,.74)` | Body copy on dark |
| `--hf-body-on-ivory` | `#5c5240` | Body copy on ivory |
| `--hf-frame` | `rgba(198,161,91,.32)` | Inset photo frames |
| `--hf-rule` | `rgba(198,161,91,.16)` | Hairline rules and card borders on dark |
| `--hf-rule-ivory` | `rgba(34,28,21,.2)` | Hairline rules on ivory |

Three surfaces only — espresso, charcoal, ivory. Sections alternate between them; ivory is used sparingly, as a deliberate light interlude.

### Typography

Three Google families, all in use:

- `--hf-serif` — **Newsreader** (300–600, upright + italic). All display type, headings, numerals, prices, dates.
- `--hf-body-serif` — **Spectral** (300–500 + italic). Long-form editorial prose in light sections only.
- `--hf-sans` — **Manrope** (300–700). UI, nav, body copy, eyebrows, buttons. Body default is weight **300**.

| Role | Spec |
|---|---|
| Hero H1 (`.hf-h1`) | Newsreader 400, `clamp(66px,11vw,170px)`, line-height `.86`, letter-spacing `-.01em`; `em` → italic 300 |
| Section H2 (`.hf-h2`) | Newsreader 400, `clamp(40px,5.4vw,74px)`, line-height 1 |
| Interior H2 (`.hf-sec-h2`) | Newsreader, `clamp(34px,4.6vw,62px)`; `em` → italic, gold-bright (bronze on ivory) |
| Page title (`.hf-page-title`) | Newsreader, `clamp(46px,7.5vw,110px)`, line-height `.92` |
| Eyebrow (`.hf-eyebrow`) | Manrope 600, 12px, uppercase, letter-spacing `.3em`, gold. `--bright` = gold-bright at `.34em`; `--bronze` = bronze at `.28em` |
| Chapter lead | Spectral 400, `clamp(24px,2.6vw,34px)` |
| Drop cap (`.hf-dropcap`) | Newsreader 400, 112px, bronze, `float: left` |
| Pull quote | Newsreader italic 300, `clamp(28px,3.6vw,52px)` |
| Giant numeral (`.hf-heritage-numeral`) | `clamp(200px,34vw,520px)`, `color: transparent`, `-webkit-text-stroke: 1px var(--hf-rule)` |
| Nav link | Manrope 500, 11.5px, uppercase, letter-spacing `.16em` |
| Body | Manrope 300, 16.5–19px, line-height 1.55–1.8 |

Headings use `text-wrap: balance`; ledes use `text-wrap: pretty`.

### Rhythm

- `--hf-pad-section: clamp(96px,15vh,190px)` — homepage section padding (interior pages: `clamp(76px,12vh,150px)`)
- `--hf-gutter: clamp(34px,6vw,96px)` — horizontal gutter
- `--hf-max: 1240px` content width; `--hf-max-wide: 1320px` for mosaics
- Generous whitespace is load-bearing. Do not compress it to fit more in.

### Shape — the one hard rule

**No `border-radius` anywhere.** Every corner in this system is square: buttons, cards, inputs, photo frames, video players, tabs. This is the single most identity-defining rule; a rounded corner reads as foreign immediately.

Structure comes from **1px hairlines**, not fills or shadows: `1px solid var(--hf-rule)` for card borders and table rules, `1px solid var(--hf-frame)` for the inset frame drawn *inside* full-bleed photos (`.hf-frame`, `inset: 22px`).

### Motion

- `hfKen` — Ken Burns on hero photography: `scale(1.02)` → `scale(1.14) translate(-1.5%,-1.5%)`.
- Hero slides crossfade on opacity over **1600ms**; each holds ~7s.
- Scroll reveals: fade + `translateY(30px → 0)`, `1.1s cubic-bezier(.2,.6,.2,1)`, triggered by IntersectionObserver. The hidden state is applied by JS so content stays visible without it.
- Parallax on full-bleed photos: factor `-0.07`, images sized 124% tall at `top: -12%` so no edge shows.
- Hover transitions are slow and quiet — 0.25–0.9s ease.
- **Everything above is disabled under `prefers-reduced-motion: reduce`.**

### Accessibility baseline

- `:focus-visible` → `2px solid var(--hf-gold-bright)`, offset 3px.
- `::selection` → gold background, espresso text.
- Icon-only controls carry a translated `aria-label`.
- The site is trilingual **EN / FR / ES**; French labels run ~20% longer than English, so nav, buttons and cards must tolerate expansion without clipping.

---

## 2. Component inventory

### Primitives
| Class | Spec |
|---|---|
| `.hf-eyebrow` (+`--bright`, `--bronze`) | Uppercase gold kicker above every heading |
| `.hf-h1` / `.hf-h2` / `.hf-sec-h2` | Display headings; `em` inside is italic and colour-shifted |
| `.hf-btn-gold` | Gold fill, espresso text, `17px 42px`, 12px uppercase 700, letter-spacing `.16em`; hover → gold-bright. Square |
| `.hf-link-line` | Gold-bright 12px uppercase link with a 1px bronze underline, 5px below the text |
| `.hf-frame` | Absolute inset-22px 1px bronze frame, drawn over full-bleed photography |
| `.hf-container` / `.hf-sec-inner` / `.hf-sec-inner--wide` | Width containers (1240 / 1240 / 1320) |

### Chrome
- **`.hf-header`** — transparent, absolutely positioned over the hero. Wordmark left (`.hf-brand`, Newsreader 23px gold-warm), nav centre, language switcher + Tickets CTA right. Collapses to a Menu button at **≤1200px**.
- **`.hf-tickets`** — outlined gold CTA; inverts to solid gold on hover.
- **`.hf-lang .lang-btn`** — EN / FR / ES, active state in gold.
- **`.hf-mobile-menu`** — full-width dropdown carrying nav + language + CTA.
- **`.hf-footer`** — 3-column grid on footer-black: brand + tagline / Explore links / Visit info, over a bronze rule, with a legal line.

### Homepage sections
| Class | What it is |
|---|---|
| `.hf-hero` | 100vh (min 780px) rotating photo hero. Stacked `img.hf-hero-slide` layers crossfade; `.is-active` shows, `.is-panning` runs Ken Burns. Vertical gradient scrim (62% → 28% → 72% → 96% espresso), inset frame, headline anchored **bottom-left**, vertical "155th Edition" label right, bouncing ↓ cue |
| `.hf-countdown` | Espresso band — days / hours / minutes / seconds in Newsreader with uppercase labels |
| `.hf-chapter` | **Ivory** interlude. Asymmetric `0.62fr / 1.55fr` grid: label left, Spectral prose with bronze drop cap right |
| `.hf-heritage` | Espresso. Giant outlined `1871` numeral behind two overlapping photos — back photo sepia-toned (`sepia(.28) saturate(.85)`) at 74%, front at 60% with a `6px solid ivory` border and `0 40px 90px rgba(0,0,0,.55)` shadow |
| `.hf-break` | Full-bleed parallax photo, 90° scrim, single italic pull-line lower-left at `clamp(30px,4vw,58px)` |
| `.hf-film` | Charcoal. 16:9 `.hf-film-stage` (max 1080px) holding a click-to-load video facade: poster, scrim, inset frame, square gold play button, caption bottom-left |
| `.hf-cards` / `.hf-card` | 6 category cards — photo background, scrim, bronze numeral `01–06`, serif title, tease line, "Take a look". `1px var(--hf-rule)` border → gold on hover. Opens `.hf-spot` |
| `.hf-spot` | Full-screen spotlight modal: photo stage with dots + arrows, kicker, lead paragraph, three facts, CTA. Esc / arrow-key driven |
| `.hf-quote` | Charcoal band, centred oversized italic quote with a 60px bronze quote mark |
| `.hf-mosaic` | 4-column photo grid, rows `clamp(150px,17vw,230px)`, 14px gap; `.span2x2` and `.span2w` break the rhythm |
| `.hf-visit` | **Ivory**. Oversized serif date + lede, then a 4-cell hairline info table (`.hf-visit-cell`, price at Newsreader 40px) |
| `.hf-finale` | Full-bleed parallax photo, inset frame, eyebrow + title + lede + gold button |

### Interior-page components (`heritage-pages.css`)
| Class | What it is |
|---|---|
| `.hf-page-hero` | Compact photo hero, `clamp(440px,62vh,660px)` — scrim, inset frame, title + lede bottom-left |
| `.hf-sec` (+`--ivory`, `--charcoal`, `--tight`) | Section shell; background modifier decides the surface |
| `.hf-sec-head` (+`--center`) | Eyebrow + H2 + optional lede |
| `.hf-prose` / `.hf-duo` | Long-form column and two-column editorial split |
| `.hf-cells` (+`--3`, `--2`) | Hairline data table — no fills, no borders except 1px top rules and dividers between cells, `30px 28px` padding. `.hf-cell-k` is the bronze serif key |
| `.hf-tcards` (+`--2`) | Numbered text cards, 3-up, bronze serif numeral `clamp(40px,4vw,56px)` |
| `.hf-people` / `.hf-person` | Board and contact cards — name, role |
| `.hf-routes` / `.hf-route` | Numbered driving-route cards with distance and step list |
| `.hf-frame-img` / `.hf-map` / `.hf-band` / `.hf-note` | Framed photo, site map, full-width callout band, aside note |
| `.hf-daytabs` / `.cat-filters` / `.timeline` | Schedule: day tabs, category filter pills, editorial timeline with time dots and event cards |
| `.hf-gal-mosaic` / `.lightbox` | Gallery: 4-column dense grid with `.span2x2` / `.span2w`, plus a full-screen lightbox with prev/next |
| `.hf-vcards` / `.hf-vcard` | Video cards — thumbnail, play affordance, title, description |
| `.tier-header` / `.sponsor-grid` / `.sponsor-card` | Sponsor tiers with logo tiles |

---

## 3. Composition rules

1. **Alternate surfaces.** Sections step between espresso, charcoal and ivory. Never place two identical dark surfaces adjacent without a full-bleed photo between them.
2. **Every section opens with an eyebrow.** Uppercase gold kicker, then the serif heading. This pairing is the system's signature.
3. **Photography is a section, not a decoration.** Full-bleed bands with a scrim and inset frame carry the pacing; they alternate with type-led sections.
4. **Asymmetry over centring.** Hero copy sits bottom-left; the chapter grid is 0.62/1.55; mosaic tiles break their own rhythm. Centre only the pull quote and section heads that ask for it.
5. **One gold button per view.** `.hf-btn-gold` is the single loudest element on any page — everything else is a hairline link.
6. **Numerals are ornament.** Bronze serif numbers (card `01–06`, route steps, the outlined `1871`) are a recurring motif; use them as texture, at large sizes and low contrast.

## 4. Do not

- Round any corner.
- Introduce a colour outside the token table — especially a saturated or cool one. The palette is entirely warm.
- Use icons or illustration. The system is **typographic-only**; the sole exception is the play triangle in the video player.
- Add drop shadows to UI. Shadows exist only on the two layered heritage photos.
- Use Manrope for display type or Newsreader for UI labels.
- Tighten section padding to fit more content in.

---

*Source of truth: `css/heritage.css` and `css/heritage-pages.css` in `StrayDogMedia/havelock-fair-site`. The original approved spec is `design-handoff/README.md`; `design-handoff/havelock-home.html` is a standalone reference render.*
