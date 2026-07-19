# Handoff: Havelock Fair — Homepage (Black &amp; Heritage Gold, refined)

## Overview
A cinematic, editorial, story-driven homepage for the Havelock Fair — one of Canada's oldest continuously held agricultural fairs (est. 1871, 155th edition, September 12–13, 2026). The design reads like a premium coffee-table book / heritage museum / world-class tourism destination rather than an event brochure. It leads with immersive photography, oversized typography, asymmetric layouts, layered heritage imagery, dramatic whitespace, and restrained scroll-paced motion.

## About the Design Files
`havelock-home.html` is a **design reference** — a self-contained HTML/CSS/JS prototype that demonstrates the intended look, layout, and behavior. It opens by double-clicking (no build step) and uses vanilla JS, Google Fonts, and the fair's existing hosted photos.

The task is to **recreate this design in the existing havelockfair.ca codebase** (currently static multi-page HTML under `/pages/*.html`), following that project's established structure, partials, and conventions. You can lift the markup and inline styles from this file directly if the site is plain HTML, or translate them into whatever templating/component system the repo uses. Do not treat the values below as approximate — they are the intended final spec.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, composition, and interactions. Recreate pixel-for-pixel, then wire the nav links, ticket/registration CTAs, and gallery "View All" to the real pages.

## Design Tokens

### Color
| Token | Hex | Use |
|---|---|---|
| Espresso (base) | `#1B1611` | Page background, dark sections |
| Warm Charcoal | `#221C15` | Pull-quote band, dark text on light |
| Footer Black | `#16130E` | Footer |
| Antique Bronze | `#8A6B3E` | Large numerals, hairline accents, drop cap |
| Heritage Gold | `#C6A15B` | Primary accent, CTA button bg, borders |
| Gold Bright | `#D8BB78` | Eyebrows over photos, italic accents |
| Gold Warm | `#E8D3A0` | Wordmark, nav CTA text |
| Warm Ivory | `#F1E8D6` | Light interlude & "Plan Your Visit" bg |
| Ivory Bright | `#F5ECD8` | Headings on dark |
| Body ivory (soft) | `rgba(241,232,214,.74)` | Body text on dark |
| Body espresso (soft) | `#5c5240` | Body text on ivory |
| Frame line | `rgba(198,161,91,.32)` | Inset bronze frames, section rules |

### Typography
- **Display / headings:** Newsreader (serif), weights 300–600, upright &amp; italic. Google Fonts.
- **Body serif (light interlude):** Spectral, 400.
- **UI / body sans:** Manrope, weights 300–700.
- Hero H1: Newsreader 400 / italic 300, `clamp(66px,11vw,170px)`, line-height .86, letter-spacing -.01em.
- Section H2: Newsreader 400, `clamp(40px,5.4vw,74px)`.
- Spread numerals: Newsreader 300, `clamp(56px,7vw,110px)`, color bronze.
- Eyebrows: Manrope 600, 12px, letter-spacing .28–.34em, uppercase.
- Body: Manrope 300, 16.5–19px, line-height 1.55–1.8.
- Nav links: Manrope 500, 11.5px, letter-spacing .16em, uppercase.

### Spacing / rhythm
- Section vertical padding: `clamp(96px,15vh,190px)` (up to `clamp(110px,18vh,220px)` for the pull quote) — dramatic whitespace is intentional.
- Horizontal gutters: `clamp(34px,6vw,96px)`; content max-width 1240px (1320px gallery), centered.
- Editorial spread row padding: `clamp(40px,7vh,90px)` top/bottom, separated by 1px bronze rules.

### Borders / shadows
- Inset hero/CTA frame: `1px solid rgba(198,161,91,.32)`, inset 22px.
- Layered heritage photos: `box-shadow:0 40px 90px rgba(0,0,0,.5)`; front photo has a `6px solid #F1E8D6` border.
- No border-radius anywhere (square, editorial).

## Screens / Views — Section by section

