// merge-nav-waitlist.js
// Rulează cu: node merge-nav-waitlist.js
const fs = require("fs");
const path = require("path");

const DATA = {
ro: "Listă Așteptare", en: "Waitlist", fr: "Liste d'attente", de: "Warteliste",
es: "Lista de espera", it: "Lista d'attesa", hu: "Várólista", pt: "Lista de espera", pl: "Lista oczekujących"
};

const messagesDir = path.join(__dirname, "messages");
for (const locale of Object.keys(DATA)) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) { console.log(`⚠️  Nu găsesc ${filePath}`); continue; }
  const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!json.layout) json.layout = {};
  if (!json.layout.nav) json.layout.nav = {};
  json.layout.nav.listaAsteptare = DATA[locale];
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf8");
  console.log(`✅ ${locale}.json actualizat (nav listă așteptare).`);
}
console.log("\n🎉 Traducerea a fost adăugată!");