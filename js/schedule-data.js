const scheduleData = {
  saturday: {
    date_en: "Saturday, September 12",
    date_fr: "Samedi, 12 septembre",
    date_es: "Sábado, 12 de septiembre",
    events: [
      { time: "6:00", cat: "general", en: "Gates open for exhibitors only", fr: "Ouverture des portes pour les exposants", es: "Puertas abiertas solo para expositores" },
      { time: "8:00", cat: "general", en: "Gates open to the public", fr: "Ouverture des portes au public", es: "Puertas abiertas al público" },
      { time: "9:00", cat: "music", en: "Winslow Dancers (Line dancing)", fr: "Winslow Dancers (Danse en ligne)", es: "Winslow Dancers (Baile en línea)" },
      { time: "10:00", cat: "music", en: "The Pine County Ramblers — 10:00 to 11:00, Outdoor Stage", fr: "The Pine County Ramblers — 10 h à 11 h, scène extérieure", es: "The Pine County Ramblers — 10:00 a 11:00, escenario al aire libre" },
      { time: "12:30", cat: "music", en: "The Pine County Ramblers — 12:30 to 1:30, Outdoor Stage", fr: "The Pine County Ramblers — 12 h 30 à 13 h 30, scène extérieure", es: "The Pine County Ramblers — 12:30 a 13:30, escenario al aire libre" },
      { time: "15:00", cat: "music", en: "The Pine County Ramblers — 3:00 to 4:00, Outdoor Stage", fr: "The Pine County Ramblers — 15 h à 16 h, scène extérieure", es: "The Pine County Ramblers — 15:00 a 16:00, escenario al aire libre" },
      { time: "9:00", cat: "antique", en: "Antique cars & machinery all day — Chateauguay Valley Garden Tractor Club", fr: "Exposition de voitures et machines anciennes — Chateauguay Valley Garden Tractor Club toute la journée", es: "Autos y maquinaria antigua todo el día — Chateauguay Valley Garden Tractor Club" },
      { time: "9:00", cat: "food", en: "Sugar shanty opens", fr: "Cabane à sucre ouverte", es: "Cabaña de azúcar abierta" },
      { time: "9:00", cat: "kids", en: "Children's activities: école au champs, games, story time, face painting, petting zoo", fr: "Activités pour enfants : école au champs, jeux, histoires, peintures de visages, petit zoo", es: "Actividades para niños: escuela en el campo, juegos, cuentos, pintura de caras, zoológico" },
      { time: "10:00", cat: "animals", en: "Horse show including Gymkhana all day", fr: "Spectacle équestre avec Gymkhana toute la journée", es: "Espectáculo ecuestre con Gymkhana todo el día" },
      { time: "10:00", cat: "general", en: "Exhibition halls open", fr: "Ouverture des portes pour l'exposition intérieure", es: "Salas de exposición abiertas" },
      { time: "11:00", cat: "general", en: "Opening ceremony by the President; judging starts for indoor exhibitions", fr: "Cérémonie d'ouverture par le président; début du jugement des expositions intérieures", es: "Ceremonia de apertura por el Presidente; comienza el juicio de exposiciones interiores" },
      { time: "11:00", cat: "animals", en: "4-H showmanship exhibitions", fr: "Suite des expositions 4-H", es: "Exhibiciones de presentación 4-H" },
      { time: "13:00", cat: "animals", en: "Heavy Horse Show", fr: "Exposition de chevaux lourds", es: "Exhibición de caballos pesados" },
      { time: "13:00", cat: "kids", en: "Children's races in the horse ring", fr: "Courses d'enfants dans la carrière des chevaux", es: "Carreras de niños en el ring de caballos" },
      { time: "13:00", cat: "animals", en: "Heritage Cattle Show", fr: "Exposition de bétail du patrimoine", es: "Exhibición de ganado patrimonial" },
      { time: "13:00", cat: "animals", en: "Beef, sheep, goats, and pig show", fr: "Exposition de bœufs, moutons, chèvres et porcs", es: "Exhibición de ganado vacuno, ovejas, cabras y cerdos" },
      { time: "13:00", cat: "animals", en: "Miniature Horse and Pony Show", fr: "Exposition de miniatures et de poneys", es: "Exhibición de caballos miniatura y ponis" },
      { time: "16:30", cat: "general", en: "Doors close for indoor exhibitions", fr: "Fin des événements", es: "Cierre de las exposiciones interiores" }
    ]
  },
  sunday: {
    date_en: "Sunday, September 13",
    date_fr: "Dimanche, 13 septembre",
    date_es: "Domingo, 13 de septiembre",
    events: [
      { time: "7:00", cat: "general", en: "Gates open for exhibitors", fr: "Ouverture des portes pour les exposants", es: "Puertas abiertas para expositores" },
      { time: "8:00", cat: "general", en: "Gates open to the public", fr: "Ouverture des portes au public", es: "Puertas abiertas al público" },
      { time: "11:00", cat: "music", en: "BB King with Funky Freddy — 11:00 to 12:00, Outdoor Stage", fr: "BB King with Funky Freddy — 11 h à 12 h, scène extérieure", es: "BB King with Funky Freddy — 11:00 a 12:00, escenario al aire libre" },
      { time: "12:00", cat: "music", en: "Stew &amp; Alice — 12:00 to 1:30, Outdoor Stage", fr: "Stew &amp; Alice — 12 h à 13 h 30, scène extérieure", es: "Stew &amp; Alice — 12:00 a 13:30, escenario al aire libre" },
      { time: "13:30", cat: "music", en: "Durham County Poets — 1:30 to 3:00, Outdoor Stage", fr: "Durham County Poets — 13 h 30 à 15 h, scène extérieure", es: "Durham County Poets — 13:30 a 15:00, escenario al aire libre" },
      { time: "15:00", cat: "music", en: "Pierre Lachance &amp; Guy David — 3:00 to 4:00, Outdoor Stage", fr: "Pierre Lachance &amp; Guy David — 15 h à 16 h, scène extérieure", es: "Pierre Lachance &amp; Guy David — 15:00 a 16:00, escenario al aire libre" },
      { time: "9:00", cat: "antique", en: "Antique cars & machinery all day — Chateauguay Valley Garden Tractor Club", fr: "Exposition de voitures et machines anciennes — Chateauguay Valley Garden Tractor Club toute la journée", es: "Autos y maquinaria antigua todo el día — Chateauguay Valley Garden Tractor Club" },
      { time: "9:00", cat: "food", en: "Sugar shanty opens", fr: "Cabane à sucre ouverte", es: "Cabaña de azúcar abierta" },
      { time: "9:00", cat: "kids", en: "Children's activities continue", fr: "Poursuite des activités pour enfants", es: "Continúan las actividades para niños" },
      { time: "10:00", cat: "general", en: "Exhibition halls open", fr: "Ouverture des portes pour l'exposition intérieure", es: "Salas de exposición abiertas" },
      { time: "10:00", cat: "animals", en: "Miniature Horse and Pony Show", fr: "Exposition de miniatures et de poneys", es: "Exhibición de caballos miniatura y ponis" },
      { time: "11:00", cat: "animals", en: "Heavy Horse Show", fr: "Exposition de chevaux lourds", es: "Exhibición de caballos pesados" },
      { time: "13:00", cat: "kids", en: "Children's races in the horse ring", fr: "Courses d'enfants dans la carrière des chevaux", es: "Carreras de niños en el ring de caballos" },
      { time: "13:00", cat: "animals", en: "Heritage Cattle Show", fr: "Exposition de bétail du patrimoine", es: "Exhibición de ganado patrimonial" },
      { time: "13:00", cat: "animals", en: "Open Dairy Class", fr: "Classe ouverte des vaches laitières", es: "Clase abierta de vacas lecheras" },
      { time: "14:00", cat: "kids", en: "Pat's Pet Show", fr: "Pat's Pet Show", es: "Pat's Pet Show" },
      { time: "16:30", cat: "general", en: "Doors close for indoor exhibitions", fr: "Fin des événements", es: "Cierre de las exposiciones interiores" }
    ]
  }
};

const categoryInfo = {
  all:     { en: "All Events",     fr: "Tous",              es: "Todos",             icon: "📋", color: "#1a2744" },
  animals: { en: "Livestock",      fr: "Élevage",           es: "Ganado",            icon: "🐴", color: "#5c3d1e" },
  music:   { en: "Music",          fr: "Musique",           es: "Música",            icon: "🎵", color: "#6b2fa0" },
  kids:    { en: "Kids",           fr: "Enfants",           es: "Niños",             icon: "🎠", color: "#c4561a" },
  food:    { en: "Food",           fr: "Cuisine",           es: "Comida",            icon: "🍁", color: "#8b6914" },
  antique: { en: "Antique",        fr: "Antiquités",        es: "Antigüedades",      icon: "🚜", color: "#2d5a27" },
  general: { en: "General",        fr: "Général",           es: "General",           icon: "🏛️", color: "#4a5568" }
};
