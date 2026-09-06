/* Schedule data for pages/schedule.html.
 *
 * ⚠️ ORDER IN THIS FILE DOES NOT MATTER. buildTimeline() sorts by clock time.
 * It did not always: the timeline used to render in the order events were
 * listed here, so Saturday ran 12:30 -> 3:00 PM -> 11:00 AM and Sunday jumped
 * from 3:00 PM back to 9:00 AM. Both were live for months. Never rely on the
 * order of this array again — and never "fix" a chronology bug by shuffling it.
 *
 * Event shape:
 *   time      "13:30"  24-hour start. Required.
 *   until     "15:00"  optional end time; rendered as "until 3:00".
 *   allDay    true     runs continuously — rendered once in the all-day band
 *                      above the timeline, NOT in a time slot.
 *   highlight true     appears in the "Don't miss" strip. Keep it to 3 a day.
 *   short_*   optional shorter title for the "Don't miss" card, which has
 *             room for about two lines. Falls back to the full title.
 *   art       "gallery/percheron-pair.jpg" — the strip photo, relative to
 *             images/. Lives ON the event: an earlier day+time lookup table
 *             collided, because Saturday 13:00 carries two highlights.
 *             ⚠️ CHECK THE PICTURE, NOT THE FILENAME. The first pass put an
 *             exhibit-hall photo of preserve jars on "Children's races" and
 *             cattle on the "Heavy Horse Show". Every photo here has been
 *             opened and matched to its event.
 *   cat       key into categoryInfo below.
 *   en/fr/es  the title. NO times and NO venues in here — both are fields now.
 *   venue     optional PIN NUMBER into mapLocations (js/map-data.js), not a
 *             name. The map owns every place name in all three languages, so
 *             the schedule and the plan can never drift apart and renaming a
 *             building is one edit there.
 *             ⚠️ NEVER GUESS ONE. Only music and the children's races had a
 *             location stated in their own copy; everything else is
 *             deliberately absent until Rommy or Nadeana confirms which pin.
 *             A wrong venue sends someone to the wrong barn.
 *
 * ⚠️ Band, act and show names are byte-identical across en/fr/es on purpose
 * and are asserted in tools/verify-music-page.js. Do not "translate" them.
 */
