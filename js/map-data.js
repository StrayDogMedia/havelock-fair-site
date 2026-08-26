/* Fairgrounds locations — the single source of truth for place names.
 *
 * Names and numbering come from the fair's own bilingual site plan (Jesse,
 * 2026-08-24), which is authoritative. It resolved every open question from
 * the earlier draft: 9, 11, 13 and 14 DO exist, 16 is the Barn, and 17 is the
 * 4-H Stalls rather than "Stalls".
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
 * x / y are PERCENTAGES of the illustration, so they survive the artwork
 * being re-exported at a different resolution. They are pixel positions on a
 * picture, though — if the illustration is REDRAWN, every one needs checking.
 * pages/directions.html?calibrate=1 prints the percentage under the cursor and
 * makes that a two-minute job rather than a chore.
 *
 * ⚠️ Pin 1 is nudged slightly along the fence from the exact gate: it sits
 * almost on 3 and their markers overlapped at 390px.
 *
 * CORRECTIONS FROM JESSE, 2026-08-25 (he knows the grounds; I did not):
 *   16 Barn        -> the long building at 65.0/11.6, NOT the red barn
 *   17 4-H Stalls  -> 85.7/14.8, where 13 had been
 *   9  Booths      -> 34.7/55.3, touching 6
 *
 * 🔴 STILL OPEN, DO NOT ASSUME:
 *   13 Horse Stalls was displaced by 17 and is PARKED on the open-sided shed
 *      at 82.8/24.0. That is a guess and needs confirming.
 *   12 and 14 are untouched. Jesse said 12 is "the small building below the
 *      real 16, with 14 between them" — which describes their CURRENT
 *      arrangement if "the real 16" means the red barn, and something else
 *      entirely if it means 16's new position. Ambiguous, so left alone.
 *   The RED BARN at 42.0/12.4 now carries no pin at all. It is the most
 *      prominent building on the map; it should probably be something. tools/verify-map.js fails if any two pins overlap by
 * more than 8% of a pin's area at any width, so keep that in mind when moving
 * one — these are markers, not survey points.
 *
 * ⚠️ WHICH BUILDING IS WHICH IS PARTLY A GUESS. The illustration is a
 * hand-drawn interpretation, not a survey, so it does not preserve the exact
 * arrangement of the fair's plan. Confident: 1, 2, 3, 7, 10, 15, 16 (the
 * gates, the office, the sugar shack with its chimney, the ring, the big 4-H
 * block, the red barn). The rest are read from relative position and need
 * Jesse's eye. A wrong pin sends someone to the wrong barn.
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
  1:  { cat: "services",    x: 43.0, y: 81.5, en: "Gate #2 (Pedestrian)",              fr: "Gate #2 (piéton)",                       es: "Puerta n.º 2 (peatonal)" },
  2:  { cat: "services",    x: 56.4, y: 80.0, en: "Gate #1 (Vehicles)",                fr: "Gate #1 (véhicules)",                    es: "Puerta n.º 1 (vehículos)" },
  3:  { cat: "services",    x: 49.4, y: 76.0, en: "Office",                            fr: "Bureau",                                 es: "Oficina" },
  4:  { cat: "exhibits",    x: 35.2, y: 64.5, en: "Dining Hall & Art Display",         fr: "Salle à dîner et exposition d'art",      es: "Comedor y exposición de arte" },
  5:  { cat: "exhibits",    x: 54.9, y: 65.9, en: "Baked Goods & Handicraft Building", fr: "Exposition confection et artisanat",     es: "Repostería y artesanía" },
  6:  { cat: "exhibits",    x: 40.8, y: 52.1, en: "Vegetable, Fruit & Flower Building",fr: "Exposition fleur, légume et fruit",      es: "Verduras, frutas y flores" },
  7:  { cat: "amenities",   x: 35.2, y: 70.8, en: "Sugar Shack",                       fr: "Cabane à sucre",                         es: "Cabaña de azúcar" },
  8:  { cat: "events",      x: 57.8, y: 55.9, en: "Music Building",                    fr: "Musique",                                es: "Edificio de música" },
  9:  { cat: "amenities",   x: 32.8, y: 57.0, en: "Booths",                            fr: "Kiosques",                               es: "Casetas" },
  10: { cat: "events",      x: 63.0, y: 39.1, en: "Horse Ring",                        fr: "Aréna équestre",                         es: "Arena ecuestre" },
  11: { cat: "agriculture", x: 33.2, y: 22.5, en: "Big Bird Building",                 fr: "Grosse volaille",                        es: "Aves grandes" },
  12: { cat: "agriculture", x: 29.3, y: 27.9, en: "Poultry & Rabbit Building",         fr: "Exposition volaille",                    es: "Aves y conejos" },
  13: { cat: "agriculture", x: 81.0, y: 26.5, en: "Horse Stalls",                      fr: "Stalle à chevaux",                       es: "Establos de caballos" },
  14: { cat: "agriculture", x: 26.6, y: 16.3, en: "Other Animals",                     fr: "Bâtisse autre animal",                   es: "Otros animales" },
  15: { cat: "agriculture", x: 83.8, y: 20.8, en: "4-H Building",                      fr: "Aréna 4H",                               es: "Edificio 4-H" },
  16: { cat: "agriculture", x: 65.0, y: 11.6, en: "Barn",                              fr: "Grange",                                 es: "Granero" },
  17: { cat: "agriculture", x: 85.7, y: 14.8, en: "4-H Stalls",                        fr: "Stalle 4H",                              es: "Establos 4-H" }
};

/* Order the legend renders in, grouped by category. */
const mapLegendOrder = ["events", "exhibits", "agriculture", "amenities", "services"];
