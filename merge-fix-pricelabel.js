// merge-fix-pricelabel.js
// Rulează cu: node merge-fix-pricelabel.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: "Preț", en: "Price", fr: "Prix", de: "Preis", es: "Precio",
it: "Prezzo", hu: "Ár", pt: "Preço", pl: "Cena"
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!json.resurse) json.resurse = {};
  json.resurse.priceLabel = DATA[locale];
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (priceLabel fără RON fix).`);
}
console.log("\n🎉 Eticheta a fost corectată!");