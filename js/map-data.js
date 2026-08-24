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
 * ⚠️ NO COORDINATES IN THIS FILE. Geometry lives in the inline SVG in
 * pages/directions.html, where each location is a <g id="loc-N">.
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
  1:  { cat: "services",    en: "Gate #2 (Pedestrian)",              fr: "Gate #2 (piéton)",                       es: "Puerta n.º 2 (peatonal)" },
  2:  { cat: "services",    en: "Gate #1 (Vehicles)",                fr: "Gate #1 (véhicules)",                    es: "Puerta n.º 1 (vehículos)" },
  3:  { cat: "services",    en: "Office",                            fr: "Bureau",                                 es: "Oficina" },
  4:  { cat: "exhibits",    en: "Dining Hall & Art Display",         fr: "Salle à dîner et exposition d'art",      es: "Comedor y exposición de arte" },
  5:  { cat: "exhibits",    en: "Baked Goods & Handicraft Building", fr: "Exposition confection et artisanat",     es: "Repostería y artesanía" },
  6:  { cat: "exhibits",    en: "Vegetable, Fruit & Flower Building",fr: "Exposition fleur, légume et fruit",      es: "Verduras, frutas y flores" },
  7:  { cat: "amenities",   en: "Sugar Shack",                       fr: "Cabane à sucre",                         es: "Cabaña de azúcar" },
  8:  { cat: "events",      en: "Music Building",                    fr: "Musique",                                es: "Edificio de música" },
  9:  { cat: "amenities",   en: "Booths",                            fr: "Kiosques",                               es: "Casetas" },
  10: { cat: "events",      en: "Horse Ring",                        fr: "Aréna équestre",                         es: "Arena ecuestre" },
  11: { cat: "agriculture", en: "Big Bird Building",                 fr: "Grosse volaille",                        es: "Aves grandes" },
  12: { cat: "agriculture", en: "Poultry & Rabbit Building",         fr: "Exposition volaille",                    es: "Aves y conejos" },
  13: { cat: "agriculture", en: "Horse Stalls",                      fr: "Stalle à chevaux",                       es: "Establos de caballos" },
  14: { cat: "agriculture", en: "Other Animals",                     fr: "Bâtisse autre animal",                   es: "Otros animales" },
  15: { cat: "agriculture", en: "4-H Building",                      fr: "Aréna 4H",                               es: "Edificio 4-H" },
  16: { cat: "agriculture", en: "Barn",                              fr: "Grange",                                 es: "Granero" },
  17: { cat: "agriculture", en: "4-H Stalls",                        fr: "Stalle 4H",                              es: "Establos 4-H" }
};

/* Order the legend renders in, grouped by category. */
const mapLegendOrder = ["events", "exhibits", "agriculture", "amenities", "services"];