1. **Hero (100vh, min 780px)** — Full-bleed photo (`fair-2025-04.jpg`) with a slow Ken Burns zoom (`@keyframes hfKen`, 22s). Warm vertical gradient overlay + inset bronze frame. Transparent header on top. H1 anchored **bottom-left** (asymmetric), eyebrow above, lede + italic date below. Vertical "155th Edition · Since 1871" label at right. Bouncing ↓ scroll cue centered bottom.
2. **Chapter One (ivory)** — Deliberate light-on-dark surprise. Asymmetric grid `0.62fr / 1.55fr`. Left: "Chapter One / The Gathering Field" label. Right: large Spectral paragraph with a Newsreader drop cap, plus a supporting paragraph.
3. **A Living Heritage (espresso)** — Giant outlined `1871` numeral behind (`-webkit-text-stroke`, transparent fill). Two overlapping photos (one sepia-toned) with offset + shadows. Text block right.
4. **Cinematic break** — Full-bleed photo, scroll parallax, single italic pull-line lower-left.
5. **What Awaits You** — Six alternating full-width editorial spreads (image / oversized bronze numeral + title + copy), left/right flipped per row, hairline separators. Content = the fair's six categories.
6. **Pull quote (warm charcoal)** — Centered oversized italic quote, gold quote mark, eyebrow.
7. **Gallery (espresso)** — Asymmetric 4-col mosaic (first tile spans 2×2, one spans 2 wide).
8. **Plan Your Visit (ivory)** — Oversized date headline + intro, then a 4-column hairline info table (Admission / Hours / Food &amp; Drink / Parking).
9. **Finale CTA** — Full-bleed photo, parallax, inset frame, "Join Us This September" + gold button.
10. **Footer** — 3-column (brand / Explore links / Visit info) over `#16130E`, bronze rule, legal line crediting MAPAQ &amp; the Association des expositions agricoles du Québec.

## Interactions &amp; Behavior
- **Scroll reveals:** elements with `[data-reveal]` fade + translateY(30px→0) via IntersectionObserver (threshold .14), 1.1s cubic-bezier(.2,.6,.2,1). If JS is off, content stays visible (initial hidden state is applied by JS, not CSS).
- **Parallax:** `[data-parallax]` images translate on scroll (factor -0.07), rAF-throttled. Images are sized 124% tall / top:-12% so no edges show.
- **Ken Burns:** hero image only, CSS keyframes.
- **Reduced motion:** all of the above is skipped / disabled under `prefers-reduced-motion: reduce`.
- **Bilingual EN/FR:** clicking EN/FR retranslates all `[data-i18n]` chrome (nav, tickets, hero eyebrow/lede, dates, CTA) and updates `<html lang>`. Long-form editorial prose is English in this prototype — supply French copy for the body sections before launch. French labels are longer; the header and buttons already accommodate expansion.
- **Responsive header:** desktop inline nav above 1024px; below 1024px it collapses to a "Menu" button that opens a full-width dropdown (links + EN/FR + Tickets). CTA never clips.

## State
- `lang` (en | fr) — drives i18n.
- `menuOpen` (bool) — mobile menu visibility.

## Assets
Photography is loaded from the live site: `https://havelockfair.ca/images/gallery/fair-2025-01.jpg` … `fair-2025-06.jpg`. Swap these `src` values for local repo paths (e.g. `/images/gallery/...`) during implementation. No icons or illustrations are used (typographic-only, per the design direction). Fonts are Google-hosted (Newsreader, Spectral, Manrope).

## Files
- `havelock-home.html` — the self-contained design reference (this bundle).
- In the design tool project, the source lives as `Havelock Fair - Home.dc.html`; the six explored brand directions and palette studies are in `Havelock Fair Concepts.dc.html` (not required for implementation).

## Notes for launch
- Point nav/footer links, the Tickets/Registration CTA, and gallery "View All" at the real pages.
- Provide French translations for the long-form section copy.
- Consider generating responsive/optimized image sizes; the hero and full-bleed breaks load large photos.
