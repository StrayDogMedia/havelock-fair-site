const sponsorTiers = [
  {
    key: "featured",
    i18n: "sponsors_featured",
    color: "#1a2744",
    icon: "crown"
  },
  {
    key: "gold",
    i18n: "sponsors_gold",
    color: "#c8922a",
    icon: "star"
  },
  {
    key: "silver",
    i18n: "sponsors_silver",
    color: "#8a8fa0",
    icon: "shield"
  },
  {
    key: "bronze",
    i18n: "sponsors_bronze",
    color: "#a0704a",
    icon: "award"
  },
  {
    key: "friends",
    i18n: "sponsors_friends",
    color: "#6b7d5e",
    icon: "shield"
  },
  {
    key: "community",
    i18n: "sponsors_community",
    color: "#4a5568",
    icon: "shield"
  }
];

/* Rebuilt 2026-09-10 from Rommy's correction list. Gold was given as a
   complete replacement roster (Jesse confirmed: drop anything not named).
   Silver and Bronze were given as to-correct/to-add/to-remove/to-leave, and
   several "corrections" turned out to be sponsors moving tiers — matched by
   business identity against the prior file, not just by name similarity:
     - D.R. Ness: Bronze -> Gold
     - Arneg Canada, G.P. Ag Distribution, Kevin Patterson (Patterson
       Produce), Les carrières Ducharme Inc (Ducharme — Pierre naturelle),
       Michael Hadley (RE/MAX), Isolation T.K. Inc: Bronze -> Silver
     - Vergers Blair Inc: Gold ("Blair's") -> Silver, not a duplicate removal
   Marvyn Nussey Farms Inc appeared on both Silver's correct AND remove list;
   kept (corrected name) per Jesse, since "to correct" reads as the later
   instruction. No logos exist yet for anything newly added — they render as
   initials tiles until Rommy sends artwork. */
