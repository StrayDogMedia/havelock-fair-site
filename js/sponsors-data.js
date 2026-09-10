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
   initials tiles until Rommy sends artwork.

   2026-09-10: web-searched a website or Facebook page for every business
   name and linked the 39 found with reasonable confidence. Two names were
   corrected against what the search actually found and confirmed with
   Jesse: "Alexandre Userau" -> "Alexandre Usereau" (his real Century 21
   site), "Jaime Rankin" -> "Jamie Rankin" (his real Sun Life advisor page).
   "Lavallée" (Bronze) has no confirmed business of its own — only the
   Havelock mayor and the already-listed Abattoir Lavallée share that
   surname locally — so it reuses the abattoir's Facebook link on Jesse's
   call, meaning that URL now appears at two tiers; flag if that's wrong.
   24 stayed unlinked: the two Featured entries (government/political,
   deliberately not linked), Nathalie Provost, and every entry where the
   search could not confirm a specific match with reasonable confidence —
   several of these are individual community donors rather than
   businesses and may never have a page to link. */
const sponsors = {
  featured: [
    { name: "MAPAQ · Gouvernement du Québec", url: "#", initials: "MQ", logo: "../images/sponsors/featured/gouvernement-quebec.jpg" },
    { name: "Carole Mallette — Députée de Huntingdon", url: "#", initials: "CM", logo: "../images/sponsors/featured/carole-mallette.jpg" }
  ],
  gold: [
    { name: "Gosselin Courtiers d'assurances Inc.", url: "https://www.gosselinassurances.ca/en/", initials: "GC", logo: "../images/sponsors/gold/gosselin.png" },
    { name: "Vergers Stevenson Inc", url: "https://vergersstevensonorchards.com/", initials: "VS", logo: "../images/sponsors/gold/stevenson.jpg" },
    { name: "Municipalité de Canton de Hemmingford", url: "https://canton.hemmingford.ca/en/", initials: "MH" },
    { name: "D.R. Ness", url: "https://www.facebook.com/p/DR-Ness-2021-inc-61556355791168/", initials: "DN", logo: "../images/sponsors/bronze/dr-ness.jpg" },
    { name: "Mac Angus Farm", url: "https://www.facebook.com/p/Les-Fermes-Mac-Angus-Mac-Angus-Farms-100057222228083/", initials: "MA", logo: "../images/sponsors/gold/mac-angus.jpg" },
    { name: "Nathalie Provost", url: "#", initials: "NP" }
  ],
  silver: [
    { name: "Alexandre Usereau-Century 21", url: "https://alexandre-usereau.c21.ca/", initials: "AU" },
    { name: "Arneg Canada", url: "https://www.arneg.ca/en/", initials: "AC", logo: "../images/sponsors/bronze/arneg-canada.jpg" },
    { name: "Assurance Bourgon", url: "https://www.bourgon.ca/en/", initials: "AB" },
    { name: "Autobus Sébastien Morand", url: "#", initials: "SM", logo: "../images/sponsors/bronze/autobus-sebastien-morand.jpg" },
    { name: "G.P. Ag Distribution", url: "https://www.gpagdistribution.com/", initials: "GD", logo: "../images/sponsors/bronze/gpag-distribution.jpg" },
    { name: "Isolation T.K. Inc", url: "https://www.facebook.com/p/Isolation-TK-100054568413968/", initials: "TK", logo: "../images/sponsors/bronze/isolation-tk.jpg" },
    { name: "Jamie Rankin / Sunlife", url: "https://advisor.sunlife.ca/jamie.rankin/", initials: "JR", logo: "../images/sponsors/silver/sun-life.jpg" },
    { name: "Kevin Patterson", url: "#", initials: "KP", logo: "../images/sponsors/bronze/patterson-produce.jpg" },
    { name: "Les carrières Ducharme Inc", url: "https://www.carrieresducharme.com", initials: "LD", logo: "../images/sponsors/bronze/ducharme.jpg" },
    { name: "Marvyn Nussey Farms Inc", url: "https://www.facebook.com/nusseyfarms/", initials: "MN", logo: "../images/sponsors/silver/nussey.jpg" },
    { name: "Michael Hadley - Remax", url: "https://www.remax-quebec.com/en/real-estate-brokers/michael.hadley", initials: "MH", logo: "../images/sponsors/bronze/remax-michael-hadley.jpg" },
    { name: "Vergers Blair Inc", url: "https://vergersblair.com/", initials: "VB", logo: "../images/sponsors/gold/blairs.jpg" },
    { name: "M. Derrick Transport", url: "#", initials: "MD", logo: "../images/sponsors/silver/m-derick-transport.jpg" },
    { name: "Grant's Bakery", url: "https://grantsbakery.ca/", initials: "GB", logo: "../images/sponsors/silver/grants-bakery.jpg" },
    { name: "RONA d'Amour", url: "https://www.rona.ca/fr/magasin/quebec/ormstown/rona-rs-damour-fils-inc-ormstown-07100", initials: "RD", logo: "../images/sponsors/silver/rona-damour.jpg" },
    { name: "Abattoir Lavallée", url: "https://www.facebook.com/abattoirlavallee/", initials: "AL" },
    { name: "Sabetta, Jacques and Darleen", url: "#", initials: "SJ" }
  ],
  bronze: [
    { name: "AFM Havelock", url: "#", initials: "AF", logo: "../images/sponsors/bronze/afm.png" },
    { name: "Bravo Pizzeria", url: "#", initials: "BR", logo: "../images/sponsors/bronze/bravo.png" },
    { name: "Les Meuneries Gerard Maheux Inc.", url: "https://www.gerard-maheu.qc.ca/", initials: "GM", logo: "../images/sponsors/bronze/gm.png" },
    { name: "Équipements L&L", url: "#", initials: "LL", logo: "../images/sponsors/bronze/l-and-l.jpg" },
    { name: "Équipements Agrileader", url: "https://www.facebook.com/EquipementsAgrileader/", initials: "AL", logo: "../images/sponsors/bronze/agrileader.png" },
    { name: "Centre Chiropractique Hemmingford", url: "https://chirohemmingford.com/", initials: "CH", logo: "../images/sponsors/bronze/chiro.png" },
    { name: "B. Brunet Monuments", url: "https://brunetmonuments.ca/", initials: "BM", logo: "../images/sponsors/bronze/brunet.jpg" },
    { name: "Centre de service Brunette", url: "#", initials: "EB", logo: "../images/sponsors/bronze/esso-brunet.jpg" },
    { name: "GP Automobile", url: "#", initials: "GA", logo: "../images/sponsors/bronze/gp-auto.jpg" },
    { name: "Assante - Todd Cote", url: "https://advisor.assante.com/web/todd-cote/", initials: "AS", logo: "../images/sponsors/bronze/assante.jpg" },
    { name: "Les Renovations Daniel Taillefer", url: "#", initials: "DT", logo: "../images/sponsors/bronze/taillefer.jpg" },
    { name: "Municipalité du Village de Hemmingford", url: "https://www.villagedehemmingford.ca/en/", initials: "MV", logo: "../images/sponsors/bronze/hemmingford.png" },
    { name: "Vergers Petch Orchard", url: "https://vergerspetchorchards.com/?lang=en", initials: "PT", logo: "../images/sponsors/bronze/petch.jpg" },
    { name: "Roger Renaud Automobile Inc", url: "https://www.automobilerogerrenaud.com/", initials: "RR", logo: "../images/sponsors/bronze/roger-renaud.png" },
    { name: "Boucherie Viau", url: "https://www.boucherieviau.com/", initials: "BV", logo: "../images/sponsors/bronze/boucherie-viau.jpg" },
    { name: "Dépanneur Havelock", url: "https://www.facebook.com/p/D%C3%A9panneur-Havelock-100057644371273/", initials: "DH", logo: "../images/sponsors/bronze/depanneur-havelock.jpg" },
    { name: "Ferti", url: "#", initials: "FT", logo: "../images/sponsors/bronze/ferti.png" },
    { name: "BMR Gauthier", url: "https://www.bmr.ca/en/quincaillerie-r-gauthier-inc", initials: "BMR", logo: "../images/sponsors/bronze/bmr-gauthier.jpg" },
    { name: "Lavallée", url: "https://www.facebook.com/abattoirlavallee/", initials: "LV", logo: "../images/sponsors/bronze/lavallee.png" },
    { name: "Boulangerie Chartrand", url: "https://boulangeriechartrand.com/", initials: "BC", logo: "../images/sponsors/bronze/boulangerie-chartrand.jpg" },
    { name: "Vallée des Travailleurs", url: "https://valleedestravailleurs.com/en/", initials: "VT", logo: "../images/sponsors/bronze/vallee-des-travailleurs.jpg" },
    { name: "Pharmacie Brunet — Catherine Plamondon", url: "https://www.facebook.com/pages/Pharmacie-Brunet-Catherine-Plamondon/428246014186286", initials: "PB", logo: "../images/sponsors/bronze/brunet-pharmacy.jpg" },
    { name: "Boutique Bon Boeuf", url: "https://www.boutiquebonboeuf.com/en/", initials: "BB" },
    { name: "Érablière Pascal Vincent", url: "https://www.erabledici.ca/fr/erabliere/erabliere-pascal-vincent/", initials: "EV" },
    { name: "Anderson, Mark", url: "#", initials: "MA" },
    { name: "Fermes Tolhurst Inc", url: "https://tolhurstfarms.com/", initials: "FT" },
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
    { name: "Municipalité du Canton de Havelock", url: "https://mun-havelock.ca/", initials: "CH", logo: "../images/sponsors/community/canton-de-havelock.jpg" },
    { name: "4-H Québec", url: "https://quebec4-h.com/", initials: "4H", logo: "../images/sponsors/community/4h-quebec.jpg" },
    { name: "Association des expositions agricoles du Québec", url: "https://expoduquebec.com/en/", initials: "AE", logo: "../images/sponsors/community/aeaq.jpg" }
  ]
};
