/* Fairgrounds locations — the single source of truth for place names.
 *
 * Keyed by the pin number painted on the map. The schedule references these
 * numbers (`venue: 10`) rather than repeating the name, so pages/schedule.html
 * and the map can never disagree, and renaming a building is one edit here.
 *
 * ⚠️ NO COORDINATES IN THIS FILE. Geometry lives in images/map/fairgrounds.svg,
 * where each location is a <g id="loc-N">. That is deliberate: an earlier plan
 * put x/y percentages here to position hotspots over a raster image, which
 * would need re-measuring every time the artwork was re-exported.
 *
 * ⚠️ Numbering has gaps (no 9, 11, 13, 14) and that is intentional — it follows
 * Jesse's draft, on the assumption the numbers match signage on the actual
 * buildings. Do not renumber to close the gaps without checking that first.
 *
 * OPEN — needs Jesse:
 *   16  the isolated barn at the top-left of the draft has a pin but no name.
 *   7   the draft says "Sugar Shack", the schedule says "Sugar shanty".
 *   8   confirmed as the same place as the schedule's "Outdoor Stage"; this
 *       carries the building name. If the sign outside says something else,
 *       change it here and both pages follow.
 */
const mapCategories = {
  events:      { en: "Events",            fr: "Événements",         es: "Eventos",           color: "#E8C77E", ink: "#5C5825" },
  exhibits:    { en: "Exhibits",          fr: "Expositions",        es: "Exposiciones",      color: "#BC8351", ink: "#754B2F" },
  agriculture: { en: "Agriculture & 4-H", fr: "Agriculture et 4-H", es: "Agricultura y 4-H", color: "#79A87E", ink: "#216125" },
  services:    { en: "Services",          fr: "Services",           es: "Servicios",         color: "#8FA6B8", ink: "#345B6B" },
  amenities:   { en: "Amenities",         fr: "Commodités",         es: "Comodidades",       color: "#C98BA6", ink: "#942E53" }
};

/* TWO grounds, so two measured sets — this is not decoration.
 *
 *   color  for the DARK plan (espresso #1B1611). The set already measured for
 *          the schedule categories in js/schedule-data.js.
 *   ink    for the IVORY panel and legend (#F1E8D6), because the map sits in
 *          an .hf-sec--ivory section.
 *
 * ⚠️ The espresso set is UNREADABLE on ivory — measured at 1.34 to 2.65:1, and
 * the first build shipped exactly that: every location name rendered cream on
 * cream while all 43 DOM assertions passed, because assertions check text and
 * not colour. Only the screenshot caught it. Same hue families in both sets so
 * they read as one system; `ink` clears 5.99-6.23:1 on ivory with every pair
 * at least 25 degrees apart in hue. Re-measure BOTH if you retint either. */

const mapLocations = {
  1:  { cat: "services",    en: "Pedestrian Entrance",       fr: "Entrée piétonne",                    es: "Entrada peatonal" },
  2:  { cat: "services",    en: "Vehicle Entrance",          fr: "Entrée véhicules",                   es: "Entrada de vehículos" },
  3:  { cat: "services",    en: "Office",                    fr: "Bureau",                             es: "Oficina" },
  4:  { cat: "exhibits",    en: "Dining Hall & Art Display", fr: "Salle à dîner et exposition d'art",  es: "Comedor y exposición de arte" },
  5:  { cat: "exhibits",    en: "Baked Goods & Handicraft",  fr: "Produits de boulangerie et artisanat", es: "Repostería y artesanía" },
  6:  { cat: "agriculture", en: "Vegetable, Fruit & Flower", fr: "Légumes, fruits et fleurs",          es: "Verduras, frutas y flores" },
  7:  { cat: "amenities",   en: "Sugar Shack",               fr: "Cabane à sucre",                     es: "Cabaña de azúcar" },
  8:  { cat: "events",      en: "Music Building",            fr: "Bâtiment de musique",                es: "Edificio de música" },
  10: { cat: "events",      en: "Horse Ring",                fr: "Arène équestre",                     es: "Arena ecuestre" },
  12: { cat: "exhibits",    en: "Poultry & Rabbit Building", fr: "Bâtiment de volailles et lapins",    es: "Edificio de aves y conejos" },
  15: { cat: "agriculture", en: "4-H Building",              fr: "Bâtiment 4-H",                       es: "Edificio 4-H" },
  17: { cat: "events",      en: "Stalls",                    fr: "Stalles",                            es: "Establos" }
};

/* Order the legend renders in, grouped by category. */
const mapLegendOrder = ["events", "exhibits", "agriculture", "services", "amenities"];