const sponsors = {
  featured: [
    { name: "MAPAQ · Gouvernement du Québec", url: "#", initials: "MQ", logo: "../images/sponsors/featured/gouvernement-quebec.jpg" },
    { name: "Carole Mallette — Députée de Huntingdon", url: "#", initials: "CM", logo: "../images/sponsors/featured/carole-mallette.jpg" }
  ],
  gold: [
    { name: "Gosselin Courtiers d'assurances Inc.", url: "#", initials: "GC", logo: "../images/sponsors/gold/gosselin.png" },
    { name: "Vergers Stevenson Inc", url: "#", initials: "VS", logo: "../images/sponsors/gold/stevenson.jpg" },
    { name: "Municipalité de Canton de Hemmingford", url: "#", initials: "MH" },
    { name: "D.R. Ness", url: "#", initials: "DN", logo: "../images/sponsors/bronze/dr-ness.jpg" },
    { name: "Mac Angus Farm", url: "#", initials: "MA", logo: "../images/sponsors/gold/mac-angus.jpg" },
    { name: "Nathalie Provost", url: "#", initials: "NP" }
  ],
  silver: [
    { name: "Alexandre Userau-Century 21", url: "#", initials: "AU" },
    { name: "Arneg Canada", url: "#", initials: "AC", logo: "../images/sponsors/bronze/arneg-canada.jpg" },
    { name: "Assurance Bourgon", url: "#", initials: "AB" },
    { name: "Autobus Sébastien Morand", url: "#", initials: "SM", logo: "../images/sponsors/bronze/autobus-sebastien-morand.jpg" },
    { name: "G.P. Ag Distribution", url: "#", initials: "GD", logo: "../images/sponsors/bronze/gpag-distribution.jpg" },
    { name: "Isolation T.K. Inc", url: "#", initials: "TK", logo: "../images/sponsors/bronze/isolation-tk.jpg" },
    { name: "Jaime Rankin / Sunlife", url: "#", initials: "JR", logo: "../images/sponsors/silver/sun-life.jpg" },
    { name: "Kevin Patterson", url: "#", initials: "KP", logo: "../images/sponsors/bronze/patterson-produce.jpg" },
    { name: "Les carrières Ducharme Inc", url: "#", initials: "LD", logo: "../images/sponsors/bronze/ducharme.jpg" },
    { name: "Marvyn Nussey Farms Inc", url: "#", initials: "MN", logo: "../images/sponsors/silver/nussey.jpg" },
    { name: "Michael Hadley - Remax", url: "#", initials: "MH", logo: "../images/sponsors/bronze/remax-michael-hadley.jpg" },
    { name: "Vergers Blair Inc", url: "#", initials: "VB", logo: "../images/sponsors/gold/blairs.jpg" },
    { name: "M. Derrick Transport", url: "#", initials: "MD", logo: "../images/sponsors/silver/m-derick-transport.jpg" },
    { name: "Grant's Bakery", url: "#", initials: "GB", logo: "../images/sponsors/silver/grants-bakery.jpg" },
    { name: "RONA d'Amour", url: "#", initials: "RD", logo: "../images/sponsors/silver/rona-damour.jpg" },
    { name: "Abattoir Lavallée", url: "#", initials: "AL" },
    { name: "Sabetta, Jacques and Darleen", url: "#", initials: "SJ" }
  ],
  bronze: [
    { name: "AFM Havelock", url: "#", initials: "AF", logo: "../images/sponsors/bronze/afm.png" },
    { name: "Bravo Pizzeria", url: "#", initials: "BR", logo: "../images/sponsors/bronze/bravo.png" },
    { name: "Les Meuneries Gerard Maheux Inc.", url: "#", initials: "GM", logo: "../images/sponsors/bronze/gm.png" },
    { name: "Équipements L&L", url: "#", initials: "LL", logo: "../images/sponsors/bronze/l-and-l.jpg" },
    { name: "Équipements Agrileader", url: "#", initials: "AL", logo: "../images/sponsors/bronze/agrileader.png" },
    { name: "Centre Chiropractique Hemmingford", url: "#", initials: "CH", logo: "../images/sponsors/bronze/chiro.png" },
    { name: "B. Brunet Monuments", url: "#", initials: "BM", logo: "../images/sponsors/bronze/brunet.jpg" },
    { name: "Centre de service Brunette", url: "#", initials: "EB", logo: "../images/sponsors/bronze/esso-brunet.jpg" },
    { name: "GP Automobile", url: "#", initials: "GA", logo: "../images/sponsors/bronze/gp-auto.jpg" },
    { name: "Assante - Todd Cote", url: "#", initials: "AS", logo: "../images/sponsors/bronze/assante.jpg" },
    { name: "Les Renovations Daniel Taillefer", url: "#", initials: "DT", logo: "../images/sponsors/bronze/taillefer.jpg" },
    { name: "Municipalité du Village de Hemmingford", url: "#", initials: "MV", logo: "../images/sponsors/bronze/hemmingford.png" },
    { name: "Vergers Petch Orchard", url: "#", initials: "PT", logo: "../images/sponsors/bronze/petch.jpg" },
    { name: "Roger Renaud Automobile Inc", url: "#", initials: "RR", logo: "../images/sponsors/bronze/roger-renaud.png" },
    { name: "Boucherie Viau", url: "#", initials: "BV", logo: "../images/sponsors/bronze/boucherie-viau.jpg" },
    { name: "Dépanneur Havelock", url: "#", initials: "DH", logo: "../images/sponsors/bronze/depanneur-havelock.jpg" },
    { name: "Ferti", url: "#", initials: "FT", logo: "../images/sponsors/bronze/ferti.png" },
    { name: "BMR Gauthier", url: "#", initials: "BMR", logo: "../images/sponsors/bronze/bmr-gauthier.jpg" },
    { name: "Lavallée", url: "#", initials: "LV", logo: "../images/sponsors/bronze/lavallee.png" },
    { name: "Boulangerie Chartrand", url: "#", initials: "BC", logo: "../images/sponsors/bronze/boulangerie-chartrand.jpg" },
    { name: "Vallée des Travailleurs", url: "#", initials: "VT", logo: "../images/sponsors/bronze/vallee-des-travailleurs.jpg" },
    { name: "Pharmacie Brunet — Catherine Plamondon", url: "#", initials: "PB", logo: "../images/sponsors/bronze/brunet-pharmacy.jpg" },
    { name: "Boutique Bon Boeuf", url: "#", initials: "BB" },
    { name: "Érablière Pascal Vincent", url: "#", initials: "EV" },
    { name: "Anderson, Mark", url: "#", initials: "MA" },
    { name: "Fermes Tolhurst Inc", url: "#", initials: "FT" },
    { name: "Fitzgerald, Doug and Whyte, Wendy", url: "#", initials: "FW" },
    { name: "Stratford, Catherine", url: "#", initials: "CS" }
  ],
  friends: [
    { name: "Orr, Allyson", url: "#", initials: "AO" },
    { name: "Barrette, Francois & Edwards, Jane", url: "#", initials: "FE" },
    { name: "Garage PatsRicks", url: "#", initials: "GP" },
    { name: "Maltby, Julie and Moore, Garth", url: "#", initials: "JM" },
    { name: "McFarlane, Catherine", url: "#", initials: "CM" },
    { name: "Sutton, Brian", url: "#", initials: "BS" },
    { name: "Équipements W.B.", url: "#", initials: "WB" }
  ],
  community: [
    { name: "Municipalité du Canton de Havelock", url: "#", initials: "CH", logo: "../images/sponsors/community/canton-de-havelock.jpg" },
    { name: "4-H Québec", url: "#", initials: "4H", logo: "../images/sponsors/community/4h-quebec.jpg" },
    { name: "Association des expositions agricoles du Québec", url: "#", initials: "AE", logo: "../images/sponsors/community/aeaq.jpg" }
  ]
};
