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
    key: "community",
    i18n: "sponsors_community",
    color: "#4a5568",
    icon: "shield"
  }
];

const sponsors = {
  featured: [
    { name: "MAPAQ · Gouvernement du Québec", url: "#", initials: "MQ", logo: "../images/sponsors/featured/gouvernement-quebec.jpg" },
    { name: "Carole Mallette — Députée de Huntingdon", url: "#", initials: "CM", logo: "../images/sponsors/featured/carole-mallette.jpg" }
  ],
  gold: [
    { name: "Gosselin Photo", url: "#", initials: "GP", logo: "../images/sponsors/gold/gosselin.png" },
    { name: "OJ Mécanique & Fils", url: "#", initials: "OJ", logo: "../images/sponsors/gold/oj-mecanique.png" },
    { name: "Blair's", url: "#", initials: "BL", logo: "../images/sponsors/gold/blairs.jpg" },
    { name: "Leahy's", url: "#", initials: "LH", logo: "../images/sponsors/gold/leahys.png" },
    { name: "Stevenson Memorial", url: "#", initials: "SM", logo: "../images/sponsors/gold/stevenson.jpg" },
    { name: "Mac Angus", url: "#", initials: "MA", logo: "../images/sponsors/gold/mac-angus.jpg" },
    { name: "Ranch Covey Hill", url: "#", initials: "RC", logo: "../images/sponsors/gold/ranch-covey-hill.jpg" },
    { name: "Hemmingford Mutual", url: "#", initials: "HM", logo: "../images/sponsors/gold/hemmingford-mutual.png" }
  ],
  silver: [
    { name: "CA Pascal Bourgon CPA", url: "#", initials: "PB", logo: "../images/sponsors/silver/ca-pascal-bourgon.jpg" },
    { name: "CHT", url: "#", initials: "CHT", logo: "../images/sponsors/silver/cht.jpg" },
    { name: "ASM", url: "#", initials: "ASM", logo: "../images/sponsors/silver/asm.png" },
    { name: "M. Derick Transport", url: "#", initials: "MD", logo: "../images/sponsors/silver/m-derick-transport.jpg" },
    { name: "Nussey", url: "#", initials: "NU", logo: "../images/sponsors/silver/nussey.jpg" },
    { name: "RONA D'Amour", url: "#", initials: "RD", logo: "../images/sponsors/silver/rona-damour.jpg" },
    { name: "Sun Life — McIntyre & Rankin", url: "#", initials: "SL", logo: "../images/sponsors/silver/sun-life.jpg" },
    { name: "Bourgon", url: "#", initials: "BG", logo: "../images/sponsors/silver/bourgon.jpg" },
    { name: "BIL", url: "#", initials: "BIL", logo: "../images/sponsors/silver/bil.png" },
    { name: "Bill Anderson", url: "#", initials: "BA", logo: "../images/sponsors/silver/bill-anderson-logo.png" },
    { name: "Grant's Bakery", url: "#", initials: "GB", logo: "../images/sponsors/silver/grants-bakery.jpg" }
  ],
  bronze: [
    { name: "AFM", url: "#", initials: "AF", logo: "../images/sponsors/bronze/afm.png" },
    { name: "BMR Gauthier", url: "#", initials: "BMR", logo: "../images/sponsors/bronze/bmr-gauthier.jpg" },
    { name: "Boucherie Viau", url: "#", initials: "BV", logo: "../images/sponsors/bronze/boucherie-viau.jpg" },
    { name: "Bravo", url: "#", initials: "BR", logo: "../images/sponsors/bronze/bravo.png" },
    { name: "Brunet", url: "#", initials: "BN", logo: "../images/sponsors/bronze/brunet.jpg" },
    { name: "Dépanneur Havelock", url: "#", initials: "DH", logo: "../images/sponsors/bronze/depanneur-havelock.jpg" },
    { name: "Dr. Ness", url: "#", initials: "DN", logo: "../images/sponsors/bronze/dr-ness.jpg" },
    { name: "Esso Brunet", url: "#", initials: "EB", logo: "../images/sponsors/bronze/esso-brunet.jpg" },
    { name: "Ferti", url: "#", initials: "FT", logo: "../images/sponsors/bronze/ferti.png" },
    { name: "GM", url: "#", initials: "GM", logo: "../images/sponsors/bronze/gm.png" },
    { name: "GP Auto", url: "#", initials: "GP", logo: "../images/sponsors/bronze/gp-auto.jpg" },
    { name: "Hemmingford", url: "#", initials: "HF", logo: "../images/sponsors/bronze/hemmingford.png" },
    { name: "L&L", url: "#", initials: "LL", logo: "../images/sponsors/bronze/l-and-l.jpg" },
    { name: "Lavallée", url: "#", initials: "LV", logo: "../images/sponsors/bronze/lavallee.png" },
    { name: "Roger Renaud", url: "#", initials: "RR", logo: "../images/sponsors/bronze/roger-renaud.png" },
    { name: "Thibert & Bourgon", url: "#", initials: "TB", logo: "../images/sponsors/bronze/thibert-bourgon.png" },
    { name: "Assante", url: "#", initials: "AS", logo: "../images/sponsors/bronze/assante.jpg" },
    { name: "Boulangerie Chartrand", url: "#", initials: "BC", logo: "../images/sponsors/bronze/boulangerie-chartrand.jpg" },
    { name: "Agrileader", url: "#", initials: "AL", logo: "../images/sponsors/bronze/agrileader.png" },
    { name: "O'Local", url: "#", initials: "OL", logo: "../images/sponsors/bronze/olocal.png" },
    { name: "Taillefer", url: "#", initials: "TF", logo: "../images/sponsors/bronze/taillefer.jpg" },
    { name: "Chiropratique", url: "#", initials: "CH", logo: "../images/sponsors/bronze/chiro.png" },
    { name: "Vallée des Travailleurs", url: "#", initials: "VT", logo: "../images/sponsors/bronze/vallee-des-travailleurs.jpg" },
    { name: "Petch", url: "#", initials: "PT", logo: "../images/sponsors/bronze/petch.jpg" },
    { name: "Pharmacie Brunet — Catherine Plamondon", url: "#", initials: "PB", logo: "../images/sponsors/bronze/brunet-pharmacy.jpg" },
    { name: "Patterson Produce", url: "#", initials: "PP", logo: "../images/sponsors/bronze/patterson-produce.jpg" },
    { name: "Les autobus Sébastien Morand", url: "#", initials: "SM", logo: "../images/sponsors/bronze/autobus-sebastien-morand.jpg" },
    { name: "Ducharme — Pierre naturelle", url: "#", initials: "DU", logo: "../images/sponsors/bronze/ducharme.jpg" },
    { name: "Isolation TK", url: "#", initials: "TK", logo: "../images/sponsors/bronze/isolation-tk.jpg" },
    { name: "RE/MAX — Michael Hadley", url: "#", initials: "RM", logo: "../images/sponsors/bronze/remax-michael-hadley.jpg" },
    { name: "Arneg Canada", url: "#", initials: "AC", logo: "../images/sponsors/bronze/arneg-canada.jpg" },
    { name: "G.P.A.G. Distribution", url: "#", initials: "GD", logo: "../images/sponsors/bronze/gpag-distribution.jpg" },
    { name: "C.K. Blair Transport", url: "#", initials: "CB", logo: "../images/sponsors/bronze/ck-blair-transport.jpg" }
  ],
  community: [
    { name: "Municipalité du Canton de Havelock", url: "#", initials: "CH", logo: "../images/sponsors/community/canton-de-havelock.jpg" },
    { name: "4-H Québec", url: "#", initials: "4H", logo: "../images/sponsors/community/4h-quebec.jpg" },
    { name: "Association des expositions agricoles du Québec", url: "#", initials: "AE", logo: "../images/sponsors/community/aeaq.jpg" }
  ]
};