const scheduleData = {
  saturday: {
    iso: "2026-09-12",
    date_en: "Saturday, September 12",
    date_fr: "Samedi, 12 septembre",
    date_es: "Sábado, 12 de septiembre",
    events: [
      { time: "6:00", cat: "general", en: "Gates open for exhibitors only", fr: "Ouverture des portes pour les exposants", es: "Puertas abiertas solo para expositores" },
      { time: "8:00", cat: "general", en: "Gates open to the public", fr: "Ouverture des portes au public", es: "Puertas abiertas al público" },
      { time: "9:00", cat: "music", en: "Winslow Dancers (Line dancing)", fr: "Winslow Dancers (Danse en ligne)", es: "Winslow Dancers (Baile en línea)" },
      { time: "10:00", until: "11:00", cat: "music", en: "The Pine County Ramblers", fr: "The Pine County Ramblers", es: "The Pine County Ramblers", venue: 8 },
      { time: "12:30", until: "13:30", cat: "music", en: "The Pine County Ramblers", fr: "The Pine County Ramblers", es: "The Pine County Ramblers", venue: 8 },
      { time: "15:00", until: "16:00", cat: "music", en: "The Pine County Ramblers", fr: "The Pine County Ramblers", es: "The Pine County Ramblers", venue: 8 },
      { time: "9:00", allDay: true, cat: "antique", en: "Antique cars & machinery — Chateauguay Valley Garden Tractor Club", fr: "Voitures et machines anciennes — Chateauguay Valley Garden Tractor Club", es: "Autos y maquinaria antigua — Chateauguay Valley Garden Tractor Club" },
      { time: "9:00", allDay: true, cat: "food", en: "Sugar shanty open", fr: "Cabane à sucre ouverte", es: "Cabaña de azúcar abierta" },
      { time: "9:00", allDay: true, cat: "kids", en: "Children's activities: école au champs, games, story time, face painting, petting zoo", fr: "Activités pour enfants : école au champs, jeux, histoires, peintures de visages, petit zoo", es: "Actividades para niños: escuela en el campo, juegos, cuentos, pintura de caras, zoológico" },
      { time: "10:00", allDay: true, cat: "animals", en: "Horse show including Gymkhana", fr: "Spectacle équestre avec Gymkhana", es: "Espectáculo ecuestre con Gymkhana" },
      { time: "10:00", cat: "general", en: "Exhibition halls open", fr: "Ouverture des portes pour l'exposition intérieure", es: "Salas de exposición abiertas" },
      { time: "11:00", highlight: true, art: "home/spotlight/ls-2.jpg", cat: "general",
        short_en: "Opening Ceremony", short_fr: "Cérémonie d'ouverture", short_es: "Ceremonia de apertura",
        en: "Opening ceremony by the President; judging starts for indoor exhibitions", fr: "Cérémonie d'ouverture par le président; début du jugement des expositions intérieures", es: "Ceremonia de apertura por el Presidente; comienza el juicio de exposiciones interiores" },
      { time: "11:00", cat: "animals", en: "4-H showmanship exhibitions", fr: "Suite des expositions 4-H", es: "Exhibiciones de presentación 4-H" },
      { time: "13:00", highlight: true, art: "gallery/percheron-pair.jpg", cat: "animals", en: "Heavy Horse Show", fr: "Exposition de chevaux lourds", es: "Exhibición de caballos pesados" },
      { time: "13:00", highlight: true, art: "gallery/wheelbarrow-race.jpg", cat: "kids", en: "Children's races", fr: "Courses d'enfants", es: "Carreras de niños", venue: 10 },
      { time: "13:00", cat: "animals", en: "Heritage Cattle Show", fr: "Exposition de bétail du patrimoine", es: "Exhibición de ganado patrimonial" },
      { time: "13:00", cat: "animals", en: "Beef, sheep, goats, and pig show", fr: "Exposition de bœufs, moutons, chèvres et porcs", es: "Exhibición de ganado vacuno, ovejas, cabras y cerdos" },
      { time: "13:00", cat: "animals", en: "Miniature Horse and Pony Show", fr: "Exposition de miniatures et de poneys", es: "Exhibición de caballos miniatura y ponis" },
      /* Proper noun — identical in all three languages, like the band names.
         Spelled to match the long-standing SUNDAY entry exactly: the same
         attraction runs both days and must not appear under two names. */
      { time: "14:00", cat: "kids", en: "Pat's Pet Show", fr: "Pat's Pet Show", es: "Pat's Pet Show" },
      { time: "16:30", cat: "general", en: "Doors close for indoor exhibitions", fr: "Fin des événements", es: "Cierre de las exposiciones interiores" }
    ]
  },
  sunday: {
    iso: "2026-09-13",
    date_en: "Sunday, September 13",
    date_fr: "Dimanche, 13 septembre",
    date_es: "Domingo, 13 de septiembre",
    events: [
      { time: "7:00", cat: "general", en: "Gates open for exhibitors", fr: "Ouverture des portes pour les exposants", es: "Puertas abiertas para expositores" },
      { time: "8:00", cat: "general", en: "Gates open to the public", fr: "Ouverture des portes au public", es: "Puertas abiertas al público" },
      /* ⚠️ "BB King with Funky Freddy" is an UNCONFIRMED billing (B.B. King
         died in 2015) and is deliberately NOT flagged as a highlight. */
      { time: "11:00", until: "12:00", cat: "music", en: "BB King with Funky Freddy", fr: "BB King with Funky Freddy", es: "BB King with Funky Freddy", venue: 8 },
      { time: "12:00", until: "13:30", cat: "music", en: "Stew &amp; Alice", fr: "Stew &amp; Alice", es: "Stew &amp; Alice", venue: 8 },
      { time: "13:30", until: "15:00", highlight: true, art: "home/spotlight/mu-1.jpg", cat: "music", en: "Durham County Poets", fr: "Durham County Poets", es: "Durham County Poets", venue: 8 },
      { time: "15:00", until: "16:00", cat: "music", en: "Pierre Lachance &amp; Guy David", fr: "Pierre Lachance &amp; Guy David", es: "Pierre Lachance &amp; Guy David", venue: 8 },
      { time: "9:00", allDay: true, cat: "antique", en: "Antique cars & machinery — Chateauguay Valley Garden Tractor Club", fr: "Voitures et machines anciennes — Chateauguay Valley Garden Tractor Club", es: "Autos y maquinaria antigua — Chateauguay Valley Garden Tractor Club" },
      { time: "9:00", allDay: true, cat: "food", en: "Sugar shanty open", fr: "Cabane à sucre ouverte", es: "Cabaña de azúcar abierta" },
      { time: "9:00", allDay: true, cat: "kids", en: "Children's activities continue", fr: "Poursuite des activités pour enfants", es: "Continúan las actividades para niños" },
      { time: "10:00", cat: "general", en: "Exhibition halls open", fr: "Ouverture des portes pour l'exposition intérieure", es: "Salas de exposición abiertas" },
      { time: "10:00", highlight: true, art: "gallery/fair-2025-05.jpg", cat: "animals",
        short_en: "Miniature Horses & Ponies", short_fr: "Miniatures et poneys", short_es: "Caballos miniatura y ponis",
        en: "Miniature Horse and Pony Show", fr: "Exposition de miniatures et de poneys", es: "Exhibición de caballos miniatura y ponis" },
      { time: "11:00", highlight: true, art: "gallery/fair-2025-01.jpg", cat: "animals", en: "Heavy Horse Show", fr: "Exposition de chevaux lourds", es: "Exhibición de caballos pesados" },
      { time: "13:00", cat: "kids", en: "Children's races", fr: "Courses d'enfants", es: "Carreras de niños", venue: 10 },
      { time: "13:00", cat: "animals", en: "Heritage Cattle Show", fr: "Exposition de bétail du patrimoine", es: "Exhibición de ganado patrimonial" },
      { time: "13:00", cat: "animals", en: "Open Dairy Class", fr: "Classe ouverte des vaches laitières", es: "Clase abierta de vacas lecheras" },
      { time: "14:00", cat: "kids", en: "Pat's Pet Show", fr: "Pat's Pet Show", es: "Pat's Pet Show" },
      { time: "16:30", cat: "general", en: "Doors close for indoor exhibitions", fr: "Fin des événements", es: "Cierre de las exposiciones interiores" }
    ]
  }
};

