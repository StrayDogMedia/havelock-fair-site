/* Fairgrounds locations — the single source of truth for place names.
 *
 * Names and numbering come from the fair's own bilingual site plan, which is
 * authoritative: 9, 11, 13 and 14 DO exist, 16 is the Barn, 17 is the 4-H
 * Stalls rather than "Stalls".
 *
 * ⚠️ THE GATE NUMBERS LOOK WRONG AND ARE NOT. Pin 1 is "Gate #2 (pedestrian)"
 * and pin 2 is "Gate #1 (vehicles)" — pin number and gate name are inverted on
 * the fair's own plan. Left exactly as the fair has it, because that is what
 * the signage says. Do not "fix" it.
 *
 * ⚠️ The fair's French and English differ for 15 — "4H BUILDING" against
 * "ARÉNA 4H". Both are reproduced as written rather than harmonised.
 *
 * Keyed by the pin number on the plan. The schedule references these numbers
 * (`venue: 10`) rather than repeating a name, so pages/schedule.html and the
 * map can never disagree, and renaming a building is one edit here.
 *
 * x / y are PERCENTAGES of images/map/fairgrounds.jpg, so they survive the
 * artwork being re-exported at another resolution. They are still positions on
 * a picture: if the art is REDRAWN they all need rechecking, and
 * pages/schedule.html?calibrate=1 prints the percentage under the cursor and
 * copies it on click, which makes that minutes rather than a chore.
 *
 * THE ARTWORK (2026-09-06, revised 2026-09-10, Jesse). A top-down illustrated
 * plan commissioned to match the fair's own numbered site plan building for
 * building. Several versions were generated: a labelled one carrying painted
 * number badges and a bilingual legend, and UNLABELLED plates. The plate that
 * ships is "Spaced-Buildings-No-Tents": the exhibitor tents run along the WEST
 * FENCE rather than through the middle of the grounds, the two small tents
 * beside 6 are gone, and the buildings along Route 202 are spread further
 * apart. Source is a 4096x6144 PNG; the shipped JPEG is the 3864x5556 window
 * at offset (200, 320), scaled to 974x1400. Pins 1-6 and 9 were re-measured
 * for it; 7, 8 and 10-17 carried over unchanged because that half of the
 * drawing did not move. The unlabelled plate is what ships — the
 * badges would have doubled up with the HTML pins, and a baked-in legend cannot
 * translate to Spanish or be reached by a keyboard. The labelled version stays
 * useful as the reference for WHICH BUILDING IS WHICH when re-measuring pins.
 *
 * These coordinates were read off the artwork with a 5% grid overlaid, against
 * that labelled reference. Landmarks worth knowing if you re-measure: 4 and 8
 * have BLUE roofs, 5 is the big red barn-like hall, 7 is the small dark-red
 * shack with a chimney, 6 has a green roof, 14 is a set of fenced PENS rather
 * than a building, and 9 is the row of white marquee tents down the west track.
 *
 * ⚠️ Pin 11 sits at the lower edge of its hut rather than its centre: centred,
 * its marker overlapped 12's by 11% at 390px. The two really are that close on
 * the grounds. Markers are markers, not survey points.
 *
 * ⚠️ 9 Booths is really THREE locations — the fair's plan marks it three times,
 * and the art draws a row of tents along the west fence. One pin can only sit
 * at one of them; it is placed on the middle tent of the row.
 *
 * Spanish is ours — the fair's plan is EN/FR only.
 */
const mapCategories = {
  events:      { en: "Events",            fr: "Événements",         es: "Eventos",           color: "#E8C77E", ink: "#5C5825" },
  exhibits:    { en: "Exhibits",          fr: "Expositions",        es: "Exposiciones",      color: "#BC8351", ink: "#754B2F" },
  agriculture: { en: "Livestock & 4-H",   fr: "Élevage et 4-H",     es: "Ganado y 4-H",      color: "#79A87E", ink: "#216125" },
  services:    { en: "Services",          fr: "Services",           es: "Servicios",         color: "#8FA6B8", ink: "#345B6B" },
  amenities:   { en: "Amenities",         fr: "Commodités",         es: "Comodidades",       color: "#C98BA6", ink: "#942E53" }
};

