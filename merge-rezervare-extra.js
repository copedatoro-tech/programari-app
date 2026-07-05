// merge-rezervare-extra.js
// Rulează cu: node merge-rezervare-extra.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: { reviewsCountSuffix: " recenzii", noRatingYet: "Fii primul care evaluează" },
en: { reviewsCountSuffix: " reviews", noRatingYet: "Be the first to rate" },
fr: { reviewsCountSuffix: " avis", noRatingYet: "Sois le premier à noter" },
de: { reviewsCountSuffix: " Bewertungen", noRatingYet: "Sei die erste Person, die bewertet" },
es: { reviewsCountSuffix: " reseñas", noRatingYet: "Sé el primero en valorar" },
it: { reviewsCountSuffix: " recensioni", noRatingYet: "Sii il primo a valutare" },
hu: { reviewsCountSuffix: " vélemény", noRatingYet: "Legyél az első, aki értékel" },
pt: { reviewsCountSuffix: " avaliações", noRatingYet: "Sê o primeiro a avaliar" },
pl: { reviewsCountSuffix: " opinii", noRatingYet: "Bądź pierwszą osobą, która oceni" }
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!json.rezervare) json.rezervare = {};
  json.rezervare.reviewsCountSuffix = DATA[locale].reviewsCountSuffix;
  json.rezervare.noRatingYet = DATA[locale].noRatingYet;
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (rezervare - extra).`);
}
console.log("\n🎉 Traducerile extra au fost adăugate!");