/* Category colours. The previous values (#6b2fa0 purple, #c4561a orange,
   #1a2744 navy) were left over from the pre-Heritage design and were never
   rendered at all — the page only ever read the label. These are measured
   against the espresso section ground: every one clears 4.5:1 as text (so it
   is safe as a rule, a dot, or the category word).

   Kids / Livestock / Food are three earth tones and CANNOT be separated by
   hue inside a warm palette — measured, they sit 13 degrees apart. They are
   a deliberate LIGHT / MID / DARK ladder instead (11.0 / 5.6 / 6.8 against
   the ground, 1.6-2.0x apart from each other), which is also what survives
   a colour-vision difference and a greyscale print. Every pair in the set is
   separable by hue >= 25 deg OR lightness >= 1.6x. Re-measure if you retint.
   Colour is a scanning aid only — every row also carries its category as
   text for screen readers, and the filter buttons are unchanged. */
const categoryInfo = {
  all:     { en: "All Events",     fr: "Tous",              es: "Todos",             color: "#E8D3A0" },
  animals: { en: "Livestock",      fr: "Élevage",           es: "Ganado",            color: "#BC8351" },
  music:   { en: "Music",          fr: "Musique",           es: "Música",            color: "#C98BA6" },
  kids:    { en: "Kids",           fr: "Enfants",           es: "Niños",             color: "#E8C77E" },
  food:    { en: "Food",           fr: "Cuisine",           es: "Comida",            color: "#A9A257" },
  antique: { en: "Antique",        fr: "Antiquités",        es: "Antigüedades",      color: "#79A87E" },
  general: { en: "General",        fr: "Général",           es: "General",           color: "#8FA6B8" }
};