/* TWO grounds, two measured sets — this is not decoration.
 *
 *   ink    the map is drawn on parchment (#EAE0C8) and its panel and legend
 *          sit in an .hf-sec--ivory section (#F1E8D6). Every ink clears
 *          5.5:1 on both, with each pair at least 25 degrees apart in hue.
 *   color  kept for the espresso ground, where the same hue families are
 *          measured at 4.5:1+ (see js/schedule-data.js).
 *
 * ⚠️ The espresso set is UNREADABLE on ivory — 1.34 to 2.65:1 — and an earlier
 * build shipped exactly that: every location name cream on cream while all 43
 * DOM assertions passed, because assertions check text and not colour. Only the
 * screenshot caught it. Re-measure BOTH if you retint either.
 */

const mapLocations = {
  1:  { cat: "services",    x:  44.0, y:  82.0, en: "Gate #2 (Pedestrian)",              fr: "Gate #2 (piéton)",                       es: "Puerta n.º 2 (peatonal)" },
  2:  { cat: "services",    x:  67.5, y:  89.5, en: "Gate #1 (Vehicles)",                fr: "Gate #1 (véhicules)",                    es: "Puerta n.º 1 (vehículos)" },
  3:  { cat: "services",    x:  56.5, y:  87.0, en: "Office",                            fr: "Bureau",                                 es: "Oficina" },
  4:  { cat: "exhibits",    x:  22.0, y:  71.5, en: "Dining Hall & Art Display",         fr: "Salle à dîner et exposition d'art",      es: "Comedor y exposición de arte" },
  5:  { cat: "exhibits",    x:  46.5, y:  73.5, en: "Baked Goods & Handicraft Building", fr: "Exposition confection et artisanat",     es: "Repostería y artesanía" },
  6:  { cat: "exhibits",    x:  29.5, y:  60.5, en: "Vegetable, Fruit & Flower Building",fr: "Exposition fleur, légume et fruit",      es: "Verduras, frutas y flores" },
  7:  { cat: "amenities",   x:  66.5, y:  68.5, en: "Sugar Shack",                       fr: "Cabane à sucre",                         es: "Cabaña de azúcar" },
  8:  { cat: "events",      x:  48.0, y:  52.0, en: "Music Building",                    fr: "Musique",                                es: "Edificio de música" },
  9:  { cat: "amenities",   x:  15.5, y:  28.5, en: "Booths",                            fr: "Kiosques",                               es: "Casetas" },
  10: { cat: "events",      x:  55.0, y:  37.0, en: "Horse Ring",                        fr: "Aréna équestre",                         es: "Arena ecuestre" },
  11: { cat: "agriculture", x:  43.5, y:  21.3, en: "Large Poultry",                     fr: "Grosse volaille",                        es: "Aves grandes"   },
  12: { cat: "agriculture", x:  49.0, y:  15.5, en: "Poultry & Rabbit Building",         fr: "Exposition volaille",                    es: "Aves y conejos" },
  13: { cat: "agriculture", x:  71.0, y:  22.5, en: "Horse Stalls",                      fr: "Stalle à chevaux",                       es: "Establos de caballos" },
  14: { cat: "agriculture", x:  30.0, y:   9.0, en: "Other Animals",                     fr: "Bâtisse autre animal",                   es: "Otros animales" },
  15: { cat: "agriculture", x:  68.0, y:  15.5, en: "4-H Building",                      fr: "Aréna 4H",                               es: "Edificio 4-H" },
  16: { cat: "agriculture", x:  51.0, y:   4.0, en: "Barn",                              fr: "Grange",                                 es: "Granero" },
  17: { cat: "agriculture", x:  73.0, y:   9.0, en: "4-H Stalls",                        fr: "Stalle 4H",                              es: "Establos 4-H" }
};

/* Order the legend renders in, grouped by category. */
const mapLegendOrder = ["events", "exhibits", "agriculture", "amenities", "services"];
