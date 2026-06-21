const scheduleData = {
  saturday: {
    date_en: "Saturday, September 12",
    date_fr: "Samedi, 12 septembre",
    date_es: "Sábado, 12 de septiembre",
    events: [
      { time: "6:00", cat: "general", en: "Gates open for exhibitors only", fr: "Ouverture des portes pour les exposants", es: "Puertas abiertas solo para expositores" },
      { time: "8:00", cat: "general", en: "Gates open to the public", fr: "Ouverture des portes au public", es: "Puertas abiertas al público" },
      { time: "9:00", cat: "music", en: "All day country music & Winslow Dancers (Line dancing)", fr: "Musique country en direct toute la journée & Winslow Dancers (Danse en ligne)", es: "Música country todo el día y Winslow Dancers (Baile en línea)" },
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
      { time: "9:00", cat: "music", en: "All day live music — local artists", fr: "Musique en direct toute la journée — artistes locaux", es: "Música en vivo todo el día — artistas locales" },
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
